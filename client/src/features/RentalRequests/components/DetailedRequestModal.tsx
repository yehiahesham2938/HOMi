import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    FaTimes,
    FaTimesCircle,
    FaWallet,
    FaCalendarCheck,
    FaHourglassHalf,
    FaUsers,
    FaQuoteLeft,
    FaCheckCircle,
    FaUserFriends,
    FaCommentDots,
    FaExclamationTriangle,
    FaCheck,
    FaEnvelope,
    FaPhone,
    FaBriefcase,
    FaMapMarkerAlt,
    FaShieldAlt,
    FaInfoCircle,
} from 'react-icons/fa';
import rentalRequestService from '../../../services/rental-request.service';
import { messageService } from '../../../services/message.service';
import './DetailedRequestModal.css';

interface DetailedRequestModalProps {
    data: {
        tenantId?: string;
        propertyId?: string;
        status?: string;
        applicant?: {
            name?: string;
            image?: string;
            matchScore?: number;
            occupation?: string;
            company?: string;
            isFirstTimeRenter?: boolean;
            income?: string;
            creditScore?: number;
            email?: string;
            phoneNumber?: string | null;
            bio?: string | null;
        };
        property?: {
            title?: string;
            name?: string;
            unit?: string;
        };
        moveInDate?: string;
        duration?: string;
        occupants?: number;
        message?: string;
        habits?: string[];
        livingSituation?: string;
        appliedOnDate?: string;
        propertyName?: string;
    };
    requestId: string;
    onStatusChange?: () => void;
    onClose: () => void;
}

