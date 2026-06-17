import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../../../components/global/header';
import GuestNavbar from '../../../components/guest/GuestNavbar';
import TenantSidebar from '../../../components/global/Tenant/sidebar';
import LandlordSidebar from '../../../components/global/Landlord/sidebar';
import MaintenanceSideBar from '../../Maintenance/MaintenanceProvider/SideBar/MaintenanceSideBar';
import Footer from '../../../components/global/footer';
import AuthModal from '../../../components/global/AuthModal';
import authService from '../../../services/auth.service';
import SupportHelpChat from '../components/SupportHelpChat';
import { 
  Search, 
  MessageSquare, 
  BookOpen, 
  LifeBuoy, 
  ChevronRight, 
  FileText, 
  ShieldCheck, 
  CreditCard,
  Mail,
  PhoneCall
} from 'lucide-react';
import './GetHelp.css';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const GetHelp: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const fromGuestHome = Boolean(
    (location.state as { fromGuestHome?: boolean } | null)?.fromGuestHome
  );
  const isAuthenticated = authService.isAuthenticated();
  const user = isAuthenticated ? authService.getCurrentUser()?.user : null;
  const role = user?.role;
  /** Guest marketing chrome: no session, or explicit entry from guest pages (e.g. Help Center link). */
  const useGuestChrome = !user || fromGuestHome;
  const showDashboardSidebar =
    Boolean(user) && (role === 'LANDLORD' || role === 'TENANT' || role === 'MAINTENANCE_PROVIDER') && !useGuestChrome;

  const openSupportChat = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (role !== 'LANDLORD' && role !== 'TENANT' && role !== 'MAINTENANCE_PROVIDER') {
      return;
    }
    setSupportChatOpen(true);
  };

  const categories = [
    { id: 'All', label: t('getHelp.allCategory', 'All'), icon: <LifeBuoy size={18} /> },
    { id: 'Payments', label: t('getHelp.paymentsCategory', 'Payments'), icon: <CreditCard size={18} /> },
    { id: 'Security', label: t('getHelp.securityCategory', 'Security'), icon: <ShieldCheck size={18} /> },
    { id: 'Lease', label: t('getHelp.leaseCategory', 'Lease'), icon: <FileText size={18} /> },
  ];

  const faqs: FAQItem[] = [
    {
      category: 'Payments',
      question: t('getHelp.q1', 'How do I set up automatic rent payments?'),
      answer: t('getHelp.a1', 'Navigate to the Payments tab in your dashboard, select "Auto-Pay", and link your preferred bank account or card.')
    },
    {
      category: 'Security',
      question: t('getHelp.q2', 'Is my personal data encrypted?'),
      answer: t('getHelp.a2', 'Yes, we use AES-256 bank-level encryption to ensure all tenant and landlord documentation is fully secured.')
    },
    {
      category: 'Lease',
      question: t('getHelp.q3', 'Can I sign my lease digitally?'),
      answer: t('getHelp.a3', 'Absolutely. HOMi integrates with secure e-signature providers to allow full digital contract execution.')
    }
  ];

  return (
    <div className="help-page-layout">
      {showDashboardSidebar && role === 'LANDLORD' ? <LandlordSidebar /> : null}
      {showDashboardSidebar && role === 'TENANT' ? <TenantSidebar /> : null}
      {showDashboardSidebar && role === 'MAINTENANCE_PROVIDER' ? <MaintenanceSideBar /> : null}

      <div
        className={`help-main-content ${!showDashboardSidebar ? 'help-main-fullwidth' : ''} ${
          useGuestChrome ? 'help-main-with-guest-nav' : ''
        }`}
      >
        {useGuestChrome ? <GuestNavbar /> : <Header />}

        {/* Search Hero */}
        <section className="help-hero">
          <div className="help-hero-inner">
            <h1 dangerouslySetInnerHTML={{ __html: t('getHelp.title', 'How can we <span>help you</span> today?') }} />
            <p>{t('getHelp.subtitle', 'Search our knowledge base or browse categories below')}</p>
            <div className="search-container">
              <Search className="search-icon" />
              <input 
                type="text" 
                placeholder={t('getHelp.searchPlaceholder', 'Search for articles, guides, and more...')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="search-btn">{t('getHelp.searchBtn', 'Search')}</button>
            </div>
          </div>
        </section>

        <div className="help-container">
          {/* Support Channels */}
          <div className="support-channels">
            <div className="channel-card">
              <div className="channel-icon chat"><MessageSquare /></div>
              <h3>{t('getHelp.liveChat', 'Live Chat')}</h3>
              <p>{t('getHelp.liveChatDesc', 'Message our team — we typically respond within 24 hours')}</p>
              <button type="button" className="channel-link" onClick={openSupportChat}>
                {t('getHelp.startChat', 'Start Chat')} <ChevronRight size={16} />
              </button>
            </div>
            <div className="channel-card">
              <div className="channel-icon documentation"><BookOpen /></div>
              <h3>{t('getHelp.documentation', 'Documentation')}</h3>
              <p>{t('getHelp.documentationDesc', 'Step-by-step platform guides')}</p>
              <button className="channel-link">{t('getHelp.browseDocs', 'Browse Docs')} <ChevronRight size={16} /></button>
            </div>
            <div className="channel-card">
              <div className="channel-icon contact"><Mail /></div>
              <h3>{t('getHelp.emailSupport', 'Email Support')}</h3>
              <p>{t('getHelp.emailSupportDesc', 'Get a reply within 24 hours')}</p>
              <button type="button" className="channel-link" onClick={openSupportChat}>
                {t('getHelp.messageSupport', 'Message support')} <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* FAQ Section */}
          <section className="faq-section">
            <div className="faq-header">
              <h2>{t('getHelp.faqTitle', 'Frequently Asked Questions')}</h2>
              <div className="category-tabs">
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="faq-grid">
              {faqs.filter(f => activeCategory === 'All' || f.category === activeCategory).map((faq, i) => (
                <div key={i} className="faq-card">
                  <h4>{faq.question}</h4>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Urgent Contact */}
          <section className="urgent-contact">
            <div className="urgent-banner">
              <div className="urgent-info">
                <PhoneCall className="urgent-icon" />
                <div>
                  <h3>{t('getHelp.emergencyTitle', 'Emergency Maintenance?')}</h3>
                  <p>{t('getHelp.emergencyDesc', 'For urgent property issues, please call our 24/7 hotline directly.')}</p>
                </div>
              </div>
              <a href={`tel:${t('getHelp.hotline', '+1800RENTBLUE')}`} className="hotline-number">{t('getHelp.hotline', '+1 (800) RENT-BLUE')}</a>
            </div>
          </section>
        </div>

        <Footer />
      </div>

      <SupportHelpChat isOpen={supportChatOpen} onClose={() => setSupportChatOpen(false)} />
      {showAuthModal ? <AuthModal onClose={() => setShowAuthModal(false)} /> : null}
    </div>
  );
};

export default GetHelp;