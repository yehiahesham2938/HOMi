// client/src/features/BrowseProperties/pages/ApplicationPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    FaCheckCircle, FaCalendarAlt, FaHourglassHalf, FaCommentDots,
    FaPaperPlane, FaUsers, FaUserFriends, FaUserTie, FaArrowLeft, FaPlus, FaChevronRight,
    FaExclamationTriangle
} from 'react-icons/fa';
import {
    rentalRequestService,
    type RentalDuration,
    type LivingSituation,
} from '../../../services/rental-request.service';
import { propertyService } from '../../../services/property.service';
import { authService } from '../../../services/auth.service';

import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';

import './ApplicationPage.css';

const PRESET_HABITS = [
    "Early Riser", "Night Owl", "Non-smoker", "Very Clean", "Quiet Lifestyle",
    "Social", "Fitness Enthusiast", "Work from Home", "Student", "Pet Owner",
    "Vegan", "Musician", "Minimalist", "Plant Parent", "Frequent Traveler",
    "Gamer", "Chef at Home", "Organized", "Eco-friendly", "Introverted"
];

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => index);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index);

const parseDurationMonths = (duration: string | undefined): number => {
    if (!duration) return 0;
    const match = /^(\d+)_MONTHS$/.exec(duration);
    if (!match) return 0;
    const months = Number(match[1]);
    return Number.isInteger(months) && months > 0 ? months : 0;
};

const getLocalizedHabit = (habit: string, lang: string): string => {
    if (lang !== 'ar') return habit;
    const habitsMap: Record<string, string> = {
        "Early Riser": "نشيط صباحاً",
        "Night Owl": "محب للسهر",
        "Non-smoker": "غير مدخن",
        "Very Clean": "نظيف جداً",
        "Quiet Lifestyle": "نمط حياة هادئ",
        "Social": "اجتماعي",
        "Fitness Enthusiast": "مهتم باللياقة",
        "Work from Home": "يعمل من المنزل",
        "Student": "طالب",
        "Pet Owner": "مربي حيوانات أليفة",
        "Vegan": "نباتي",
        "Musician": "موسيقي",
        "Minimalist": "بسيط",
        "Plant Parent": "محب للنباتات",
        "Frequent Traveler": "كثير السفر",
        "Gamer": "لاعب ألعاب",
        "Chef at Home": "طاهٍ في المنزل",
        "Organized": "منظم",
        "Eco-friendly": "صديق للبيئة",
        "Introverted": "انطوائي"
    };
    return habitsMap[habit] || habit;
};

export interface PrefillData {
    moveInDate: string;
    duration: RentalDuration;
    occupants: number;
    livingSituation: LivingSituation;
    message: string;
}

