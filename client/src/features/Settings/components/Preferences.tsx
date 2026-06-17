// client/src/features/Settings/components/Preferences.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Preferences.css';
import { FaMoon, FaSun, FaDesktop, FaGlobe, FaBell } from 'react-icons/fa';

const Preferences: React.FC = () => {
  const { t, i18n } = useTranslation();
  // Load preferences from localStorage or use defaults
  const [theme, setTheme] = useState(() => localStorage.getItem('homi_theme') || 'light');
  const [lang, setLang] = useState(() => i18n.language || 'en');
  const [notifsEnabled, setNotifsEnabled] = useState(() => {
    const val = localStorage.getItem('homi_desktop_notifs');
    return val !== 'false'; // Default to true
  });

  // Persist selections
  useEffect(() => {
    localStorage.setItem('homi_theme', theme);
    // Apply class to body for real theme changes if relevant
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [theme]);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem('homi_lang', newLang);
  };

  useEffect(() => {
    localStorage.setItem('homi_desktop_notifs', String(notifsEnabled));
  }, [notifsEnabled]);

  return (
    <div className="pref-container">
      <div className="pref-header">
        <h2>{t('settings.systemPreferences')}</h2>
        <p>{t('settings.prefSubtitle')}</p>
      </div>

      <section className="pref-section">
        <label className="pref-label">{t('settings.appearance')}</label>
        <div className="theme-selector">
          <div 
            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <div className="theme-preview light">
              <FaSun />
            </div>
            <span>{t('settings.light')}</span>
          </div>
          <div 
            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <div className="theme-preview dark">
              <FaMoon />
            </div>
            <span>{t('settings.dark')}</span>
          </div>
          <div 
            className={`theme-option ${theme === 'system' ? 'active' : ''}`}
            onClick={() => setTheme('system')}
          >
            <div className="theme-preview system">
              <FaDesktop />
            </div>
            <span>{t('settings.system')}</span>
          </div>
        </div>
      </section>

      <section className="pref-section">
        <div className="pref-row">
          <div className="pref-info">
            <div className="pref-icon-bg"><FaGlobe /></div>
            <div>
              <h4>{t('settings.language')}</h4>
              <p>{t('settings.langSubtitle')}</p>
            </div>
          </div>
          <select 
            className="pref-select"
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
        </div>

        <div className="pref-row">
          <div className="pref-info">
            <div className="pref-icon-bg bell"><FaBell /></div>
            <div>
              <h4>{t('settings.desktopNotifications')}</h4>
              <p>{t('settings.desktopNotifSubtitle')}</p>
            </div>
          </div>
          <label className="pref-toggle">
            <input 
              type="checkbox" 
              checked={notifsEnabled} 
              onChange={(e) => setNotifsEnabled(e.target.checked)}
            />
            <span className="pref-slider"></span>
          </label>
        </div>
      </section>
    </div>
  );
};

export default Preferences;