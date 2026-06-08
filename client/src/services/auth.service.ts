//client\src\services\auth.service.ts
import axios from 'axios';
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
    AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import apiClient from '../config/api';
import { notifyAccessTokenChanged } from '../lib/auth-events';
import socketService from './socket.service';
import type {
    RegisterRequest,
    CheckSignupAvailabilityResponse,
    LoginRequest,
    LoginResponse,
    AuthSuccessResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    CompleteVerificationRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
    UserProfileResponse,
    EmailVerificationResponse,
    MaintenanceApplyRequest,
    MaintenanceAvailabilityResponse,
} from '../types/auth.types';

const REFRESH_VIA_COOKIE = 'refreshViaCookie';

/** One shared request per token (React Strict Mode runs effects twice; 2nd call must not re-verify after DB clears). */
const verifyEmailInFlight = new Map<string, Promise<EmailVerificationResponse>>();

function parseJwtExpMs(accessToken: string): number | null {
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1])) as { exp?: number };
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

/** HOMi access tokens encode `userId` (see server jwt.util). Used to detect stale cached user vs JWT. */
function parseJwtUserId(accessToken: string): string | null {
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1])) as { userId?: string };
        return typeof payload.userId === 'string' ? payload.userId : null;
    } catch {
        return null;
    }
}

function isAccessTokenValid(accessToken: string): boolean {
    const expMs = parseJwtExpMs(accessToken);
    if (expMs === null) return false;
    return Date.now() < expMs - 10_000;
}

/**
 * Store tokens after login/register — aligns session storage with Remember me (httpOnly cookie vs body).
 */
function persistLoginSession(data: LoginResponse, rememberMe: boolean): void {
    localStorage.setItem('accessToken', data.accessToken);
    notifyAccessTokenChanged();

    if (data.refreshToken) {
        sessionStorage.setItem('refreshToken', data.refreshToken);
        localStorage.removeItem('refreshToken');
        localStorage.removeItem(REFRESH_VIA_COOKIE);
    } else if (rememberMe) {
        sessionStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshToken');
        localStorage.setItem(REFRESH_VIA_COOKIE, '1');
    } else {
        sessionStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem(REFRESH_VIA_COOKIE);
    }

    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('profile', JSON.stringify(data.profile));

    if (typeof data.passkeyEnabled === 'boolean') {
        localStorage.setItem('passkeyEnabled', data.passkeyEnabled ? '1' : '0');
    }
    socketService.resetAuthState();
}

/**
 * Authentication Service
 * Handles all auth-related API calls
 * NOTE: apiClient baseURL should include /api (e.g. http://localhost:3000/api),
 * so paths here are relative to /api (e.g. '/auth/login' → /api/auth/login)
 */
class AuthService {
    /**
     * Decide where a user should land after auth/restore.
     * Incomplete profiles must finish onboarding before any dashboard.
     */
    resolvePostAuthRoute(source?: {
        user?: { role?: string | null; emailVerified?: boolean | null };
        profile?: {
            isVerificationComplete?: boolean | null;
            onboardingStep2Completed?: boolean | null;
            onboardingStep3Completed?: boolean | null;
            onboardingStep3Skipped?: boolean | null;
        };
        isNewUser?: boolean;
    }): string {
        const cached = source ?? this.getCurrentUser() ?? undefined;
        const role = cached?.user?.role;
        const hasAppRole = role === 'LANDLORD' || role === 'TENANT' || role === 'ADMIN' || role === 'MAINTENANCE_PROVIDER';
        const isVerificationComplete = cached?.profile?.isVerificationComplete ?? false;
        const emailVerified = cached?.user?.emailVerified ?? false;
        const authProvider =
            typeof localStorage !== 'undefined' ? localStorage.getItem('authProvider') : null;
        const onboarding2Done = cached?.profile?.onboardingStep2Completed === true;
        const onboarding3Done = cached?.profile?.onboardingStep3Completed === true;
        const onboarding3Skipped = cached?.profile?.onboardingStep3Skipped === true;

        if ((source as { isNewUser?: boolean } | undefined)?.isNewUser) return '/complete-profile';

        if (!hasAppRole) return '/complete-profile';

        if (authProvider === 'email' && !emailVerified && role !== 'MAINTENANCE_PROVIDER') return '/verify-email';

        if (!isVerificationComplete && (role === 'TENANT' || role === 'LANDLORD')) return '/complete-profile';

        if ((role === 'TENANT' || role === 'LANDLORD') && !onboarding2Done) {
            return '/complete-profile';
        }

        if ((role === 'TENANT' || role === 'LANDLORD') && !onboarding3Done && !onboarding3Skipped) {
            return '/complete-profile';
        }

        if (role === 'ADMIN') return '/admin/dashboard';
        if (role === 'LANDLORD') return '/landlord-home';
        if (role === 'TENANT') return '/tenant-home';
        if (role === 'MAINTENANCE_PROVIDER') return '/maintenance-home';

        return '/complete-profile';
    }

