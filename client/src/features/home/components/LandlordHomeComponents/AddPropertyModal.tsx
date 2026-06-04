import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import {
  FaTimes, FaBed, FaBath, FaParking, FaImage,
  FaMapMarkerAlt, FaChevronRight, FaChevronLeft, FaCloudUploadAlt,
  FaRocket, FaCalendarAlt, FaShieldAlt, FaChair,
  FaMapMarkedAlt, FaCity, FaBuilding, FaLayerGroup,
  FaTools, FaUserTie, FaUserAlt, FaExclamationTriangle, FaHome
} from 'react-icons/fa';

// Leaflet Imports
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';

// CSS Import
import './AddPropertyModal.css';
import { propertyService } from '../../../../services/property.service';
import authService from '../../../../services/auth.service';

// Fix for Leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const EGYPT_BOUNDS = L.latLngBounds(
  L.latLng(21.9, 24.6),
  L.latLng(31.7, 36.9)
);

interface AddPropertyModalProps {
  onClose: () => void;
  onPropertyAdded?: () => void;
}

const SearchField = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  const { t } = useTranslation();
  const map = useMap();
  useEffect(() => {
    // @ts-expect-error — leaflet-control-geocoder augments L.Control at runtime
    const geocoder = L.Control.Geocoder.nominatim();
    // @ts-expect-error — geocoder control factory is not in @types/leaflet
    const control = L.Control.geocoder({
      geocoder,
      defaultMarkGeocode: false,
      placeholder: t('rentalRequests.searchPlaceholder', { defaultValue: "Search in Egypt..." }),
    })
      .on('markgeocode', (e: { geocode: { center: L.LatLng } }) => {
        const { center } = e.geocode;
        if (EGYPT_BOUNDS.contains(center)) {
          map.setView(center, 16);
          onLocationSelect(center.lat, center.lng);
        } else {
          alert(t('landlordHomeComponents.egyptOnly', { defaultValue: "Please select a location within Egypt." }));
        }
      })
      .addTo(map);
    return () => { map.removeControl(control); };
  }, [map, onLocationSelect, t]);
  return null;
};

const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 14));
  }, [center, map]);

  return null;
};

