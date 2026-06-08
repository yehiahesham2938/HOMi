import { User, UserRole } from '../../auth/models/User.js';
import { Conversation, Message } from '../models/index.js';
import { messageService, MessageError } from './message.service.js';
export const SUPPORT_AUTO_REPLY = 'Thank you for contacting HOMi Support. A team member will review your message and typically responds within 24 hours.';
export async function resolveSupportInboxAdminId() {
    const admin = await User.findOne({
        where: { role: UserRole.ADMIN },
        order: [['created_at', 'ASC']],
        attributes: ['id'],
    });
    if (!admin) {
        throw new MessageError('Support inbox is not configured (no admin user).', 503, 'SUPPORT_ADMIN_MISSING');
    }
    return admin.id;
}
function normalizeParticipants(a, b) {
    return a < b ? [a, b] : [b, a];
}
export async function getOrCreateSupportConversation(userId, inboxAdminIdParam) {
    const inboxAdminId = inboxAdminIdParam ?? (await resolveSupportInboxAdminId());
    if (userId === inboxAdminId) {
        throw new MessageError('Invalid support request', 400, 'INVALID_SUPPORT_USER');
    }
    const [p1, p2] = normalizeParticipants(userId, inboxAdminId);
    let conversation = await Conversation.findOne({
        where: {
            participant_one_id: p1,
            participant_two_id: p2,
        },
    });
    if (!conversation) {
        conversation = await Conversation.create({
            participant_one_id: p1,
            participant_two_id: p2,
            property_id: null,
            is_support: true,
        });
    }
    else if (!conversation.is_support) {
        conversation.is_support = true;
        await conversation.save();
    }
    return conversation;
}
export async function sendSupportUserMessage(userId, body) {
    const inboxAdminId = await resolveSupportInboxAdminId();
    const conversation = await getOrCreateSupportConversation(userId, inboxAdminId);
    const messageCountBefore = await Message.count({
        where: { conversation_id: conversation.id },
    });
    const userMsg = await messageService.sendMessage(userId, conversation.id, { body });
    if (messageCountBefore === 0) {
        const autoReply = await messageService.sendMessage(inboxAdminId, conversation.id, { body: SUPPORT_AUTO_REPLY });
        return { userMessage: userMsg, autoReply };
    }
    return { userMessage: userMsg, autoReply: null };
}
