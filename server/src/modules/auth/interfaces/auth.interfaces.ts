import type { UserRoleType } from '../../../shared/infrastructure/models/User.js';
import type { GenderType } from '../../../shared/infrastructure/models/Profile.js';

/**
 * Registration Request DTO
 * Simplified - only essential fields required
 */
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'LANDLORD' | 'TENANT'; // Only LANDLORD or TENANT can self-register
}

/**
 * Complete Verification Request DTO
 * Required fields to complete account verification
 */
export interface CompleteVerificationRequest {
    nationalId: string;
    gender: GenderType;
    birthdate: string;
}

/**
 * Login Request DTO
 */
export interface LoginRequest {
    email: string;
    password: string;
}

/**
 * Forgot Password Request DTO
 */
export interface ForgotPasswordRequest {
    email: string;
}

/**
 * Reset Password Request DTO
 */
export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

/**
 * Sanitized Profile Response
 */
export interface ProfileResponse {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    bio: string | null;
    avatarUrl: string | null;
    gender: GenderType | null;
    birthdate: string | null;
    gamificationPoints: number;
    preferredBudgetMin: number | null;
    preferredBudgetMax: number | null;
    isVerificationComplete: boolean;
}

/**
 * Sanitized User Response (for login)
 */
export interface UserResponse {
    id: string;
    email: string;
    role: UserRoleType;
    isVerified: boolean;
    createdAt: Date;
}

/**
 * Login Response DTO
 */
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
    profile: ProfileResponse;
}

/**
 * Generic Auth Success Response
 */
export interface AuthSuccessResponse {
    success: boolean;
    message: string;
}

/**
 * JWT Decoded Payload
 */
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRoleType;
    iat?: number;
    exp?: number;
}

/**
 * Authenticated Request User (attached by protect middleware)
 */
export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: UserRoleType;
}
