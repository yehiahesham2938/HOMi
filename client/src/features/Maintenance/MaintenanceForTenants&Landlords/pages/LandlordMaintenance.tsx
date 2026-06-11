import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../../components/global/header';
import Footer from '../../../../components/global/footer';
import Sidebar from '../../../../components/global/Landlord/sidebar';
import LiveTrackingModal from '../components/LiveTrackingModal';
import './LandlordMaintenance.css';
import {
    FaTools, FaCheckCircle, FaClock, FaExclamationTriangle,
    FaChevronRight, FaMapMarkerAlt, FaUser, FaWallet,
} from 'react-icons/fa';
import maintenanceService, {
    type MaintenanceRequest,
} from '../../../../services/maintenance.service';
import socketService from '../../../../services/socket.service';
import Loader from '../../../../components/global/Loader';

function statusBadge(status: MaintenanceRequest['status']) {
    switch (status) {
        case 'OPEN': return { label: 'Open', cls: 'open' };
        case 'ASSIGNED': return { label: 'Scheduled', cls: 'scheduled' };
        case 'EN_ROUTE': return { label: 'On the way', cls: 'en-route' };
        case 'IN_PROGRESS': return { label: 'In progress', cls: 'in-progress' };
        case 'AWAITING_CONFIRMATION': return { label: 'Awaiting confirmation', cls: 'awaiting' };
        case 'COMPLETED': return { label: 'Completed', cls: 'completed' };
        case 'DISPUTED': return { label: 'Disputed', cls: 'disputed' };
        case 'RESOLVED_BY_ADMIN': return { label: 'Resolved by admin', cls: 'completed' };
        case 'CANCELLED': return { label: 'Cancelled', cls: 'cancelled' };
        default: return { label: status, cls: 'open' };
    }
}

