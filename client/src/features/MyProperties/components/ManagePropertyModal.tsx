// client\src\features\MyProperties\components\ManagePropertyModal.tsx
/* eslint-disable @typescript-eslint/no-explicit-any -- landlord editor accepts loosely-shaped property rows */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FaTimes, FaSave, FaTrashAlt, FaHome, FaDollarSign, 
  FaClipboardList, FaImages, FaExclamationTriangle,
  FaBed, FaBath, FaRulerCombined, FaMapMarkerAlt, FaCheckCircle, FaWrench
} from 'react-icons/fa';
import './ManagePropertyModal.css';

interface ManagePropertyModalProps {
  property: any;
  onClose: () => void;
  initialTab?: string;
}

const normalizeUiStatus = (rawStatus: string | undefined): 'draft' | 'pending_approval' | 'available' | 'rented' | 'rejected' => {
  const status = String(rawStatus || '').trim().toLowerCase();
  if (status === 'published') return 'available';
  if (status === 'draft') return 'draft';
  if (status === 'pending_approval') return 'pending_approval';
  if (status === 'available') return 'available';
  if (status === 'rented') return 'rented';
  if (status === 'rejected') return 'rejected';
  return 'draft';
};

const ManagePropertyModal: React.FC<ManagePropertyModalProps> = ({ property, onClose, initialTab }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialTab || 'general');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [saveError, setSaveError] = useState('');

  const amenitiesMaster = [
    'High-Speed Wi-Fi',
    'Fitness Center',
    'Keyless / Biometric Entry',
    'Pet Friendly',
    'Air Conditioning (A/C)',
    'Private Parking',
    '24/7 Security System',
  ];

  const rulesMaster = [
    'No Smoking',
    'Pets Allowed',
    'No Parties or Events',
    'Quiet Hours (10 PM - 8 AM)',
    'No Additional Guests',
    'Respect Neighbours',
    'Children Welcome',
  ];

  const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

  const uniqNormalized = (values: string[]) => {
    const seen = new Set<string>();
    const output: string[] = [];

    values.forEach((raw) => {
      if (!raw) return;
      const key = normalizeText(raw);
      if (!key || seen.has(key)) return;
      seen.add(key);
      output.push(raw);
    });

    return output;
  };

  // 1. Initial State for Comparison (Dirty Checking)
  // Included the full 10-item maintenance list here
  const initialStatus = useMemo(() => normalizeUiStatus(property.status), [property.status]);
  const isPendingApproval = initialStatus === 'pending_approval';
  const isRejected = initialStatus === 'rejected';
  const isRented = initialStatus === 'rented';
  const isLocked = isPendingApproval || isRejected || isRented;

  const initialState = useMemo(() => ({
    name: property.name || '',
    price: property.price?.toString().replace(/[^0-9]/g, '') || '',
    address: property.address || '',
    status: initialStatus,
    beds: property.beds || 0,
    baths: property.baths || 0,
    sqft: property.sqft || 0,
    securityDeposit: (property.securityDeposit ?? property.security_deposit ?? '').toString().replace(/[^0-9]/g, ''),
    amenities: Array.isArray(property.amenities) ? property.amenities.filter(Boolean) : [],
    houseRules: Array.isArray(property.houseRules) ? property.houseRules.filter(Boolean) : [],
    maintenance: property.maintenance || (
        (property.maintenanceResponsibilities && property.maintenanceResponsibilities.length > 0)
          ? property.maintenanceResponsibilities.reduce((acc: Record<string, string>, item: any) => {
              acc[item.area] = item.responsible_party === 'LANDLORD' ? 'Landlord' : 'Tenant';
              return acc;
            }, {})
          : {
              structural: 'Landlord',
              appliances: 'Tenant',
              utilities: 'Tenant',
              plumbing: 'Landlord',
              electrical: 'Landlord',
              hvac: 'Landlord',
              pest: 'Tenant',
              exterior: 'Landlord',
              common: 'Landlord',
              security: 'Landlord'
            }
    )
  }), [property, initialStatus]);

  // 2. Form State
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const amenitiesOptions = useMemo(
    () => uniqNormalized([...(formData.amenities || []), ...amenitiesMaster]),
    [formData.amenities]
  );

  const rulesOptions = useMemo(
    () => uniqNormalized([...(formData.houseRules || []), ...rulesMaster]),
    [formData.houseRules]
  );

  const isSelected = (selected: string[], candidate: string) => {
    const candidateKey = normalizeText(candidate);
    return selected.some((item) => normalizeText(item) === candidateKey);
  };

  const toggleSelection = (key: 'amenities' | 'houseRules', value: string) => {
    setFormData((prev: any) => {
      const list: string[] = prev[key] || [];
      const valueKey = normalizeText(value);
      const exists = list.some((item) => normalizeText(item) === valueKey);
      return {
        ...prev,
        [key]: exists
          ? list.filter((item) => normalizeText(item) !== valueKey)
          : [...list, value],
      };
    });
  };

  // 3. Logic to check if any data has changed (Dirty State)
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialState);
  }, [formData, initialState]);

  // 4. Validation Logic
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = t('myProperties.errors.nameRequired');
    if (!formData.address.trim()) newErrors.address = t('myProperties.errors.addressRequired');
    if (Number(formData.price) < 100) newErrors.price = t('myProperties.errors.priceMinimum');
    if (Number(formData.securityDeposit) < Number(formData.price)) {
      newErrors.securityDeposit = t('myProperties.errors.securityDepositTooLow', { defaultValue: 'Security deposit cannot be less than monthly rent.' });
    }
    
    setErrors(newErrors);
    return newErrors;
  };

  const handleUpdate = async () => {
    if (isLocked) {
      setSaveError(
        isPendingApproval
          ? t('myProperties.lockedPendingApproval')
          : t('myProperties.lockedRejected')
      );
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.name || validationErrors.address) setActiveTab('general');
      else if (validationErrors.price || validationErrors.securityDeposit) setActiveTab('financials');
      return;
    }

    setSaveError('');
    setLoading(true);
    try {
      const { propertyService } = await import('../../../services/property.service');

      let backendStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'AVAILABLE' | 'RENTED' | 'REJECTED' = 'DRAFT';
      if (formData.status === 'pending_approval') backendStatus = 'PENDING_APPROVAL';
      if (formData.status === 'available') backendStatus = 'AVAILABLE';
      if (formData.status === 'rented') backendStatus = 'RENTED';
      if (formData.status === 'rejected') backendStatus = 'REJECTED';

      const maintenanceResponsibilities = Object.entries(formData.maintenance || {}).map(([area, owner]) => ({
        area,
        responsible_party: String(owner).toUpperCase() === 'TENANT' ? 'TENANT' : 'LANDLORD'
      }));

      const payload = {
        title: formData.name,
        address: formData.address,
        monthly_price: Number(formData.price),
        security_deposit: Number(formData.securityDeposit),
        status: backendStatus,
        amenity_names: uniqNormalized(formData.amenities || []),
        house_rule_names: uniqNormalized(formData.houseRules || []),
        maintenance_responsibilities: maintenanceResponsibilities,
        specifications: {
          bedrooms: formData.beds,
          bathrooms: formData.baths,
          area_sqft: formData.sqft
        }
      };

      const res = await propertyService.updateProperty(property.id, payload);
      if (res.success) {
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          if (property.onUpdate) {
            property.onUpdate();
          }
          onClose();
        }, 2000);
      }
    } catch (e) {
      const fallbackMessage = t('myProperties.errors.saveFailed');
      const messageFromApi =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as any).response?.data?.message === 'string'
          ? (e as any).response.data.message
          : fallbackMessage;

      setSaveError(messageFromApi);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get localized display name for maintenance areas
  const getMaintenanceDisplayName = (key: string) => {
      return t(`myProperties.maintenanceTypes.${key}`, { defaultValue: key });
  };

  return (
    <div className="manage-modal-overlay" onClick={onClose} dir="ltr">
      <div className="manage-modal-container" onClick={(e) => e.stopPropagation()}>
        
        <div className={`success-toast ${showToast ? 'show' : ''}`}>
           <FaCheckCircle /> <span>{t('myProperties.saveSuccess')}</span>
        </div>

        <aside className="manage-modal-sidebar">
          <div className="sidebar-header">
            <div className="property-mini-avatar"><FaHome /></div>
            <div>
              <h3>{t('myProperties.unitManager')}</h3>
              <p>v2.4.0</p>
            </div>
          </div>
          
          <nav className="manage-nav">
            <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
              <FaHome /> {t('myProperties.tabs.general')} { (errors.name || errors.address) && <span className="err-dot" /> }
            </button>
            <button className={activeTab === 'financials' ? 'active' : ''} onClick={() => setActiveTab('financials')}>
              <FaDollarSign /> {t('myProperties.tabs.financials')} { errors.price && <span className="err-dot" /> }
            </button>
            <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>
              <FaClipboardList /> {t('myProperties.tabs.rules')}
            </button>
            <button className={activeTab === 'media' ? 'active' : ''} onClick={() => setActiveTab('media')}>
              <FaImages /> {t('myProperties.tabs.media')}
            </button>
            <button className={activeTab === 'maintenance' ? 'active' : ''} onClick={() => setActiveTab('maintenance')}>
              <FaWrench /> {t('myProperties.tabs.maintenance')}
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="delete-property-btn"><FaTrashAlt /> {t('myProperties.deleteListing')}</button>
          </div>
        </aside>

        <main className="manage-modal-main">
          <header className="main-header">
            <div className="header-text">
              <h2>{t(`myProperties.tabs.${activeTab}`)}</h2>
              <p>{t('myProperties.propertyId')}: <span className="id-badge">#PRP-{property.id || '9921'}</span></p>
              {isLocked && (
                <p style={{ marginTop: 8, color: '#b91c1c', fontWeight: 700 }}>
                  {isPendingApproval
                    ? t('myProperties.lockedPendingApproval')
                    : isRejected
                      ? t('myProperties.lockedRejected')
                      : 'Property is rented and cannot be edited.'}
                </p>
              )}
            </div>
            <button className="close-circle-btn" onClick={onClose}><FaTimes /></button>
          </header>

          <div className="manage-content-scroll">
            
            {/* --- GENERAL INFO TAB --- */}
            {activeTab === 'general' && (
              <div className="manage-view animate-fade-in">
                <div className="manage-card-group">
                  <div className={`manage-field ${errors.name ? 'has-error' : ''}`}>
                    <label>{t('myProperties.labels.marketingTitle')}</label>
                    <div className="m-input-with-icon">
                      <FaHome className="input-icon" />
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="m-input" 
                        disabled={isLocked}
                      />
                    </div>
                    {errors.name && <span className="error-msg">{errors.name}</span>}
                  </div>

                  <div className="manage-grid-2">
                    <div className="manage-field">
                      <label>{t('landlordHomeComponents.status')}</label>
                      <select 
                        className="m-select" 
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value === 'available' ? 'available' : 'draft',
                          })
                        }
                        disabled={isLocked}
                      >
                        <option value="draft">{t('myProperties.status.draft')}</option>
                        <option value="available">{t('myProperties.status.available')}</option>
                        {formData.status === 'rented' && <option value="rented">Rented</option>}
                        {formData.status === 'pending_approval' && <option value="pending_approval">Pending Approval</option>}
                        {formData.status === 'rejected' && <option value="rejected">Rejected</option>}
                      </select>
                    </div>
                    <div className="manage-field">
                      <label>{t('guestHome.propertyType')}</label>
                      <select className="m-select" disabled={isLocked}>
                        <option>{t('tenantHomeComponents.fullyFurnished')}</option>
                        <option>{t('tenantHomeComponents.semiFurnished')}</option>
                        <option>{t('myProperties.unfurnished')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={`manage-card-group ${errors.address ? 'has-error' : ''}`}>
                  <label className="group-label"><FaMapMarkerAlt /> {t('myProperties.labels.locationDetails')}</label>
                  <textarea 
                    className="m-textarea" 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={3}
                    disabled={isLocked}
                  />
                  {errors.address && <span className="error-msg">{errors.address}</span>}
                </div>

                <div className="manage-card-group specs-edit-row">
                   <div className="mini-spec">
                      <FaBed />
                      <input type="number" value={formData.beds} onChange={(e) => setFormData({...formData, beds: Number(e.target.value)})} disabled={isLocked} />
                   </div>
                   <div className="mini-spec">
                      <FaBath />
                      <input type="number" value={formData.baths} onChange={(e) => setFormData({...formData, baths: Number(e.target.value)})} disabled={isLocked} />
                   </div>
                   <div className="mini-spec">
                      <FaRulerCombined />
                      <input type="number" value={formData.sqft} onChange={(e) => setFormData({...formData, sqft: Number(e.target.value)})} disabled={isLocked} />
                   </div>
                </div>
              </div>
            )}

            {/* --- PRICING TAB --- */}
            {activeTab === 'financials' && (
              <div className="manage-view animate-fade-in">
                <div className="financial-card-status">
                   <FaExclamationTriangle />
                   <p>{t('myProperties.labels.realTimeUpdates')}</p>
                </div>
                
                <div className="financial-display-grid">
                  <div className={`price-input-wrapper ${errors.price ? 'has-error' : ''}`}>
                    <label>{t('myProperties.labels.monthlyRent')}</label>
                    <div className="input-row">
                      <span className="currency-symbol">$</span>
                      <input 
                        type="number" 
                        value={formData.price} 
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        disabled={isLocked}
                      />
                      <span className="period">/{t('guestHome.perMonth')}</span>
                    </div>
                    {errors.price && <span className="error-msg">{errors.price}</span>}
                  </div>
                  <div className={`price-input-wrapper ${errors.securityDeposit ? 'has-error' : ''}`}>
                    <label>{t('myProperties.labels.securityDeposit')}</label>
                    <div className="input-row">
                      <span className="currency-symbol">$</span>
                      <input 
                        type="number" 
                        value={formData.securityDeposit} 
                        onChange={(e) => setFormData({...formData, securityDeposit: e.target.value})}
                        disabled={isLocked} 
                      />
                    </div>
                    {errors.securityDeposit && <span className="error-msg">{errors.securityDeposit}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* --- RULES TAB --- */}
            {activeTab === 'rules' && (
              <div className="manage-view animate-fade-in">
                 <div className="manage-card-group">
                    <h4 className="section-subtitle">{t('myProperties.labels.coreAmenities')}</h4>
                    <div className="selection-grid">
                        {amenitiesOptions.map(perk => (
                          <label key={perk} className={`selection-card ${isLocked ? 'locked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected(formData.amenities || [], perk)}
                              onChange={() => toggleSelection('amenities', perk)}
                              disabled={isLocked}
                            />
                            <div className="indicator"></div>
                            <span>{perk}</span>
                          </label>
                        ))}
                    </div>
                 </div>

                 <div className="manage-card-group">
                    <h4 className="section-subtitle">{t('myProperties.labels.houseRules')}</h4>
                    <div className="selection-grid">
                        {rulesOptions.map(rule => (
                          <label key={rule} className={`selection-card ${isLocked ? 'locked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected(formData.houseRules || [], rule)}
                              onChange={() => toggleSelection('houseRules', rule)}
                              disabled={isLocked}
                            />
                            <div className="indicator"></div>
                            <span>{rule}</span>
                          </label>
                        ))}
                    </div>
                 </div>
              </div>
            )}

            {/* --- MEDIA TAB --- */}
            {activeTab === 'media' && (
              <div className="manage-view animate-fade-in">
                <div className="manage-card-group">
                   <div className="media-manager-header">
                      <label>{t('myProperties.labels.propertyGallery')}</label>
                      <span>{property.images?.length || 1} / 10 {t('landlordHomeComponents.photos')}</span>
                   </div>
                   <div className="media-manager-grid">
                      {property.images && property.images.length > 0 ? (
                        property.images.map((img: any, idx: number) => (
                           <div className="media-card" key={img.id || idx}>
                             <img src={img.image_url || img.imageUrl} alt="Property" />
                             {!isLocked && <div className="remove-overlay"><FaTrashAlt /></div>}
                           </div>
                        ))
                      ) : property.imageUrl ? (
                        <div className="media-card">
                           <img src={property.imageUrl} alt="Property" />
                           {!isLocked && <div className="remove-overlay"><FaTrashAlt /></div>}
                        </div>
                      ) : (
                        <div className="media-card">
                           <img src="/rentblue.jpg" alt="Property" />
                           {!isLocked && <div className="remove-overlay"><FaTrashAlt /></div>}
                        </div>
                      )}
                      {!isLocked && (
                        <div className="add-media-btn">
                          <FaImages size={24} />
                          <span>{t('myProperties.labels.uploadNew')}</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}

            {/* --- MAINTENANCE TAB (EDITABLE & SCROLLABLE) --- */}
            {activeTab === 'maintenance' && (
                <div className="manage-view animate-fade-in">
                    <div className="manage-card-group">
                        <p className="section-instruction" style={{marginBottom: '12px', fontSize: '0.9rem', color: '#64748b'}}>
                            {t('myProperties.labels.maintenanceInstruction')}
                        </p>
                        <div className="responsibility-box scrollable">
                            {Object.entries(formData.maintenance).map(([key, value]) => (
                                <div className="resp-row" key={key}>
                                    <span>{getMaintenanceDisplayName(key)}</span>
                                    <select 
                                        className="m-select compact"
                                        style={{ width: '120px', padding: '6px', fontSize: '0.85rem' }}
                                        value={value as string}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            maintenance: { ...formData.maintenance, [key]: e.target.value }
                                        })}
                                        disabled={isLocked}
                                    >
                                        <option value="Landlord">{t('tenantHomeComponents.landlord')}</option>
                                        <option value="Tenant">{t('tenantHomeComponents.tenant')}</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

          </div>

          <footer className="main-footer">
             {saveError && <p className="save-error-banner">{saveError}</p>}
             <button 
                className="m-btn-cancel" 
                onClick={() => setFormData(initialState)} 
                disabled={isLocked || !isDirty || loading}
             >
                {t('myProperties.labels.discardChanges')}
             </button>
             <button 
                className="m-btn-save" 
                onClick={handleUpdate} 
                disabled={isLocked || !isDirty || loading}
             >
                {loading ? <div className="spinner-mini"></div> : <><FaSave /> {t('myProperties.labels.saveChanges')}</>}
             </button>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default ManagePropertyModal;