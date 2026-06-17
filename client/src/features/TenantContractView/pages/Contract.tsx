import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import ActiveLeaseContract from '../components/ActiveLeaseContract';
import TerminatedLeaseContract from '../components/TerminatedLeaseContract';
import ExpiredLeaseContract from '../components/ExpiredLeaseContract';

import { FileText, Clock, Building2, ChevronRight } from 'lucide-react';
import ContractDetailView from '../components/ContractDetailView';
import contractService, { type LandlordContract as ContractApi } from '../../../services/contract.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';
import './Contract.css';

export type ContractStatus = 'PENDING_TENANT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface LeaseContract {
    id: string;
    internalId: string;
    property: string;
    tenant: string;
    landlord: string;
    landlordEmail: string;
    tenantEmail: string;
    amount: number;
    deposit: number;
    status: ContractStatus;
    startDate: string;
    duration: string;
    createdAt: string;
    leaseId: string;
    rentDueDate: string;
    lateFeeAmount: number;
    maxOccupants: number;
    propertyAddress: string;
    propertyType: string;
    propertyFurnishing: string;
    tenantNationalId: string;
    tenantEmergencyContactName: string;
    tenantEmergencyPhone: string;
    maintenanceResponsibilities: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
    landlordSignature?: string;
    tenantSignature?: string;
    landlordNationalId?: string;
    landlordAddress?: string;
    tenantAddress?: string;
    permittedUse?: string;
    rightToEnter?: string;
    noticePeriod?: string;
    terminationRequests?: Array<{
        id: string;
        status: string;
        reason: string;
        createdAt: string;
        requesterId: string;
    }>;
}

import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n/i18n';

