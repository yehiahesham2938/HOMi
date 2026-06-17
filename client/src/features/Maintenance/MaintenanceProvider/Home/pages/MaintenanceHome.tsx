import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Header from '../../../../../components/global/header';
import Footer from '../../../../../components/global/footer';
import MaintenanceSideBar from '../../SideBar/MaintenanceSideBar';
import {
    FaTools, FaCheckCircle, FaDollarSign, FaSearch,
    FaMapMarkerAlt, FaWrench, FaChevronRight,
    FaBell, FaStar, FaStarHalfAlt, FaUser, FaShieldAlt, FaBriefcase
} from 'react-icons/fa';
import './MaintenanceHome.css';
import maintenanceService, {
    type MaintenanceRequest,
    type ProviderEarnings,
} from '../../../../../services/maintenance.service';
import notificationService, { type NotificationItem } from '../../../../../services/notification.service';
import authService from '../../../../../services/auth.service';

function timeAgo(iso: string): string {
    const d = new Date(iso).getTime();
    const ms = Date.now() - d;
    const m = Math.floor(ms / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const MaintenanceHome: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const cached = authService.getCurrentUser?.();
    const firstName = cached?.user?.firstName ?? 'there';
    const avatarUrl = cached?.profile?.avatarUrl;

    const [available, setAvailable] = useState<MaintenanceRequest[]>([]);
    const [activeJobs, setActiveJobs] = useState<MaintenanceRequest[]>([]);
    const [earnings, setEarnings] = useState<ProviderEarnings | null>(null);
    const [notifs, setNotifs] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const [avail, mine, earn, notifList] = await Promise.all([
                    maintenanceService.listAvailableJobs(),
                    maintenanceService.listProviderRequests(['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_CONFIRMATION']),
                    maintenanceService.getProviderEarnings(),
                    notificationService.list({ limit: 6 }).then((p) => p.notifications).catch(() => [] as NotificationItem[]),
                ]);
                if (cancelled) return;
                setAvailable(avail);
                setActiveJobs(mine);
                setEarnings(earn);
                setNotifs(notifList);
            } catch {
                /* noop */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const renderRating = () => {
        const score = earnings?.avgRating ?? 0;
        const count = earnings?.completedJobs ?? 0;
        const stars: React.ReactNode[] = [];
        const full = Math.floor(score);
        const hasHalf = score - full >= 0.5;
        for (let i = 0; i < 5; i++) {
            if (i < full) stars.push(<FaStar key={i} className="star-filled" />);
            else if (i === full && hasHalf) stars.push(<FaStarHalfAlt key={i} className="star-filled" />);
            else stars.push(<FaStar key={i} className="star-empty" />);
        }
        return { score, count, stars };
    };

    const ratingData = renderRating();

    return (
        <div className="maintenance-home-layout">
            <MaintenanceSideBar />

            <div className="maintenance-main-content">
                <Header />

                <div className="maintenance-content-scroll">
                    <div className="maintenance-dashboard-container">
                        <header className="welcome-section">
                            <div className="welcome-profile-orb">
                                <div className="welcome-avatar-wrapper">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="welcome-avatar" />
                                    ) : (
                                        <div className="welcome-avatar-fallback-container">
                                            <FaUser size={30} className="welcome-avatar-fallback-fa" />
                                        </div>
                                    )}
                                    <div className="welcome-badge">
                                        <FaShieldAlt size={12} />
                                        <span>{t('maintenanceHome.specialist', 'Pro Specialist')}</span>
                                    </div>
                                </div>
                                <div className="welcome-text">
                                    <h1>Welcome back, <span className="highlight">{firstName}</span></h1>
                                    <p>{loading ? 'Fetching your dashboard…' : `${available.length} open jobs nearby — let's get you booked.`}</p>
                                </div>
                            </div>

                            <div className="welcome-quick-actions">
                                <div className="actions-title">{t('maintenanceHome.quickActions', 'Quick Actions')}</div>
                                <div className="welcome-actions-container">
                                    <button className="welcome-quick-btn" onClick={() => navigate('/available-jobs')}>
                                        <FaSearch size={16} />
                                        <span>{t('maintenanceHome.availableJobs', 'Available Jobs')}</span>
                                    </button>
                                    <button className="welcome-quick-btn" onClick={() => navigate('/my-jobs')}>
                                        <FaBriefcase size={16} />
                                        <span>{t('maintenanceHome.myJobs', 'My Jobs')}</span>
                                    </button>
                                    <button className="welcome-quick-btn" onClick={() => navigate('/maintenance-earnings')}>
                                        <FaDollarSign size={16} />
                                        <span>{t('maintenanceHome.wallet', 'Earnings Wallet')}</span>
                                    </button>
                                </div>
                            </div>
                        </header>

                        <section className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon blue"><FaSearch /></div>
                                <div className="stat-info">
                                    <h3 className="stat-value">{available.length}</h3>
                                    <p className="stat-label">Available jobs</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon yellow"><FaWrench /></div>
                                <div className="stat-info">
                                    <h3 className="stat-value">{earnings?.activeJobs ?? activeJobs.length}</h3>
                                    <p className="stat-label">Active jobs</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon green"><FaCheckCircle /></div>
                                <div className="stat-info">
                                    <h3 className="stat-value">{earnings?.completedJobs ?? 0}</h3>
                                    <p className="stat-label">Completed</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon purple"><FaDollarSign /></div>
                                <div className="stat-info">
                                    <h3 className="stat-value">EGP {(earnings?.walletBalance ?? 0).toLocaleString()}</h3>
                                    <p className="stat-label">Wallet balance</p>
                                </div>
                            </div>
                        </section>

                        <div className="dashboard-main-grid">
                            <div className="grid-left">
                                <div className="section-card">
                                    <div className="section-header">
                                        <h2>New job opportunities</h2>
                                        <button className="view-all-btn" onClick={() => navigate('/available-jobs')}>
                                            View all jobs <FaChevronRight />
                                        </button>
                                    </div>

                                    <div className="job-list">
                                        {available.length > 0 ? (
                                            available.slice(0, 3).map((job) => (
                                                <div className="job-item" key={job.id} onClick={() => navigate('/available-jobs')}>
                                                    <div className="job-details">
                                                        <div className="job-icon"><FaTools /></div>
                                                        <div className="job-info">
                                                            <h4>{job.title}</h4>
                                                            <div className="job-meta">
                                                                <span><FaMapMarkerAlt /> {job.property?.address ?? '—'}</span>
                                                                <span>{t('myProperties.maintenanceTypes.' + job.category, job.category)}</span>
                                                                <span>{timeAgo(job.createdAt)}</span>
                                                                {job.urgency === 'CRITICAL' && (
                                                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>Critical</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="job-action">
                                                        <span className="price">EGP {Number(job.estimatedBudget ?? 0).toLocaleString() || 'Quote'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-state-card-mini">
                                                <div className="empty-icon"><FaSearch /></div>
                                                <p>No new requests available right now</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="Active-jobs-section-card">
                                    <div className="section-header">
                                        <h2>Active jobs</h2>
                                        <button className="view-all-btn" onClick={() => navigate('/my-jobs')}>
                                            Open all <FaChevronRight />
                                        </button>
                                    </div>

                                    <div className="job-list">
                                        {activeJobs.length > 0 ? (
                                            activeJobs.slice(0, 4).map((job) => (
                                                <div className="job-item" key={job.id} onClick={() => navigate('/my-jobs')}>
                                                    <div className="job-details">
                                                        <div className="job-icon"><FaWrench /></div>
                                                        <div className="job-info">
                                                            <h4>{job.title}</h4>
                                                            <div className="job-meta">
                                                                <span><FaMapMarkerAlt /> {job.property?.address ?? '—'}</span>
                                                                <span>{t('myProperties.maintenanceTypes.' + job.category, job.category)}</span>
                                                                <span>{job.tenant ? `${job.tenant.firstName} ${job.tenant.lastName}` : ''}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="job-action">
                                                        <span className={`status-badge ${job.status === 'IN_PROGRESS' ? 'in-progress' : 'scheduled'}`}>
                                                            {job.status.replace('_', ' ')}
                                                        </span>
                                                        <span className="price" style={{ marginLeft: '10px' }}>
                                                            EGP {Number(job.agreedPrice ?? 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-state-card-mini">
                                                <div className="empty-icon"><FaTools /></div>
                                                <p>No active jobs at the moment</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid-right">
                                <div className="notif-premium">
                                    <header className="notif-header">
                                        <div className="notif-title-group">
                                            <div className="bell-ring">
                                                <FaBell />
                                                <span className="active-dot"></span>
                                            </div>
                                            <h3>Activity feed</h3>
                                        </div>
                                    </header>

                                    <div className="notif-scroll-area">
                                        {notifs.length > 0 ? (
                                            notifs.map((n) => (
                                                <div key={n.id} className={`notif-card ${n.isRead ? '' : 'is-unread'}`}>
                                                    <div className="icon-orb system">
                                                        <FaBell />
                                                    </div>
                                                    <div className="notif-body">
                                                        <div className="notif-meta">
                                                            <span className="notif-subject">{n.title}</span>
                                                            <span className="notif-timestamp">{timeAgo(n.createdAt)}</span>
                                                        </div>
                                                        <p className="notif-text">{n.body}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-state-feed">
                                                <div className="empty-feed-icon"><FaBell /></div>
                                                <p>You're all caught up</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rating-premium-card">
                                    <div className="rating-header">
                                        <h3>Your rating</h3>
                                    </div>
                                    <div className="rating-body">
                                        <div className="rating-big-score">
                                            <span>{ratingData.score.toFixed(1)}</span>
                                            <span className="rating-max">/ 5</span>
                                        </div>
                                        <div className="rating-stars">{ratingData.stars}</div>
                                        <p className="rating-text">
                                            {ratingData.count > 0
                                                ? `Based on ${ratingData.count} completed jobs`
                                                : 'No reviews yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default MaintenanceHome;