    /**
     * Register a new user
     */
    async register(data: RegisterRequest): Promise<AuthSuccessResponse> {
        const response = await apiClient.post<AuthSuccessResponse>('/auth/register', data);
        return response.data;
    }

    async checkSignupAvailability(data: {
        email?: string;
        phone?: string;
    }): Promise<CheckSignupAvailabilityResponse> {
        const response = await apiClient.post<CheckSignupAvailabilityResponse>(
            '/auth/check-signup-availability',
            data
        );
        return response.data;
    }

    /**
     * Login with email/phone and password
     */
    async login(data: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/login', data);

        if (response.data.accessToken) {
            persistLoginSession(response.data, data.rememberMe === true);
            localStorage.setItem('authProvider', 'email');
        }

        return response.data;
    }

    async maintenanceApply(data: MaintenanceApplyRequest): Promise<AuthSuccessResponse> {
        const response = await apiClient.post<AuthSuccessResponse>('/auth/maintenance/apply', data);
        return response.data;
    }

    async maintenanceLogin(data: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/maintenance/login', data);
        if (response.data.accessToken) {
            persistLoginSession(response.data, data.rememberMe === true);
            localStorage.setItem('authProvider', 'email');
        }
        return response.data;
    }

    async checkMaintenanceAvailability(data: { email?: string; phone?: string }): Promise<MaintenanceAvailabilityResponse> {
        const response = await apiClient.post<MaintenanceAvailabilityResponse>('/auth/maintenance/check-availability', data);
        return response.data;
    }

    /**
     * Drop tokens and cached user without calling the server (e.g. JWT valid but user row deleted after DB reset).
     */
    clearLocalAuthState(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem(REFRESH_VIA_COOKIE);
        sessionStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        localStorage.removeItem('authProvider');
        localStorage.removeItem('passkeyEnabled');
        socketService.disconnect();
        socketService.resetAuthState();
        notifyAccessTokenChanged();
    }

