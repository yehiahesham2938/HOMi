import axios from 'axios';
import { Op } from 'sequelize';
import { User, Profile, sequelize } from '../../../shared/infrastructure/models/index.js';
import { generateTokenPair, type TokenPair } from '../../../shared/utils/jwt.util.js';
import { generateSecureToken, hashToken } from '../../../shared/utils/encryption.util.js';
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
} from '../interfaces/auth.interfaces.js';

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
    constructor(
        message: string,
        public statusCode: number = 400,
        public code: string = 'AUTH_ERROR'
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
                throw new AuthError('Email already registered', 409, 'EMAIL_EXISTS');
            }

            // Check if phone number already exists
            const existingProfile = await Profile.findOne({
                where: { phone_number: input.phone },
                transaction,
            });

            if (existingProfile) {
                throw new AuthError('Phone number already registered', 409, 'PHONE_EXISTS');
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

            // Create profile with only essential fields
            // national_id, gender, birthdate will be filled during verification
            await Profile.create(
                {
                    user_id: user.id,
                    first_name: input.firstName,
                    last_name: input.lastName,
                    phone_number: input.phone,
                    // Verification fields left null
                    national_id: null,
                    gender: null,
                    birthdate: null,
                },
                { transaction }
            );

            // Commit transaction
            await transaction.commit();

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
     * Complete user verification by filling required profile fields
     * Requires email to be verified first
     * Sets is_verified = true after successful completion
     */
    async completeVerification(
        userId: string,
        input: CompleteVerificationRequest
    ): Promise<AuthSuccessResponse> {
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

            if (user.is_verified) {
                throw new AuthError('Account is already verified', 400, 'ALREADY_VERIFIED');
            }

            // Check if email is verified first
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

            // Update profile with verification fields
            await profile.update(
                {
                    national_id: input.nationalId, // Will be encrypted by beforeUpdate hook
                    gender: input.gender,
                    birthdate: new Date(input.birthdate),
                },
                { transaction }
            );

            // Mark user as verified
            await user.update(
                { is_verified: true },
                { transaction }
            );

            await transaction.commit();

            // Send welcome email
            await emailService.sendWelcomeEmail(user.email, profile.first_name);

            return {
                success: true,
                message: 'Verification completed successfully. Your account is now fully verified.',
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
     * Authenticate user and return tokens
     * Note: Unverified users CAN login, but is_verified flag is included in response
     * Identifier can be either email or phone number - auto-detected
     */
    async login(input: LoginRequest): Promise<LoginResponse> {
        // Auto-detect if identifier is email or phone
        // Email contains '@', phone number doesn't
        const isEmail = input.identifier.includes('@');
        let user;

        if (isEmail) {
            // Search by email
            user = await User.findOne({
                where: { email: input.identifier.toLowerCase() },
                include: [{ model: Profile, as: 'profile' }],
            });
        } else {
            // Search by phone number - handle both local and international formats for any country
            const phoneInput = input.identifier.trim();

            let profile;

            if (phoneInput.startsWith('+')) {
                // International format provided (e.g., +201234567890)
                // Search for both:
                // 1. Exact match: +201234567890
                // 2. Local format: extract digits after country code and prefix with 0

                // Extract country code and local number
                const digitsOnly = phoneInput.slice(1); // Remove the '+'

                // Try to intelligently split country code from local number
                // Most country codes are 1-3 digits, mobile numbers typically start after that
                const possibleVariants: string[] = [phoneInput];

                // Generate local variants by trying different country code lengths (1-4 digits)
                for (let i = 1; i <= Math.min(4, digitsOnly.length - 1); i++) {
                    const localPart = digitsOnly.slice(i);
                    if (localPart.length >= 9) { // Ensure reasonable phone number length
                        possibleVariants.push('0' + localPart);
                    }
                }

                profile = await Profile.findOne({
                    where: {
                        phone_number: { [Op.in]: possibleVariants }
                    },
                });
            } else if (phoneInput.startsWith('0')) {

                const digitsAfterZero = phoneInput.slice(1);
                profile = await Profile.findOne({
                    where: {
                        [Op.or]: [
                            { phone_number: phoneInput },
                            { phone_number: { [Op.like]: `+%${digitsAfterZero}` } }
                        ]
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

        if (!user) {
            throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(input.password);
        if (!isPasswordValid) {
            throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        // Generate tokens
        const tokens: TokenPair = generateTokenPair(user.id, user.email, user.role);

        // Build sanitized response
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

        const profileResponse: ProfileResponse = {
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
            preferredBudgetMin: profile.preferred_budget_min ?? null,
            preferredBudgetMax: profile.preferred_budget_max ?? null,
            isVerificationComplete: profile.isVerificationComplete(),
        };

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: userResponse,
            profile: profileResponse,
        };
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

        // Send password reset email using email service
        const emailSent = await emailService.sendPasswordResetEmail(user.email, token);

        if (!emailSent) {
            console.warn('Failed to send password reset email, but token was generated');
        }

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
                }
            );
            googleUser = response.data;
        } catch (error) {
            console.error('Google token verification failed:', error);
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
        if (!user) {
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

        const profileResponse: ProfileResponse = {
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
            preferredBudgetMin: profile.preferred_budget_min ?? null,
            preferredBudgetMax: profile.preferred_budget_max ?? null,
            isVerificationComplete: profile.isVerificationComplete(),
        };

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: userResponse,
            profile: profileResponse,
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

        const profileResponse: ProfileResponse = {
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
            preferredBudgetMin: profile.preferred_budget_min ?? null,
            preferredBudgetMax: profile.preferred_budget_max ?? null,
            isVerificationComplete: profile.isVerificationComplete(),
        };

        return {
            user: userResponse,
            profile: profileResponse,
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

            // Build update object with only provided fields
            const updateData: Partial<{
                first_name: string;
                last_name: string;
                phone_number: string;
                bio: string | null;
                avatar_url: string | null;
                preferred_budget_min: number | null;
                preferred_budget_max: number | null;
            }> = {};

            if (input.firstName !== undefined) updateData.first_name = input.firstName;
            if (input.lastName !== undefined) updateData.last_name = input.lastName;
            if (input.phone !== undefined) updateData.phone_number = input.phone;
            if (input.bio !== undefined) updateData.bio = input.bio;
            if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
            if (input.preferredBudgetMin !== undefined) updateData.preferred_budget_min = input.preferredBudgetMin;
            if (input.preferredBudgetMax !== undefined) updateData.preferred_budget_max = input.preferredBudgetMax;

            // Update profile
            await profile.update(updateData, { transaction });

            await transaction.commit();

            // Return updated user and profile
            const userResponse: UserResponse = {
                id: user.id,
                email: user.email,
                role: user.role,
                isVerified: user.is_verified,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
            };

            const profileResponse: ProfileResponse = {
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
                preferredBudgetMin: profile.preferred_budget_min ?? null,
                preferredBudgetMax: profile.preferred_budget_max ?? null,
                isVerificationComplete: profile.isVerificationComplete(),
            };

            return {
                user: userResponse,
                profile: profileResponse,
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
     * Send verification email to user
     * Generates a token and sends branded email
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

        // Generate verification token
        const { token, hashedToken } = generateSecureToken();

        // Set token expiration (24 hours from now)
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Store hashed token in database
        await user.update({
            email_verification_token_hash: hashedToken,
            email_verification_token_expires: tokenExpires,
        });

        // Send verification email
        const emailSent = await emailService.sendVerificationEmail(user.email, token);

        if (!emailSent) {
            console.warn('Failed to send verification email, but token was generated');
        }

        return {
            success: true,
            message: 'Verification email sent. Please check your inbox.',
            emailVerified: false,
        };
    }

    /**
     * Verify user email using token
     * Called when user clicks the verification link
     */
    async verifyEmail(token: string): Promise<EmailVerificationResponse> {
        // Hash the provided token to compare with stored hash
        const hashedToken = hashToken(token);

        // Find user with matching token
        const user = await User.findOne({
            where: { email_verification_token_hash: hashedToken },
            include: [{ model: Profile, as: 'profile' }],
        });

        if (!user) {
            throw new AuthError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
        }

        // Check token expiration
        if (!user.email_verification_token_expires || user.email_verification_token_expires < new Date()) {
            throw new AuthError('Verification token has expired. Please request a new one.', 400, 'VERIFICATION_TOKEN_EXPIRED');
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
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
