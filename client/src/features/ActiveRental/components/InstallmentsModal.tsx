import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaCheckCircle, FaClock, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import contractService, {
    type ContractInstallments,
    type RentInstallmentItem,
    type RentInstallmentStatus,
} from '../../../services/contract.service';
import './InstallmentsModal.css';

interface InstallmentsModalProps {
    contractId: string;
    contractTitle: string;
    onClose: () => void;
    onPaid: () => void;
}

const formatMoney = (amount: number): string =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateLabel = (iso: string): string => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};

const getDisplayStatus = (item: RentInstallmentItem, nowIso: string): RentInstallmentStatus => {
    if (item.isPaid || item.status === 'PAID') return 'PAID';
    const now = new Date(nowIso);
    const due = new Date(item.dueDate);
    if (Number.isNaN(now.getTime()) || Number.isNaN(due.getTime())) return item.status;
    
    const periodStart = new Date(due.getFullYear(), due.getMonth() - 1, due.getDate());
    if (now >= periodStart) {
        if (now >= due) return 'OVERDUE';
        return 'DUE';
    }
    return 'UPCOMING';
};

const statusBadge = (status: RentInstallmentStatus) => {
    if (status === 'PAID') return { label: 'Paid', className: 'paid', icon: <FaCheckCircle /> };
    if (status === 'OVERDUE') return { label: 'Overdue', className: 'overdue', icon: <FaExclamationTriangle /> };
    if (status === 'DUE') return { label: 'Due', className: 'due', icon: <FaClock /> };
    return { label: 'Upcoming', className: 'upcoming', icon: <FaCalendarAlt /> };
};

