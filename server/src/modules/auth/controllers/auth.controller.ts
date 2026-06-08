import type { Request, Response, NextFunction } from 'express';
import { authService, AuthError } from '../services/auth.service.js';
import {
    REFRESH_COOKIE_NAME,
    setRefreshCookie,
    clearRefreshCookie,
} from '../../../shared/utils/auth-cookie.util.js';
import type { LoginInput } from '../schemas/auth.schemas.js';
import type {
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    CompleteVerificationRequest,
    GoogleLoginRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
    UpdateRoleRequest,
    MaintenanceApplicationRequest,
} from '../interfaces/auth.interfaces.js';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { webauthnService } from '../services/webauthn.service.js';
import { env } from '../../../config/env.js';

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
     * POST /auth/check-signup-availability
     * Public — whether email/phone are already taken (HOMi email signup).
     */
    async checkSignupAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.body as { email?: string; phone?: string };
            const result = await authService.checkSignupAvailability(input);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async applyMaintenanceProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.body as MaintenanceApplicationRequest;
            const result = await authService.applyAsMaintenanceProvider(input);
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
            const { rememberMe, ...credentials } = req.body as LoginInput;
            const result = await authService.login(credentials as LoginRequest);

            if (rememberMe === true) {
                setRefreshCookie(res, result.refreshToken!);
                res.status(200).json({ ...result, refreshToken: undefined });
            } else {
                clearRefreshCookie(res);
                res.status(200).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    async maintenanceLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { rememberMe, ...credentials } = req.body as LoginInput;
            const result = await authService.maintenanceLogin(credentials as LoginRequest);

            if (rememberMe === true) {
                setRefreshCookie(res, result.refreshToken!);
                res.status(200).json({ ...result, refreshToken: undefined });
            } else {
                clearRefreshCookie(res);
                res.status(200).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    async checkMaintenanceAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.body as { email?: string; phone?: string };
            const result = await authService.checkMaintenanceAvailability(input);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/refresh
     * New access token using refresh JWT from body or httpOnly cookie
     */
    async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
            const bodyToken = (req.body as { refreshToken?: string })?.refreshToken;
            const token = cookieToken || bodyToken;
            if (!token) {
                throw new AuthError('Refresh token required', 401, 'NO_REFRESH_TOKEN');
            }

            const { accessToken } = await authService.refreshAccessToken(token);
            res.status(200).json({ accessToken });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/logout
     * Clears httpOnly refresh cookie (Remember me)
     */
    async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            clearRefreshCookie(res);
            res.status(200).json({ success: true, message: 'Logged out successfully' });
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
     * POST /auth/onboarding/skip-step3
     * Marks optional step 3 as skipped (account stays partially verified until completed in Settings).
     */
    async skipOnboardingStep3(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }
            const result = await authService.skipOnboardingStep3(userId);
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

    /**
     * POST /auth/google
     * Authenticate user with Google OAuth
     * Auto-registers new users and returns HOMi JWT tokens
     */
    async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { googleAccessToken, rememberMe } = req.body as GoogleLoginRequest;
            const result = await authService.loginWithGoogle(googleAccessToken);

            if (rememberMe === true) {
                setRefreshCookie(res, result.refreshToken!);
                res.status(200).json({ ...result, refreshToken: undefined });
            } else {
                clearRefreshCookie(res);
                res.status(200).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/me
     * Get current user profile
     * Requires authentication
     */
    async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // User ID comes from the JWT middleware (protect)
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const result = await authService.getCurrentUser(userId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /auth/profile
     * Update user's profile details
     * Requires authentication
     */
    async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const input = req.body as UpdateProfileRequest;
            const result = await authService.updateProfile(userId, input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /auth/role
     * Update user's role
     * Requires authentication
     */
    async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const input = req.body as UpdateRoleRequest;
            const result = await authService.updateRole(userId, input);

            if (req.cookies?.[REFRESH_COOKIE_NAME]) {
                setRefreshCookie(res, result.refreshToken!);
                res.status(200).json({ ...result, refreshToken: undefined });
            } else {
                res.status(200).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/send-verification-email
     * Send email verification link to user
     * Requires authentication
     */
    async sendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const result = await authService.sendVerificationEmail(userId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/verify-email
     * Verify user's email using a 6-digit OTP
     * Authentication is required
     */
    async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const { otp } = req.body;
            if (!otp) {
                throw new AuthError('OTP is required', 400, 'OTP_REQUIRED');
            }

            const result = await authService.verifyEmail(userId, otp);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /auth/change-password
     * Change user's password
     * Requires authentication
     */
    async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const input = req.body as ChangePasswordRequest;
            const result = await authService.changePassword(userId, input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /auth/habits
     * Set (replace) user habits
     */
    async setUserHabits(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const { habit_names } = req.body as { habit_names: string[] };
            const result = await authService.setUserHabits(userId, habit_names ?? []);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/habits
     * Get current user's habits
     */
    async getUserHabits(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const result = await authService.getUserHabits(userId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/lifestyle
     * Get current user's structured roommate lifestyle habits
     */
    async getLifestyleHabits(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }
            const result = await authService.getLifestyleHabits(userId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /auth/lifestyle
     * Set (replace) the structured roommate lifestyle habits
     */
    async setLifestyleHabits(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }
            const { lifestyle_habits } = req.body as { lifestyle_habits: Record<string, number> };
            const result = await authService.setLifestyleHabits(userId, lifestyle_habits ?? {});
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /auth/account
     * Permanently delete user and profile when no properties, rental requests, or contracts exist.
     */
    async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }

            const result = await authService.deleteAccount(userId);
            clearRefreshCookie(res);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/passkey/registration-options
     */
    async passkeyRegistrationOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }
            const options = await webauthnService.registrationOptions(userId);
            res.status(200).json(options);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/passkey/registration-verify
     */
    async passkeyRegistrationVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }
            const response = req.body.response as RegistrationResponseJSON;
            await webauthnService.registrationVerify(userId, response);
            res.status(200).json({ success: true, message: 'Passkey registered successfully.' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/passkey/authentication-options
     */
    async passkeyAuthenticationOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { identifier } = req.body as { identifier: string };
            const options = await webauthnService.authenticationOptions(identifier);
            res.status(200).json(options);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/passkey/authentication-verify
     */
    async passkeyAuthenticationVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { identifier, response, rememberMe } = req.body as {
                identifier: string;
                response: AuthenticationResponseJSON;
                rememberMe?: boolean;
            };
            const result = await webauthnService.authenticationVerify(identifier, response);

            if (rememberMe === true) {
                setRefreshCookie(res, result.refreshToken!);
                res.status(200).json({ ...result, refreshToken: undefined });
            } else {
                clearRefreshCookie(res);
                res.status(200).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/passkeys
     */
    async listPasskeys(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }
            const credentials = await webauthnService.listPasskeys(userId);
            res.status(200).json({ credentials });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /auth/passkeys
     */
    async deletePasskeys(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AuthError('User not authenticated', 401, 'NOT_AUTHENTICATED');
            }
            await webauthnService.deleteAllPasskeys(userId);
            res.status(200).json({ success: true, message: 'Passkeys removed from your account.' });
        } catch (error) {
            next(error);
        }
    }
}

// Export singleton instance
export const authController = new AuthController();
export default authController;
