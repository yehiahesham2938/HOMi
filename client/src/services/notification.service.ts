import apiClient from '../config/api';

export type NotificationType =
    | 'MAINTENANCE_REQUEST_POSTED'
    | 'MAINTENANCE_NEW_APPLICATION'
    | 'MAINTENANCE_APPLICATION_ACCEPTED'
    | 'MAINTENANCE_APPLICATION_REJECTED'
    | 'MAINTENANCE_PROVIDER_EN_ROUTE'
    | 'MAINTENANCE_PROVIDER_ARRIVED'
    | 'MAINTENANCE_AWAITING_CONFIRMATION'
    | 'MAINTENANCE_COMPLETED'
    | 'MAINTENANCE_DISPUTED'
    | 'MAINTENANCE_CONFLICT_RESOLVED'
    | 'MAINTENANCE_LANDLORD_CHARGE'
    | 'MAINTENANCE_RATED'
    | 'VISIT_REQUEST_RECEIVED'
    | 'VISIT_REQUEST_ACCEPTED'
    | 'VISIT_REQUEST_DECLINED'
    | 'SYSTEM';

export interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    data: Record<string, unknown>;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
}

export interface NotificationListResponse {
    notifications: NotificationItem[];
    total: number;
    unreadCount: number;
}

interface ApiOk<T> {
    success: boolean;
    data: T;
    message?: string;
}

class NotificationServiceClient {
    async list(opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<NotificationListResponse> {
        const r = await apiClient.get<ApiOk<NotificationListResponse>>('/notifications', { params: opts });
        return r.data.data;
    }

    async unreadCount(): Promise<number> {
        const r = await apiClient.get<ApiOk<{ count: number }>>('/notifications/unread-count');
        return r.data.data.count;
    }

    async markRead(id: string): Promise<void> {
        await apiClient.patch(`/notifications/${id}/read`);
    }

    async markAllRead(): Promise<void> {
        await apiClient.patch('/notifications/read-all');
    }

    async remove(id: string): Promise<void> {
        await apiClient.delete(`/notifications/${id}`);
    }
}

export const notificationService = new NotificationServiceClient();
export default notificationService;
