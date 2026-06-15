import { Op } from 'sequelize';
import {
    Contract,
    ContractPaymentStatus,
    ContractStatus,
    ContractMaintenanceResponsibility,
    User,
    Profile,
    Property,
    RentalRequest,
    PropertySpecifications,
    sequelize,
    TenantReport,
    TenantReportReason,
    LeaseTerminationRequest,
    LeaseTerminationStatus,
} from '../models/index.js';
import { paymobService } from '../../../shared/services/paymob.service.js';
import { env } from '../../../config/env.js';
import { decrypt, encrypt } from '../../../shared/utils/encryption.util.js';
import { testingClockService } from '../../../shared/services/testing-clock.service.js';
import { PaymentMethod, PaymentProvider } from '../../payment-methods/models/PaymentMethod.js';
import { PropertyStatus } from '../../properties/models/Property.js';
import { Notification } from '../../notifications/models/Notification.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import type {
    ContractResponse,
    ContractBalancePaymentResponse,
    ContractListResponse,
    VerificationSummaryResponse,
    MaintenanceResponsibilityResponse,
    LandlordLeaseTermsInput,
    LandlordIdentityInput,
    LandlordPropertyConfirmationInput,
    LandlordSignInput,
    TenantIdentityInput,
    TenantSignInput,
    VerifyPaymobPaymentInput,
    PaymobCheckoutResponse,
    WalletBalanceResponse,
    MonthlyRentPaymentResponse,
    WalletTopupCheckoutResponse,
    WalletTopupInitiateInput,
    WalletTopupVerifyInput,
    ContractInstallmentsResponse,
    RentInstallmentItem,
    RentInstallmentStatus,
    AutopayUpdateResponse,
} from '../interfaces/contract.interfaces.js';
import { activityLogService } from '../../../shared/services/activity-log.service.js';
import { ActivityLog } from '../../admin/models/ActivityLog.js';
import { MaintenanceRequest } from '../../maintenance/models/MaintenanceRequest.js';
import { LandlordMaintenanceCharge, LandlordMaintenanceChargeStatus } from '../../maintenance/models/LandlordMaintenanceCharge.js';

// ─── Duration map ─────────────────────────────────────────────────────────────

const DURATION_TO_MONTHS: Record<string, number> = {
    '6_MONTHS': 6,
    '12_MONTHS': 12,
    '24_MONTHS': 24,
};

function parseDurationToMonths(duration: string): number {
    const mapped = DURATION_TO_MONTHS[duration];
    if (mapped) return mapped;

    const match = /^(\d+)_MONTHS$/.exec(duration);
    if (match) {
        const months = Number(match[1]);
        if (Number.isInteger(months) && months > 0) {
            return months;
        }
    }

    throw new ContractError(`Unsupported rental duration: ${duration}`, 400, 'INVALID_RENTAL_DURATION');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateContractId(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `HOMI-${num}`;
}

function generateLeaseId(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    const letter = String.fromCodePoint(65 + Math.floor(Math.random() * 26));
    return `L-${num}-${letter}`;
}

function safeDecrypt(value: string | null): string | null {
    if (!value) return null;
    try {
        return decrypt(value);
    } catch {
        // Keep backward compatibility for rows that may contain plaintext.
        return value;
    }
}

function isWithinNextDays(from: Date, target: Date, days: number): boolean {
    const msPerDay = 1000 * 60 * 60 * 24;
    const deltaDays = Math.ceil((target.getTime() - from.getTime()) / msPerDay);
    return deltaDays >= 0 && deltaDays <= days;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function normalizeSignatureUrl(value: string | null | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (raw.startsWith('data:image/')) return raw;

    let baseOrigin: string;
    try {
        baseOrigin = new URL(env.CLIENT_URL).origin;
    } catch {
        baseOrigin = 'http://localhost:3000';
    }

    if (/^https?:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw);
            const hostLooksLikeFileName = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(parsed.hostname);
            const hasNoPath = parsed.pathname === '/' || parsed.pathname === '';
            if (hostLooksLikeFileName && hasNoPath) {
                return `${baseOrigin}/signatures/${parsed.hostname}`;
            }
            return raw;
        } catch {
            return `${baseOrigin}/signatures/${raw.replace(/^https?:\/\//i, '')}`;
        }
    }

    if (raw.startsWith('//')) {
        const protocol = baseOrigin.startsWith('https://') ? 'https:' : 'http:';
        return `${protocol}${raw}`;
    }

    if (raw.startsWith('/')) {
        return `${baseOrigin}${raw}`;
    }

    // Legacy filename-only signatures are served from /signatures/<file>.
    return `${baseOrigin}/signatures/${raw}`;
}

/**
 * Custom error class for contract errors
 */
export class ContractError extends Error {
    constructor(
        message: string,
        public statusCode: number = 400,
        public code: string = 'CONTRACT_ERROR'
    ) {
        super(message);
        this.name = 'ContractError';
    }
}

/**
 * Contract Service
 * Handles all contract business logic
 */
class ContractService {
    private static readonly LATE_FEE_GRACE_DAYS = 4;

    getTestingClockState(): { enabled: boolean; offsetDays: number; now: string } {
        return testingClockService.getState();
    }

    /**
     * Capture a full DB snapshot (first call only, subsequent calls are no-ops),
     * then advance the testing clock by `days` days.
     */
    async advanceTestingClockWithSnapshot(days: number): Promise<{ enabled: boolean; offsetDays: number; now: string }> {
        // Only snapshot once — before the very first advance.
        if (!testingClockService.hasSnapshot()) {
            await this.captureDbSnapshot();
        }
        
        const daysToAdvance = Math.max(0, Math.floor(days));
        for (let d = 1; d <= daysToAdvance; d++) {
            testingClockService.advanceDays(1);
            const currentSimulatedDate = testingClockService.getNow();
            await this.runDailyLeaseCycleCheck(currentSimulatedDate);
        }
        return testingClockService.getState();
    }

    // Kept for backward-compat (non-async path the controller used to call directly).
    advanceTestingClock(days: number): { enabled: boolean; offsetDays: number; now: string } {
        return testingClockService.advanceDays(days);
    }

    /**
     * Reset the testing clock back to offset=0 AND restore every DB row that
     * was changed since the last `advanceTestingClockWithSnapshot` call.
     */
    async resetTestingClockWithRestore(): Promise<{ enabled: boolean; offsetDays: number; now: string }> {
        const snap = testingClockService.getSnapshot();
        if (snap) {
            await this.restoreDbSnapshot(snap);
        }
        return testingClockService.reset();
    }

    resetTestingClock(): { enabled: boolean; offsetDays: number; now: string } {
        return testingClockService.reset();
    }

    // ─── Snapshot helpers ────────────────────────────────────────────────────

    private async captureDbSnapshot(): Promise<void> {
        const takenAt = new Date().toISOString();

        // Contracts
        const contracts = await Contract.findAll({
            attributes: [
                'id', 'status', 'payment_status', 'payment_verified_at',
                'paymob_order_id', 'paymob_transaction_id',
                'landlord_signed_at', 'tenant_signed_at', 'tenant_agreed_terms',
                'autopay_enabled',
            ],
        });

        // Profiles (wallet balance)
        const profiles = await Profile.findAll({
            attributes: [
                'user_id', 'wallet_balance', 'wallet_pending_order_id',
                'wallet_pending_amount_cents', 'wallet_pending_save_card',
            ],
        });

        // Properties
        const properties = await Property.findAll({
            attributes: ['id', 'status'],
        });

        // Rental Requests
        const rentalRequests = await RentalRequest.findAll({
            attributes: ['id', 'status'],
        });

        // Maintenance charges
        const maintenanceCharges = await LandlordMaintenanceCharge.findAll({
            attributes: ['id', 'status', 'applied_at'],
        });

        // Maintenance requests
        const maintenanceRequests = await MaintenanceRequest.findAll({
            attributes: [
                'id', 'status', 'en_route_started_at', 'in_progress_started_at',
                'provider_completed_at', 'tenant_confirmed_at', 'disputed_at', 'resolved_at',
            ],
        });

        // Notifications
        const notifications = await Notification.findAll({
            attributes: [
                'id', 'user_id', 'type', 'title', 'body',
                'related_entity_type', 'related_entity_id', 'data',
                'is_read', 'read_at', 'created_at', 'updated_at'
            ],
        });

        (testingClockService as any).saveSnapshot({
            takenAt,
            contracts: contracts.map((c) => ({
                id: c.id,
                status: c.status,
                payment_status: c.payment_status,
                payment_verified_at: c.payment_verified_at ?? null,
                paymob_order_id: c.paymob_order_id ?? null,
                paymob_transaction_id: c.paymob_transaction_id ?? null,
                landlord_signed_at: c.landlord_signed_at ?? null,
                tenant_signed_at: c.tenant_signed_at ?? null,
                tenant_agreed_terms: Boolean(c.tenant_agreed_terms),
                autopay_enabled: Boolean((c as any).autopay_enabled),
            })),
            profiles: profiles.map((p: any) => ({
                user_id: p.user_id,
                wallet_balance: Number(p.wallet_balance ?? 0),
                wallet_pending_order_id: p.wallet_pending_order_id ?? null,
                wallet_pending_amount_cents: p.wallet_pending_amount_cents ?? null,
                wallet_pending_save_card: Boolean(p.wallet_pending_save_card),
            })),
            properties: properties.map((p) => ({
                id: p.id,
                status: p.status,
            })),
            rentalRequests: rentalRequests.map((r) => ({
                id: r.id,
                status: r.status,
            })),
            activityLogCutoff: takenAt,
            maintenanceCharges: maintenanceCharges.map((mc: any) => ({
                id: mc.id,
                status: mc.status,
                applied_at: mc.applied_at ?? null,
            })),
            maintenanceRequests: maintenanceRequests.map((mr: any) => ({
                id: mr.id,
                status: mr.status,
                en_route_started_at: mr.en_route_started_at ?? null,
                in_progress_started_at: mr.in_progress_started_at ?? null,
                provider_completed_at: mr.provider_completed_at ?? null,
                tenant_confirmed_at: mr.tenant_confirmed_at ?? null,
                disputed_at: mr.disputed_at ?? null,
                resolved_at: mr.resolved_at ?? null,
            })),
            notifications: notifications.map((n) => ({
                id: n.id,
                user_id: n.user_id,
                type: n.type,
                title: n.title,
                body: n.body,
                related_entity_type: n.related_entity_type ?? null,
                related_entity_id: n.related_entity_id ?? null,
                data: n.data ?? {},
                is_read: n.is_read,
                read_at: n.read_at ?? null,
                created_at: n.created_at,
                updated_at: n.updated_at,
            })),
        });
    }