const Contract: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selectedContract, setSelectedContract] = useState<LeaseContract | null>(null);
    const [contracts, setContracts] = useState<LeaseContract[]>([]);

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString(locale, { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const mapStatus = (status: ContractApi['status']): ContractStatus => {
        if (status === 'ACTIVE') return 'ACTIVE';
        if (status === 'TERMINATED') return 'TERMINATED';
        if (status === 'EXPIRED') return 'EXPIRED';
        if (status === 'PENDING_PAYMENT') return 'PENDING_PAYMENT';
        return 'PENDING_TENANT';
    };

    const mapContract = (contract: ContractApi): LeaseContract => ({
        id: contract.contractId,
        internalId: contract.id,
        property: contract.property?.title || t('tenantHomeComponents.activeRental', 'Property'),
        tenant: `${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}`.trim() || t('activeLease.tenant', 'Tenant'),
        landlord: `${contract.landlord?.firstName || ''} ${contract.landlord?.lastName || ''}`.trim() || t('activeLease.landlord', 'Landlord'),
        landlordEmail: contract.landlord?.email || '',
        tenantEmail: contract.tenant?.email || '',
        amount: contract.rentAmount || 0,
        deposit: contract.securityDeposit || 0,
        status: mapStatus(contract.status),
        startDate: formatDate(contract.moveInDate),
        duration: t('tenantContract.monthsCount', { count: contract.leaseDurationMonths, defaultValue: `${contract.leaseDurationMonths} Months` }),
        createdAt: contract.createdAt,
        leaseId: contract.leaseId || '—',
        rentDueDate: contract.rentDueDate || '1ST_OF_MONTH',
        lateFeeAmount: contract.lateFeeAmount || 0,
        maxOccupants: contract.maxOccupants || 1,
        propertyAddress: contract.property?.address || '—',
        propertyType: contract.property?.type || 'Residential',
        propertyFurnishing: contract.property?.furnishing || 'N/A',
        tenantNationalId: contract.tenantNationalId || '',
        tenantEmergencyContactName: contract.tenantEmergencyContactName || '',
        tenantEmergencyPhone: contract.tenantEmergencyPhone || '',
        maintenanceResponsibilities: contract.property?.maintenanceResponsibilities || [],
        landlordSignature: normalizeSignatureUrl(contract.landlordSignatureUrl ?? contract.landlord?.signatureUrl),
        tenantSignature: normalizeSignatureUrl(contract.tenantSignatureUrl ?? contract.tenant?.signatureUrl),
        landlordNationalId: contract.landlordNationalId || '',
        landlordAddress: t('tenantContract.verifiedAddressOnFile', 'Verified Legal Address on File'),
        tenantAddress: contract.property?.address || '—',
        permittedUse: t('tenantContract.permittedUseResidential', 'Residential Only'),
        rightToEnter: t('tenantContract.rightToEnter24h', 'With 24h Prior Notice'),
        noticePeriod: t('tenantContract.noticePeriod30', '30 Days'),
        terminationRequests: contract.terminationRequests || [],
    });

    const fetchContracts = useCallback(async () => {
        try {
            const [response, clock] = await Promise.all([
                contractService.getTenantContracts({ page: 1, limit: 50 }),
                contractService.getTestingClock()
            ]);
            const referenceDate = clock?.now ? new Date(clock.now) : new Date();
            const mapped = (response.data || [])
                .map(mapContract)
                .filter((c) => c.status === 'PENDING_TENANT' || c.status === 'PENDING_PAYMENT' || c.status === 'ACTIVE' || c.status === 'EXPIRED' || c.status === 'TERMINATED')
                .filter((c) => {
                    const isPending = c.status === 'PENDING_TENANT' || c.status === 'PENDING_PAYMENT';
                    if (isPending && c.createdAt) {
                        const createdDate = new Date(c.createdAt);
                        const diffTime = referenceDate.getTime() - createdDate.getTime();
                        const diffDays = diffTime / (1000 * 60 * 60 * 24);
                        if (diffDays > 10) return false;
                    }
                    return true;
                });
            setContracts(mapped);
        } catch {
            setContracts([]);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchContracts();
        }, 0);
        const handler = () => { void fetchContracts(); };
        globalThis.addEventListener('homi:testing-clock-changed', handler);
        return () => {
            window.clearTimeout(timer);
            globalThis.removeEventListener('homi:testing-clock-changed', handler);
        };
    }, [fetchContracts]);

    const hasContracts = contracts.length > 0;

    const getStatusInfo = (status: ContractStatus) => {
        const map: Record<ContractStatus, { label: string; color: string }> = {
            PENDING_TENANT: { label: t('tenantContract.pendingSignature'), color: 'blue' },
            PENDING_PAYMENT: { label: t('tenantContract.pendingPayment'), color: 'yellow' },
            ACTIVE: { label: t('tenantContract.activeLease'), color: 'green' },
            EXPIRED: { label: t('tenantContract.leaseEnded'), color: 'gray' },
            TERMINATED: { label: t('tenantContract.terminatedLease', 'Terminated'), color: 'red' },
        };
        return map[status];
    };

    return (
        <div className="tenant-contract-shell">
            <Sidebar />
            <div className="tenant-contract-content">
                <Header />
                <main className="tenant-contract-hub">
                    <div className="tenant-contract-header">
                        <div>
                            <h1>{t('tenantContract.pageTitle')}</h1>
                            <p>{t('tenantContract.pageSubtitle')}</p>
                        </div>

                    </div>

                    {hasContracts ? (
                        <div className="contract-list-grid">
                            {contracts.map(contract => (
                                <div key={contract.id} className="tenant-contract-card">
                                    <div className="card-status-bar" data-status={contract.status === 'PENDING_TENANT' ? 'signing' : contract.status.toLowerCase()}></div>
                                    <div className="tenant-card-body">
                                        <div className="tenant-card-top">
                                            <span className="contract-id">{contract.id}</span>
                                            <span className={`status-tag ${contract.status === 'PENDING_TENANT' ? 'signing' : contract.status.toLowerCase()}`}>
                                                {getStatusInfo(contract.status).label}
                                            </span>
                                        </div>
                                        <h3>{contract.property}</h3>
                                        <div className="tenant-card-meta">
                                            <div className="meta-item"><Building2 size={14} /> {contract.duration}</div>
                                            <div className="meta-item"><Clock size={14} /> {t('tenantContract.starts')} {contract.startDate}</div>
                                        </div>
                                        <div className="tenant-card-footer">
                                            <div className="tenant-footer-amounts">
                                                <div className="price-info">
                                                    <span className="label">{t('tenantContract.monthlyRent')}</span>
                                                    <span className="value">${contract.amount.toLocaleString(locale)}</span>
                                                </div>
                                                <div className="price-info">
                                                    <span className="label">{t('tenantContract.securityDeposit', 'Security Deposit')}</span>
                                                    <span className="value deposit-value">${contract.deposit.toLocaleString(locale)}</span>
                                                </div>
                                            </div>
                                            <button
                                                className="btn-view-contract"
                                                onClick={() => {
                                                    if (contract.status === 'PENDING_PAYMENT') {
                                                        globalThis.location.href = '/tenant-payment?tab=pending';
                                                    } else {
                                                        setSelectedContract(contract);
                                                    }
                                                }}
                                            >
                                                {contract.status === 'PENDING_PAYMENT'
                                                    ? t('tenantContract.payNow')
                                                    : contract.status === 'EXPIRED'
                                                        ? t('tenantContract.settleDues')
                                                        : contract.status === 'TERMINATED'
                                                            ? t('tenantContract.viewDetails', 'View Details')
                                                            : t('tenantContract.viewDetails')}
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="tenant-contract-empty-state" style={{
                            textAlign: 'center', padding: '80px 20px',
                            backgroundColor: 'var(--saas-card-bg)',
                            borderRadius: '14px', border: '1px dashed var(--saas-border-hover)'
                        }}>
                            <FileText size={48} color="var(--saas-text-muted)" style={{ margin: '0 auto 16px' }} />
                            <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--saas-text-main)' }}>{t('tenantContract.noLeaseAgreements')}</h2>
                            <p style={{ color: 'var(--saas-text-muted)', marginBottom: '24px' }}>{t('tenantContract.noContractsText')}</p>
                            <button
                                className="btn-primary"
                                style={{ margin: '0 auto' }}
                                onClick={() => navigate('/sent-requests')}
                            >
                                {t('tenantContract.viewSentRequests')}
                            </button>
                        </div>
                    )}
                </main>
                <Footer />
            </div>

            {selectedContract?.status === 'PENDING_TENANT' && (
                <ContractDetailView
                    contract={selectedContract}
                    onUpdated={fetchContracts}
                    onClose={() => setSelectedContract(null)}
                />
            )}

            {selectedContract?.status === 'ACTIVE' && (
                <ActiveLeaseContract
                    contract={selectedContract}
                    onClose={() => setSelectedContract(null)}
                />
            )}

            {selectedContract?.status === 'TERMINATED' && (
                <TerminatedLeaseContract
                    contract={selectedContract}
                    onClose={() => setSelectedContract(null)}
                />
            )}

            {selectedContract?.status === 'EXPIRED' && (
                <ExpiredLeaseContract
                    contract={selectedContract}
                    onClose={() => setSelectedContract(null)}
                />
            )}
        </div>
    );
};

export default Contract;