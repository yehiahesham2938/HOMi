import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaCalendarAlt, FaChevronRight, FaHome, FaHourglassHalf, FaExclamationCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './RentedPropertyCard.css';

interface RentedPropertyProps {
  property: {
    id: string;
    title: string;
    address: string;
    /** Lease start (move-in) date, formatted. Used for "Starting Soon" rentals. */
    leaseStart?: string;
    leaseEnd: string;
    image: string | null;
    status: 'Starting Soon' | 'Active' | 'Expiring Soon' | 'Pending Renewal' | 'Ended';
    /** True when there are genuinely overdue (past-due) installments on an active lease. */
    latePayments?: boolean;
    /** True when the lease has ended (EXPIRED) but the tenant still owes rent. */
    endedWithDebt?: boolean;
    /** Number of unpaid months remaining after lease end. Only meaningful when endedWithDebt is true. */
    unpaidMonths?: number;
  };
}

const RentedPropertyCard: React.FC<RentedPropertyProps> = ({ property }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isStartingSoon = property.status === 'Starting Soon';
  const isEnded       = property.status === 'Ended';

  const handleDetailsClick = () => {
    navigate(`/active-rental?contractId=${encodeURIComponent(property.id)}`);
  };

  // Convert status to camelCase key for translations
  const statusKey = (() => {
    if (property.status === 'Starting Soon') return 'startingSoon';
    if (property.status === 'Active') return 'active';
    if (property.status === 'Expiring Soon') return 'expiringSoon';
    if (property.status === 'Pending Renewal') return 'pendingRenewal';
    if (property.status === 'Ended') return 'ended';
    return 'active';
  })();

  return (
    <button
      type="button"
      className={`rented-property-card${property.endedWithDebt ? ' ended-with-debt' : ''}`}
      onClick={handleDetailsClick}
    >
      <div className="card-image-wrapper">
        {property.image ? (
          <img src={property.image} alt={property.title} className="property-thumb" />
        ) : (
          <div className="property-thumb property-thumb-placeholder" aria-label={t('activeRental.noImage')}>
            <FaHome />
            <span>{t('activeRental.noImage')}</span>
          </div>
        )}

        <span className={`status-badge ${property.status.toLowerCase().replaceAll(' ', '-')}`}>
          {isStartingSoon && <FaHourglassHalf className="badge-icon" aria-hidden="true" />}
          {t(`activeRental.${statusKey}`)}
        </span>

        {/* Active lease with past-due installments */}
        {property.latePayments && !property.endedWithDebt && (
          <span className="status-badge late-payments">{t('activeRental.latePayments')}</span>
        )}

        {/* Ended lease with outstanding rent balance */}
        {property.endedWithDebt && (
          <span className="status-badge ended-debt">
            <FaExclamationCircle aria-hidden="true" />
            {property.unpaidMonths === 1
              ? t('activeRental.oneMonthUnpaid')
              : t('activeRental.monthsUnpaid', { count: property.unpaidMonths })}
          </span>
        )}
      </div>

      <div className="card-body">
        <div className="card-main-info">
          <h3>{property.title}</h3>
          <p className="address-text">
            <FaMapMarkerAlt className="icon-sm" /> {property.address}
          </p>
        </div>

        {/* Ended-with-debt notice replaces the normal footer */}
        {property.endedWithDebt ? (
          <div className="ended-debt-notice">
            <FaExclamationCircle aria-hidden="true" />
            <span>
              {t('activeRental.endedWithDebtNotice')}
            </span>
          </div>
        ) : (
          <div className="card-footer-meta">
            <div className="lease-meta">
              <FaCalendarAlt className="icon-sm" />
              {isStartingSoon ? (
                <span>{t('activeRental.leaseFrom')}<strong>{property.leaseStart ?? property.leaseEnd}</strong></span>
              ) : isEnded ? (
                <span>{t('activeRental.leaseEnded')}<strong>{property.leaseEnd}</strong></span>
              ) : (
                <span>{t('activeRental.leaseEnds')}<strong>{property.leaseEnd}</strong></span>
              )}
            </div>
            <button className="view-details-arrow" aria-label={t('activeRental.viewDetails')}>
              <FaChevronRight />
            </button>
          </div>
        )}

        {property.endedWithDebt && (
          <div className="card-footer-meta">
            <div className="lease-meta">
              <FaCalendarAlt className="icon-sm" />
              <span>{t('activeRental.leaseEnded')}<strong>{property.leaseEnd}</strong></span>
            </div>
            <button className="view-details-arrow ended" aria-label={t('activeRental.viewDetails')}>
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </button>
  );
};

export default RentedPropertyCard;
