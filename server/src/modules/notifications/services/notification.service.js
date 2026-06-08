import { Op } from 'sequelize';
import { Notification, NotificationType } from '../models/Notification.js';
import { getIO } from '../../../shared/realtime/socket.js';
class NotificationService {
    formatNotification(n) {
        return {
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            relatedEntityType: n.related_entity_type,
            relatedEntityId: n.related_entity_id,
            data: n.data ?? {},
            isRead: n.is_read,
            readAt: n.read_at,
            createdAt: n.created_at,
        };
    }
    /**
     * Persist a notification and emit it over Socket.IO to the user's room.
     * Errors are caught (we never want notification failures to break a tx-safe flow).
     */
    async create(input) {
        try {
            const created = await Notification.create({
                user_id: input.userId,
                type: input.type,
                title: input.title,
                body: input.body,
                related_entity_type: input.relatedEntityType ?? null,
                related_entity_id: input.relatedEntityId ?? null,
                data: input.data ?? {},
                is_read: false,
                read_at: null,
            });
            const formatted = this.formatNotification(created);
            try {
                const io = getIO();
                io.to(`user:${input.userId}`).emit('notification:new', formatted);
            }
            catch {
                // Socket might not be initialised in some test/runtime paths
            }
            return formatted;
        }
        catch (err) {
            console.warn('Failed to create notification:', err);
            return null;
        }
    }
    async createMany(inputs) {
        await Promise.all(inputs.map((input) => this.create(input)));
    }
    async listForUser(userId, options = {}) {
        const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
        const offset = Math.max(options.offset ?? 0, 0);
        const where = { user_id: userId };
        if (options.unreadOnly)
            where.is_read = false;
        const { rows, count } = await Notification.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });
        const unreadCount = await Notification.count({
            where: { user_id: userId, is_read: false },
        });
        return {
            notifications: rows.map((n) => this.formatNotification(n)),
            total: count,
            unreadCount,
        };
    }
    async getUnreadCount(userId) {
        return Notification.count({ where: { user_id: userId, is_read: false } });
    }
    async markRead(userId, notificationId) {
        await Notification.update({ is_read: true, read_at: new Date() }, { where: { id: notificationId, user_id: userId } });
    }
    async markAllRead(userId) {
        await Notification.update({ is_read: true, read_at: new Date() }, { where: { user_id: userId, is_read: false } });
    }
    async deleteNotification(userId, notificationId) {
        await Notification.destroy({
            where: { id: notificationId, user_id: userId },
        });
    }
    async cleanupOld(daysOld = 90) {
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        return Notification.destroy({
            where: {
                is_read: true,
                created_at: { [Op.lt]: cutoff },
            },
        });
    }
}
export { NotificationType };
export const notificationService = new NotificationService();
export default notificationService;
