import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    X, Calendar, User, DollarSign, 
    Receipt, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { type LeaseContract } from '../pages/Contract';
import contractService, { type ContractInstallments } from '../../../services/contract.service';
import './ActiveLeaseContract.css'; // Share the premium active contract styles

interface Props {
    contract: LeaseContract;
    onClose: () => void;
}

const ExpiredLeaseContract: React.FC<Props> = ({ contract, onClose }) => {
    const { t } = useTranslation();
    const [installments, setInstallments] = useState<ContractInstallments | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInstallments = async () => {
            try {
                const data = await contractService.getContractInstallments(contract.internalId);
                setInstallments(data);
            } catch (err) {
                console.error("Failed to load installments for expired contract:", err);
            } finally {
                setLoading(false);
            }
        };
        void fetchInstallments();
    }, [contract.internalId]);

    const totalPaidInstallments = installments?.items.filter(item => item.isPaid).length || 0;
    const totalInstallmentsCount = installments?.items.length || 0;

    return (
        <div className="active-contract-overlay" dir="ltr">
            <div className="active-detail-panel animate-slide-in-panel">
                <header className="active-panel-header" style={{ borderBottomColor: '#e2e8f0' }}>
                    <div className="header-status-badge" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid rgba(100, 116, 139, 0.15)' }}>
                        <Clock size={16} />
                        <span>Expired Lease</span>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Close panel">
                        <X size={20}/>
                    </button>
                </header>

                <div className="active-panel-content">
                    <div className="contract-header-info">
                        <h2>{contract.property}</h2>
                        <p className="contract-id-ref">
                            {t('activeLease.contractReference')}: {contract.id}
                        </p>
                    </div>

                    <div className="info-cards-grid">
                        {/* Lease Term Card */}
                        <section className="info-card">
                            <div className="card-header">
                                <Calendar size={18} className="icon-blue" />
                                <h3>Lease Period</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">Start Date</span>
                                    <span className="value">{contract.startDate}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">Duration</span>
                                    <span className="value">{contract.duration}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">Status</span>
                                    <span className="value" style={{ color: '#64748b', fontWeight: 'bold' }}>EXPIRED</span>
                                </div>
                            </div>
                        </section>

                        {/* Financial Overview Card */}
                        <section className="info-card">
                            <div className="card-header">
                                <DollarSign size={18} className="icon-green" />
                                <h3>Financials</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">Monthly Rent</span>
                                    <span className="value">${contract.amount}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">Security Deposit</span>
                                    <span className="value">${contract.deposit}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">Settled Rent</span>
                                    <span className="value" style={{ color: '#10b981' }}>{totalPaidInstallments} / {totalInstallmentsCount} paid</span>
                                </div>
                            </div>
                        </section>

                        {/* Payment Dues Status */}
                        {installments && installments.overdueInstallments > 0 && (
                            <section className="info-card full-width" style={{ border: '1px solid #fcd34d', background: '#fffbeb' }}>
                                <div className="card-content" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                                    <AlertCircle size={24} style={{ color: '#d97706', flexShrink: 0 }} />
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#92400e', fontWeight: 700 }}>Outstanding Dues</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#b45309' }}>
                                            There are {installments.overdueInstallments} unpaid installment(s) remaining for this expired contract totaling <strong>${installments.nextPayableTotal}</strong>.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

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

                        {/* Payment History List */}
                        <section className="info-card full-width">
                            <div className="card-header">
                                <Receipt size={18} className="icon-green" />
                                <h3>Rent Installments & Payment History</h3>
                            </div>
                            <div className="card-content" style={{ gap: '16px' }}>
                                {loading ? (
                                    <div className="loading-state">Loading payment schedule...</div>
                                ) : installments && installments.items.length > 0 ? (
                                    <div className="installments-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {installments.items.map((item, idx) => (
                                            <div key={idx} className="timeline-item" style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                padding: '12px 16px',
                                                background: '#f8fafc',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{item.label}</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                        Due Date: {new Date(item.dueDate).toLocaleDateString()}
                                                    </span>
                                                    {item.isPaid && item.paidAt && (
                                                        <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <CheckCircle2 size={12} /> Paid on {new Date(item.paidAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>${item.totalAmount}</span>
                                                    <span className={`status-pill ${item.status.toLowerCase()}`} style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        background: item.isPaid ? '#ecfdf5' : item.status === 'OVERDUE' ? '#fff1f2' : '#f1f5f9',
                                                        color: item.isPaid ? '#10b981' : item.status === 'OVERDUE' ? '#ef4444' : '#64748b',
                                                        border: `1px solid ${item.isPaid ? 'rgba(16,185,129,0.1)' : item.status === 'OVERDUE' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)'}`
                                                    }}>
                                                        {item.isPaid ? 'PAID' : item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-receipt-state">No payment schedule found.</div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="execution-footer" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.1)' }}>
                        <Clock size={16} />
                        <p>This lease has expired. Dues can still be settled from the payments dashboard.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpiredLeaseContract;