    /**
     * Logout — clears httpOnly refresh cookie on the server and local session data
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post('/auth/logout', {});
        } catch {
            // Still clear client state if the network fails
        }
        this.clearLocalAuthState();
    }

    /**
     * Get current user data from localStorage
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        const profileStr = localStorage.getItem('profile');

        if (!userStr) {
            return null;
        }

        return {
            user: JSON.parse(userStr),
            profile: profileStr ? JSON.parse(profileStr) : null,
        };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!localStorage.getItem('accessToken');
    }

    /**
     * True when an access token exists and its JWT role is TENANT.
     * Use instead of cached localStorage `user.role` so we do not call tenant-only APIs without a token
     * or when profile cache is stale vs the JWT (avoids 401 spam on /maintenance/tenant/awaiting-confirmation).
     */
    isTenantSession(): boolean {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
            return payload.role === 'TENANT';
        } catch {
            return false;
        }
    }

    /**
     * Restore a logged-in session: valid access JWT, or refresh via cookie / stored refresh token.
     * Use on /auth (redirect away) and in AuthGuard before treating the user as logged out.
     */
    async tryRestoreSession(): Promise<boolean> {
        const token = localStorage.getItem('accessToken');

        if (token && isAccessTokenValid(token)) {
            try {
                await this.getProfile();
                return !!this.getCurrentUser();
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    const code = error.response?.data?.code as string | undefined;
                    const status = error.response?.status;
                    if (status === 404 && code === 'USER_NOT_FOUND') {
                        this.clearLocalAuthState();
                        return false;
                    }
                    if (status === 500 && code === 'PROFILE_NOT_FOUND') {
                        this.clearLocalAuthState();
                        return false;
                    }
                }
                const jwtUserId = parseJwtUserId(token);
                const fallback = this.getCurrentUser();
                if (fallback?.user?.id && jwtUserId === fallback.user.id) {
                    return true;
                }
                localStorage.removeItem('accessToken');
                notifyAccessTokenChanged();
                return false;
            }
        }

        const refreshViaCookie = localStorage.getItem(REFRESH_VIA_COOKIE) === '1';
        const refreshToken =
            sessionStorage.getItem('refreshToken') ?? localStorage.getItem('refreshToken');

        if (!refreshViaCookie && !refreshToken) {
            if (token) {
                localStorage.removeItem('accessToken');
                notifyAccessTokenChanged();
            }
            return false;
        }

        try {
            const base = apiClient.defaults.baseURL?.replace(/\/$/, '') ?? '';
            const body = refreshViaCookie ? {} : { refreshToken };
            const { data } = await axios.post<{ accessToken: string }>(
                `${base}/auth/refresh`,
                body,
                { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
            );
            localStorage.setItem('accessToken', data.accessToken);
            notifyAccessTokenChanged();
            // Always re-fetch profile after refresh: stored user JSON may belong to a different
            // account than the refresh cookie / token (e.g. leftover localStorage + another user's "Remember me").
            try {
                await this.getProfile();
                return !!this.getCurrentUser();
            } catch (error) {
                if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 404 &&
                    error.response?.data?.code === 'USER_NOT_FOUND'
                ) {
                    this.clearLocalAuthState();
                    return false;
                }
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                localStorage.removeItem('profile');
                localStorage.removeItem('passkeyEnabled');
                notifyAccessTokenChanged();
                return false;
            }
        } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem(REFRESH_VIA_COOKIE);
            sessionStorage.removeItem('refreshToken');
            localStorage.removeItem('refreshToken');
            notifyAccessTokenChanged();
            return false;
        }
    }

    /**
     * Get current user profile from API
     */
    async getProfile(): Promise<UserProfileResponse> {
        const response = await apiClient.get<UserProfileResponse>('/auth/me');

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('profile', JSON.stringify(response.data.profile));
        localStorage.setItem('passkeyEnabled', response.data.passkeyEnabled ? '1' : '0');

        return response.data;
    }

    /**
     * Complete verification
     */
    async completeVerification(data: CompleteVerificationRequest): Promise<AuthSuccessResponse> {
        const response = await apiClient.post<AuthSuccessResponse>('/auth/complete-verification', data);

        // Refresh user data after completing verification
        await this.getProfile();

        return response.data;
    }

    /**
     * Skip optional onboarding step 3 (server-tracked; account stays partially verified).
     */
    async skipOnboardingStep3(): Promise<AuthSuccessResponse> {
        const response = await apiClient.post<AuthSuccessResponse>('/auth/onboarding/skip-step3', {});
        await this.getProfile();
        return response.data;
    }

    /**
     * Update user profile
     * Returns the updated UserProfileResponse (user + profile)
     */
    async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
        const response = await apiClient.put<UserProfileResponse>('/auth/profile', data);

        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('profile', JSON.stringify(response.data.profile));
        localStorage.setItem('passkeyEnabled', response.data.passkeyEnabled ? '1' : '0');

        return response.data;
    }

    /**
     * Change password
     */
    async changePassword(data: ChangePasswordRequest): Promise<AuthSuccessResponse> {
        const response = await apiClient.put<AuthSuccessResponse>('/auth/change-password', data);
        return response.data;
    }

    /**
     * Update user role
     */
    async updateRole(data: { role: string }): Promise<LoginResponse> {
        const response = await apiClient.put<LoginResponse>('/auth/role', data);

        if (response.data.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
            notifyAccessTokenChanged();
            if (response.data.refreshToken) {
                sessionStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.removeItem('refreshToken');
                localStorage.removeItem(REFRESH_VIA_COOKIE);
            }
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('profile', JSON.stringify(response.data.profile));
        }

        return response.data;
    }

    /**
     * Request password reset
     */
    async forgotPassword(data: ForgotPasswordRequest): Promise<AuthSuccessResponse> {
        const response = await apiClient.post<AuthSuccessResponse>('/auth/forgot-password', data);
        return response.data;
    }

    /**
     * Reset password with token
     */
    async resetPassword(data: ResetPasswordRequest): Promise<AuthSuccessResponse> {
        const response = await apiClient.post<AuthSuccessResponse>('/auth/reset-password', data);
        return response.data;
    }

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<EmailVerificationResponse> {
        const t = typeof token === 'string' ? token.trim() : String(token).trim();
        if (!t) {
            return Promise.reject(new Error('Verification token is required'));
        }

        const existing = verifyEmailInFlight.get(t);
        if (existing) {
            return existing;
        }

        const request = apiClient
            .get<EmailVerificationResponse>('/auth/verify-email', {
                params: { token: t },
                headers: { Accept: 'application/json' },
            })
            .then((response) => response.data)
            .finally(() => {
                verifyEmailInFlight.delete(t);
            });

        verifyEmailInFlight.set(t, request);
        return request;
    }

    /**
     * Send / resend email verification link
     * Requires the user to be logged in (JWT must be in localStorage)
     */
    async sendVerificationEmail(): Promise<AuthSuccessResponse> {
        const response = await apiClient.post<AuthSuccessResponse>('/auth/send-verification-email');
        return response.data;
    }

    /**
     * Login with Google OAuth
     */
    async loginWithGoogle(googleAccessToken: string, rememberMe = false): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>(
            '/auth/google',
            {
                googleAccessToken,
                rememberMe,
            },
            { timeout: 25_000 }
        );

        if (response.data.accessToken) {
            persistLoginSession(response.data, rememberMe);
            localStorage.setItem('authProvider', 'google');
        }

        return response.data;
    }

    /**
     * Get the authenticated tenant's current habits
     */
    async getUserHabits(): Promise<{ habit_names: string[] }> {
        const response = await apiClient.get<{ habit_names: string[] }>('/auth/habits');
        return response.data;
    }

    /**
     * Replace the authenticated user's habits with the provided list.
     * Pass an empty array to clear all habits.
     * Habit names must exactly match the seeded values (e.g. "Non-smoker", "Early Riser").
     */
    async setHabits(habitNames: string[]): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.put<{ success: boolean; message: string }>('/auth/habits', {
            habit_names: habitNames,
        });
        return response.data;
    }

    /**
     * Get the authenticated tenant's structured roommate lifestyle habits.
     */
    async getLifestyleHabits(): Promise<{ lifestyle_habits: Record<string, number> | null }> {
        const response = await apiClient.get<{ lifestyle_habits: Record<string, number> | null }>('/auth/lifestyle');
        return response.data;
    }

    /**
     * Replace the authenticated user's structured roommate lifestyle habits.
     */
    async setLifestyleHabits(habits: Record<string, number>): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.put<{ success: boolean; message: string }>('/auth/lifestyle', {
            lifestyle_habits: habits,
        });
        return response.data;
    }

    /**
     * Permanently delete the authenticated account (server enforces no properties / requests / contracts).
     * Clears local session on success. Does not call logout — the user row is removed.
     */
    async deleteAccount(): Promise<AuthSuccessResponse> {
        const response = await apiClient.delete<AuthSuccessResponse>('/auth/account');

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem(REFRESH_VIA_COOKIE);
        sessionStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        localStorage.removeItem('authProvider');
        localStorage.removeItem('passkeyEnabled');
        socketService.disconnect();
        socketService.resetAuthState();
        notifyAccessTokenChanged();

        return response.data;
    }

    /** WebAuthn — registration ceremony (authenticated) */
    async getPasskeyRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
        const response = await apiClient.post<PublicKeyCredentialCreationOptionsJSON>(
            '/auth/passkey/registration-options',
            {}
        );
        return response.data;
    }

    async verifyPasskeyRegistration(response: RegistrationResponseJSON): Promise<void> {
        await apiClient.post('/auth/passkey/registration-verify', { response });
        await this.getProfile();
    }

    async getPasskeyAuthenticationOptions(identifier: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
        const res = await apiClient.post<PublicKeyCredentialRequestOptionsJSON>(
            '/auth/passkey/authentication-options',
            { identifier }
        );
        return res.data;
    }

    async verifyPasskeyAuthentication(
        identifier: string,
        response: AuthenticationResponseJSON,
        rememberMe?: boolean
    ): Promise<LoginResponse> {
        const res = await apiClient.post<LoginResponse>('/auth/passkey/authentication-verify', {
            identifier,
            response,
            rememberMe,
        });
        if (res.data.accessToken) {
            persistLoginSession(res.data, rememberMe === true);
        }
        return res.data;
    }

    async deletePasskeys(): Promise<void> {
        await apiClient.delete('/auth/passkeys');
        await this.getProfile();
    }
}

export const authService = new AuthService();
export default authService;
