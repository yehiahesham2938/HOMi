// client/src/features/Settings/components/Security.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Security.css';
import { FaShieldVirus, FaFingerprint, FaHistory, FaKey, FaTimes, FaEye, FaEyeSlash, FaCheck, FaTimesCircle, FaGoogle } from 'react-icons/fa';
import { authService } from '../../../services/auth.service';
import { passkeyService } from '../../../services/passkey.service';

// Password requirement checks
const getChecks = (t: any) => [
    { key: 'length',    label: t('settings.checkLength', 'At least 8 characters'),           test: (p: string) => p.length >= 8 },
    { key: 'upper',     label: t('settings.checkUpper', 'At least one uppercase letter'),    test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',     label: t('settings.checkLower', 'At least one lowercase letter'),    test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',    label: t('settings.checkNumber', 'At least one number'),              test: (p: string) => /\d/.test(p) },
    { key: 'special',   label: t('settings.checkSpecial', 'At least one special character'),   test: (p: string) => /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/.test(p) },
];

// Parse ZodError-style errors[] from the backend into a single readable string
function parseApiError(err: unknown, t: any): string {
    const e = err as {
        response?: {
            data?: {
                message?: string;
                errors?: { field: string; message: string }[];
                code?: string;
            };
        };
    };

    const data = e?.response?.data;
    if (!data) return t('settings.errFailedChangePassword', 'Failed to change password. Please try again.');

    // Map backend error codes to user-friendly messages
    if (data.code === 'INVALID_CURRENT_PASSWORD') return t('settings.errInvalidCurrentPassword', 'Current password is incorrect.');
    if (data.code === 'SAME_PASSWORD') return t('settings.errSamePassword', 'New password must be different from your current one.');

    // Parse Zod validation errors (code === 'VALIDATION_ERROR')
    if (data.errors && data.errors.length > 0) {
        return data.errors[0].message;
    }

    return data.message || t('settings.errFailedChangePassword', 'Failed to change password. Please try again.');
}

interface SecurityProps {
    role?: string | null;
}

