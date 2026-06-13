import axios from 'axios';
import { Op } from 'sequelize';
import { User, Profile, Habit, UserHabit, UserPasskey, sequelize, UserRole } from '../models/index.js';
import { Property } from '../../properties/models/Property.js';
import { RentalRequest } from '../../rental-requests/models/RentalRequest.js';
import { Contract } from '../../contracts/models/Contract.js';
import {
    MaintenanceProviderApplication,
    MaintenanceProviderType,
    MaintenanceApplicationStatus,
} from '../../maintenance/models/MaintenanceProviderApplication.js';
import {
    generateTokenPair,
    generateAccessToken,
    verifyRefreshToken,
    type TokenPair,
} from '../../../shared/utils/jwt.util.js';
import { generateSecureToken, hashToken, generateNumericOTP } from '../../../shared/utils/encryption.util.js';
import { emailService } from '../../../shared/services/email.service.js';
import type {
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    CompleteVerificationRequest,
    GoogleLoginRequest,
    GoogleUserInfo,
    LoginResponse,
    AuthSuccessResponse,
    ProfileResponse,
    UserResponse,
    UserProfileResponse,
    UpdateProfileRequest,
    EmailVerificationResponse,
    ChangePasswordRequest,
    UpdateRoleRequest,
    MaintenanceApplicationRequest,
    MaintenanceAvailabilityRequest,
    MaintenanceAvailabilityResponse,
} from '../interfaces/auth.interfaces.js';
import { activityLogService } from '../../../shared/services/activity-log.service.js';

