import apiClient from '../config/api';
import { clearTestingClockCache, saveTestingClockSnapshot } from '../shared/utils/testingClock';

export interface ContractPaymentTerms {
    rentAmount: number | null;
    securityDeposit: number | null;
    serviceFee: number;
}

export interface ContractDetails {
    id: string;
    contractId: string;
    status: string;
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
    paymentTerms: ContractPaymentTerms;
}

interface ContractApiResponse {
    success: boolean;
    data: {
        id: string;
        contractId: string;
        status: string;
        paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
        rentAmount: number | null;
        securityDeposit: number | null;
        serviceFee: number;
    };
}

interface InitiatePaymobResponse {
    success: boolean;
    data: {
        checkoutUrl: string;
        amountCents: number;
        orderId: number;
        currency: string;
    };
}

interface WalletBalanceApiResponse {
    success: boolean;
    data: {
        balance: number;
        currency: string;
    };
}

interface WalletTopupCheckoutResponse {
    success: boolean;
    data: {
        checkoutUrl: string;
        amountCents: number;
        orderId: number;
        currency: string;
    };
}

export type WalletTopupPaymentMethod = 'CARD' | 'WALLET';

interface BalancePaymentApiResponse {
    success: boolean;
    data: {
        contract: LandlordContract;
        remainingBalance: number;
        debitedAmount: number;
    };
}

interface MonthlyRentPaymentApiResponse {
    success: boolean;
    data: {
        contract: LandlordContract;
        remainingBalance: number;
        debitedAmount: number;
        paidForMonth: string;
        lateFeeApplied?: number;
        wasLate?: boolean;
        installmentsPaid?: number;
    };
}

export type TenantPaymentHistoryType =
    | 'CONTRACT_INITIAL'
    | 'RENT_MONTHLY'
    | 'MAINTENANCE'
    | 'MAINTENANCE_REFUND';

export interface TenantPaymentHistoryItem {
    id: string;
    createdAt: string;
    type: TenantPaymentHistoryType;
    direction: 'DEBIT' | 'CREDIT';
    amount: number;
    currency: 'EGP';
    status: 'SUCCESS';
    reference: string;
    description: string;
    entityType: string | null;
    entityId: string | null;
    installmentsCount?: number;
}

interface TenantPaymentHistoryApiResponse {
    success: boolean;
    data: TenantPaymentHistoryItem[];
}

interface TestingClockState {
    enabled: boolean;
    offsetDays: number;
    now: string;
    autopay?: { contractsSettled: number };
}

interface TestingClockApiResponse {
    success: boolean;
    data: TestingClockState;
}

export type RentInstallmentStatus = 'PAID' | 'DUE' | 'OVERDUE' | 'UPCOMING';

export interface RentInstallmentItem {
    index: number;
    label: string;
    dueDate: string;
    rentAmount: number;
    lateFeeAmount: number;
    totalAmount: number;
    status: RentInstallmentStatus;
    isPaid: boolean;
    paidAt: string | null;
}

export interface ContractInstallments {
    contractId: string;
    rentAmount: number;
    lateFeeAmount: number;
    rentDueDate: string | null;
    leaseDurationMonths: number;
    autopayEnabled: boolean;
    walletBalance: number;
    pendingLandlordCredit: number;
    paidInstallments: number;
    dueInstallments: number;
    overdueInstallments: number;
    outstandingInstallments: number;
    nextPayableIndex: number | null;
    nextPayableTotal: number;
    items: RentInstallmentItem[];
    now: string;
}

interface ContractInstallmentsApiResponse {
    success: boolean;
    data: ContractInstallments;
}

interface AutopayApiResponse {
    success: boolean;
    data: {
        contractId: string;
        autopayEnabled: boolean;
    };
}

export type LandlordContractStatus = 'PENDING_LANDLORD' | 'PENDING_TENANT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
export type RentDueDate = '1ST_OF_MONTH' | '5TH_OF_MONTH' | 'LAST_DAY_OF_MONTH';

export interface ContractParty {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
    signatureUrl?: string | null;
}

export interface ContractProperty {
    id: string;
    title: string;
    address: string;
    type: string | null;
    furnishing: string | null;
    monthlyPrice: number | null;
    securityDeposit: number | null;
    maintenanceResponsibilities?: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
}

export interface ContractPropertySpecifications {
    bedrooms: number;
    bathrooms: number;
    areaSqft: number;
}

export interface ContractMaintenanceResponsibility {
    id: string;
    area: string;
    responsibleParty: 'LANDLORD' | 'TENANT';
}

