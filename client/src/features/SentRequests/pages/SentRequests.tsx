

// client/src/features/SentRequests/pages/SentRequests.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, Clock, CheckCircle, XCircle, RefreshCw, BedDouble, Bath, Ruler, Calendar } from 'lucide-react';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import { rentalRequestService, type MyRentalRequest, type RentalRequestStatus } from '../../../services/rental-request.service';
import Loader from '../../../components/global/Loader';
import './SentRequests.css';

const formatDuration = (duration: string): string => {
    const match = /^(\d+)_MONTHS$/.exec(duration);
    if (!match) return duration;

    const totalMonths = Number(match[1]);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    let yearsPart = '';
    if (years > 0) {
        yearsPart = `${years} year${years === 1 ? '' : 's'}`;
    }

    let monthsPart = '';
    if (months > 0) {
        monthsPart = `${months} month${months === 1 ? '' : 's'}`;
    }

    if (yearsPart && monthsPart) return `${yearsPart}, ${monthsPart}`;
    return yearsPart || monthsPart || duration;
};

const getPropertyImage = (req: MyRentalRequest): string => {
    const images = req.property.images ?? [];
    const main = images.find(i => i.isMain)?.imageUrl;
    return main || images[0]?.imageUrl
        || 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800';
};

const SentRequests: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const [requests, setRequests] = useState<MyRentalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<RentalRequestStatus | 'ALL'>('ALL');

    const fetchRequests = async (status?: RentalRequestStatus) => {
        setLoading(true);
        setError(null);
        try {
            const res = await rentalRequestService.getMyRequests({
                status,
                page: 1,
                limit: 50,
            });
            setRequests(res.data);
        } catch {
            setError(t('sentRequests.errFailedToLoad', 'Failed to load your requests. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchRequests(activeFilter === 'ALL' ? undefined : activeFilter);
    }, [activeFilter]);

    const handleCardClick = (req: MyRentalRequest) => {
        navigate(`/properties/${req.property.id}`, { state: { rentalRequest: req } });
    };

    const landlordName = (req: MyRentalRequest) => {
        const l = req.property.landlord;
        const name = l ? `${l.firstName} ${l.lastName}`.trim() : '';
        return name || t('sentRequests.propertyOwner', 'Property Owner');
    };

    const getStatusConfig = (status: RentalRequestStatus) => {
        const config = {
            PENDING: {
                label: t('sentRequests.statusPending', 'Pending'),
                icon: <Clock size={13} />,
                badgeClass: 'badge-pending',
                cardClass: 'card-pending',
            },
            APPROVED: {
                label: t('sentRequests.statusApproved', 'Approved'),
                icon: <CheckCircle size={13} />,
                badgeClass: 'badge-approved',
                cardClass: 'card-approved',
            },
            DECLINED: {
                label: t('sentRequests.statusDeclined', 'Declined'),
                icon: <XCircle size={13} />,
                badgeClass: 'badge-declined',
                cardClass: 'card-declined',
            },
        };
        return config[status];
    };

    const getStatusLabelText = (status: RentalRequestStatus | 'ALL', lowercase = false) => {
        if (status === 'PENDING') {
            return lowercase ? t('sentRequests.statusPendingLower', 'pending') : t('sentRequests.filterPending', 'Pending');
        }
        if (status === 'APPROVED') {
            return lowercase ? t('sentRequests.statusApprovedLower', 'approved') : t('sentRequests.filterApproved', 'Approved');
        }
        if (status === 'DECLINED') {
            return lowercase ? t('sentRequests.statusDeclinedLower', 'declined') : t('sentRequests.filterDeclined', 'Declined');
        }
        return '';
    };

    const durationLabel = (duration: string) => {
        if (duration === '6_MONTHS') return t('sentRequests.duration6Months', '6 months');
        if (duration === '12_MONTHS') return t('sentRequests.duration12Months', '12 months');
        if (duration === '24_MONTHS') return t('sentRequests.duration24Months', '24 months');
        return formatDuration(duration);
    };

    const filters = [
        { label: t('sentRequests.filterAll', 'All'), value: 'ALL' as const },
        { label: t('sentRequests.filterPending', 'Pending'), value: 'PENDING' as const },
        { label: t('sentRequests.filterApproved', 'Approved'), value: 'APPROVED' as const },
        { label: t('sentRequests.filterDeclined', 'Declined'), value: 'DECLINED' as const },
    ];

    const localeCode = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

    return (
        <div className="sent-requests-layout">
            <Header />

            <div className="sent-requests-main">
                <Sidebar />

                <div className="sent-requests-content">
                    {/* ── Page header ── */}
                    <div className="sent-requests-header">
                        <div>
                            <h1>{t('sentRequests.title', 'Sent Requests')}</h1>
                            <p>{t('sentRequests.subtitle', 'Track and manage the status of your rental applications.')}</p>
                        </div>
                        <button
                            className="btn-refresh"
                            onClick={() => fetchRequests(activeFilter === 'ALL' ? undefined : activeFilter)}
                            title="Refresh"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {/* ── Filter tabs ── */}
                    <div className="filter-tabs">
                        {filters.map(f => (
                            <button
                                key={f.value}
                                className={`filter-tab ${activeFilter === f.value ? 'active' : ''}`}
                                onClick={() => setActiveFilter(f.value)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* 🔹 Loading 🔹 */}
                    {loading && (
                        <Loader text={t('sentRequests.loadingRequests', 'Loading your requests...')} />
                    )}

                    {/* ── Error ── */}
                    {!loading && error && (
                        <div className="sent-error">
                            <p>{error}</p>
                            <button onClick={() => fetchRequests()}>{t('sentRequests.retry', 'Retry')}</button>
                        </div>
                    )}

                    {/* ── Requests grid ── */}
                    {!loading && !error && requests.length > 0 && (
                        <div className="requests-grid">
                            {requests.map(req => {
                                const cfg = getStatusConfig(req.status);
                                const img = getPropertyImage(req);
                                const beds = req.property.specifications?.bedrooms;
                                const baths = req.property.specifications?.bathrooms;
                                const sqft = req.property.specifications?.areaSqft;
                                const movedIn = req.moveInDate
                                    ? new Date(req.moveInDate).toLocaleDateString(localeCode, { month: 'short', day: 'numeric', year: 'numeric' })
                                    : t('sentRequests.tbd', 'TBD');
                                const submittedOn = req.createdAt
                                    ? new Date(req.createdAt).toLocaleDateString(localeCode, { month: 'short', day: 'numeric', year: 'numeric' })
                                    : t('sentRequests.unknown', 'Unknown');

                                return (
                                    <div
                                        key={req.id}
                                        className={`request-card ${cfg.cardClass}`}
                                        onClick={() => handleCardClick(req)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {/* Image */}
                                        <div className="request-card-image-wrapper">
                                            <img src={img} alt={req.property.title} />
                                            <span className={`status-badge ${cfg.badgeClass}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </div>

                                        {/* Body */}
                                        <div className="request-card-info">
                                            <h3>{req.property.title}</h3>
                                            <p className="request-address">{req.property.address}</p>

                                            {/* Specs row */}
                                            <div className="request-specs">
                                                <span><BedDouble size={13} /> {typeof beds === 'number' ? t('sentRequests.bedsCount', '{{count}} bed', { count: beds }) : '—'}</span>
                                                <span><Bath size={13} /> {typeof baths === 'number' ? t('sentRequests.bathsCount', '{{count}} bath', { count: baths }) : '—'}</span>
                                                <span><Ruler size={13} /> {typeof sqft === 'number' ? t('sentRequests.sqftCount', '{{count}} sqft', { count: sqft }) : '—'}</span>
                                            </div>

                                            {/* Meta info */}
                                            <div className="request-meta">
                                                <div className="meta-row">
                                                    <Calendar size={13} />
                                                    <span>{t('sentRequests.moveInLabel', 'Move-in:')} <strong>{movedIn}</strong></span>
                                                </div>
                                                <div className="meta-row">
                                                    <Clock size={13} />
                                                    <span>{t('sentRequests.durationTitle', 'Duration:')} <strong>{durationLabel(req.duration)}</strong></span>
                                                </div>
                                                <div className="meta-row landlord-meta">
                                                    <span>{t('sentRequests.landlordTitle', 'Landlord:')} <strong>{landlordName(req)}</strong></span>
                                                </div>
                                                <div className="meta-row submitted-meta">
                                                    <span>{t('sentRequests.submittedTitle', 'Submitted:')} <strong>{submittedOn}</strong></span>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="request-card-footer">
                                                <span className="request-price">
                                                    ${(req.property.monthlyPrice ?? 0).toLocaleString()}
                                                    <span>{t('sentRequests.perMonth', '/mo')}</span>
                                                </span>
                                                {(req.property.securityDeposit ?? 0) > 0 && (
                                                    <span className="request-security-deposit" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                        {t('sentRequests.depositPrefix', 'Dep:')} ${(req.property.securityDeposit ?? 0).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Empty state ── */}
                    {!loading && !error && requests.length === 0 && (
                        <div className="sent-empty-state-container">
                            <div className="sent-empty-icon-wrapper">
                                <Inbox size={56} className="sent-empty-icon" />
                            </div>
                            <h3 className="sent-empty-title">
                                {activeFilter === 'ALL'
                                    ? t('sentRequests.noRequestsYet')
                                    : t('sentRequests.noFilteredRequests', { status: getStatusLabelText(activeFilter) })}
                            </h3>
                            <p className="sent-empty-text">
                                {activeFilter === 'ALL'
                                    ? t('sentRequests.noRequestsDesc')
                                    : t('sentRequests.noFilteredRequestsDesc', { status: getStatusLabelText(activeFilter, true) })}
                            </p>
                            {activeFilter === 'ALL' && (
                                <button
                                    className="btn-browse-action"
                                    onClick={() => navigate('/browse-properties')}
                                >
                                    {t('sentRequests.browseProperties')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default SentRequests;