import axios from 'axios';
import { notifyAccessTokenChanged } from '../lib/auth-events';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with default configuration
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
    withCredentials: true, // httpOnly refresh cookie (Remember me)
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Error codes that are business-logic 401s — NOT token expiration.
// These should never trigger a token refresh or logout.
const BUSINESS_LOGIC_401_CODES = new Set([
    'INVALID_CURRENT_PASSWORD',
    'INVALID_CREDENTIALS',
    'NOT_AUTHENTICATED',   // user intentionally not logged in (handled by caller)
]);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const errorCode: string | undefined = error.response?.data?.code;

        // Only attempt token refresh for real token-expiry 401s.
        // Business-logic 401s (wrong password, etc.) pass straight through.
        const isTokenError =
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !BUSINESS_LOGIC_401_CODES.has(errorCode ?? '');

        if (error.response?.status === 404 && errorCode === 'USER_NOT_FOUND') {
            const { authService } = await import('../services/auth.service');
            authService.clearLocalAuthState();
            const path = globalThis.location.pathname;
            if (path !== '/auth' && !path.startsWith('/auth/')) {
                globalThis.location.href = '/auth';
            }
        }

        if (isTokenError) {
            originalRequest._retry = true;

            try {
                const refreshViaCookie = localStorage.getItem('refreshViaCookie') === '1';
                const refreshToken =
                    sessionStorage.getItem('refreshToken') ?? localStorage.getItem('refreshToken');

                if (refreshViaCookie || refreshToken) {
                    const base = apiClient.defaults.baseURL?.replace(/\/$/, '') ?? '';
                    const body = refreshViaCookie ? {} : { refreshToken };
                    const response = await axios.post<{ accessToken: string }>(
                        `${base}/auth/refresh`,
                        body,
                        {
                            withCredentials: true,
                            headers: { 'Content-Type': 'application/json' },
                        }
                    );

                    const { accessToken } = response.data;
                    localStorage.setItem('accessToken', accessToken);
                    notifyAccessTokenChanged();

                    // Keep cached user/profile aligned with the JWT (same issue as tryRestoreSession refresh path).
                    try {
                        const { authService } = await import('../services/auth.service');
                        await authService.getProfile();
                    } catch {
                        /* Token is still valid for retry; profile sync is best-effort */
                    }

                    // Retry the original request with new token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed — clear session and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('refreshViaCookie');
                sessionStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                localStorage.removeItem('profile');
                notifyAccessTokenChanged();
                globalThis.location.href = '/auth';
                throw refreshError;
            }
        }

        throw error;
    }
);

export default apiClient;
