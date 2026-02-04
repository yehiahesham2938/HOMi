import type { Request, Response, NextFunction } from 'express';
import { authService, AuthError } from '../services/auth.service.js';
import type {
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    CompleteVerificationRequest,
    GoogleLoginRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
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

    /**
     * POST /auth/google
     * Authenticate user with Google OAuth
     * Auto-registers new users and returns HOMi JWT tokens
     */
    async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { googleAccessToken } = req.body as GoogleLoginRequest;
            const result = await authService.loginWithGoogle(googleAccessToken);

            res.status(200).json(result);
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
     * GET /auth/verify-email
     * Verify user's email using token from query parameter
     * No authentication required (token is the auth)
     */
    async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = req.query.token as string;
            if (!token) {
                throw new AuthError('Verification token is required', 400, 'TOKEN_REQUIRED');
            }

            const result = await authService.verifyEmail(token);

            // Return success HTML page for better UX when clicked from email
            res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verified - HOMi</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 50px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
        }
        .checkmark {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
        }
        .checkmark svg { width: 40px; height: 40px; fill: white; }
        h1 { color: #1e293b; margin-bottom: 15px; font-size: 28px; }
        p { color: #64748b; line-height: 1.6; margin-bottom: 30px; }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            padding: 15px 35px;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
        </div>
        <h1>Email Verified! 🎉</h1>
        <p>${result.message}</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="button">Continue to HOMi</a>
    </div>
</body>
</html>
            `);
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
}

// Export singleton instance
export const authController = new AuthController();
export default authController;