const Security: React.FC<SecurityProps> = ({ role }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isMaintainer = role === 'MAINTENANCE_PROVIDER';
    const isGoogleUser = localStorage.getItem('authProvider') === 'google';
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ── Profile completion: two phases ─────────────────────────────────────────
    // Phase 1: identity verified (national_id / gender / birthdate) — gates app access
    // Phase 2: preferences filled (budget for tenant, bio/business for landlord) — gates features
    const computeCompletionState = () => {
        const cached = authService.getCurrentUser();
        const profile = cached?.profile;
        const userRole = cached?.user?.role;
        const step1Done = Boolean(profile?.isVerificationComplete);

        let step3Done = false;
        if (userRole === 'TENANT' || userRole === 'LANDLORD') {
            step3Done = profile?.onboardingStep3Completed === true;
        } else {
            step3Done = true;
        }
        const fullyVerified = Boolean(cached?.user?.isVerified);
        return { step1Done, step3Done, fullyComplete: step1Done && step3Done && fullyVerified };
    };

    const initial = computeCompletionState();
    const [isStep1Complete, setIsStep1Complete] = useState(initial.step1Done);
    const [isProfileComplete, setIsProfileComplete] = useState(initial.fullyComplete);
    const [isPasskeyEnabled, setIsPasskeyEnabled] = useState<boolean>(false);
    const [passkeyBusy, setPasskeyBusy] = useState(false);
    const [passkeyMessage, setPasskeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isPasswordProtected = true;

    const securityScore = isMaintainer
        ? (isPasswordProtected ? 80 : 0) + (isPasskeyEnabled ? 20 : 0)
        : (isPasswordProtected ? 40 : 0) + (isProfileComplete ? 45 : 0) + (isPasskeyEnabled ? 15 : 0);
    const scoreLabel = securityScore >= 100 
        ? t('settings.excellent', 'Excellent') 
        : securityScore >= 70 
            ? t('settings.good', 'Good') 
            : t('settings.needsAttention', 'Needs attention');
    const isPerfectScore = securityScore === 100;
    const scoreStrokeColor = isPerfectScore ? '#22c55e' : '#2563eb';

    useEffect(() => {
        let mounted = true;

        const syncProfileCompletion = async () => {
            try {
                const fresh = await authService.getProfile();
                if (!mounted) return;
                const userRole = fresh.user?.role;
                const profile = fresh.profile;
                const step1 = Boolean(profile?.isVerificationComplete);
                let step3 = false;
                if (userRole === 'TENANT' || userRole === 'LANDLORD') {
                    step3 = profile?.onboardingStep3Completed === true;
                } else step3 = true;
                setIsStep1Complete(step1);
                setIsProfileComplete(step1 && step3 && Boolean(fresh.user?.isVerified));
                setIsPasskeyEnabled(Boolean(fresh.passkeyEnabled));
            } catch {
                if (!mounted) return;
                setIsPasskeyEnabled(localStorage.getItem('passkeyEnabled') === '1');
            }
        };

        void syncProfileCompletion();

        return () => { mounted = false; };
    }, []);

    // Track whether the user has started typing the new password (to show checklist)
    const newPasswordTouched = newPassword.length > 0;
    const checks = getChecks(t);
    const allChecksPassed = checks.every(c => c.test(newPassword));

    const handlePasskeySetup = async () => {
        setPasskeyMessage(null);
        if (!passkeyService.isSupported()) {
            setPasskeyMessage({ type: 'error', text: t('settings.errPasskeyNotSupported', 'This browser/device does not support biometric/passkey auth.') });
            return;
        }

        setPasskeyBusy(true);
        try {
            await passkeyService.registerPasskeyForCurrentUser();
            setIsPasskeyEnabled(true);
            setPasskeyMessage({ type: 'success', text: t('settings.msgPasskeyEnabledSuccess', 'Biometric authentication is now enabled for this device.') });
        } catch (err) {
            const text = err instanceof Error ? err.message : t('settings.errFailedEnablePasskey', 'Failed to enable biometric authentication.');
            setPasskeyMessage({ type: 'error', text });
        } finally {
            setPasskeyBusy(false);
        }
    };

    const handlePasskeyDisable = async () => {
        setPasskeyMessage(null);
        setPasskeyBusy(true);
        try {
            await passkeyService.disablePasskeyForCurrentUser();
            setIsPasskeyEnabled(false);
            setPasskeyMessage({ type: 'success', text: t('settings.msgPasskeyDisabledSuccess', 'Passkeys have been removed from your account.') });
        } catch (err) {
            const text = err instanceof Error ? err.message : t('settings.errFailedDisablePasskey', 'Failed to disable passkeys.');
            setPasskeyMessage({ type: 'error', text });
        } finally {
            setPasskeyBusy(false);
        }
    };

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setMessage(null);
    };

    const handleOpen = () => { resetForm(); setShowPasswordForm(true); };
    const handleClose = () => { setShowPasswordForm(false); resetForm(); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // ── Client-side validation ──────────────────────────────────────────
        if (!currentPassword) {
            setMessage({ type: 'error', text: t('settings.errEnterCurrentPassword', 'Please enter your current password.') });
            return;
        }
        if (!newPassword) {
            setMessage({ type: 'error', text: t('settings.errEnterNewPassword', 'Please enter a new password.') });
            return;
        }
        if (!allChecksPassed) {
            const failed = checks.filter(c => !c.test(newPassword)).map(c => c.label);
            setMessage({ type: 'error', text: `${t('settings.errPasswordRequirementsPrefix', 'Password must have:')} ${failed.join(', ')}.` });
            return;
        }
        if (currentPassword === newPassword) {
            setMessage({ type: 'error', text: t('settings.errSamePassword', 'New password must be different from your current one.') });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: t('settings.errPasswordsDoNotMatch', 'New passwords do not match.') });
            return;
        }

        // ── API call ────────────────────────────────────────────────────────
        setSaving(true);
        try {
            await authService.changePassword({ currentPassword, newPassword });
            setMessage({ type: 'success', text: t('settings.msgPasswordChangedSuccess', 'Password changed successfully!') });
            setTimeout(() => handleClose(), 2000);
        } catch (err: unknown) {
            setMessage({ type: 'error', text: parseApiError(err, t) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="security-grid-layout">
            <div className="security-status-hero">
                <div className="safety-meter">
                    <svg viewBox="0 0 36 36" className="circular-chart blue">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path
                            className="circle"
                            stroke={scoreStrokeColor}
                            strokeDasharray={`${securityScore}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                    <div className="percentage">{securityScore}%</div>
                </div>
                <div className="status-meta">
                    <h3>{t('settings.securityScore')}: {scoreLabel}</h3>
                    <p>
                        {isPerfectScore
                            ? t('settings.excellentScore')
                            : isPasskeyEnabled
                                ? t('settings.goodScore')
                                : t('settings.attentionScore')}
                    </p>
                </div>
            </div>

            <div className="security-tools-grid">
                <div className="tool-card">
                    <div className="tool-icon-box"><FaKey /></div>
                    <h4>{t('settings.changePassword')}</h4>
                    {isGoogleUser ? (
                        <>
                            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                                {t('settings.googleUserDesc')}
                            </p>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                marginTop: 8, fontSize: 12, fontWeight: 600,
                                color: '#4285F4',
                            }}>
                                <FaGoogle style={{ fontSize: 13 }} />
                                {t('settings.googleAccount')}
                            </div>
                        </>
                    ) : (
                        <>
                            <p>{t('settings.passwordCardDesc')}</p>
                            <button className="tool-btn" onClick={handleOpen}>{t('settings.update')}</button>
                        </>
                    )}
                </div>
                <div className={`tool-card ${isPasskeyEnabled ? 'tool-card-complete' : ''}`}>
                    <div className="tool-icon-box"><FaFingerprint /></div>
                    <h4>{t('settings.security2fa')}</h4>
                    <p>
                        {isPasskeyEnabled
                            ? t('settings.passkeyEnabledText')
                            : t('settings.passkeySetupText')}
                    </p>
                    <button
                        className="tool-btn"
                        disabled={passkeyBusy}
                        onClick={isPasskeyEnabled ? handlePasskeyDisable : handlePasskeySetup}
                    >
                        {passkeyBusy ? t('settings.pleaseWait') : isPasskeyEnabled ? t('settings.disable') : t('settings.enable')}
                    </button>
                    {passkeyMessage && (
                        <p className={`security-inline-note ${passkeyMessage.type}`}>{passkeyMessage.text}</p>
                    )}
                </div>
                {!isMaintainer && (
                    <div className={`tool-card ${isProfileComplete ? 'tool-card-complete' : ''}`}>
                        <div className="tool-icon-box"><FaHistory /></div>
                        <h4>{isProfileComplete ? t('settings.profileComplete') : t('settings.completeProfile', 'Complete Profile')}</h4>
                        <p>
                            {isProfileComplete
                                ? t('settings.profileCompleteDesc')
                                : isStep1Complete
                                    ? t('settings.step1CompleteDesc')
                                    : t('settings.step1IncompleteDesc')}
                        </p>
                        <button
                            className="tool-btn"
                            disabled={isProfileComplete}
                            onClick={() => {
                                if (isProfileComplete) return;
                                // If Step 1 is done, go directly to Step 3 (preferences)
                                // If Step 1 is missing, start from the beginning
                                navigate('/complete-profile', {
                                    state: isStep1Complete
                                        ? { fromSettings: true, step: 3, role }
                                        : { fromSettings: true, initialStep: 1 },
                                });
                            }}
                        >
                            {isProfileComplete ? t('settings.completedBadge') : isStep1Complete ? t('settings.addPreferencesBtn') : t('settings.continueSetupBtn')}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Change Password Modal ─────────────────────────────────────── */}
            {showPasswordForm && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20,
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
                >
                    <div style={{
                        background: 'var(--bg-card, #1e2433)',
                        borderRadius: 18,
                        padding: '32px 36px',
                        width: '100%', maxWidth: 460,
                        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
                        position: 'relative',
                        color: 'var(--text-primary, #f1f5f9)',
                    }}>
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            style={{
                                position: 'absolute', top: 16, right: 16,
                                background: 'transparent', border: 'none',
                                color: 'var(--text-muted, #94a3b8)',
                                cursor: 'pointer', fontSize: 18, padding: 4,
                            }}
                        >
                            <FaTimes />
                        </button>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 11,
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <FaShieldVirus style={{ color: '#fff', fontSize: 18 }} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('settings.changePassword')}</h3>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #94a3b8)' }}>{t('settings.keepAccountSecure', 'Keep your account secure')}</p>
                            </div>
                        </div>

                        {/* Status message */}
                        {message && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                                fontSize: 13, fontWeight: 500,
                                background: message.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                color: message.type === 'success' ? '#4ade80' : '#f87171',
                                border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            }}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Current Password */}
                            <PasswordField
                                label={t('settings.currentPassword')}
                                value={currentPassword}
                                onChange={setCurrentPassword}
                                show={showCurrent}
                                toggle={() => setShowCurrent(v => !v)}
                            />

                            {/* New Password */}
                            <PasswordField
                                label={t('settings.newPassword')}
                                value={newPassword}
                                onChange={setNewPassword}
                                show={showNew}
                                toggle={() => setShowNew(v => !v)}
                            />

                            {/* Password strength checklist — shown while typing */}
                            {newPasswordTouched && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: 10,
                                    padding: '12px 16px',
                                    marginBottom: 16,
                                    marginTop: -8,
                                }}>
                                    {checks.map(c => {
                                        const passed = c.test(newPassword);
                                        return (
                                            <div key={c.key} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                fontSize: 12, fontWeight: 500,
                                                color: passed ? '#4ade80' : '#94a3b8',
                                                padding: '3px 0',
                                                transition: 'color 0.2s',
                                            }}>
                                                {passed
                                                    ? <FaCheck style={{ fontSize: 10, flexShrink: 0 }} />
                                                    : <FaTimesCircle style={{ fontSize: 10, flexShrink: 0, color: '#ef4444' }} />
                                                }
                                                {c.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Confirm New Password */}
                            <PasswordField
                                label={t('settings.confirmNewPassword')}
                                value={confirmPassword}
                                onChange={setConfirmPassword}
                                show={showConfirm}
                                toggle={() => setShowConfirm(v => !v)}
                                hint={
                                    confirmPassword.length > 0 && confirmPassword !== newPassword
                                        ? t('settings.passwordsDoNotMatch')
                                        : undefined
                                }
                            />

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    style={{
                                        flex: 1, padding: '11px 0', borderRadius: 9,
                                        border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                                        background: 'transparent',
                                        color: 'var(--text-secondary, #cbd5e1)',
                                        cursor: 'pointer', fontSize: 14, fontWeight: 500,
                                    }}
                                >
                                    {t('settings.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        flex: 1, padding: '11px 0', borderRadius: 9,
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                        color: '#fff',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        fontSize: 14, fontWeight: 600,
                                        opacity: saving ? 0.7 : 1,
                                        transition: 'opacity 0.2s',
                                    }}
                                >
                                    {saving ? t('settings.updating') : t('settings.updatePasswordBtn', 'Update Password')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Reusable password input field ─────────────────────────────────────────────
interface PasswordFieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    toggle: () => void;
    hint?: string;   // optional inline error hint below the field
}

const PasswordField: React.FC<PasswordFieldProps> = ({ label, value, onChange, show, toggle, hint }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{
            display: 'block', fontSize: 13, fontWeight: 500,
            marginBottom: 6, color: 'var(--text-secondary, #cbd5e1)',
        }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%',
                    padding: '11px 42px 11px 14px',
                    borderRadius: 9,
                    border: `1px solid ${hint ? 'rgba(239,68,68,0.5)' : 'var(--border-color, rgba(255,255,255,0.1))'}`,
                    background: 'var(--bg-input, rgba(255,255,255,0.05))',
                    color: 'inherit',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                }}
            />
            <button
                type="button"
                onClick={toggle}
                style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none',
                    color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', fontSize: 14,
                }}
            >
                {show ? <FaEyeSlash /> : <FaEye />}
            </button>
        </div>
        {hint && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#f87171', fontWeight: 500 }}>
                {hint}
            </p>
        )}
    </div>
);

export default Security;