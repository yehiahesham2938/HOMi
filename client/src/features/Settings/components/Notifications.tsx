import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Notifications.css';
import { FaEnvelope, FaMobileAlt, FaBell, FaExclamationTriangle, FaPlay, FaCheck } from 'react-icons/fa';
import { simulateChannels } from '../../../shared/utils/notificationSimulator';

interface NotificationsProps {
  role?: string | null;
}

interface PreferenceConfig {
  app: boolean;
  email: boolean;
  sms: boolean;
}

const Notifications: React.FC<NotificationsProps> = ({ role }) => {
  const { t } = useTranslation();
  const [userEmail, setUserEmail] = useState('mohym3205@gmail.com');
  const [userPhone, setUserPhone] = useState('');
  const [userId, setUserId] = useState('');
  const [preferences, setPreferences] = useState<Record<string, PreferenceConfig>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Playground simulation states
  const [simType, setSimType] = useState('');
  const [simTitle, setSimTitle] = useState('');
  const [simBody, setSimBody] = useState('');

  // 1. Determine notification types based on Role
  const isLandlord = role === 'LANDLORD';
  const isTenant = role === 'TENANT';
  const isMaintainer = role === 'MAINTENANCE_PROVIDER';

  const notificationTypes = isLandlord
    ? [
        { id: 'property_approved', title: t('notifications.types.property_approved.title', 'Admin Approved Property'), desc: t('notifications.types.property_approved.desc', 'When your listed property is approved by admin') },
        { id: 'booked_visit', title: t('notifications.types.booked_visit.title', 'Booked Visit'), desc: t('notifications.types.booked_visit.desc', 'When a tenant schedules a visit to your property') },
        { id: 'rental_request', title: t('notifications.types.rental_request.title', 'Rental Request'), desc: t('notifications.types.rental_request.desc', 'When a tenant submits a new rental application') },
        { id: 'contract_signed', title: t('notifications.types.contract_signed.title', 'Contract Signed by Tenant'), desc: t('notifications.types.contract_signed.desc', 'When a tenant signs the digital lease contract') },
        { id: 'payment_received', title: t('notifications.types.payment_received.title', 'Payment Received Successfully'), desc: t('notifications.types.payment_received.desc', 'When rent or deposits are received in your wallet') },
        { id: 'late_payment', title: t('notifications.types.late_payment.title', 'Late Payment'), desc: t('notifications.types.late_payment.desc', 'When rent payment deadline is missed by a tenant') },
        { id: 'contract_ended', title: t('notifications.types.contract_ended.title', 'Contract Ended'), desc: t('notifications.types.contract_ended.desc', 'When a lease contract term finishes') },
        { id: 'contract_terminated', title: t('notifications.types.contract_terminated.title', 'Contract Terminated'), desc: t('notifications.types.contract_terminated.desc', 'When a contract is early-terminated') },
        { id: 'messages', title: t('notifications.types.messages.title', 'Messages'), desc: t('notifications.types.messages.desc', 'When you receive new chat messages') },
        { id: 'account_suspended', title: t('notifications.types.account_suspended.title', 'Account Suspended by Admin'), desc: t('notifications.types.account_suspended.desc', 'Critical security updates regarding account status') },
      ]
    : isTenant
    ? [
        { id: 'visit_accepted', title: t('notifications.types.visit_accepted.title', 'Booked Visit Accepted'), desc: t('notifications.types.visit_accepted.desc', 'When a landlord confirms your visit request') },
        { id: 'rental_approval', title: t('notifications.types.rental_approval.title', 'Rental Request Approval/Rejection'), desc: t('notifications.types.rental_approval.desc', 'When your application is accepted or declined') },
        { id: 'contract_ready', title: t('notifications.types.contract_ready.title', 'Contract Is ready to Sign'), desc: t('notifications.types.contract_ready.desc', 'When a lease agreement is generated for your signature') },
        { id: 'payment_deadline', title: t('notifications.types.payment_deadline.title', 'Payment deadline reminder every 5 days'), desc: t('notifications.types.payment_deadline.desc', 'Deadline reminders for upcoming rent payments') },
        { id: 'maintenance_applied', title: t('notifications.types.maintenance_applied.title', 'Maintenance provider apply on issues'), desc: t('notifications.types.maintenance_applied.desc', 'When a provider applies to fix your reported issue') },
        { id: 'messages', title: t('notifications.types.messages.title', 'Messages'), desc: t('notifications.types.messages.desc', 'When you receive new chat messages') },
        { id: 'maintenance_status', title: t('notifications.types.maintenance_status.title', 'Maintenance Issue states'), desc: t('notifications.types.maintenance_status.desc', 'Status updates: "on the way", "started", "in progress", "finished"') },
      ]
    : isMaintainer
    ? [
        { id: 'messages', title: t('notifications.types.messages.title', 'Messages'), desc: t('notifications.types.messages.desc', 'When you receive new chat messages') },
        { id: 'provider_accepted', title: t('notifications.types.provider_accepted.title', 'Accepted by Tenant to take over'), desc: t('notifications.types.provider_accepted.desc', 'When a tenant accepts you for a maintenance job') },
        { id: 'money_received', title: t('notifications.types.money_received.title', 'Money received successfully'), desc: t('notifications.types.money_received.desc', 'When job payments are credited to your wallet') },
      ]
    : [
        { id: 'messages', title: t('notifications.types.messages.title', 'Messages'), desc: t('notifications.types.messages.desc', 'General direct chat messages') },
        { id: 'system', title: t('notifications.types.system.title', 'System Alerts'), desc: t('notifications.types.system.desc', 'General system announcements and updates') },
      ];

  // 2. Load User Profile and Preferences
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      const profileStr = localStorage.getItem('profile');
      
      let currentUserId = '';
      if (userStr) {
        const u = JSON.parse(userStr);
        setUserEmail(u.email || 'mohym3205@gmail.com');
        setUserId(u.id);
        currentUserId = u.id;
      }
      
      if (profileStr) {
        const p = JSON.parse(profileStr);
        setUserPhone(p.phoneNumber || '');
      }

      // Load saved preferences
      if (currentUserId) {
        const storedPrefs = localStorage.getItem(`homi_notification_preferences_${currentUserId}`);
        if (storedPrefs) {
          setPreferences(JSON.parse(storedPrefs));
        } else {
          // Initialize defaults (App always true, email true, SMS false by default)
          const initial: Record<string, PreferenceConfig> = {};
          notificationTypes.forEach((item) => {
            initial[item.id] = { app: true, email: true, sms: false };
          });
          setPreferences(initial);
        }
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    }
  }, [role]);

  // Set default simulation choice on types load
  useEffect(() => {
    if (notificationTypes.length > 0 && !simType) {
      const first = notificationTypes[0];
      setSimType(first.id);
      setSimTitle(`${t('settings.testAlertPrefix', 'Test Alert:')} ${first.title}`);
      setSimBody(t('settings.testBodyTemplate', 'This is a live test notification for {{title}}. Everything is working perfectly!', { title: first.title }));
    }
  }, [notificationTypes, simType, t]);

  const handleSimTypeChange = (id: string) => {
    const selected = notificationTypes.find((n) => n.id === id);
    if (selected) {
      setSimType(id);
      setSimTitle(`${t('settings.testAlertPrefix', 'Test Alert:')} ${selected.title}`);
      setSimBody(t('settings.testBodyTemplate', 'This is a live test notification for {{title}}. Everything is working perfectly!', { title: selected.title }));
    }
  };

  // Toggle Preference
  const togglePreference = (id: string, channel: keyof PreferenceConfig) => {
    if (channel === 'app') return; // Web/App is unremovable

    setPreferences((prev) => {
      const current = prev[id] || { app: true, email: false, sms: false };
      return {
        ...prev,
        [id]: {
          ...current,
          [channel]: !current[channel],
        },
      };
    });
  };

  // Save Preferences
  const handleSave = () => {
    if (!userId) return;
    try {
      localStorage.setItem(`homi_notification_preferences_${userId}`, JSON.stringify(preferences));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
    }
  };

  // Trigger test simulation
  const handleSimulate = () => {
    if (!simType) return;
    simulateChannels({
      title: simTitle,
      body: simBody,
      type: simType,
    });
  };

  return (
    <div className="notif-settings-wrapper animate-fade-in">
      <div className="section-intro">
        <h2 className="settings-panel-title">{t('settings.notificationSettings')}</h2>
        <p className="settings-panel-subtitle">
          {t('settings.notifSubtitle')}
        </p>
      </div>

      {/* Destinations Information Cards */}
      <div className="destinations-grid">
        <div className="destination-card">
          <div className="dest-icon-wrap email">
            <FaEnvelope />
          </div>
          <div className="dest-details">
            <span className="dest-label">{t('settings.gmailDestination')}</span>
            <strong className="dest-val">{userEmail}</strong>
            <span className="dest-status">{t('settings.connectedGoogle')}</span>
          </div>
        </div>

        <div className="destination-card">
          <div className="dest-icon-wrap sms">
            <FaMobileAlt />
          </div>
          <div className="dest-details">
            <span className="dest-label">{t('settings.smsDestination')}</span>
            {userPhone ? (
              <strong className="dest-val">{userPhone}</strong>
            ) : (
              <strong className="dest-val empty">{t('settings.notProvided')}</strong>
            )}
            {userPhone ? (
              <span className="dest-status">{t('settings.activePhone')}</span>
            ) : (
              <span className="dest-status warn">
                <FaExclamationTriangle style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {t('settings.smsHint')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preference Table Grid */}
      <div className="notif-card-container">
        <header className="grid-header">
          <div className="type-col">{t('settings.notifCategory')}</div>
          <div className="channel-group">
            <div className="channel-col"><FaBell /> {t('settings.app')}</div>
            <div className="channel-col"><FaEnvelope /> {t('settings.email')}</div>
            <div className="channel-col"><FaMobileAlt /> {t('settings.sms')}</div>
          </div>
        </header>

        <div className="notif-scroll-area">
          {notificationTypes.map((item) => {
            const config = preferences[item.id] || { app: true, email: false, sms: false };
            return (
              <div className="grid-row" key={item.id}>
                <div className="notif-info">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
                <div className="channel-group">
                  <div className="checkbox-cell">
                    <label className="checkbox-modern disabled">
                      <input type="checkbox" checked disabled />
                      <span className="checkmark-box disabled">
                        <FaCheck />
                      </span>
                    </label>
                  </div>
                  <div className="checkbox-cell">
                    <label className="checkbox-modern">
                      <input
                        type="checkbox"
                        checked={config.email}
                        onChange={() => togglePreference(item.id, 'email')}
                      />
                      <span className="checkmark-box">
                        <FaCheck />
                      </span>
                    </label>
                  </div>
                  <div className="checkbox-cell">
                    <label className={`checkbox-modern ${!userPhone ? 'disabled-no-phone' : ''}`}>
                      <input
                        type="checkbox"
                        checked={config.sms}
                        disabled={!userPhone}
                        onChange={() => togglePreference(item.id, 'sms')}
                        title={!userPhone ? t('settings.phoneRequiredTooltip', 'Please configure a phone number first') : ''}
                      />
                      <span className="checkmark-box">
                        <FaCheck />
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="notif-footer-sticky-action">
        {saveSuccess && (
          <span className="save-success-indicator">
            ✓ {t('settings.preferencesSaved')}
          </span>
        )}
        <button className="prime-save-button" onClick={handleSave}>
          {t('settings.savePreferencesBtn', 'Save Preferences')}
        </button>
      </div>

      {/* Playground Simulator Section */}
      <div className="simulator-section">
        <div className="sim-header">
          <div className="sim-badge">{t('settings.testCenter')}</div>
          <h3>🔔 {t('settings.channelSimulator')}</h3>
          <p>
            {t('settings.simSubtitle')}
          </p>
        </div>

        <div className="sim-controls">
          <div className="sim-field-group">
            <label>{t('settings.selectCategory')}</label>
            <select value={simType} onChange={(e) => handleSimTypeChange(e.target.value)}>
              {notificationTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          <div className="sim-field-group">
            <label>{t('settings.subjectTitle')}</label>
            <input
              type="text"
              placeholder="e.g. Action Required: Sign Lease Contract"
              value={simTitle}
              onChange={(e) => setSimTitle(e.target.value)}
            />
          </div>

          <div className="sim-field-group" style={{ gridColumn: '1 / -1' }}>
            <label>{t('settings.contentBody')}</label>
            <textarea
              placeholder="Enter message body details..."
              rows={2}
              value={simBody}
              onChange={(e) => setSimBody(e.target.value)}
            />
          </div>
        </div>

        <div className="sim-actions">
          <button className="btn-simulate" onClick={handleSimulate} disabled={!simType}>
            <FaPlay className="sim-play-icon" /> {t('settings.dispatchTest')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;