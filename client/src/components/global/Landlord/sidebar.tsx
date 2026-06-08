import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome, FaBuilding,
  FaTools, FaCreditCard, FaEnvelope,
  FaSignOutAlt,
  FaInbox,
  FaSignature
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './sidebar.css';
import { authService } from '../../../services/auth.service';
import { useMessagingUnreadDot } from '../../../hooks/useMessagingUnreadDot';
import ConfirmModal from '../ConfirmModal';


const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [userName, setUserName] = useState(t('sidebar.loading'));
  const [userRole, setUserRole] = useState(t('sidebar.loading'));
  const [avatarSrc, setAvatarSrc] = useState(
    'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&size=80'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const hasMessagingUnread = useMessagingUnreadDot();


  useEffect(() => {
    const load = () => {
      const cached = authService.getCurrentUser();
      if (cached) {
        const { profile, user } = cached;
        setUserName(`${profile.firstName} ${profile.lastName}`.trim() || user.email);
        setUserRole(user.role === 'LANDLORD' ? t('sidebar.landlord') : t('sidebar.tenant'));
        const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          `${profile.firstName} ${profile.lastName}`.trim() || 'User'
        )}&background=6366f1&color=fff&size=80`;
        setAvatarSrc(profile.avatarUrl || fallback);
      }

    };

    load();
    // Re-read on storage changes (e.g. after profile save in Settings)
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await authService.logout();
    navigate('/guest-home', { replace: true });
  };

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=6366f1&color=fff&size=80`;

  return (
    <aside className="sidebar">
      {/* 1. Brand Section */}
      <div className="sidebar-brand">
        <img src="/logo.png" alt="HOMi Logo" className="logo-image" />
      </div>

      {/* 2. Navigation */}
      <nav className="sidebar-nav">
        <ul>
          <li><a href="/landlord-home" className={location.pathname === "/landlord-home" ? "active" : ""}><FaHome /> <span>{t('sidebar.home')}</span></a></li>
          <li><a href="/my-properties" className={location.pathname === "/my-properties" ? "active" : ""}><FaBuilding /> <span>{t('sidebar.myProperties')}</span></a></li>
          <li><a href="/rental-requests" className={location.pathname === "/rental-requests" ? "active" : ""}><FaInbox /> <span>{t('sidebar.rentalRequests')}</span></a></li>

          <div className="nav-divider">{t('sidebar.management')}</div>

          <li><a href="/landlord-maintenance" className={location.pathname === "/landlord-maintenance" ? "active" : ""}><FaTools /> <span>{t('sidebar.maintenance')}</span></a></li>
          <li><a href="/landlord-payment" className={location.pathname === "/landlord-payment" ? "active" : ""}><FaCreditCard /> <span>{t('sidebar.payments')}</span></a></li>
          <li><a href="/landlord-contracts" className={location.pathname === "/landlord-contracts" ? "active" : ""}><FaSignature /> <span>{t('sidebar.contracts')}</span></a></li>
          <li><a href="/messages" className={location.pathname === "/messages" ? "active" : ""}><FaEnvelope /> <span className="badge-wrap">{t('sidebar.messages')} {hasMessagingUnread ? <em className="notif-dot" aria-hidden /> : null}</span></a></li>

        </ul>
      </nav>


      {/* 3. User Section */}
      <div className="sidebar-footer">
        <div className="user-info">
          <img
            src={avatarSrc}
            alt="Profile"
            referrerPolicy="no-referrer"
            onError={() => setAvatarSrc(fallbackAvatar)}
          />
          <div className="user-text">
            <p className="user-name">{userName}</p>
            <p className="user-role">{userRole}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title={t('sidebar.signOut')}>
          <FaSignOutAlt />
        </button>
      </div>


      <ConfirmModal
        isOpen={showLogoutConfirm}
        title={t('confirmModal.signOutTitle')}
        message={t('confirmModal.signOutMessage')}
        confirmText={t('confirmModal.confirm')}
        cancelText={t('confirmModal.cancel')}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

    </aside>
  );
};

export default Sidebar;