const ApplicationPage = () => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Mapped state
    const routingState = location.state as {
        property?: {
            id: string;
            title: string;
            price: number;
            image: string;
            ownerName?: string;
            ownerImage?: string;
        };
        prefillData?: PrefillData;
        isReadOnly?: boolean;
    };

    const isReadOnly = routingState?.isReadOnly ?? false;
    const prefillData = routingState?.prefillData;

    // Property details state (load if not passed from routing state)
    const [property, setProperty] = useState<{
        id: string;
        title: string;
        price: number;
        image: string;
        ownerName?: string;
        ownerImage?: string;
    } | null>(routingState?.property || null);
    
    const [loadingProperty, setLoadingProperty] = useState(!routingState?.property);
    const [propertyError, setPropertyError] = useState<string | null>(null);

    const [step, setStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [habitsLoading, setHabitsLoading] = useState(true);

    // Form states
    const initialDurationMonths = parseDurationMonths(prefillData?.duration);
    const [moveInDate, setMoveInDate] = useState(prefillData?.moveInDate ?? '');
    const [duration, setDuration] = useState<RentalDuration | ''>(
        initialDurationMonths > 0 ? `${initialDurationMonths}_MONTHS` : ''
    );
    const [durationYears, setDurationYears] = useState(Math.floor(initialDurationMonths / 12));
    const [durationMonths, setDurationMonths] = useState(initialDurationMonths % 12);
    const [occupants, setOccupants] = useState<number | ''>(prefillData?.occupants ?? '');
    const [livingSituation, setLivingSituation] = useState<LivingSituation | ''>(prefillData?.livingSituation ?? '');
    const [message, setMessage] = useState(prefillData?.message ?? '');

    // Lifestyle tags
    const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
    const [customHabit, setCustomHabit] = useState('');

    const formatDurationLabel = (durationVal: string | undefined): string => {
        const totalMonths = parseDurationMonths(durationVal);
        if (!totalMonths) return '—';

        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        let yearsPart = '';
        if (years > 0) {
            yearsPart = `${years} ${years === 1 ? t('browseProperties.year') : t('browseProperties.years')}`;
        }

        let monthsPart = '';
        if (months > 0) {
            monthsPart = `${months} ${months === 1 ? t('browseProperties.month') : t('browseProperties.months')}`;
        }

        if (yearsPart && monthsPart) return `${yearsPart}, ${monthsPart}`;
        return yearsPart || monthsPart;
    };

    const livingSituationOptions: { label: string; value: LivingSituation }[] = [
        { label: t('browseProperties.single'), value: 'SINGLE' },
        { label: t('browseProperties.married'), value: 'MARRIED' },
        { label: t('browseProperties.family'), value: 'FAMILY' },
        { label: t('browseProperties.students'), value: 'STUDENTS' },
    ];

    // Load property details if missing
    useEffect(() => {
        if (property || !id) return;

        const fetchProp = async () => {
            setLoadingProperty(true);
            try {
                const res = await propertyService.getPropertyById(id);
                if (res.data) {
                    const landlord = res.data.landlord;
                    const images = res.data.images || [];
                    const mainImage = images.find(img => img.isMain)?.imageUrl || images[0]?.imageUrl || '';
                    
                    setProperty({
                        id: res.data.id,
                        title: res.data.title,
                        price: res.data.monthlyPrice,
                        image: mainImage,
                        ownerName: landlord ? `${landlord.firstName} ${landlord.lastName}`.trim() : 'Owner',
                        ownerImage: landlord?.avatarUrl || undefined
                    });
                } else {
                    setPropertyError(t('browseProperties.couldNotLocateListing'));
                }
            } catch (err) {
                console.error(err);
                setPropertyError(t('browseProperties.couldNotLocateListing'));
            } finally {
                setLoadingProperty(false);
            }
        };

        void fetchProp();
    }, [id, property, t]);

    // Load habits
    useEffect(() => {
        let cancelled = false;
        const loadHabits = async () => {
            setHabitsLoading(true);
            try {
                const res = await authService.getUserHabits();
                if (!cancelled) setSelectedHabits(res.habit_names ?? []);
            } catch {
                if (!cancelled) setSelectedHabits([]);
            } finally {
                if (!cancelled) setHabitsLoading(false);
            }
        };
        void loadHabits();
        return () => { cancelled = true; };
    }, []);

    // Sync prefilled data
    useEffect(() => {
        if (!prefillData) return;
        const months = parseDurationMonths(prefillData.duration);
        setMoveInDate(prefillData.moveInDate);
        setDuration(months > 0 ? `${months}_MONTHS` : '');
        setDurationYears(Math.floor(months / 12));
        setDurationMonths(months % 12);
        setOccupants(prefillData.occupants);
        setLivingSituation(prefillData.livingSituation);
        setMessage(prefillData.message);
    }, [prefillData]);

    useEffect(() => {
        const totalMonths = durationYears * 12 + durationMonths;
        setDuration(totalMonths > 0 ? `${totalMonths}_MONTHS` : '');
    }, [durationYears, durationMonths]);

    const validateForm = (): boolean => {
        if (!moveInDate) {
            setSubmitError(t('browseProperties.validMoveInDateError'));
            return false;
        }
        if (!duration) {
            setSubmitError(t('browseProperties.selectLeaseDurationError'));
            return false;
        }
        if (!occupants || Number(occupants) <= 0) {
            setSubmitError(t('browseProperties.validOccupantsError'));
            return false;
        }
        if (!livingSituation) {
            setSubmitError(t('browseProperties.chooseLivingSituationError'));
            return false;
        }
        setSubmitError(null);
        return true;
    };

    const handleTabChange = (targetStep: number) => {
        if (targetStep === 2) {
            if (validateForm()) {
                setStep(2);
            }
        } else {
            setStep(1);
        }
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            setStep(2);
        }
    };

    const toggleHabit = (habit: string) => {
        if (isReadOnly) return;
        setSelectedHabits(prev =>
            prev.includes(habit) ? prev.filter(h => h !== habit) : [...prev, habit]
        );
    };

    const addCustomHabit = () => {
        const trimmed = customHabit.trim();
        if (trimmed && !selectedHabits.includes(trimmed)) {
            setSelectedHabits(prev => [...prev, trimmed]);
            setCustomHabit('');
        }
    };

    const handleSubmit = async () => {
        if (!id || !duration || !livingSituation || !moveInDate || !occupants) return;
        setLoading(true);
        setSubmitError(null);
        try {
            await rentalRequestService.submitRentalRequest({
                property_id: id,
                move_in_date: moveInDate,
                duration,
                occupants: Number(occupants),
                living_situation: livingSituation,
                message: message.trim(),
            });

            try {
                await authService.setHabits(selectedHabits);
            } catch (habitsError) {
                console.warn('Request saved but habit sync failed.', habitsError);
            }

            setIsSubmitted(true);
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string; error?: string } } };
            const apiMessage: string =
                ax.response?.data?.message ||
                ax.response?.data?.error ||
                t('browseProperties.bookVisitFailed');
            setSubmitError(apiMessage);
        } finally {
            setLoading(false);
        }
    };

    const landlordName = property?.ownerName || t('browseProperties.verifiedLandlord');
    const landlordAvatar = property?.ownerImage || null;

    const formatDate = (iso: string) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch { return iso; }
    };

    const durationLabel = formatDurationLabel(duration || undefined);
    const livSituationLabel = (livingSituationOptions.find(o => o.value === livingSituation)?.label ?? String(livingSituation)) || '—';

    const customSavedHabits = selectedHabits.filter(h => !PRESET_HABITS.includes(h));

    return (
        <div className="application-page-wrapper">
            <Header />
            <div className="application-page-body">
                <Sidebar />
                <div className="application-page-content-wrapper">
                    {loadingProperty ? (
                        <div className="app-card-loading">
                            <div className="spinner"></div>
                            <p>{t('browseProperties.loadingApplicationDetails')}</p>
                        </div>
                    ) : propertyError || !property ? (
                        <div className="app-card-error">
                            <FaExclamationTriangle size={36} color="#ef4444" />
                            <h3>{t('browseProperties.applicationError')}</h3>
                            <p>{propertyError}</p>
                            <button onClick={() => navigate('/browse-properties')}>{t('browseProperties.backToListings')}</button>
                        </div>
                    ) : (
                        <div className={`app-card-container ${isSubmitted ? 'success-mode' : ''}`} dir="ltr">
                            {!isSubmitted ? (
                                <div className="app-layout-split">
                                    {/* SIDEBAR PROPERTY SUMMARY */}
                                    <div className="app-summary-sidebar">
                                        <button className="back-link-btn" onClick={() => navigate(`/properties/${id}`)}>
                                            <FaArrowLeft /> {t('browseProperties.backToDetails')}
                                        </button>

                                        <div className="property-glance-card">
                                            <div className="property-glance-image-wrapper">
                                                <img src={property.image} alt={property.title} />
                                                <div className="property-image-overlay">
                                                    <span className="glance-badge">
                                                        {isReadOnly ? t('browseProperties.submitted') : t('browseProperties.stepOf', { step })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="glance-meta">
                                                <h4>{property.title}</h4>
                                                <p className="glance-rent">${property.price.toLocaleString()}<span>/{t('activeRental.monthsShort')}</span></p>
                                            </div>
                                        </div>

                                        <div className="landlord-glance-card">
                                            <div className="landlord-glance-inner">
                                                {landlordAvatar ? (
                                                    <img src={landlordAvatar} alt={landlordName} className="landlord-avatar" />
                                                ) : (
                                                    <div className="landlord-avatar-icon"><FaUserTie /></div>
                                                )}
                                                <div>
                                                    <h5>{t('browseProperties.landlord')}</h5>
                                                    <p>{landlordName}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MAIN FORM PANEL */}
                                    <div className="app-main-form-panel">
                                        {/* STEPPER PROGRESS NAVIGATION */}
                                        <div className="app-form-tabs">
                                            <div className="stepper-connector-fill" style={{ width: step === 2 ? 'calc(100% - 80px)' : '0%' }}></div>
                                            <button 
                                                className={`form-tab-btn ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
                                                onClick={() => handleTabChange(1)}
                                            >
                                                <div className="step-circle">
                                                    {step > 1 ? <FaCheckCircle size={16} /> : '1'}
                                                </div>
                                                <span className="step-label">{t('browseProperties.rentalPreferences')}</span>
                                            </button>
                                            <button 
                                                className={`form-tab-btn ${step === 2 ? 'active' : ''}`}
                                                onClick={() => handleTabChange(2)}
                                            >
                                                <div className="step-circle">2</div>
                                                <span className="step-label">{t('browseProperties.lifestyleProfile')}</span>
                                            </button>
                                        </div>

                                        {submitError && (
                                            <div className="app-error-banner">
                                                <FaExclamationTriangle />
                                                <span>{submitError}</span>
                                            </div>
                                        )}

                                        <div className="app-tab-content-box">
                                            {step === 1 ? (
                                                <div className="app-form-tab-panel animate-fade-in">
                                                    <div className="form-title-header">
                                                        <h1>{isReadOnly ? t('browseProperties.yourApplicationDetails') : t('browseProperties.rentalApplication')}</h1>
                                                        <p>{isReadOnly
                                                            ? t('browseProperties.readOnlyRecord')
                                                            : t('browseProperties.defineLeasePreferences')
                                                        }</p>
                                                    </div>

                                                    {isReadOnly ? (
                                                        /* READ ONLY VIEW */
                                                        <div className="app-readonly-grid-box">
                                                            <div className="readonly-row-fields">
                                                                <div className="readonly-field-item">
                                                                    <label><FaCalendarAlt /> {t('browseProperties.moveInDateLabel')}</label>
                                                                    <div className="value-p">{formatDate(moveInDate)}</div>
                                                                </div>
                                                                <div className="readonly-field-item">
                                                                    <label><FaHourglassHalf /> {t('browseProperties.rentDuration')}</label>
                                                                    <div className="value-p">{durationLabel}</div>
                                                                </div>
                                                                <div className="readonly-field-item">
                                                                    <label><FaUsers /> {t('browseProperties.occupantsCount')}</label>
                                                                    <div className="value-p">{occupants || '—'}</div>
                                                                </div>
                                                                <div className="readonly-field-item">
                                                                    <label><FaUserFriends /> {t('browseProperties.livingSituationLabel')}</label>
                                                                    <div className="value-p">{livSituationLabel}</div>
                                                                </div>
                                                            </div>

                                                            <div className="readonly-msg-box">
                                                                <label><FaCommentDots /> {t('browseProperties.personalMessageToLandlord')}</label>
                                                                <div className="message-content">
                                                                    {message ? message : <em>{t('browseProperties.noPersonalNote')}</em>}
                                                                </div>
                                                            </div>

                                                            <button className="app-primary-submit-btn" style={{ marginTop: '28px' }} onClick={() => setStep(2)}>
                                                                {t('browseProperties.viewLifestyleHabits')} <FaChevronRight />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        /* EDITABLE VIEW */
                                                        <form onSubmit={handleNext} className="app-interactive-form">
                                                            <div className="form-fields-row">
                                                                <div className="app-field-group">
                                                                    <label><FaCalendarAlt /> {t('browseProperties.expectedMoveInDate')}</label>
                                                                    <input
                                                                        type="date"
                                                                        required
                                                                        value={moveInDate}
                                                                        min={new Date().toISOString().split('T')[0]}
                                                                        onChange={e => setMoveInDate(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="app-field-group">
                                                                    <label><FaHourglassHalf /> {t('browseProperties.rentalLeaseDuration')}</label>
                                                                    <div className="rent-duration-split-select">
                                                                        <select
                                                                            required
                                                                            value={durationYears}
                                                                            onChange={e => setDurationYears(Number(e.target.value))}
                                                                        >
                                                                            {YEAR_OPTIONS.map((years) => (
                                                                                <option key={`years-${years}`} value={years}>
                                                                                    {years} {years === 1 ? t('browseProperties.year') : t('browseProperties.years')}
                                                                                </option>
                                                                            ))}
                                                                        </select>

                                                                        <select
                                                                            required
                                                                            value={durationMonths}
                                                                            onChange={e => setDurationMonths(Number(e.target.value))}
                                                                        >
                                                                            {MONTH_OPTIONS.map((months) => (
                                                                                <option key={`months-${months}`} value={months}>
                                                                                    {months} {months === 1 ? t('browseProperties.month') : t('browseProperties.months')}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <small className="lease-sum-hint">{t('browseProperties.calculatedDuration', { duration: durationLabel })}</small>
                                                                </div>
                                                            </div>

                                                            <div className="form-fields-row">
                                                                <div className="app-field-group">
                                                                    <label><FaUsers /> {t('browseProperties.numberOfOccupants')}</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        placeholder={t('browseProperties.totalPeopleMovingIn')}
                                                                        required
                                                                        value={occupants}
                                                                        onChange={e => setOccupants(e.target.value === '' ? '' : Number(e.target.value))}
                                                                    />
                                                                </div>
                                                                <div className="app-field-group">
                                                                    <label><FaUserFriends /> {t('browseProperties.livingSituationLabel')}</label>
                                                                    <select
                                                                        required
                                                                        className="situation-select"
                                                                        value={livingSituation}
                                                                        onChange={e => setLivingSituation(e.target.value as LivingSituation)}
                                                                    >
                                                                        <option value="">{t('browseProperties.selectLivingStructure')}</option>
                                                                        {livingSituationOptions.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="app-field-group">
                                                                <label><FaCommentDots /> {t('browseProperties.personalMessageToLandlord')}</label>
                                                                <textarea
                                                                    placeholder={t('browseProperties.messageToLandlordPlaceholder')}
                                                                    rows={4}
                                                                    value={message}
                                                                    onChange={e => setMessage(e.target.value)}
                                                                />
                                                            </div>

                                                            <button type="submit" className="app-primary-submit-btn">
                                                                {t('browseProperties.nextLifestyleProfile')} <FaChevronRight />
                                                            </button>
                                                        </form>
                                                    )}
                                                </div>
                                            ) : (
                                                /* TABS 2: HABITS selection */
                                                <div className="app-form-tab-panel animate-fade-in">
                                                    <div className="form-title-header">
                                                        <h1>{t('browseProperties.lifestyleProfileAndHabits')}</h1>
                                                        <p>{isReadOnly
                                                            ? t('browseProperties.habitsAttachedAtSubmission')
                                                            : t('browseProperties.checkStandardTags')
                                                        }</p>
                                                    </div>

                                                    {habitsLoading ? (
                                                        <div className="habits-preloader">
                                                            <div className="spinner-mini"></div>
                                                            <p>{t('browseProperties.loadingStandardLifestyle')}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="habits-section-flex-content">
                                                            {isReadOnly && selectedHabits.length === 0 ? (
                                                                <div className="empty-habits-log">
                                                                    {t('browseProperties.noCustomHabits')}
                                                                </div>
                                                            ) : (
                                                                <div className="lifestyle-chips-grid">
                                                                    {PRESET_HABITS.map(habit => {
                                                                        const isSelected = selectedHabits.includes(habit);
                                                                        return (
                                                                            <div
                                                                                key={habit}
                                                                                className={`lifestyle-habit-chip ${isSelected ? 'selected' : ''} ${isReadOnly ? 'readonly' : ''}`}
                                                                                onClick={() => toggleHabit(habit)}
                                                                            >
                                                                                {getLocalizedHabit(habit, currentLang)}
                                                                            </div>
                                                                        );
                                                                    })}

                                                                    {customSavedHabits.map(habit => (
                                                                        <div
                                                                            key={habit}
                                                                            className={`lifestyle-habit-chip selected ${isReadOnly ? 'readonly' : ''}`}
                                                                            onClick={() => toggleHabit(habit)}
                                                                        >
                                                                            {habit}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {!isReadOnly && (
                                                                <div className="custom-tags-adder-row">
                                                                    <input
                                                                        type="text"
                                                                        value={customHabit}
                                                                        onChange={e => setCustomHabit(e.target.value)}
                                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomHabit())}
                                                                        placeholder={t('browseProperties.specifyOtherLifestyle')}
                                                                    />
                                                                    <button type="button" onClick={addCustomHabit}><FaPlus /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {!isReadOnly ? (
                                                        <button
                                                            onClick={handleSubmit}
                                                            className={`app-primary-submit-btn ${loading ? 'loading' : ''}`}
                                                            disabled={loading || habitsLoading}
                                                        >
                                                            {loading ? <div className="spinner-mini"></div> : <><FaPaperPlane /> {t('browseProperties.submitRentalApplication')}</>}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => navigate(`/properties/${id}`)} className="app-primary-submit-btn">
                                                            {t('browseProperties.backToPropertyDetails')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* SUCCESS PANELS */
                                <div className="app-submit-success-state animate-fade-in">
                                    <FaCheckCircle className="tick-bounce" />
                                    <h2>{t('browseProperties.applicationSubmitted')}</h2>
                                    <p>{t('browseProperties.applicationSubmittedText', { landlordName })}</p>
                                    <div className="success-footer-actions">
                                        <button className="return-btn" onClick={() => navigate('/sent-requests')}>{t('browseProperties.viewMyApplications')}</button>
                                        <button className="return-btn outline" onClick={() => navigate('/browse-properties')}>{t('browseProperties.returnToBrowse')}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ApplicationPage;
