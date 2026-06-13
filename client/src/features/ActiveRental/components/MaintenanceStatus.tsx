import './MaintenanceStatus.css';
import { useState, useEffect, useMemo } from 'react';
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
    if (!req.provider) return 'Awaiting vendor matching';
    return req.provider.businessName || `${req.provider.firstName} ${req.provider.lastName}`.trim();
};

const getActiveStep = (status: string): number => {
    if (['OPEN'].includes(status)) return 1;
    if (['ASSIGNED', 'EN_ROUTE'].includes(status)) return 2;
    if (['IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED'].includes(status)) return 3;
    if (['COMPLETED', 'RESOLVED_BY_ADMIN'].includes(status)) return 4;
    return 1;
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

    const propertyId = contract?.property?.id;
    const filteredRequests = useMemo(() => {
        if (!propertyId) return requests;
        return requests.filter(r => r.propertyId === propertyId);
    }, [requests, propertyId]);

    const activeRequests = useMemo(() => {
        return filteredRequests.filter(
            r => !['COMPLETED', 'CANCELLED', 'RESOLVED_BY_ADMIN'].includes(r.status)
        );
    }, [filteredRequests]);

    const recentRequests = useMemo(() => {
        return filteredRequests.slice(0, 2); // limit to 2 for cleaner layout with timeline spacing
    }, [filteredRequests]);

    const steps = ["Posted", "Scheduled", "In Progress", "Completed"];

    return (
        <div className="mstatus-card">
            <div className="mstatus-header">
                <div className="mstatus-title-area">
                    <div className="mstatus-icon-ring">
                        <FaTools />
                    </div>
                    <div>
                        <h3>Maintenance Issues</h3>
                        <span className="mstatus-subtitle">
                            {loading ? 'Loading...' : `${activeRequests.length} active issue${activeRequests.length !== 1 ? 's' : ''}`}
                        </span>
                    </div>
                </div>
                <button className="mstatus-view-all-btn" onClick={() => navigate('/tenant-maintenance?tab=active')}>
                    View All <FaChevronRight />
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
                        <p>Your property maintenance feed is clear.</p>
                        <button className="mstatus-post-btn-wrap" onClick={() => navigate('/tenant-maintenance?tab=post')}>
                            Report Repair
                        </button>
                    </div>
                ) : (
                    <div className="mstatus-list">
                        {recentRequests.map(req => {
                            const sc = STATUS_CONFIG[req.status] ?? { label: req.status, className: 'open', icon: <FaClock /> };
                            const activeStep = getActiveStep(req.status);
                            return (
                                <div
                                    key={req.id}
                                    className="maintenance-timeline-box"
                                    onClick={() => navigate('/tenant-maintenance?tab=active')}
                                >
                                    <div className="timeline-header">
                                        <div className="timeline-title-group">
                                            <span className={`timeline-category-badge category-${req.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                                {req.category}
                                            </span>
                                            <h4>{req.title}</h4>
                                        </div>
                                        <span className={`mstatus-badge ${sc.className}`}>
                                            {sc.icon} {sc.label}
                                        </span>
                                    </div>

                                    <p className="timeline-provider-text">
                                        Vendor: <strong>{getProviderName(req)}</strong>
                                    </p>

                                    <div className="timeline-progress-track">
                                        {steps.map((step, idx) => {
                                            const stepNum = idx + 1;
                                            const isCompleted = stepNum < activeStep || (activeStep === 4);
                                            const isActive = stepNum === activeStep && activeStep !== 4;
                                            return (
                                                <div
                                                    className={`track-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                                                    key={step}
                                                >
                                                    <div className="step-dot" />
                                                    <span className="step-label">{step}</span>
                                                </div>
                                            );
                                        })}
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