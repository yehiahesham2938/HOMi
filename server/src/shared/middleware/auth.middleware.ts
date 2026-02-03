import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractBearerToken, type JWTPayload } from '../utils/jwt.util.js';
import type { UserRoleType } from '../infrastructure/models/User.js';

/**
 * Extend Express Request type to include user
 */
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

/**
 * Authentication Error Response
 */
interface AuthErrorResponse {
    success: false;
    message: string;
    code: string;
}

/**
 * Protect Middleware
 * Verifies JWT access token and attaches user to request
 */
export function protect(
    req: Request,
    res: Response<AuthErrorResponse>,
    next: NextFunction
): void {
    try {
        // Extract token from Authorization header
        const token = extractBearerToken(req.headers.authorization);

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN',
            });
            return;
        }

        // Verify and decode token
        const decoded = verifyAccessToken(token);

        // Attach user to request
        req.user = decoded;

        next();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid token';

        res.status(401).json({
            success: false,
            message,
            code: 'INVALID_TOKEN',
        });
    }
}

/**
 * Role-based Access Control Middleware
 * Restricts access to specified roles
 * @param allowedRoles - Array of roles that can access the route
 */
export function restrictTo(...allowedRoles: UserRoleType[]) {
    return (
        req: Request,
        res: Response<AuthErrorResponse>,
        next: NextFunction
    ): void => {
        // Ensure user is authenticated first
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'NOT_AUTHENTICATED',
            });
            return;
        }

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action',
                code: 'FORBIDDEN',
            });
            return;
        }

        next();
    };
}

export default {
    protect,
    restrictTo,
};