export interface LandlordContract {
    id: string;
    contractId: string;
    leaseId: string | null;
    rentalRequestId?: string;
    status: LandlordContractStatus;
    paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
    rentAmount: number | null;
    securityDeposit: number | null;
    serviceFee?: number;
    rentDueDate: RentDueDate | null;
    lateFeeAmount: number | null;
    maxOccupants: number | null;
    moveInDate: string;
    leaseDurationMonths: number;
    landlordNationalId: string | null;
    tenantNationalId?: string | null;
    tenantEmergencyContactName?: string | null;
    tenantEmergencyPhone?: string | null;
    propertyRegistrationNumber: string | null;
    landlordSignedAt: string | null;
    paymentVerifiedAt?: string | null;
    landlordSignatureUrl?: string | null;
    tenantSignatureUrl?: string | null;
    createdAt: string;
    landlord?: ContractParty;
    tenant?: ContractParty;
    property?: ContractProperty;
    propertySpecifications?: ContractPropertySpecifications | null;
    maintenanceResponsibilities?: ContractMaintenanceResponsibility[];
    landlordSignature?: string;
    tenantSignature?: string;
}

export interface VerificationSummary {
    platformMetadata: {
        contractId: string;
        created: string;
        leaseId: string | null;
    };
    verifiedPropertyInfo: {
        title: string;
        type: string | null;
        rooms: string;
        furnishing: string | null;
        address: string;
    };
    paymentTerms: {
        rent: number | null;
        securityDeposit: number | null;
        serviceFee: number;
        schedule: string;
    };
    leaseDuration: {
        moveIn: string;
        durationMonths: number;
    };
}

