import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ActiveRental.css';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import DetailedRentCard from '../components/DetailedRentCard';
import UpcomingPayment from '../components/UpcomingPayment';
import MaintenanceStatus from '../components/MaintenanceStatus';
import contractService, { type ContractInstallments, type LandlordContract } from '../../../services/contract.service';
import { propertyService, type PropertyResponse } from '../../../services/property.service';
import {
    formatDateLabel,
    getPrepaidInstallmentsCount,
    getRentInstallmentStats,
} from '../../TenantPayment/utils/rentSchedule';
import InstallmentsModal from '../components/InstallmentsModal';
import OverdueRentTable from '../components/OverdueRentTable';
import SupportHelpChat from '../../GetHelp/components/SupportHelpChat';

const formatDate = (date?: string, lang?: string): string => {
    if (!date) return 'N/A';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatLeaseEnd = (moveInDate?: string, durationMonths?: number, lang?: string): string => {
    if (!moveInDate) return 'N/A';
    const start = new Date(moveInDate);
    if (Number.isNaN(start.getTime())) return 'N/A';
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(durationMonths ?? 0));
    return formatDate(end.toISOString(), lang);
};

const ActiveRental: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [contracts, setContracts] = useState<LandlordContract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [propertyDetails, setPropertyDetails] = useState<PropertyResponse | null>(null);
    const [isPayingRent, setIsPayingRent] = useState(false);
    const [showInstallments, setShowInstallments] = useState(false);
    const [showSupportChat, setShowSupportChat] = useState(false);
    const [installmentsData, setInstallmentsData] = useState<ContractInstallments | null>(null);
    const [preferredContractId, setPreferredContractId] = useState<string>('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelScenario, setCancelScenario] = useState('Early exit');
    const [cancelDetails, setCancelDetails] = useState('');
    const [submittingCancel, setSubmittingCancel] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const [cancelSuccess, setCancelSuccess] = useState('');

    const loadContracts = useCallback(async () => {
        setIsLoading(true);
        try {
            const [contractsRes, historyRes] = await Promise.all([
                contractService.getTenantContracts({ page: 1, limit: 50 }),
                contractService.getPaymentHistory(250),
            ]);
            const all = contractsRes.data ?? [];
            const payableContracts = all.filter((contract) => {
                if (contract.status === 'ACTIVE') return true;
                if (contract.status !== 'EXPIRED') return false;
                const stats = getRentInstallmentStats(contract);
                const paidInstallments = (historyRes ?? [])
                    .filter((row) =>
                        row.type === 'RENT_MONTHLY' &&
                        row.direction === 'DEBIT' &&
                        row.entityId === contract.id
                    )
                    .reduce((sum, row) => sum + Math.max(Number(row.installmentsCount ?? 1), 1), getPrepaidInstallmentsCount(contract));
                const outstanding = Math.max(stats.dueCount - paidInstallments, 0);
                return outstanding > 0;
            });
            setContracts(payableContracts);

            const installmentsRows = await Promise.allSettled(
                payableContracts.map(async (contract) => ({
                    contractId: contract.id,
                    installments: await contractService.getContractInstallments(contract.id),
                }))
            );

            const ranked = installmentsRows
                .filter((row): row is PromiseFulfilledResult<{ contractId: string; installments: ContractInstallments }> => row.status === 'fulfilled')
                .map((row) => {
                    const dueOrOverdue = row.value.installments.items.filter(
                        (item) => item.status === 'DUE' || item.status === 'OVERDUE'
                    ).length;
                    const nextDisplay = row.value.installments.items.find(
                        (item) => item.status === 'DUE' || item.status === 'OVERDUE' || item.status === 'UPCOMING'
                    );
                    const nextDueAt = nextDisplay ? new Date(nextDisplay.dueDate).getTime() : Number.POSITIVE_INFINITY;
                    return {
                        contractId: row.value.contractId,
                        dueOrOverdue,
                        nextDueAt,
                    };
                })
                .sort((a, b) => {
                    if (a.dueOrOverdue !== b.dueOrOverdue) return b.dueOrOverdue - a.dueOrOverdue;
                    return a.nextDueAt - b.nextDueAt;
                });

            setPreferredContractId(ranked[0]?.contractId ?? payableContracts[0]?.id ?? '');
        } catch {
            setContracts([]);
            setPreferredContractId('');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadContracts();
        const handler = () => { void loadContracts(); };
        globalThis.addEventListener('homi:testing-clock-changed', handler);
        return () => globalThis.removeEventListener('homi:testing-clock-changed', handler);
    }, [loadContracts]);

    const selectedContract = useMemo(() => {
        if (!contracts.length) return null;
        if (preferredContractId) {
            const preferred = contracts.find((contract) => contract.id === preferredContractId);
            if (preferred) return preferred;
        }
        return contracts[0];
    }, [contracts, preferredContractId]);

    useEffect(() => {
        const propertyId = selectedContract?.property?.id;
        if (!propertyId) {
            setPropertyDetails(null);
            return;
        }

        let cancelled = false;

        const loadPropertyDetails = async () => {
            try {
                const response = await propertyService.getPropertyById(propertyId);
                if (!cancelled) {
                    setPropertyDetails(response.data);
                }
            } catch {
                if (!cancelled) {
                    setPropertyDetails(null);
                }
            }
        };

        void loadPropertyDetails();

        return () => {
            cancelled = true;
        };
    }, [selectedContract?.property?.id]);

    useEffect(() => {
        if (!selectedContract?.id) {
            setInstallmentsData(null);
            return;
        }

        let cancelled = false;

        const loadInstallments = async () => {
            try {
                const data = await contractService.getContractInstallments(selectedContract.id);
                if (!cancelled) setInstallmentsData(data);
            } catch {
                if (!cancelled) setInstallmentsData(null);
            }
        };

        void loadInstallments();
        const handler = () => { void loadInstallments(); };
        globalThis.addEventListener('homi:testing-clock-changed', handler);
        return () => {
            cancelled = true;
            globalThis.removeEventListener('homi:testing-clock-changed', handler);
        };
    }, [selectedContract?.id]);

    const overdueItems = useMemo(
        () => (installmentsData?.items ?? []).filter((item) => item.status === 'OVERDUE'),
        [installmentsData]
    );
    const payableItems = useMemo(
        () => (installmentsData?.items ?? []).filter((item) => item.status === 'DUE' || item.status === 'OVERDUE'),
        [installmentsData]
    );
    const nextDisplayInstallment = useMemo(() => {
        if (payableItems.length > 0) return payableItems[0];
        return (installmentsData?.items ?? []).find((item) => item.status === 'UPCOMING') ?? null;
    }, [installmentsData, payableItems]);

    const daysElapsed = useMemo((): number | null => {
        if (!selectedContract?.moveInDate || !nextDisplayInstallment || !installmentsData?.now) return null;
        if (nextDisplayInstallment.status !== 'DUE' && nextDisplayInstallment.status !== 'OVERDUE') return null;
        const moveIn = new Date(selectedContract.moveInDate);
        const periodStart = new Date(moveIn.getFullYear(), moveIn.getMonth() + nextDisplayInstallment.index, moveIn.getDate());
        const now = new Date(installmentsData.now);
        const diffMs = now.getTime() - periodStart.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }, [selectedContract?.moveInDate, nextDisplayInstallment, installmentsData?.now]);

    /** Show the inline arrears table when more than one month is unpaid OR any month is overdue OR 20+ days passed without paying. */
    const isInArrears = useMemo(
        () => overdueItems.length > 0 || payableItems.length > 1 || (daysElapsed !== null && daysElapsed >= 20),
        [overdueItems.length, payableItems.length, daysElapsed]
    );

    const dueDateLabel = nextDisplayInstallment ? formatDateLabel(nextDisplayInstallment.dueDate) : 'N/A';

    /** Smart countdown: positive = future, negative = overdue */
    const dueInDays = useMemo((): number | null => {
        if (!installmentsData?.now || !nextDisplayInstallment?.dueDate) return null;
        const now = new Date(installmentsData.now);
        const due = new Date(nextDisplayInstallment.dueDate);
        if (Number.isNaN(now.getTime()) || Number.isNaN(due.getTime())) return null;
        return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }, [installmentsData?.now, nextDisplayInstallment?.dueDate]);

    /**
     * Human-readable relative label shown next to the due date.
     *   future  → "5 days"
     *   today   → "today"
     *   overdue → "3 days overdue"
     */
    const dueInLabel = useMemo((): string => {
        if (dueInDays === null) return '';
        if (dueInDays > 0) return `${dueInDays} day${dueInDays === 1 ? '' : 's'}`;
        if (dueInDays === 0) return 'today';
        const abs = Math.abs(dueInDays);
        return `${abs} day${abs === 1 ? '' : 's'} overdue`;
    }, [dueInDays]);

    const outstandingInstallments = payableItems.length;

    /** urgent when there are any unpaid payable installments (DUE or OVERDUE) */
    const dueTone: 'safe' | 'urgent' = outstandingInstallments > 0 ? 'urgent' : 'safe';

    const estimatedLateFee = overdueItems
        .reduce((sum, item) => sum + Number(item.lateFeeAmount ?? 0), 0);
    const totalDueNow = Number(installmentsData?.nextPayableTotal ?? 0);

    const rentalData = useMemo(() => {
        if (!selectedContract) return null;

        const resolvedImage =
            propertyDetails?.images?.find((image) => image.isMain)?.imageUrl ||
            propertyDetails?.images?.[0]?.imageUrl ||
            null;

        return {
            title: propertyDetails?.title || selectedContract.property?.title || 'Property',
            address: propertyDetails?.address || selectedContract.property?.address || 'Address unavailable',
            leaseStart: formatDate(selectedContract.moveInDate, i18n.language),
            leaseEnd: formatLeaseEnd(selectedContract.moveInDate, selectedContract.leaseDurationMonths, i18n.language),
            monthlyRent: Number(selectedContract.rentAmount ?? propertyDetails?.monthlyPrice ?? selectedContract.property?.monthlyPrice ?? 0),
            landlord: `${selectedContract.landlord?.firstName || ''} ${selectedContract.landlord?.lastName || ''}`.trim() || 'Landlord',
            sqft: propertyDetails?.specifications?.areaSqft ?? selectedContract.propertySpecifications?.areaSqft ?? 0,
            image: resolvedImage,
            propertyType: propertyDetails?.type || selectedContract.property?.type || 'Apartment',
            houseRules: propertyDetails?.houseRules?.map((rule) => rule.name) ?? [],
        };
    }, [propertyDetails, selectedContract, i18n.language]);

    const handlePayNow = () => {
        if (!selectedContract || !rentalData || isPayingRent) return;
        setShowInstallments(true);
    };

    const handleInstallmentsPaid = async () => {
        setIsPayingRent(true);
        try {
            await loadContracts();
        } finally {
            setIsPayingRent(false);
        }
    };

    return (
        <div className="layout-wrapper">
            <Sidebar />
            <div className="main-content">
                <Header />
                <div className="active-rentals-container">
                    {isLoading && (
                        <div className="active-rental-state-box" style={{ marginBottom: '20px' }}>
                            <h3 className="active-rental-state-title">{t('activeRental.loadingRentalDetails')}</h3>
                        </div>
                    )}

                    {!isLoading && !rentalData && (
                        <div className="active-rental-state-box" style={{ marginBottom: '20px' }}>
                            <h3 className="active-rental-state-title">{t('activeRental.noActiveRentalFound')}</h3>
                            <p className="active-rental-state-text">{t('activeRental.noActiveRentalText')}</p>
                        </div>
                    )}

                    {!isLoading && rentalData && (
                        <>
                            <header className="active-rental-hero-banner">
                                <div className="hero-banner-content">
                                    <span className="hero-banner-eyebrow">{t('activeRental.activeLeasePortal')}</span>
                                    <h1>{t('activeRental.welcomeTo')} {rentalData.title}</h1>
                                    <p className="hero-banner-subtitle">
                                        {t('activeRental.activeLeasePortalSubtitle')}
                                    </p>
                                </div>
                                <div className="hero-banner-stats">
                                    <div className="hero-stat-box">
                                        <span className="stat-label">{t('activeRental.leaseStatus')}</span>
                                        <span className="stat-value active-pulse">{t('activeRental.active')}</span>
                                    </div>
                                    <div className="hero-stat-box">
                                        <span className="stat-label">{t('activeRental.walletBalance')}</span>
                                        <span className="stat-value highlight">${installmentsData?.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}</span>
                                    </div>

                                </div>
                            </header>

                            <div className="active-rental-content">
                                <section className="main-rental-info">
                                    <DetailedRentCard rental={rentalData} contract={selectedContract} />
                                    <MaintenanceStatus contract={selectedContract} />
                                </section>

                                <aside className="payment-sidebar">
                                    <UpcomingPayment
                                        amount={rentalData.monthlyRent}
                                        dueDate={dueDateLabel}
                                        dueInLabel={dueInLabel}
                                        dueTone={dueTone}
                                        outstandingInstallments={outstandingInstallments}
                                        estimatedLateFee={estimatedLateFee}
                                        totalDue={totalDueNow}
                                        onPayNow={handlePayNow}
                                        onTopUp={() => navigate('/tenant-payment?tab=topup')}
                                        isPaying={isPayingRent}
                                        isCurrentCyclePaid={outstandingInstallments <= 0}
                                        isInArrears={isInArrears}
                                        isTerminationApproved={installmentsData?.isTerminationApproved}
                                    />

                                    <div className="support-card">
                                        <h4>{t('activeRental.needHelp')}</h4>
                                        <p>{t('activeRental.needHelpSubtitle')}</p>
                                        <button className="secondary-btn" onClick={() => setShowSupportChat(true)}>{t('activeRental.contactSupport')}</button>
                                    </div>

                                     <div className="cancel-rental-card">
                                         <h4>{t('activeRental.terminateLease')}</h4>
                                         <p>{t('activeRental.terminateLeaseSubtitle')}</p>
                                         <button className="cancel-btn" onClick={() => setShowCancelModal(true)}>{t('activeRental.cancelRental')}</button>
                                     </div>
                                </aside>
                            </div>
                            {isInArrears && installmentsData && (
                                <OverdueRentTable
                                    installments={installmentsData}
                                    onPayNow={handlePayNow}
                                    isPaying={isPayingRent}
                                />
                            )}
                        </>
                    )}
                </div>
                <Footer />
            </div>
            {showInstallments && selectedContract && (
                <InstallmentsModal
                    contractId={selectedContract.id}
                    contractTitle={rentalData?.title ?? 'Contract'}
                    onClose={() => setShowInstallments(false)}
                    onPaid={() => {
                        void handleInstallmentsPaid();
                    }}
                />
            )}
            {showSupportChat && (
                <SupportHelpChat
                    isOpen={showSupportChat}
                    onClose={() => setShowSupportChat(false)}
                />
            )}
            {showCancelModal && selectedContract && (
                <div className="modal-backdrop" onClick={() => setShowCancelModal(false)}>
                    <div className="modal-card cancel-lease-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-head">
                            <h2>{t('activeRental.requestLeaseTermination')}</h2>
                            <button type="button" className="close-btn" onClick={() => setShowCancelModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto' }}>
                            <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>
                                {t('activeRental.terminationInstruction')}
                            </p>
                            {cancelError && <div className="error-message" style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>{cancelError}</div>}
                            {cancelSuccess && <div className="success-message" style={{ color: '#10b981', marginBottom: '12px', fontSize: '13px', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>{cancelSuccess}</div>}

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('activeRental.terminationReason')}</label>
                                <select 
                                    value={cancelScenario} 
                                    onChange={(e) => setCancelScenario(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                >
                                    <option value="Early exit">{t('activeRental.earlyExit')}</option>
                                    <option value="Property uninhabitable">{t('activeRental.propertyUninhabitable')}</option>
                                    <option value="Landlord breached contract">{t('activeRental.landlordBreachedContract')}</option>
                                    <option value="Mutual Agreement">{t('activeRental.mutualAgreement')}</option>
                                </select>
                            </div>

                            {/* Settlement breakdowns */}
                            <div className="settlement-preview-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('activeRental.expectedSettlementTerms')}</h4>
                                {cancelScenario === 'Early exit' && (
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                                        <li>{t('activeRental.earlyExitTerms1')}</li>
                                        <li>{t('activeRental.earlyExitTerms2')}</li>
                                        <li>{t('activeRental.earlyExitTerms3')}</li>
                                    </ul>
                                )}
                                {cancelScenario === 'Property uninhabitable' && (
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                                        <li>{t('activeRental.uninhabitableTerms1')}</li>
                                        <li>{t('activeRental.uninhabitableTerms2')}</li>
                                        <li>{t('activeRental.uninhabitableTerms3')}</li>
                                    </ul>
                                )}
                                {cancelScenario === 'Landlord breached contract' && (
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                                        <li>{t('activeRental.landlordBreachTerms1')}</li>
                                        <li>{t('activeRental.landlordBreachTerms2')}</li>
                                        <li>{t('activeRental.landlordBreachTerms3')}</li>
                                    </ul>
                                )}
                                {cancelScenario === 'Mutual Agreement' && (
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                                        <li>{t('activeRental.mutualAgreementTerms1')}</li>
                                        <li>{t('activeRental.mutualAgreementTerms2')}</li>
                                        <li>{t('activeRental.mutualAgreementTerms3')}</li>
                                    </ul>
                                )}
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('activeRental.detailsAndExplanation')}</label>
                                <textarea
                                    value={cancelDetails}
                                    onChange={(e) => setCancelDetails(e.target.value)}
                                    placeholder={t('activeRental.detailsPlaceholder')}
                                    style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', fontSize: '14px' }}
                                />
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button 
                                    className="secondary-btn" 
                                    type="button" 
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={submittingCancel}
                                    style={{ padding: '10px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    {t('activeRental.cancel')}
                                </button>
                                <button 
                                    className="cancel-btn" 
                                    type="button" 
                                    onClick={async () => {
                                        if (!cancelDetails.trim()) {
                                            setCancelError(t('activeRental.enterDetailsError'));
                                            return;
                                        }
                                        setSubmittingCancel(true);
                                        setCancelError('');
                                        setCancelSuccess('');
                                        try {
                                            await contractService.terminateLease(selectedContract.id, {
                                                scenario: cancelScenario,
                                                details: cancelDetails
                                            });
                                            setCancelSuccess(t('activeRental.terminationSuccess'));
                                            setTimeout(() => {
                                                setShowCancelModal(false);
                                                setCancelDetails('');
                                                setCancelScenario('Early exit');
                                                setCancelSuccess('');
                                                void loadContracts();
                                            }, 2500);
                                        } catch (err: any) {
                                            setCancelError(err.response?.data?.message || t('activeRental.terminationFailed'));
                                        } finally {
                                            setSubmittingCancel(false);
                                        }
                                    }}
                                    disabled={submittingCancel}
                                    style={{ padding: '10px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    {submittingCancel ? t('activeRental.submitting') : t('activeRental.submitRequest')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveRental;