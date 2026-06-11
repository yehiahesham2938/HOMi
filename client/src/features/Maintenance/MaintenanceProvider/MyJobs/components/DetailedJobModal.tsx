import React from 'react';
import { useTranslation } from 'react-i18next';
import './DetailedJobModal.css';
import { 
    FaTimes, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaTag, 
    FaClock, FaDollarSign, FaCheckCircle, FaSpinner, FaTimesCircle,
    FaArrowRight, FaClipboardList, FaTools, FaExclamationTriangle,
    FaEnvelope
} from 'react-icons/fa';
import type { JobStatus } from './JobCard';

interface DetailedJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: {
        id: string;
        issueType: string;
        description: string;
        requesterName: string;
        requesterRole: 'Tenant' | 'Landlord';
        propertyLocation: string;
        urgency: 'Low' | 'Medium' | 'High' | 'Critical';
        price: number | string;
        dateRequested: string;
        status: JobStatus;
        finishDate?: string;
    } | null;
}

const DetailedJobModal: React.FC<DetailedJobModalProps> = ({ isOpen, onClose, job }) => {
    const { t } = useTranslation();
    if (!isOpen || !job) return null;

    const getStatusTheme = () => {
        switch (job.status) {
            case 'Scheduled': return { icon: <FaCalendarAlt />, label: 'Scheduled', color: '#3b82f6' };
            case 'In Progress': return { icon: <FaSpinner className="spin-icon" />, label: 'In Progress', color: '#eab308' };
            case 'Completed': return { icon: <FaCheckCircle />, label: 'Completed', color: '#22c55e' };
            case 'Canceled': return { icon: <FaTimesCircle />, label: 'Canceled', color: '#ef4444' };
            default: return { icon: null, label: job.status, color: '#6b7280' };
        }
    };

    const theme = getStatusTheme();

    return (
        <div className="job-modal-overlay" onClick={onClose}>
            <div className="job-modal-container" onClick={e => e.stopPropagation()}>
                <header className="job-modal-header" style={{ borderLeft: `8px solid ${theme.color}` }}>
                    <div className="header-left">
                        <div className="status-indicator-pill" style={{ backgroundColor: theme.color }}>
                            {theme.icon}
                            <span>{theme.label}</span>
                        </div>
                        <h2>Job #{job.id.split('-')[1]}</h2>
                    </div>
                    <button className="close-modal-btn" onClick={onClose} aria-label="Close modal">
                        <FaTimes />
                    </button>
                </header>

                <div className="job-modal-body">
                    <div className="modal-main-grid">
                        <div className="grid-left-col">
                            <section className="detail-section">
                                <label className="section-label"><FaTag /> Issue Category</label>
                                <h3 className="category-title">{t('myProperties.maintenanceTypes.' + job.issueType, job.issueType)}</h3>
                            </section>

                            <section className="detail-section">
                                <label className="section-label"><FaClipboardList /> Detailed Description</label>
                                <div className="job-full-desc-box">
                                    <p>{job.description}</p>
                                </div>
                            </section>

                            <div className="meta-info-grid">
                                <div className="meta-box">
                                    <label><FaUser /> Requester</label>
                                    <p>{job.requesterName} <span className={`role-tag ${job.requesterRole.toLowerCase()}`}>{job.requesterRole}</span></p>
                                </div>
                                <div className="meta-box">
                                    <label><FaMapMarkerAlt /> Property Location</label>
                                    <p className="location-link">{job.propertyLocation}</p>
                                </div>
                                <div className="meta-box">
                                    <label><FaClock /> Requested On</label>
                                    <p>{job.dateRequested}</p>
                                </div>
                                <div className="meta-box">
                                    <label><FaExclamationTriangle /> Urgency Level</label>
                                    <p className={`urgency-val ${job.urgency.toLowerCase()}`}>{job.urgency}</p>
                                </div>
                            </div>

                            <section className="detail-section timeline-section">
                                <label className="section-label">Job Timeline</label>
                                <div className="simple-timeline">
                                    <div className="timeline-point completed">
                                        <div className="point-dot"></div>
                                        <div className="point-info">
                                            <span className="point-title">Request Received</span>
                                            <span className="point-date">{job.dateRequested}</span>
                                        </div>
                                    </div>
                                    <div className={`timeline-point ${['Scheduled', 'In Progress', 'Completed'].includes(job.status) ? 'completed' : ''}`}>
                                        <div className="point-dot"></div>
                                        <div className="point-info">
                                            <span className="point-title">Technician Assigned</span>
                                            <span className="point-date">System Auto</span>
                                        </div>
                                    </div>
                                    {job.status === 'Completed' && (
                                        <div className="timeline-point completed">
                                            <div className="point-dot"></div>
                                            <div className="point-info">
                                                <span className="point-title">Work Finished</span>
                                                <span className="point-date">{job.finishDate}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="grid-right-col">
                            <div className="pricing-premium-card">
                                <label>Total Compensation</label>
                                <div className="price-display-large">
                                    <FaDollarSign className="currency-icon" />
                                    <span>{typeof job.price === 'number' ? job.price.toLocaleString() : job.price}</span>
                                </div>
                                <p className="price-hint">Includes materials and labor estimate</p>
                            </div>

                            <div className="status-action-panel">
                                {job.status === 'Scheduled' && (
                                    <div className="action-card appointment">
                                        <div className="action-card-header">
                                            <FaCalendarAlt />
                                            <h4>Appointment Set</h4>
                                        </div>
                                        <div className="appointment-details">
                                            <p className="time">{job.finishDate}</p>
                                            <p className="hint">Arrive 10 mins before</p>
                                        </div>
                                        <button className="btn-action-primary start">Start Job Now</button>
                                        <button className="btn-action-secondary">Reschedule</button>
                                    </div>
                                )}

                                {job.status === 'In Progress' && (
                                    <div className="action-card progress">
                                        <div className="action-card-header">
                                            <FaTools />
                                            <h4>Work in Progress</h4>
                                        </div>
                                        <div className="progress-visual">
                                            <div className="progress-ring-mini"></div>
                                            <div className="progress-text">
                                                <strong>65%</strong>
                                                <span>Estimated completion</span>
                                            </div>
                                        </div>
                                        <button className="btn-action-primary finish">Complete Job</button>
                                        <button className="btn-action-secondary">Update Status</button>
                                    </div>
                                )}

                                {job.status === 'Completed' && (
                                    <div className="action-card completed">
                                        <div className="action-card-header">
                                            <FaCheckCircle />
                                            <h4>Job Finished</h4>
                                        </div>
                                        <p className="completion-summary">Work verified and closed on {job.finishDate}.</p>
                                        <button className="btn-action-outline">View Final Report</button>
                                    </div>
                                )}

                                {job.status === 'Canceled' && (
                                    <div className="action-card canceled">
                                        <div className="action-card-header">
                                            <FaTimesCircle />
                                            <h4>Job Canceled</h4>
                                        </div>
                                        <p className="canceled-reason">This request was withdrawn by the {job.requesterRole.toLowerCase()}.</p>
                                        <button className="btn-action-outline">View Reason</button>
                                    </div>
                                )}
                            </div>

                            <div className="modal-contact-section">
                                <button className="modal-contact-btn">
                                    <FaEnvelope /> Message {job.requesterName}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailedJobModal;
