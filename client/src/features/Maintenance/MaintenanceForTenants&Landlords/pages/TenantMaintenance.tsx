import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../../../../components/global/header';
import Footer from '../../../../components/global/footer';
import Sidebar from '../../../../components/global/Tenant/sidebar';
import ProviderCard from '../components/ProviderCard';
import DetailedIssueModal from '../components/DetailedIssueModal';
import ProviderProfile from '../components/ProviderProfile';
import ApplicationsModal from '../components/ApplicationsModal';
import LiveTrackingModal from '../components/LiveTrackingModal';
import CompletionConfirmModal from '../components/CompletionConfirmModal';
import './TenantMaintenance.css';
import {
    FaPlus, FaSearch, FaFilter, FaTools, FaCalendarCheck,
    FaHammer, FaBolt, FaCheckCircle, FaClock, FaTimesCircle,
    FaChevronRight, FaMapMarkerAlt, FaUsers,
    FaTint, FaSnowflake, FaLeaf, FaPaintRoller, FaWrench, FaTrashAlt
} from 'react-icons/fa';
import maintenanceService, {
    type BrowseProvider,
    type MaintenanceRequest,
} from '../../../../services/maintenance.service';
import socketService from '../../../../services/socket.service';
import { MAINTENANCE_CATEGORIES } from '../../constants/categories';

function statusColor(status: MaintenanceRequest['status']) {
    switch (status) {
        case 'OPEN': return { label: 'Open', className: 'open' };
        case 'ASSIGNED': return { label: 'Scheduled', className: 'scheduled' };
        case 'EN_ROUTE': return { label: 'On the way', className: 'en-route' };
        case 'IN_PROGRESS': return { label: 'In progress', className: 'in-progress' };
        case 'AWAITING_CONFIRMATION': return { label: 'Awaiting confirmation', className: 'awaiting' };
        case 'COMPLETED': return { label: 'Completed', className: 'completed' };
        case 'DISPUTED': return { label: 'Disputed', className: 'disputed' };
        case 'RESOLVED_BY_ADMIN': return { label: 'Resolved by admin', className: 'completed' };
        case 'CANCELLED': return { label: 'Cancelled', className: 'cancelled' };
        default: return { label: status, className: 'open' };
    }
}

function getCategoryIcon(category: string) {
    switch (category) {
        case 'Plumbing': return <FaTint className="type-icon-inner color-plumbing" />;
        case 'Electrical': return <FaBolt className="type-icon-inner color-electrical" />;
        case 'Painting': return <FaPaintRoller className="type-icon-inner color-painting" />;
        case 'AC Service': return <FaSnowflake className="type-icon-inner color-ac" />;
        case 'Gardening': return <FaLeaf className="type-icon-inner color-gardening" />;
        case 'Flooring': return <FaWrench className="type-icon-inner color-flooring" />;
        default: return <FaHammer className="type-icon-inner color-other" />;
    }
}

