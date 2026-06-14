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

const SavedProperties: React.FC = () => {
    const navigate = useNavigate();
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
                            <h1>Saved Properties</h1>
                            <p>Curated listings you've saved — compare options, track updates, and start applications.</p>
                        </div>
                    </header>

                    {/* ── Loaded Content ── */}
                    {!loading && !error && savedItems.length > 0 && (
                        <>
                            {/* Stats Cards Row */}
                            <div className="sp-stats-grid">
                                <div className="sp-stat-card">
                                    <span className="sp-stat-label">Total Saved</span>
                                    <span className="sp-stat-value">{savedItems.length}</span>
                                    <span className="sp-stat-desc">Properties in your wishlist</span>
                                </div>
                                <div className="sp-stat-card">
                                    <span className="sp-stat-label">Average Rent</span>
                                    <span className="sp-stat-value">
                                        {stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP
                                    </span>
                                    <span className="sp-stat-desc">Mean cost per month</span>
                                </div>
                                <div className="sp-stat-card">
                                    <span className="sp-stat-label">Price Range</span>
                                    <span className="sp-stat-value">
                                        {stats.min.toLocaleString()} - {stats.max.toLocaleString()}
                                    </span>
                                    <span className="sp-stat-desc">EGP per month (min - max)</span>
                                </div>
                            </div>

                            {/* Market Insight & Toolbar Row */}
                            <div className="sp-insight-banner">
                                <div className="sp-insight-content">
                                    <span className="sp-insight-icon"><LineChart size={20} /></span>
                                    <div className="sp-insight-text">
                                        <strong>Market Pulse:</strong> Properties in your list are seeing 30% higher engagement this week. We recommend applying early.
                                    </div>
                                </div>
                                <button className="sp-insight-cta" onClick={() => navigate('/browse-properties')}>
                                    Explore More <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Toolbar (Actions) */}
                            <div className="sp-toolbar">
                                {showClearConfirm ? (
                                    <div className="sp-confirm-inline">
                                        <span>Remove all saved properties?</span>
                                        <button className="sp-confirm-btn-yes" onClick={handleClearAll}>Yes, clear</button>
                                        <button className="sp-confirm-btn-no" onClick={() => setShowClearConfirm(false)}>Cancel</button>
                                    </div>
                                ) : (
                                    <button
                                        className="sp-clear-btn"
                                        onClick={() => setShowClearConfirm(true)}
                                        title="Clear All Saved Properties"
                                    >
                                        <Trash2 size={16} />
                                        <span>Clear Wishlist</span>
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
                            <p>Loading your saved properties...</p>
                        </div>
                    )}

                    {/* ── Error State ── */}
                    {!loading && error && (
                        <div className="sp-empty-wrapper">
                            <h2>Could not load saved properties</h2>
                            <p>{error}</p>
                            <button
                                className="sp-browse-btn"
                                onClick={() => navigate('/browse-properties')}
                            >
                                Browse Properties <ArrowRight size={16} />
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
                            <h2>Your wishlist is empty</h2>
                            <p>
                                Start browsing the market and tap the heart icon on properties you like. They will appear here for you to compare and apply.
                            </p>
                            <button
                                className="sp-browse-btn"
                                onClick={() => navigate('/browse-properties')}
                            >
                                <Heart size={16} fill="white" />
                                <span>Browse Properties</span>
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