/** Returned with 409 when DELETE /auth/account is blocked by related records */
export type AccountDeleteBlockers = {
    propertyCount: number;
    rentalRequestCount: number;
    contractCount: number;
};

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
    constructor(
        message: string,
        public statusCode: number = 400,
        public code: string = 'AUTH_ERROR',
        public details?: AccountDeleteBlockers | Record<string, unknown>
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * Authentication Service
 * Handles all authentication business logic
 */
export class AuthService {
    async checkMaintenanceAvailability(
        input: MaintenanceAvailabilityRequest
    ): Promise<MaintenanceAvailabilityResponse> {
        const email = input.email?.trim().toLowerCase();
        const phone = input.phone?.trim();

        const [emailUser, phoneProfile] = await Promise.all([
            email
                ? User.findOne({
                    attributes: ['id'],
                    where: { email },
                })
                : Promise.resolve(null),
            phone
                ? Profile.findOne({
                    attributes: ['id'],
                    where: { phone_number: phone },
                })
                : Promise.resolve(null),
        ]);

        return {
            emailExists: Boolean(emailUser),
            phoneExists: Boolean(phoneProfile),
        };
    }

    private async enforceBanPolicy(user: User): Promise<void> {
        if (!user.is_banned) return;

        if (user.ban_until && user.ban_until <= new Date()) {
            await user.update({
                is_banned: false,
                ban_reason: null,
                ban_message: null,
                ban_until: null,
                banned_by_admin_id: null,
                ban_created_at: null,
            });
            return;
        }

        const remainingMs = user.ban_until ? Math.max(0, user.ban_until.getTime() - Date.now()) : null;
        throw new AuthError(
            'Your account is banned.',
            403,
            'ACCOUNT_BANNED',
            {
                reason: user.ban_reason || 'Policy violation',
                message: user.ban_message || 'Your account has been restricted by an administrator.',
                banUntil: user.ban_until ? user.ban_until.toISOString() : null,
                remainingMs,
                isUnlimited: !user.ban_until,
            }
        );
    }

    /**
     * Find user by login identifier (email or phone). Returns null if not found.
     */
    async findUserByLoginIdentifier(identifier: string): Promise<User | null> {
        const isEmail = identifier.includes('@');
        let user: User | null = null;

        if (isEmail) {
            user = await User.findOne({
                where: { email: identifier.toLowerCase() },
                include: [{ model: Profile, as: 'profile' }],
            });
        } else {
            const phoneInput = identifier.trim();
            let profile;

            if (phoneInput.startsWith('+')) {
                const digitsOnly = phoneInput.slice(1);
                const possibleVariants: string[] = [phoneInput];
                for (let i = 1; i <= Math.min(4, digitsOnly.length - 1); i++) {
                    const localPart = digitsOnly.slice(i);
                    if (localPart.length >= 9) {
                        possibleVariants.push('0' + localPart);
                    }
                }
                profile = await Profile.findOne({
                    where: {
                        phone_number: { [Op.in]: possibleVariants },
                    },
                });
            } else if (phoneInput.startsWith('0')) {
                const digitsAfterZero = phoneInput.slice(1);
                profile = await Profile.findOne({
                    where: {
                        [Op.or]: [
                            { phone_number: phoneInput },
                            { phone_number: { [Op.like]: `+%${digitsAfterZero}` } },
                        ],
                    },
                });
            } else {
                profile = await Profile.findOne({
                    where: { phone_number: phoneInput },
                });
            }

            if (profile) {
                user = await User.findOne({
                    where: { id: profile.user_id },
                    include: [{ model: Profile, as: 'profile' }],
                });
            }
        }

        return user;
    }

    /** Maps a Profile model row to API profile DTO (single place for /me, login, role update). */
    private mapProfileToResponse(profile: Profile): ProfileResponse {
        return {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            phoneNumber: profile.phone_number,
            bio: profile.bio ?? null,
            avatarUrl: profile.avatar_url ?? null,
            gender: profile.gender ?? null,
            birthdate: profile.birthdate ? String(profile.birthdate) : null,
            gamificationPoints: profile.gamification_points,
            preferredBudgetMin:
                profile.preferred_budget_min != null ? Number(profile.preferred_budget_min) : null,
            preferredBudgetMax:
                profile.preferred_budget_max != null ? Number(profile.preferred_budget_max) : null,
            currentLocation: profile.current_location ?? null,
            isVerificationComplete: profile.isVerificationComplete(),
            preferredLanguage: profile.preferred_language ?? null,
            tenantRentalPreferences:
                (profile.tenant_rental_preferences as Record<string, unknown> | null) ?? null,
            landlordBusinessProfile:
                (profile.landlord_business_profile as Record<string, unknown> | null) ?? null,
            onboardingStep3Skipped: profile.onboarding_step3_skipped ?? false,
            onboardingStep3Completed: profile.onboarding_step3_completed ?? false,
            onboardingStep2Completed: profile.onboarding_step2_completed ?? true,
            fullNameArabic: profile.full_name_arabic ?? null,
        };
    }

    private buildLoginResponse(user: User, tokens: TokenPair): LoginResponse {
        const profile = user.profile;
        if (!profile) {
            throw new AuthError('User profile not found', 500, 'PROFILE_NOT_FOUND');
        }

        const userResponse: UserResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.is_verified,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
        };

        const profileResponse = this.mapProfileToResponse(profile);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: userResponse,
            profile: profileResponse,
        };
    }

    /**
     * Issue a full login response after a verified WebAuthn / passkey assertion.
     */
    async loginWithPasskey(user: User): Promise<LoginResponse> {
        await this.enforceBanPolicy(user);
        const tokens: TokenPair = generateTokenPair(user.id, user.email, user.role);
        await activityLogService.log({
            actor: { userId: user.id, role: user.role, email: user.email },
            action: 'AUTH_LOGIN',
            entityType: 'USER',
            entityId: user.id,
            description: 'User logged in with passkey.',
        });
        return {
            ...this.buildLoginResponse(user, tokens),
            passkeyEnabled: true,
        };
    }

    /**
     * Register a new user with profile
     * Creates User and Profile atomically within a transaction
     * Only requires essential fields - verification happens later
     */
    async register(input: RegisterRequest): Promise<AuthSuccessResponse> {
        const transaction = await sequelize.transaction();

        try {
            // Check if email already exists
            const existingUser = await User.findOne({
                where: { email: input.email.toLowerCase() },
                transaction,
            });

            if (existingUser) {
                throw new AuthError(
                    'This email address is already registered. Sign in with that email, or use a different one.',
                    409,
                    'EMAIL_EXISTS'
                );
            }

            // Check if phone number already exists
            const existingProfile = await Profile.findOne({
                where: { phone_number: input.phone },
                transaction,
            });

            if (existingProfile) {
                throw new AuthError(
                    'This phone number is already registered. Sign in, or use a different phone number.',
                    409,
                    'PHONE_EXISTS'
                );
            }

            // Create user with hashed password (hook handles hashing)
            // is_verified = false until user completes verification form
            const user = await User.create(
                {
                    email: input.email.toLowerCase(),
                    password_hash: input.password, // Will be hashed by beforeCreate hook
                    role: input.role,
                    is_verified: false, // Will be true after completing verification
                },
                { transaction }
            );

            const hasIdentity =
                Boolean(input.nationalId?.trim()) && Boolean(input.gender) && Boolean(input.birthdate);

            await Profile.create(
                {
                    user_id: user.id,
                    first_name: input.firstName,
                    last_name: input.lastName,
                    phone_number: input.phone,
                    national_id: hasIdentity ? input.nationalId!.trim() : null,
                    gender: hasIdentity ? input.gender! : null,
                    birthdate: hasIdentity ? new Date(input.birthdate!) : null,
                    preferred_language: input.preferredLanguage?.trim() || null,
                    onboarding_step2_completed: false,
                },
                { transaction }
            );

            // Commit transaction
            await transaction.commit();

            await activityLogService.log({
                actor: { userId: user.id, role: user.role, email: user.email },
                action: 'AUTH_REGISTERED',
                entityType: 'USER',
                entityId: user.id,
                description: `New ${user.role.toLowerCase()} account registered.`,
                metadata: { email: user.email },
            });

            return {
                success: true,
                message: 'Registration successful. Please complete your profile verification to access all features.',
            };
        } catch (error) {
            // Rollback transaction on any error
            await transaction.rollback();

            if (error instanceof AuthError) {
                throw error;
            }

            console.error('Registration error:', error);
            throw new AuthError('Registration failed. Please try again.', 500, 'REGISTRATION_FAILED');
        }
    }

    /**
     * Public check before signup — whether email and/or phone are already taken.
     */
    async checkSignupAvailability(input: {
        email?: string;
        phone?: string;
    }): Promise<{ emailTaken: boolean; phoneTaken: boolean }> {
        const email = input.email?.trim().toLowerCase();
        const phone = input.phone?.trim();
        let emailTaken = false;
        let phoneTaken = false;
        if (email) {
            const u = await User.findOne({ where: { email } });
            emailTaken = Boolean(u);
        }
        if (phone) {
            const p = await Profile.findOne({ where: { phone_number: phone } });
            phoneTaken = Boolean(p);
        }
        return { emailTaken, phoneTaken };
    }

    async applyAsMaintenanceProvider(input: MaintenanceApplicationRequest): Promise<AuthSuccessResponse> {
        const transaction = await sequelize.transaction();
        try {
            const existingUser = await User.findOne({
                where: { email: input.email.toLowerCase() },
                transaction,
            });
            if (existingUser) {
                throw new AuthError('Email already registered', 409, 'EMAIL_EXISTS');
            }

            const existingProfile = await Profile.findOne({
                where: { phone_number: input.phone },
                transaction,
            });
            if (existingProfile) {
                throw new AuthError('Phone number already registered', 409, 'PHONE_EXISTS');
            }

            const user = await User.create(
                {
                    email: input.email.toLowerCase(),
                    password_hash: input.password,
                    role: UserRole.MAINTENANCE_PROVIDER,
                    is_verified: false,
                },
                { transaction }
            );

            await Profile.create(
                {
                    user_id: user.id,
                    first_name: input.firstName,
                    last_name: input.lastName,
                    phone_number: input.phone,
                    national_id: null,
                    gender: null,
                    birthdate: null,
                    onboarding_step2_completed: true,
                },
                { transaction }
            );

            await MaintenanceProviderApplication.create(
                {
                    user_id: user.id,
                    provider_type: input.providerType as (typeof MaintenanceProviderType)[keyof typeof MaintenanceProviderType],
                    business_name: input.providerType === 'CENTER' ? input.businessName ?? null : null,
                    category: input.category,
                    categories: input.providerType === 'CENTER' ? (input.categories ?? [input.category]) : null,
                    criminal_record_document: input.providerType === 'INDIVIDUAL' ? input.criminalRecordDocument ?? null : null,
                    selfie_image: input.providerType === 'INDIVIDUAL' ? input.selfieImage ?? null : null,
                    national_id_front: input.providerType === 'INDIVIDUAL' ? input.nationalIdFront ?? null : null,
                    national_id_back: input.providerType === 'INDIVIDUAL' ? input.nationalIdBack ?? null : null,
                    number_of_employees: input.providerType === 'CENTER' ? input.numberOfEmployees ?? null : null,
                    company_location: input.providerType === 'CENTER' ? input.companyLocation ?? null : null,
                    documentation_files: input.providerType === 'CENTER' ? (input.documentationFiles ?? null) : null,
                    notes: input.notes ?? null,
                    status: MaintenanceApplicationStatus.PENDING,
                },
                { transaction }
            );

            await transaction.commit();
            return {
                success: true,
                message: 'Your maintenance provider request was submitted. An admin will review it soon.',
            };
        } catch (error) {
            await transaction.rollback();
            if (error instanceof AuthError) throw error;
            throw new AuthError('Failed to submit maintenance provider request', 500, 'MAINTENANCE_APPLY_FAILED');
        }
    }

    /**
     * Complete step-1 identity (national ID, gender, birthdate).
     * Requires verified email. Does not set is_verified — that happens after step 3 (onboarding preferences).
     */
    async completeVerification(
        userId: string,
        input: CompleteVerificationRequest
    ): Promise<AuthSuccessResponse> {
        const transaction = await sequelize.transaction();

        try {
            const user = await User.findByPk(userId, {
                include: [{ model: Profile, as: 'profile' }],
                transaction,
            });

            if (!user) {
                throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
            }

            if (!user.email_verified) {
                throw new AuthError(
                    'Please verify your email address first before completing profile verification',
                    400,
                    'EMAIL_NOT_VERIFIED'
                );
            }

            const profile = user.profile;
            if (!profile) {
                throw new AuthError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }

            // Allow correcting identity until role choice is confirmed (onboarding step 2).
            if (profile.isVerificationComplete() && profile.onboarding_step2_completed) {
                await transaction.commit();
                return {
                    success: true,
                    message: 'Identity verification is already on file.',
                };
            }

            await profile.update(
                {
                    national_id: input.nationalId,
                    gender: input.gender,
                    birthdate: new Date(input.birthdate),
                    ...(input.preferredLanguage?.trim()
                        ? { preferred_language: input.preferredLanguage.trim() }
                        : {}),
                },
                { transaction }
            );

            await transaction.commit();

            await activityLogService.log({
                actor: { userId: user.id, role: user.role, email: user.email },
                action: 'AUTH_VERIFICATION_COMPLETED',
                entityType: 'USER',
                entityId: user.id,
                description: 'User completed identity verification (step 1).',
            });

            return {
                success: true,
                message: 'Identity saved. Continue to finish your profile.',
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof AuthError) {
                throw error;
            }

            console.error('Verification error:', error);
            throw new AuthError('Verification failed. Please try again.', 500, 'VERIFICATION_FAILED');
        }
    }

    /**
     * Skip optional step 3 — user stays unverified (is_verified false) until preferences/business are submitted.
     */
    async skipOnboardingStep3(userId: string): Promise<AuthSuccessResponse> {
        const transaction = await sequelize.transaction();
        try {
            const user = await User.findByPk(userId, {
                include: [{ model: Profile, as: 'profile' }],
                transaction,
            });

            if (!user) {
                throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
            }

            if (user.role !== UserRole.TENANT && user.role !== UserRole.LANDLORD) {
                throw new AuthError('Onboarding skip is only for tenant or landlord accounts', 400, 'INVALID_ROLE');
            }

            if (!user.email_verified) {
                throw new AuthError(
                    'Please verify your email address first',
                    400,
                    'EMAIL_NOT_VERIFIED'
                );
            }

            const profile = user.profile;
            if (!profile) {
                throw new AuthError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }

            if (!profile.isVerificationComplete()) {
                throw new AuthError(
                    'Complete identity verification before skipping this step',
                    400,
                    'IDENTITY_INCOMPLETE'
                );
            }

            if (profile.onboarding_step3_completed) {
                throw new AuthError('Profile is already fully completed', 400, 'ONBOARDING_ALREADY_COMPLETE');
            }

            await profile.update(
                {
                    onboarding_step3_skipped: true,
                    onboarding_step3_completed: false,
                },
                { transaction }
            );
            await user.update({ is_verified: false }, { transaction });

            await transaction.commit();

            await activityLogService.log({
                actor: { userId: user.id, role: user.role, email: user.email },
                action: 'AUTH_ONBOARDING_STEP3_SKIPPED',
                entityType: 'USER',
                entityId: user.id,
                description: 'User skipped optional onboarding step 3.',
            });

            return {
                success: true,
                message: 'You can complete rental preferences or business details anytime in Settings.',
            };
        } catch (error) {
            await transaction.rollback();
            if (error instanceof AuthError) {
                throw error;
            }
            console.error('skipOnboardingStep3 error:', error);
            throw new AuthError('Could not update onboarding state.', 500, 'ONBOARDING_SKIP_FAILED');
        }
    }

    /**
     * Authenticate user and return tokens
     * Note: Unverified users CAN login, but is_verified flag is included in response
     * Identifier can be either email or phone number - auto-detected
     */
    async login(input: LoginRequest): Promise<LoginResponse> {
        const user = await this.findUserByLoginIdentifier(input.identifier);
        if (!user) {
            throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        await this.enforceBanPolicy(user);

        const isPasswordValid = await user.comparePassword(input.password);
        if (!isPasswordValid) {
            throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        const tokens: TokenPair = generateTokenPair(user.id, user.email, user.role);
        await activityLogService.log({
            actor: { userId: user.id, role: user.role, email: user.email },
            action: 'AUTH_LOGIN',
            entityType: 'USER',
            entityId: user.id,
            description: 'User logged in.',
        });

        return this.buildLoginResponse(user, tokens);
    }

    async maintenanceLogin(input: LoginRequest): Promise<LoginResponse> {
        const user = await this.findUserByLoginIdentifier(input.identifier);
        if (!user) {
            throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
        if (user.role !== UserRole.MAINTENANCE_PROVIDER) {
            throw new AuthError('Use the regular login for tenant or landlord accounts', 403, 'INVALID_MAINTENANCE_ROLE');
        }

        await this.enforceBanPolicy(user);

        const isPasswordValid = await user.comparePassword(input.password);
        if (!isPasswordValid) {
            throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        const application = await MaintenanceProviderApplication.findOne({
            where: { user_id: user.id },
        });

        if (!application || application.status === MaintenanceApplicationStatus.PENDING) {
            throw new AuthError('Your request is still under review by admin.', 403, 'MAINTENANCE_REQUEST_PENDING');
        }
        if (application.status === MaintenanceApplicationStatus.REJECTED) {
            throw new AuthError(
                application.rejection_reason || 'Your maintenance provider request was rejected.',
                403,
                'MAINTENANCE_REQUEST_REJECTED'
            );
        }

        const tokens: TokenPair = generateTokenPair(user.id, user.email, user.role);
        return this.buildLoginResponse(user, tokens);
    }

    /**
     * Issue a new access token from a valid refresh JWT (body or cookie).
     */
    async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const payload = verifyRefreshToken(refreshToken);
            const accessToken = generateAccessToken(payload);
            return { accessToken };
        } catch {
            throw new AuthError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }
    }

    /**
     * Initiate forgot password flow
     * Generates reset token and sends password reset email
     */
    async forgotPassword(input: ForgotPasswordRequest): Promise<AuthSuccessResponse> {
        const user = await User.findOne({
            where: { email: input.email.toLowerCase() },
        });

        // Check if user exists - return error if not found
        if (!user) {
            throw new AuthError(
                'No account found with this email address',
                404,
                'EMAIL_NOT_FOUND'
            );
        }

        // Generate reset token
        const { token, hashedToken } = generateSecureToken();

        // Set token expiration (1 hour from now)
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

        // Store hashed token in database
        await user.update({
            reset_token_hash: hashedToken,
            reset_token_expires: tokenExpires,
        });

        // Send password reset email without blocking the HTTP response.
        // SMTP can occasionally take >10s; the client has a 10s Axios timeout.
        void emailService
            .sendPasswordResetEmail(user.email, token)
            .then((emailSent) => {
                if (!emailSent) {
                    console.warn('Failed to send password reset email, but token was generated');
                }
            })
            .catch((error) => {
                console.error('Password reset email send failed:', error);
            });

        return {
            success: true,
            message: 'Password reset email sent. Please check your inbox.',
        };
    }

    /**
     * Reset password using token
     */
    async resetPassword(input: ResetPasswordRequest): Promise<AuthSuccessResponse> {
        // Hash the provided token to compare with stored hash
        const hashedToken = hashToken(input.token);

        // Find user with matching token
        const user = await User.findOne({
            where: { reset_token_hash: hashedToken },
        });

        if (!user) {
            throw new AuthError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
        }

        // Check token expiration
        if (!user.reset_token_expires || user.reset_token_expires < new Date()) {
            throw new AuthError('Reset token has expired', 400, 'RESET_TOKEN_EXPIRED');
        }

        // Update password and clear reset token fields
        await user.update({
            password_hash: input.newPassword, // Will be hashed by beforeUpdate hook
            reset_token_hash: null,
            reset_token_expires: null,
        });

        return {
            success: true,
            message: 'Password reset successful. You can now login with your new password.',
        };
    }

    /**
     * Login with Google OAuth
     * Verifies Google access token, auto-registers new users, and returns HOMi tokens
     */
    async loginWithGoogle(googleAccessToken: string): Promise<LoginResponse> {
        // 1. Verify the token with Google UserInfo API
        let googleUser: GoogleUserInfo;
        try {
            const response = await axios.get<GoogleUserInfo>(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                    headers: { Authorization: `Bearer ${googleAccessToken}` },
                    timeout: 12_000,
                }
            );
            googleUser = response.data;
        } catch (error) {
            console.error('Google token verification failed:', error);
            if (axios.isAxiosError(error)) {
                const transient =
                    error.code === 'ECONNRESET' ||
                    error.code === 'ETIMEDOUT' ||
                    error.code === 'ENOTFOUND' ||
                    error.code === 'EAI_AGAIN' ||
                    error.code === 'ECONNABORTED';
                if (transient) {
                    throw new AuthError(
                        'Unable to reach Google. Check your network connection and try again.',
                        503,
                        'GOOGLE_VERIFICATION_UNAVAILABLE'
                    );
                }
            }
            throw new AuthError('Invalid Google access token', 401, 'INVALID_GOOGLE_TOKEN');
        }

        const { email, given_name, family_name, picture } = googleUser;

        if (!email) {
            throw new AuthError('Email not provided by Google', 400, 'GOOGLE_EMAIL_MISSING');
        }

        // 2. Check if user exists in database
        let user = await User.findOne({
            where: { email: email.toLowerCase() },
            include: [{ model: Profile, as: 'profile' }],
        });

        // 3. If user doesn't exist, auto-register them
        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            const transaction = await sequelize.transaction();

            try {
                // Create user with Google OAuth placeholder password
                // email_verified = true because Google verified their email
                // is_verified = false until they complete profile verification (national ID, etc.)
                user = await User.create(
                    {
                        email: email.toLowerCase(),
                        password_hash: 'GOOGLE_OAUTH_USER', // Placeholder - they won't use password login
                        role: 'TENANT', // Default role for Google OAuth users
                        is_verified: false, // Still needs to complete profile verification
                        email_verified: true, // Google verified their email
                    },
                    { transaction }
                );

                // Create profile with Google data
                await Profile.create(
                    {
                        user_id: user.id,
                        first_name: given_name || 'User',
                        last_name: family_name || '',
                        phone_number: '', // Must be collected later
                        national_id: null, // Must be collected later
                        gender: null, // Must be collected later
                        birthdate: null, // Must be collected later
                        avatar_url: picture || null,
                        onboarding_step2_completed: false,
                    },
                    { transaction }
                );

                await transaction.commit();

                // Reload user with profile
                await user.reload({
                    include: [{ model: Profile, as: 'profile' }],
                });

                console.log('✅ New user auto-registered via Google OAuth:', email);
            } catch (error) {
                await transaction.rollback();
                console.error('Google OAuth registration error:', error);
                throw new AuthError('Failed to create user account', 500, 'REGISTRATION_FAILED');
            }
        }

        await this.enforceBanPolicy(user);

        // Update profile image if missing or from Google (to keep it fresh)
        if (user.profile && picture) {
            if (!user.profile.avatar_url || user.profile.avatar_url.startsWith('https://lh3.googleusercontent.com')) {
                await user.profile.update({ avatar_url: picture });
            }
        }

        // 4. Generate HOMi JWT tokens
        const tokens: TokenPair = generateTokenPair(user.id, user.email, user.role);

        // 5. Build sanitized response
        const userResponse: UserResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.is_verified,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
        };

        const profile = user.profile;
        if (!profile) {
            throw new AuthError('User profile not found', 500, 'PROFILE_NOT_FOUND');
        }

        const profileResponse = this.mapProfileToResponse(profile);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: userResponse,
            profile: profileResponse,
            isNewUser,
        };
    }

    /**
     * Get current user profile
     * Fetches user and profile data for authenticated user
     */
    async getCurrentUser(userId: string): Promise<UserProfileResponse> {
        // Find user with profile
        const user = await User.findByPk(userId, {
            include: [{ model: Profile, as: 'profile' }],
        });

        if (!user) {
            throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
        }

        const profile = user.profile;
        if (!profile) {
            throw new AuthError('User profile not found', 500, 'PROFILE_NOT_FOUND');
        }

        // Build sanitized response
        const userResponse: UserResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.is_verified,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
        };

        const profileResponse = this.mapProfileToResponse(profile);

        const passkeyCount = await UserPasskey.count({ where: { user_id: userId } });

        return {
            user: userResponse,
            profile: profileResponse,
            passkeyEnabled: passkeyCount > 0,
        };
    }

    /**
     * Update user profile
     * Allows users to update their personal details
     */
    async updateProfile(
        userId: string,
        input: UpdateProfileRequest
    ): Promise<UserProfileResponse> {
        const transaction = await sequelize.transaction();

        try {
            // Find user and profile
            const user = await User.findByPk(userId, {
                include: [{ model: Profile, as: 'profile' }],
                transaction,
            });

            if (!user) {
                throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
            }

            const profile = user.profile;
            if (!profile) {
                throw new AuthError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }

            const onboardingStep3WasAlreadyComplete = profile.onboarding_step3_completed === true;

            const updateData: Record<string, unknown> = {};

            if (input.firstName !== undefined) updateData.first_name = input.firstName;
            if (input.lastName !== undefined) updateData.last_name = input.lastName;
            if (input.phone !== undefined) {
                const newPhone = input.phone.trim();
                const currentPhone = (profile.phone_number ?? '').trim();
                if (newPhone.length > 0 && newPhone !== currentPhone) {
                    const taken = await Profile.findOne({
                        where: { phone_number: newPhone },
                        transaction,
                    });
                    if (taken && taken.user_id !== user.id) {
                        throw new AuthError(
                            'This phone number is already registered to another account. Use a different number.',
                            409,
                            'PHONE_EXISTS'
                        );
                    }
                }
                updateData.phone_number = newPhone;
            }
            if (input.bio !== undefined) updateData.bio = input.bio;
            if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
            if (input.currentLocation !== undefined) updateData.current_location = input.currentLocation;
            if (input.preferredBudgetMin !== undefined) updateData.preferred_budget_min = input.preferredBudgetMin;
            if (input.preferredBudgetMax !== undefined) updateData.preferred_budget_max = input.preferredBudgetMax;
            if (input.preferredLanguage !== undefined) updateData.preferred_language = input.preferredLanguage;
            // Arabic full name from NID OCR
            if (input.fullNameArabic !== undefined) updateData.full_name_arabic = input.fullNameArabic;

            if (input.onboardingStep3Complete === true) {
                if (!user.email_verified) {
                    throw new AuthError(
                        'Please verify your email address before completing your profile',
                        400,
                        'EMAIL_NOT_VERIFIED'
                    );
                }
                if (!profile.isVerificationComplete()) {
                    throw new AuthError(
                        'Complete identity verification first',
                        400,
                        'IDENTITY_INCOMPLETE'
                    );
                }

                if (user.role === UserRole.TENANT) {
                    if (!input.tenantRentalPreferences) {
                        throw new AuthError(
                            'Tenant rental preferences are required',
                            400,
                            'TENANT_PREFS_REQUIRED'
                        );
                    }
                    if (input.preferredBudgetMin == null || input.preferredBudgetMax == null) {
                        throw new AuthError('Budget range is required', 400, 'BUDGET_REQUIRED');
                    }
                    updateData.tenant_rental_preferences = input.tenantRentalPreferences as unknown as Record<
                        string,
                        unknown
                    >;
                    updateData.onboarding_step3_completed = true;
                    updateData.onboarding_step3_skipped = false;
                    await user.update({ is_verified: true }, { transaction });
                    user.is_verified = true;
                } else if (user.role === UserRole.LANDLORD) {
                    if (!input.landlordBusinessProfile) {
                        throw new AuthError(
                            'Landlord business profile is required',
                            400,
                            'LANDLORD_BUSINESS_REQUIRED'
                        );
                    }
                    const addr = input.bio != null ? String(input.bio).trim() : '';
                    if (addr.length < 1) {
                        throw new AuthError('Business address is required', 400, 'BIO_REQUIRED');
                    }
                    updateData.landlord_business_profile = input.landlordBusinessProfile as unknown as Record<
                        string,
                        unknown
                    >;
                    updateData.onboarding_step3_completed = true;
                    updateData.onboarding_step3_skipped = false;
                    await user.update({ is_verified: true }, { transaction });
                    user.is_verified = true;
                } else {
                    throw new AuthError(
                        'Onboarding completion is only for tenant or landlord accounts',
                        400,
                        'INVALID_ROLE'
                    );
                }
            }

            await profile.update(updateData as Partial<Profile>, { transaction });

            await transaction.commit();

            await profile.reload();

            if (
                input.onboardingStep3Complete === true &&
                !onboardingStep3WasAlreadyComplete &&
                profile.onboarding_step3_completed === true
            ) {
                try {
                    await emailService.sendWelcomeEmail(user.email, profile.first_name ?? 'there');
                } catch (e) {
                    console.warn('Welcome email failed after first-time profile completion:', e);
                }
            }

            const userResponse: UserResponse = {
                id: user.id,
                email: user.email,
                role: user.role,
                isVerified: user.is_verified,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
            };

            const profileResponse = this.mapProfileToResponse(profile);

            const passkeyCount = await UserPasskey.count({ where: { user_id: userId } });

            return {
                user: userResponse,
                profile: profileResponse,
                passkeyEnabled: passkeyCount > 0,
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof AuthError) {
                throw error;
            }

            console.error('Profile update error:', error);
            throw new AuthError('Failed to update profile. Please try again.', 500, 'PROFILE_UPDATE_FAILED');
        }
    }

    /**
     * Update user role
     * Allows users to change their role between TENANT and LANDLORD
     */
    async updateRole(
        userId: string,
        input: UpdateRoleRequest
    ): Promise<LoginResponse> {
        const transaction = await sequelize.transaction();

        try {
            // Find user and profile
            const user = await User.findByPk(userId, {
                include: [{ model: Profile, as: 'profile' }],
                transaction,
            });

            if (!user) {
                throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
            }

            const profile = user.profile;
            if (!profile) {
                throw new AuthError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }

            // Update user role and mark onboarding step 2 (role choice) as confirmed
            await user.update({ role: input.role }, { transaction });
            await profile.update({ onboarding_step2_completed: true }, { transaction });

            await transaction.commit();
            await profile.reload();
            await activityLogService.log({
                actor: { userId: user.id, role: user.role, email: user.email },
                action: 'AUTH_ROLE_UPDATED',
                entityType: 'USER',
                entityId: user.id,
                description: `User role updated to ${user.role}.`,
                metadata: { role: user.role },
            });

            // Return updated user and profile, with new tokens (since token embeds role)
            const tokens: TokenPair = generateTokenPair(user.id, user.email, user.role);

            const userResponse: UserResponse = {
                id: user.id,
                email: user.email,
                role: user.role,
                isVerified: user.is_verified,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
            };

            const profileResponse = this.mapProfileToResponse(profile);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: userResponse,
                profile: profileResponse,
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof AuthError) {
                throw error;
            }

            console.error('Role update error:', error);
            throw new AuthError('Failed to update role. Please try again.', 500, 'ROLE_UPDATE_FAILED');
        }
    }

    /**
     * Send verification email to user
     * Generates a 6-digit OTP and sends branded email
     */
    async sendVerificationEmail(userId: string): Promise<EmailVerificationResponse> {
        // Find user
        const user = await User.findByPk(userId);

        if (!user) {
            throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
        }

        if (user.email_verified) {
            return {
                success: true,
                message: 'Email is already verified.',
                emailVerified: true,
            };
        }

        // Check for 2-minute cooldown
        if (
            user.email_verification_token_expires &&
            user.email_verification_token_expires.getTime() > Date.now() + 8 * 60 * 1000
        ) {
            throw new AuthError('Please wait before requesting a new OTP.', 429, 'RATE_LIMIT_EXCEEDED');
        }

        // Generate verification OTP
        const { otp, hashedOtp } = generateNumericOTP(6);

        // Set token expiration (10 minutes from now)
        const tokenExpires = new Date(Date.now() + 10 * 60 * 1000);

        // Store hashed token in database
        await user.update({
            email_verification_token_hash: hashedOtp,
            email_verification_token_expires: tokenExpires,
        });

        // Send verification email
        const emailSent = await emailService.sendVerificationEmail(user.email, otp);

        if (!emailSent) {
            console.warn('Failed to send verification email, but OTP was generated');
        }

        return {
            success: true,
            message: 'Verification email sent. Please check your inbox.',
            emailVerified: false,
        };
    }

    /**
     * Verify user email using OTP
     * Called when user enters the 6-digit OTP
     */
    async verifyEmail(userId: string, otp: string): Promise<EmailVerificationResponse> {
        const trimmedOtp = otp.trim();
        const hashedOtp = hashToken(trimmedOtp);

        // Find user matching the userId
        const user = await User.findByPk(userId, {
            include: [{ model: Profile, as: 'profile' }],
        });

        if (!user) {
            throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
        }

        // Verify OTP matches
        if (user.email_verification_token_hash !== hashedOtp) {
            throw new AuthError('Invalid verification OTP', 400, 'INVALID_VERIFICATION_TOKEN');
        }

        // Check token expiration
        if (!user.email_verification_token_expires || user.email_verification_token_expires < new Date()) {
            throw new AuthError('Verification OTP has expired. Please request a new one.', 400, 'VERIFICATION_TOKEN_EXPIRED');
        }

        // Mark email as verified and clear token
        await user.update({
            email_verified: true,
            email_verification_token_hash: null,
            email_verification_token_expires: null,
        });

        console.log('✅ Email verified for user:', user.email);

        return {
            success: true,
            message: 'Email verified successfully! You can now complete your profile verification.',
            emailVerified: true,
        };
    }

    /**
     * Change user password
     * Validates current password and updates to new password
     */
    async changePassword(
        userId: string,
        input: ChangePasswordRequest
    ): Promise<AuthSuccessResponse> {
        // Find user
        const user = await User.findByPk(userId);

        if (!user) {
            throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(input.currentPassword);
        if (!isPasswordValid) {
            throw new AuthError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
        }

        // Verify new password is different from current password
        const isSamePassword = await user.comparePassword(input.newPassword);
        if (isSamePassword) {
            throw new AuthError('New password must be different from current password', 400, 'SAME_PASSWORD');
        }

        // Update password (will be hashed by beforeUpdate hook)
        await user.update({
            password_hash: input.newPassword,
        });

        console.log('✅ Password changed successfully for user:', user.email);

        return {
            success: true,
            message: 'Password changed successfully.',
        };
    }

    /**
     * Set (replace) user habits
     * Resolves habit names → IDs, then replaces the user's habits atomically
     */
    async setUserHabits(
        userId: string,
        habitNames: string[]
    ): Promise<{ success: boolean; message: string; habits: { id: string; name: string }[] }> {
        const transaction = await sequelize.transaction();

        try {
            const user = await User.findByPk(userId, { transaction });
            if (!user) {
                throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
            }

            // Remove all existing habits
            await UserHabit.destroy({ where: { user_id: userId }, transaction });

            if (habitNames.length === 0) {
                await transaction.commit();
                return {
                    success: true,
                    message: 'Habits cleared successfully',
                    habits: [],
                };
            }

            // Resolve habit names to records
            const habits = await Habit.findAll({
                where: { name: habitNames },
                transaction,
            });

            const foundNames = habits.map((h) => h.name);
            const missing = habitNames.filter((n) => !foundNames.includes(n));
            if (missing.length > 0) {
                throw new AuthError(
                    `Unknown habit(s): ${missing.join(', ')}`,
                    400,
                    'INVALID_HABIT_NAMES'
                );
            }

            // Create new associations
            await UserHabit.bulkCreate(
                habits.map((h) => ({ user_id: userId, habit_id: h.id })),
                { transaction }
            );

            await transaction.commit();

            return {
                success: true,
                message: 'Habits updated successfully',
                habits: habits.map((h) => ({ id: h.id, name: h.name })),
            };
        } catch (error) {
            await transaction.rollback();
            if (error instanceof AuthError) throw error;
            console.error('Set habits error:', error);
            throw new AuthError('Failed to update habits', 500, 'HABITS_UPDATE_FAILED');
        }
    }

    /**
     * Get user habits
     */
    async getUserHabits(
        userId: string
    ): Promise<{ success: boolean; habits: { id: string; name: string }[] }> {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
        }

        const userHabits = await UserHabit.findAll({
            where: { user_id: userId },
        });

        const habitIds = userHabits.map((uh) => uh.habit_id);

        if (habitIds.length === 0) {
            return { success: true, habits: [] };
        }

        const habits = await Habit.findAll({
            where: { id: habitIds },
            attributes: ['id', 'name'],
            order: [['name', 'ASC']],
        });

        return {
            success: true,
            habits: habits.map((h) => ({ id: h.id, name: h.name })),
        };
    }

    /**
     * Get the user's structured roommate lifestyle habits.
     */
    async getLifestyleHabits(userId: string): Promise<{ success: boolean; lifestyle_habits: Record<string, number> | null }> {
        const profile = await Profile.findOne({ where: { user_id: userId } });
        if (!profile) {
            throw new AuthError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        }
        return { success: true, lifestyle_habits: (profile.lifestyle_habits as Record<string, number>) || null };
    }

    /**
     * Replace the user's structured roommate lifestyle habits.
     */
    async setLifestyleHabits(
        userId: string,
        habits: Record<string, number>
    ): Promise<{ success: boolean; message: string; lifestyle_habits: Record<string, number> }> {
        const profile = await Profile.findOne({ where: { user_id: userId } });
        if (!profile) {
            throw new AuthError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        const allowed = ['sleep', 'clean', 'social', 'noise', 'smoke', 'pets', 'cook', 'work'];
        const sanitized: Record<string, number> = {};
        for (const key of allowed) {
            const v = habits?.[key];
            if (typeof v !== 'number' || v < 0 || v > 2) {
                throw new AuthError(`Invalid lifestyle habit value for "${key}"`, 400, 'INVALID_LIFESTYLE_HABITS');
            }
            sanitized[key] = Math.round(v);
        }

        await profile.update({ lifestyle_habits: sanitized });
        return { success: true, message: 'Lifestyle habits updated successfully', lifestyle_habits: sanitized };
    }

    /**
     * Permanently delete the authenticated user and profile when there are no
     * properties, rental requests, or contracts tied to the account.
     */
    async deleteAccount(userId: string): Promise<AuthSuccessResponse> {
        const user = await User.findByPk(userId);

        if (!user) {
            throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
        }

        if (user.role === UserRole.ADMIN) {
            throw new AuthError(
                'Administrator accounts cannot be deleted here.',
                403,
                'FORBIDDEN'
            );
        }

        const [propertyCount, rentalRequestCount, contractCount] = await Promise.all([
            Property.count({ where: { landlord_id: userId } }),
            RentalRequest.count({ where: { tenant_id: userId } }),
            Contract.count({
                where: {
                    [Op.or]: [{ landlord_id: userId }, { tenant_id: userId }],
                },
            }),
        ]);

        if (propertyCount > 0 || rentalRequestCount > 0 || contractCount > 0) {
            const blockers: AccountDeleteBlockers = {
                propertyCount,
                rentalRequestCount,
                contractCount,
            };
            const parts: string[] = [];
            if (propertyCount > 0) {
                parts.push(
                    `${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} (as landlord)`
                );
            }
            if (rentalRequestCount > 0) {
                parts.push(
                    `${rentalRequestCount} rental request${rentalRequestCount === 1 ? '' : 's'}`
                );
            }
            if (contractCount > 0) {
                parts.push(`${contractCount} contract${contractCount === 1 ? '' : 's'}`);
            }
            throw new AuthError(
                `Your account cannot be deleted while it still has: ${parts.join(', ')}. Remove or resolve these first, then try again.`,
                409,
                'ACCOUNT_HAS_DEPENDENCIES',
                blockers
            );
        }

        const transaction = await sequelize.transaction();

        try {
            await UserHabit.destroy({ where: { user_id: userId }, transaction });
            await Profile.destroy({ where: { user_id: userId }, transaction });
            await user.destroy({ force: true, transaction });

            await transaction.commit();

            console.log('✅ Account permanently deleted for user id:', userId);

            return {
                success: true,
                message: 'Your account has been permanently deleted.',
            };
        } catch (error) {
            await transaction.rollback();
            if (error instanceof AuthError) throw error;
            console.error('Delete account error:', error);
            throw new AuthError('Failed to delete account', 500, 'DELETE_ACCOUNT_FAILED');
        }
    }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
