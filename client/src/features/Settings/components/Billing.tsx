import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Billing.css';
import { FaHistory, FaBoxOpen, FaCheckCircle, FaWallet } from 'react-icons/fa';
import authService from '../../../services/auth.service';

const Billing: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    
    // Toggle state for testing Subscribed vs Free
    const [isSubscribed, setIsSubscribed] = useState(false);
    
    const isFreePlan = !isSubscribed;

    return (
        <div className="billing-wrapper animate-fade-in">
            {/* Dev toggle */}
            <div className="dev-toggle" style={{ marginBottom: '20px', padding: '10px', background: '#fee2e2', textAlign: 'center', borderRadius: '8px', color: '#991b1b', fontWeight: 'bold' }}>
                <label style={{ cursor: 'pointer' }}>
                    <input 
                        type="checkbox" 
                        checked={isSubscribed} 
                        onChange={(e) => setIsSubscribed(e.target.checked)} 
                        style={{ marginRight: '10px' }}
                    />
                    {t('settings.toggleSubscribedState', 'Toggle Subscribed State (For Demo)')}
                </label>
            </div>

            <div className={`current-plan-card ${isFreePlan ? 'free-plan' : ''}`}>
                <div className="plan-info">
                    <span className="plan-badge">
                        {isFreePlan ? t('settings.basicTier') : t('settings.premiumTier')}
                    </span>
                    <h2>
                        {isFreePlan ? t('settings.freePlan') : 'HOMi Pro'}
                        <span>{isFreePlan ? 'EGP 0/mo' : 'EGP 399/mo'}</span>
                    </h2>
                    <p>{isFreePlan ? t('settings.noSubscriptionActive') : t('settings.proBenefitsActive')}</p>
                </div>
                {isFreePlan && (
                    <button className="upgrade-btn pulse-btn" onClick={() => navigate('/homi-pro')}>
                        {t('settings.upgradeToPro')}
                    </button>
                )}
            </div>

            <div className="billing-grid">
                <section className="billing-section">
                    <header className="section-header">
                        <h3><FaWallet className="icon-blue" /> {t('settings.currentBalance')}</h3>
                    </header>
                    <div className="balance-display" style={{ padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px' }}>
                        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '10px' }}>{t('settings.walletBalanceLabel')}</p>
                        <h2 style={{ fontSize: '3rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>EGP 0.00</h2>
                    </div>
                </section>

                <section className="billing-section">
                    <header className="section-header">
                        <h3><FaHistory className="icon-blue" /> {t('settings.planExpiration')}</h3>
                    </header>
                    {isFreePlan ? (
                        <div className="billing-empty-state" style={{ height: '250px' }}>
                            <FaBoxOpen className="empty-icon" />
                            <p style={{ marginBottom: '15px' }}>{t('settings.noPlanSelected')}</p>
                            <button 
                                onClick={() => navigate('/homi-pro')} 
                                style={{ 
                                    padding: '12px 24px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    background: 'var(--blue-gradient)', 
                                    color: '#fff', 
                                    border: 'none', 
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {t('settings.viewPro')}
                            </button>
                        </div>
                    ) : (
                        <div className="billing-empty-state" style={{ height: '250px', background: '#ecfdf5', borderColor: '#10b981' }}>
                            <FaCheckCircle className="empty-icon" style={{ color: '#10b981' }} />
                            <p style={{ color: '#065f46', fontWeight: 700, fontSize: '1.3rem', marginTop: '10px' }}>{t('settings.premiumPlanActive')}</p>
                            <p style={{ marginTop: '8px', fontSize: '1rem', color: '#047857' }}>{t('settings.renewsExpires', { date: 'May 8, 2027' })}</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Billing;