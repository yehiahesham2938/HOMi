import React, { useState, useEffect } from 'react';
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
    const [showAdvanced, setShowAdvanced] = useState(false);
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
                    setLocationError('Current location appears to be outside Egypt. Please pin manually.');
                    return;
                }

                setPosition({ lat: latitude, lng: longitude });
                setIsMapActive(true);
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                if (error.code === error.PERMISSION_DENIED) {
                    setLocationError('Location permission was denied. Please allow it and try again.');
                    return;
                }

                setLocationError('Could not get your current location. Please try again.');
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
            setLocationError('Please type a city name first.');
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
                setLocationError('City not found. Try a more specific city name.');
                return;
            }

            const lat = Number(results[0].lat);
            const lng = Number(results[0].lon);

            if (Number.isNaN(lat) || Number.isNaN(lng) || !EGYPT_BOUNDS.contains(L.latLng(lat, lng))) {
                setLocationError('Please search for a city within Egypt.');
                return;
            }

            setPosition({ lat, lng });
            setIsMapActive(true);
        } catch (error) {
            console.error('City search failed', error);
            setLocationError('Could not search that city right now. Please try again.');
        } finally {
            setIsCitySearching(false);
        }
    };

    return (
        <div className="search-sidebar-container">
            <div className="map-top-section">
                <div className="leaflet-wrapper" style={{ height: '280px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <MapContainer
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
                    <label><FaMapMarkedAlt /> Where do you want to live?</label>
                    <div className="map-search-toolbar">
                        <button
                            type="button"
                            className="location-action-btn"
                            onClick={handleUseCurrentLocation}
                            disabled={isLocating}
                        >
                            <FaCrosshairs /> {isLocating ? 'Locating...' : 'Use Current Location'}
                        </button>
                        <div className="city-search-box">
                            <input
                                type="text"
                                placeholder="Type city name (e.g., Cairo)"
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
                                {isCitySearching ? 'Searching...' : 'Find'}
                            </button>
                        </div>
                    </div>
                    {locationError && <p className="map-location-error">{locationError}</p>}
                    <div className="map-radius-control">
                        <div className="radius-label">
                            <span>Search Radius:</span>
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
                            Clear Pin Location
                        </button>
                    )}
                </div>

                <div className="filter-divider" />

                {/* Filters Stack */}
                <div className="filters-stack">
                    <div className="price-inputs-row">
                        <div className="filter-group flex-1">
                            <label className="filter-label"><FaHome /> Property Type</label>
                            <select name="type" value={filters.type} onChange={handleChange}>
                                <option value="">Any Type</option>
                                <option value="APARTMENT">Apartment</option>
                                <option value="VILLA">Villa</option>
                                <option value="STUDIO">Studio</option>
                                <option value="CHALET">Chalet</option>
                            </select>
                        </div>
                        <div className="filter-group flex-1">
                            <label className="filter-label"><FaCouch /> Furnishing</label>
                            <select name="furnishing" value={filters.furnishing} onChange={handleChange}>
                                <option value="">Any Furnishing</option>
                                <option value="Fully">Fully Furnished</option>
                                <option value="Semi">Semi Furnished</option>
                                <option value="Unfurnished">Unfurnished</option>
                            </select>
                        </div>
                    </div>

                    <div className="price-inputs-row">
                        <div className="filter-group flex-1">
                            <label className="filter-label"><FaDollarSign /> Min Price ($)</label>
                            <input type="number" name="minPrice" placeholder="No min" value={filters.minPrice} onChange={handleChange} min={0} />
                        </div>
                        <div className="filter-group flex-1">
                            <label className="filter-label"><FaDollarSign /> Max Price ($)</label>
                            <input type="number" name="maxPrice" placeholder="No max" value={filters.maxPrice} onChange={handleChange} min={0} />
                        </div>
                    </div>

                    <div className="price-inputs-row">
                        <div className="filter-group flex-1">
                            <label className="filter-label"><FaUserFriends /> Target Tenant</label>
                            <select name="target_tenant" value={filters.target_tenant} onChange={handleChange}>
                                <option value="">Any Tenant Type</option>
                                <option value="STUDENTS">Students</option>
                                <option value="FAMILIES">Families</option>
                                <option value="TOURISTS">Tourists</option>
                            </select>
                        </div>
                        <div className="filter-group flex-1">
                            <label className="filter-label"><FaCalendarAlt /> Availability Month</label>
                            <input type="month" name="availabilityDate" value={filters.availabilityDate} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <button className="sidebar-search-btn" onClick={handleSearchClick}>
                    <FaSearch /> Search Properties
                </button>
            </div>
        </div>
    );
};


export default SearchHero;