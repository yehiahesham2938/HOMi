import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './DetailedRentCard.css';
import {
    FaCalendarAlt, FaUserCircle,
    FaFileDownload, FaMapMarkerAlt, FaGavel, FaTimes, FaHome,
    FaBed, FaBath, FaRulerCombined, FaEye
} from 'react-icons/fa';
import pdfService from '../../../services/pdf.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';
import { propertyService } from '../../../services/property.service';
import { mapPropertyToUI } from '../../../utils/propertyMapping';
import PropertyDetailModal from '../../BrowseProperties/components/PropertyDetailedModal';
import type { PropertyDetailModalProperty } from '../../BrowseProperties/components/PropertyDetailedModal';

interface RentalProps {
    rental: {
        title: string;
        address: string;
        landlord: string;
        leaseStart: string;
        leaseEnd: string;
        sqft: number;
        image: string | null;
        propertyType?: string;
        houseRules: string[];
        monthlyRent: number;
    };
    contract: any;
}

const DetailedRentCard: React.FC<RentalProps> = ({ rental, contract }) => {
    const { t } = useTranslation();
    const [showRules, setShowRules] = useState(false);
    const [propertyDetailData, setPropertyDetailData] = useState<PropertyDetailModalProperty | null>(null);
    const [isPropertyLoading, setIsPropertyLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setShowRules(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDownloadPDF = async (lang: 'en' | 'ar') => {
        if (!contract) return;
        const pdfData = {
            id: contract.id,
            property: rental.title,
            propertyAddress: rental.address,
            propertyType: rental.propertyType || 'Apartment',
            landlord: rental.landlord,
            landlordNationalId: contract.landlordNationalId,
            landlordAddress: contract.landlordAddress || 'Cairo, Egypt',
            tenant: `${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}`.trim() || 'Tenant',
            tenantNationalId: contract.tenantNationalId,
            tenantAddress: contract.tenantAddress || rental.address,
            startDate: rental.leaseStart,
            duration: `${contract.leaseDurationMonths || 12} Months`,
            amount: rental.monthlyRent,
            deposit: contract.securityDeposit || 0,
            lateFeeAmount: contract.lateFeeAmount || 0,
            permittedUse: contract.permittedUse || 'Residential purposes only',
            rightToEnter: contract.rightToEnter || 'With 24h notice',
            noticePeriod: contract.noticePeriod || '24 Hours',
            maintenanceResponsibilities: contract.maintenanceResponsibilities,
            landlordSignature: normalizeSignatureUrl(contract.landlordSignature),
            tenantSignature: normalizeSignatureUrl(contract.tenantSignature),
            executionDate: new Date(contract.createdAt).toLocaleDateString(),
        };
        await pdfService.generateContractPDF(pdfData as any, lang);
    };

    const houseRules = rental.houseRules;
    const locationBadge = rental.address.split(',')[1]?.trim() || rental.address;

    const handleViewPropertyDetails = async () => {
        const propertyId = contract?.property?.id || contract?.propertyId;
        if (!propertyId) return;
        setIsPropertyLoading(true);
        try {
            const res = await propertyService.getPropertyById(propertyId);
            if (res.data) {
                const mapped = mapPropertyToUI(res.data);
                setPropertyDetailData({
                    ...mapped,
                    status: 'RENTED',
                });
            }
        } catch (error) {
            console.error('Failed to fetch property details', error);
        } finally {
            setIsPropertyLoading(false);
        }
    };

    // Derived values for progress calculation
    const leaseDuration = contract?.leaseDurationMonths ?? 12;
    const paidMonths = contract?.paidInstallments ?? 1;
    const progressPercent = Math.min(100, Math.max(0, (paidMonths / leaseDuration) * 100));

    const bedrooms = contract?.propertySpecifications?.bedrooms ?? 0;
    const bathrooms = contract?.propertySpecifications?.bathrooms ?? 0;
    const areaSqft = contract?.propertySpecifications?.areaSqft ?? rental.sqft ?? 0;

    return (
        <div className="premium-detailed-card animate-fade-in" dir="ltr">
            <div className="card-visual-side">
                {rental.image ? (
                    <img src={rental.image} alt={rental.title} className="hero-rental-img" />
                ) : (
                    <div className="hero-rental-img placeholder-rental-img" aria-label="Property image unavailable">
                        <FaHome />
                        <span>{t('landlordHomeComponents.noPhotos')}</span>
                    </div>
                )}
                <div className="glass-status-tag">{t('activeLease.inEffect')}</div>
            </div>

            <div className="card-content-side">
                <div className="card-actions-row">
                    <div className="pdf-buttons-group">
                        <button className="download-contract-btn" onClick={() => handleDownloadPDF('en')}>
                            <FaFileDownload />
                            <span>{t('activeLease.downloadPDF')} (EN)</span>
                        </button>
                        <button className="download-contract-btn" onClick={() => handleDownloadPDF('ar')}>
                            <FaFileDownload />
                            <span>{t('activeLease.downloadPDF')} (AR)</span>
                        </button>
                    </div>

                    <div className="rules-wrapper">
                        <button
                            className={`rules-trigger-btn ${showRules ? 'active' : ''}`}
                            onClick={() => setShowRules(!showRules)}
                        >
                            <FaGavel />
                            <span>{t('activeLease.houseRules')}</span>
                        </button>

                        {showRules && (
                            <div className="mini-rules-modal" ref={modalRef}>
                                <div className="rules-header">
                                    <span>{t('activeLease.propertyRules')}</span>
                                    <FaTimes className="close-rules" onClick={() => setShowRules(false)} />
                                </div>
                                <ul className="rules-list">
                                    {(houseRules.length > 0 ? houseRules : [t('landlordHomeComponents.noHouseRulesProvided')]).map((rule) => (
                                        <li key={rule}>{rule}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <header className="rental-header">
                    <div className="location-row">
                        <div className="location-badge">
                            <FaMapMarkerAlt /> {locationBadge}
                        </div>
                        <button
                            type="button"
                            className="btn-view-property-details"
                            disabled={isPropertyLoading}
                            onClick={() => void handleViewPropertyDetails()}
                        >
                            {isPropertyLoading ? (
                                <span className="spinner-tiny" />
                            ) : (
                                <FaEye />
                            )}
                            View property details
                        </button>
                    </div>
                    <h2>{rental.title}</h2>
                    <p className="full-address">{rental.address}</p>
                </header>



                <div className="info-grid-modern">
                    <div className="landlord-profile-card">
                        <div className="landlord-avatar-placeholder">
                            {rental.landlord.charAt(0).toUpperCase()}
                        </div>
                        <div className="landlord-details">
                            <span className="landlord-label">{t('activeLease.landlord')}</span>
                            <span className="landlord-name">{rental.landlord}</span>
                        </div>
                        <div className="landlord-contact-badge">Owner</div>
                    </div>

                    <div className="lease-progress-container">
                        <div className="lease-progress-header">
                            <span>Lease Progress</span>
                            <strong>{paidMonths} / {leaseDuration} mo</strong>
                        </div>
                        <div className="lease-progress-bar-outer">
                            <div className="lease-progress-bar-inner" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="lease-progress-labels">
                            <span>Start ({rental.leaseStart})</span>
                            <span>End ({rental.leaseEnd})</span>
                        </div>
                    </div>
                </div>
            </div>

            {propertyDetailData && createPortal(
                <PropertyDetailModal
                    property={propertyDetailData}
                    onClose={() => setPropertyDetailData(null)}
                />,
                document.body
            )}
        </div>
    );
};

export default DetailedRentCard;