import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import IssuePostCard, { statusColor } from '../components/IssuePostCard';
import './TenantMaintenance.css';
import {
    FaPlus, FaSearch, FaFilter, FaTools, FaCalendarCheck,
    FaCheckCircle, FaClock,
    FaChevronRight, FaUsers, FaTrashAlt
} from 'react-icons/fa';
import maintenanceService, {
    type BrowseProvider,
    type MaintenanceRequest,
} from '../../../../services/maintenance.service';
import socketService from '../../../../services/socket.service';
import { MAINTENANCE_CATEGORIES } from '../../constants/categories';



const TenantMaintenance: React.FC = () => {
    const { t } = useTranslation();
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
    const [cancelTarget, setCancelTarget] = useState<MaintenanceRequest | null>(null);

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

    const handleCancel = (req: MaintenanceRequest) => {
        setCancelTarget(req);
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
                    <h2>{t('maintenance.yourMaintenanceIssues')}</h2>
                    <p>{t('maintenance.postNewIssueSubtitle')}</p>
                </div>
                <button className="post-issue-btn" onClick={openPostModal}>
                    <FaPlus /> {t('maintenance.postNewIssueBtn')}
                </button>
            </div>

            {requestsLoading && requests.length === 0 ? (
                <div className="empty-state-container"><h3>{t('maintenance.loading')}</h3></div>
            ) : activeRequests.length === 0 ? (
                <div className="add-post-placeholder" onClick={openPostModal} style={{ minHeight: 220 }}>
                    <div className="placeholder-content">
                        <div className="plus-icon-box"><FaPlus /></div>
                        <p>{t('maintenance.noActiveIssues')}</p>
                    </div>
                </div>
            ) : (
                <div className="marketplace-grid">
                    {activeRequests.map((req) => (
                        <IssuePostCard
                            key={req.id}
                            request={req}
                            role="TENANT"
                            onDetails={openViewIssueModal}
                            onBids={openApplicationsModal}
                            onTrack={openTrackingModal}
                            onConfirm={setConfirmRequest}
                            onCancel={handleCancel}
                        />
                    ))}
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
                        placeholder={t('maintenance.searchPlaceholder')}
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
                        <option value="All">{t('maintenance.allCategories')}</option>
                        {MAINTENANCE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{t('myProperties.maintenanceTypes.' + c, c)}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-dropdown-premium">
                    <FaUsers className="filter-icon" />
                    <select
                        value={providerType}
                        onChange={(e) => setProviderType(e.target.value as 'ALL' | 'INDIVIDUAL' | 'CENTER')}
                    >
                        <option value="ALL">{t('maintenance.allTypes')}</option>
                        <option value="INDIVIDUAL">{t('maintenance.individuals')}</option>
                        <option value="CENTER">{t('maintenance.centers')}</option>
                    </select>
                </div>
            </div>

            {providersLoading && providers.length === 0 ? (
                <div className="empty-state-container"><h3>{t('maintenance.loadingProviders')}</h3></div>
            ) : providers.length === 0 ? (
                <div className="empty-state-container">
                    <div className="empty-state-icon-box"><FaSearch /></div>
                    <h3>{t('maintenance.noProvidersFound')}</h3>
                    <p>{t('maintenance.noProvidersSub')}</p>
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
                                priceRange={t('maintenance.onRequest')}
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
                        <h2>{t('maintenance.trackMaintenance')}</h2>
                        <p>{t('maintenance.trackSubtitle')}</p>
                    </div>
                </div>

                {list.length === 0 ? (
                    <div className="empty-state-container">
                        <div className="empty-state-icon-box"><FaTools /></div>
                        <h3>{t('maintenance.noActiveRequests')}</h3>
                        <p>{t('maintenance.noRequestsSub')}</p>
                        <div className="empty-state-actions">
                            <button className="primary-empty-btn" onClick={() => setActiveTab('post')}>{t('maintenance.postAnIssue')}</button>
                            <button className="secondary-empty-btn" onClick={() => setActiveTab('browse')}>{t('maintenance.browseProviders')}</button>
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
                                        <span className="label">{t('maintenance.provider')}</span>
                                        <span className="value">
                                            {req.provider
                                                ? req.provider.businessName ??
                                                `${req.provider.firstName} ${req.provider.lastName}`.trim()
                                                : t('maintenance.awaitingBids')}
                                        </span>
                                    </div>

                                    <div className="req-date">
                                        <span className="label">{t('maintenance.posted')}</span>
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
                                <span className="pre-title">{t('maintenance.heroPreTitle')}</span>
                                <h1>{t('maintenance.heroTitle')}</h1>
                                <p>{t('maintenance.heroSubtitle')}</p>
                            </div>

                            <div className="maintenance-quick-stats">
                                <div className="mini-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaTools className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{activeRequests.length}</span>
                                        <span className="stat-desc">{t('maintenance.activeIssues')}</span>
                                    </div>
                                </div>
                                <div className="mini-stat accent">
                                    <div className="stat-icon-wrapper">
                                        <FaUsers className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{providers.length}</span>
                                        <span className="stat-desc">{t('maintenance.prosNearby')}</span>
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
                                <span>{t('maintenance.postAnIssue')}</span>
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
                                onClick={() => setActiveTab('browse')}
                            >
                                <FaSearch className="tab-icon" />
                                <span>{t('maintenance.browseProviders')}</span>
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                                onClick={() => setActiveTab('active')}
                            >
                                <FaTools className="tab-icon" />
                                <span>{t('maintenance.activeRequests')}</span>
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

                    {cancelTarget && (
                        <div className="custom-confirm-modal-overlay" onClick={() => setCancelTarget(null)}>
                            <div className="custom-confirm-modal-card animate-in" onClick={(e) => e.stopPropagation()}>
                                <div className="custom-confirm-modal-icon-box">
                                    <FaTrashAlt className="custom-confirm-modal-icon" />
                                </div>
                                <h3>{t('maintenance.cancelRequestTitle')}</h3>
                                <p>{t('maintenance.cancelRequestConfirm', { title: cancelTarget.title })}</p>
                                <div className="custom-confirm-modal-actions">
                                    <button 
                                        className="custom-confirm-btn btn-cancel" 
                                        onClick={() => setCancelTarget(null)}
                                    >
                                        {t('maintenance.keepIt')}
                                    </button>
                                    <button 
                                        className="custom-confirm-btn btn-confirm-delete" 
                                        onClick={async () => {
                                            const req = cancelTarget;
                                            setCancelTarget(null);
                                            try {
                                                const updated = await maintenanceService.cancelTenantRequest(req.id);
                                                setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                                            } catch (err: any) {
                                                setError(err?.response?.data?.message ?? 'Could not cancel.');
                                            }
                                        }}
                                    >
                                        {t('maintenance.yesCancel')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default TenantMaintenance;
