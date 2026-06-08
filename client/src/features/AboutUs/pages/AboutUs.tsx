import React, { useState } from 'react';
import Header from '../../../components/global/header';
import TenantSidebar from '../../../components/global/Tenant/sidebar';
import LandlordSidebar from '../../../components/global/Landlord/sidebar';
import Footer from '../../../components/global/footer';
import authService from '../../../services/auth.service';
import {
  Shield, Rocket, Github, Linkedin, Quote, Calendar,
  ChevronDown, ChevronUp, Users, DollarSign, Wrench,
  Clock, Compass, FileText, CheckCircle2, MessageSquare, Info
} from 'lucide-react';
import './AboutUs.css';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  image: string;
  bio: string;
  socials: { github?: string; linkedin?: string; email?: string; };
}

const AboutUs: React.FC = () => {
  const role = authService.getCurrentUser()?.user?.role;
  const showSidebar = role === 'LANDLORD' || role === 'TENANT';
  const SidebarComponent = role === 'LANDLORD' ? LandlordSidebar : TenantSidebar;

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const devTeam: TeamMember[] = [
    {
      id: 1,
      name: "Mohy Eldeen",
      role: "Chief Technology Officer",
      image: "/mohyy.jpeg",
      bio: "Leading technical strategy, cloud infrastructure and architecting high-performance SaaS solutions.",
      socials: { github: "https://github.com", linkedin: "https://linkedin.com", email: "mohy@homi.com" }
    },
    {
      id: 2,
      name: "Yehia Hesham",
      role: "Lead Systems Architect",
      image: "/yehia.jpeg",
      bio: "Expert in scalable microservices, backend reliability, and low-latency database queries.",
      socials: { github: "https://github.com", linkedin: "https://linkedin.com" }
    },
    {
      id: 3,
      name: "Kareem El7a2i2y",
      role: "Senior Fullstack Engineer",
      image: "/kareem.jpeg",
      bio: "Specializing in secure API integrations, web security protocols, and dynamic user interfaces.",
      socials: { github: "https://github.com", email: "kareem@homi.com" }
    },
    {
      id: 4,
      name: "Haneen Elghawy",
      role: "Lead UI/UX Designer",
      image: "/Hanen.jpeg",
      bio: "Crafting modern design systems, intuitive co-living user journeys, and premium dark layouts.",
      socials: { linkedin: "https://linkedin.com", github: "https://github.com" }
    }
  ];

  const platformPillars = [
    {
      icon: <Users size={28} />,
      title: "Smart Roommate Finder",
      desc: "Complete lifestyle compatibility surveys to matches roommates based on habits, budgets, and schedules."
    },
    {
      icon: <Clock size={28} />,
      title: "Verified Visit Booking",
      desc: "Instantly schedule physical property viewings with landlords, complete with real-time slot confirmations."
    },
    {
      icon: <FileText size={28} />,
      title: "Automated Lease Contracts",
      desc: "Generate custom, legally compliant lease agreements directly on-platform and sign them electronically."
    },
    {
      icon: <DollarSign size={28} />,
      title: "Integrated Payments Ledger",
      desc: "Manage security deposits, pay rent online, and track transaction history in a clear digital ledger."
    },
    {
      icon: <Wrench size={28} />,
      title: "Live Maintenance Tracking",
      desc: "Submit requests with pictures, dispatch local technicians, and resolve issues via an integrated dispute log."
    },
    {
      icon: <MessageSquare size={28} />,
      title: "Real-time Messaging",
      desc: "Negotiate lease terms, coordinates roommate details, and coordinate with landlords via instant chats."
    }
  ];

  const journeySteps = [
    {
      year: "2024",
      title: "The Seed of HOMi",
      desc: "Founded by a team of engineers frustrated with the offline, fragmented renting process. Set out to digitize leasing and roommates matching.",
      icon: <Shield size={18} />
    },
    {
      year: "2025",
      title: "SaaS Launch & Verification",
      desc: "Released automated contract generation and digital ledgers. Launched landlord validation to eliminate rental listing scams.",
      icon: <Rocket size={18} />
    },
    {
      year: "2026",
      title: "Real-time Ecosystem",
      desc: "Introduced live maintenance ticket dispatching, roommate compatibility metrics, and real-time viewing bookings.",
      icon: <Compass size={18} />
    }
  ];

  const faqs = [
    {
      question: "What is HOMi and how does it simplify renting?",
      answer: "HOMi is a unified, end-to-end rental platform that merges listing discovery, viewing bookings, lease contract signing, monthly rent payments, and maintenance request dispatching. Instead of coordinating across separate platforms, both tenants and landlords manage their entire leasing relationship inside one single, secure portal."
    },
    {
      question: "Are the property listings verified for safety?",
      answer: "Yes, security is a core pillar of HOMi. Landlords must upload official property ownership documentation. These documents are manually reviewed and approved by HOMi administrators before listing publications are authorized."
    },
    {
      question: "How does roommate matching compatibility work?",
      answer: "HOMi uses a comprehensive survey analyzing habits (sleep schedule, guests policy, smoking, pets) and budget boundaries. Our roommate matching engine compiles compatibility scores to suggest co-living arrangements with high success rates."
    },
    {
      question: "How legally binding are the automated lease contracts?",
      answer: "Every contract generated on HOMi is constructed from validated legal frameworks. Once signed digitally by both the tenant and landlord, they represent fully binding electronic agreements, complete with custom house rules and payment terms."
    },
    {
      question: "How are maintenance disputes and payments resolved?",
      answer: "Tenants can log maintenance issues with photos and severity tags. Landlords assign them to local providers. Rent payments are securely tracked, and landlords can approve charges for damages or request service payouts transparently."
    }
  ];

  const testimonials = [
    {
      name: "Marcus Thorne",
      role: "Property Manager (50+ units)",
      quote: "HOMi completely revolutionized my workflow. Automatic lease signatures and the integrated payments ledger saved me hours of administrative work."
    },
    {
      name: "Sophia Lang",
      role: "Medical Student & Tenant",
      quote: "The roommate finder was incredibly accurate. Finding both a verified apartment and a compatible flatmate took me less than three days!"
    }
  ];

  return (
    <div className={`about-page-layout ${showSidebar ? '' : 'about-page-no-sidebar'}`}>
      {showSidebar ? <SidebarComponent /> : null}

      <div className={`about-main-content ${showSidebar ? '' : 'about-main-fullwidth'}`}>
        <Header />

        {/* Modern Glowing Hero Section */}
        <section className="about-hero">
          <div className="hero-glow-1"></div>
          <div className="hero-glow-2"></div>
          <div className="hero-content-wrapper">
            <span className="about-badge">
              <Info size={14} style={{ marginRight: '6px' }} /> The Future of Renting
            </span>
            <h1>
              Redefining the rental lifecycle, <br />
              <span className="gradient-text">from match to move-in.</span>
            </h1>
            <p className="hero-subtitle">
              HOMi is the all-in-one SaaS platform built to automate property listings, schedule viewings, sign smart contracts, and handle maintenance—all in one place.
            </p>
          </div>
        </section>

        {/* Origin Concept Section */}
        <section className="origin-section">
          <div className="container">
            <div className="origin-grid">
              <div className="origin-text">
                <span className="section-pretitle">The Core Concept</span>
                <h2>Why we built HOMi</h2>
                <p>
                  Traditional renting is broken. It is a highly fragmented journey requiring tenants and landlords to communicate across dozens of disconnected channels: unvetted Facebook listings, offline paper contracts, random bank transfers, and paper-based maintenance disputes.
                </p>
                <p>
                  We built HOMi to unify the entire lifecycle. By merging roommate compatibility scoring, digital listing discovery, verified document uploads, e-signatures, ledger payments, and live maintenance workflows, we've replaced chaos with complete transparency.
                </p>
                <div className="stats-container-grid">
                  <div className="stat-card">
                    <h3>15k+</h3>
                    <p>Verified Users</p>
                  </div>
                  <div className="stat-card">
                    <h3>4.2k+</h3>
                    <p>Signed Leases</p>
                  </div>

                </div>
              </div>

              <div className="origin-visual-card">
                <div className="visual-glass">
                  <div className="visual-header">
                    <span className="dot red"></span>
                    <span className="dot yellow"></span>
                    <span className="dot green"></span>
                    <span className="panel-title">HOMi SaaS Engine</span>
                  </div>
                  <div className="visual-body">
                    <div className="visual-row">
                      <CheckCircle2 size={16} className="checked-icon" />
                      <span>Property Vetting & Admin Approval</span>
                    </div>
                    <div className="visual-row">
                      <CheckCircle2 size={16} className="checked-icon" />
                      <span>Automated Legally Compliant Contracts</span>
                    </div>
                    <div className="visual-row">
                      <CheckCircle2 size={16} className="checked-icon" />
                      <span>Tenant-Landlord Balance Ledgers</span>
                    </div>
                    <div className="visual-row">
                      <CheckCircle2 size={16} className="checked-icon" />
                      <span>Viewing Bookings & Calendar Sync</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars Section */}
        <section className="pillars-section">
          <div className="container">
            <div className="section-header-centered">
              <span className="section-pretitle">Platform Architecture</span>
              <h2>Built to power every step of the journey</h2>
              <p>Everything you need to discover, secure, pay, and maintain, in one clean design.</p>
            </div>

            <div className="pillars-grid">
              {platformPillars.map((pillar, i) => (
                <div key={i} className="pillar-card">
                  <div className="pillar-icon-box">
                    {pillar.icon}
                  </div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Roadmap Section */}
        <section className="roadmap-section">
          <div className="container">
            <div className="section-header-centered">
              <span className="section-pretitle">The Roadmap</span>
              <h2>Our journey towards rental simplicity</h2>
              <p>Where we started and where we are heading next.</p>
            </div>

            <div className="roadmap-timeline">
              <div className="timeline-center-line"></div>
              {journeySteps.map((step, i) => (
                <div key={i} className={`timeline-block ${i % 2 === 0 ? 'left' : 'right'}`}>
                  <div className="timeline-node">
                    {step.icon}
                  </div>
                  <div className="timeline-content-card">
                    <span className="timeline-step-year">{step.year}</span>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founders / Team Section */}
        <section className="founders-section">
          <div className="container">
            <div className="section-header-centered">
              <span className="section-pretitle">The Team</span>
              <h2>Meet the Architects of HOMi</h2>
              <p>The core engineers and designers behind the code and user experience.</p>
            </div>

            <div className="founders-grid">
              {devTeam.map((member) => (
                <div key={member.id} className="founder-card">
                  <div className="founder-image-wrapper">
                    <img
                      src={member.image}
                      alt={member.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0f172a&color=ffffff&size=200`;
                      }}
                    />
                    <div className="founder-social-overlay">
                      {member.socials.github && (
                        <a href={member.socials.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                          <Github size={20} />
                        </a>
                      )}
                      {member.socials.linkedin && (
                        <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                          <Linkedin size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="founder-details">
                    <h3>{member.name}</h3>
                    <span className="founder-role">{member.role}</span>
                    <p>{member.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="about-testimonials">
          <div className="container">
            <div className="testimonials-grid-wrapper">
              {testimonials.map((t, i) => (
                <div key={i} className="about-testimonial-card">
                  <Quote className="quote-icon-lucide" size={32} />
                  <p>"{t.quote}"</p>
                  <div className="author-info">
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="faq-section">
          <div className="container">
            <div className="section-header-centered">
              <span className="section-pretitle">Common Questions</span>
              <h2>Everything you need to know about HOMi</h2>
              <p>Got questions about verification, lease terms, or roommate finding? We've got answers.</p>
            </div>

            <div className="faq-accordion-container">
              {faqs.map((faq, i) => {
                const isOpen = activeFaq === i;
                return (
                  <div key={i} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                    <button
                      className="faq-question-btn"
                      onClick={() => toggleFaq(i)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <div className="faq-answer-wrapper">
                      <div className="faq-answer-content">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Glassmorphic Section */}
        <section className="about-cta-section">
          <div className="container">
            <div className="cta-glassmorphic-card">
              <div className="cta-glow"></div>
              <h2>Ready to experience a frictionless rental cycle?</h2>
              <p>Join thousands of tenants and landlords already using HOMi to simplify property management.</p>
              <div className="cta-button-group">
                <button className="cta-btn-primary" onClick={() => window.location.href = '/browse-properties'}>
                  Browse Properties
                </button>
                <button className="cta-btn-secondary" onClick={() => window.location.href = '/settings'}>
                  Configure Profile
                </button>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default AboutUs;