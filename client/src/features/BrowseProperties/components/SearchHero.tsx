import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSearch, FaHome, FaDollarSign, FaSlidersH, FaCalendarAlt, FaUserFriends, FaCouch, FaMapMarkedAlt, FaCrosshairs } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import './SearchHero.css';

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

const SearchField = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
    const map = useMap();
    const { t } = useTranslation();

    useEffect(() => {
        // @ts-expect-error — leaflet-control-geocoder augments L.Control at runtime
        const geocoder = L.Control.Geocoder.nominatim();
        // @ts-expect-error — geocoder control factory is not in @types/leaflet
        const control = L.Control.geocoder({
            geocoder,
            defaultMarkGeocode: false,
            placeholder: t('browseProperties.searchInEgypt'),
        })
            .on('markgeocode', (e: { geocode: { center: L.LatLng } }) => {
                const { center } = e.geocode;
                if (EGYPT_BOUNDS.contains(center)) {
                    map.setView(center, 12);
                    onLocationSelect(center.lat, center.lng);
                } else {
                    alert(t('browseProperties.locationWithinEgypt'));
                }
            })
            .addTo(map);
        return () => { map.removeControl(control); };
    }, [map, onLocationSelect, t]);
    return null;
};

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

const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center, Math.max(map.getZoom(), 12));
    }, [center, map]);

    return null;
};

export interface FilterParams {
    type?: string;
    furnishing?: string;
    target_tenant?: string;
    minPrice?: number | '';
    maxPrice?: number | '';
    availabilityDate?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
}

interface SearchHeroProps {
    onSearch: (filters: FilterParams) => void;
}

