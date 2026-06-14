import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { AuthService, AuthError } from '../../../../src/modules/auth/services/auth.service.js';
import { User, Profile, sequelize } from '../../../../src/modules/auth/models/index.js';
import { generateTokenPair } from '../../../../src/shared/utils/jwt.util.js';
import { generateSecureToken, hashToken } from '../../../../src/shared/utils/encryption.util.js';
import { emailService } from '../../../../src/shared/services/email.service.js';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('axios');
vi.mock('../../../../src/modules/auth/models/index.js', () => ({
    sequelize: { transaction: vi.fn() },
    User: { findOne: vi.fn(), create: vi.fn(), findByPk: vi.fn() },
    Profile: { findOne: vi.fn(), create: vi.fn() },
    UserPasskey: { count: vi.fn().mockResolvedValue(0), destroy: vi.fn(), findAll: vi.fn(), findOne: vi.fn(), create: vi.fn() },
    UserRole: { ADMIN: 'ADMIN', LANDLORD: 'LANDLORD', TENANT: 'TENANT', MAINTENANCE_PROVIDER: 'MAINTENANCE_PROVIDER' },
    Habit: {},
    UserHabit: { destroy: vi.fn(), bulkCreate: vi.fn(), findAll: vi.fn() },
}));

vi.mock('../../../../src/shared/utils/jwt.util.js', () => ({
    generateTokenPair: vi.fn(),
}));

vi.mock('../../../../src/shared/utils/encryption.util.js', () => ({
    generateSecureToken: vi.fn(),
    hashToken: vi.fn(),
}));

vi.mock('../../../../src/shared/services/email.service.js', () => ({
    emailService: {
        sendVerificationEmail: vi.fn(),
        sendPasswordResetEmail: vi.fn(),
        sendWelcomeEmail: vi.fn(),
    },
}));

/**
 * Creates a mock Sequelize model instance for User/Profile.
 */
const sequelizeMock = (data: any = {}) => ({
    id: 'mock-id',
    ...data,
    update: vi.fn().mockImplementation(function (this: any, updates: any) {
        Object.assign(this, updates);
        return Promise.resolve(this);
    }),
    reload: vi.fn().mockResolvedValue(undefined),
    comparePassword: vi.fn(),
    toJSON: vi.fn().mockReturnValue(data),
    isVerificationComplete: vi.fn().mockReturnValue(true),
    getDecryptedNationalId: vi.fn().mockImplementation(function (this: any) {
        if (!this.national_id) return null;
        if (this.national_id.includes(':')) {
            const parts = this.national_id.split(':');
            return parts[parts.length - 1];
        }
        return this.national_id;
    }),
});

describe('AuthService', () => {
    let authService: AuthService;
    const mockTx = { commit: vi.fn(), rollback: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
        authService = new AuthService();
        vi.mocked(sequelize.transaction).mockResolvedValue(mockTx as any);
    });

    // ── register ───────────────────────────────────────────────────────────
    describe('register', () => {
        const regInput: any = {
            email: 'test@example.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            phone: '0123456789',
            role: 'TENANT',
        };

        it('should throw if email already exists', async () => {
            vi.mocked(User.findOne).mockResolvedValue({ id: 'existing' } as any);
            await expect(authService.register(regInput)).rejects.toMatchObject({ code: 'EMAIL_EXISTS' });
            expect(mockTx.rollback).toHaveBeenCalled();
        });

        it('should throw if phone already exists', async () => {
            vi.mocked(User.findOne).mockResolvedValue(null);
            vi.mocked(Profile.findOne).mockResolvedValue({ id: 'existing' } as any);
            await expect(authService.register(regInput)).rejects.toMatchObject({ code: 'PHONE_EXISTS' });
        });

        it('should register user successfully', async () => {
            vi.mocked(User.findOne).mockResolvedValue(null);
            vi.mocked(Profile.findOne).mockResolvedValue(null);
            vi.mocked(User.create).mockResolvedValue({
                id: 'u1',
                role: 'TENANT',
                email: 'test@example.com',
            } as any);
            vi.mocked(Profile.create).mockResolvedValue({ id: 'p1' } as any);

            const res = await authService.register(regInput);
            expect(res.success).toBe(true);
            expect(mockTx.commit).toHaveBeenCalled();
            expect(User.create).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'test@example.com' }),
                expect.any(Object)
            );
        });
    });

    // ── login ──────────────────────────────────────────────────────────────
    describe('login', () => {
        const loginInput = { identifier: 'test@example.com', password: 'password123' };

        it('should throw if user not found', async () => {
            vi.mocked(User.findOne).mockResolvedValue(null);
            await expect(authService.login(loginInput)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
        });

        it('should throw if password incorrect', async () => {
            const user = sequelizeMock({ id: 'u1' });
            user.comparePassword.mockResolvedValue(false);
            vi.mocked(User.findOne).mockResolvedValue(user as any);

            await expect(authService.login(loginInput)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
        });

        it('should login successfully and return tokens', async () => {
            const profile = sequelizeMock({ id: 'p1', user_id: 'u1' });
            const user = sequelizeMock({ 
                id: 'u1', 
                email: 'test@example.com', 
                role: 'TENANT', 
                profile 
            });
            user.comparePassword.mockResolvedValue(true);
            vi.mocked(User.findOne).mockResolvedValue(user as any);
            vi.mocked(generateTokenPair).mockReturnValue({ accessToken: 'at', refreshToken: 'rt' });

            const res = await authService.login(loginInput);
            expect(res.accessToken).toBe('at');
            expect(res.user.id).toBe('u1');
        });
    });

    // ── completeVerification ────────────────────────────────────────────────
    describe('completeVerification', () => {
        it('should throw if email not verified', async () => {
            const user = sequelizeMock({ id: 'u1', email_verified: false });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            await expect(authService.completeVerification('u1', {} as any)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
        });

        it('should complete verification successfully', async () => {
            const profile = sequelizeMock({ id: 'p1' });
            profile.isVerificationComplete = vi.fn().mockReturnValue(false);
            const user = sequelizeMock({ id: 'u1', email_verified: true, profile });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            const res = await authService.completeVerification('u1', {
                nationalId: '29001011234567',
                gender: 'MALE',
                birthdate: '1990-01-01',
            });
            expect(res.success).toBe(true);
            expect(profile.update).toHaveBeenCalled();
            expect(user.update).not.toHaveBeenCalled();
            expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
        });
    });

    // ── forgotPassword ─────────────────────────────────────────────────────
    describe('forgotPassword', () => {
        it('should generate token and send email', async () => {
            const user = sequelizeMock({ email: 'test@example.com' });
            vi.mocked(User.findOne).mockResolvedValue(user as any);
            vi.mocked(generateSecureToken).mockReturnValue({ token: 'raw', hashedToken: 'hashed' });
            vi.mocked(emailService.sendPasswordResetEmail).mockResolvedValue(true);

            const res = await authService.forgotPassword({ email: 'test@example.com' });
            expect(res.success).toBe(true);
            expect(user.update).toHaveBeenCalledWith(
                expect.objectContaining({ reset_token_hash: 'hashed' })
            );
            expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'raw');
        });
    });

    // ── googleLogin ────────────────────────────────────────────────────────
    describe('loginWithGoogle', () => {
        it('should auto-register new Google user', async () => {
            vi.mocked(axios.get).mockResolvedValue({
                data: { email: 'google@example.com', given_name: 'G', family_name: 'User' }
            });
            vi.mocked(User.findOne).mockResolvedValue(null); // New user
            const profile = sequelizeMock({ id: 'gp1' });
            const user = sequelizeMock({ 
                id: 'gu1', 
                email: 'google@example.com', 
                profile 
            });
            vi.mocked(User.create).mockResolvedValue(user as any);
            vi.mocked(generateTokenPair).mockReturnValue({ accessToken: 'at', refreshToken: 'rt' });

            const res = await authService.loginWithGoogle('google-token');
            expect(User.create).toHaveBeenCalled();
            expect(res.accessToken).toBe('at');
        });
    });

    // ── resetPassword ─────────────────────────────────────────────────────
    describe('resetPassword', () => {
        it('should throw if token is invalid', async () => {
            vi.mocked(hashToken).mockReturnValue('wrong-hash');
            vi.mocked(User.findOne).mockResolvedValue(null);

            await expect(authService.resetPassword({ token: 't', newPassword: 'p' })).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
        });

        it('should reset password successfully', async () => {
            vi.mocked(hashToken).mockReturnValue('hashed');
            const user = sequelizeMock({ reset_token_expires: new Date(Date.now() + 10000) });
            vi.mocked(User.findOne).mockResolvedValue(user as any);

            const res = await authService.resetPassword({ token: 't', newPassword: 'new-p' });
            expect(res.success).toBe(true);
            expect(user.update).toHaveBeenCalledWith(
                expect.objectContaining({ password_hash: 'new-p' })
            );
        });
    });

    // ── getCurrentUser ─────────────────────────────────────────────────────
    describe('getCurrentUser', () => {
        it('should return user and profile', async () => {
            const profile = sequelizeMock({ id: 'p1' });
            const user = sequelizeMock({ id: 'u1', profile });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            const res = await authService.getCurrentUser('u1');
            expect(res.user.id).toBe('u1');
            expect(res.profile.id).toBe('p1');
            expect(res.passkeyEnabled).toBe(false);
        });

        it('should correctly decrypt and mask the national ID', async () => {
            const profile = sequelizeMock({
                id: 'p1',
                national_id: 'mockiv:mocktag:29001011234567',
            });
            const user = sequelizeMock({ id: 'u1', profile });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            const res = await authService.getCurrentUser('u1');
            expect(res.profile.maskedNationalId).toBe('29**********67');
        });
    });

    // ── updateProfile ──────────────────────────────────────────────────────
    describe('updateProfile', () => {
        it('should update profile fields', async () => {
            const profile = sequelizeMock({ id: 'p1' });
            const user = sequelizeMock({ id: 'u1', profile });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            const res = await authService.updateProfile('u1', { firstName: 'Jane' });
            expect(profile.update).toHaveBeenCalledWith(
                expect.objectContaining({ first_name: 'Jane' }),
                expect.any(Object)
            );
            expect(res.profile.firstName).toBe('Jane');
        });

        it('rejects phone number already used by another account', async () => {
            const profile = sequelizeMock({ id: 'p1', phone_number: '+1000000001' });
            const user = sequelizeMock({ id: 'u1', profile });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);
            vi.mocked(Profile.findOne).mockResolvedValue({ id: 'p2', user_id: 'u2', phone_number: '+2000000002' } as any);

            await expect(authService.updateProfile('u1', { phone: '+2000000002' })).rejects.toMatchObject({
                code: 'PHONE_EXISTS',
            });
            expect(profile.update).not.toHaveBeenCalled();
        });

        it('allows updating phone when the number is not taken', async () => {
            const profile = sequelizeMock({ id: 'p1', phone_number: '+1000000001' });
            const user = sequelizeMock({ id: 'u1', profile });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);
            vi.mocked(Profile.findOne).mockResolvedValue(null);

            await authService.updateProfile('u1', { phone: '+1999999999' });
            expect(profile.update).toHaveBeenCalledWith(
                expect.objectContaining({ phone_number: '+1999999999' }),
                expect.any(Object)
            );
        });

        it('sends welcome email once when completing onboarding step 3 for the first time', async () => {
            const profile = sequelizeMock({
                id: 'p1',
                first_name: 'Jane',
                onboarding_step3_completed: false,
            });
            profile.isVerificationComplete = vi.fn().mockReturnValue(true);
            const user = sequelizeMock({
                id: 'u1',
                email: 'jane@example.com',
                email_verified: true,
                role: 'TENANT',
                profile,
            });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            await authService.updateProfile('u1', {
                onboardingStep3Complete: true,
                preferredBudgetMin: 500,
                preferredBudgetMax: 2000,
                tenantRentalPreferences: { employment: 'Employed' },
            } as any);

            expect(emailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
            expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('jane@example.com', 'Jane');
        });

        it('does not send welcome email again when step 3 was already completed', async () => {
            const profile = sequelizeMock({
                id: 'p1',
                first_name: 'Jane',
                onboarding_step3_completed: true,
            });
            profile.isVerificationComplete = vi.fn().mockReturnValue(true);
            const user = sequelizeMock({
                id: 'u1',
                email: 'jane@example.com',
                email_verified: true,
                role: 'TENANT',
                profile,
            });
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            await authService.updateProfile('u1', {
                onboardingStep3Complete: true,
                preferredBudgetMin: 600,
                preferredBudgetMax: 2200,
                tenantRentalPreferences: { employment: 'Student' },
            } as any);

            expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
        });
    });

    // ── changePassword ─────────────────────────────────────────────────────
    describe('changePassword', () => {
        it('should throw if current password incorrect', async () => {
            const user = sequelizeMock({ id: 'u1' });
            user.comparePassword.mockResolvedValue(false);
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            await expect(authService.changePassword('u1', { currentPassword: 'c', newPassword: 'n' }))
                .rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
        });

        it('should change password successfully', async () => {
            const user = sequelizeMock({ id: 'u1' });
            // First call for current password, second call for "is it same as new"
            user.comparePassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
            vi.mocked(User.findByPk).mockResolvedValue(user as any);

            const res = await authService.changePassword('u1', { currentPassword: 'c', newPassword: 'new-n' });
            expect(res.success).toBe(true);
            expect(user.update).toHaveBeenCalledWith({ password_hash: 'new-n' });
        });
    });
});
