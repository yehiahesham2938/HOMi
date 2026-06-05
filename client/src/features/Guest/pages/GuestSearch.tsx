import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Search, ArrowRight, ArrowLeft, Globe, Menu, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';

import PropCard from '../components/PropCard';
import { propertyService } from '../../../services/property.service';
import { mapPropertyToUI } from '../../../utils/propertyMapping';
import type { PropertyUI as Property } from '../../../utils/propertyMapping';
import AuthModal from '../../../components/global/AuthModal';
import Footer from '../../../components/global/footer';
import './GuestSearch.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const EGYPT_BOUNDS = L.latLngBounds(
    L.latLng(21.9, 24.6),
    L.latLng(31.7, 36.9)
);

// Map geocoder search field component
const SearchField = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
    const map = useMap();
    useEffect(() => {
        // @ts-expect-error — leaflet-control-geocoder augments L.Control at runtime
        const geocoder = L.Control.Geocoder.nominatim();
        // @ts-expect-error — geocoder control factory is not in @types/leaflet
        const control = L.Control.geocoder({
            geocoder,
            defaultMarkGeocode: false,
            placeholder: "Search in Egypt...",
        })
            .on('markgeocode', (e: { geocode: { center: L.LatLng } }) => {
                const { center } = e.geocode;
                if (EGYPT_BOUNDS.contains(center)) {
                    map.setView(center, 12);
                    onLocationSelect(center.lat, center.lng);
                } else {
                    alert("Please select a location within Egypt.");
                }
            })
            .addTo(map);
        return () => { map.removeControl(control); };
    }, [map, onLocationSelect]);
    return null;
};

// Map click and bounds constraints handler
interface MapEventsHandlerProps {
    position: { lat: number; lng: number };
    onLocationSelect: (lat: number, lng: number) => void;
    radiusKm: number;
}

const MapEventsHandler = ({ position, onLocationSelect, radiusKm }: MapEventsHandlerProps) => {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        map.setMaxBounds(EGYPT_BOUNDS);
    }, [map]);
    useMapEvents({
        click(e) {
            if (EGYPT_BOUNDS.contains(e.latlng)) {
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    if (!position) return null;
    return (
        <>
            <Marker position={[position.lat, position.lng]} />
            <Circle
                center={[position.lat, position.lng]}
                radius={radiusKm * 1000} // Convert km to meters
                pathOptions={{ fillColor: '#3b82f6', color: '#1d4ed8', weight: 2 }}
            />
        </>
    );
};

// Center updater
const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, Math.max(map.getZoom(), 12));
    }, [center, map]);
    return null;
};

