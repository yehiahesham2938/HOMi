import { useTranslation } from 'react-i18next';
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
    isTerminationApproved?: boolean;
}

const getLocalizedDueInLabel = (label: string, lang: string): string => {
    if (!label) return '';
    if (label === 'today') return lang === 'ar' ? 'اليوم' : 'today';
    const match = label.match(/^(\d+)\s+days?(?:\s+overdue)?$/i);
    if (!match) return label;
    const count = parseInt(match[1], 10);
    const isOverdue = label.toLowerCase().includes('overdue');
    if (lang === 'ar') {
        if (isOverdue) {
            if (count === 1) return 'متأخر يوم واحد';
            if (count === 2) return 'متأخر يومين';
            if (count <= 10) return `متأخر منذ ${count} أيام`;
            return `متأخر منذ ${count} يوماً`;
        } else {
            if (count === 1) return 'خلال يوم';
            if (count === 2) return 'خلال يومين';
            if (count <= 10) return `خلال ${count} أيام`;
            return `خلال ${count} يوماً`;
        }
    } else {
        if (isOverdue) {
            return `${count} day${count === 1 ? '' : 's'} overdue`;
        } else {
            return `Due in ${count} day${count === 1 ? '' : 's'}`;
        }
    }
};

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
    isTerminationApproved = false,
}: UpcomingPaymentProps) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const cardState: 'paid' | 'arrears' | 'due' = (() => {
        if (isCurrentCyclePaid) return 'paid';
        if (isInArrears) return 'arrears';
        return 'due';
    })();

    const tagLabel = (() => {
        if (cardState === 'paid') return t('activeRental.paid');
        if (cardState === 'arrears') return t('activeRental.arrears');
        if (!dueInLabel) return t('activeRental.dueSoon');
        return getLocalizedDueInLabel(dueInLabel, currentLang);
    })();

    const tagTone = cardState === 'paid' ? 'safe' : cardState === 'arrears' ? 'danger' : dueTone;

    return (
        <div className={`payment-card state-${cardState}`} dir="ltr">
            <div className="payment-header">
                <h3>{cardState === 'paid' ? t('activeRental.rentSettled') : t('activeRental.upcomingPayment')}</h3>
                <span className={`due-tag ${tagTone}`}>{tagLabel}</span>
            </div>
            <div className="amount-display">
                <span className="currency">$</span>
                <span className="value">{amount.toLocaleString()}</span>
            </div>

            {isTerminationApproved && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#b45309',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    margin: '8px 0 16px 0',
                    textAlign: 'center',
                    fontWeight: 500
                }}>
                    {currentLang === 'ar' 
                        ? '(هذه هي الدفعة الأخيرة قبل إنهاء العقد، ولا توجد دفعات قادمة)' 
                        : '(this is the last payment before termination, no upcoming payments)'}
                </div>
            )}
            <div className="payment-details">
                <div className="detail-row">
                    <span>{cardState === 'paid' ? t('activeRental.nextDue') : t('activeRental.dueDate')}</span>
                    <strong>{dueDate}</strong>
                </div>
                <div className="detail-row">
                    <span>{t('activeRental.paymentMethod')}</span>
                    <strong>{t('activeRental.walletBalanceLabel')}</strong>
                </div>
                {cardState === 'arrears' && outstandingInstallments > 1 && (
                    <div className="detail-row arrears">
                        <span>{t('activeRental.outstandingMonths')}</span>
                        <strong>{t('activeRental.installmentsCount', { count: outstandingInstallments })}</strong>
                    </div>
                )}
                {cardState === 'arrears' && estimatedLateFee > 0 && (
                    <div className="detail-row arrears">
                        <span>{t('activeRental.estimatedLateFees')}</span>
                        <strong>${estimatedLateFee.toLocaleString()}</strong>
                    </div>
                )}
            </div>

            {cardState === 'paid' && (
                <div className="paid-banner" role="status">
                    <FaCheckCircle aria-hidden="true" />
                    <div>
                        <strong>{t('activeRental.caughtUpTitle')}</strong>
                        <small>{t('activeRental.caughtUpSubtitle')}</small>
                    </div>
                </div>
            )}

            {cardState === 'arrears' ? (
                <button className="pay-now-btn arrears-btn" onClick={onPayNow} disabled={isPaying}>
                    <FaExclamationTriangle aria-hidden="true" />
                    {isPaying ? t('activeRental.processing') : t('activeRental.payNow')}
                </button>
            ) : (
                <button className="pay-now-btn" onClick={onPayNow} disabled={isPaying || isCurrentCyclePaid}>
                    {cardState === 'paid'
                        ? t('activeRental.noOutstandingDues')
                        : isPaying
                            ? t('activeRental.processing')
                            : t('activeRental.payNow')}
                    {cardState === 'due' && !isPaying && <FaArrowRight aria-hidden="true" />}
                </button>
            )}

            <button className="pay-now-btn secondary" onClick={onTopUp} disabled={isPaying}>
                {t('activeRental.topUpWallet')}
            </button>

            <p className="autopay-note">
                {cardState === 'arrears'
                    ? t('activeRental.arrearsNote')
                    : cardState === 'paid'
                        ? t('activeRental.autopayNote')
                        : t('activeRental.dueNote')}
            </p>
        </div>
    );
};

export default UpcomingPayment;
