import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
        <div className="landlord-maintenance-layout">
            <Sidebar />
            <div className="landlord-maintenance-content">
                <Header />

                <main className="maintenance-main-container">
                    <header className="maintenance-hero">
                        <div className="hero-text">
                            <span className="pre-title">Property care overview</span>
                            <h1>Maintenance for your properties</h1>
                            <p>Watch over every maintenance event happening at your properties — fully transparent.</p>
                        </div>

                        <div className="maintenance-quick-stats">
                            <div className="mini-stat">
                                <span className="stat-num">{totals.active}</span>
                                <span className="stat-desc">Active issues</span>
                            </div>
                            <div className="mini-stat accent">
                                <span className="stat-num">{totals.open}</span>
                                <span className="stat-desc">Awaiting maintainer</span>
                            </div>
                            <div className="mini-stat">
                                <span className="stat-num">{totals.disputes}</span>
                                <span className="stat-desc">Open disputes</span>
                            </div>
                            <div className="mini-stat accent">
                                <span className="stat-num">EGP {totals.landlordCharges.toFixed(0)}</span>
                                <span className="stat-desc">Charged to you (deducted from rent)</span>
                            </div>
                        </div>
                    </header>

                    {error && <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, marginBottom: '1rem' }}>{error}</div>}

                    <section className="tab-content-wrapper">
                        <div className="tab-pane animate-in">
                            <div className="section-header">
                                <div>
                                    <h2>All maintenance requests</h2>
                                    <p>Notifications about each event are also delivered to your inbox.</p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="empty-state-container"><h3>Loading…</h3></div>
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
                </main>

                {selected && (
                    <div className="req-modal-overlay" onClick={() => setSelected(null)}>
                        <div className="req-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>

                            <header className="req-modal-header" style={{ background: '#f8fafc', padding: '20px 30px', borderBottom: '1px solid #e2e8f0' }}>
                                <div className="req-modal-title-group">
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                                        Request Details
                                    </span>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{selected.title}</h2>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <span className={`badge ${statusBadge(selected.status).cls}`}>
                                            {statusBadge(selected.status).label}
                                        </span>
                                        <span className={`badge urgency-${selected.urgency?.toLowerCase()}`} style={{
                                            padding: '0.4rem 1rem',
                                            borderRadius: '100px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            background: selected.urgency === 'CRITICAL' || selected.urgency === 'HIGH' ? '#fee2e2' : selected.urgency === 'MEDIUM' ? '#fef3c7' : '#d1fae5',
                                            color: selected.urgency === 'CRITICAL' || selected.urgency === 'HIGH' ? '#991b1b' : selected.urgency === 'MEDIUM' ? '#92400e' : '#065f46'
                                        }}>
                                            {selected.urgency}
                                        </span>
                                        <span style={{ padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
                                            {selected.category}
                                        </span>
                                    </div>
                                </div>
                                <button className="req-close-btn" onClick={() => setSelected(null)}>×</button>
                            </header>

                            <div className="req-modal-body" style={{ padding: '30px' }}>
                                
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Description</h4>
                                    <p className="req-modal-desc" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', color: '#334155', fontSize: '0.95rem', margin: 0 }}>
                                        {selected.description}
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    {/* Property and Resident */}
                                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                            Property & Resident
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {selected.property && (
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Property</span>
                                                    <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{selected.property.title}</strong>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>{selected.property.address}</span>
                                                </div>
                                            )}
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Tenant</span>
                                                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                                                    {selected.tenant ? `${selected.tenant.firstName} ${selected.tenant.lastName}`.trim() : '—'}
                                                </strong>
                                                {selected.tenant?.phone && (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>{selected.tenant.phone}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Maintainer & Financials */}
                                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                            Provider & Cost Allocation
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Assigned Maintainer</span>
                                                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                                                    {selected.provider
                                                        ? selected.provider.businessName ?? `${selected.provider.firstName} ${selected.provider.lastName}`.trim()
                                                        : 'Not Assigned Yet'}
                                                </strong>
                                                {selected.provider && selected.provider.rating !== undefined && (
                                                    <span style={{ fontSize: '0.8rem', color: '#eab308', display: 'block' }}>
                                                        ★ {selected.provider.rating.toFixed(1)} ({selected.provider.ratingsCount} reviews)
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Charge Party & Agreed Price</span>
                                                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                                                    {selected.chargeParty === 'LANDLORD' ? 'Landlord Pays' : 'Tenant Pays'}
                                                </strong>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'block' }}>
                                                    {selected.agreedPrice != null ? `EGP ${Number(selected.agreedPrice).toFixed(2)}` : 'Awaiting Bid'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selected.completionNotes && (
                                    <div style={{ marginBottom: '24px', background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '16px', padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.05em' }}>Provider Completion Notes</h4>
                                        <p style={{ margin: 0, color: '#1e293b', fontSize: '0.9rem', lineHeight: '1.5' }}>{selected.completionNotes}</p>
                                    </div>
                                )}

                                {selected.disputedReason && (
                                    <div style={{ marginBottom: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.05em' }}>Dispute Reason</h4>
                                        <p style={{ margin: 0, color: '#991b1b', fontSize: '0.9rem', lineHeight: '1.5' }}>{selected.disputedReason}</p>
                                    </div>
                                )}

                                {selected.images.length > 0 && (
                                    <div className="req-modal-gallery" style={{ marginTop: '20px' }}>
                                        <strong style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>Issue Photos</strong>
                                        <div className="gallery-grid">
                                            {selected.images.map((u, i) => (
                                                <img key={i} src={u} alt={`issue ${i + 1}`} style={{ borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'cover', height: '100px', width: '100%' }} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selected.completionImages.length > 0 && (
                                    <div className="req-modal-gallery" style={{ marginTop: '20px' }}>
                                        <strong style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>Completion Photos</strong>
                                        <div className="gallery-grid">
                                            {selected.completionImages.map((u, i) => (
                                                <img key={i} src={u} alt={`completion ${i + 1}`} style={{ borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'cover', height: '100px', width: '100%' }} />
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
    );
};

export default LandlordMaintenance;
