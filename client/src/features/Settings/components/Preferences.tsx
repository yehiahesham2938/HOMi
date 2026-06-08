// client/src/features/Settings/components/Preferences.tsx
import React, { useState, useEffect } from 'react';
import './Preferences.css';
import { FaMoon, FaSun, FaDesktop, FaGlobe, FaBell } from 'react-icons/fa';

const Preferences: React.FC = () => {
  // Load preferences from localStorage or use defaults
  const [theme, setTheme] = useState(() => localStorage.getItem('homi_theme') || 'light');
  const [lang, setLang] = useState(() => localStorage.getItem('homi_lang') || 'English (US)');
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

  useEffect(() => {
    localStorage.setItem('homi_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('homi_desktop_notifs', String(notifsEnabled));
  }, [notifsEnabled]);

  return (
    <div className="pref-container">
      <div className="pref-header">
        <h2>System Preferences</h2>
        <p>Tailor your ActiveRentals interface to your liking.</p>
      </div>

      <section className="pref-section">
        <label className="pref-label">Appearance</label>
        <div className="theme-selector">
          <div 
            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <div className="theme-preview light">
              <FaSun />
            </div>
            <span>Light</span>
          </div>
          <div 
            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <div className="theme-preview dark">
              <FaMoon />
            </div>
            <span>Dark</span>
          </div>
          <div 
            className={`theme-option ${theme === 'system' ? 'active' : ''}`}
            onClick={() => setTheme('system')}
          >
            <div className="theme-preview system">
              <FaDesktop />
            </div>
            <span>System</span>
          </div>
        </div>
      </section>

      <section className="pref-section">
        <div className="pref-row">
          <div className="pref-info">
            <div className="pref-icon-bg"><FaGlobe /></div>
            <div>
              <h4>Language</h4>
              <p>Select your preferred dashboard language</p>
            </div>
          </div>
          <select 
            className="pref-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="English (US)">English (US)</option>
            <option value="Spanish (ES)">Spanish (ES)</option>
            <option value="French (FR)">French (FR)</option>
            <option value="Arabic (AR)">Arabic (AR)</option>
          </select>
        </div>

        <div className="pref-row">
          <div className="pref-info">
            <div className="pref-icon-bg bell"><FaBell /></div>
            <div>
              <h4>Desktop Notifications</h4>
              <p>Receive real-time alerts on your browser</p>
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