// client\src\features\MyProperties\components\DetailedPropertyCard.tsx
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined,
  FaUserCircle, FaCalendarAlt, FaTools, FaEllipsisH
} from 'react-icons/fa';
import ManagePropertyModal from './ManagePropertyModal'; // Import the new modal
import OccupiedModal from './OccupiedModal';
import DisablePropertyModal from './DisablePropertyModal';
import LandlordVisitsModal from './LandlordVisitsModal';
import propertyService from '../../../services/property.service';
import './DetailedPropertyCard.css';
import type { LandlordContract } from '../../../services/contract.service';

export type LandlordPropertyRow = {
  id: string;
  name: string;
  address: string;
  status: string;
  price: string;
  beds: number;
  baths: number;
  sqft: number;
  tenantName: string | null;
  leaseEnd: string | null;
  yield: string;
  occupancyRate: number;
  images: Array<{ image_url?: string; imageUrl?: string }>;
  amenities: string[];
  houseRules: string[];
  activeContract?: LandlordContract | null;
  onUpdate: () => void;
};

const DetailedPropertyCard = ({ property }: { property: LandlordPropertyRow }) => {
  const { t } = useTranslation();
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isOccupiedModalOpen, setIsOccupiedModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isVisitsModalOpen, setIsVisitsModalOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [pendingVisitsCount, setPendingVisitsCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await propertyService.getPropertyVisits(property.id);
      if (res.success && res.data) {
        const count = res.data.filter((v: any) => v.status === 'PENDING').length;
        setPendingVisitsCount(count);
      }
    } catch (err) {
      console.error("Failed to fetch visits count for property", property.id, err);
    }
  }, [property.id]);

  useEffect(() => {
    void fetchPendingCount();
  }, [fetchPendingCount]);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const res = await propertyService.updateProperty(property.id, { status: 'AVAILABLE' });
      if (res.success) {
        property.onUpdate();
      }
    } catch (err) {
      console.error("Failed to enable property", err);
    } finally {
      setEnabling(false);
    }
  };

  const status = String(property?.status || '').toLowerCase();
  const isManageLocked = status === 'pending_approval' || status === 'rejected';

  // Status translation helper
  const getStatusLabel = (status: string) => {
    const key = status === 'draft' ? 'maintenance' : status;
    return t(`myProperties.status.${key}`, { defaultValue: status });
  };

  const manageLockMessage =
    status === 'pending_approval'
      ? t('myProperties.lockedPendingApproval')
      : status === 'rejected'
        ? t('myProperties.lockedRejected')
        : '';

  return (
    <>
      <div className="detailed-card">
        <div className="detailed-image-section">
          <img src={property.images && property.images.length > 0 ? (property.images[0].image_url || property.images[0].imageUrl) : "/rentblue.jpg"} alt={property.name} />
          <div className="image-overlay-tags">
            <span className={`detailed-badge ${property.status}`}>
              {getStatusLabel(property.status)}
            </span>
            {property.status === 'draft' && (
              <span className="maintenance-tag"><FaTools /> {t('myProperties.status.maintenance')}</span>
            )}
          </div>
        </div>

        <div className="detailed-info-section">
          <div className="detailed-header">
            <div className="title-area">
              <h2>{property.name}</h2>
              <p className="detailed-address"><FaMapMarkerAlt /> {property.address}</p>
            </div>
            <button className="icon-btn-more"><FaEllipsisH /></button>
          </div>

          <div className="detailed-specs">
            <span><FaBed /> <strong>{property.beds}</strong> {t('myProperties.beds')}</span>
            <span><FaBath /> <strong>{property.baths}</strong> {t('myProperties.baths')}</span>
            <span><FaRulerCombined /> <strong>{property.sqft}</strong> {t('myProperties.sqft')}</span>
          </div>

          <div className="occupancy-container">
            <div className="occupancy-header">
              <label>{t('landlordHomeComponents.propertyAnalytics')}</label>
              <span>{property.occupancyRate}% {t('myProperties.occupancy')}</span>
            </div>
            <div className="occupancy-bar">
              <div className="occupancy-fill" style={{ width: `${property.occupancyRate}%` }}></div>
            </div>
          </div>

          <div className="tenant-info-bar">
            <div className="info-group">
              <FaUserCircle className="icon" />
              <div>
                <label>{t('landlordHomeComponents.currentTenant')}</label>
                <p>{property.tenantName || t('landlordHome.noCurrentTenant')}</p>
              </div>
            </div>
            <div className="info-group">
              <FaCalendarAlt className="icon" />
              <div>
                <label>{t('tenantHomeComponents.period')}</label>
                <p>{property.leaseEnd || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="detailed-stats-section">
          <div className="financial-overview">
            <div className="stat-pill">
              <label>{t('myProperties.yield')}</label>
              <span className="yield-up">+{property.yield}%</span>
            </div>
            <div className="main-price">
              <span className="currency">$</span>
              <span className="amount">{property.price.replace('$', '')}</span>
              <span className="period">/mo</span>
            </div>
          </div>
          {property.activeContract && (
            <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
              Upcoming Payment Due: ${property.activeContract.rentAmount}
            </div>
          )}
          <div className="action-buttons">
            {/* TRIGGER MODAL HERE */}
            <button
              className={`manage-btn ${isManageLocked ? 'locked' : ''}`}
              onClick={() => setIsManageModalOpen(true)}
              disabled={isManageLocked}
              title={manageLockMessage}
            >
              {t('myProperties.manageProperty')}
            </button>
            {property.activeContract ? (
              <button className="history-btn" onClick={() => setIsOccupiedModalOpen(true)}>
                View Occupied
              </button>
            ) : status === 'unavailable' ? (
              <button className="history-btn" onClick={handleEnable} disabled={enabling}>
                {enabling ? 'Enabling...' : 'Enable'}
              </button>
            ) : (
              <button className="history-btn" onClick={() => setIsDisableModalOpen(true)}>
                Disable Property
              </button>
            )}
            <button className="history-btn" onClick={() => setIsVisitsModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Booked Visits
              {pendingVisitsCount > 0 && (
                <span className="visit-badge-count">{pendingVisitsCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RENDER MODAL */}
      {isManageModalOpen && (
        createPortal(
          <ManagePropertyModal
            property={property}
            onClose={() => setIsManageModalOpen(false)}
          />,
          document.body
        )
      )}

      {isVisitsModalOpen && (
        createPortal(
          <LandlordVisitsModal
            property={{ id: property.id, name: property.name }}
            onClose={() => {
              setIsVisitsModalOpen(false);
              void fetchPendingCount();
            }}
          />,
          document.body
        )
      )}

      {/* OCCUPIED MODAL */}
      {isOccupiedModalOpen && property.activeContract && (
        <OccupiedModal
          contract={property.activeContract}
          onClose={() => setIsOccupiedModalOpen(false)}
        />
      )}

      {/* DISABLE MODAL */}
      {isDisableModalOpen && (
        <DisablePropertyModal
          propertyId={property.id}
          onClose={() => setIsDisableModalOpen(false)}
          onSuccess={() => property.onUpdate()}
        />
      )}
    </>
  );
};

export default DetailedPropertyCard;