const LandlordMaintenance: React.FC = () => {
    const { t } = useTranslation();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
    const [trackRequest, setTrackRequest] = useState<MaintenanceRequest | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const list = await maintenanceService.listLandlordRequests();
            setRequests(list);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load maintenance.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        socketService.connect();
        const handler = () => { void load(); };
        socketService.onMaintenanceStatus(handler);
        socketService.onNotificationNew(handler);
        return () => {
            socketService.offMaintenanceStatus(handler);
            socketService.offNotificationNew(handler);
        };
    }, [load]);

    const totals = useMemo(() => {
        const active = requests.filter((r) => !['COMPLETED', 'CANCELLED', 'RESOLVED_BY_ADMIN'].includes(r.status));
        const onLandlord = requests.filter((r) => r.chargeParty === 'LANDLORD');
        const totalLandlordCharges = onLandlord.reduce((s, r) => s + (r.agreedPrice ?? 0), 0);
        const open = requests.filter((r) => r.status === 'OPEN').length;
        return {
            active: active.length,
            open,
            disputes: requests.filter((r) => r.status === 'DISPUTED').length,
            landlordCharges: totalLandlordCharges,
        };
    }, [requests]);

    return (
        <div className="landlord-maintenance-hub-wrapper">
            <div className="landlord-maintenance-layout">
                <Sidebar />
                <div className="landlord-maintenance-content">
                    <Header />

                    <main className="maintenance-main-container">
                        <header className="maintenance-hero">
                            <div className="hero-glass-mesh"></div>
                            <div className="hero-text">
                                <span className="pre-title">Property care overview</span>
                                <h1>Maintenance for your properties</h1>
                                <p>Watch over every maintenance event happening at your properties — fully transparent.</p>
                            </div>

                            <div className="maintenance-quick-stats">
                                <div className="mini-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaTools className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{totals.active}</span>
                                        <span className="stat-desc">Active issues</span>
                                    </div>
                                </div>
                                <div className="mini-stat accent">
                                    <div className="stat-icon-wrapper">
                                        <FaClock className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{totals.open}</span>
                                        <span className="stat-desc">Awaiting maintainer</span>
                                    </div>
                                </div>
                                <div className="mini-stat warning-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaExclamationTriangle className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{totals.disputes}</span>
                                        <span className="stat-desc">Open disputes</span>
                                    </div>
                                </div>
                                <div className="mini-stat wallet-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaWallet className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">EGP {totals.landlordCharges.toFixed(0)}</span>
                                        <span className="stat-desc">Charged to you</span>
                                    </div>
                                </div>
                            </div>
                        </header>
                    </main>
                    {error && <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, marginBottom: '1rem' }}>{error}</div>}

                    <section className="l-tab-content-wrapper">
                        <div className="l-tab-pane animate-in">
                            <div className="l-section-header">
                                <div>
                                    <h2>All maintenance requests</h2>
                                    <p>Notifications about each event are also delivered to your inbox.</p>
                                </div>
                            </div>

                            {loading ? (
                                <Loader text="Loading maintenance data..." />
                            ) : requests.length === 0 ? (
                                <div className="empty-state-container">
                                    <div className="empty-state-icon-box"><FaTools /></div>
                                    <h3>No maintenance yet</h3>
                                    <p>You'll see issues here as soon as your tenants report any.</p>
                                </div>
                            ) : (
                                <div className="active-requests-list">
                                    {requests.map((req) => {
                                        const sb = statusBadge(req.status);
                                        return (
                                            <div key={req.id} className="active-request-row">
                                                <div className={`status-indicator ${sb.cls}`}>
                                                    {req.status === 'COMPLETED' || req.status === 'RESOLVED_BY_ADMIN' ? <FaCheckCircle /> :
                                                        req.status === 'DISPUTED' ? <FaExclamationTriangle /> :
                                                            <FaClock />}
                                                </div>
                                                <div className="req-main-info">
                                                    <h4>{req.title}</h4>
                                                    <p>{req.description}</p>
                                                    {req.property && (
                                                        <small style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b', marginTop: 4 }}>
                                                            <FaMapMarkerAlt /> {req.property.title} — {req.property.address}
                                                        </small>
                                                    )}
                                                </div>
                                                <div className="req-provider">
                                                    <span className="label"><FaUser style={{ marginRight: 4 }} /> Tenant</span>
                                                    <span className="value">
                                                        {req.tenant ? `${req.tenant.firstName} ${req.tenant.lastName}`.trim() : '—'}
                                                    </span>
                                                </div>
                                                <div className="req-provider">
                                                    <span className="label">Maintainer</span>
                                                    <span className="value">
                                                        {req.provider
                                                            ? req.provider.businessName ??
                                                            `${req.provider.firstName} ${req.provider.lastName}`.trim()
                                                            : '—'}
                                                    </span>
                                                </div>
                                                <div className="req-date">
                                                    <span className="label">
                                                        <FaWallet style={{ marginRight: 4 }} />
                                                        {req.chargeParty === 'LANDLORD' ? 'You pay' : 'Tenant pays'}
                                                    </span>
                                                    <span className="value">
                                                        {req.agreedPrice != null ? `EGP ${Number(req.agreedPrice).toFixed(2)}` : '—'}
                                                    </span>
                                                </div>
                                                <div className="req-status-badge">
                                                    <span className={`badge ${sb.cls}`}>{sb.label}</span>
                                                </div>
                                                <button
                                                    className="req-details-btn"
                                                    onClick={() => {
                                                        if (req.status === 'EN_ROUTE' || req.status === 'IN_PROGRESS') setTrackRequest(req);
                                                        else setSelected(req);
                                                    }}
                                                >
                                                    <FaChevronRight />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>
                    {selected && (
                        <div className="req-modal-overlay" onClick={() => setSelected(null)}>
                            <div className="req-modal modal-md-width" onClick={(e) => e.stopPropagation()}>

                                <header className="req-modal-header">
                                    <div className="req-modal-title-group">
                                        <span className="modal-pre-title">
                                            Request Details
                                        </span>
                                        <h2>{selected.title}</h2>
                                        <div className="modal-badge-group">
                                            <span className={`badge ${statusBadge(selected.status).cls}`}>
                                                {statusBadge(selected.status).label}
                                            </span>
                                            <span className={`badge urgency-pill urgency-${selected.urgency?.toLowerCase()}`}>
                                                {selected.urgency}
                                            </span>
                                            <span className="modal-category-badge">
                                                {t('myProperties.maintenanceTypes.' + selected.category, selected.category)}
                                            </span>
                                        </div>
                                    </div>
                                    <button className="req-close-btn" onClick={() => setSelected(null)}>×</button>
                                </header>

                                <div className="req-modal-body">

                                    <div className="modal-section">
                                        <h4 className="modal-section-title">Description</h4>
                                        <p className="req-modal-desc">
                                            {selected.description}
                                        </p>
                                    </div>

                                    <div className="modal-grid-two-col">
                                        {/* Property and Resident */}
                                        <div className="modal-panel-card">
                                            <h4 className="modal-panel-title">
                                                Property & Resident
                                            </h4>
                                            <div className="panel-items-list">
                                                {selected.property && (
                                                    <div className="panel-item-group">
                                                        <span className="panel-item-label">Property</span>
                                                        <strong className="panel-item-value">{selected.property.title}</strong>
                                                        <span className="panel-item-subtext">{selected.property.address}</span>
                                                    </div>
                                                )}
                                                <div className="panel-item-group">
                                                    <span className="panel-item-label">Tenant</span>
                                                    <strong className="panel-item-value">
                                                        {selected.tenant ? `${selected.tenant.firstName} ${selected.tenant.lastName}`.trim() : '—'}
                                                    </strong>
                                                    {selected.tenant?.phone && (
                                                        <span className="panel-item-subtext">{selected.tenant.phone}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Maintainer & Financials */}
                                        <div className="modal-panel-card">
                                            <h4 className="modal-panel-title">
                                                Provider & Cost Allocation
                                            </h4>
                                            <div className="panel-items-list">
                                                <div className="panel-item-group">
                                                    <span className="panel-item-label">Assigned Maintainer</span>
                                                    <strong className="panel-item-value">
                                                        {selected.provider
                                                            ? selected.provider.businessName ?? `${selected.provider.firstName} ${selected.provider.lastName}`.trim()
                                                            : 'Not Assigned Yet'}
                                                    </strong>
                                                    {selected.provider && selected.provider.rating !== undefined && (
                                                        <span className="panel-rating">
                                                            ★ {selected.provider.rating.toFixed(1)} ({selected.provider.ratingsCount} reviews)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="panel-item-group">
                                                    <span className="panel-item-label">Charge Party & Agreed Price</span>
                                                    <strong className="panel-item-value">
                                                        {selected.chargeParty === 'LANDLORD' ? 'Landlord Pays' : 'Tenant Pays'}
                                                    </strong>
                                                    <span className="panel-price">
                                                        {selected.agreedPrice != null ? `EGP ${Number(selected.agreedPrice).toFixed(2)}` : 'Awaiting Bid'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selected.completionNotes && (
                                        <div className="notes-panel notes-success">
                                            <h4 className="notes-title">Provider Completion Notes</h4>
                                            <p className="notes-content">{selected.completionNotes}</p>
                                        </div>
                                    )}

                                    {selected.disputedReason && (
                                        <div className="notes-panel notes-danger">
                                            <h4 className="notes-title">Dispute Reason</h4>
                                            <p className="notes-content">{selected.disputedReason}</p>
                                        </div>
                                    )}

                                    {selected.images.length > 0 && (
                                        <div className="req-modal-gallery">
                                            <strong className="gallery-title">Issue Photos</strong>
                                            <div className="gallery-grid">
                                                {selected.images.map((u, i) => (
                                                    <img key={i} src={u} alt={`issue ${i + 1}`} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selected.completionImages.length > 0 && (
                                        <div className="req-modal-gallery">
                                            <strong className="gallery-title">Completion Photos</strong>
                                            <div className="gallery-grid">
                                                {selected.completionImages.map((u, i) => (
                                                    <img key={i} src={u} alt={`completion ${i + 1}`} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}

                    {trackRequest && (
                        <LiveTrackingModal
                            isOpen
                            onClose={() => setTrackRequest(null)}
                            request={trackRequest}
                        />
                    )}

                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default LandlordMaintenance;
