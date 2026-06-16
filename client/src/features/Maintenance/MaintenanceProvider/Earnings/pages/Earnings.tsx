import React, { useEffect, useState } from 'react';
import Header from '../../../../../components/global/header';
import Footer from '../../../../../components/global/footer';
import MaintenanceSideBar from '../../SideBar/MaintenanceSideBar';
import './Earnings.css';
import {
    FaWallet, FaHistory, FaClock, FaArrowUp, FaCheckCircle, FaInfoCircle,
    FaUniversity, FaRegCreditCard, FaCheck, FaTimes, FaPlus
} from 'react-icons/fa';
import maintenanceService, {
    type MaintenanceRequest,
    type ProviderEarnings,
} from '../../../../../services/maintenance.service';
import authService from '../../../../../services/auth.service';
import contractService from '../../../../../services/contract.service';

type TabType = 'overview' | 'upcoming' | 'withdraw';

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

const maskAccountNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    const visible = digits.slice(-4);
    return `•••• •••• •••• ${visible}`;
};

const maskPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 4) return digits;
    return `${digits.slice(0, 3)} ••• ••• ${digits.slice(-3)}`;
};

const formatMoney = (amount: number) => `EGP ${amount.toLocaleString()}`;

const Earnings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [earnings, setEarnings] = useState<ProviderEarnings | null>(null);
    const [upcoming, setUpcoming] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.user?.id ?? '';

    // Payout methods state
    const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
    const [payouts, setPayouts] = useState<TransferRecord[]>([]);

    // Method modal state
    const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
    const [methodType, setMethodType] = useState<PayoutMethodType>('BANK_ACCOUNT');
    const [selectedBankName, setSelectedBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [walletProvider, setWalletProvider] = useState('');
    const [walletPhone, setWalletPhone] = useState('');
    const [walletMethodName, setWalletMethodName] = useState('');
    const [methodError, setMethodError] = useState<string | null>(null);

    // Withdraw modal state
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawType, setWithdrawType] = useState<'ALL' | 'PARTIAL'>('PARTIAL');
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [isWithdrawStarting, setIsWithdrawStarting] = useState(false);
    const [selectedMethodId, setSelectedMethodId] = useState('');

    // Success toast state
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const methodsStorageKey = userId ? `provider-payout-methods-${userId}` : '';
    const payoutsStorageKey = userId ? `provider-payouts-${userId}` : '';

    useEffect(() => {
        if (!userId) return;
        const storedMethods = localStorage.getItem(methodsStorageKey);
        if (storedMethods) {
            setPayoutMethods(JSON.parse(storedMethods) as PayoutMethod[]);
        }
        const storedPayouts = localStorage.getItem(payoutsStorageKey);
        if (storedPayouts) {
            setPayouts(JSON.parse(storedPayouts) as TransferRecord[]);
        }
    }, [methodsStorageKey, payoutsStorageKey, userId]);

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
            const cleanAccountNumber = accountNumber.replace(/\D/g, '');

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
            const cleanPhone = walletPhone.replace(/\D/g, '');
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

        const currentBalance = earnings?.walletBalance ?? 0;
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
            const e = await maintenanceService.getProviderEarnings().catch(() => null);
            if (e) {
                setEarnings(e);
            } else {
                setEarnings((prev) => prev ? {
                    ...prev,
                    walletBalance: Math.max(prev.walletBalance - amount, 0)
                } : null);
            }

            setSuccessMessage(`Withdrawal of ${formatMoney(amount)} completed successfully.`);
            setShowSuccessToast(true);
            setIsWithdrawModalOpen(false);
        } catch (err: any) {
            setWithdrawError(err?.response?.data?.message ?? 'Failed to execute withdrawal. Please try again.');
        } finally {
            setIsWithdrawStarting(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const [e, mine] = await Promise.all([
                    maintenanceService.getProviderEarnings(),
                    maintenanceService.listProviderRequests(['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_CONFIRMATION']),
                ]);
                if (cancelled) return;
                setEarnings(e);
                setUpcoming(mine);
            } catch (err: any) {
                if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load earnings.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const renderOverview = () => (
        <div className="earnings-tab-content animate-fade-in">
            <div className="earnings-stats-mosaic">
                <div className="earnings-stat-card featured">
                    <div className="stat-icon-box"><FaWallet /></div>
                    <div className="stat-info">
                        <span className="stat-label">Wallet balance</span>
                        <div className="stat-value">{formatMoney(earnings?.walletBalance ?? 0)}</div>
                    </div>
                </div>
                <div className="earnings-stat-card">
                    <div className="stat-icon-box"><FaArrowUp /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total lifetime earnings</span>
                        <div className="stat-value">{formatMoney(earnings?.totalEarned ?? 0)}</div>
                    </div>
                </div>
                <div className="earnings-stat-card">
                    <div className="stat-icon-box"><FaCheckCircle /></div>
                    <div className="stat-info">
                        <span className="stat-label">Completed jobs</span>
                        <div className="stat-value">{earnings?.completedJobs ?? 0}</div>
                    </div>
                </div>
            </div>

            <div className="earnings-table-section">
                <h3 className="section-title">Recent completed jobs</h3>
                {(earnings?.recentCompleted?.length ?? 0) > 0 ? (
                    <div className="earnings-table-wrapper">
                        <table className="earnings-modern-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Service</th>
                                    <th>Job ID</th>
                                    <th>Amount earned</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {earnings!.recentCompleted.map((j) => (
                                    <tr key={j.id}>
                                        <td>{new Date(j.tenantConfirmedAt ?? j.providerCompletedAt ?? j.updatedAt).toLocaleDateString()}</td>
                                        <td className="font-semibold">{j.title}</td>
                                        <td><code className="txn-code">{j.id.slice(0, 8)}</code></td>
                                        <td className="text-success font-bold">+{formatMoney(Number(j.agreedPrice ?? 0))}</td>
                                        <td><span className="earnings-pill success">Paid</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="earnings-empty-card table-empty">
                        <div className="empty-icon-wrap"><FaHistory /></div>
                        <h4>No history yet</h4>
                        <p>Your completed maintenance jobs and payments will be listed here.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderUpcoming = () => (
        <div className="earnings-tab-content animate-fade-in">
            {upcoming.length > 0 ? (
                <>
                    <div className="earnings-table-wrapper">
                        <table className="earnings-modern-table">
                            <thead>
                                <tr>
                                    <th>Started</th>
                                    <th>Job</th>
                                    <th>Job ID</th>
                                    <th>Payout amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {upcoming.map((j) => (
                                    <tr key={j.id}>
                                        <td>{new Date(j.createdAt).toLocaleDateString()}</td>
                                        <td className="font-semibold">{j.title}</td>
                                        <td><code className="txn-code">{j.id.slice(0, 8)}</code></td>
                                        <td className="font-bold">{formatMoney(Number(j.agreedPrice ?? 0))}</td>
                                        <td><span className="earnings-pill pending">{j.status.replace('_', ' ')}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="upcoming-info-box">
                        <FaInfoCircle />
                        <p>The amount for each active job is held in escrow by HOMi. It is released to your wallet automatically once the tenant confirms the issue is resolved.</p>
                    </div>
                </>
            ) : (
                <div className="earnings-empty-card full-tab-empty">
                    <div className="empty-icon-wrap"><FaClock /></div>
                    <h4>No upcoming payouts</h4>
                    <p>You don't have any pending payments at the moment.</p>
                </div>
            )}
        </div>
    );
    const renderWithdraw = () => {
        return (
            <div className="earnings-tab-content animate-fade-in">
                <div className="earnings-withdraw-split-layout">
                    {/* Left Column: Withdraw initiating and payout methods */}
                    <div className="earnings-withdraw-left-col">
                        <div className="earnings-stat-card featured" style={{ padding: '2rem' }}>
                            <div className="stat-icon-box"><FaWallet /></div>
                            <div className="stat-info">
                                <span className="stat-label">Available to Withdraw</span>
                                <div className="stat-value">{formatMoney(earnings?.walletBalance ?? 0)}</div>
                            </div>
                            <p style={{ margin: '0.5rem 0 1rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                                {payoutMethods.length > 0 
                                    ? 'Withdraw your balance instantly to your bank account or mobile wallet.'
                                    : 'Please connect a payout method to begin withdrawing your earnings.'}
                            </p>
                            <button
                                className="earnings-withdraw-action-btn"
                                onClick={handleOpenWithdrawModal}
                                disabled={payoutMethods.length === 0 || (earnings?.walletBalance ?? 0) <= 0}
                            >
                                <FaArrowUp /> Withdraw Funds
                            </button>
                        </div>

                        <div className="earnings-methods-management-box">
                            <div className="earnings-methods-header">
                                <h3 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>Payout Methods</h3>
                                <button className="earnings-add-method-btn" onClick={() => setIsMethodModalOpen(true)}>
                                    <FaPlus /> Add New
                                </button>
                            </div>

                            {payoutMethods.length === 0 ? (
                                <div className="earnings-empty-methods-card">
                                    <div className="empty-method-icon"><FaUniversity /></div>
                                    <p>No connected bank accounts or mobile wallets yet.</p>
                                </div>
                            ) : (
                                <div className="earnings-methods-list">
                                    {payoutMethods.map((method) => (
                                        <div
                                            key={method.id}
                                            className={`earnings-method-card-item ${method.isPrimary ? 'active' : ''}`}
                                            onClick={() => setPrimaryMethod(method.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="earnings-method-icon-badge">
                                                {method.methodType === 'BANK_ACCOUNT' ? <FaUniversity /> : <FaRegCreditCard />}
                                            </div>
                                            <div className="earnings-method-details-text">
                                                <strong>
                                                    {method.methodType === 'BANK_ACCOUNT'
                                                        ? `${method.bankName}`
                                                        : `${method.methodDisplayName}`}
                                                </strong>
                                                <span>
                                                    {method.methodType === 'BANK_ACCOUNT'
                                                        ? maskAccountNumber(method.accountNumber || '')
                                                        : maskPhoneNumber(method.walletPhone || '')}
                                                </span>
                                                {method.isPrimary && <span className="earnings-primary-tag">Primary</span>}
                                            </div>
                                            {method.isPrimary && <div className="earnings-check-circle"><FaCheck /></div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Withdrawal request history */}
                    <div className="earnings-withdraw-right-col">
                        <h3 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Recent Withdrawal History</h3>
                        {payouts.length === 0 ? (
                            <div className="earnings-empty-card table-empty" style={{ padding: '3rem 1.5rem' }}>
                                <div className="empty-icon-wrap" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}><FaHistory /></div>
                                <h4>No withdrawals yet</h4>
                                <p>Your withdrawal logs and transaction history will be shown here.</p>
                            </div>
                        ) : (
                            <div className="earnings-withdrawals-history-list">
                                {payouts.map((payout) => (
                                    <div className="earnings-payout-history-row" key={payout.id}>
                                        <div className="payout-left-info">
                                            <div className="payout-status-icon-box completed">
                                                <FaCheckCircle />
                                            </div>
                                            <div className="payout-details-meta">
                                                <h5>Withdrawal #{payout.id}</h5>
                                                <span>{new Date(payout.date).toLocaleDateString()} • {payout.bankLabel}</span>
                                            </div>
                                        </div>
                                        <div className="payout-right-amount">
                                            <span className="payout-amount-value">{formatMoney(payout.amount)}</span>
                                            <span className="earnings-pill success" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>Completed</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="earnings-page-wrapper">
            <MaintenanceSideBar />
            <div className="earnings-content-area">
                <Header />
                <main className="earnings-hub">
                    <header className="earnings-hub-header">
                        <h1>Financial hub</h1>
                        <p>Track your wallet balance, escrow payouts, and complete service history.</p>
                    </header>

                    {error && (
                        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, margin: '0 0 1rem' }}>
                            {error}
                        </div>
                    )}

                    <div className="earnings-tabs-container">
                        <button
                            className={`earnings-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            <FaHistory /> Earnings history
                        </button>
                        <button
                            className={`earnings-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                            onClick={() => setActiveTab('upcoming')}
                        >
                            <FaClock /> Upcoming payouts
                        </button>
                        <button
                            className={`earnings-tab-btn ${activeTab === 'withdraw' ? 'active' : ''}`}
                            onClick={() => setActiveTab('withdraw')}
                        >
                            <FaWallet /> Withdraw funds
                        </button>
                    </div>

                    <div className="earnings-viewport">
                        {loading ? (
                            <div className="earnings-empty-card full-tab-empty"><h4>Loading…</h4></div>
                        ) : (
                            activeTab === 'overview' ? renderOverview() :
                            activeTab === 'upcoming' ? renderUpcoming() :
                            renderWithdraw()
                        )}
                    </div>
                </main>
                <Footer />
            </div>

            {isMethodModalOpen && (
                <div className="lp-modal-overlay">
                    <div className="lp-modal animate-fade-in">
                        <h3>Add Payout Method</h3>
                        <p>Add a bank account or mobile wallet for maintenance transfers.</p>

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
                                <input id="lp-account-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="Type full account number" />
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
                                <input id="lp-wallet-phone" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="01XXXXXXXXX" />

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
                    <div className="lp-modal animate-fade-in">
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
                                    setWithdrawAmount(String(earnings?.walletBalance ?? 0));
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
                                <label htmlFor="lp-withdraw-amount">Amount (EGP)</label>
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

                        <div className="lp-balance-hint">Available balance: {formatMoney(earnings?.walletBalance ?? 0)}</div>

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

            {showSuccessToast && (
                <div className="toast-success-overlay">
                    <div className="toast-card">
                        <div className="toast-icon"><FaCheckCircle size={24} /></div>
                        <div className="toast-body">
                            <h6>Success</h6>
                            <p>{successMessage}</p>
                        </div>
                        <button className="toast-close" onClick={() => setShowSuccessToast(false)}>
                            <FaTimes size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Earnings;
