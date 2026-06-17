import './MaintenanceStatus.css';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaTools, FaChevronRight, FaWrench, FaCheckCircle, FaClock, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import maintenanceService, { type MaintenanceRequest } from '../../../services/maintenance.service';
import type { LandlordContract } from '../../../services/contract.service';

const STATUS_CONFIG: Record<string, { className: string; icon: React.ReactNode }> = {
    OPEN:                   { className: 'open',      icon: <FaClock /> },
    ASSIGNED:               { className: 'assigned',  icon: <FaClock /> },
    EN_ROUTE:               { className: 'en-route',  icon: <FaClock /> },
    IN_PROGRESS:            { className: 'progress',  icon: <FaWrench /> },
    AWAITING_CONFIRMATION:  { className: 'awaiting',  icon: <FaExclamationCircle /> },
    COMPLETED:              { className: 'completed', icon: <FaCheckCircle /> },
    DISPUTED:               { className: 'disputed',  icon: <FaExclamationCircle /> },
    RESOLVED_BY_ADMIN:      { className: 'completed', icon: <FaCheckCircle /> },
    CANCELLED:              { className: 'cancelled', icon: <FaTimesCircle /> },
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
    const { t } = useTranslation();
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

    const steps = ["posted", "scheduled", "inProgress", "completed"];

    const getProviderName = (req: MaintenanceRequest): string => {
        if (!req.provider) return t('activeRental.awaitingVendor');
        return req.provider.businessName || `${req.provider.firstName} ${req.provider.lastName}`.trim();
    };

    const getStatusLabel = (status: string): string => {
        const keyMap: Record<string, string> = {
            OPEN: 'open',
            ASSIGNED: 'scheduled',
            EN_ROUTE: 'onTheWay',
            IN_PROGRESS: 'inProgress',
            AWAITING_CONFIRMATION: 'awaitingConfirm',
            COMPLETED: 'completed',
            DISPUTED: 'disputed',
            RESOLVED_BY_ADMIN: 'resolved',
            CANCELLED: 'cancelled',
        };
        const key = keyMap[status] || 'open';
        return t(`activeRental.${key}`);
    };

    return (
        <div className="mstatus-card" dir="ltr">
            <div className="mstatus-header">
                <div className="mstatus-title-area">
                    <div className="mstatus-icon-ring">
                        <FaTools />
                    </div>
                    <div>
                        <h3>{t('activeRental.maintenanceIssues')}</h3>
                        <span className="mstatus-subtitle">
                            {loading 
                                ? t('activeRental.loadingActiveRentals') 
                                : activeRequests.length === 1
                                    ? t('activeRental.activeIssuesCount', { count: 1 })
                                    : t('activeRental.activeIssuesCountPlural', { count: activeRequests.length })}
                        </span>
                    </div>
                </div>
                <button className="mstatus-view-all-btn" onClick={() => navigate('/tenant-maintenance?tab=active')}>
                    {t('activeRental.viewAll')} <FaChevronRight />
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
                        <p>{t('activeRental.maintenanceFeedClear')}</p>
                        <button className="mstatus-post-btn-wrap" onClick={() => navigate('/tenant-maintenance?tab=post')}>
                            {t('activeRental.reportRepair')}
                        </button>
                    </div>
                ) : (
                    <div className="mstatus-list">
                        {recentRequests.map(req => {
                            const sc = STATUS_CONFIG[req.status] ?? { className: 'open', icon: <FaClock /> };
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
                                            {sc.icon} {getStatusLabel(req.status)}
                                        </span>
                                    </div>

                                    <p className="timeline-provider-text">
                                        {t('activeRental.vendor')}<strong>{getProviderName(req)}</strong>
                                    </p>

                                    <div className="timeline-progress-track">
                                        {steps.map((stepKey, idx) => {
                                            const stepNum = idx + 1;
                                            const isCompleted = stepNum < activeStep || (activeStep === 4);
                                            const isActive = stepNum === activeStep && activeStep !== 4;
                                            return (
                                                <div
                                                    className={`track-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                                                    key={stepKey}
                                                >
                                                    <div className="step-dot" />
                                                    <span className="step-label">{t(`activeRental.${stepKey}`)}</span>
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