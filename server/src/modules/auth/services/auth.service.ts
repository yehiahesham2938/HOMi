import { User, Profile, sequelize } from '../../../shared/infrastructure/models/index.js';
import { generateTokenPair, type TokenPair } from '../../../shared/utils/jwt.util.js';
import { generateSecureToken, hashToken } from '../../../shared/utils/encryption.util.js';
import type {
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    CompleteVerificationRequest,
    LoginResponse,
    AuthSuccessResponse,
    ProfileResponse,
    UserResponse,
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
     */
    async login(input: LoginRequest): Promise<LoginResponse> {
        // Find user with profile
        const user = await User.findOne({
            where: { email: input.email.toLowerCase() },
            include: [{ model: Profile, as: 'profile' }],
        });

        if (!user) {
            throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(input.password);
        if (!isPasswordValid) {
            throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Generate tokens
        const tokens: TokenPair = generateTokenPair(user.id, user.email, user.role);

        // Build sanitized response
        const userResponse: UserResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.is_verified,
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
            birthdate: profile.birthdate ? profile.birthdate.toISOString().split('T')[0] ?? null : null,
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
     * Generates reset token and mocks email sending
     */
    async forgotPassword(input: ForgotPasswordRequest): Promise<AuthSuccessResponse> {
        const user = await User.findOne({
            where: { email: input.email.toLowerCase() },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            console.log('📧 [MOCK EMAIL] Forgot password requested for non-existent email:', input.email);
            return {
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.',
            };
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

        // Mock email sending - log to console
        console.log('📧 [MOCK EMAIL] Password reset email sent to:', input.email);
        console.log('📧 [MOCK EMAIL] Reset token:', token);
        console.log('📧 [MOCK EMAIL] Token expires at:', tokenExpires.toISOString());

        return {
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.',
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
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
