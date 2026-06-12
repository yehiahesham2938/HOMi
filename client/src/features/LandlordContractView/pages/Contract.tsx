import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Landlord/sidebar';
import Footer from '../../../components/global/footer';
import {
    Building2, Clock, ChevronRight, FileText
} from 'lucide-react';
import ContractDetailView from '../components/ContractDetailView';
import ActiveLeaseContract from '../components/ActiveLeaseContract';
import TerminatedLeaseContract from '../components/TerminatedLeaseContract';
import ExpiredLeaseContract from '../components/ExpiredLeaseContract';
import contractService, { type LandlordContract as LandlordContractApi } from '../../../services/contract.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';
import './Contract.css';

export interface LeaseContract {
    id: string;
    internalId: string;
    property: string;
    tenant: string;
    landlord: string;
    amount: number;
    deposit: number;
    status: 'PENDING_LANDLORD' | 'PENDING_TENANT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
    startDate: string;
    duration: string;
    rentDueDate: string;
    lateFeeAmount: number;
    maxOccupants: number;
    propertyAddress: string;
    propertyType: string;
    propertyFurnishing: string;
    tenantEmail: string;
    landlordEmail: string;
    landlordNationalId?: string;
    certifyOwnership?: boolean;
    propertyRegistrationNumber: string;
    createdAt: string;
    maintenanceResponsibilities: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
    landlordSignature?: string;
    tenantSignature?: string;
    tenantNationalId?: string;
    landlordAddress?: string;
    tenantAddress?: string;
    permittedUse?: string;
    rightToEnter?: string;
    noticePeriod?: string;
    leaseId?: string;
    tenantEmergencyContactName?: string;
    tenantEmergencyPhone?: string;
    terminationRequests?: Array<{
        id: string;
        status: string;
        reason: string;
        createdAt: string;
        requesterId: string;
    }>;
}

import { useTranslation } from 'react-i18next';