const GuestSearch: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Nav and Layout States
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'curated' | 'all'>('all');

    // Filtering & Sorting States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedBeds, setSelectedBeds] = useState('');
    const [selectedPrice, setSelectedPrice] = useState('');
    const [sortBy, setSortBy] = useState('featured');

    // Map geographic search coordinates & states
    const [position, setPosition] = useState<{ lat: number, lng: number } | null>({ lat: 30.0444, lng: 31.2357 }); // Defaults to Cairo
    const [radiusKm, setRadiusKm] = useState<number>(10);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Scroller refs for horizontal curations
    const ratedRef = useRef<HTMLDivElement>(null);
    const lifeRef = useRef<HTMLDivElement>(null);
    const newRef = useRef<HTMLDivElement>(null);

    // Scroll helper
    const handleScrollHorizontal = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (ref.current) {
            const scrollAmount = 320;
            ref.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await propertyService.getAllProperties({
                    status: 'AVAILABLE',
                    page: 1,
                    limit: 100
                });
                setProperties(response.data.map(mapPropertyToUI));
            } catch (err) {
                console.error('Failed to fetch properties for GuestSearch:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
    };

    // Geodistance helper (Haversine formula in km)
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Filter logic
    const filteredProperties = properties.filter((property) => {
        const q = searchQuery.toLowerCase();

        // Location keyword fallback if no map coordinates exist on property
        const matchesQuery =
            !q ||
            (property.title || '').toLowerCase().includes(q) ||
            (property.address || '').toLowerCase().includes(q) ||
            (property.tags && property.tags.some(t => t.toLowerCase().includes(q)));

        const matchesType = !selectedType || (property.type || '').toUpperCase() === selectedType.toUpperCase();

        const matchesBeds =
            !selectedBeds ||
            (selectedBeds === '4' ? property.beds >= 4 : property.beds === parseInt(selectedBeds));

        const matchesPrice = !selectedPrice || property.price <= parseInt(selectedPrice);

        // Distance matching radius logic
        const matchesDistance = !position ||
            (property.locationLat && property.locationLng
                ? getDistance(position.lat, position.lng, property.locationLat, property.locationLng) <= radiusKm
                : (q ? (property.address || '').toLowerCase().includes(q) : true)
            );

        return matchesQuery && matchesType && matchesBeds && matchesPrice && matchesDistance;
    });

    const sortedProperties = [...filteredProperties].sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'newest') return b.id.localeCompare(a.id);

        // Featured default
        const aFeatured = a.tags && a.tags.some(t => t.toLowerCase() === 'featured' || t.toLowerCase() === '⭐ featured');
        const bFeatured = b.tags && b.tags.some(t => t.toLowerCase() === 'featured' || t.toLowerCase() === '⭐ featured');
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        return 0;
    });

    // Curated groups from filtered/sorted list
    const popularProperties = sortedProperties.slice(0, 6);
    const recommendedProperties = sortedProperties.slice(6, 12);
    const newListings = sortedProperties.slice(12, 18);

    // Current Geolocation Action
    const handleUseCurrentLocation = () => {
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (coords) => {
                const { latitude, longitude } = coords.coords;
                const candidate = L.latLng(latitude, longitude);
                if (!EGYPT_BOUNDS.contains(candidate)) {
                    setIsLocating(false);
                    setLocationError('Current location appears to be outside Egypt.');
                    return;
                }
                setPosition({ lat: latitude, lng: longitude });
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                setLocationError('Could not obtain current location.');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedType('');
        setSelectedPrice('');
        setSelectedBeds('');
        setSortBy('featured');
        setPosition({ lat: 30.0444, lng: 31.2357 }); // Resets to Cairo center
        setRadiusKm(10);
        setLocationError(null);
    };

    const getHelpFromGuest = {
        pathname: '/get-help',
        state: { fromGuestHome: true },
    };

    const handleOpenDetails = (property: Property) => {
        navigate(`/properties/${property.id}`);
    };

    return (
        <div className="search-layout">
            {/* 1. Header Navbar - Identical to GuestHome */}
            <nav className={`guest-nav ${isScrolled ? 'scrolled' : ''}`}>
                <div className="nav-container">
                    <div className="header-left-group">
                        <Link to="/guest-home" className="back-home-link" title="Back to Homepage">
                            <ArrowLeft size={16} />
                            <span>{t('guestHome.backToHome')}</span>
                        </Link>
                        <Link to="/guest-home" className="brand-logo">
                            <img src="/logo.png" alt="HOMi Logo" className="logo-image" />
                        </Link>
                    </div>

                    <div className="nav-links desktop-only">
                        <Link to="/guest-search" className="active">{t('guestHome.browseHomes')}</Link>
                        <Link to="/how-it-works-choose">{t('guestHome.howItWorks')}</Link>
                        <Link to={getHelpFromGuest}>{t('guestHome.helpCenter')}</Link>
                    </div>

                    <div className="nav-actions desktop-only">
                        <button className="lang-toggle-btn" onClick={toggleLanguage} title={i18n.language === 'en' ? 'Arabic' : 'English'}>
                            <Globe size={18} />
                            <span>{i18n.language === 'en' ? 'ع' : 'En'}</span>
                        </button>
                        <button className="btn-text" onClick={() => navigate('/auth')}>{t('guestHome.login')}</button>
                        <button className="btn-primary-pill" onClick={() => navigate('/auth')}>{t('guestHome.signup')}</button>
                    </div>

                    <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="mobile-nav-panel">
                        <Link to="/guest-search" onClick={() => setMobileMenuOpen(false)}>{t('guestHome.browseHomes')}</Link>
                        <Link to="/how-it-works-choose" onClick={() => setMobileMenuOpen(false)}>{t('guestHome.howItWorks')}</Link>
                        <Link to={getHelpFromGuest} onClick={() => setMobileMenuOpen(false)}>{t('guestHome.helpCenter')}</Link>
                        <div className="mobile-lang-row">
                            <button className="lang-toggle-btn" onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}>
                                <Globe size={18} />
                                <span>{i18n.language === 'en' ? 'Arabic' : 'English'}</span>
                            </button>
                        </div>
                        <button className="btn-text mobile-nav-login" onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
                            {t('guestHome.login')}
                        </button>
                        <button className="btn-primary-pill mobile-nav-signup" onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
                            {t('guestHome.signup')}
                        </button>
                    </div>
                )}
            </nav>

            {/* 2. Interactive Filters & Leaflet Map Explorer Banner (Combined) */}
            <div className="search-hero-banner">
                <div className="shb-grid-bg"></div>
                <div className="shb-container">

                    {/* Left Panel: Intro & Filters */}
                    <div className="shb-left-panel">
                        <div className="shb-intro-text">
                            <h1>Explore Premium Verified Rentals</h1>
                            <p>Search compound villas, modern apartments, and cozy beach houses across Egypt with 100% direct pricing and secure digital leases.</p>
                        </div>

                        <div className="shb-filter-card">
                            <div className="filter-grid-inputs">
                                <div className="filter-input-col">
                                    <label>Location Text Filter</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon">📍</span>
                                        <input
                                            type="text"
                                            placeholder="Zamalek, Maadi, Gouna..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="filter-input-col">
                                    <label>Property Type</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon"></span>
                                        <select
                                            value={selectedType}
                                            onChange={(e) => setSelectedType(e.target.value)}
                                        >
                                            <option value="">All Types</option>
                                            <option value="APARTMENT">Apartment</option>
                                            <option value="VILLA">Villa</option>
                                            <option value="STUDIO">Studio</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="filter-input-col">
                                    <label>Max Price / Month</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon"></span>
                                        <select
                                            value={selectedPrice}
                                            onChange={(e) => setSelectedPrice(e.target.value)}
                                        >
                                            <option value="">Any Price</option>
                                            <option value="8000">Up to 8k EGP</option>
                                            <option value="15000">Up to 15k EGP</option>
                                            <option value="25000">Up to 25k EGP</option>
                                            <option value="50000">Up to 50k EGP</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="filter-input-col">
                                    <label>Bedrooms</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon"></span>
                                        <select
                                            value={selectedBeds}
                                            onChange={(e) => setSelectedBeds(e.target.value)}
                                        >
                                            <option value="">Any Beds</option>
                                            <option value="1">1 Bedroom</option>
                                            <option value="2">2 Bedrooms</option>
                                            <option value="3">3 Bedrooms</option>
                                            <option value="4">4+ Bedrooms</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="filter-actions-row">
                                <button className="clear-filters-btn" onClick={clearFilters}>Reset Filters</button>
                                <span className="results-indicator">
                                    <strong>{sortedProperties.length}</strong> matching homes in Egypt
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Interactive Leaflet Map Explorer */}
                    <div className="shb-right-panel">
                        <div className="glass-explorer-card">
                            <div className="explorer-card-header">
                                <span className="explorer-tag">Geographic Explorer</span>
                                <h2>Egypt Map Search</h2>
                                <p>Type in the map search bar, click anywhere to set coordinates, or adjust the search radius to filter matching listings.</p>
                            </div>

                            {/* Leaflet Map Integration */}
                            <div className="explorer-map-wrap" style={{ height: '240px' }}>
                                <MapContainer
                                    center={position ? [position.lat, position.lng] : [30.0444, 31.2357]}
                                    zoom={position ? 12 : 6}
                                    maxBounds={EGYPT_BOUNDS}
                                    style={{ height: '100%', width: '100%', borderRadius: '14px' }}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {position && <MapCenterUpdater center={[position.lat, position.lng]} />}
                                    <SearchField onLocationSelect={(lat, lng) => setPosition({ lat, lng })} />

                                    {position && (
                                        <MapEventsHandler
                                            position={position}
                                            onLocationSelect={(lat: number, lng: number) => setPosition({ lat, lng })}
                                            radiusKm={radiusKm}
                                        />
                                    )}

                                    {/* Render property pins on map */}
                                    {sortedProperties.map(prop => {
                                        if (prop.locationLat && prop.locationLng) {
                                            return (
                                                <Marker
                                                    key={prop.id}
                                                    position={[prop.locationLat, prop.locationLng]}
                                                    eventHandlers={{
                                                        click: () => handleOpenDetails(prop)
                                                    }}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </MapContainer>
                            </div>

                            {/* Geolocation Toolbar & Radius Controls */}
                            <div className="explorer-stats-panel" style={{ gap: '8px', padding: '12px' }}>
                                <div className="map-search-toolbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="location-action-btn"
                                        onClick={handleUseCurrentLocation}
                                        disabled={isLocating}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid var(--gray-200)',
                                            background: '#fff',
                                            fontSize: '0.78rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            color: 'var(--gray-700)'
                                        }}
                                    >
                                        🌐 {isLocating ? 'Locating...' : 'Use Current Location'}
                                    </button>

                                    {position && (
                                        <button
                                            className="clear-location-btn"
                                            onClick={() => { setPosition(null); setLocationError(null); }}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px dashed #ef4444',
                                                background: '#fef2f2',
                                                fontSize: '0.78rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                color: '#b91c1c'
                                            }}
                                        >
                                            Reset Map Focus
                                        </button>
                                    )}
                                </div>
                                {locationError && <p className="map-location-error" style={{ color: '#ef4444', fontSize: '0.75rem', margin: 0 }}>{locationError}</p>}

                                {position && (
                                    <div className="map-radius-control" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                                            <span>Search Radius:</span>
                                            <span style={{ color: 'var(--blue)' }}>{radiusKm} km</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1" max="50" step="1"
                                            value={radiusKm}
                                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                                            style={{ width: '100%', cursor: 'pointer' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 3. Main Results Grid Section (100% Full Width Properties listings) */}
            <main className="guest-search-main-content">
                <div className="results-controls-header">
                    <div className="results-tabs">
                        <button
                            className={`tab-toggle ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            🔍 All Listings ({sortedProperties.length})
                        </button>

                    </div>

                    <div className="results-sort">
                        <label>Sort by</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="featured">Featured Listings</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="newest">Newly Listed</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="search-loading">
                        <div className="loading-spinner"></div>
                        <p>Finding perfect homes for you...</p>
                    </div>
                ) : sortedProperties.length === 0 ? (
                    <div className="search-no-results">
                        <div className="no-results-icon">🏠</div>
                        <h3>No properties found matching your search</h3>
                        <p>Try clearing some filters or panning the map to see live listings.</p>
                        <button className="btn-primary-pill" onClick={clearFilters}>Reset Filters</button>
                    </div>
                ) : activeTab === 'all' ? (
                    /* All Listings Grid View (Full Width) */
                    <div className="results-grid">
                        {sortedProperties.map(property => (
                            <PropCard
                                key={property.id}
                                property={property}
                                onOpenDetails={() => handleOpenDetails(property)}
                            />
                        ))}
                    </div>
                ) : (
                    /* Curated Horizontally Scrolling View (Full Width) */
                    <div className="curated-lists-wrap">

                        {/* CURATED SECTION 1 */}
                        {popularProperties.length > 0 && (
                            <section className="curated-scroll-section">
                                <div className="curated-section-header">
                                    <div className="curated-title">
                                        <h2>🏆 Highest Rated Rentals</h2>
                                        <p>Most loved homes based on tenant ratings and verification status</p>
                                    </div>
                                </div>
                                <div className="curated-scroller" ref={ratedRef}>
                                    {popularProperties.map(property => (
                                        <div className="curated-card-item" key={property.id}>
                                            <PropCard
                                                property={property}
                                                onOpenDetails={() => handleOpenDetails(property)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* CURATED SECTION 2 */}
                        {recommendedProperties.length > 0 && (
                            <section className="curated-scroll-section">
                                <div className="curated-section-header">
                                    <div className="curated-title">
                                        <h2>🛋️ Curated Lifestyle Matches</h2>
                                        <p>Fully furnished spaces with top amenities in prime locations</p>
                                    </div>

                                </div>
                                <div className="curated-scroller" ref={lifeRef}>
                                    {recommendedProperties.map(property => (
                                        <div className="curated-card-item" key={property.id}>
                                            <PropCard
                                                property={property}
                                                onOpenDetails={() => handleOpenDetails(property)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* CURATED SECTION 3 */}
                        {newListings.length > 0 && (
                            <section className="curated-scroll-section">
                                <div className="curated-section-header">
                                    <div className="curated-title">
                                        <h2>⚡ New Listings</h2>
                                        <p>Fresh properties listed on the market within the last 48 hours</p>
                                    </div>

                                </div>
                                <div className="curated-scroller" ref={newRef}>
                                    {newListings.map(property => (
                                        <div className="curated-card-item" key={property.id}>
                                            <PropCard
                                                property={property}
                                                onOpenDetails={() => handleOpenDetails(property)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            <Footer />

            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </div>
    );
};

export default GuestSearch;