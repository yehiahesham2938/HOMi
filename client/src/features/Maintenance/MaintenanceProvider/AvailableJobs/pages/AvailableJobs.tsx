import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../../../components/global/header';
import Footer from '../../../../../components/global/footer';
import MaintenanceSideBar from '../../SideBar/MaintenanceSideBar';
import AvailableJobCard from '../components/AvailableJobCard';
import ApplyJobModal from '../components/ApplyJobModal';
import './AvailableJobs.css';
import {
    FaSearch, FaFilter, FaCompass,
    FaGripHorizontal, FaList, FaBolt, FaBriefcase,
} from 'react-icons/fa';
import maintenanceService, {
    type MaintenanceRequest,
} from '../../../../../services/maintenance.service';
import { MAINTENANCE_CATEGORIES } from '../../../constants/categories';

function urgencyToCard(u: MaintenanceRequest['urgency']): 'Low' | 'Medium' | 'High' | 'Critical' {
    switch (u) {
        case 'LOW': return 'Low';
        case 'MEDIUM': return 'Medium';
        case 'HIGH': return 'High';
        case 'CRITICAL': return 'Critical';
        default: return 'Medium';
    }
}

const AvailableJobs: React.FC = () => {
    const { t } = useTranslation();
    const [jobs, setJobs] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedJob, setSelectedJob] = useState<MaintenanceRequest | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const list = await maintenanceService.listAvailableJobs({
                category: category !== 'All' ? category : undefined,
                search: searchQuery.trim() || undefined,
            });
            setJobs(list);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load jobs.');
        } finally {
            setLoading(false);
        }
    }, [category, searchQuery]);

    useEffect(() => { void load(); }, [load]);

    const totalValue = useMemo(
        () => jobs.reduce((s, j) => s + (Number(j.estimatedBudget ?? 0)), 0),
        [jobs]
    );

    const handleOpenJob = (id: string) => {
        const job = jobs.find((j) => j.id === id);
        if (job) setSelectedJob(job);
    };

    const handleApplied = (updated: MaintenanceRequest) => {
        setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...updated, alreadyApplied: true } : j)));
    };

    return (
        <div className="marketplace-layout">
            <MaintenanceSideBar />

            <div className="marketplace-content">
                <Header />

                <main className="marketplace-main">
                    <header className="marketplace-header">
                        <div className="header-top">
                            <div className="title-group">
                                <div className="live-tag">
                                    <span className="pulse-dot"></span> LIVE MARKETPLACE
                                </div>
                                <h1>Find your next job</h1>
                                <p>Real maintenance requests from the HOMi community. Apply with your final price.</p>
                            </div>

                            <div className="quick-stats-row">
                                <div className="stat-pill">
                                    <FaBriefcase className="pill-icon" />
                                    <span><strong>{jobs.length}</strong> open jobs</span>
                                </div>
                                <div className="stat-pill accent">
                                    <FaBolt className="pill-icon" />
                                    <span><strong>EGP {totalValue.toLocaleString()}</strong> est. value</span>
                                </div>
                            </div>
                        </div>

                        <div className="search-bar-premium">
                            <div className="search-input-group">
                                <input
                                    type="text"
                                    placeholder="Search by category, title, description…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="divider-vertical" />

                            <div className="filter-controls">
                                <div className="filter-dropdown">
                                    <FaFilter className="filter-icon" />
                                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                        <option value="All">All categories</option>
                                        {MAINTENANCE_CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{t('myProperties.maintenanceTypes.' + c, c)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="view-toggle">
                                    <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                                        <FaGripHorizontal />
                                    </button>
                                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                                        <FaList />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {error && (
                        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div className="jobs-container-modern">
                        <div className={`jobs-display-wrapper ${viewMode}`}>
                            {loading ? (
                                <div className="empty-market-state"><h2>Loading jobs…</h2></div>
                            ) : jobs.length > 0 ? (
                                jobs.map((job) => (
                                    <AvailableJobCard
                                        key={job.id}
                                        id={job.id}
                                        issueType={job.category}
                                        description={job.title}
                                        requesterName={job.tenant ? `${job.tenant.firstName} ${job.tenant.lastName}`.trim() : '—'}
                                        propertyLocation={job.property?.address ?? '—'}
                                        price={job.estimatedBudget ?? 'Quote'}
                                        datePublished={new Date(job.createdAt).toLocaleString()}
                                        urgency={urgencyToCard(job.urgency)}
                                        onApply={handleOpenJob}
                                        onViewDetails={handleOpenJob}
                                    />
                                ))
                            ) : (
                                <div className="empty-market-state">
                                    <div className="empty-graphic"><FaCompass className="compass-icon" /></div>
                                    <h2>No jobs available right now</h2>
                                    <p>Try clearing your search or check back in a bit — new jobs are posted all the time.</p>
                                    <button className="clear-filters-btn" onClick={() => { setSearchQuery(''); setCategory('All'); }}>
                                        Clear search
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                <ApplyJobModal
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                    job={selectedJob}
                    onApplied={(updated) => {
                        handleApplied(updated);
                    }}
                />

                <Footer />
            </div>
        </div>
    );
};

export default AvailableJobs;
