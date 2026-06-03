import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X } from 'lucide-react';
import './GuestHome.css';
import AuthModal from '../../../components/global/AuthModal';
import Footer from '../../../components/global/footer';
import { propertyService } from '../../../services/property.service';
import { mapPropertyToUI } from '../../../utils/propertyMapping';
import type { PropertyUI as Property } from '../../../utils/propertyMapping';
import PropertyDetailedModal from '../../BrowseProperties/components/PropertyDetailedModal';

const GuestHome: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Redesign tabs and accordion states
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord' | 'provider'>('tenant');
  const [activeStepsTab, setActiveStepsTab] = useState<'tenant-steps' | 'landlord-steps' | 'provider-steps'>('tenant-steps');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Property and search/filter states
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedBeds, setSelectedBeds] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [activeChip, setActiveChip] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Cycling headline state
  const cyclingWords = ["Perfect Home", "Dream Apartment", "Modern Studio", "North Coast Villa"];
  const [cyclingIndex, setCyclingIndex] = useState(0);
  const [fadeWord, setFadeWord] = useState(true);

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setFadeWord(false);
      setTimeout(() => {
        setCyclingIndex((prev) => (prev + 1) % cyclingWords.length);
        setFadeWord(true);
      }, 400);
    }, 4000);

    return () => clearInterval(cycleInterval);
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await propertyService.getAllProperties({
          status: 'AVAILABLE',
          page: 1,
          limit: 100
        });
        setProperties(response.data.map(mapPropertyToUI));
      } catch (err) {
        console.error('Failed to fetch properties for GuestHome:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);


  const filteredProperties = properties.filter((property) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      (property.title || '').toLowerCase().includes(q) ||
      (property.address || '').toLowerCase().includes(q);

    const matchesType = !selectedType || (property.type || '').toUpperCase() === selectedType.toUpperCase();

    const matchesBeds =
      !selectedBeds ||
      (selectedBeds === '4' ? property.beds >= 4 : property.beds === parseInt(selectedBeds));

    const matchesPrice = !selectedPrice || property.price <= parseInt(selectedPrice);

    const matchesChip =
      !activeChip ||
      (property.tags &&
        property.tags.some((tag) => tag.toLowerCase() === activeChip.toLowerCase())) ||
      (property.furnishing &&
        property.furnishing.toLowerCase().includes(activeChip.toLowerCase()));

    return matchesQuery && matchesType && matchesBeds && matchesPrice && matchesChip;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return a.price - b.price;
    }
    if (sortBy === 'price-desc') {
      return b.price - a.price;
    }
    if (sortBy === 'newest') {
      return b.id.localeCompare(a.id);
    }
    const aFeatured = a.tags && a.tags.some(t => t.toLowerCase() === 'featured' || t.toLowerCase() === '⭐ featured');
    const bFeatured = b.tags && b.tags.some(t => t.toLowerCase() === 'featured' || t.toLowerCase() === '⭐ featured');
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;
    return 0;
  });

  const totalFilteredCount = sortedProperties.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * pageSize;
  const paginatedProperties = sortedProperties.slice(startIndex, startIndex + pageSize);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(heroSearchQuery);
    setCurrentPage(1);
    const propsSection = document.getElementById('properties');
    if (propsSection) {
      propsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSuggestionClick = (type: string, value: string) => {
    if (type === 'type') {
      setSelectedType(value);
    } else if (type === 'chip') {
      setActiveChip(value);
    } else if (type === 'price') {
      setSelectedPrice(value);
    } else if (type === 'query') {
      setHeroSearchQuery(value);
      setSearchQuery(value);
    }
    setCurrentPage(1);
    const propsSection = document.getElementById('properties');
    if (propsSection) {
      propsSection.scrollIntoView({ behavior: 'smooth' });
    }
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

      {/* 2. Hero Section - Premium Asymmetrical Collage & Glassmorphic Search Bar */}
      <section className="hero">
        <div className="hero-grid-bg"></div>
        <div className="hero-blob blob-1"></div>
        <div className="hero-blob blob-2"></div>

        <div className="hero-container">
          <div className="hero-content-left">
            <div className="hero-badge gh-animate-slide-up">
              <span>{t('guestHome.ratedPlatformEgypt')}</span>
            </div>

            <h1 className="hero-title gh-animate-slide-up">
              <span className="accent">Find Your <span className={`gh-cycling-word ${fadeWord ? 'fade-in' : 'fade-out'}`}>{cyclingWords[cyclingIndex]}</span></span> <br />
              <span className="outline">{t('guestHome.withoutHassle')}</span>
            </h1>

            <p className="hero-sub gh-animate-slide-up-delayed">
              {t('guestHome.heroSubtitle')}
            </p>

            {/* V3 Premium Glassmorphic Search Bar */}
            <form onSubmit={handleHeroSubmit} className="gh-hero-search-bar gh-animate-slide-up-delayed-more">
              <div className="search-col">
                <label>{t('guestHome.location')}</label>
                <div className="search-input-wrapper">
                  <span className="col-icon"></span>
                  <input
                    type="text"
                    placeholder="Cairo, Zamalek..."
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="search-divider"></div>
              <div className="search-col">
                <label>{t('guestHome.propertyType')}</label>
                <div className="search-pills-wrapper">
                  <button
                    type="button"
                    onClick={() => setSelectedType(selectedType === 'APARTMENT' ? '' : 'APARTMENT')}
                    className={`search-pill-btn ${selectedType === 'APARTMENT' ? 'active' : ''}`}
                  >
                    Apt
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType(selectedType === 'VILLA' ? '' : 'VILLA')}
                    className={`search-pill-btn ${selectedType === 'VILLA' ? 'active' : ''}`}
                  >
                    Villa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType(selectedType === 'STUDIO' ? '' : 'STUDIO')}
                    className={`search-pill-btn ${selectedType === 'STUDIO' ? 'active' : ''}`}
                  >
                    Studio
                  </button>
                </div>
              </div>
              <div className="search-divider"></div>
              <div className="search-col">
                <label>{t('guestHome.maxPrice')}</label>
                <div className="search-input-wrapper">
                  <span className="col-icon"></span>
                  <select
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                  >
                    <option value="">{t('guestHome.anyPrice')}</option>
                    <option value="5000">Up to 5k EGP</option>
                    <option value="12000">Up to 12k EGP</option>
                    <option value="20000">Up to 20k EGP</option>
                    <option value="50000">Up to 50k EGP</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="search-submit-btn">
                <span className="btn-icon"></span>
                <span>{t('guestHome.search')}</span>
              </button>
            </form>

            {/* Popular suggestions chips */}
            <div className="gh-hero-suggestions gh-animate-slide-up-delayed-more">
              <span className="suggestion-label">Suggestions:</span>
              <button type="button" onClick={() => handleSuggestionClick('type', 'APARTMENT')} className="suggestion-chip">Apartment</button>
              <button type="button" onClick={() => handleSuggestionClick('type', 'VILLA')} className="suggestion-chip">Villa</button>
              <button type="button" onClick={() => handleSuggestionClick('query', 'Zamalek')} className="suggestion-chip">Zamalek</button>
              <button type="button" onClick={() => handleSuggestionClick('chip', 'furnished')} className="suggestion-chip">Furnished</button>
            </div>

            {/* No Fees / Trust Badges directly under Search */}


            <div className="hero-btns-row gh-animate-slide-up-delayed-more" style={{ marginTop: '0.5rem' }}>
              <a href="#steps" className="btn-hero-secondary">{t('guestHome.howItWorks')} ›</a>
              <button onClick={() => navigate('/auth')} className="btn-hero-primary">{t('guestHome.getStartedNow')}</button>
            </div>
          </div>

          <div className="hero-showcase-right gh-animate-fade-in-delayed">
            <div className="gh-collage-container">
              {/* Main Collage Frame - Capsule Shape with Premium Villa Photo */}
              <div className="gh-collage-main-frame">
                <img
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&q=80&fit=crop"
                  alt="Modern Egyptian Villa"
                />

                {/* Circular Verified Stamp Layered on main photo */}
                <div className="gh-verified-stamp">
                  <svg viewBox="0 0 100 100">
                    <path
                      id="stampPath"
                      d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
                      fill="none"
                    />
                    <text>
                      <textPath href="#stampPath">VERIFIED BY HOMI • SAFETY GUARANTEED •</textPath>
                    </text>
                  </svg>
                  <div className="stamp-center">✓</div>
                </div>
              </div>

              {/* Offset Collage Frame - Secondary Interior Photo */}
              <div className="gh-collage-secondary-frame">
                <img
                  src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80&fit=crop"
                  alt="Modern Villa Interior"
                />
              </div>

              {/* Rotating Circular Video Badge (Micro-Interaction) */}
              <div className="gh-video-badge-wrap" onClick={() => navigate('/auth')}>
                <svg className="rotating-text-svg" viewBox="0 0 100 100">
                  <path
                    id="circlePath"
                    d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    fill="none"
                  />
                  <text>
                    <textPath href="#circlePath">WATCH VIDEO • TOUR HOMES •</textPath>
                  </text>
                </svg>
                <div className="play-icon">▶</div>
              </div>

              {/* Dotted Connections lines */}
              <svg className="gh-collage-lines">
                <path d="M 50 150 C 0 180, 0 250, 20 280" />
                <path d="M 280 220 C 330 250, 310 320, 290 350" />
                <path d="M 120 80 C 150 40, 220 30, 260 50" />
              </svg>

              {/* Floating Dashboard Widgets */}
              <div className="gh-floating-widget widget-lease-badge float-1">
                <span className="status-indicator-dot green pulsing"></span>
                <span>Lease Signed by Karim A.</span>
              </div>

              <div className="gh-floating-widget widget-wallet-badge float-3">
                <span className="payment-icon">💳</span>
                <div className="widget-text">
                  <h5>Rent Paid</h5>
                  <p>18,500 EGP to Owner</p>
                </div>
              </div>




            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Strip */}
      <div className="stats-strip reveal">
        <div className="stat">
          <div className="stat-num">100%</div>
          <div className="stat-label">Digital Process</div>
        </div>
        <div className="stat">
          <div className="stat-num">3 Roles</div>
          <div className="stat-label">Tenant, Landlord & Provider</div>
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

      {/* 3.5 Properties Browse Section with Live Data */}
      <section id="properties" className="props-section">
        <div className="props-inner">
          {/* Header */}
          <div className="section-header reveal" style={{ padding: '0 0 0', textAlign: 'left' }}>
            <div className="section-tag">Browse & Discover</div>
            <h2 className="section-title" style={{ maxWidth: '560px' }}>Find Your Next Home</h2>

          </div>

          {/* Search Bar */}
          <div className="props-search-wrap reveal">
            <div className="props-search-row">
              <div className="search-field" style={{ gridColumn: '1/-1', display: 'block' }}>
                <label>Search Location or Property Name</label>
              </div>
              <div className="search-field" style={{ gridColumn: '1/-1' }}>
                <div className="search-input-wrap">
                  <span className="si-icon">🔍</span>
                  <input
                    type="text"
                    className="props-input"
                    placeholder="e.g. Cairo, Maadi, Zamalek, New Cairo…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="search-field">
                <label>Type</label>
                <select
                  className="props-select"
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Types</option>
                  <option value="APARTMENT">Apartment</option>
                  <option value="STUDIO">Studio</option>
                  <option value="VILLA">Villa</option>
                  <option value="DUPLEX">Duplex</option>
                </select>
              </div>

              <div className="search-field">
                <label>Bedrooms</label>
                <select
                  className="props-select"
                  value={selectedBeds}
                  onChange={(e) => {
                    setSelectedBeds(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Any</option>
                  <option value="1">1 Bed</option>
                  <option value="2">2 Beds</option>
                  <option value="3">3 Beds</option>
                  <option value="4">4+ Beds</option>
                </select>
              </div>

              <div className="search-field">
                <label>Max Price / mo</label>
                <select
                  className="props-select"
                  value={selectedPrice}
                  onChange={(e) => {
                    setSelectedPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Any Price</option>
                  <option value="5000">Up to 5,000</option>
                  <option value="8000">Up to 8,000</option>
                  <option value="12000">Up to 12,000</option>
                  <option value="20000">Up to 20,000</option>
                </select>
              </div>

              <div className="search-field" style={{ justifyContent: 'flex-end' }}>
                <label style={{ visibility: 'hidden' }}>Search</label>
                <button className="search-btn">
                  <span>🔍</span> Search
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="props-filter-chips">
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
                Quick:
              </span>
              {[
                { label: 'All', value: '' },
                { label: 'Furnished', value: 'furnished' },
                { label: 'Parking', value: 'parking' },
                { label: 'Gym', value: 'gym' },
                { label: 'Pool', value: 'pool' },
                { label: 'Pet-Friendly', value: 'pets' },
                { label: 'Balcony', value: 'balcony' },
                { label: 'Security', value: 'security' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  className={`filter-chip ${activeChip === chip.value ? 'active' : ''}`}
                  onClick={() => {
                    setActiveChip(chip.value);
                    setCurrentPage(1);
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Header */}
          <div className="props-results-header">
            <div className="props-count">
              <strong>{totalFilteredCount}</strong> properties found
            </div>
            <div className="props-sort-wrap">
              <label>Sort by:</label>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {/* Loading / Grid / No Results */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p>Loading properties...</p>
            </div>
          ) : paginatedProperties.length === 0 ? (
            <div id="no-results" style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: '1.3rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                No properties found
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Try adjusting your filters or search term.
              </div>
            </div>
          ) : (
            <div className="props-grid">
              {paginatedProperties.map((property) => {
                const isFeatured = property.tags && property.tags.some(t => t.toLowerCase() === 'featured' || t.toLowerCase() === '⭐ featured');
                const badge = isFeatured ? '⭐ Featured' : '✓ Available';
                const badgeClass = isFeatured ? 'featured' : 'available';

                return (
                  <div
                    key={property.id}
                    className="prop-card reveal visible"
                    onClick={() => setSelectedProperty(property)}
                  >
                    <div className="prop-img">
                      <img src={property.image} alt={property.title} />
                      <span className={`prop-badge ${badgeClass}`}>{badge}</span>
                      <button
                        className="prop-save"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/auth');
                        }}
                        title="Save"
                      >
                        🤍
                      </button>
                      <span className="prop-type-tag">{property.type || 'Apartment'}</span>
                    </div>
                    <div className="prop-body">
                      <div className="prop-price">
                        {property.price.toLocaleString()} <em>EGP / month</em>
                      </div>
                      <div className="prop-title">{property.title}</div>
                      <div className="prop-location">
                        <div className="prop-location-dot"></div>
                        {property.address}
                      </div>
                      <div className="prop-specs">
                        <div className="prop-spec">
                          <strong>{property.beds}</strong>Beds
                        </div>
                        <div className="prop-spec">
                          <strong>{property.baths}</strong>Baths
                        </div>
                        <div className="prop-spec">
                          <strong>{property.sqft}</strong>m²
                        </div>

                      </div>
                      <div className="prop-landlord">
                        <img
                          className="prop-avatar"
                          src={property.ownerImage || 'https://i.pravatar.cc/150'}
                          alt="Landlord"
                        />
                        <div className="prop-landlord-name">
                          <strong>{property.ownerName}</strong>Verified Landlord
                        </div>
                        <button
                          className="prop-apply-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/auth');
                          }}
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="props-pagination">
              <button
                className="page-btn arrow"
                disabled={activePage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`page-btn ${activePage === i + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="page-btn arrow"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </section>

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
              I'm a Tenant
            </button>
            <button
              className={`tab-btn ${activeTab === 'landlord' ? 'active' : ''}`}
              onClick={() => setActiveTab('landlord')}
            >
              I'm a Landlord
            </button>
            <button
              className={`tab-btn ${activeTab === 'provider' ? 'active' : ''}`}
              onClick={() => setActiveTab('provider')}
            >
              I'm a Provider
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
            </div>
          </div>

          {/* PROVIDER FEATURE GRID */}
          <div className={`tab-panel ${activeTab === 'provider' ? 'active' : ''}`} id="tab-provider">
            <div className="feature-grid">
              <div className="feature-card wide reveal">
                <div className="feature-icon">🛠️</div>
                <div className="feature-title">Grow Your Maintenance Business</div>
                <div className="feature-desc">Create your provider profile, upload legal credentials, and access a steady stream of verified property maintenance jobs in your service areas.</div>
                <div className="step-list">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-text"><strong>Create provider account</strong> — register as an individual technician or a company service.</div>
                  </div>
                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-text"><strong>Upload legal credentials</strong> — verify your business or skill certificates for safety and assurance.</div>
                  </div>
                  <div className="step-item">
                    <div className="step-num">3</div>
                    <div className="step-text"><strong>Find & apply for jobs</strong> — browse posted maintenance issues, review descriptions/photos, and apply to take over.</div>
                  </div>
                </div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">📄</div>
                <div className="feature-title">Verify Safety Credentials</div>
                <div className="feature-desc">Upload registration documents, trade licenses, and IDs. Safe and assured service keeps landlords and tenants confident.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🔍</div>
                <div className="feature-title">Browse Local Issues</div>
                <div className="feature-desc">Filter and search for plumbing, electrical, HVAC, and cleaning jobs near you. Review full issue details and photos.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">💰</div>
                <div className="feature-title">Secure Payments & Wallet</div>
                <div className="feature-desc">Once a job is resolved and the report is submitted, funds are deposited directly into your secure HOMI wallet for easy withdrawal.</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">📋</div>
                <div className="feature-title">Submit Reports & Track Balance</div>
                <div className="feature-desc">Take photos of completed repairs, write details of the fix, submit report directly to the landlord for quick release of funds, and monitor your earnings.</div>
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
            Tenant Journey
          </button>
          <button
            className={`steps-tab ${activeStepsTab === 'landlord-steps' ? 'active' : ''}`}
            onClick={() => setActiveStepsTab('landlord-steps')}
          >
            Landlord Journey
          </button>
          <button
            className={`steps-tab ${activeStepsTab === 'provider-steps' ? 'active' : ''}`}
            onClick={() => setActiveStepsTab('provider-steps')}
          >
            Maintenance Provider Journey
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

        {/* MAINTENANCE PROVIDER STEPS PANEL */}
        <div className={`steps-panel ${activeStepsTab === 'provider-steps' ? 'active' : ''}`} id="provider-steps">
          {/* Step 1 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">1</div>
                <div className="snb-label">Step One</div>
              </div>
              <div className="step-content-title">Create Maintenance Provider Account</div>
              <div className="step-content-desc">Start your journey by registering as a maintenance provider on HOMI. You can sign up as an individual service or as a company service, specifying your specialties and service areas.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Choose individual technician or company service type</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>List your primary maintenance specialties and skills</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Define your geographic service coverage areas</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Set up your professional business profile</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Registration</span>
                <span className="step-tag">Specialties</span>
                <span className="step-tag">Service Areas</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80&fit=crop" alt="Technician setting up profile" />
              <div className="step-photo-caption"><strong>Account Registration</strong><span>Register specialties and setup business profile</span></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">2</div>
                <div className="snb-label">Step Two</div>
              </div>
              <div className="step-content-title">Upload Legal Papers for Verification</div>
              <div className="step-content-desc">Verify your profile by uploading your legal documents. Providing trade licenses, business registrations, or certifications is critical to build trust and ensure maximum safety and assurance.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Upload national ID or company tax card documentation</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Provide trade licenses or business registration certificates</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Submit professional certifications or qualifications</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Get verified by the HOMI security & admin team</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Verification</span>
                <span className="step-tag">Legal Papers</span>
                <span className="step-tag">Safety & Trust</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop" alt="Legal papers verification" />
              <div className="step-photo-caption"><strong>Safety Verification</strong><span>Fast document verification for profile trust badge</span></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">3</div>
                <div className="snb-label">Step Three</div>
              </div>
              <div className="step-content-title">Search & Review Posted Issues</div>
              <div className="step-content-desc">Browse through maintenance issues posted by tenants and landlords on our live job board. Filter listings by category, location, and urgency to find the right projects for your business.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Browse live maintenance issues in real-time</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Filter issues by category (plumbing, electrical, HVAC, etc.)</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Review comprehensive descriptions and tenant photos</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Check job location details and landlord requirements</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Job Search</span>
                <span className="step-tag">Issues Board</span>
                <span className="step-tag">Filters</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80&fit=crop" alt="Searching posted issues on tablet" />
              <div className="step-photo-caption"><strong>Browse Live Issues</strong><span>Find open maintenance issues in your area</span></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">4</div>
                <div className="snb-label">Step Four</div>
              </div>
              <div className="step-content-title">Apply for Issues to Take Over</div>
              <div className="step-content-desc">Express interest in resolving the issues by submitting your application. Propose cost estimates, list parts required, and suggest scheduling options directly to the property landlord.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Submit application to take over the work order</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Include cost estimates and labor fee quotes</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Propose preferred visit times and scheduling</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Chat directly with landlords about job details</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Job Application</span>
                <span className="step-tag">Estimates</span>
                <span className="step-tag">Landlord Chat</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80&fit=crop" alt="Sending proposal on laptop" />
              <div className="step-photo-caption"><strong>Submit Proposals</strong><span>Offer pricing estimates and schedule visits</span></div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">5</div>
                <div className="snb-label">Step Five</div>
              </div>
              <div className="step-content-title">Start Repairing After Acceptance</div>
              <div className="step-content-desc">Once the landlord accepts your proposal, you are officially assigned to the issue. Get direct access to coordinate with the tenant, visit the property, and perform the high-quality repair.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Receive instant notification upon job assignment</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Get tenant contact info and schedule visit details</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Perform diagnostics and execute the repair work on-site</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Follow strict safety standards and build quality trust</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Job Execution</span>
                <span className="step-tag">On-Site Repair</span>
                <span className="step-tag">Tenant Coordination</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop" alt="Technician performing repair work" />
              <div className="step-photo-caption"><strong>Job Execution</strong><span>Visit site and complete quality repairs</span></div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">6</div>
                <div className="snb-label">Step Six</div>
              </div>
              <div className="step-content-title">Submit Report & Track Wallet Balance</div>
              <div className="step-content-desc">Once the issue is fully fixed, take 'after' photos and submit a detailed repair report through the app. Funds are released from escrow directly into your HOMI secure wallet.</div>
              <div className="step-bullets">
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Document repair results with photos and notes</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Submit the work report for landlord confirmation</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Receive instant payout to your secure HOMI wallet</div>
                <div className="step-bullet"><div className="step-bullet-icon">✓</div>Track your balance and withdraw earnings to your bank</div>
              </div>
              <div className="step-tags">
                <span className="step-tag">Issue Report</span>
                <span className="step-tag">Secure Payout</span>
                <span className="step-tag">Wallet Balance</span>
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&fit=crop" alt="Tracking balance on mobile phone" />
              <div className="step-photo-caption"><strong>Earnings & Wallet</strong><span>Get paid instantly upon work approval</span></div>
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
              <div className="role-feat"><span className="check">✓</span> 100% verified listings and landlords accounts</div>
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

          {/* Maintenance Provider Card */}
          <div className="role-card provider" data-emoji="🛠️">
            <div className="role-badge-pill">For Providers</div>
            <h3 className="role-title">Grow Your Business</h3>
            <p className="role-desc">Access a steady stream of maintenance jobs. Create your profile, upload your credentials, browse posted issues, submit estimates, complete the job, and track your wallet balance.</p>
            <div className="role-features">
              <div className="role-feat"><span className="check">✓</span> Register as an individual or company service</div>
              <div className="role-feat"><span className="check">✓</span> Verified badges to build trust with landlords</div>
              <div className="role-feat"><span className="check">✓</span> Direct wallet payouts immediately after job reports</div>
              <div className="role-feat"><span className="check">✓</span> Easy communication with tenants and landlords</div>
            </div>
            <button onClick={() => navigate('/maintenance-providers')} className="btn-outline" style={{ color: '#d97706', borderColor: '#d97706' }}>Join as Provider ›</button>
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
            <button onClick={() => navigate('/maintenance-providers')} className="btn-white-outline" style={{ borderStyle: 'dashed' }}>Join as Provider</button>
          </div>
        </div>
      </section>
      {selectedProperty && (
        <PropertyDetailedModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          isGuest={true}
        />
      )}

      {/* 10. Footer (Footer stays same) */}
      <Footer />

      {/* Reusable Auth Modal for Guests */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

export default GuestHome;