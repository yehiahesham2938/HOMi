import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X } from 'lucide-react';
import './GuestHome.css';
import AuthModal from '../../../components/global/AuthModal';
import Footer from '../../../components/global/footer';

const GuestHome: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Redesign tabs and accordion states
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant');
  const [activeStepsTab, setActiveStepsTab] = useState<'tenant-steps' | 'landlord-steps'>('tenant-steps');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const getHelpFromGuest = {
    pathname: '/get-help',
    state: { fromGuestHome: true },
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for scroll reveal animations
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
  }, [activeTab, activeStepsTab]);

  return (
    <div className="guest-layout">
      {/* 1. Glassmorphic Navbar (Header stays same) */}
      <nav className={`guest-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <Link to="/guest-home" className="brand-logo">
            <img src="/logo.png" alt="HOMi Logo" className="logo-image" />
          </Link>

          <div className="nav-links desktop-only">
            <Link to="/guest-search">{t('guestHome.browseHomes')}</Link>
            <Link to="/how-it-works-choose">{t('guestHome.howItWorks')}</Link>
            <Link to={getHelpFromGuest}>{t('guestHome.helpCenter')}</Link>
          </div>

          <div className="nav-actions desktop-only">
            <button className="lang-toggle-btn" onClick={toggleLanguage} title={i18n.language === 'en' ? 'Arabic' : 'English'}>
              <Globe size={18} />
              <span>{i18n.language === 'en' ? 'ع' : 'En'}</span>
            </button>
            <button className="btn-text" onClick={() => navigate('/auth')}>{t('guestHome.login')}</button>
            <button className="btn-primary-pill" onClick={() => navigate('/auth')}>{t('guestHome.signup')}</button>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-nav-panel">
            <Link to="/guest-search" onClick={() => setMobileMenuOpen(false)}>{t('guestHome.browseHomes')}</Link>
            <Link to="/how-it-works-choose" onClick={() => setMobileMenuOpen(false)}>{t('guestHome.howItWorks')}</Link>
            <Link to={getHelpFromGuest} onClick={() => setMobileMenuOpen(false)}>{t('guestHome.helpCenter')}</Link>
            <div className="mobile-lang-row">
              <button className="lang-toggle-btn" onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}>
                <Globe size={18} />
                <span>{i18n.language === 'en' ? 'Arabic' : 'English'}</span>
              </button>
            </div>
            <button className="btn-text mobile-nav-login" onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
              {t('guestHome.login')}
            </button>
            <button className="btn-primary-pill mobile-nav-signup" onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
              {t('guestHome.signup')}
            </button>
          </div>
        )}
      </nav>

      {/* 2. Hero Section (Hero heading paragraph stays same, but buttons are outline class) */}
      <section className="hero">
        <div className="hero-badge">
          <div className="badge-dot"></div>
          {t('guestHome.ratedPlatformEgypt')}
        </div>
        <h1 className="hero-title animate-slide-up">
          <span className="accent">{t('guestHome.findPerfectHome')}</span> <br />
          <span className="outline">{t('guestHome.withoutHassle')}</span>
        </h1>
        <p className="hero-sub animate-slide-up-delayed">
          {t('guestHome.heroSubtitle')}
        </p>
        <div className="hero-btns animate-slide-up-delayed-more">
          <a href="#steps" className="btn-outline">{t('guestHome.howItWorks')} ›</a>
          <button onClick={() => navigate('/auth')} className="btn-outline">{t('guestHome.getStartedNow')}</button>
        </div>
        <div className="hero-img reveal animate-slide-up-delayed-more">
          <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80&fit=crop" alt="Modern apartment building" />
          <div className="hero-img-overlay">
            <div className="hero-chip">🏠 {t('guestHome.browseHomes')}</div>
            <div className="hero-chip">📄 {t('guestHome.sign')}</div>
            <div className="hero-chip">💳 {t('guestHome.payMoveIn')}</div>
            <div className="hero-chip">🔧 {t('tenantHomeComponents.maintenance')}</div>
          </div>
        </div>
      </section>

      {/* 3. Stats Strip */}
      <div className="stats-strip reveal">
        <div className="stat">
          <div className="stat-num">100%</div>
          <div className="stat-label">{t('guestHome.verified')} Process</div>
        </div>
        <div className="stat">
          <div className="stat-num">2 Roles</div>
          <div className="stat-label">Tenant & Landlord</div>
        </div>
        <div className="stat">
          <div className="stat-num">6 Steps</div>
          <div className="stat-label">Apply to Move-In</div>
        </div>
        <div className="stat">
          <div className="stat-num">24/7</div>
          <div className="stat-label">Maintenance Reporting</div>
        </div>
        <div className="stat">
          <div className="stat-num">Safe</div>
          <div className="stat-label">Encrypted Wallet</div>
        </div>
      </div>

      {/* 4. Platform Overview */}
      <section id="how">
        <div className="section-header reveal">
          <div className="section-tag">Platform Overview</div>
          <h2 className="section-title">Everything In One Place</h2>
        </div>

        <div className="tabs-container">
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === 'tenant' ? 'active' : ''}`}
              onClick={() => setActiveTab('tenant')}
            >
              🏠 I'm a Tenant
            </button>
            <button
              className={`tab-btn ${activeTab === 'landlord' ? 'active' : ''}`}
              onClick={() => setActiveTab('landlord')}
            >
              🏗️ I'm a Landlord
            </button>
          </div>

          {/* TENANT FEATURE GRID */}
          <div className={`tab-panel ${activeTab === 'tenant' ? 'active' : ''}`} id="tab-tenant">
            <div className="feature-grid">
              <div className="feature-card wide reveal">
                <div className="feature-icon">🔍</div>
                <div className="feature-title">Find Your Perfect Home</div>
                <div className="feature-desc">Browse verified listings with smart filters. Every property shows full details, photos, and pricing. Apply directly through the platform with a single click.</div>
                <div className="step-list">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-text"><strong>Create your account</strong> — build a verified tenant profile with your details and preferences.</div>
                  </div>
                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-text"><strong>Search properties</strong> — filter by area, price, size, and amenities to find the right fit.</div>
                  </div>
                  <div className="step-item">
                    <div className="step-num">3</div>
                    <div className="step-text"><strong>Apply online</strong> — submit your rental application instantly, no paperwork needed.</div>
                  </div>
                </div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🤝</div>
                <div className="feature-title">Roommate Matching</div>
                <div className="feature-desc">Post a profile, set your preferences, and connect with compatible co-tenants based on lifestyle, budget, and preferred area.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">📄</div>
                <div className="feature-title">Digital Lease Signing</div>
                <div className="feature-desc">Review every clause of your contract and sign digitally — legally binding, no printing or scanning required.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">💳</div>
                <div className="feature-title">Pay Rent via Wallet</div>
                <div className="feature-desc">Top up your HOMI wallet and pay monthly rent in seconds. Full payment history and automatic reminders included.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🏡</div>
                <div className="feature-title">Manage Active Rental</div>
                <div className="feature-desc">View lease details, rental duration, contact your landlord, and stay on top of your active tenancy — all from one dashboard.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🔧</div>
                <div className="feature-title">Maintenance Requests</div>
                <div className="feature-desc">Report issues instantly, track resolution in real time, and communicate directly with maintenance providers through the app.</div>
              </div>
            </div>
          </div>

          {/* LANDLORD FEATURE GRID */}
          <div className={`tab-panel ${activeTab === 'landlord' ? 'active' : ''}`} id="tab-landlord">
            <div className="feature-grid">
              <div className="feature-card wide reveal">
                <div className="feature-icon">🏗️</div>
                <div className="feature-title">Manage All Your Properties</div>
                <div className="feature-desc">List unlimited properties with photos, pricing, and availability. Edit anytime, mark units as occupied, and control every listing from your central dashboard.</div>
                <div className="step-list">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-text"><strong>Create your landlord account</strong> — verify identity and set up your management profile.</div>
                  </div>
                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-text"><strong>List properties</strong> — add details, photos, and pricing in minutes.</div>
                  </div>
                  <div className="step-item">
                    <div className="step-num">3</div>
                    <div className="step-text"><strong>Review & accept</strong> — view applicant profiles and decide who moves in.</div>
                  </div>
                </div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">👥</div>
                <div className="feature-title">Review Applications</div>
                <div className="feature-desc">See complete tenant profiles, rental history, and application details. Accept or reject with one tap — all communication stays in the platform.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">✍️</div>
                <div className="feature-title">Sign Lease Contracts</div>
                <div className="feature-desc">Generate, review, and digitally sign leases. Both parties receive secure, stored copies accessible anytime.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">💰</div>
                <div className="feature-title">Receive & Withdraw Rent</div>
                <div className="feature-desc">Monthly rent lands in your HOMI wallet automatically. Withdraw to your bank at any time with a full earnings history.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🔩</div>
                <div className="feature-title">Maintenance Oversight</div>
                <div className="feature-desc">Monitor all tenant-reported issues across your properties. Assign providers, track status, and resolve efficiently.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">📊</div>
                <div className="feature-title">Property Analytics</div>
                <div className="feature-desc">Occupancy rates, income reports, and portfolio performance at a glance — make data-driven decisions.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Step-by-Step Breakdown */}
      <section id="steps" className="steps-section">
        <div className="section-header reveal" style={{ background: 'var(--gray-50)', paddingTop: '5rem' }}>
          <div className="section-tag">Step-by-Step Guide</div>
          <h2 className="section-title">How HOMI Works</h2>
        </div>

        <div className="steps-tabs-bar">
          <button
            className={`steps-tab ${activeStepsTab === 'tenant-steps' ? 'active' : ''}`}
            onClick={() => setActiveStepsTab('tenant-steps')}
          >
            🏠 Tenant Journey
          </button>
          <button
            className={`steps-tab ${activeStepsTab === 'landlord-steps' ? 'active' : ''}`}
            onClick={() => setActiveStepsTab('landlord-steps')}
          >
            🏗️ Landlord Journey
          </button>
        </div>

        {/* TENANT STEPS PANEL (All step-photo-badges removed) */}
        <div className={`steps-panel ${activeStepsTab === 'tenant-steps' ? 'active' : ''}`} id="tenant-steps">
          {/* Step 1 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">1</div>
                <div className="snb-label">Step One</div>
              </div>
              <div className="step-content-title">Create Your Tenant Account</div>
              <div className="step-content-desc">Start your journey by registering as a tenant on HOMI. Your profile becomes your trusted digital identity across the platform — landlords will review it when you apply.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Enter your personal information and contact details</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Upload an ID for profile verification</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Set your rental preferences (area, budget, size)</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Receive a verified badge on your profile</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Registration</span>
                <span className="step-tag">Verification</span>
                <span className="step-tag">Profile Setup</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80&fit=crop" alt="Person setting up account on laptop" />
              <div className="step-photo-caption"><strong>Account Registration</strong><span>Quick sign-up — ready in under 2 minutes</span></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">2</div>
                <div className="snb-label">Step Two</div>
              </div>
              <div className="step-content-title">Search & Browse Properties</div>
              <div className="step-content-desc">Explore a wide marketplace of verified rental listings. Use powerful filters to narrow down properties by location, price range, number of rooms, amenities, and availability date.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Filter by area, price, size, and amenities</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>View high-resolution photos of every property</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Read full property descriptions and landlord details</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Save favorites and compare multiple listings</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Property Search</span>
                <span className="step-tag">Smart Filters</span>
                <span className="step-tag">Favorites</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80&fit=crop" alt="Apartment building exterior" />
              <div className="step-photo-caption"><strong>Browse Verified Listings</strong><span>Hundreds of properties across all areas</span></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">3</div>
                <div className="snb-label">Step Three</div>
              </div>
              <div className="step-content-title">Find a Roommate (Optional)</div>
              <div className="step-content-desc">Looking to share? Use HOMI's roommate matching system to connect with compatible people. Post your profile with your lifestyle preferences and let the platform surface suitable matches.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Create a roommate profile with your preferences</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Browse and filter compatible roommate profiles</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Contact matches directly through the platform</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Apply for a shared unit together</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Roommate Matching</span>
                <span className="step-tag">Shared Rentals</span>
                <span className="step-tag">Messaging</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&fit=crop" alt="Two people discussing housing" />
              <div className="step-photo-caption"><strong>Roommate Matching</strong><span>Find someone compatible, not just available</span></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">4</div>
                <div className="snb-label">Step Four</div>
              </div>
              <div className="step-content-title">Submit a Rental Application</div>
              <div className="step-content-desc">Found the right place? Apply with a single click. Your tenant profile is automatically attached so the landlord sees everything they need — no forms to fill, no documents to scan.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Submit your application directly from the listing</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Your verified profile is attached automatically</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Add a personal note or message to the landlord</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Track your application status in real time</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Rental Application</span>
                <span className="step-tag">One-Click Apply</span>
                <span className="step-tag">Status Tracking</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop" alt="Person filling rental application" />
              <div className="step-photo-caption"><strong>Apply Instantly</strong><span>No paperwork — everything is digital</span></div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">5</div>
                <div className="snb-label">Step Five</div>
              </div>
              <div className="step-content-title">Review & Sign Your Lease</div>
              <div className="step-content-desc">Once accepted, your lease contract is generated on the platform. Read every term in detail, ask questions, and sign digitally when you're ready — fully legal and secure.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>View the full contract with all terms and clauses</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Both tenant and landlord sign digitally</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Signed copy stored securely in your account</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Access your contract anytime from your dashboard</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Lease Contract</span>
                <span className="step-tag">Digital Signature</span>
                <span className="step-tag">Secure Storage</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop" alt="Signing a rental contract" />
              <div className="step-photo-caption"><strong>Digital Lease Signing</strong><span>Legally binding — no printing needed</span></div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">6</div>
                <div className="snb-label">Step Six</div>
              </div>
              <div className="step-content-title">Pay Rent Through Your Wallet</div>
              <div className="step-content-desc">Top up your HOMI wallet and pay monthly rent in just a few taps. No bank transfers, no cash — everything is tracked, timestamped, and confirmed automatically.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Add funds to your wallet with ease</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Pay your monthly rent directly to the landlord</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Receive payment confirmations and receipts</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Full transaction history always available</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Wallet Rent Payment</span>
                <span className="step-tag">Instant Payment</span>
                <span className="step-tag">Receipts</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&fit=crop" alt="Digital payment on phone" />
              <div className="step-photo-caption"><strong>Wallet Rent Payment</strong><span>Instant, trackable, and always confirmed</span></div>
            </div>
          </div>

          {/* Step 7 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">7</div>
                <div className="snb-label">Step Seven</div>
              </div>
              <div className="step-content-title">Manage Your Active Rental</div>
              <div className="step-content-desc">You're in! Your active rental dashboard gives you a complete view of your tenancy — lease dates, upcoming payments, landlord contact, and everything about your current home.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>View lease start date, end date, and monthly rent</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>See upcoming due dates and payment schedule</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Access landlord contact directly from the dashboard</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>View full rental history and all past payments</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Rental Dashboard</span>
                <span className="step-tag">Lease Details</span>
                <span className="step-tag">Payment History</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&fit=crop" alt="Modern apartment interior living" />
              <div className="step-photo-caption"><strong>Your Home Dashboard</strong><span>Everything about your tenancy, in one view</span></div>
            </div>
          </div>

          {/* Step 8 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">8</div>
                <div className="snb-label">Step Eight</div>
              </div>
              <div className="step-content-title">Report Maintenance Issues</div>
              <div className="step-content-desc">Spot a problem in your unit? Submit a maintenance request instantly. Describe the issue, attach photos, and track the resolution in real time — with direct contact to the assigned provider.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Post a request with description and urgency level</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Attach photos to document the issue clearly</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Track the status from submitted to resolved</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Contact the assigned maintenance provider directly</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Maintenance Request</span>
                <span className="step-tag">Status Tracking</span>
                <span className="step-tag">Provider Contact</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop" alt="Maintenance worker repairing apartment" />
              <div className="step-photo-caption"><strong>Maintenance Reporting</strong><span>Fast response, real-time updates</span></div>
            </div>
          </div>
        </div>

        {/* LANDLORD STEPS PANEL (All step-photo-badges removed) */}
        <div className={`steps-panel ${activeStepsTab === 'landlord-steps' ? 'active' : ''}`} id="landlord-steps">
          {/* Step 1 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">1</div>
                <div className="snb-label">Step One</div>
              </div>
              <div className="step-content-title">Create Your Landlord Account</div>
              <div className="step-content-desc">Register as a landlord and set up your verified profile. Your account is the control center for all your properties, tenants, and rental income.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Register with your name, contact info, and ID</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Verify your account for landlord trust badge</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Set up your property management profile</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Access your central landlord dashboard</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Landlord Registration</span>
                <span className="step-tag">Verification</span>
                <span className="step-tag">Dashboard</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&fit=crop" alt="Real estate professional" />
              <div className="step-photo-caption"><strong>Account Setup</strong><span>Setup your property profile in minutes</span></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">2</div>
                <div className="snb-label">Step Two</div>
              </div>
              <div className="step-content-title">List Your Properties</div>
              <div className="step-content-desc">Add details, pricing, photos, and ownership documents for your properties. Our team will verify the listing to publish it to eager renters.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Specify rooms, bathrooms, amenities, and rent</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Upload high-quality images and legal documents</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Pin location on the map for renters to browse</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Listing goes live upon successful verification</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">List Properties</span>
                <span className="step-tag">Verification</span>
                <span className="step-tag">Active Listings</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80&fit=crop" alt="Keys in front of house" />
              <div className="step-photo-caption"><strong>List Units</strong><span>Upload property parameters and photos</span></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">3</div>
                <div className="snb-label">Step Three</div>
              </div>
              <div className="step-content-title">Review Tenant Applications</div>
              <div className="step-content-desc">Incoming rental applications show up on your dashboard. Read tenant resumes, check match compatibility scores, and accept applicants with a click.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Check verified profile details and message history</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Review compatibility and tenant background summaries</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Accept or reject application directly in portal</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Generate contract terms once approved</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Applications</span>
                <span className="step-tag">Background Info</span>
                <span className="step-tag">Match Scores</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80&fit=crop" alt="Reviewing document on tablet" />
              <div className="step-photo-caption"><strong>Review Tenant Info</strong><span>Screen applicant resumes safely online</span></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">4</div>
                <div className="snb-label">Step Four</div>
              </div>
              <div className="step-content-title">Sign the Digital Lease Agreement</div>
              <div className="step-content-desc">Customize lease parameters like rent amount, deposit, late fees, and maintenance responsibilities. Review and sign the digital lease agreement, then send it to the tenant.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Set start dates, end dates, and custom clauses</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Allocate maintenance responsibilities transparently</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Sign digitally to execute contract legally</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Automatic notification sent to tenant to sign</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Lease Agreement</span>
                <span className="step-tag">Digital Signatures</span>
                <span className="step-tag">Custom Clauses</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80&fit=crop" alt="Analytics on laptop screen" />
              <div className="step-photo-caption"><strong>Legal Setup</strong><span>Legally binding contracts stored securely</span></div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">5</div>
                <div className="snb-label">Step Five</div>
              </div>
              <div className="step-content-title">Receive Rent in Your Wallet</div>
              <div className="step-content-desc">Tenant rent is processed directly on the platform and deposited into your secure HOMI wallet. Keep track of current payments and withdraw earnings anytime.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Receive rent automatically at the start of each month</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Track due payments and send automatic reminders</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Withdraw funds directly to your verified bank account</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Full accounting records and invoices provided</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Rent Collection</span>
                <span className="step-tag">HOMI Wallet</span>
                <span className="step-tag">Bank Withdrawal</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80&fit=crop" alt="Wallet and money on table" />
              <div className="step-photo-caption"><strong>Automatic Payouts</strong><span>No rent collection hassle — fully trackable</span></div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">6</div>
                <div className="snb-label">Step Six</div>
              </div>
              <div className="step-content-title">Manage Maintenance Responsibilities</div>
              <div className="step-content-desc">Stay informed about your properties. Review, delegate, and monitor resolution of tenant-reported maintenance issues directly from the dashboard.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Get instant notifications when a tenant submits a request</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Assign verified service providers in just a click</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Track progress live from submitted to complete</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Direct messaging logs for all property events</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Maintenance Control</span>
                <span className="step-tag">Provider Match</span>
                <span className="step-tag">Event Logs</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1421789665209-c9b2a435e3dc?w=800&q=80&fit=crop" alt="Tools on table" />
              <div className="step-photo-caption"><strong>Oversight Dashboard</strong><span>Resolve issues fast, keep tenants happy</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Dual Persona (Roles section - buttons changed to navigate to /auth and class outline) */}
      <section className="roles-section">
        <div className="roles-grid">
          {/* Tenant Card */}
          <div className="role-card tenant" data-emoji="🏠">
            <div className="role-badge-pill">For Tenants</div>
            <h3 className="role-title">Find Your Happy Place</h3>
            <p className="role-desc">Browse thousands of verified listings with high-quality photos. Apply digitally, match with roommates, sign your lease contract online, pay your monthly rent via credit card, and report repairs instantly.</p>
            <div className="role-features">
              <div className="role-feat"><span className="check">✓</span> 100% verified listings and landlords</div>
              <div className="role-feat"><span className="check">✓</span> Zero hidden broker fees or surprise commissions</div>
              <div className="role-feat"><span className="check">✓</span> Legally binding digital lease agreements</div>
              <div className="role-feat"><span className="check">✓</span> Monthly rent payments through credit/debit card</div>
            </div>
            <button onClick={() => navigate('/auth')} className="btn-outline">Get Started Now ›</button>
          </div>

          {/* Landlord Card */}
          <div className="role-card landlord" data-emoji="🏗️">
            <div className="role-badge-pill">For Landlords</div>
            <h3 className="role-title">Manage Your Units on Autopilot</h3>
            <p className="role-desc">Maximize your portfolio's occupancy and yield. List properties, screen tenant profiles and backgrounds, draft and sign lease agreements online, receive direct rent deposits into your wallet, and assign maintenance providers.</p>
            <div className="role-features">
              <div className="role-feat"><span className="check">✓</span> Secure identity and profile checks for tenants</div>
              <div className="role-feat"><span className="check">✓</span> Automated lease drafting and secure signature storage</div>
              <div className="role-feat"><span className="check">✓</span> Direct tenant rent payouts to your bank account</div>
              <div className="role-feat"><span className="check">✓</span> Full oversight of active maintenance work orders</div>
            </div>
            <button onClick={() => navigate('/auth')} className="btn-outline" style={{ color: '#16a34a', borderColor: '#16a34a' }}>List Your Property ›</button>
          </div>
        </div>
      </section>

      {/* 7. Wallet Showcase (Pay Rent / Withdraw redirecting to /auth) */}
      <section id="wallet" className="wallet-section">
        <div className="section-header reveal">
          <div className="section-tag">Secure Wallet</div>
          <h2 className="section-title">Built-in Financial Control</h2>
        </div>

        <div className="wallet-card reveal">
          <div className="wallet-left">
            <div className="wallet-balance-label">Available Balance</div>
            <div className="wallet-balance">25,800.00 <em>EGP</em></div>
            <div className="wallet-actions">
              <button onClick={() => navigate('/auth')} className="wallet-btn pay">Pay Rent</button>
              <button onClick={() => navigate('/auth')} className="wallet-btn">Withdraw</button>
            </div>
            <div className="wallet-tx">
              <div className="tx-label">Recent Transactions</div>
              <div className="tx-row">
                <span className="tx-name">Rent Payment — Unit 401</span>
                <span className="tx-amount out">-12,000 EGP</span>
              </div>
              <div className="tx-row">
                <span className="tx-name">Security Deposit Ref.</span>
                <span className="tx-amount in">+8,000 EGP</span>
              </div>
              <div className="tx-row">
                <span className="tx-name">Wallet Top-Up</span>
                <span className="tx-amount in">+15,000 EGP</span>
              </div>
            </div>
          </div>

          <div className="wallet-right">
            <h3>Fast, Safe, and Automated</h3>
            <p>HOMI's secure billing system guarantees that rent collection and payment processing runs without friction. Say goodbye to manual bank transfers and cash collections.</p>
            <div className="wallet-points">
              <div className="wp">
                <div className="wp-icon">🏦</div>
                <div>Withdraw your earnings to your registered bank account at any time.</div>
              </div>
              <div className="wp">
                <div className="wp-icon">📋</div>
                <div>All transactions are logged, timestamped, and fully traceable for your records.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ accordion */}
      <section id="faq">
        <div className="section-header reveal">
          <div className="section-tag">Common Questions</div>
          <h2 className="section-title">Frequently Asked</h2>
        </div>
        <div className="faq reveal">
          <div className={`faq-item ${openFaqIndex === 0 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}>
              Is HOMI free to use?
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              Creating an account is completely free for both tenants and landlords. All core features are available at no cost. You'll always know what's free and what isn't before using any feature.
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 1 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}>
              How does digital lease signing work?
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              Once an application is accepted, a lease contract is auto-generated with all agreed terms. Both the tenant and landlord review and sign digitally on the platform. Signed copies are stored securely and accessible to both parties forever.
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 2 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}>
              How secure is the wallet and my payments?
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              Your wallet is protected with industry-standard encryption. All transactions are logged and auditable. Funds can only be sent to verified landlords, and withdrawals go only to your registered bank account.
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 3 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}>
              Can I list multiple properties as a landlord?
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              Yes — landlords can list and manage as many properties as they own. Each property has its own dedicated page, applications queue, and tenant management tools.
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 4 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 4 ? null : 4)}>
              How does the roommate matching feature work?
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              Tenants create a roommate profile with their preferences — lifestyle habits, budget, preferred area, and schedule. HOMI surfaces compatible profiles and lets you message potential roommates directly through the platform.
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 5 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 5 ? null : 5)}>
              What happens after I submit a maintenance request?
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              Your request becomes immediately visible to your landlord. You can include photos and urgency level. You'll be notified as the status changes — from submitted → assigned → resolved. You can also contact the assigned maintenance provider directly.
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 6 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 6 ? null : 6)}>
              How long does the rental application process take?
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              Applying takes under a minute — just click Apply on any listing and your profile is attached automatically. The landlord is notified instantly and you'll receive their decision as a notification on the platform.
            </div>
          </div>
        </div>
      </section>

      {/* 9. CTA Banner (buttons redirecting to /auth) */}
      <section id="start" className="cta-section">
        <div className="cta-box reveal">
          <div style={{ fontSize: '3rem', marginBottom: '1rem', position: 'relative' }}>🏠</div>
          <h2>Ready to Get Started?</h2>
          <p>Join HOMI today and experience rental management the way it should be — simple, transparent, and fully digital.</p>
          <div className="cta-btns">
            <button onClick={() => navigate('/auth')} className="btn-white">Create Tenant Account ›</button>
            <button onClick={() => navigate('/auth')} className="btn-white-outline">List Your Property</button>
          </div>
        </div>
      </section>

      {/* 10. Footer (Footer stays same) */}
      <Footer />

      {/* Reusable Auth Modal for Guests */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

export default GuestHome;