const SearchHero: React.FC<SearchHeroProps> = ({ onSearch }) => {
    const { t } = useTranslation();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [filters, setFilters] = useState<FilterParams>({
        type: '',
        furnishing: '',
        target_tenant: '',
        minPrice: '',
        maxPrice: '',
        availabilityDate: '',
    });
    const [position, setPosition] = useState<{ lat: number, lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(5);
    const [isMapActive, setIsMapActive] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [cityQuery, setCityQuery] = useState('');
    const [isCitySearching, setIsCitySearching] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: name === 'minPrice' || name === 'maxPrice' ? (value ? Number(value) : '') : value
        }));
    };

    const handleSearchClick = () => {
        const cleanedFilters: FilterParams = {};
        if (filters.type) cleanedFilters.type = filters.type;
        if (filters.furnishing) cleanedFilters.furnishing = filters.furnishing;
        if (filters.target_tenant) cleanedFilters.target_tenant = filters.target_tenant;
        if (filters.minPrice !== '') cleanedFilters.minPrice = filters.minPrice;
        if (filters.maxPrice !== '') cleanedFilters.maxPrice = filters.maxPrice;
        if (filters.availabilityDate) {
            if (/^\d{4}-\d{2}$/.test(filters.availabilityDate)) {
                cleanedFilters.availabilityDate = `${filters.availabilityDate}-01`;
            } else {
                cleanedFilters.availabilityDate = filters.availabilityDate;
            }
        }

        if (position) {
            cleanedFilters.lat = position.lat;
            cleanedFilters.lng = position.lng;
            cleanedFilters.radiusKm = radiusKm;
        }

        onSearch(cleanedFilters);
    };

    const handleUseCurrentLocation = () => {
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError(t('browseProperties.locationDenied'));
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (coords) => {
                const { latitude, longitude } = coords.coords;
                const candidate = L.latLng(latitude, longitude);

                if (!EGYPT_BOUNDS.contains(candidate)) {
                    setIsLocating(false);
                    setLocationError(t('browseProperties.locationWithinEgypt'));
                    return;
                }

                setPosition({ lat: latitude, lng: longitude });
                setIsMapActive(true);
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                if (error.code === error.PERMISSION_DENIED) {
                    setLocationError(t('browseProperties.locationDenied'));
                    return;
                }

                setLocationError(t('browseProperties.locationError'));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    const handleCitySearch = async () => {
        const query = cityQuery.trim();
        if (!query) {
            setLocationError(t('browseProperties.typeCityFirst'));
            return;
        }

        setLocationError(null);
        setIsCitySearching(true);

        try {
            const cityInEgyptQuery = `${query}, Egypt`;
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(cityInEgyptQuery)}&limit=1`
            );
            const results = await response.json();

            if (!Array.isArray(results) || results.length === 0) {
                setLocationError(t('browseProperties.cityNotFound'));
                return;
            }

            const lat = Number(results[0].lat);
            const lng = Number(results[0].lon);

            if (Number.isNaN(lat) || Number.isNaN(lng) || !EGYPT_BOUNDS.contains(L.latLng(lat, lng))) {
                setLocationError(t('browseProperties.citySearchWithinEgypt'));
                return;
            }

            setPosition({ lat, lng });
            setIsMapActive(true);
        } catch (error) {
            console.error('City search failed', error);
            setLocationError(t('browseProperties.citySearchFailed'));
        } finally {
            setIsCitySearching(false);
        }
    };

    const handleClearClick = () => {
        setFilters({
            type: '',
            furnishing: '',
            target_tenant: '',
            minPrice: '',
            maxPrice: '',
            availabilityDate: '',
        });
        setPosition(null);
        setRadiusKm(5);
        setCityQuery('');
        setLocationError(null);
        onSearch({});
    };

    return (
        <div className="search-sidebar-container" dir="ltr">
            <button
                type="button"
                className="mobile-filter-toggle-btn"
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            >
                <FaSearch /> {isMobileExpanded ? t('browseProperties.hideSearchFilters') : t('browseProperties.showSearchFilters')}
            </button>

            <div className={`search-hero-content-body ${isMobileExpanded ? 'show' : ''}`}>
                <div className="map-top-section">
                    <div className="leaflet-wrapper" style={{ height: '280px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                        <MapContainer
                            key={isMobileExpanded ? 'expanded' : 'collapsed'}
                            center={position ? [position.lat, position.lng] : [30.0444, 31.2357]}
                            zoom={position ? 12 : 6}
                            maxBounds={EGYPT_BOUNDS}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {position && <MapCenterUpdater center={[position.lat, position.lng]} />}
                            <SearchField onLocationSelect={(lat, lng) => setPosition({ lat, lng })} />
                            {position ? (
                                <MapEventsHandler
                                    position={position}
                                    onLocationSelect={(lat: number, lng: number) => setPosition({ lat, lng })}
                                    radiusKm={radiusKm}
                                />
                            ) : null}
                        </MapContainer>
                    </div>
                </div>

                <div className="search-form-section">
                    {/* Location Search Toolbar */}
                    <div className="adv-map-section">
                        <label><FaMapMarkedAlt /> {t('browseProperties.whereToLive')}</label>
                        <div className="map-search-toolbar">
                            <button
                                type="button"
                                className="location-action-btn"
                                onClick={handleUseCurrentLocation}
                                disabled={isLocating}
                            >
                                <FaCrosshairs /> {isLocating ? t('browseProperties.locating') : t('browseProperties.useCurrentLocation')}
                            </button>
                            <div className="city-search-box">
                                <input
                                    type="text"
                                    placeholder={t('browseProperties.cityPlaceholder')}
                                    value={cityQuery}
                                    onChange={(e) => setCityQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleCitySearch();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="city-search-btn"
                                    onClick={() => void handleCitySearch()}
                                    disabled={isCitySearching}
                                >
                                    {isCitySearching ? t('browseProperties.searching') : t('browseProperties.find')}
                                </button>
                            </div>
                        </div>
                        {locationError && <p className="map-location-error">{locationError}</p>}
                        <div className="map-radius-control">
                            <div className="radius-label">
                                <span>{t('browseProperties.searchRadius')}</span>
                                <strong>{radiusKm} km</strong>
                            </div>
                            <input
                                type="range"
                                min="1" max="50" step="1"
                                value={radiusKm}
                                onChange={(e) => setRadiusKm(Number(e.target.value))}
                            />
                        </div>
                        {position && (
                            <button className="clear-location-btn" onClick={() => { setPosition(null); setLocationError(null); }}>
                                {t('browseProperties.clearPinLocation')}
                            </button>
                        )}
                    </div>

                    <div className="filter-divider" />

                    {/* Filters Stack */}
                    <div className="filters-stack">
                        <div className="price-inputs-row">
                            <div className="filter-group flex-1">
                                <label className="filter-label"><FaHome /> {t('browseProperties.propertyType')}</label>
                                <select name="type" value={filters.type} onChange={handleChange}>
                                    <option value="">{t('browseProperties.anyType')}</option>
                                    <option value="APARTMENT">{t('browseProperties.apartment')}</option>
                                    <option value="VILLA">{t('browseProperties.villa')}</option>
                                    <option value="STUDIO">{t('browseProperties.studio')}</option>
                                    <option value="CHALET">{t('browseProperties.chalet')}</option>
                                </select>
                            </div>
                            <div className="filter-group flex-1">
                                <label className="filter-label"><FaCouch /> {t('browseProperties.furnishing')}</label>
                                <select name="furnishing" value={filters.furnishing} onChange={handleChange}>
                                    <option value="">{t('browseProperties.anyFurnishing')}</option>
                                    <option value="Fully">{t('browseProperties.fullyFurnished')}</option>
                                    <option value="Semi">{t('browseProperties.semiFurnished')}</option>
                                    <option value="Unfurnished">{t('browseProperties.unfurnished')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="price-inputs-row">
                            <div className="filter-group flex-1">
                                <label className="filter-label"><FaDollarSign /> {t('browseProperties.minPrice')}</label>
                                <input type="number" name="minPrice" placeholder={t('browseProperties.noMin')} value={filters.minPrice} onChange={handleChange} min={0} />
                            </div>
                            <div className="filter-group flex-1">
                                <label className="filter-label"><FaDollarSign /> {t('browseProperties.maxPrice')}</label>
                                <input type="number" name="maxPrice" placeholder={t('browseProperties.noMax')} value={filters.maxPrice} onChange={handleChange} min={0} />
                            </div>
                        </div>

                        <div className="price-inputs-row">
                            <div className="filter-group flex-1">
                                <label className="filter-label"><FaUserFriends /> {t('browseProperties.targetTenant')}</label>
                                <select name="target_tenant" value={filters.target_tenant} onChange={handleChange}>
                                    <option value="">{t('browseProperties.anyTenantType')}</option>
                                    <option value="STUDENTS">{t('browseProperties.students')}</option>
                                    <option value="FAMILIES">{t('browseProperties.families')}</option>
                                    <option value="TOURISTS">{t('browseProperties.tourists')}</option>
                                </select>
                            </div>
                            <div className="filter-group flex-1">
                                <label className="filter-label"><FaCalendarAlt /> {t('browseProperties.availabilityMonth')}</label>
                                <input type="month" name="availabilityDate" value={filters.availabilityDate} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="search-buttons-group">
                        <button type="button" className="sidebar-search-btn" onClick={handleSearchClick}>
                            <FaSearch /> {t('browseProperties.searchProperties')}
                        </button>
                        <button type="button" className="sidebar-clear-btn" onClick={handleClearClick}>
                            {t('browseProperties.clearSearch')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchHero;