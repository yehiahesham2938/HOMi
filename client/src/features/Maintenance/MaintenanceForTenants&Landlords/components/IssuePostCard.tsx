import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaClock, FaBolt, FaTrashAlt,
    FaTint, FaSnowflake, FaLeaf, FaHammer, FaWrench, FaUsers, FaShieldAlt
} from 'react-icons/fa';
import { type MaintenanceRequest } from '../../../../services/maintenance.service';
import './IssuePostCard.css';

export interface IssuePostCardProps {
    request: MaintenanceRequest;
    role: 'TENANT' | 'LANDLORD';
    onDetails: (req: MaintenanceRequest) => void;
    onBids?: (req: MaintenanceRequest) => void;
    onTrack?: (req: MaintenanceRequest) => void;
    onConfirm?: (req: MaintenanceRequest) => void;
    onCancel?: (req: MaintenanceRequest) => void;
}

export function statusColor(status: MaintenanceRequest['status']) {
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

const IssuePostCard: React.FC<IssuePostCardProps> = ({
    request,
    role,
    onDetails,
    onBids,
    onTrack,
    onConfirm,
    onCancel
}) => {
    const { t } = useTranslation();
    const sc = statusColor(request.status);
    const urgencyClass = request.urgency ? request.urgency.toLowerCase() : 'medium';

    return (
        <div className={`post-card-premium card-urgency-${urgencyClass}`}>
            <div className="card-glass-glow"></div>
            <div className="post-card-header">
                <div className="post-card-badge status-pill">
                    <span className={`status-dot dot-${sc.className}`}></span>
                    <span>{sc.label}</span>
                </div>
                {request.urgency && (
                    <div className={`urgency-pill urgency-${urgencyClass}`}>
                        {request.urgency}
                    </div>
                )}
            </div>
            <div className="post-card-content">
                <div className="post-card-type">
                    <div className={`type-icon-wrapper bg-${urgencyClass}`}>
                        {getCategoryIcon(request.category)}
                    </div>
                    <span className="category-text">{t('myProperties.maintenanceTypes.' + request.category, request.category)}</span>
                </div>
                <h3 className="post-title-text">{request.title}</h3>
                <p className="post-description">{request.description}</p>
                <div className="post-meta">
                    <div className="meta-item flex-row-center">
                        <FaClock className="meta-icon" />
                        <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-item flex-row-center">
                        <FaBolt className="meta-icon animated-pulse" />
                        <span>{request.applicationsCount ?? 0} applications</span>
                    </div>
                </div>
            </div>
            <div className="post-card-footer">
                <div className="budget-info">
                    <span className="budget-label">
                        {role === 'TENANT'
                            ? (request.agreedPrice != null ? 'Agreed price' : 'Budget estimation')
                            : (request.chargeParty === 'LANDLORD' ? 'You pay (Landlord)' : 'Tenant pays')}
                    </span>
                    <strong className="budget-val">
                        {request.agreedPrice != null
                            ? `EGP ${Number(request.agreedPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : request.estimatedBudget
                                ? `EGP ${Number(request.estimatedBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '—'}
                    </strong>
                </div>
                <div className="post-action-buttons">
                    <button className="view-bids-btn btn-view" onClick={() => onDetails(request)}>Details</button>
                    {request.status === 'OPEN' && onBids && (
                        <button
                            className="view-bids-btn btn-bids"
                            onClick={() => onBids(request)}
                        >
                            Bids ({request.applicationsCount ?? 0})
                        </button>
                    )}
                    {(request.status === 'EN_ROUTE' || request.status === 'IN_PROGRESS') && onTrack && (
                        <button
                            className="view-bids-btn btn-track"
                            onClick={() => onTrack(request)}
                        >
                            Track
                        </button>
                    )}
                    {request.status === 'AWAITING_CONFIRMATION' && onConfirm && (
                        <button
                            className="view-bids-btn btn-confirm"
                            onClick={() => onConfirm(request)}
                        >
                            Confirm
                        </button>
                    )}
                    {request.status === 'OPEN' && onCancel && (
                        <button
                            className="view-bids-btn btn-cancel-trash"
                            onClick={() => onCancel(request)}
                            title="Cancel Request"
                        >
                            <FaTrashAlt />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IssuePostCard;