const MapEventsHandler = ({ position, onLocationSelect }: { position: { lat: number; lng: number } | null; onLocationSelect: (lat: number, lng: number) => void }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setMaxBounds(EGYPT_BOUNDS);
  }, [map]);
  useMapEvents({
    click(e) {
      if (EGYPT_BOUNDS.contains(e.latlng)) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return position === null ? null : <Marker position={[position.lat, position.lng]} />;
};

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ onClose, onPropertyAdded }) => {
  const { t } = useTranslation();
  const cachedUser = authService.getCurrentUser();

  const isCachedFullyVerified = Boolean(
    cachedUser?.user?.isVerified &&
    cachedUser?.user?.emailVerified &&
    cachedUser?.profile?.isVerificationComplete
  );

  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showVerificationWarning, setShowVerificationWarning] = useState(!isCachedFullyVerified);

  // Form States
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [furnishing, setFurnishing] = useState('Fully Furnished');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [floor, setFloor] = useState('');
  const [parking, setParking] = useState('');
  const [sqft, setSqft] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [streetName, setStreetName] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [unitApt, setUnitApt] = useState('');
  const [aboutProperty, setAboutProperty] = useState('');
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(null);
  const [isMapActive, setIsMapActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Maintenance State
  const [maintenance, setMaintenance] = useState<Record<string, 'landlord' | 'tenant'>>({
    "structural": 'landlord',
    "appliances": 'tenant',
    "utilities": 'tenant',
    "plumbing": 'landlord',
    "electrical": 'landlord',
    "hvac": 'landlord',
    "pest": 'tenant',
    "exterior": 'landlord',
    "common": 'landlord',
    "security": 'landlord',
  });

  const amenitiesList = [
    "Pet Friendly",
    "Fitness Center",
    "High-Speed Wi-Fi",
    "Air Conditioning (A/C)",
    "Keyless / Biometric Entry",
    "Private Parking",
    "24/7 Security System",
    "Smart Home System",
  ];
  const houseRules = [
    "No Smoking",
    "Pets Allowed",
    "No Parties or Events",
    "Quiet Hours (10 PM - 8 AM)",
    "No Additional Guests",
    "Respect Neighbours",
    "Children Welcome",
    "Recycling Required",
  ];
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedHouseRules, setSelectedHouseRules] = useState<string[]>([]);

  const uniqueValues = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

  useEffect(() => {
    let isMounted = true;

    const syncVerificationState = async () => {
      try {
        const latest = await authService.getProfile();
        if (!isMounted) return;

        const isFullyVerified = Boolean(
          latest.user?.isVerified &&
          latest.user?.emailVerified &&
          latest.profile?.isVerificationComplete
        );

        setShowVerificationWarning(!isFullyVerified);
      } catch {
        // Keep cached verification state if profile refresh fails.
      }
    };

    syncVerificationState();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStepValidationError = (currentStep: number): string | null => {
    if (currentStep === 1) {
      if (!title.trim()) return t('landlordHomeComponents.titleRequired', { defaultValue: 'Please enter a property title before continuing.' });

      const parsedMonthlyPrice = Number(monthlyPrice);
      const parsedSecurityDeposit = Number(securityDeposit);

      if (!monthlyPrice || Number.isNaN(parsedMonthlyPrice) || parsedMonthlyPrice <= 0) {
        return t('landlordHomeComponents.priceInvalid', { defaultValue: 'Please enter a valid monthly price greater than 0.' });
      }

      if (!securityDeposit || Number.isNaN(parsedSecurityDeposit) || parsedSecurityDeposit < 0) {
        return t('landlordHomeComponents.depositInvalid', { defaultValue: 'Please enter a valid security deposit.' });
      }

      if (parsedSecurityDeposit < parsedMonthlyPrice) {
        return t('landlordHomeComponents.depositTooLow', { defaultValue: 'Security deposit cannot be less than the monthly rent.' });
      }

      if (!availabilityDate) {
        return t('landlordHomeComponents.dateRequired', { defaultValue: 'Please select an availability date before continuing.' });
      }
    }

    if (currentStep === 2) {
      const parsedBeds = Number(beds);
      const parsedBaths = Number(baths);
      const parsedSqft = Number(sqft);

      if (!beds || Number.isNaN(parsedBeds) || parsedBeds <= 0) {
        return t('landlordHomeComponents.bedsRequired', { defaultValue: 'Please enter a valid number of bedrooms.' });
      }

      if (!baths || Number.isNaN(parsedBaths) || parsedBaths <= 0) {
        return t('landlordHomeComponents.bathsRequired', { defaultValue: 'Please enter a valid number of bathrooms.' });
      }

      if (!sqft || Number.isNaN(parsedSqft) || parsedSqft <= 0) {
        return t('landlordHomeComponents.areaRequired', { defaultValue: 'Please enter a valid property area in sqft.' });
      }

      if (uploadedImages.length === 0) {
        return t('landlordHomeComponents.photosRequired', { defaultValue: 'Please upload at least one property photo before continuing.' });
      }

      if (uploadedDocuments.length === 0) {
        return t('landlordHomeComponents.docsRequired', { defaultValue: 'Please upload at least one legal ownership document before continuing.' });
      }
    }

    if (currentStep === 3) {
      if (!position) return t('landlordHomeComponents.locationRequired', { defaultValue: 'Please choose a map location before continuing.' });
      if (!city.trim()) return t('landlordHomeComponents.cityRequired', { defaultValue: 'Please enter the city before continuing.' });
      if (!area.trim()) return t('landlordHomeComponents.areaReq', { defaultValue: 'Please enter the area/neighborhood before continuing.' });
      if (!streetName.trim()) return t('landlordHomeComponents.streetRequired', { defaultValue: 'Please enter the street name before continuing.' });
      if (!buildingNumber.trim()) return t('landlordHomeComponents.bldgRequired', { defaultValue: 'Please enter the building number before continuing.' });
      if (!unitApt.trim()) return t('landlordHomeComponents.unitRequired', { defaultValue: 'Please enter the unit/apartment before continuing.' });
    }

    return null;
  };

  const nextStep = () => {
    const validationError = getStepValidationError(step);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitError(null);
    setStep((s) => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const imagesToAdd = files.slice(0, 5 - uploadedImages.length);
    const encodedImages = await Promise.all(imagesToAdd.map(readFileAsDataUrl));

    setUploadedImages((prev) => [...prev, ...encodedImages].slice(0, 5));
    event.target.value = '';
  };

  const handleDocUploadClick = () => {
    docInputRef.current?.click();
  };

  const handleDocsSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Limit to 3 docs for simplicity
    const docsToAdd = files.slice(0, 3 - uploadedDocuments.length);
    const encodedDocs = await Promise.all(docsToAdd.map(readFileAsDataUrl));

    setUploadedDocuments((prev) => [...prev, ...encodedDocs].slice(0, 3));
    event.target.value = '';
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUploadedDocument = (index: number) => {
    setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMaintenance = (type: string, role: 'landlord' | 'tenant') => {
    setMaintenance(prev => ({ ...prev, [type]: role }));
  };

  const toggleChip = (
    value: string,
    _selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setLocationError(null);
    setPosition({ lat, lng });
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      const addr = data.address;
      setCity(addr.city || addr.state || addr.governorate || '');
      setArea(addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '');
    } catch (error) {
      console.error("Geocoding failed", error);
    }
  };

  const handleUseCurrentLocation = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError(t('landlordHomeComponents.geoNotSupported', { defaultValue: 'Geolocation is not supported by your browser.' }));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (coords) => {
        const { latitude, longitude } = coords.coords;

        if (!EGYPT_BOUNDS.contains(L.latLng(latitude, longitude))) {
          setIsLocating(false);
          setLocationError(t('landlordHomeComponents.outsideEgypt', { defaultValue: 'Current location appears to be outside Egypt. Please pin manually.' }));
          return;
        }

        await handleLocationSelect(latitude, longitude);
        setIsMapActive(true);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(t('landlordHomeComponents.geoDenied', { defaultValue: 'Location permission was denied. Please allow it and try again.' }));
          return;
        }

        setLocationError(t('landlordHomeComponents.geoFailed', { defaultValue: 'Could not get your current location. Please try again.' }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const mapPropertyType = (value: string): 'APARTMENT' | 'VILLA' | 'STUDIO' | 'CHALET' => {
    if (value === 'Villa') return 'VILLA';
    if (value === 'Student Room') return 'STUDIO';
    return 'APARTMENT';
  };

  const mapFurnishing = (value: string): 'Fully' | 'Semi' | 'Unfurnished' => {
    if (value === 'Semi-Furnished') return 'Semi';
    if (value === 'Unfurnished') return 'Unfurnished';
    return 'Fully';
  };

  const handlePublish = async () => {
    setSubmitError(null);

    if (uploadedImages.length === 0) {
      alert(t('landlordHomeComponents.photosRequired'));
      return;
    }

    if (uploadedDocuments.length === 0) {
      alert(t('landlordHomeComponents.docsRequired'));
      return;
    }

    if (!title.trim() || !aboutProperty.trim()) {
      setSubmitError(t('landlordHomeComponents.titleDescRequired', { defaultValue: 'Please provide both property title and description.' }));
      return;
    }

    if (!position || !city.trim() || !area.trim() || !streetName.trim() || !buildingNumber.trim() || !unitApt.trim()) {
      setSubmitError(t('landlordHomeComponents.locationIncomplete', { defaultValue: 'Please complete location details and pin the map location.' }));
      return;
    }

    const parsedMonthlyPrice = Number(monthlyPrice);
    const parsedSecurityDeposit = Number(securityDeposit);
    const parsedBeds = Number(beds);
    const parsedBaths = Number(baths);
    const parsedSqft = Number(sqft);
    const parsedFloor = Number(floor || 0);

    if (
      Number.isNaN(parsedMonthlyPrice) ||
      Number.isNaN(parsedSecurityDeposit) ||
      Number.isNaN(parsedBeds) ||
      Number.isNaN(parsedBaths) ||
      Number.isNaN(parsedSqft)
    ) {
      setSubmitError(t('landlordHomeComponents.numericError', { defaultValue: 'Please enter valid numeric values for price, deposit, bedrooms, bathrooms, and area.' }));
      return;
    }

    if (parsedSecurityDeposit < parsedMonthlyPrice) {
      setSubmitError(t('landlordHomeComponents.depositTooLow', { defaultValue: 'Security deposit cannot be less than the monthly rent.' }));
      return;
    }

    const imagesPayload = uploadedImages.map((image, index) => ({
      image_url: image,
      is_main: index === 0,
    }));

    setLoading(true);
    try {
      const address = `${streetName}, ${area}, ${city}, Egypt`;

      await propertyService.createProperty({
        title: title.trim(),
        description: aboutProperty.trim(),
        monthly_price: parsedMonthlyPrice,
        security_deposit: parsedSecurityDeposit,
        address,
        type: mapPropertyType(propertyType),
        furnishing: mapFurnishing(furnishing),
        target_tenant: 'ANY',
        availability_date: availabilityDate || new Date().toISOString().slice(0, 10),
        images: imagesPayload,
        ownership_documents: uploadedDocuments,
        specifications: {
          bedrooms: parsedBeds,
          bathrooms: parsedBaths,
          area_sqft: parsedSqft,
        },
        amenity_names: uniqueValues(selectedAmenities),
        house_rule_names: uniqueValues(selectedHouseRules),
        maintenance_responsibilities: Object.entries(maintenance).map(([areaName, assigned]) => ({
          area: areaName,
          responsible_party: assigned === 'landlord' ? 'LANDLORD' : 'TENANT',
        })),
        detailed_location: {
          floor: parsedFloor,
          city: city.trim(),
          area: area.trim(),
          street_name: streetName.trim(),
          building_number: buildingNumber.trim(),
          unit_apt: unitApt.trim(),
          location_lat: position.lat,
          location_long: position.lng,
        },
      });

      setLoading(false);
      setIsSuccess(true);
      triggerConfetti();
    } catch (error: unknown) {
      setLoading(false);
      const ex = error as { response?: { data?: { message?: string } } };
      setSubmitError(ex.response?.data?.message || t('myProperties.errors.saveFailed'));
    }
  };

  const loadExampleProperty = () => {
    setTitle('Modern 2BR in Downtown Cairo');
    setPropertyType('Apartment');
    setFurnishing('Fully Furnished');
    setMonthlyPrice('1500');
    setSecurityDeposit('3000');
    setAvailabilityDate('2026-04-01');
    setBeds('2');
    setBaths('2');
    setFloor('5');
    setParking('1');
    setSqft('1200');
    setCity('Cairo');
    setArea('Downtown');
    setStreetName('Tahrir Street');
    setBuildingNumber('3');
    setUnitApt('Apt 12');
    setAboutProperty('Spacious apartment with modern amenities in downtown Cairo.');
    setPosition({ lat: 30.0444, lng: 31.2357 });
  };

  const triggerConfetti = () => {
    const end = Date.now() + 3 * 1000;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#2563eb', '#10b981', '#ffffff'] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#2563eb', '#10b981', '#ffffff'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  return (
    <div className="property-modal-overlay" onClick={onClose} dir="ltr">
      <div className={`property-modal-container ${isSuccess ? 'success-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!isSuccess ? (
          <div className="modal-split-layout">
            <aside className="modal-sidebar-stepper">
              <div className="sidebar-brand">
                <FaRocket className="brand-rocket-icon" />
                <div>
                  <h3>HOMi</h3>
                  <p>{t('landlordHomeComponents.listNewProperty', { defaultValue: 'List Property' })}</p>
                </div>
              </div>

              <div className="sidebar-steps-list">
                <div className={`sidebar-step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                  <div className="step-icon-circle">
                    {step > 1 ? '✓' : <FaHome />}
                  </div>
                  <div className="step-label-group">
                    <span className="step-number-label">Step 1</span>
                    <span className="step-title-label">{t('myProperties.tabs.general')}</span>
                  </div>
                </div>

                <div className={`sidebar-step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                  <div className="step-icon-circle">
                    {step > 2 ? '✓' : <FaImage />}
                  </div>
                  <div className="step-label-group">
                    <span className="step-number-label">Step 2</span>
                    <span className="step-title-label">{t('myProperties.tabs.media')}</span>
                  </div>
                </div>

                <div className={`sidebar-step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                  <div className="step-icon-circle">
                    {step > 3 ? '✓' : <FaMapMarkedAlt />}
                  </div>
                  <div className="step-label-group">
                    <span className="step-number-label">Step 3</span>
                    <span className="step-title-label">{t('myProperties.labels.locationDetails')}</span>
                  </div>
                </div>

                <div className={`sidebar-step-item ${step === 4 ? 'active' : ''}`}>
                  <div className="step-icon-circle">
                    <FaTools />
                  </div>
                  <div className="step-label-group">
                    <span className="step-number-label">Step 4</span>
                    <span className="step-title-label">{t('myProperties.tabs.maintenance')}</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-tip-box">
                <div className="tip-header">
                  <FaShieldAlt /> <span>Pro Tip</span>
                </div>
                <p className="tip-content">
                  {step === 1 && "Competitive pricing and setting realistic security deposits attract tenants 40% faster."}
                  {step === 2 && "Bright, wide-angle photos and official property documents increase credibility and build trust."}
                  {step === 3 && "An accurate map pin helps verified tenants find and view your listing with confidence."}
                  {step === 4 && "Clearly defining utility bills and repair responsibilities minimizes landlord-tenant friction."}
                </p>
              </div>
            </aside>

            <div className="modal-main-content">
              <div className="property-modal-header">
                <div className="header-titles">
                  <h2>
                    {step === 1 && "Let's start with general details"}
                    {step === 2 && "Upload beautiful photos & verification docs"}
                    {step === 3 && "Pinpoint property location on map"}
                    {step === 4 && "Set maintenance responsibilities & rules"}
                  </h2>
                </div>
                <button className="example-fill-btn" onClick={loadExampleProperty}>
                  {t('landlordHomeComponents.loadExample', { defaultValue: 'Load Example Property' })}
                </button>
                <button className="close-btn" onClick={onClose}><FaTimes /></button>
              </div>

              {showVerificationWarning && (
                <div className="verification-warning-banner" role="alert" aria-live="polite">
                  <FaExclamationTriangle className="verification-warning-icon" aria-hidden="true" />
                  <span>{t('landlordHomeComponents.verificationRequired', { defaultValue: 'Your account must be verified before adding a property.' })}</span>
                </div>
              )}

              {submitError && (
                <div className="property-modal-error-text property-modal-error-top">
                  {submitError}
                </div>
              )}

              <div className="modal-body-content">
              {step === 1 && (
                <div className="step-view animate-fade-in">
                  <div className="field-group">
                    <label>{t('myProperties.labels.marketingTitle')}</label>
                    <div className="premium-input-wrapper">
                      <FaHome className="field-icon" />
                      <input type="text" placeholder="e.g. Modern Sunset Loft" className="premium-input with-icon" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field-group">
                      <label>{t('guestHome.propertyType')}</label>
                      <select className="premium-select" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                        <option value="Apartment">{t('guestHome.apartments')}</option>
                        <option value="Villa">{t('guestHome.villas')}</option>
                        <option value="Student Room">{t('guestHome.sharedRooms')}</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label><FaChair /> {t('guestHome.furnishing')}</label>
                      <select className="premium-select" value={furnishing} onChange={(e) => setFurnishing(e.target.value)}>
                        <option value="Fully Furnished">{t('tenantHomeComponents.fullyFurnished')}</option>
                        <option value="Semi-Furnished">{t('tenantHomeComponents.semiFurnished')}</option>
                        <option value="Unfurnished">{t('myProperties.unfurnished')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field-group">
                      <label>{t('myProperties.labels.monthlyRent')} ($)</label>
                      <div className="premium-input-wrapper">
                        <span className="field-currency">$</span>
                        <input type="number" placeholder="2400" className="premium-input with-prefix" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} />
                      </div>
                    </div>
                    <div className="field-group">
                      <label><FaShieldAlt /> {t('myProperties.labels.securityDeposit')} ($)</label>
                      <div className="premium-input-wrapper">
                        <span className="field-currency">$</span>
                        <input type="number" placeholder="1000" className="premium-input with-prefix" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="field-group">
                    <label><FaCalendarAlt /> {t('rentalRequests.labels.moveIn')}</label>
                    <div className="premium-input-wrapper">
                      <FaCalendarAlt className="field-icon" />
                      <input type="date" className="premium-input with-icon" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="step-view animate-fade-in">
                  <div className="specs-grid">
                    <div className="spec-item"><FaBed /><input type="number" placeholder={t('Bedrooms')} value={beds} onChange={(e) => setBeds(e.target.value)} /></div>
                    <div className="spec-item"><FaBath /><input type="number" placeholder={t('Bathrooms')} value={baths} onChange={(e) => setBaths(e.target.value)} /></div>
                    <div className="spec-item"><FaLayerGroup /><input type="number" placeholder={t('Floor')} value={floor} onChange={(e) => setFloor(e.target.value)} /></div>
                    <div className="spec-item"><FaParking /><input type="number" placeholder={t('Parking')} value={parking} onChange={(e) => setParking(e.target.value)} /></div>
                    <div className="spec-item"><span className="sqft-label">{t('Area (sqft)')}</span><input type="number" placeholder={t('guestHome.area')} value={sqft} onChange={(e) => setSqft(e.target.value)} /></div>
                  </div>
                  <div className="photo-upload-section">
                    <label><FaImage /> {t('myProperties.labels.propertyGallery')}</label>
                    <div className="upload-grid">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFilesSelected}
                        style={{ display: 'none' }}
                      />
                      <button type="button" className="upload-placeholder" onClick={handleUploadClick}>
                        <FaCloudUploadAlt />
                        <span>{t('myProperties.labels.uploadNew')}</span>
                      </button>
                      {uploadedImages.map((img, index) => (
                        <div key={`property-img-${index}`} className="upload-attachment-tile">
                          <div className="uploaded-photo-slot-inner">
                            <img src={img} alt={`Property ${index + 1}`} />
                          </div>
                          <button
                            type="button"
                            className="upload-attachment-remove"
                            onClick={() => removeUploadedImage(index)}
                            aria-label={`Remove property photo ${index + 1}`}
                          >
                            <FaTimes aria-hidden />
                          </button>
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 4 - uploadedImages.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="empty-photo-slot"></div>
                      ))}
                    </div>
                  </div>

                  {/* Legal Ownership Documents Upload */}
                  <div className="photo-upload-section" style={{ marginTop: '20px' }}>
                    <label><FaShieldAlt /> {t('landlordHomeComponents.ownershipDocs', { defaultValue: 'Legal Ownership Documents' })}</label>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                      {t('landlordHomeComponents.docsInstruction', { defaultValue: 'Upload files (PDFs/Images) proving your ownership. These are required for Admin verification.' })}
                    </p>
                    <div className="upload-grid">
                      <input
                        ref={docInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleDocsSelected}
                        style={{ display: 'none' }}
                      />
                      <button type="button" className="upload-placeholder" onClick={handleDocUploadClick}>
                        <FaCloudUploadAlt />
                        <span>{t('myProperties.labels.uploadNew')} Docs</span>
                      </button>
                      {uploadedDocuments.map((doc, index) => (
                        <div key={`ownership-doc-${index}`} className="upload-attachment-tile">
                          <div className="uploaded-photo-slot-inner uploaded-doc-preview">
                            <span className="uploaded-doc-preview-text">
                              {doc.startsWith('data:application/pdf') ? 'PDF' : doc.startsWith('data:image') ? 'Image' : 'File'}
                            </span>
                            <span className="uploaded-doc-preview-snippet">{doc.substring(0, 28)}…</span>
                          </div>
                          <button
                            type="button"
                            className="upload-attachment-remove"
                            onClick={() => removeUploadedDocument(index)}
                            aria-label={`Remove ownership document ${index + 1}`}
                          >
                            <FaTimes aria-hidden />
                          </button>
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 3 - uploadedDocuments.length) }).map((_, i) => (
                        <div key={`empty-doc-${i}`} className="empty-photo-slot"></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="step-view animate-fade-in">
                  <div className={`map-picker-container ${isMapActive ? 'active-map' : ''}`}>
                    {!isMapActive ? (
                      <div className="map-placeholder">
                        <FaMapMarkedAlt size={40} />
                        {position ? (
                          <div className="coord-badge">
                            {t('landlordHomeComponents.locationSet', { defaultValue: 'Location Set' })}: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                          </div>
                        ) : (
                          <p>{t('landlordHomeComponents.pinpoint', { defaultValue: 'Pinpoint the location in Egypt' })}</p>
                        )}
                        <div className="map-quick-actions">
                          <button className="map-trigger-btn" onClick={() => setIsMapActive(true)}>
                            {position ? t('landlordHomeComponents.changeLocation', { defaultValue: "Change Location" }) : t('landlordHomeComponents.openMap', { defaultValue: "Open Interactive Map" })}
                          </button>
                          <button className="current-location-btn" onClick={handleUseCurrentLocation} disabled={isLocating}>
                            {isLocating ? t('auth.loading') : t('landlordHomeComponents.useCurrentLoc', { defaultValue: 'Use Current Location' })}
                          </button>
                        </div>
                        {locationError && <p className="location-error-text">{locationError}</p>}
                      </div>
                    ) : (
                      <div className="leaflet-wrapper" style={{ height: '100%', width: '100%', position: 'relative' }}>
                        <MapContainer
                          center={position ? [position.lat, position.lng] : [26.8206, 30.8025]}
                          zoom={6}
                          maxBounds={EGYPT_BOUNDS}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <SearchField onLocationSelect={handleLocationSelect} />
                          <MapEventsHandler position={position} onLocationSelect={handleLocationSelect} />
                          {position && <MapCenterUpdater center={[position.lat, position.lng]} />}
                        </MapContainer>
                        <div className="map-action-bar">
                          <button className="current-location-btn" onClick={handleUseCurrentLocation} disabled={isLocating}>
                            {isLocating ? t('auth.loading') : t('landlordHomeComponents.useCurrentLoc', { defaultValue: 'Use Current Location' })}
                          </button>
                          <button className="confirm-map-btn" onClick={() => setIsMapActive(false)}>{t('confirmModal.confirm')}</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {locationError && isMapActive && <p className="location-error-text location-error-map">{locationError}</p>}

                  <div className="address-grid-structured">
                    <div className="field-group">
                      <label><FaCity /> {t('landlordHomeComponents.city', { defaultValue: 'City' })}</label>
                      <div className="premium-input-wrapper">
                        <FaCity className="field-icon" />
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Cairo" className="premium-input with-icon" />
                      </div>
                    </div>
                    <div className="field-group">
                      <label><FaMapMarkerAlt /> {t('guestHome.area')}</label>
                      <div className="premium-input-wrapper">
                        <FaMapMarkerAlt className="field-icon" />
                        <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Maadi" className="premium-input with-icon" />
                      </div>
                    </div>
                    <div className="field-group">
                      <label>{t('landlordHomeComponents.street', { defaultValue: 'Street Name' })}</label>
                      <div className="premium-input-wrapper">
                        <FaMapMarkerAlt className="field-icon" />
                        <input type="text" placeholder="Street 9" className="premium-input with-icon" value={streetName} onChange={(e) => setStreetName(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-row-triple">
                      <div className="field-group">
                        <label><FaBuilding /> {t('landlordHomeComponents.bldgNumber', { defaultValue: 'Bldg #' })}</label>
                        <div className="premium-input-wrapper">
                          <FaBuilding className="field-icon" />
                          <input type="text" placeholder="102" className="premium-input with-icon" value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} />
                        </div>
                      </div>
                      <div className="field-group">
                        <label>{t('landlordHome.step')}</label>
                        <div className="premium-input-wrapper">
                          <FaLayerGroup className="field-icon" />
                          <input type="text" placeholder="12" className="premium-input with-icon" value={floor} onChange={(e) => setFloor(e.target.value)} />
                        </div>
                      </div>
                      <div className="field-group">
                        <label>{t('rentalRequests.card.unit', { defaultValue: 'Unit/Apt' })}</label>
                        <div className="premium-input-wrapper">
                          <FaHome className="field-icon" />
                          <input type="text" placeholder="4B" className="premium-input with-icon" value={unitApt} onChange={(e) => setUnitApt(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="step-view animate-fade-in step-four-layout">
                  <div className="maintenance-box">
                    <div className="section-header-flex">
                      <FaTools className="header-icon" />
                      <div>
                        <label className="section-subtitle">{t('myProperties.tabs.maintenance')}</label>
                        <p className="section-desc">{t('myProperties.labels.maintenanceInstruction')}</p>
                        <p className="maintenance-legend">L = {t('tenantHomeComponents.landlord')}, T = {t('tenantHomeComponents.tenant')}</p>
                      </div>
                    </div>

                    <div className="maintenance-grid">
                      {Object.entries(maintenance).map(([type, assigned]) => (
                        <div key={type} className="maintenance-card">
                          <span className="m-title">{t(`myProperties.maintenanceTypes.${type}`)}</span>
                          <div className="m-toggle-group">
                            <button
                              className={`m-btn ${assigned === 'landlord' ? 'active landlord' : ''}`}
                              onClick={() => toggleMaintenance(type, 'landlord')}
                            >
                              <FaUserTie /> L
                            </button>
                            <button
                              className={`m-btn ${assigned === 'tenant' ? 'active tenant' : ''}`}
                              onClick={() => toggleMaintenance(type, 'tenant')}
                            >
                              <FaUserAlt /> T
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="details-box">
                    <div className="field-group">
                      <label>{t('landlordHomeComponents.aboutProperty', { defaultValue: 'About Property' })}</label>
                      <textarea
                        className="premium-textarea"
                        placeholder={t('landlordHomeComponents.aboutPlaceholder', { defaultValue: 'Describe what makes your property special...' })}
                        value={aboutProperty}
                        onChange={(e) => setAboutProperty(e.target.value)}
                      />
                    </div>

                    <div className="chips-section">
                      <label>{t('myProperties.labels.coreAmenities')}</label>
                      <div className="chips-grid">
                        {amenitiesList.map(item => (
                          <button
                            key={item}
                            className={`chip ${selectedAmenities.includes(item) ? 'active' : ''}`}
                            onClick={() => toggleChip(item, selectedAmenities, setSelectedAmenities)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="chips-section">
                      <label>{t('myProperties.labels.houseRules')}</label>
                      <div className="chips-grid">
                        {houseRules.map(item => (
                          <button
                            key={item}
                            className={`chip ${selectedHouseRules.includes(item) ? 'active' : ''}`}
                            onClick={() => toggleChip(item, selectedHouseRules, setSelectedHouseRules)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="property-modal-footer">
              {step > 1 && (
                <button className="footer-nav-btn prev" onClick={prevStep}>
                  <FaChevronLeft /> {t('common.back')}
                </button>
              )}
              {step < 4 ? (
                <button className="footer-nav-btn next" onClick={nextStep}>
                  {t('common.next')} <FaChevronRight />
                </button>
              ) : (
                <button className="publish-final-btn" onClick={handlePublish} disabled={loading}>
                  {loading ? <div className="spinner-mini"></div> : <><FaRocket /> {t('landlordHomeComponents.publishListing', { defaultValue: 'Publish Listing' })}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
          <div className="success-state animate-fade-in">
            <div className="checkmark-wrapper">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <div className="success-text-content">
              <h2>{t('landlordHomeComponents.pendingApproval', { defaultValue: 'Pending Approval' })}</h2>
              <p>{t('landlordHomeComponents.successDesc', { defaultValue: 'Your property has been submitted for review. You can track its status in your portfolio.' })}</p>
              <button
                className="final-close-btn"
                onClick={() => {
                  onPropertyAdded?.();
                  onClose();
                }}
              >
                {t('landlordHomeComponents.viewPortfolio', { defaultValue: 'View Portfolio' })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPropertyModal;