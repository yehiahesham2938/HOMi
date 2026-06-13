// ==========================================
// Type Definitions for Auth
// ==========================================

export type UserRole = 'LANDLORD' | 'TENANT' | 'ADMIN' | 'MAINTENANCE_PROVIDER' | 'SUPPORT';
export type Gender = 'MALE' | 'FEMALE' | 'PREFER_NOT_TO_SAY' | 'OTHER';

// ==========================================
// Request Types
// ==========================================

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'LANDLORD' | 'TENANT';
    nationalId?: string;
    gender?: Gender;
    birthdate?: string;
    preferredLanguage?: string;
}

export interface LoginRequest {
    identifier: string; // Can be email or phone number
    password: string;
    /** When true, server stores refresh token in httpOnly cookie (Remember me). */
    rememberMe?: boolean;
}

export interface MaintenanceApplyRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    providerType: 'CENTER' | 'INDIVIDUAL';
    businessName?: string;
    category: string;
    categories?: string[];
    criminalRecordDocument?: string;
    selfieImage?: string;
    nationalIdFront?: string;
    nationalIdBack?: string;
    numberOfEmployees?: number;
    companyLocation?: string;
    documentationFiles?: string[];
    notes?: string;
}

export interface MaintenanceAvailabilityResponse {
    emailExists: boolean;
    phoneExists: boolean;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface CompleteVerificationRequest {
    nationalId: string;
    gender: Gender;
    birthdate: string;
    preferredLanguage?: string;
    /** Arabic full name from NID OCR — saved atomically with national_id */
    fullNameArabic?: string;
}

export interface TenantRentalPreferencesPayload {
    employment: string;
    workplace: string;
    incomeRange: string;
    moveInDate: string;
    propertyType: string;
    duration: string;
}

export interface LandlordBusinessProfilePayload {
    accountType: string;
    companyName: string;
    totalProperties: number;
    yearsExperience: number;
    availability: string;
}

export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
    currentLocation?: string | null;
    preferredBudgetMin?: number;
    preferredBudgetMax?: number;
    preferredLanguage?: string | null;
    tenantRentalPreferences?: TenantRentalPreferencesPayload | null;
    landlordBusinessProfile?: LandlordBusinessProfilePayload | null;
    onboardingStep3Complete?: boolean;
    /** Arabic full name extracted from NID OCR */
    fullNameArabic?: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// ==========================================
// Response Types
// ==========================================

export interface ProfileResponse {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    bio: string | null;
    avatarUrl: string | null;
    gender: Gender | null;
    birthdate: string | null;
    gamificationPoints: number;
    preferredBudgetMin: number | null;
    preferredBudgetMax: number | null;
    currentLocation: string | null;
    isVerificationComplete: boolean;
    preferredLanguage: string | null;
    tenantRentalPreferences: Record<string, unknown> | null;
    landlordBusinessProfile: Record<string, unknown> | null;
    onboardingStep3Skipped: boolean;
    onboardingStep3Completed: boolean;
    onboardingStep2Completed: boolean;
    /** Arabic full name from NID OCR — read-only, set by verification flow */
    fullNameArabic?: string | null;
    /** Masked NID e.g. "29**********34" — never the raw value */
    maskedNationalId?: string | null;
}

export interface CheckSignupAvailabilityResponse {
    emailTaken: boolean;
    phoneTaken: boolean;
}

export interface UserResponse {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    emailVerified: boolean;
    createdAt: Date;
}

export interface LoginResponse {
    accessToken: string;
    /** Omitted when refresh token is only in httpOnly cookie (Remember me). */
    refreshToken?: string;
    user: UserResponse;
    profile: ProfileResponse;
    isNewUser?: boolean;
    /** Set after passkey login; otherwise refresh via GET /auth/me */
    passkeyEnabled?: boolean;
}

export interface AuthSuccessResponse {
    success: boolean;
    message: string;
}

export interface UserProfileResponse {
    user: UserResponse;
    profile: ProfileResponse;
    passkeyEnabled: boolean;
}

export interface EmailVerificationResponse {
    success: boolean;
    message: string;
    emailVerified?: boolean;
}

// ==========================================
// Error Response
// ==========================================

export interface ErrorResponse {
    success: false;
    message: string;
    error?: string;
    code?: string;
}
