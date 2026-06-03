import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  FiMapPin, FiMoreHorizontal, FiMaximize,
  FiArrowUpRight, FiCheckCircle, FiClock
} from 'react-icons/fi';
import ManagePropertyModal from '../../../MyProperties/components/ManagePropertyModal';
import OccupiedModal from '../../../MyProperties/components/OccupiedModal';
import './PropertyCard.css';

interface PropertyCardProps {
  name?: string;
  address?: string;
  status?: string;
  price?: string;
  tenantName?: string;
  paymentStatus?: string;
  beds?: number;
  baths?: number;
  sqft?: string | number;
  imageUrl?: string;
  id: string | number;
  activeContract?: any;
}

const PropertyCard = ({
  name = "Skyline Apartments",
  address = "Downtown, Dubai",
  status = "Occupied",
  price = "2,500",
  tenantName,
  paymentStatus = "Pending",
  beds = 3,
  baths = 2,
  sqft = "1,200",
  imageUrl = "/rentblue.jpg",
  id,
  activeContract
}: PropertyCardProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOccupiedModalOpen, setIsOccupiedModalOpen] = useState(false);

  const displayTenantName = tenantName || t('landlordHomeComponents.noCurrentTenant');
  const propertyData = { id, name, address, status, price, beds, baths, sqft, tenantName: displayTenantName };

  return (
    <>
      <div className="prop-card-container" onClick={() => setIsModalOpen(true)}>
        <div className="prop-card-media">
          <img src={imageUrl || "/rentblue.jpg"} alt={name} className="prop-main-img" />

          <div className="prop-floating-badges">
            <div className={`status-pill ${status.toLowerCase()}`}>
              <span className="pulse-indicator"></span>
              {status}
            </div>

          </div>

          <div className="prop-media-overlay">
            <div className="manage-glass-pill">
              <span>{t('landlordHomeComponents.propertyAnalytics')}</span>
              <FiArrowUpRight />
            </div>
          </div>
        </div>

        <div className="prop-card-content">
          <div className="prop-header">
            <h3 className="prop-title">{name}</h3>
            <p className="prop-location">
              <FiMapPin size={12} /> {address}
            </p>
          </div>

          {/* New Section: Tenant Snapshot */}
          <div 
            className="tenant-snapshot"
            onClick={(e) => {
              if (activeContract) {
                e.stopPropagation();
                setIsOccupiedModalOpen(true);
              }
            }}
            style={activeContract ? { cursor: 'pointer' } : undefined}
          >
            <div className="tenant-info">
              <div className="tenant-avatar">
                {activeContract?.tenant?.avatarUrl ? (
                  <img 
                    src={activeContract.tenant.avatarUrl} 
                    alt={displayTenantName} 
                    className="tenant-avatar-img"
                    style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }}
                  />
                ) : (
                  displayTenantName.charAt(0)
                )}
              </div>
              <div className="tenant-details">
                <span className="label">{t('landlordHomeComponents.currentTenant')}</span>
                <span className="name">{displayTenantName}</span>
              </div>
            </div>
          </div>

          <div className="prop-specs-minimal">
            <div className="spec-unit"><b>{beds}</b><span>{t('landlordHomeComponents.beds')}</span></div>
            <div className="spec-divider"></div>
            <div className="spec-unit"><b>{baths}</b><span>{t('landlordHomeComponents.baths')}</span></div>
            <div className="spec-divider"></div>
            <div className="spec-unit"><b>{sqft}</b><span>{t('landlordHomeComponents.sqft')}</span></div>
          </div>

          <div className="prop-footer">
            <div className="price-stack">
              <span className="price-label">{t('landlordHomeComponents.netMonthlyIncome')}</span>
              <div className="price-display">
                <span className="price-amt">${price}</span>
                <span className="price-period">/mo</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeContract && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsOccupiedModalOpen(true); }}
                  style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  View Occupied
                </button>
              )}
              <div className="prop-action-icon">
                <FiMaximize />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        createPortal(
          <ManagePropertyModal
            property={propertyData}
            onClose={() => setIsModalOpen(false)}
          />,
          document.body
        )
      )}

      {isOccupiedModalOpen && activeContract && (
        <OccupiedModal
          contract={activeContract}
          onClose={() => setIsOccupiedModalOpen(false)}
        />
      )}
    </>
  );
};

export default PropertyCard;