import React, { useEffect, useMemo, useState } from 'react';
import { Search, Home, ShieldCheck, UserCircle, Handshake, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './TenantHome.css';

// Global Layout Components
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';

// Dashboard Widgets
import ActiveRentalsCard from '../components/TenantHomeComponents/ActiveRentalsCard';
import { UpcomingPayments } from '../components/TenantHomeComponents/UpcomingPayments';
import MaintenanceRequests from '../components/TenantHomeComponents/MaintenanceRequests';
import Notifications from '../components/TenantHomeComponents/Notifications';
import RewardsSummary from '../components/TenantHomeComponents/RewardsSummary';
import { authService } from '../../../services/auth.service';
import contractService from '../../../services/contract.service';
import type { LandlordContract } from '../../../services/contract.service';
import { propertyService, type PropertyResponse } from '../../../services/property.service';

const TenantHome: React.FC = () => {
  const { t } = useTranslation();
  const [isCheckingContracts, setIsCheckingContracts] = useState<boolean>(true);
  const [tenantContracts, setTenantContracts] = useState<LandlordContract[]>([]);
  const [activeRentalIndex, setActiveRentalIndex] = useState(0);
  const [simulatedNow, setSimulatedNow] = useState<Date>(new Date());
  const [activePropertyDetails, setActivePropertyDetails] = useState<PropertyResponse | null>(null);
  const navigate = useNavigate();
  const firstName = authService.getCurrentUser()?.profile?.firstName?.trim() || 'there';

  const currentHour = new Date().getHours();
  let greetingKey = 'tenantHome.goodEvening';
  if (currentHour < 12) {
    greetingKey = 'tenantHome.goodMorning';
  } else if (currentHour < 18) {
    greetingKey = 'tenantHome.goodAfternoon';
  }

  const isContractActiveForReferenceDate = (contract: LandlordContract, referenceDate: Date): boolean => {
    if (contract.status !== 'ACTIVE') return false;
    const moveIn = new Date(contract.moveInDate);
    if (Number.isNaN(moveIn.getTime())) return true;
    const leaseEnd = new Date(moveIn);
    leaseEnd.setMonth(leaseEnd.getMonth() + Number(contract.leaseDurationMonths ?? 0));
    return referenceDate < leaseEnd;
  };

  const loadDashboardData = async () => {
    setIsCheckingContracts(true);
    try {
      const [contractsRes, clock] = await Promise.all([
        contractService.getTenantContracts({ page: 1, limit: 50 }),
        contractService.getTestingClock(),
      ]);
      const contracts = contractsRes.data ?? [];
      setTenantContracts(contracts);
      setActiveRentalIndex(0);
      const simNow = new Date(clock.now);
      setSimulatedNow(simNow);

      // Pre-fetch active property details if any active contract exists
      const activeContractsList = contracts.filter((contract) => isContractActiveForReferenceDate(contract, simNow));
      const firstActiveContract = activeContractsList[0] ?? null;
      if (firstActiveContract?.property?.id) {
        try {
          const response = await propertyService.getPropertyById(firstActiveContract.property.id);
          setActivePropertyDetails(response.data);
        } catch {
          setActivePropertyDetails(null);
        }
      } else {
        setActivePropertyDetails(null);
      }
    } catch {
      setTenantContracts([]);
      setActivePropertyDetails(null);
    } finally {
      setIsCheckingContracts(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
    const handleClockChange = () => { void loadDashboardData(); };
    globalThis.addEventListener('homi:testing-clock-changed', handleClockChange);
    return () => globalThis.removeEventListener('homi:testing-clock-changed', handleClockChange);
  }, []);

  const activeContracts = useMemo(
    () => tenantContracts.filter((contract) => isContractActiveForReferenceDate(contract, simulatedNow)),
    [tenantContracts, simulatedNow]
  );
  const activeContract = useMemo(
    () => activeContracts[activeRentalIndex] ?? activeContracts[0] ?? null,
    [activeContracts, activeRentalIndex]
  );
  const hasActiveRentalsForView = activeContracts.length > 0;

  useEffect(() => {
    if (activeRentalIndex < activeContracts.length) return;
    setActiveRentalIndex(0);
  }, [activeRentalIndex, activeContracts.length]);

  useEffect(() => {
    const propertyId = activeContract?.property?.id;
    if (!propertyId) {
      setActivePropertyDetails(null);
      return;
    }

    // Skip fetching if the loaded details already match the desired property ID
    if (activePropertyDetails?.id === propertyId) {
      return;
    }

    let cancelled = false;

    const loadPropertyDetails = async () => {
      try {
        const response = await propertyService.getPropertyById(propertyId);
        if (!cancelled) {
          setActivePropertyDetails(response.data);
        }
      } catch {
        if (!cancelled) {
          setActivePropertyDetails(null);
        }
      }
    };

    void loadPropertyDetails();

    return () => {
      cancelled = true;
    };
  }, [activeContract?.property?.id, activePropertyDetails?.id]);

  const openPaymentContractsCount = useMemo(
    () => tenantContracts.filter((contract) => contract.status === 'PENDING_PAYMENT').length,
    [tenantContracts]
  );

  const maintenanceAreasCount = activeContract?.maintenanceResponsibilities?.length ?? 0;

  const activeSummaryText = openPaymentContractsCount > 0
    ? t('tenantHome.pendingPaymentsMaintenance', { paymentCount: openPaymentContractsCount, maintenanceCount: maintenanceAreasCount })
    : t('tenantHome.leaseDashboardUpToDate', { count: maintenanceAreasCount });

  if (isCheckingContracts) {
    return (
      <div className="tenant-dashboard-root">
        <Sidebar />
        <div className="main-wrapper">
          <Header />
          <main className="content-area" style={{ display: 'grid', placeItems: 'center' }}>
            <p style={{ color: '#64748b', fontWeight: 600 }}>{t('tenantHome.loadingDashboard')}</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-dashboard-root">
      <Sidebar />

      <div className="main-wrapper">
        <Header />

        <main className="content-area">
          <header className="welcome-section">
            <div className="welcome-text">
              <h1>{t(greetingKey)}, <span className="highlight">{firstName}!</span></h1>
              {hasActiveRentalsForView ? (
                <p>{activeSummaryText}</p>
              ) : (
                <p>{t('tenantHome.welcomeDreamHome')}</p>
              )}
            </div>
          </header>

          {hasActiveRentalsForView ? (
            <div className="dashboard-grid active-dashboard-grid">
              <section className="grid-col-2 active-home-card-slot">
                <ActiveRentalsCard contract={activeContract} propertyDetails={activePropertyDetails} referenceDate={simulatedNow} />
                {activeContracts.length > 1 && (
                  <div className="active-rental-dots" aria-label="Switch active property">
                    {activeContracts.map((contract, idx) => (
                      <button
                        key={contract.id}
                        type="button"
                        className={`rental-dot ${idx === activeRentalIndex ? 'active' : ''}`}
                        aria-label={`Show property ${idx + 1}`}
                        onClick={() => setActiveRentalIndex(idx)}
                      />
                    ))}
                  </div>
                )}
              </section>
              <section className="grid-col-1 active-payment-card-slot">
                <UpcomingPayments contract={activeContract} referenceDate={simulatedNow} />
              </section>
              <section className="grid-col-1">
                <Notifications />
              </section>
              <section className="grid-col-1">
                <MaintenanceRequests contract={activeContract} />
              </section>
              <section className="grid-col-1">
                <RewardsSummary contracts={tenantContracts} />
              </section>
            </div>
          ) : (
            <div className="empty-state-wrapper animate-fade-in">

              {/* HERO CTA BANNER */}
              <div className="hero-cta-card">
                {/* Abstract Background Shapes */}
                <div className="hero-bg-shape shape-1"></div>
                <div className="hero-bg-shape shape-2"></div>

                <div className="hero-cta-content">
                  <h2>{t('tenantHome.readyToFindPerfectPlace')}</h2>
                  <p>{t('tenantHome.browseVerifiedListings')}</p>
                  <button className="btn-search-primary" onClick={() => navigate('/browse-properties')}>
                    <Search size={18} /> {t('tenantHome.exploreProperties')}
                  </button>
                </div>

                {/* Decorative Floating Elements */}
                <div className="hero-cta-graphics">
                  <div className="floating-card card-1">
                    <Home size={28} className="float-icon" />
                    <div className="float-lines">
                      <div className="line line-short"></div>
                      <div className="line line-long"></div>
                    </div>
                  </div>
                  <div className="floating-card card-2">
                    <ShieldCheck size={28} className="float-icon" />
                    <div className="float-lines">
                      <div className="line line-long"></div>
                      <div className="line line-short"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Layout */}
              <div className="dashboard-grid" style={{ marginTop: '1rem' }}>

                <div className="grid-col-2">
                  <h3 className="section-subtitle" style={{ marginBottom: '1.25rem' }}>{t('tenantHome.gettingStarted')}</h3>
                  <div className="onboarding-grid">

                    {/* Card 1 */}
                    <div className="onboarding-card">
                      <div className="card-bg-icon"><UserCircle size={120} /></div>
                      <div className="step-badge">{t('landlordHome.step')} 1</div>
                      <div className="icon-wrapper blue"><UserCircle size={24} /></div>
                      <h4>{t('tenantHome.profileSetup')}</h4>
                      <p>{t('tenantHome.preApprovedFaster')}</p>
                      <button className="text-link" onClick={() => navigate('/settings')}>{t('tenantHome.goToProfile')} <ArrowRight size={16} className="arrow-icon" /></button>
                    </div>

                    {/* Card 2 */}
                    <div className="onboarding-card">
                      <div className="card-bg-icon"><Home size={120} /></div>
                      <div className="step-badge">{t('landlordHome.step')} 2</div>
                      <div className="icon-wrapper green"><Home size={24} /></div>
                      <h4>{t('tenantHome.findRoommate')}</h4>
                      <p>{t('tenantHome.smartFilters')}</p>
                      <button className="text-link" onClick={() => navigate('/matching')}>{t('tenantHome.viewMatchingProfiles')} <ArrowRight size={16} className="arrow-icon" /></button>
                    </div>

                    {/* Card 3 */}
                    <div className="onboarding-card">
                      <div className="card-bg-icon"><Handshake size={120} /></div>
                      <div className="step-badge">{t('landlordHome.step')} 3</div>
                      <div className="icon-wrapper purple"><Handshake size={24} /></div>
                      <h4>{t('tenantHome.sentRequests')}</h4>
                      <p>{t('tenantHome.viewManageRequests')}</p>
                      <button className="text-link" onClick={() => navigate('/sent-requests')}>
                        {t('tenantHome.viewRequests')} <ArrowRight size={16} className="arrow-icon" />
                      </button>
                    </div>

                  </div>
                </div>

                <section className="grid-col-1">
                  <h3 className="section-subtitle" style={{ marginBottom: '1.25rem' }}>{t('tenantHome.yourUpdates')}</h3>
                  <Notifications />
                </section>

              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default TenantHome;

