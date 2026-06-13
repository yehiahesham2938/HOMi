import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../../../components/global/header';
import Footer from '../../../../../components/global/footer';
import MaintenanceSideBar from '../../SideBar/MaintenanceSideBar';
import ProviderJobModal from '../components/ProviderJobModal';
import './MyJobs.css';
import {
    FaMapMarkerAlt, FaUser, FaTools, FaSpinner, FaCheckCircle,
    FaCar, FaHourglassHalf, FaTimesCircle, FaExclamationTriangle,
} from 'react-icons/fa';
import maintenanceService, {
    type MaintenanceRequest,
    type MaintenanceRequestStatus,
} from '../../../../../services/maintenance.service';
import socketService from '../../../../../services/socket.service';

type TabId = 'all' | 'active' | 'awaiting' | 'completed' | 'disputed' | 'cancelled';

const TABS: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'awaiting', label: 'Awaiting confirmation' },
    { id: 'completed', label: 'Completed' },
    { id: 'disputed', label: 'Disputed' },
    { id: 'cancelled', label: 'Cancelled' },
];

function statusInTab(status: MaintenanceRequestStatus, tab: TabId): boolean {
    switch (tab) {
        case 'all': return true;
        case 'active': return ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS'].includes(status);
        case 'awaiting': return status === 'AWAITING_CONFIRMATION';
        case 'completed': return ['COMPLETED', 'RESOLVED_BY_ADMIN'].includes(status);
        case 'disputed': return status === 'DISPUTED';
        case 'cancelled': return status === 'CANCELLED';
        default: return true;
    }
}

function statusInfo(status: MaintenanceRequestStatus): { label: string; cls: string; icon: React.ReactNode } {
    switch (status) {
        case 'ASSIGNED':
            return { label: 'Scheduled', cls: 'status-assigned', icon: <FaHourglassHalf /> };
        case 'EN_ROUTE':
            return { label: 'En route', cls: 'status-en-route', icon: <FaCar /> };
        case 'IN_PROGRESS':
            return { label: 'In progress', cls: 'status-in-progress', icon: <FaSpinner className="spin-icon" /> };
        case 'AWAITING_CONFIRMATION':
            return { label: 'Awaiting tenant', cls: 'status-awaiting', icon: <FaHourglassHalf /> };
        case 'COMPLETED':
        case 'RESOLVED_BY_ADMIN':
            return { label: status === 'RESOLVED_BY_ADMIN' ? 'Resolved by admin' : 'Completed', cls: 'status-completed', icon: <FaCheckCircle /> };
        case 'DISPUTED':
            return { label: 'Disputed', cls: 'status-disputed', icon: <FaExclamationTriangle /> };
        case 'CANCELLED':
            return { label: 'Cancelled', cls: 'status-cancelled', icon: <FaTimesCircle /> };
        case 'OPEN':
            return { label: 'Open', cls: 'status-open', icon: <FaSpinner /> };
        default:
            return { label: status, cls: '', icon: null };
    }
}

const MyJobs: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabId>('all');
    const [jobs, setJobs] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<MaintenanceRequest | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const list = await maintenanceService.listProviderRequests();
            setJobs(list);
            setSelectedJob((cur) => (cur ? list.find((j) => j.id === cur.id) ?? cur : cur));
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load your jobs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        socketService.connect();
        const onStatus = () => { void load(); };
        socketService.onMaintenanceStatus(onStatus);
        return () => { socketService.offMaintenanceStatus(onStatus); };
    }, [load]);

    const filteredJobs = useMemo(
        () => jobs.filter((j) => statusInTab(j.status, activeTab)),
        [jobs, activeTab]
    );

    const summary = useMemo(() => {
        return {
            scheduled: jobs.filter((j) => j.status === 'ASSIGNED').length,
            active: jobs.filter((j) => ['EN_ROUTE', 'IN_PROGRESS'].includes(j.status)).length,
            awaiting: jobs.filter((j) => j.status === 'AWAITING_CONFIRMATION').length,
            disputed: jobs.filter((j) => j.status === 'DISPUTED').length,
        };
    }, [jobs]);

    return (
        <div className="my-jobs-page-wrapper">
            <MaintenanceSideBar />

            <div className="my-jobs-content-area">
                <Header />

                <main className="my-jobs-main">
                    <div className="my-jobs-header">
                        <div className="header-text">
                            <h1>My assigned jobs</h1>
                            <p>Manage your current workload and review history.</p>
                        </div>

                        <div className="jobs-summary-pills">
                            <div className="summary-pill blue">
                                <span className="pill-count">{summary.scheduled}</span>
                                <span className="pill-label">Scheduled</span>
                            </div>
                            <div className="summary-pill yellow">
                                <span className="pill-count">{summary.active}</span>
                                <span className="pill-label">Active</span>
                            </div>
                            <div className="summary-pill blue">
                                <span className="pill-count">{summary.awaiting}</span>
                                <span className="pill-label">Awaiting</span>
                            </div>
                            {summary.disputed > 0 && (
                                <div className="summary-pill" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                                    <span className="pill-count">{summary.disputed}</span>
                                    <span className="pill-label">Disputed</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, margin: '0 0 1rem' }}>
                            {error}
                        </div>
                    )}

                    <div className="tabs-container">
                        <div className="tabs-list">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`tab-trigger ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                    <span className="tab-count">
                                        {tab.id === 'all' ? jobs.length : jobs.filter((j) => statusInTab(j.status, tab.id)).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="my-jobs-grid">
                        {loading ? (
                            <div className="empty-jobs-state"><h3>Loading…</h3></div>
                        ) : filteredJobs.length > 0 ? (
                            filteredJobs.map((j) => {
                                const info = statusInfo(j.status);
                                return (
                                    <div
                                        key={j.id}
                                        className={`mj-card ${info.cls}`}
                                        onClick={() => setSelectedJob(j)}
                                    >
                                        <div className="mj-card-header">
                                            <span className="mj-cat"><FaTools /> {t('myProperties.maintenanceTypes.' + j.category, j.category)}</span>
                                            <span className={`mj-status ${info.cls}`}>{info.icon} {info.label}</span>
                                        </div>
                                        <h4 className="mj-title">{j.title}</h4>
                                        <p className="mj-desc">{j.description}</p>
                                        <div className="mj-meta">
                                            <div><FaUser /> {j.tenant ? `${j.tenant.firstName} ${j.tenant.lastName}` : '—'}</div>
                                            <div><FaMapMarkerAlt /> {j.property?.address ?? '—'}</div>
                                        </div>
                                        <div className="mj-footer">
                                            <div className="mj-price">EGP {Number(j.agreedPrice ?? 0).toFixed(2)}</div>
                                            <button className="mj-details-btn" onClick={(e) => { e.stopPropagation(); setSelectedJob(j); }}>
                                                Open
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-jobs-state">
                                <div className="empty-jobs-icon">📁</div>
                                <h3>No jobs in this view</h3>
                                <p>
                                    {jobs.length === 0
                                        ? "You haven't been assigned to any jobs yet. Browse the marketplace to apply."
                                        : `You don't have any "${TABS.find((t) => t.id === activeTab)?.label}" jobs.`}
                                </p>
                                {jobs.length === 0 && (
                                    <button className="empty-state-action-btn" onClick={() => window.location.href = '/available-jobs'}>
                                        Browse Marketplace
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                <ProviderJobModal
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                    job={selectedJob}
                    onUpdated={(updated) => {
                        setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
                        setSelectedJob(updated);
                    }}
                />

                <Footer />
            </div>
        </div>
    );
};

export default MyJobs;
