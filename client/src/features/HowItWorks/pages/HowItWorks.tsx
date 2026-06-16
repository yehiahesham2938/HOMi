import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  GlobeLock,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  ChevronDown,
} from 'lucide-react';

import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Landlord/sidebar';
import Footer from '../../../components/global/footer';
import GuestNavbar from '../../../components/guest/GuestNavbar';
import './HowItWorks.css';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const HowItWorks: React.FC = () => {
  const [openFaqId, setOpenFaqId] = useState<string | null>('listing');
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
  const hideSidebar = fromGuestHome || !fromAppNavbar || !isSignedIn || storedUserRole !== 'LANDLORD';

  useEffect(() => {
    // Keep users on the correct role page if they were routed here from the app navbar.
    if (!fromAppNavbar || !isSignedIn || storedUserRole !== 'TENANT') return;
    navigate('/for-tenants', { replace: true, state: { fromAppNavbar: true } });
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
        label: 'Step One',
        title: 'Create Your Landlord Account',
        description: 'Register as a landlord and set up your verified profile. Your account is the control center for all your properties, tenants, and rental income.',
        bullets: [
          'Register with your name, contact info, and ID',
          'Verify your account for landlord trust badge',
          'Set up your property management profile',
          'Access your central landlord dashboard'
        ],
        tags: ['Landlord Registration', 'Verification', 'Dashboard'],
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Account Setup',
        imageCaptionSub: 'Setup your property profile in minutes'
      },
      {
        label: 'Step Two',
        title: 'List Your Properties',
        description: 'Add details, pricing, photos, and ownership documents for your properties. Our team will verify the listing to publish it to eager renters.',
        bullets: [
          'Specify rooms, bathrooms, amenities, and rent',
          'Upload high-quality images and legal documents',
          'Pin location on the map for renters to browse',
          'Listing goes live upon successful verification'
        ],
        tags: ['List Properties', 'Verification', 'Active Listings'],
        image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80&fit=crop',
        imageCaptionTitle: 'List Units',
        imageCaptionSub: 'Upload property parameters and photos'
      },
      {
        label: 'Step Three',
        title: 'Review Tenant Applications',
        description: 'Incoming rental applications show up on your dashboard. Read tenant resumes, check match compatibility scores, and accept applicants with a click.',
        bullets: [
          'Check verified profile details and message history',
          'Review compatibility and tenant background summaries',
          'Accept or reject application directly in portal',
          'Generate contract terms once approved'
        ],
        tags: ['Applications', 'Background Info', 'Match Scores'],
        image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Review Tenant Info',
        imageCaptionSub: 'Screen applicant resumes safely online'
      },
      {
        label: 'Step Four',
        title: 'Sign the Digital Lease Agreement',
        description: 'Customize lease parameters like rent amount, deposit, late fees, and maintenance responsibilities. Review and sign the digital lease agreement, then send it to the tenant.',
        bullets: [
          'Set start dates, end dates, and custom clauses',
          'Allocate maintenance responsibilities transparently',
          'Sign digitally to execute contract legally',
          'Automatic notification sent to tenant to sign'
        ],
        tags: ['Lease Agreement', 'Digital Signatures', 'Custom Clauses'],
        image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Legal Setup',
        imageCaptionSub: 'Legally binding contracts stored securely'
      },
      {
        label: 'Step Five',
        title: 'Receive Rent in Your Wallet',
        description: 'Tenant rent is processed directly on the platform and deposited into your secure HOMI wallet. Keep track of current payments and withdraw earnings anytime.',
        bullets: [
          'Receive rent automatically at the start of each month',
          'Track due payments and send automatic reminders',
          'Withdraw funds directly to your verified bank account',
          'Full accounting records and invoices provided'
        ],
        tags: ['Rent Collection', 'HOMI Wallet', 'Bank Withdrawal'],
        image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Automatic Payouts',
        imageCaptionSub: 'No rent collection hassle — fully trackable'
      },
      {
        label: 'Step Six',
        title: 'Manage Maintenance Responsibilities',
        description: 'Stay informed about your properties. Review, delegate, and monitor resolution of tenant-reported maintenance issues directly from the dashboard.',
        bullets: [
          'Get instant notifications when a tenant submits a request',
          'Assign verified service providers in just a click',
          'Track progress live from submitted to complete',
          'Direct messaging logs for all property events'
        ],
        tags: ['Maintenance Control', 'Provider Match', 'Event Logs'],
        image: 'https://images.unsplash.com/photo-1421789665209-c9b2a435e3dc?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Oversight Dashboard',
        imageCaptionSub: 'Resolve issues fast, keep tenants happy'
      }
    ],
    []
  );

  const benefits = useMemo(
    () => [
      {
        title: 'Trust & verification',
        description: 'Safer leasing with clearer records and secure, structured workflows.',
        icon: <ShieldCheck size={20} />,
      },
      {
        title: 'Payments made simple',
        description: 'Automate rent tracking and keep billing transparent for both sides.',
        icon: <CreditCard size={20} />,
      },
      {
        title: 'Central messaging',
        description: 'Communicate with tenants without losing context across emails and calls.',
        icon: <MessageSquare size={20} />,
      },
      {
        title: 'Privacy-aware onboarding',
        description: 'HOMi is built to handle sensitive rental data responsibly.',
        icon: <GlobeLock size={20} />,
      },
    ],
    []
  );

  const faqs: FaqItem[] = useMemo(
    () => [
      {
        id: 'listing',
        question: 'How long does it take to list a property?',
        answer:
          'Most landlords can create a listing in a few minutes. Add basic details first, then refine photos and requirements as needed.',
      },
      {
        id: 'tenants',
        question: 'How does matching work?',
        answer:
          'HOMi helps connect landlords and tenants by aligning listing details with applicant intent—reducing time spent on unsuitable inquiries.',
      },
      {
        id: 'contracts',
        question: 'Can I manage lease documents in one place?',
        answer:
          'Yes. Contract history stays centralized so you can quickly access documents when renewing, troubleshooting, or verifying terms.',
      },
      {
        id: 'support',
        question: 'What if I need help during onboarding?',
        answer:
          'You can use the Help Center and support channels to get guidance. Start small with one property, then scale as you get comfortable.',
      },
    ],
    []
  );

  return (
    <div className={`how-page-layout ${hideSidebar ? 'how-page-layout--no-sidebar' : ''}`}>
      {!hideSidebar && <Sidebar />}

      <div className="how-main-content">
        {hideSidebar ? <GuestNavbar /> : <Header />}

        <main className="how-content" aria-label="How HOMi works for landlords">
          <section className="how-hero">
            <div className="how-hero-bg" aria-hidden="true" />

            <div className="how-hero-container">
              <div className="how-hero-left">
                <span className="how-badge">🏗️ Landlord Journey</span>
                <h1>
                  List properties and collect<br />
                  <span className="gradient-text">rent on autopilot.</span>
                </h1>
                <p className="how-hero-subtitle">
                  HOMi helps landlords list units, screen verified applicants, draft digital leases, collect automatic payouts, and handle repairs online.
                </p>

                <div className="how-cta-row">
                  <Link to="/auth" className="how-btn-primary">
                    Get started
                  </Link>
                  <Link to="/get-help" state={{ fromGuestHome: true }} className="how-btn-secondary">
                    See how support works
                  </Link>
                </div>

                <div className="how-hero-metrics" aria-label="Quick highlights">
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>Centralized documents</span>
                  </div>
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>Maintenance tracking</span>
                  </div>
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>Clear payment visibility</span>
                  </div>
                </div>
              </div>

              <div className="how-hero-right">
                <div className="mock-dashboard-card">
                  <div className="mock-card-header">
                    <div className="mock-user-info">
                      <div className="mock-avatar">🏢</div>
                      <div>
                        <h4>Delta Properties</h4>
                        <span className="mock-badge-verified">✓ Verified Owner</span>
                      </div>
                    </div>
                    <span className="mock-status-pill success landlord">Manage Mode</span>
                  </div>

                  <div className="mock-card-body">
                    <div className="mock-rent-strip">
                      <span className="label">Monthly Revenue</span>
                      <span className="value">84,000 EGP</span>
                    </div>
                    <div className="mock-due-strip">
                      <span>Occupancy Rate: <strong>96.4%</strong></span>
                      <span className="status-label trend">↑ Stable</span>
                    </div>

                    <div className="mock-divider" />

                    <div className="mock-stats-row">
                      <div className="mock-stat-col">
                        <span className="stat-lbl">Active Units</span>
                        <span className="stat-val">12 Listed</span>
                      </div>
                      <div className="mock-stat-col">
                        <span className="stat-lbl">New Inquiries</span>
                        <span className="stat-val highlight">3 Applications</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Glass Chips */}
                  <div className="floating-glass-chip chip-1">
                    <span>✍️ 1 Lease Awaiting Signature</span>
                  </div>
                  <div className="floating-glass-chip chip-2">
                    <span>🔧 AC Repair Assigned</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="how-section how-steps" aria-label="Step by step">
            <div className="how-container">
              <div className="how-section-head">
                <h2>6 steps to manage your rentals</h2>
                <p>Every step is designed to reduce friction and help you lease faster.</p>
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
                <h2>Built for real landlord workflows</h2>
                <p>Everything you need to keep properties running smoothly.</p>
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
                  <h3>Verified, organized, and secure</h3>
                  <p>
                    Reduce chaos by keeping the rental journey structured—from listing details to contract history.
                  </p>
                </div>

                <div className="how-callout how-callout--secondary">
                  <div className="how-callout-icon" aria-hidden="true">
                    <MessageSquare size={20} />
                  </div>
                  <h3>Faster communication</h3>
                  <p>
                    Keep conversations and maintenance updates in one place, so you can resolve issues sooner.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="how-section how-faq" aria-label="FAQ">
            <div className="how-container">
              <div className="how-section-head">
                <h2>Landlord FAQ</h2>
                <p>Quick answers before you start.</p>
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
                Not sure where to begin? Start with one property and use the Help Center whenever you need guidance.
              </div>
            </div>
          </section>

          <section className="how-section how-final-cta" aria-label="Final call to action">
            <div className="how-container">
              <div className="how-final-card">
                <div className="how-final-left">
                  <div className="how-final-badge">
                    <Sparkles size={18} />
                    Quick start
                  </div>
                  <h2>Ready to manage rentals end to end?</h2>
                  <p>Create your landlord account and streamline listing, tenant matching, contracts, payments, and maintenance.</p>
                </div>
                <div className="how-final-actions">
                  <Link to="/auth" className="how-btn-primary how-btn-primary--big">
                    List your first property
                  </Link>

                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default HowItWorks;

