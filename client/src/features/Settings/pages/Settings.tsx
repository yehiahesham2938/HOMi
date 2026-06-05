import React, { useState } from 'react';
import './Settings.css';
import Header from '../../../components/global/header';
import LandlordSidebar from '../../../components/global/Landlord/sidebar';
import TenantSidebar from '../../../components/global/Tenant/sidebar';
import MaintenanceSideBar from '../../Maintenance/MaintenanceProvider/SideBar/MaintenanceSideBar';
import Footer from '../../../components/global/footer';
import SettingsSidebar from '../components/SettingsSidebar';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/auth.service';

// Component Imports
import MyProfile from '../components/MyProfile';
import Security from '../components/Security';
import Preferences from '../components/Preferences';
import Notifications from '../components/Notifications';
import Billing from '../components/Billing';
import DeleteAccountSection from '../components/DeleteAccountSection';
import LifestyleHabits from '../components/LifestyleHabits';

import { FaLock, FaUserCircle } from 'react-icons/fa';
import { AlertTriangle } from 'lucide-react';

// ── Auth Guard Screen ──────────────────────────────────────────────────────────
const SignInRequired: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main, #0f172a)',
            padding: 24,
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <div style={{
                background: 'var(--bg-card, rgba(255,255,255,0.04))',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                padding: '56px 48px',
                maxWidth: 440,
                width: '100%',
                textAlign: 'center',
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                    border: '2px solid rgba(99,102,241,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 28px',
                }}>
                    <FaLock style={{ fontSize: 32, color: '#818cf8' }} />
                </div>

                <h2 style={{
                    fontSize: 26, fontWeight: 800, color: '#131415ff',
                    marginBottom: 12, letterSpacing: '-0.02em',
                }}>
                    Sign in to access Settings
                </h2>
                <p style={{
                    fontSize: 15, color: '#313234ff', lineHeight: 1.6,
                    marginBottom: 36,
                }}>
                    Your profile, billing, notifications, and security options are only visible to signed-in users.
                </p>

                <button
                    onClick={() => navigate('/auth')}
                    style={{
                        width: '100%', padding: '14px 0', border: 'none', borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        color: '#fff', fontSize: 15, fontWeight: 700,
                        cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit',
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                >
                    Sign In
                </button>
                <button
                    onClick={() => navigate('/auth')}
                    style={{
                        width: '100%', padding: '13px 0',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                        background: 'transparent', color: '#94a3b8',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#e2e8f0'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                    <FaUserCircle style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Create a free account
                </button>

                <p style={{ marginTop: 24, fontSize: 12, color: '#475569' }}>
                    Your data is private and secure.
                </p>
            </div>
        </div>
    );
};

// ── Incomplete Profile Banner ──────────────────────────────────────────────────
interface ProfileBannerProps {
    userRole: string | null;
    isVerificationComplete: boolean;
    hasPreferences: boolean;
    onCompleteIdentity: () => void;
    onCompletePreferences: () => void;
}

const IncompleteProfileBanner: React.FC<ProfileBannerProps> = ({
    userRole, isVerificationComplete, hasPreferences, onCompleteIdentity, onCompletePreferences,
}) => {
    if (userRole !== 'TENANT' && userRole !== 'LANDLORD') return null;

    // Step 1 incomplete: identity/ID/gender/birthdate not verified yet
    if (!isVerificationComplete) {
        return (
            <div className="settings-top-banner settings-banner settings-banner--identity">
                <AlertTriangle size={20} className="settings-banner__icon settings-banner__icon--warn" />
                <div className="settings-banner__body">
                    <div className="settings-banner__title">Identity verification required</div>
                    <div className="settings-banner__text">
                        You haven&apos;t completed your identity verification. HOMi features like submitting rental
                        requests and listing properties are locked until your profile is fully verified.
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onCompleteIdentity}
                    className="settings-banner__btn settings-banner__btn--identity"
                >
                    Complete Now
                </button>
            </div>
        );
    }

    // Step 3 incomplete: preferences / business profile was skipped
    if (!hasPreferences) {
        const label = userRole === 'LANDLORD' ? 'Business Profile' : 'Rental Preferences';
        const hint = userRole === 'LANDLORD'
            ? 'Add your business profile to unlock property listings and rental management features.'
            : 'Add your rental preferences to submit requests and unlock matching features.';
        return (
            <div className="settings-top-banner settings-banner settings-banner--preferences">
                <AlertTriangle size={20} className="settings-banner__icon settings-banner__icon--info" />
                <div className="settings-banner__body">
                    <div className="settings-banner__title">{label} not set up</div>
                    <div className="settings-banner__text">{hint}</div>
                </div>
                <button
                    type="button"
                    onClick={onCompletePreferences}
                    className="settings-banner__btn settings-banner__btn--preferences"
                >
                    Set Up Now
                </button>
            </div>
        );
    }

    return null;
};

// ── Main Settings Page ─────────────────────────────────────────────────────────
const Settings: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');

    // Auth guard — show sign-in screen if no token exists
    const isAuthenticated = !!localStorage.getItem('accessToken');
    if (!isAuthenticated) {
        return <SignInRequired />;
    }

    const cached = authService.getCurrentUser();
    const isVerificationComplete = cached?.profile?.isVerificationComplete ?? false;

    // Pick the correct sidebar based on the stored user role
    const storedUser = localStorage.getItem('user');
    const userRole = storedUser ? JSON.parse(storedUser).role : null;
    const SidebarComponent = userRole === 'LANDLORD'
        ? LandlordSidebar
        : userRole === 'MAINTENANCE_PROVIDER'
            ? MaintenanceSideBar
            : TenantSidebar;

    const hasPreferences = cached?.profile?.onboardingStep3Completed === true;

    const isProfileFullyComplete =
        isVerificationComplete && hasPreferences && (cached?.user?.isVerified ?? false);

    const handleCompletePreferences = () => {
        navigate('/complete-profile', { state: { step: 3, fromSettings: true, role: userRole } });
    };

    const handleCompleteIdentity = () => {
        navigate('/complete-profile', { state: { fromSettings: true, initialStep: 1 } });
    };

    const profileTab = (
        <MyProfile
            role={userRole}
            onUpdatePreferencesShortcut={
                isProfileFullyComplete && (userRole === 'TENANT' || userRole === 'LANDLORD')
                    ? handleCompletePreferences
                    : undefined
            }
        />
    );

    // Component mapping by active tab
    const tabComponents: Record<string, React.ReactNode> = {
        profile: profileTab,
        billing: <Billing />,
        notifications: <Notifications role={userRole} />,
        security: <Security role={userRole} />,
        preferences: <Preferences />,
        lifestyle: <LifestyleHabits role={userRole} />,
        delete: <DeleteAccountSection onBackToProfile={() => setActiveTab('profile')} />,
    };

    return (
        <div className="settings-layout">
            <SidebarComponent />

            <div className="settings-viewport">
                <Header />

                <main className="settings-main-area">
                    {/* Incomplete profile warning — yellow for Step 1, blue for Step 3 */}
                    <IncompleteProfileBanner
                        userRole={userRole}
                        isVerificationComplete={isVerificationComplete}
                        hasPreferences={hasPreferences}
                        onCompleteIdentity={handleCompleteIdentity}
                        onCompletePreferences={handleCompletePreferences}
                    />

                    <div className="settings-glass-card">
                        <SettingsSidebar
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            role={userRole}
                        />

                        <section className="settings-view-panel">
                            {tabComponents[activeTab] || tabComponents.profile}
                        </section>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
};

export default Settings;