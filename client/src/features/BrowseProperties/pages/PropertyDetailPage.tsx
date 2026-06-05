// client/src/features/BrowseProperties/pages/PropertyDetailPage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    FaBed, FaBath, FaRulerCombined, FaMapMarkerAlt, FaHeart, FaShareAlt, 
    FaCalendarAlt, FaArrowRight, FaComment, FaSmokingBan, FaPaw, 
    FaVolumeMute, FaInfoCircle, FaWrench, FaShieldAlt, FaChair, FaUsers, 
    FaRegCompass, FaChevronLeft, FaChevronRight, FaCheckCircle, FaTimes, FaArrowLeft,
    FaExclamationTriangle
} from 'react-icons/fa';

// Maps
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Services & Helpers
import { propertyService, resolveLandlordUserIdForPublicProfile, type ReportListingPayload } from '../../../services/property.service';
import { rentalRequestService, type MyRentalRequest } from '../../../services/rental-request.service';
import savedPropertiesService from '../../../services/saved-properties.service';
import { authService } from '../../../services/auth.service';
import { messageService } from '../../../services/message.service';
import { mapPropertyToUI, type PropertyUI } from '../../../utils/propertyMapping';
import { buildListingShareUrl } from '../utils/listingShare';

// Layout
import Header from '../../../components/global/header';
import LandlordSidebar from '../../../components/global/Landlord/sidebar';
import TenantSidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import BookVisitModal from '../components/BookVisitModal';
import AuthModal from '../../../components/global/AuthModal';

