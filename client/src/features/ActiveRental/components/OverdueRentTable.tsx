import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExclamationTriangle, FaArrowRight, FaCalendarAlt } from 'react-icons/fa';
import type { ContractInstallments, RentInstallmentItem } from '../../../services/contract.service';
import './OverdueRentTable.css';

interface OverdueRentTableProps {
    installments: ContractInstallments;
    onPayNow: () => void;
    isPaying: boolean;
}

const formatMoney = (amount: number): string =>
    `$${Number(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateLabel = (iso: string, lang: string): string => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const OverdueRentTable = ({ installments, onPayNow, isPaying }: OverdueRentTableProps) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const unpaidItems = useMemo<RentInstallmentItem[]>(
        () => installments.items.filter((item) => item.status === 'OVERDUE' || item.status === 'DUE'),
        [installments.items]
    );

    const overdueCount = useMemo(
        () => unpaidItems.filter((item) => item.status === 'OVERDUE').length,
        [unpaidItems]
    );

    const totalRent = installments.rentAmount * unpaidItems.length;
    const totalLateFees = unpaidItems.reduce((sum, item) => sum + Number(item.lateFeeAmount ?? 0), 0);
    const totalDue = Number(installments.nextPayableTotal ?? totalRent + totalLateFees);

    const headlineCount = unpaidItems.length;
    
    const headline = useMemo(() => {
        if (overdueCount > 0) {
            return overdueCount === 1
                ? t('activeRental.overdueRentHeadline', { count: 1 })
                : t('activeRental.overdueRentHeadlinePlural', { count: overdueCount });
        } else {
            return headlineCount === 1
                ? t('activeRental.unpaidRentHeadline', { count: 1 })
                : t('activeRental.unpaidRentHeadlinePlural', { count: headlineCount });
        }
    }, [overdueCount, headlineCount, t]);

    return (
        <section className="overdue-rent-card" aria-live="polite" dir="ltr">
            <header className="overdue-rent-header">
                <div className="overdue-rent-headline">
                    <span className="overdue-rent-icon">
                        <FaExclamationTriangle aria-hidden="true" />
                    </span>
                    <div>
                        <span className="overdue-rent-eyebrow">{t('activeRental.actionRequired')}</span>
                        <h3>{headline}</h3>
                        <p>
                            {overdueCount > 0
                                ? t('activeRental.overdueText')
                                : t('activeRental.unpaidText')}
                        </p>
                    </div>
                </div>
                <div className="overdue-rent-total">
                    <span>{t('activeRental.totalToDebit')}</span>
                    <strong>{formatMoney(totalDue)}</strong>
                </div>
            </header>

            <div className="overdue-installments-list">
                {unpaidItems.map((item) => {
                    const isOverdue = item.status === 'OVERDUE';
                    return (
                        <div key={item.index} className={`overdue-installment-row-card ${isOverdue ? 'overdue' : 'due'}`}>
                            <div className="installment-card-left">
                                <div className="installment-calendar-icon">
                                    <FaCalendarAlt />
                                </div>
                                <div className="installment-details">
                                    <span className="installment-label">{item.label}</span>
                                    <span className="installment-deadline">{t('activeRental.deadline', { date: formatDateLabel(item.dueDate, currentLang) })}</span>
                                </div>
                            </div>
                            <div className="installment-card-right">
                                <div className="installment-pricing">
                                    <span className="pricing-rent">{t('activeRental.rent')}: {formatMoney(item.rentAmount)}</span>
                                    {item.lateFeeAmount > 0 && (
                                        <span className="pricing-late-fee">{t('activeRental.lateFee')}: {formatMoney(item.lateFeeAmount)}</span>
                                    )}
                                </div>
                                <div className="installment-totals-group">
                                    <strong>{formatMoney(item.totalAmount)}</strong>
                                    <span className={`overdue-row-pill ${isOverdue ? 'overdue' : 'due'}`}>
                                        {isOverdue ? t('activeRental.overdue') : t('activeRental.dueSoon')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="overdue-rent-summary">
                <div className="overdue-rent-summary-row">
                    <span><FaCalendarAlt aria-hidden="true" /> {headlineCount === 1 ? t('activeRental.outstandingRentCount', { count: 1 }) : t('activeRental.outstandingRentCountPlural', { count: headlineCount })}</span>
                    <strong>{formatMoney(totalRent)}</strong>
                </div>
                {totalLateFees > 0 && (
                    <div className="overdue-rent-summary-row warn">
                        <span>{t('activeRental.lateFeesOverdue', { count: overdueCount })}</span>
                        <strong>{formatMoney(totalLateFees)}</strong>
                    </div>
                )}
                {installments.pendingLandlordCredit > 0 && (
                    <div className="overdue-rent-summary-row credit">
                        <span>{t('activeRental.landlordCredit')}</span>
                        <strong>−{formatMoney(installments.pendingLandlordCredit)}</strong>
                    </div>
                )}
                <div className="overdue-rent-summary-row total">
                    <span>{t('activeRental.totalToDebit')}</span>
                    <strong>{formatMoney(totalDue)}</strong>
                </div>
            </div>

            <button
                type="button"
                className="overdue-rent-pay-btn"
                onClick={onPayNow}
                disabled={isPaying || headlineCount <= 0}
            >
                {isPaying
                    ? t('activeRental.processing')
                    : (<>{t('activeRental.payNowWithArrow', { amount: formatMoney(totalDue) })} <FaArrowRight aria-hidden="true" /></>)}
            </button>
            <p className="overdue-rent-fineprint">
                {t('activeRental.fineprint')}
            </p>
        </section>
    );
};

export default OverdueRentTable;
