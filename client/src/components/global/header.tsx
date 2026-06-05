import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaSignOutAlt, FaBell } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/auth.service';
import ConfirmModal from './ConfirmModal';
import NotificationsBar from '../../features/home/components/TenantHomeComponents/NotificationsBar';
import notificationService from '../../services/notification.service';
import socketService from '../../services/socket.service';
import TestingClockBadge from './TestingClockBadge';
import { simulateChannels } from '../../shared/utils/notificationSimulator';
import './header.css';


const Header = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifBarOpen, setNotifBarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeDisabled, setRealtimeDisabled] = useState(false);
  const mobileMenuRef = useRef<HTMLElement | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };


  const getSignedInRole = (): string | null => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      const parsed = JSON.parse(userStr) as { role?: string } | null;
      return parsed?.role ?? null;
    } catch {
      return null;
    }
  };

  const signedInRole = getSignedInRole();
  const isSignedIn = Boolean(localStorage.getItem('accessToken')) && signedInRole !== null;
  const isMaintainer = signedInRole === 'MAINTENANCE_PROVIDER';
  const howItWorksPath = signedInRole === 'TENANT' ? '/for-tenants' : '/for-landlords';
  const howItWorksBrowsePath = isSignedIn ? howItWorksPath : '/how-it-works-choose';
  const howItWorksNavActive =
    location.pathname === '/how-it-works-choose' ||
    location.pathname === '/for-tenants' ||
    location.pathname === '/for-landlords';
  const dashboardPath = signedInRole === 'LANDLORD' ? '/landlord-home' : '/tenant-home';

  const tenantMobileLinks = [
    { to: '/tenant-home', label: t('header.dashboard') },
    { to: '/actives', label: t('header.activeProperties') },
    { to: '/browse-properties', label: t('header.browseProperties') },
    { to: '/roommate-matching', label: t('header.matching') },
    { to: '/maintenance-requests', label: t('header.maintenance') },
    { to: '/tenant-payment', label: t('header.payments') },
    { to: '/messages', label: t('header.messages') },
    { to: '/rewards', label: t('header.rewards') },
  ];


  const landlordMobileLinks = [
    { to: '/landlord-home', label: t('header.dashboard') },
    { to: '/my-properties', label: t('header.myProperties') },
    { to: '/rental-requests', label: t('header.rentalRequests') },
    { to: '/maintenance-requests', label: t('header.maintenance') },
    { to: '/landlord-payment', label: t('header.payments') },
    { to: '/messages', label: t('header.messages') },
    { to: '/balance', label: t('header.balance') },
  ];


  const mobileRoleLinks = signedInRole === 'LANDLORD' ? landlordMobileLinks : tenantMobileLinks;

  const handleMobileLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmMobileLogout = async () => {
    setShowLogoutConfirm(false);
    setIsMobileMenuOpen(false);
    await authService.logout();
    navigate('/guest-home', { replace: true });
  };

  // Shadow effect on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track unread notifications count for signed-in users
  const refreshUnreadCount = useCallback(async () => {
    if (!isSignedIn || realtimeDisabled) {
      setUnreadCount(0);
      return;
    }
    try {
      const c = await notificationService.unreadCount();
      setUnreadCount(c);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setRealtimeDisabled(true);
        setUnreadCount(0);
        socketService.disconnect();
      }
    }
  }, [isSignedIn, realtimeDisabled]);

  useEffect(() => { void refreshUnreadCount(); }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isSignedIn || realtimeDisabled) return;
    const socket = socketService.connect();
    if (!socket) return;
    const onNew = (payload: any) => {
      setUnreadCount((c) => c + 1);
      if (payload && typeof payload === 'object' && payload.type) {
        simulateChannels({
          title: payload.title || 'New Notification',
          body: payload.body || '',
          type: payload.type,
        });
      }
    };
    socketService.onNotificationNew(onNew);
    const id = window.setInterval(refreshUnreadCount, 60_000);
    return () => {
      socketService.offNotificationNew(onNew);
      window.clearInterval(id);
    };
  }, [isSignedIn, realtimeDisabled, refreshUnreadCount]);

  useEffect(() => {
    if (!notifBarOpen) void refreshUnreadCount();
  }, [notifBarOpen, refreshUnreadCount]);

  // Close mobile menu when route changes
  useEffect(() => {
    const timer = window.setTimeout(() => setIsMobileMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  // Immediately route correctly for "How It Works"
  useEffect(() => {
    if (!signedInRole) return;

    const isOnLandlordsPage = location.pathname === '/for-landlords';
    const isOnTenantsPage = location.pathname === '/for-tenants';

    if (signedInRole === 'TENANT' && isOnLandlordsPage) {
      navigate('/for-tenants', { replace: true, state: { fromAppNavbar: true } });
    } else if (signedInRole === 'LANDLORD' && isOnTenantsPage) {
      navigate('/for-landlords', { replace: true, state: { fromAppNavbar: true } });
    }
  }, [navigate, location.pathname, signedInRole]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const clickedInsideMenu = !!(target && mobileMenuRef.current?.contains(target));
      const clickedToggle = !!(target && mobileToggleRef.current?.contains(target));
      if (isMobileMenuOpen && !clickedInsideMenu && !clickedToggle) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">

        {/* Left spacer with Language Toggle */}
        <div className="header-spacer left-spacer">
          <button type="button" className="lang-toggle" onClick={toggleLanguage} aria-label="Toggle language">
            <span className="lang-text">{i18n.language === 'en' ? 'En' : 'ع'}</span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-nav" aria-label="Main navigation">
          {!isMaintainer && (
            <Link
              to={howItWorksBrowsePath}
              className={`nav-link ${howItWorksNavActive ? 'active' : ''}`}
              onClick={(e) => {
                if (!isSignedIn) return;
                e.preventDefault();
                navigate(howItWorksPath, { state: { fromAppNavbar: true } });
              }}
            >
              {t('header.howItWorks')}
            </Link>
          )}
          {!isMaintainer && (
            <Link to="/homi-pro" className={`nav-link ${location.pathname === '/homi-pro' ? 'active' : ''}`}>
              HOMI <span style={{ background: 'linear-gradient(90deg, #22c55e, #15803d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>PRO</span>
            </Link>
          )}
          <Link to="/get-help" className={`nav-link ${location.pathname === '/get-help' ? 'active' : ''}`}>
            {t('header.getHelp')}
          </Link>
          <Link to="/about-us" className={`nav-link ${location.pathname === '/about-us' ? 'active' : ''}`}>
            {t('header.aboutUs')}
          </Link>
          {isSignedIn && (
            <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>
              {t('header.settings')}
            </Link>
          )}
        </nav>


        {/* Mobile Menu Toggle & Right Spacer */}
        <div className="header-spacer right-spacer">
          {isSignedIn && <TestingClockBadge />}
          {isSignedIn && (
            <button
              type="button"
              className="header-notif-btn"
              onClick={() => setNotifBarOpen(true)}
              aria-label="Open notifications"
            >
              <FaBell />
              {unreadCount > 0 && (
                <span className="header-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          )}
          <button
            type="button"
            ref={mobileToggleRef}
            className="mobile-menu-toggle"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav ref={mobileMenuRef} className="mobile-nav" aria-label="Mobile navigation" onPointerDown={(e) => e.stopPropagation()}>
          {!isMaintainer && (
            <Link
              to={howItWorksBrowsePath}
              className={`mobile-nav-link ${howItWorksNavActive ? 'active' : ''}`}
              onClick={(e) => {
                if (!isSignedIn) return;
                e.preventDefault();
                navigate(howItWorksPath, { state: { fromAppNavbar: true } });
              }}
            >
              {t('header.howItWorks')}
            </Link>
          )}
          {!isMaintainer && (
            <Link to="/homi-pro" className={`mobile-nav-link ${location.pathname === '/homi-pro' ? 'active' : ''}`}>
              HOMI <span style={{ background: 'linear-gradient(90deg, #22c55e, #15803d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>PRO</span>
            </Link>
          )}
          <Link to="/get-help" className={`mobile-nav-link ${location.pathname === '/get-help' ? 'active' : ''}`}>
            {t('header.getHelp')}
          </Link>
          <Link to="/about-us" className={`mobile-nav-link ${location.pathname === '/about-us' ? 'active' : ''}`}>
            {t('header.aboutUs')}
          </Link>
          {isSignedIn && (
            <Link to="/settings" className={`mobile-nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>
              {t('header.settings')}
            </Link>
          )}

          {isSignedIn && (
            <>
              <div className="mobile-nav-divider">{t('header.dashboardMenu')}</div>

              {mobileRoleLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`mobile-nav-link ${location.pathname === item.to ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}

              <button type="button" className="mobile-logout-btn" onClick={handleMobileLogout}>
                <FaSignOutAlt />
                {t('header.signOut')}
              </button>

            </>
          )}
        </nav>
      )}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title={t('confirmModal.signOutTitle')}
        message={t('confirmModal.signOutMessage')}
        confirmText={t('confirmModal.confirm')}
        cancelText={t('confirmModal.cancel')}
        onConfirm={confirmMobileLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {isSignedIn && (
        <NotificationsBar isOpen={notifBarOpen} onClose={() => setNotifBarOpen(false)} />
      )}
    </header>
  );
};

export default Header;