const LandlordContract: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [selectedContract, setSelectedContract] = useState<LeaseContract | null>(null);
    const [contracts, setContracts] = useState<LeaseContract[]>([]);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const mapContract = (contract: LandlordContractApi): LeaseContract => {
        const apiContract = contract as LandlordContractApi & {
            certifyOwnership?: boolean;
            certify_ownership?: boolean;
        };
        return ({
            id: contract.contractId,
            internalId: contract.id,
            property: contract.property?.title || 'Property',
            tenant: `${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}`.trim() || 'Tenant',
            landlord: `${contract.landlord?.firstName || ''} ${contract.landlord?.lastName || ''}`.trim() || 'Landlord',
            amount: contract.rentAmount || 0,
            deposit: contract.securityDeposit || 0,
            status: (contract.status === 'PENDING_PAYMENT' ? 'PENDING_TENANT' :
                contract.status) as LeaseContract['status'],
            startDate: formatDate(contract.moveInDate),
            duration: `${contract.leaseDurationMonths} Months`,
            rentDueDate: contract.rentDueDate || '1ST_OF_MONTH',
            lateFeeAmount: contract.lateFeeAmount || 0,
            maxOccupants: contract.maxOccupants || 1,
            propertyAddress: contract.property?.address || '—',
            propertyType: contract.property?.type || 'Residential',
            propertyFurnishing: contract.property?.furnishing || 'N/A',
            tenantEmail: contract.tenant?.email || '',
            landlordEmail: contract.landlord?.email || '',
            landlordNationalId: contract.landlordNationalId || '',
            certifyOwnership: apiContract.certifyOwnership ?? apiContract.certify_ownership ?? false,
            propertyRegistrationNumber: contract.propertyRegistrationNumber || '',
            createdAt: contract.createdAt,
            maintenanceResponsibilities: contract.property?.maintenanceResponsibilities || [],
            landlordSignature: normalizeSignatureUrl(contract.landlordSignatureUrl ?? contract.landlord?.signatureUrl),
            tenantSignature: normalizeSignatureUrl(contract.tenantSignatureUrl ?? contract.tenant?.signatureUrl),
            tenantNationalId: contract.tenantNationalId || '',
            landlordAddress: 'Verified Legal Address on File', // Placeholder for now or pull from profile if available
            tenantAddress: contract.property?.address || '—',
            permittedUse: 'Residential Only',
            rightToEnter: 'With 24h Prior Notice',
            noticePeriod: '30 Days',
            leaseId: contract.leaseId || undefined,
            tenantEmergencyContactName: contract.tenantEmergencyContactName || '',
            tenantEmergencyPhone: contract.tenantEmergencyPhone || '',
            terminationRequests: contract.terminationRequests || [],
        });
    };

    const fetchContracts = useCallback(async () => {
        try {
            const [response, clock] = await Promise.all([
                contractService.getLandlordContracts({ page: 1, limit: 50 }),
                contractService.getTestingClock()
            ]);
            const referenceDate = clock?.now ? new Date(clock.now) : new Date();
            const mapped = (response.data || [])
                .map(mapContract)
                .filter((c) => {
                    const isPending = c.status === 'PENDING_LANDLORD' || c.status === 'PENDING_TENANT';
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

    const getStatusInfo = (status: LeaseContract['status']) => {
        const map: Record<LeaseContract['status'], { label: string; color: string }> = {
            PENDING_LANDLORD: { label: t('landlordContract.pendingSignature'), color: 'blue' },
            PENDING_TENANT: { label: t('landlordContract.pendingTenant'), color: 'yellow' },
            ACTIVE: { label: t('landlordContract.activeLease'), color: 'green' },
            EXPIRED: { label: t('landlordContract.expired'), color: 'gray' },
            TERMINATED: { label: 'Terminated', color: 'red' },
        };
        return map[status] || { label: 'Unknown', color: 'gray' };
    };

    return (
        <div className="dashboard-shell">
            <Sidebar />
            <div className="landlord-contract-content">
                <Header />
                <main className="landlord-contract-hub">
                    <div className="landlord-hub-header">
                        <div>
                            <h1>{t('landlordContract.pageTitle')}</h1>
                            <p>{t('landlordContract.pageSubtitle')}</p>
                        </div>

                    </div>

                    {hasContracts ? (
                        <div className="contract-list-grid">
                            {contracts.map(contract => (
                                <div key={contract.id} className="contract-card">
                                    <div className="card-status-bar" data-status={contract.status.toLowerCase()}></div>
                                    <div className="card-body">
                                        <div className="card-top">
                                            <span className="contract-id">{contract.id}</span>
                                            <span className={`status-tag ${contract.status.toLowerCase()}`}>
                                                {getStatusInfo(contract.status).label}
                                            </span>
                                        </div>
                                        <h3>{contract.property}</h3>
                                        <div className="card-meta">
                                            <div className="meta-item"><Building2 size={14} /> {contract.duration}</div>
                                            <div className="meta-item"><Clock size={14} /> {t('landlordContract.starts')} {contract.startDate}</div>
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <div className="price-info">
                                            <span className="label">{t('landlordContract.monthlyRevenue')}</span>
                                            <span className="value">${contract.amount}</span>
                                        </div>
                                        <button className="btn-view-contract" onClick={() => setSelectedContract(contract)}>
                                            {contract.status === 'PENDING_LANDLORD' ? t('landlordContract.manage') : t('landlordContract.view')} <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state-container" style={{
                            textAlign: 'center', padding: '80px 20px',
                            backgroundColor: 'var(--saas-card-bg)',
                            borderRadius: '14px', border: '1px dashed var(--saas-border-hover)'
                        }}>
                            <FileText size={48} color="var(--saas-text-muted)" style={{ margin: '0 auto 16px' }} />
                            <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--saas-text-main)' }}>{t('landlordContract.noActiveAgreements')}</h2>
                            <p style={{ color: 'var(--saas-text-muted)', marginBottom: '24px' }}>{t('landlordContract.noContractsText')}</p>
                            <button
                                className="btn-primary"
                                style={{ margin: '0 auto' }}
                                onClick={() => navigate('/rental-requests')}
                            >
                                {t('landlordContract.viewRentalRequests')}
                            </button>
                        </div>
                    )}
                </main>
                <Footer />
            </div>

            {selectedContract && (selectedContract.status === 'PENDING_LANDLORD' || selectedContract.status === 'PENDING_TENANT') && (
                <ContractDetailView
                    contract={selectedContract}
                    isReadOnly={selectedContract.status !== 'PENDING_LANDLORD'}
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

export default LandlordContract;