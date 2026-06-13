import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './DetailedMaintenanceModal.css';
import { FaTimes, FaCreditCard, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaTag, FaCheckCircle, FaTrashAlt, FaDollarSign } from 'react-icons/fa';

export interface DetailedMaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: {
        id: string;
        issueType: string;
        description: string;
        urgency: 'Low' | 'Medium' | 'High' | 'Critical';
        price: number | string;
        requesterName: string;
        requesterRole: 'Tenant' | 'Landlord';
        propertyLocation: string;
        datePosted: string;
        deadline: string;
        paymentMethod: 'Cash' | 'Instapay' | 'Visa' | 'Vodafone cash';
    } | null;
    onAccept: (id: string, scheduleTime: string) => void;
    onIgnore: (id: string) => void;
}

const DetailedMaintenanceModal: React.FC<DetailedMaintenanceModalProps> = ({
    isOpen,
    onClose,
    request,
    onAccept,
    onIgnore
}) => {
    const { t } = useTranslation();
    const [scheduleTime, setScheduleTime] = useState('');
    const [isAccepted, setIsAccepted] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    if (!isOpen || !request) return null;

    const handleAccept = () => {
        if (!scheduleTime) {
            alert('Please select a schedule time');
            return;
        }
        onAccept(request.id, scheduleTime);
        setShowSuccess(true);

        // Auto close after 3 seconds
        setTimeout(() => {
            handleResetAndClose();
        }, 3000);
    };

    const handleResetAndClose = () => {
        setShowSuccess(false);
        setIsAccepted(false);
        setScheduleTime('');
        onClose();
    };

    const handleBack = () => {
        setIsAccepted(false);
        setScheduleTime('');
    };

    return (
        <div className="maintenance-modal-overlay" onClick={handleResetAndClose}>
            <div className="maintenance-modal-container" onClick={e => e.stopPropagation()}>
                {showSuccess ? (
                    <div className="modal-success-state">
                        <div className="success-icon-circle">
                            <FaCheckCircle />
                        </div>
                        <h2>Visit Scheduled!</h2>
                        <p>Your visit for <strong>{t('myProperties.maintenanceTypes.' + request.issueType, request.issueType)}</strong> has been scheduled for:</p>
                        <div className="success-time-badge">
                            <FaClock /> {new Date(scheduleTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <button className="modal-success-close-btn" onClick={handleResetAndClose}>
                            Return to Dashboard
                        </button>
                    </div>
                ) : (
                    <>
                        <header className="maintenance-modal-header">
                            <div className="header-title-group">
                                <div className={`modal-urgency-badge ${request.urgency.toLowerCase()}`}>
                                    {request.urgency}
                                </div>
                                <h2>Maintenance Details</h2>
                            </div>
                            <button className="modal-close-btn" onClick={handleResetAndClose} aria-label="Close modal">
                                <FaTimes />
                            </button>
                        </header>

                        <div className="maintenance-modal-content">
                            <div className="modal-details-grid">
                                <div className="details-main-column">
                                    <section className="modal-info-section">
                                        <label className="modal-section-label"><FaTag /> Category</label>
                                        <h3 className="modal-category-title">{t('myProperties.maintenanceTypes.' + request.issueType, request.issueType)}</h3>
                                    </section>

                                    <section className="modal-info-section">
                                        <label className="modal-section-label"><FaClock /> Description</label>
                                        <p className="modal-description-text">{request.description}</p>
                                    </section>

                                    <div className="modal-metadata-grid">
                                        <div className="metadata-item">
                                            <label><FaUser /> Posted By</label>
                                            <span>{request.requesterName} <small>({request.requesterRole})</small></span>
                                        </div>
                                        <div className="metadata-item">
                                            <label><FaMapMarkerAlt /> Location</label>
                                            <span>{request.propertyLocation}</span>
                                        </div>
                                        <div className="metadata-item">
                                            <label><FaCalendarAlt /> Posted On</label>
                                            <span>{request.datePosted}</span>
                                        </div>
                                        <div className="metadata-item">
                                            <label><FaCheckCircle /> Response Deadline</label>
                                            <span className="deadline-text">{request.deadline}</span>
                                        </div>
                                        <div className="metadata-item">
                                            <label><FaCreditCard /> Payment Method</label>
                                            <span className="payment-method-tag">{request.paymentMethod}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-side-column">
                                    <div className="modal-price-card">
                                        <label><FaDollarSign /> Est. Compensation</label>
                                        <div className="modal-price-value">
                                            {typeof request.price === 'number' ? `$${request.price}` : request.price}
                                        </div>
                                    </div>

                                    {!isAccepted ? (
                                        <div className="modal-action-group">
                                            <button
                                                className="modal-accept-btn"
                                                onClick={() => setIsAccepted(true)}
                                            >
                                                Accept Request
                                            </button>
                                            <button
                                                className="modal-ignore-btn"
                                                onClick={() => onIgnore(request.id)}
                                            >
                                                <FaTrashAlt /> Ignore
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="modal-scheduling-form">
                                            <label htmlFor="schedule-time">Schedule Service Time</label>
                                            <div className="input-with-icon">
                                                <FaCalendarAlt className="input-icon" />
                                                <input
                                                    type="datetime-local"
                                                    id="schedule-time"
                                                    value={scheduleTime}
                                                    onChange={(e) => setScheduleTime(e.target.value)}
                                                    className="modal-datetime-input"
                                                />
                                            </div>
                                            <p className="deadline-hint">Must be before {request.deadline}</p>

                                            <div className="modal-scheduling-actions">
                                                <button className="modal-confirm-btn" onClick={handleAccept}>
                                                    Confirm Schedule
                                                </button>
                                                <button className="modal-back-btn" onClick={handleBack}>
                                                    Back
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DetailedMaintenanceModal;
