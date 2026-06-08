import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import PropertyCard from '../components/LandlordHomeComponents/PropertyCard';
import AddPropertyCard from '../components/LandlordHomeComponents/AddPropertyCard';
import Notifications from '../components/LandlordHomeComponents/Notifications';
import PaymentState from '../components/LandlordHomeComponents/PaymentState';
import OptimizeListingModal from '../components/LandlordHomeComponents/optimizeListingModal';
import { FiPlus, FiHome, FiCamera, FiBookOpen, FiCreditCard, FiStar, FiZap, FiMessageSquare } from 'react-icons/fi';
import authService from '../../../services/auth.service';
import propertyService from '../../../services/property.service';
import Loader from '../../../components/global/Loader';
import type { PropertyResponse } from '../../../services/property.service';
import contractService, { type LandlordContract } from '../../../services/contract.service';
import './LandlordHome.css';

const LandlordHome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [contracts, setContracts] = useState<LandlordContract[]>([]);
  const [landlordName, setLandlordName] = useState(t('sidebar.loading'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.user?.id) {
        setProperties([]);
        setIsLoading(false);
        return;
      }

      setLandlordName(
        currentUser.profile?.firstName ||
        currentUser.user?.email?.split('@')[0] ||
        t('sidebar.landlord')
      );

      const [propertiesResponse, contractsResponse] = await Promise.all([
        propertyService.getAllProperties({ landlordId: currentUser.user.id }),
        contractService.getLandlordContracts({ page: 1, limit: 100 }),
      ]);

      setProperties(propertiesResponse?.data ?? []);
      setContracts(contractsResponse?.data ?? []);
    } catch {
      setProperties([]);
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const getContractPaymentStatus = (contract: LandlordContract): string => {
    return ((contract as unknown as { paymentStatus?: string }).paymentStatus || 'PENDING').toUpperCase();
  };

  const receivedTotal = contracts
    .filter((contract) => getContractPaymentStatus(contract) === 'PAID')
    .reduce((sum, contract) => sum + Number(contract.rentAmount ?? contract.property?.monthlyPrice ?? 0), 0);

  const upcomingTotal = contracts
    .filter((contract) => getContractPaymentStatus(contract) !== 'PAID')
    .reduce((sum, contract) => sum + Number(contract.rentAmount ?? contract.property?.monthlyPrice ?? 0), 0);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  const hasData = properties.length > 0;
  const mappedProperties = properties.map((prop, index) => {
    const activeContract = contracts.find(
      (c) => c.property?.id === prop.id && c.status === 'ACTIVE'
    );
    const computedStatus = activeContract ? 'rented' : (prop.status || '').toLowerCase();
    
    let tenantName = t('landlordHome.noCurrentTenant');
    if (activeContract?.tenant) {
      tenantName = `${activeContract.tenant.firstName} ${activeContract.tenant.lastName}`.trim();
    }

    return {
      id: prop.id || String(index),
      name: prop.title,
      address: prop.address,
      status: computedStatus,
      price: String(prop.monthlyPrice ?? ''),
      imageUrl:
        prop.images?.find((img) => img.isMain)?.imageUrl ||
        prop.images?.[0]?.imageUrl ||
        '/rentblue.jpg',
      beds: prop.specifications?.bedrooms ?? 0,
      baths: prop.specifications?.bathrooms ?? 0,
      sqft: prop.specifications?.areaSqft ?? '—',
      tenantName,
      paymentStatus: computedStatus === 'rented' ? 'Paid' : 'Pending',
      activeContract,
      images: prop.images,
    };
  });

  return (
    <>
          <main className="dashboard-container">
            {isLoading ? (
              <Loader text={t('landlordHome.loadingHomePage')} />
            ) : hasData ? (
              /* =========================================
                 PREMIUM POPULATED STATE (Dashboard)
                 ========================================= */
              <div className="dashboard-content-wrapper animate-fade-in">

                <header className="welcome-section">
                  <div className="welcome-text">
                    <h1>{t('landlordHome.welcomeBack')}, <span className="highlight-gradient">{landlordName}!</span></h1>
                    <p>{t('landlordHome.managePropertiesTrack')}</p>
                  </div>
                </header>

                {/* Top Actions & Summary Row */}
                <section className="dashboard-top-row">
                  <div className="action-widget">
                    <AddPropertyCard onClick={() => navigate('/properties/add')} />
                  </div>

                  <div className="payment-widget">
                    <PaymentState
                      upcomingPayouts={upcomingTotal}
                      recentlyReceived={receivedTotal}
                      isLoading={isLoading}
                    />
                  </div>

                  <div className="notifications-widget">
                    <Notifications />
                  </div>
                </section>

                {/* Master Properties Container */}
                <section className="properties-master-container">
                  <div className="section-header">
                    <div className="header-title-group">
                      <div className="header-icon"><FiHome size={20} /></div>
                      <h2>{t('landlordHome.yourPortfolio')}</h2>
                      <span className="status-badge">{t('landlordHome.activeListings', { count: mappedProperties.length })}</span>
                    </div>
                    <button className="btn-text-primary" onClick={() => navigate('/properties/add')}>
                      <FiPlus size={18} /> {t('landlordHome.addNew')}
                    </button>
                  </div>

                  <div className="properties-grid">
                    {mappedProperties.map(prop => (
                      <PropertyCard
                        key={prop.id}
                        name={prop.name}
                        address={prop.address}
                        status={prop.status}
                        price={prop.price}
                        id={prop.id}
                        imageUrl={prop.imageUrl}
                        beds={prop.beds}
                        baths={prop.baths}
                        sqft={prop.sqft}
                        tenantName={prop.tenantName}
                        paymentStatus={prop.paymentStatus}
                        activeContract={prop.activeContract}
                        securityDeposit={prop.securityDeposit}
                        images={prop.images}
                      />
                    ))}
                  </div>
                </section>

              </div>
            ) : (
              /* =========================================
                 PREMIUM EMPTY STATE (Onboarding)
                 ========================================= */
              <div className="lh-onboarding-wrapper animate-fade-in">

                {/* 1. Hero Section */}
                <section className="lh-hero-banner">
                  <div className="lh-hero-blobs">
                    <div className="lh-blob blob-1"></div>
                    <div className="lh-blob blob-2"></div>
                  </div>
                  <div className="lh-hero-content">
                    <h1>{t('landlordHome.startListingToday')}</h1>
                    <p>{t('landlordHome.reachThousandsTenants')}</p>
                    <div className="lh-hero-actions">
                      <button className="lh-btn-primary" onClick={() => navigate('/properties/add')}>
                        <FiPlus size={20} /> {t('landlordHome.addProperty')}
                      </button>
                      <button className="lh-btn-secondary">
                        {t('guestNavbar.howItWorks')}
                      </button>
                    </div>
                  </div>
                </section>

                <div className="lh-onboarding-split">
                  <div className="lh-onboarding-main">

                    {/* 2. Getting Started Cards */}
                    <div className="lh-getting-started">
                      <div className="lh-cards-grid">
                        <div className="lh-onboarding-card" onClick={() => navigate('/properties/add')} style={{ cursor: 'pointer' }}>
                          <div className="lh-card-icon bg-blue"><FiHome /></div>
                          <span className="lh-step-badge">{t('landlordHome.step')} 1</span>
                          <h4>{t('landlordHome.addFirstProperty')}</h4>
                          <p>{t('landlordHome.enterDetailsUpload')}</p>
                        </div>

                        {/* 👈 CLICK HANDLER ADDED FOR OPTIMIZE MODAL */}
                        <div className="lh-onboarding-card" onClick={() => setIsOptimizeModalOpen(true)} style={{ cursor: 'pointer' }}>
                          <div className="lh-card-icon bg-purple"><FiCamera /></div>
                          <span className="lh-step-badge">{t('landlordHome.step')} 2</span>
                          <h4>{t('landlordHome.optimizeListing')}</h4>
                          <p>{t('landlordHome.learnPhotosAttract')}</p>
                        </div>

                        <div className="lh-onboarding-card">
                          <div className="lh-card-icon bg-green"><FiCreditCard /></div>
                          <span className="lh-step-badge">{t('landlordHome.step')} 3</span>
                          <h4>{t('landlordHome.setupPayments')}</h4>
                          <p>{t('landlordHome.connectBankReceive')}</p>
                        </div>
                        <div className="lh-onboarding-card">
                          <div className="lh-card-icon bg-orange"><FiBookOpen /></div>
                          <span className="lh-step-badge">{t('landlordHome.step')} 4</span>
                          <h4>{t('landlordHome.aboutHomi')}</h4>
                          <p>{t('landlordHome.readQuickGuide')}</p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Empty State For Properties List */}
                    <div className="lh-empty-list-box">
                      <div className="lh-empty-icon-wrapper">
                        <FiHome size={32} />
                      </div>
                      <h3>{t('landlordHome.haventListedProperties')}</h3>
                      <p>{t('landlordHome.portfolioWaitingBuilt')}</p>
                      <button className="lh-btn-outline" onClick={() => navigate('/properties/add')}>
                        <FiPlus /> {t('landlordHome.addProperty')}
                      </button>
                    </div>

                  </div>

                  {/* Right Panel: Notifications & Tips */}
                  <aside className="lh-onboarding-sidebar">

                    {/* 5. Notifications Panel */}
                    <div className="lh-widget lh-welcome-widget">
                      <div className="lh-widget-header">
                        <h4>{t('landlordHome.welcomeToHomi')}</h4>
                      </div>
                      <p>{t('landlordHome.startByAddingFirst')}</p>
                    </div>

                    {/* 4. Tips Section */}
                    <div className="lh-widget lh-tips-widget">
                      <h4>{t('landlordHome.tipsGetTenantsFaster')}</h4>
                      <ul className="lh-tips-list">
                        <li>
                          <div className="lh-tip-icon"><FiCamera /></div>
                          <span>{t('landlordHome.highQualityPhotos')}</span>
                        </li>
                        <li>
                          <div className="lh-tip-icon"><FiStar /></div>
                          <span>{t('landlordHome.setCompetitivePricing')}</span>
                        </li>
                        <li>
                          <div className="lh-tip-icon"><FiZap /></div>
                          <span>{t('landlordHome.respondQuickly')}</span>
                        </li>
                        <li>
                          <div className="lh-tip-icon"><FiMessageSquare /></div>
                          <span>{t('landlordHome.clearHonestDescriptions')}</span>
                        </li>
                      </ul>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </main>

      {isOptimizeModalOpen && (
        <OptimizeListingModal onClose={() => setIsOptimizeModalOpen(false)} />
      )}
    </>
  );
};

export default LandlordHome;