    private async restoreDbSnapshot(snap: ReturnType<typeof testingClockService.getSnapshot> & object): Promise<void> {
        const t = await sequelize.transaction();
        try {
            // Restore contracts
            for (const cs of snap.contracts) {
                await Contract.update(
                    {
                        status: cs.status,
                        payment_status: cs.payment_status,
                        payment_verified_at: cs.payment_verified_at,
                        paymob_order_id: cs.paymob_order_id,
                        paymob_transaction_id: cs.paymob_transaction_id,
                        landlord_signed_at: cs.landlord_signed_at,
                        tenant_signed_at: cs.tenant_signed_at,
                        tenant_agreed_terms: cs.tenant_agreed_terms,
                        autopay_enabled: cs.autopay_enabled,
                    } as any,
                    { where: { id: cs.id }, transaction: t }
                );
            }

            // Restore profiles (wallet balances)
            for (const ps of snap.profiles) {
                await Profile.update(
                    {
                        wallet_balance: ps.wallet_balance,
                        wallet_pending_order_id: ps.wallet_pending_order_id,
                        wallet_pending_amount_cents: ps.wallet_pending_amount_cents,
                        wallet_pending_save_card: ps.wallet_pending_save_card,
                    } as any,
                    { where: { user_id: ps.user_id }, transaction: t }
                );
            }

            // Restore properties
            for (const ps of snap.properties) {
                await Property.update(
                    { status: ps.status as any },
                    { where: { id: ps.id }, transaction: t }
                );
            }

            // Restore rental requests
            for (const rs of snap.rentalRequests) {
                await RentalRequest.update(
                    { status: rs.status as any },
                    { where: { id: rs.id }, transaction: t }
                );
            }

            // Delete activity logs created after the snapshot
            await ActivityLog.destroy({
                where: {
                    created_at: { [Op.gt]: new Date(snap.activityLogCutoff) },
                },
                transaction: t,
            });

            // Restore notifications
            await Notification.destroy({ where: {}, transaction: t });
            if (snap.notifications && snap.notifications.length > 0) {
                await Notification.bulkCreate(snap.notifications as any, { transaction: t });
            }

            // Restore maintenance charges
            for (const mc of snap.maintenanceCharges) {
                await LandlordMaintenanceCharge.update(
                    {
                        status: mc.status as any,
                        applied_at: mc.applied_at,
                    },
                    { where: { id: mc.id }, transaction: t }
                );
            }

            // Restore maintenance requests
            for (const mr of snap.maintenanceRequests) {
                await MaintenanceRequest.update(
                    {
                        status: mr.status as any,
                        en_route_started_at: mr.en_route_started_at,
                        in_progress_started_at: mr.in_progress_started_at,
                        provider_completed_at: mr.provider_completed_at,
                        tenant_confirmed_at: mr.tenant_confirmed_at,
                        disputed_at: mr.disputed_at,
                        resolved_at: mr.resolved_at,
                    },
                    { where: { id: mr.id }, transaction: t }
                );
            }

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    // ─── Contract Creation ────────────────────────────────────────────────────

    /**
     * Create a contract automatically when a rental request is approved
     */
    async createContractFromApproval(rentalRequestId: string): Promise<ContractResponse> {
        const rentalRequest = await RentalRequest.findByPk(rentalRequestId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'landlord_id', 'monthly_price', 'security_deposit', 'maintenance_responsibilities'],
                },
            ],
        });

        if (!rentalRequest) {
            throw new ContractError('Rental request not found', 404, 'RENTAL_REQUEST_NOT_FOUND');
        }

        const property = rentalRequest.property as any;
        if (!property) {
            throw new ContractError('Property not found for rental request', 404, 'PROPERTY_NOT_FOUND');
        }

        // Check if contract already exists for this rental request
        const existingContract = await Contract.findOne({
            where: { rental_request_id: rentalRequestId },
        });

        if (existingContract) {
            throw new ContractError(
                'A contract already exists for this rental request',
                409,
                'CONTRACT_ALREADY_EXISTS'
            );
        }

        const durationMonths = parseDurationToMonths(String(rentalRequest.duration));

        const contract = await Contract.create({
            contract_id: generateContractId(),
            lease_id: generateLeaseId(),
            rental_request_id: rentalRequestId,
            property_id: property.id,
            landlord_id: property.landlord_id,
            tenant_id: rentalRequest.tenant_id,
            status: ContractStatus.PENDING_LANDLORD,
            rent_amount: property.monthly_price,
            security_deposit: property.security_deposit,
            service_fee: 10,
            payment_status: ContractPaymentStatus.PENDING,
            move_in_date: rentalRequest.move_in_date,
            lease_duration_months: durationMonths,
        });

        // Copy maintenance responsibilities from property to contract
        const propertyResponsibilities = property.maintenance_responsibilities ?? [];
        const LOWERCASE_TO_DB_AREA: Record<string, string> = {
            structural: 'Structural Repairs',
            appliances: 'Interior Appliances',
            utilities: 'Utility Bills',
            plumbing: 'Plumbing',
            electrical: 'Electrical',
            hvac: 'HVAC / Air Conditioning',
            pest: 'Pest Control',
            exterior: 'Exterior Maintenance',
            common: 'Common Areas',
            security: 'Security Systems',
        };
        const contractResponsibilities = propertyResponsibilities.map((item: any) => ({
            contract_id: contract.id,
            area: LOWERCASE_TO_DB_AREA[item.area] || item.area,
            responsible_party: item.responsible_party,
        }));
        if (contractResponsibilities.length > 0) {
            await ContractMaintenanceResponsibility.bulkCreate(contractResponsibilities);
        }

        await activityLogService.log({
            actor: { userId: property.landlord_id, role: 'LANDLORD' },
            action: 'CONTRACT_CREATED_FROM_APPROVAL',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: 'Contract auto-created after rental request approval.',
            metadata: {
                rentalRequestId,
                propertyId: property.id,
                tenantId: rentalRequest.tenant_id,
            },
        });

        return this.formatContractResponse(contract);
    }

    // ─── Contract Lists ───────────────────────────────────────────────────────

    /**
     * Get all contracts for a landlord
     */
    async getLandlordContracts(
        landlordId: string,
        filters: { status?: string; page?: number; limit?: number }
    ): Promise<ContractListResponse> {
        await this.expireCompletedLeases();
        const user = await User.findByPk(landlordId);
        if (!user) {
            throw new ContractError('User not found', 404, 'USER_NOT_FOUND');
        }
        if (user.role !== 'LANDLORD') {
            throw new ContractError(
                'Only landlords can view landlord contracts',
                403,
                'FORBIDDEN'
            );
        }

        const { status, page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;

        const where: any = { landlord_id: landlordId };
        if (status) where.status = status;

        const { count, rows: contracts } = await Contract.findAndCountAll({
            where,
            include: this.getContractListIncludes(),
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        const formattedContracts = contracts.map((c) => this.formatContractResponse(c, true));

        return {
            contracts: formattedContracts,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Get all contracts for a tenant (only PENDING_TENANT or later)
     */
    async getTenantContracts(
        tenantId: string,
        filters: { status?: string; page?: number; limit?: number }
    ): Promise<ContractListResponse> {
        await this.expireCompletedLeases();
        const { status, page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;

        const where: any = {
            tenant_id: tenantId,
            // Tenant can only see contracts after landlord has signed
            status: {
                [Op.in]: [
                    ContractStatus.PENDING_TENANT,
                    ContractStatus.PENDING_PAYMENT,
                    ContractStatus.ACTIVE,
                    ContractStatus.TERMINATED,
                    ContractStatus.EXPIRED,
                ],
            },
        };
        // If a specific status filter is provided and is valid for tenant view, use it
        if (status && [
            ContractStatus.PENDING_TENANT,
            ContractStatus.PENDING_PAYMENT,
            ContractStatus.ACTIVE,
            ContractStatus.TERMINATED,
            ContractStatus.EXPIRED,
        ].includes(status as any)) {
            where.status = status;
        }

        const { count, rows: contracts } = await Contract.findAndCountAll({
            where,
            include: this.getContractListIncludes(),
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        const formattedContracts = contracts.map((c) => this.formatContractResponse(c, true));

        return {
            contracts: formattedContracts,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    }

    // ─── Get Contract Details ─────────────────────────────────────────────────

    /**
     * Get a single contract by ID (with full details)
     */
    async getContractById(contractId: string, userId: string): Promise<ContractResponse> {
        const contract = await Contract.findByPk(contractId, {
            include: [
                ...this.getContractDetailIncludes(),
                {
                    model: ContractMaintenanceResponsibility,
                    as: 'maintenanceResponsibilities',
                },
            ],
        });

        if (!contract) {
            throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        }

        // Only landlord or tenant on the contract can view
        if (contract.landlord_id !== userId && contract.tenant_id !== userId) {
            throw new ContractError(
                'You do not have permission to view this contract',
                403,
                'FORBIDDEN'
            );
        }

        // Tenant cannot see PENDING_LANDLORD contracts
        if (contract.tenant_id === userId && contract.status === ContractStatus.PENDING_LANDLORD) {
            throw new ContractError(
                'This contract is not yet available for viewing',
                403,
                'CONTRACT_NOT_READY'
            );
        }

        return this.formatContractResponse(contract, true, true);
    }

    // ─── Verification Summary ─────────────────────────────────────────────────

    /**
     * Generate the platform verification summary (auto-generated, read-only)
     */
    async getVerificationSummary(contractId: string, userId: string): Promise<VerificationSummaryResponse> {
        const contract = await Contract.findByPk(contractId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: [
                        {
                            model: PropertySpecifications,
                            as: 'specifications',
                        },
                    ],
                },
            ],
        });

        if (!contract) {
            throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        }

        if (contract.landlord_id !== userId && contract.tenant_id !== userId) {
            throw new ContractError(
                'You do not have permission to view this contract',
                403,
                'FORBIDDEN'
            );
        }

        const property = contract.property as any;
        const specs = property?.specifications;

        let roomsLabel = 'N/A';
        if (specs) {
            const bedroomSuffix = specs.bedrooms === 1 ? '' : 's';
            roomsLabel = `${specs.bedrooms} Bedroom${bedroomSuffix}`;
        }

        return {
            platformMetadata: {
                contractId: contract.contract_id,
                created: contract.created_at.toISOString(),
                leaseId: contract.lease_id,
            },
            verifiedPropertyInfo: {
                title: property?.title ?? 'N/A',
                type: property?.type ?? null,
                rooms: roomsLabel,
                furnishing: property?.furnishing ?? null,
                address: property?.address ?? 'N/A',
            },
            paymentTerms: {
                rent: contract.rent_amount ? Number(contract.rent_amount) : null,
                securityDeposit: contract.security_deposit ? Number(contract.security_deposit) : null,
                serviceFee: Number(contract.service_fee),
                schedule: contract.payment_schedule,
            },
            leaseDuration: {
                moveIn: contract.move_in_date as unknown as string,
                durationMonths: contract.lease_duration_months,
            },
        };
    }

    // ─── Landlord Steps ───────────────────────────────────────────────────────

    /**
     * Landlord Step 1: Submit Lease Terms & Financials
     */
    async submitLandlordLeaseTerms(
        contractId: string,
        landlordId: string,
        input: LandlordLeaseTermsInput
    ): Promise<ContractResponse> {
        const contract = await this.findAndValidateLandlordContract(contractId, landlordId);

        await contract.update({
            rent_due_date: input.rent_due_date,
            late_fee_amount: input.late_fee_amount,
            max_occupants: input.max_occupants,
            tenant_emergency_contact_name: input.emergency_contact_name ?? null,
            tenant_emergency_phone: input.emergency_phone ?? null,
        });

        await activityLogService.log({
            actor: { userId: landlordId, role: 'LANDLORD' },
            action: 'CONTRACT_SIGNED_BY_LANDLORD',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: 'Landlord signed contract.',
            metadata: { propertyId: contract.property_id, tenantId: contract.tenant_id },
        });

        return this.formatContractResponse(contract);
    }

    /**
     * Landlord Step 2: Submit Identity Details
     */
    async submitLandlordIdentity(
        contractId: string,
        landlordId: string,
        input: LandlordIdentityInput
    ): Promise<ContractResponse> {
        const contract = await this.findAndValidateLandlordContract(contractId, landlordId);

        await contract.update({
            landlord_national_id: encrypt(input.national_id),
        });

        await activityLogService.log({
            actor: { userId: landlordId, role: 'LANDLORD' },
            action: 'LANDLORD_IDENTITY_SUBMITTED',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: 'Landlord submitted identity verification details.',
            metadata: { propertyId: contract.property_id, tenantId: contract.tenant_id },
        });

        return this.formatContractResponse(contract);
    }

    /**
     * Landlord Step 3: Property Ownership Confirmation & Maintenance Responsibilities
     */
    async submitLandlordPropertyConfirmation(
        contractId: string,
        landlordId: string,
        input: LandlordPropertyConfirmationInput
    ): Promise<ContractResponse> {
        const contract = await this.findAndValidateLandlordContract(contractId, landlordId);

        await contract.update({
            property_registration_number: input.property_registration_number,
        });

        await activityLogService.log({
            actor: { userId: landlordId, role: 'LANDLORD' },
            action: 'LANDLORD_PROPERTY_CONFIRMED',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: 'Landlord confirmed property ownership and registration.',
            metadata: { propertyId: contract.property_id, tenantId: contract.tenant_id },
        });

        const updated = await Contract.findByPk(contract.id, {
            include: this.getContractDetailIncludes(),
        });

        return this.formatContractResponse(updated ?? contract, true, true);
    }

    /**
     * Landlord Step 5: Sign Contract
     * Moves status from PENDING_LANDLORD to PENDING_TENANT
     */
    async signContractLandlord(
        contractId: string,
        landlordId: string,
        input: LandlordSignInput
    ): Promise<ContractResponse> {
        const contract = await this.findAndValidateLandlordContract(contractId, landlordId);
        const normalizedSignatureUrl = normalizeSignatureUrl(input.signature_url);
        if (!normalizedSignatureUrl) {
            throw new ContractError('Invalid signature URL', 400, 'INVALID_SIGNATURE_URL');
        }
        const isInlineImage = normalizedSignatureUrl.startsWith('data:image/');

        // Validate that all required landlord steps are completed
        if (!contract.rent_due_date) {
            throw new ContractError(
                'Please complete lease terms (Step 1) before signing',
                400,
                'INCOMPLETE_LEASE_TERMS'
            );
        }
        if (!contract.landlord_national_id) {
            throw new ContractError(
                'Please complete identity verification (Step 2) before signing',
                400,
                'INCOMPLETE_IDENTITY'
            );
        }
        if (!contract.property_registration_number) {
            throw new ContractError(
                'Please complete property ownership confirmation (Step 3) before signing',
                400,
                'INCOMPLETE_PROPERTY_CONFIRMATION'
            );
        }

        await contract.update({
            // Contract columns are short URL fields; keep inline payloads in profile.
            landlord_signature_url: isInlineImage ? null : normalizedSignatureUrl,
            landlord_signed_at: testingClockService.getNow(),
            status: ContractStatus.PENDING_TENANT,
        });

        await Profile.update(
            { e_signature_url: normalizedSignatureUrl },
            { where: { user_id: landlordId } }
        );

        return this.formatContractResponse(contract);
    }

    // ─── Tenant Steps ─────────────────────────────────────────────────────────

    /**
     * Tenant Step 2: Submit Identity Verification
     */
    async submitTenantIdentity(
        contractId: string,
        tenantId: string,
        input: TenantIdentityInput
    ): Promise<ContractResponse> {
        const contract = await this.findAndValidateTenantContract(contractId, tenantId);

        await contract.update({
            tenant_national_id: encrypt(input.national_id),
            tenant_emergency_contact_name: input.emergency_contact_name,
            tenant_emergency_phone: input.emergency_phone,
        });

        return this.formatContractResponse(contract);
    }

    /**
     * Tenant Step 4: Sign Contract
     * Moves status from PENDING_TENANT to PENDING_PAYMENT
     */
    async signContractTenant(
        contractId: string,
        tenantId: string,
        input: TenantSignInput
    ): Promise<ContractResponse> {
        const contract = await this.findAndValidateTenantContract(contractId, tenantId);
        const normalizedSignatureUrl = normalizeSignatureUrl(input.signature_url);
        if (!normalizedSignatureUrl) {
            throw new ContractError('Invalid signature URL', 400, 'INVALID_SIGNATURE_URL');
        }
        const isInlineImage = normalizedSignatureUrl.startsWith('data:image/');

        if (!contract.tenant_national_id) {
            throw new ContractError(
                'Please complete identity verification (Step 2) before signing',
                400,
                'INCOMPLETE_IDENTITY'
            );
        }

        await contract.update({
            // Contract columns are short URL fields; keep inline payloads in profile.
            tenant_signature_url: isInlineImage ? null : normalizedSignatureUrl,
            tenant_signed_at: testingClockService.getNow(),
            tenant_agreed_terms: true,
            status: ContractStatus.PENDING_PAYMENT,
        });

        await Profile.update(
            { e_signature_url: normalizedSignatureUrl },
            { where: { user_id: tenantId } }
        );

        return this.formatContractResponse(contract);
    }

    /**
     * Tenant payment step: create Paymob checkout URL
     */
    async initiatePaymobPayment(contractId: string, tenantId: string): Promise<PaymobCheckoutResponse> {
        const contract = await this.findAndValidateTenantPaymentContract(contractId, tenantId);

        if (contract.payment_status === ContractPaymentStatus.PAID) {
            throw new ContractError('This contract payment is already verified', 400, 'PAYMENT_ALREADY_VERIFIED');
        }

        const amountCents = this.calculateContractTotalAmountCents(contract);
        const tenantUser = await User.findByPk(tenantId, {
            include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'phone_number'] }],
            attributes: ['id', 'email'],
        });

        if (!tenantUser) {
            throw new ContractError('Tenant user not found', 404, 'USER_NOT_FOUND');
        }

        const profile = (tenantUser as any).profile;
        const callbackUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/payment/verify?contractId=${contract.id}`;
        const checkout = await paymobService.createCheckoutSession({
            amountCents,
            merchantOrderId: `${contract.contract_id}-${testingClockService.getNow().getTime()}`,
            billingData: {
                email: tenantUser.email,
                first_name: profile?.first_name || 'Tenant',
                last_name: profile?.last_name || 'User',
                phone_number: profile?.phone_number || '+201000000000',
            },
            callbackUrl,
        });

        await contract.update({
            paymob_order_id: checkout.orderId,
            payment_status: ContractPaymentStatus.PENDING,
        });

        return {
            checkoutUrl: checkout.iframeUrl,
            amountCents: checkout.amountCents,
            orderId: checkout.orderId,
            currency: 'EGP',
        };
    }

    /**
     * Tenant payment step: verify Paymob transaction and activate contract
     */
    async verifyPaymobPayment(
        contractId: string,
        tenantId: string,
        input: VerifyPaymobPaymentInput
    ): Promise<ContractResponse> {
        const contract = await this.findAndValidateTenantPaymentContract(contractId, tenantId);

        const verification = await paymobService.verifyTransaction(input.transaction_id);
        const expectedAmountCents = this.calculateContractTotalAmountCents(contract);

        // Normalize both sides to Number — Sequelize returns BIGINT as string
        const storedOrderId = Number(contract.paymob_order_id ?? 0);
        const paymobOrderId = Number(verification.orderId ?? 0);
        const isOrderMatched = storedOrderId > 0 && paymobOrderId === storedOrderId;
        const isAmountMatched = Number(verification.amountCents) === Number(expectedAmountCents);
        const isSuccess = verification.success && !verification.pending && !verification.isVoided && !verification.isRefunded;

        console.log('[PaymobVerify] Contract payment verification:', {
            transactionId: input.transaction_id,
            storedOrderId,
            paymobOrderId,
            isOrderMatched,
            expectedAmountCents,
            actualAmountCents: verification.amountCents,
            isAmountMatched,
            isSuccess,
            paymobSuccess: verification.success,
            paymobPending: verification.pending,
        });

        if (!isSuccess || !isOrderMatched || !isAmountMatched) {
            await contract.update({
                payment_status: ContractPaymentStatus.FAILED,
            });

            throw new ContractError(
                'Payment verification failed. Please retry payment from the checkout page.',
                400,
                'PAYMENT_VERIFICATION_FAILED'
            );
        }

        await contract.update({
            payment_status: ContractPaymentStatus.PAID,
            payment_verified_at: testingClockService.getNow(),
            paymob_transaction_id: verification.transactionId,
            status: ContractStatus.ACTIVE,
        });

        await Property.update(
            { status: PropertyStatus.RENTED },
            { where: { id: contract.property_id } }
        );

        return this.formatContractResponse(contract);
    }

    async getWalletBalance(tenantId: string): Promise<WalletBalanceResponse> {
        const profile = await Profile.findOne({
            where: { user_id: tenantId },
            attributes: ['wallet_balance'],
        });

        if (!profile) {
            throw new ContractError('Tenant profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        return {
            balance: Number((profile as any).wallet_balance ?? 0),
            currency: 'EGP',
        };
    }

    async payContractFromBalance(contractId: string, tenantId: string): Promise<ContractBalancePaymentResponse> {
        const transaction = await sequelize.transaction();

        try {
            const contract = await this.findAndValidateTenantPaymentContract(contractId, tenantId, transaction);

            if (contract.payment_status === ContractPaymentStatus.PAID) {
                throw new ContractError('This contract payment is already completed', 400, 'PAYMENT_ALREADY_COMPLETED');
            }

            const profile = await Profile.findOne({
                where: { user_id: tenantId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!profile) {
                throw new ContractError('Tenant profile not found', 404, 'PROFILE_NOT_FOUND');
            }

            const requiredAmount = this.calculateContractTotalAmount(contract);
            const availableBalance = Number((profile as any).wallet_balance ?? 0);

            if (availableBalance < requiredAmount) {
                throw new ContractError('Insufficient wallet balance to complete this payment', 400, 'INSUFFICIENT_WALLET_BALANCE');
            }

            const remainingBalance = Math.max(availableBalance - requiredAmount, 0);

            await profile.update(
                {
                    wallet_balance: remainingBalance,
                },
                { transaction }
            );

            await contract.update(
                {
                    payment_status: ContractPaymentStatus.PAID,
                    payment_verified_at: testingClockService.getNow(),
                    status: ContractStatus.ACTIVE,
                    paymob_order_id: null,
                    paymob_transaction_id: null,
                },
                { transaction }
            );

            await Property.update(
                { status: PropertyStatus.RENTED },
                { where: { id: contract.property_id }, transaction }
            );

            await activityLogService.log({
                actor: { userId: tenantId, role: 'TENANT' },
                action: 'CONTRACT_PAID_FROM_BALANCE',
                entityType: 'CONTRACT',
                entityId: contract.id,
                description: 'Contract paid from wallet balance and activated.',
                metadata: {
                    debitedAmount: requiredAmount,
                    remainingBalance,
                },
            });

            await transaction.commit();

            const refreshedContract = await Contract.findByPk(contract.id, {
                include: this.getContractDetailIncludes(),
            });

            return {
                contract: this.formatContractResponse(refreshedContract ?? contract, true, true),
                remainingBalance,
                debitedAmount: requiredAmount,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async payMonthlyRentFromBalance(contractId: string, tenantId: string): Promise<MonthlyRentPaymentResponse> {
        const transaction = await sequelize.transaction();

        try {
            const contract = await Contract.findByPk(contractId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!contract) {
                throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
            }

            if (contract.tenant_id !== tenantId) {
                throw new ContractError('You do not have permission to pay rent for this contract', 403, 'FORBIDDEN');
            }

            if (contract.status !== ContractStatus.ACTIVE && contract.status !== ContractStatus.EXPIRED) {
                throw new ContractError('Monthly rent can only be paid for active or expired contracts with pending dues', 400, 'CONTRACT_NOT_PAYABLE');
            }

            const profile = await Profile.findOne({
                where: { user_id: tenantId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!profile) {
                throw new ContractError('Tenant profile not found', 404, 'PROFILE_NOT_FOUND');
            }

            const now = testingClockService.getNow();
            const payableInstallments = this.getPayableInstallmentDates(contract, now);

            if (payableInstallments.length === 0) {
                throw new ContractError('No rent installment is payable yet for this contract', 400, 'NO_INSTALLMENT_DUE');
            }

            const paidRows = await ActivityLog.findAll({
                where: {
                    actor_user_id: tenantId,
                    action: 'MONTHLY_RENT_PAID_FROM_BALANCE',
                    entity_type: 'CONTRACT',
                    entity_id: contract.id,
                },
                order: [['created_at', 'ASC']],
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            const prepaidInstallments = this.getPrepaidInstallmentsCount(contract);
            const paidInstallments = paidRows.reduce((sum, row) => {
                const meta = (row.metadata ?? {}) as Record<string, any>;
                const byInstallments = Number(meta.installmentsPaid ?? 0);
                if (Number.isFinite(byInstallments) && byInstallments > 0) return sum + byInstallments;
                return sum + 1;
            }, prepaidInstallments);

            const outstandingInstallments = Math.max(payableInstallments.length - paidInstallments, 0);
            if (outstandingInstallments <= 0) {
                throw new ContractError('All payable rent installments are already paid for this contract', 400, 'MONTHLY_RENT_ALREADY_PAID');
            }

            const rentAmount = Number(contract.rent_amount ?? 0);
            if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
                throw new ContractError('Monthly rent amount is not configured for this contract', 400, 'INVALID_RENT_AMOUNT');
            }

            // ─── Apply pending landlord-responsibility maintenance credits ──────
            // Maintenance jobs the landlord owed for in past months get deducted
            // from the next rent the tenant pays.
            const pendingCharges = await LandlordMaintenanceCharge.findAll({
                where: {
                    contract_id: contract.id,
                    status: LandlordMaintenanceChargeStatus.PENDING,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            const pendingCreditTotal = pendingCharges.reduce(
                (sum, c) => sum + Number((c as any).amount ?? 0),
                0
            );
            const grossRentDue = rentAmount * outstandingInstallments;
            const netRentAmount = Math.max(grossRentDue - pendingCreditTotal, 0);
            const overdueInstallmentDates = payableInstallments.slice(paidInstallments);
            const lateInstallments = overdueInstallmentDates.filter((d) =>
                this.hasLateFeeStarted(d, now)
            ).length;
            const lateFeePerInstallment = Math.max(Number(contract.late_fee_amount ?? 0), 0);
            const lateFee = lateFeePerInstallment * lateInstallments;
            const totalToDebit = netRentAmount + lateFee;

            const availableBalance = Number((profile as any).wallet_balance ?? 0);
            if (availableBalance < totalToDebit) {
                throw new ContractError('Insufficient wallet balance to pay monthly rent (including late fee if applicable)', 400, 'INSUFFICIENT_WALLET_BALANCE');
            }

            const remainingBalance = Math.max(availableBalance - totalToDebit, 0);
            await profile.update({ wallet_balance: remainingBalance }, { transaction });

            for (const charge of pendingCharges) {
                await charge.update(
                    {
                        status: LandlordMaintenanceChargeStatus.APPLIED,
                        applied_at: testingClockService.getNow(),
                    },
                    { transaction }
                );
            }

            await contract.update(
                {
                    payment_verified_at: now,
                    payment_status: ContractPaymentStatus.PAID,
                },
                { transaction }
            );

            const coveredRange = overdueInstallmentDates.map((d) =>
                d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            );
            const paidForMonth = coveredRange.length > 1
                ? `${coveredRange[0]} - ${coveredRange[coveredRange.length - 1]}`
                : coveredRange[0] ?? 'Current cycle';

            await activityLogService.log({
                actor: { userId: tenantId, role: 'TENANT' },
                action: 'MONTHLY_RENT_PAID_FROM_BALANCE',
                entityType: 'CONTRACT',
                entityId: contract.id,
                description: `Monthly rent paid from wallet balance for ${paidForMonth}.`,
                metadata: {
                    contractId: contract.id,
                    paidForMonth,
                    debitedAmount: totalToDebit,
                    lateFeeApplied: lateFee,
                    wasLate: lateFee > 0,
                    installmentsPaid: outstandingInstallments,
                    landlordMaintenanceCredit: pendingCreditTotal,
                    rentAmount,
                    grossRentDue,
                    remainingBalance,
                },
            });

            // Check for approved lease termination request
            const approvedRequest = await LeaseTerminationRequest.findOne({
                where: {
                    contract_id: contract.id,
                    status: LeaseTerminationStatus.APPROVED,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (approvedRequest) {
                const dueDates = this.getContractDueDates(contract);
                const moveIn = new Date(contract.move_in_date);
                const currentIdx = dueDates.findIndex((dueDate, idx) => {
                    const periodStart = idx === 0 ? moveIn : dueDates[idx - 1]!;
                    return now >= periodStart;
                });

                if (currentIdx !== -1) {
                    const currentMonthDueDate = dueDates[currentIdx]!;
                    const isMonthEnded = now >= currentMonthDueDate;
                    const newPaidInstallments = paidInstallments + outstandingInstallments;
                    const isPaid = newPaidInstallments >= currentIdx + 1;

                    if (isMonthEnded && isPaid) {
                        await this.executeApprovedLeaseTermination(contract, approvedRequest, transaction);
                    }
                }
            }

            await transaction.commit();

            const refreshedContract = await Contract.findByPk(contract.id, {
                include: this.getContractDetailIncludes(),
            });

            return {
                contract: this.formatContractResponse(refreshedContract ?? contract, true, true),
                remainingBalance,
                debitedAmount: totalToDebit,
                paidForMonth,
                lateFeeApplied: lateFee,
                wasLate: lateFee > 0,
                installmentsPaid: outstandingInstallments,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async initiateWalletTopup(
        tenantId: string,
        input: WalletTopupInitiateInput
    ): Promise<WalletTopupCheckoutResponse> {
        const amount = Number(input.amount ?? 0);
        const amountCents = Math.round(amount * 100);
        const paymentMethod = input.payment_method ?? 'CARD';
        const shouldSaveCard = Boolean(input.save_card) && paymentMethod === 'CARD';

        if (!Number.isFinite(amount) || amount <= 0 || amountCents <= 0) {
            throw new ContractError('Top-up amount must be greater than zero', 400, 'INVALID_TOPUP_AMOUNT');
        }

        const integrationId = paymentMethod === 'WALLET'
            ? env.PAYMOB_WALLET_INTEGRATION_ID
            : env.PAYMOB_INTEGRATION_ID;
        const iframeId = paymentMethod === 'WALLET'
            ? env.PAYMOB_WALLET_IFRAME_ID
            : env.PAYMOB_IFRAME_ID;

        if (integrationId <= 0) {
            throw new ContractError('Selected Paymob integration is not configured', 500, 'PAYMOB_INTEGRATION_NOT_CONFIGURED');
        }
        if (iframeId <= 0) {
            throw new ContractError('Selected Paymob iframe is not configured', 500, 'PAYMOB_IFRAME_NOT_CONFIGURED');
        }

        const tenantUser = await User.findByPk(tenantId, {
            include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'phone_number'] }],
            attributes: ['id', 'email'],
        });

        if (!tenantUser) {
            throw new ContractError('Tenant user not found', 404, 'USER_NOT_FOUND');
        }

        const callbackUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/tenant-payment?walletTopup=1`;
        const profile = (tenantUser as any).profile;
        const checkout = await paymobService.createCheckoutSession({
            amountCents,
            merchantOrderId: `WALLET-${tenantId}-${testingClockService.getNow().getTime()}`,
            billingData: {
                email: tenantUser.email,
                first_name: profile?.first_name || 'Tenant',
                last_name: profile?.last_name || 'User',
                phone_number: profile?.phone_number || '+201000000000',
            },
            callbackUrl,
            integrationId,
            iframeId,
        });

        await Profile.update(
            {
                wallet_pending_order_id: checkout.orderId,
                wallet_pending_amount_cents: amountCents,
                wallet_pending_save_card: shouldSaveCard,
            },
            {
                where: { user_id: tenantId },
            }
        );

        return {
            checkoutUrl: checkout.iframeUrl,
            amountCents: checkout.amountCents,
            orderId: checkout.orderId,
            currency: 'EGP',
        };
    }

    async verifyWalletTopup(tenantId: string, input: WalletTopupVerifyInput): Promise<WalletBalanceResponse> {
        // ── Idempotency guard ─────────────────────────────────────────────
        // Frontend may retry verify after a transient network/Paymob timeout.
        // If we already credited this transaction earlier, simply return the
        // current balance instead of failing with NO_PENDING_TOPUP.
        const targetTxId = Number(input.transaction_id);
        const verifiedRows = await ActivityLog.findAll({
            where: {
                actor_user_id: tenantId,
                action: 'WALLET_TOPUP_VERIFIED',
            },
            order: [['created_at', 'DESC']],
            limit: 25,
        });

        const alreadyVerified = verifiedRows.some((row) => {
            const meta = (row.metadata ?? {}) as Record<string, any>;
            return Number(meta.transactionId) === targetTxId;
        });

        if (alreadyVerified) {
            const currentProfile = await Profile.findOne({ where: { user_id: tenantId } });
            return {
                balance: Number((currentProfile as any)?.wallet_balance ?? 0),
                currency: 'EGP',
            };
        }

        const transaction = await sequelize.transaction();

        try {
            const profile = await Profile.findOne({
                where: { user_id: tenantId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!profile) {
                throw new ContractError('Tenant profile not found', 404, 'PROFILE_NOT_FOUND');
            }

            const pendingOrderId = Number((profile as any).wallet_pending_order_id ?? 0);
            const pendingAmountCents = Number((profile as any).wallet_pending_amount_cents ?? 0);
            const shouldSaveCard = Boolean((profile as any).wallet_pending_save_card);

            if (!pendingOrderId || !pendingAmountCents) {
                throw new ContractError('No pending wallet top-up found for verification', 400, 'NO_PENDING_TOPUP');
            }

            const verification = await paymobService.verifyTransaction(input.transaction_id);
            // Normalize both sides to Number — Sequelize returns BIGINT as string
            const paymobOrderId = Number(verification.orderId ?? 0);
            const isOrderMatched = paymobOrderId > 0 && paymobOrderId === pendingOrderId;
            const isAmountMatched = Number(verification.amountCents) === Number(pendingAmountCents);
            const isSuccess = verification.success && !verification.pending && !verification.isVoided && !verification.isRefunded;

            console.log('[WalletTopup] Verification details:', {
                transactionId: input.transaction_id,
                pendingOrderId,
                paymobOrderId,
                isOrderMatched,
                pendingAmountCents,
                actualAmountCents: verification.amountCents,
                isAmountMatched,
                isSuccess,
                paymobSuccess: verification.success,
                paymobPending: verification.pending,
                rawOrderId: (profile as any).wallet_pending_order_id,
                rawOrderIdType: typeof (profile as any).wallet_pending_order_id,
            });

            if (!isSuccess || !isOrderMatched || !isAmountMatched) {
                await profile.update(
                    {
                        wallet_pending_order_id: null,
                        wallet_pending_amount_cents: null,
                        wallet_pending_save_card: false,
                    },
                    { transaction }
                );

                const failReason = !isSuccess ? 'Transaction not successful' : !isOrderMatched ? 'Order ID mismatch' : 'Amount mismatch';
                throw new ContractError(`Wallet top-up verification failed: ${failReason}. Please retry top-up.`, 400, 'TOPUP_VERIFICATION_FAILED');
            }

            const currentBalance = Number((profile as any).wallet_balance ?? 0);
            const updatedBalance = currentBalance + pendingAmountCents / 100;

            await profile.update(
                {
                    wallet_balance: updatedBalance,
                    wallet_pending_order_id: null,
                    wallet_pending_amount_cents: null,
                    wallet_pending_save_card: false,
                },
                { transaction }
            );

            if (shouldSaveCard && verification.cardToken && verification.cardLast4 && verification.cardExpMonth && verification.cardExpYear) {
                const existing = await PaymentMethod.findOne({
                    where: {
                        user_id: tenantId,
                        provider: PaymentProvider.PAYMOB,
                        provider_payment_token: verification.cardToken,
                    },
                    transaction,
                });

                if (!existing) {
                    const safeBrand = (verification.cardBrand || 'CARD').toUpperCase().slice(0, 40);
                    const safeLast4 = verification.cardLast4.slice(-4).padStart(4, '0');
                    const safeHolder = (verification.cardholderName || 'Card Holder').trim().slice(0, 120) || 'Card Holder';

                    await PaymentMethod.create(
                        {
                            user_id: tenantId,
                            provider: PaymentProvider.PAYMOB,
                            provider_payment_token: verification.cardToken,
                            brand: safeBrand,
                            last4: safeLast4,
                            exp_month: verification.cardExpMonth,
                            exp_year: verification.cardExpYear,
                            cardholder_name: safeHolder,
                            is_default: false,
                        },
                        { transaction }
                    );
                }
            }

            await transaction.commit();

            // Record verification so retries are idempotent and history is auditable.
            await activityLogService.log({
                actor: { userId: tenantId, role: 'TENANT' },
                action: 'WALLET_TOPUP_VERIFIED',
                entityType: 'PROFILE',
                entityId: tenantId,
                description: `Wallet top-up of ${(pendingAmountCents / 100).toFixed(2)} EGP verified.`,
                metadata: {
                    transactionId: Number(input.transaction_id),
                    orderId: pendingOrderId,
                    amountCents: pendingAmountCents,
                    creditedAmount: pendingAmountCents / 100,
                    newBalance: updatedBalance,
                },
            });

            return {
                balance: updatedBalance,
                currency: 'EGP',
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async getTenantPaymentHistory(
        tenantId: string,
        opts: { limit?: number } = {}
    ): Promise<import('../interfaces/contract.interfaces.js').TenantPaymentHistoryItem[]> {
        const limit = Math.min(Math.max(opts.limit ?? 100, 1), 300);
        const actions = [
            'CONTRACT_PAID_FROM_BALANCE',
            'MONTHLY_RENT_PAID_FROM_BALANCE',
            'MAINTENANCE_ESCROW_DEBIT',
            'MAINTENANCE_DISPUTE_CHARGED_TENANT',
            'MAINTENANCE_DISPUTE_REFUNDED_TENANT',
            'MAINTENANCE_DIRECT_SETTLEMENT_DEBIT',
        ];

        const rows = await ActivityLog.findAll({
            where: {
                actor_user_id: tenantId,
                action: { [Op.in]: actions },
            },
            order: [['created_at', 'DESC']],
            limit,
        });

        return rows.map((row) => {
            const metadata = (row.metadata ?? {}) as Record<string, any>;
            const action = row.action;
            const amountRaw =
                metadata.amount ??
                metadata.debitedAmount ??
                metadata.refundedAmount ??
                metadata.netAmount ??
                0;
            const amount = Number(amountRaw ?? 0);

            const isCredit = action === 'MAINTENANCE_DISPUTE_REFUNDED_TENANT';
            const type =
                action === 'CONTRACT_PAID_FROM_BALANCE'
                    ? 'CONTRACT_INITIAL'
                    : action === 'MONTHLY_RENT_PAID_FROM_BALANCE'
                        ? 'RENT_MONTHLY'
                        : action === 'MAINTENANCE_DISPUTE_REFUNDED_TENANT'
                            ? 'MAINTENANCE_REFUND'
                            : 'MAINTENANCE';

            const installmentsCount =
                action === 'MONTHLY_RENT_PAID_FROM_BALANCE'
                    ? Math.max(Number(metadata.installmentsPaid ?? 1), 1)
                    : null;

            return {
                id: row.id,
                createdAt: row.created_at,
                type,
                direction: isCredit ? 'CREDIT' : 'DEBIT',
                amount: Math.abs(Number.isFinite(amount) ? amount : 0),
                currency: 'EGP',
                status: 'SUCCESS',
                reference: row.entity_id ?? row.id,
                description: row.description,
                entityType: row.entity_type ?? null,
                entityId: row.entity_id ?? null,
                ...(installmentsCount ? { installmentsCount } : {}),
            };
        });
    }

    /**
     * Build a per-installment view of a contract's monthly rent schedule.
     * Each installment carries a status (PAID / DUE / OVERDUE / UPCOMING),
     * the late-fee that applies (if any) and whether it has been settled.
     */
    async getContractInstallments(
        contractId: string,
        callerId: string
    ): Promise<ContractInstallmentsResponse> {
        const contract = await Contract.findByPk(contractId);
        if (!contract) {
            throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        }
        if (contract.tenant_id !== callerId && contract.landlord_id !== callerId) {
            throw new ContractError('You do not have permission to view this contract', 403, 'FORBIDDEN');
        }
        if (
            contract.status !== ContractStatus.ACTIVE &&
            contract.status !== ContractStatus.EXPIRED
        ) {
            throw new ContractError(
                'Installments are only available for active or expired contracts',
                400,
                'CONTRACT_NOT_PAYABLE'
            );
        }

        const tenantId = contract.tenant_id;
        const profile = await Profile.findOne({ where: { user_id: tenantId } });
        const walletBalance = Number((profile as any)?.wallet_balance ?? 0);

        const now = testingClockService.getNow();
        const dueDates = this.getContractDueDates(contract);
        const payableInstallments = this.getPayableInstallmentDates(contract, now);

        const paidRows = await ActivityLog.findAll({
            where: {
                actor_user_id: tenantId,
                action: 'MONTHLY_RENT_PAID_FROM_BALANCE',
                entity_type: 'CONTRACT',
                entity_id: contract.id,
            },
            order: [['created_at', 'ASC']],
        });

        const prepaidInstallments = this.getPrepaidInstallmentsCount(contract);
        const paidInstallments = paidRows.reduce((sum, row) => {
            const meta = (row.metadata ?? {}) as Record<string, any>;
            const byInstallments = Number(meta.installmentsPaid ?? 0);
            if (Number.isFinite(byInstallments) && byInstallments > 0) return sum + byInstallments;
            return sum + 1;
        }, prepaidInstallments);

        const flatPaidDates: Array<{ paidAt: Date }> = [];
        // Seed the first N entries with the contract's activation-payment date so
        // the prepaid installments expose a meaningful "paidAt" in the UI.
        if (prepaidInstallments > 0) {
            const activationPaidAt = (contract as any).payment_verified_at
                ? new Date((contract as any).payment_verified_at)
                : new Date((contract as any).updated_at ?? Date.now());
            for (let i = 0; i < prepaidInstallments; i += 1) {
                flatPaidDates.push({ paidAt: activationPaidAt });
            }
        }
        paidRows.forEach((row) => {
            const meta = (row.metadata ?? {}) as Record<string, any>;
            const count = Math.max(Number(meta.installmentsPaid ?? 1), 1);
            for (let i = 0; i < count; i += 1) {
                flatPaidDates.push({ paidAt: new Date(row.created_at) });
            }
        });

        const pendingCharges = await LandlordMaintenanceCharge.findAll({
            where: {
                contract_id: contract.id,
                status: LandlordMaintenanceChargeStatus.PENDING,
            },
        });
        const pendingCreditTotal = pendingCharges.reduce(
            (sum, c) => sum + Number((c as any).amount ?? 0),
            0
        );

        const rentAmount = Number(contract.rent_amount ?? 0);
        const lateFeeAmount = Math.max(Number(contract.late_fee_amount ?? 0), 0);
        const moveIn = new Date(contract.move_in_date as any);

        const items: RentInstallmentItem[] = dueDates.map((dueDate, idx) => {
            const isPaidIdx = idx < paidInstallments;
            const periodStart = idx === 0 ? moveIn : dueDates[idx - 1]!;
            const isDue = now >= periodStart;
            const isOverdue = now >= dueDate && !isPaidIdx;
            let status: RentInstallmentStatus = 'UPCOMING';
            if (isPaidIdx) status = 'PAID';
            else if (isOverdue) status = 'OVERDUE';
            else if (isDue) status = 'DUE';

            const installmentLateFee = status === 'OVERDUE' ? lateFeeAmount : 0;

            return {
                index: idx,
                label: dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                dueDate: dueDate.toISOString(),
                rentAmount,
                lateFeeAmount: installmentLateFee,
                totalAmount: rentAmount + installmentLateFee,
                status,
                isPaid: isPaidIdx,
                paidAt: flatPaidDates[idx]?.paidAt
                    ? (flatPaidDates[idx]!.paidAt as Date).toISOString()
                    : null,
            };
        });

        const overdueInstallments = items.filter((i) => i.status === 'OVERDUE').length;
        const outstandingInstallments = Math.max(payableInstallments.length - paidInstallments, 0);

        // Compute net amount that would be debited for "Pay Now" (settles all currently-due)
        const grossRentDue = rentAmount * outstandingInstallments;
        const netRentAmount = Math.max(grossRentDue - pendingCreditTotal, 0);
        const lateFee = lateFeeAmount * overdueInstallments;
        const nextPayableTotal = netRentAmount + lateFee;
        const nextPayableIndex = paidInstallments < dueDates.length ? paidInstallments : null;

        const approvedReq = await LeaseTerminationRequest.findOne({
            where: {
                contract_id: contract.id,
                status: LeaseTerminationStatus.APPROVED
            }
        });
        const isTerminationApproved = !!approvedReq;

        return {
            contractId: contract.id,
            rentAmount,
            lateFeeAmount,
            rentDueDate: contract.rent_due_date ?? null,
            leaseDurationMonths: contract.lease_duration_months,
            autopayEnabled: Boolean((contract as any).autopay_enabled),
            walletBalance,
            pendingLandlordCredit: pendingCreditTotal,
            paidInstallments,
            dueInstallments: payableInstallments.length,
            overdueInstallments,
            outstandingInstallments,
            nextPayableIndex,
            nextPayableTotal,
            items,
            now: now.toISOString(),
            isTerminationApproved,
        };
    }

    /**
     * Toggle autopay for a contract. When enabled, due installments are
     * automatically settled from the wallet balance whenever
     * `runAutopaySweepForTenant` runs (e.g., on testing-clock advance).
     */
    async setContractAutopay(
        contractId: string,
        tenantId: string,
        enabled: boolean
    ): Promise<AutopayUpdateResponse> {
        const contract = await Contract.findByPk(contractId);
        if (!contract) {
            throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        }
        if (contract.tenant_id !== tenantId) {
            throw new ContractError('You do not have permission to modify this contract', 403, 'FORBIDDEN');
        }
        if (
            contract.status !== ContractStatus.ACTIVE &&
            contract.status !== ContractStatus.EXPIRED
        ) {
            throw new ContractError(
                'Autopay can only be configured for active or expired contracts',
                400,
                'CONTRACT_NOT_PAYABLE'
            );
        }

        await contract.update({ autopay_enabled: Boolean(enabled) });

        await activityLogService.log({
            actor: { userId: tenantId, role: 'TENANT' },
            action: enabled ? 'CONTRACT_AUTOPAY_ENABLED' : 'CONTRACT_AUTOPAY_DISABLED',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: `Tenant ${enabled ? 'enabled' : 'disabled'} autopay for contract ${contract.contract_id}.`,
            metadata: { contractId: contract.id },
        });

        return {
            contractId: contract.id,
            autopayEnabled: Boolean((contract as any).autopay_enabled),
        };
    }

    /**
     * Settle all autopay-eligible contracts for a tenant.
     * - Walks through every ACTIVE/EXPIRED contract with autopay enabled.
     * - Skips contracts that have no outstanding installments or insufficient balance.
     * - Each contract is settled in its own transaction (atomic per-contract).
     * Used after the testing clock advances so simulated months actually
     * collect payment without manual interaction.
     */
    async runAutopaySweepForTenant(tenantId: string): Promise<{ contractsSettled: number }> {
        const contracts = await Contract.findAll({
            where: {
                tenant_id: tenantId,
                autopay_enabled: true,
                status: { [Op.in]: [ContractStatus.ACTIVE, ContractStatus.EXPIRED] },
            },
        });

        let contractsSettled = 0;
        for (const contract of contracts) {
            try {
                await this.payMonthlyRentFromBalance(contract.id, tenantId);
                contractsSettled += 1;
            } catch {
                // Insufficient balance / no dues / etc. — skip silently for sweep.
            }
        }

        return { contractsSettled };
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Find and validate a contract for landlord operations
     */
    private async findAndValidateLandlordContract(
        contractId: string,
        landlordId: string
    ): Promise<Contract> {
        const contract = await Contract.findByPk(contractId);

        if (!contract) {
            throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        }

        if (contract.landlord_id !== landlordId) {
            throw new ContractError(
                'You do not have permission to modify this contract',
                403,
                'FORBIDDEN'
            );
        }

        if (contract.status !== ContractStatus.PENDING_LANDLORD) {
            throw new ContractError(
                'This contract can no longer be modified by the landlord',
                400,
                'CONTRACT_NOT_PENDING_LANDLORD'
            );
        }

        return contract;
    }

    /**
     * Find and validate a contract for tenant operations
     */
    private async findAndValidateTenantContract(
        contractId: string,
        tenantId: string
    ): Promise<Contract> {
        const contract = await Contract.findByPk(contractId);

        if (!contract) {
            throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        }

        if (contract.tenant_id !== tenantId) {
            throw new ContractError(
                'You do not have permission to modify this contract',
                403,
                'FORBIDDEN'
            );
        }

        if (contract.status !== ContractStatus.PENDING_TENANT) {
            throw new ContractError(
                'This contract is not currently awaiting tenant action',
                400,
                'CONTRACT_NOT_PENDING_TENANT'
            );
        }

        return contract;
    }

    /**
     * Find and validate a contract for tenant payment operations
     */
    private async findAndValidateTenantPaymentContract(
        contractId: string,
        tenantId: string,
        transaction?: any
    ): Promise<Contract> {
        const contract = await Contract.findByPk(contractId, { transaction });

        if (!contract) {
            throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        }

        if (contract.tenant_id !== tenantId) {
            throw new ContractError(
                'You do not have permission to make payment for this contract',
                403,
                'FORBIDDEN'
            );
        }

        if (contract.status !== ContractStatus.PENDING_PAYMENT && contract.status !== ContractStatus.ACTIVE) {
            throw new ContractError(
                'This contract is not currently in payment stage',
                400,
                'CONTRACT_NOT_PENDING_PAYMENT'
            );
        }

        return contract;
    }

    private calculateContractTotalAmountCents(contract: Contract): number {
        const total = this.calculateContractTotalAmount(contract);
        return Math.round(total * 100);
    }

    private calculateContractTotalAmount(contract: Contract): number {
        const rent = Number(contract.rent_amount ?? 0);
        const deposit = Number(contract.security_deposit ?? 0);
        const fee = Number(contract.service_fee ?? 0);
        return rent + deposit + fee;
    }

    private async expireCompletedLeases(): Promise<void> {
        const now = testingClockService.getNow();

        // Automatically enable properties that were disabled until a chosen date which has now passed
        await Property.update(
            { status: PropertyStatus.AVAILABLE },
            {
                where: {
                    status: PropertyStatus.UNAVAILABLE,
                    availability_date: {
                        [Op.ne]: null,
                        [Op.lte]: now
                    }
                }
            }
        );

        const activeContracts = await Contract.findAll({
            where: { status: ContractStatus.ACTIVE },
            include: [
                {
                    model: Property,
                    as: 'property',
                }
            ]
        });

        for (const contract of activeContracts) {
            const moveIn = new Date(contract.move_in_date as any);
            if (Number.isNaN(moveIn.getTime())) continue;
            const leaseEnd = new Date(moveIn);
            leaseEnd.setMonth(leaseEnd.getMonth() + Number(contract.lease_duration_months ?? 0));
            if (now >= leaseEnd) {
                const transaction = await sequelize.transaction();
                try {
                    await contract.update({ status: ContractStatus.EXPIRED }, { transaction });
                    
                    if (contract.property_id) {
                        await Property.update(
                            { status: PropertyStatus.AVAILABLE },
                            { where: { id: contract.property_id }, transaction }
                        );
                    }

                    const depositAmount = Number(contract.security_deposit ?? 0);
                    if (depositAmount > 0) {
                        const tenantProfile = await Profile.findOne({
                            where: { user_id: contract.tenant_id },
                            transaction,
                            lock: transaction.LOCK.UPDATE,
                        });
                        if (tenantProfile) {
                            const newBalance = Number(tenantProfile.wallet_balance ?? 0) + depositAmount;
                            await tenantProfile.update({ wallet_balance: newBalance }, { transaction });
                        }

                        await activityLogService.log({
                            actor: { userId: 'SYSTEM', role: 'ADMIN' },
                            action: 'SECURITY_DEPOSIT_REFUNDED',
                            entityType: 'CONTRACT',
                            entityId: contract.id,
                            description: `Security deposit of $${depositAmount} refunded to tenant wallet upon successful completion of the lease.`,
                            metadata: {
                                contractId: contract.id,
                                refundAmount: depositAmount,
                            },
                        });

                        await notificationService.create({
                            userId: contract.tenant_id,
                            type: 'SYSTEM',
                            title: 'Security Deposit Refunded',
                            body: `Your lease for property "${contract.property?.title || 'Property'}" has successfully ended. Your security deposit of $${depositAmount} has been refunded to your wallet.`,
                            relatedEntityType: 'CONTRACT',
                            relatedEntityId: contract.id,
                        });

                        await notificationService.create({
                            userId: contract.landlord_id,
                            type: 'SYSTEM',
                            title: 'Security Deposit Returned to Tenant',
                            body: `The lease agreement for "${contract.property?.title || 'Property'}" has ended successfully, and the security deposit of $${depositAmount} has been refunded to the tenant's wallet.`,
                            relatedEntityType: 'CONTRACT',
                            relatedEntityId: contract.id,
                        });
                    }

                    await transaction.commit();
                } catch (err) {
                    await transaction.rollback();
                    console.error('Failed to expire contract and refund deposit:', err);
                }
            }
        }
    }

    async syncPropertyStatuses(): Promise<void> {
        const now = testingClockService.getNow();

        // Automatically enable properties that were disabled until a chosen date which has now passed
        await Property.update(
            { status: PropertyStatus.AVAILABLE },
            {
                where: {
                    status: PropertyStatus.UNAVAILABLE,
                    availability_date: {
                        [Op.ne]: null,
                        [Op.lte]: now
                    }
                }
            }
        );

        // Find all active contracts
        const activeContracts = await Contract.findAll({
            where: { status: ContractStatus.ACTIVE },
            attributes: ['property_id'],
        });
        const rentedPropertyIds = activeContracts.map(c => c.property_id);

        // Update properties with active contracts to RENTED
        if (rentedPropertyIds.length > 0) {
            await Property.update(
                { status: PropertyStatus.RENTED },
                {
                    where: {
                        id: { [Op.in]: rentedPropertyIds },
                        status: { [Op.ne]: PropertyStatus.RENTED }
                    }
                }
            );

            // Update properties marked RENTED without active contract to AVAILABLE
            await Property.update(
                { status: PropertyStatus.AVAILABLE },
                {
                    where: {
                        status: PropertyStatus.RENTED,
                        id: { [Op.notIn]: rentedPropertyIds }
                    }
                }
            );
        } else {
            // Update all properties marked RENTED to AVAILABLE since there are no active contracts
            await Property.update(
                { status: PropertyStatus.AVAILABLE },
                {
                    where: {
                        status: PropertyStatus.RENTED
                    }
                }
            );
        }
    }


    private getCycleDueDate(contract: Contract, referenceDate: Date): Date {
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();

        if (contract.rent_due_date === '5TH_OF_MONTH') {
            return new Date(year, month, 5);
        }

        if (contract.rent_due_date === 'LAST_DAY_OF_MONTH') {
            return new Date(year, month + 1, 0);
        }

        return new Date(year, month, 1);
    }

    private getContractDueDates(contract: Contract): Date[] {
        const moveIn = new Date(contract.move_in_date as any);
        if (Number.isNaN(moveIn.getTime())) return [];

        const leaseMonths = Math.max(Number(contract.lease_duration_months ?? 0), 0);
        if (leaseMonths <= 0) return [];

        const dueDates: Date[] = [];
        for (let i = 0; i < leaseMonths; i += 1) {
            const dueDate = new Date(moveIn.getFullYear(), moveIn.getMonth() + i + 1, moveIn.getDate());
            dueDates.push(dueDate);
        }
        return dueDates;
    }

    private getPayableInstallmentDates(contract: Contract, now: Date): Date[] {
        const dueDates = this.getContractDueDates(contract);
        const moveIn = new Date(contract.move_in_date as any);
        return dueDates.filter((dueDate, idx) => {
            const periodStart = idx === 0 ? moveIn : dueDates[idx - 1]!;
            return now >= periodStart;
        });
    }

    /**
     * Late fee starts after a 5-day window from due date.
     * Example: due May 1 -> no fee through May 4, fee applies on May 5.
     */
    private hasLateFeeStarted(dueDate: Date, now: Date): boolean {
        const lateFeeAppliesAt = addDays(dueDate, ContractService.LATE_FEE_GRACE_DAYS);
        return now >= lateFeeAppliesAt;
    }

    /**
     * Initial contract activation payment ALWAYS includes one full rent
     * installment in addition to the security deposit and service fee — that's
     * literally what the tenant pays on the PENDING_PAYMENT screen
     * (see `calculateContractTotalAmount`: rent + deposit + fee).
     *
     * Therefore once a contract is ACTIVE/EXPIRED, the very first scheduled
     * installment is already paid, regardless of whether the move-in date and
     * the first scheduled due date fall in the same calendar month.
     *
     * Without this, a tenant who moves in mid-month with a `1ST_OF_MONTH` due
     * cycle would see next month's installment marked as DUE even though they
     * already paid for it at activation, and the wallet flow would try to
     * double-charge them.
     */
    private getPrepaidInstallmentsCount(contract: Contract): number {
        const leaseMonths = Math.max(Number(contract.lease_duration_months ?? 0), 0);
        if (leaseMonths <= 0) return 0;
        if (contract.status !== ContractStatus.ACTIVE && contract.status !== ContractStatus.EXPIRED) {
            return 0;
        }
        const dueDates = this.getContractDueDates(contract);
        return dueDates.length > 0 ? 1 : 0;
    }

    /**
     * Include options for contract list queries
     */
    private getContractListIncludes() {
        return [
            {
                model: Property,
                as: 'property',
                attributes: ['id', 'title', 'address', 'maintenance_responsibilities'],
            },
            {
                model: User,
                as: 'tenant',
                attributes: ['id', 'email'],
                include: [
                    {
                        model: Profile,
                        as: 'profile',
                        attributes: ['first_name', 'last_name', 'e_signature_url', 'national_id', 'avatar_url'],
                    },
                ],
            },
            {
                model: User,
                as: 'landlord',
                attributes: ['id', 'email'],
                include: [
                    {
                        model: Profile,
                        as: 'profile',
                        attributes: ['first_name', 'last_name', 'e_signature_url', 'national_id', 'avatar_url'],
                    },
                ],
            },
            {
                model: LeaseTerminationRequest,
                as: 'terminationRequests',
                attributes: ['id', 'status', 'reason', 'scenario', 'details', 'created_at', 'updated_at', 'damage_deduction', 'mutual_deposit_option'],
            },
        ];
    }

    /**
     * Include options for contract detail queries
     */
    private getContractDetailIncludes() {
        return [
            {
                model: Property,
                as: 'property',
                attributes: ['id', 'title', 'address', 'type', 'furnishing', 'monthly_price', 'security_deposit', 'maintenance_responsibilities'],
                include: [
                    {
                        model: PropertySpecifications,
                        as: 'specifications',
                        attributes: ['bedrooms', 'bathrooms', 'area_sqft'],
                    },
                ],
            },
            {
                model: User,
                as: 'tenant',
                attributes: ['id', 'email'],
                include: [
                    {
                        model: Profile,
                        as: 'profile',
                        attributes: ['first_name', 'last_name', 'e_signature_url', 'avatar_url'],
                    },
                ],
            },
            {
                model: User,
                as: 'landlord',
                attributes: ['id', 'email'],
                include: [
                    {
                        model: Profile,
                        as: 'profile',
                        attributes: ['first_name', 'last_name', 'e_signature_url', 'avatar_url'],
                    },
                ],
            },
            {
                model: LeaseTerminationRequest,
                as: 'terminationRequests',
                attributes: ['id', 'status', 'reason', 'scenario', 'details', 'created_at', 'updated_at', 'damage_deduction', 'mutual_deposit_option', 'requester_id'],
            },
        ];
    }

    /**
     * Report a tenant
     */
    async reportTenant(contractId: string, landlordId: string, data: { reason: string, details: string }) {
        const contract = await Contract.findByPk(contractId);
        if (!contract) throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        if (contract.landlord_id !== landlordId) throw new ContractError('You do not have permission to modify this contract', 403, 'FORBIDDEN');
        if (contract.status !== ContractStatus.ACTIVE && contract.status !== ContractStatus.EXPIRED) {
            throw new ContractError('You can only report tenants for active or expired contracts', 400, 'INVALID_CONTRACT_STATUS');
        }

        // Map reason string to enum
        let mappedReason = TenantReportReason.OTHER;
        const validReasons = Object.values(TenantReportReason);
        if (validReasons.includes(data.reason as TenantReportReason)) {
            mappedReason = data.reason as TenantReportReason;
        }

        const report = await TenantReport.create({
            contract_id: contract.id,
            reporter_id: landlordId,
            tenant_id: contract.tenant_id,
            reason: mappedReason,
            details: data.details,
        });

        await activityLogService.log({
            actor: { userId: landlordId, role: 'LANDLORD' },
            action: 'TENANT_REPORTED',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: 'Landlord reported a tenant.',
            metadata: { reportId: report.id, tenantId: contract.tenant_id },
        });

        return report;
    }

    /**
     * Request lease termination
     */
    async requestLeaseTermination(contractId: string, userId: string, data: { reason?: string; scenario?: string; details?: string }) {
        const contract = await Contract.findByPk(contractId);
        if (!contract) throw new ContractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        
        const isLandlord = contract.landlord_id === userId;
        const isTenant = contract.tenant_id === userId;
        if (!isLandlord && !isTenant) {
            throw new ContractError('You do not have permission to modify this contract', 403, 'FORBIDDEN');
        }
        
        if (contract.status !== ContractStatus.ACTIVE) {
            throw new ContractError('You can only request lease termination for active contracts', 400, 'INVALID_CONTRACT_STATUS');
        }

        const existingRequest = await LeaseTerminationRequest.findOne({
            where: {
                contract_id: contract.id,
                status: 'PENDING'
            }
        });
        if (existingRequest) {
            throw new ContractError('There is already a pending lease termination request for this contract.', 400, 'PENDING_REQUEST_EXISTS');
        }

        const scenario = data.scenario || (isLandlord ? 'LANDLORD_INITIATED' : 'TENANT_INITIATED');
        const details = data.details || data.reason || '';
        const reason = data.reason || `${scenario}: ${details}`;

        const request = await LeaseTerminationRequest.create({
            contract_id: contract.id,
            requester_id: userId,
            reason,
            scenario,
            details,
            status: 'PENDING' as any,
        } as any);

        const actorRole = isLandlord ? 'LANDLORD' : 'TENANT';

        await activityLogService.log({
            actor: { userId: userId, role: actorRole },
            action: 'LEASE_TERMINATION_REQUESTED',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: `${actorRole === 'LANDLORD' ? 'Landlord' : 'Tenant'} requested an early lease termination.`,
            metadata: { requestId: request.id, scenario },
        });

        return request;
    }


    async runDailyLeaseCycleCheck(now: Date): Promise<void> {
        const activeContracts = await Contract.findAll({
            where: { status: ContractStatus.ACTIVE },
            include: [
                {
                    model: Property,
                    as: 'property',
                },
                {
                    model: LeaseTerminationRequest,
                    as: 'terminationRequests',
                    where: { status: LeaseTerminationStatus.APPROVED },
                    required: false,
                }
            ]
        });

        for (const contract of activeContracts) {
            const dueDates = this.getContractDueDates(contract);
            const moveIn = new Date(contract.move_in_date as any);
            const dueDatesUpToNow = dueDates.filter((d, idx) => {
                const periodStart = idx === 0 ? moveIn : dueDates[idx - 1]!;
                return now >= periodStart;
            });
            const N = dueDatesUpToNow.length;

            const prepaidInstallments = this.getPrepaidInstallmentsCount(contract);
            const paidRows = await ActivityLog.findAll({
                where: {
                    actor_user_id: contract.tenant_id,
                    action: 'MONTHLY_RENT_PAID_FROM_BALANCE',
                    entity_type: 'CONTRACT',
                    entity_id: contract.id,
                },
            });

            const paidInstallments = paidRows.reduce((sum, row) => {
                const meta = (row.metadata ?? {}) as Record<string, any>;
                const byInstallments = Number(meta.installmentsPaid ?? 0);
                if (Number.isFinite(byInstallments) && byInstallments > 0) return sum + byInstallments;
                return sum + 1;
            }, prepaidInstallments);

            const approvedRequest = (contract as any).terminationRequests?.find(
                (tr: any) => tr.status === LeaseTerminationStatus.APPROVED
            );

            if (approvedRequest) {
                const currentIdx = dueDates.findIndex((dueDate, idx) => {
                    const periodStart = idx === 0 ? moveIn : dueDates[idx - 1]!;
                    return now >= periodStart;
                });

                if (currentIdx !== -1) {
                    const currentMonthDueDate = dueDates[currentIdx]!;
                    const isMonthEnded = now >= currentMonthDueDate;
                    const isPaid = paidInstallments >= currentIdx + 1;

                    if (isMonthEnded && isPaid) {
                        const transaction = await sequelize.transaction();
                        try {
                            const fullRequest = await LeaseTerminationRequest.findByPk(approvedRequest.id, { transaction });
                            if (fullRequest) {
                                await this.executeApprovedLeaseTermination(contract, fullRequest, transaction);
                            }
                            await transaction.commit();
                        } catch (err) {
                            await transaction.rollback();
                            console.error(`Failed to execute termination for contract ${contract.id}`, err);
                        }
                    }
                }
                continue;
            }

            if (paidInstallments < N) {
                const unpaidPeriodStart = paidInstallments === 0 ? moveIn : dueDates[paidInstallments - 1]!;
                const unpaidPeriodEnd = dueDates[paidInstallments]!;

                if (now >= unpaidPeriodEnd) {
                    const transaction = await sequelize.transaction();
                    try {
                        await contract.update({ status: ContractStatus.TERMINATED }, { transaction });
                        
                        if (contract.property_id) {
                            await Property.update(
                                { status: PropertyStatus.AVAILABLE },
                                { where: { id: contract.property_id }, transaction }
                            );
                        }

                        const depositAmount = Number(contract.security_deposit ?? 0);
                        if (depositAmount > 0) {
                            const landlordProfile = await Profile.findOne({
                                where: { user_id: contract.landlord_id },
                                transaction,
                                lock: transaction.LOCK.UPDATE,
                            });
                            if (landlordProfile) {
                                const newBalance = Number(landlordProfile.wallet_balance ?? 0) + depositAmount;
                                await landlordProfile.update({ wallet_balance: newBalance }, { transaction });
                            }
                        }

                        await activityLogService.log({
                            actor: { userId: 'SYSTEM', role: 'ADMIN' },
                            action: 'CONTRACT_TERMINATED_NON_PAYMENT',
                            entityType: 'CONTRACT',
                            entityId: contract.id,
                            description: `Contract ${contract.contract_id} terminated automatically due to non-payment of rent for the cycle starting ${unpaidPeriodStart.toLocaleDateString('en-US')}.`,
                            metadata: {
                                contractId: contract.id,
                                unpaidInstallmentMonth: unpaidPeriodEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                                depositForfeited: true,
                                depositAmount,
                            },
                        });

                        await notificationService.create({
                            userId: contract.tenant_id,
                            type: 'SYSTEM',
                            title: 'Lease Terminated - Non-Payment',
                            body: `Your lease for property ${contract.property?.title || 'Property'} has been terminated because rent for the cycle starting ${unpaidPeriodStart.toLocaleDateString('en-US')} was not paid. Your deposit of $${depositAmount} has been forfeited.`,
                            relatedEntityType: 'CONTRACT',
                            relatedEntityId: contract.id,
                        });

                        await notificationService.create({
                            userId: contract.landlord_id,
                            type: 'SYSTEM',
                            title: 'Lease Terminated - Tenant Non-Payment',
                            body: `The lease agreement for ${contract.property?.title || 'Property'} has been terminated because the tenant failed to pay rent for the cycle starting ${unpaidPeriodStart.toLocaleDateString('en-US')}. The security deposit of $${depositAmount} has been transferred to your wallet balance.`,
                            relatedEntityType: 'CONTRACT',
                            relatedEntityId: contract.id,
                        });

                        await transaction.commit();
                    } catch (err) {
                        await transaction.rollback();
                        console.error('Failed to terminate contract and forfeit deposit:', err);
                    }
                } else {
                    const daysElapsed = Math.floor((now.getTime() - unpaidPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
                    const rentAmt = contract.rent_amount ?? 0;

                    if (daysElapsed === 0 || daysElapsed === 4 || daysElapsed === 14 || daysElapsed === 19) {
                        await notificationService.create({
                            userId: contract.tenant_id,
                            type: 'SYSTEM',
                            title: 'Rent Payment Reminder',
                            body: `Friendly reminder: your rent of $${rentAmt} for the cycle starting ${unpaidPeriodStart.toLocaleDateString('en-US')} is due.`,
                            relatedEntityType: 'CONTRACT',
                            relatedEntityId: contract.id,
                        });
                    } else if (daysElapsed >= 24) {
                        await notificationService.create({
                            userId: contract.tenant_id,
                            type: 'SYSTEM',
                            title: 'URGENT: Rent Warning',
                            body: `URGENT: your rent of $${rentAmt} for the cycle starting ${unpaidPeriodStart.toLocaleDateString('en-US')} is unpaid. You must pay before ${unpaidPeriodEnd.toLocaleDateString('en-US')} to avoid lease termination.`,
                            relatedEntityType: 'CONTRACT',
                            relatedEntityId: contract.id,
                        });
                    }
                }
            }
        }
    }

    private async executeApprovedLeaseTermination(
        contract: Contract,
        request: LeaseTerminationRequest,
        transaction: any
    ): Promise<void> {
        const now = testingClockService.getNow();

        // Calculate unpaid rent up to now (or rather, the current billing cycle end)
        const installments = await this.getContractInstallments(contract.id, contract.tenant_id);
        const unpaidDues = installments.items.filter(item => !item.isPaid && new Date(item.dueDate) <= now);
        const unpaidRentAmount = unpaidDues.reduce((sum, item) => sum + item.rentAmount, 0);

        // Determine deposit distribution
        const depositAmount = Number(contract.security_deposit ?? 0);
        let tenantDepositRefund = 0;
        let landlordDepositCredit = 0;

        const scenario = request.scenario;

        if (scenario === 'LANDLORD_INITIATED') {
            // Landlord early termination: full deposit to tenant, no penalty
            tenantDepositRefund = depositAmount;
            landlordDepositCredit = 0;
        } else if (scenario === 'Property Damage' || scenario === 'Lease Violation' || scenario === 'Unauthorized Occupancy') {
            // Landlord early termination due to tenant breach: deposit goes to landlord
            tenantDepositRefund = 0;
            landlordDepositCredit = depositAmount;
        } else if (scenario === 'Early exit') {
            // Early exit, no landlord fault
            const dueDates = this.getContractDueDates(contract);
            const moveIn = new Date(contract.move_in_date);
            // Find current cycle due date as the termination reference date
            const currentIdx = dueDates.findIndex((dueDate, idx) => {
                const periodStart = idx === 0 ? moveIn : dueDates[idx - 1]!;
                return now >= periodStart;
            });
            const termReferenceDate = currentIdx !== -1 ? dueDates[currentIdx]! : now;

            const halfwayDate = new Date(moveIn);
            halfwayDate.setMonth(halfwayDate.getMonth() + (Number(contract.lease_duration_months ?? 0) / 2));

            if (termReferenceDate < halfwayDate) {
                // Before halfway: penalty applies, deposit goes to landlord
                tenantDepositRefund = 0;
                landlordDepositCredit = depositAmount;
            } else {
                // After halfway: refund after deductions (damages)
                const damages = Number(request.damage_deduction ?? 0);
                const actualDamage = Math.min(damages, depositAmount);
                tenantDepositRefund = depositAmount - actualDamage;
                landlordDepositCredit = actualDamage;
            }
        } else if (scenario === 'Property uninhabitable' || scenario === 'Landlord breached contract') {
            // Property uninhabitable or Landlord breached: full deposit returned to tenant, no penalty
            tenantDepositRefund = depositAmount;
            landlordDepositCredit = 0;
        } else if (scenario === 'Mutual Agreement') {
            // Mutual Agreement: option decides
            const option = request.mutual_deposit_option;
            const damages = Number(request.damage_deduction ?? 0);
            const actualDamage = Math.min(damages, depositAmount);

            let baseTenant = 0;
            let baseLandlord = 0;
            if (option === 'LANDLORD') {
                baseTenant = 0;
                baseLandlord = depositAmount;
            } else if (option === 'TENANT') {
                baseTenant = depositAmount;
                baseLandlord = 0;
            } else if (option === 'SPLIT') {
                baseTenant = depositAmount / 2;
                baseLandlord = depositAmount / 2;
            } else {
                baseTenant = depositAmount / 2;
                baseLandlord = depositAmount / 2;
            }

            if (actualDamage > 0) {
                if (baseTenant >= actualDamage) {
                    tenantDepositRefund = baseTenant - actualDamage;
                    landlordDepositCredit = baseLandlord + actualDamage;
                } else {
                    tenantDepositRefund = 0;
                    landlordDepositCredit = baseLandlord + baseTenant;
                }
            } else {
                tenantDepositRefund = baseTenant;
                landlordDepositCredit = baseLandlord;
            }
        } else {
            // Fallback
            tenantDepositRefund = depositAmount;
            landlordDepositCredit = 0;
        }

        // Wallet adjustments
        const tenantProfile = await Profile.findOne({ where: { user_id: contract.tenant_id }, transaction });
        const landlordProfile = await Profile.findOne({ where: { user_id: contract.landlord_id }, transaction });

        let finalUnpaidRentPaid = 0;
        let finalRentDeductedFromDeposit = 0;

        if (tenantProfile && landlordProfile) {
            // 1. Deduct unpaid rent from tenant wallet first
            const tenantWalletBalance = Number(tenantProfile.wallet_balance ?? 0);
            const rentPaidFromWallet = Math.min(tenantWalletBalance, unpaidRentAmount);
            finalUnpaidRentPaid = rentPaidFromWallet;
            let remainingUnpaidRent = unpaidRentAmount - rentPaidFromWallet;

            tenantProfile.wallet_balance = Number(tenantProfile.wallet_balance) - rentPaidFromWallet;
            landlordProfile.wallet_balance = Number(landlordProfile.wallet_balance) + rentPaidFromWallet;

            // 2. If there's still unpaid rent, deduct from the tenant's deposit refund
            if (remainingUnpaidRent > 0 && tenantDepositRefund > 0) {
                const rentDeductedFromDeposit = Math.min(tenantDepositRefund, remainingUnpaidRent);
                finalRentDeductedFromDeposit = rentDeductedFromDeposit;
                tenantDepositRefund -= rentDeductedFromDeposit;
                landlordDepositCredit += rentDeductedFromDeposit;
                remainingUnpaidRent -= rentDeductedFromDeposit;
            }

            // 3. Add the resolved deposit refund and credit to the respective wallets
            tenantProfile.wallet_balance = Number(tenantProfile.wallet_balance) + tenantDepositRefund;
            landlordProfile.wallet_balance = Number(landlordProfile.wallet_balance) + landlordDepositCredit;

            // 4. For Unauthorized Occupancy, apply damage deductions in addition to deposit forfeiture
            if (request.scenario === 'Unauthorized Occupancy') {
                const damages = Number(request.damage_deduction ?? 0);
                if (damages > 0) {
                    tenantProfile.wallet_balance = Number(tenantProfile.wallet_balance) - damages;
                    landlordProfile.wallet_balance = Number(landlordProfile.wallet_balance) + damages;
                }
            }

            await tenantProfile.save({ transaction });
            await landlordProfile.save({ transaction });
        }

        // Update statuses
        await contract.update({ status: ContractStatus.TERMINATED }, { transaction });

        if (contract.property_id) {
            await Property.update(
                { status: PropertyStatus.AVAILABLE },
                { where: { id: contract.property_id }, transaction }
            );
        }

        // Update termination request status to APPROVED (should already be APPROVED, but let's make sure it is updated)
        await request.update({ status: LeaseTerminationStatus.APPROVED }, { transaction });

        // Logs and notifications
        await activityLogService.log({
            actor: { userId: 'SYSTEM', role: 'ADMIN' },
            action: 'LEASE_TERMINATED',
            entityType: 'CONTRACT',
            entityId: contract.id,
            description: `Lease terminated early (approved request). Deposit refunded: $${tenantDepositRefund}, Landlord credit: $${landlordDepositCredit}. Unpaid rent settled: $${finalUnpaidRentPaid + finalRentDeductedFromDeposit}.`,
            metadata: {
                requestId: request.id,
                contractId: contract.id,
                tenantRefund: tenantDepositRefund,
                landlordCredit: landlordDepositCredit,
                unpaidRentSettled: finalUnpaidRentPaid + finalRentDeductedFromDeposit,
            },
        });

        const propTitle = contract.property?.title || 'Property';

        await Notification.create({
            user_id: contract.tenant_id,
            title: 'Lease Terminated',
            body: `Your lease for property "${propTitle}" has been terminated. Deposit refunded: $${tenantDepositRefund}.`,
            type: 'SYSTEM',
            is_read: false,
        } as any, { transaction });

        await Notification.create({
            user_id: contract.landlord_id,
            title: 'Lease Terminated',
            body: `The lease for property "${propTitle}" has been terminated. Wallet credited: $${landlordDepositCredit} (from deposit/settlements).`,
            type: 'SYSTEM',
            is_read: false,
        } as any, { transaction });
    }

    /**
     * Format a Contract model instance into a response DTO
     */
    private formatContractResponse(
        contract: Contract,
        includeRelations: boolean = false,
        includeMaintenanceResponsibilities: boolean = false
    ): ContractResponse {
        const response: ContractResponse = {
            id: contract.id,
            contractId: contract.contract_id,
            leaseId: contract.lease_id ?? null,
            rentalRequestId: contract.rental_request_id,
            propertyId: contract.property_id,
            landlordId: contract.landlord_id,
            tenantId: contract.tenant_id,
            status: contract.status,
            rentAmount: contract.rent_amount ? Number(contract.rent_amount) : null,
            securityDeposit: contract.security_deposit ? Number(contract.security_deposit) : null,
            serviceFee: Number(contract.service_fee),
            paymentSchedule: contract.payment_schedule,
            rentDueDate: contract.rent_due_date ?? null,
            lateFeeAmount: contract.late_fee_amount ? Number(contract.late_fee_amount) : null,
            maxOccupants: contract.max_occupants ?? null,
            moveInDate: contract.move_in_date,
            leaseDurationMonths: contract.lease_duration_months,
            landlordNationalId: safeDecrypt(contract.landlord_national_id),
            propertyRegistrationNumber: contract.property_registration_number ?? null,
            landlordSignedAt: contract.landlord_signed_at ?? null,
            tenantSignedAt: contract.tenant_signed_at ?? null,
            tenantAgreedTerms: contract.tenant_agreed_terms,
            paymentStatus: contract.payment_status,
            paymentVerifiedAt: contract.payment_verified_at ?? null,
            paymobOrderId: contract.paymob_order_id ?? null,
            paymobTransactionId: contract.paymob_transaction_id ?? null,
            landlordSignatureUrl: normalizeSignatureUrl(contract.landlord_signature_url),
            tenantSignatureUrl: normalizeSignatureUrl(contract.tenant_signature_url),
            tenantNationalId:
                safeDecrypt(contract.tenant_national_id) ??
                safeDecrypt((contract.tenant as any)?.profile?.national_id ?? null),
            tenantEmergencyContactName: contract.tenant_emergency_contact_name ?? null,
            tenantEmergencyPhone: contract.tenant_emergency_phone ?? null,
            createdAt: contract.created_at,
            updatedAt: contract.updated_at,
        };

        if (includeRelations) {
            if (contract.landlord) {
                const landlordProfile = (contract.landlord as any).profile;
                response.landlord = {
                    id: contract.landlord.id,
                    firstName: landlordProfile?.first_name ?? '',
                    lastName: landlordProfile?.last_name ?? '',
                    email: contract.landlord.email,
                    avatarUrl: landlordProfile?.avatar_url ?? null,
                    signatureUrl:
                        normalizeSignatureUrl(contract.landlord_signature_url) ??
                        normalizeSignatureUrl(landlordProfile?.e_signature_url ?? null),
                };
            }

            if (contract.tenant) {
                const tenantProfile = (contract.tenant as any).profile;
                response.tenant = {
                    id: contract.tenant.id,
                    firstName: tenantProfile?.first_name ?? '',
                    lastName: tenantProfile?.last_name ?? '',
                    email: contract.tenant.email,
                    avatarUrl: tenantProfile?.avatar_url ?? null,
                    signatureUrl:
                        normalizeSignatureUrl(contract.tenant_signature_url) ??
                        normalizeSignatureUrl(tenantProfile?.e_signature_url ?? null),
                };
            }

            if (contract.property) {
                const prop = contract.property as any;
                response.property = {
                    id: prop.id,
                    title: prop.title,
                    address: prop.address,
                    type: prop.type ?? null,
                    furnishing: prop.furnishing ?? null,
                    monthlyPrice: prop.monthly_price ? Number(prop.monthly_price) : null,
                    securityDeposit: prop.security_deposit ? Number(prop.security_deposit) : null,
                    maintenanceResponsibilities: (prop.maintenance_responsibilities ?? []).map((item: any) => ({
                        area: item.area,
                        responsible_party: item.responsible_party,
                    })),
                };

                if (prop.specifications) {
                    response.propertySpecifications = {
                        bedrooms: prop.specifications.bedrooms,
                        bathrooms: prop.specifications.bathrooms,
                        areaSqft: Number(prop.specifications.area_sqft),
                    };
                }
            }
        }

        if (includeMaintenanceResponsibilities && contract.maintenanceResponsibilities) {
            response.maintenanceResponsibilities = contract.maintenanceResponsibilities.map(
                (mr): MaintenanceResponsibilityResponse => ({
                    id: mr.id,
                    area: mr.area,
                    responsibleParty: mr.responsible_party,
                })
            );
        }

        if ((contract as any).terminationRequests) {
            response.terminationRequests = (contract as any).terminationRequests.map((tr: any) => ({
                id: tr.id,
                status: tr.status,
                reason: tr.reason,
                createdAt: tr.created_at || tr.createdAt,
                requesterId: tr.requester_id || tr.requesterId,
                scenario: tr.scenario,
                details: tr.details,
                damageDeduction: tr.damage_deduction ? Number(tr.damage_deduction) : null,
                mutualDepositOption: tr.mutual_deposit_option,
            }));
        }

        let depositStatus: 'PENDING' | 'HELD' | 'REFUNDED' | 'FORFEITED' | 'RELEASED' | 'SPLIT' | undefined;
        if (contract.status === ContractStatus.ACTIVE) {
            depositStatus = 'HELD';
        } else if (contract.status === ContractStatus.PENDING_PAYMENT || contract.status === ContractStatus.PENDING_TENANT || contract.status === ContractStatus.PENDING_LANDLORD) {
            depositStatus = 'PENDING';
        } else if (contract.status === ContractStatus.EXPIRED) {
            depositStatus = 'REFUNDED';
        } else if (contract.status === ContractStatus.TERMINATED) {
            // Find approved LeaseTerminationRequest
            const approvedRequest = (contract as any).terminationRequests?.find(
                (tr: any) => tr.status === 'APPROVED'
            );

            if (!approvedRequest) {
                // Non-payment auto-termination
                depositStatus = 'FORFEITED'; // Maps to RELEASED on Landlord side in UI
            } else {
                const scenario = approvedRequest.scenario;
                if (scenario === 'LANDLORD_INITIATED') {
                    depositStatus = 'REFUNDED';
                } else if (scenario === 'Property Damage' || scenario === 'Lease Violation' || scenario === 'Unauthorized Occupancy') {
                    depositStatus = 'FORFEITED';
                } else {
                    if (scenario === 'Early exit') {
                        const dueDates = this.getContractDueDates(contract);
                        const moveIn = new Date(contract.move_in_date);
                        const termReferenceDate = new Date(approvedRequest.updated_at || approvedRequest.created_at || contract.updated_at);
                        const halfwayDate = new Date(moveIn);
                        halfwayDate.setMonth(halfwayDate.getMonth() + (Number(contract.lease_duration_months ?? 0) / 2));

                        if (termReferenceDate < halfwayDate) {
                            depositStatus = 'FORFEITED';
                        } else {
                            const damages = Number(approvedRequest.damage_deduction ?? 0);
                            const depositAmount = Number(contract.security_deposit ?? 0);
                            if (damages >= depositAmount) {
                                depositStatus = 'FORFEITED';
                            } else if (damages > 0) {
                                depositStatus = 'SPLIT';
                            } else {
                                depositStatus = 'REFUNDED';
                            }
                        }
                    } else if (scenario === 'Property uninhabitable' || scenario === 'Landlord breached contract') {
                        depositStatus = 'REFUNDED';
                    } else if (scenario === 'Mutual Agreement') {
                        const option = approvedRequest.mutual_deposit_option;
                        const damages = Number(approvedRequest.damage_deduction ?? 0);
                        const depositAmount = Number(contract.security_deposit ?? 0);

                        if (option === 'LANDLORD') {
                            depositStatus = 'FORFEITED';
                        } else if (option === 'TENANT') {
                            if (damages >= depositAmount) {
                                depositStatus = 'FORFEITED';
                            } else if (damages > 0) {
                                depositStatus = 'SPLIT';
                            } else {
                                depositStatus = 'REFUNDED';
                            }
                        } else if (option === 'SPLIT') {
                            depositStatus = 'SPLIT';
                        } else {
                            depositStatus = 'SPLIT';
                        }
                    } else {
                        depositStatus = 'REFUNDED';
                    }
                }
            }
        }
        if (depositStatus) {
            response.depositStatus = depositStatus;
        }

        return response;
    }
}

// Export singleton instance
export const contractService = new ContractService();
export default contractService;
