import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../config/api';
import { notifyAccessTokenChanged } from '../../../lib/auth-events';
import './adminLogin.css';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await apiClient.post('/admin/auth/login', { email, password });
            if (response.data.success) {
                const { accessToken, user, profile } = response.data.data;
                localStorage.setItem('accessToken', accessToken);
                notifyAccessTokenChanged();
                localStorage.setItem('user', JSON.stringify(user));
                if (profile) {
                    localStorage.setItem('profile', JSON.stringify(profile));
                } else {
                    localStorage.removeItem('profile');
                }
                navigate('/admin/dashboard');
            }
        } catch (err: unknown) {
            const ex = err as { response?: { data?: { message?: string } } };
            setError(ex.response?.data?.message || 'Authentication failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="al-root">
            {/* Subtle background accent */}
            <div className="al-bg-accent" aria-hidden />

            {/* Left — branding column */}
            <div className="al-left">
                <div className="al-left-inner">
                    {/* Logo */}
                    <div className="al-logo">
                        <img src="/logo.png" alt="HOMi Logo" className="al-logo-image" />
                    </div>

                    {/* Main headline */}
                    <div className="al-left-text">
                        <h1>
                            Control<br />
                            <span>Panel</span>
                        </h1>
                        <p>
                            Manage properties, users, and platform operations from one place. Restricted to authorized administrators only.
                        </p>
                    </div>

                    {/* Feature list */}
                    <ul className="al-feature-list">
                        {[
                            'Property approvals & moderation',
                            'User & landlord management',
                            'Maintenance oversight',
                            'Contracts & rental requests',
                        ].map(f => (
                            <li key={f}>
                                <span className="al-feature-dot" />
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Right — form column */}
            <div className="al-right">
                <div className="al-card">
                    {/* Card header */}
                    <div className="al-card-header">
                        <div className="al-shield-icon" aria-hidden>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2>Administrator Sign In</h2>
                        <p>Enter your credentials to access the admin panel</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="al-error" role="alert">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" style={{ flexShrink: 0 }}>
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="al-form">
                        <div className="al-field">
                            <label htmlFor="al-email">Admin Email</label>
                            <div className="al-input-wrap">
                                <svg className="al-input-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <input
                                    id="al-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@homi.app"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="al-field">
                            <label htmlFor="al-password">Password</label>
                            <div className="al-input-wrap">
                                <svg className="al-input-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <input
                                    id="al-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="al-pw-toggle"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            id="al-submit"
                            type="submit"
                            disabled={loading}
                            className={`al-submit${loading ? ' al-submit--busy' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <span className="al-spinner" />
                                    Authenticating…
                                </>
                            ) : (
                                'Sign In to Admin Panel'
                            )}
                        </button>
                    </form>

                    <p className="al-footer-note">
                        All activity is logged and monitored. Unauthorized access is prohibited.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
