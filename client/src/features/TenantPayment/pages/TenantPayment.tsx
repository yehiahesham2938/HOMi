import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import {
    LayoutDashboard,
    CalendarClock,
    History,
    CreditCard,
    FileSearch,
    Download,
    Plus,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    Wallet,
    Receipt,
    ShieldCheck,
    TrendingUp,
    MoreVertical,
    MapPin,
    Loader2,
    X,
    Landmark,
    SearchX,
    CalendarX,
    ArrowLeft,
    Lock,
    Search,
    Building2,
    Filter,
    Wrench,
} from 'lucide-react';
import './TenantPayment.css';
import CreditCardModal from '../components/CreditCardModal';
import InstallmentsModal from '../../ActiveRental/components/InstallmentsModal';
import contractService, {
    type LandlordContract,
    type WalletTopupPaymentMethod,
    type TenantPaymentHistoryItem,
} from '../../../services/contract.service';
import rentalRequestService, { type MyRentalRequest } from '../../../services/rental-request.service';
import { authService } from '../../../services/auth.service';
import paymentMethodService, { type SavedPaymentMethod } from '../../../services/payment-method.service';
import maintenanceService, { type MaintenanceRequest } from '../../../services/maintenance.service';
import {
    getPrepaidInstallmentsCount,
    getRentCycleSummary,
    getRentInstallmentStats,
} from '../utils/rentSchedule';

type TabType = 'overview' | 'upcoming' | 'history' | 'topup' | 'methods' | 'pending' | 'receipt' | 'deposits' | 'maintenance';

const formatMoney = (amount: number): string =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatShortDate = (isoDate: string): string => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
};

const formatLongDate = (isoDate: string): string => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};

