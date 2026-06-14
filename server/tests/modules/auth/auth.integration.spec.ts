import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../../src/app.js';
import { generateAccessToken } from '../../../src/shared/utils/jwt.util.js';

// ─── Mock the auth service ────────────────────────────────────────────────────
// We mock the entire service so tests exercise the HTTP layer (routes,
// validation middleware, auth middleware, controller) without touching the DB.

vi.mock('../../../src/modules/auth/services/auth.service.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/modules/auth/services/auth.service.js')>();
    return {
        ...actual, // keep AuthError class intact for error-handler tests
        authService: {
            register: vi.fn(),
            login: vi.fn(),
            refreshAccessToken: vi.fn(),
            completeVerification: vi.fn(),
            forgotPassword: vi.fn(),
            resetPassword: vi.fn(),
            loginWithGoogle: vi.fn(),
            getCurrentUser: vi.fn(),
            updateProfile: vi.fn(),
            changePassword: vi.fn(),
            sendVerificationEmail: vi.fn(),
            verifyEmail: vi.fn(),
        },
    };
});

// Import the mocked service after vi.mock hoisting
const { authService, AuthError } = await import('../../../src/modules/auth/services/auth.service.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a real JWT signed with the dev default secret so the protect middleware passes. */
function makeToken(userId = 'user-1', email = 'test@example.com', role: 'TENANT' | 'LANDLORD' = 'TENANT') {
    return `Bearer ${generateAccessToken({ userId, email, role })}`;
}

const VALID_REGISTER_BODY = {
    email: 'john@example.com',
    password: 'Password1!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '01012345678',
    role: 'TENANT',
};

const VALID_LOGIN_BODY = {
    identifier: 'john@example.com',
    password: 'Password1!',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Auth Integration Tests', () => {

    // ── POST /api/auth/register ──────────────────────────────────────────────
    describe('POST /api/auth/register', () => {
        it('returns 400 when body is empty', async () => {
            const res = await request(app).post('/api/auth/register').send({});
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('VALIDATION_ERROR');
            expect(res.body.errors).toBeInstanceOf(Array);
        });

        it('returns 400 for invalid email', async () => {
            const res = await request(app).post('/api/auth/register').send({
                ...VALID_REGISTER_BODY,
                email: 'not-an-email',
            });
            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: any) => e.field === 'email')).toBe(true);
        });

        it('returns 400 for weak password', async () => {
            const res = await request(app).post('/api/auth/register').send({
                ...VALID_REGISTER_BODY,
                password: 'weakpass',
            });
            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: any) => e.field === 'password')).toBe(true);
        });

        it('returns 400 for invalid role', async () => {
            const res = await request(app).post('/api/auth/register').send({
                ...VALID_REGISTER_BODY,
                role: 'ADMIN',
            });
            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: any) => e.field === 'role')).toBe(true);
        });

        it('returns 201 on successful registration', async () => {
            vi.mocked(authService.register).mockResolvedValue({ success: true } as any);

            const res = await request(app).post('/api/auth/register').send(VALID_REGISTER_BODY);
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(authService.register).toHaveBeenCalledWith(expect.objectContaining({
                email: VALID_REGISTER_BODY.email,
            }));
        });

        it('returns 409 when email already exists', async () => {
            vi.mocked(authService.register).mockRejectedValue(
                new AuthError('Email already registered', 409, 'EMAIL_EXISTS')
            );

            const res = await request(app).post('/api/auth/register').send(VALID_REGISTER_BODY);
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('EMAIL_EXISTS');
        });

        it('returns 409 when phone already exists', async () => {
            vi.mocked(authService.register).mockRejectedValue(
                new AuthError('Phone already registered', 409, 'PHONE_EXISTS')
            );

            const res = await request(app).post('/api/auth/register').send(VALID_REGISTER_BODY);
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('PHONE_EXISTS');
        });
    });

    // ── POST /api/auth/login ─────────────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('returns 400 when body is empty', async () => {
            const res = await request(app).post('/api/auth/login').send({});
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 for missing password', async () => {
            const res = await request(app).post('/api/auth/login').send({ identifier: 'test@example.com' });
            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: any) => e.field === 'password')).toBe(true);
        });

        it('returns 401 for invalid credentials', async () => {
            vi.mocked(authService.login).mockRejectedValue(
                new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
            );

            const res = await request(app).post('/api/auth/login').send(VALID_LOGIN_BODY);
            expect(res.status).toBe(401);
            expect(res.body.code).toBe('INVALID_CREDENTIALS');
        });

        it('returns 200 with tokens on successful login', async () => {
            vi.mocked(authService.login).mockResolvedValue({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 'u1', email: 'john@example.com', role: 'TENANT' },
            } as any);

            const res = await request(app).post('/api/auth/login').send(VALID_LOGIN_BODY);
            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBe('access-token');
            expect(res.body.user.email).toBe('john@example.com');
        });

        it('sets httpOnly refresh cookie and omits refresh token when rememberMe is true', async () => {
            vi.mocked(authService.login).mockResolvedValue({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 'u1', email: 'john@example.com', role: 'TENANT' },
                profile: {} as any,
            } as any);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ ...VALID_LOGIN_BODY, rememberMe: true });
            expect(res.status).toBe(200);
            expect(res.body.refreshToken).toBeUndefined();
            const setCookie = res.headers['set-cookie'];
            expect(setCookie).toBeDefined();
            expect(String(setCookie)).toContain('homi_refresh_token');
        });
    });

    // ── POST /api/auth/refresh ───────────────────────────────────────────────
    describe('POST /api/auth/refresh', () => {
        it('returns 401 when no refresh token in body or cookie', async () => {
            const res = await request(app).post('/api/auth/refresh').send({});
            expect(res.status).toBe(401);
            expect(res.body.code).toBe('NO_REFRESH_TOKEN');
        });

        it('returns 200 with new access token when refresh token is valid', async () => {
            vi.mocked(authService.refreshAccessToken).mockResolvedValue({
                accessToken: 'new-access',
            });

            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'valid-refresh-jwt' });
            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBe('new-access');
            expect(authService.refreshAccessToken).toHaveBeenCalledWith('valid-refresh-jwt');
        });
    });

    // ── POST /api/auth/logout ────────────────────────────────────────────────
    describe('POST /api/auth/logout', () => {
        it('returns 200 and clears refresh cookie', async () => {
            const res = await request(app).post('/api/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const setCookie = res.headers['set-cookie'];
            expect(setCookie).toBeDefined();
            expect(String(setCookie)).toMatch(/homi_refresh_token=/);
        });
    });

    // ── POST /api/auth/complete-verification ─────────────────────────────────
    describe('POST /api/auth/complete-verification', () => {
        const VALID_VERIFICATION_BODY = {
            nationalId: '29901011234567',
            gender: 'MALE',
            birthdate: '1999-01-01',
        };

        it('returns 401 when no token provided', async () => {
            const res = await request(app)
                .post('/api/auth/complete-verification')
                .send(VALID_VERIFICATION_BODY);
            expect(res.status).toBe(401);
        });

        it('returns 400 for validation errors (missing nationalId)', async () => {
            const res = await request(app)
                .post('/api/auth/complete-verification')
                .set('Authorization', makeToken())
                .send({ gender: 'MALE', birthdate: '1999-01-01' });
            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: any) => e.field === 'nationalId')).toBe(true);
        });

        it('returns 400 for invalid gender', async () => {
            const res = await request(app)
                .post('/api/auth/complete-verification')
                .set('Authorization', makeToken())
                .send({ ...VALID_VERIFICATION_BODY, gender: 'OTHER' });
            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: any) => e.field === 'gender')).toBe(true);
        });

        it('returns 200 on successful verification', async () => {
            vi.mocked(authService.completeVerification).mockResolvedValue({ success: true } as any);

            const res = await request(app)
                .post('/api/auth/complete-verification')
                .set('Authorization', makeToken())
                .send(VALID_VERIFICATION_BODY);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 400 if email not yet verified', async () => {
            vi.mocked(authService.completeVerification).mockRejectedValue(
                new AuthError('Email not verified', 400, 'EMAIL_NOT_VERIFIED')
            );

            const res = await request(app)
                .post('/api/auth/complete-verification')
                .set('Authorization', makeToken())
                .send(VALID_VERIFICATION_BODY);
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
        });
    });

    // ── GET /api/auth/me ─────────────────────────────────────────────────────
    describe('GET /api/auth/me', () => {
        it('returns 401 when no token provided', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });

        it('returns 401 for a malformed token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer not.a.valid.token');
            expect(res.status).toBe(401);
        });

        it('returns 200 with user and profile', async () => {
            vi.mocked(authService.getCurrentUser).mockResolvedValue({
                user: { id: 'u1', email: 'test@example.com' },
                profile: { id: 'p1', firstName: 'John' },
            } as any);

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', makeToken());
            expect(res.status).toBe(200);
            expect(res.body.user.id).toBe('u1');
            expect(res.body.profile.firstName).toBe('John');
        });
    });

    // ── PUT /api/auth/profile ────────────────────────────────────────────────
    describe('PUT /api/auth/profile', () => {
        it('returns 401 when no token provided', async () => {
            const res = await request(app).put('/api/auth/profile').send({ firstName: 'Jane' });
            expect(res.status).toBe(401);
        });

        it('returns 200 on successful profile update', async () => {
            vi.mocked(authService.updateProfile).mockResolvedValue({
                user: { id: 'u1' },
                profile: { firstName: 'Jane' },
            } as any);

            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', makeToken())
                .send({ firstName: 'Jane' });
            expect(res.status).toBe(200);
            expect(res.body.profile.firstName).toBe('Jane');
        });
    });

    // ── PUT /api/auth/change-password ────────────────────────────────────────
    describe('PUT /api/auth/change-password', () => {
        const VALID_CHANGE_BODY = {
            currentPassword: 'OldPass1!',
            newPassword: 'NewPass2@',
        };

        it('returns 401 when no token provided', async () => {
            const res = await request(app).put('/api/auth/change-password').send(VALID_CHANGE_BODY);
            expect(res.status).toBe(401);
        });

        it('returns 400 for weak new password', async () => {
            const res = await request(app)
                .put('/api/auth/change-password')
                .set('Authorization', makeToken())
                .send({ currentPassword: 'OldPass1!', newPassword: 'weak' });
            expect(res.status).toBe(400);
        });

        it('returns 401 for incorrect current password', async () => {
            vi.mocked(authService.changePassword).mockRejectedValue(
                new AuthError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD')
            );

            const res = await request(app)
                .put('/api/auth/change-password')
                .set('Authorization', makeToken())
                .send(VALID_CHANGE_BODY);
            expect(res.status).toBe(401);
            expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
        });

        it('returns 200 on successful password change', async () => {
            vi.mocked(authService.changePassword).mockResolvedValue({ success: true } as any);

            const res = await request(app)
                .put('/api/auth/change-password')
                .set('Authorization', makeToken())
                .send(VALID_CHANGE_BODY);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ── POST /api/auth/forgot-password ───────────────────────────────────────
    describe('POST /api/auth/forgot-password', () => {
        it('returns 400 for invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'not-an-email' });
            expect(res.status).toBe(400);
        });

        it('returns 404 when email not found', async () => {
            vi.mocked(authService.forgotPassword).mockRejectedValue(
                new AuthError('No account found with this email', 404, 'EMAIL_NOT_FOUND')
            );

            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'unknown@example.com' });
            expect(res.status).toBe(404);
            expect(res.body.code).toBe('EMAIL_NOT_FOUND');
        });

        it('returns 200 when reset email sent successfully', async () => {
            vi.mocked(authService.forgotPassword).mockResolvedValue({ success: true } as any);

            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'user@example.com' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ── POST /api/auth/reset-password ────────────────────────────────────────
    describe('POST /api/auth/reset-password', () => {
        it('returns 400 when body is missing required fields', async () => {
            const res = await request(app).post('/api/auth/reset-password').send({});
            expect(res.status).toBe(400);
        });

        // Token must be exactly 64 hex chars to pass ResetPasswordSchema validation
        const FAKE_TOKEN = 'a'.repeat(64);

        it('returns 400 for invalid/expired token', async () => {
            vi.mocked(authService.resetPassword).mockRejectedValue(
                new AuthError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN')
            );

            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({ token: FAKE_TOKEN, newPassword: 'NewPass1!' });
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('INVALID_RESET_TOKEN');
        });

        it('returns 200 on successful password reset', async () => {
            vi.mocked(authService.resetPassword).mockResolvedValue({ success: true } as any);

            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({ token: FAKE_TOKEN, newPassword: 'NewPass1!' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ── POST /api/auth/send-verification-email ───────────────────────────────
    describe('POST /api/auth/send-verification-email', () => {
        it('returns 401 when no token provided', async () => {
            const res = await request(app).post('/api/auth/send-verification-email');
            expect(res.status).toBe(401);
        });

        it('returns 200 when email is sent', async () => {
            vi.mocked(authService.sendVerificationEmail).mockResolvedValue({
                success: true,
                emailVerified: false,
            } as any);

            const res = await request(app)
                .post('/api/auth/send-verification-email')
                .set('Authorization', makeToken());
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ── POST /api/auth/verify-email ──────────────────────────────────────────
    describe('POST /api/auth/verify-email', () => {
        it('returns 401 without an access token', async () => {
            const res = await request(app)
                .post('/api/auth/verify-email')
                .send({ otp: '123456' });
            expect(res.status).toBe(401);
        });

        it('returns 400 for invalid/expired OTP', async () => {
            vi.mocked(authService.verifyEmail).mockRejectedValue(
                new AuthError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN')
            );

            const res = await request(app)
                .post('/api/auth/verify-email')
                .set('Authorization', makeToken())
                .send({ otp: '123456' });
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('INVALID_VERIFICATION_TOKEN');
        });

        it('returns 200 on successful email verification', async () => {
            vi.mocked(authService.verifyEmail).mockResolvedValue({ success: true } as any);

            const res = await request(app)
                .post('/api/auth/verify-email')
                .set('Authorization', makeToken())
                .send({ otp: '123456' });
            expect(res.status).toBe(200);
        });
    });

    // ── POST /api/auth/google ────────────────────────────────────────────────
    describe('POST /api/auth/google', () => {
        it('returns 400 when googleAccessToken is missing', async () => {
            const res = await request(app).post('/api/auth/google').send({});
            expect(res.status).toBe(400);
        });

        it('returns 401 for invalid Google token', async () => {
            vi.mocked(authService.loginWithGoogle).mockRejectedValue(
                new AuthError('Invalid Google access token', 401, 'INVALID_GOOGLE_TOKEN')
            );

            const res = await request(app)
                .post('/api/auth/google')
                .send({ googleAccessToken: 'bad-google-token' });
            expect(res.status).toBe(401);
            expect(res.body.code).toBe('INVALID_GOOGLE_TOKEN');
        });

        it('returns 200 with tokens on successful Google login', async () => {
            vi.mocked(authService.loginWithGoogle).mockResolvedValue({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 'gu1', email: 'google@example.com' },
            } as any);

            const res = await request(app)
                .post('/api/auth/google')
                .send({ googleAccessToken: 'valid-google-token' });
            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBe('access-token');
        });
    });

    // ── 404 fallback ─────────────────────────────────────────────────────────
    describe('404 handler', () => {
        it('returns 404 for unknown routes', async () => {
            const res = await request(app).get('/api/auth/does-not-exist');
            expect(res.status).toBe(404);
            expect(res.body.code).toBe('NOT_FOUND');
        });
    });
});
