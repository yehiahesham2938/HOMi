import './UpcomingPayment.css';
import { FaArrowRight, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

interface UpcomingPaymentProps {
    amount: number;
    dueDate: string;
    dueInLabel: string;
    dueTone: 'safe' | 'urgent';
    onPayNow: () => void;
    onTopUp: () => void;
    isPaying: boolean;
    isCurrentCyclePaid: boolean;
    outstandingInstallments: number;
    estimatedLateFee: number;
    totalDue: number;
    /**
     * `true` when the tenant has more than one outstanding rent installment OR
     * any overdue one. The detailed breakdown is rendered by
     * `OverdueRentTable` below the card; here we just shift the messaging so
     * the user knows to scroll down to the arrears section.
     */
    isInArrears?: boolean;
}

/**
 * The Upcoming Payment card has three explicit visual states:
 *  • "Paid"   — current month already settled (green card, no action button)
 *  • "Due"    — exactly one rent installment is open and on/before its due
 *               date (blue card with "Pay Now")
 *  • "Arrears" — multiple unpaid months and/or an overdue one (red card,
 *               points the user to the inline arrears table that handles
 *               the actual payment flow)
 */
const UpcomingPayment = ({
    amount,
    dueDate,
    dueInLabel,
    dueTone,
    onPayNow,
    onTopUp,
    isPaying,
    isCurrentCyclePaid,
    outstandingInstallments,
    estimatedLateFee,
    totalDue,
    isInArrears = false,
}: UpcomingPaymentProps) => {
    const cardState: 'paid' | 'arrears' | 'due' = (() => {
        if (isCurrentCyclePaid) return 'paid';
        if (isInArrears) return 'arrears';
        return 'due';
    })();

    const tagLabel = (() => {
        if (cardState === 'paid') return 'Paid';
        if (cardState === 'arrears') return 'Arrears';
        if (!dueInLabel) return 'Due Soon';
        if (dueInLabel === 'today') return 'Due Today';
        if (dueInLabel.includes('overdue')) return dueInLabel.charAt(0).toUpperCase() + dueInLabel.slice(1);
        return `Due in ${dueInLabel}`;
    })();

    const tagTone = cardState === 'paid' ? 'safe' : cardState === 'arrears' ? 'danger' : dueTone;

    return (
        <div className={`payment-card state-${cardState}`}>
            <div className="payment-header">
                <h3>{cardState === 'paid' ? 'Rent Settled' : 'Upcoming Payment'}</h3>
                <span className={`due-tag ${tagTone}`}>{tagLabel}</span>
            </div>
            <div className="amount-display">
                <span className="currency">$</span>
                <span className="value">{amount.toLocaleString()}</span>
            </div>
            <div className="payment-details">
                <div className="detail-row">
                    <span>{cardState === 'paid' ? 'Next Due' : 'Due Date'}</span>
                    <strong>{dueDate}</strong>
                </div>
                <div className="detail-row">
                    <span>Payment Method</span>
                    <strong>Wallet Balance</strong>
                </div>
                {cardState === 'arrears' && outstandingInstallments > 1 && (
                    <div className="detail-row arrears">
                        <span>Outstanding Months</span>
                        <strong>{outstandingInstallments} installments</strong>
                    </div>
                )}
                {cardState === 'arrears' && estimatedLateFee > 0 && (
                    <div className="detail-row arrears">
                        <span>Estimated Late Fees</span>
                        <strong>${estimatedLateFee.toLocaleString()}</strong>
                    </div>
                )}
            </div>

            {cardState === 'paid' && (
                <div className="paid-banner" role="status">
                    <FaCheckCircle aria-hidden="true" />
                    <div>
                        <strong>You're all caught up</strong>
                        <small>This month's rent has been settled. We'll show your next payment when the cycle rolls over.</small>
                    </div>
                </div>
            )}



            {cardState === 'arrears' ? (
                <button className="pay-now-btn arrears-btn" onClick={onPayNow} disabled={isPaying}>
                    <FaExclamationTriangle aria-hidden="true" />
                    {isPaying ? 'Processing...' : 'Pay Now'}
                </button>
            ) : (
                <button className="pay-now-btn" onClick={onPayNow} disabled={isPaying || isCurrentCyclePaid}>
                    {cardState === 'paid'
                        ? 'No Outstanding Dues'
                        : isPaying
                            ? 'Processing...'
                            : 'Pay Now'}
                    {cardState === 'due' && !isPaying && <FaArrowRight aria-hidden="true" />}
                </button>
            )}

            <button className="pay-now-btn secondary" onClick={onTopUp} disabled={isPaying}>
                Top Up Wallet
            </button>

            <p className="autopay-note">
                {cardState === 'arrears'
                    ? 'Scroll down to review every unpaid month, late fees, and the total before settling.'
                    : cardState === 'paid'
                        ? 'Autopay is active for this lease — your wallet will keep covering rent automatically.'
                        : 'Once this month\'s rent is paid, the next due date moves to the following monthly cycle.'}
            </p>
        </div>
    );
};

export default UpcomingPayment;
