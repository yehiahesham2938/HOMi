import type { Request, Response, NextFunction } from 'express';
import { authService, AuthError } from '../services/auth.service.js';
import type {
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    CompleteVerificationRequest,
} from '../interfaces/auth.interfaces.js';

/**
 * Authentication Controller
 * Handles HTTP request/response for auth endpoints
 */
export class AuthController {
    /**
     * POST /auth/register
     * Register a new user with essential fields only
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.body as RegisterRequest;
            const result = await authService.register(input);

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/login
     * Authenticate user and return tokens
     * Note: Unverified users can login but should complete verification
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.body as LoginRequest;
            const result = await authService.login(input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/complete-verification
     * Complete account verification by providing required profile fields
     * Requires authentication
     */
    async completeVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // User ID comes from the JWT middleware (protect)
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const input = req.body as CompleteVerificationRequest;
            const result = await authService.completeVerification(userId, input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/forgot-password
     * Initiate password reset flow
     */
    async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.body as ForgotPasswordRequest;
            const result = await authService.forgotPassword(input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/reset-password
     * Reset password with token
     */
    async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.body as ResetPasswordRequest;
            const result = await authService.resetPassword(input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

// Export singleton instance
export const authController = new AuthController();
export default authController;
