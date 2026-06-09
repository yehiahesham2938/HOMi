import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Star, Bed, Bath, Maximize } from 'lucide-react';
import type { PropertyUI } from '../../../utils/propertyMapping';
import './PropCard.css';

interface PropCardProps {
  property: PropertyUI;
  onOpenDetails?: () => void;
}

const PropCard: React.FC<PropCardProps> = ({ property, onOpenDetails }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Normalize data between the two mock arrays
  const location = property.address || 'Location unavailable';
  const currency = 'EGP';
  const displayBadge = property.tags && property.tags[0];
  const hostImage = property.ownerImage || `https://i.pravatar.cc/150?u=${property.id}`;
  const reviewsCount = 12; // Static or derived from ID if needed

  const handleClick = () => {
    if (onOpenDetails) {
      onOpenDetails();
    } else {
      navigate(`/browse/${property.id}`);
    }
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/auth', { state: { message: 'Please log in to save properties' } });
  };

  return (
    <div className="prop-card group" onClick={handleClick}>
      <div className="prop-img-wrapper">
        <img src={property.image} alt={property.title} className="group-hover-scale" />
        <div className="prop-overlay-gradient"></div>

        <button className="heart-btn" onClick={handleHeartClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
      <div className="prop-details">
        <div className="prop-meta-top">
          <span className="prop-loc"><MapPin size={14} /> {location}</span>
          <span className="prop-rating"><Star size={14} className="fill-star" /> {property.rating} ({reviewsCount})</span>
        </div>
        <h3 className="prop-title">{property.title}</h3>
        <div className="prop-specs">
          <span><Bed size={16} /> {property.beds} {t('guestHome.beds')}</span>
          <span><Bath size={16} /> {property.baths} {t('guestHome.baths')}</span>
          <span><Maximize size={16} /> {property.sqft} {t('guestHome.sqm')}</span>
        </div>
        <div className="prop-footer-split">
          <div className="prop-price-block">
            <span className="price-val">{property.price.toLocaleString()} {currency}</span>
            <span className="price-period">/ {t('guestHome.perMonth')}</span>
          </div>
          <img src={hostImage} alt="Host" className="host-mini-avatar" title="Verified Landlord" />
        </div>
      </div>
    </div>
  );
};

export default PropCard;