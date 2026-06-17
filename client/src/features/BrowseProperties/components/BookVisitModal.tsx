import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    FaTimes, FaCalendarAlt, FaClock, FaHourglassHalf,
    FaCheckCircle, FaExclamationTriangle, FaHome
} from 'react-icons/fa';
import propertyService from '../../../services/property.service';
import './BookVisitModal.css';

interface BookVisitModalProps {
    property: {
        id: string;
        title: string;
        price: number;
        address?: string;
        image: string;
        ownerName?: string;
        landlordId: string;
    };
    onClose: () => void;
}

const BookVisitModal: React.FC<BookVisitModalProps> = ({ property, onClose }) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const [booking, setBooking] = useState<any>(null);
    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [visitDate, setVisitDate] = useState('');
    const [visitTime, setVisitTime] = useState('10:00');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchCurrentBooking = async () => {
            try {
                const res = await propertyService.getMyVisit(property.id);
                if (res.success && res.data) {
                    setBooking(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch active visit booking:', err);
            } finally {
                setFetching(false);
            }
        };

        void fetchCurrentBooking();
    }, [property.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitDate || !visitTime) {
            setError(t('browseProperties.selectDateAndTimeError'));
            return;
        }

        const dateTimeStr = `${visitDate}T${visitTime}:00`;
        const selectedDate = new Date(dateTimeStr);
        if (selectedDate.getTime() < Date.now()) {
            setError(t('browseProperties.futureDateError'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await propertyService.bookVisit(property.id, selectedDate.toISOString());
            if (res.success) {
                setSuccess(true);
                setBooking(res.data);
            } else {
                setError(t('browseProperties.bookVisitFailed'));
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || t('browseProperties.bookVisitFailed');
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const formatDateString = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return iso;
        }
    };

    const formatTimeString = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString(currentLang === 'ar' ? 'ar-EG' : undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    const minDate = new Date().toISOString().split('T')[0];

    const modalContent = (
        <div className="visit-modal-overlay" onClick={onClose}>
            <div className="visit-modal-container" onClick={(e) => e.stopPropagation()} dir="ltr">
                <button className="visit-modal-close" onClick={onClose} aria-label={t('browseProperties.closeWindow')}>
                    <FaTimes />
                </button>

                <div className="visit-modal-layout">
                    {/* Property mini-card */}
                    <div className="visit-modal-sidebar">
                        <div className="visit-property-card">
                            <img src={property.image} alt={property.title} />
                            <div className="visit-property-info">
                                <span className="visit-property-badge">
                                    <FaHome /> {t('browseProperties.viewing')}
                                </span>
                                <h4>{property.title}</h4>
                                <p className="visit-property-price">${property.price.toLocaleString()}<span>/{t('activeRental.monthsShort')}</span></p>
                                {property.address && <p className="visit-property-address">{property.address}</p>}
                            </div>
                        </div>
                        {property.ownerName && (
                            <div className="visit-landlord-card">
                                <h5>{t('browseProperties.landlord')}</h5>
                                <p>{property.ownerName}</p>
                            </div>
                        )}
                    </div>

                    {/* Main Actions Panel */}
                    <div className="visit-modal-main">
                        {fetching ? (
                            <div className="visit-loading">
                                <div className="visit-spinner" />
                                <p>{t('browseProperties.loadingVisitStatus')}</p>
                            </div>
                        ) : success ? (
                            <div className="visit-success-screen">
                                <FaCheckCircle className="visit-success-icon" />
                                <h2>{t('browseProperties.requestSentSuccess')}</h2>
                                <p>{t('browseProperties.requestSentSuccessText')}</p>
                                <button className="visit-btn-primary" onClick={onClose}>{t('browseProperties.done')}</button>
                            </div>
                        ) : booking ? (
                            <div className="visit-status-screen">
                                {booking.status === 'ACCEPTED' ? (
                                    <>
                                        <div className="visit-status-header success">
                                            <FaCheckCircle className="status-icon" />
                                            <div>
                                                <h3>{t('browseProperties.visitScheduled')}</h3>
                                                <p>{t('browseProperties.visitScheduledText')}</p>
                                            </div>
                                        </div>
                                        <div className="visit-details-box">
                                            <div className="detail-item">
                                                <FaCalendarAlt />
                                                <div>
                                                    <label>{t('browseProperties.date')}</label>
                                                    <span>{formatDateString(booking.visit_date)}</span>
                                                </div>
                                            </div>
                                            <div className="detail-item">
                                                <FaClock />
                                                <div>
                                                    <label>{t('browseProperties.time')}</label>
                                                    <span>{formatTimeString(booking.visit_date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="visit-status-header pending">
                                            <FaHourglassHalf className="status-icon pulse" />
                                            <div>
                                                <h3>{t('browseProperties.visitRequested')}</h3>
                                                <p>{t('browseProperties.visitRequestedText')}</p>
                                            </div>
                                        </div>
                                        <div className="visit-details-box">
                                            <div className="detail-item">
                                                <FaCalendarAlt />
                                                <div>
                                                    <label>{t('browseProperties.dateRequested')}</label>
                                                    <span>{formatDateString(booking.visit_date)}</span>
                                                </div>
                                            </div>
                                            <div className="detail-item">
                                                <FaClock />
                                                <div>
                                                    <label>{t('browseProperties.timeRequested')}</label>
                                                    <span>{formatTimeString(booking.visit_date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <button className="visit-btn-secondary" onClick={onClose} style={{ marginTop: '24px', width: '100%' }}>
                                    {t('browseProperties.closeWindow')}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="visit-form">
                                <div className="visit-form-header">
                                    <h2>{t('browseProperties.bookPropertyVisit')}</h2>
                                    <p>{t('browseProperties.bookPropertyVisitSubtitle')}</p>
                                </div>

                                <div className="visit-form-row">
                                    <div className="visit-input-group">
                                        <label htmlFor="visitDate"><FaCalendarAlt /> {t('browseProperties.selectDate')}</label>
                                        <input
                                            type="date"
                                            id="visitDate"
                                            required
                                            min={minDate}
                                            value={visitDate}
                                            onChange={(e) => setVisitDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="visit-input-group">
                                        <label htmlFor="visitTime"><FaClock /> {t('browseProperties.preferredTime')}</label>
                                        <input
                                            type="time"
                                            id="visitTime"
                                            required
                                            value={visitTime}
                                            onChange={(e) => setVisitTime(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="visit-error-banner">
                                        <FaExclamationTriangle />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="visit-btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? <div className="visit-spinner-mini" /> : t('browseProperties.requestVisitBooking')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default BookVisitModal;
