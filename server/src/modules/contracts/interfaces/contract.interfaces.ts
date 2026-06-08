import type {
    ContractPaymentStatusType,
    ContractStatusType,
    PaymentScheduleType,
    RentDueDateType,
} from '../models/Contract.js';
import type { ResponsiblePartyType } from '../models/ContractMaintenanceResponsibility.js';

// ─── Maintenance Responsibility ───────────────────────────────────────────────

export interface MaintenanceResponsibilityInput {
    area: string;
    responsible_party: ResponsiblePartyType;
}

export interface MaintenanceResponsibilityResponse {
    id: string;
    area: string;
    responsibleParty: ResponsiblePartyType;
}

// ─── Landlord Step 1: Lease Terms & Financials ────────────────────────────────

export interface LandlordLeaseTermsInput {
    rent_due_date: RentDueDateType;
    late_fee_amount: number;
    max_occupants: number;
}

// ─── Landlord Step 2: Identity Details ────────────────────────────────────────

export interface LandlordIdentityInput {
    national_id: string;
}

// ─── Landlord Step 3: Property Ownership & Maintenance ────────────────────────

export interface LandlordPropertyConfirmationInput {
    property_registration_number: string;
}

// ─── Landlord Step 5: Sign ────────────────────────────────────────────────────

export interface LandlordSignInput {
    signature_url: string;
    certify_ownership: boolean;
}

// ─── Tenant Step 2: Identity Verification ─────────────────────────────────────

export interface TenantIdentityInput {
    national_id: string;
    emergency_contact_name: string;
    emergency_phone: string;
}

// ─── Tenant Step 4: Sign ──────────────────────────────────────────────────────

export interface TenantSignInput {
    signature_url: string;
    agree_to_terms: boolean;
}

export interface VerifyPaymobPaymentInput {
    transaction_id: number;
}

export interface PaymobCheckoutResponse {
    checkoutUrl: string;
    amountCents: number;
    orderId: number;
    currency: string;
}

export interface WalletBalanceResponse {
    balance: number;
    currency: string;
}

export type WalletTopupPaymentMethod = 'CARD' | 'WALLET';

export interface WalletTopupInitiateInput {
    amount: number;
    payment_method: WalletTopupPaymentMethod;
    save_card?: boolean;
}

export interface WalletTopupVerifyInput {
    transaction_id: number;
}

export interface WalletTopupCheckoutResponse {
    checkoutUrl: string;
    amountCents: number;
    orderId: number;
    currency: string;
}

export interface ContractBalancePaymentResponse {
    contract: ContractResponse;
    remainingBalance: number;
    debitedAmount: number;
}

export interface MonthlyRentPaymentResponse {
    contract: ContractResponse;
    remainingBalance: number;
    debitedAmount: number;
    paidForMonth: string;
    lateFeeApplied?: number;
    wasLate?: boolean;
    installmentsPaid?: number;
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

export interface ContractInstallmentsResponse {
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

export interface AutopayUpdateInput {
    enabled: boolean;
}

export interface AutopayUpdateResponse {
    contractId: string;
    autopayEnabled: boolean;
}

export type TenantPaymentHistoryType =
    | 'CONTRACT_INITIAL'
    | 'RENT_MONTHLY'
    | 'MAINTENANCE'
    | 'MAINTENANCE_REFUND';

export interface TenantPaymentHistoryItem {
    id: string;
    createdAt: Date;
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

// ─── Contract Response ────────────────────────────────────────────────────────

export interface ContractResponse {
    id: string;
    contractId: string;
    leaseId: string | null;
    rentalRequestId: string;
    propertyId: string;
    landlordId: string;
    tenantId: string;
    status: ContractStatusType;
    rentAmount: number | null;
    securityDeposit: number | null;
    serviceFee: number;
    paymentSchedule: PaymentScheduleType;
    rentDueDate: RentDueDateType | null;
    lateFeeAmount: number | null;
    maxOccupants: number | null;
    moveInDate: Date | string;
    leaseDurationMonths: number;
    landlordNationalId: string | null;
    propertyRegistrationNumber: string | null;
    landlordSignedAt: Date | null;
    tenantSignedAt: Date | null;
    tenantAgreedTerms: boolean;
    paymentStatus: ContractPaymentStatusType;
    paymentVerifiedAt: Date | null;
    paymobOrderId: number | null;
    paymobTransactionId: number | null;
    landlordSignatureUrl?: string | null;
    tenantSignatureUrl?: string | null;
    tenantNationalId: string | null;
    tenantEmergencyContactName: string | null;
    tenantEmergencyPhone: string | null;
    createdAt: Date;
    updatedAt: Date;
    maintenanceResponsibilities?: MaintenanceResponsibilityResponse[];
    landlord?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
        signatureUrl?: string | null;
    };
    tenant?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
        signatureUrl?: string | null;
    };
    property?: {
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
    };
    propertySpecifications?: {
        bedrooms: number;
        bathrooms: number;
        areaSqft: number;
    } | null;
}

// ─── Contract List Response ───────────────────────────────────────────────────

export interface ContractListResponse {
    contracts: ContractResponse[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ─── Verification Summary ─────────────────────────────────────────────────────

export interface VerificationSummaryResponse {
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
        schedule: PaymentScheduleType;
    };
    leaseDuration: {
        moveIn: string;
        durationMonths: number;
    };
}
