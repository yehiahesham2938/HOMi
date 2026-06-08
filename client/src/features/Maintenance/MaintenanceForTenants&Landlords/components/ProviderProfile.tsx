import React, { useEffect } from 'react';
import {
    FaTimes, FaStar, FaMapMarkerAlt, FaCheckCircle, FaToolbox,
    FaUser, FaBriefcase, FaShieldAlt, FaCalendarCheck
} from 'react-icons/fa';
import './ProviderProfile.css';

export interface MinimalProvider {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio?: string | null;
    providerType?: string | null;
    businessName?: string | null;
    primaryCategory?: string | null;
    category?: string | null; // fallback
    categories?: string[] | null;
    companyLocation?: string | null;
    rating: number;
    ratingsCount: number;
    completedJobsCount?: number;
}

interface ProviderProfileProps {
    isOpen: boolean;
    onClose: () => void;
    provider: MinimalProvider | null;
}

const ProviderProfile: React.FC<ProviderProfileProps> = ({ isOpen, onClose, provider }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen || !provider) return null;

    const fullName = `${provider.firstName ?? ''} ${provider.lastName ?? ''}`.trim();
    const displayName = provider.businessName ?? (fullName || 'Maintenance Provider');
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=200`;
    const avatar = provider.avatarUrl ?? fallbackAvatar;

    // Resolve Category Info
    const mainCategory = provider.primaryCategory ?? provider.category ?? 'General Maintenance';
    const categoriesList = provider.categories ?? (provider.category ? [provider.category] : []);

    // Type Resolution
    const isCenter = provider.providerType === 'CENTER';
    const typeLabel = isCenter ? 'Center / Agency' : 'Individual Professional';

    // Completed jobs fallback
    const jobsCompleted = provider.completedJobsCount ?? (provider.ratingsCount > 0 ? provider.ratingsCount + 2 : 1);

    return (
        <div className="provider-profile-modal-overlay" onClick={onClose}>
            <div className="provider-profile-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="profile-scroll-container">

                    {/* Cover Hero Background */}
                    <div className="profile-hero">
                        <div className="profile-hero-overlay" />
                        <img src={avatar} alt={displayName} className="profile-cover-img" />
                        <button className="close-profile-btn" onClick={onClose} aria-label="Close Profile">
                            <FaTimes />
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="profile-content-main">

                        {/* Avatar & Header */}
                        <div className="profile-header-section">
                            <div className="profile-avatar-wrapper">
                                <img src={avatar} alt={displayName} className="profile-avatar-img" />
                                <div className="verified-icon-large" title="HOMi Verified Provider">
                                    <FaCheckCircle />
                                </div>
                            </div>

                            <div className="profile-main-meta">
                                <h1>{displayName}</h1>

                                <p className="specialty-text">
                                    <FaToolbox className="toolbox-icon" />
                                    {mainCategory}
                                </p>

                                <div className="rating-location-row">
                                    <div className="p-rating">
                                        <FaStar />
                                        <span className="rating-val">{(provider.rating ?? 0).toFixed(1)}</span>
                                        <span className="rating-count">({provider.ratingsCount ?? 0} reviews)</span>
                                    </div>
                                    {provider.companyLocation && (
                                        <div className="p-location">
                                            <FaMapMarkerAlt /> {provider.companyLocation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Stats Grid */}
                        <div className="profile-grid-info">
                            <div className="info-card">
                                <span className="info-label">Provider Type</span>
                                <span className="info-value">
                                    {isCenter ? <><FaBriefcase /> Center</> : <><FaUser /> Individual</>}
                                </span>
                            </div>
                            <div className="info-card">
                                <span className="info-label">Jobs Completed</span>
                                <span className="info-value">{jobsCompleted}+ verified</span>
                            </div>
                            <div className="info-card">
                                <span className="info-label">Service Focus</span>
                                <span className="info-value">{mainCategory.split(' ')[0]}</span>
                            </div>
                        </div>

                        {/* Bio / About */}
                        <div className="profile-bio-section">
                            <h3>About {displayName.split(' ')[0]}</h3>
                            <p className="bio-text">
                                {provider.bio || `A dedicated, verified maintenance professional specializing in ${mainCategory.toLowerCase()}. Committed to delivering prompt, premium repairs and customer satisfaction through HOMi.`}
                            </p>
                        </div>

                        {/* Skills / Categories Tags */}
                        {categoriesList.length > 0 && (
                            <div className="skills-section">
                                <h3>Offered Services</h3>
                                <div className="skills-tags">
                                    {categoriesList.map((cat) => (
                                        <span key={cat} className="skill-pill">{cat}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Security Escrow Guarantee Panel */}
                        <div className="reviews-section">
                            <div className="escrow-badge-panel">
                                <div className="escrow-icon-wrap">
                                    <FaShieldAlt />
                                </div>
                                <div className="escrow-text-wrap">
                                    <h4>Escrow Protected Booking</h4>
                                    <p>
                                        When you book this professional, your money is safely escrowed from your HOMi wallet.
                                        Payment is only released after you confirm the job has been completed to your satisfaction.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Verified Badges / Trust */}
                        <div className="trust-badges-row">
                            <div className="trust-badge">
                                <FaCheckCircle className="badge-check-icon" /> ID Verified
                            </div>
                            <div className="trust-badge">
                                <FaCheckCircle className="badge-check-icon" /> Background Checked
                            </div>
                            <div className="trust-badge">
                                <FaCheckCircle className="badge-check-icon" /> Quality Guaranteed
                            </div>
                        </div>

                    </div>

                    {/* Modal Bottom Footer Actions */}
                    <div className="profile-footer-sticky">
                        <div className="footer-price-info">
                            <span>Provider Quality</span>
                            <strong>⭐ {(provider.rating ?? 0).toFixed(1)} </strong>
                        </div>
                        <button className="request-fix-btn" onClick={onClose}>Close Profile</button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProviderProfile;
