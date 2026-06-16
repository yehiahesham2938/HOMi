// client/src/features/BrowseProperties/pages/BrowseProperties.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './BrowseProperties.css';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import PropertyCard from '../components/PropertyCard';
import SearchHero from '../components/SearchHero';
import {
    propertyService,
    type PropertyQueryParams,
} from '../../../services/property.service';
import savedPropertiesService from '../../../services/saved-properties.service';
import { authService } from '../../../services/auth.service';

import {
    mapPropertyToUI
} from '../../../utils/propertyMapping';
import type { PropertyUI as BrowsePropertyUI } from '../../../utils/propertyMapping';


const BrowseProperties: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const listingFromUrl = searchParams.get('listing');

    const [properties, setProperties] = useState<BrowsePropertyUI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [savedIds, setSavedIds] = useState<string[]>([]);

    useEffect(() => {
        const loadSavedIds = async () => {
            try {
                const ids = await savedPropertiesService.getSavedIds();
                setSavedIds(ids);
            } catch {
                setSavedIds([]);
            }
        };

        void loadSavedIds();
    }, []);

    const handleToggleSave = async (propertyId: string | number) => {
        const normalized = String(propertyId);
        const currentlySaved = savedIds.includes(normalized);

        try {
            if (currentlySaved) {
                await savedPropertiesService.removeSavedProperty(propertyId);
                setSavedIds((prev) => prev.filter((id) => id !== normalized));
                return;
            }

            await savedPropertiesService.saveProperty(propertyId);
            setSavedIds((prev) => Array.from(new Set([...prev, normalized])));
        } catch {
            // Keep UI stable; no-op on failure.
        }
    };

    const isPropertySaved = (propertyId: string | number) => savedIds.includes(String(propertyId));

    const fetchDefaultProperties = async () => {
        setLoading(true);
        setError(null);
        setIsSearching(false);
        try {
            const response = await propertyService.getAllProperties({
                status: 'AVAILABLE',
                page: 1,
                limit: 60,
            });

            const mapped = response.data.map(mapPropertyToUI);
            setProperties(mapped);
        } catch (fetchError) {
            console.error('Failed to fetch properties:', fetchError);
            setError('Failed to load properties. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchDefaultProperties();
    }, []);

    /** Open listing from shared link ?listing=<propertyId> */
    useEffect(() => {
        if (!listingFromUrl) {
            return;
        }
        // Redirect directly to the dedicated detail page!
        navigate(`/properties/${listingFromUrl}`, { replace: true });
    }, [listingFromUrl, navigate]);

    const openPropertyDetails = (property: BrowsePropertyUI) => {
        navigate(`/properties/${property.id}`);
    };

    const renderPropertyCard = (property: BrowsePropertyUI) => (
        <PropertyCard
            key={property.id}
            property={property}
            onOpenDetails={() => openPropertyDetails(property)}
            isSaved={isPropertySaved(property.id)}
            onToggleSave={handleToggleSave}
        />
    );

    const renderMainSections = () => {
        const title = isSearching ? 'Search Results' : 'Available Properties';
        return (
            <section className="property-vertical-section animate-fade-in">
                <div className="bp-section-header">
                    <div className="properties-title-area">
                        <h2>.</h2>
                    </div>
                    {isSearching && (
                        <button className="view-all-btn" onClick={fetchDefaultProperties}>Clear Search</button>
                    )}
                </div>
                <div className="properties-vertical-grid">
                    {properties.map(renderPropertyCard)}
                </div>
            </section>
        );
    };

    return (
        <div className="layout-wrapper">
            <Sidebar />
            <div className="main-content browse-main-content">
                <Header />
                <div className="browse-split-container">
                    <div className="properties-left-pane">
                        {loading && (
                            <section className="property-vertical-section">
                                <div className="bp-section-header">
                                    <div className="properties-title-area">
                                        <h2>Loading properties...</h2>
                                    </div>
                                </div>
                            </section>
                        )}

                        {!loading && error && (
                            <section className="property-vertical-section">
                                <div className="bp-section-header">
                                    <div className="properties-title-area">
                                        <h2>{error}</h2>
                                    </div>
                                </div>
                            </section>
                        )}

                        {!loading && !error && properties.length === 0 && (
                            <section className="property-vertical-section">
                                <div className="bp-section-header">
                                    <div className="properties-title-area">
                                        <h2>No properties available right now.</h2>
                                    </div>
                                </div>
                            </section>
                        )}

                        {!loading && !error && properties.length > 0 && (
                            renderMainSections()
                        )}
                    </div>

                    <div className="filters-right-pane">
                        <SearchHero onSearch={(filters) => {
                            const doSearch = async () => {
                                setLoading(true);
                                setError(null);
                                const hasFilters = Object.keys(filters).length > 0;
                                setIsSearching(hasFilters);
                                try {
                                    const response = await propertyService.getAllProperties({
                                        status: 'AVAILABLE',
                                        page: 1,
                                        limit: 60,
                                        ...filters,
                                    } as PropertyQueryParams);

                                    const mapped = response.data.map(mapPropertyToUI);
                                    setProperties(mapped);
                                } catch (fetchError) {
                                    console.error('Failed to fetch properties:', fetchError);
                                    setError('Failed to load properties. Please try again.');
                                } finally {
                                    setLoading(false);
                                }
                            };
                            void doSearch();
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrowseProperties;