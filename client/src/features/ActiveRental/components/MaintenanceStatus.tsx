import './MaintenanceStatus.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTools, FaChevronRight, FaWrench, FaCheckCircle, FaClock, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import maintenanceService, { type MaintenanceRequest } from '../../../services/maintenance.service';
import type { LandlordContract } from '../../../services/contract.service';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    OPEN:                   { label: 'Open',               className: 'open',      icon: <FaClock /> },
    ASSIGNED:               { label: 'Scheduled',          className: 'assigned',  icon: <FaClock /> },
    EN_ROUTE:               { label: 'On the way',         className: 'en-route',  icon: <FaClock /> },
    IN_PROGRESS:            { label: 'In Progress',        className: 'progress',  icon: <FaWrench /> },
    AWAITING_CONFIRMATION:  { label: 'Awaiting Confirm',   className: 'awaiting',  icon: <FaExclamationCircle /> },
    COMPLETED:              { label: 'Completed',          className: 'completed', icon: <FaCheckCircle /> },
    DISPUTED:               { label: 'Disputed',           className: 'disputed',  icon: <FaExclamationCircle /> },
    RESOLVED_BY_ADMIN:      { label: 'Resolved',           className: 'completed', icon: <FaCheckCircle /> },
    CANCELLED:              { label: 'Cancelled',          className: 'cancelled', icon: <FaTimesCircle /> },
};

const getProviderName = (req: MaintenanceRequest): string => {
    if (!req.provider) return 'Awaiting bids';
    return req.provider.businessName || `${req.provider.firstName} ${req.provider.lastName}`.trim();
};

const MaintenanceStatus = ({ contract }: { contract: LandlordContract | null }) => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await maintenanceService.listTenantRequests();
                setRequests(data);
            } catch {
                // silently fail on dashboard
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const activeRequests = requests.filter(
        r => !['COMPLETED', 'CANCELLED', 'RESOLVED_BY_ADMIN'].includes(r.status)
    );
    const recentRequests = requests.slice(0, 3);

    return (
        <div className="mstatus-card">
            <div className="mstatus-header">
                <div className="mstatus-title-area">
                    <div className="mstatus-icon-ring">
                        <FaTools />
                    </div>
                    <div>
                        <h3>Maintenance</h3>
                        <span className="mstatus-subtitle">
                            {loading ? 'Loading...' : `${activeRequests.length} active issue${activeRequests.length !== 1 ? 's' : ''}`}
                        </span>
                    </div>
                </div>
                <button className="mstatus-view-all-btn" onClick={() => navigate('/tenant-maintenance?tab=active')}>
                    View all <FaChevronRight />
                </button>
            </div>

            <div className="mstatus-body">
                {loading ? (
                    <div className="mstatus-loading">
                        <div className="mstatus-skeleton" />
                        <div className="mstatus-skeleton" />
                    </div>
                ) : recentRequests.length === 0 ? (
                    <div className="mstatus-empty">
                        <div className="mstatus-empty-icon"><FaTools /></div>
                        <p>No maintenance requests yet.</p>
                        <div className="mstatus-post-btn-wrap" onClick={() => navigate('/tenant-maintenance?tab=post')}>
                            Post an Issue
                        </div>
                    </div>
                ) : (
                    <div className="mstatus-list">
                        {recentRequests.map(req => {
                            const sc = STATUS_CONFIG[req.status] ?? { label: req.status, className: 'open', icon: <FaClock /> };
                            return (
                                <div
                                    key={req.id}
                                    className="mstatus-row"
                                    onClick={() => navigate('/tenant-maintenance?tab=active')}
                                >
                                    <div className={`mstatus-dot-col ${sc.className}`}>
                                        {sc.icon}
                                    </div>
                                    <div className="mstatus-info">
                                        <span className="mstatus-issue-title">{req.title}</span>
                                        <span className="mstatus-provider">
                                            {getProviderName(req)} &bull; {req.category}
                                        </span>
                                    </div>
                                    <div className={`mstatus-badge ${sc.className}`}>
                                        {sc.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaintenanceStatus;