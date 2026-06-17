import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './GuestHome.css';
import GuestHeader from '../../../components/global/GuestHeader';
import AuthModal from '../../../components/global/AuthModal';
import Footer from '../../../components/global/footer';
import { propertyService } from '../../../services/property.service';
import { mapPropertyToUI } from '../../../utils/propertyMapping';
import type { PropertyUI as Property } from '../../../utils/propertyMapping';


const GuestHome: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Redesign tabs and accordion states
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord' | 'provider'>('tenant');
  const [activeStepsTab, setActiveStepsTab] = useState<'tenant-steps' | 'landlord-steps' | 'provider-steps'>('tenant-steps');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Property and search/filter states
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
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
      <GuestHeader />

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
          <div className="stat-label">{t('guestHome.statsDigitalProcess')}</div>
        </div>
        <div className="stat">
          <div className="stat-num">{t('guestHome.statsRolesCount')}</div>
          <div className="stat-label">{t('guestHome.statsRolesLabel')}</div>
        </div>
        <div className="stat">
          <div className="stat-num">{t('guestHome.statsStepsCount')}</div>
          <div className="stat-label">{t('guestHome.statsStepsLabel')}</div>
        </div>
        <div className="stat">
          <div className="stat-num">{t('guestHome.statsSupport247')}</div>
          <div className="stat-label">{t('guestHome.statsMaintenanceReporting')}</div>
        </div>
        <div className="stat">
          <div className="stat-num">{t('guestHome.statsSafe')}</div>
          <div className="stat-label">{t('guestHome.statsEncryptedWallet')}</div>
        </div>
      </div>

      {/* 3.5 Properties Browse Section with Live Data */}
      <section id="properties" className="props-section">
        <div className="props-inner">
          {/* Header */}
          <div className="guest-section-header reveal" style={{ padding: '0 0 0', textAlign: 'left' }}>
            <div className="section-tag">{t('guestHome.browseDiscover')}</div>
            <h2 className="section-title" style={{ maxWidth: '560px' }}>{t('guestHome.findNextHome')}</h2>

          </div>

          {/* Search Bar */}
          <div className="props-search-wrap reveal">
            <div className="props-search-row">
              <div className="search-field" style={{ gridColumn: '1/-1', display: 'block' }}>
                <label>{t('guestHome.searchLabel')}</label>
              </div>
              <div className="search-field" style={{ gridColumn: '1/-1' }}>
                <div className="search-input-wrap">
                  <span className="si-icon">🔍</span>
                  <input
                    type="text"
                    className="props-input"
                    placeholder={t('guestHome.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="search-field">
                <label>{t('guestHome.propertyType')}</label>
                <select
                  className="props-select"
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t('guestHome.allTypes')}</option>
                  <option value="APARTMENT">{t('guestHome.apartment')}</option>
                  <option value="STUDIO">{t('guestHome.studio')}</option>
                  <option value="VILLA">{t('guestHome.villa')}</option>
                  <option value="DUPLEX">{t('guestHome.duplex')}</option>
                </select>
              </div>

              <div className="search-field">
                <label>{t('guestHome.bedrooms')}</label>
                <select
                  className="props-select"
                  value={selectedBeds}
                  onChange={(e) => {
                    setSelectedBeds(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t('guestHome.any')}</option>
                  <option value="1">{t('guestHome.bedsCount', { count: 1 })}</option>
                  <option value="2">{t('guestHome.bedsCount_plural', { count: 2 })}</option>
                  <option value="3">{t('guestHome.bedsCount_plural', { count: 3 })}</option>
                  <option value="4">{t('guestHome.bedsCountPlus')}</option>
                </select>
              </div>

              <div className="search-field">
                <label>{t('guestHome.maxPriceLabel')}</label>
                <select
                  className="props-select"
                  value={selectedPrice}
                  onChange={(e) => {
                    setSelectedPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t('guestHome.anyPrice')}</option>
                  <option value="5000">{t('guestHome.upTo', { price: '5,000' })}</option>
                  <option value="8000">{t('guestHome.upTo', { price: '8,000' })}</option>
                  <option value="12000">{t('guestHome.upTo', { price: '12,000' })}</option>
                  <option value="20000">{t('guestHome.upTo', { price: '20,000' })}</option>
                </select>
              </div>

              <div className="search-field" style={{ justifyContent: 'flex-end' }}>
                <label style={{ visibility: 'hidden' }}>Search</label>
                <button className="search-btn">
                  <span>🔍</span> {t('guestHome.searchBtn')}
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="props-filter-chips">
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
                {t('guestHome.quick')}
              </span>
              {[
                { label: t('guestHome.filterAll'), value: '' },
                { label: t('guestHome.filterFurnished'), value: 'furnished' },
                { label: t('guestHome.filterParking'), value: 'parking' },
                { label: t('guestHome.filterGym'), value: 'gym' },
                { label: t('guestHome.filterPool'), value: 'pool' },
                { label: t('guestHome.filterPetFriendly'), value: 'pets' },
                { label: t('guestHome.filterBalcony'), value: 'balcony' },
                { label: t('guestHome.filterSecurity'), value: 'security' },
              ].map((chip) => (
                <button
                  key={chip.value}
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
              <strong>{totalFilteredCount}</strong> {t('guestHome.propertiesFound', { count: totalFilteredCount })}
            </div>
            <div className="props-sort-wrap">
              <label>{t('guestHome.sortByLabel')}</label>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">{t('guestHome.sortFeatured')}</option>
                <option value="price-asc">{t('guestHome.sortPriceAsc')}</option>
                <option value="price-desc">{t('guestHome.sortPriceDesc')}</option>
                <option value="newest">{t('guestHome.sortNewest')}</option>
              </select>
            </div>
          </div>

          {/* Loading / Grid / No Results */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p>{t('guestHome.loadingProperties')}</p>
            </div>
          ) : paginatedProperties.length === 0 ? (
            <div id="no-results" style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: '1.3rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                {t('guestHome.noPropertiesFound')}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                {t('guestHome.adjustFilters')}
              </div>
            </div>
          ) : (
            <div className="props-grid">
              {paginatedProperties.map((property) => {
                const isFeatured = property.tags && property.tags.some(t => t.toLowerCase() === 'featured' || t.toLowerCase() === '⭐ featured');
                const badge = isFeatured ? t('guestHome.featuredBadge') : t('guestHome.availableBadge');
                const badgeClass = isFeatured ? 'featured' : 'available';

                return (
                  <div
                    key={property.id}
                    className="prop-card reveal visible"
                    onClick={() => navigate(`/properties/${property.id}`, { state: { openedFromGuest: true } })}
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
                        {property.price.toLocaleString()} <em>{t('guestHome.egpMonth')}</em>
                      </div>
                      <div className="prop-title">{property.title}</div>
                      <div className="prop-location">
                        <div className="prop-location-dot"></div>
                        {property.address}
                      </div>
                      <div className="prop-specs">
                        <div className="prop-spec">
                          <strong>{property.beds}</strong>{t('guestHome.bedsSpec')}
                        </div>
                        <div className="prop-spec">
                          <strong>{property.baths}</strong>{t('guestHome.bathsSpec')}
                        </div>
                        <div className="prop-spec">
                          <strong>{property.sqft}</strong>{t('guestHome.sqmSpec')}
                        </div>

                      </div>
                      <div className="prop-landlord">
                        <img
                          className="prop-avatar"
                          src={property.ownerImage || 'https://i.pravatar.cc/150'}
                          alt="Landlord"
                        />
                        <div className="prop-landlord-name">
                          <strong>{property.ownerName}</strong>{t('guestHome.verifiedLandlord')}
                        </div>
                        <button
                          className="prop-apply-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/auth');
                          }}
                        >
                          {t('guestHome.applyNow')}
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
        <div className="guest-section-header reveal">
          <div className="section-tag">{t('guestHome.platformOverview')}</div>
          <h2 className="section-title">{t('guestHome.everythingOnePlace')}</h2>
        </div>

        <div className="tabs-container">
          <div className="guest-tab-bar">
            <button
              className={`guest-tab-btn ${activeTab === 'tenant' ? 'active' : ''}`}
              onClick={() => setActiveTab('tenant')}
            >
              {t('guestHome.imTenant')}
            </button>
            <button
              className={`guest-tab-btn ${activeTab === 'landlord' ? 'active' : ''}`}
              onClick={() => setActiveTab('landlord')}
            >
              {t('guestHome.imLandlord')}
            </button>
            <button
              className={`guest-tab-btn ${activeTab === 'provider' ? 'active' : ''}`}
              onClick={() => setActiveTab('provider')}
            >
              {t('guestHome.imProvider')}
            </button>
          </div>

          {/* TENANT FEATURE GRID */}
          <div className={`tab-panel ${activeTab === 'tenant' ? 'active' : ''}`} id="tab-tenant">
            <div className="feature-grid">
              <div className="feature-card wide reveal">
                <div className="feature-icon">🔍</div>
                <div className="feature-title">{t('guestHome.tenantTitle')}</div>
                <div className="feature-desc">{t('guestHome.tenantDesc')}</div>
                <div className="step-list">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.tenantStep1') }} />
                  </div>
                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.tenantStep2') }} />
                  </div>
                  <div className="step-item">
                    <div className="step-num">3</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.tenantStep3') }} />
                  </div>
                </div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🤝</div>
                <div className="feature-title">{t('guestHome.tenantRoommateTitle')}</div>
                <div className="feature-desc">{t('guestHome.tenantRoommateDesc')}</div>
              </div>

              <div className="feature-card reveal">
                <div className="feature-icon">💳</div>
                <div className="feature-title">{t('guestHome.tenantPayWalletTitle')}</div>
                <div className="feature-desc">{t('guestHome.tenantPayWalletDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🏡</div>
                <div className="feature-title">{t('guestHome.tenantManageTitle')}</div>
                <div className="feature-desc">{t('guestHome.tenantManageDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🔧</div>
                <div className="feature-title">{t('guestHome.tenantMaintenanceTitle')}</div>
                <div className="feature-desc">{t('guestHome.tenantMaintenanceDesc')}</div>
              </div>
            </div>
          </div>

          {/* LANDLORD FEATURE GRID */}
          <div className={`tab-panel ${activeTab === 'landlord' ? 'active' : ''}`} id="tab-landlord">
            <div className="feature-grid">
              <div className="feature-card wide reveal">
                <div className="feature-icon">🏗️</div>
                <div className="feature-title">{t('guestHome.landlordTitle')}</div>
                <div className="feature-desc">{t('guestHome.landlordDesc')}</div>
                <div className="step-list">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.landlordStep1') }} />
                  </div>
                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.landlordStep2') }} />
                  </div>
                  <div className="step-item">
                    <div className="step-num">3</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.landlordStep3') }} />
                  </div>
                </div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">👥</div>
                <div className="feature-title">{t('guestHome.landlordReviewAppsTitle')}</div>
                <div className="feature-desc">{t('guestHome.landlordReviewAppsDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">✍️</div>
                <div className="feature-title">{t('guestHome.landlordSignLeaseTitle')}</div>
                <div className="feature-desc">{t('guestHome.landlordSignLeaseDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">💰</div>
                <div className="feature-title">{t('guestHome.landlordReceiveRentTitle')}</div>
                <div className="feature-desc">{t('guestHome.landlordReceiveRentDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🔩</div>
                <div className="feature-title">{t('guestHome.landlordMaintenanceTitle')}</div>
                <div className="feature-desc">{t('guestHome.landlordMaintenanceDesc')}</div>
              </div>
            </div>
          </div>

          {/* PROVIDER FEATURE GRID */}
          <div className={`tab-panel ${activeTab === 'provider' ? 'active' : ''}`} id="tab-provider">
            <div className="feature-grid">
              <div className="feature-card wide reveal">
                <div className="feature-icon">🛠️</div>
                <div className="feature-title">{t('guestHome.providerTitle')}</div>
                <div className="feature-desc">{t('guestHome.providerDesc')}</div>
                <div className="step-list">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.providerStep1') }} />
                  </div>
                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.providerStep2') }} />
                  </div>
                  <div className="step-item">
                    <div className="step-num">3</div>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: t('guestHome.providerStep3') }} />
                  </div>
                </div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">📄</div>
                <div className="feature-title">{t('guestHome.providerVerifySafetyTitle')}</div>
                <div className="feature-desc">{t('guestHome.providerVerifySafetyDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">🔍</div>
                <div className="feature-title">{t('guestHome.providerBrowseLocalTitle')}</div>
                <div className="feature-desc">{t('guestHome.providerBrowseLocalDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">💰</div>
                <div className="feature-title">{t('guestHome.providerSecurePaymentsTitle')}</div>
                <div className="feature-desc">{t('guestHome.providerSecurePaymentsDesc')}</div>
              </div>
              <div className="feature-card reveal">
                <div className="feature-icon">📋</div>
                <div className="feature-title">{t('guestHome.providerSubmitReportsTitle')}</div>
                <div className="feature-desc">{t('guestHome.providerSubmitReportsDesc')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Step-by-Step Breakdown */}
      <section id="steps" className="steps-section">
        <div className="guest-section-header reveal" style={{ paddingTop: '5rem' }}>
          <div className="section-tag">{t('guestHome.stepByStepGuide')}</div>
          <h2 className="section-title">{t('guestHome.howHomiWorks')}</h2>
        </div>

        <div className="steps-tabs-bar">
          <button
            className={`steps-tab ${activeStepsTab === 'tenant-steps' ? 'active' : ''}`}
            onClick={() => setActiveStepsTab('tenant-steps')}
          >
            {t('guestHome.tenantJourney')}
          </button>
          <button
            className={`steps-tab ${activeStepsTab === 'landlord-steps' ? 'active' : ''}`}
            onClick={() => setActiveStepsTab('landlord-steps')}
          >
            {t('guestHome.landlordJourney')}
          </button>
          <button
            className={`steps-tab ${activeStepsTab === 'provider-steps' ? 'active' : ''}`}
            onClick={() => setActiveStepsTab('provider-steps')}
          >
            {t('guestHome.providerJourney')}
          </button>
        </div>

        {/* TENANT STEPS PANEL (All step-photo-badges removed) */}
        <div className={`steps-panel ${activeStepsTab === 'tenant-steps' ? 'active' : ''}`} id="tenant-steps">
          {/* Step 1 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">1</div>
                <div className="snb-label">{t('guestHome.stepOne')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step1Title')}</div>
              <div className="step-content-desc">{t('forTenants.step1Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step1Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step1Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80&fit=crop" alt="Person setting up account on laptop" />
              <div className="step-photo-caption"><strong>{t('forTenants.step1CapTitle')}</strong><span>{t('forTenants.step1CapSub')}</span></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">2</div>
                <div className="snb-label">{t('guestHome.stepTwo')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step2Title')}</div>
              <div className="step-content-desc">{t('forTenants.step2Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step2Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step2Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80&fit=crop" alt="Apartment building exterior" />
              <div className="step-photo-caption"><strong>{t('forTenants.step2CapTitle')}</strong><span>{t('forTenants.step2CapSub')}</span></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">3</div>
                <div className="snb-label">{t('guestHome.stepThree')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step3Title')}</div>
              <div className="step-content-desc">{t('forTenants.step3Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step3Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step3Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&fit=crop" alt="Two people discussing housing" />
              <div className="step-photo-caption"><strong>{t('forTenants.step3CapTitle')}</strong><span>{t('forTenants.step3CapSub')}</span></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">4</div>
                <div className="snb-label">{t('guestHome.stepFour')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step4Title')}</div>
              <div className="step-content-desc">{t('forTenants.step4Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step4Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step4Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop" alt="Person filling rental application" />
              <div className="step-photo-caption"><strong>{t('forTenants.step4CapTitle')}</strong><span>{t('forTenants.step4CapSub')}</span></div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">5</div>
                <div className="snb-label">{t('guestHome.stepFive')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step5Title')}</div>
              <div className="step-content-desc">{t('forTenants.step5Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step5Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step5Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop" alt="Signing a rental contract" />
              <div className="step-photo-caption"><strong>{t('forTenants.step5CapTitle')}</strong><span>{t('forTenants.step5CapSub')}</span></div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">6</div>
                <div className="snb-label">{t('guestHome.stepSix')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step6Title')}</div>
              <div className="step-content-desc">{t('forTenants.step6Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step6Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step6Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&fit=crop" alt="Digital payment on phone" />
              <div className="step-photo-caption"><strong>{t('forTenants.step6CapTitle')}</strong><span>{t('forTenants.step6CapSub')}</span></div>
            </div>
          </div>

          {/* Step 7 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">7</div>
                <div className="snb-label">{t('guestHome.stepSeven')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step7Title')}</div>
              <div className="step-content-desc">{t('forTenants.step7Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step7Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step7Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&fit=crop" alt="Modern apartment interior living" />
              <div className="step-photo-caption"><strong>{t('forTenants.step7CapTitle')}</strong><span>{t('forTenants.step7CapSub')}</span></div>
            </div>
          </div>

          {/* Step 8 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">8</div>
                <div className="snb-label">{t('guestHome.stepEight')}</div>
              </div>
              <div className="step-content-title">{t('forTenants.step8Title')}</div>
              <div className="step-content-desc">{t('forTenants.step8Desc')}</div>
              <div className="step-bullets">
                {(t('forTenants.step8Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forTenants.step8Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop" alt="Maintenance worker repairing apartment" />
              <div className="step-photo-caption"><strong>{t('forTenants.step8CapTitle')}</strong><span>{t('forTenants.step8CapSub')}</span></div>
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
                <div className="snb-label">{t('guestHome.stepOne')}</div>
              </div>
              <div className="step-content-title">{t('howItWorks.step1Title')}</div>
              <div className="step-content-desc">{t('howItWorks.step1Desc')}</div>
              <div className="step-bullets">
                {(t('howItWorks.step1Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('howItWorks.step1Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&fit=crop" alt="Real estate professional" />
              <div className="step-photo-caption"><strong>{t('howItWorks.step1CapTitle')}</strong><span>{t('howItWorks.step1CapSub')}</span></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">2</div>
                <div className="snb-label">{t('guestHome.stepTwo')}</div>
              </div>
              <div className="step-content-title">{t('howItWorks.step2Title')}</div>
              <div className="step-content-desc">{t('howItWorks.step2Desc')}</div>
              <div className="step-bullets">
                {(t('howItWorks.step2Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('howItWorks.step2Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80&fit=crop" alt="Keys in front of house" />
              <div className="step-photo-caption"><strong>{t('howItWorks.step2CapTitle')}</strong><span>{t('howItWorks.step2CapSub')}</span></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">3</div>
                <div className="snb-label">{t('guestHome.stepThree')}</div>
              </div>
              <div className="step-content-title">{t('howItWorks.step3Title')}</div>
              <div className="step-content-desc">{t('howItWorks.step3Desc')}</div>
              <div className="step-bullets">
                {(t('howItWorks.step3Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('howItWorks.step3Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80&fit=crop" alt="Reviewing document on tablet" />
              <div className="step-photo-caption"><strong>{t('howItWorks.step3CapTitle')}</strong><span>{t('howItWorks.step3CapSub')}</span></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">4</div>
                <div className="snb-label">{t('guestHome.stepFour')}</div>
              </div>
              <div className="step-content-title">{t('howItWorks.step4Title')}</div>
              <div className="step-content-desc">{t('howItWorks.step4Desc')}</div>
              <div className="step-bullets">
                {(t('howItWorks.step4Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('howItWorks.step4Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80&fit=crop" alt="Analytics on laptop screen" />
              <div className="step-photo-caption"><strong>{t('howItWorks.step4CapTitle')}</strong><span>{t('howItWorks.step4CapSub')}</span></div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">5</div>
                <div className="snb-label">{t('guestHome.stepFive')}</div>
              </div>
              <div className="step-content-title">{t('howItWorks.step5Title')}</div>
              <div className="step-content-desc">{t('howItWorks.step5Desc')}</div>
              <div className="step-bullets">
                {(t('howItWorks.step5Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('howItWorks.step5Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80&fit=crop" alt="Wallet and money on table" />
              <div className="step-photo-caption"><strong>{t('howItWorks.step5CapTitle')}</strong><span>{t('howItWorks.step5CapSub')}</span></div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">6</div>
                <div className="snb-label">{t('guestHome.stepSix')}</div>
              </div>
              <div className="step-content-title">{t('howItWorks.step6Title')}</div>
              <div className="step-content-desc">{t('howItWorks.step6Desc')}</div>
              <div className="step-bullets">
                {(t('howItWorks.step6Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('howItWorks.step6Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1421789665209-c9b2a435e3dc?w=800&q=80&fit=crop" alt="Tools on table" />
              <div className="step-photo-caption"><strong>{t('howItWorks.step6CapTitle')}</strong><span>{t('howItWorks.step6CapSub')}</span></div>
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
                <div className="snb-label">{t('guestHome.stepOne')}</div>
              </div>
              <div className="step-content-title">{t('forMaintenance.step1Title')}</div>
              <div className="step-content-desc">{t('forMaintenance.step1Desc')}</div>
              <div className="step-bullets">
                {(t('forMaintenance.step1Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forMaintenance.step1Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80&fit=crop" alt="Technician setting up profile" />
              <div className="step-photo-caption"><strong>{t('forMaintenance.step1CapTitle')}</strong><span>{t('forMaintenance.step1CapSub')}</span></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">2</div>
                <div className="snb-label">{t('guestHome.stepTwo')}</div>
              </div>
              <div className="step-content-title">{t('forMaintenance.step2Title')}</div>
              <div className="step-content-desc">{t('forMaintenance.step2Desc')}</div>
              <div className="step-bullets">
                {(t('forMaintenance.step2Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forMaintenance.step2Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop" alt="Legal papers verification" />
              <div className="step-photo-caption"><strong>{t('forMaintenance.step2CapTitle')}</strong><span>{t('forMaintenance.step2CapSub')}</span></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">3</div>
                <div className="snb-label">{t('guestHome.stepThree')}</div>
              </div>
              <div className="step-content-title">{t('forMaintenance.step3Title')}</div>
              <div className="step-content-desc">{t('forMaintenance.step3Desc')}</div>
              <div className="step-bullets">
                {(t('forMaintenance.step3Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forMaintenance.step3Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80&fit=crop" alt="Searching posted issues on tablet" />
              <div className="step-photo-caption"><strong>{t('forMaintenance.step3CapTitle')}</strong><span>{t('forMaintenance.step3CapSub')}</span></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">4</div>
                <div className="snb-label">{t('guestHome.stepFour')}</div>
              </div>
              <div className="step-content-title">{t('forMaintenance.step4Title')}</div>
              <div className="step-content-desc">{t('forMaintenance.step4Desc')}</div>
              <div className="step-bullets">
                {(t('forMaintenance.step4Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forMaintenance.step4Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80&fit=crop" alt="Sending proposal on laptop" />
              <div className="step-photo-caption"><strong>{t('forMaintenance.step4CapTitle')}</strong><span>{t('forMaintenance.step4CapSub')}</span></div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-row reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">5</div>
                <div className="snb-label">{t('guestHome.stepFive')}</div>
              </div>
              <div className="step-content-title">{t('forMaintenance.step5Title')}</div>
              <div className="step-content-desc">{t('forMaintenance.step5Desc')}</div>
              <div className="step-bullets">
                {(t('forMaintenance.step5Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forMaintenance.step5Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop" alt="Technician performing repair work" />
              <div className="step-photo-caption"><strong>{t('forMaintenance.step5CapTitle')}</strong><span>{t('forMaintenance.step5CapSub')}</span></div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="step-row reverse reveal">
            <div className="step-content">
              <div className="step-number-badge">
                <div className="snb-circle">6</div>
                <div className="snb-label">{t('guestHome.stepSix')}</div>
              </div>
              <div className="step-content-title">{t('forMaintenance.step6Title')}</div>
              <div className="step-content-desc">{t('forMaintenance.step6Desc')}</div>
              <div className="step-bullets">
                {(t('forMaintenance.step6Bullets', { returnObjects: true }) as string[] || []).map((bullet, idx) => (
                  <div className="step-bullet" key={idx}><div className="step-bullet-icon">✓</div>{bullet}</div>
                ))}
              </div>
              <div className="step-tags">
                {(t('forMaintenance.step6Tags', { returnObjects: true }) as string[] || []).map((tag, idx) => (
                  <span className="step-tag" key={idx}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="step-photo">
              <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&fit=crop" alt="Tracking balance on mobile phone" />
              <div className="step-photo-caption"><strong>{t('forMaintenance.step6CapTitle')}</strong><span>{t('forMaintenance.step6CapSub')}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Dual Persona (Roles section - buttons changed to navigate to /auth and class outline) */}
      <section className="roles-section">
        <div className="roles-grid">
          {/* Tenant Card */}
          <div className="role-card tenant" data-emoji="🏠">
            <div className="role-badge-pill">{t('guestHome.roleTenant')}</div>
            <h3 className="role-title">{t('guestHome.roleTenantTitle')}</h3>
            <p className="role-desc">{t('guestHome.roleTenantDesc')}</p>
            <div className="role-features">
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleTenantFeat1')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleTenantFeat2')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleTenantFeat3')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleTenantFeat4')}</div>
            </div>
            <button onClick={() => navigate('/auth')} className="btn-outline">{t('guestHome.roleTenantBtn')}</button>
          </div>

          {/* Landlord Card */}
          <div className="role-card landlord" data-emoji="🏗️">
            <div className="role-badge-pill">{t('guestHome.roleLandlord')}</div>
            <h3 className="role-title">{t('guestHome.roleLandlordTitle')}</h3>
            <p className="role-desc">{t('guestHome.roleLandlordDesc')}</p>
            <div className="role-features">
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleLandlordFeat1')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleLandlordFeat2')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleLandlordFeat3')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleLandlordFeat4')}</div>
            </div>
            <button onClick={() => navigate('/auth')} className="btn-outline" style={{ color: '#16a34a', borderColor: '#16a34a' }}>{t('guestHome.roleLandlordBtn')}</button>
          </div>

          {/* Maintenance Provider Card */}
          <div className="role-card provider" data-emoji="🛠️">
            <div className="role-badge-pill">{t('guestHome.roleProvider')}</div>
            <h3 className="role-title">{t('guestHome.roleProviderTitle')}</h3>
            <p className="role-desc">{t('guestHome.roleProviderDesc')}</p>
            <div className="role-features">
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleProviderFeat1')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleProviderFeat2')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleProviderFeat3')}</div>
              <div className="role-feat"><span className="check">✓</span> {t('guestHome.roleProviderFeat4')}</div>
            </div>
            <button onClick={() => navigate('/maintenance-providers')} className="btn-outline" style={{ color: '#d97706', borderColor: '#d97706' }}>{t('guestHome.roleProviderBtn')}</button>
          </div>
        </div>
      </section>

      {/* 7. Wallet Showcase (Pay Rent / Withdraw redirecting to /auth) */}
      <section id="wallet" className="wallet-section">
        <div className="guest-section-header reveal">
          <div className="section-tag">{t('guestHome.walletTitle')}</div>
          <h2 className="section-title">{t('guestHome.walletSubtitle')}</h2>
        </div>

        <div className="wallet-card reveal">
          <div className="wallet-left">
            <div className="wallet-balance-label">{t('guestHome.walletBalanceLabel')}</div>
            <div className="wallet-balance">25,800.00 <em>EGP</em></div>
            <div className="wallet-actions">
              <button onClick={() => navigate('/auth')} className="wallet-btn pay">{t('tenantHomeComponents.payNow')}</button>
              <button onClick={() => navigate('/auth')} className="wallet-btn">{t('myProperties.labels.withdraw', 'Withdraw')}</button>
            </div>
            <div className="wallet-tx">
              <div className="tx-label">{t('guestHome.walletTxLabel')}</div>
              <div className="tx-row">
                <span className="tx-name">{t('guestHome.walletTx1')}</span>
                <span className="tx-amount out">-12,000 EGP</span>
              </div>
              <div className="tx-row">
                <span className="tx-name">{t('guestHome.walletTx2')}</span>
                <span className="tx-amount in">+8,000 EGP</span>
              </div>
              <div className="tx-row">
                <span className="tx-name">{t('guestHome.walletTx3')}</span>
                <span className="tx-amount in">+15,000 EGP</span>
              </div>
            </div>
          </div>

          <div className="wallet-right">
            <h3>{t('guestHome.walletRightTitle')}</h3>
            <p>{t('guestHome.walletRightDesc')}</p>
            <div className="wallet-points">
              <div className="wp">
                <div className="wp-icon">🏦</div>
                <div>{t('guestHome.walletRightPoint1')}</div>
              </div>
              <div className="wp">
                <div className="wp-icon">📋</div>
                <div>{t('guestHome.walletRightPoint2')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ accordion */}
      <section id="faq">
        <div className="guest-section-header reveal">
          <div className="section-tag">{t('guestHome.commonQuestions')}</div>
          <h2 className="section-title">{t('guestHome.frequentlyAsked')}</h2>
        </div>
        <div className="faq reveal">
          <div className={`faq-item ${openFaqIndex === 0 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}>
              {t('guestHome.faqQ1')}
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              {t('guestHome.faqA1')}
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 1 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}>
              {t('guestHome.faqQ2')}
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              {t('guestHome.faqA2')}
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 2 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}>
              {t('guestHome.faqQ3')}
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              {t('guestHome.faqA3')}
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 3 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}>
              {t('guestHome.faqQ4')}
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              {t('guestHome.faqA4')}
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 4 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 4 ? null : 4)}>
              {t('guestHome.faqQ5')}
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              {t('guestHome.faqA5')}
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 5 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 5 ? null : 5)}>
              {t('guestHome.faqQ6')}
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              {t('guestHome.faqA6')}
            </div>
          </div>

          <div className={`faq-item ${openFaqIndex === 6 ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === 6 ? null : 6)}>
              {t('guestHome.faqQ7')}
              <span className="faq-toggle">+</span>
            </div>
            <div className="faq-a">
              {t('guestHome.faqA7')}
            </div>
          </div>
        </div>
      </section>

      {/* 9. CTA Banner (buttons redirecting to /auth) */}
      <section id="start" className="cta-section">
        <div className="cta-box reveal">
          <div style={{ fontSize: '3rem', marginBottom: '1rem', position: 'relative' }}>🏠</div>
          <h2>{t('guestHome.ctaReadyToGetStarted')}</h2>
          <p>{t('guestHome.ctaDesc')}</p>
          <div className="cta-btns">
            <button onClick={() => navigate('/auth')} className="btn-white">{t('guestHome.ctaCreateTenant')}</button>
            <button onClick={() => navigate('/auth')} className="btn-white-outline">{t('guestHome.ctaListProperty')}</button>
            <button onClick={() => navigate('/maintenance-providers')} className="btn-white-outline" style={{ borderStyle: 'dashed' }}>{t('guestHome.ctaJoinProvider')}</button>
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