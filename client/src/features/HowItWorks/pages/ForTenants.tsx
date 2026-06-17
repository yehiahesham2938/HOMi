import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  GlobeLock,
  Home,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  KeyRound,
} from 'lucide-react';

import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import GuestNavbar from '../../../components/guest/GuestNavbar';
import AuthModal from '../../../components/global/AuthModal';
import './ForTenants.css';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const ForTenants: React.FC = () => {
  const { t } = useTranslation();
  const [openFaqId, setOpenFaqId] = useState<string | null>('apply');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const appState = (location.state as { fromGuestHome?: boolean; fromAppNavbar?: boolean } | null) ?? null;
  const fromGuestHome = Boolean(appState?.fromGuestHome);
  const fromAppNavbar = Boolean(appState?.fromAppNavbar);

  const storedUserRole = (() => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      const parsed = JSON.parse(userStr) as { role?: string } | null;
      return parsed?.role ?? null;
    } catch {
      return null;
    }
  })();

  const isSignedIn = Boolean(localStorage.getItem('accessToken'));
  const hideSidebar = fromGuestHome || !fromAppNavbar || !isSignedIn || storedUserRole !== 'TENANT';

  useEffect(() => {
    // Keep users on the correct role page if they were routed here from the app navbar.
    if (!fromAppNavbar || !isSignedIn || storedUserRole !== 'LANDLORD') return;
    navigate('/for-landlords', { replace: true, state: { fromAppNavbar: true } });
  }, [navigate, fromAppNavbar, isSignedIn, storedUserRole]);

  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, index * 70);
          }
        });
      },
      { threshold: 0.08 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const steps = useMemo(
    () => [
      {
        label: t('forTenants.step1Label', 'Step One'),
        title: t('forTenants.step1Title', 'Create Your Tenant Account'),
        description: t('forTenants.step1Desc', 'Start your journey by registering as a tenant on HOMI. Your profile becomes your trusted digital identity across the platform — landlords will review it when you apply.'),
        bullets: t('forTenants.step1Bullets', { returnObjects: true }) as string[] || [
          'Enter your personal information and contact details',
          'Upload an ID for profile verification',
          'Set your rental preferences (area, budget, size)',
          'Receive a verified badge on your profile'
        ],
        tags: t('forTenants.step1Tags', { returnObjects: true }) as string[] || ['Registration', 'Verification', 'Profile Setup'],
        image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step1CapTitle', 'Account Registration'),
        imageCaptionSub: t('forTenants.step1CapSub', 'Quick sign-up — ready in under 2 minutes')
      },
      {
        label: t('forTenants.step2Label', 'Step Two'),
        title: t('forTenants.step2Title', 'Search & Browse Properties'),
        description: t('forTenants.step2Desc', 'Explore a wide marketplace of verified rental listings. Use powerful filters to narrow down properties by location, price range, number of rooms, amenities, and availability date.'),
        bullets: t('forTenants.step2Bullets', { returnObjects: true }) as string[] || [
          'Filter by area, price, size, and amenities',
          'View high-resolution photos of every property',
          'Read full property descriptions and landlord details',
          'Save favorites and compare multiple listings'
        ],
        tags: t('forTenants.step2Tags', { returnObjects: true }) as string[] || ['Property Search', 'Smart Filters', 'Favorites'],
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step2CapTitle', 'Browse Verified Listings'),
        imageCaptionSub: t('forTenants.step2CapSub', 'Hundreds of properties across all areas')
      },
      {
        label: t('forTenants.step3Label', 'Step Three'),
        title: t('forTenants.step3Title', 'Find a Roommate (Optional)'),
        description: t('forTenants.step3Desc', "Looking to share? Use HOMI's roommate matching system to connect with compatible people. Post your profile with your lifestyle preferences and let the platform surface suitable matches."),
        bullets: t('forTenants.step3Bullets', { returnObjects: true }) as string[] || [
          'Create a roommate profile with your preferences',
          'Browse and filter compatible roommate profiles',
          'Contact matches directly through the platform',
          'Apply for a shared unit together'
        ],
        tags: t('forTenants.step3Tags', { returnObjects: true }) as string[] || ['Roommate Matching', 'Shared Rentals', 'Messaging'],
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step3CapTitle', 'Roommate Matching'),
        imageCaptionSub: t('forTenants.step3CapSub', 'Find someone compatible, not just available')
      },
      {
        label: t('forTenants.step4Label', 'Step Four'),
        title: t('forTenants.step4Title', 'Submit a Rental Application'),
        description: t('forTenants.step4Desc', 'Found the right place? Apply with a single click. Your tenant profile is automatically attached so the landlord sees everything they need — no forms to fill, no documents to scan.'),
        bullets: t('forTenants.step4Bullets', { returnObjects: true }) as string[] || [
          'Submit your application directly from the listing',
          'Your verified profile is attached automatically',
          'Add a personal note or message to the landlord',
          'Track your application status in real time'
        ],
        tags: t('forTenants.step4Tags', { returnObjects: true }) as string[] || ['Rental Application', 'One-Click Apply', 'Status Tracking'],
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step4CapTitle', 'Apply Instantly'),
        imageCaptionSub: t('forTenants.step4CapSub', 'No paperwork — everything is digital')
      },
      {
        label: t('forTenants.step5Label', 'Step Five'),
        title: t('forTenants.step5Title', 'Review & Sign Your Lease'),
        description: t('forTenants.step5Desc', "Once accepted, your lease contract is generated on the platform. Read every term in detail, ask questions, and sign digitally when you're ready — fully legal and secure."),
        bullets: t('forTenants.step5Bullets', { returnObjects: true }) as string[] || [
          'View the full contract with all terms and clauses',
          'Both tenant and landlord sign digitally',
          'Signed copy stored securely in your account',
          'Access your contract anytime from your dashboard'
        ],
        tags: t('forTenants.step5Tags', { returnObjects: true }) as string[] || ['Lease Contract', 'Digital Signature', 'Secure Storage'],
        image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step5CapTitle', 'Digital Lease Signing'),
        imageCaptionSub: t('forTenants.step5CapSub', 'Legally binding — no printing needed')
      },
      {
        label: t('forTenants.step6Label', 'Step Six'),
        title: t('forTenants.step6Title', 'Pay Rent Through Your Wallet'),
        description: t('forTenants.step6Desc', 'Top up your HOMI wallet and pay monthly rent in just a few taps. No bank transfers, no cash — everything is tracked, timestamped, and confirmed automatically.'),
        bullets: t('forTenants.step6Bullets', { returnObjects: true }) as string[] || [
          'Add funds to your wallet with ease',
          'Pay your monthly rent directly to the landlord',
          'Receive payment confirmations and receipts',
          'Full transaction history always available'
        ],
        tags: t('forTenants.step6Tags', { returnObjects: true }) as string[] || ['Wallet Rent Payment', 'Instant Payment', 'Receipts'],
        image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step6CapTitle', 'Wallet Rent Payment'),
        imageCaptionSub: t('forTenants.step6CapSub', 'Instant, trackable, and always confirmed')
      },
      {
        label: t('forTenants.step7Label', 'Step Seven'),
        title: t('forTenants.step7Title', 'Manage Your Active Rental'),
        description: t('forTenants.step7Desc', "You're in! Your active rental dashboard gives you a complete view of your tenancy — lease dates, upcoming payments, landlord contact, and everything about your current home."),
        bullets: t('forTenants.step7Bullets', { returnObjects: true }) as string[] || [
          'View lease start date, end date, and monthly rent',
          'See upcoming due dates and payment schedule',
          'Access landlord contact directly from the dashboard',
          'View full rental history and all past payments'
        ],
        tags: t('forTenants.step7Tags', { returnObjects: true }) as string[] || ['Rental Dashboard', 'Lease Details', 'Payment History'],
        image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step7CapTitle', 'Your Home Dashboard'),
        imageCaptionSub: t('forTenants.step7CapSub', 'Everything about your tenancy, in one view')
      },
      {
        label: t('forTenants.step8Label', 'Step Eight'),
        title: t('forTenants.step8Title', 'Report Maintenance Issues'),
        description: t('forTenants.step8Desc', 'Spot a problem in your unit? Submit a maintenance request instantly. Describe the issue, attach photos, and track the resolution in real time — with direct contact to the assigned provider.'),
        bullets: t('forTenants.step8Bullets', { returnObjects: true }) as string[] || [
          'Post a request with description and urgency level',
          'Attach photos to document the issue clearly',
          'Track the status from submitted to resolved',
          'Contact the assigned maintenance provider directly'
        ],
        tags: t('forTenants.step8Tags', { returnObjects: true }) as string[] || ['Maintenance Request', 'Status Tracking', 'Provider Contact'],
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop',
        imageCaptionTitle: t('forTenants.step8CapTitle', 'Maintenance Reporting'),
        imageCaptionSub: t('forTenants.step8CapSub', 'Fast response, real-time updates')
      }
    ],
    [t]
  );

  const benefits = useMemo(
    () => [
      {
        title: t('forTenants.benefit1Title', 'Simple property discovery'),
        description: t('forTenants.benefit1Desc', 'Find relevant listings quickly with structured filters and clearer listing details.'),
        icon: <Home size={20} />,
      },
      {
        title: t('forTenants.benefit2Title', 'Clear payment visibility'),
        description: t('forTenants.benefit2Desc', 'Track upcoming and completed rent activity with less confusion.'),
        icon: <CreditCard size={20} />,
      },
      {
        title: t('forTenants.benefit3Title', 'Faster communication'),
        description: t('forTenants.benefit3Desc', 'Keep landlord conversations and updates in one place.'),
        icon: <MessageSquare size={20} />,
      },
      {
        title: t('forTenants.benefit4Title', 'Safer workflows'),
        description: t('forTenants.benefit4Desc', 'Tenant data and rental workflows are handled with privacy-aware design.'),
        icon: <GlobeLock size={20} />,
      },
    ],
    [t]
  );

  const faqs: FaqItem[] = useMemo(
    () => [
      {
        id: 'apply',
        question: t('forTenants.faqQ1', 'How do I apply for a property?'),
        answer: t('forTenants.faqA1', 'Open a listing, review the details, and submit an application. You can follow the request status from your tenant dashboard.'),
      },
      {
        id: 'payment',
        question: t('forTenants.faqQ2', 'Can I track rent payments on HOMi?'),
        answer: t('forTenants.faqA2', 'Yes. HOMi gives you visibility into payment activity so you always know what is due and what has already been processed.'),
      },
      {
        id: 'maintenance',
        question: t('forTenants.faqQ3', 'How do maintenance requests work?'),
        answer: t('forTenants.faqA3', 'You can submit requests directly in the app and monitor updates until the issue is resolved.'),
      },
      {
        id: 'contracts',
        question: t('forTenants.faqQ4', 'Where can I find my lease details?'),
        answer: t('forTenants.faqA4', 'Your lease-related information stays centralized so you can review terms and references whenever needed.'),
      },
    ],
    [t]
  );

  return (
    <div className={`how-page-layout ${hideSidebar ? 'how-page-layout--no-sidebar' : ''}`}>
      {!hideSidebar && <Sidebar />}

      <div className="how-main-content">
        {hideSidebar ? <GuestNavbar /> : <Header />}

        <main className="how-content" aria-label={t('forTenants.stepsHeader', 'How HOMi works for tenants')}>
          <section className="how-hero">
            <div className="how-hero-bg" aria-hidden="true" />

            <div className="how-hero-container">
              <div className="how-hero-left">
                <span className="how-badge">🏠 {t('forTenants.eyebrow', 'Tenant Journey')}</span>
                <h1>
                  {t('forTenants.title', 'Find, apply, and rent—')}<br />
                  <span className="gradient-text">{t('forTenants.titleAccent', 'all in one place.')}</span>
                </h1>
                <p className="how-hero-subtitle">
                  {t('forTenants.subtitle', 'HOMi helps you discover the right home, match with roommates, sign lease contracts online, pay rent securely, and report repairs instantly.')}
                </p>

                <div className="how-cta-row">
                  {isSignedIn ? (
                    <Link to="/browse-properties" className="how-btn-primary">
                      {t('forTenants.exploreProperties', 'Explore properties')}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="how-btn-primary"
                      onClick={() => setShowAuthModal(true)}
                    >
                      {t('forTenants.exploreProperties', 'Explore properties')}
                    </button>
                  )}
                  <Link to="/get-help" state={{ fromGuestHome: true }} className="how-btn-secondary">
                    {t('forTenants.seeSupport', 'See tenant support')}
                  </Link>
                </div>

                <div className="how-hero-metrics" aria-label="Quick highlights">
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>{t('forTenants.metricApplication', 'Application visibility')}</span>
                  </div>
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>{t('forTenants.metricPayments', 'Easy payment tracking')}</span>
                  </div>
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>{t('forTenants.metricMaintenance', 'Maintenance updates')}</span>
                  </div>
                </div>
              </div>

              <div className="how-hero-right">
                <div className="mock-dashboard-card">
                  <div className="mock-card-header">
                    <div className="mock-user-info">
                      <div className="mock-avatar">👩‍💼</div>
                      <div>
                        <h4>Sarah Jenkins</h4>
                        <span className="mock-badge-verified">✓ {t('forTenants.verifiedTenant', 'Verified Tenant')}</span>
                      </div>
                    </div>
                    <span className="mock-status-pill success">{t('forTenants.activeRental', 'Active Rental')}</span>
                  </div>

                  <div className="mock-card-body">
                    <div className="mock-rent-strip">
                      <span className="label">{t('forTenants.monthlyRent', 'Monthly Rent')}</span>
                      <span className="value">12,000 EGP</span>
                    </div>
                    <div className="mock-due-strip">
                      <span dangerouslySetInnerHTML={{ __html: t('forTenants.nextDue', 'Next Due: <strong>June 1, 2026</strong>') }} />
                      <span className="status-label paid">{t('forTenants.autoPaid', '✓ Auto-Paid')}</span>
                    </div>

                    <div className="mock-divider" />

                    <div className="mock-stats-row">
                      <div className="mock-stat-col">
                        <span className="stat-lbl">{t('forTenants.activeLeaseLbl', 'Active Lease')}</span>
                        <span className="stat-val">{t('forTenants.activeLeaseVal', '12 Months')}</span>
                      </div>
                      <div className="mock-stat-col">
                        <span className="stat-lbl">{t('forTenants.roommateScoreLbl', 'Roommate Score')}</span>
                        <span className="stat-val compatibility">{t('forTenants.roommateScoreVal', '98% Match')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Glass Chips */}
                  <div className="floating-glass-chip chip-1">
                    <span>{t('forTenants.walletBalance', '💳 Wallet: 25,800 EGP')}</span>
                  </div>
                  <div className="floating-glass-chip chip-2">
                    <span>{t('forTenants.acRepairFixed', '🔧 AC Repair: Fixed')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="how-section how-steps" aria-label="Step by step">
            <div className="how-container">
              <div className="how-section-head">
                <h2>{t('forTenants.stepsHeader', '8 steps for a smoother tenant journey')}</h2>
                <p>{t('forTenants.stepsSub', 'From first search to move-in management, each step is designed to save time.')}</p>
              </div>

              <div className="how-steps-timeline">
                {steps.map((step, idx) => (
                  <div
                    key={step.title}
                    className={`step-row reveal ${idx % 2 === 1 ? 'reverse' : ''}`}
                  >
                    <div className="step-content">
                      <div className="step-number-badge">
                        <div className="snb-circle">{idx + 1}</div>
                        <div className="snb-label">{step.label}</div>
                      </div>
                      <div className="step-content-title">{step.title}</div>
                      <div className="step-content-desc">{step.description}</div>
                      <div className="step-bullets">
                        {step.bullets.map((bullet, bIdx) => (
                          <div key={bIdx} className="step-bullet">
                            <div className="step-bullet-icon">✓</div>
                            {bullet}
                          </div>
                        ))}
                      </div>
                      <div className="step-tags">
                        {step.tags.map((tag) => (
                          <span key={tag} className="step-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="step-photo">
                      <img src={step.image} alt={step.title} />
                      <div className="step-photo-caption">
                        <strong>{step.imageCaptionTitle}</strong>
                        <span>{step.imageCaptionSub}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="how-section how-benefits" aria-label="Key benefits">
            <div className="how-container">
              <div className="how-section-head how-section-head--tight">
                <h2>{t('forTenants.benefitsHeader', 'Built for day-to-day tenant life')}</h2>
                <p>{t('forTenants.benefitsSub', 'Everything needed to stay organized before and after move-in.')}</p>
              </div>

              <div className="how-benefits-grid">
                {benefits.map((b) => (
                  <div key={b.title} className="how-benefit-card">
                    <div className="how-benefit-icon" aria-hidden="true">
                      {b.icon}
                    </div>
                    <h3>{b.title}</h3>
                    <p>{b.description}</p>
                  </div>
                ))}
              </div>

              <div className="how-two-col">
                <div className="how-callout how-callout--primary">
                  <div className="how-callout-icon" aria-hidden="true">
                    <ShieldCheck size={20} />
                  </div>
                  <h3>{t('forTenants.callout1Title', 'Transparent from search to signature')}</h3>
                  <p>
                    {t('forTenants.callout1Desc', 'Keep your rental process structured, with clearer updates and easier access to the details that matter.')}
                  </p>
                </div>

                <div className="how-callout how-callout--secondary">
                  <div className="how-callout-icon" aria-hidden="true">
                    <MessageSquare size={20} />
                  </div>
                  <h3>{t('forTenants.callout2Title', 'Resolve issues faster')}</h3>
                  <p>
                    {t('forTenants.callout2Desc', 'Use centralized communication and request tracking to avoid missed updates and long follow-ups.')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="how-section how-faq" aria-label="FAQ">
            <div className="how-container">
              <div className="how-section-head">
                <h2>{t('forTenants.faqHeader', 'Tenant FAQ')}</h2>
                <p>{t('forTenants.faqSub', 'Quick answers before you get started.')}</p>
              </div>

              <div className="how-faq-grid">
                {faqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <button
                      key={faq.id}
                      type="button"
                      className={`how-faq-item ${isOpen ? 'open' : ''}`}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="how-faq-question">{faq.question}</span>
                      <ChevronDown size={18} className="how-faq-chevron" aria-hidden="true" />
                      {isOpen && <span className="how-faq-answer">{faq.answer}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="how-faq-note">
                {t('forTenants.faqNote', 'Not sure where to begin? Start by browsing properties, then apply to your best matches.')}
              </div>
            </div>
          </section>

          <section className="how-section how-final-cta" aria-label="Final call to action">
            <div className="how-container">
              <div className="how-final-card">
                <div className="how-final-left">
                  <div className="how-final-badge">
                    <Sparkles size={18} />
                    {t('forTenants.ctaEyebrow', 'Quick start')}
                  </div>
                  <h2>{t('forTenants.ctaTitle', 'Ready to rent with less stress?')}</h2>
                  <p>
                    {t('forTenants.ctaSubtitle', 'Create your tenant account to discover properties, apply confidently, track payments, and manage maintenance.')}
                  </p>
                </div>
                <div className="how-final-actions">
                  <Link to="/auth" className="how-btn-primary how-btn-primary--big">
                    {t('forTenants.ctaBtn', 'Create tenant account')}
                  </Link>
                  {isSignedIn ? (
                    <Link to="/browse-properties" className="how-btn-secondary how-btn-secondary--big">
                      {t('forTenants.browseProperties', 'Browse properties')}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="how-btn-secondary how-btn-secondary--big"
                      onClick={() => setShowAuthModal(true)}
                    >
                      {t('forTenants.browseProperties', 'Browse properties')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>

      {showAuthModal ? <AuthModal onClose={() => setShowAuthModal(false)} /> : null}
    </div>
  );
};

export default ForTenants;

