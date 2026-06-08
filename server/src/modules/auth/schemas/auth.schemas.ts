import { z } from 'zod';
import { UserRole } from '../models/User.js';
import { Gender } from '../models/Profile.js';

/**
 * Password validation regex:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]).{8,}$/;

/**
 * Registration Schema
 * Only requires essential fields for account creation
 * Additional fields (national_id, gender, birthdate) are completed during verification
 */
export const RegisterSchema = z
    .object({
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
                'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
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
        nationalId: z.string().min(1).max(50).optional(),
        gender: z.enum([Gender.MALE, Gender.FEMALE, Gender.PREFER_NOT_TO_SAY]).optional(),
        birthdate: z
            .string()
            .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
            .optional(),
        preferredLanguage: z.string().min(2).max(10).optional(),
    })
    .superRefine((data, ctx) => {
        const hasAny = data.nationalId || data.gender || data.birthdate;
        if (!hasAny) return;
        if (!data.nationalId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'National ID is required with identity fields', path: ['nationalId'] });
        }
        if (!data.gender) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Gender is required with identity fields', path: ['gender'] });
        }
        if (!data.birthdate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Birthdate is required with identity fields', path: ['birthdate'] });
        }
    });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const CheckSignupAvailabilitySchema = z
    .object({
        email: z.string().email('Invalid email address').max(255).optional(),
        phone: z.string().min(1).max(20).optional(),
    })
    .refine((data) => Boolean(data.email || data.phone), {
        message: 'Provide an email and/or phone number to check',
    });

export type CheckSignupAvailabilityInput = z.infer<typeof CheckSignupAvailabilitySchema>;

/**
 * Complete Verification Schema
 * Required fields to complete account verification
 */
export const CompleteVerificationSchema = z.object({
    nationalId: z
        .string()
        .trim()
        .regex(/^\d{14}$/, 'National ID must be exactly 14 digits'),
    gender: z.enum([Gender.MALE, Gender.FEMALE], {
        message: 'Gender must be Male or Female',
    }),
    birthdate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
        .refine((val) => {
            const birth = new Date(val);
            if (Number.isNaN(birth.getTime())) return false;
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
            return age >= 18;
        }, 'You must be at least 18 years old'),
    preferredLanguage: z.string().min(2).max(10).optional(),
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
    /** When true, refresh token is stored in an httpOnly cookie (Remember me). */
    rememberMe: z.boolean().optional(),
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
            'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
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
 * Refresh body: refresh token may be omitted when sent via httpOnly cookie.
 */
export const RefreshTokenBodySchema = z.preprocess(
    (val) => (val == null || typeof val !== 'object' ? {} : val),
    z.object({
        refreshToken: z.string().min(1).optional(),
    })
);

export type RefreshTokenBodyInput = z.infer<typeof RefreshTokenBodySchema>;

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
        .max(2000, 'Bio must be at most 2000 characters')
        .optional()
        .nullable(),
    avatarUrl: z
        .string()
        .refine(
            (val) =>
                /^https?:\/\/.+/.test(val) ||    // regular URL
                /^data:image\/.+;base64,/.test(val), // base64 data URI from file upload
            { message: 'Avatar must be a valid image URL or uploaded image.' }
        )
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
    currentLocation: z
        .string()
        .max(255, 'Location must be at most 255 characters')
        .trim()
        .optional()
        .nullable(),
    preferredLanguage: z.string().min(2).max(10).trim().optional().nullable(),
    onboardingStep3Complete: z.boolean().optional(),
    tenantRentalPreferences: z
        .object({
            employment: z.string().min(1),
            workplace: z.string().min(1),
            incomeRange: z.string().min(1),
            moveInDate: z.string().min(1),
            propertyType: z.string().min(1),
            duration: z.string().min(1),
        })
        .optional()
        .nullable(),
    landlordBusinessProfile: z
        .object({
            accountType: z.string().min(1),
            companyName: z.string().min(1),
            totalProperties: z.number().nonnegative(),
            yearsExperience: z.number().nonnegative(),
            availability: z.string().min(1),
        })
        .optional()
        .nullable(),
})
    .refine(
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
    )
    .superRefine((data, ctx) => {
        if (!data.onboardingStep3Complete) return;
        if (data.tenantRentalPreferences == null && data.landlordBusinessProfile == null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'tenantRentalPreferences or landlordBusinessProfile is required to finish onboarding',
                path: ['onboardingStep3Complete'],
            });
        }
        if (data.tenantRentalPreferences != null) {
            if (data.preferredBudgetMin == null || data.preferredBudgetMax == null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Budget min and max are required to finish tenant onboarding',
                    path: ['preferredBudgetMin'],
                });
            }
        }
        if (data.landlordBusinessProfile != null) {
            if (data.bio == null || String(data.bio).trim().length < 1) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Business address (bio) is required to finish landlord onboarding',
                    path: ['bio'],
                });
            }
        }
    });

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Verify Email OTP Schema
 */
export const VerifyEmailSchema = z.object({
    otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

/**
 * Change Password Schema
 * Validates password change request
 */
export const ChangePasswordSchema = z.object({
    currentPassword: z
        .string()
        .min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be at most 100 characters')
        .regex(
            passwordRegex,
            'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
        ),
}).refine(
    (data) => data.currentPassword !== data.newPassword,
    {
        message: 'New password must be different from current password',
        path: ['newPassword'],
    }
);

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/**
 * Update Role Schema
 * Validates role update request
 */
export const UpdateRoleSchema = z.object({
    role: z.enum([UserRole.LANDLORD, UserRole.TENANT], {
        message: 'Role must be LANDLORD or TENANT',
    }),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

export const MaintenanceApplySchema = z.object({
    email: z.string().email('Invalid email address').max(255),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be at most 100 characters')
        .regex(
            passwordRegex,
            'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
        ),
    firstName: z.string().min(1, 'First name is required').max(100).trim(),
    lastName: z.string().min(1, 'Last name is required').max(100).trim(),
    phone: z.string().min(1, 'Phone number is required').max(20),
    providerType: z.enum(['CENTER', 'INDIVIDUAL']),
    businessName: z.string().max(255).optional(),
    category: z.string().min(1, 'Category is required').max(120),
    categories: z.array(z.string().min(1).max(120)).optional(),
    criminalRecordDocument: z.string().min(1).optional(),
    selfieImage: z.string().min(1).optional(),
    nationalIdFront: z.string().min(1).optional(),
    nationalIdBack: z.string().min(1).optional(),
    numberOfEmployees: z.number().int().positive().optional(),
    companyLocation: z.string().max(255).optional(),
    documentationFiles: z.array(z.string().min(1)).optional(),
    notes: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
    if (data.providerType === 'INDIVIDUAL' && !data.criminalRecordDocument) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Criminal record certificate is required for individuals',
            path: ['criminalRecordDocument'],
        });
    }
    if (data.providerType === 'INDIVIDUAL' && !data.selfieImage) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Selfie is required for individuals',
            path: ['selfieImage'],
        });
    }
    if (data.providerType === 'INDIVIDUAL' && !data.nationalIdFront) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'National ID front image is required for individuals',
            path: ['nationalIdFront'],
        });
    }
    if (data.providerType === 'INDIVIDUAL' && !data.nationalIdBack) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'National ID back image is required for individuals',
            path: ['nationalIdBack'],
        });
    }
    if (data.providerType === 'CENTER') {
        if (!data.numberOfEmployees) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Number of employees is required for centers',
                path: ['numberOfEmployees'],
            });
        }
        if (!data.companyLocation) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Company location is required for centers',
                path: ['companyLocation'],
            });
        }
    }
});

export const MaintenanceLoginSchema = LoginSchema;
export const MaintenanceAvailabilitySchema = z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().min(1, 'Phone number cannot be empty').max(20).optional(),
}).refine((data) => Boolean(data.email || data.phone), {
    message: 'Email or phone is required',
});

/** Passkey login — same identifier rules as password login (email or phone). */
export const PasskeyIdentifierBodySchema = z.object({
    identifier: z.string().min(1, 'Email or phone number is required').max(255),
});

export type PasskeyIdentifierBodyInput = z.infer<typeof PasskeyIdentifierBodySchema>;

/** WebAuthn registration response JSON from the browser */
export const PasskeyRegistrationVerifySchema = z.object({
    response: z.any(),
});

export type PasskeyRegistrationVerifyInput = z.infer<typeof PasskeyRegistrationVerifySchema>;

export const PasskeyAuthenticationVerifySchema = z.object({
    identifier: z.string().min(1).max(255),
    response: z.any(),
    rememberMe: z.boolean().optional(),
});

export type PasskeyAuthenticationVerifyInput = z.infer<typeof PasskeyAuthenticationVerifySchema>;

export default {
    RegisterSchema,
    CheckSignupAvailabilitySchema,
    CompleteVerificationSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    RefreshTokenSchema,
    RefreshTokenBodySchema,
    GoogleLoginSchema,
    UpdateProfileSchema,
    VerifyEmailSchema,
    ChangePasswordSchema,
    UpdateRoleSchema,
    MaintenanceApplySchema,
    MaintenanceLoginSchema,
    MaintenanceAvailabilitySchema,
    PasskeyIdentifierBodySchema,
    PasskeyRegistrationVerifySchema,
    PasskeyAuthenticationVerifySchema,
};
