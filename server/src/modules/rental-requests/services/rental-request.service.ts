import { Op, Sequelize } from 'sequelize';
import {
    RentalRequest,
    RentalRequestStatus,
    User,
    Property,
    Profile,
    Habit,
} from '../models/index.js';
import { PropertyStatus } from '../../properties/models/Property.js';
import type {
    CreateRentalRequestInput,
    UpdateRentalRequestStatusInput,
    RentalRequestResponse,
    RentalRequestListResponse,
} from '../interfaces/rental-request.interfaces.js';
import { PropertyImage } from '../../properties/models/PropertyImage.js';
import { PropertySpecifications } from '../../properties/models/PropertySpecifications.js';
import { activityLogService } from '../../../shared/services/activity-log.service.js';

/**
 * Custom error class for rental request errors
 */
export class RentalRequestError extends Error {
    constructor(
        message: string,
        public statusCode: number = 400,
        public code: string = 'RENTAL_REQUEST_ERROR'
    ) {
        super(message);
        this.name = 'RentalRequestError';
    }
}

/**
 * Rental Request Service
 * Handles all rental request business logic
 */
class RentalRequestService {
    /**
     * Create a new rental request (tenant only)
     */
    async createRentalRequest(
        tenantId: string,
        input: CreateRentalRequestInput
    ): Promise<RentalRequestResponse> {
        // Verify user is a tenant
        const user = await User.findByPk(tenantId);
        if (!user) {
            throw new RentalRequestError('User not found', 404, 'USER_NOT_FOUND');
        }
        if (user.role !== 'TENANT') {
            throw new RentalRequestError(
                'Only tenants can submit rental requests',
                403,
                'FORBIDDEN'
            );
        }

        // Verify property exists and is currently available for rental requests
        const property = await Property.findByPk(input.property_id);
        if (!property) {
            throw new RentalRequestError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        if (property.status !== PropertyStatus.AVAILABLE) {
            throw new RentalRequestError(
                'Rental requests can only be submitted for available properties',
                400,
                'PROPERTY_NOT_PUBLISHED'
            );
        }

        // Block ONLY when an in-flight (PENDING) request already exists for this
        // tenant/property pair. Historical APPROVED/DECLINED requests are kept
        // for audit but must NOT prevent the tenant from re-applying after a
        // contract has ended or a previous request was declined.
        const existingPendingRequest = await RentalRequest.findOne({
            where: {
                tenant_id: tenantId,
                property_id: input.property_id,
                status: RentalRequestStatus.PENDING,
            },
        });

        if (existingPendingRequest) {
            throw new RentalRequestError(
                'You already have a pending rental request for this property',
                409,
                'DUPLICATE_REQUEST'
            );
        }

        const rentalRequest = await RentalRequest.create({
            tenant_id: tenantId,
            property_id: input.property_id,
            move_in_date: new Date(input.move_in_date),
            duration: input.duration,
            occupants: input.occupants,
            living_situation: input.living_situation,
            message: input.message ?? null,
            status: RentalRequestStatus.PENDING,
        });

        await activityLogService.log({
            actor: { userId: tenantId, role: user.role, email: user.email },
            action: 'RENTAL_REQUEST_CREATED',
            entityType: 'RENTAL_REQUEST',
            entityId: rentalRequest.id,
            description: `Tenant submitted rental request for property ${input.property_id}.`,
            metadata: {
                propertyId: input.property_id,
                duration: input.duration,
                occupants: input.occupants,
            },
        });

        return this.formatRentalRequestResponse(rentalRequest);
    }

    /**
     * Get all rental requests for a landlord's properties (with tenant details)
     */
    async getLandlordRentalRequests(
        landlordId: string,
        filters: { status?: string; page?: number; limit?: number }
    ): Promise<RentalRequestListResponse> {
        // Verify user is a landlord
        const user = await User.findByPk(landlordId);
        if (!user) {
            throw new RentalRequestError('User not found', 404, 'USER_NOT_FOUND');
        }
        if (user.role !== 'LANDLORD') {
            throw new RentalRequestError(
                'Only landlords can view rental requests for their properties',
                403,
                'FORBIDDEN'
            );
        }

        const { status, page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;

        const where: any = {};
        if (status) where.status = status;

        // Get landlord's property IDs
        const landlordProperties = await Property.findAll({
            where: { landlord_id: landlordId },
            attributes: ['id'],
        });

        const propertyIds = landlordProperties.map((p) => p.id);

        if (propertyIds.length === 0) {
            return {
                rentalRequests: [],
                pagination: { total: 0, page, limit, totalPages: 0 },
            };
        }

        where.property_id = { [Op.in]: propertyIds };

        const { count, rows: requests } = await RentalRequest.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'tenant',
                    attributes: ['id', 'email'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'avatar_url', 'bio', 'tenant_rental_preferences', 'phone_number'],
                        },
                        {
                            model: Habit,
                            as: 'habits',
                            attributes: ['name'],
                        },
                    ],
                },
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address'],
                },
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        const formattedRequests = requests.map((req) =>
            this.formatRentalRequestResponse(req, true, true)
        );

        return {
            rentalRequests: formattedRequests,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Get all rental requests made by a tenant
     */
    async getTenantRentalRequests(
        tenantId: string,
        filters: { status?: string; page?: number; limit?: number }
    ): Promise<RentalRequestListResponse> {
        const { status, page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;

        const where: any = { tenant_id: tenantId };
        if (status) where.status = status;

        const { count, rows: requests } = await RentalRequest.findAndCountAll({
            where,
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address', 'monthly_price', 'security_deposit', 'landlord_id'],
                    include: [
                        {
                            model: User,
                            as: 'landlord',
                            attributes: ['id', 'is_verified'],
                            include: [
                                {
                                    model: Profile,
                                    as: 'profile',
                                    attributes: ['first_name', 'last_name', 'avatar_url']
                                }
                            ]
                        },
                        {
                            model: PropertyImage,
                            as: 'images',
                            attributes: [
                                'id',
                                'is_main',
                                [
                                    Sequelize.literal(`CASE WHEN "property->images"."image_url" LIKE 'data:image%' THEN '/api/properties/images/' || "property->images"."id" ELSE "property->images"."image_url" END`),
                                    'image_url'
                                ]
                            ]
                        },
                        {
                            model: PropertySpecifications,
                            as: 'specifications',
                            attributes: ['bedrooms', 'bathrooms', 'area_sqft']
                        }
                    ]
                },
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        const formattedRequests = requests.map((req) =>
            this.formatRentalRequestResponse(req, false, true)
        );

        return {
            rentalRequests: formattedRequests,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Get a single rental request by ID
     */
    async getRentalRequestById(
        requestId: string,
        userId: string
    ): Promise<RentalRequestResponse> {
        const request = await RentalRequest.findByPk(requestId, {
            include: [
                {
                    model: User,
                    as: 'tenant',
                    attributes: ['id'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'avatar_url', 'bio'],
                        },
                    ],
                },
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address', 'landlord_id'],
                },
            ],
        });

        if (!request) {
            throw new RentalRequestError('Rental request not found', 404, 'RENTAL_REQUEST_NOT_FOUND');
        }

        // Only the tenant who created it or the landlord who owns the property can view
        const isOwner = request.tenant_id === userId;
        const isLandlord = (request.property as any)?.landlord_id === userId;

        if (!isOwner && !isLandlord) {
            throw new RentalRequestError(
                'You do not have permission to view this rental request',
                403,
                'FORBIDDEN'
            );
        }

        return this.formatRentalRequestResponse(request, true, true);
    }

    /**
     * Update rental request status (landlord only — approve or decline)
     */
    async updateRentalRequestStatus(
        requestId: string,
        landlordId: string,
        input: UpdateRentalRequestStatusInput
    ): Promise<RentalRequestResponse> {
        const request = await RentalRequest.findByPk(requestId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address', 'landlord_id'],
                },
                {
                    model: User,
                    as: 'tenant',
                    attributes: ['id'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'avatar_url', 'bio'],
                        },
                    ],
                },
            ],
        });

        if (!request) {
            throw new RentalRequestError('Rental request not found', 404, 'RENTAL_REQUEST_NOT_FOUND');
        }

        // Verify the property belongs to this landlord
        if ((request.property as any)?.landlord_id !== landlordId) {
            throw new RentalRequestError(
                'You do not have permission to update this rental request',
                403,
                'FORBIDDEN'
            );
        }

        // Only PENDING requests can be updated
        if (request.status !== RentalRequestStatus.PENDING) {
            throw new RentalRequestError(
                `This rental request has already been ${request.status.toLowerCase()}`,
                400,
                'REQUEST_ALREADY_PROCESSED'
            );
        }

        await request.update({ status: input.status });
        const tenantEmail = request.tenant?.email || 'unknown-tenant-email';
        await activityLogService.log({
            actor: { userId: landlordId, role: 'LANDLORD' },
            action: input.status === RentalRequestStatus.APPROVED ? 'RENTAL_REQUEST_APPROVED' : 'RENTAL_REQUEST_DECLINED',
            entityType: 'RENTAL_REQUEST',
            entityId: request.id,
            description: `Landlord ${input.status === RentalRequestStatus.APPROVED ? 'approved' : 'declined'} rental request from ${tenantEmail}.`,
            metadata: {
                propertyId: request.property_id,
                tenantId: request.tenant_id,
                tenantEmail,
                status: input.status,
            },
        });

        // If approved, automatically create a contract
        if (input.status === RentalRequestStatus.APPROVED) {
            try {
                const { contractService } = await import('../../contracts/services/contract.service.js');
                await contractService.createContractFromApproval(requestId);
            } catch (contractError) {
                console.error('⚠️ Contract auto-creation failed:', contractError);
                // Don't fail the approval if contract creation fails
            }
        }

        return this.formatRentalRequestResponse(request, true, true);
    }

    /**
     * Cancel a tenant's own pending rental request
     */
    async cancelTenantRentalRequest(requestId: string, tenantId: string): Promise<void> {
        const request = await RentalRequest.findByPk(requestId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address'],
                },
            ],
        });

        if (!request) {
            throw new RentalRequestError('Rental request not found', 404, 'RENTAL_REQUEST_NOT_FOUND');
        }

        if (request.tenant_id !== tenantId) {
            throw new RentalRequestError(
                'You do not have permission to cancel this rental request',
                403,
                'FORBIDDEN'
            );
        }

        if (request.status !== RentalRequestStatus.PENDING) {
            throw new RentalRequestError(
                'Only pending rental requests can be cancelled',
                400,
                'REQUEST_NOT_PENDING'
            );
        }

        await request.destroy();
        await activityLogService.log({
            actor: { userId: tenantId, role: 'TENANT' },
            action: 'RENTAL_REQUEST_CANCELLED',
            entityType: 'RENTAL_REQUEST',
            entityId: request.id,
            description: 'Tenant cancelled pending rental request.',
            metadata: { propertyId: request.property_id },
        });
    }

    /**
     * Helper method to format rental request response
     */
    private formatRentalRequestResponse(
        request: RentalRequest,
        includeTenant: boolean = false,
        includeProperty: boolean = false
    ): RentalRequestResponse {
        const response: RentalRequestResponse = {
            id: request.id,
            tenantId: request.tenant_id,
            propertyId: request.property_id,
            moveInDate: request.move_in_date,
            duration: request.duration,
            occupants: request.occupants,
            livingSituation: request.living_situation,
            message: request.message,
            status: request.status,
            createdAt: request.created_at,
            updatedAt: request.updated_at,
        };

        if (includeTenant && request.tenant) {
            const profile = (request.tenant as any).profile;
            response.tenant = {
                id: request.tenant.id,
                firstName: profile?.first_name ?? '',
                lastName: profile?.last_name ?? '',
                avatarUrl: profile?.avatar_url ?? null,
                bio: profile?.bio ?? null,
                income: profile?.tenant_rental_preferences?.incomeRange || null,
                habits: (request.tenant as any)?.habits?.map((h: any) => h.name) ?? [],
                email: request.tenant.email,
                phoneNumber: profile?.phone_number ?? null,
                employment: profile?.tenant_rental_preferences?.employment ?? null,
                workplace: profile?.tenant_rental_preferences?.workplace ?? null,
            };
        }

        if (includeProperty && request.property) {
            response.property = {
                id: request.property.id,
                title: request.property.title,
                address: request.property.address,
                landlordId: (request.property as any).landlord_id,
                monthlyPrice: Number((request.property as any).monthly_price) || 0,
                securityDeposit: Number((request.property as any).security_deposit) || 0,
            };

            const images = (request.property as any).images;
            if (images) {
                response.property.images = images.map((img: any) => ({
                    imageUrl: img.image_url ?? img.imageUrl,
                    isMain: img.is_main ?? img.isMain
                }));
            }

            const pLandlord = (request.property as any).landlord;
            if (pLandlord?.profile) {
                response.property.landlord = {
                    firstName: pLandlord.profile.first_name ?? '',
                    lastName: pLandlord.profile.last_name ?? '',
                    avatarUrl: pLandlord.profile.avatar_url ?? null,
                    isVerified: Boolean(pLandlord.is_verified),
                };
            }

            const specs = (request.property as any).specifications;
            if (specs) {
                response.property.specifications = {
                    bedrooms: specs.bedrooms,
                    bathrooms: specs.bathrooms,
                    areaSqft: specs.area_sqft ?? 0
                };
            }
        }

        return response;
    }
}

// Export singleton instance
export const rentalRequestService = new RentalRequestService();
export default rentalRequestService;
