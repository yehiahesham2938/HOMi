import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import './EmailVerificationPage.css';
import { authService } from '../../../services/auth.service';

const RESEND_COOLDOWN = 120; // seconds

type LocationState = {
    email?: string;
    role?: string;
    returnUrl?: string;
    step?: number;
} | null;

const EmailVerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const locationState = location.state as LocationState;

    const resolveRoleForStep3 = useCallback((): 'tenant' | 'landlord' => {
        const r = (locationState?.role ?? '').toString().toLowerCase();
        if (r === 'landlord') return 'landlord';
        if (r === 'tenant') return 'tenant';
        const cr = authService.getCurrentUser()?.user?.role?.toUpperCase();
        return cr === 'LANDLORD' ? 'landlord' : 'tenant';
    }, [locationState?.role]);

    const navigateToCompleteProfileAfterVerify = useCallback(
        async (replace: boolean) => {
            // Check Profile and redirect
            if (authService.isAuthenticated()) {
                try {
                    await authService.getProfile();
                } catch { }
            }
            const cached = authService.getCurrentUser();
            const profile = cached?.profile;
            const idDone = profile?.isVerificationComplete === true;
            const step2Done = profile?.onboardingStep2Completed === true;
            if (cached && idDone && step2Done) {
                navigate('/complete-profile', {
                    replace,
                    state: { step: 3, role: resolveRoleForStep3() },
                });
            } else {
                navigate('/complete-profile', { replace });
            }
        },
        [navigate, resolveRoleForStep3]
    );

    const displayEmail = useMemo(() => {
        const fromNav = locationState?.email;
        if (fromNav) return fromNav;
        try {
            const cached = authService.getCurrentUser();
            return cached?.user?.email || '';
        } catch {
            return '';
        }
    }, [locationState?.email]);

    const [otp, setOtp] = useState('');
    const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
    const [canResend, setCanResend] = useState(false);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [resendError, setResendError] = useState<string | null>(null);

    const [verifyPhase, setVerifyPhase] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [verifyError, setVerifyError] = useState<string | null>(null);

    useEffect(() => {
        if (countdown <= 0) {
            setCanResend(true);
            return;
        }
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    useEffect(() => {
        if (verifyPhase !== 'success') return;
        const t = window.setTimeout(() => {
            void navigateToCompleteProfileAfterVerify(true);
        }, 1600);
        return () => window.clearTimeout(t);
    }, [verifyPhase, navigateToCompleteProfileAfterVerify]);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (otp.length !== 6) {
            setVerifyError('OTP must be exactly 6 digits');
            setVerifyPhase('error');
            return;
        }

        setVerifyPhase('loading');
        setVerifyError(null);

        try {
            await authService.verifyEmail(otp);
            if (authService.isAuthenticated()) {
                await authService.getProfile().catch(() => {});
            }
            setVerifyPhase('success');
        } catch (err) {
            const errData =
                axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
                    ? (err.response.data as { code?: string; message?: string })
                    : undefined;

            setVerifyPhase('error');
            let msg = 'The OTP is invalid or has expired. Please try again.';
            if (errData?.message) msg = errData.message;
            setVerifyError(msg);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setResending(true);
        setResendError(null);
        try {
            await authService.sendVerificationEmail();
            setResent(true);
            setCanResend(false);
            setCountdown(RESEND_COOLDOWN);
            setTimeout(() => setResent(false), 4000);
        } catch(err) {
            const errData =
                axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
                    ? (err.response.data as { code?: string; message?: string })
                    : undefined;
                    
            setResendError(errData?.message || 'Failed to send email. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const handleContinueProfile = () => {
        void navigateToCompleteProfileAfterVerify(false);
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch { } finally {
            navigate('/auth', { replace: true });
        }
    };

    if (verifyPhase === 'success') {
        return (
            <div className="email-verify-wrapper">
                <div className="email-verify-card">
                    <img src="/logo.png" alt="HOMi logo" className="ev-logo-image" />
                    <CheckCircle
                        size={64}
                        color="#10b981"
                        style={{ margin: '0 auto 16px', display: 'block' }}
                    />
                    <h1>Email Verified!</h1>
                    <p style={{ color: '#4b5563', marginBottom: '24px' }}>
                        Your email has been verified successfully. Redirecting you to complete your profile...
                    </p>
                    <button className="ev-primary-button" onClick={handleContinueProfile}>
                        Continue Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="email-verify-wrapper">
            <div className="email-verify-card">
                <img src="/logo.png" alt="HOMi logo" className="ev-logo-image" />
                <h1>Verify your email</h1>
                <p className="ev-description">
                    We've sent a 6-digit OTP to <strong>{displayEmail || 'your email address'}</strong>.
                    <br />
                    Please enter the code below to verify your account.
                </p>

                {verifyPhase === 'error' && verifyError && (
                    <div className="ev-error-banner">
                        <XCircle size={20} className="ev-error-icon" />
                        <span>{verifyError}</span>
                    </div>
                )}

                <form onSubmit={handleVerify} className="ev-form">
                    <div className="ev-input-group">
                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="ev-primary-button"
                        disabled={otp.length !== 6 || verifyPhase === 'loading'}
                    >
                        {verifyPhase === 'loading' ? (
                            <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</span>
                        ) : (
                            'Verify Email'
                        )}
                    </button>
                </form>

                <div className="ev-resend-section">
                    <p>Didn't receive the email? Check your spam folder.</p>
                    {resendError && <p className="ev-error-text" style={{margin: '8px 0', color: 'red'}}>{resendError}</p>}
                    {resent && <p className="ev-success-text" style={{margin: '8px 0', color: 'green'}}>New OTP sent successfully!</p>}
                    
                    <button
                        className="ev-resend-button"
                        onClick={handleResend}
                        disabled={!canResend || resending}
                    >
                        {resending ? 'Sending...' : canResend ? 'Resend OTP' : `Resend in ${countdown}s`}
                    </button>
                </div>

                <div className="ev-footer-actions">
                    <button className="ev-text-button" onClick={handleLogout}>
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;
