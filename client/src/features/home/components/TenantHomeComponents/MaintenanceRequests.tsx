import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTools, FaHistory, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import type { LandlordContract } from '../../../../services/contract.service';
import maintenanceService, { type MaintenanceRequest } from '../../../../services/maintenance.service';
import './MaintenanceRequests.css';

interface MaintenanceRequestsProps {
  contract: LandlordContract | null;
}

const MaintenanceRequests: React.FC<MaintenanceRequestsProps> = ({ contract }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const navigate = useNavigate();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await maintenanceService.listTenantRequests();
        setRequests(data);
      } catch (err) {
        console.error('Failed to fetch maintenance requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const activeRequests = requests.filter(r => !['COMPLETED', 'CANCELLED', 'RESOLVED_BY_ADMIN'].includes(r.status));
  const topRequest = activeRequests.length > 0 ? activeRequests[0] : null;

  return (
    <div className="card-base maintenance-dashboard">
      <header className="maintenance-top-nav">
        <div className="section-title">
          <div className="title-icon-ring"><FaTools /></div>
          <h3>{t('tenantHomeComponents.maintenance')}</h3>
        </div>

        <div className="maintenance-header-actions">
          <span className="request-id-pill">{t('tenantHomeComponents.noOpenRequests')}</span>
          <button className="btn-ghost-history" onClick={() => navigate('/tenant-maintenance?tab=active')}>
            <FaHistory /> <span>{t('tenantHomeComponents.history')}</span>
          </button>
        </div>
      </header>

      <div className="active-request-card" onClick={() => navigate('/tenant-maintenance?tab=active')} style={{ cursor: 'pointer' }}>
        {loading ? (
          <div className="request-body">
            <div className="issue-details">
              <h4 className="issue-subject">{t('auth.loading', 'Loading...')}</h4>
            </div>
          </div>
        ) : topRequest ? (
          <div className="request-body">
            <div className="issue-details">
              <h4 className="issue-subject" style={{ marginBottom: '4px' }}>{topRequest.title}</h4>
              <p className="eta-text" style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {t('myProperties.maintenanceTypes.' + topRequest.category, topRequest.category)} • {new Date(topRequest.createdAt).toLocaleDateString(locale)}
              </p>
            </div>
            <div className="request-timeline">
              <div className={`status-badge-premium status-${topRequest.status.toLowerCase()}`} style={{ textTransform: 'capitalize' }}>
                {t('maintenance.status.' + topRequest.status.toLowerCase(), topRequest.status.replace(/_/g, ' '))}
              </div>
            </div>
          </div>
        ) : (
          <div className="request-body">
            <div className="issue-details">
              <h4 className="issue-subject">{t('tenantHomeComponents.noMaintenanceItems', 'No Active Issues')}</h4>
              <div className="tech-eta-card" style={{ display: 'block' }}>
                <p className="eta-text">{t('tenantHomeComponents.maintenanceItemsAppearHere', 'Your active maintenance requests will appear here.')}</p>
              </div>
            </div>
            <div className="request-timeline">
              <div className="status-badge-premium">{t('landlordHomeComponents.clear', 'Clear')}</div>
            </div>
          </div>
        )}
      </div>

      <div className="new-request-cta">
        <div className="cta-content">
          <div className="cta-icon-box">
            <FaTools className="floating-icon" />
          </div>
          <h4>{t('tenantHomeComponents.needMaintenanceSupport')}</h4>
          <button className="btn-new-request" onClick={() => navigate('/tenant-maintenance?tab=post')}>
            <FaPlus /> <span>{t('tenantHomeComponents.newMaintenanceRequest')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceRequests;
