import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';


// Reuse the existing GuestHome navbar styles/behavior.
import '../../features/Guest/pages/GuestHome.css';

const GuestNavbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };


  const howItWorksLink = '/how-it-works-choose';
  const getHelpLink = '/get-help';

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setMobileMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <nav className={`guest-nav ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <Link to="/guest-home" className="brand-logo">
          <img src="/logo.png" alt="HOMi Logo" className="logo-image" />
        </Link>

        <div className="nav-links desktop-only">
          <Link to="/guest-search">{t('guestNavbar.browseHomes')}</Link>
          <Link to={howItWorksLink} state={{ fromGuestHome: true }}>{t('guestNavbar.howItWorks')}</Link>
          <Link to={getHelpLink} state={{ fromGuestHome: true }}>{t('guestNavbar.helpCenter')}</Link>
        </div>

        <div className="nav-actions desktop-only">
          <button type="button" className="lang-toggle" onClick={toggleLanguage} style={{ marginRight: i18n.language === 'en' ? '12px' : '0', marginLeft: i18n.language === 'ar' ? '12px' : '0' }}>
            {i18n.language === 'en' ? 'En' : 'ع'}
          </button>
          <button className="btn-text" onClick={() => navigate('/auth')}>
            {t('guestNavbar.login')}
          </button>
          <button className="btn-primary-pill shadow-hover" onClick={() => navigate('/auth')}>
            {t('guestNavbar.signup')}
          </button>
        </div>


        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="mobile-nav-panel">
          <Link to="/guest-search" onClick={() => setMobileMenuOpen(false)}>
            {t('guestNavbar.browseHomes')}
          </Link>
          <Link to={howItWorksLink} state={{ fromGuestHome: true }} onClick={() => setMobileMenuOpen(false)}>
            {t('guestNavbar.howItWorks')}
          </Link>
          <Link to={getHelpLink} state={{ fromGuestHome: true }} onClick={() => setMobileMenuOpen(false)}>
            {t('guestNavbar.helpCenter')}
          </Link>
          <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', marginTop: '8px' }}>
            <button type="button" className="lang-toggle" onClick={toggleLanguage} style={{ width: '100%' }}>
              {i18n.language === 'en' ? 'Switch to Arabic (ع)' : 'التبديل إلى الإنجليزية (En)'}
            </button>
          </div>
          <button
            type="button"
            className="btn-text mobile-nav-login"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/auth');
            }}
          >
            {t('guestNavbar.login')}
          </button>
          <button
            type="button"
            className="btn-primary-pill mobile-nav-signup"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/auth');
            }}
          >
            {t('guestNavbar.signup')}
          </button>
        </div>

      ) : null}
    </nav>
  );
};

export default GuestNavbar;

