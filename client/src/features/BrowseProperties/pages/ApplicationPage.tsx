// client/src/features/BrowseProperties/pages/ApplicationPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

const formatDurationLabel = (duration: string | undefined): string => {
    const totalMonths = parseDurationMonths(duration);
    if (!totalMonths) return '—';

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    let yearsPart = '';
    if (years > 0) {
        yearsPart = `${years} year${years === 1 ? '' : 's'}`;
    }

    let monthsPart = '';
    if (months > 0) {
        monthsPart = `${months} month${months === 1 ? '' : 's'}`;
    }

    if (yearsPart && monthsPart) return `${yearsPart}, ${monthsPart}`;
    return yearsPart || monthsPart;
};

const livingSituationOptions: { label: string; value: LivingSituation }[] = [
    { label: 'Single', value: 'SINGLE' },
    { label: 'Married', value: 'MARRIED' },
    { label: 'Family', value: 'FAMILY' },
    { label: 'Students', value: 'STUDENTS' },
];

export interface PrefillData {
    moveInDate: string;
    duration: RentalDuration;
    occupants: number;
    livingSituation: LivingSituation;
    message: string;
}

const ApplicationPage = () => {
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
                    setPropertyError('Listing details not found.');
                }
            } catch (err) {
                console.error(err);
                setPropertyError('Failed to fetch details for this property.');
            } finally {
                setLoadingProperty(false);
            }
        };

        void fetchProp();
    }, [id, property]);

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
            setSubmitError('Please specify a valid Move-in Date.');
            return false;
        }
        if (!duration) {
            setSubmitError('Please select a lease duration.');
            return false;
        }
        if (!occupants || Number(occupants) <= 0) {
            setSubmitError('Please specify a valid number of occupants (minimum 1).');
            return false;
        }
        if (!livingSituation) {
            setSubmitError('Please choose your living situation.');
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
                'Something went wrong. Please try again.';
            setSubmitError(apiMessage);
        } finally {
            setLoading(false);
        }
    };

    const landlordName = property?.ownerName || 'Property Owner';
    const landlordAvatar = property?.ownerImage || null;

    const formatDate = (iso: string) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
                            <p>Loading application details…</p>
                        </div>
                    ) : propertyError || !property ? (
                        <div className="app-card-error">
                            <FaExclamationTriangle size={36} color="#ef4444" />
                            <h3>Application Error</h3>
                            <p>{propertyError || 'Could not locate the requested listing.'}</p>
                            <button onClick={() => navigate('/browse-properties')}>Back to listings</button>
                        </div>
                    ) : (
                        <div className={`app-card-container ${isSubmitted ? 'success-mode' : ''}`} dir="ltr">
                            {!isSubmitted ? (
                                <div className="app-layout-split">
                                    {/* SIDEBAR PROPERTY SUMMARY */}
                                    <div className="app-summary-sidebar">
                                        <button className="back-link-btn" onClick={() => navigate(`/properties/${id}`)}>
                                            <FaArrowLeft /> Back to details
                                        </button>

                                        <div className="property-glance-card">
                                            <div className="property-glance-image-wrapper">
                                                <img src={property.image} alt={property.title} />
                                                <div className="property-image-overlay">
                                                    <span className="glance-badge">
                                                        {isReadOnly ? 'Submitted' : `Step ${step} of 2`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="glance-meta">
                                                <h4>{property.title}</h4>
                                                <p className="glance-rent">${property.price.toLocaleString()}<span>/mo</span></p>
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
                                                    <h5>Landlord</h5>
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
                                                <span className="step-label">Rental Preferences</span>
                                            </button>
                                            <button 
                                                className={`form-tab-btn ${step === 2 ? 'active' : ''}`}
                                                onClick={() => handleTabChange(2)}
                                            >
                                                <div className="step-circle">2</div>
                                                <span className="step-label">Lifestyle Profile</span>
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
                                                        <h1>{isReadOnly ? 'Your Application Details' : 'Rental Application'}</h1>
                                                        <p>{isReadOnly
                                                            ? 'This is a read-only record of your sent request.'
                                                            : 'Define lease durations and occupants preferences.'
                                                        }</p>
                                                    </div>

                                                    {isReadOnly ? (
                                                        /* READ ONLY VIEW */
                                                        <div className="app-readonly-grid-box">
                                                            <div className="readonly-row-fields">
                                                                <div className="readonly-field-item">
                                                                    <label><FaCalendarAlt /> Move-in date</label>
                                                                    <div className="value-p">{formatDate(moveInDate)}</div>
                                                                </div>
                                                                <div className="readonly-field-item">
                                                                    <label><FaHourglassHalf /> Rent duration</label>
                                                                    <div className="value-p">{durationLabel}</div>
                                                                </div>
                                                                <div className="readonly-field-item">
                                                                    <label><FaUsers /> Occupants count</label>
                                                                    <div className="value-p">{occupants || '—'}</div>
                                                                </div>
                                                                <div className="readonly-field-item">
                                                                    <label><FaUserFriends /> Living situation</label>
                                                                    <div className="value-p">{livSituationLabel}</div>
                                                                </div>
                                                            </div>

                                                            <div className="readonly-msg-box">
                                                                <label><FaCommentDots /> Personal message to landlord</label>
                                                                <div className="message-content">
                                                                    {message ? message : <em>No personal note was provided.</em>}
                                                                </div>
                                                            </div>

                                                            <button className="app-primary-submit-btn" style={{ marginTop: '28px' }} onClick={() => setStep(2)}>
                                                                View Lifestyle Habits <FaChevronRight />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        /* EDITABLE VIEW */
                                                        <form onSubmit={handleNext} className="app-interactive-form">
                                                            <div className="form-fields-row">
                                                                <div className="app-field-group">
                                                                    <label><FaCalendarAlt /> Expected Move-in Date</label>
                                                                    <input
                                                                        type="date"
                                                                        required
                                                                        value={moveInDate}
                                                                        min={new Date().toISOString().split('T')[0]}
                                                                        onChange={e => setMoveInDate(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="app-field-group">
                                                                    <label><FaHourglassHalf /> Rental Lease Duration</label>
                                                                    <div className="rent-duration-split-select">
                                                                        <select
                                                                            required
                                                                            value={durationYears}
                                                                            onChange={e => setDurationYears(Number(e.target.value))}
                                                                        >
                                                                            {YEAR_OPTIONS.map((years) => (
                                                                                <option key={`years-${years}`} value={years}>
                                                                                    {years} year{years === 1 ? '' : 's'}
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
                                                                                    {months} month{months === 1 ? '' : 's'}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <small className="lease-sum-hint">Calculated duration: <strong>{durationLabel}</strong></small>
                                                                </div>
                                                            </div>

                                                            <div className="form-fields-row">
                                                                <div className="app-field-group">
                                                                    <label><FaUsers /> Number of Occupants</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        placeholder="Total people moving in"
                                                                        required
                                                                        value={occupants}
                                                                        onChange={e => setOccupants(e.target.value === '' ? '' : Number(e.target.value))}
                                                                    />
                                                                </div>
                                                                <div className="app-field-group">
                                                                    <label><FaUserFriends /> Living Situation</label>
                                                                    <select
                                                                        required
                                                                        className="situation-select"
                                                                        value={livingSituation}
                                                                        onChange={e => setLivingSituation(e.target.value as LivingSituation)}
                                                                    >
                                                                        <option value="">Select living structure</option>
                                                                        {livingSituationOptions.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="app-field-group">
                                                                <label><FaCommentDots /> Message to Landlord</label>
                                                                <textarea
                                                                    placeholder="Introduce yourself! Let the landlord know who is moving in and why you are a great fit..."
                                                                    rows={4}
                                                                    value={message}
                                                                    onChange={e => setMessage(e.target.value)}
                                                                />
                                                            </div>

                                                            <button type="submit" className="app-primary-submit-btn">
                                                                Next: Lifestyle Profile <FaChevronRight />
                                                            </button>
                                                        </form>
                                                    )}
                                                </div>
                                            ) : (
                                                /* TABS 2: HABITS selection */
                                                <div className="app-form-tab-panel animate-fade-in">
                                                    <div className="form-title-header">
                                                        <h1>Lifestyle Profile & Habits</h1>
                                                        <p>{isReadOnly
                                                            ? 'Habits attached to your profile at submission.'
                                                            : 'Check standard tags to display on your application request.'
                                                        }</p>
                                                    </div>

                                                    {habitsLoading ? (
                                                        <div className="habits-preloader">
                                                            <div className="spinner-mini"></div>
                                                            <p>Loading standard lifestyle profile…</p>
                                                        </div>
                                                    ) : (
                                                        <div className="habits-section-flex-content">
                                                            {isReadOnly && selectedHabits.length === 0 ? (
                                                                <div className="empty-habits-log">
                                                                    No custom habits were registered on your profile.
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
                                                                                {habit}
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
                                                                        placeholder="Specify other lifestyle traits (e.g. Vegetarians, Gym Goers)..."
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
                                                            {loading ? <div className="spinner-mini"></div> : <><FaPaperPlane /> Submit Rental Application</>}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => navigate(`/properties/${id}`)} className="app-primary-submit-btn">
                                                            Back to Property Details
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
                                    <h2>Application Submitted!</h2>
                                    <p>Your application is now on its way to <strong>{landlordName}</strong>. They will review your profile and specifications soon. You can follow this application status in your Sent Requests dashboard.</p>
                                    <div className="success-footer-actions">
                                        <button className="return-btn" onClick={() => navigate('/sent-requests')}>View My Applications</button>
                                        <button className="return-btn outline" onClick={() => navigate('/browse-properties')}>Return to Browse</button>
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
