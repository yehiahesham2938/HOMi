import { Op, type Transaction, col } from 'sequelize';
import sequelize from '../../../config/database.js';
import {
    MaintenanceRequest,
    MaintenanceRequestStatus,
    MaintenanceUrgency,
    MaintenanceChargeParty,
    type MaintenanceRequestStatusType,
    type MaintenanceChargePartyType,
} from '../models/MaintenanceRequest.js';
import {
    MaintenanceJobApplication,
    MaintenanceJobApplicationStatus,
    type MaintenanceJobApplicationStatusType,
} from '../models/MaintenanceJobApplication.js';
import { MaintenanceLocation } from '../models/MaintenanceLocation.js';
import {
    MaintenanceConflict,
    MaintenanceConflictStatus,
    MaintenanceConflictResolution,
    type MaintenanceConflictResolutionType,
} from '../models/MaintenanceConflict.js';
import { MaintenanceRating } from '../models/MaintenanceRating.js';
import {
    LandlordMaintenanceCharge,
    LandlordMaintenanceChargeStatus,
} from '../models/LandlordMaintenanceCharge.js';
import {
    MaintenanceProviderApplication,
    MaintenanceApplicationStatus,
} from '../models/MaintenanceProviderApplication.js';
import { User, UserRole } from '../../auth/models/User.js';
import { Profile } from '../../auth/models/Profile.js';
import { Property } from '../../properties/models/Property.js';
import { PropertyImage } from '../../properties/models/PropertyImage.js';
import { PropertyDetailedLocation } from '../../properties/models/PropertyDetailedLocation.js';
import { Contract, ContractStatus } from '../../contracts/models/Contract.js';
import { ContractMaintenanceResponsibility } from '../../contracts/models/ContractMaintenanceResponsibility.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { NotificationType as NotifType } from '../../notifications/models/Notification.js';
import { getIO } from '../../../shared/realtime/socket.js';
import { activityLogService } from '../../../shared/services/activity-log.service.js';
import { testingClockService } from '../../../shared/services/testing-clock.service.js';
import type {
    PostMaintenanceIssueInput,
    ProviderApplyInput,
    UpdateLocationInput,
    MarkProviderCompleteInput,
    ConfirmCompletionInput,
    AdminResolveConflictInput,
    MaintenanceRequestResponse,
    MaintenanceJobApplicationResponse,
    BrowseProviderItem,
    PartyMini,
    PropertyMini,
    MaintenanceLocationResponse,
    MaintenanceConflictResponse,
    MaintenanceRatingResponse,
} from '../interfaces/maintenance.interfaces.js';

// ─── Error class ─────────────────────────────────────────────────────────────

export class MaintenanceError extends Error {
    constructor(
        message: string,
        public statusCode: number = 400,
        public code: string = 'MAINTENANCE_ERROR'
    ) {
        super(message);
        this.name = 'MaintenanceError';
    }
}

