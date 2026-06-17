// client\src\features\BrowseProperties\components\PropertyCard.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import './PropertyCard.css';

interface PropertyCardProps {
    property: {
        id: string | number;
        title: string;
        address: string;
        price: number;
        beds: number;
        baths: number;
        sqft: number;
        image: string;
        tags: string[];
        rating: number;
        type?: string;
        ownerName?: string;
        ownerImage?: string;
        ownerVerified?: boolean;
        status?: string;
        availableDate?: string;
    };
    onOpenDetails: () => void;
    isSaved?: boolean;
    onToggleSave?: (propertyId: string | number) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onOpenDetails,
    isSaved = false,
    onToggleSave
}) => {
    const { t } = useTranslation();
    const isFeatured = property.tags && property.tags.some(t => t.toLowerCase() === 'featured' || t.toLowerCase() === '⭐ featured');
    const isRented = property.status?.toUpperCase() === 'RENTED';
    const isUnavailable = property.status?.toUpperCase() === 'UNAVAILABLE';
    
    const badge = isUnavailable 
        ? `✓ ${t('browseProperties.unavailable')}` 
        : isRented 
            ? `✓ ${t('browseProperties.rented')}` 
            : isFeatured 
                ? `⭐ ${t('browseProperties.featured')}` 
                : `✓ ${t('browseProperties.available')}`;
                
    const badgeClass = isUnavailable ? 'unavailable' : isRented ? 'rented' : isFeatured ? 'featured' : 'available';

    const handleWishlistToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleSave) {
            onToggleSave(property.id);
        }
    };

    return (
        <div
            className="prop-card"
            onClick={onOpenDetails}
            dir="ltr"
        >
            <div className="prop-img">
                <img src={property.image} alt={property.title} loading="lazy" />
                <button
                    className={`prop-save ${isSaved ? 'saved' : ''}`}
                    onClick={handleWishlistToggle}
                    title={isSaved ? t('browseProperties.clearSearch') : t('browseProperties.searchProperties')}
                >
                    {isSaved ? '❤️' : '🤍'}
                </button>
                <span className="prop-type-tag">{property.type || t('browseProperties.apartment')}</span>
            </div>
            <div className="prop-body">
                <div className="prop-price">
                    {property.price.toLocaleString()} <em>{t('browseProperties.egpMonth')}</em>
                </div>
                <div className="prop-title">{property.title}</div>
                <div className="prop-location">
                    <div className="prop-location-dot"></div>
                    {property.address}
                </div>
                {property.availableDate && (
                    <div className="prop-availability" style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📅 {t('browseProperties.availableDate', { date: property.availableDate })}</span>
                    </div>
                )}
                <div className="prop-specs">
                    <div className="prop-spec">
                        <strong>{property.beds}</strong>{t('browseProperties.beds')}
                    </div>
                    <div className="prop-spec">
                        <strong>{property.baths}</strong>{t('browseProperties.baths')}
                    </div>
                    <div className="prop-spec">
                        <strong>{property.sqft}</strong>{t('browseProperties.sqft')}
                    </div>
                </div>
                <div className="prop-landlord">
                    <img
                        className="prop-avatar"
                        src={property.ownerImage || 'https://i.pravatar.cc/150'}
                        alt="Landlord"
                    />
                    <div className="prop-landlord-name">
                        <strong>{property.ownerName || t('browseProperties.verifiedLandlord')}</strong>{t('browseProperties.verifiedLandlord')}
                    </div>
                    <button
                        className="prop-apply-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails();
                        }}
                        style={(isRented || isUnavailable) ? { backgroundColor: '#e2e8f0', color: '#64748b', borderColor: '#cbd5e1', cursor: 'default' } : undefined}
                        disabled={isRented || isUnavailable}
                    >
                        {isUnavailable 
                            ? t('browseProperties.unavailable') 
                            : isRented 
                                ? t('browseProperties.rented') 
                                : t('browseProperties.applyNow')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;