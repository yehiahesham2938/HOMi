import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    FaTimes, FaCalendarAlt, FaClock, FaCheck, FaBan,
    FaHourglassHalf, FaExclamationTriangle, FaUserAlt
} from 'react-icons/fa';
import propertyService from '../../../services/property.service';
import './LandlordVisitsModal.css';

interface LandlordVisitsModalProps {
    property: {
        id: string;
        name: string;
    };
    onClose: () => void;
}

const LandlordVisitsModal: React.FC<LandlordVisitsModalProps> = ({ property, onClose }) => {
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchVisits = async () => {
        try {
            setError(null);
            const res = await propertyService.getPropertyVisits(property.id);
            if (res.success) {
                setVisits(res.data || []);
            } else {
                setError('Failed to load visit requests.');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchVisits();
    }, [property.id]);

    const handleUpdateStatus = async (visitId: string, status: 'ACCEPTED' | 'DECLINED') => {
        setActionLoadingId(visitId);
        try {
            const res = await propertyService.updateVisitStatus(property.id, visitId, status);
            if (res.success) {
                // Update local state
                setVisits((prev) =>
                    prev.map((v) => (v.id === visitId ? { ...v, status } : v))
                );
            } else {
                setError(`Failed to ${status.toLowerCase()} request.`);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error occurred.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    const modalContent = (
        <div className="visits-modal-overlay" onClick={onClose}>
            <div className="visits-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="visits-modal-header">
                    <div>
                        <h2>Visit Booking Requests</h2>
                        <p className="property-subtitle">{property.name}</p>
                    </div>
                    <button className="visits-modal-close" onClick={onClose} aria-label="Close modal">
                        <FaTimes />
                    </button>
                </div>

                <div className="visits-modal-content">
                    {error && (
                        <div className="visits-error">
                            <FaExclamationTriangle />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="visits-loading-spinner">
                            <div className="spinner" />
                            <p>Loading bookings...</p>
                        </div>
                    ) : visits.length === 0 ? (
                        <div className="visits-empty">
                            <div className="empty-icon">📅</div>
                            <h3>No visit requests yet</h3>
                            <p>When tenants request viewings for this property, they will appear here.</p>
                        </div>
                    ) : (
                        <div className="visits-list">
                            {visits.map((visit) => {
                                const tenant = visit.tenant || {};
                                const profile = tenant.profile || {};
                                const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Tenant';
                                const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'T';

                                return (
                                    <div key={visit.id} className="visit-item-card">
                                        <div className="tenant-profile-info">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt={fullName} className="tenant-avatar" />
                                            ) : (
                                                <div className="tenant-avatar-fallback">{initials}</div>
                                            )}
                                            <div>
                                                <h4>{fullName}</h4>
                                                <span className="tenant-email">{tenant.email}</span>
                                            </div>
                                        </div>

                                        <div className="visit-datetime-badge">
                                            <div className="dt-item">
                                                <FaCalendarAlt />
                                                <span>{formatDate(visit.visit_date)}</span>
                                            </div>
                                            <div className="dt-item">
                                                <FaClock />
                                                <span>{formatTime(visit.visit_date)}</span>
                                            </div>
                                        </div>

                                        <div className="visit-action-status-section">
                                            {visit.status === 'PENDING' ? (
                                                <div className="visit-actions">
                                                    <button
                                                        className="btn-action accept"
                                                        onClick={() => handleUpdateStatus(visit.id, 'ACCEPTED')}
                                                        disabled={actionLoadingId !== null}
                                                    >
                                                        {actionLoadingId === visit.id ? (
                                                            <div className="mini-spin" />
                                                        ) : (
                                                            <><FaCheck /> Accept</>
                                                        )}
                                                    </button>
                                                    <button
                                                        className="btn-action decline"
                                                        onClick={() => handleUpdateStatus(visit.id, 'DECLINED')}
                                                        disabled={actionLoadingId !== null}
                                                    >
                                                        {actionLoadingId === visit.id ? (
                                                            <div className="mini-spin" />
                                                        ) : (
                                                            <><FaBan /> Decline</>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`visit-status-tag ${visit.status.toLowerCase()}`}>
                                                    {visit.status === 'ACCEPTED' ? (
                                                        <><FaCheck /> Accepted</>
                                                    ) : (
                                                        <><FaBan /> Declined</>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default LandlordVisitsModal;