const DetailedRequestModal: React.FC<DetailedRequestModalProps> = ({ data, requestId, onStatusChange, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [confirmAction, setConfirmAction] = useState<'approve' | 'decline' | null>(null);
    const [applicationState, setApplicationState] = useState<'pending' | 'approved' | 'declined'>(
        data?.status === 'approved' ? 'approved' : data?.status === 'declined' ? 'declined' : 'pending'
    );
    const [actionLoading, setActionLoading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const {
        applicant,
        property,
        moveInDate,
        duration,
        occupants,
        message,
        habits,
        livingSituation,
        appliedOnDate,
        propertyName,
        tenantId,
        propertyId,
    } = data;

    const applyingForName = [property?.title, property?.name, propertyName, property?.unit]
        .map((value) => value?.trim())
        .find(Boolean) || t('rentalRequests.card.selectedProperty', { defaultValue: 'Selected Property' });

    // Show only real habits - no fallback to mock habits!
    const realHabits = habits || [];

    const handleApprove = async () => {
        try {
            setActionLoading(true);
            await rentalRequestService.updateRequestStatus(requestId, 'APPROVED');
            setApplicationState('approved');
        } catch (error) {
            console.error('Failed to approve rental request', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = async () => {
        try {
            setActionLoading(true);
            await rentalRequestService.updateRequestStatus(requestId, 'DECLINED');
            setApplicationState('declined');
            onStatusChange?.();
        } catch (error) {
            console.error('Failed to decline rental request', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprovedContinue = () => {
        onStatusChange?.();
        navigate('/landlord-contracts');
    };

    const handleMessageTenant = async () => {
        const participantId = tenantId?.trim();
        if (!participantId) {
            navigate('/messages');
            return;
        }
        setIsChatLoading(true);
        try {
            const response = await messageService.startConversation({
                participantId,
                propertyId: propertyId?.trim() || undefined,
            });
            navigate('/messages', {
                state: {
                    conversationId: response.data.id,
                    participantId,
                    propertyId: propertyId?.trim(),
                },
            });
            onClose();
        } catch (error) {
            console.error('Failed to start conversation with tenant', error);
            navigate('/messages', {
                state: { participantId, propertyId: propertyId?.trim() },
            });
            onClose();
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="detailed-modal-overlay" onClick={onClose} dir="ltr">
            <div className="detailed-modal-container" onClick={e => e.stopPropagation()}>
                
                <button className="detailed-close-btn" onClick={onClose} aria-label={t('common.close')}>
                    <FaTimes size={16} />
                </button>

                {/* --- INNER OVERLAYS FOR CONFIRMATION & SUCCESS --- */}
                {confirmAction === 'approve' && applicationState === 'pending' && (
                    <div className="action-overlay">
                        <div className="action-card">
                            <FaExclamationTriangle size={40} color="#f59e0b" style={{ marginBottom: '16px' }} />
                            <h3>{t('rentalRequests.modals.approveTitle', { defaultValue: 'Review Confirmation' })}</h3>
                            <p>{t('rentalRequests.modals.approveText', { name: applicant?.name || "this applicant" })}</p>
                            <div className="action-buttons">
                                <button className="btn-cancel" onClick={() => setConfirmAction(null)}>{t('confirmModal.cancel')}</button>
                                <button className="btn-approve-main" onClick={handleApprove} disabled={actionLoading}>
                                    {actionLoading ? t('auth.loading') : t('rentalRequests.card.approve')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {confirmAction === 'decline' && applicationState === 'pending' && (
                    <div className="action-overlay">
                        <div className="action-card">
                            <FaExclamationTriangle size={40} color="#ef4444" style={{ marginBottom: '16px' }} />
                            <h3>{t('rentalRequests.modals.declineTitle', { defaultValue: 'Decline Application' })}</h3>
                            <p>{t('rentalRequests.modals.declineText', { defaultValue: 'Are you sure you want to decline this application? This action cannot be easily undone.' })}</p>
                            <div className="action-buttons">
                                <button className="btn-cancel" onClick={() => setConfirmAction(null)}>{t('confirmModal.cancel')}</button>
                                <button className="btn-decline-main" style={{ background: '#ef4444', color: '#fff' }} onClick={handleDecline} disabled={actionLoading}>
                                    {actionLoading ? t('auth.loading') : t('rentalRequests.card.decline')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {applicationState === 'approved' && (
                    <div className="action-overlay outcome-approved">
                        <div className="action-card outcome-card">
                            <div className="success-circle"><FaCheck size={32} color="#16a34a" /></div>
                            <h3>{t('rentalRequests.card.approvedBanner')}</h3>
                            <p>{t('rentalRequests.modals.approvedSuccessText', { defaultValue: 'Great news! The next step is to draft and send the official lease agreement to the tenant.' })}</p>
                            <button className="btn-approve-main" style={{ width: '100%' }} onClick={handleApprovedContinue}>
                                {t('rentalRequests.modals.goToContracts', { defaultValue: 'Go to Contracts Hub' })}
                            </button>
                        </div>
                    </div>
                )}

                {applicationState === 'declined' && (
                    <div className="action-overlay outcome-declined">
                        <div className="action-card outcome-card">
                            <div className="decline-outcome-circle" aria-hidden>
                                <FaTimesCircle size={32} color="#dc2626" />
                            </div>
                            <h3>{t('rentalRequests.card.declinedBanner')}</h3>
                            <p>{t('rentalRequests.modals.declinedSuccessText', { defaultValue: 'The applicant will be notified. Use the close control when you are ready to return to your requests.' })}</p>
                        </div>
                    </div>
                )}

                {/* --- HEADER PROFILE BLOCK --- */}
                <div className="modal-premium-header">
                    <div className="header-gradient-bg" />
                    <div className="header-profile-row">
                        <div className="avatar-overlap-wrapper">
                            <img 
                                src={applicant?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(applicant?.name || 'User')}&background=random`} 
                                alt={applicant?.name} 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(applicant?.name || 'User')}&background=random`;
                                }}
                                className="modal-tenant-avatar"
                            />
                            <div className="modal-tenant-verified-badge" title="Verified Account">
                                <FaCheckCircle />
                            </div>
                        </div>

                        <div className="tenant-header-meta">
                            <div className="name-badge-row">
                                <h1>{applicant?.name || "Applicant Name"}</h1>
                                <span className="tenant-status-chip">Verified Applicant</span>
                            </div>
                            <p className="job-company-row">
                                <FaBriefcase className="icon-tiny" />
                                <span>{applicant?.occupation || "Self-employed"} {applicant?.company ? `at ${applicant?.company}` : ''}</span>
                            </p>
                            <p className="applied-date-row">
                                Applied on {appliedOnDate || "Oct 24, 2023"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- MODAL BODY --- */}
                <div className="detailed-modal-body">
                    <div className="modal-dashboard-grid">
                        
                        {/* LEFT CONTENT SECTION */}
                        <div className="modal-grid-left">
                            
                            {/* Contact Details & About */}
                            <div className="dashboard-info-card">
                                <div className="card-header">
                                    <FaShieldAlt className="icon-blue" />
                                    <h3>Tenant Contact & Identity</h3>
                                </div>
                                <div className="contact-info-list">
                                    <div className="contact-item">
                                        <FaEnvelope className="icon-muted" />
                                        <div>
                                            <span className="contact-label">Email Address</span>
                                            <span className="contact-value">{applicant?.email || "Not provided"}</span>
                                        </div>
                                    </div>
                                    <div className="contact-item">
                                        <FaPhone className="icon-muted" />
                                        <div>
                                            <span className="contact-label">Phone Number</span>
                                            <span className="contact-value">{applicant?.phoneNumber || "Not provided"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="tenant-bio-section">
                                    <span className="contact-label">Applicant Bio</span>
                                    <p className="tenant-bio-text">
                                        {applicant?.bio || "The tenant hasn't provided a personal bio yet."}
                                    </p>
                                </div>
                            </div>

                            {/* Personal Cover Message */}
                            <div className="dashboard-info-card">
                                <div className="card-header">
                                    <FaQuoteLeft className="icon-purple" />
                                    <h3>Cover Message</h3>
                                </div>
                                <div className="modal-message-bubble">
                                    <p>"{message || "No application message provided by the tenant."}"</p>
                                </div>
                            </div>

                            {/* Habits & Lifestyles (No Mock Fallbacks) */}
                            <div className="dashboard-info-card">
                                <div className="card-header">
                                    <FaUsers className="icon-orange" />
                                    <h3>Lifestyles & Habits</h3>
                                </div>
                                {realHabits.length > 0 ? (
                                    <div className="modal-habits-container">
                                        {realHabits.map((habit) => (
                                            <span key={habit} className="modal-habit-chip">
                                                {habit}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-habits-alert">
                                        <FaInfoCircle />
                                        <span>No specific lifestyle habits declared by the applicant.</span>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* RIGHT CONTENT SECTION */}
                        <div className="modal-grid-right">
                            
                            {/* Proposed Lease Card */}
                            <div className="dashboard-info-card accent-card">
                                <div className="card-header">
                                    <FaCalendarCheck className="icon-indigo" />
                                    <h3>Proposed Lease Terms</h3>
                                </div>
                                <div className="details-list-vertical">
                                    <div className="details-row-item">
                                        <span className="details-label">Preferred Move-In</span>
                                        <strong className="details-val">{moveInDate || "Flexible"}</strong>
                                    </div>
                                    <div className="details-row-item">
                                        <span className="details-label">Duration</span>
                                        <strong className="details-val">{duration || "12"} Months</strong>
                                    </div>
                                    <div className="details-row-item">
                                        <span className="details-label">Total Occupants</span>
                                        <strong className="details-val">{occupants || 1} {occupants === 1 ? "Person" : "People"}</strong>
                                    </div>
                                    <div className="details-row-item">
                                        <span className="details-label">Living Arrangement</span>
                                        <strong className="details-val capitalize">{livingSituation || "Single"}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Background & Verification */}
                            <div className="dashboard-info-card">
                                <div className="card-header">
                                    <FaWallet className="icon-green" />
                                    <h3>Financial & Background Check</h3>
                                </div>
                                <div className="details-list-vertical">
                                    <div className="details-row-item">
                                        <span className="details-label">Monthly Net Income</span>
                                        <strong className="details-val income-val">{applicant?.income || "Not declared"}</strong>
                                    </div>
                                    <div className="details-row-item verification-item">
                                        <span className="details-label">National ID Verification</span>
                                        <span className="status-badge-verified">Verified</span>
                                    </div>
                                    <div className="details-row-item verification-item">
                                        <span className="details-label">Phone Verification</span>
                                        <span className="status-badge-verified">Verified</span>
                                    </div>
                                    <div className="details-row-item verification-item">
                                        <span className="details-label">Email Verification</span>
                                        <span className="status-badge-verified">Verified</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* TARGET PROPERTY BAR */}
                    <div className="modal-property-context-bar">
                        <div className="property-meta-info">
                            <span className="context-label">Applying For Property</span>
                            <h4>{applyingForName}</h4>
                            {property?.unit && (
                                <p className="property-subtext-address">
                                    <FaMapMarkerAlt /> {property.unit}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* STICKY ACTION BUTTONS */}
                    {applicationState === 'pending' && (
                        <div className="modal-sticky-actions">
                            <button className="btn-modal-approve" onClick={() => setConfirmAction('approve')}>
                                <FaCheck /> Accept Application
                            </button>
                            <div className="modal-secondary-actions-row">
                                <button
                                    type="button"
                                    className="btn-modal-chat"
                                    disabled={isChatLoading}
                                    onClick={() => void handleMessageTenant()}
                                >
                                    <FaCommentDots /> {isChatLoading ? "Opening Chat..." : "Message Applicant"}
                                </button>
                                <button
                                    className="btn-modal-decline"
                                    onClick={() => setConfirmAction('decline')}
                                >
                                    Decline Application
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DetailedRequestModal;
