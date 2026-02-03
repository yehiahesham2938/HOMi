import { z } from 'zod';
import { UserRole } from '../../../shared/infrastructure/models/User.js';
import { Gender } from '../../../shared/infrastructure/models/Profile.js';

/**
 * Password validation regex:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Registration Schema
 * Only requires essential fields for account creation
 * Additional fields (national_id, gender, birthdate) are completed during verification
 */
export const RegisterSchema = z.object({
    // User fields
    email: z
        .string()
        .email('Invalid email address')
        .max(255, 'Email must be at most 255 characters'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be at most 100 characters')
        .regex(
            passwordRegex,
            'Password must contain at least one uppercase letter, one lowercase letter, and one digit'
        ),
    role: z.enum([UserRole.LANDLORD, UserRole.TENANT], {
        message: 'Role must be LANDLORD or TENANT',
    }),
    // Profile fields (required for registration)
    firstName: z
        .string()
        .min(1, 'First name is required')
        .max(100, 'First name must be at most 100 characters')
        .trim(),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name must be at most 100 characters')
        .trim(),
    phone: z
        .string()
        .min(1, 'Phone number is required')
        .max(20, 'Phone number must be at most 20 characters'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Complete Verification Schema
 * Required fields to complete account verification
 */
export const CompleteVerificationSchema = z.object({
    nationalId: z
        .string()
        .min(1, 'National ID is required')
        .max(50, 'National ID must be at most 50 characters'),
    gender: z.enum([Gender.MALE, Gender.FEMALE], {
        message: 'Gender must be MALE or FEMALE',
    }),
    birthdate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export type CompleteVerificationInput = z.infer<typeof CompleteVerificationSchema>;

/**
 * Login Schema
 * Validates user login input - identifier can be email or phone number
 */
export const LoginSchema = z.object({
    identifier: z
        .string()
        .min(1, 'Email or phone number is required'),
    password: z
        .string()
        .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Forgot Password Schema
 * Validates forgot password request
 */
export const ForgotPasswordSchema = z.object({
    email: z
        .string()
        .email('Invalid email address'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * Reset Password Schema
 * Validates password reset request
 */
export const ResetPasswordSchema = z.object({
    token: z
        .string()
        .min(1, 'Reset token is required')
        .length(64, 'Invalid reset token format'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be at most 100 characters')
        .regex(
            passwordRegex,
            'Password must contain at least one uppercase letter, one lowercase letter, and one digit'
        ),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

/**
 * Refresh Token Schema
 * Validates token refresh request
 */
export const RefreshTokenSchema = z.object({
    refreshToken: z
        .string()
        .min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

/**
 * Google OAuth Login Schema
 * Validates Google access token from frontend
 */
export const GoogleLoginSchema = z.object({
    googleAccessToken: z
        .string()
        .min(1, 'Google access token is required'),
});

export type GoogleLoginInput = z.infer<typeof GoogleLoginSchema>;

/**
 * Update Profile Schema
 * All fields are optional - only provided fields will be updated
 */
export const UpdateProfileSchema = z.object({
    firstName: z
        .string()
        .min(1, 'First name cannot be empty')
        .max(100, 'First name must be at most 100 characters')
        .trim()
        .optional(),
    lastName: z
        .string()
        .min(1, 'Last name cannot be empty')
        .max(100, 'Last name must be at most 100 characters')
        .trim()
        .optional(),
    phone: z
        .string()
        .min(1, 'Phone number cannot be empty')
        .max(20, 'Phone number must be at most 20 characters')
        .optional(),
    bio: z
        .string()
        .max(500, 'Bio must be at most 500 characters')
        .optional()
        .nullable(),
    avatarUrl: z
        .string()
        .url('Avatar URL must be a valid URL')
        .max(500, 'Avatar URL must be at most 500 characters')
        .optional()
        .nullable(),
    preferredBudgetMin: z
        .number()
        .positive('Minimum budget must be positive')
        .optional()
        .nullable(),
    preferredBudgetMax: z
        .number()
        .positive('Maximum budget must be positive')
        .optional()
        .nullable(),
}).refine(
    (data) => {
        if (data.preferredBudgetMin && data.preferredBudgetMax) {
            return data.preferredBudgetMin <= data.preferredBudgetMax;
        }
        return true;
    },
    {
        message: 'Minimum budget must be less than or equal to maximum budget',
        path: ['preferredBudgetMin'],
    }
);

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Verify Email Token Schema
 */
export const VerifyEmailSchema = z.object({
    token: z
        .string()
        .length(64, 'Invalid verification token format'),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export default {
    RegisterSchema,
    CompleteVerificationSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    RefreshTokenSchema,
    GoogleLoginSchema,
    UpdateProfileSchema,
    VerifyEmailSchema,
};