const TenantPayment: React.FC = () => {
    const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Payment completed successfully.');

    const location = useLocation();
    const navigate = useNavigate();
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dataError, setDataError] = useState<string | null>(null);
    const [tenantContracts, setTenantContracts] = useState<LandlordContract[]>([]);
    const [tenantRequests, setTenantRequests] = useState<MyRentalRequest[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<TenantPaymentHistoryItem[]>([]);
    const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [depositSearchTerm, setDepositSearchTerm] = useState('');
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
    const [maintenanceSearchTerm, setMaintenanceSearchTerm] = useState('');

    const [installmentsTarget, setInstallmentsTarget] = useState<{ contractId: string; title: string } | null>(null);

    const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [topupMethod, setTopupMethod] = useState<WalletTopupPaymentMethod>('CARD');
    const [topupSaveCard, setTopupSaveCard] = useState(false);
    const [topupError, setTopupError] = useState<string | null>(null);
    const [isTopupStarting, setIsTopupStarting] = useState(false);
    const [isTopupVerifying, setIsTopupVerifying] = useState(false);
    const topupVerifiedRef = useRef(false);
    const [paymentActionError, setPaymentActionError] = useState<string | null>(null);
    const [paymentReviewData, setPaymentReviewData] = useState<{
        contractId: string;
        propertyTitle: string;
        rent: number;
        deposit: number;
        serviceFee: number;
        total: number;
        isMonthlyInstallment?: boolean;
        lateFee?: number;
        credit?: number;
        payableCount?: number;
    } | null>(null);

    const tenantProfile = authService.getCurrentUser()?.profile;
    const accountHolderName = `${tenantProfile?.firstName ?? ''} ${tenantProfile?.lastName ?? ''}`.trim() || 'Account Holder';

    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab as TabType);
        }
        if (location.state?.paymentReviewData) {
            setPaymentReviewData(location.state.paymentReviewData);
            setActiveTab('receipt');
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        const allowedTabs: TabType[] = ['overview', 'upcoming', 'history', 'topup', 'methods', 'pending'];

        if (tab && allowedTabs.includes(tab as TabType)) {
            setActiveTab(tab as TabType);
        }
    }, [location.search]);

    const loadPaymentData = async () => {
        setIsLoadingData(true);
        setDataError(null);

        try {
            const [contractsRes, requestsRes, methods, wallet, history, maintRes] = await Promise.all([
                contractService.getTenantContracts({ page: 1, limit: 50 }),
                rentalRequestService.getMyRequests({ page: 1, limit: 50 }),
                paymentMethodService.getMyMethods(),
                contractService.getWalletBalance(),
                contractService.getPaymentHistory(120),
                maintenanceService.listTenantRequests().catch(() => []),
            ]);

            setTenantContracts(contractsRes.data ?? []);
            setTenantRequests(requestsRes.data ?? []);
            setPaymentHistory(history ?? []);
            setSavedMethods(methods);
            setWalletBalance(Number(wallet.balance ?? 0));
            setMaintenanceRequests(maintRes ?? []);
            setPaymentActionError(null);
        } catch {
            setDataError('Could not load latest payment data.');
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        void loadPaymentData();
        const handler = () => { void loadPaymentData(); };
        globalThis.addEventListener('homi:testing-clock-changed', handler);
        return () => globalThis.removeEventListener('homi:testing-clock-changed', handler);
    }, []);

    useEffect(() => {
        if (topupVerifiedRef.current) return;

        const params = new URLSearchParams(location.search);
        const walletTopupFlag = params.get('walletTopup');

        if (walletTopupFlag !== '1') return;

        // ── Diagnostic: dump everything Paymob sent back ──────────────────
        const successFlag = params.get('success');
        const pendingFlag = params.get('pending');
        const isVoidedFlag = params.get('is_voided');
        const transactionIdRaw = params.get('id') || params.get('transaction_id') || '';
        const transactionId = Number(transactionIdRaw);

        console.log('[WalletTopup] Paymob redirect received:', {
            fullSearch: location.search,
            successFlag,
            pendingFlag,
            isVoidedFlag,
            transactionIdRaw,
            transactionId,
            allParams: Object.fromEntries(params.entries()),
        });
        // ─────────────────────────────────────────────────────────────────

        setActiveTab('topup');

        // No transaction ID → cannot verify anything
        if (!transactionIdRaw || !Number.isFinite(transactionId) || transactionId <= 0) {
            console.warn('[WalletTopup] No valid transaction ID in redirect — cannot verify.');
            setTopupError('Payment callback is missing the transaction ID. Please contact support.');
            const cleanUrl = `${location.pathname}`;
            globalThis.history.replaceState({}, document.title, cleanUrl);
            return;
        }

        // ── ALWAYS verify server-side when a transaction ID exists ────────
        // Do NOT trust success=false from the redirect URL. Paymob's own docs
        // say redirect params are for UX only. The server-side verify call
        // is authoritative — especially in sandbox/test mode where the ACS
        // emulator often redirects with success=false even for succeeded payments.
        // ─────────────────────────────────────────────────────────────────
        console.log('[WalletTopup] Attempting server-side verification for transactionId:', transactionId);

        topupVerifiedRef.current = true;

        const doVerify = async () => {
            // Auth retry: AuthGuard restores token async, so wait if needed
            let accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                console.log('[WalletTopup] No token yet, waiting 2s for session restore...');
                await new Promise<void>((resolve) => setTimeout(resolve, 2000));
                accessToken = localStorage.getItem('accessToken');
            }

            if (!accessToken) {
                console.warn('[WalletTopup] Still no access token after wait. Aborting.');
                setTopupError('Session expired. Please log in and try again.');
                const cleanUrl = `${location.pathname}`;
                globalThis.history.replaceState({}, document.title, cleanUrl);
                return;
            }

            setIsTopupVerifying(true);
            try {
                console.log('[WalletTopup] Calling verifyWalletTopup with transactionId:', transactionId);

                // Paymob upstream can occasionally time out; retry once on timeout.
                // The backend records each successful verification and treats
                // duplicate calls as idempotent, so this is safe.
                let response: Awaited<ReturnType<typeof contractService.verifyWalletTopup>>;
                try {
                    response = await contractService.verifyWalletTopup(transactionId);
                } catch (firstErr: any) {
                    const isTimeout = firstErr?.code === 'ECONNABORTED' || /timeout/i.test(firstErr?.message ?? '');
                    if (!isTimeout) throw firstErr;
                    console.warn('[WalletTopup] First verify attempt timed out — retrying once.');
                    response = await contractService.verifyWalletTopup(transactionId);
                }

                console.log('[WalletTopup] Verification success! New balance:', response.balance);
                setWalletBalance(Number(response.balance ?? 0));
                setTopupError(null);
                setSuccessMessage('Wallet top-up completed successfully.');
                setShowSuccessToast(true);
                await loadPaymentData();
            } catch (err: unknown) {
                console.error('[WalletTopup] Server-side verification failed:', err);
                const ex = err as { code?: string; message?: string; response?: { data?: { message?: string } } };
                const serverMsg = ex.response?.data?.message;
                const isTimeout = ex.code === 'ECONNABORTED' || /timeout/i.test(ex.message ?? '');
                console.error('[WalletTopup] Server error message:', serverMsg);
                setTopupError(
                    typeof serverMsg === 'string' && serverMsg.trim()
                        ? serverMsg
                        : isTimeout
                            ? 'Payment provider is slow right now. The payment may already be credited — refresh the page in a minute and your balance should update. If not, retry the top-up.'
                            : 'Wallet top-up verification failed. Please retry.'
                );
            } finally {
                setIsTopupVerifying(false);
                const cleanUrl = `${location.pathname}`;
                globalThis.history.replaceState({}, document.title, cleanUrl);
            }
        };

        void doVerify();
    }, [location.pathname, location.search]);

    // const activeContract = useMemo(
    //     () => tenantContracts.find((c) => ['ACTIVE', 'PENDING_PAYMENT', 'PENDING_TENANT'].includes(c.status)),
    //     [tenantContracts]
    // );

    const pendingPaymentContract = useMemo(
        () => tenantContracts.find((c) => c.status === 'PENDING_PAYMENT'),
        [tenantContracts]
    );

    const hasCurrentBalance = walletBalance > 0;
    const activeContracts = useMemo(
        () =>
            tenantContracts.filter((contract) => {
                if (contract.status === 'ACTIVE') return true;
                if (contract.status !== 'EXPIRED') return false;
                const stats = getRentInstallmentStats(contract);
                const paidInstallments = paymentHistory
                    .filter((row) =>
                        row.type === 'RENT_MONTHLY' &&
                        row.direction === 'DEBIT' &&
                        row.entityId === contract.id
                    )
                    .reduce((sum, row) => sum + Math.max(Number(row.installmentsCount ?? 1), 1), getPrepaidInstallmentsCount(contract));
                return Math.max(stats.dueCount - paidInstallments, 0) > 0;
            }),
        [tenantContracts, paymentHistory]
    );
    const nextUnpaidRent = useMemo(() => {
        const ranked = activeContracts.map((contract) => ({
            contract,
            cycle: getRentCycleSummary(contract),
        }));

        ranked.sort((a, b) => a.cycle.dueDate.getTime() - b.cycle.dueDate.getTime());
        return ranked[0] ?? null;
    }, [activeContracts]);
    const hasNextRent = activeContracts.length > 0;

    const getTotalContractCharge = (contract: LandlordContract): number => {
        const rent = Number(contract.rentAmount ?? contract.property?.monthlyPrice ?? 0);
        const deposit = Number(contract.securityDeposit ?? contract.property?.securityDeposit ?? 0);
        const serviceFee = 10;
        return rent + deposit + serviceFee;
    };

    const nextRentAmount = Number(
        nextUnpaidRent?.contract.rentAmount ?? nextUnpaidRent?.contract.property?.monthlyPrice ?? 0
    );
    const paidContracts = tenantContracts.filter((c) => c.status === 'ACTIVE');
    const annualSpendAmount = paidContracts.reduce((sum, c) => sum + Number(c.rentAmount ?? c.property?.monthlyPrice ?? 0), 0);
    const hasAnnualSpend = paidContracts.length > 0;

    const pendingTotalDue = pendingPaymentContract ? getTotalContractCharge(pendingPaymentContract) : 0;
    const canAffordPendingPayment = walletBalance >= pendingTotalDue;

    const hasUpcomingPayments = activeContracts.length > 0 || Boolean(pendingPaymentContract);
    const hasPaymentHistory = paymentHistory.length > 0;
    const hasPendingRequests = tenantRequests.some((r) => r.status === 'APPROVED' || r.status === 'PENDING');

    const tenantDeposits = useMemo(() => {
        return tenantContracts
            .filter((c) => Number(c.securityDeposit ?? c.property?.securityDeposit ?? 0) > 0)
            .map((c) => {
                const propertyTitle = c.property?.title || 'Property';
                const amount = Number(c.securityDeposit ?? c.property?.securityDeposit ?? 0);
                const date = c.moveInDate || c.createdAt;

                let status: 'HELD' | 'REFUNDED' | 'FORFEITED' | 'PENDING' | 'SPLIT' = 'PENDING';
                if (c.depositStatus) {
                    status = c.depositStatus as any;
                } else {
                    if (c.status === 'ACTIVE') status = 'HELD';
                    else if (c.status === 'EXPIRED') status = 'REFUNDED';
                    else if (c.status === 'TERMINATED') status = 'FORFEITED';
                    else if (c.status === 'PENDING_PAYMENT') status = 'PENDING';
                }

                return { id: c.id, propertyTitle, amount, status, date };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [tenantContracts]);

    const filteredTenantDeposits = useMemo(() => {
        const q = depositSearchTerm.trim().toLowerCase();
        if (!q) return tenantDeposits;
        return tenantDeposits.filter((item) => item.propertyTitle.toLowerCase().includes(q));
    }, [tenantDeposits, depositSearchTerm]);

    const maintenancePayments = useMemo(() => {
        return maintenanceRequests
            .filter((req) => req.chargeParty === 'TENANT' && req.agreedPrice !== null)
            .map((req) => {
                const landlordName = req.landlord ? `${req.landlord.firstName ?? ''} ${req.landlord.lastName ?? ''}`.trim() : 'Landlord';
                const propertyTitle = req.property?.title || 'Property';
                const providerName = req.provider ? `${req.provider.firstName ?? ''} ${req.provider.lastName ?? ''}`.trim() : 'Provider';

                let statusBadge = 'Escrowed';
                if (req.status === 'COMPLETED' || req.status === 'RESOLVED_BY_ADMIN') {
                    statusBadge = 'Released';
                } else if (req.status === 'CANCELLED') {
                    statusBadge = 'Refunded';
                }

                return {
                    id: req.id,
                    title: req.title,
                    category: req.category,
                    landlordName,
                    propertyTitle,
                    providerName,
                    amount: req.agreedPrice ?? 0,
                    date: req.providerCompletedAt || req.updatedAt || req.createdAt,
                    statusBadge,
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [maintenanceRequests]);

    const getNextDueDateLabel = (): string => {
        if (!nextUnpaidRent) return 'No active lease';
        const nextCycle = nextUnpaidRent.cycle;
        return `Due in ${nextCycle.daysUntilDue} day${nextCycle.daysUntilDue === 1 ? '' : 's'} (${formatShortDate(nextCycle.dueDate.toISOString())})`;
    };

    const upcomingPayments = useMemo(() => {
        const rows: Array<{
            contractId: string;
            title: string;
            propertyTitle: string;
            date: string;
            amount: number;
            status: 'Active' | 'Scheduled' | 'Ended';
            dueAt: number;
            canPay: boolean;
            outstandingInstallments: number;
            estimatedLateFee: number;
        }> = [];

        if (pendingPaymentContract) {
            rows.push({
                contractId: pendingPaymentContract.id,
                title: 'Initial Contract Payment',
                propertyTitle: pendingPaymentContract.property?.title ?? 'Property',
                date: formatShortDate(new Date().toISOString()),
                amount: getTotalContractCharge(pendingPaymentContract),
                status: 'Active',
                dueAt: Date.now(),
                canPay: true,
                outstandingInstallments: 1,
                estimatedLateFee: 0,
            });
        }

        activeContracts.forEach((contract) => {
            const stats = getRentInstallmentStats(contract);
            const paidInstallments = paymentHistory
                .filter((row) =>
                    row.type === 'RENT_MONTHLY' &&
                    row.direction === 'DEBIT' &&
                    row.entityId === contract.id
                )
                .reduce((sum, row) => sum + Math.max(Number(row.installmentsCount ?? 1), 1), getPrepaidInstallmentsCount(contract));
            const outstandingInstallments = Math.max(stats.dueCount - paidInstallments, 0);

            if (outstandingInstallments <= 0) {
                return;
            }

            const cycle = getRentCycleSummary(contract);
            const amount = Number(contract.rentAmount ?? contract.property?.monthlyPrice ?? 0);
            const overdueOutstanding = Math.max(stats.overdueCount - paidInstallments, 0);
            const lateFeePerInstallment = Math.max(Number(contract.lateFeeAmount ?? 0), 0);
            const estimatedLateFee = overdueOutstanding * lateFeePerInstallment;
            const totalAmount = Math.max(outstandingInstallments, 1) * amount + estimatedLateFee;
            const isEnded = contract.status === 'EXPIRED';
            const titleSuffix = isEnded ? ' (Lease Ended)' : '';
            rows.push({
                contractId: contract.id,
                title: (outstandingInstallments > 1
                    ? `${outstandingInstallments} Unpaid Rent Installments`
                    : `${cycle.dueDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} Rent`) + titleSuffix,
                propertyTitle: contract.property?.title ?? 'Property',
                date: formatShortDate(cycle.dueDate.toISOString()),
                amount: totalAmount,
                status: isEnded ? 'Ended' : 'Scheduled',
                dueAt: cycle.dueDate.getTime(),
                canPay: !cycle.isPaidForCurrentCycle || isEnded,
                outstandingInstallments,
                estimatedLateFee,
            });
        });

        return rows.sort((a, b) => a.dueAt - b.dueAt);
    }, [activeContracts, pendingPaymentContract, paymentHistory]);

    const historyRows = [...paymentHistory]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((row) => ({
            date: formatLongDate(row.createdAt),
            ref: row.description || row.reference,
            amount: Number(row.amount ?? 0),
            direction: row.direction,
            status: row.status === 'SUCCESS' ? 'Success' : 'Failed',
        }));

    const contractsByRentalRequestId = useMemo(() => {
        const map = new Map<string, LandlordContract>();
        tenantContracts.forEach((contract) => {
            const requestId = contract.rentalRequestId;
            if (requestId) {
                map.set(requestId, contract);
            }
        });
        return map;
    }, [tenantContracts]);

    const requestCards = tenantRequests
        .filter((r) => r.status === 'APPROVED' || r.status === 'PENDING')
        .map((r) => {
            const relatedContract = contractsByRentalRequestId.get(r.id);
            const rent = Number(relatedContract?.rentAmount ?? r.property.monthlyPrice ?? 0);
            const deposit = Number(relatedContract?.securityDeposit ?? r.property.securityDeposit ?? 0);
            const serviceFee = Number(relatedContract?.serviceFee ?? 10);
            const totalDue = rent + deposit + serviceFee;
            const contractStatus = relatedContract?.status;
            const paymentStatus = relatedContract?.paymentStatus;

            let statusLabel = r.status === 'APPROVED' ? 'Accepted' : 'Pending';
            if (contractStatus === 'ACTIVE') statusLabel = 'Active Lease';
            else if (contractStatus === 'PENDING_PAYMENT') statusLabel = 'Awaiting Payment';
            else if (contractStatus === 'PENDING_TENANT') statusLabel = 'Awaiting Signature';
            else if (contractStatus === 'EXPIRED') statusLabel = 'Lease Ended';
            else if (contractStatus === 'TERMINATED') statusLabel = 'Lease Terminated';

            return {
                id: r.id,
                property: r.property.title,
                status: statusLabel,
                loc: r.property.address,
                rent,
                deposit,
                serviceFee,
                totalDue,
                contractId: relatedContract?.id ?? null,
                contractStatus: contractStatus ?? null,
                paymentStatus: paymentStatus ?? null,
                paymentVerifiedAt: relatedContract?.paymentVerifiedAt ?? null,
            };
        });

    const successfulPaymentsLabel = `${historyRows.length} successful payment${historyRows.length === 1 ? '' : 's'}`;
    const hasSavedMethods = savedMethods.length > 0;
    const primaryMethod = savedMethods.find((m) => m.isDefault) ?? savedMethods[0] ?? null;

    const handlePaymentMethodSaved = (created: SavedPaymentMethod) => {
        setSavedMethods((prev) => {
            const withoutDuplicates = prev.filter((m) => m.id !== created.id);
            return [created, ...withoutDuplicates];
        });
    };

    const handlePayFromBalance = async (contractId?: string) => {
        const targetContractId = contractId ?? pendingPaymentContract?.id;
        if (!targetContractId) return;

        const isInstallment = paymentReviewData?.isMonthlyInstallment;
        const targetRequiredAmount = paymentReviewData ? paymentReviewData.total : pendingTotalDue;

        if (walletBalance < targetRequiredAmount) {
            setPaymentActionError('Insufficient wallet balance to complete this payment.');
            return;
        }

        setIsProcessingPayment(true);
        setPaymentActionError(null);

        try {
            let result;
            if (isInstallment) {
                result = await contractService.payMonthlyRentFromBalance(targetContractId);
            } else {
                result = await contractService.payContractFromBalance(targetContractId);
            }
            setWalletBalance(Number(result.remainingBalance ?? 0));
            setSuccessMessage(`Payment of ${formatMoney(Number(result.debitedAmount ?? 0))} deducted from your wallet successfully.`);
            setShowSuccessToast(true);
            setPaymentReviewData(null);
            await loadPaymentData();
            setActiveTab('history');
        } catch (error: unknown) {
            const ex = error as { response?: { data?: { message?: string } } };
            const message = ex.response?.data?.message || 'Could not complete payment from balance.';
            setPaymentActionError(message);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const renderReceipt = () => {
        if (!paymentReviewData) return null;
        const {
            propertyTitle,
            rent,
            deposit,
            serviceFee,
            total,
            contractId,
            isMonthlyInstallment = false,
            lateFee = 0,
            credit = 0,
            payableCount = 1,
        } = paymentReviewData;

        return (
            <div className="tab-viewport animate-fade-up">
                <div className="checkout-distributed-layout">
                    <div className="checkout-main-content">
                        <header className="checkout-page-header">
                            <button className="back-button-link" onClick={() => { setPaymentReviewData(null); setActiveTab(isMonthlyInstallment ? 'upcoming' : 'pending'); }}>
                                <ArrowLeft size={16} /> Back to {isMonthlyInstallment ? 'Upcoming Payments' : 'Applications'}
                            </button>
                            <h2>Complete Your Payment</h2>
                            <p>{isMonthlyInstallment ? 'Review your monthly rent installment details and confirm payment.' : 'Review the breakdown below and confirm your lease execution.'}</p>
                        </header>

                        <div className="checkout-sections-stack">
                            <section className="checkout-block">
                                <div className="block-header">
                                    <div className="icon-circle"><FileSearch size={18} /></div>
                                    <h3>Lease Details</h3>
                                </div>
                                <div className="property-summary-box">
                                    <div className="prop-details">
                                        <span className="prop-label">Contract For</span>
                                        <span className="prop-name">{propertyTitle}</span>
                                    </div>
                                    <div className="prop-status-badge">{isMonthlyInstallment ? 'Active Lease' : 'Approved'}</div>
                                </div>
                            </section>

                            <section className="checkout-block">
                                <div className="block-header">
                                    <div className="icon-circle"><Wallet size={18} /></div>
                                    <h3>Payment Source</h3>
                                </div>
                                <div className="wallet-summary-box">
                                    <div className="wallet-balance-info">
                                        <span className="balance-label">HOMi Wallet Balance</span>
                                        <span className="balance-value">{formatMoney(walletBalance)}</span>
                                    </div>
                                    <div className="wallet-status-indicator">
                                        {walletBalance < total ? (
                                            <button className="btn-topup-inline" onClick={() => { setPaymentReviewData(null); setActiveTab('topup'); }}>
                                                Add Funds
                                            </button>
                                        ) : (
                                            <span className="ready-to-pay"><CheckCircle2 size={16} /> Sufficient Funds</span>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section className="checkout-block">
                                <div className="block-header">
                                    <div className="icon-circle"><ShieldCheck size={18} /></div>
                                    <h3>Execution Terms</h3>
                                </div>
                                <div className="execution-terms-box">
                                    <p>
                                        {isMonthlyInstallment
                                            ? 'By clicking "Pay Rent", you authorize HOMi to settle the outstanding rent installment(s) from your wallet balance.'
                                            : 'By clicking "Pay & Execute", you agree to the lease terms and authorize HOMi to transfer the security deposit to the landlord\'s escrow account.'}
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>

                    <aside className="checkout-order-summary">
                        <div className="summary-sticky-card">
                            <h3 className="summary-title">Payment Summary</h3>

                            <div className="summary-rows">
                                {isMonthlyInstallment ? (
                                    <>
                                        <div className="summary-row-item">
                                            <span>Rent ({payableCount} month{payableCount === 1 ? '' : 's'})</span>
                                            <span>{formatMoney(rent)}</span>
                                        </div>
                                        {lateFee > 0 && (
                                            <div className="summary-row-item text-danger" style={{ color: '#ef4444' }}>
                                                <span>Late Fees</span>
                                                <span>{formatMoney(lateFee)}</span>
                                            </div>
                                        )}
                                        {credit > 0 && (
                                            <div className="summary-row-item text-success" style={{ color: '#10b981' }}>
                                                <span>Maintenance Credit</span>
                                                <span>−{formatMoney(credit)}</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="summary-row-item">
                                            <span>First Month Rent</span>
                                            <span>{formatMoney(rent)}</span>
                                        </div>
                                        <div className="summary-row-item">
                                            <span>Security Deposit</span>
                                            <span>{formatMoney(deposit)}</span>
                                        </div>
                                        <div className="summary-row-item">
                                            <span>Platform Service Fee</span>
                                            <span>{formatMoney(serviceFee)}</span>
                                        </div>
                                    </>
                                )}

                                <div className="summary-hr"></div>

                                <div className="summary-total-display">
                                    <div className="total-label-col">
                                        <span className="total-label">Total Amount</span>
                                        <span className="total-subtext">VAT Included</span>
                                    </div>
                                    <span className="total-value-big">{formatMoney(total)}</span>
                                </div>
                            </div>

                            <button
                                className="btn-execute-payment"
                                disabled={isProcessingPayment || walletBalance < total}
                                onClick={() => void handlePayFromBalance(contractId)}
                            >
                                {isProcessingPayment ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    isMonthlyInstallment ? 'Pay Rent' : 'Pay & Execute Contract'
                                )}
                            </button>

                            {walletBalance < total && (
                                <div className="insufficient-funds-alert">
                                    <p>Your wallet balance is insufficient for this payment.</p>
                                </div>
                            )}

                            {paymentActionError && (
                                <div className="checkout-error-msg">{paymentActionError}</div>
                            )}

                            <div className="checkout-security-badge">
                                <ShieldCheck size={14} />
                                Secure Encrypted Payment
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        );
    };

    const handleStartTopup = async () => {
        const amount = Number(topupAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setTopupError('Please enter a valid amount greater than 0.');
            return;
        }

        setTopupError(null);
        setIsTopupStarting(true);

        try {
            const checkout = await contractService.initiateWalletTopup(amount, topupMethod, topupSaveCard);
            globalThis.location.href = checkout.checkoutUrl;
        } catch (error: unknown) {
            const ex = error as { response?: { data?: { message?: string } } };
            const backendMessage = ex.response?.data?.message;
            const fallback = 'Could not start Paymob top-up. Please try again.';
            setTopupError(typeof backendMessage === 'string' && backendMessage.trim() ? backendMessage : fallback);
        } finally {
            setIsTopupStarting(false);
        }
    };

    const getRequestActionLabel = (status: string): string => {
        if (status === 'Pending') return 'Under Review';
        if (status === 'Active Lease') return 'View Active Lease';
        if (status === 'Awaiting Signature') return 'Review Contract';
        if (status === 'Accepted') return 'Awaiting Contract';
        if (!pendingPaymentContract) return 'Awaiting Payment';
        if (isProcessingPayment) return 'Processing...';
        return 'Pay';
    };

    const renderOverview = () => (
        <div className="tab-viewport animate-fade-up">
            <div className="stats-mosaic">
                <div className="stat-card-featured">
                    {hasCurrentBalance && <div className="card-glass-overlay"></div>}
                    <div className="card-content">
                        <div className="icon-wrap-blur"><Wallet size={20} /></div>
                        <span>Wallet Balance</span>
                        <div className="amount-row">
                            <h2>{formatMoney(walletBalance)}</h2>
                            {hasCurrentBalance && <span className="mini-badge">Available</span>}
                        </div>
                        <p className={`card-footer-text ${hasCurrentBalance ? '' : 'opacity-70'}`}>
                            {hasCurrentBalance ? 'Available for pending payments' : 'Top up to pay pending contracts'}
                        </p>
                    </div>
                </div>

                <div className="stat-card-white">
                    <div className="card-header-row">
                        <span>Next Rent</span>
                        <TrendingUp size={16} className={hasNextRent ? 'text-success' : 'text-muted'} />
                    </div>
                    <div className="flex-baseline">
                        <h3 className={hasNextRent ? '' : 'text-muted'}>{formatMoney(hasNextRent ? nextRentAmount : 0)}</h3>
                        <span className="sub-label">/mo</span>
                    </div>
                    <div className="due-indicator">
                        {hasNextRent && <div className="pulse-dot"></div>}
                        <span className={hasNextRent ? '' : 'text-muted'}>
                            {hasNextRent ? getNextDueDateLabel() : 'No active lease'}
                        </span>
                    </div>
                </div>

                <div className="stat-card-white">
                    <div className="card-header-row">
                        <span>Annual Spend</span>
                        <Receipt size={16} className="text-slate" />
                    </div>
                    <h3 className={hasAnnualSpend ? '' : 'text-muted'}>{formatMoney(hasAnnualSpend ? annualSpendAmount : 0)}</h3>
                    <p className="sub-label-sm">{hasAnnualSpend ? successfulPaymentsLabel : 'No payments made yet'}</p>
                </div>
            </div>

            <div className="stripe-style-banner">
                <div className="banner-left">
                    <div className="banner-icon">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="banner-copy">
                        <h4>Pending contract payments are wallet-only</h4>
                        <p>Top up your balance with Paymob, then pay instantly from your wallet without external redirect during payment.</p>
                    </div>
                </div>
                <button className="btn-vercel-black" onClick={() => setActiveTab('topup')}>
                    Top Up Wallet <ArrowUpRight size={16} />
                </button>
            </div>
        </div>
    );

    const renderUpcoming = () => (
        <div className="tab-viewport animate-fade-up">
            {hasUpcomingPayments ? (
                <div className="list-container">
                    {upcomingPayments.map((item) => (
                        <div className="list-row" key={`${item.contractId}-${item.dueAt}-${item.title}`}>
                            <div className="row-main">
                                <div className="calendar-box">
                                    <span className="month">{item.date.split(' ')[0]}</span>
                                    <span className="day">{item.date.split(' ')[1]}</span>
                                </div>
                                <div className="row-text">
                                    <h5>{item.title}</h5>
                                    <p>
                                        {item.propertyTitle} - {item.status === 'Active'
                                            ? 'Awaiting wallet payment'
                                            : item.canPay
                                                ? item.outstandingInstallments > 1
                                                    ? `${item.outstandingInstallments} months unpaid (arrears)`
                                                    : 'Scheduled monthly rent'
                                                : 'Current cycle already paid'}
                                        {item.estimatedLateFee > 0 ? ` • Late fee est. ${formatMoney(item.estimatedLateFee)}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="row-actions">
                                <span className="row-amount">{formatMoney(item.amount)}</span>
                                <span className={`pill ${item.status === 'Ended' ? 'ended' : item.canPay ? 'scheduled' : 'success'}`}>
                                    {item.status === 'Ended' ? 'Ended (Late)' : item.canPay ? 'Scheduled' : 'Paid'}
                                </span>
                                {item.canPay && item.status !== 'Active' && (
                                    <button
                                        type="button"
                                        className="btn-pay-now"
                                        onClick={() => setInstallmentsTarget({ contractId: item.contractId, title: item.propertyTitle })}
                                    >
                                        Pay Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon"><CalendarX size={32} /></div>
                    <h4>No Upcoming Payments</h4>
                    <p>You don't have any upcoming rent or utility payments scheduled. Once your lease begins, they will appear here.</p>
                </div>
            )}
        </div>
    );

    const renderHistory = () => (
        <div className="tab-viewport animate-fade-up">
            {hasPaymentHistory ? (
                <div className="table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyRows.map((row) => (
                                <tr key={`${row.ref}-${row.date}`}>
                                    <td>{row.date}</td>
                                    <td className="font-medium">{row.ref}</td>
                                    <td>{row.direction === 'CREDIT' ? '+' : '-'} {formatMoney(row.amount)}</td>
                                    <td><span className="pill success">{row.status}</span></td>
                                    <td className="text-right">
                                        <button className="icon-btn"><Download size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon"><History size={32} /></div>
                    <h4>No Payment History</h4>
                    <p>You haven't made any payments on the platform yet. Past invoices and receipts will be stored securely here.</p>
                </div>
            )}
        </div>
    );

    const renderPending = () => (
        <div className="tab-viewport animate-fade-up">
            {hasPendingRequests ? (
                <>
                    <div className="grid-responsive">
                        {requestCards.map((req) => (
                            <div className="application-card-premium" key={req.id}>
                                <div className="app-card-top">
                                    <span className={`status-tag ${req.status.toLowerCase()}`}>
                                        {req.status === 'Accepted' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                        {req.status}
                                    </span>
                                    <button className="icon-btn"><MoreVertical size={16} /></button>
                                </div>
                                <div className="app-card-body">
                                    <h4>{req.property}</h4>
                                    <p className="location-tag"><MapPin size={12} /> {req.loc}</p>
                                </div>
                                <div className="app-card-footer">
                                    <div className="price-group payment-breakdown">
                                        <span className="payment-breakdown-title">Payment Details</span>
                                        <div className="payment-breakdown-row">
                                            <span>Rent</span>
                                            <span>{formatMoney(req.rent)}</span>
                                        </div>
                                        <div className="payment-breakdown-row">
                                            <span>Security Deposit</span>
                                            <span>{formatMoney(req.deposit)}</span>
                                        </div>
                                        <div className="payment-breakdown-row">
                                            <span>Service Fee</span>
                                            <span>{formatMoney(req.serviceFee)}</span>
                                        </div>
                                        <div className="payment-breakdown-total">
                                            <span>Total Due</span>
                                            <span>{formatMoney(req.totalDue)}</span>
                                        </div>
                                        {req.paymentStatus === 'PAID' && (
                                            <span className="payment-receipt-tag">
                                                Receipt Issued {req.paymentVerifiedAt ? `• ${formatLongDate(req.paymentVerifiedAt)}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="btn-app-action"
                                        disabled={
                                            isProcessingPayment ||
                                            req.status === 'Pending' ||
                                            req.status === 'Accepted' ||
                                            req.contractStatus === 'PENDING_TENANT'
                                        }
                                        onClick={() => {
                                            if (req.contractStatus === 'ACTIVE') {
                                                navigate('/actives');
                                                return;
                                            }
                                            if (req.contractStatus === 'PENDING_TENANT') {
                                                navigate('/tenant-contracts');
                                                return;
                                            }
                                            if (req.contractStatus === 'PENDING_PAYMENT' && req.contractId) {
                                                setPaymentReviewData({
                                                    contractId: req.contractId,
                                                    propertyTitle: req.property,
                                                    rent: req.rent,
                                                    deposit: req.deposit,
                                                    serviceFee: req.serviceFee,
                                                    total: req.totalDue
                                                });
                                                setActiveTab('receipt');
                                            }
                                        }}
                                    >
                                        {getRequestActionLabel(req.status)}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {paymentActionError && (
                        <div className="wallet-topup-message" style={{ marginTop: '16px' }}>
                            {paymentActionError}
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon"><SearchX size={32} /></div>
                    <h4>No Active Applications</h4>
                    <p>You haven't submitted any rental offers. Pending offers and approved lease payments will appear here.</p>
                </div>
            )}
        </div>
    );

    const renderDeposits = () => {
        if (tenantDeposits.length === 0) {
            return (
                <div className="tab-viewport animate-fade-up">
                    <div className="empty-state">
                        <div className="empty-icon"><Lock size={32} /></div>
                        <h4>No Security Deposits</h4>
                        <p>Security deposits from your lease agreements will appear here, showing their current escrow status.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="tab-viewport animate-fade-up">
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search property..."
                            value={depositSearchTerm}
                            onChange={(e) => setDepositSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-filter"><Filter size={16} /> Filter</button>
                </div>
                <div className="table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Property</th>
                                <th>Deposit Amount</th>
                                <th>Lease Start Date</th>
                                <th>Escrow Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTenantDeposits.map((item) => {
                                let badgeClass = 'pill';
                                let badgeStyle: React.CSSProperties = {};
                                let statusText = 'Awaiting Payment';
                                if (item.status === 'HELD') {
                                    badgeStyle = { background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    statusText = 'Held in Escrow';
                                } else if (item.status === 'REFUNDED') {
                                    badgeStyle = { background: '#e6fcf5', color: '#0ca678', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    statusText = 'Returned to You';
                                } else if (item.status === 'FORFEITED') {
                                    badgeStyle = { background: '#fef2f2', color: '#dc2626', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    statusText = 'Forfeited to Landlord';
                                } else if (item.status === 'SPLIT') {
                                    badgeStyle = { background: '#fef3c7', color: '#d97706', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    statusText = 'Split (Partial Refund)';
                                } else {
                                    badgeStyle = { background: '#fffbeb', color: '#92400e', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    statusText = 'Awaiting Payment';
                                }

                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="prop-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Building2 size={14} style={{ flexShrink: 0 }} />
                                                <span>{item.propertyTitle}</span>
                                            </div>
                                        </td>
                                        <td className="font-medium">{formatMoney(item.amount)}</td>
                                        <td>{formatLongDate(item.date)}</td>
                                        <td><span className={badgeClass} style={badgeStyle}>{statusText}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderMaintenance = () => {
        if (maintenancePayments.length === 0) {
            return (
                <div className="tab-viewport animate-fade-up">
                    <div className="empty-state">
                        <div className="empty-icon"><Wrench size={32} /></div>
                        <h4>No Maintenance Payments</h4>
                        <p>When you submit maintenance requests or pay for completed jobs, those records will appear here.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="tab-viewport animate-fade-up">
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search provider, property, or job..."
                            value={maintenanceSearchTerm}
                            onChange={(e) => setMaintenanceSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Job Title / Category</th>
                                <th>Property</th>
                                <th>Provider</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Payment Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maintenancePayments
                                .filter((item) =>
                                    item.providerName.toLowerCase().includes(maintenanceSearchTerm.toLowerCase()) ||
                                    item.propertyTitle.toLowerCase().includes(maintenanceSearchTerm.toLowerCase()) ||
                                    item.title.toLowerCase().includes(maintenanceSearchTerm.toLowerCase())
                                )
                                .map((item) => {
                                    let badgeStyle: React.CSSProperties = {};
                                    if (item.statusBadge === 'Released') {
                                        badgeStyle = { background: '#e6fcf5', color: '#0ca678', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    } else if (item.statusBadge === 'Refunded') {
                                        badgeStyle = { background: '#fef2f2', color: '#dc2626', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    } else if (item.statusBadge === 'Escrowed') {
                                        badgeStyle = { background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 };
                                    }

                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--saas-text-main)' }}>{item.title}</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize', marginTop: '2px' }}>
                                                        {item.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="prop-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Building2 size={14} style={{ flexShrink: 0 }} /> 
                                                    <span>{item.propertyTitle}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="user-info-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="avatar-mini" style={{
                                                        width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#475569',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700
                                                    }}>{item.providerName.charAt(0)}</div>
                                                    <span>{item.providerName}</span>
                                                </div>
                                            </td>
                                            <td className="font-medium">{formatMoney(item.amount)}</td>
                                            <td>{formatLongDate(item.date)}</td>
                                            <td>
                                                <span className="pill" style={badgeStyle}>
                                                    {item.statusBadge}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderMethods = () => (
        <div className="tab-viewport animate-fade-in">
            <div className="methods-viewport">
                {hasSavedMethods ? (
                    <div className="card-visual bank-account">
                        <div className="card-top-row">
                            <span className="bank-logo">{primaryMethod?.brand?.toUpperCase() ?? 'CARD'}</span>
                            <div className="chip-gold"></div>
                        </div>
                        <div className="card-mid-row">
                            <div className="iban-display">•••• •••• •••• {primaryMethod?.last4 ?? '0000'}</div>
                        </div>
                        <div className="card-bottom-row">
                            <span className="card-holder-label">Account Holder</span>
                            <span className="card-holder-name">{primaryMethod?.cardholderName ?? accountHolderName}</span>
                        </div>
                    </div>
                ) : (
                    <div className="card-visual empty-card">
                        <div className="empty-card-content">
                            <CreditCard size={32} className="empty-card-icon" />
                            <span>No Methods Added</span>
                        </div>
                    </div>
                )}

                <div className="methods-list-side">
                    {hasSavedMethods ? (
                        <div className="method-entry active">
                            <div className="method-icon-wrap"><Landmark size={20} /></div>
                            <div className="method-info-text">
                                <h5>{primaryMethod?.brand?.toUpperCase() ?? 'Card'} •••• {primaryMethod?.last4 ?? '0000'}</h5>
                                <p>{primaryMethod?.isDefault ? 'Primary payment method' : 'Saved payment method'}</p>
                            </div>
                            <CheckCircle2 size={18} className="ml-auto text-success" />
                        </div>
                    ) : (
                        <div className="empty-method-text" style={{ marginBottom: '20px', color: '#64748b' }}>
                            <p>You haven't linked a payment method yet. Add a credit card or bank account to quickly manage future payment options.</p>
                        </div>
                    )}

                    <button className="btn-add-method" onClick={() => setIsMethodModalOpen(true)}>
                        <Plus size={18} /> Add New Payment Method
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTopUp = () => (
        <div className="tab-viewport animate-fade-up">
            <div className="wallet-topup-card">
                <div className="wallet-topup-header">
                    <div>
                        <h3>Wallet Balance</h3>
                        <p>Top up with Paymob, then complete pending payments directly from wallet balance.</p>
                    </div>
                    <div className="wallet-balance-pill">{formatMoney(walletBalance)}</div>
                </div>

                <div className="wallet-topup-actions">
                    <button className="btn-pay-now" onClick={() => setIsTopupModalOpen(true)}>
                        <Plus size={16} /> Add Funds
                    </button>
                </div>

                {pendingPaymentContract && (
                    <div className="wallet-payment-hint">
                        <span>Pending payment due: {formatMoney(pendingTotalDue)}</span>
                        <span className={canAffordPendingPayment ? 'text-success' : 'text-muted'}>
                            {canAffordPendingPayment ? 'You can pay now from balance.' : 'Top up is needed before payment.'}
                        </span>
                    </div>
                )}

                {(topupError || isTopupVerifying) && (
                    <div className="wallet-topup-message">
                        {isTopupVerifying ? 'Verifying top-up transaction...' : topupError}
                    </div>
                )}
            </div>
        </div>
    );

    const viewportContent = (() => {
        if (isLoadingData) {
            return (
                <div className="empty-state">
                    <div className="empty-icon"><Loader2 size={32} className="animate-spin" /></div>
                    <h4>Loading payment data</h4>
                    <p>Please wait while we fetch your latest payment records.</p>
                </div>
            );
        }

        if (dataError) {
            return (
                <div className="empty-state">
                    <div className="empty-icon"><X size={32} /></div>
                    <h4>Could not load payments</h4>
                    <p>{dataError}</p>
                </div>
            );
        }

        return (
            <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'upcoming' && renderUpcoming()}
                {activeTab === 'history' && renderHistory()}
                {activeTab === 'deposits' && renderDeposits()}
                {activeTab === 'maintenance' && renderMaintenance()}
                {activeTab === 'topup' && renderTopUp()}
                {activeTab === 'methods' && renderMethods()}
                {activeTab === 'pending' && renderPending()}
                {activeTab === 'receipt' && renderReceipt()}
            </>
        );
    })();

    return (
        <div className="dashboard-shell">
            <Sidebar />
            <div className="content-container">
                <Header />
                <main className="payment-hub">
                    <header className="hub-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="header-text">
                            <h1>Billing & Payments</h1>
                        </div>
                    </header>

                    <div className="tabs-wrapper">
                        <nav className="modern-tabs">
                            {[
                                { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
                                { id: 'upcoming', label: 'Upcoming', icon: <CalendarClock size={16} /> },
                                { id: 'history', label: 'History', icon: <History size={16} /> },
                                { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={16} /> },
                                { id: 'deposits', label: 'Deposits', icon: <Lock size={16} /> },
                                { id: 'topup', label: 'Top Up', icon: <Wallet size={16} /> },
                                { id: 'methods', label: 'Methods', icon: <CreditCard size={16} /> },
                                { id: 'pending', label: 'Requests', icon: <FileSearch size={16} /> },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    className={activeTab === tab.id ? 'active' : ''}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="tenant-payment-viewport-container">
                        {viewportContent}
                    </div>
                </main>
                <Footer />
            </div>

            {showSuccessToast && (
                <div className="toast-success-overlay">
                    <div className="toast-card">
                        <div className="toast-icon"><CheckCircle2 size={24} /></div>
                        <div className="toast-body">
                            <h6>Success</h6>
                            <p>{successMessage}</p>
                        </div>
                        <button className="toast-close" onClick={() => setShowSuccessToast(false)}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {isTopupModalOpen && (
                <div className="wallet-topup-modal-overlay">
                    <div className="wallet-topup-modal">
                        <div className="wallet-topup-modal-header">
                            <h3>Add Funds to Wallet</h3>
                            <button className="icon-btn" onClick={() => setIsTopupModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <p className="wallet-topup-modal-copy">Enter the amount you want to add. You will be redirected to Paymob to complete payment securely.</p>
                        <label htmlFor="topup-method">Payment Method</label>
                        <select
                            id="topup-method"
                            value={topupMethod}
                            onChange={(e) => {
                                const selected = e.target.value as WalletTopupPaymentMethod;
                                setTopupMethod(selected);
                                if (selected !== 'CARD') setTopupSaveCard(false);
                            }}
                        >
                            <option value="CARD">Card</option>
                            <option value="WALLET">Mobile Wallet</option>
                        </select>
                        {topupMethod === 'CARD' && (
                            <label htmlFor="topup-save-card" className="topup-save-card-row">
                                <input
                                    id="topup-save-card"
                                    type="checkbox"
                                    checked={topupSaveCard}
                                    onChange={(e) => setTopupSaveCard(e.target.checked)}
                                />{' '}
                                Save this card for future use
                            </label>
                        )}
                        <label htmlFor="topup-amount">Amount (EGP)</label>
                        <input
                            id="topup-amount"
                            type="number"
                            min="1"
                            step="0.01"
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                            placeholder="e.g. 2500"
                        />

                        {topupError && <div className="wallet-topup-modal-error">{topupError}</div>}

                        <div className="wallet-topup-modal-actions">
                            <button className="btn-manage-ghost" onClick={() => setIsTopupModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn-pay-now" onClick={handleStartTopup} disabled={isTopupStarting}>
                                {isTopupStarting ? 'Starting...' : 'Continue to Paymob'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreditCardModal
                isOpen={isMethodModalOpen}
                onClose={() => setIsMethodModalOpen(false)}
                onSaved={handlePaymentMethodSaved}
            />

            {installmentsTarget && (
                <InstallmentsModal
                    contractId={installmentsTarget.contractId}
                    contractTitle={installmentsTarget.title}
                    onClose={() => setInstallmentsTarget(null)}
                    onPaid={() => {
                        void loadPaymentData();
                    }}
                />
            )}
        </div>
    );
};

export default TenantPayment;
