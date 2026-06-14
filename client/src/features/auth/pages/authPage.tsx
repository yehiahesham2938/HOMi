import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import SignIn from '../components/signin.tsx';
import SignUp from '../components/signup.tsx';
import { GoogleLoginBtn } from '../components/GoogleLoginBtn.tsx';
import { authService } from '../../../services/auth.service';
import './authPage.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  /** Shared for email sign-in and Google — single checkbox lives on the Sign In form. */
  const [rememberMe, setRememberMe] = useState(false);
  /** false until we know there is no restorable session (logout clears tokens). */
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await authService.tryRestoreSession();
      if (cancelled) return;
      if (ok) {
        try {
          await authService.getProfile();
        } catch (e) {
          if (axios.isAxiosError(e) && e.response?.data?.code === 'USER_NOT_FOUND') {
            authService.clearLocalAuthState();
            setSessionResolved(true);
            return;
          }
          /* still allow redirect using cached user for transient errors */
        }

        const currentUser = authService.getCurrentUser();

        const userRole = currentUser?.user?.role;
        if (!userRole || userRole === 'USER' || userRole === '') {
          navigate('/complete-profile', { replace: true });
          return;
        }

        const nextPath = authService.resolvePostAuthRoute();
        navigate('/', { state: { next: nextPath, force: true }, replace: true });
        return;
      }
      setSessionResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const heroImageUrl = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80";

  if (!sessionResolved) {
    return (
      <div className="auth-split-wrapper" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--auth-text-muted)', fontSize: 15 }}>{t('auth.loading')}</p>
      </div>
    );
  }

  return (
    <div className="auth-split-wrapper">
      <div className="auth-hero-side">
        <img
          src={heroImageUrl}
          alt="Luxury Architecture"
          className="hero-img-full"
        />
        <div className="hero-text-overlay">
          <div className="glass-badge">{t('auth.premiumLiving')}</div>
          <h2>{t('auth.discoverArt')} <br /><span>{t('auth.modernLiving')}</span></h2>
          <p className="hero-desc">{t('auth.exclusiveProperties')}</p>


        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-content-container">
          <header className="auth-brand-header">
            <div className="auth-logo-wrapper">
              <img src="/logo.png" alt="Logo" className="auth-main-logo" />
            </div>
            <h1>{activeTab === "signin" ? t('auth.welcomeBack') : t('auth.getStarted')}</h1>
            <p>{t('auth.enterDetails')}</p>
          </header>

          <div className="social-auth-grid">
            <GoogleLoginBtn rememberMe={rememberMe} />
          </div>

          <div className="auth-ui-divider">
            <span>{t('auth.orEmail')}</span>
          </div>

          <div className="tab-switcher">
            <div className={`tab-glow-bg ${activeTab === "signup" ? "slide-right" : ""}`} />
            <button
              className={activeTab === "signin" ? "active" : ""}
              onClick={() => setActiveTab("signin")}
            >
              {t('auth.signIn')}
            </button>
            <button
              className={activeTab === "signup" ? "active" : ""}
              onClick={() => setActiveTab("signup")}
            >
              {t('auth.signUp')}
            </button>
          </div>

          <div className="form-fade-in">
            {activeTab === "signin" ? (
              <SignIn
                rememberMe={rememberMe}
                onRememberMeChange={setRememberMe}
              />
            ) : (
              <SignUp />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
