import { Op, Sequelize } from 'sequelize';
import { User } from '../../auth/models/User.js';
import { Property, PropertyStatus } from '../../properties/models/Property.js';
import { PropertyOwnershipDoc } from '../../properties/models/PropertyOwnershipDoc.js';
import { PropertyImage } from '../../properties/models/PropertyImage.js';
import { PropertySpecifications } from '../../properties/models/PropertySpecifications.js';
import { PropertyDetailedLocation } from '../../properties/models/PropertyDetailedLocation.js';
import { Amenity } from '../../properties/models/Amenity.js';
import { HouseRule } from '../../properties/models/HouseRule.js';
import { PropertyReport, PropertyReportStatus } from '../../properties/models/PropertyReport.js';
import { Contract, ContractStatus } from '../../contracts/models/Contract.js';
import { TenantReport, TenantReportStatus } from '../../contracts/models/TenantReport.js';
import { emailService } from '../../../shared/services/email.service.js';
import { Notification } from '../../notifications/models/Notification.js';
import { Profile } from '../../auth/models/Profile.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Conversation, Message } from '../../messages/models/index.js';
import { resolveSupportInboxAdminId } from '../../messages/services/support.service.js';
import { UserRole } from '../../auth/models/User.js';
import { propertyService } from '../../properties/services/property.service.js';
import { RentalRequest } from '../../rental-requests/models/RentalRequest.js';
import { activityLogService } from '../../../shared/services/activity-log.service.js';
import { MaintenanceProviderApplication, MaintenanceApplicationStatus, } from '../../maintenance/models/MaintenanceProviderApplication.js';
export class AdminError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = 'ADMIN_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AdminError';
    }
}
class AdminService {
    /**
     * Get dashboard stats
     */
    async getDashboardStats() {
        const [totalUsers, totalProperties, rentedProperties, activeContracts] = await Promise.all([
            User.count(),
            Property.count(),
            Property.count({ where: { status: PropertyStatus.RENTED } }),
            Contract.count({ where: { status: ContractStatus.ACTIVE } }),
        ]);
        return {
            totalUsers,
            totalProperties,
            rentedProperties,
            activeContracts,
        };
    }
    /**
     * Get pending properties with landlord and doc details
     */
    async getPendingProperties() {
        const properties = await Property.findAll({
            where: { status: PropertyStatus.PENDING_APPROVAL },
            include: [
                {
                    model: User,
                    as: 'landlord',
                    attributes: ['id', 'email'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'phone_number'],
                        },
                    ],
                },
                {
                    model: PropertyImage,
                    as: 'images',
                    attributes: [
                        'id',
                        'is_main',
                        [
                            Sequelize.literal(`CASE WHEN "images"."image_url" LIKE 'data:image%' THEN '/api/properties/images/' || "images"."id" ELSE "images"."image_url" END`),
                            'image_url'
                        ]
                    ],
                },
                {
                    model: PropertyOwnershipDoc,
                    as: 'ownershipDocs',
                    attributes: [
                        'id',
                        [
                            Sequelize.literal(`CASE WHEN "ownershipDocs"."document_url" LIKE 'data:%' THEN '/api/properties/documents/' || "ownershipDocs"."id" ELSE "ownershipDocs"."document_url" END`),
                            'document_url'
                        ]
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
            ],
            order: [['created_at', 'ASC']],
        });
        const formatted = properties.map((property) => ({
            thumbnailUrl: property.images?.find((img) => img.is_main)?.image_url ||
                property.images?.[0]?.image_url ||
                null,
            id: String(property.id),
            title: property.title,
            description: property.description,
            monthlyPrice: Number(property.monthly_price ?? 0),
            securityDeposit: Number(property.security_deposit ?? 0),
            address: property.address,
            type: property.type ?? '',
            furnishing: String(property.furnishing ?? ''),
            status: String(property.status),
            createdAt: property.created_at instanceof Date
                ? property.created_at
                : new Date(String(property.created_at)),
            landlord: property.landlord
                ? {
                    id: String(property.landlord.id),
                    email: property.landlord.email,
                    firstName: property.landlord.profile?.first_name,
                    lastName: property.landlord.profile?.last_name,
                    phone: property.landlord.profile?.phone_number,
                }
                : null,
            ownershipDocs: property.ownershipDocs?.map((doc) => ({
                id: String(doc.id),
                documentUrl: doc.document_url,
            })) || [],
            specifications: property.specifications
                ? {
                    bedrooms: property.specifications.bedrooms,
                    bathrooms: property.specifications.bathrooms,
                    areaSqft: Number(property.specifications.area_sqft),
                }
                : null,
            detailedLocation: property.detailedLocation
                ? {
                    floor: property.detailedLocation.floor,
                    city: property.detailedLocation.city,
                    area: property.detailedLocation.area,
                    streetName: property.detailedLocation.street_name,
                    buildingNumber: property.detailedLocation.building_number,
                    unitApt: property.detailedLocation.unit_apt,
                    locationLat: property.detailedLocation.location_lat,
                    locationLong: property.detailedLocation.location_long,
                }
                : null,
            images: property.images?.map((img) => ({
                id: String(img.id),
                imageUrl: img.image_url,
                isMain: img.is_main,
            })) || [],
            amenities: property.amenities?.map((a) => ({
                id: String(a.id),
                name: a.name,
            })) || [],
            houseRules: property.houseRules?.map((h) => ({
                id: String(h.id),
                name: h.name,
            })) || [],
            maintenanceResponsibilities: property.maintenance_responsibilities || [],
        }));
        return formatted;
    }
    /**
     * Verify property
     */
    async verifyProperty(propertyId, action, rejectionReason, adminId) {
        const property = await Property.findByPk(propertyId);
        if (!property) {
            throw new AdminError('Property not found', 404, 'PROPERTY_NOT_FOUND');
        }
        if (property.status !== PropertyStatus.PENDING_APPROVAL) {
            throw new AdminError('Property is not pending approval', 400, 'INVALID_STATUS');
        }
        if (action === 'APPROVE') {
            await property.update({ status: PropertyStatus.AVAILABLE, rejection_reason: null });
        }
        else if (action === 'REJECT') {
            await property.update({ status: PropertyStatus.REJECTED, rejection_reason: rejectionReason || 'Rejected by administration.' });
        }
        await activityLogService.log({
            actor: { userId: adminId || null, role: 'ADMIN' },
            action: action === 'APPROVE' ? 'ADMIN_PROPERTY_APPROVED' : 'ADMIN_PROPERTY_REJECTED',
            entityType: 'PROPERTY',
            entityId: property.id,
            description: action === 'APPROVE'
                ? `Admin approved property "${property.title}".`
                : `Admin rejected property "${property.title}".`,
            metadata: {
                propertyId: property.id,
                title: property.title,
                rejectionReason: rejectionReason || null,
            },
        });
        // Return updated property using standard format
        return propertyService.getPropertyById(propertyId);
    }
    async getListingReports() {
        const reports = await PropertyReport.findAll({
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address', 'monthly_price', 'landlord_id'],
                    include: [
                        {
                            model: PropertyImage,
                            as: 'images',
                            attributes: ['image_url', 'is_main'],
                        },
                        {
                            model: User,
                            as: 'landlord',
                            attributes: ['id', 'email'],
                            include: [
                                {
                                    model: Profile,
                                    as: 'profile',
                                    attributes: ['first_name', 'last_name'],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'email'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name'],
                        },
                    ],
                },
            ],
            order: [['created_at', 'DESC']],
        });
        return reports.map((report) => {
            const property = report.property;
            const mainImage = property?.images?.find((img) => img.is_main)?.image_url;
            const fallbackImage = property?.images?.[0]?.image_url ?? null;
            const snapshotLandlord = report.snapshot_landlord_name || report.snapshot_landlord_email
                ? {
                    id: property?.landlord?.id || 'deleted-landlord',
                    email: report.snapshot_landlord_email || property?.landlord?.email || 'unknown',
                    firstName: report.snapshot_landlord_name?.split(' ')?.[0] || property?.landlord?.profile?.first_name,
                    lastName: report.snapshot_landlord_name?.split(' ')?.slice(1).join(' ') || property?.landlord?.profile?.last_name,
                }
                : null;
            return {
                id: report.id,
                reason: report.reason,
                details: report.details,
                status: report.status,
                createdAt: report.created_at,
                property: {
                    id: property?.id || report.property_id,
                    title: report.snapshot_property_title || property?.title || 'Deleted listing',
                    address: report.snapshot_property_address || property?.address || 'Address unavailable',
                    monthlyPrice: Number(report.snapshot_property_monthly_price ?? property?.monthly_price ?? 0),
                    thumbnailUrl: report.snapshot_property_thumbnail_url || mainImage || fallbackImage,
                    landlord: snapshotLandlord || (property?.landlord
                        ? {
                            id: property.landlord.id,
                            email: property.landlord.email,
                            firstName: property.landlord.profile?.first_name,
                            lastName: property.landlord.profile?.last_name,
                        }
                        : null),
                },
                reporter: report.reporter
                    ? {
                        id: report.reporter.id,
                        email: report.reporter.email,
                        firstName: report.reporter.profile?.first_name,
                        lastName: report.reporter.profile?.last_name,
                    }
                    : null,
            };
        });
    }
    async removeListingFromReport(reportId, adminId) {
        const report = await PropertyReport.findByPk(reportId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: [
                        {
                            model: PropertyImage,
                            as: 'images',
                            attributes: ['image_url', 'is_main'],
                        },
                        {
                            model: User,
                            as: 'landlord',
                            attributes: ['id', 'email'],
                            include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name'] }],
                        },
                    ],
                },
            ],
        });
        if (!report || !report.property) {
            throw new AdminError('Report not found', 404, 'REPORT_NOT_FOUND');
        }
        const property = report.property;
        const propertyId = property.id;
        const images = property.images || [];
        const thumbnailUrl = images.find((img) => img.is_main)?.image_url || images[0]?.image_url || null;
        const landlord = property.landlord;
        const landlordName = landlord
            ? `${landlord.profile?.first_name || ''} ${landlord.profile?.last_name || ''}`.trim() || null
            : null;
        const linkedRentalRequests = await RentalRequest.count({ where: { property_id: propertyId } });
        const linkedContracts = await Contract.count({ where: { property_id: propertyId } });
        await property.destroy({ force: true });
        await PropertyReport.update({
            status: PropertyReportStatus.ACTIONED,
            snapshot_property_title: report.snapshot_property_title || property.title,
            snapshot_property_address: report.snapshot_property_address || property.address,
            snapshot_property_monthly_price: report.snapshot_property_monthly_price || Number(property.monthly_price ?? 0),
            snapshot_property_thumbnail_url: report.snapshot_property_thumbnail_url || thumbnailUrl,
            snapshot_landlord_name: report.snapshot_landlord_name || landlordName,
            snapshot_landlord_email: report.snapshot_landlord_email || landlord?.email || null,
            reviewed_by_admin_id: adminId,
            reviewed_at: new Date(),
        }, {
            where: { property_id: propertyId },
        });
        await activityLogService.log({
            actor: { userId: adminId, role: 'ADMIN' },
            action: 'ADMIN_REPORTED_LISTING_REMOVED',
            entityType: 'PROPERTY',
            entityId: propertyId,
            description: `Admin removed reported listing "${property.title}" and its dependent data.`,
            metadata: {
                reportId: report.id,
                propertyId,
                linkedRentalRequests,
                linkedContracts,
            },
        });
        return { reportId: report.id, propertyId };
    }
    async getActivityLogs(page = 1, limit = 50) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(200, Math.max(10, limit));
        const offset = (safePage - 1) * safeLimit;
        const { count, rows } = await ActivityLog.findAndCountAll({
            order: [['created_at', 'DESC']],
            limit: safeLimit,
            offset,
        });
        return {
            logs: rows.map((log) => ({
                id: log.id,
                actorUserId: log.actor_user_id,
                actorRole: log.actor_role,
                actorEmail: log.actor_email,
                action: log.action,
                entityType: log.entity_type,
                entityId: log.entity_id,
                description: log.description,
                metadata: log.metadata || null,
                createdAt: log.created_at,
            })),
            pagination: {
                total: count,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(count / safeLimit),
            },
        };
    }
    async getUserProfileForAdmin(userId) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'email', 'role', 'is_verified', 'email_verified', 'created_at'],
            include: [
                {
                    model: Profile,
                    as: 'profile',
                    attributes: [
                        'first_name',
                        'last_name',
                        'phone_number',
                        'avatar_url',
                        'bio',
                        'current_location',
                        'gender',
                        'birthdate',
                        'national_id',
                    ],
                },
            ],
        });
        if (!user) {
            throw new AdminError('User not found', 404, 'USER_NOT_FOUND');
        }
        if (user.role === 'ADMIN') {
            throw new AdminError('Profiles are available only for landlords and tenants', 400, 'UNSUPPORTED_ROLE');
        }
        const profile = user.profile;
        const includeSensitiveDetails = Boolean(user.is_verified);
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.is_verified,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
            profile: profile
                ? {
                    firstName: profile.first_name || null,
                    lastName: profile.last_name || null,
                    phoneNumber: profile.phone_number || null,
                    avatarUrl: profile.avatar_url || null,
                    bio: includeSensitiveDetails ? profile.bio || null : null,
                    currentLocation: includeSensitiveDetails ? profile.current_location || null : null,
                    gender: includeSensitiveDetails ? profile.gender || null : null,
                    birthdate: includeSensitiveDetails && profile.birthdate ? String(profile.birthdate) : null,
                    nationalId: includeSensitiveDetails ? profile.getDecryptedNationalId() : null,
                }
                : null,
        };
    }
    async getPropertyDetailsForAdmin(propertyId) {
        const property = await Property.findByPk(propertyId, {
            paranoid: false,
            attributes: ['id', 'title', 'description', 'status', 'address', 'monthly_price', 'landlord_id', 'deleted_at'],
            include: [
                {
                    model: User,
                    as: 'landlord',
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
        });
        if (!property) {
            return {
                id: propertyId,
                title: 'Property not found (removed or missing)',
                description: 'This property no longer exists in the main property records, but it is still referenced in activity logs.',
                status: 'REMOVED_OR_MISSING',
                address: 'Address unavailable',
                monthlyPrice: 0,
                landlordId: 'Unknown',
                deletedAt: null,
                landlord: null,
            };
        }
        return {
            id: property.id,
            title: property.title,
            description: property.description,
            status: property.status,
            address: property.address,
            monthlyPrice: Number(property.monthly_price ?? 0),
            landlordId: property.landlord_id,
            deletedAt: property.deleted_at ?? null,
            landlord: property.landlord
                ? {
                    id: property.landlord.id,
                    email: property.landlord.email,
                    firstName: property.landlord.profile?.first_name || null,
                    lastName: property.landlord.profile?.last_name || null,
                    avatarUrl: property.landlord.profile?.avatar_url || null,
                }
                : null,
        };
    }
    async getUsersForManagement() {
        const users = await User.findAll({
            where: {
                role: [UserRole.LANDLORD, UserRole.TENANT],
            },
            paranoid: false,
            include: [
                {
                    model: Profile,
                    as: 'profile',
                },
            ],
            order: [['created_at', 'DESC']],
        });
        const mappedUsers = users.map((user) => ({
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.is_verified,
            emailVerified: user.email_verified,
            resetTokenHash: user.reset_token_hash ?? null,
            resetTokenExpires: user.reset_token_expires ?? null,
            emailVerificationTokenHash: user.email_verification_token_hash ?? null,
            emailVerificationTokenExpires: user.email_verification_token_expires ?? null,
            isBanned: user.is_banned,
            banReason: user.ban_reason ?? null,
            banMessage: user.ban_message ?? null,
            banUntil: user.ban_until ?? null,
            bannedByAdminId: user.banned_by_admin_id ?? null,
            banCreatedAt: user.ban_created_at ?? null,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            deletedAt: user.deleted_at ?? null,
            profile: user.profile
                ? {
                    id: user.profile.id,
                    userId: user.profile.user_id,
                    firstName: user.profile.first_name,
                    lastName: user.profile.last_name,
                    phoneNumber: user.profile.phone_number,
                    bio: user.profile.bio ?? null,
                    avatarUrl: user.profile.avatar_url ?? null,
                    currentLocation: user.profile.current_location ?? null,
                    nationalIdEncrypted: user.profile.national_id ?? null,
                    nationalIdDecrypted: user.profile.getDecryptedNationalId(),
                    gender: user.profile.gender ?? null,
                    birthdate: user.profile.birthdate ? String(user.profile.birthdate) : null,
                    gamificationPoints: user.profile.gamification_points,
                    preferredBudgetMin: user.profile.preferred_budget_min !== null ? Number(user.profile.preferred_budget_min) : null,
                    preferredBudgetMax: user.profile.preferred_budget_max !== null ? Number(user.profile.preferred_budget_max) : null,
                    walletBalance: Number(user.profile.wallet_balance),
                    walletPendingOrderId: user.profile.wallet_pending_order_id ?? null,
                    walletPendingAmountCents: user.profile.wallet_pending_amount_cents ?? null,
                    walletPendingSaveCard: user.profile.wallet_pending_save_card,
                    createdAt: user.profile.created_at,
                    updatedAt: user.profile.updated_at,
                }
                : null,
        }));
        return {
            landlords: mappedUsers.filter((user) => user.role === UserRole.LANDLORD),
            tenants: mappedUsers.filter((user) => user.role === UserRole.TENANT),
        };
    }
    async getMaintainersForManagement() {
        const users = await User.findAll({
            where: {
                role: UserRole.MAINTENANCE_PROVIDER,
            },
            paranoid: false,
            include: [
                {
                    model: Profile,
                    as: 'profile',
                },
            ],
            order: [['created_at', 'DESC']],
        });
        const applications = await MaintenanceProviderApplication.findAll({
            where: {
                user_id: users.map((user) => user.id),
            },
            order: [['created_at', 'DESC']],
        });
        const applicationMap = new Map(applications.map((application) => [application.user_id, application]));
        const mappedUsers = users.map((user) => {
            const application = applicationMap.get(user.id);
            return {
                id: user.id,
                email: user.email,
                role: user.role,
                isVerified: user.is_verified,
                emailVerified: user.email_verified,
                resetTokenHash: user.reset_token_hash ?? null,
                resetTokenExpires: user.reset_token_expires ?? null,
                emailVerificationTokenHash: user.email_verification_token_hash ?? null,
                emailVerificationTokenExpires: user.email_verification_token_expires ?? null,
                isBanned: user.is_banned,
                banReason: user.ban_reason ?? null,
                banMessage: user.ban_message ?? null,
                banUntil: user.ban_until ?? null,
                bannedByAdminId: user.banned_by_admin_id ?? null,
                banCreatedAt: user.ban_created_at ?? null,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                deletedAt: user.deleted_at ?? null,
                profile: user.profile
                    ? {
                        id: user.profile.id,
                        userId: user.profile.user_id,
                        firstName: user.profile.first_name,
                        lastName: user.profile.last_name,
                        phoneNumber: user.profile.phone_number,
                        bio: user.profile.bio ?? null,
                        avatarUrl: user.profile.avatar_url ?? null,
                        currentLocation: user.profile.current_location ?? null,
                        nationalIdEncrypted: user.profile.national_id ?? null,
                        nationalIdDecrypted: user.profile.getDecryptedNationalId(),
                        gender: user.profile.gender ?? null,
                        birthdate: user.profile.birthdate ? String(user.profile.birthdate) : null,
                        gamificationPoints: user.profile.gamification_points,
                        preferredBudgetMin: user.profile.preferred_budget_min !== null ? Number(user.profile.preferred_budget_min) : null,
                        preferredBudgetMax: user.profile.preferred_budget_max !== null ? Number(user.profile.preferred_budget_max) : null,
                        walletBalance: Number(user.profile.wallet_balance),
                        walletPendingOrderId: user.profile.wallet_pending_order_id ?? null,
                        walletPendingAmountCents: user.profile.wallet_pending_amount_cents ?? null,
                        walletPendingSaveCard: user.profile.wallet_pending_save_card,
                        createdAt: user.profile.created_at,
                        updatedAt: user.profile.updated_at,
                    }
                    : null,
                providerType: application?.provider_type || null,
                applicationStatus: application?.status || null,
                applicationSubmittedAt: application?.created_at || null,
                reviewedAt: application?.reviewed_at || null,
                businessName: application?.business_name || null,
                category: application?.category || null,
                categories: application?.categories || null,
                numberOfEmployees: application?.number_of_employees || null,
                companyLocation: application?.company_location || null,
                notes: application?.notes || null,
            };
        });
        return {
            centers: mappedUsers.filter((user) => user.providerType === 'CENTER'),
            individuals: mappedUsers.filter((user) => user.providerType === 'INDIVIDUAL'),
        };
    }
    async banUserForAdmin(targetUserId, adminId, payload) {
        const user = await User.findByPk(targetUserId);
        if (!user) {
            throw new AdminError('User not found', 404, 'USER_NOT_FOUND');
        }
        if (user.role === UserRole.ADMIN) {
            throw new AdminError('Admin accounts cannot be banned', 400, 'INVALID_TARGET_ROLE');
        }
        await user.update({
            is_banned: true,
            ban_reason: payload.reason.trim(),
            ban_message: payload.message.trim(),
            ban_until: payload.banUntil ? new Date(payload.banUntil) : null,
            banned_by_admin_id: adminId,
            ban_created_at: new Date(),
        });
    }
    async unbanUserForAdmin(targetUserId) {
        const user = await User.findByPk(targetUserId);
        if (!user) {
            throw new AdminError('User not found', 404, 'USER_NOT_FOUND');
        }
        await user.update({
            is_banned: false,
            ban_reason: null,
            ban_message: null,
            ban_until: null,
            banned_by_admin_id: null,
            ban_created_at: null,
        });
    }
    /**
     * Help Center threads: one row per tenant/landlord who messaged the support inbox admin.
     */
    async getSupportInbox(query) {
        const inboxAdminId = await resolveSupportInboxAdminId();
        const conversations = await Conversation.findAll({
            where: {
                is_support: true,
                [Op.or]: [{ participant_one_id: inboxAdminId }, { participant_two_id: inboxAdminId }],
            },
            include: [
                {
                    model: User,
                    as: 'participantOne',
                    attributes: ['id', 'email', 'role'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
                },
                {
                    model: User,
                    as: 'participantTwo',
                    attributes: ['id', 'email', 'role'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url'] }],
                },
            ],
        });
        const rows = [];
        for (const conv of conversations) {
            const one = conv.participantOne;
            const two = conv.participantTwo;
            const endUser = one?.id === inboxAdminId ? two : one;
            if (!endUser) {
                continue;
            }
            const endProfile = endUser.profile;
            const unreadFromUser = await Message.count({
                where: {
                    conversation_id: conv.id,
                    sender_id: { [Op.ne]: inboxAdminId },
                    read_at: null,
                },
            });
            const lastMessage = await Message.findOne({
                where: { conversation_id: conv.id },
                order: [['created_at', 'DESC']],
            });
            rows.push({
                conversationId: conv.id,
                user: {
                    id: endUser.id,
                    email: endUser.email,
                    role: endUser.role,
                    firstName: endProfile?.first_name ?? 'User',
                    lastName: endProfile?.last_name ?? '',
                    avatarUrl: endProfile?.avatar_url ?? null,
                },
                lastMessagePreview: lastMessage?.body ?? null,
                lastMessageAt: conv.last_message_at ? new Date(conv.last_message_at).toISOString() : null,
                unreadFromUser,
            });
        }
        let filtered = rows;
        if (query.filter === 'unread') {
            filtered = rows.filter((r) => r.unreadFromUser > 0);
        }
        else if (query.filter === 'read') {
            filtered = rows.filter((r) => r.unreadFromUser === 0);
        }
        filtered.sort((a, b) => {
            const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            if (query.sort === 'oldest') {
                return ta - tb;
            }
            return tb - ta;
        });
        return filtered;
    }
    async getPendingMaintenanceApplications() {
        const applications = await MaintenanceProviderApplication.findAll({
            where: { status: MaintenanceApplicationStatus.PENDING },
            order: [['created_at', 'ASC']],
        });
        const userIds = applications.map((item) => item.user_id);
        const users = userIds.length > 0
            ? await User.findAll({
                where: { id: userIds },
                include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'phone_number'] }],
            })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u]));
        return applications.map((application) => {
            const user = userMap.get(application.user_id);
            return {
                id: application.id,
                userId: application.user_id,
                email: user?.email || '',
                firstName: user?.profile?.first_name || '',
                lastName: user?.profile?.last_name || '',
                phone: user?.profile?.phone_number || '',
                providerType: application.provider_type,
                businessName: application.business_name,
                category: application.category,
                categories: application.categories || null,
                criminalRecordDocument: application.criminal_record_document,
                selfieImage: application.selfie_image,
                nationalIdFront: application.national_id_front,
                nationalIdBack: application.national_id_back,
                numberOfEmployees: application.number_of_employees,
                companyLocation: application.company_location,
                documentationFiles: application.documentation_files || null,
                notes: application.notes,
                createdAt: application.created_at,
            };
        });
    }
    async reviewMaintenanceApplication(applicationId, action, rejectionReason, adminId) {
        const application = await MaintenanceProviderApplication.findByPk(applicationId);
        if (!application) {
            throw new AdminError('Maintenance request not found', 404, 'MAINTENANCE_REQUEST_NOT_FOUND');
        }
        if (application.status !== MaintenanceApplicationStatus.PENDING) {
            throw new AdminError('Maintenance request has already been reviewed', 400, 'MAINTENANCE_ALREADY_REVIEWED');
        }
        if (action === 'APPROVE') {
            await application.update({
                status: MaintenanceApplicationStatus.APPROVED,
                rejection_reason: null,
                reviewed_by_admin_id: adminId,
                reviewed_at: new Date(),
            });
            await User.update({ is_verified: true, email_verified: true }, { where: { id: application.user_id } });
            if (application.selfie_image) {
                await Profile.update({ avatar_url: application.selfie_image }, { where: { user_id: application.user_id } });
            }
            return;
        }
        await application.update({
            status: MaintenanceApplicationStatus.REJECTED,
            rejection_reason: rejectionReason || 'Rejected by admin',
            reviewed_by_admin_id: adminId,
            reviewed_at: new Date(),
        });
    }
    async getAllContracts() {
        const contracts = await Contract.findAll({
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address'],
                },
                {
                    model: User,
                    as: 'landlord',
                    attributes: ['id', 'email'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name'],
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
                            attributes: ['first_name', 'last_name'],
                        },
                    ],
                },
            ],
            order: [['created_at', 'DESC']],
        });
        return contracts.map((c) => ({
            id: c.id,
            contractId: c.contract_id,
            leaseId: c.lease_id,
            status: c.status,
            rentAmount: Number(c.rent_amount || 0),
            securityDeposit: Number(c.security_deposit || 0),
            moveInDate: c.move_in_date,
            leaseDurationMonths: c.lease_duration_months,
            paymentStatus: c.payment_status,
            createdAt: c.created_at,
            property: c.property ? {
                id: c.property.id,
                title: c.property.title,
                address: c.property.address,
            } : null,
            landlord: c.landlord ? {
                id: c.landlord.id,
                email: c.landlord.email,
                name: c.landlord.profile ? `${c.landlord.profile.first_name} ${c.landlord.profile.last_name}`.trim() : 'N/A',
            } : null,
            tenant: c.tenant ? {
                id: c.tenant.id,
                email: c.tenant.email,
                name: c.tenant.profile ? `${c.tenant.profile.first_name} ${c.tenant.profile.last_name}`.trim() : 'N/A',
            } : null,
        }));
    }
    async getAllPropertiesForAdmin() {
        const { PropertyImage } = await import('../../properties/models/PropertyImage.js');
        const properties = await Property.findAll({
            include: [
                {
                    model: User,
                    as: 'landlord',
                    attributes: ['id', 'email'],
                    include: [
                        {
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name'],
                        },
                    ],
                },
                {
                    model: PropertyImage,
                    as: 'images',
                    attributes: [
                        'id',
                        'is_main',
                        [
                            Sequelize.literal(`CASE WHEN "images"."image_url" LIKE 'data:image%' THEN '/api/properties/images/' || "images"."id" ELSE "images"."image_url" END`),
                            'image_url'
                        ]
                    ],
                },
            ],
            order: [['created_at', 'DESC']],
        });
        return properties.map((p) => {
            const mainImg = p.images?.find(img => img.is_main)?.image_url || p.images?.[0]?.image_url || null;
            return {
                id: p.id,
                title: p.title,
                address: p.address,
                monthlyPrice: Number(p.monthly_price),
                status: p.status,
                type: p.type,
                furnishing: p.furnishing,
                createdAt: p.created_at,
                thumbnailUrl: mainImg,
                landlord: p.landlord ? {
                    id: p.landlord.id,
                    email: p.landlord.email,
                    name: p.landlord.profile ? `${p.landlord.profile.first_name} ${p.landlord.profile.last_name}`.trim() : 'N/A',
                } : null,
            };
        });
    }
    async getTenantReports() {
        const { PropertyImage } = await import('../../properties/models/PropertyImage.js');
        const reports = await TenantReport.findAll({
            include: [
                {
                    model: Contract,
                    as: 'contract',
                    include: [
                        {
                            model: Property,
                            as: 'property',
                            attributes: ['id', 'title', 'address', 'monthly_price', 'type', 'status', 'furnishing', 'description', 'target_tenant', 'created_at'],
                            include: [
                                {
                                    model: PropertyImage,
                                    as: 'images',
                                    attributes: [
                                        'id',
                                        'is_main',
                                        [
                                            Sequelize.literal(`CASE WHEN "contract->property->images"."image_url" LIKE 'data:image%' THEN '/api/properties/images/' || "contract->property->images"."id" ELSE "contract->property->images"."image_url" END`),
                                            'image_url'
                                        ]
                                    ],
                                }
                            ]
                        }
                    ]
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'email'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url', 'phone_number', 'bio'] }],
                },
                {
                    model: User,
                    as: 'reportedTenant',
                    attributes: ['id', 'email'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url', 'phone_number', 'bio'] }],
                }
            ],
            order: [['created_at', 'DESC']]
        });
        return reports;
    }
    async warnTenantFromReport(reportId, adminId, messageText) {
        const report = await TenantReport.findByPk(reportId, {
            include: [{ model: User, as: 'reportedTenant' }]
        });
        if (!report)
            throw new AdminError('Report not found', 404);
        const tenant = report.reportedTenant;
        await Notification.create({
            user_id: tenant.id,
            title: 'Account Warning',
            body: `You have received an official warning regarding a tenancy report. Admin message: ${messageText}`,
            type: 'SYSTEM',
            is_read: false,
        });
        await emailService.sendTenantWarningEmail(tenant.email, messageText);
        await report.update({ status: TenantReportStatus.ACTIONED });
        await activityLogService.log({
            actor: { userId: adminId, role: 'ADMIN' },
            action: 'TENANT_WARNED',
            entityType: 'USER',
            entityId: tenant.id,
            description: `Admin sent warning to tenant ${tenant.email} for report ${reportId}.`,
        });
    }
    async banTenantFromReport(reportId, adminId, reason) {
        const report = await TenantReport.findByPk(reportId, {
            include: [{ model: User, as: 'reportedTenant' }]
        });
        if (!report)
            throw new AdminError('Report not found', 404);
        const tenant = report.reportedTenant;
        await this.banUserForAdmin(tenant.id, adminId, {
            banUntil: null,
            reason: 'Tenancy Violation',
            message: reason
        });
        await emailService.sendTenantBanEmail(tenant.email, reason);
        await report.update({ status: TenantReportStatus.ACTIONED });
        await activityLogService.log({
            actor: { userId: adminId, role: 'ADMIN' },
            action: 'TENANT_BANNED',
            entityType: 'USER',
            entityId: tenant.id,
            description: `Admin banned tenant ${tenant.email} based on report ${reportId}.`,
        });
    }
}
export const adminService = new AdminService();
export default adminService;
