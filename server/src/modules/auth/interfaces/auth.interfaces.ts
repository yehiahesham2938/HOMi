import type { UserRoleType } from '../models/User.js';
import type { GenderType } from '../models/Profile.js';

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
 * User can login with either email OR phone number in the identifier field
 */
export interface LoginRequest {
    identifier: string; // Can be email or phone number
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
 * Google OAuth Login Request DTO
 */
export interface GoogleLoginRequest {
    googleAccessToken: string;
}

/**
 * Google UserInfo API Response
 * Data returned from https://www.googleapis.com/oauth2/v3/userinfo
 */
export interface GoogleUserInfo {
    sub: string;           // Google user ID
    email: string;
    email_verified: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;       // Avatar URL
    locale?: string;
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
    emailVerified: boolean;
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

/**
 * User Profile Response (for GET /auth/me)
 * Returns combined user and profile data
 */
export interface UserProfileResponse {
    user: UserResponse;
    profile: ProfileResponse;
}

/**
 * Update Profile Request DTO
 * All fields are optional - only provided fields will be updated
 */
export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
    preferredBudgetMin?: number;
    preferredBudgetMax?: number;
}

/**
 * Verify Email Request DTO
 */
export interface VerifyEmailRequest {
    token: string;
}

/**
 * Email Verification Response DTO
 */
export interface EmailVerificationResponse {
    success: boolean;
    message: string;
    emailVerified?: boolean;
}

/**
 * Change Password Request DTO
 */
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
