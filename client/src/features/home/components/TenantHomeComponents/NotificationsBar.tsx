import React, { useCallback, useEffect, useState } from 'react';
import { FaTimes, FaBell, FaCheckDouble, FaTrashAlt } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import './NotificationsBar.css';
import notificationService, { type NotificationItem } from '../../../../services/notification.service';
import socketService from '../../../../services/socket.service';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString();
}

function statusForType(type: NotificationItem['type']): string {
    switch (type) {
        case 'MAINTENANCE_COMPLETED':
        case 'MAINTENANCE_RATED':
            return 'completed';
        case 'MAINTENANCE_DISPUTED':
        case 'MAINTENANCE_LANDLORD_CHARGE':
        case 'VISIT_REQUEST_RECEIVED':
            return 'pending';
        case 'MAINTENANCE_APPLICATION_ACCEPTED':
        case 'MAINTENANCE_PROVIDER_ARRIVED':
        case 'MAINTENANCE_PROVIDER_EN_ROUTE':
        case 'MAINTENANCE_AWAITING_CONFIRMATION':
        case 'VISIT_REQUEST_ACCEPTED':
            return 'success';
        case 'VISIT_REQUEST_DECLINED':
            return 'info';
        default:
            return 'info';
    }
}

function tagForType(type: NotificationItem['type']): string {
    if (type.startsWith('MAINTENANCE_')) return 'maintenance';
    if (type.startsWith('VISIT_')) return 'visit';
    if (type === 'SYSTEM') return 'system';
    return 'system';
}

const NotificationsBar: React.FC<Props> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [disabledByAuth, setDisabledByAuth] = useState(false);

    const refresh = useCallback(async () => {
        if (disabledByAuth) return;
        try {
            setLoading(true);
            const result = await notificationService.list({ limit: 50 });
            setNotifications(result.notifications);
            setUnreadCount(result.unreadCount);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setDisabledByAuth(true);
                socketService.disconnect();
            }
        } finally {
            setLoading(false);
        }
    }, [disabledByAuth]);

    useEffect(() => {
        if (!isOpen) return;
        void refresh();
    }, [isOpen, refresh]);

    useEffect(() => {
        if (disabledByAuth) return;
        const sock = socketService.connect();
        if (!sock) return;
        const onNew = (payload: unknown) => {
            const n = payload as NotificationItem;
            setNotifications((prev) => [n, ...prev]);
            setUnreadCount((c) => c + 1);
        };
        socketService.onNotificationNew(onNew);
        return () => { socketService.offNotificationNew(onNew); };
    }, [disabledByAuth]);

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const handleClearHistory = async () => {
        if (!window.confirm('Are you sure you want to clear all notifications?')) return;
        try {
            await Promise.all(notifications.map((n) => notificationService.remove(n.id)));
            setNotifications([]);
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const handleClickItem = async (n: NotificationItem) => {
        if (!n.isRead) {
            try {
                await notificationService.markRead(n.id);
                setNotifications((prev) => prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)));
                setUnreadCount((c) => Math.max(0, c - 1));
            } catch { /* silent */ }
        }
    };

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const panel = (
        <div className={`notif-bar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div
                className={`notif-sidebar-container ${isOpen ? 'slide-in' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="notif-bar-header">
                    <div className="bar-title">
                        <div className="bell-ring">
                            <FaBell />
                            {unreadCount > 0 && <span className="status-pulse"></span>}
                        </div>
                        <div>
                            <h2>Notification Center</h2>
                            <p className={unreadCount === 0 ? 'all-caught-up' : ''}>
                                {unreadCount > 0
                                    ? `You have ${unreadCount} new alert${unreadCount === 1 ? '' : 's'}`
                                    : 'You are all caught up!'}
                            </p>
                        </div>
                    </div>
                    <button className="close-bar-btn" onClick={onClose} aria-label="Close Sidebar">
                        <FaTimes />
                    </button>
                </div>

                <div className="notif-bar-actions">
                    <button className="bar-action-btn" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                        <FaCheckDouble /> Mark all read
                    </button>
                </div>

                <div className="notif-bar-content">
                    {loading && notifications.length === 0 ? (
                        <div className="empty-notif-state">
                            <p>Loading…</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="history-timeline">
                            {notifications.map((item, index) => {
                                const status = statusForType(item.type);
                                const tag = tagForType(item.type);
                                return (
                                    <div
                                        className={`history-item ${item.isRead ? '' : 'is-unread'}`}
                                        key={item.id}
                                        style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s`, cursor: 'pointer' }}
                                        onClick={() => handleClickItem(item)}
                                    >
                                        <div className="history-dot-line">
                                            <div className={`history-dot ${status}`}></div>
                                            {index !== notifications.length - 1 && <div className="history-line"></div>}
                                        </div>
                                        <div className="history-card">
                                            <div className="history-header">
                                                <span className="history-date">{timeAgo(item.createdAt)}</span>
                                                <span className={`history-tag ${status}`}>{tag}</span>
                                            </div>
                                            <h4>{item.title}</h4>
                                            <p>{item.body}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-notif-state">
                            <div className="empty-icon">📂</div>
                            <p>No notifications to show</p>
                        </div>
                    )}
                </div>

                <div className="notif-bar-footer">
                    <button
                        className="clear-history-btn"
                        onClick={handleClearHistory}
                        disabled={notifications.length === 0}
                    >
                        <FaTrashAlt /> Clear Notification History
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(panel, document.body);
};

export default NotificationsBar;
