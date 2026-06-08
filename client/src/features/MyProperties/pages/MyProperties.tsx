import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DetailedPropertyCard from '../components/DetailedPropertyCard';
import { FiPlus, FiHome } from 'react-icons/fi';
import propertyService from '../../../services/property.service';
import authService from '../../../services/auth.service';
import Loader from '../../../components/global/Loader';
import './MyProperties.css';
import type { LandlordPropertyRow } from '../components/DetailedPropertyCard';


const MyProperties = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<LandlordPropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [refreshKey] = useState(0);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const currentUser = authService.getCurrentUser();
        if (!currentUser?.user?.id) {
          setLoading(false);
          return;
        }
        
        const [propRes, contractRes] = await Promise.all([
          propertyService.getAllProperties({
             landlordId: currentUser.user.id
          }),
          import('../../../services/contract.service').then(m => 
            m.default.getLandlordContracts({ page: 1, limit: 100 })
          )
        ]);
        
        if (propRes.success && propRes.data) {
           const contracts = contractRes?.data || [];
            const mappedProperties = propRes.data.map(prop => {
              const activeContract = contracts.find(c => c.property?.id === prop.id && c.status === 'ACTIVE');
              const isOccupied = !!activeContract;
              const computedStatus = isOccupied ? 'rented' : prop.status.toLowerCase();
              
              let tenantName = null;
              if (activeContract?.tenant) {
                tenantName = `${activeContract.tenant.firstName} ${activeContract.tenant.lastName}`.trim();
              }

              let leaseEnd = null;
              if (activeContract) {
                const moveIn = new Date(activeContract.moveInDate);
                if (!Number.isNaN(moveIn.getTime())) {
                  const end = new Date(moveIn);
                  end.setMonth(end.getMonth() + activeContract.leaseDurationMonths);
                  leaseEnd = end.toLocaleDateString();
                }
              }


              return {
                id: prop.id,
                name: prop.title,
                address: prop.address,
                price: prop.monthlyPrice.toString(),
                beds: prop.specifications?.bedrooms ?? 0,
                baths: prop.specifications?.bathrooms ?? 0,
                sqft: prop.specifications?.areaSqft ?? 0,
                status: computedStatus,
                tenantName,
                leaseEnd,
                yield: "8.4",
                occupancyRate: activeContract ? 100 : 0,
                images: prop.images,
                amenities: prop.amenities.map(a => a.name),
                houseRules: prop.houseRules.map(r => r.name),
                activeContract: activeContract || null,
                onUpdate: fetchProperties,
                securityDeposit: prop.securityDeposit
              };
            });
            setProperties(mappedProperties);
        }
      } catch (err) {
        console.error('Failed to load portfolio:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, [refreshKey]);

  const hasData = properties.length > 0;

  if (loading) {
    return (
      <Loader text={t('myProperties.loading')} />
    );
  }

  return (
    <>
        <main className="my-properties-container">
          
          <div className="my-props-header">
            <div className="header-left">
              <h1>{t('myProperties.portfolio')}</h1>
              <p>{t('myProperties.managingUnits', { count: properties.length })}</p>
            </div>
            
            {/* Only show the top-right button if there IS data */}
            {hasData && (
              <button className="add-prop-primary-btn" onClick={() => navigate('/properties/add')}>
                <div className="btn-icon-circle">
                  <FiPlus />
                </div>
                <span className="new-prop-btn-text">{t('myProperties.addNewProperty')}</span>
              </button>
            )}
          </div>

          {/* Conditional Rendering based on hasData */}
          {hasData ? (
            <div className="detailed-list-wrapper">
              {properties.map(prop => (
                <DetailedPropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          ) : (
            <div className="my-properties-empty-state-wrapper">
              <div className="my-properties-empty-state-icon-bg">
                <FiHome size={48} className="my-properties-empty-state-icon" />
              </div>
              <h2>{t('myProperties.noPropertiesFound')}</h2>
              <p className="my-properties-empty-state-text">{t('myProperties.noPropertiesText')}</p>
              <button className="my-properties-empty-state-btn" onClick={() => navigate('/properties/add')}>
                <FiPlus size={20} />
                {t('myProperties.addFirstProperty')}
              </button>
            </div>
          )}

        </main>
    </>
  );
};

export default MyProperties;