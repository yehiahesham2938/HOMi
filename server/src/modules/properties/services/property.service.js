import { Op, Sequelize } from 'sequelize';
import { Property, PropertyStatus, PropertyImage, Amenity, PropertySpecifications, PropertyDetailedLocation, HouseRule, PropertyOwnershipDoc, PropertyReport, PropertyReportReason, PropertyReportStatus, sequelize, VisitBooking, } from '../models/index.js';
import { User, UserRole } from '../../auth/models/User.js';
import { Profile } from '../../auth/models/Profile.js';
import { testingClockService } from '../../../shared/services/testing-clock.service.js';
import { notificationService, NotificationType } from '../../notifications/services/notification.service.js';
/**
 * Custom error class for property errors
 */
export class PropertyError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = 'PROPERTY_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'PropertyError';
    }
}
/**
 * Property Service
 * Handles all property business logic
 */
class PropertyService {
    lastAutoEnableTime = 0;
    async reportProperty(propertyId, reporterId, payload) {
        const property = await Property.findByPk(propertyId);
        if (!property) {
            throw new PropertyError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        if (property.status !== PropertyStatus.AVAILABLE) {
            throw new PropertyError('Only available listings can be reported', 400, 'INVALID_PROPERTY_STATUS');
        }
        if (property.landlord_id === reporterId) {
            throw new PropertyError('You cannot report your own listing', 400, 'SELF_REPORT_NOT_ALLOWED');
        }
        const validReasons = Object.values(PropertyReportReason);
        if (!validReasons.includes(payload.reason)) {
            throw new PropertyError('Invalid report reason', 400, 'INVALID_REPORT_REASON');
        }
        const details = payload.details.trim();
        if (details.length < 30) {
            throw new PropertyError('Please provide at least 30 characters describing the issue', 400, 'REPORT_DETAILS_TOO_SHORT');
        }
        const existingOpenReport = await PropertyReport.findOne({
            where: {
                property_id: propertyId,
                reporter_id: reporterId,
                status: PropertyReportStatus.OPEN,
            },
        });
        if (existingOpenReport) {
            throw new PropertyError('You already have an open report for this listing', 409, 'DUPLICATE_OPEN_REPORT');
        }
        const created = await PropertyReport.create({
            property_id: propertyId,
            reporter_id: reporterId,
            reason: payload.reason,
            details,
            status: PropertyReportStatus.OPEN,
        });
        return {
            id: created.id,
            status: created.status,
            message: 'Your report has been submitted and sent to admin moderation.',
        };
    }
    /**
     * Resolve amenity names → verified Amenity records.
     * Throws if any name does not exist in the database.
     */
    async resolveAmenityNames(names) {
        if (names.length === 0)
            return [];
        const found = await Amenity.findAll({ where: { name: names } });
        if (found.length !== names.length) {
            const foundNames = found.map((a) => a.name);
            const invalid = names.filter((n) => !foundNames.includes(n));
            throw new PropertyError(`Invalid amenity name(s): ${invalid.join(', ')}. Please select from the available list.`, 400, 'INVALID_AMENITY_NAMES');
        }
        return found;
    }
    /**
     * Resolve house rule names → verified HouseRule records.
     * Throws if any name does not exist in the database.
     */
    async resolveHouseRuleNames(names) {
        if (names.length === 0)
            return [];
        const found = await HouseRule.findAll({ where: { name: names } });
        if (found.length !== names.length) {
            const foundNames = found.map((h) => h.name);
            const invalid = names.filter((n) => !foundNames.includes(n));
            throw new PropertyError(`Invalid house rule name(s): ${invalid.join(', ')}. Please select from the available list.`, 400, 'INVALID_HOUSE_RULE_NAMES');
        }
        return found;
    }
    /**
     * Create a new property with images, specifications, detailed location, and optional amenities/house rules
     */
    async createProperty(landlordId, input) {
        const transaction = await sequelize.transaction();
        try {
            // Verify user exists and is a landlord
            const user = await User.findByPk(landlordId);
            if (!user) {
                throw new PropertyError('User not found', 404, 'USER_NOT_FOUND');
            }
            if (user.role !== 'LANDLORD') {
                throw new PropertyError('Only landlords can create properties', 403, 'FORBIDDEN');
            }
            // Resolve amenity names outside transaction so errors surface early
            const amenityNames = input.amenity_names ?? [];
            const amenities = await this.resolveAmenityNames(amenityNames);
            // Resolve house rule names outside transaction so errors surface early
            const houseRuleNames = input.house_rule_names ?? [];
            const houseRules = await this.resolveHouseRuleNames(houseRuleNames);
            // Create property
            const property = await Property.create({
                landlord_id: landlordId,
                title: input.title,
                description: input.description,
                monthly_price: input.monthly_price,
                security_deposit: input.security_deposit,
                address: input.address,
                type: input.type ?? null,
                furnishing: input.furnishing,
                target_tenant: input.target_tenant ?? 'ANY',
                availability_date: new Date(input.availability_date),
                maintenance_responsibilities: input.maintenance_responsibilities ?? [],
                status: 'PENDING_APPROVAL',
            }, { transaction });
            // Create specifications
            const specifications = await PropertySpecifications.create({
                property_id: property.id,
                bedrooms: input.specifications.bedrooms,
                bathrooms: input.specifications.bathrooms,
                area_sqft: input.specifications.area_sqft,
            }, { transaction });
            // Create detailed location
            const detailedLocation = await PropertyDetailedLocation.create({
                property_id: property.id,
                floor: input.detailed_location.floor,
                city: input.detailed_location.city,
                area: input.detailed_location.area,
                street_name: input.detailed_location.street_name,
                building_number: input.detailed_location.building_number,
                unit_apt: input.detailed_location.unit_apt,
                location_lat: input.detailed_location.location_lat,
                location_long: input.detailed_location.location_long,
            }, { transaction });
            // Create images
            const images = await PropertyImage.bulkCreate(input.images.map((img) => ({
                property_id: property.id,
                image_url: img.image_url,
                is_main: img.is_main,
            })), { transaction });
            // Create ownership docs
            const ownershipDocs = await PropertyOwnershipDoc.bulkCreate(input.ownership_documents.map((url) => ({
                property_id: property.id,
                document_url: url,
            })), { transaction });
            // Associate amenities (by their resolved IDs)
            if (amenities.length > 0) {
                await property.setAmenities(amenities.map((a) => a.id), { transaction });
            }
            // Associate house rules (by their resolved IDs)
            if (houseRules.length > 0) {
                await property.setHouseRules(houseRules.map((h) => h.id), { transaction });
            }
            await transaction.commit();
            return this.formatPropertyResponse(property, images, amenities, houseRules, specifications, detailedLocation, ownershipDocs);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    /**
     * Get all properties with optional filters, pagination, and amenities
     */
    async getAllProperties(filters) {
        // Automatically enable properties that were disabled until a chosen date which has now passed
        const nowTime = Date.now();
        if (nowTime - this.lastAutoEnableTime > 60000) {
            this.lastAutoEnableTime = nowTime;
            const now = testingClockService.getNow();
            await Property.update({ status: PropertyStatus.AVAILABLE }, {
                where: {
                    status: PropertyStatus.UNAVAILABLE,
                    availability_date: {
                        [Op.ne]: null,
                        [Op.lte]: now
                    }
                }
            });
        }
        const { status, type, furnishing, target_tenant, minPrice, maxPrice, landlordId, availabilityDate, lat, lng, radiusKm, page = 1, limit = 10, } = filters;
        const where = {};
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        if (furnishing)
            where.furnishing = furnishing;
        if (target_tenant) {
            where.target_tenant = {
                [Op.in]: [target_tenant, 'ANY']
            };
        }
        if (landlordId)
            where.landlord_id = landlordId;
        if (availabilityDate)
            where.availability_date = availabilityDate;
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.monthly_price = {};
            if (minPrice !== undefined)
                where.monthly_price[Op.gte] = minPrice;
            if (maxPrice !== undefined)
                where.monthly_price[Op.lte] = maxPrice;
        }
        let detailedLocationInclude = {
            model: PropertyDetailedLocation,
            as: 'detailedLocation',
        };
        if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
            const haversine = `(6371 * acos(cos(radians(${lat})) * cos(radians("detailedLocation"."location_lat")) * cos(radians("detailedLocation"."location_long") - radians(${lng})) + sin(radians(${lat})) * sin(radians("detailedLocation"."location_lat"))))`;
            detailedLocationInclude.where = Sequelize.where(Sequelize.literal(haversine), '<=', radiusKm);
            detailedLocationInclude.required = true;
        }
        const offset = (page - 1) * limit;
        const { count, rows: properties } = await Property.findAndCountAll({
            where,
            include: [
                {
                    model: PropertyImage,
                    as: 'images',
                    attributes: [
                        'id',
                        'property_id',
                        'is_main',
                        [
                            Sequelize.literal(`CASE WHEN "images"."image_url" LIKE 'data:image%' THEN '/api/properties/images/' || "images"."id" ELSE "images"."image_url" END`),
                            'image_url'
                        ]
                    ],
                },
                {
                    model: Amenity,
                    as: 'amenities',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                },
                {
                    model: HouseRule,
                    as: 'houseRules',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                },
                {
                    model: User,
                    as: 'landlord',
                    attributes: ['id', 'is_verified'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'avatar_url'],
                        },
                    ],
                },
                {
                    model: PropertySpecifications,
                    as: 'specifications',
                },
                {
                    model: PropertyOwnershipDoc,
                    as: 'ownershipDocs',
                    attributes: ['id', 'document_url'],
                },
                detailedLocationInclude,
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']],
            distinct: true,
        });
        const formattedProperties = properties.map((property) => this.formatPropertyResponse(property, property.images || [], property.amenities || [], property.houseRules || [], property.specifications ?? null, property.detailedLocation ?? null, property.ownershipDocs || []));
        return {
            properties: formattedProperties,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    }
    /**
     * Get a single property by ID (includes amenities, house rules, specifications, and detailed location)
     */
    async getPropertyById(id) {
        const property = await Property.findByPk(id, {
            include: [
                {
                    model: PropertyImage,
                    as: 'images',
                    attributes: [
                        'id',
                        'property_id',
                        'is_main',
                        [
                            Sequelize.literal(`CASE WHEN "images"."image_url" LIKE 'data:image%' THEN '/api/properties/images/' || "images"."id" ELSE "images"."image_url" END`),
                            'image_url'
                        ]
                    ],
                },
                {
                    model: Amenity,
                    as: 'amenities',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                },
                {
                    model: HouseRule,
                    as: 'houseRules',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                },
                {
                    model: User,
                    as: 'landlord',
                    attributes: ['id', 'is_verified'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'avatar_url'],
                        },
                    ],
                },
                {
                    model: PropertySpecifications,
                    as: 'specifications',
                },
                {
                    model: PropertyDetailedLocation,
                    as: 'detailedLocation',
                },
                {
                    model: PropertyOwnershipDoc,
                    as: 'ownershipDocs',
                    attributes: ['id', 'document_url'],
                },
            ],
        });
        if (!property) {
            throw new PropertyError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        return this.formatPropertyResponse(property, property.images || [], property.amenities || [], property.houseRules || [], property.specifications ?? null, property.detailedLocation ?? null, property.ownershipDocs || []);
    }
    /**
     * Update a property (including optional amenity/house-rule/specifications/detailed-location update)
     * Verifies ownership before updating
     */
    async updateProperty(id, landlordId, input) {
        const transaction = await sequelize.transaction();
        try {
            const property = await Property.findByPk(id, { transaction });
            if (!property) {
                throw new PropertyError('Property not found', 404, 'PROPERTY_NOT_FOUND');
            }
            if (property.landlord_id !== landlordId) {
                throw new PropertyError('You do not have permission to update this property', 403, 'FORBIDDEN');
            }
            if (property.status === PropertyStatus.PENDING_APPROVAL) {
                throw new PropertyError('Pending-approval properties are locked until admin approves or rejects them.', 403, 'PROPERTY_LOCKED');
            }
            if (property.status === PropertyStatus.REJECTED) {
                throw new PropertyError('Rejected properties cannot be edited by landlords.', 403, 'PROPERTY_LOCKED');
            }
            // Update property fields
            const updateData = {};
            if (input.title !== undefined)
                updateData.title = input.title;
            if (input.description !== undefined)
                updateData.description = input.description;
            if (input.monthly_price !== undefined)
                updateData.monthly_price = input.monthly_price;
            if (input.security_deposit !== undefined)
                updateData.security_deposit = input.security_deposit;
            if (input.address !== undefined)
                updateData.address = input.address;
            if (input.type !== undefined)
                updateData.type = input.type;
            if (input.furnishing !== undefined)
                updateData.furnishing = input.furnishing;
            if (input.status !== undefined) {
                if (input.status !== PropertyStatus.DRAFT && input.status !== PropertyStatus.AVAILABLE && input.status !== PropertyStatus.UNAVAILABLE) {
                    throw new PropertyError('Landlords can only set status to DRAFT, AVAILABLE, or UNAVAILABLE.', 400, 'INVALID_STATUS_TRANSITION');
                }
                updateData.status = input.status;
            }
            if (input.target_tenant !== undefined)
                updateData.target_tenant = input.target_tenant;
            if (input.availability_date !== undefined)
                updateData.availability_date = input.availability_date ? new Date(input.availability_date) : null;
            if (input.maintenance_responsibilities !== undefined)
                updateData.maintenance_responsibilities = input.maintenance_responsibilities;
            await property.update(updateData, { transaction });
            // Update specifications if provided (partial upsert)
            let specifications = null;
            if (input.specifications !== undefined) {
                const [spec] = await PropertySpecifications.findOrCreate({
                    where: { property_id: id },
                    defaults: {
                        property_id: id,
                        bedrooms: 0,
                        bathrooms: 0,
                        area_sqft: 0,
                    },
                    transaction,
                });
                await spec.update(input.specifications, { transaction });
                specifications = spec;
            }
            else {
                specifications = await PropertySpecifications.findOne({
                    where: { property_id: id },
                    transaction,
                });
            }
            // Update detailed location if provided (partial upsert)
            let detailedLocation = null;
            if (input.detailed_location !== undefined) {
                const [loc] = await PropertyDetailedLocation.findOrCreate({
                    where: { property_id: id },
                    defaults: {
                        property_id: id,
                        floor: 0,
                        city: '',
                        area: '',
                        street_name: '',
                        building_number: '',
                        unit_apt: '',
                        location_lat: 0,
                        location_long: 0,
                    },
                    transaction,
                });
                await loc.update(input.detailed_location, { transaction });
                detailedLocation = loc;
            }
            else {
                detailedLocation = await PropertyDetailedLocation.findOne({
                    where: { property_id: id },
                    transaction,
                });
            }
            // Update images if provided
            let images = property.images || [];
            if (input.images !== undefined) {
                await PropertyImage.destroy({ where: { property_id: id }, transaction });
                images = await PropertyImage.bulkCreate(input.images.map((img) => ({
                    property_id: id,
                    image_url: img.image_url,
                    is_main: img.is_main,
                })), { transaction });
            }
            else {
                images = await PropertyImage.findAll({ where: { property_id: id }, transaction });
            }
            // Update ownership docs if provided
            let ownershipDocs = await PropertyOwnershipDoc.findAll({ where: { property_id: id }, transaction });
            if (input.ownership_documents !== undefined) {
                await PropertyOwnershipDoc.destroy({ where: { property_id: id }, transaction });
                ownershipDocs = await PropertyOwnershipDoc.bulkCreate(input.ownership_documents.map((url) => ({
                    property_id: id,
                    document_url: url,
                })), { transaction });
            }
            // Update amenities if provided (by name — replace strategy)
            let amenities = [];
            if (input.amenity_names !== undefined) {
                amenities = await this.resolveAmenityNames(input.amenity_names);
                await property.setAmenities(amenities.map((a) => a.id), { transaction });
            }
            else {
                amenities = await property.getAmenities({ transaction });
            }
            // Update house rules if provided (by name — replace strategy)
            let houseRules = [];
            if (input.house_rule_names !== undefined) {
                houseRules = await this.resolveHouseRuleNames(input.house_rule_names);
                await property.setHouseRules(houseRules.map((h) => h.id), { transaction });
            }
            else {
                houseRules = await property.getHouseRules({ transaction });
            }
            await transaction.commit();
            return this.formatPropertyResponse(property, images, amenities, houseRules, specifications, detailedLocation, ownershipDocs);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    /**
     * Delete a property (soft delete)
     */
    async deleteProperty(id, landlordId) {
        const property = await Property.findByPk(id);
        if (!property) {
            throw new PropertyError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        if (property.landlord_id !== landlordId) {
            throw new PropertyError('You do not have permission to delete this property', 403, 'FORBIDDEN');
        }
        await property.destroy();
        return { success: true, message: 'Property deleted successfully' };
    }
    /**
     * Public card for a landlord (tenants / guests). No email or sensitive fields.
     */
    async getPublicLandlordProfile(landlordId) {
        const user = await User.findByPk(landlordId, {
            attributes: ['id', 'role', 'is_verified'],
            include: [
                {
                    model: Profile,
                    as: 'profile',
                    attributes: ['first_name', 'last_name', 'avatar_url'],
                },
            ],
        });
        if (!user || user.role !== UserRole.LANDLORD) {
            throw new PropertyError('Landlord not found', 404, 'LANDLORD_NOT_FOUND');
        }
        const profile = user.profile;
        if (!profile) {
            throw new PropertyError('Landlord not found', 404, 'LANDLORD_NOT_FOUND');
        }
        return {
            id: user.id,
            firstName: profile.first_name ?? '',
            lastName: profile.last_name ?? '',
            avatarUrl: profile.avatar_url ?? null,
            isVerified: Boolean(user.is_verified),
        };
    }
    /**
     * Helper method to format property response
     */
    formatPropertyResponse(property, images, amenities = [], houseRules = [], spec = null, loc = null, docs = []) {
        const formattedImages = images.map((img) => ({
            id: img.id,
            propertyId: img.property_id,
            imageUrl: img.image_url,
            isMain: img.is_main,
        }));
        const formattedAmenities = amenities.map((a) => ({
            id: a.id,
            name: a.name,
        }));
        const formattedHouseRules = houseRules.map((h) => ({
            id: h.id,
            name: h.name,
        }));
        const formattedSpec = spec
            ? {
                id: spec.id,
                bedrooms: spec.bedrooms,
                bathrooms: spec.bathrooms,
                areaSqft: Number(spec.area_sqft),
            }
            : null;
        const formattedLocation = loc
            ? {
                id: loc.id,
                floor: loc.floor,
                city: loc.city,
                area: loc.area,
                streetName: loc.street_name,
                buildingNumber: loc.building_number,
                unitApt: loc.unit_apt,
                locationLat: loc.location_lat,
                locationLong: loc.location_long,
            }
            : null;
        const landlordProfile = property.landlord?.profile;
        const landlordUser = property.landlord;
        const formattedLandlord = landlordProfile
            ? {
                id: property.landlord_id,
                firstName: landlordProfile.first_name,
                lastName: landlordProfile.last_name,
                avatarUrl: landlordProfile.avatar_url ?? null,
                isVerified: Boolean(landlordUser?.is_verified),
            }
            : null;
        return {
            id: property.id,
            landlordId: property.landlord_id,
            title: property.title,
            description: property.description,
            monthlyPrice: Number(property.monthly_price),
            securityDeposit: Number(property.security_deposit),
            address: property.address,
            type: property.type ?? null,
            furnishing: property.furnishing,
            status: property.status,
            targetTenant: property.target_tenant ?? 'ANY',
            availabilityDate: property.availability_date,
            createdAt: property.created_at,
            images: formattedImages,
            amenities: formattedAmenities,
            houseRules: formattedHouseRules,
            maintenanceResponsibilities: (property.maintenance_responsibilities ?? []).map((item) => ({
                area: item.area,
                responsible_party: item.responsible_party,
            })),
            specifications: formattedSpec,
            detailedLocation: formattedLocation,
            landlord: formattedLandlord,
            rejectionReason: property.rejection_reason ?? null,
            ownershipDocs: docs.map((d) => ({
                id: d.id,
                documentUrl: d.document_url,
            })),
        };
    }
    /**
     * Book a visit viewing for a property (tenant only)
     */
    async bookVisit(propertyId, tenantId, visitDateStr) {
        const property = await Property.findByPk(propertyId, {
            include: [
                {
                    model: User,
                    as: 'landlord',
                    include: [{ model: Profile, as: 'profile' }],
                }
            ]
        });
        if (!property) {
            throw new PropertyError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        // Verify tenant exists
        const tenant = await User.findByPk(tenantId, {
            include: [{ model: Profile, as: 'profile' }],
        });
        if (!tenant) {
            throw new PropertyError('Tenant not found', 404, 'TENANT_NOT_FOUND');
        }
        // Check for existing pending/accepted visit request
        const existing = await VisitBooking.findOne({
            where: {
                property_id: propertyId,
                tenant_id: tenantId,
                status: {
                    [Op.in]: ['PENDING', 'ACCEPTED'],
                },
            },
        });
        if (existing) {
            throw new PropertyError('You already have an active or scheduled visit booking for this property', 400, 'DUPLICATE_ACTIVE_BOOKING');
        }
        const visitDate = new Date(visitDateStr);
        if (Number.isNaN(visitDate.getTime())) {
            throw new PropertyError('Invalid visit date', 400, 'INVALID_VISIT_DATE');
        }
        // Create visit booking
        const booking = await VisitBooking.create({
            property_id: propertyId,
            tenant_id: tenantId,
            visit_date: visitDate,
            status: 'PENDING',
        });
        // Send notification to the landlord
        const tenantName = tenant.profile
            ? `${tenant.profile.first_name} ${tenant.profile.last_name}`.trim()
            : 'A tenant';
        await notificationService.create({
            userId: property.landlord_id,
            type: NotificationType.VISIT_REQUEST_RECEIVED,
            title: 'New Visit Request',
            body: `${tenantName} requested to visit "${property.title}" on ${visitDate.toLocaleString('en-US')}.`,
            relatedEntityType: 'Property',
            relatedEntityId: propertyId,
            data: {
                visitId: booking.id,
                visitDate: booking.visit_date,
            },
        });
        return booking;
    }
    /**
     * Get active visit booking (PENDING/ACCEPTED) for a tenant on a property
     */
    async getMyVisit(propertyId, tenantId) {
        const booking = await VisitBooking.findOne({
            where: {
                property_id: propertyId,
                tenant_id: tenantId,
                status: {
                    [Op.in]: ['PENDING', 'ACCEPTED'],
                },
            },
        });
        return booking;
    }
    /**
     * Get all visit requests for a property (landlord only)
     */
    async getPropertyVisits(propertyId, landlordId) {
        const property = await Property.findByPk(propertyId);
        if (!property) {
            throw new PropertyError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        if (property.landlord_id !== landlordId) {
            throw new PropertyError('You do not have permission to view visits for this property', 403, 'FORBIDDEN');
        }
        const bookings = await VisitBooking.findAll({
            where: { property_id: propertyId },
            include: [
                {
                    model: User,
                    as: 'tenant',
                    attributes: ['id', 'email'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'avatar_url'],
                        },
                    ],
                },
            ],
            order: [['visit_date', 'ASC']],
        });
        return bookings;
    }
    /**
     * Update status of a visit request (landlord only: ACCEPTED/DECLINED)
     */
    async updateVisitStatus(propertyId, visitId, landlordId, status) {
        const property = await Property.findByPk(propertyId);
        if (!property) {
            throw new PropertyError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        if (property.landlord_id !== landlordId) {
            throw new PropertyError('You do not have permission to manage visits for this property', 403, 'FORBIDDEN');
        }
        const booking = await VisitBooking.findOne({
            where: { id: visitId, property_id: propertyId },
        });
        if (!booking) {
            throw new PropertyError('Visit booking not found', 404, 'VISIT_NOT_FOUND');
        }
        if (booking.status !== 'PENDING') {
            throw new PropertyError('You can only update pending visit requests', 400, 'INVALID_VISIT_STATUS');
        }
        // Update booking status
        await booking.update({ status });
        // Notify tenant
        const notificationType = status === 'ACCEPTED'
            ? NotificationType.VISIT_REQUEST_ACCEPTED
            : NotificationType.VISIT_REQUEST_DECLINED;
        const title = status === 'ACCEPTED' ? 'Visit Request Accepted!' : 'Visit Request Declined';
        const body = status === 'ACCEPTED'
            ? `Your request to visit "${property.title}" has been accepted! Scheduled for ${booking.visit_date.toLocaleString('en-US')}.`
            : `Your request to visit "${property.title}" was declined by the landlord.`;
        await notificationService.create({
            userId: booking.tenant_id,
            type: notificationType,
            title,
            body,
            relatedEntityType: 'Property',
            relatedEntityId: propertyId,
            data: {
                visitId: booking.id,
                status: booking.status,
            },
        });
        return booking;
    }
}
// Export singleton instance
export const propertyService = new PropertyService();
export default propertyService;
