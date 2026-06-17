import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const formatDateLabel = (iso: string, lang: string): string => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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

const statusBadge = (status: RentInstallmentStatus, t: any) => {
    if (status === 'PAID') return { label: t('activeRental.paid'), className: 'paid', icon: <FaCheckCircle /> };
    if (status === 'OVERDUE') return { label: t('activeRental.overdue'), className: 'overdue', icon: <FaExclamationTriangle /> };
    if (status === 'DUE') return { label: t('activeRental.dueSoon'), className: 'due', icon: <FaClock /> };
    return { label: t('activeRental.upcoming'), className: 'upcoming', icon: <FaCalendarAlt /> };
};

const InstallmentsModal: React.FC<InstallmentsModalProps> = ({ contractId, contractTitle, onClose, onPaid }) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

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
            setErrorMessage(t('activeRental.noOutstandingDues'));
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
                        <span className="installments-eyebrow">{t('activeRental.rentSchedule')}</span>
                        <h2>{contractTitle}</h2>
                        <p className="installments-subtitle">
                            {t('activeRental.rentScheduleSubtitle')}
                        </p>
                    </div>
                    <button type="button" className="installments-close" onClick={onClose} aria-label={t('activeRental.cancel')}>
                        <FaTimes />
                    </button>
                </header>

                {isLoading && (
                    <div className="installments-state-loading">
                        <div className="installments-spinner" />
                        <span>{t('activeRental.fetchingLedger')}</span>
                    </div>
                )}

                {!isLoading && data && (
                    <>
                        <section className="installments-summary">
                            <div className="installments-summary-row">
                                <div className="summary-pill">
                                    <span>{t('activeRental.walletBalanceLabel')}</span>
                                    <strong>{formatMoney(data.walletBalance)}</strong>
                                </div>
                                <div className="summary-pill">
                                    <span>{t('activeRental.leaseProgress')}</span>
                                    <strong>{data.paidInstallments} / {data.leaseDurationMonths}</strong>
                                </div>
                                <div className="summary-pill">
                                    <span>{t('activeRental.outstanding')}</span>
                                    <strong>{data.outstandingInstallments}</strong>
                                </div>
                                <div className="summary-pill">
                                    <span>{t('activeRental.overdue')}</span>
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
                                    <strong>{t('activeRental.autopaySetting')}</strong>
                                    <small>
                                        {t('activeRental.autopaySettingSubtitle')}
                                    </small>
                                </div>
                                <div className={`custom-switch ${data.autopayEnabled ? 'checked' : ''} ${autopayBusy ? 'disabled' : ''}`}>
                                    <div className="custom-switch-handle" />
                                </div>
                            </div>
                        </section>

                        <div className="installments-table-wrapper">
                            <table className="installments-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{t('activeRental.month')}</th>
                                        <th>{t('activeRental.dueDate')}</th>
                                        <th>{t('activeRental.rent')}</th>
                                        <th>{t('activeRental.lateFee')}</th>
                                        <th>{t('activeRental.total')}</th>
                                        <th>{t('activeRental.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item: RentInstallmentItem) => {
                                        const badge = statusBadge(getDisplayStatus(item, data.now), t);
                                        return (
                                            <tr key={item.index} className={`row-${badge.className}`}>
                                                <td>{(item.index + 1).toString().padStart(2, '0')}</td>
                                                <td>{item.label}</td>
                                                <td>{formatDateLabel(item.dueDate, currentLang)}</td>
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
                                    <span>
                                        {summary.payableCount === 1 
                                            ? t('activeRental.outstandingRentCount', { count: 1 }) 
                                            : t('activeRental.outstandingRentCountPlural', { count: summary.payableCount })}
                                    </span>
                                    <strong>{formatMoney(summary.totalRentDue)}</strong>
                                </div>
                                {summary.lateFee > 0 && (
                                    <div className="installments-totals-row warn">
                                        <span>{t('activeRental.lateFeesOverdue', { count: summary.overdueCount })}</span>
                                        <strong>{formatMoney(summary.lateFee)}</strong>
                                    </div>
                                )}
                                {summary.credit > 0 && (
                                    <div className="installments-totals-row credit">
                                        <span>{t('activeRental.landlordCredit')}</span>
                                        <strong>−{formatMoney(summary.credit)}</strong>
                                    </div>
                                )}
                                <div className="installments-totals-row total">
                                    <span>{t('activeRental.totalToDebit')}</span>
                                    <strong>{formatMoney(summary.netToPay)}</strong>
                                </div>
                            </section>
                        )}

                        {errorMessage && (
                            <div className="installments-error">{errorMessage}</div>
                        )}

                        <footer className="installments-footer">
                            <button type="button" className="installments-btn ghost" onClick={onClose}>
                                {t('activeRental.cancel')}
                            </button>
                            <button
                                type="button"
                                className="installments-btn primary"
                                onClick={handlePayAll}
                                disabled={!summary || summary.payableCount <= 0}
                            >
                                {!summary || summary.payableCount <= 0
                                    ? t('activeRental.noOutstandingDues')
                                    : t('activeRental.payFromWallet', { amount: formatMoney(data.nextPayableTotal) })}
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
