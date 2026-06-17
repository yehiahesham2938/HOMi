import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaFacebookF,
  FaEnvelope,
  FaPhoneAlt
} from 'react-icons/fa';
import authService from '../../services/auth.service';
import AuthModal from './AuthModal';
import './footer.css';

const Footer = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const currentUser = authService.getCurrentUser();
  const role = currentUser?.user?.role?.toUpperCase();
  const isGuestPage = location.pathname === '/guest-home' || location.pathname === '/guest-search';
  const [showAuthModal, setShowAuthModal] = useState(false);

  const getHelpLink = '/get-help';
  const listPropertyLink = '/for-landlords';

  return (
    <footer className="site-footer">


      <div className="footer-section-container">
        <div className="footer-grid">

          {/* Brand Section */}
          <div className="footer-brand">
            <Link to="/" className="brand-logo">
              {/* Image styling updated to strictly preserve aspect ratio */}
              <img src="/logo.png" alt="HOMi Logo" className="logo-image" />
            </Link>
            <p className="brand-description">
              {t('footer.brandDescription')}
            </p>

            {/* Social Media */}
            <div className="footer-socials">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter"><FaTwitter /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><FaLinkedinIn /></a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a>
            </div>
          </div>

          {/* Platform Links */}
          <div className="footer-links">
            <h4>{t('footer.platform')}</h4>
            {role === 'LANDLORD' ? (
              <>
                <Link to="/landlord-home">{t('header.dashboard')}</Link>
                <Link to="/my-properties">{t('sidebar.myProperties')}</Link>
                <Link to="/rental-requests">{t('sidebar.rentalRequests')}</Link>
                <Link to="/landlord-contracts">{t('sidebar.contracts')}</Link>
                <Link to="/landlord-payment">{t('sidebar.payments')}</Link>
                <Link to="/landlord-maintenance">{t('sidebar.maintenance')}</Link>
                <Link to="/homi-pro">{t('footer.homiPro')}</Link>
              </>
            ) : role === 'TENANT' ? (
              <>
                <Link to="/tenant-home">{t('header.dashboard')}</Link>
                <Link to="/browse-properties">{t('footer.browseHomes')}</Link>
                <Link to="/roommate-matching">{t('footer.roommateMatching')}</Link>
                <Link to="/actives">{t('sidebar.activeProperties')}</Link>
                <Link to="/tenant-contracts">{t('sidebar.contracts')}</Link>
                <Link to="/tenant-payment">{t('sidebar.payments')}</Link>
                <Link to="/tenant-maintenance">{t('sidebar.maintenance')}</Link>
                <Link to="/homi-pro">{t('footer.homiPro')}</Link>
              </>
            ) : (
              <>
                <button className="footer-auth-link" onClick={() => setShowAuthModal(true)}>{t('footer.browseHomes')}</button>
                <Link to={listPropertyLink} state={isGuestPage ? { fromGuestHome: true } : undefined}>{t('footer.listProperty')}</Link>
                <button className="footer-auth-link" onClick={() => setShowAuthModal(true)}>{t('footer.homiPro')}</button>
                <Link to="/pricing">{t('footer.pricingFees')}</Link>
                <button className="footer-auth-link" onClick={() => setShowAuthModal(true)}>{t('footer.roommateMatching')}</button>
                <Link to="/maintenance-providers">Maintenance Providers</Link>
              </>
            )}
          </div>

          {/* Resources Links */}
          <div className="footer-links">
            <h4>{t('footer.resources')}</h4>
            <Link to="/about-us">{t('footer.aboutUs')}</Link>
            <Link to={getHelpLink} state={isGuestPage ? { fromGuestHome: true } : undefined}>{t('footer.helpCenter')}</Link>
            <Link to="/blog">{t('footer.blog')}</Link>
            <Link to="/careers">{t('footer.careers')}</Link>
          </div>

          {/* Contact & Legal */}
          <div className="footer-links">
            <h4>{t('footer.contactLegal')}</h4>
            <div className="footer-contact-info">
              <a href="mailto:support@homi.com"><FaEnvelope /> support@homi.com</a>
              <a href="tel:+18005550199"><FaPhoneAlt /> +1 (800) 555-0199</a>
            </div>
            <div className="footer-divider"></div>
            <Link to={role ? '/terms' : `/terms?hideSidebar=true${isGuestPage ? '&fromGuest=true' : ''}`}>{t('footer.terms')}</Link>
            {/* <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/trust">{t('footer.trust')}</Link> */}
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p>{t('footer.copyright', { year: currentYear })}</p>
          <div className="footer-bottom-links">
            <Link to="/sitemap">{t('footer.sitemap')}</Link>
            <span className="dot">•</span>
            <span>{t('footer.language')}</span>
          </div>
        </div>
      </div>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </footer>
  );
};

export default Footer;