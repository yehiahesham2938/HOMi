import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Building2, Clock, ChevronRight, FileText
} from 'lucide-react';
import ContractDetailView from '../components/ContractDetailView';
import ActiveLeaseContract from '../components/ActiveLeaseContract';
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
    status: 'PENDING_LANDLORD' | 'PENDING_TENANT' | 'ACTIVE' | 'EXPIRED';
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
            status: (contract.status === 'TERMINATED' ? 'EXPIRED' :
                contract.status === 'PENDING_PAYMENT' ? 'PENDING_TENANT' :
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
        });
    };

    const fetchContracts = useCallback(async () => {
        try {
            const response = await contractService.getLandlordContracts({ page: 1, limit: 50 });
            setContracts((response.data || []).map(mapContract));
        } catch {
            setContracts([]);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchContracts();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [fetchContracts]);

    const hasContracts = contracts.length > 0;

    const getStatusInfo = (status: LeaseContract['status']) => {
        const map = {
            PENDING_LANDLORD: { label: t('landlordContract.pendingSignature'), color: 'blue' },
            PENDING_TENANT: { label: t('landlordContract.pendingTenant'), color: 'yellow' },
            ACTIVE: { label: t('landlordContract.activeLease'), color: 'green' },
            EXPIRED: { label: t('landlordContract.expired'), color: 'gray' },
        };
        return map[status] || { label: 'Unknown', color: 'gray' };
    };

    return (
        <main className="landlord-contracts-page">
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

            {selectedContract && selectedContract.status !== 'ACTIVE' && (
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
        </main>
    );
};

export default LandlordContract;