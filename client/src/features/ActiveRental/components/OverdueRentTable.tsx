import { useMemo } from 'react';
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

const formatDateLabel = (iso: string): string => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};

const OverdueRentTable = ({ installments, onPayNow, isPaying }: OverdueRentTableProps) => {
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
    const headline = overdueCount > 0
        ? `${overdueCount} overdue rent payment${overdueCount === 1 ? '' : 's'}`
        : `${headlineCount} unpaid rent installment${headlineCount === 1 ? '' : 's'}`;

    return (
        <section className="overdue-rent-card" aria-live="polite">
            <header className="overdue-rent-header">
                <div className="overdue-rent-headline">
                    <span className="overdue-rent-icon">
                        <FaExclamationTriangle aria-hidden="true" />
                    </span>
                    <div>
                        <span className="overdue-rent-eyebrow">Action Required</span>
                        <h3>{headline}</h3>
                        <p>
                            {overdueCount > 0
                                ? 'You have rent payments past their due date. Late fees have been added to the months below.'
                                : 'You have multiple rent payments waiting to be settled. Clear them now to keep your lease in good standing.'}
                        </p>
                    </div>
                </div>
                <div className="overdue-rent-total">
                    <span>Total to pay</span>
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
                                    <span className="installment-deadline">Deadline: {formatDateLabel(item.dueDate)}</span>
                                </div>
                            </div>
                            <div className="installment-card-right">
                                <div className="installment-pricing">
                                    <span className="pricing-rent">Rent: {formatMoney(item.rentAmount)}</span>
                                    {item.lateFeeAmount > 0 && (
                                        <span className="pricing-late-fee">Late Fee: {formatMoney(item.lateFeeAmount)}</span>
                                    )}
                                </div>
                                <div className="installment-totals-group">
                                    <strong>{formatMoney(item.totalAmount)}</strong>
                                    <span className={`overdue-row-pill ${isOverdue ? 'overdue' : 'due'}`}>
                                        {isOverdue ? 'Overdue' : 'Due'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="overdue-rent-summary">
                <div className="overdue-rent-summary-row">
                    <span><FaCalendarAlt aria-hidden="true" /> Outstanding rent ({headlineCount} month{headlineCount === 1 ? '' : 's'})</span>
                    <strong>{formatMoney(totalRent)}</strong>
                </div>
                {totalLateFees > 0 && (
                    <div className="overdue-rent-summary-row warn">
                        <span>Late fees ({overdueCount} overdue)</span>
                        <strong>{formatMoney(totalLateFees)}</strong>
                    </div>
                )}
                {installments.pendingLandlordCredit > 0 && (
                    <div className="overdue-rent-summary-row credit">
                        <span>Landlord maintenance credit</span>
                        <strong>−{formatMoney(installments.pendingLandlordCredit)}</strong>
                    </div>
                )}
                <div className="overdue-rent-summary-row total">
                    <span>Total to debit</span>
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
                    ? 'Processing...'
                    : (<>Pay {formatMoney(totalDue)} Now <FaArrowRight aria-hidden="true" /></>)}
            </button>
            <p className="overdue-rent-fineprint">
                Payment is settled atomically from your wallet balance. If anything fails, no charge is applied.
            </p>
        </section>
    );
};

export default OverdueRentTable;
