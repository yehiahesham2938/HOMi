import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X, ArrowLeft } from 'lucide-react';
import './GuestHeader.css';

interface GuestHeaderProps {
  showBackToHome?: boolean;
}

export const GuestHeader: React.FC<GuestHeaderProps> = ({ showBackToHome = false }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    void i18n.changeLanguage(newLang);
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = newLang;
  };

  const getHelpLink = '/get-help';
  const howItWorksChooseLink = '/how-it-works-choose';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`guest-nav ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="header-left-group">
          {showBackToHome && (
            <Link to="/guest-home" className="back-home-link" title="Back to Homepage">
              <ArrowLeft size={16} />
              <span>{t('guestHome.backToHome', { defaultValue: 'Back to Home' })}</span>
            </Link>
          )}
          <Link to="/guest-home" className="brand-logo">
            <img src="/logo.png" alt="HOMi Logo" className="logo-image" />
          </Link>
        </div>

        <div className="nav-links desktop-only">
          <Link to="/guest-search">{t('guestHome.browseHomes', { defaultValue: 'Browse Homes' })}</Link>
          <Link to={howItWorksChooseLink} state={{ fromGuestHome: true }}>{t('guestHome.howItWorks', { defaultValue: 'How It Works' })}</Link>
          <Link to={getHelpLink} state={{ fromGuestHome: true }}>{t('guestHome.helpCenter', { defaultValue: 'Help Center' })}</Link>
        </div>

        <div className="nav-actions desktop-only">
          <button className="lang-toggle-btn" onClick={toggleLanguage} title={i18n.language === 'en' ? 'Arabic' : 'English'}>
            <Globe size={18} />
            <span>{i18n.language === 'en' ? 'ع' : 'En'}</span>
          </button>
          <button className="btn-text" onClick={() => navigate('/auth')}>{t('guestHome.login', { defaultValue: 'Login' })}</button>
          <button className="btn-primary-pill" onClick={() => navigate('/auth')}>{t('guestHome.signup', { defaultValue: 'Sign Up' })}</button>
        </div>

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-nav-panel">
          <Link to="/guest-search" onClick={() => setMobileMenuOpen(false)}>{t('guestHome.browseHomes', { defaultValue: 'Browse Homes' })}</Link>
          <Link to={howItWorksChooseLink} state={{ fromGuestHome: true }} onClick={() => setMobileMenuOpen(false)}>{t('guestHome.howItWorks', { defaultValue: 'How It Works' })}</Link>
          <Link to={getHelpLink} state={{ fromGuestHome: true }} onClick={() => setMobileMenuOpen(false)}>{t('guestHome.helpCenter', { defaultValue: 'Help Center' })}</Link>
          <div className="mobile-lang-row">
            <button className="lang-toggle-btn" onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}>
              <Globe size={18} />
              <span>{i18n.language === 'en' ? 'Arabic' : 'English'}</span>
            </button>
          </div>
          <button className="btn-text mobile-nav-login" onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
            {t('guestHome.login', { defaultValue: 'Login' })}
          </button>
          <button className="btn-primary-pill mobile-nav-signup" onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
            {t('guestHome.signup', { defaultValue: 'Sign Up' })}
          </button>
        </div>
      )}
    </nav>
  );
};

export default GuestHeader;
