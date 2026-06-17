// client/src/features/SentRequests/pages/SentRequests.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Clock, CheckCircle, XCircle, RefreshCw, BedDouble, Bath, Ruler, Calendar } from 'lucide-react';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import { rentalRequestService, type MyRentalRequest, type RentalRequestStatus } from '../../../services/rental-request.service';
import Loader from '../../../components/global/Loader';
import './SentRequests.css';

const STATUS_CONFIG: Record<RentalRequestStatus, {
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
    cardClass: string;
}> = {
    PENDING: {
        label: 'Pending',
        icon: <Clock size={13} />,
        badgeClass: 'badge-pending',
        cardClass: 'card-pending',
    },
    APPROVED: {
        label: 'Approved',
        icon: <CheckCircle size={13} />,
        badgeClass: 'badge-approved',
        cardClass: 'card-approved',
    },
    DECLINED: {
        label: 'Declined',
        icon: <XCircle size={13} />,
        badgeClass: 'badge-declined',
        cardClass: 'card-declined',
    },
};

const DURATION_LABELS: Record<string, string> = {
    '6_MONTHS':  '6 months',
    '12_MONTHS': '12 months',
    '24_MONTHS': '24 months',
};

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

const FILTERS: { label: string; value: RentalRequestStatus | 'ALL' }[] = [
    { label: 'All',      value: 'ALL'      },
    { label: 'Pending',  value: 'PENDING'  },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Declined', value: 'DECLINED' },
];

const getPropertyImage = (req: MyRentalRequest): string => {
    const images = req.property.images ?? [];
    const main = images.find(i => i.isMain)?.imageUrl;
    return main || images[0]?.imageUrl
        || 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800';
};

const SentRequests: React.FC = () => {
    const navigate = useNavigate();

    const [requests,     setRequests]     = useState<MyRentalRequest[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<RentalRequestStatus | 'ALL'>('ALL');

    const fetchRequests = async (status?: RentalRequestStatus) => {
        setLoading(true);
        setError(null);
        try {
            const res = await rentalRequestService.getMyRequests({
                status,
                page:  1,
                limit: 50,
            });
            setRequests(res.data);
        } catch {
            setError('Failed to load your requests. Please try again.');
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
        return name || 'Property Owner';
    };

    return (
        <div className="sent-requests-layout">
            <Header />

            <div className="sent-requests-main">
                <Sidebar />

                <div className="sent-requests-content">
                    {/* ── Page header ── */}
                    <div className="sent-requests-header">
                        <div>
                            <h1>Sent Requests</h1>
                            <p>Track and manage the status of your rental applications.</p>
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
                        {FILTERS.map(f => (
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
                        <Loader text="Loading your requests..." />
                    )}

                    {/* ── Error ── */}
                    {!loading && error && (
                        <div className="sent-error">
                            <p>{error}</p>
                            <button onClick={() => fetchRequests()}>Retry</button>
                        </div>
                    )}

                    {/* ── Requests grid ── */}
                    {!loading && !error && requests.length > 0 && (
                        <div className="requests-grid">
                            {requests.map(req => {
                                const cfg     = STATUS_CONFIG[req.status];
                                const img     = getPropertyImage(req);
                                const beds    = req.property.specifications?.bedrooms  ?? '—';
                                const baths   = req.property.specifications?.bathrooms ?? '—';
                                const sqft    = req.property.specifications?.areaSqft  ?? '—';
                                const movedIn = req.moveInDate
                                    ? new Date(req.moveInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    : 'TBD';
                                const submittedOn = req.createdAt
                                    ? new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    : 'Unknown';

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
                                                <span><BedDouble size={13} /> {beds} bed</span>
                                                <span><Bath size={13} /> {baths} bath</span>
                                                <span><Ruler size={13} /> {sqft} sqft</span>
                                            </div>

                                            {/* Meta info */}
                                            <div className="request-meta">
                                                <div className="meta-row">
                                                    <Calendar size={13} />
                                                    <span>Move-in: <strong>{movedIn}</strong></span>
                                                </div>
                                                <div className="meta-row">
                                                    <Clock size={13} />
                                                    <span>Duration: <strong>{DURATION_LABELS[req.duration] ?? formatDuration(req.duration)}</strong></span>
                                                </div>
                                                <div className="meta-row landlord-meta">
                                                    <span>Landlord: <strong>{landlordName(req)}</strong></span>
                                                </div>
                                                <div className="meta-row submitted-meta">
                                                    <span>Submitted: <strong>{submittedOn}</strong></span>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="request-card-footer">
                                                <span className="request-price">
                                                    ${(req.property.monthlyPrice ?? 0).toLocaleString()}
                                                    <span>/mo</span>
                                                </span>
                                                {(req.property.securityDeposit ?? 0) > 0 && (
                                                    <span className="request-security-deposit" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                        Dep: ${(req.property.securityDeposit ?? 0).toLocaleString()}
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
                                {activeFilter === 'ALL' ? 'No Requests Sent Yet' : `No ${activeFilter.charAt(0) + activeFilter.slice(1).toLowerCase()} Requests`}
                            </h3>
                            <p className="sent-empty-text">
                                {activeFilter === 'ALL'
                                    ? "You haven't applied to any properties yet. Start exploring available rentals and find your perfect home!"
                                    : `You have no ${activeFilter.toLowerCase()} rental requests.`}
                            </p>
                            {activeFilter === 'ALL' && (
                                <button
                                    className="btn-browse-action"
                                    onClick={() => navigate('/browse-properties')}
                                >
                                    Browse Properties
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