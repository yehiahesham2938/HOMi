import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaTimes, FaStar, FaWallet, FaCheckCircle, FaUser,
    FaInfoCircle, FaClock, FaShieldAlt, FaBolt, FaChevronDown,
    FaChevronUp, FaArrowRight, FaEye, FaComments,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import maintenanceService, {
    type MaintenanceJobApplication,
    type MaintenanceRequest,
} from '../../../../services/maintenance.service';
import authService from '../../../../services/auth.service';
import contractService from '../../../../services/contract.service';
import ProviderProfile, { type MinimalProvider } from './ProviderProfile';
import './ApplicationsModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    request: MaintenanceRequest | null;
    onAccepted: (updated: MaintenanceRequest) => void;
}

const ApplicationsModal: React.FC<Props> = ({ isOpen, onClose, request, onAccepted }) => {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const [applications, setApplications] = useState<MaintenanceJobApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [profileProvider, setProfileProvider] = useState<MinimalProvider | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        if (!isOpen || !request) return;
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const role = authService.getCurrentUser()?.user?.role;
                const isLandlordRole = role === 'LANDLORD';
                const [apps, walletRes] = await Promise.all([
                    maintenanceService.listApplicationsForRequest(request.id),
                    isLandlordRole
                        ? contractService.getWalletBalance().catch(() => null)
                        : maintenanceService.getTenantContext().catch(() => null),
                ]);
                if (cancelled) return;
                setApplications(apps);
                if (walletRes) {
                    const balance = 'balance' in walletRes ? walletRes.balance : walletRes.walletBalance;
                    setWalletBalance(balance);
                }
            } catch (err: any) {
                if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load applications.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [isOpen, request]);

    const sorted = useMemo(
        () =>
            [...applications].sort((a, b) => {
                const aRate = a.provider?.rating ?? 0;
                const bRate = b.provider?.rating ?? 0;
                if (bRate !== aRate) return bRate - aRate;
                return a.finalPrice - b.finalPrice;
            }),
        [applications]
    );

    const handleAccept = async (app: MaintenanceJobApplication) => {
        if (!request) return;
        if (walletBalance != null && walletBalance < app.finalPrice) {
            setError(
                `Insufficient balance. Your wallet (EGP ${walletBalance.toFixed(2)}) is below this bid (EGP ${app.finalPrice.toFixed(2)}).`
            );
            return;
        }
        setError(null);
        setAcceptingId(app.id);
        const role = authService.getCurrentUser()?.user?.role;
        const isLandlordRole = role === 'LANDLORD';
        try {
            const updated = isLandlordRole
                ? await maintenanceService.acceptApplicationAsLandlord(app.id)
                : await maintenanceService.acceptApplication(app.id);
            onAccepted(updated);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Could not accept this application.');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleViewProfile = (app: MaintenanceJobApplication) => {
        const p = app.provider as any;
        if (!p) return;
        setProfileProvider({
            id: p.id ?? app.id,
            firstName: p.firstName ?? '',
            lastName: p.lastName ?? '',
            avatarUrl: p.avatarUrl ?? null,
            bio: p.bio ?? null,
            providerType: p.providerType ?? null,
            businessName: p.businessName ?? null,
            primaryCategory: p.primaryCategory ?? null,
            category: p.category ?? null,
            categories: p.categories ?? null,
            companyLocation: p.companyLocation ?? null,
            rating: p.rating ?? 0,
            ratingsCount: p.ratingsCount ?? 0,
            completedJobsCount: p.completedJobsCount ?? undefined,
        });
        setIsProfileOpen(true);
    };

    if (!isOpen || !request) return null;

    const balanceOk = walletBalance != null && walletBalance > 0;

    return (
        <div className="apps-modal-overlay" onClick={onClose}>
            <div className="apps-modal" onClick={(e) => e.stopPropagation()}>

                {/* ── Header ───────────────────────────────────────── */}
                <header className="apps-modal-header">
                    <div className="apps-header-left">
                        <div className="apps-header-icon">
                            <FaBolt />
                        </div>
                        <div>
                            <h2>Provider Bids</h2>
                            <p className="apps-header-sub">{request.title} — choose your pro. Payment held in escrow.</p>
                        </div>
                    </div>
                    <button className="apps-close-btn" onClick={onClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </header>

                {/* ── Wallet Card ─────────────────────────────────── */}
                <div className="apps-wallet-card">
                    <div className="wallet-card-inner">
                        <div className="wallet-icon-wrap">
                            <FaWallet />
                        </div>
                        <div className="wallet-info">
                            <span className="wallet-label">HOMi Wallet</span>
                            <span className={`wallet-amount ${balanceOk ? 'amount-ok' : 'amount-low'}`}>
                                {walletBalance != null ? `EGP ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </span>
                        </div>
                        <div className="wallet-card-badge">
                            <FaShieldAlt />
                            <span>Escrow Protected</span>
                        </div>
                        <button className="apps-topup-btn" onClick={() => navigate('/balance')}>
                            Top Up <FaArrowRight />
                        </button>
                    </div>
                </div>

                {/* ── Error / Warning Banner ───────────────────────── */}
                {error && (
                    <div className="apps-modal-error">
                        <FaInfoCircle />
                        <div>
                            <strong>Action needed</strong>
                            <p>{error}</p>
                        </div>
                        {error.includes('wallet') && (
                            <button className="error-topup-link" onClick={() => navigate('/balance')}>
                                Top Up Now
                            </button>
                        )}
                    </div>
                )}

                {/* ── Body ─────────────────────────────────────────── */}
                <div className="apps-modal-body">
                    {loading ? (
                        <div className="apps-loading">
                            <div className="apps-spinner" />
                            <p>Loading bids…</p>
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="apps-modal-empty">
                            <div className="apps-empty-icon"><FaInfoCircle /></div>
                            <h4>No bids yet</h4>
                            <p>Maintenance pros will see your job and start sending offers shortly. We'll notify you the moment they apply.</p>
                        </div>
                    ) : (
                        sorted.map((app, idx) => {
                            const fullName = `${app.provider?.firstName ?? ''} ${app.provider?.lastName ?? ''}`.trim();
                            const displayName = app.provider?.businessName ?? (fullName || 'Maintainer');
                            const insufficient = walletBalance != null && walletBalance < app.finalPrice;
                            const isExpanded = expandedId === app.id;
                            const isTop = idx === 0;

                            return (
                                <div key={app.id} className={`app-card ${isTop ? 'app-card-top' : ''}`}>
                                    {isTop && <div className="app-top-badge">⭐ Best Match</div>}

                                    <div className="app-card-main">
                                        {/* Avatar */}
                                        <div className="app-avatar-wrap app-clickable" onClick={() => handleViewProfile(app)} title="View Profile">
                                            <div className="app-avatar">
                                                {app.provider?.avatarUrl
                                                    ? <img src={app.provider.avatarUrl} alt={displayName} />
                                                    : <FaUser />
                                                }
                                            </div>
                                            {isTop && <div className="app-verified-badge"><FaShieldAlt /></div>}
                                        </div>

                                        {/* Info */}
                                        <div className="app-info">
                                            <div className="app-name-row">
                                                <h4 className="app-clickable-name" onClick={() => handleViewProfile(app)}>{displayName}</h4>
                                                <span className="app-type-pill">
                                                    {app.provider?.providerType === 'CENTER' ? 'Center' : 'Individual'}
                                                </span>
                                            </div>

                                            <div className="app-rating-row">
                                                <FaStar />
                                                <span className="rating-val">{(app.provider?.rating ?? 0).toFixed(1)}</span>
                                                <span className="rating-count">({app.provider?.ratingsCount ?? 0} reviews)</span>
                                                {app.provider?.category && (
                                                    <span className="app-category-chip">{app.provider.category}</span>
                                                )}
                                                <button className="app-profile-link-btn" onClick={() => handleViewProfile(app)}>
                                                    <FaEye /> View Profile
                                                </button>
                                                <button 
                                                    className="app-profile-link-btn app-chat-btn" 
                                                    onClick={() => {
                                                        if (app.providerId) {
                                                            navigate('/messages', {
                                                                state: {
                                                                    participantId: app.providerId,
                                                                    propertyId: request.propertyId || undefined
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    style={{ marginLeft: '12px' }}
                                                >
                                                    <FaComments /> Message
                                                </button>
                                            </div>

                                            {app.coverNote && <p className="app-note">&ldquo;{app.coverNote}&rdquo;</p>}

                                            {/* Meta pills */}
                                            <div className="app-meta-pills">
                                                {app.etaHours != null && (
                                                    <span className="meta-pill pill-eta">
                                                        <FaClock /> ETA {app.etaHours}h
                                                    </span>
                                                )}
                                                <span className="meta-pill pill-time">
                                                    Submitted {new Date(app.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {/* Expandable breakdown */}
                                            {app.priceBreakdown && (
                                                <button
                                                    className="app-breakdown-toggle"
                                                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                                >
                                                    Price Breakdown {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                                </button>
                                            )}
                                            {isExpanded && app.priceBreakdown && (
                                                <div className="app-breakdown-panel">
                                                    {app.priceBreakdown}
                                                </div>
                                            )}
                                        </div>

                                        {/* Price + CTA */}
                                        <div className="app-card-right">
                                            <div className="app-price-block">
                                                <span className="price-label">Final Price</span>
                                                <strong className="price-value">
                                                    EGP {app.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </strong>
                                            </div>
                                            {(() => {
                                                const role = authService.getCurrentUser()?.user?.role;
                                                const isLandlordRole = role === 'LANDLORD';
                                                const isTenantRole = role === 'TENANT';
                                                const canAccept = (request.chargeParty === 'LANDLORD' && isLandlordRole) ||
                                                                  (request.chargeParty === 'TENANT' && isTenantRole);
                                                
                                                if (canAccept) {
                                                    return (
                                                        <button
                                                            className={`app-accept-btn ${insufficient ? 'btn-insufficient' : ''}`}
                                                            disabled={!!acceptingId || insufficient}
                                                            onClick={() => handleAccept(app)}
                                                        >
                                                            {acceptingId === app.id
                                                                ? <><div className="btn-spinner" /> Approving…</>
                                                                : insufficient
                                                                    ? <><FaWallet /> Top Up First</>
                                                                    : <><FaCheckCircle /> Approve &amp; Escrow</>
                                                            }
                                                        </button>
                                                    );
                                                }

                                                const isArabic = i18n.language === 'ar';
                                                const labelText = request.chargeParty === 'LANDLORD'
                                                    ? (isArabic ? 'موافقة المالك' : 'Approval by Landlord')
                                                    : (isArabic ? 'موافقة المستأجر' : 'Approval by Tenant');
                                                
                                                return (
                                                    <button
                                                        type="button"
                                                        className="app-awaiting-approval-btn"
                                                        disabled
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 16px',
                                                            borderRadius: 12,
                                                            border: '1px solid #d1d5db',
                                                            background: '#f3f4f6',
                                                            color: '#9ca3af',
                                                            cursor: 'not-allowed',
                                                            fontWeight: 600,
                                                            fontSize: '0.9rem',
                                                            marginTop: 8,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 6
                                                        }}
                                                    >
                                                        <FaClock /> {labelText}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Provider Profile Modal */}
                <ProviderProfile
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    provider={profileProvider}
                />
            </div>
        </div>
    );
};

export default ApplicationsModal;