interface ContractListResponse {
    success: boolean;
    data: LandlordContract[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Stub returned by testing-clock helpers when the client is built with
 * test-date disabled mode (non-development build). Mimics the disabled state
 * from the server so the
 * rest of the app never sees `enabled: true` in that mode.
 */
const buildDisabledTestingClockState = (): TestingClockState => ({
    enabled: false,
    offsetDays: 0,
    now: new Date().toISOString(),
});

class ContractService {
    async getTestingClock(): Promise<TestingClockState> {
        const response = await apiClient.get<TestingClockApiResponse>('/contracts/testing/clock');
        if (response.data.data.enabled) {
            saveTestingClockSnapshot({
                now: response.data.data.now,
                offsetDays: response.data.data.offsetDays,
            });
        } else {
            clearTestingClockCache();
        }
        return response.data.data;
    }

    async advanceTestingClock(days = 5): Promise<TestingClockState> {
        const response = await apiClient.post<TestingClockApiResponse>('/contracts/testing/clock/advance', { days });
        saveTestingClockSnapshot({
            now: response.data.data.now,
            offsetDays: response.data.data.offsetDays,
        });
        return response.data.data;
    }

    async resetTestingClock(): Promise<TestingClockState> {
        const response = await apiClient.post<TestingClockApiResponse>('/contracts/testing/clock/reset');
        if (Number(response.data.data.offsetDays ?? 0) === 0) {
            clearTestingClockCache();
        } else {
            saveTestingClockSnapshot({
                now: response.data.data.now,
                offsetDays: response.data.data.offsetDays,
            });
        }
        return response.data.data;
    }

    async getContractPaymentDetails(contractId: string): Promise<ContractDetails> {
        const response = await apiClient.get<ContractApiResponse>(`/contracts/${contractId}`);
        const c = response.data.data;

        return {
            id: c.id,
            contractId: c.contractId,
            status: c.status,
            paymentStatus: c.paymentStatus,
            paymentTerms: {
                rentAmount: c.rentAmount,
                securityDeposit: c.securityDeposit,
                serviceFee: c.serviceFee,
            },
        };
    }

    async initiatePaymobPayment(contractId: string): Promise<InitiatePaymobResponse['data']> {
        const response = await apiClient.post<InitiatePaymobResponse>(`/contracts/${contractId}/payments/paymob/initiate`);
        return response.data.data;
    }

    async verifyPaymobPayment(contractId: string, transactionId: number): Promise<void> {
        await apiClient.post(`/contracts/${contractId}/payments/paymob/verify`, {
            transaction_id: transactionId,
        });
    }

    async getWalletBalance(): Promise<WalletBalanceApiResponse['data']> {
        const response = await apiClient.get<WalletBalanceApiResponse>('/contracts/payments/wallet/balance');
        return response.data.data;
    }

    async payContractFromBalance(contractId: string): Promise<BalancePaymentApiResponse['data']> {
        const response = await apiClient.post<BalancePaymentApiResponse>(`/contracts/${contractId}/payments/balance/pay`);
        return response.data.data;
    }

    async payMonthlyRentFromBalance(contractId: string): Promise<MonthlyRentPaymentApiResponse['data']> {
        const response = await apiClient.post<MonthlyRentPaymentApiResponse>(`/contracts/${contractId}/payments/balance/pay-rent`);
        return response.data.data;
    }

    async getContractInstallments(contractId: string): Promise<ContractInstallments> {
        const response = await apiClient.get<ContractInstallmentsApiResponse>(`/contracts/${contractId}/installments`);
        return response.data.data;
    }

    async setContractAutopay(contractId: string, enabled: boolean): Promise<AutopayApiResponse['data']> {
        const response = await apiClient.patch<AutopayApiResponse>(`/contracts/${contractId}/autopay`, { enabled });
        return response.data.data;
    }

    async getPaymentHistory(limit = 100): Promise<TenantPaymentHistoryItem[]> {
        const response = await apiClient.get<TenantPaymentHistoryApiResponse>('/contracts/payments/history', {
            params: { limit },
        });
        return response.data.data;
    }

    async initiateWalletTopup(amount: number, paymentMethod: WalletTopupPaymentMethod, saveCard?: boolean): Promise<WalletTopupCheckoutResponse['data']> {
        const response = await apiClient.post<WalletTopupCheckoutResponse>('/contracts/payments/wallet/topup/initiate', {
            amount,
            payment_method: paymentMethod,
            save_card: Boolean(saveCard),
        });
        return response.data.data;
    }

    async verifyWalletTopup(transactionId: number): Promise<WalletBalanceApiResponse['data']> {
        // Paymob transaction-lookup can occasionally take 15–30s end-to-end.
        // Override the default 10s client timeout so we don't bail before the
        // backend (which itself retries once on upstream timeout).
        const response = await apiClient.post<WalletBalanceApiResponse>(
            '/contracts/payments/wallet/topup/verify',
            { transaction_id: transactionId },
            { timeout: 60000 }
        );
        return response.data.data;
    }

    async getLandlordContracts(params?: {
        status?: LandlordContractStatus;
        page?: number;
        limit?: number;
    }): Promise<ContractListResponse> {
        const response = await apiClient.get<ContractListResponse>('/contracts/landlord', { params });
        return response.data;
    }

    async getTenantContracts(params?: {
        status?: Exclude<LandlordContractStatus, 'PENDING_LANDLORD'>;
        page?: number;
        limit?: number;
    }): Promise<ContractListResponse> {
        const response = await apiClient.get<ContractListResponse>('/contracts/tenant', { params });
        return response.data;
    }

    async getContractById(id: string): Promise<{ success: boolean; data: LandlordContract }> {
        const response = await apiClient.get<{ success: boolean; data: LandlordContract }>(`/contracts/${id}`);
        return response.data;
    }

    async updateLeaseTerms(id: string, payload: {
        rent_due_date: RentDueDate;
        late_fee_amount: number;
        max_occupants: number;
    }): Promise<{ success: boolean; data: LandlordContract }> {
        const response = await apiClient.put<{ success: boolean; data: LandlordContract }>(
            `/contracts/${id}/landlord/lease-terms`,
            payload
        );
        return response.data;
    }

    async updateLandlordIdentity(id: string, payload: {
        national_id: string;
    }): Promise<{ success: boolean; data: LandlordContract }> {
        const response = await apiClient.put<{ success: boolean; data: LandlordContract }>(
            `/contracts/${id}/landlord/identity`,
            payload
        );
        return response.data;
    }

    async updatePropertyConfirmation(id: string, payload: {
        property_registration_number: string;
    }): Promise<{ success: boolean; data: LandlordContract }> {
        const response = await apiClient.put<{ success: boolean; data: LandlordContract }>(
            `/contracts/${id}/landlord/property-confirmation`,
            payload
        );
        return response.data;
    }

    async getVerificationSummary(id: string): Promise<{ success: boolean; data: VerificationSummary }> {
        const response = await apiClient.get<{ success: boolean; data: VerificationSummary }>(
            `/contracts/${id}/verification-summary`
        );
        return response.data;
    }

    async signLandlordContract(id: string, payload: {
        signature_url: string;
        certify_ownership: boolean;
    }): Promise<{ success: boolean; data: LandlordContract }> {
        const response = await apiClient.put<{ success: boolean; data: LandlordContract }>(
            `/contracts/${id}/landlord/sign`,
            payload
        );
        return response.data;
    }

    async updateTenantIdentity(id: string, payload: {
        national_id: string;
        emergency_contact_name: string;
        emergency_phone: string;
    }): Promise<{ success: boolean; data: LandlordContract }> {
        const response = await apiClient.put<{ success: boolean; data: LandlordContract }>(
            `/contracts/${id}/tenant/identity`,
            payload
        );
        return response.data;
    }

    async signTenantContract(id: string, payload: {
        signature_url: string;
        agree_to_terms: boolean;
    }): Promise<{ success: boolean; data: LandlordContract }> {
        const response = await apiClient.put<{ success: boolean; data: LandlordContract }>(
            `/contracts/${id}/tenant/sign`,
            payload
        );
        return response.data;
    }

    async reportTenant(contractId: string, payload: {
        reason: string;
        details: string;
    }): Promise<{ success: boolean; message: string; data: any }> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
            `/contracts/${contractId}/report-tenant`,
            payload
        );
        return response.data;
    }

    async terminateLease(contractId: string, payload: {
        reason: string;
    }): Promise<{ success: boolean; message: string; data: any }> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
            `/contracts/${contractId}/terminate`,
            payload
        );
        return response.data;
    }
}

export const contractService = new ContractService();
export default contractService;
