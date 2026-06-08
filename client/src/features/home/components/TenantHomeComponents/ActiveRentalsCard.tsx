import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt, FaCalendarAlt, FaBed, FaBath, FaArrowRight, FaHome, FaRulerCombined, FaCouch, FaPaw } from 'react-icons/fa';
import './ActiveRentalsCard.css';
import { useNavigate } from 'react-router-dom';
import type { LandlordContract, RentDueDate } from '../../../../services/contract.service';
import type { PropertyResponse } from '../../../../services/property.service';

interface RentalSpecs {
  label: string;
  icon: React.ReactElement;
}

interface ActiveRentalsCardProps {
  contract: LandlordContract | null;
  propertyDetails: PropertyResponse | null;
  referenceDate?: Date;
}

const getLeaseMetrics = (
  contract: LandlordContract | null,
  referenceDate?: Date
): { leaseProgress: number; monthsLeft: number } => {
  const start = contract ? new Date(contract.moveInDate) : null;
  const durationMonths = Number(contract?.leaseDurationMonths ?? 0);
  const end = start && !Number.isNaN(start.getTime()) ? new Date(start) : null;

  if (!start || !end) {
    return { leaseProgress: 0, monthsLeft: 0 };
  }

  end.setMonth(end.getMonth() + durationMonths);

  const totalDurationMs = end.getTime() - start.getTime();
  const nowMs = (referenceDate ?? new Date()).getTime();
  const elapsedMs = nowMs - start.getTime();
  const rawProgress = totalDurationMs > 0 ? (elapsedMs / totalDurationMs) * 100 : 0;
  const leaseProgress = Math.min(100, Math.max(0, Math.round(rawProgress)));
  const monthsLeft = Math.max(0, Math.ceil((end.getTime() - nowMs) / (1000 * 60 * 60 * 24 * 30)));

  return { leaseProgress, monthsLeft };
};

const ActiveRentalsCard: React.FC<ActiveRentalsCardProps> = ({ contract, propertyDetails, referenceDate }) => {
  const { t } = useTranslation();
  const { leaseProgress, monthsLeft } = getLeaseMetrics(contract, referenceDate);
  const navigate = useNavigate();

  const getDueDateLabel = (rentDueDate: RentDueDate | null): string => {
    if (!rentDueDate) return t('tenantHomeComponents.rentDueMonthly');
    if (rentDueDate === '1ST_OF_MONTH') return t('tenantHomeComponents.dueOn1st');
    if (rentDueDate === '5TH_OF_MONTH') return t('tenantHomeComponents.dueOn5th');
    return t('tenantHomeComponents.dueAtMonthEnd');
  };

  const formatFurnishing = (furnishing: string | null | undefined): string => {
    if (!furnishing) return 'Furnishing not set';
    if (furnishing === 'Fully') return t('tenantHomeComponents.fullyFurnished');
    if (furnishing === 'Semi') return t('tenantHomeComponents.semiFurnished');
    return furnishing;
  };

  const buildSpecs = (contract: LandlordContract | null, propertyDetails: PropertyResponse | null): RentalSpecs[] => {
    const bedrooms = propertyDetails?.specifications?.bedrooms ?? contract?.propertySpecifications?.bedrooms;
    const bathrooms = propertyDetails?.specifications?.bathrooms ?? contract?.propertySpecifications?.bathrooms;
    const areaSqft = propertyDetails?.specifications?.areaSqft ?? contract?.propertySpecifications?.areaSqft;
    const furnishing = formatFurnishing(propertyDetails?.furnishing ?? contract?.property?.furnishing);
    const petFriendly = Boolean(propertyDetails?.houseRules?.some((rule) => rule.name.toLowerCase() === 'pets allowed'));

    const detailSpecs: RentalSpecs[] = [];
    if (typeof bedrooms === 'number' && bedrooms > 0) {
      detailSpecs.push({ label: `${bedrooms} ${t('tenantHomeComponents.bed')}`, icon: <FaBed /> });
    }
    if (typeof bathrooms === 'number' && bathrooms > 0) {
      detailSpecs.push({ label: `${bathrooms} ${t('tenantHomeComponents.bath')}`, icon: <FaBath /> });
    }
    if (typeof areaSqft === 'number' && areaSqft > 0) {
      detailSpecs.push({ label: `${areaSqft} ${t('landlordHomeComponents.sqft')}`, icon: <FaRulerCombined /> });
    }
    detailSpecs.push({ label: furnishing, icon: <FaCouch /> });
    detailSpecs.push({ label: petFriendly ? t('tenantHomeComponents.petsFriendly') : t('tenantHomeComponents.noPets'), icon: <FaPaw /> });

    const fallbackSpecs: RentalSpecs[] = [
      { label: propertyDetails?.type ?? contract?.property?.type ?? 'Property', icon: <FaHome /> },
      { label: furnishing, icon: <FaCouch /> },
    ];

    return [
      ...(detailSpecs.length > 0 ? detailSpecs : fallbackSpecs),
      { label: getDueDateLabel(contract?.rentDueDate ?? null), icon: <FaCalendarAlt /> },
    ];
  };

  const monthlyPrice = Number(contract?.rentAmount ?? propertyDetails?.monthlyPrice ?? contract?.property?.monthlyPrice ?? 0);
  const propertyTitle = propertyDetails?.title || contract?.property?.title || 'Active rental';
  const propertyAddress = propertyDetails?.address || contract?.property?.address || 'Address unavailable';
  const propertyImage =
    propertyDetails?.images?.find((image) => image.isMain)?.imageUrl ||
    propertyDetails?.images?.[0]?.imageUrl ||
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600';
  const specs = buildSpecs(contract, propertyDetails);

  const handleDetailsClick = () => {
    navigate('/active-rental');
  };

  return (
    <div className="card-base rental-card-premium">


      <div className="rental-grid">
        {/* Left: Media Section */}
        <div className="rental-media">
          <img
            src={propertyImage}
            alt={propertyTitle}
            className="rental-img"
          />
          <div className="rental-price-tag" aria-label={`Rent ${monthlyPrice.toLocaleString()} per month`}>
            <span className="price-amt">${monthlyPrice.toLocaleString()}</span>
            <span className="price-unit">/mo</span>
          </div>
        </div>

        {/* Right: Info Section */}
        <div className="rental-info">
          <div className="rental-top-content">
            <header className="rental-header">
              <h3 className="rental-title">{propertyTitle}</h3>
              <p className="rental-address">
                <FaMapMarkerAlt className="icon-subtle" /> {propertyAddress}
              </p>
            </header>

            <div className="lease-section">
              <div className="lease-header">
                <div className="lease-label">
                  <FaCalendarAlt /> {t('tenantHomeComponents.leaseProgress')}
                </div>
                <span className="lease-remaining">{t('tenantHomeComponents.monthLeft', { count: monthsLeft })}</span>
              </div>
              <div className="progress-container">
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${leaseProgress}%` }}
                  >
                    <div className="progress-glow"></div>
                  </div>
                </div>
                <span className="progress-pct">{leaseProgress}%</span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Specs + Manage Button */}
          <footer className="rental-footer">
            <div className="specs-row">
              {specs.map((spec) => (
                <div key={spec.label} className="spec-tag">
                  <span className="spec-icon">{spec.icon}</span>
                  <span>{spec.label}</span>
                </div>
              ))}
            </div>

            <button className="btn-manage-circle" title={t('tenantHomeComponents.manageRental')} onClick={handleDetailsClick}>
              <FaArrowRight />
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ActiveRentalsCard;