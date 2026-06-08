import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrashAlt, FaChartLine, FaArrowRight } from 'react-icons/fa';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import PropertyCard from '../../BrowseProperties/components/PropertyCard';
import { resolveLandlordUserIdFromPropertyResponse, type PropertyResponse } from '../../../services/property.service';
import savedPropertiesService from '../../../services/saved-properties.service';

import './SavedProperties.css';

interface SavedPropertyUI {
    id: string;
    ownerId: string;
    title: string;
    address: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    image: string;
    allImages: string[];
    tags: string[];
    rating: number;
    securityDeposit: number;
    furnishing: string;
    targetTenant: string;
    availableDate: string;
    petsAllowed: boolean;
    description: string;
    ownerName: string;
    ownerImage: string;
    ownerVerified: boolean;
    maintenanceResponsibilities: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
    locationLat: number | null;
    locationLng: number | null;
    availabilityDateISO: string | null;
    listedAtISO: string;
}

const mapTargetTenant = (targetTenant: string) => {
    switch (targetTenant) {
        case 'STUDENTS':
            return 'Students';
        case 'FAMILIES':
            return 'Families';
        case 'TOURISTS':
            return 'Tourists';
        default:
            return 'Any';
    }
};

const mapFurnishingLabel = (furnishing: string | null): string => {
    if (furnishing === 'Fully') return 'Fully Furnished';
    if (furnishing === 'Semi') return 'Semi-Furnished';
    return 'Unfurnished';
};

