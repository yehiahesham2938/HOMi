import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../../components/global/header';
import Footer from '../../../../components/global/footer';
import Sidebar from '../../../../components/global/Landlord/sidebar';
import LiveTrackingModal from '../components/LiveTrackingModal';
import ApplicationsModal from '../components/ApplicationsModal';
import './LandlordMaintenance.css';
import {
    FaTools, FaClock, FaExclamationTriangle, FaWallet,
    FaTint, FaBolt, FaSnowflake, FaLeaf, FaHammer, FaWrench, FaUsers, FaShieldAlt
} from 'react-icons/fa';
import DetailedIssueModal from '../components/DetailedIssueModal';
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

function getCategoryIcon(category: string) {
    const cat = String(category || '').toLowerCase();
    switch (cat) {
        case 'plumbing': return <FaTint className="type-icon-inner color-plumbing" />;
        case 'electrical': return <FaBolt className="type-icon-inner color-electrical" />;
        case 'hvac': return <FaSnowflake className="type-icon-inner color-ac" />;
        case 'exterior': return <FaLeaf className="type-icon-inner color-gardening" />;
        case 'structural': return <FaHammer className="type-icon-inner color-other" />;
        case 'appliances': return <FaWrench className="type-icon-inner color-other" />;
        case 'utilities': return <FaBolt className="type-icon-inner color-other" />;
        case 'pest': return <FaLeaf className="type-icon-inner color-other" />;
        case 'common': return <FaUsers className="type-icon-inner color-other" />;
        case 'security': return <FaShieldAlt className="type-icon-inner color-other" />;
        default: return <FaHammer className="type-icon-inner color-other" />;
    }
}

const LandlordMaintenance: React.FC = () => {
    const { t } = useTranslation();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
    const [trackRequest, setTrackRequest] = useState<MaintenanceRequest | null>(null);
    const [appsRequest, setAppsRequest] = useState<MaintenanceRequest | null>(null);

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
                                <div className="marketplace-grid">
                                    {requests.map((req) => {
                                        const sb = statusBadge(req.status);
                                        const urgencyClass = req.urgency ? req.urgency.toLowerCase() : 'medium';
                                        return (
                                            <div key={req.id} className={`post-card-premium card-urgency-${urgencyClass}`}>
                                                <div className="card-glass-glow"></div>
                                                <div className="post-card-header">
                                                    <div className="post-card-badge status-pill">
                                                        <span className={`status-dot dot-${sb.cls}`}></span>
                                                        <span>{sb.label}</span>
                                                    </div>
                                                    {req.urgency && (
                                                        <div className={`urgency-pill urgency-${urgencyClass}`}>
                                                            {req.urgency}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="post-card-content">
                                                    <div className="post-card-type">
                                                        <div className={`type-icon-wrapper bg-${urgencyClass}`}>
                                                            {getCategoryIcon(req.category)}
                                                        </div>
                                                        <span className="category-text">
                                                            {t('myProperties.maintenanceTypes.' + req.category, req.category)}
                                                        </span>
                                                    </div>
                                                    <h3 className="post-title-text">{req.title}</h3>
                                                    <p className="post-description">{req.description}</p>
                                                    <div className="post-meta">
                                                        <div className="meta-item flex-row-center">
                                                            <FaClock className="meta-icon" />
                                                            <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="meta-item flex-row-center">
                                                            <FaBolt className="meta-icon animated-pulse" />
                                                            <span>{req.applicationsCount ?? 0} applications</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="post-card-footer">
                                                    <div className="budget-info">
                                                        <span className="budget-label">
                                                            {req.chargeParty === 'LANDLORD' ? 'You pay (Landlord)' : 'Tenant pays'}
                                                        </span>
                                                        <strong className="budget-val">
                                                            {req.agreedPrice != null
                                                                ? `EGP ${Number(req.agreedPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                : req.estimatedBudget
                                                                    ? `EGP ${Number(req.estimatedBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                    : '—'}
                                                        </strong>
                                                    </div>
                                                    <div className="post-action-buttons">
                                                        <button className="view-bids-btn btn-view" onClick={() => setSelected(req)}>Details</button>
                                                        {req.status === 'OPEN' && (
                                                            <button
                                                                className="view-bids-btn btn-bids"
                                                                onClick={() => setAppsRequest(req)}
                                                            >
                                                                Bids ({req.applicationsCount ?? 0})
                                                            </button>
                                                        )}
                                                        {(req.status === 'EN_ROUTE' || req.status === 'IN_PROGRESS') && (
                                                            <button
                                                                className="view-bids-btn btn-track"
                                                                onClick={() => setTrackRequest(req)}
                                                            >
                                                                Track
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <DetailedIssueModal
                        isOpen={!!selected}
                        onClose={() => setSelected(null)}
                        isViewOnly
                        initialData={selected}
                        onPostSuccess={() => {}}
                    />

                    {trackRequest && (
                        <LiveTrackingModal
                            isOpen
                            onClose={() => setTrackRequest(null)}
                            request={trackRequest}
                        />
                    )}

                    <ApplicationsModal
                        isOpen={!!appsRequest}
                        onClose={() => setAppsRequest(null)}
                        request={appsRequest}
                        onAccepted={() => {
                            setAppsRequest(null);
                            void load();
                        }}
                    />

                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default LandlordMaintenance;
