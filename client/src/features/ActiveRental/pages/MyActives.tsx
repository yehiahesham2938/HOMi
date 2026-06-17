import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './MyActives.css';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import RentedPropertyCard from '../components/RentedPropertyCard';
import contractService, { type LandlordContract, type TenantPaymentHistoryItem } from '../../../services/contract.service';
import { propertyService, type PropertyResponse } from '../../../services/property.service';
import { getPrepaidInstallmentsCount, getRentInstallmentStats } from '../../TenantPayment/utils/rentSchedule';
import { getEffectiveNow } from '../../../shared/utils/testingClock';

const MyActives: React.FC = () => {
    // Hooks for routing and state
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const [contracts, setContracts] = useState<LandlordContract[]>([]);
    const [propertyById, setPropertyById] = useState<Record<string, PropertyResponse>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [paymentHistory, setPaymentHistory] = useState<TenantPaymentHistoryItem[]>([]);

    useEffect(() => {
        const loadActiveContracts = async () => {
            setIsLoading(true);
            try {
                const [response, history] = await Promise.all([
                    contractService.getTenantContracts({ page: 1, limit: 50 }),
                    contractService.getPaymentHistory(250),
                ]);
                setPaymentHistory(history ?? []);
                const allContracts = response.data ?? [];
                // Show:
                //  • ACTIVE contracts (regardless of whether move-in is past or future)
                //  • EXPIRED contracts that still have outstanding rent dues
                // The "Starting Soon" label below is rendered for ACTIVE contracts
                // whose moveInDate is later than the test-aware "now".
                const visibleContracts = allContracts.filter((contract) => {
                    if (contract.status === 'ACTIVE') return true;
                    if (contract.status !== 'EXPIRED') return false;
                    const stats = getRentInstallmentStats(contract);
                    // Seed with the activation prepay (always 1 month for an
                    // active/expired contract) so the first scheduled installment
                    // is correctly recognised as paid before any monthly debit.
                    const paidInstallments = (history ?? [])
                        .filter((row) =>
                            row.type === 'RENT_MONTHLY' &&
                            row.direction === 'DEBIT' &&
                            row.entityId === contract.id
                        )
                        .reduce(
                            (sum, row) => sum + Math.max(Number(row.installmentsCount ?? 1), 1),
                            getPrepaidInstallmentsCount(contract)
                        );
                    const outstanding = Math.max(stats.dueCount - paidInstallments, 0);
                    return outstanding > 0;
                });
                setContracts(visibleContracts);
            } catch {
                setContracts([]);
                setPropertyById({});
                setPaymentHistory([]);
            } finally {
                setIsLoading(false);
            }
        };

        void loadActiveContracts();
        const handler = () => { void loadActiveContracts(); };
        globalThis.addEventListener('homi:testing-clock-changed', handler);
        return () => globalThis.removeEventListener('homi:testing-clock-changed', handler);
    }, []);

    useEffect(() => {
        const propertyIds = Array.from(
            new Set(contracts.map((contract) => contract.property?.id).filter((id): id is string => Boolean(id)))
        );

        if (propertyIds.length === 0) {
            setPropertyById({});
            return;
        }

        let cancelled = false;

        const loadPropertyDetails = async () => {
            const results = await Promise.allSettled(
                propertyIds.map(async (propertyId) => {
                    const response = await propertyService.getPropertyById(propertyId);
                    return response.data;
                })
            );

            if (cancelled) {
                return;
            }

            const nextById: Record<string, PropertyResponse> = {};
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    nextById[result.value.id] = result.value;
                }
            }

            setPropertyById(nextById);
        };

        void loadPropertyDetails();

        return () => {
            cancelled = true;
        };
    }, [contracts]);

    const formatDate = (value: Date): string =>
        value.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const formatLeaseEnd = (contract: LandlordContract): string => {
        const start = new Date(contract.moveInDate);
        if (Number.isNaN(start.getTime())) return 'N/A';

        const end = new Date(start);
        end.setMonth(end.getMonth() + Number(contract.leaseDurationMonths ?? 0));

        return formatDate(end);
    };

    const formatLeaseStart = (contract: LandlordContract): string => {
        const start = new Date(contract.moveInDate);
        if (Number.isNaN(start.getTime())) return 'N/A';
        return formatDate(start);
    };

    /**
     * Lease status is computed against the test-aware "now" so toggling the
     * testing clock instantly relabels cards (e.g. a contract with move-in
     * tomorrow flips to "Starting Soon" before the simulated date, then to
     * "Active" once the clock advances past it).
     */
    const getLeaseStatus = (
        contract: LandlordContract
    ): 'Starting Soon' | 'Active' | 'Expiring Soon' | 'Pending Renewal' | 'Ended' => {
        if (contract.status === 'EXPIRED') return 'Ended';
        const now = getEffectiveNow();
        const start = new Date(contract.moveInDate);
        if (Number.isNaN(start.getTime())) return 'Active';

        if (start.getTime() > now.getTime()) return 'Starting Soon';

        const end = new Date(start);
        end.setMonth(end.getMonth() + Number(contract.leaseDurationMonths ?? 0));

        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) return 'Expiring Soon';
        return 'Active';
    };

    const activeRentals = useMemo(() => {
        return contracts.map((contract) => {
            const propertyId = contract.property?.id ?? '';
            const propertyDetails = propertyId ? propertyById[propertyId] : undefined;
            const realImage =
                propertyDetails?.images?.find((image) => image.isMain)?.imageUrl ||
                propertyDetails?.images?.[0]?.imageUrl ||
                null;

            const stats = getRentInstallmentStats(contract);
            const paidInstallments = paymentHistory
                .filter((row) =>
                    row.type === 'RENT_MONTHLY' &&
                    row.direction === 'DEBIT' &&
                    row.entityId === contract.id
                )
                .reduce(
                    (sum, row) => sum + Math.max(Number(row.installmentsCount ?? 1), 1),
                    getPrepaidInstallmentsCount(contract)
                );
            const outstanding = Math.max(stats.dueCount - paidInstallments, 0);
            const leaseStatus = getLeaseStatus(contract);
            // Show "Late Payments" badge only when there are genuinely overdue
            // installments — i.e. installments whose due date is already in the
            // past AND that haven't been paid yet. A rent that is merely "due
            // soon" (within the next 30 days) is NOT late.
            const overdueUnpaid = Math.max(stats.overdueCount - paidInstallments, 0);
            const showLatePayments = leaseStatus !== 'Starting Soon' && leaseStatus !== 'Ended' && overdueUnpaid > 0;
            // A separate flag for expired contracts that still carry unpaid rent —
            // these get distinct messaging so the tenant knows the lease is over
            // but there is still a balance to settle.
            const endedWithDebt = leaseStatus === 'Ended' && outstanding > 0;
            return {
                id: contract.id,
                title: propertyDetails?.title || contract.property?.title || 'Property',
                address: propertyDetails?.address || contract.property?.address || 'Address unavailable',
                leaseStart: formatLeaseStart(contract),
                leaseEnd: formatLeaseEnd(contract),
                status: leaseStatus,
                image: realImage,
                latePayments: showLatePayments,
                endedWithDebt,
                unpaidMonths: endedWithDebt ? outstanding : 0,
            };
        });
    }, [contracts, paymentHistory, propertyById]);

    const hasData = activeRentals.length > 0;
    let rentalsContent: React.ReactNode;

    if (isLoading) {
        rentalsContent = (
            <div className="empty-state-container">
                <h3 className="empty-state-title">{t('activeRental.loadingActiveRentals')}</h3>
            </div>
        );
    } else if (hasData) {
        rentalsContent = (
            <div className="rentals-grid">
                {activeRentals.map(property => (
                    <RentedPropertyCard key={property.id} property={property} />
                ))}
            </div>
        );
    } else {
        rentalsContent = (
            <div className="empty-state-container">
                <Home size={56} className="empty-state-icon" />
                <h3 className="empty-state-title">{t('activeRental.noActiveRentals')}</h3>
                <p className="empty-state-text">
                    {t('activeRental.noActiveRentalsText')}
                </p>
                <button 
                    className="btn-empty-state"
                    onClick={() => navigate('/sent-requests')}
                >
                    {t('activeRental.viewRentRequests')}
                </button>
            </div>
        );
    }

    return (
        <div className="layout-wrapper">
            <Sidebar />
            <div className="main-content">
                <Header />
                <div className="my-actives-container">
                    <div className="page-intro">
                        <div>
                            <h1>{t('activeRental.myActiveRentals')}</h1>
                            <p>{t('activeRental.myActiveRentalsSubtitle')}</p>
                        </div>
                        <div className="stats-mini-grid">
                            <div className="stat-pill"><strong>{activeRentals.length}</strong> {t('activeRental.propertiesCount')}</div>
                            <div className="stat-pill"><strong>0</strong> {t('activeRental.pendingMaintenance')}</div>
                        </div>
                    </div>

                    {rentalsContent}
                </div>
                <Footer />
            </div>
        </div>
    );
};

export default MyActives;