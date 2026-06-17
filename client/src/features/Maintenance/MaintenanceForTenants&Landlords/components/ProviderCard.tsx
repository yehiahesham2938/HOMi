import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar, FaMapMarkerAlt, FaToolbox, FaCheckCircle, FaChevronRight } from 'react-icons/fa';
import './ProviderCard.css';

interface ProviderCardProps {
    id: string;
    name: string;
    specialty: string;
    rating: number;
    reviewCount: number;
    location: string;
    priceRange: string;
    imageUrl: string;
    isVerified?: boolean;
    completedJobs: number;
    onViewProfile: (id: string) => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
    id,
    name,
    specialty,
    rating,
    reviewCount,
    location,
    priceRange,
    imageUrl,
    isVerified = false,
    completedJobs,
    onViewProfile
}) => {
    const { t } = useTranslation();
    return (
        <div className="provider-card">
            <div className="provider-image-wrapper">
                <img src={imageUrl} alt={name} className="provider-image" />
                {isVerified && (
                    <div className="verified-badge" title="Verified Professional">
                        <FaCheckCircle />
                    </div>
                )}
            </div>
            
            <div className="provider-info">
                <div className="provider-header">
                    <h3 className="provider-name">{name}</h3>
                    <div className="provider-rating">
                        <FaStar className="star-icon" />
                        <span>{rating.toFixed(1)}</span>
                        <span className="review-count">({t('maintenance.reviewsCount', { count: reviewCount })})</span>
                    </div>
                </div>
                
                <div className="provider-specialty">
                    <FaToolbox className="info-icon" />
                    <span>{t('myProperties.maintenanceTypes.' + specialty, specialty)}</span>
                </div>
                
                <div className="provider-location">
                    <FaMapMarkerAlt className="info-icon" />
                    <span>{location}</span>
                </div>
                
                <div className="provider-stats">
                    <div className="stat-item">
                        <span className="stat-value">{completedJobs}+</span>
                        <span className="stat-label">{t('maintenance.jobsCompleted')}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{priceRange}</span>
                        <span className="stat-label">{t('maintenance.startingFrom')}</span>
                    </div>
                </div>
                
                <button className="view-profile-btn" onClick={() => onViewProfile(id)}>
                    {t('maintenance.viewProfile')}
                    <FaChevronRight className="btn-icon" />
                </button>
            </div>
        </div>
    );
};

export default ProviderCard;
