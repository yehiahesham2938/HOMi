// client\src\features\BrowseProperties\pages\BrowseProperties.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './BrowseProperties.css';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import PropertyCard from '../components/PropertyCard';
import SearchHero from '../components/SearchHero';
import PropertyDetailModal from '../components/PropertyDetailedModal';
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
    const [searchParams, setSearchParams] = useSearchParams();
    const listingFromUrl = searchParams.get('listing');

    const [selectedProperty, setSelectedProperty] = useState<BrowsePropertyUI | null>(null);
    const [properties, setProperties] = useState<BrowsePropertyUI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [viewingAll, setViewingAll] = useState<string | null>(null);
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
        setViewingAll(null);
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
            return undefined;
        }

        const fromList = properties.find((p) => p.id === listingFromUrl);
        if (fromList) {
            setSelectedProperty(fromList);
            return undefined;
        }

        if (loading) {
            return undefined;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await propertyService.getPropertyById(listingFromUrl);
                if (cancelled || !res.data) return;
                if (String(res.data.status).toUpperCase() !== 'AVAILABLE') {
                    setSearchParams({}, { replace: true });
                    setSelectedProperty(null);
                    return;
                }
                setSelectedProperty(mapPropertyToUI(res.data));
            } catch {
                setSearchParams({}, { replace: true });
                setSelectedProperty(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [listingFromUrl, properties, loading, setSearchParams]);

    const openPropertyDetails = (property: BrowsePropertyUI) => {
        setSelectedProperty(property);
        setSearchParams({ listing: property.id }, { replace: true });
    };

    const closePropertyDetails = () => {
        setSelectedProperty(null);
        setSearchParams({}, { replace: true });
    };

    const newListings = useMemo(() => properties.slice(0, 8), [properties]);
    const popularProperties = useMemo(() => {
        const nextBucket = properties.slice(8, 16);
        return nextBucket.length > 0 ? nextBucket : properties.slice(0, 8);
    }, [properties]);
    const recommendedProperties = useMemo(() => {
        const newestBucket = properties.slice(16, 24);
        return newestBucket.length > 0 ? newestBucket : properties.slice(0, 8);
    }, [properties]);

    const handleViewAll = (section: string) => {
        setViewingAll(section);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const getViewingAllTitle = (section: string | null): string => {
        if (section === 'newListings') return 'Newly Listed';
        if (section === 'popular') return 'Popular Properties';
        return 'Suits Your Lifestyle';
    };

    const renderMainSections = () => {
        if (isSearching) {
            return (
                <section className="property-scroll-section animate-fade-in">
                    <div className="section-header">
                        <div className="title-area">
                            <h2>Search Results</h2>
                        </div>
                        <button className="view-all-btn" onClick={fetchDefaultProperties}>Clear Search</button>
                    </div>
                    <div className="properties-grid properties-grid-expanded">
                        {properties.map(renderPropertyCard)}
                    </div>
                </section>
            );
        }

        if (viewingAll) {
            return (
                <section className="property-scroll-section animate-fade-in">
                    <div className="section-header">
                        <div className="title-area">
                            <h2>{getViewingAllTitle(viewingAll)}</h2>
                        </div>
                        <button className="view-all-btn" onClick={() => setViewingAll(null)}>Back to Categories</button>
                    </div>
                    <div className="properties-grid properties-grid-expanded">
                        {properties.map(renderPropertyCard)}
                    </div>
                </section>
            );
        }

        return (
            <>
                <section className="property-scroll-section">
                    <div className="section-header">
                        <div className="title-area">
                            <h2>Newly Listed</h2>
                        </div>
                        <button className="view-all-btn" onClick={() => handleViewAll('newListings')}>View All ({properties.length})</button>
                    </div>
                    <div className="properties-grid">
                        {newListings.map(renderPropertyCard)}
                    </div>
                </section>

                <section className="property-scroll-section">
                    <div className="section-header">
                        <div className="title-area">
                            <h2>Popular Properties</h2>
                        </div>
                        <button className="view-all-btn" onClick={() => handleViewAll('popular')}>View All ({properties.length})</button>
                    </div>
                    <div className="properties-grid">
                        {popularProperties.map(renderPropertyCard)}
                    </div>
                </section>

                <section className="property-scroll-section">
                    <div className="section-header">
                        <div className="title-area">
                            <h2>Suits Your Lifestyle</h2>
                        </div>
                        <button className="view-all-btn" onClick={() => handleViewAll('recommended')}>View All ({properties.length})</button>
                    </div>
                    <div className="properties-grid">
                        {recommendedProperties.map(renderPropertyCard)}
                    </div>
                </section>
            </>
        );
    };

    return (
        <div className="layout-wrapper">
            {!selectedProperty && <Sidebar />}
            <div className="main-content">
                <Header />
                <div className="browse-properties-page">
                    <SearchHero onSearch={(filters) => {
                        const doSearch = async () => {
                            setLoading(true);
                            setError(null);
                            setIsSearching(true);
                            setViewingAll(null);
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

                    {loading && (
                        <section className="property-scroll-section">
                            <div className="section-header">
                                <div className="title-area">
                                    <h2>Loading properties...</h2>
                                </div>
                            </div>
                        </section>
                    )}

                    {!loading && error && (
                        <section className="property-scroll-section">
                            <div className="section-header">
                                <div className="title-area">
                                    <h2>{error}</h2>
                                </div>
                            </div>
                        </section>
                    )}

                    {!loading && !error && properties.length === 0 && (
                        <section className="property-scroll-section">
                            <div className="section-header">
                                <div className="title-area">
                                    <h2>No properties available right now.</h2>
                                </div>
                            </div>
                        </section>
                    )}

                    {!loading && !error && properties.length > 0 && (
                        <>{renderMainSections()}</>
                    )}
                </div>
                <Footer />
            </div>

            {selectedProperty && (
                <PropertyDetailModal
                    property={selectedProperty}
                    onClose={closePropertyDetails}
                    isGuest={!authService.isAuthenticated()}
                    isSaved={isPropertySaved(selectedProperty.id)}
                    onToggleSave={handleToggleSave}
                />
            )}
        </div>
    );
};

export default BrowseProperties;