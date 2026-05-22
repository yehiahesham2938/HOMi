import type { Request, Response, NextFunction } from 'express';
import { RoommateMatchingService } from '../services/roommate-matching.service.js';

export class RoommateMatchingController {
    static async checkEligibility(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const eligibility = await RoommateMatchingService.checkEligibility(userId);
            res.status(200).json(eligibility);
        } catch (error) {
            next(error);
        }
    }

    static async createRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const request = await RoommateMatchingService.createRequest(userId, req.body);
            res.status(201).json(request);
        } catch (error) {
            next(error);
        }
    }

    static async getMyActiveRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const request = await RoommateMatchingService.getMyActiveRequest(userId);
            res.status(200).json(request);
        } catch (error) {
            next(error);
        }
    }

    static async updateRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;
            const request = await RoommateMatchingService.updateRequest(userId, id as string, req.body);
            res.status(200).json(request);
        } catch (error) {
            next(error);
        }
    }

    static async cancelRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;
            await RoommateMatchingService.cancelRequest(userId, id as string);
            res.status(200).json({ success: true, message: 'Roommate request cancelled successfully' });
        } catch (error) {
            next(error);
        }
    }

    static async getMatches(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const matches = await RoommateMatchingService.getMatches(userId);
            res.status(200).json(matches);
        } catch (error) {
            next(error);
        }
    }

    static async respondToMatch(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;
            const { action } = req.body;
            const match = await RoommateMatchingService.respondToMatch(userId, id as string, action);
            res.status(200).json(match);
        } catch (error) {
            next(error);
        }
    }

    static async browseRequests(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const requests = await RoommateMatchingService.browseRequests(userId, req.query);
            res.status(200).json(requests);
        } catch (error) {
            next(error);
        }
    }

    static async findMatches(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;
            const result = await RoommateMatchingService.findMatches(userId, id as string);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}
