// Updated SettingsSidebar.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import './SettingsSidebar.css';
import {
    FaUser, FaShieldAlt, FaCog, FaTrashAlt,
    FaBell, FaCreditCard, FaUserShield, FaMagic
} from 'react-icons/fa';

interface SettingsSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    role?: string | null;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeTab, setActiveTab, role }) => {
    const { t } = useTranslation();
    const isMaintainer = role === 'MAINTENANCE_PROVIDER';
    const menuItems = [
        { id: 'profile', label: t('settings.tabProfile'), icon: <FaUser /> },
        { id: 'billing', label: t('settings.tabBilling'), icon: <FaCreditCard /> }, // NEW
        { id: 'notifications', label: t('settings.tabNotifications'), icon: <FaBell /> }, // NEW
        { id: 'security', label: t('settings.tabSecurity'), icon: <FaShieldAlt /> },
        { id: 'lifestyle', label: t('settings.tabLifestyle'), icon: <FaMagic />, tenantOnly: true },
        { id: 'preferences', label: t('settings.tabPreferences'), icon: <FaCog /> },
    ];
    const visibleItems = menuItems.filter((item) => {
        if (isMaintainer && (item.id === 'billing' || item.id === 'privacy')) return false;
        if (item.tenantOnly && role !== 'TENANT') return false;
        return true;
    });

    return (
        <aside className="internal-settings-sidebar">
            <nav className="settings-nav">
                {visibleItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="nav-divider"></div>
            <button
                className={`nav-item delete-nav ${activeTab === 'delete' ? 'active' : ''}`}
                onClick={() => setActiveTab('delete')}
            >
                <span className="nav-icon"><FaTrashAlt /></span>
                {t('settings.tabDelete')}
            </button>
        </aside>
    );
};

export default SettingsSidebar;