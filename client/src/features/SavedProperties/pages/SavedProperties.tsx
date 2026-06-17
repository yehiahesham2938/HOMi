import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, LineChart, ArrowRight, Heart } from 'lucide-react';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import PropertyCard from '../../BrowseProperties/components/PropertyCard';
import { mapPropertyToUI, type PropertyUI } from '../../../utils/propertyMapping';
import savedPropertiesService from '../../../services/saved-properties.service';
import './SavedProperties.css';
import { useTranslation } from 'react-i18next';

const SavedProperties: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    const [savedItems, setSavedItems] = useState<PropertyUI[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSavedItems = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await savedPropertiesService.getSavedProperties();

                if (response.length === 0) {
                    setSavedItems([]);
                    return;
                }

                const mapped = response.map(mapPropertyToUI);
                setSavedItems(mapped);
            } catch {
                setError(t('savedProperties.failedLoad'));
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

    const handleOpenDetails = (property: PropertyUI) => {
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
            <div className="sp-main">
                <Sidebar />

                <div className="sp-page">
                    <Header />

                    {/* ── Page Header ── */}
                    <header className="sp-header animate-fade-in">
                        <div>
                            <h1>{t('savedProperties.pageTitle')}</h1>
                            <p>{t('savedProperties.pageSubtitle')}</p>
                        </div>
                    </header>

                    {/* ── Loaded Content ── */}
                    {!loading && !error && savedItems.length > 0 && (
                        <>
                            {/* Stats Cards Row */}
                            <div className="sp-stats-grid">
                                <div className="sp-stat-card">
                                    <span className="sp-stat-label">{t('savedProperties.totalSaved')}</span>
                                    <span className="sp-stat-value">{savedItems.length}</span>
                                    <span className="sp-stat-desc">{t('savedProperties.wishlistDesc')}</span>
                                </div>
                                <div className="sp-stat-card">
                                    <span className="sp-stat-label">{t('savedProperties.avgRent')}</span>
                                    <span className="sp-stat-value">
                                        {stats.avg.toLocaleString(locale, { maximumFractionDigits: 0 })}{t('savedProperties.egpCurrency')}
                                    </span>
                                    <span className="sp-stat-desc">{t('savedProperties.meanCost')}</span>
                                </div>
                                <div className="sp-stat-card">
                                    <span className="sp-stat-label">{t('savedProperties.priceRange')}</span>
                                    <span className="sp-stat-value">
                                        {stats.min.toLocaleString(locale)} - {stats.max.toLocaleString(locale)}
                                    </span>
                                    <span className="sp-stat-desc">{t('savedProperties.priceRangeDesc')}</span>
                                </div>
                            </div>

                            {/* Market Insight & Toolbar Row */}
                            <div className="sp-insight-banner">
                                <div className="sp-insight-content">
                                    <span className="sp-insight-icon"><LineChart size={20} /></span>
                                    <div className="sp-insight-text">
                                        <strong>{t('savedProperties.marketPulse')}</strong> {t('savedProperties.insightText')}
                                    </div>
                                </div>
                                <button className="sp-insight-cta" onClick={() => navigate('/browse-properties')}>
                                    {t('savedProperties.exploreMore')} <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Toolbar (Actions) */}
                            <div className="sp-toolbar">
                                {showClearConfirm ? (
                                    <div className="sp-confirm-inline">
                                        <span>{t('savedProperties.clearConfirm')}</span>
                                        <button className="sp-confirm-btn-yes" onClick={handleClearAll}>{t('savedProperties.clearConfirmYes')}</button>
                                        <button className="sp-confirm-btn-no" onClick={() => setShowClearConfirm(false)}>{t('savedProperties.clearConfirmNo')}</button>
                                    </div>
                                ) : (
                                    <button
                                        className="sp-clear-btn"
                                        onClick={() => setShowClearConfirm(true)}
                                        title={t('savedProperties.clearWishlist')}
                                    >
                                        <Trash2 size={16} />
                                        <span>{t('savedProperties.clearWishlist')}</span>
                                    </button>
                                )}
                            </div>

                            {/* Properties Grid */}
                            <div className="sp-grid">
                                {savedItems.map((item, i) => (
                                    <div
                                        className="sp-card-wrapper"
                                        key={item.id}
                                        style={{ animationDelay: `${i * 60}ms` }}
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

                    {/* ── Loading State ── */}
                    {loading && (
                        <div className="sp-loader-wrapper">
                            <div className="sp-spinner" />
                            <p>{t('savedProperties.loadingText')}</p>
                        </div>
                    )}

                    {/* ── Error State ── */}
                    {!loading && error && (
                        <div className="sp-empty-wrapper">
                            <h2>{t('savedProperties.couldNotLoad')}</h2>
                            <p>{error}</p>
                            <button
                                className="sp-browse-btn"
                                onClick={() => navigate('/browse-properties')}
                            >
                                {t('savedProperties.browseBtn')} <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* ── Empty State ── */}
                    {!loading && !error && savedItems.length === 0 && (
                        <div className="sp-empty-wrapper">
                            <div className="sp-empty-video-container">
                                <div className="sp-empty-ring sp-empty-ring-outer" />
                                <div className="sp-empty-ring sp-empty-ring-inner" />
                                <video
                                    className="sp-empty-video"
                                    src="/HOMI_Boy.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                            </div>
                            <h2>{t('savedProperties.emptyWishlist')}</h2>
                            <p>
                                {t('savedProperties.emptyWishlistDesc')}
                            </p>
                            <button
                                className="sp-browse-btn"
                                onClick={() => navigate('/browse-properties')}
                            >
                                <Heart size={16} fill="white" />
                                <span>{t('savedProperties.browseBtn')}</span>
                            </button>
                        </div>
                    )}

                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default SavedProperties;