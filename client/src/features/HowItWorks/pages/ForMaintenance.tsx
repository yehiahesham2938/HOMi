import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  GlobeLock,
  MessageSquare,
  Wrench,
  ShieldCheck,
  Sparkles,
  Home,
  UserCheck,
} from 'lucide-react';

import Header from '../../../components/global/header';
import Sidebar from '../../Maintenance/MaintenanceProvider/SideBar/MaintenanceSideBar';
import Footer from '../../../components/global/footer';
import GuestNavbar from '../../../components/guest/GuestNavbar';
import AuthModal from '../../../components/global/AuthModal';
import './ForTenants.css'; // Reuse tenant page layouts

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const ForMaintenance: React.FC = () => {
  const [openFaqId, setOpenFaqId] = useState<string | null>('registration');
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
  const hideSidebar = fromGuestHome || !fromAppNavbar || !isSignedIn || storedUserRole !== 'MAINTENANCE_PROVIDER';

  useEffect(() => {
    if (!fromAppNavbar || !isSignedIn) return;
    if (storedUserRole === 'TENANT') {
      navigate('/for-tenants', { replace: true, state: { fromAppNavbar: true } });
    } else if (storedUserRole === 'LANDLORD') {
      navigate('/for-landlords', { replace: true, state: { fromAppNavbar: true } });
    }
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
        title: 'Create Your Service Provider Profile',
        description: 'Register as a maintenance professional or service center. Provide your company details, business type, and verify your profile with proper legal identification.',
        bullets: [
          'Choose between Individual Specialist or Service Center registration',
          'Upload ID documents for trust verification and admin approval',
          'Write a professional bio detailing your experience',
          'Gain a verified provider badge on your public card'
        ],
        tags: ['Provider Registration', 'Verification', 'Profile Setup'],
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Provider Profile Setup',
        imageCaptionSub: 'Set up your professional card and specialties'
      },
      {
        label: 'Step Two',
        title: 'Define Specialties & Locations',
        description: 'Choose your service categories such as Plumbing, Electrical, HVAC/Air, Pest Control, or Exterior Maintenance. Define your operating radius to only receive job tickets near you.',
        bullets: [
          'Choose one or multiple service categories',
          'Set your primary operating city and neighborhood coverage',
          'Toggle availability status to receive new requests',
          'Specify individual or company service limits'
        ],
        tags: ['Specialties', 'Service Radius', 'Availability Control'],
        image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Service Parameters',
        imageCaptionSub: 'Target exact categories and regions'
      },
      {
        label: 'Step Three',
        title: 'Browse Available Job Requests',
        description: 'Search and filter active maintenance issues posted by verified tenants and landlords in your selected neighborhoods. Read full job details, urgency levels, and view issue photos.',
        bullets: [
          'Filter jobs by category, distance, and urgency level',
          'View tenant-attached photos describing the issue',
          'Review landlord-estimated budgets before applying',
          'Access detailed descriptions and property location details'
        ],
        tags: ['Job Board', 'Smart Filters', 'Ticket Details'],
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Explore Maintenance Tickets',
        imageCaptionSub: 'Dozens of active job requests in your area'
      },
      {
        label: 'Step Four',
        title: 'Pitch Your Quote & Apply',
        description: 'Found a job? Apply by submitting your final price quote, price breakdown, estimated duration, and a professional cover note. Landlords can review your pitch and accept it instantly.',
        bullets: [
          'Enter your total price quote for the job',
          'Provide a breakdown of labor and potential material costs',
          'Specify your estimated arrival time (ETA)',
          'Track your application status from pending to accepted'
        ],
        tags: ['Job Application', 'Quote Pitching', 'Bidding'],
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Pitching Your Bid',
        imageCaptionSub: 'Submit quotes online with clear breakdowns'
      },
      {
        label: 'Step Five',
        title: 'Coordinate and Perform Work',
        description: 'Once accepted, coordinate with the tenant or landlord via secure platform chat. Share your real-time status (en route, arrived, in progress) and execute the repairs.',
        bullets: [
          'Chat directly with tenants to coordinate entry times',
          'Update status to "En Route" so clients can track your arrival',
          'Perform repairs to professional standards',
          'Verify work details with the resident on-site'
        ],
        tags: ['Work Execution', 'Status Updates', 'Direct Chat'],
        image: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Performing Repair Work',
        imageCaptionSub: 'Coordinate live, deliver quality services'
      },
      {
        label: 'Step Six',
        title: 'Submit Completion & Get Paid',
        description: 'Complete the job, write down completion notes, and upload photos of the resolved issue. Once accepted by the resident, the escrowed agreed funds are instantly deposited into your HOMI wallet.',
        bullets: [
          'Log completion notes and submit resolution photos in the app',
          'Agreed funds are released from escrow automatically upon client confirmation',
          'Withdraw wallet earnings directly to your verified bank account',
          'Maintain a high provider rating to unlock more premium jobs'
        ],
        tags: ['Escrow Release', 'Wallet Earnings', 'Bank Withdrawal'],
        image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80&fit=crop',
        imageCaptionTitle: 'Receive Secure Payouts',
        imageCaptionSub: 'Instant payouts into your HOMI wallet'
      }
    ],
    []
  );

  const benefits = useMemo(
    () => [
      {
        title: 'Guaranteed Escrow Payments',
        description: 'Agreed job prices are held in escrow before you start. Get paid instantly when the job is done.',
        icon: <CreditCard size={20} />,
      },
      {
        title: 'Direct Client Chat',
        description: 'Communicate details and coordinate arrival times directly with residents without middleman delays.',
        icon: <MessageSquare size={20} />,
      },
      {
        title: 'Vibrant Job Marketplace',
        description: 'Access a steady stream of active repair requests in your region and choose what suits you.',
        icon: <Wrench size={20} />,
      },
      {
        title: 'Transparent Disputes',
        description: 'In the rare case of completion disputes, our admin team mediates transparently based on logs.',
        icon: <ShieldCheck size={20} />,
      },
    ],
    []
  );

  const faqs: FaqItem[] = useMemo(
    () => [
      {
        id: 'registration',
        question: 'How do I register as a maintenance provider?',
        answer:
          'Sign up, choose the Maintenance Provider role, complete your professional profile with specialties, and upload your ID for admin approval.',
      },
      {
        id: 'escrow',
        question: 'How do payments work?',
        answer:
          'When a landlord accepts your application, the agreed price is locked in escrow. Once you submit completion and the client confirms, funds release instantly to your HOMI wallet.',
      },
      {
        id: 'materials',
        question: 'Who covers material costs?',
        answer:
          'Material costs are negotiated as part of your application. You can detail material estimates inside the price breakdown field.',
      },
      {
        id: 'disputes',
        question: 'What happens if a tenant disputes the work?',
        answer:
          'If a dispute is logged, a HOMI administrator reviews the completion notes, issue photos, and logs to resolve the dispute fairly.',
      },
    ],
    []
  );

  return (
    <div className={`how-page-layout ${hideSidebar ? 'how-page-layout--no-sidebar' : ''}`}>
      {!hideSidebar && <Sidebar />}

      <div className="how-main-content">
        {hideSidebar ? <GuestNavbar /> : <Header />}

        <main className="how-content" aria-label="How HOMi works for providers">
          <section className="how-hero">
            <div className="how-hero-bg" aria-hidden="true" />

            <div className="how-hero-container">
              <div className="how-hero-left">
                <span className="how-badge">🛠️ Service Provider</span>
                <h1>
                  Grow your business,<br />
                  <span className="gradient-text">get paid instantly.</span>
                </h1>
                <p className="how-hero-subtitle">
                  HOMi connects verified maintenance professionals with landlords and tenants. Manage jobs, pitch bids, coordinate repairs, and secure your payouts.
                </p>

                <div className="how-cta-row">
                  {isSignedIn ? (
                    <Link to="/maintenance-requests" className="how-btn-primary">
                      View available jobs
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="how-btn-primary"
                      onClick={() => setShowAuthModal(true)}
                    >
                      View available jobs
                    </button>
                  )}
                  <Link to="/get-help" className="how-btn-secondary">
                    See provider support
                  </Link>
                </div>

                <div className="how-hero-metrics" aria-label="Quick highlights">
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>Guaranteed Escrow</span>
                  </div>
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>Steady Job Flow</span>
                  </div>
                  <div className="metric-pill">
                    <CheckCircle2 size={16} />
                    <span>Direct Client Chat</span>
                  </div>
                </div>
              </div>

              <div className="how-hero-right">
                <div className="mock-dashboard-card">
                  <div className="mock-card-header">
                    <div className="mock-user-info">
                      <div className="mock-avatar">🛠️</div>
                      <div>
                        <h4>QuickFix Services</h4>
                        <span className="mock-badge-verified">✓ Verified Provider</span>
                      </div>
                    </div>
                    <span className="mock-status-pill success">Active Mode</span>
                  </div>

                  <div className="mock-card-body">
                    <div className="mock-rent-strip">
                      <span className="label">Monthly Earnings</span>
                      <span className="value">42,500 EGP</span>
                    </div>
                    <div className="mock-due-strip">
                      <span>Completed Jobs: <strong>148</strong></span>
                      <span className="status-label trend">★ 4.9 Rating</span>
                    </div>

                    <div className="mock-divider" />

                    <div className="mock-stats-row">
                      <div className="mock-stat-col">
                        <span className="stat-lbl">Active Jobs</span>
                        <span className="stat-val">2 In Progress</span>
                      </div>
                      <div className="mock-stat-col">
                        <span className="stat-lbl">New Invites</span>
                        <span className="stat-val highlight">3 Requests</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Glass Chips */}
                  <div className="floating-glass-chip chip-1">
                    <span>💳 Escrowed: 8,400 EGP</span>
                  </div>
                  <div className="floating-glass-chip chip-2">
                    <span>🔧 AC Install: Approved</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="how-section how-steps" aria-label="Step by step">
            <div className="how-container">
              <div className="how-section-head">
                <h2>6 steps to secure maintenance jobs</h2>
                <p>From profile setup to digital wallet payouts, our provider flow is built for your convenience.</p>
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
                <h2>Why providers choose HOMI</h2>
                <p>We take care of details, payouts, and customer discovery so you can focus on quality work.</p>
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
                    <UserCheck size={20} />
                  </div>
                  <h3>Secure Client Connections</h3>
                  <p>
                    All clients (landlords and tenants) are verified users of the platform, reducing fake requests and communication errors.
                  </p>
                </div>

                <div className="how-callout how-callout--secondary">
                  <div className="how-callout-icon" aria-hidden="true">
                    <GlobeLock size={20} />
                  </div>
                  <h3>Guaranteed Financial Safety</h3>
                  <p>
                    With escrowed deposits, payment issues and collections follow-ups are a thing of the past. Focus entirely on delivering excellent services.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="how-section how-faq" aria-label="FAQ">
            <div className="how-container">
              <div className="how-section-head">
                <h2>Service Provider FAQ</h2>
                <p>Quick answers to common questions.</p>
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
                Need more information? Browse available requests or speak to our Support Center.
              </div>
            </div>
          </section>

          <section className="how-section how-final-cta" aria-label="Final call to action">
            <div className="how-container">
              <div className="how-final-card">
                <div className="how-final-left">
                  <div className="how-final-badge">
                    <Sparkles size={18} />
                    Get Started
                  </div>
                  <h2>Ready to expand your customer base?</h2>
                  <p>
                    Create a HOMI provider account and start browsing local repair requests with guaranteed payment protection today.
                  </p>
                </div>
                <div className="how-final-actions">
                  <Link to="/auth" className="how-btn-primary how-btn-primary--big">
                    Join as a Provider
                  </Link>
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

export default ForMaintenance;
