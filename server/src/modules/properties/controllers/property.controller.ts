import type { Request, Response, NextFunction } from 'express';
import { propertyService, PropertyError } from '../services/property.service.js';
import { cacheService } from '../../../shared/services/cache.service.js';
import type {
    CreatePropertyRequest,
    UpdatePropertyRequest,
    PropertyQuery,
} from '../interfaces/property.interfaces.js';

/**
 * Property Controller
 * Handles HTTP request/response for property endpoints
 */
class PropertyController {
    private async invalidatePropertyListCache(): Promise<void> {
        await cacheService.deleteByPattern('properties:list:*');
    }

    /**
     * POST /api/properties
     * Create a new property
     * Requires authentication (LANDLORD only)
     */
    async createProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const landlordId = (req as any).user.userId;
            const input: CreatePropertyRequest = req.body;

            const property = await propertyService.createProperty(landlordId, input);
            await this.invalidatePropertyListCache();

            res.status(201).json({
                success: true,
                message: 'Property created successfully. It is currently under review.',
                data: property,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/properties
     * Get all properties with optional filters
     * Public endpoint
     */
    async getAllProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Get validated query from middleware (fallback to req.query for safety)
            const filters: PropertyQuery = (req as any).validatedQuery || req.query;

            const result = await propertyService.getAllProperties(filters);

            res.status(200).json({
                success: true,
                data: result.properties,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/properties/landlords/:landlordId/public-profile
     * Public landlord card (name, avatar, verification). Listed separately from listings.
     */
    async getPublicLandlordProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { landlordId } = req.params;
            const data = await propertyService.getPublicLandlordProfile(landlordId as string);
            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/properties/:id
     * Get a single property by ID
     * Public endpoint
     */
    async getPropertyById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const property = await propertyService.getPropertyById(id as string);

            res.status(200).json({
                success: true,
                data: property,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/properties/:id
     * Update a property
     * Requires authentication (owner only)
     */
    async updateProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user.userId;
            const input: UpdatePropertyRequest = req.body;

            const property = await propertyService.updateProperty(id as string, landlordId, input);
            await this.invalidatePropertyListCache();

            res.status(200).json({
                success: true,
                message: 'Property updated successfully',
                data: property,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/properties/:id
     * Delete a property
     * Requires authentication (owner only)
     */
    async deleteProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user.userId;

            const result = await propertyService.deleteProperty(id as string, landlordId);
            await this.invalidatePropertyListCache();

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/properties/:id/report
     * Report a property listing (tenant only)
     */
    async reportProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const reporterId = (req as any).user.userId;
            const { reason, details } = req.body ?? {};

            const report = await propertyService.reportProperty(id as string, reporterId, { reason, details });
            await this.invalidatePropertyListCache();

            res.status(201).json({
                success: true,
                message: report.message,
                data: report,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/properties/:id/visits
     * Book a visit (tenant only)
     */
    async bookVisit(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const { visitDate } = req.body;

            const booking = await propertyService.bookVisit(id as string, tenantId as string, visitDate as string);

            res.status(201).json({
                success: true,
                message: 'Visit requested successfully',
                data: booking,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/properties/:id/my-visit
     * Get active visit booking for a tenant on a property
     */
    async getMyVisit(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;

            const booking = await propertyService.getMyVisit(id as string, tenantId as string);

            res.status(200).json({
                success: true,
                data: booking,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/properties/:id/visits
     * Get all visit requests for a property (landlord only)
     */
    async getPropertyVisits(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user.userId;

            const bookings = await propertyService.getPropertyVisits(id as string, landlordId as string);

            res.status(200).json({
                success: true,
                data: bookings,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/properties/:id/visits/:visitId
     * Update visit request status (landlord only)
     */
    async updateVisitStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id, visitId } = req.params;
            const landlordId = (req as any).user.userId;
            const { status } = req.body;

            if (status !== 'ACCEPTED' && status !== 'DECLINED') {
                throw new PropertyError('Status must be ACCEPTED or DECLINED', 400, 'INVALID_STATUS');
            }

            const booking = await propertyService.updateVisitStatus(
                id as string,
                visitId as string,
                landlordId as string,
                status as 'ACCEPTED' | 'DECLINED'
            );

            res.status(200).json({
                success: true,
                message: `Visit request ${status.toLowerCase()} successfully`,
                data: booking,
            });
        } catch (error) {
            next(error);
        }
    }
}

// Export singleton instance
export const propertyController = new PropertyController();
export default propertyController;
