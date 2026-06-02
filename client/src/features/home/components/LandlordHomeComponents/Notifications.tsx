import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiBell, FiDollarSign, FiTool, FiUserPlus, FiChevronRight } from 'react-icons/fi';
import './Notifications.css';
import NotificationBar from './NotificationBar';
import authService from '../../../../services/auth.service';
import propertyService from '../../../../services/property.service';
import rentalRequestService from '../../../../services/rental-request.service';
import contractService from '../../../../services/contract.service';
import notificationService from '../../../../services/notification.service';
import socketService from '../../../../services/socket.service';

interface LandlordAlert {
  id: string;
  type: 'payment' | 'maintenance' | 'lead';
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const [isBarOpen, setIsBarOpen] = useState(false);
  const [alerts, setAlerts] = useState<LandlordAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const relativeTime = useCallback((value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('landlordHomeComponents.justNow');

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return t('landlordHomeComponents.justNow');
    if (diffMinutes < 60) return t('landlordHomeComponents.minutesAgo', { count: diffMinutes });

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t('landlordHomeComponents.hoursAgo', { count: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return t('landlordHomeComponents.daysAgo', { count: diffDays });

    return date.toLocaleDateString();
  }, [t]);

  const loadAlerts = useCallback(async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser?.user?.id) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [requestsResponse, contractsResponse, propertiesResponse, notificationsResponse] = await Promise.all([
        rentalRequestService.getLandlordRequests({ page: 1, limit: 8 }),
        contractService.getLandlordContracts({ page: 1, limit: 8 }),
        propertyService.getAllProperties({ landlordId: currentUser.user.id, page: 1, limit: 8 }),
        notificationService.list({ limit: 15 }),
      ]);

      const requestAlerts: LandlordAlert[] = (requestsResponse.data ?? []).map((request) => {
        let requestTitle = t('landlordHomeComponents.newRentalRequest');
        if (request.status === 'APPROVED') requestTitle = t('landlordHomeComponents.requestApproved');
        if (request.status === 'DECLINED') requestTitle = t('landlordHomeComponents.requestDeclined');

        return {
          id: `req-${request.id}`,
          type: 'lead',
          title: requestTitle,
          desc: `${request.tenant.firstName} ${request.tenant.lastName} for ${request.property.title}`,
          time: relativeTime(request.createdAt),
          unread: request.status === 'PENDING',
          createdAt: request.createdAt,
        };
      });

      const contractAlerts: LandlordAlert[] = (contractsResponse.data ?? []).map((contract) => {
        const propertyTitle = contract.property?.title || 'Property';
        return {
          id: `contract-${contract.id}`,
          type: 'payment',
          title: contract.status === 'ACTIVE' ? t('landlordHomeComponents.leaseActive') : `Contract ${contract.status}`,
          desc: `${propertyTitle} • ${contract.status === 'PENDING_PAYMENT' ? t('landlordHomeComponents.paymentPending') : `Contract ${contract.status.replace(/_/g, ' ')}`}`,
          time: relativeTime(contract.createdAt),
          unread: contract.status === 'PENDING_LANDLORD' || contract.status === 'PENDING_TENANT',
          createdAt: contract.createdAt,
        };
      });

      const propertyAlerts: LandlordAlert[] = (propertiesResponse.data ?? []).map((property) => ({
        id: `property-${property.id}`,
        type: 'maintenance',
        title: property.status === 'Published' ? t('landlordHomeComponents.listingPublished') : `Listing ${property.status}`,
        desc: `${property.title} listed at $${property.monthlyPrice}/month`,
        time: relativeTime(property.createdAt),
        unread: property.status === 'Draft',
        createdAt: property.createdAt,
      }));

      const dbAlerts: LandlordAlert[] = (notificationsResponse.notifications ?? [])
        .filter((n) => n.type.startsWith('VISIT_'))
        .map((n) => ({
          id: `notif-${n.id}`,
          type: 'lead',
          title: n.title,
          desc: n.body,
          time: relativeTime(n.createdAt),
          unread: !n.isRead,
          createdAt: n.createdAt,
        }));

      const merged = [...requestAlerts, ...contractAlerts, ...propertyAlerts, ...dbAlerts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setAlerts(merged);
    } catch {
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [t, relativeTime]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const sock = socketService.connect();
    if (!sock) return;

    const handleNewNotification = () => {
      void loadAlerts();
    };

    socketService.onNotificationNew(handleNewNotification);
    return () => {
      socketService.offNotificationNew(handleNewNotification);
    };
  }, [loadAlerts]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      void loadAlerts();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const hasUnread = useMemo(() => alerts.some((a) => a.unread), [alerts]);
  const emptyStateMessage = isLoading ? t('landlordHomeComponents.loadingActivity') : t('landlordHomeComponents.noRecentActivity');

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <FiDollarSign />;
      case 'maintenance': return <FiTool />;
      case 'lead': return <FiUserPlus />;
      default: return <FiBell />;
    }
  };

  return (
    <>
      <div className="landlord-notifications-card">
        <header className="notif-header">
          <div className="notif-title-group">
            <div className="bell-ring">
              <FiBell />
              {hasUnread && <span className="active-dot"></span>}
            </div>
            <h3>{t('landlordHomeComponents.activityFeed')}</h3>
          </div>
          <button className="btn-mark-all" onClick={handleMarkAllRead}>
            <span>{t('landlordHomeComponents.clear')}</span>
          </button>
        </header>

        <div className="notif-scroll-area">
          {alerts.length === 0 ? (
            <div className="notif-empty-state">{emptyStateMessage}</div>
          ) : (
            alerts.slice(0, 3).map((alert) => (
              <button
                key={alert.id}
                type="button"
                className={`notif-item-row ${alert.unread ? 'is-unread' : ''}`}
                onClick={() => setIsBarOpen(true)}
              >
                <div className={`icon-box ${alert.type}`}>
                  {getIcon(alert.type)}
                </div>

                <div className="notif-info">
                  <div className="notif-meta-top">
                    <span className="subject">{alert.title}</span>
                    <span className="timestamp">{alert.time}</span>
                  </div>
                  <p className="description">{alert.desc}</p>
                </div>
                <FiChevronRight className="arrow-hint" />
              </button>
            ))
          )}
        </div>


      </div>

      <NotificationBar isOpen={isBarOpen} onClose={() => setIsBarOpen(false)} alerts={alerts} />
    </>
  );
};

export default Notifications;
