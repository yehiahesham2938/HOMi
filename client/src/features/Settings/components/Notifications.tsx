import React, { useState, useEffect } from 'react';
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
        { id: 'property_approved', title: 'Admin Approved Property', desc: 'When your listed property is approved by admin' },
        { id: 'booked_visit', title: 'Booked Visit', desc: 'When a tenant schedules a visit to your property' },
        { id: 'rental_request', title: 'Rental Request', desc: 'When a tenant submits a new rental application' },
        { id: 'contract_signed', title: 'Contract Signed by Tenant', desc: 'When a tenant signs the digital lease contract' },
        { id: 'payment_received', title: 'Payment Received Successfuly', desc: 'When rent or deposits are received in your wallet' },
        { id: 'late_payment', title: 'Late Payment', desc: 'When rent payment deadline is missed by a tenant' },
        { id: 'contract_ended', title: 'Contract Ended', desc: 'When a lease contract term finishes' },
        { id: 'contract_terminated', title: 'Contract Terminated', desc: 'When a contract is early-terminated' },
        { id: 'messages', title: 'Messages', desc: 'When you receive new chat messages' },
        { id: 'account_suspended', title: 'Account Suspended by Admin', desc: 'Critical security updates regarding account status' },
      ]
    : isTenant
    ? [
        { id: 'visit_accepted', title: 'Booked Visit Accepted', desc: 'When a landlord confirms your visit request' },
        { id: 'rental_approval', title: 'Rental Request Approval/Rejection', desc: 'When your application is accepted or declined' },
        { id: 'contract_ready', title: 'Contract Is ready to Sign', desc: 'When a lease agreement is generated for your signature' },
        { id: 'payment_deadline', title: 'Payment deadline reminder every 5 days', desc: 'Deadline reminders for upcoming rent payments' },
        { id: 'maintenance_applied', title: 'Maintenance provider apply on issues', desc: 'When a provider applies to fix your reported issue' },
        { id: 'messages', title: 'Messages', desc: 'When you receive new chat messages' },
        { id: 'maintenance_status', title: 'Maintenance Issue states', desc: 'Status updates: "on the way", "started", "in progress", "finished"' },
      ]
    : isMaintainer
    ? [
        { id: 'messages', title: 'Messages', desc: 'When you receive new chat messages' },
        { id: 'provider_accepted', title: 'Accepted by Tenant to take over', desc: 'When a tenant accepts you for a maintenance job' },
        { id: 'money_received', title: 'Money received successfully', desc: 'When job payments are credited to your wallet' },
      ]
    : [
        { id: 'messages', title: 'Messages', desc: 'General direct chat messages' },
        { id: 'system', title: 'System Alerts', desc: 'General system announcements and updates' },
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
      setSimTitle(`Test Alert: ${first.title}`);
      setSimBody(`This is a live test notification for ${first.title}. Everything is working perfectly!`);
    }
  }, [notificationTypes, simType]);

  const handleSimTypeChange = (id: string) => {
    const selected = notificationTypes.find((n) => n.id === id);
    if (selected) {
      setSimType(id);
      setSimTitle(`Test Alert: ${selected.title}`);
      setSimBody(`This is a live test notification for ${selected.title}. Everything is working perfectly!`);
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
        <h2 className="settings-panel-title">Notification Settings</h2>
        <p className="settings-panel-subtitle">
          Configure how you receive updates. App notifications are always active on the platform, and you can opt-in to Email or SMS alerts.
        </p>
      </div>

      {/* Destinations Information Cards */}
      <div className="destinations-grid">
        <div className="destination-card">
          <div className="dest-icon-wrap email">
            <FaEnvelope />
          </div>
          <div className="dest-details">
            <span className="dest-label">Gmail Destination</span>
            <strong className="dest-val">{userEmail}</strong>
            <span className="dest-status">Connected via Google</span>
          </div>
        </div>

        <div className="destination-card">
          <div className="dest-icon-wrap sms">
            <FaMobileAlt />
          </div>
          <div className="dest-details">
            <span className="dest-label">SMS Destination</span>
            {userPhone ? (
              <strong className="dest-val">{userPhone}</strong>
            ) : (
              <strong className="dest-val empty">Not Provided</strong>
            )}
            {userPhone ? (
              <span className="dest-status">Active Phone Number</span>
            ) : (
              <span className="dest-status warn">
                <FaExclamationTriangle style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Add phone number in My Profile tab to enable SMS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preference Table Grid */}
      <div className="notif-card-container">
        <header className="grid-header">
          <div className="type-col">Notification Category</div>
          <div className="channel-group">
            <div className="channel-col"><FaBell /> App</div>
            <div className="channel-col"><FaEnvelope /> Email</div>
            <div className="channel-col"><FaMobileAlt /> SMS</div>
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
                        title={!userPhone ? 'Please configure a phone number first' : ''}
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
            ✓ Preferences saved successfully!
          </span>
        )}
        <button className="prime-save-button" onClick={handleSave}>
          Save Preferences
        </button>
      </div>

      {/* Playground Simulator Section */}
      <div className="simulator-section">
        <div className="sim-header">
          <div className="sim-badge">Test Center</div>
          <h3>🔔 Notification Channel Simulator</h3>
          <p>
            Verify that your configurations work instantly. Choose a notification category, enter test data, and dispatch a simulated alert to see the email/SMS integration in action!
          </p>
        </div>

        <div className="sim-controls">
          <div className="sim-field-group">
            <label>Select Category</label>
            <select value={simType} onChange={(e) => handleSimTypeChange(e.target.value)}>
              {notificationTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          <div className="sim-field-group">
            <label>Notification Subject / Title</label>
            <input
              type="text"
              placeholder="e.g. Action Required: Sign Lease Contract"
              value={simTitle}
              onChange={(e) => setSimTitle(e.target.value)}
            />
          </div>

          <div className="sim-field-group" style={{ gridColumn: '1 / -1' }}>
            <label>Notification Content / Body</label>
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
            <FaPlay className="sim-play-icon" /> Dispatch Test Alert
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;