// ─── Category → contract maintenance area mapping ───────────────────────────
// The user-facing category list is `MAINTENANCE_CATEGORIES` but the contract
// stores responsibilities against `MaintenanceArea`. This map normalises one
// to the other so we can check whether a category falls on the landlord.
const CATEGORY_TO_CONTRACT_AREAS: Record<string, string[]> = {
    structural: ['Structural Repairs'],
    appliances: ['Interior Appliances'],
    utilities: ['Utility Bills'],
    plumbing: ['Plumbing'],
    electrical: ['Electrical'],
    hvac: ['HVAC / Air Conditioning'],
    pest: ['Pest Control'],
    exterior: ['Exterior Maintenance'],
    common: ['Common Areas'],
    security: ['Security Systems'],
    other: [],
    // Keep backwards compatibility for old categories
    Plumbing: ['Plumbing'],
    Electrical: ['Electrical'],
    Painting: ['Interior Appliances', 'Structural Repairs', 'Exterior Maintenance'],
    'AC Service': ['HVAC / Air Conditioning'],
    Gardening: ['Exterior Maintenance', 'Common Areas'],
    Flooring: ['Structural Repairs', 'Interior Appliances'],
    Other: [],
};

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function toNumber(value: unknown, fallback = 0): number {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeCategory(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function categoryMatchesProvider(requestCategory: string, providerCategories: string[]): boolean {
    const req = normalizeCategory(requestCategory);
    const providerNorm = providerCategories.map((c) => normalizeCategory(c)).filter(Boolean);
    if (!req || providerNorm.length === 0) return false;

    // "Other" providers should be able to see open jobs across categories.
    if (providerNorm.includes('other')) return true;

    // Exact normalized match first.
    if (providerNorm.includes(req)) return true;

    // Backward compatibility for older free-text categories.
    return providerNorm.some((pc) => pc.includes(req) || req.includes(pc));
}

function partyMini(user?: User | null): PartyMini | undefined {
    if (!user) return undefined;
    const profile = (user as any).profile as Profile | undefined;
    return {
        id: user.id,
        firstName: profile?.first_name ?? 'User',
        lastName: profile?.last_name ?? '',
        avatarUrl: profile?.avatar_url ?? null,
        phone: profile?.phone_number ?? null,
    };
}

function propertyMini(p?: Property | null): PropertyMini | undefined {
    if (!p) return undefined;
    const images = (p as any).images as PropertyImage[] | undefined;
    const main = images?.find((i) => (i as any).is_main) ?? images?.[0];
    const detailed = (p as any).detailedLocation as PropertyDetailedLocation | undefined;
    return {
        id: p.id,
        title: p.title,
        address: p.address,
        thumbnailUrl: main?.image_url ?? null,
        lat: detailed?.location_lat ?? null,
        lng: detailed?.location_long ?? null,
    };
}

class MaintenanceService {
    private readonly profileAttributes = [
        'id', 'user_id', 'first_name', 'last_name',
        'phone_number', 'avatar_url', 'bio', 'current_location'
    ];

    // ─── Wallet helpers ────────────────────────────────────────────────────

    private async debitWallet(
        userId: string,
        amount: number,
        transaction: Transaction,
        errorCode = 'INSUFFICIENT_WALLET_BALANCE'
    ): Promise<{ remaining: number }> {
        const profile = await Profile.findOne({
            where: { user_id: userId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!profile) throw new MaintenanceError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        const current = toNumber((profile as any).wallet_balance);
        if (current < amount - 0.001) {
            throw new MaintenanceError(
                'Insufficient wallet balance',
                400,
                errorCode
            );
        }
        const next = Math.max(current - amount, 0);
        await profile.update({ wallet_balance: next as any }, { transaction });
        return { remaining: next };
    }

    private async creditWallet(
        userId: string,
        amount: number,
        transaction: Transaction
    ): Promise<{ remaining: number }> {
        const profile = await Profile.findOne({
            where: { user_id: userId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!profile) throw new MaintenanceError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        const current = toNumber((profile as any).wallet_balance);
        const next = current + amount;
        await profile.update({ wallet_balance: next as any }, { transaction });
        return { remaining: next };
    }

    // ─── Common includes / formatting ─────────────────────────────────────

    private getRequestIncludes(opts: { withApplications?: boolean; withTenantPrivate?: boolean } = {}) {
        return [
            {
                model: User,
                as: 'tenant',
                attributes: ['id', 'email', 'role'],
                include: [{
                    model: Profile,
                    as: 'profile',
                    attributes: this.profileAttributes
                }],
            },
            {
                model: User,
                as: 'landlord',
                attributes: ['id', 'email', 'role'],
                include: [{
                    model: Profile,
                    as: 'profile',
                    attributes: this.profileAttributes
                }],
            },
            {
                model: User,
                as: 'provider',
                required: false,
                attributes: ['id', 'email', 'role'],
                include: [{
                    model: Profile,
                    as: 'profile',
                    attributes: this.profileAttributes
                }],
            },
            {
                model: Property,
                as: 'property',
                attributes: ['id', 'landlord_id', 'title', 'address'],
                include: [
                    {
                        model: PropertyImage,
                        as: 'images',
                        separate: true,
                        attributes: ['id', 'property_id', 'image_url', 'is_main']
                    },
                    {
                        model: PropertyDetailedLocation,
                        as: 'detailedLocation',
                        attributes: ['id', 'property_id', 'location_lat', 'location_long']
                    },
                ],
            },
            {
                model: MaintenanceLocation,
                as: 'currentLocation',
                required: false,
            },
            {
                model: MaintenanceConflict,
                as: 'conflict',
                required: false,
            },
            {
                model: MaintenanceRating,
                as: 'rating',
                required: false,
            },
            ...(opts.withApplications
                ? [
                    {
                        model: MaintenanceJobApplication,
                        as: 'applications',
                        required: false,
                        separate: true,
                        include: [
                            {
                                model: User,
                                as: 'provider',
                                attributes: ['id', 'email'],
                                include: [{
                                    model: Profile,
                                    as: 'profile',
                                    attributes: this.profileAttributes
                                }],
                            },
                        ],
                    },
                ]
                : []),
        ];
    }

    private async formatRequest(
        req: MaintenanceRequest,
        opts: { includeApplications?: boolean } = {}
    ): Promise<MaintenanceRequestResponse> {
        const tenant = (req as any).tenant as User | undefined;
        const landlord = (req as any).landlord as User | undefined;
        const provider = (req as any).provider as User | undefined;
        const property = (req as any).property as Property | undefined;
        const currentLocation = (req as any).currentLocation as MaintenanceLocation | undefined;
        const conflict = (req as any).conflict as MaintenanceConflict | undefined;
        const rating = (req as any).rating as MaintenanceRating | undefined;
        const applications = (req as any).applications as MaintenanceJobApplication[] | undefined;

        let providerExtra:
            | { category: string | null; providerType: string | null; businessName: string | null; rating: number; ratingsCount: number; avatarUrl?: string | null }
            | undefined;
        if (provider) {
            const [appRow, ratings] = await Promise.all([
                MaintenanceProviderApplication.findOne({ where: { user_id: provider.id } }),
                MaintenanceRating.findAll({ where: { provider_id: provider.id } }),
            ]);
            const avg = ratings.length
                ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
                : 0;
            const profile = (provider as any).profile as Profile | undefined;
            providerExtra = {
                category: appRow?.category ?? null,
                providerType: appRow?.provider_type ?? null,
                businessName: appRow?.business_name ?? null,
                rating: Number(avg.toFixed(2)),
                ratingsCount: ratings.length,
                avatarUrl: profile?.avatar_url ?? appRow?.selfie_image ?? null,
            };
        }

        return {
            id: req.id,
            tenantId: req.tenant_id,
            landlordId: req.landlord_id,
            propertyId: req.property_id,
            contractId: req.contract_id ?? null,
            assignedProviderId: req.assigned_provider_id ?? null,
            category: req.category,
            title: req.title,
            description: req.description,
            urgency: req.urgency,
            estimatedBudget: req.estimated_budget !== null ? toNumber(req.estimated_budget) : null,
            images: req.images ?? [],
            status: req.status,
            chargeParty: req.charge_party,
            agreedPrice: req.agreed_price !== null ? toNumber(req.agreed_price) : null,
            escrowAmount: toNumber(req.escrow_amount),
            completionNotes: req.completion_notes ?? null,
            completionImages: req.completion_images ?? [],
            enRouteStartedAt: req.en_route_started_at ?? null,
            inProgressStartedAt: req.in_progress_started_at ?? null,
            providerCompletedAt: req.provider_completed_at ?? null,
            tenantConfirmedAt: req.tenant_confirmed_at ?? null,
            disputedAt: req.disputed_at ?? null,
            disputedReason: req.disputed_reason ?? null,
            resolvedAt: req.resolved_at ?? null,
            createdAt: req.created_at,
            updatedAt: req.updated_at,
            tenant: partyMini(tenant),
            landlord: partyMini(landlord),
            provider: provider
                ? { ...partyMini(provider)!, ...providerExtra! }
                : undefined,
            property: propertyMini(property),
            applications: opts.includeApplications && applications
                ? await Promise.all(applications.map((a) => this.formatApplication(a)))
                : undefined,
            applicationsCount: applications?.length,
            currentLocation: currentLocation
                ? {
                    lat: currentLocation.lat,
                    lng: currentLocation.lng,
                    reportedAt: currentLocation.reported_at,
                    accuracyM: currentLocation.accuracy_m,
                    heading: currentLocation.heading,
                    speed: currentLocation.speed,
                }
                : null,
            conflict: conflict
                ? {
                    id: conflict.id,
                    requestId: conflict.request_id,
                    tenantReason: conflict.tenant_reason,
                    providerCompletionNotes: conflict.provider_completion_notes ?? null,
                    status: conflict.status,
                    resolution: conflict.resolution ?? null,
                    adminNotes: conflict.admin_notes ?? null,
                    resolvedAt: conflict.resolved_at ?? null,
                    createdAt: conflict.created_at,
                }
                : null,
            rating: rating
                ? {
                    rating: rating.rating,
                    comment: rating.comment ?? null,
                    createdAt: rating.created_at,
                }
                : null,
        };
    }

    private async formatApplication(
        app: MaintenanceJobApplication
    ): Promise<MaintenanceJobApplicationResponse> {
        const provider = (app as any).provider as User | undefined;
        const profile = (provider as any)?.profile as Profile | undefined;

        let providerInfo: MaintenanceJobApplicationResponse['provider'];
        if (provider) {
            const [appRow, ratings] = await Promise.all([
                MaintenanceProviderApplication.findOne({ where: { user_id: provider.id } }),
                MaintenanceRating.findAll({ where: { provider_id: provider.id } }),
            ]);
            const avg = ratings.length
                ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
                : 0;
            providerInfo = {
                id: provider.id,
                firstName: profile?.first_name ?? 'User',
                lastName: profile?.last_name ?? '',
                avatarUrl: profile?.avatar_url ?? appRow?.selfie_image ?? null,
                phone: profile?.phone_number ?? null,
                rating: Number(avg.toFixed(2)),
                ratingsCount: ratings.length,
                category: appRow?.category ?? null,
                providerType: appRow?.provider_type ?? null,
                businessName: appRow?.business_name ?? null,
                bio: profile?.bio ?? null,
            };
        }

        const reqEager = (app as any).request as MaintenanceRequest | undefined;
        let requestSnapshot: MaintenanceJobApplicationResponse['request'];
        if (reqEager) {
            const tenantUser = (reqEager as any).tenant as User | undefined;
            const propertyEager = (reqEager as any).property as Property | undefined;
            requestSnapshot = {
                id: reqEager.id,
                title: reqEager.title,
                description: reqEager.description,
                category: reqEager.category,
                urgency: reqEager.urgency,
                status: reqEager.status,
                createdAt: reqEager.created_at,
                tenant: partyMini(tenantUser),
                property: propertyMini(propertyEager),
            };
        }

        return {
            id: app.id,
            requestId: app.request_id,
            providerId: app.provider_id,
            finalPrice: toNumber(app.final_price),
            priceBreakdown: app.price_breakdown ?? null,
            coverNote: app.cover_note ?? null,
            etaHours: app.eta_hours ?? null,
            status: app.status,
            createdAt: app.created_at,
            provider: providerInfo,
            request: requestSnapshot,
        };
    }

    // ─── Determine charge party from contract responsibility ───────────────

    private async deriveChargeParty(
        contractId: string | null,
        category: string
    ): Promise<MaintenanceChargePartyType> {
        if (!contractId) return MaintenanceChargeParty.TENANT;
        const areas = CATEGORY_TO_CONTRACT_AREAS[category] ?? [];
        if (areas.length === 0) return MaintenanceChargeParty.TENANT;

        const responsibilities = await ContractMaintenanceResponsibility.findAll({
            where: {
                contract_id: contractId,
                area: { [Op.in]: areas },
            },
        });

        if (responsibilities.length > 0) {
            // If ANY matching area is the landlord's responsibility, charge landlord.
            for (const r of responsibilities) {
                if (r.responsible_party === 'LANDLORD') return MaintenanceChargeParty.LANDLORD;
            }
            return MaintenanceChargeParty.TENANT;
        }

        // Fallback: If no contract responsibilities are found, fetch from property's maintenance_responsibilities
        const contract = await Contract.findByPk(contractId, {
            include: [{ model: Property, as: 'property' }]
        });
        if (contract && (contract as any).property) {
            const p = (contract as any).property as Property;
            const propertyResponsibilities = p.maintenance_responsibilities ?? [];
            for (const item of propertyResponsibilities) {
                const mappedArea = LOWERCASE_TO_DB_AREA[item.area] || item.area;
                if (areas.includes(mappedArea) && item.responsible_party === 'LANDLORD') {
                    return MaintenanceChargeParty.LANDLORD;
                }
            }
        }

        return MaintenanceChargeParty.TENANT;
    }

    // ─── Resolve active rental(s) for tenant ───────────────────────────────

    private async getActiveContractsForTenant(tenantId: string): Promise<Contract[]> {
        const rows = await Contract.findAll({
            where: {
                tenant_id: tenantId,
                status: ContractStatus.ACTIVE,
            },
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'landlord_id', 'title', 'address', 'maintenance_responsibilities'],
                    include: [
                        { 
                            model: PropertyImage, 
                            as: 'images', 
                            separate: true,
                            attributes: ['id', 'property_id', 'image_url', 'is_main']
                        },
                        { 
                            model: PropertyDetailedLocation, 
                            as: 'detailedLocation',
                            attributes: ['id', 'property_id', 'location_lat', 'location_long']
                        },
                    ],
                },
            ],
            order: [['created_at', 'DESC']],
        });

        if (!rows.length) {
            throw new MaintenanceError(
                'You must have an active rental to post a maintenance issue.',
                400,
                'NO_ACTIVE_RENTAL'
            );
        }

        return rows;
    }

    private async getActiveRentalForTenantSelection(
        tenantId: string,
        selection?: { contractId?: string; propertyId?: string }
    ): Promise<{ contract: Contract; property: Property; landlordId: string }> {
        const activeContracts = await this.getActiveContractsForTenant(tenantId);

        let chosen: Contract | undefined;
        if (selection?.contractId) {
            chosen = activeContracts.find((c) => c.id === selection.contractId);
        } else if (selection?.propertyId) {
            chosen = activeContracts.find((c) => {
                const p = (c as any).property as Property | undefined;
                return p?.id === selection.propertyId;
            });
        } else {
            chosen = activeContracts[0];
        }

        if (!chosen) {
            throw new MaintenanceError(
                'Selected property is not part of your active rentals.',
                400,
                'INVALID_ACTIVE_PROPERTY_SELECTION'
            );
        }

        const property = (chosen as any).property as Property | undefined;
        if (!property) {
            throw new MaintenanceError(
                'Active contract has no associated property.',
                400,
                'CONTRACT_PROPERTY_MISSING'
            );
        }

        if (selection?.contractId && selection?.propertyId && property.id !== selection.propertyId) {
            throw new MaintenanceError(
                'Selected contract and property do not match.',
                400,
                'CONTRACT_PROPERTY_MISMATCH'
            );
        }

        return {
            contract: chosen,
            property,
            landlordId: (chosen as any).landlord_id,
        };
    }

    async getTenantActiveContext(tenantId: string): Promise<{
        contractId: string;
        property: PropertyMini;
        landlord: PartyMini;
        walletBalance: number;
        responsibilities?: Array<{ area: string; responsibleParty: string }>;
        activeRentals: Array<{
            contractId: string;
            property: PropertyMini;
            landlord: PartyMini;
            responsibilities?: Array<{ area: string; responsibleParty: string }>;
        }>;
    }> {
        const activeContracts = await this.getActiveContractsForTenant(tenantId);
        const first = activeContracts[0];
        if (!first) {
            throw new MaintenanceError(
                'You must have an active rental to post a maintenance issue.',
                400,
                'NO_ACTIVE_RENTAL'
            );
        }
        const firstProperty = (first as any).property as Property;

        const landlordIds = Array.from(new Set(activeContracts.map((c) => String((c as any).landlord_id))));
        const contractIds = activeContracts.map((c) => c.id);
        const [landlords, profile, responsibilities] = await Promise.all([
            User.findAll({
                where: { id: { [Op.in]: landlordIds } },
                attributes: ['id', 'email'],
                include: [{ 
                    model: Profile, 
                    as: 'profile',
                    attributes: this.profileAttributes
                }],
            }),
            Profile.findOne({ where: { user_id: tenantId }, attributes: ['wallet_balance'] }),
            ContractMaintenanceResponsibility.findAll({
                where: { contract_id: { [Op.in]: contractIds } },
            }),
        ]);
        const landlordById = new Map(landlords.map((u) => [u.id, u]));

        const responsibilitiesByContractId = new Map<string, Array<{ area: string; responsibleParty: string }>>();
        for (const r of responsibilities) {
            const list = responsibilitiesByContractId.get(r.contract_id) ?? [];
            list.push({ area: r.area, responsibleParty: r.responsible_party });
            responsibilitiesByContractId.set(r.contract_id, list);
        }

        const activeRentals = activeContracts.map((c) => {
            const p = (c as any).property as Property | undefined;
            if (!p) {
                throw new MaintenanceError(
                    'Active contract has no associated property.',
                    400,
                    'CONTRACT_PROPERTY_MISSING'
                );
            }
            const landlord = landlordById.get(String((c as any).landlord_id));
            const dbResponsibilities = responsibilitiesByContractId.get(c.id);
            const rentalResponsibilities = (dbResponsibilities && dbResponsibilities.length > 0)
                ? dbResponsibilities
                : (p.maintenance_responsibilities ?? []).map((item: any) => ({
                    area: LOWERCASE_TO_DB_AREA[item.area] || item.area,
                    responsibleParty: item.responsible_party,
                  }));
            return {
                contractId: c.id,
                property: propertyMini(p)!,
                landlord: partyMini(landlord as any)!,
                responsibilities: rentalResponsibilities,
            };
        });

        const firstLandlord = landlordById.get(String((first as any).landlord_id));
        const firstDbResponsibilities = responsibilitiesByContractId.get(first.id);
        const firstResponsibilities = (firstDbResponsibilities && firstDbResponsibilities.length > 0)
            ? firstDbResponsibilities
            : (firstProperty.maintenance_responsibilities ?? []).map((item: any) => ({
                area: LOWERCASE_TO_DB_AREA[item.area] || item.area,
                responsibleParty: item.responsible_party,
              }));

        return {
            contractId: first.id,
            property: propertyMini(firstProperty)!,
            landlord: partyMini(firstLandlord as any)!,
            walletBalance: toNumber((profile as any)?.wallet_balance),
            responsibilities: firstResponsibilities,
            activeRentals,
        };
    }

    // ─── Tenant: post issue ───────────────────────────────────────────────

    async postIssue(
        tenantId: string,
        input: PostMaintenanceIssueInput
    ): Promise<MaintenanceRequestResponse> {
        if (!input.title || !input.title.trim()) {
            throw new MaintenanceError('Title is required', 400, 'TITLE_REQUIRED');
        }
        if (!input.description || !input.description.trim()) {
            throw new MaintenanceError('Description is required', 400, 'DESCRIPTION_REQUIRED');
        }

        const selection: { contractId?: string; propertyId?: string } = {};
        if (input.contractId) selection.contractId = input.contractId;
        if (input.propertyId) selection.propertyId = input.propertyId;
        const { contract, property, landlordId } = await this.getActiveRentalForTenantSelection(tenantId, selection);
        const chargeParty = await this.deriveChargeParty(contract.id, input.category);

        const created = await MaintenanceRequest.create({
            tenant_id: tenantId,
            property_id: property.id,
            contract_id: contract.id,
            landlord_id: landlordId,
            assigned_provider_id: null,
            accepted_application_id: null,
            category: input.category,
            title: input.title.trim(),
            description: input.description.trim(),
            urgency: input.urgency ?? MaintenanceUrgency.MEDIUM,
            estimated_budget: input.estimatedBudget ?? null,
            images: input.images ?? [],
            status: MaintenanceRequestStatus.OPEN,
            charge_party: chargeParty,
            agreed_price: null,
            escrow_amount: 0,
            completion_notes: null,
            completion_images: [],
            en_route_started_at: null,
            in_progress_started_at: null,
            provider_completed_at: null,
            tenant_confirmed_at: null,
            disputed_at: null,
            disputed_reason: null,
            resolved_at: null,
        });

        // Notify landlord
        await notificationService.create({
            userId: landlordId,
            type: NotifType.MAINTENANCE_REQUEST_POSTED,
            title: 'New maintenance request on your property',
            body: `Tenant posted a "${input.category}" issue on ${property.title}.`,
            relatedEntityType: 'MaintenanceRequest',
            relatedEntityId: created.id,
            data: { chargeParty, category: input.category },
        });

        // Notify all approved providers in this category (best-effort, capped)
        const providers = await this.findProvidersForCategory(input.category, 25);
        await notificationService.createMany(
            providers.map((p) => ({
                userId: p.id,
                type: NotifType.SYSTEM,
                title: 'New job available',
                body: `A "${input.category}" job was posted in your category.`,
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: created.id,
            }))
        );

        const reloaded = await MaintenanceRequest.findByPk(created.id, {
            include: this.getRequestIncludes(),
        });
        return this.formatRequest(reloaded as MaintenanceRequest);
    }

    private async findProvidersForCategory(category: string, limit = 25): Promise<User[]> {
        const apps = await MaintenanceProviderApplication.findAll({
            where: {
                status: MaintenanceApplicationStatus.APPROVED,
                [Op.or]: [
                    { category },
                    sequelize.where(
                        sequelize.cast(col('categories'), 'text'),
                        { [Op.like]: `%${category}%` } as any
                    ) as any,
                ],
            },
            limit,
        });
        const userIds = apps.map((a) => a.user_id);
        if (userIds.length === 0) return [];
        return User.findAll({
            where: { id: { [Op.in]: userIds }, is_banned: false },
            include: [{ 
                model: Profile, 
                as: 'profile',
                attributes: this.profileAttributes
            }],
        });
    }

    // ─── Tenant: list / cancel ────────────────────────────────────────────

    async listTenantRequests(
        tenantId: string,
        statusFilter?: MaintenanceRequestStatusType[]
    ): Promise<MaintenanceRequestResponse[]> {
        const where: any = { tenant_id: tenantId };
        if (statusFilter && statusFilter.length) where.status = { [Op.in]: statusFilter };
        const rows = await MaintenanceRequest.findAll({
            where,
            include: [
                ...this.getRequestIncludes({ withApplications: true }),
            ],
            order: [['created_at', 'DESC']],
        });
        return Promise.all(rows.map((r) => this.formatRequest(r, { includeApplications: true })));
    }

    async cancelRequest(tenantId: string, requestId: string): Promise<MaintenanceRequestResponse> {
        const req = await MaintenanceRequest.findByPk(requestId);
        if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        if (req.tenant_id !== tenantId) throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        if (req.status !== MaintenanceRequestStatus.OPEN) {
            throw new MaintenanceError(
                'Only open requests can be cancelled.',
                400,
                'CANNOT_CANCEL'
            );
        }
        await req.update({ status: MaintenanceRequestStatus.CANCELLED });
        // Reject pending applications
        await MaintenanceJobApplication.update(
            { status: MaintenanceJobApplicationStatus.REJECTED },
            { where: { request_id: requestId, status: MaintenanceJobApplicationStatus.PENDING } }
        );
        const reloaded = await MaintenanceRequest.findByPk(requestId, {
            include: this.getRequestIncludes(),
        });
        return this.formatRequest(reloaded as MaintenanceRequest);
    }

    // ─── Single fetch with permissions ────────────────────────────────────

    async getRequest(
        requestId: string,
        currentUser: { userId: string; role: string }
    ): Promise<MaintenanceRequestResponse> {
        const req = await MaintenanceRequest.findByPk(requestId, {
            include: this.getRequestIncludes({ withApplications: true }),
        });
        if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');

        const isTenant = req.tenant_id === currentUser.userId;
        const isLandlord = req.landlord_id === currentUser.userId;
        const isAssignedProvider = req.assigned_provider_id === currentUser.userId;
        const isAdmin = currentUser.role === UserRole.ADMIN;

        // Providers who applied can see (but with limited application visibility)
        let isApplicant = false;
        if (currentUser.role === UserRole.MAINTENANCE_PROVIDER) {
            const own = await MaintenanceJobApplication.findOne({
                where: { request_id: requestId, provider_id: currentUser.userId },
            });
            isApplicant = !!own;
        }

        if (!isTenant && !isLandlord && !isAssignedProvider && !isAdmin && !isApplicant) {
            throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        }

        const formatted = await this.formatRequest(req, {
            includeApplications: isTenant || isAdmin,
        });

        // Provider applicant: include only their own application
        if (currentUser.role === UserRole.MAINTENANCE_PROVIDER && !isAdmin && !isTenant) {
            const own = await MaintenanceJobApplication.findOne({
                where: { request_id: requestId, provider_id: currentUser.userId },
                include: [
                    {
                        model: User,
                        as: 'provider',
                        attributes: ['id', 'email'],
                        include: [{ 
                            model: Profile, 
                            as: 'profile',
                            attributes: this.profileAttributes
                        }],
                    },
                ],
            });
            formatted.applications = own ? [await this.formatApplication(own)] : [];
        }

        return formatted;
    }

    // ─── Landlord: list requests on his properties ────────────────────────

    async listLandlordRequests(landlordId: string): Promise<MaintenanceRequestResponse[]> {
        const rows = await MaintenanceRequest.findAll({
            where: { landlord_id: landlordId },
            include: this.getRequestIncludes({ withApplications: true }),
            order: [['created_at', 'DESC']],
        });
        return Promise.all(rows.map((r) => this.formatRequest(r, { includeApplications: true })));
    }

    // ─── Provider: list jobs / available / mine ───────────────────────────

    async listAvailableJobsForProvider(
        providerId: string,
        opts: { category?: string; search?: string } = {}
    ): Promise<MaintenanceRequestResponse[]> {
        // Provider's approved categories
        const app = await MaintenanceProviderApplication.findOne({
            where: { user_id: providerId, status: MaintenanceApplicationStatus.APPROVED },
        });
        if (!app) {
            throw new MaintenanceError(
                'Your maintenance provider account is not approved.',
                403,
                'PROVIDER_NOT_APPROVED'
            );
        }

        const where: any = { status: MaintenanceRequestStatus.OPEN };
        if (opts.category) where.category = opts.category;

        const rows = await MaintenanceRequest.findAll({
            where,
            include: this.getRequestIncludes(),
            order: [['created_at', 'DESC']],
        });

        // IMPORTANT:
        // Do not hard-block marketplace visibility by provider categories.
        // Providers should still see open jobs and decide whether to apply.
        // We only keep explicit user-applied filters (status/category/search).
        const filtered = rows.filter((r) => {
            const search = (opts.search ?? '').trim().toLowerCase();
            if (!search) return true;
            const hay = [
                r.category,
                r.title,
                r.description,
                ((r as any).property?.title as string | undefined) ?? '',
                ((r as any).property?.address as string | undefined) ?? '',
            ]
                .join(' ')
                .toLowerCase();
            return hay.includes(search);
        });

        // Mark which already have an application from this provider
        const myApps = await MaintenanceJobApplication.findAll({
            where: {
                provider_id: providerId,
                request_id: { [Op.in]: filtered.map((r) => r.id) },
            },
        });
        const appliedIds = new Set(myApps.map((a) => a.request_id));

        const formatted = await Promise.all(filtered.map((r) => this.formatRequest(r)));
        return formatted.map((f) => ({
            ...f,
            alreadyApplied: appliedIds.has(f.id),
        }));
    }

    async listProviderRequests(
        providerId: string,
        statusFilter?: MaintenanceRequestStatusType[]
    ): Promise<MaintenanceRequestResponse[]> {
        const where: any = { assigned_provider_id: providerId };
        if (statusFilter && statusFilter.length) where.status = { [Op.in]: statusFilter };
        const rows = await MaintenanceRequest.findAll({
            where,
            include: this.getRequestIncludes(),
            order: [['created_at', 'DESC']],
        });
        return Promise.all(rows.map((r) => this.formatRequest(r)));
    }

    async listMyApplications(
        providerId: string
    ): Promise<MaintenanceJobApplicationResponse[]> {
        const rows = await MaintenanceJobApplication.findAll({
            where: { provider_id: providerId },
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'email'],
                    include: [{ 
                        model: Profile, 
                        as: 'profile',
                        attributes: this.profileAttributes
                    }],
                },
                {
                    model: MaintenanceRequest,
                    as: 'request',
                    required: false,
                    include: [
                        {
                            model: User,
                            as: 'tenant',
                            attributes: ['id', 'email'],
                            include: [{ 
                                model: Profile, 
                                as: 'profile',
                                attributes: this.profileAttributes
                            }],
                        },
                        {
                            model: Property,
                            as: 'property',
                            attributes: ['id', 'landlord_id', 'title', 'address'],
                            include: [
                                { 
                                    model: PropertyImage, 
                                    as: 'images', 
                                    separate: true,
                                    attributes: ['id', 'property_id', 'image_url', 'is_main']
                                },
                                { 
                                    model: PropertyDetailedLocation, 
                                    as: 'detailedLocation',
                                    attributes: ['id', 'property_id', 'location_lat', 'location_long']
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        return Promise.all(rows.map((a) => this.formatApplication(a)));
    }

    // ─── Provider: apply to a job ─────────────────────────────────────────

    async applyToRequest(
        providerId: string,
        requestId: string,
        input: ProviderApplyInput
    ): Promise<MaintenanceJobApplicationResponse> {
        if (!Number.isFinite(input.finalPrice) || input.finalPrice <= 0) {
            throw new MaintenanceError('Final price must be greater than zero', 400, 'INVALID_PRICE');
        }

        const providerApp = await MaintenanceProviderApplication.findOne({
            where: { user_id: providerId, status: MaintenanceApplicationStatus.APPROVED },
        });
        if (!providerApp) {
            throw new MaintenanceError(
                'Your maintenance provider account is not approved.',
                403,
                'PROVIDER_NOT_APPROVED'
            );
        }

        const request = await MaintenanceRequest.findByPk(requestId);
        if (!request) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        if (request.status !== MaintenanceRequestStatus.OPEN) {
            throw new MaintenanceError(
                'This request is no longer open for applications.',
                400,
                'REQUEST_NOT_OPEN'
            );
        }

        const existing = await MaintenanceJobApplication.findOne({
            where: { request_id: requestId, provider_id: providerId },
        });
        if (existing) {
            throw new MaintenanceError(
                'You have already applied to this request.',
                400,
                'ALREADY_APPLIED'
            );
        }

        const created = await MaintenanceJobApplication.create({
            request_id: requestId,
            provider_id: providerId,
            final_price: input.finalPrice,
            price_breakdown: input.priceBreakdown ?? null,
            cover_note: input.coverNote ?? null,
            eta_hours: input.etaHours ?? null,
            status: MaintenanceJobApplicationStatus.PENDING,
        });

        // Notify tenant or landlord based on chargeParty
        const targetUserId = request.charge_party === 'LANDLORD' ? request.landlord_id : request.tenant_id;
        await notificationService.create({
            userId: targetUserId,
            type: NotifType.MAINTENANCE_NEW_APPLICATION,
            title: 'New application on your request',
            body: `A maintainer applied with a price of EGP ${Number(input.finalPrice).toFixed(2)}.`,
            relatedEntityType: 'MaintenanceRequest',
            relatedEntityId: requestId,
            data: { applicationId: created.id, finalPrice: input.finalPrice },
        });

        const reloaded = await MaintenanceJobApplication.findByPk(created.id, {
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'email'],
                    include: [{ model: Profile, as: 'profile' }],
                },
            ],
        });
        return this.formatApplication(reloaded as MaintenanceJobApplication);
    }

    async listApplicationsForTenant(
        userId: string,
        requestId: string
    ): Promise<MaintenanceJobApplicationResponse[]> {
        const request = await MaintenanceRequest.findByPk(requestId);
        if (!request) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        if (request.tenant_id !== userId && request.landlord_id !== userId) {
            throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        }
        const apps = await MaintenanceJobApplication.findAll({
            where: { request_id: requestId },
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'email'],
                    include: [{ model: Profile, as: 'profile' }],
                },
            ],
            order: [['created_at', 'ASC']],
        });
        return Promise.all(apps.map((a) => this.formatApplication(a)));
    }

    // ─── Tenant: accept a provider's application (escrow) ─────────────────

    async acceptApplication(
        userId: string,
        applicationId: string
    ): Promise<MaintenanceRequestResponse> {
        const tx = await sequelize.transaction();
        try {
            const application = await MaintenanceJobApplication.findByPk(applicationId, {
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });
            if (!application) throw new MaintenanceError('Application not found', 404, 'APPLICATION_NOT_FOUND');

            const request = await MaintenanceRequest.findByPk(application.request_id, {
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });
            if (!request) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');

            const isLandlordCharge = request.charge_party === 'LANDLORD';
            const expectedUser = isLandlordCharge ? request.landlord_id : request.tenant_id;
            if (userId !== expectedUser) {
                throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
            }

            if (request.status !== MaintenanceRequestStatus.OPEN) {
                throw new MaintenanceError(
                    'This request is no longer open.',
                    400,
                    'REQUEST_NOT_OPEN'
                );
            }
            if (application.status !== MaintenanceJobApplicationStatus.PENDING) {
                throw new MaintenanceError(
                    'This application is no longer pending.',
                    400,
                    'APPLICATION_NOT_PENDING'
                );
            }

            const price = toNumber(application.final_price);
            await this.debitWallet(expectedUser, price, tx);

            await request.update(
                {
                    status: MaintenanceRequestStatus.ASSIGNED,
                    assigned_provider_id: application.provider_id,
                    accepted_application_id: application.id,
                    agreed_price: price,
                    escrow_amount: price,
                },
                { transaction: tx }
            );

            await MaintenanceJobApplication.update(
                { status: MaintenanceJobApplicationStatus.ACCEPTED },
                { where: { id: application.id }, transaction: tx }
            );
            await MaintenanceJobApplication.update(
                { status: MaintenanceJobApplicationStatus.REJECTED },
                {
                    where: {
                        request_id: request.id,
                        id: { [Op.ne]: application.id },
                        status: MaintenanceJobApplicationStatus.PENDING,
                    },
                    transaction: tx,
                }
            );

            await tx.commit();

            await activityLogService.log({
                actor: { userId: expectedUser, role: isLandlordCharge ? 'LANDLORD' : 'TENANT' },
                action: 'MAINTENANCE_ESCROW_DEBIT',
                entityType: 'MAINTENANCE_REQUEST',
                entityId: request.id,
                description: `Maintenance escrow reserved for "${request.title}".`,
                metadata: {
                    requestId: request.id,
                    providerId: application.provider_id,
                    amount: price,
                },
            });

            // Notify accepted provider
            await notificationService.create({
                userId: application.provider_id,
                type: NotifType.MAINTENANCE_APPLICATION_ACCEPTED,
                title: 'Your application was accepted',
                body: `You have been assigned the "${request.category}" job.`,
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: request.id,
                data: { agreedPrice: price },
            });

            // Notify correct party
            if (isLandlordCharge) {
                await notificationService.create({
                    userId: request.tenant_id,
                    type: NotifType.MAINTENANCE_APPLICATION_ACCEPTED,
                    title: 'Landlord accepted a maintainer',
                    body: `Landlord accepted a "${request.category}" provider for ${Number(price).toFixed(2)} EGP.`,
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: request.id,
                });
            } else {
                await notificationService.create({
                    userId: request.landlord_id,
                    type: NotifType.MAINTENANCE_APPLICATION_ACCEPTED,
                    title: 'A maintainer was accepted',
                    body: `Tenant accepted a "${request.category}" provider for ${Number(price).toFixed(2)} EGP.`,
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: request.id,
                });
            }
            // Notify rejected providers
            const rejected = await MaintenanceJobApplication.findAll({
                where: {
                    request_id: request.id,
                    id: { [Op.ne]: application.id },
                    status: MaintenanceJobApplicationStatus.REJECTED,
                },
            });
            await notificationService.createMany(
                rejected.map((r) => ({
                    userId: r.provider_id,
                    type: NotifType.MAINTENANCE_APPLICATION_REJECTED,
                    title: 'Application not selected',
                    body: 'Another maintainer was chosen for this job.',
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: request.id,
                }))
            );

            const reloaded = await MaintenanceRequest.findByPk(request.id, {
                include: this.getRequestIncludes({ withApplications: true }),
            });
            const formatted = await this.formatRequest(reloaded as MaintenanceRequest, {
                includeApplications: true,
            });

            // Realtime broadcast for the request room
            try {
                const io = getIO();
                io.to(`maintenance_request:${request.id}`).emit('maintenance:status', {
                    requestId: request.id,
                    status: formatted.status,
                });
            } catch {}

            return formatted;
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    // ─── Provider: en route / arrived ─────────────────────────────────────

    async providerSetEnRoute(
        providerId: string,
        requestId: string
    ): Promise<MaintenanceRequestResponse> {
        const req = await MaintenanceRequest.findByPk(requestId);
        if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        if (req.assigned_provider_id !== providerId) throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        if (req.status !== MaintenanceRequestStatus.ASSIGNED && req.status !== MaintenanceRequestStatus.EN_ROUTE) {
            throw new MaintenanceError(
                'You can only mark en-route on an assigned request.',
                400,
                'INVALID_STATUS_TRANSITION'
            );
        }
        await req.update({
            status: MaintenanceRequestStatus.EN_ROUTE,
            en_route_started_at: req.en_route_started_at ?? testingClockService.getNow(),
        });
        await Promise.all([
            notificationService.create({
                userId: req.tenant_id,
                type: NotifType.MAINTENANCE_PROVIDER_EN_ROUTE,
                title: 'Maintainer is on the way',
                body: 'Your maintainer is heading to the property. You can track their location.',
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: req.id,
            }),
            notificationService.create({
                userId: req.landlord_id,
                type: NotifType.MAINTENANCE_PROVIDER_EN_ROUTE,
                title: 'Maintainer is en route',
                body: `Maintainer is on the way to your property for the "${req.category}" job.`,
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: req.id,
            }),
        ]);
        try {
            getIO()
                .to(`maintenance_request:${req.id}`)
                .emit('maintenance:status', { requestId: req.id, status: req.status });
        } catch {}
        const reloaded = await MaintenanceRequest.findByPk(req.id, {
            include: this.getRequestIncludes(),
        });
        return this.formatRequest(reloaded as MaintenanceRequest);
    }

    async providerArrived(
        providerId: string,
        requestId: string
    ): Promise<MaintenanceRequestResponse> {
        const req = await MaintenanceRequest.findByPk(requestId);
        if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        if (req.assigned_provider_id !== providerId) throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        if (req.status !== MaintenanceRequestStatus.EN_ROUTE && req.status !== MaintenanceRequestStatus.ASSIGNED) {
            throw new MaintenanceError(
                'You can only mark arrived after being assigned/en-route.',
                400,
                'INVALID_STATUS_TRANSITION'
            );
        }
        await req.update({
            status: MaintenanceRequestStatus.IN_PROGRESS,
            in_progress_started_at: testingClockService.getNow(),
        });
        await Promise.all([
            notificationService.create({
                userId: req.tenant_id,
                type: NotifType.MAINTENANCE_PROVIDER_ARRIVED,
                title: 'Maintainer arrived',
                body: 'Your maintainer has arrived and started the job.',
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: req.id,
            }),
            notificationService.create({
                userId: req.landlord_id,
                type: NotifType.MAINTENANCE_PROVIDER_ARRIVED,
                title: 'Maintainer started the job',
                body: `The maintainer arrived at your property for the "${req.category}" job.`,
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: req.id,
            }),
        ]);
        try {
            getIO()
                .to(`maintenance_request:${req.id}`)
                .emit('maintenance:status', { requestId: req.id, status: req.status });
        } catch {}
        const reloaded = await MaintenanceRequest.findByPk(req.id, {
            include: this.getRequestIncludes(),
        });
        return this.formatRequest(reloaded as MaintenanceRequest);
    }

    // ─── Live location updates ────────────────────────────────────────────

    async updateLocation(
        providerId: string,
        requestId: string,
        input: UpdateLocationInput
    ): Promise<MaintenanceLocationResponse> {
        const req = await MaintenanceRequest.findByPk(requestId);
        if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        if (req.assigned_provider_id !== providerId) throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        if (
            req.status !== MaintenanceRequestStatus.ASSIGNED &&
            req.status !== MaintenanceRequestStatus.EN_ROUTE &&
            req.status !== MaintenanceRequestStatus.IN_PROGRESS
        ) {
            throw new MaintenanceError(
                'Cannot update location for a closed request',
                400,
                'INVALID_STATUS'
            );
        }

        const now = testingClockService.getNow();
        const [row] = await MaintenanceLocation.upsert({
            request_id: requestId,
            provider_id: providerId,
            lat: input.lat,
            lng: input.lng,
            accuracy_m: input.accuracyM ?? null,
            heading: input.heading ?? null,
            speed: input.speed ?? null,
            reported_at: now,
        });

        const payload: MaintenanceLocationResponse = {
            lat: row.lat,
            lng: row.lng,
            reportedAt: row.reported_at,
            accuracyM: row.accuracy_m,
            heading: row.heading,
            speed: row.speed,
        };

        try {
            getIO()
                .to(`maintenance_request:${requestId}`)
                .emit('maintenance:location', { requestId, ...payload });
        } catch {}

        return payload;
    }

    async getCurrentLocation(
        requestId: string,
        currentUser: { userId: string; role: string }
    ): Promise<MaintenanceLocationResponse | null> {
        const req = await MaintenanceRequest.findByPk(requestId);
        if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        const isTenant = req.tenant_id === currentUser.userId;
        const isLandlord = req.landlord_id === currentUser.userId;
        const isProvider = req.assigned_provider_id === currentUser.userId;
        const isAdmin = currentUser.role === UserRole.ADMIN;
        if (!isTenant && !isLandlord && !isProvider && !isAdmin) {
            throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        }
        const row = await MaintenanceLocation.findOne({ where: { request_id: requestId } });
        if (!row) return null;
        return {
            lat: row.lat,
            lng: row.lng,
            reportedAt: row.reported_at,
            accuracyM: row.accuracy_m,
            heading: row.heading,
            speed: row.speed,
        };
    }

    // ─── Provider: mark complete ──────────────────────────────────────────

    async markProviderComplete(
        providerId: string,
        requestId: string,
        input: MarkProviderCompleteInput
    ): Promise<MaintenanceRequestResponse> {
        if (!input.completionImages || input.completionImages.length === 0) {
            throw new MaintenanceError(
                'You must upload at least one image of the resolved issue.',
                400,
                'COMPLETION_IMAGES_REQUIRED'
            );
        }

        const req = await MaintenanceRequest.findByPk(requestId);
        if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
        if (req.assigned_provider_id !== providerId) throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
        if (
            req.status !== MaintenanceRequestStatus.IN_PROGRESS &&
            req.status !== MaintenanceRequestStatus.EN_ROUTE &&
            req.status !== MaintenanceRequestStatus.ASSIGNED
        ) {
            throw new MaintenanceError(
                'Job cannot be completed in its current status.',
                400,
                'INVALID_STATUS_TRANSITION'
            );
        }

        await req.update({
            status: MaintenanceRequestStatus.AWAITING_CONFIRMATION,
            completion_notes: input.completionNotes?.trim() || null,
            completion_images: input.completionImages,
            provider_completed_at: testingClockService.getNow(),
        });

        await Promise.all([
            notificationService.create({
                userId: req.tenant_id,
                type: NotifType.MAINTENANCE_AWAITING_CONFIRMATION,
                title: 'Maintainer marked the job as complete',
                body: 'Please confirm whether the issue was solved.',
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: req.id,
                data: { force: true },
            }),
            notificationService.create({
                userId: req.landlord_id,
                type: NotifType.MAINTENANCE_AWAITING_CONFIRMATION,
                title: 'Maintainer marked the job as complete',
                body: `Awaiting tenant confirmation for the "${req.category}" job.`,
                relatedEntityType: 'MaintenanceRequest',
                relatedEntityId: req.id,
            }),
        ]);

        try {
            getIO()
                .to(`user:${req.tenant_id}`)
                .emit('maintenance:awaiting_confirmation', { requestId: req.id });
            getIO()
                .to(`maintenance_request:${req.id}`)
                .emit('maintenance:status', { requestId: req.id, status: req.status });
        } catch {}

        const reloaded = await MaintenanceRequest.findByPk(req.id, {
            include: this.getRequestIncludes(),
        });
        return this.formatRequest(reloaded as MaintenanceRequest);
    }

    // ─── Tenant: confirm completion (or dispute) ──────────────────────────

    async getAwaitingConfirmation(tenantId: string): Promise<MaintenanceRequestResponse | null> {
        const req = await MaintenanceRequest.findOne({
            where: {
                tenant_id: tenantId,
                status: MaintenanceRequestStatus.AWAITING_CONFIRMATION,
            },
            include: this.getRequestIncludes(),
            order: [['provider_completed_at', 'DESC']],
        });
        if (!req) return null;
        return this.formatRequest(req);
    }

    async confirmCompletion(
        tenantId: string,
        requestId: string,
        input: ConfirmCompletionInput
    ): Promise<MaintenanceRequestResponse> {
        const tx = await sequelize.transaction();
        try {
            const req = await MaintenanceRequest.findByPk(requestId, {
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });
            if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');
            if (req.tenant_id !== tenantId) throw new MaintenanceError('Forbidden', 403, 'FORBIDDEN');
            if (req.status !== MaintenanceRequestStatus.AWAITING_CONFIRMATION) {
                throw new MaintenanceError(
                    'There is nothing to confirm right now.',
                    400,
                    'NOT_AWAITING_CONFIRMATION'
                );
            }
            if (!req.assigned_provider_id) {
                throw new MaintenanceError('No provider assigned', 400, 'NO_PROVIDER');
            }

            const escrow = toNumber(req.escrow_amount);
            const agreed = toNumber(req.agreed_price);

            if (input.solved) {
                if (!input.rating || input.rating < 1 || input.rating > 5) {
                    throw new MaintenanceError(
                        'A rating from 1 to 5 is required.',
                        400,
                        'RATING_REQUIRED'
                    );
                }

                let payoutAmount = escrow;
                let payerDebitedNow = 0;
                if (payoutAmount <= 0 && agreed > 0) {
                    const payerId = req.charge_party === MaintenanceChargeParty.LANDLORD ? req.landlord_id : req.tenant_id;
                    await this.debitWallet(payerId, agreed, tx, 'INSUFFICIENT_WALLET_BALANCE');
                    payoutAmount = agreed;
                    payerDebitedNow = agreed;
                }
                if (payoutAmount > 0) {
                    await this.creditWallet(req.assigned_provider_id, payoutAmount, tx);
                }
                await req.update(
                    {
                        status: MaintenanceRequestStatus.COMPLETED,
                        escrow_amount: 0,
                        tenant_confirmed_at: testingClockService.getNow(),
                    },
                    { transaction: tx }
                );

                // Save rating (replace if any existed)
                await MaintenanceRating.destroy({
                    where: { request_id: req.id },
                    transaction: tx,
                });
                await MaintenanceRating.create(
                    {
                        request_id: req.id,
                        tenant_id: tenantId,
                        provider_id: req.assigned_provider_id,
                        rating: Math.round(input.rating),
                        comment: input.ratingComment?.trim() || null,
                    },
                    { transaction: tx }
                );

                // Landlord-charged maintenance: since landlord pays directly from wallet, we do not log a rent credit/charge.

                await tx.commit();

                if (payerDebitedNow > 0) {
                    const isLandlord = req.charge_party === MaintenanceChargeParty.LANDLORD;
                    await activityLogService.log({
                        actor: {
                            userId: isLandlord ? req.landlord_id : req.tenant_id,
                            role: isLandlord ? 'LANDLORD' : 'TENANT',
                        },
                        action: 'MAINTENANCE_DIRECT_SETTLEMENT_DEBIT',
                        entityType: 'MAINTENANCE_REQUEST',
                        entityId: req.id,
                        description: 'Maintenance settlement debited from wallet at completion confirmation.',
                        metadata: { requestId: req.id, amount: payerDebitedNow },
                    });
                }

                // Notifications
                await Promise.all([
                    notificationService.create({
                        userId: req.assigned_provider_id,
                        type: NotifType.MAINTENANCE_COMPLETED,
                        title: 'Job completed and paid',
                        body: `Tenant confirmed the "${req.category}" job. EGP ${payoutAmount.toFixed(2)} was added to your wallet.`,
                        relatedEntityType: 'MaintenanceRequest',
                        relatedEntityId: req.id,
                        data: { rating: Math.round(input.rating) },
                    }),
                    notificationService.create({
                        userId: req.assigned_provider_id,
                        type: NotifType.MAINTENANCE_RATED,
                        title: 'You received a new rating',
                        body: `You were rated ${Math.round(input.rating)} / 5.`,
                        relatedEntityType: 'MaintenanceRequest',
                        relatedEntityId: req.id,
                    }),
                    notificationService.create({
                        userId: req.landlord_id,
                        type: NotifType.MAINTENANCE_COMPLETED,
                        title: 'Maintenance completed on your property',
                        body: `The "${req.category}" job is confirmed complete.`,
                        relatedEntityType: 'MaintenanceRequest',
                        relatedEntityId: req.id,
                    }),
                ]);

                if (req.charge_party === MaintenanceChargeParty.LANDLORD) {
                    await notificationService.create({
                        userId: req.landlord_id,
                        type: NotifType.MAINTENANCE_LANDLORD_CHARGE,
                        title: 'Maintenance charge will reduce next rent',
                        body: `EGP ${payoutAmount.toFixed(2)} will be deducted from the tenant's next rent payment because this maintenance was your responsibility.`,
                        relatedEntityType: 'MaintenanceRequest',
                        relatedEntityId: req.id,
                        data: { amount: payoutAmount },
                    });
                }

                try {
                    getIO()
                        .to(`maintenance_request:${req.id}`)
                        .emit('maintenance:status', { requestId: req.id, status: 'COMPLETED' });
                } catch {}

                const reloaded = await MaintenanceRequest.findByPk(req.id, {
                    include: this.getRequestIncludes(),
                });
                return this.formatRequest(reloaded as MaintenanceRequest);
            }

            // Not solved → dispute
            if (!input.disputeReason || !input.disputeReason.trim()) {
                throw new MaintenanceError(
                    'Please describe the issue with the completion.',
                    400,
                    'DISPUTE_REASON_REQUIRED'
                );
            }

            await req.update(
                {
                    status: MaintenanceRequestStatus.DISPUTED,
                    disputed_at: testingClockService.getNow(),
                    disputed_reason: input.disputeReason.trim(),
                },
                { transaction: tx }
            );

            await MaintenanceConflict.destroy({
                where: { request_id: req.id },
                transaction: tx,
            });
            await MaintenanceConflict.create(
                {
                    request_id: req.id,
                    opened_by_tenant_id: tenantId,
                    provider_id: req.assigned_provider_id,
                    tenant_reason: input.disputeReason.trim(),
                    provider_completion_notes: req.completion_notes,
                    status: MaintenanceConflictStatus.OPEN,
                    resolution: null,
                    admin_notes: null,
                    resolved_by_admin_id: null,
                    resolved_at: null,
                },
                { transaction: tx }
            );

            await tx.commit();

            await Promise.all([
                notificationService.create({
                    userId: req.assigned_provider_id,
                    type: NotifType.MAINTENANCE_DISPUTED,
                    title: 'Tenant disputed your completion',
                    body: 'The case has been forwarded to HOMi support.',
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: req.id,
                }),
                notificationService.create({
                    userId: req.landlord_id,
                    type: NotifType.MAINTENANCE_DISPUTED,
                    title: 'Maintenance dispute on your property',
                    body: `The "${req.category}" job is in dispute. Admins will resolve.`,
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: req.id,
                }),
            ]);

            // Notify all admins
            const admins = await User.findAll({
                where: { role: UserRole.ADMIN, is_banned: false },
                attributes: ['id'],
            });
            await notificationService.createMany(
                admins.map((a) => ({
                    userId: a.id,
                    type: NotifType.MAINTENANCE_DISPUTED,
                    title: 'New maintenance conflict to review',
                    body: 'A tenant disputed a maintenance job. Please review.',
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: req.id,
                }))
            );

            try {
                getIO()
                    .to(`maintenance_request:${req.id}`)
                    .emit('maintenance:status', { requestId: req.id, status: 'DISPUTED' });
            } catch {}

            const reloaded = await MaintenanceRequest.findByPk(req.id, {
                include: this.getRequestIncludes(),
            });
            return this.formatRequest(reloaded as MaintenanceRequest);
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    // ─── Browse providers ─────────────────────────────────────────────────

    async listApprovedProviders(opts: {
        category?: string;
        type?: 'INDIVIDUAL' | 'CENTER';
        search?: string;
    } = {}): Promise<BrowseProviderItem[]> {
        const where: any = { status: MaintenanceApplicationStatus.APPROVED };
        if (opts.type) where.provider_type = opts.type;

        const apps = await MaintenanceProviderApplication.findAll({
            where,
            order: [['updated_at', 'DESC']],
        });

        const userIds = apps.map((a) => a.user_id);
        if (userIds.length === 0) return [];

        const [users, allRatings, completedJobs] = await Promise.all([
            User.findAll({
                where: { id: { [Op.in]: userIds }, is_banned: false },
                include: [{ model: Profile, as: 'profile' }],
            }),
            MaintenanceRating.findAll({
                where: { provider_id: { [Op.in]: userIds } },
            }),
            MaintenanceRequest.findAll({
                where: {
                    assigned_provider_id: { [Op.in]: userIds },
                    status: MaintenanceRequestStatus.COMPLETED,
                },
                attributes: ['assigned_provider_id'],
            }),
        ]);

        const ratingsByProvider = new Map<string, { sum: number; count: number }>();
        for (const r of allRatings) {
            const cur = ratingsByProvider.get(r.provider_id) ?? { sum: 0, count: 0 };
            cur.sum += r.rating;
            cur.count += 1;
            ratingsByProvider.set(r.provider_id, cur);
        }
        const completedByProvider = new Map<string, number>();
        for (const c of completedJobs) {
            const id = (c as any).assigned_provider_id as string;
            completedByProvider.set(id, (completedByProvider.get(id) ?? 0) + 1);
        }

        const usersById = new Map(users.map((u) => [u.id, u]));
        const filteredApps = apps.filter((a) => usersById.has(a.user_id));

        const result: BrowseProviderItem[] = [];
        for (const app of filteredApps) {
            const user = usersById.get(app.user_id);
            if (!user) continue;
            const profile = (user as any).profile as Profile | undefined;
            const categories = Array.isArray(app.categories) ? (app.categories as string[]) : [];
            const allCats = [app.category, ...categories.filter((c) => c !== app.category)];
            if (opts.category && !allCats.includes(opts.category)) continue;
            const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim().toLowerCase();
            const search = opts.search?.toLowerCase().trim();
            if (search) {
                const hayBusiness = (app.business_name ?? '').toLowerCase();
                if (
                    !fullName.includes(search) &&
                    !hayBusiness.includes(search) &&
                    !allCats.some((c) => c.toLowerCase().includes(search))
                ) continue;
            }
            const r = ratingsByProvider.get(user.id) ?? { sum: 0, count: 0 };
            result.push({
                id: user.id,
                firstName: profile?.first_name ?? 'User',
                lastName: profile?.last_name ?? '',
                avatarUrl: profile?.avatar_url ?? app.selfie_image ?? null,
                bio: profile?.bio ?? null,
                providerType: app.provider_type as 'INDIVIDUAL' | 'CENTER',
                businessName: app.business_name ?? null,
                primaryCategory: app.category,
                categories: allCats,
                companyLocation: app.company_location ?? null,
                rating: r.count ? Number((r.sum / r.count).toFixed(2)) : 0,
                ratingsCount: r.count,
                completedJobsCount: completedByProvider.get(user.id) ?? 0,
            });
        }

        return result;
    }

    // ─── Provider earnings ────────────────────────────────────────────────

    async getProviderEarnings(providerId: string): Promise<{
        walletBalance: number;
        totalEarned: number;
        completedJobs: number;
        activeJobs: number;
        avgRating: number;
        recentCompleted: MaintenanceRequestResponse[];
    }> {
        const profile = await Profile.findOne({
            where: { user_id: providerId },
            attributes: ['wallet_balance'],
        });
        const completedOrResolved = await MaintenanceRequest.findAll({
            where: {
                assigned_provider_id: providerId,
                status: {
                    [Op.in]: [
                        MaintenanceRequestStatus.COMPLETED,
                        MaintenanceRequestStatus.RESOLVED_BY_ADMIN,
                    ],
                },
            },
            include: this.getRequestIncludes(),
            order: [['tenant_confirmed_at', 'DESC']],
        });

        const payable = completedOrResolved.filter((r) => {
            if (r.status === MaintenanceRequestStatus.COMPLETED) return true;
            if (r.status !== MaintenanceRequestStatus.RESOLVED_BY_ADMIN) return false;
            const conflict = (r as any).conflict as MaintenanceConflict | undefined;
            return conflict?.resolution === MaintenanceConflictResolution.CHARGE_TENANT;
        });

        const totalEarned = payable.reduce(
            (sum, r) => sum + toNumber(r.agreed_price),
            0
        );
        const ratings = await MaintenanceRating.findAll({ where: { provider_id: providerId } });
        const avg = ratings.length
            ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
            : 0;
        const active = await MaintenanceRequest.count({
            where: {
                assigned_provider_id: providerId,
                status: {
                    [Op.in]: [
                        MaintenanceRequestStatus.ASSIGNED,
                        MaintenanceRequestStatus.EN_ROUTE,
                        MaintenanceRequestStatus.IN_PROGRESS,
                        MaintenanceRequestStatus.AWAITING_CONFIRMATION,
                    ],
                },
            },
        });
        const recent = await Promise.all(
            payable.slice(0, 8).map((r) => this.formatRequest(r))
        );
        return {
            walletBalance: toNumber((profile as any)?.wallet_balance),
            totalEarned: Number(totalEarned.toFixed(2)),
            completedJobs: payable.length,
            activeJobs: active,
            avgRating: Number(avg.toFixed(2)),
            recentCompleted: recent,
        };
    }

    // ─── Admin: conflicts ─────────────────────────────────────────────────

    async listOpenConflictsForAdmin(): Promise<
        Array<MaintenanceRequestResponse & { conflict: MaintenanceConflictResponse }>
    > {
        const conflicts = await MaintenanceConflict.findAll({
            where: { status: MaintenanceConflictStatus.OPEN },
            order: [['created_at', 'ASC']],
        });
        const requestIds = conflicts.map((c) => c.request_id);
        if (requestIds.length === 0) return [];
        const requests = await MaintenanceRequest.findAll({
            where: { id: { [Op.in]: requestIds } },
            include: this.getRequestIncludes(),
        });
        const formatted = await Promise.all(
            requests.map(async (r) => {
                const fr = await this.formatRequest(r);
                return { ...fr, conflict: fr.conflict! };
            })
        );
        return formatted as any;
    }

    async listAllConflictsForAdmin(): Promise<
        Array<MaintenanceRequestResponse & { conflict: MaintenanceConflictResponse }>
    > {
        const conflicts = await MaintenanceConflict.findAll({
            order: [['created_at', 'DESC']],
        });
        const requestIds = conflicts.map((c) => c.request_id);
        if (requestIds.length === 0) return [];
        const requests = await MaintenanceRequest.findAll({
            where: { id: { [Op.in]: requestIds } },
            include: this.getRequestIncludes(),
        });
        const sortedById = new Map(requests.map((r) => [r.id, r]));
        const sortedRequests = requestIds
            .map((id) => sortedById.get(id))
            .filter((r): r is MaintenanceRequest => !!r);
        const formatted = await Promise.all(
            sortedRequests.map(async (r) => {
                const fr = await this.formatRequest(r);
                return { ...fr, conflict: fr.conflict! };
            })
        );
        return formatted as any;
    }

    async resolveConflict(
        adminId: string,
        conflictId: string,
        input: AdminResolveConflictInput
    ): Promise<MaintenanceRequestResponse> {
        const tx = await sequelize.transaction();
        try {
            const conflict = await MaintenanceConflict.findByPk(conflictId, {
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });
            if (!conflict) throw new MaintenanceError('Conflict not found', 404, 'CONFLICT_NOT_FOUND');
            if (conflict.status !== MaintenanceConflictStatus.OPEN) {
                throw new MaintenanceError(
                    'This conflict is already resolved.',
                    400,
                    'CONFLICT_ALREADY_RESOLVED'
                );
            }
            const req = await MaintenanceRequest.findByPk(conflict.request_id, {
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });
            if (!req) throw new MaintenanceError('Request not found', 404, 'REQUEST_NOT_FOUND');

            const escrow = toNumber(req.escrow_amount);
            const agreed = toNumber(req.agreed_price);
            let payoutAmount = escrow;
            let tenantDebitedNow = 0;

            if (input.resolution === MaintenanceConflictResolution.CHARGE_TENANT) {
                // If landlord paid escrow originally, refund landlord and debit tenant to pay provider.
                if (req.charge_party === MaintenanceChargeParty.LANDLORD && escrow > 0) {
                    await this.creditWallet(req.landlord_id, escrow, tx);
                    await this.debitWallet(req.tenant_id, agreed, tx, 'INSUFFICIENT_WALLET_BALANCE');
                    payoutAmount = agreed;
                    tenantDebitedNow = agreed;
                } else if (payoutAmount <= 0 && agreed > 0) {
                    // Pay provider atomically; if escrow is missing, debit tenant now.
                    await this.debitWallet(req.tenant_id, agreed, tx, 'INSUFFICIENT_WALLET_BALANCE');
                    payoutAmount = agreed;
                    tenantDebitedNow = agreed;
                }
                if (payoutAmount > 0 && req.assigned_provider_id) {
                    await this.creditWallet(req.assigned_provider_id, payoutAmount, tx);
                }
                await req.update(
                    {
                        status: MaintenanceRequestStatus.RESOLVED_BY_ADMIN,
                        escrow_amount: 0,
                        resolved_at: testingClockService.getNow(),
                    },
                    { transaction: tx }
                );
            } else {
                // Refund the payer (landlord if originally landlord responsible, tenant otherwise), provider gets nothing
                if (escrow > 0) {
                    const refundeeId = req.charge_party === MaintenanceChargeParty.LANDLORD ? req.landlord_id : req.tenant_id;
                    await this.creditWallet(refundeeId, escrow, tx);
                }
                await req.update(
                    {
                        status: MaintenanceRequestStatus.RESOLVED_BY_ADMIN,
                        escrow_amount: 0,
                        resolved_at: testingClockService.getNow(),
                    },
                    { transaction: tx }
                );
            }

            await conflict.update(
                {
                    status: MaintenanceConflictStatus.RESOLVED,
                    resolution: input.resolution,
                    admin_notes: input.adminNotes?.trim() || null,
                    resolved_by_admin_id: adminId,
                    resolved_at: testingClockService.getNow(),
                },
                { transaction: tx }
            );

            await tx.commit();

            if (input.resolution === MaintenanceConflictResolution.CHARGE_TENANT) {
                await activityLogService.log({
                    actor: { userId: req.tenant_id, role: 'TENANT' },
                    action: 'MAINTENANCE_DISPUTE_CHARGED_TENANT',
                    entityType: 'MAINTENANCE_REQUEST',
                    entityId: req.id,
                    description: 'Admin resolved maintenance dispute in favour of provider.',
                    metadata: {
                        requestId: req.id,
                        amount: payoutAmount,
                        tenantDebitedNow,
                    },
                });
            } else if (escrow > 0) {
                await activityLogService.log({
                    actor: { userId: req.tenant_id, role: 'TENANT' },
                    action: 'MAINTENANCE_DISPUTE_REFUNDED_TENANT',
                    entityType: 'MAINTENANCE_REQUEST',
                    entityId: req.id,
                    description: 'Admin resolved maintenance dispute in favour of tenant (wallet refunded).',
                    metadata: { requestId: req.id, refundedAmount: escrow },
                });
            }

            const charged =
                input.resolution === MaintenanceConflictResolution.CHARGE_TENANT
                    ? 'tenant'
                    : 'provider';

            await Promise.all([
                notificationService.create({
                    userId: req.tenant_id,
                    type: NotifType.MAINTENANCE_CONFLICT_RESOLVED,
                    title: 'Maintenance dispute resolved',
                    body:
                        charged === 'tenant'
                            ? 'Admin ruled in favour of the maintainer. Your escrow was paid out.'
                            : 'Admin ruled in your favour. Your escrow was refunded to your wallet.',
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: req.id,
                }),
                req.assigned_provider_id
                    ? notificationService.create({
                        userId: req.assigned_provider_id,
                        type: NotifType.MAINTENANCE_CONFLICT_RESOLVED,
                        title: 'Maintenance dispute resolved',
                        body:
                            charged === 'provider'
                                ? 'Admin ruled in favour of the tenant. The escrow was refunded.'
                                : 'Admin ruled in your favour. The escrow was paid out to your wallet.',
                        relatedEntityType: 'MaintenanceRequest',
                        relatedEntityId: req.id,
                    })
                    : Promise.resolve(),
                notificationService.create({
                    userId: req.landlord_id,
                    type: NotifType.MAINTENANCE_CONFLICT_RESOLVED,
                    title: 'Maintenance dispute resolved',
                    body: `The "${req.category}" dispute on your property was resolved by an admin.`,
                    relatedEntityType: 'MaintenanceRequest',
                    relatedEntityId: req.id,
                }),
            ]);

            const reloaded = await MaintenanceRequest.findByPk(req.id, {
                include: this.getRequestIncludes(),
            });
            return this.formatRequest(reloaded as MaintenanceRequest);
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }
}

export const maintenanceService = new MaintenanceService();
export default maintenanceService;