const mapPropertyToUI = (property: PropertyResponse): SavedPropertyUI => {
    const mainImage = property.images.find((image) => image.isMain)?.imageUrl;
    const fallbackImage = property.images[0]?.imageUrl;
    const image = mainImage || fallbackImage || 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800&q=80';
    const allImages = property.images.length > 0 ? property.images.map((img) => img.imageUrl) : [image];
    const tags = property.amenities.slice(0, 2).map((amenity) => amenity.name);
    const normalizedFurnishing = mapFurnishingLabel(property.furnishing);

    return {
        id: property.id,
        ownerId: resolveLandlordUserIdFromPropertyResponse(property),
        title: property.title,
        address: property.address,
        price: property.monthlyPrice,
        beds: property.specifications?.bedrooms ?? 0,
        baths: property.specifications?.bathrooms ?? 0,
        sqft: property.specifications?.areaSqft ?? 0,
        image,
        allImages,
        tags: tags.length > 0 ? tags : [property.type ?? 'Property', normalizedFurnishing],
        rating: 4.8,
        securityDeposit: property.securityDeposit,
        furnishing: normalizedFurnishing,
        targetTenant: mapTargetTenant(property.targetTenant),
        availableDate: property.availabilityDate ? new Date(property.availabilityDate).toLocaleDateString() : 'Not specified',
        availabilityDateISO: property.availabilityDate ?? null,
        listedAtISO: property.createdAt,
        locationLat:
            property.detailedLocation != null && Number.isFinite(property.detailedLocation.locationLat)
                ? property.detailedLocation.locationLat
                : null,
        locationLng:
            property.detailedLocation != null && Number.isFinite(property.detailedLocation.locationLong)
                ? property.detailedLocation.locationLong
                : null,
        petsAllowed: property.houseRules.some((rule) => rule.name === 'Pets Allowed'),
        description: property.description,
        ownerName: property.landlord
            ? `${property.landlord.firstName} ${property.landlord.lastName}`.trim()
            : 'Owner',
        ownerImage:
            property.landlord?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                property.landlord
                    ? `${property.landlord.firstName} ${property.landlord.lastName}`.trim() || 'Owner'
                    : 'Owner'
            )}&background=0f172a&color=ffffff&size=128`,
        ownerVerified: Boolean(property.landlord?.isVerified),
        maintenanceResponsibilities: property.maintenanceResponsibilities ?? [],
    };
};

const SavedProperties: React.FC = () => {
    const navigate = useNavigate();
    const [savedItems, setSavedItems] = useState<SavedPropertyUI[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSavedItems = async () => {
            setLoading(true);
            setError(null);
            try {
                const savedProperties = await savedPropertiesService.getSavedProperties();

                if (savedProperties.length === 0) {
                    setSavedItems([]);
                    return;
                }

                const mapped = savedProperties.map(mapPropertyToUI);
                setSavedItems(mapped);
            } catch {
                setError('Failed to load saved properties.');
                setSavedItems([]);
            } finally {
                setLoading(false);
            }
        };

        void loadSavedItems();
    }, []);

    const stats = useMemo(() => {
        if (savedItems.length === 0) return { total: 0, avg: 0, min: 0, max: 0 };
        const prices = savedItems.map(i => i.price);
        const total = prices.reduce((a, b) => a + b, 0);
        return {
            total,
            avg: total / savedItems.length,
            min: Math.min(...prices),
            max: Math.max(...prices),
        };
    }, [savedItems]);

    const handleOpenDetails = (property: SavedPropertyUI) => {
        navigate(`/properties/${property.id}`);
    };

    const handleClearAll = async () => {
        try {
            await savedPropertiesService.clearAll();
            setSavedItems([]);
        } finally {
            setShowClearConfirm(false);
        }
    };

    const handleToggleSave = async (propertyId: string | number) => {
        const normalized = String(propertyId);
        try {
            await savedPropertiesService.removeSavedProperty(normalized);
            setSavedItems((prev) => prev.filter((item) => item.id !== normalized));
        } catch {
            // Keep UI stable if API fails.
        }
    };

    return (
        <div className="sp-root">
            <Sidebar />

            <div className="sp-main">
                <Header />

                <div className="sp-page">

                    {/* ── HERO BANNER ── */}
                    <div className="sp-hero">
                        <div className="sp-hero-noise" />
                        <div className="sp-hero-glow sp-hero-glow--a" />
                        <div className="sp-hero-glow sp-hero-glow--b" />

                        <div className="sp-hero-inner">
                            <p className="sp-eyebrow">Your Collection</p>
                            <h1 className="sp-hero-title">
                                Saved<br />
                                <em>Properties</em>
                            </h1>
                            <p className="sp-hero-sub">
                                Curated listings you've marked for later — compare, explore, and apply.
                            </p>
                        </div>

                        {!loading && savedItems.length > 0 && (
                            <div className="sp-stats-row">
                                <div className="sp-stat">
                                    <span className="sp-stat-val">{savedItems.length}</span>
                                    <span className="sp-stat-lbl">Saved</span>
                                </div>
                                <div className="sp-stat-divider" />
                                <div className="sp-stat">
                                    <span className="sp-stat-val">${stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    <span className="sp-stat-lbl">Avg / mo</span>
                                </div>
                                <div className="sp-stat-divider" />
                                <div className="sp-stat">
                                    <span className="sp-stat-val">${stats.min.toLocaleString()}</span>
                                    <span className="sp-stat-lbl">Lowest</span>
                                </div>
                                <div className="sp-stat-divider" />
                                <div className="sp-stat">
                                    <span className="sp-stat-val">${stats.max.toLocaleString()}</span>
                                    <span className="sp-stat-lbl">Highest</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── CONTENT ── */}
                    <div className="sp-content">

                        {!loading && savedItems.length > 0 && (
                            <>
                                {/* Toolbar */}
                                <div className="sp-toolbar">
                                    <div className="sp-insight">
                                        <span className="sp-insight-icon"><FaChartLine /></span>
                                        <span className="sp-insight-text">
                                            <strong>Market Pulse:</strong> Properties in your list are seeing 30% higher engagement this week.
                                        </span>
                                        <button className="sp-insight-cta">
                                            Compare <FaArrowRight />
                                        </button>
                                    </div>

                                    <div className="sp-toolbar-actions">
                                        {showClearConfirm ? (
                                            <div className="sp-confirm">
                                                <span>Remove all?</span>
                                                <button className="sp-confirm-yes" onClick={handleClearAll}>Yes, clear</button>
                                                <button className="sp-confirm-no" onClick={() => setShowClearConfirm(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button
                                                className="sp-clear-btn"
                                                onClick={() => setShowClearConfirm(true)}
                                                title="Clear All"
                                            >
                                                <FaTrashAlt />
                                                <span>Clear All</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Grid */}
                                <div className="sp-grid">
                                    {savedItems.map((item, i) => (
                                        <div
                                            className="sp-card-wrapper"
                                            key={item.id}
                                            style={{ animationDelay: `${i * 80}ms` }}
                                        >
                                            <PropertyCard
                                                property={item}
                                                onOpenDetails={() => handleOpenDetails(item)}
                                                isSaved={true}
                                                onToggleSave={handleToggleSave}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Empty State */}
                        {!loading && error && (
                            <div className="sp-empty">
                                <h2 className="sp-empty-title">Could not load saved properties</h2>
                                <p className="sp-empty-sub">{error}</p>
                                <button
                                    className="sp-browse-btn"
                                    onClick={() => navigate('/browse-properties')}
                                >
                                    Browse Properties <FaArrowRight />
                                </button>
                            </div>
                        )}

                        {!loading && !error && savedItems.length === 0 && (
                            <div className="sp-empty">
                                <div className="sp-empty-ring sp-empty-ring--outer" />
                                <div className="sp-empty-ring sp-empty-ring--inner" />
                                <video
                                    className="sp-empty-video"
                                    src="/HOMI_Boy.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                                <h2 className="sp-empty-title">Nothing saved yet</h2>
                                <p className="sp-empty-sub">
                                    Start browsing and heart the listings you love — they'll appear right here.
                                </p>
                                <button
                                    className="sp-browse-btn"
                                    onClick={() => navigate('/browse-properties')}
                                >
                                    Browse Properties <FaArrowRight />
                                </button>
                            </div>
                        )}

                        {loading && (
                            <div className="sp-empty">
                                <h2 className="sp-empty-title">Loading saved properties...</h2>
                                <p className="sp-empty-sub">Please wait while we fetch your latest saved listings.</p>
                            </div>
                        )}
                    </div>
                </div>

                <Footer />
            </div>
        </div>
    );
};

export default SavedProperties;