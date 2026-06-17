import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
    X, AlertOctagon, Calendar, 
    ShieldX, Building2, User
} from 'lucide-react';
import { type LeaseContract } from '../pages/Contract';
import './ActiveLeaseContract.css'; // Share the premium active contract styles

interface Props {
    contract: LeaseContract;
    onClose: () => void;
}

const TerminatedLeaseContract: React.FC<Props> = ({ contract, onClose }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    
    // Find if there is a termination request
    const latestRequest = contract.terminationRequests && contract.terminationRequests.length > 0
        ? contract.terminationRequests[0]
        : null;

    const terminationReason = latestRequest?.reason 
        ? latestRequest.reason 
        : t('terminatedLease.autoTerminatedReason', "Lease terminated automatically due to outstanding non-payment of rent.");

    const terminatedBy = latestRequest?.requesterId
        ? (latestRequest.requesterId === contract.landlordNationalId ? t('activeLease.landlord', "Landlord") : t('activeLease.tenant', "Tenant"))
        : t('terminatedLease.systemSweep', "System (Automated Cycle Sweep)");

    const terminationDate = latestRequest?.createdAt
        ? new Date(latestRequest.createdAt).toLocaleDateString(locale)
        : new Date(contract.createdAt).toLocaleDateString(locale); // Fallback to creation/updated

    return (
        <div className="active-contract-overlay" dir="ltr">
            <div className="active-detail-panel animate-slide-in-panel">
                <header className="active-panel-header" style={{ borderBottomColor: '#fee2e2' }}>
                    <div className="header-status-badge" style={{ background: '#fff1f2', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <ShieldX size={16} />
                        <span>{t('terminatedLease.terminatedLease', 'Terminated Lease')}</span>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Close panel">
                        <X size={20}/>
                    </button>
                </header>

                <div className="active-panel-content">
                    <div className="contract-header-info">
                        <h2>{contract.property}</h2>
                        <p className="contract-id-ref" style={{ background: '#f87171', color: 'white' }}>
                            {t('activeLease.contractReference')}: {contract.id}
                        </p>
                    </div>

                    <div className="info-cards-grid">
                        {/* Termination Info Card */}
                        <section className="info-card full-width" style={{ border: '1px solid #fca5a5', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)' }}>
                            <div className="card-header" style={{ background: '#fff5f5', borderBottom: '1px solid #fee2e2' }}>
                                <AlertOctagon size={18} style={{ color: '#ef4444' }} />
                                <h3 style={{ color: '#991b1b' }}>{t('terminatedLease.terminationBreakdown')}</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">{t('terminatedLease.terminationDate')}</span>
                                    <span className="value" style={{ color: '#b91c1c' }}>{terminationDate}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('terminatedLease.initiatedBy')}</span>
                                    <span className="value">{terminatedBy}</span>
                                </div>
                                <div className="data-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', borderBottom: 'none', paddingBottom: 0 }}>
                                    <span className="label">{t('terminatedLease.terminationReason')}</span>
                                    <p className="termination-reason-text" style={{ 
                                        margin: 0, 
                                        fontSize: '13px', 
                                        color: '#374151', 
                                        background: '#fff1f2', 
                                        padding: '12px', 
                                        borderRadius: '8px', 
                                        width: '100%',
                                        lineHeight: '1.5',
                                        border: '1px solid #ffe4e6'
                                    }}>
                                        {terminationReason}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Financials Summary */}
                        <section className="info-card">
                            <div className="card-header">
                                <Building2 size={18} className="icon-blue" />
                                <h3>{t('terminatedLease.rentDetails')}</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">{t('activeLease.monthlyRent')}</span>
                                    <span className="value">${contract.amount}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('terminatedLease.securityDeposit')}</span>
                                    <span className="value">${contract.deposit}</span>
                                </div>
                            </div>
                        </section>

                        {/* Dates */}
                        <section className="info-card">
                            <div className="card-header">
                                <Calendar size={18} className="icon-orange" />
                                <h3>{t('terminatedLease.datesTitle')}</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">{t('terminatedLease.startDate')}</span>
                                    <span className="value">{contract.startDate}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('terminatedLease.leaseDuration')}</span>
                                    <span className="value">{contract.duration}</span>
                                </div>
                            </div>
                        </section>

                        {/* Parties Involved */}
                        <section className="info-card full-width">
                            <div className="card-header">
                                <User size={18} className="icon-purple" />
                                <h3>{t('activeLease.partiesInvolved')}</h3>
                            </div>
                            <div className="card-content multi-col">
                                <div className="party-box">
                                    <span className="party-role">{t('activeLease.tenant')}</span>
                                    <span className="party-name">{contract.tenant}</span>
                                </div>
                                <div className="party-box">
                                    <span className="party-role">{t('activeLease.landlord')}</span>
                                    <span className="party-name">{contract.landlord}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="execution-footer" style={{ background: '#fff1f2', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <ShieldX size={16} />
                        <p>{t('terminatedLease.executionFooterText')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TerminatedLeaseContract;
