import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheckDouble, FaCreditCard, FaTools, FaGift, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import notificationService, { type NotificationItem } from '../../../../services/notification.service';
import './Notifications.css';

interface Alert {
  id: string;
  type: 'payment' | 'maintenance' | 'system';
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

const getRelativeTime = (iso: string, t: any): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t('notifications.recently', 'Recently');

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t('notifications.now', 'Now');
  if (diffMins < 60) return t('notifications.mAgo', { count: diffMins, defaultValue: '{{count}}m ago' });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('notifications.hAgo', { count: diffHours, defaultValue: '{{count}}h ago' });
  const diffDays = Math.floor(diffHours / 24);
  return t('notifications.dAgo', { count: diffDays, defaultValue: '{{count}}d ago' });
};

const mapNotificationToAlert = (item: NotificationItem, t: any): Alert => {
  const normalizedType = String(item.type ?? '').toUpperCase();
  const related = String(item.relatedEntityType ?? '').toUpperCase();
  const title = String(item.title ?? '');
  const body = String(item.body ?? '');
  const textBlob = `${normalizedType} ${related} ${title} ${body}`.toUpperCase();

  const type: Alert['type'] = textBlob.includes('PAYMENT') || textBlob.includes('WALLET')
    ? 'payment'
    : textBlob.includes('MAINTENANCE')
      ? 'maintenance'
      : 'system';

  return {
    id: item.id,
    type,
    title: item.title,
    desc: item.body,
    time: getRelativeTime(item.createdAt, t),
    unread: !item.isRead,
  };
};

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await notificationService.list({ limit: 8 });
        if (cancelled) return;
        const mapped = result.notifications.map((item) => mapNotificationToAlert(item, t));
        setAlerts(mapped);
      } catch {
        if (!cancelled) setAlerts([]);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [t]);

  const visibleAlerts = useMemo<Alert[]>(() => {
    if (alerts.length > 0) return alerts;
    return [{
      id: 'empty-state',
      type: 'system',
      title: t('notifications.noRecentActivity', 'No Recent Activity'),
      desc: t('notifications.emptyDesc', 'Your latest notifications (payments, properties, requests, maintenance) will appear here.'),
      time: t('notifications.now', 'Now'),
      unread: false,
    }];
  }, [alerts, t]);

  const getIcon = (type: Alert['type']) => {
    if (type === 'payment') return <FaCreditCard />;
    if (type === 'maintenance') return <FaTools />;
    return <FaGift />;
  };

  const handleNotificationClick = (alert: Alert) => {
    if (alert.type === 'payment') {
      navigate('/tenant-payment');
      return;
    }
    if (alert.type === 'maintenance') {
      navigate('/maintenance-requests');
    }
  };

  return (
    <div className="card-base notifications-premium">
      <header className="notif-header">
        <div className="notif-title-group">
          <div className="bell-ring">
            <FaBell />
            {visibleAlerts.some((alert) => alert.unread) && <span className="active-dot"></span>}
          </div>
          <h3>{t('tenantHomeComponents.activityFeed', 'Activity Feed')}</h3>
        </div>
        <button className="btn-mark-all" aria-label="Activity synced" disabled>
          <FaCheckDouble /> <span>{t('tenantHomeComponents.synced', 'Synced')}</span>
        </button>
      </header>

      <div className="notif-scroll-area">
        {visibleAlerts.map((alert) => {
          if (alert.type === 'payment') {
            return (
              <button
                key={alert.id}
                type="button"
                className={`notif-card ${alert.unread ? 'is-unread' : ''} is-clickable`}
                onClick={() => handleNotificationClick(alert)}
              >
                <div className={`icon-orb ${alert.type}`}>
                  {getIcon(alert.type)}
                </div>

                <div className="notif-body">
                  <div className="notif-meta">
                    <span className="notif-subject">{alert.title}</span>
                    <span className="notif-timestamp">{alert.time}</span>
                  </div>
                  <p className="notif-text">{alert.desc}</p>
                </div>

                <div className="notif-action-hint">
                  <FaChevronRight />
                </div>
              </button>
            );
          }

          return (
            <div key={alert.id} className={`notif-card ${alert.unread ? 'is-unread' : ''}`}>
              <div className={`icon-orb ${alert.type}`}>
                {getIcon(alert.type)}
              </div>

              <div className="notif-body">
                <div className="notif-meta">
                  <span className="notif-subject">{alert.title}</span>
                  <span className="notif-timestamp">{alert.time}</span>
                </div>
                <p className="notif-text">{alert.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