const TenantMaintenance: React.FC = () => {
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as 'post' | 'browse' | 'active') || 'post';
    const [activeTab, setActiveTab] = useState<'post' | 'browse' | 'active'>(initialTab);

    // Sync tab when URL param changes (e.g. navigating back with ?tab=active)
    useEffect(() => {
        const t = searchParams.get('tab') as 'post' | 'browse' | 'active' | null;
        if (t && ['post', 'browse', 'active'].includes(t)) setActiveTab(t);
    }, [searchParams]);

    // ── Browse providers state ────────────────────────────────────────────────
    const [providers, setProviders] = useState<BrowseProvider[]>([]);
    const [providersLoading, setProvidersLoading] = useState(false);
    const [providerSearch, setProviderSearch] = useState('');
    const [providerCategory, setProviderCategory] = useState<string>('All');
    const [providerType, setProviderType] = useState<'ALL' | 'INDIVIDUAL' | 'CENTER'>('ALL');

    // ── Tenant requests state ────────────────────────────────────────────────
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Modals ────────────────────────────────────────────────────────────────
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isViewOnlyModal, setIsViewOnlyModal] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<MaintenanceRequest | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<BrowseProvider | null>(null);
    const [appsRequest, setAppsRequest] = useState<MaintenanceRequest | null>(null);
    const [trackRequest, setTrackRequest] = useState<MaintenanceRequest | null>(null);
    const [confirmRequest, setConfirmRequest] = useState<MaintenanceRequest | null>(null);

    // ─── Loaders ────────────────────────────────────────────────────────────
    const loadProviders = useCallback(async () => {
        try {
            setProvidersLoading(true);
            const list = await maintenanceService.listProviders({
                category: providerCategory !== 'All' ? providerCategory : undefined,
                type: providerType !== 'ALL' ? providerType : undefined,
                search: providerSearch.trim() || undefined,
            });
            setProviders(list);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load providers.');
        } finally {
            setProvidersLoading(false);
        }
    }, [providerCategory, providerType, providerSearch]);

    const loadRequests = useCallback(async () => {
        try {
            setRequestsLoading(true);
            const list = await maintenanceService.listTenantRequests();
            setRequests(list);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load your requests.');
        } finally {
            setRequestsLoading(false);
        }
    }, []);

    useEffect(() => { loadProviders(); }, [loadProviders]);
    useEffect(() => { loadRequests(); }, [loadRequests]);

    // ─── Realtime: refresh requests on status events ───────────────────────
    useEffect(() => {
        socketService.connect();
        const handler = () => { void loadRequests(); };
        socketService.onMaintenanceStatus(handler);
        socketService.onMaintenanceAwaitingConfirmation(handler);
        return () => {
            socketService.offMaintenanceStatus(handler);
            socketService.offMaintenanceAwaitingConfirmation(handler);
        };
    }, [loadRequests]);

    // ─── Active vs history split ────────────────────────────────────────────
    const activeRequests = useMemo(
        () =>
            requests.filter(
                (r) => !['COMPLETED', 'CANCELLED', 'RESOLVED_BY_ADMIN'].includes(r.status)
            ),
        [requests]
    );
    const completedRequests = useMemo(
        () =>
            requests.filter((r) =>
                ['COMPLETED', 'CANCELLED', 'RESOLVED_BY_ADMIN'].includes(r.status)
            ),
        [requests]
    );

    // ─── Handlers ───────────────────────────────────────────────────────────
    const openPostModal = () => {
        setSelectedIssue(null);
        setIsViewOnlyModal(false);
        setIsIssueModalOpen(true);
    };

    const openViewIssueModal = (req: MaintenanceRequest) => {
        setSelectedIssue(req);
        setIsViewOnlyModal(true);
        setIsIssueModalOpen(true);
    };

    const openApplicationsModal = (req: MaintenanceRequest) => setAppsRequest(req);
    const openTrackingModal = (req: MaintenanceRequest) => setTrackRequest(req);

    const handlePostSuccess = (created: MaintenanceRequest) => {
        setRequests((prev) => [created, ...prev]);
    };

    const handleCancel = async (req: MaintenanceRequest) => {
        if (!window.confirm('Cancel this maintenance request?')) return;
        try {
            const updated = await maintenanceService.cancelTenantRequest(req.id);
            setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        } catch (err: any) {
            alert(err?.response?.data?.message ?? 'Could not cancel.');
        }
    };

    const handleViewProfile = (id: string) => {
        const provider = providers.find((p) => p.id === id);
        if (provider) {
            setSelectedProvider(provider);
            setIsProfileModalOpen(true);
        }
    };

    // ─── Render tabs ───────────────────────────────────────────────────────
    const renderPostTab = () => (
        <div className="tab-pane animate-in">
            <div className="tl-section-header">
                <div>
                    <h2>Your maintenance issues</h2>
                    <p>Post a new issue from your active rental — pros will start applying with their final price.</p>
                </div>
                <button className="post-issue-btn" onClick={openPostModal}>
                    <FaPlus /> Post New Issue
                </button>
            </div>

            {requestsLoading && requests.length === 0 ? (
                <div className="empty-state-container"><h3>Loading…</h3></div>
            ) : activeRequests.length === 0 ? (
                <div className="add-post-placeholder" onClick={openPostModal} style={{ minHeight: 220 }}>
                    <div className="placeholder-content">
                        <div className="plus-icon-box"><FaPlus /></div>
                        <p>You have no active issues. Tap to post one.</p>
                    </div>
                </div>
            ) : (
                <div className="marketplace-grid">
                    {activeRequests.map((req) => {
                        const sc = statusColor(req.status);
                        const urgencyClass = req.urgency ? req.urgency.toLowerCase() : 'medium';
                        return (
                            <div key={req.id} className={`post-card-premium card-urgency-${urgencyClass}`}>
                                <div className="card-glass-glow"></div>
                                <div className="post-card-header">
                                    <div className="post-card-badge status-pill">
                                        <span className={`status-dot dot-${sc.className}`}></span>
                                        <span>{sc.label}</span>
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
                                        <span className="category-text">{req.category}</span>
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
                                        <span className="budget-label">{req.agreedPrice != null ? 'Agreed price' : 'Budget estimation'}</span>
                                        <strong className="budget-val">
                                            {req.agreedPrice != null
                                                ? `EGP ${Number(req.agreedPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : req.estimatedBudget
                                                    ? `EGP ${Number(req.estimatedBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : '—'}
                                        </strong>
                                    </div>
                                    <div className="post-action-buttons">
                                        <button className="view-bids-btn btn-view" onClick={() => openViewIssueModal(req)}>Details</button>
                                        {req.status === 'OPEN' && (
                                            <button
                                                className="view-bids-btn btn-bids"
                                                onClick={() => openApplicationsModal(req)}
                                            >
                                                Bids ({req.applicationsCount ?? 0})
                                            </button>
                                        )}
                                        {(req.status === 'EN_ROUTE' || req.status === 'IN_PROGRESS') && (
                                            <button
                                                className="view-bids-btn btn-track"
                                                onClick={() => openTrackingModal(req)}
                                            >
                                                Track
                                            </button>
                                        )}
                                        {req.status === 'AWAITING_CONFIRMATION' && (
                                            <button
                                                className="view-bids-btn btn-confirm"
                                                onClick={() => setConfirmRequest(req)}
                                            >
                                                Confirm
                                            </button>
                                        )}
                                        {req.status === 'OPEN' && (
                                            <button
                                                className="view-bids-btn btn-cancel-trash"
                                                onClick={() => handleCancel(req)}
                                                title="Cancel Request"
                                            >
                                                <FaTrashAlt />
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
    );

    const renderBrowseTab = () => (
        <div className="tab-pane animate-in">
            <div className="browse-controls">
                <div className="search-box-premium">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search maintainers, centers, locations…"
                        value={providerSearch}
                        onChange={(e) => setProviderSearch(e.target.value)}
                    />
                </div>
                <div className="filter-dropdown-premium">
                    <FaFilter className="filter-icon" />
                    <select
                        value={providerCategory}
                        onChange={(e) => setProviderCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {MAINTENANCE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-dropdown-premium">
                    <FaUsers className="filter-icon" />
                    <select
                        value={providerType}
                        onChange={(e) => setProviderType(e.target.value as 'ALL' | 'INDIVIDUAL' | 'CENTER')}
                    >
                        <option value="ALL">Individuals + Centers</option>
                        <option value="INDIVIDUAL">Individuals</option>
                        <option value="CENTER">Centers</option>
                    </select>
                </div>
            </div>

            {providersLoading && providers.length === 0 ? (
                <div className="empty-state-container"><h3>Loading providers…</h3></div>
            ) : providers.length === 0 ? (
                <div className="empty-state-container">
                    <div className="empty-state-icon-box"><FaSearch /></div>
                    <h3>No providers match your filters</h3>
                    <p>Try a different category, type, or clear the search.</p>
                </div>
            ) : (
                <div className="providers-grid">
                    {providers.map((p) => {
                        const fullName = `${p.firstName} ${p.lastName}`.trim();
                        const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.businessName ?? fullName)}&background=6366f1&color=fff&size=200`;
                        return (
                            <ProviderCard
                                key={p.id}
                                id={p.id}
                                name={p.businessName ?? fullName}
                                specialty={p.primaryCategory}
                                rating={p.rating}
                                reviewCount={p.ratingsCount}
                                location={p.companyLocation ?? '—'}
                                priceRange="On request"
                                imageUrl={p.avatarUrl ?? fallback}
                                isVerified
                                completedJobs={p.completedJobsCount}
                                onViewProfile={handleViewProfile}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderActiveTab = () => {
        const list = activeRequests.length === 0 ? completedRequests : [...activeRequests, ...completedRequests];
        return (
            <div className="tab-pane animate-in">
                <div className="tl-section-header">
                    <div>
                        <h2>Track maintenance</h2>
                        <p>All your maintenance requests with live status updates.</p>
                    </div>
                </div>

                {list.length === 0 ? (
                    <div className="empty-state-container">
                        <div className="empty-state-icon-box"><FaTools /></div>
                        <h3>No active requests</h3>
                        <p>You haven't posted any issues yet.</p>
                        <div className="empty-state-actions">
                            <button className="primary-empty-btn" onClick={() => setActiveTab('post')}>Post an Issue</button>
                            <button className="secondary-empty-btn" onClick={() => setActiveTab('browse')}>Browse Providers</button>
                        </div>
                    </div>
                ) : (
                    <div className="active-requests-list">
                        {list.map((req) => {
                            const sc = statusColor(req.status);
                            return (
                                <div key={req.id} className="active-request-row">
                                    <div className={`status-indicator ${sc.className}`}>
                                        {req.status === 'COMPLETED' || req.status === 'RESOLVED_BY_ADMIN' ? <FaCheckCircle /> :
                                            req.status === 'IN_PROGRESS' || req.status === 'EN_ROUTE' ? <FaClock /> :
                                                <FaCalendarCheck />}
                                    </div>

                                    <div className="req-main-info">
                                        <h4>{req.title}</h4>
                                        <p>{req.description}</p>
                                    </div>

                                    <div className="req-provider">
                                        <span className="label">Provider</span>
                                        <span className="value">
                                            {req.provider
                                                ? req.provider.businessName ??
                                                `${req.provider.firstName} ${req.provider.lastName}`.trim()
                                                : 'Awaiting bids'}
                                        </span>
                                    </div>

                                    <div className="req-date">
                                        <span className="label">Posted</span>
                                        <span className="value">{new Date(req.createdAt).toLocaleDateString()}</span>
                                    </div>

                                    <div className="req-status-badge">
                                        <span className={`badge ${sc.className}`}>{sc.label}</span>
                                    </div>

                                    <button
                                        className="req-details-btn"
                                        onClick={() => {
                                            if (req.status === 'OPEN') openApplicationsModal(req);
                                            else if (req.status === 'EN_ROUTE' || req.status === 'IN_PROGRESS') openTrackingModal(req);
                                            else if (req.status === 'AWAITING_CONFIRMATION') setConfirmRequest(req);
                                            else openViewIssueModal(req);
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
        );
    };

    return (
        <div className="tenant-maintenance-hub-wrapper">
            <div className="tenant-maintenance-layout">
                <Sidebar />
                <div className="tenant-maintenance-content">
                    <Header />
                    <main className="maintenance-main-container">
                        <header className="maintenance-hero">
                            <div className="hero-glass-mesh"></div>
                            <div className="hero-text">
                                <span className="pre-title">Home Care & Support</span>
                                <h1>Maintenance Hub</h1>
                                <p>Post issues, hire trusted pros, track every job — all paid via your HOMi wallet.</p>
                            </div>

                            <div className="maintenance-quick-stats">
                                <div className="mini-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaTools className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{activeRequests.length}</span>
                                        <span className="stat-desc">Active issues</span>
                                    </div>
                                </div>
                                <div className="mini-stat accent">
                                    <div className="stat-icon-wrapper">
                                        <FaUsers className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{providers.length}</span>
                                        <span className="stat-desc">Pros nearby</span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {error && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#b91c1c',
                                borderRadius: 12,
                                marginBottom: '1rem',
                            }}>{error}</div>
                        )}

                        <nav className="maintenance-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'post' ? 'active' : ''}`}
                                onClick={() => setActiveTab('post')}
                            >
                                <FaPlus className="tab-icon" />
                                <span>Post an Issue</span>
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
                                onClick={() => setActiveTab('browse')}
                            >
                                <FaSearch className="tab-icon" />
                                <span>Browse Providers</span>
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                                onClick={() => setActiveTab('active')}
                            >
                                <FaTools className="tab-icon" />
                                <span>Active Requests</span>
                            </button>
                        </nav>

                        <div className="tab-content-wrapper">
                            {activeTab === 'post' && renderPostTab()}
                            {activeTab === 'browse' && renderBrowseTab()}
                            {activeTab === 'active' && renderActiveTab()}
                        </div>
                    </main>

                    <DetailedIssueModal
                        isOpen={isIssueModalOpen}
                        onClose={() => setIsIssueModalOpen(false)}
                        onPostSuccess={handlePostSuccess}
                        isViewOnly={isViewOnlyModal}
                        initialData={selectedIssue}
                    />

                    <ProviderProfile
                        isOpen={isProfileModalOpen}
                        onClose={() => setIsProfileModalOpen(false)}
                        provider={selectedProvider}
                    />

                    {appsRequest && (
                        <ApplicationsModal
                            isOpen
                            onClose={() => setAppsRequest(null)}
                            request={appsRequest}
                            onAccepted={(updated) => {
                                setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                                setAppsRequest(null);
                            }}
                        />
                    )}

                    {trackRequest && (
                        <LiveTrackingModal
                            isOpen
                            onClose={() => setTrackRequest(null)}
                            request={trackRequest}
                        />
                    )}

                    {confirmRequest && (
                        <CompletionConfirmModal
                            request={confirmRequest}
                            onResolved={(updated) => {
                                setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                                setConfirmRequest(null);
                            }}
                        />
                    )}

                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default TenantMaintenance;