const InstallmentsModal: React.FC<InstallmentsModalProps> = ({ contractId, contractTitle, onClose, onPaid }) => {
    const navigate = useNavigate();
    const [data, setData] = useState<ContractInstallments | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [autopayBusy, setAutopayBusy] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const next = await contractService.getContractInstallments(contractId);
            setData(next);
        } catch (err: any) {
            setErrorMessage(err?.response?.data?.message ?? 'Could not load installments.');
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [contractId]);

    useEffect(() => {
        void load();
        const handler = () => { void load(); };
        globalThis.addEventListener('homi:testing-clock-changed', handler);
        return () => globalThis.removeEventListener('homi:testing-clock-changed', handler);
    }, [load]);

    const summary = useMemo(() => {
        if (!data) return null;
        const statusList = data.items.map((item) => getDisplayStatus(item, data.now));
        const payableCount = statusList.filter((status) => status === 'DUE' || status === 'OVERDUE').length;
        const overdueCount = statusList.filter((status) => status === 'OVERDUE').length;
        const totalRentDue = payableCount * data.rentAmount;
        const lateFee = overdueCount * data.lateFeeAmount;
        return {
            totalRentDue,
            lateFee,
            netToPay: data.nextPayableTotal,
            credit: data.pendingLandlordCredit,
            payableCount,
            overdueCount,
        };
    }, [data]);

    const handlePayAll = () => {
        if (!data) return;
        const payableCount = data.items.filter((item) => {
            const status = getDisplayStatus(item, data.now);
            return status === 'DUE' || status === 'OVERDUE';
        }).length;
        
        if (payableCount <= 0) {
            setErrorMessage('All due installments are already paid.');
            return;
        }

        const statusList = data.items.map((item) => getDisplayStatus(item, data.now));
        const overdueCount = statusList.filter((status) => status === 'OVERDUE').length;
        const totalRentDue = payableCount * data.rentAmount;
        const lateFee = overdueCount * data.lateFeeAmount;

        const review = {
            contractId,
            propertyTitle: contractTitle,
            rent: totalRentDue,
            deposit: 0,
            serviceFee: 0,
            total: data.nextPayableTotal,
            isMonthlyInstallment: true,
            lateFee,
            credit: data.pendingLandlordCredit,
            payableCount,
        };

        onClose();
        navigate('/tenant-payment', { state: { paymentReviewData: review } });
    };

    const handleAutopayToggle = async () => {
        if (!data || autopayBusy) return;
        setAutopayBusy(true);
        try {
            const next = await contractService.setContractAutopay(contractId, !data.autopayEnabled);
            setData((prev) => (prev ? { ...prev, autopayEnabled: next.autopayEnabled } : prev));
        } catch (err: any) {
            setErrorMessage(err?.response?.data?.message ?? 'Could not update autopay setting.');
        } finally {
            setAutopayBusy(false);
        }
    };

    return (
        <div className="installments-modal-overlay" onClick={onClose}>
            <div className="installments-modal" onClick={(e) => e.stopPropagation()}>
                <header className="installments-modal-header">
                    <div>
                        <span className="installments-eyebrow">Rent Schedule</span>
                        <h2>{contractTitle}</h2>
                        <p className="installments-subtitle">
                            Atomic, month-by-month payment ledger. You can't skip a month or pay one twice.
                        </p>
                    </div>
                    <button type="button" className="installments-close" onClick={onClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </header>

                {isLoading && (
                    <div className="installments-state-loading">
                        <div className="installments-spinner" />
                        <span>Fetching rent ledger records...</span>
                    </div>
                )}

                {!isLoading && data && (
                    <>
                        <section className="installments-summary">
                            <div className="installments-summary-row">
                                <div className="summary-pill">
                                    <span>Wallet Balance</span>
                                    <strong>{formatMoney(data.walletBalance)}</strong>
                                </div>
                                <div className="summary-pill">
                                    <span>Paid Months</span>
                                    <strong>{data.paidInstallments} / {data.leaseDurationMonths}</strong>
                                </div>
                                <div className="summary-pill">
                                    <span>Outstanding</span>
                                    <strong>{data.outstandingInstallments}</strong>
                                </div>
                                <div className="summary-pill">
                                    <span>Overdue</span>
                                    <strong className={data.overdueInstallments > 0 ? 'danger' : ''}>
                                        {data.overdueInstallments}
                                    </strong>
                                </div>
                            </div>

                            <div
                                className={`autopay-row ${data.autopayEnabled ? 'enabled' : ''} ${autopayBusy ? 'busy' : ''}`}
                                onClick={handleAutopayToggle}
                            >
                                <div className="autopay-label-group">
                                    <strong>Autopay Setting</strong>
                                    <small>
                                        When enabled, your HOMi wallet automatically settles due installments instantly.
                                    </small>
                                </div>
                                <div className={`custom-switch ${data.autopayEnabled ? 'checked' : ''} ${autopayBusy ? 'disabled' : ''}`}>
                                    <div className="custom-switch-handle" />
                                </div>
                            </div>
                        </section>

                        <div className="installments-table-wrapper">
                            <table className="installments-table">
                                theme-dark
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Month</th>
                                        <th>Due Date</th>
                                        <th>Rent</th>
                                        <th>Late Fee</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item: RentInstallmentItem) => {
                                        const badge = statusBadge(getDisplayStatus(item, data.now));
                                        return (
                                            <tr key={item.index} className={`row-${badge.className}`}>
                                                <td>{(item.index + 1).toString().padStart(2, '0')}</td>
                                                <td>{item.label}</td>
                                                <td>{formatDateLabel(item.dueDate)}</td>
                                                <td>{formatMoney(item.rentAmount)}</td>
                                                <td>{item.lateFeeAmount > 0 ? formatMoney(item.lateFeeAmount) : '—'}</td>
                                                <td>{formatMoney(item.totalAmount)}</td>
                                                <td>
                                                    <span className={`row-status-pill ${badge.className}`}>
                                                        {badge.icon} {badge.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {summary && summary.payableCount > 0 && (
                            <section className="installments-totals">
                                <div className="installments-totals-row">
                                    <span>Outstanding rent ({summary.payableCount} month{summary.payableCount === 1 ? '' : 's'})</span>
                                    <strong>{formatMoney(summary.totalRentDue)}</strong>
                                </div>
                                {summary.lateFee > 0 && (
                                    <div className="installments-totals-row warn">
                                        <span>Late fees ({summary.overdueCount} overdue)</span>
                                        <strong>{formatMoney(summary.lateFee)}</strong>
                                    </div>
                                )}
                                {summary.credit > 0 && (
                                    <div className="installments-totals-row credit">
                                        <span>Landlord maintenance credit</span>
                                        <strong>−{formatMoney(summary.credit)}</strong>
                                    </div>
                                )}
                                <div className="installments-totals-row total">
                                    <span>Total to debit</span>
                                    <strong>{formatMoney(summary.netToPay)}</strong>
                                </div>
                            </section>
                        )}

                        {errorMessage && (
                            <div className="installments-error">{errorMessage}</div>
                        )}

                        <footer className="installments-footer">
                            <button type="button" className="installments-btn ghost" onClick={onClose}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="installments-btn primary"
                                onClick={handlePayAll}
                                disabled={!summary || summary.payableCount <= 0}
                            >
                                {!summary || summary.payableCount <= 0
                                    ? 'No Outstanding Dues'
                                    : `Pay ${formatMoney(data.nextPayableTotal)} From Wallet`}
                            </button>
                        </footer>
                    </>
                )}

                {!isLoading && !data && errorMessage && (
                    <div className="installments-error" style={{ marginTop: 16 }}>{errorMessage}</div>
                )}
            </div>
        </div>
    );
};

export default InstallmentsModal;
