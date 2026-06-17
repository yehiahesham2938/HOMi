import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Landlord/sidebar';
import Footer from '../../../components/global/footer';
import {
    Wallet, TrendingUp, Calendar, Clock,
    ArrowUpRight, Building2, User, Landmark,
    Plus, Download, CheckCircle2, Search,
    Filter, CreditCard, HandCoins, Lock, Wrench,
    X
} from 'lucide-react';
import './LandlordPayment.css';
import authService from '../../../services/auth.service';
import contractService, { type LandlordContract } from '../../../services/contract.service';
import maintenanceService, { type MaintenanceRequest } from '../../../services/maintenance.service';

type LandlordTab = 'earnings' | 'received' | 'payouts' | 'methods' | 'upcoming' | 'withdraw' | 'topup' | 'deposits' | 'maintenance';

interface StatCardProps {
    label: string;
    amount: string;
    subtext: string;
    icon: React.ReactNode;
    variant?: 'featured' | 'white';
}

type PayoutMethodType = 'BANK_ACCOUNT' | 'MOBILE_WALLET';

interface PayoutMethod {
    id: string;
    methodType: PayoutMethodType;
    bankName?: string;
    accountNumber?: string;
    accountLast4?: string;
    accountHolder?: string;
    walletProvider?: string;
    walletPhone?: string;
    methodDisplayName: string;
    isPrimary: boolean;
    createdAt: string;
}

interface TransferRecord {
    id: string;
    amount: number;
    status: 'Processing' | 'Completed';
    date: string;
    bankMethodId: string;
    bankLabel: string;
}

const EGYPTIAN_BANKS = [
    'National Bank of Egypt',
    'Banque Misr',
    'Banque du Caire',
    'CIB (Commercial International Bank)',
    'AlexBank',
    'QNB Alahli',
    'Bank Audi Egypt',
    'FABMISR (First Abu Dhabi Bank Egypt)',
    'HSBC Egypt',
    'Arab African International Bank',
    'Housing and Development Bank',
    'Suez Canal Bank',
    'Abu Dhabi Islamic Bank Egypt',
    'Egyptian Gulf Bank',
];

const EGYPTIAN_WALLET_PROVIDERS = [
    'Vodafone Cash',
    'Orange Cash',
    'Etisalat Cash',
    'WE Pay',
    'CIB Wallet',
    'Aman Wallet',
    'Fawry Wallet',
];

interface ReceivedPaymentRow {
    id: string;
    tenantName: string;
    propertyTitle: string;
    amount: number;
    date: string;
    type?: string;
    statusBadge?: string;
}

interface UpcomingPaymentRow {
    id: string;
    tenantName: string;
    propertyTitle: string;
    amount: number;
    dueDate: string;
    dueInDays: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, amount, subtext, icon, variant = 'white' }) => (
    <div className={`stat-card-${variant}`}>
        {variant === 'featured' && <div className="card-glass-overlay"></div>}
        <div className="stat-card-content">
            <div className="stat-header">
                <span className="stat-label">{label}</span>
                <div className="stat-icon-wrapper">{icon}</div>
            </div>
            <h2 className="stat-amount">{amount}</h2>
            <p className="stat-subtext">{subtext}</p>
        </div>
    </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
        <div style={{ marginBottom: '16px', opacity: 0.5 }}>{icon}</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '1.25rem' }}>{title}</h3>
        <p style={{ margin: '0 0 24px 0', maxWidth: '420px', lineHeight: '1.5' }}>{description}</p>
        {action}
    </div>
);

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
});