import './PropertyDetailPage.css';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function openGoogleMapsForProperty(property: {
    locationLat?: number | null;
    locationLng?: number | null;
    address?: string;
}): void {
    const lat = property.locationLat;
    const lng = property.locationLng;
    let url: string;
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        url = `https://www.google.com/maps?q=${lat},${lng}&hl=en`;
    } else {
        const q = (property.address || '').trim() || 'Address';
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

function availabilityRibbon(property: PropertyUI): { label: string; dateLine: string; tag: string } {
    const iso = property.availabilityDateISO;
    const listedRaw = property.listedAtISO;

    let dateLine = 'The landlord has not set a fixed date — message them to confirm.';
    if (iso) {
        const d = new Date(iso);
        if (!Number.isNaN(d.getTime())) {
            dateLine = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
    } else if (property.availableDate && String(property.availableDate) !== 'Not specified') {
        dateLine = String(property.availableDate);
    }

    let tag = 'Active listing';
    if (iso) {
        const move = new Date(iso);
        move.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.round((move.getTime() - today.getTime()) / 86400000);
        if (diff < 0) tag = 'Available now';
        else if (diff === 0) tag = 'Move-in from today';
        else if (diff <= 14) tag = 'Move-in soon';
        else if (diff <= 60) tag = 'Within two months';
        else tag = 'Flexible timing';
    } else if (listedRaw) {
        const age = Math.floor((Date.now() - new Date(listedRaw).getTime()) / 86400000);
        if (age <= 3) tag = 'Just listed';
        else if (age <= 14) tag = 'New on HOMi';
    }

    const label =
        iso || (property.availableDate && String(property.availableDate) !== 'Not specified')
            ? 'Move-in availability'
            : 'Availability';

    return { label, dateLine, tag };
}

const PropertyDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Core details states
    const [property, setProperty] = useState<PropertyUI | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // User role check for dynamic sidebars
    const currentUser = authService.getCurrentUser();
    const isUserGuest = !authService.isAuthenticated();
    const isLandlord = currentUser?.user?.role === 'LANDLORD';
    const isTenant = currentUser?.user?.role === 'TENANT';

    // Heart state
    const [isSaved, setIsSaved] = useState(false);
    
    // Active application checks
    const [rentalRequest, setRentalRequest] = useState<MyRentalRequest | null>(
        (location.state as { rentalRequest?: MyRentalRequest })?.rentalRequest || null
    );
    const [, setLoadingRequest] = useState(false);

    // Modals
    const [showBookVisit, setShowBookVisit] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [currentImgIdx, setCurrentImgIdx] = useState(0);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);
    
    // Report
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState<ReportListingPayload['reason']>('MISLEADING_INFORMATION');
    const [reportDetails, setReportDetails] = useState('');
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportSuccess, setReportSuccess] = useState<string | null>(null);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    
    // Share menu
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [shareToast, setShareToast] = useState<string | null>(null);
    const shareWrapRef = useRef<HTMLDivElement>(null);

    // Cancel states
    const [showCancelPrompt, setShowCancelPrompt] = useState(false);
    const [showCancelSuccess, setShowCancelSuccess] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    // Load property & check save/application states
    useEffect(() => {
        if (!id) return;
        
        const fetchPropertyDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await propertyService.getPropertyById(id);
                if (response.data) {
                    const mapped = mapPropertyToUI(response.data);
                    setProperty(mapped);
                    
                    // Check saved state
                    if (!isUserGuest) {
                        try {
                            const savedIds = await savedPropertiesService.getSavedIds();
                            setIsSaved(savedIds.includes(String(id)));
                        } catch {
                            // Suppress checks error
                        }
                    }
                } else {
                    setError('Property details not found.');
                }
            } catch (err) {
                console.error('Failed to load property:', err);
                setError('Could not retrieve property details. Please check the URL or connection.');
            } finally {
                setLoading(false);
            }
        };

        void fetchPropertyDetails();
    }, [id, isUserGuest]);

    // Fetch active rental request if not passed in routing state
    useEffect(() => {
        if (!id || isUserGuest || rentalRequest || !isTenant) return;

        const checkActiveRequest = async () => {
            setLoadingRequest(true);
            try {
                const res = await rentalRequestService.getMyRequests();
                const matched = res.data.find(req => String(req.property.id) === String(id));
                if (matched) {
                    setRentalRequest(matched);
                }
            } catch (err) {
                console.warn('Error loading active tenant request', err);
            } finally {
                setLoadingRequest(false);
            }
        };

        void checkActiveRequest();
    }, [id, isUserGuest, isTenant, rentalRequest]);

    // Handle document clicks outside of share dropdown
    useEffect(() => {
        if (!shareMenuOpen) return undefined;
        const onDocMouseDown = (event: MouseEvent) => {
            const el = shareWrapRef.current;
            if (el && !el.contains(event.target as Node)) {
                setShareMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [shareMenuOpen]);

    const landlordProfileUserId = useMemo(() => {
        if (!property) return null;
        return resolveLandlordUserIdForPublicProfile(property);
    }, [property]);

    const ribbon = useMemo(() => {
        if (!property) return { label: '', dateLine: '', tag: '' };
        return availabilityRibbon(property);
    }, [property]);

    const isRented = property?.status?.toUpperCase() === 'RENTED';
    const isUnavailable = property?.status?.toUpperCase() === 'UNAVAILABLE';
    const canCancelSentRequest = rentalRequest?.status === 'PENDING';

    const images: string[] = useMemo(() => {
        if (!property) return [];
        return property.allImages && property.allImages.length > 0
            ? property.allImages
            : [property.image || 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800'];
    }, [property]);

    const houseRules = useMemo(() => {
        if (!property) return [];
        return [
            { icon: <FaSmokingBan />, text: "No Smoking", active: true },
            { icon: <FaPaw />, text: "Pet Friendly", active: property.petsAllowed ?? false },
            { icon: <FaVolumeMute />, text: "Quiet Hours (10PM)", active: true },
            { icon: <FaUsers />, text: property.targetTenant || 'Any Tenant', active: true },
        ];
    }, [property]);

    const maintenanceResponsibilities = property?.maintenanceResponsibilities || [];

    const nextImg = () => setCurrentImgIdx((prev) => (prev + 1) % images.length);
    const prevImg = () => setCurrentImgIdx((prev) => (prev - 1 + images.length) % images.length);

    const handleApplyClick = () => {
        if (isUserGuest) {
            setShowAuthModal(true);
        } else {
            navigate(`/properties/${id}/apply`);
        }
    };

    const handleBookVisitClick = () => {
        if (isUserGuest) {
            setShowAuthModal(true);
        } else {
            setShowBookVisit(true);
        }
    };

    const handleCancelYes = async () => {
        const requestId = rentalRequest?.id;
        if (!requestId) {
            setCancelError('Could not find this request to cancel.');
            return;
        }

        setCancelError(null);
        try {
            await rentalRequestService.cancelMyRequest(requestId);
            setShowCancelPrompt(false);
            setShowCancelSuccess(true);
            setRentalRequest(null);
        } catch (error: unknown) {
            const ex = error as { response?: { data?: { message?: string } }; message?: string };
            const message = ex.response?.data?.message || ex.message || 'Could not cancel request. Please try again.';
            setCancelError(message);
        }
    };

    const handleMessageOwner = async () => {
        if (isUserGuest) {
            setShowAuthModal(true);
            return;
        }

        const participantId = landlordProfileUserId;
        if (!participantId) {
            navigate('/messages');
            return;
        }

        setIsStartingChat(true);
        try {
            const response = await messageService.startConversation({
                participantId,
                propertyId: id,
            });

            navigate('/messages', {
                state: {
                    conversationId: response.data.id,
                    participantId,
                    propertyId: id,
                },
            });
        } catch (error) {
            console.error('Failed to start conversation:', error);
            navigate('/messages', {
                state: {
                    participantId,
                    propertyId: id,
                },
            });
        } finally {
            setIsStartingChat(false);
        }
    };

    const handleOpenReport = () => {
        if (isUserGuest) {
            setShowAuthModal(true);
            return;
        }
        setShowReportModal(true);
        setReportError(null);
        setReportSuccess(null);
    };

    const handleSaveClick = async (event: React.MouseEvent) => {
        event.stopPropagation();
        if (isUserGuest) {
            setShowAuthModal(true);
            return;
        }
        if (!id) return;
        
        const nextSaved = !isSaved;
        setIsSaved(nextSaved);
        try {
            if (nextSaved) {
                await savedPropertiesService.saveProperty(id);
            } else {
                await savedPropertiesService.removeSavedProperty(id);
            }
        } catch {
            setIsSaved(!nextSaved); // Revert on failure
        }
    };

    const shareUrl = id ? buildListingShareUrl(id) : '';
    const shareTitle = property?.title || 'HOMi listing';

    const copyShareLink = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareToast('Link copied to clipboard.');
            setShareMenuOpen(false);
            window.setTimeout(() => setShareToast(null), 3000);
        } catch {
            setShareToast('Could not copy link.');
            window.setTimeout(() => setShareToast(null), 3000);
        }
    };

    const shareWhatsApp = () => {
        if (!shareUrl) return;
        const text = `${shareTitle}\n${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        setShareMenuOpen(false);
    };

    const shareSms = () => {
        if (!shareUrl) return;
        const body = `${shareTitle}\n${shareUrl}`;
        window.location.href = `sms:?&body=${encodeURIComponent(body)}`;
        setShareMenuOpen(false);
    };

    const shareInstagramDm = async () => {
        if (!shareUrl) return;
        setShareMenuOpen(false);

        let copied = false;
        try {
            await navigator.clipboard.writeText(shareUrl);
            copied = true;
        } catch {
            // copy failed
        }

        const inboxWeb = 'https://www.instagram.com/direct/inbox/';
        const inboxApp = 'instagram://direct-inbox';
        const opened = window.open(inboxWeb, '_blank', 'noopener,noreferrer');
        if (!opened || opened.closed) {
            window.open(inboxApp, '_blank', 'noopener,noreferrer');
        }

        setShareToast(copied ? 'Direct link copied. Instagram DM opened.' : 'Instagram DM opened.');
        window.setTimeout(() => setShareToast(null), 5000);
    };

    const tryNativeShare = async () => {
        if (!navigator.share || !shareUrl) return;
        try {
            await navigator.share({ title: shareTitle, text: shareTitle, url: shareUrl });
            setShareMenuOpen(false);
        } catch {
            // native share cancelled
        }
    };

    const handleSubmitReport = async () => {
        const details = reportDetails.trim();
        if (details.length < 30) {
            setReportError('Please include at least 30 characters so our moderation team has enough context.');
            return;
        }

        setIsSubmittingReport(true);
        setReportError(null);
        try {
            const response = await propertyService.reportProperty(String(id), {
                reason: reportReason,
                details,
            });
            setReportSuccess(response.message || 'Report submitted successfully.');
            setReportDetails('');
        } catch (error: unknown) {
            const ex = error as { response?: { data?: { message?: string } } };
            setReportError(ex.response?.data?.message || 'Unable to submit report right now. Please try again.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    return (
        <div className="property-detail-page-wrapper">
            <Header />
            <div className="property-detail-page-body">
                {isLandlord ? <LandlordSidebar /> : isTenant ? <TenantSidebar /> : null}
                
                <div className="property-detail-page-content">
                    {/* BREADCRUMB & BACK NAVIGATION */}
                    <div className="detail-breadcrumb-bar">
                        <button className="back-to-search-btn" onClick={() => navigate('/browse-properties')}>
                            Back to Search
                        </button>
                        <button className="breadcrumb-back-btn" onClick={() => navigate(-1)}>
                            <FaArrowLeft /> Back
                        </button>
                        <span className="breadcrumb-divider">/</span>
                        <span className="breadcrumb-text">{property?.title || 'Listing Details'}</span>
                    </div>

                    {loading ? (
                        <div className="detail-loading-state">
                            <div className="spinner-large"></div>
                            <p>Loading premium property details…</p>
                        </div>
                    ) : error || !property ? (
                        <div className="detail-error-state">
                            <FaExclamationTriangle size={48} className="error-icon" />
                            <h3>Details Not Found</h3>
                            <p>{error || 'The requested property could not be loaded.'}</p>
                            <button className="retry-btn" onClick={() => navigate('/browse-properties')}>
                                Return to Browse
                            </button>
                        </div>
                    ) : (
                        <div className="property-page-layout-grid animate-fade-in">
                            {/* LEFT DETAILS COLUMN */}
                            <div className="details-left-scroll">
                                {/* MEDIA GALLERY DISPLAY */}
                                <section className={`property-gallery-grid-main ${images.length === 1 ? 'single-image' : ''}`} onClick={() => setShowGallery(true)}>
                                    <div className="hero-image-wrapper">
                                        <img src={images[0]} alt="Property Main" />
                                    </div>
                                    {images.length > 1 && (
                                        <div className="secondary-images-grid">
                                            <div className="secondary-image-tile">
                                                <img src={images[1]} alt="Interior View" />
                                            </div>
                                            <div className="secondary-image-tile relative">
                                                <img src={images[2] || images[0]} alt="Interior View" />
                                                {images.length > 3 && (
                                                    <div className="more-photos-overlay-box">
                                                        <span>+ {images.length - 3} photos</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* GALLERY LIGHTBOX */}
                                {showGallery && (
                                    <div className="lightbox-overlay" onClick={() => setShowGallery(false)}>
                                        <button className="lightbox-close"><FaTimes /></button>
                                        <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                                            <button className="nav-arrow left" onClick={prevImg}><FaChevronLeft /></button>
                                            <img src={images[currentImgIdx]} alt="Gallery Lightbox" className="lightbox-img" />
                                            <button className="nav-arrow right" onClick={nextImg}><FaChevronRight /></button>
                                            <div className="img-counter">{currentImgIdx + 1} / {images.length}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="details-inner-card">
                                    {/* AVAILABILITY RIBBON */}
                                    <div className="availability-highlight-strip">
                                        <FaCalendarAlt className="calendar-bounce" />
                                        <div className="availability-desc">
                                            <span className="label-prefix">{ribbon.label}</span>
                                            <span className="date-value-label">{ribbon.dateLine}</span>
                                        </div>
                                        <span className="urgency-label">{ribbon.tag}</span>
                                    </div>

                                    {/* MAIN DETAIL CARD */}
                                    <div className="detail-main-info-card">
                                        {/* PROPERTY HEADER & LOCATION */}
                                        <header className="listing-main-header">
                                            <div className="header-badge-section">
                                                <span className="ref-id-badge">REF: {property.id.slice(-6).toUpperCase()}</span>
                                                <span className="active-pill"><span className="pulse-dot"></span> Active listing</span>
                                            </div>
                                            <h1>{property.title}</h1>
                                            <div className="address-link-row">
                                                <FaMapMarkerAlt /> {property.address}
                                                <button
                                                    type="button"
                                                    className="inline-maps-redirect"
                                                    onClick={() => openGoogleMapsForProperty(property)}
                                                >
                                                    Open Google Maps
                                                </button>
                                            </div>
                                        </header>

                                        {/* SPECS ROW */}
                                        <div className="specifications-strip-row">
                                            <div className="spec-tile"><FaBed /><div><span className="value">{property.beds}</span><span className="label">Bedrooms</span></div></div>
                                            <div className="spec-tile"><FaBath /><div><span className="value">{property.baths}</span><span className="label">Bathrooms</span></div></div>
                                            <div className="spec-tile"><FaRulerCombined /><div><span className="value">{property.sqft}</span><span className="label">Sq. Feet</span></div></div>
                                            <div className="spec-tile"><FaChair /><div><span className="value">{property.furnishing}</span><span className="label">Interior</span></div></div>
                                        </div>
                                    </div>

                                    {/* PROPERTY OVERVIEW */}
                                    <section className="overview-block-section">
                                        <h3 className="section-title-header"><FaInfoCircle /> Property Overview</h3>
                                        <p className="overview-p-text">
                                            {property.description.trim() || `No overview description has been listed for ${property.title}.`}
                                        </p>
                                    </section>

                                    {/* PREFERENCES / AMENITIES */}
                                    <section className="preferences-chips-section">
                                        <h3 className="section-title-header">Lease Preferences</h3>
                                        <div className="rules-flex-grid">
                                            {houseRules.map((rule, idx) => (
                                                <div key={idx} className={`preference-badge-card ${!rule.active ? 'inactive' : ''}`}>
                                                    {rule.icon} <span>{rule.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* MAP PIN LOCATION OVERVIEW */}
                                    {property.locationLat && property.locationLng && (
                                        <section className="interactive-map-listing-section">
                                            <h3 className="section-title-header">Listing Location</h3>
                                            <div className="interactive-map-card">
                                                <MapContainer
                                                    center={[property.locationLat, property.locationLng]}
                                                    zoom={15}
                                                    scrollWheelZoom={false}
                                                    style={{ height: '100%', width: '100%' }}
                                                >
                                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                    <Marker position={[property.locationLat, property.locationLng]} />
                                                </MapContainer>
                                            </div>
                                        </section>
                                    )}

                                    {/* MAINTENANCE RESPONSIBILITIES */}
                                    <section className="maintenance-responsibilities-block">
                                        <h3 className="section-title-header"><FaWrench /> Maintenance Responsibilities</h3>
                                        <div className="maintenance-grid-scroll">
                                            {maintenanceResponsibilities.length > 0 ? (
                                                maintenanceResponsibilities.map((item, index) => (
                                                    <div className="resp-grid-row" key={index}>
                                                        <span className="area-title">{item.area}</span>
                                                        <span className={`resp-badge ${item.responsible_party.toLowerCase()}`}>
                                                            {item.responsible_party === 'LANDLORD' ? 'Landlord' : 'Tenant'}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="resp-grid-row">
                                                    <span className="area-title">General Repairs & Upkeep</span>
                                                    <span className="resp-badge tenant font-semibold">TBD</span>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* RIGHT ACTION COLUMN */}
                            <aside className="action-right-sidebar">
                                <div className="sticky-price-card">
                                    <div className="price-details-header">
                                        <div className="price-bold">
                                            <span className="currency">$</span>
                                            <span className="val">{property.price.toLocaleString()}</span>
                                            <span className="freq">/mo</span>
                                        </div>
                                        <div className="security-dep-box">
                                            <FaShieldAlt /> ${property.securityDeposit?.toLocaleString() || '—'} Security Deposit
                                        </div>
                                    </div>

                                    {/* RENTAL APPLICATION STATE DECISIONS */}
                                    {rentalRequest ? (
                                        <div className="active-application-info-group">
                                            <button className="status-indicator-btn" disabled>
                                                <FaCheckCircle /> {rentalRequest.status === 'PENDING' ? 'Application Sent' : 'Application Evaluated'}
                                            </button>
                                            <div className="quick-application-actions">
                                                <button className="secondary-action-outline-btn" onClick={() => navigate(`/properties/${id}/apply`, { state: { prefillData: rentalRequest, isReadOnly: true } })}>
                                                    Review Details
                                                </button>
                                                {canCancelSentRequest && (
                                                    <button className="secondary-action-outline-btn cancel-btn" onClick={() => setShowCancelPrompt(true)}>
                                                        Cancel Request
                                                    </button>
                                                )}
                                            </div>
                                            {cancelError && <p className="cancel-error-text">{cancelError}</p>}
                                        </div>
                                    ) : (
                                        <div className="cta-application-block">
                                            {isRented ? (
                                                <button className="primary-cta-action-btn disabled" disabled>
                                                    Property Already Rented
                                                </button>
                                            ) : isUnavailable ? (
                                                <button className="primary-cta-action-btn disabled" disabled>
                                                    Temporarily Unavailable
                                                </button>
                                            ) : (
                                                <button className="primary-cta-action-btn" onClick={handleApplyClick}>
                                                    {isUserGuest ? 'Register to Apply' : 'Apply Now'} <FaArrowRight />
                                                </button>
                                            )}
                                            <p className="cta-lock-hint">
                                                {isRented ? 'This property has been successfully rented' : isUnavailable ? 'This property is temporarily offline' : 'Verified Secure Application Process'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="sidebar-decor-divider"></div>

                                    {/* OWNER / LANDLORD PROFILE */}
                                    <div className="owner-profile-card">
                                        <button
                                            type="button"
                                            className="owner-btn-container"
                                            onClick={() => {
                                                if (isUserGuest) {
                                                    setShowAuthModal(true);
                                                } else if (landlordProfileUserId) {
                                                    navigate(`/landlords/${landlordProfileUserId}`);
                                                }
                                            }}
                                            disabled={!landlordProfileUserId}
                                        >
                                            <div className="owner-avatar-wrapper">
                                                <img src={property.ownerImage} alt={property.ownerName} />
                                                <span className="status-dot-active"></span>
                                            </div>
                                            <div className="owner-meta-info">
                                                <span className="owner-name-bold">{property.ownerName}</span>
                                                <span className="owner-status">
                                                    {property.ownerVerified ? '✓ Verified on HOMi' : 'Property Owner'}
                                                </span>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            className="chat-owner-trigger"
                                            onClick={handleMessageOwner}
                                            disabled={isStartingChat}
                                            title="Message Landlord"
                                        >
                                            <FaComment />
                                        </button>
                                    </div>

                                    {/* ACTION LINKS */}
                                    <div className="secondary-cta-flex-row">
                                        <button className="secondary-action-outline-btn font-semibold" onClick={handleBookVisitClick}>
                                            <FaCalendarAlt /> Book viewing
                                        </button>
                                        <button className="secondary-action-outline-btn font-semibold" onClick={handleOpenReport}>
                                            <FaRegCompass /> Report listing
                                        </button>
                                    </div>

                                    <div className="sidebar-decor-divider"></div>

                                    {/* SHARE & SAVE ACTION GRID */}
                                    <div className="share-and-save-row">
                                        <button className={`social-like-action-btn ${isSaved ? 'liked' : ''}`} onClick={handleSaveClick}>
                                            <FaHeart /> {isSaved ? 'Saved to Favorites' : 'Save to Favorites'}
                                        </button>
                                        
                                        <div className="share-trigger-relative-box" ref={shareWrapRef}>
                                            <button className="social-share-action-btn" onClick={() => setShareMenuOpen(!shareMenuOpen)}>
                                                <FaShareAlt /> Share Listing
                                            </button>
                                            {shareMenuOpen && (
                                                <div className="share-dropdown-card">
                                                    {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                                                        <button className="share-opt-btn" onClick={() => void tryNativeShare()}>
                                                            Share using device…
                                                        </button>
                                                    ) : null}
                                                    <button className="share-opt-btn" onClick={() => void copyShareLink()}>
                                                        Copy link
                                                    </button>
                                                    <button className="share-opt-btn" onClick={shareWhatsApp}>
                                                        WhatsApp
                                                    </button>
                                                    <button className="share-opt-btn" onClick={shareSms}>
                                                        SMS
                                                    </button>
                                                    <button className="share-opt-btn" onClick={() => void shareInstagramDm()}>
                                                        Instagram DM
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            </div>
            <Footer />

            {shareToast && <div className="share-floating-toast">{shareToast}</div>}

            {/* Auth Modal for Guests */}
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

            {/* Cancel Confirmation Prompt */}
            {showCancelPrompt && (
                <div className="cancel-prompt-overlay" onClick={() => setShowCancelPrompt(false)}>
                    <div className="cancel-prompt-modal-box" onClick={e => e.stopPropagation()}>
                        <h3>Cancel Rental Request</h3>
                        <p>Are you sure you want to cancel your rental request for <strong>"{property?.title}"</strong>?</p>
                        <div className="cancel-prompt-btn-group">
                            <button className="btn-confirm-cancel" onClick={handleCancelYes}>Yes, Cancel Request</button>
                            <button className="btn-abort-cancel" onClick={() => setShowCancelPrompt(false)}>No, Keep Request</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Success Message */}
            {showCancelSuccess && (
                <div className="cancel-prompt-overlay">
                    <div className="cancel-prompt-modal-box text-center">
                        <FaCheckCircle size={40} className="color-green-success" />
                        <h3>Request Cancelled</h3>
                        <p>Your rental application has been cancelled successfully.</p>
                        <button className="btn-close-success" onClick={() => setShowCancelSuccess(false)}>OK</button>
                    </div>
                </div>
            )}

            {/* Report Listing Modal */}
            {showReportModal && (
                <div className="cancel-prompt-overlay" onClick={() => setShowReportModal(false)}>
                    <div className="report-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="report-header">
                            <h3>Report Listing</h3>
                            <button className="btn-close-report" onClick={() => setShowReportModal(false)}><FaTimes /></button>
                        </div>
                        <p className="report-desc">Help us maintain verified rental experiences. Our moderation team reviews flagged listings within 24 hours.</p>
                        <div className="report-form-group">
                            <label>Reason for reporting</label>
                            <select value={reportReason} onChange={e => setReportReason(e.target.value as ReportListingPayload['reason'])}>
                                <option value="MISLEADING_INFORMATION">Misleading Information</option>
                                <option value="SCAM_OR_FRAUD">Scam or Fraudulent Listing</option>
                                <option value="FAKE_PHOTOS">Inaccurate / Fake Photos</option>
                                <option value="DUPLICATE_LISTING">Duplicate Property Listing</option>
                                <option value="UNAVAILABLE_OR_ALREADY_RENTED">Unavailable / Already Rented</option>
                                <option value="OFFENSIVE_CONTENT">Offensive Listing Content</option>
                                <option value="OTHER">Other Issue</option>
                            </select>
                        </div>
                        <div className="report-form-group">
                            <label>Additional details</label>
                            <textarea
                                value={reportDetails}
                                onChange={e => setReportDetails(e.target.value)}
                                rows={4}
                                placeholder="Explain details clearly. (e.g. photos do not match description or landlord asked for down payment before viewing)"
                            />
                            <span className={`details-length-hint ${reportDetails.trim().length < 30 ? 'insufficient' : ''}`}>
                                {reportDetails.trim().length}/30 characters minimum
                            </span>
                        </div>

                        {reportError && <p className="report-error-msg">{reportError}</p>}
                        {reportSuccess && <p className="report-success-msg">{reportSuccess}</p>}

                        <div className="report-footer-actions">
                            <button className="btn-cancel-report" onClick={() => setShowReportModal(false)}>Cancel</button>
                            <button className="btn-submit-report" onClick={handleSubmitReport} disabled={isSubmittingReport}>
                                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Book Viewing Modal */}
            {showBookVisit && property && (
                <BookVisitModal
                    property={{
                        id: String(property.id),
                        title: property.title,
                        price: property.price,
                        address: property.address,
                        image: images[0],
                        ownerName: property.ownerName,
                        landlordId: landlordProfileUserId || '',
                    }}
                    onClose={() => setShowBookVisit(false)}
                />
            )}
        </div>
    );
};

export default PropertyDetailPage;
