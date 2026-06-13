import React from 'react';
import { useTranslation } from 'react-i18next';
import './AvailableJobCard.css';
import { 
    FaMapMarkerAlt, FaUser, FaTag, FaClock, 
    FaDollarSign, FaInfoCircle, FaArrowRight 
} from 'react-icons/fa';

export interface AvailableJobCardProps {
    id: string;
    issueType: string;
    description: string;
    requesterName: string;
    propertyLocation: string;
    price: number | string;
    datePublished: string;
    urgency: 'Low' | 'Medium' | 'High' | 'Critical';
    onViewDetails?: (id: string) => void;
    onApply?: (id: string) => void;
}

const AvailableJobCard: React.FC<AvailableJobCardProps> = ({
    id,
    issueType,
    description,
    requesterName,
    propertyLocation,
    price,
    datePublished,
    urgency,
    onViewDetails,
    onApply
}) => {
    const { t } = useTranslation();
    return (
        <div className="modern-job-card">
            <div className={`status-border ${urgency.toLowerCase()}`} />
            
            <div className="card-inner">
                <div className="card-top-bar">
                    <div className="id-tag">REF-{id.split('-')[1]?.toUpperCase() || id.slice(-4).toUpperCase()}</div>
                    <div className="time-since">
                        <FaClock className="icon" /> {datePublished}
                    </div>
                </div>

                <div className="card-body-content">
                    <div className="category-header">
                        <div className="cat-icon-bg">
                            <FaTag />
                        </div>
                        <span className="cat-text">{t('myProperties.maintenanceTypes.' + issueType, issueType)}</span>
                    </div>
                    
                    <h3 className="job-title-main">{description}</h3>
                    
                    <div className="job-quick-specs">
                        <div className="spec-item">
                            <FaMapMarkerAlt className="spec-icon" />
                            <span>{propertyLocation}</span>
                        </div>
                        <div className="spec-item">
                            <FaUser className="spec-icon" />
                            <span>{requesterName}</span>
                        </div>
                    </div>
                </div>

                <div className="card-footer-premium">
                    <div className="price-section">
                        <span className="price-sub">Budget</span>
                        <div className="price-wrap">
                            <FaDollarSign className="currency-sign" />
                            <span className="amount">{typeof price === 'number' ? price.toLocaleString() : price}</span>
                        </div>
                    </div>
                    
                    <div className="actions-wrap">
                        <button className="action-circle-btn" onClick={() => onViewDetails?.(id)} aria-label="Details">
                            <FaInfoCircle />
                        </button>
                        <button className="action-apply-pill" onClick={() => onApply?.(id)}>
                            Apply <FaArrowRight className="arrow" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvailableJobCard;