const formatDate = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const toMidnight = (value: Date): Date => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const getDaysUntil = (value: string): number => {
    const due = toMidnight(new Date(value));
    const now = toMidnight(new Date());
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getContractPaymentStatus = (contract: LandlordContract): string => {
    return ((contract as unknown as { paymentStatus?: string }).paymentStatus || 'PENDING').toUpperCase();
};

const maskAccountNumber = (value: string): string => {
    const digits = value.replaceAll(/\D/g, '');
    if (digits.length <= 4) return digits;
    const visible = digits.slice(-4);
    return `•••• •••• •••• ${visible}`;
};

const maskPhoneNumber = (value: string): string => {
    const digits = value.replaceAll(/\D/g, '');
    if (digits.length < 4) return digits;
    return `${digits.slice(0, 3)} ••• ••• ${digits.slice(-3)}`;
};

const LandlordPayment: React.FC = () => {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.user?.id ?? '';

    const location = useLocation();

    const [activeTab, setActiveTab] = useState<LandlordTab>('earnings');
    const [contracts, setContracts] = useState<LandlordContract[]>([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [depositSearchTerm, setDepositSearchTerm] = useState('');

    const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
    const [payouts, setPayouts] = useState<TransferRecord[]>([]);

    const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
    const [methodType, setMethodType] = useState<PayoutMethodType>('BANK_ACCOUNT');
    const [selectedBankName, setSelectedBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [walletProvider, setWalletProvider] = useState('');
    const [walletPhone, setWalletPhone] = useState('');
    const [walletMethodName, setWalletMethodName] = useState('');
    const [methodError, setMethodError] = useState<string | null>(null);

    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [dbWalletBalance, setDbWalletBalance] = useState<number | null>(null);

    // Wallet Topup State
    const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [topupMethod, setTopupMethod] = useState<'CARD' | 'WALLET'>('CARD');
    const [topupSaveCard, setTopupSaveCard] = useState(false);
    const [topupError, setTopupError] = useState<string | null>(null);
    const [isTopupStarting, setIsTopupStarting] = useState(false);
    const [isTopupVerifying, setIsTopupVerifying] = useState(false);
    const topupVerifiedRef = useRef(false);

    // Wallet Withdraw State
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawType, setWithdrawType] = useState<'ALL' | 'PARTIAL'>('PARTIAL');
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [isWithdrawStarting, setIsWithdrawStarting] = useState(false);

    // Success Toast State
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Operation completed successfully.');

    const methodsStorageKey = userId ? `landlord-payout-methods-${userId}` : '';
    const payoutsStorageKey = userId ? `landlord-payouts-${userId}` : '';

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (!userId) {
                if (!isMounted) return;
                setIsLoading(false);
                setPageError('No active user session found. Please sign in again.');
                return;
            }

            setIsLoading(true);
            setPageError(null);

            try {
                const [contractsResponse, walletRes, maintResponse] = await Promise.all([
                    contractService.getLandlordContracts({ page: 1, limit: 100 }),
                    contractService.getWalletBalance().catch(() => null),
                    maintenanceService.listLandlordRequests().catch(() => [])
                ]);

                if (!isMounted) return;

                setContracts(contractsResponse.data ?? []);
                if (walletRes) {
                    setDbWalletBalance(walletRes.balance);
                }
                setMaintenanceRequests(maintResponse ?? []);

                const storedMethods = localStorage.getItem(methodsStorageKey);
                if (storedMethods) {
                    setPayoutMethods(JSON.parse(storedMethods) as PayoutMethod[]);
                }

                const storedPayouts = localStorage.getItem(payoutsStorageKey);
                if (storedPayouts) {
                    setPayouts(JSON.parse(storedPayouts) as TransferRecord[]);
                }
            } catch {
                if (!isMounted) return;
                setPageError('Unable to load payment data right now. Please try again.');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            isMounted = false;
        };
    }, [methodsStorageKey, payoutsStorageKey, userId]);

    useEffect(() => {
        if (topupVerifiedRef.current) return;

        const params = new URLSearchParams(location.search);
        const walletTopupFlag = params.get('walletTopup');

        if (walletTopupFlag !== '1') return;

        const transactionIdRaw = params.get('id') || params.get('transaction_id') || '';
        const transactionId = Number(transactionIdRaw);

        setActiveTab('topup');

        if (!transactionIdRaw || !Number.isFinite(transactionId) || transactionId <= 0) {
            setTopupError('Payment callback is missing the transaction ID. Please contact support.');
            const cleanUrl = `${location.pathname}`;
            globalThis.history.replaceState({}, document.title, cleanUrl);
            return;
        }

        topupVerifiedRef.current = true;

        const doVerify = async () => {
            let accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                await new Promise<void>((resolve) => setTimeout(resolve, 2000));
                accessToken = localStorage.getItem('accessToken');
            }

            if (!accessToken) {
                setTopupError('Session expired. Please log in and try again.');
                const cleanUrl = `${location.pathname}`;
                globalThis.history.replaceState({}, document.title, cleanUrl);
                return;
            }

            setIsTopupVerifying(true);
            try {
                let response = await contractService.verifyWalletTopup(transactionId);
                setDbWalletBalance(Number(response.balance ?? 0));
                setTopupError(null);
                setSuccessMessage('Wallet top-up completed successfully.');
                setShowSuccessToast(true);

                // Reload data
                const [contractsResponse, walletRes, maintResponse] = await Promise.all([
                    contractService.getLandlordContracts({ page: 1, limit: 100 }),
                    contractService.getWalletBalance().catch(() => null),
                    maintenanceService.listLandlordRequests().catch(() => [])
                ]);
                setContracts(contractsResponse.data ?? []);
                if (walletRes) {
                    setDbWalletBalance(walletRes.balance);
                }
                setMaintenanceRequests(maintResponse ?? []);
            } catch (err: unknown) {
                const ex = err as { response?: { data?: { message?: string } } };
                const serverMsg = ex.response?.data?.message;
                setTopupError(
                    typeof serverMsg === 'string' && serverMsg.trim()
                        ? serverMsg
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

    const persistMethods = (next: PayoutMethod[]) => {
        setPayoutMethods(next);
        if (methodsStorageKey) {
            localStorage.setItem(methodsStorageKey, JSON.stringify(next));
        }
    };

    const persistPayouts = (next: TransferRecord[]) => {
        setPayouts(next);
        if (payoutsStorageKey) {
            localStorage.setItem(payoutsStorageKey, JSON.stringify(next));
        }
    };

    const receivedPayments = useMemo<ReceivedPaymentRow[]>(() => {
        const rows: ReceivedPaymentRow[] = [];
        contracts.forEach((contract) => {
            const hasBeenPaid = getContractPaymentStatus(contract) === 'PAID' ||
                ['ACTIVE', 'EXPIRED', 'TERMINATED'].includes(contract.status);

            if (hasBeenPaid) {
                const tenantName = `${contract.tenant?.firstName ?? ''} ${contract.tenant?.lastName ?? ''}`.trim() || 'Tenant';
                const propertyTitle = contract.property?.title || 'Property';
                const rentAmount = Number(contract.rentAmount ?? contract.property?.monthlyPrice ?? 0);
                const date = contract.landlordSignedAt || contract.createdAt;

                rows.push({
                    id: `${contract.id}-rent`,
                    tenantName,
                    propertyTitle,
                    amount: rentAmount,
                    date,
                    type: 'Rent Payment',
                    statusBadge: 'Received',
                });

                // If lease terminated due to non-payment, deposit goes to landlord balance
                if (contract.status === 'TERMINATED') {
                    const depositAmount = Number(contract.securityDeposit ?? contract.property?.securityDeposit ?? 0);
                    if (depositAmount > 0) {
                        rows.push({
                            id: `${contract.id}-deposit`,
                            tenantName,
                            propertyTitle,
                            amount: depositAmount,
                            date: contract.updatedAt || contract.createdAt,
                            type: 'Forfeited Deposit',
                            statusBadge: 'Released',
                        });
                    }
                }
            }
        });
        return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [contracts]);

    const upcomingPayments = useMemo<UpcomingPaymentRow[]>(() => {
        return contracts
            .filter((contract) => getContractPaymentStatus(contract) !== 'PAID')
            .map((contract) => {
                const tenantName = `${contract.tenant?.firstName ?? ''} ${contract.tenant?.lastName ?? ''}`.trim() || 'Tenant';
                const propertyTitle = contract.property?.title || 'Property';
                const amount = Number(contract.rentAmount ?? contract.property?.monthlyPrice ?? 0);
                const dueDate = contract.moveInDate || contract.createdAt;
                const dueInDays = getDaysUntil(dueDate);

                return {
                    id: contract.id,
                    tenantName,
                    propertyTitle,
                    amount,
                    dueDate,
                    dueInDays,
                };
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [contracts]);

    const propertyDeposits = useMemo(() => {
        return contracts
            .filter((c) => Number(c.securityDeposit ?? c.property?.securityDeposit ?? 0) > 0)
            .map((c) => {
                const tenantName = `${c.tenant?.firstName ?? ''} ${c.tenant?.lastName ?? ''}`.trim() || 'Tenant';
                const propertyTitle = c.property?.title || 'Property';
                const amount = Number(c.securityDeposit ?? c.property?.securityDeposit ?? 0);
                const date = c.moveInDate || c.createdAt;

                let status: 'HELD' | 'REFUNDED' | 'RELEASED' | 'PENDING' | 'SPLIT' = 'PENDING';
                if (c.depositStatus) {
                    const depStatus = c.depositStatus as string;
                    status = (depStatus === 'FORFEITED' ? 'RELEASED' : depStatus) as any;
                } else {
                    if (c.status === 'ACTIVE') {
                        status = 'HELD';
                    } else if (c.status === 'EXPIRED') {
                        status = 'REFUNDED';
                    } else if (c.status === 'TERMINATED') {
                        status = 'RELEASED';
                    } else if (c.status === 'PENDING_PAYMENT') {
                        status = 'PENDING';
                    }
                }

                return {
                    id: c.id,
                    tenantName,
                    propertyTitle,
                    amount,
                    status,
                    date,
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [contracts]);

    const maintenancePayments = useMemo(() => {
        return maintenanceRequests
            .filter((req) => req.chargeParty === 'LANDLORD' && req.agreedPrice !== null)
            .map((req) => {
                const tenantName = req.tenant ? `${req.tenant.firstName ?? ''} ${req.tenant.lastName ?? ''}`.trim() : 'Tenant';
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
                    tenantName,
                    propertyTitle,
                    providerName,
                    amount: req.agreedPrice ?? 0,
                    date: req.providerCompletedAt || req.updatedAt || req.createdAt,
                    statusBadge,
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [maintenanceRequests]);



    const filteredReceivedPayments = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return receivedPayments;

        return receivedPayments.filter((item) =>
            item.tenantName.toLowerCase().includes(q) || item.propertyTitle.toLowerCase().includes(q)
        );
    }, [receivedPayments, searchTerm]);

    const filteredPropertyDeposits = useMemo(() => {
        const q = depositSearchTerm.trim().toLowerCase();
        if (!q) return propertyDeposits;

        return propertyDeposits.filter((item) =>
            item.tenantName.toLowerCase().includes(q) || item.propertyTitle.toLowerCase().includes(q)
        );
    }, [propertyDeposits, depositSearchTerm]);



    const setPrimaryMethod = (id: string) => {
        const updated = payoutMethods.map((method) => ({
            ...method,
            isPrimary: method.id === id,
        }));
        persistMethods(updated);
    };

    const handleAddMethod = () => {
        setMethodError(null);

        let method: PayoutMethod | null = null;

        if (methodType === 'BANK_ACCOUNT') {
            const cleanBankName = selectedBankName.trim();
            const cleanHolder = accountHolder.trim();
            const cleanAccountNumber = accountNumber.replaceAll(/\D/g, '');

            if (!cleanBankName || !cleanHolder || !cleanAccountNumber) {
                setMethodError('Please choose a bank, account holder name, and full account number.');
                return;
            }

            if (cleanAccountNumber.length < 10) {
                setMethodError('Please enter a valid full bank account number.');
                return;
            }

            method = {
                id: `bank-${Date.now()}`,
                methodType: 'BANK_ACCOUNT',
                bankName: cleanBankName,
                accountNumber: cleanAccountNumber,
                accountLast4: cleanAccountNumber.slice(-4),
                accountHolder: cleanHolder,
                methodDisplayName: `${cleanBankName} ••••${cleanAccountNumber.slice(-4)}`,
                isPrimary: payoutMethods.length === 0,
                createdAt: new Date().toISOString(),
            };
        }

        if (methodType === 'MOBILE_WALLET') {
            const cleanProvider = walletProvider.trim();
            const cleanPhone = walletPhone.replaceAll(/\D/g, '');
            const cleanMethodName = walletMethodName.trim();

            if (!cleanProvider || !cleanPhone || !cleanMethodName) {
                setMethodError('Please choose wallet provider, phone number, and payment method name.');
                return;
            }

            if (!/^01\d{9}$/.test(cleanPhone)) {
                setMethodError('Please enter a valid Egyptian mobile wallet number (11 digits).');
                return;
            }

            method = {
                id: `wallet-${Date.now()}`,
                methodType: 'MOBILE_WALLET',
                walletProvider: cleanProvider,
                walletPhone: cleanPhone,
                methodDisplayName: cleanMethodName,
                isPrimary: payoutMethods.length === 0,
                createdAt: new Date().toISOString(),
            };
        }

        if (!method) return;

        const next = [method, ...payoutMethods];
        persistMethods(next);

        setMethodType('BANK_ACCOUNT');
        setSelectedBankName('');
        setAccountNumber('');
        setAccountHolder('');
        setWalletProvider('');
        setWalletPhone('');
        setWalletMethodName('');
        setIsMethodModalOpen(false);
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

    const handleOpenWithdrawModal = () => {
        setWithdrawError(null);
        const primary = payoutMethods.find((m) => m.isPrimary) || payoutMethods[0];
        setSelectedMethodId(primary?.id ?? '');
        setWithdrawAmount('');
        setWithdrawType('PARTIAL');
        setIsWithdrawModalOpen(true);
    };

    const handleWithdrawSubmit = async () => {
        setWithdrawError(null);

        if (payoutMethods.length === 0) {
            setWithdrawError('Add at least one payout method before creating a withdrawal.');
            return;
        }

        const currentBalance = dbWalletBalance !== null ? dbWalletBalance : 0;
        const amount = withdrawType === 'ALL' ? currentBalance : Number(withdrawAmount);

        if (withdrawType !== 'ALL' && (!withdrawAmount || Number.isNaN(amount) || amount <= 0)) {
            setWithdrawError('Please enter a valid withdrawal amount greater than 0.');
            return;
        }

        if (amount > currentBalance) {
            setWithdrawError('Withdrawal amount exceeds your available balance.');
            return;
        }

        if (amount <= 0) {
            setWithdrawError('Withdrawal amount must be greater than 0.');
            return;
        }

        const selectedMethod = payoutMethods.find((method) => method.id === selectedMethodId);
        if (!selectedMethod) {
            setWithdrawError('Please choose a payout method for this withdrawal.');
            return;
        }

        setIsWithdrawStarting(true);

        try {
            await contractService.withdrawWalletBalance(amount);

            // Create a payout record for history
            const record: TransferRecord = {
                id: `TR-${Date.now().toString().slice(-6)}`,
                amount,
                status: 'Completed',
                date: new Date().toISOString(),
                bankMethodId: selectedMethod.id,
                bankLabel:
                    selectedMethod.methodType === 'BANK_ACCOUNT'
                        ? `${selectedMethod.bankName} ••••${selectedMethod.accountLast4}`
                        : `${selectedMethod.walletProvider} • ${maskPhoneNumber(selectedMethod.walletPhone || '')}`,
            };

            persistPayouts([record, ...payouts]);

            // Refresh wallet balance
            const wallet = await contractService.getWalletBalance().catch(() => null);
            if (wallet) {
                setDbWalletBalance(wallet.balance);
            } else {
                setDbWalletBalance(prev => prev !== null ? Math.max(prev - amount, 0) : 0);
            }

            setSuccessMessage(`Withdrawal of $${amount.toFixed(2)} completed successfully.`);
            setShowSuccessToast(true);
            setIsWithdrawModalOpen(false);
            setActiveTab('payouts');
        } finally {
            setIsWithdrawStarting(false);
        }
    };

    const renderEarnings = () => (
        <div className="tab-viewport animate-fade-in">
            <div className="stats-grid" style={{ gridTemplateColumns: '1.5fr', maxWidth: '400px' }}>
                <StatCard
                    variant="featured"
                    label="Wallet Balance"
                    amount={currencyFormatter.format(dbWalletBalance !== null ? dbWalletBalance : 0)}
                    subtext="Available for withdrawal or payments"
                    icon={<Wallet size={20} />}
                />
            </div>

            <div className="stripe-style-banner" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ background: '#eff6ff', color: '#1d4ed8', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HandCoins size={24} />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>Withdraw or Top Up funds</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Manage your funds instantly using connected bank accounts or mobile wallets.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-payout-main" onClick={() => setActiveTab('topup')} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        Top Up <Plus size={16} />
                    </button>
                    <button className="btn-payout-main" onClick={() => setActiveTab('withdraw')} style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        Withdraw <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderReceived = () => {
        if (receivedPayments.length === 0) {
            return (
                <div className="tab-viewport animate-fade-in">
                    <EmptyState
                        icon={<CheckCircle2 size={48} />}
                        title="No received payments"
                        description="When tenants complete rent payments, those records will appear here automatically."
                    />
                </div>
            );
        }

        return (
            <div className="tab-viewport animate-fade-in">
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search tenant or property..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-filter"><Filter size={16} /> Filter</button>
                </div>
                <div className="modern-table-wrapper">
                    <table className="landlord-table">
                        <thead>
                            <tr>
                                <th>Tenant</th>
                                <th>Property / Type</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReceivedPayments.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="avatar-mini">{item.tenantName.charAt(0)}</div>
                                            <span>{item.tenantName}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="prop-cell">
                                            <Building2 size={14} style={{ flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span>{item.propertyTitle}</span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{item.type || 'Rent Payment'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-bold">{currencyFormatter.format(item.amount)}</td>
                                    <td>{formatDate(item.date)}</td>
                                    <td>
                                        <span className="badge-success" style={item.statusBadge === 'Released' ? { background: '#eff6ff', color: '#1d4ed8' } : undefined}>
                                            {item.statusBadge || 'Received'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderPayouts = () => {
        if (payouts.length === 0) {
            return (
                <div className="tab-viewport animate-fade-in">
                    <EmptyState
                        icon={<ArrowUpRight size={48} />}
                        title="No payouts yet"
                        description="Transfer history to your connected bank accounts will appear here."
                    />
                </div>
            );
        }

        return (
            <div className="tab-viewport animate-fade-in">
                <div className="payouts-list">
                    {payouts.map((payout) => (
                        <div className="payout-row" key={payout.id}>
                            <div className="payout-info">
                                <div className={`payout-icon ${payout.status.toLowerCase()}`}>
                                    {payout.status === 'Completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                </div>
                                <div>
                                    <h5>Payout #{payout.id}</h5>
                                    <span>{formatDate(payout.date)} • {payout.bankLabel}</span>
                                </div>
                            </div>
                            <div className="payout-meta">
                                <span className="payout-amount">{currencyFormatter.format(payout.amount)}</span>
                                <span className={`status-pill ${payout.status.toLowerCase()}`}>{payout.status}</span>
                                <button className="icon-btn-sm"><Download size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderMethods = () => {
        if (payoutMethods.length === 0) {
            return (
                <div className="tab-viewport animate-fade-in">
                    <EmptyState
                        icon={<Landmark size={48} />}
                        title="No payout methods added"
                        description="Add a bank account so you can transfer available balance from HOMi to your bank."
                        action={
                            <button className="l-btn-add-method" onClick={() => setIsMethodModalOpen(true)} style={{ width: 'auto', marginTop: '16px' }}>
                                <Plus size={18} /> Add Payout Method
                            </button>
                        }
                    />
                </div>
            );
        }

        const primaryMethod = payoutMethods.find((method) => method.isPrimary) || payoutMethods[0];

        return (
            <div className="tab-viewport animate-fade-in">
                <div className="l-methods-viewport">
                    <div className={`l-card-visual ${primaryMethod.methodType === 'BANK_ACCOUNT' ? 'l-bank-account' : 'l-wallet-account'}`}>
                        <div className="l-card-top-row">
                            <span className="l-bank-logo">
                                {primaryMethod.methodType === 'BANK_ACCOUNT'
                                    ? (primaryMethod.bankName || 'BANK').toUpperCase()
                                    : (primaryMethod.walletProvider || 'WALLET').toUpperCase()}
                            </span>
                            <div className="l-chip-gold"></div>
                        </div>
                        <div className="l-card-mid-row">
                            <div className="l-iban-display">
                                {primaryMethod.methodType === 'BANK_ACCOUNT'
                                    ? maskAccountNumber(primaryMethod.accountNumber || '')
                                    : maskPhoneNumber(primaryMethod.walletPhone || '')}
                            </div>
                        </div>
                        <div className="l-card-bottom-row">
                            <span className="l-card-holder-label">
                                {primaryMethod.methodType === 'BANK_ACCOUNT' ? 'Account Holder' : 'Method Name'}
                            </span>
                            <span className="l-card-holder-name">
                                {primaryMethod.methodType === 'BANK_ACCOUNT'
                                    ? (primaryMethod.accountHolder || '').toUpperCase()
                                    : primaryMethod.methodDisplayName.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div className="l-methods-list-side">
                        {payoutMethods.map((method) => (
                            <button
                                key={method.id}
                                className={`l-method-entry ${method.isPrimary ? 'active' : ''}`}
                                onClick={() => setPrimaryMethod(method.id)}
                            >
                                <div className="l-method-icon-wrap">{method.methodType === 'BANK_ACCOUNT' ? <Landmark size={20} /> : <CreditCard size={20} />}</div>
                                <div className="l-method-info-text">
                                    <h5>
                                        {method.methodType === 'BANK_ACCOUNT'
                                            ? `${method.bankName} ••••${method.accountLast4}`
                                            : `${method.methodDisplayName} • ${maskPhoneNumber(method.walletPhone || '')}`}
                                    </h5>
                                    <p>{method.isPrimary ? 'Primary Payout Method' : 'Tap to set as primary'}</p>
                                </div>
                                {method.isPrimary && <CheckCircle2 size={18} className="ml-auto text-success" />}
                            </button>
                        ))}

                        <button className="l-btn-add-method" onClick={() => setIsMethodModalOpen(true)}>
                            <Plus size={18} /> Add New Payout Method
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderMaintenance = () => {
        if (maintenancePayments.length === 0) {
            return (
                <div className="tab-viewport animate-fade-in">
                    <EmptyState
                        icon={<Wrench size={48} />}
                        title="No maintenance payments"
                        description="When you approve maintenance requests or release escrows for maintenance, those records will appear here."
                    />
                </div>
            );
        }

        return (
            <div className="tab-viewport animate-fade-in">
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search provider, property, or job..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modern-table-wrapper">
                    <table className="landlord-table">
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
                                    item.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    item.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    item.title.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map((item) => {
                                    let badgeStyle = {};
                                    if (item.statusBadge === 'Released') {
                                        badgeStyle = { background: '#e6fffa', color: '#007d51' };
                                    } else if (item.statusBadge === 'Refunded') {
                                        badgeStyle = { background: '#fef2f2', color: '#b91c1c' };
                                    } else if (item.statusBadge === 'Escrowed') {
                                        badgeStyle = { background: '#eff6ff', color: '#1d4ed8' };
                                    }

                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.title}</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize', marginTop: '2px' }}>
                                                        {item.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="prop-cell">
                                                    <Building2 size={14} style={{ flexShrink: 0 }} />
                                                    <span>{item.propertyTitle}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="user-info-cell">
                                                    <div className="avatar-mini">{item.providerName.charAt(0)}</div>
                                                    <span>{item.providerName}</span>
                                                </div>
                                            </td>
                                            <td className="font-bold">{currencyFormatter.format(item.amount)}</td>
                                            <td>{formatDate(item.date)}</td>
                                            <td>
                                                <span className="badge-success" style={badgeStyle}>
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

    const renderUpcoming = () => {
        if (upcomingPayments.length === 0) {
            return (
                <div className="tab-viewport animate-fade-in">
                    <EmptyState
                        icon={<Calendar size={48} />}
                        title="No upcoming payments"
                        description="You currently have no unpaid contract payments scheduled."
                    />
                </div>
            );
        }

        return (
            <div className="tab-viewport animate-fade-in">
                <div className="upcoming-grid">
                    {upcomingPayments.map((item) => (
                        <div className="upcoming-card" key={item.id}>
                            <div className="upcoming-top">
                                <span className="due-tag">{item.dueInDays >= 0 ? `Due in ${item.dueInDays} days` : `${Math.abs(item.dueInDays)} days overdue`}</span>
                                <span className="amount">{currencyFormatter.format(item.amount)}</span>
                            </div>
                            <h4>{item.propertyTitle}</h4>
                            <div className="tenant-mini">
                                <User size={14} /> {item.tenantName}
                            </div>
                            <div className="upcoming-footer">
                                <Calendar size={14} /> Expected {formatDate(item.dueDate)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderTopUp = () => (
        <div className="tab-viewport animate-fade-in">
            <div className="transfer-shell" style={{ gridTemplateColumns: '1fr', maxWidth: '500px', margin: '0 auto' }}>
                <div className="transfer-balance-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Wallet Balance</h3>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Top up with Paymob instantly.</p>
                        </div>
                        <div style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 800, padding: '8px 16px', borderRadius: '20px', fontFamily: 'JetBrains Mono', fontSize: '1.1rem' }}>
                            {currencyFormatter.format(dbWalletBalance !== null ? dbWalletBalance : 0)}
                        </div>
                    </div>

                    <button className="btn-payout-main" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={() => setIsTopupModalOpen(true)}>
                        <Plus size={16} /> Add Funds
                    </button>

                    {(topupError || isTopupVerifying) && (
                        <div className="landlord-payment-error-banner" style={{ marginTop: '20px', marginBottom: 0 }}>
                            {isTopupVerifying ? 'Verifying top-up transaction...' : topupError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderWithdraw = () => (
        <div className="tab-viewport animate-fade-in">
            <div className="transfer-shell">
                <div className="transfer-balance-card">
                    <h3>Available to Withdraw</h3>
                    <h2>{currencyFormatter.format(dbWalletBalance !== null ? dbWalletBalance : 0)}</h2>
                    <p>{payoutMethods.length > 0 ? 'Choose a payout method and withdraw funds instantly.' : 'Add a payout method first to begin withdrawals.'}</p>
                    <button
                        className="btn-payout-main"
                        onClick={handleOpenWithdrawModal}
                        disabled={payoutMethods.length === 0 || (dbWalletBalance ?? 0) <= 0}
                    >
                        <HandCoins size={18} /> Withdraw Funds
                    </button>
                </div>

                <div className="transfer-quick-list">
                    <h4>Recent Withdrawal Requests</h4>
                    {payouts.length === 0 ? (
                        <p className="transfer-empty-note">No withdrawals yet.</p>
                    ) : (
                        payouts.slice(0, 5).map((item) => (
                            <div className="transfer-row" key={item.id}>
                                <div>
                                    <strong>{currencyFormatter.format(item.amount)}</strong>
                                    <p>{item.bankLabel}</p>
                                </div>
                                <span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderDeposits = () => {
        if (propertyDeposits.length === 0) {
            return (
                <div className="tab-viewport animate-fade-in">
                    <EmptyState
                        icon={<Lock size={48} />}
                        title="No security deposits"
                        description="Security deposits associated with your rented properties will be listed here during their active lease cycles."
                    />
                </div>
            );
        }

        return (
            <div className="tab-viewport animate-fade-in">
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search tenant or property..."
                            value={depositSearchTerm}
                            onChange={(e) => setDepositSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-filter"><Filter size={16} /> Filter</button>
                </div>
                <div className="modern-table-wrapper">
                    <table className="landlord-table">
                        <thead>
                            <tr>
                                <th>Tenant</th>
                                <th>Property</th>
                                <th>Deposit Amount</th>
                                <th>Lease Start Date</th>
                                <th>Escrow Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPropertyDeposits.map((item) => {
                                let badgeStyle = {};
                                let statusText = 'Awaiting Payment';
                                if (item.status === 'HELD') {
                                    badgeStyle = { background: '#eff6ff', color: '#1d4ed8' };
                                    statusText = 'Held in Escrow';
                                } else if (item.status === 'REFUNDED') {
                                    badgeStyle = { background: '#f1f5f9', color: '#475569' };
                                    statusText = 'Returned to Tenant';
                                } else if (item.status === 'RELEASED') {
                                    badgeStyle = { background: '#e6fffa', color: '#007d51' };
                                    statusText = 'Released to Landlord';
                                } else if (item.status === 'SPLIT') {
                                    badgeStyle = { background: '#fffbeb', color: '#b45309' };
                                    statusText = 'Split (Partial Release)';
                                } else if (item.status === 'PENDING') {
                                    badgeStyle = { background: '#fffbeb', color: '#92400e' };
                                    statusText = 'Awaiting Payment';
                                }

                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="user-info-cell">
                                                <div className="avatar-mini">{item.tenantName.charAt(0)}</div>
                                                <span>{item.tenantName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="prop-cell">
                                                <Building2 size={14} style={{ flexShrink: 0 }} />
                                                <span>{item.propertyTitle}</span>
                                            </div>
                                        </td>
                                        <td className="font-bold">{currencyFormatter.format(item.amount)}</td>
                                        <td>{formatDate(item.date)}</td>
                                        <td>
                                            <span className="badge-success" style={badgeStyle}>
                                                {statusText}
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

    return (
        <div className="dashboard-shell">
            <Sidebar />
            <div className="content-container">
                <Header />
                <main className="landlord-hub">
                    <header className="landlord-hub-header">
                        <div className="header-text">
                            <h1>Financial Overview</h1>
                        </div>
                    </header>

                    {pageError && (
                        <div className="landlord-payment-error-banner">{pageError}</div>
                    )}

                    <div className="tabs-container">
                        <nav className="modern-tabs">
                            {[
                                { id: 'earnings', label: 'Earnings', icon: <TrendingUp size={16} /> },
                                { id: 'topup', label: 'Top Up', icon: <Wallet size={16} /> },
                                { id: 'withdraw', label: 'Withdraw', icon: <HandCoins size={16} /> },
                                { id: 'received', label: 'Received', icon: <CheckCircle2 size={16} /> },
                                { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={16} /> },
                                { id: 'deposits', label: 'Deposits', icon: <Lock size={16} /> },
                                { id: 'payouts', label: 'Payouts', icon: <ArrowUpRight size={16} /> },
                                { id: 'upcoming', label: 'Upcoming', icon: <Clock size={16} /> },
                                { id: 'methods', label: 'Methods', icon: <CreditCard size={16} /> },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    className={activeTab === tab.id ? 'active' : ''}
                                    onClick={() => setActiveTab(tab.id as LandlordTab)}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="viewport-container">
                        {isLoading ? (
                            <div className="tab-viewport animate-fade-in">
                                <EmptyState
                                    icon={<Clock size={48} />}
                                    title="Loading payment data"
                                    description="Please wait while we fetch your latest contracts and transactions."
                                />
                            </div>
                        ) : (
                            <>
                                {activeTab === 'earnings' && renderEarnings()}
                                {activeTab === 'topup' && renderTopUp()}
                                {activeTab === 'withdraw' && renderWithdraw()}
                                {activeTab === 'received' && renderReceived()}
                                {activeTab === 'maintenance' && renderMaintenance()}
                                {activeTab === 'deposits' && renderDeposits()}
                                {activeTab === 'payouts' && renderPayouts()}
                                {activeTab === 'methods' && renderMethods()}
                                {activeTab === 'upcoming' && renderUpcoming()}
                            </>
                        )}
                    </div>
                </main>
                <Footer />
            </div>

            {isMethodModalOpen && (
                <div className="lp-modal-overlay">
                    <div className="lp-modal">
                        <h3>Add Payout Method</h3>
                        <p>Add a bank account or mobile wallet for landlord transfers.</p>

                        <label htmlFor="lp-method-type">Method Type</label>
                        <select id="lp-method-type" value={methodType} onChange={(e) => setMethodType(e.target.value as PayoutMethodType)}>
                            <option value="BANK_ACCOUNT">Bank Account</option>
                            <option value="MOBILE_WALLET">Mobile Wallet</option>
                        </select>

                        {methodType === 'BANK_ACCOUNT' && (
                            <>
                                <label htmlFor="lp-bank-name">Egyptian Bank</label>
                                <select id="lp-bank-name" value={selectedBankName} onChange={(e) => setSelectedBankName(e.target.value)}>
                                    <option value="">Select bank</option>
                                    {EGYPTIAN_BANKS.map((bank) => (
                                        <option key={bank} value={bank}>{bank}</option>
                                    ))}
                                </select>

                                <label htmlFor="lp-account-holder">Account Holder</label>
                                <input id="lp-account-holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Full legal name" />

                                <label htmlFor="lp-account-number">Full Account Number</label>
                                <input id="lp-account-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replaceAll(/\D/g, ''))} placeholder="Type full account number" />
                            </>
                        )}

                        {methodType === 'MOBILE_WALLET' && (
                            <>
                                <label htmlFor="lp-wallet-provider">Wallet Provider</label>
                                <select id="lp-wallet-provider" value={walletProvider} onChange={(e) => setWalletProvider(e.target.value)}>
                                    <option value="">Select wallet provider</option>
                                    {EGYPTIAN_WALLET_PROVIDERS.map((provider) => (
                                        <option key={provider} value={provider}>{provider}</option>
                                    ))}
                                </select>

                                <label htmlFor="lp-wallet-phone">Wallet Phone Number</label>
                                <input id="lp-wallet-phone" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value.replaceAll(/\D/g, '').slice(0, 11))} placeholder="01XXXXXXXXX" />

                                <label htmlFor="lp-wallet-name">Payment Method Name</label>
                                <input id="lp-wallet-name" value={walletMethodName} onChange={(e) => setWalletMethodName(e.target.value)} placeholder="e.g. My Vodafone Cash" />
                            </>
                        )}

                        {methodError && <div className="lp-modal-error">{methodError}</div>}

                        <div className="lp-modal-actions">
                            <button className="lp-btn-secondary" onClick={() => setIsMethodModalOpen(false)}>Cancel</button>
                            <button className="lp-btn-primary" onClick={handleAddMethod}>Save Method</button>
                        </div>
                    </div>
                </div>
            )}

            {isWithdrawModalOpen && (
                <div className="lp-modal-overlay">
                    <div className="lp-modal">
                        <h3>Withdraw Funds</h3>
                        <p>Withdraw all or part of your balance to your connected method.</p>

                        <label htmlFor="withdraw-type">Withdrawal Option</label>
                        <select
                            id="withdraw-type"
                            value={withdrawType}
                            onChange={(e) => {
                                const val = e.target.value as 'ALL' | 'PARTIAL';
                                setWithdrawType(val);
                                if (val === 'ALL') {
                                    setWithdrawAmount(String(dbWalletBalance ?? 0));
                                } else {
                                    setWithdrawAmount('');
                                }
                            }}
                        >
                            <option value="PARTIAL">Withdraw part of it</option>
                            <option value="ALL">Withdraw all money</option>
                        </select>

                        {withdrawType === 'PARTIAL' && (
                            <>
                                <label htmlFor="lp-withdraw-amount">Amount (USD)</label>
                                <input
                                    id="lp-withdraw-amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </>
                        )}

                        <label htmlFor="lp-bank-select">Payout Method</label>
                        <select id="lp-bank-select" value={selectedMethodId} onChange={(e) => setSelectedMethodId(e.target.value)}>
                            <option value="">Select payout method</option>
                            {payoutMethods.map((method) => (
                                <option key={method.id} value={method.id}>
                                    {method.methodType === 'BANK_ACCOUNT'
                                        ? `${method.bankName} ••••${method.accountLast4}`
                                        : `${method.methodDisplayName} • ${maskPhoneNumber(method.walletPhone || '')}`} {method.isPrimary ? '(Primary)' : ''}
                                </option>
                            ))}
                        </select>

                        <div className="lp-balance-hint">Available balance: {currencyFormatter.format(dbWalletBalance !== null ? dbWalletBalance : 0)}</div>

                        {withdrawError && <div className="lp-modal-error">{withdrawError}</div>}

                        <div className="lp-modal-actions">
                            <button className="lp-btn-secondary" onClick={() => setIsWithdrawModalOpen(false)}>Cancel</button>
                            <button className="lp-btn-primary" onClick={handleWithdrawSubmit} disabled={isWithdrawStarting}>
                                {isWithdrawStarting ? 'Processing...' : 'Confirm Withdrawal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isTopupModalOpen && (
                <div className="lp-modal-overlay">
                    <div className="lp-modal">
                        <h3>Add Funds to Wallet</h3>
                        <p>Enter the amount you want to add. You will be redirected to Paymob to complete payment securely.</p>

                        <label htmlFor="topup-method">Payment Method</label>
                        <select
                            id="topup-method"
                            value={topupMethod}
                            onChange={(e) => {
                                const selected = e.target.value as 'CARD' | 'WALLET';
                                setTopupMethod(selected);
                                if (selected !== 'CARD') setTopupSaveCard(false);
                            }}
                        >
                            <option value="CARD">Card</option>
                            <option value="WALLET">Mobile Wallet</option>
                        </select>
                        {topupMethod === 'CARD' && (
                            <label htmlFor="topup-save-card" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0' }}>
                                <input
                                    id="topup-save-card"
                                    type="checkbox"
                                    checked={topupSaveCard}
                                    onChange={(e) => setTopupSaveCard(e.target.checked)}
                                />{' '}
                                Save card for future use
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

                        {topupError && <div className="lp-modal-error">{topupError}</div>}

                        <div className="lp-modal-actions">
                            <button className="lp-btn-secondary" onClick={() => setIsTopupModalOpen(false)}>Cancel</button>
                            <button className="lp-btn-primary" onClick={handleStartTopup} disabled={isTopupStarting}>
                                {isTopupStarting ? 'Starting...' : 'Continue to Paymob'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessToast && (
                <div className="toast-success-overlay" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 3000 }}>
                    <div className="toast-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div className="toast-icon" style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}><CheckCircle2 size={24} /></div>
                        <div className="toast-body">
                            <h6 style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.95rem' }}>Success</h6>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{successMessage}</p>
                        </div>
                        <button className="toast-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', marginLeft: '12px' }} onClick={() => setShowSuccessToast(false)}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandlordPayment;
