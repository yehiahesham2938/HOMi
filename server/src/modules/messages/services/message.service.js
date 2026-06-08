import { Op, fn, col, QueryTypes } from 'sequelize';
import { Conversation, Message, User, Profile, Property } from '../models/index.js';
import { getIO } from '../../../shared/realtime/socket.js';
export class MessageError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = 'MESSAGE_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'MessageError';
    }
}
class MessageService {
    normalizeParticipants(a, b) {
        return a < b ? [a, b] : [b, a];
    }
    formatMessage(message) {
        return {
            id: message.id,
            conversationId: message.conversation_id,
            senderId: message.sender_id,
            body: message.body,
            createdAt: message.created_at,
            readAt: message.read_at,
        };
    }
    formatConversation(conversation, currentUserId, unreadCount, lastMessage) {
        const one = conversation.participantOne;
        const two = conversation.participantTwo;
        const counterpart = one?.id === currentUserId ? two : one;
        if (!counterpart) {
            throw new MessageError('Conversation participant not found', 500, 'CONVERSATION_PARTICIPANT_NOT_FOUND');
        }
        const counterpartProfile = counterpart.profile;
        return {
            id: conversation.id,
            propertyId: conversation.property_id ?? null,
            isSupport: Boolean(conversation.is_support),
            counterpart: {
                id: counterpart.id,
                email: counterpart.email,
                role: counterpart.role,
                firstName: counterpartProfile?.first_name ?? 'User',
                lastName: counterpartProfile?.last_name ?? '',
                avatarUrl: counterpartProfile?.avatar_url ?? null,
            },
            lastMessage: lastMessage ? this.formatMessage(lastMessage) : null,
            unreadCount,
            lastMessageAt: conversation.last_message_at,
            updatedAt: conversation.updated_at,
        };
    }
    async getUnreadCountMap(conversationIds, userId) {
        if (conversationIds.length === 0) {
            return new Map();
        }
        const unreadRows = await Message.findAll({
            attributes: [
                'conversation_id',
                [fn('COUNT', col('id')), 'unread_count'],
            ],
            where: {
                conversation_id: { [Op.in]: conversationIds },
                sender_id: { [Op.ne]: userId },
                read_at: null,
            },
            group: ['conversation_id'],
            raw: true,
        });
        const map = new Map();
        for (const row of unreadRows) {
            map.set(row.conversation_id, Number(row.unread_count));
        }
        return map;
    }
    async emitConversationUpdated(conversation, message) {
        try {
            const io = getIO();
            const payload = {
                conversationId: conversation.id,
                message: this.formatMessage(message),
                lastMessageAt: conversation.last_message_at,
            };
            io.to(`conversation:${conversation.id}`).emit('message:new', payload);
            io.to(`user:${conversation.participant_one_id}`).emit('conversation:updated', payload);
            io.to(`user:${conversation.participant_two_id}`).emit('conversation:updated', payload);
        }
        catch {
            // Socket server may not be initialized in some tests; persistence still succeeds.
        }
    }
    async canUserAccessConversation(userId, conversationId) {
        const conversation = await Conversation.findOne({
            where: {
                id: conversationId,
                [Op.or]: [
                    { participant_one_id: userId },
                    { participant_two_id: userId },
                ],
            },
            attributes: ['id'],
        });
        return Boolean(conversation);
    }
    /**
     * Participant or any ADMIN (for shared access to support inbox threads).
     */
    async assertConversationAccess(userId, conversationId, requesterRole) {
        const conversation = await Conversation.findOne({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new MessageError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
        }
        const isParticipant = conversation.participant_one_id === userId || conversation.participant_two_id === userId;
        const isAdminOnSupport = Boolean(conversation.is_support && requesterRole === 'ADMIN');
        if (!isParticipant && !isAdminOnSupport) {
            throw new MessageError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
        }
        return conversation;
    }
    assertCanSendMessage(conversation, userId, requesterRole) {
        const isParticipant = conversation.participant_one_id === userId || conversation.participant_two_id === userId;
        if (isParticipant) {
            return;
        }
        if (conversation.is_support && requesterRole === 'ADMIN') {
            return;
        }
        throw new MessageError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }
    async startConversation(currentUserId, input) {
        if (currentUserId === input.participantId) {
            throw new MessageError('You cannot start a conversation with yourself', 400, 'INVALID_PARTICIPANT');
        }
        const [currentUser, otherUser] = await Promise.all([
            User.findByPk(currentUserId),
            User.findByPk(input.participantId),
        ]);
        if (!currentUser || !otherUser) {
            throw new MessageError('Participant not found', 404, 'PARTICIPANT_NOT_FOUND');
        }
        if (input.propertyId) {
            const property = await Property.findByPk(input.propertyId, {
                attributes: ['id'],
            });
            if (!property) {
                throw new MessageError('Property not found', 404, 'PROPERTY_NOT_FOUND');
            }
        }
        const [participantOne, participantTwo] = this.normalizeParticipants(currentUserId, input.participantId);
        const participantInclude = [
            {
                model: User,
                as: 'participantOne',
                attributes: ['id', 'email', 'role'],
                include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
            },
            {
                model: User,
                as: 'participantTwo',
                attributes: ['id', 'email', 'role'],
                include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
            },
        ];
        let conversation = await Conversation.findOne({
            where: {
                participant_one_id: participantOne,
                participant_two_id: participantTwo,
            },
            include: participantInclude,
        });
        if (!conversation) {
            const created = await Conversation.create({
                participant_one_id: participantOne,
                participant_two_id: participantTwo,
                property_id: input.propertyId ?? null,
                is_support: false,
            });
            conversation = await Conversation.findByPk(created.id, {
                include: participantInclude,
            });
        }
        else if (input.propertyId && !conversation.property_id) {
            conversation.property_id = input.propertyId;
            await conversation.save();
        }
        if (!conversation) {
            throw new MessageError('Could not start conversation', 500, 'CONVERSATION_CREATE_FAILED');
        }
        let lastMessage = null;
        const initialMessage = input.initialMessage?.trim();
        if (initialMessage) {
            lastMessage = await this.sendMessage(currentUserId, conversation.id, { body: initialMessage });
        }
        const conversationForResponse = await Conversation.findByPk(conversation.id, {
            include: participantInclude,
        });
        if (!conversationForResponse) {
            throw new MessageError('Could not start conversation', 500, 'CONVERSATION_CREATE_FAILED');
        }
        return this.formatConversation(conversationForResponse, currentUserId, 0, lastMessage);
    }
    async getUnreadBadge(userId) {
        const unreadCount = await Message.count({
            where: {
                sender_id: { [Op.ne]: userId },
                read_at: null,
            },
            include: [
                {
                    model: Conversation,
                    as: 'conversation',
                    required: true,
                    attributes: [],
                    where: {
                        [Op.or]: [
                            { participant_one_id: userId },
                            { participant_two_id: userId },
                        ],
                    },
                },
            ],
        });
        return { hasUnread: unreadCount > 0, unreadCount };
    }
    /** Merge rows that share the same participant pair (legacy per-property threads). */
    async mergeDuplicateConversations() {
        const sequelize = Conversation.sequelize;
        const duplicatePairs = (await sequelize.query(`
            SELECT participant_one_id, participant_two_id
            FROM conversations
            WHERE deleted_at IS NULL
            GROUP BY participant_one_id, participant_two_id
            HAVING COUNT(*) > 1
            `, { type: QueryTypes.SELECT }));
        for (const row of duplicatePairs) {
            await this.mergeOneParticipantPair(row.participant_one_id, row.participant_two_id);
        }
    }
    async mergeOneParticipantPair(participantOneId, participantTwoId) {
        const sequelize = Conversation.sequelize;
        const conversations = await Conversation.findAll({
            where: {
                participant_one_id: participantOneId,
                participant_two_id: participantTwoId,
            },
            order: [[sequelize.literal('COALESCE(last_message_at, created_at)'), 'DESC']],
        });
        if (conversations.length <= 1) {
            return;
        }
        const keeper = conversations[0];
        const rest = conversations.slice(1);
        if (!keeper) {
            return;
        }
        const restIds = rest.map((c) => c.id);
        await Message.update({ conversation_id: keeper.id }, { where: { conversation_id: restIds } });
        const latest = await Message.findOne({
            where: { conversation_id: keeper.id },
            order: [['created_at', 'DESC']],
        });
        if (latest) {
            keeper.last_message_at = latest.created_at;
            await keeper.save();
        }
        await Conversation.destroy({ where: { id: restIds }, force: true });
    }
    async getConversationWithUnreadForUser(currentUserId, conversationId, requesterRole) {
        await this.assertConversationAccess(currentUserId, conversationId, requesterRole);
        const participantInclude = [
            {
                model: User,
                as: 'participantOne',
                attributes: ['id', 'email', 'role'],
                include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
            },
            {
                model: User,
                as: 'participantTwo',
                attributes: ['id', 'email', 'role'],
                include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
            },
        ];
        const conversation = await Conversation.findByPk(conversationId, {
            include: participantInclude,
        });
        if (!conversation) {
            throw new MessageError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
        }
        const unreadMap = await this.getUnreadCountMap([conversationId], currentUserId);
        const lastMessage = await Message.findOne({
            where: { conversation_id: conversationId },
            order: [['created_at', 'DESC']],
        });
        return this.formatConversation(conversation, currentUserId, unreadMap.get(conversationId) ?? 0, lastMessage);
    }
    async listConversations(userId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;
        const { count, rows } = await Conversation.findAndCountAll({
            where: {
                [Op.or]: [
                    { participant_one_id: userId },
                    { participant_two_id: userId },
                ],
            },
            include: [
                {
                    model: User,
                    as: 'participantOne',
                    attributes: ['id', 'email', 'role'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
                },
                {
                    model: User,
                    as: 'participantTwo',
                    attributes: ['id', 'email', 'role'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
                },
            ],
            order: [
                ['last_message_at', 'DESC'],
                ['updated_at', 'DESC'],
            ],
            limit,
            offset,
        });
        const conversationIds = rows.map((conversation) => conversation.id);
        const [unreadCountMap, latestMessages] = await Promise.all([
            this.getUnreadCountMap(conversationIds, userId),
            Promise.all(conversationIds.map((conversationId) => Message.findOne({
                where: { conversation_id: conversationId },
                order: [['created_at', 'DESC']],
            }))),
        ]);
        const latestMessageMap = new Map();
        conversationIds.forEach((conversationId, index) => {
            latestMessageMap.set(conversationId, latestMessages[index] ?? null);
        });
        return {
            conversations: rows.map((conversation) => this.formatConversation(conversation, userId, unreadCountMap.get(conversation.id) ?? 0, latestMessageMap.get(conversation.id) ?? null)),
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    }
    async getConversationMessages(userId, conversationId, query, requesterRole) {
        await this.assertConversationAccess(userId, conversationId, requesterRole);
        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const offset = (page - 1) * limit;
        const { count, rows } = await Message.findAndCountAll({
            where: { conversation_id: conversationId },
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });
        const orderedRows = [...rows].reverse();
        return {
            messages: orderedRows.map((message) => this.formatMessage(message)),
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    }
    async sendMessage(userId, conversationId, input, requesterRole) {
        const conversation = await this.assertConversationAccess(userId, conversationId, requesterRole);
        this.assertCanSendMessage(conversation, userId, requesterRole);
        const message = await Message.create({
            conversation_id: conversation.id,
            sender_id: userId,
            body: input.body.trim(),
        });
        conversation.last_message_at = message.created_at;
        await conversation.save();
        await this.emitConversationUpdated(conversation, message);
        return message;
    }
    async markConversationRead(userId, conversationId, requesterRole) {
        await this.assertConversationAccess(userId, conversationId, requesterRole);
        const [markedCount] = await Message.update({ read_at: new Date() }, {
            where: {
                conversation_id: conversationId,
                sender_id: { [Op.ne]: userId },
                read_at: null,
            },
        });
        try {
            const io = getIO();
            const payload = {
                conversationId,
                readerUserId: userId,
                markedCount,
            };
            io.to(`conversation:${conversationId}`).emit('conversation:read', payload);
            const participants = await Conversation.findByPk(conversationId, {
                attributes: ['participant_one_id', 'participant_two_id'],
            });
            if (participants) {
                io.to(`user:${participants.participant_one_id}`).emit('conversation:read', payload);
                io.to(`user:${participants.participant_two_id}`).emit('conversation:read', payload);
            }
        }
        catch {
            // Ignore if socket server is unavailable.
        }
        return { markedCount };
    }
}
export const messageService = new MessageService();
export default messageService;
