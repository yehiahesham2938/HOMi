// client/src/features/BrowseProperties/components/ApplicationModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    FaTimes, FaCheckCircle, FaCalendarAlt, FaHourglassHalf, FaCommentDots,
    FaPaperPlane, FaUsers, FaUserFriends, FaUserTie, FaArrowLeft, FaPlus, FaChevronRight,
    FaExclamationTriangle
} from 'react-icons/fa';
import {
    rentalRequestService,
    type RentalDuration,
    type LivingSituation,
} from '../../../services/rental-request.service';
import { authService } from '../../../services/auth.service';
import './ApplicationModal.css';

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

interface ApplicationModalProps {
    property: {
        id: string;
        title: string;
        price: number;
        image: string;
        ownerName?: string;
        ownerImage?: string;
    };
    onClose: () => void;
    onBack: () => void;
    isReadOnly?: boolean;
    prefillData?: PrefillData;
}

const ApplicationModal = ({ property, onClose, onBack, isReadOnly = false, prefillData }: ApplicationModalProps) => {
    const [step, setStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [habitsLoading, setHabitsLoading] = useState(true);

    // Step 1 — form state (initialised from prefillData when in read-only review)
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

    // Step 2 — habits
    const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
    const [customHabit, setCustomHabit] = useState('');

    // Load user's habits from backend — runs for both read-only and editable views.
    // Uses a cancellation flag so a slow response after unmount won't setState on a dead component.
    useEffect(() => {
        let cancelled = false;
        const loadHabits = async () => {
            setHabitsLoading(true);
            try {
                const res = await authService.getUserHabits();
                if (!cancelled) setSelectedHabits(res.habit_names ?? []);
            } catch {
                // If the call fails just show an empty list — don't stay stuck on loading
                if (!cancelled) setSelectedHabits([]);
            } finally {
                if (!cancelled) setHabitsLoading(false);
            }
        };
        void loadHabits();
        return () => { cancelled = true; };
    }, []);

    // Sync prefillData into state if it arrives after mount (edge case)
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

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
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
        if (!duration || !livingSituation || !moveInDate || !occupants) return;
        setLoading(true);
        setSubmitError(null);
        try {
            await rentalRequestService.submitRentalRequest({
                property_id: property.id,
                move_in_date: moveInDate,
                duration,
                occupants: Number(occupants),
                living_situation: livingSituation,
                message: message.trim(),
            });

            // Keep profile habits sync as best-effort so request data persistence is never blocked.
            try {
                await authService.setHabits(selectedHabits);
            } catch (habitsError) {
                console.warn('Rental request saved but habit sync failed.', habitsError);
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

    const landlordName = property.ownerName || 'Property Owner';
    const landlordAvatar = property.ownerImage || null;

    const formatDate = (iso: string) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch { return iso; }
    };

    const durationLabel = formatDurationLabel(duration || undefined);
    const livSituationLabel = (livingSituationOptions.find(o => o.value === livingSituation)?.label ?? String(livingSituation)) || '—';

    // Custom habits that are saved but not in the preset list
    const customSavedHabits = selectedHabits.filter(h => !PRESET_HABITS.includes(h));

    const modalMarkup = (
        <div className="app-modal-overlay">
            <div className="app-modal-view">
                <button className="close-app-modal" onClick={onClose} aria-label="Close modal">
                    <FaTimes size={20} />
                </button>

                {!isSubmitted ? (
                    <div className="app-layout">

                        {/* ── SIDEBAR ── */}
                        <div className="app-sidebar">
                            <button className="back-to-property" onClick={step === 1 ? onBack : () => setStep(1)}>
                                <FaArrowLeft /> {step === 1 ? 'Back to Details' : 'Back to Application'}
                            </button>

                            <div className="property-mini-card">
                                <img src={property.image} alt={property.title} />
                                <div className="mini-info">
                                    <span className="badge">
                                        {isReadOnly ? 'Submitted Application' : `Application Step ${step}/2`}
                                    </span>
                                    <h4>{property.title}</h4>
                                    <p className="mini-price">${property.price.toLocaleString()}<span>/mo</span></p>
                                </div>
                            </div>



                            <div className="landlord-card">
                                <div className="landlord-header">
                                    {landlordAvatar ? (
                                        <img src={landlordAvatar} alt={landlordName} className="landlord-avatar" />
                                    ) : (
                                        <FaUserTie className="landlord-icon" />
                                    )}
                                    <div>
                                        <h5>Landlord</h5>
                                        <p>{landlordName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── MAIN AREA ── */}
                        <div className="app-form-section">
                            {step === 1 ? (
                                <>
                                    <div className="form-header">
                                        <h1>{isReadOnly ? 'Your Application' : 'Rental Application'}</h1>
                                        <p>{isReadOnly
                                            ? 'This is a read-only view of your submitted application.'
                                            : 'Provide your rental preferences to start the process.'
                                        }</p>
                                    </div>

                                    {isReadOnly ? (
                                        /* ── READ-ONLY SUMMARY ── */
                                        <div className="readonly-summary">
                                            <div className="readonly-grid">
                                                <div className="readonly-field">
                                                    <label><FaCalendarAlt /> Move-in Date</label>
                                                    <div className="readonly-value">{formatDate(moveInDate)}</div>
                                                </div>
                                                <div className="readonly-field">
                                                    <label><FaHourglassHalf /> Duration</label>
                                                    <div className="readonly-value">{durationLabel}</div>
                                                </div>
                                                <div className="readonly-field">
                                                    <label><FaUsers /> Occupants</label>
                                                    <div className="readonly-value">{occupants || '—'}</div>
                                                </div>
                                                <div className="readonly-field">
                                                    <label><FaUserFriends /> Living Situation</label>
                                                    <div className="readonly-value">{livSituationLabel}</div>
                                                </div>
                                            </div>

                                            <div className="readonly-field" style={{ marginTop: '16px' }}>
                                                <label><FaCommentDots /> Message to Landlord</label>
                                                <div className="readonly-value readonly-message">
                                                    {message
                                                        ? message
                                                        : <em style={{ color: '#94a3b8', fontWeight: 400 }}>No message provided.</em>
                                                    }
                                                </div>
                                            </div>

                                            <button className="submit-btn" style={{ marginTop: '28px' }} onClick={() => setStep(2)}>
                                                View Your Habits <FaChevronRight />
                                            </button>
                                        </div>
                                    ) : (
                                        /* ── EDITABLE FORM ── */
                                        <form onSubmit={handleNext} className="premium-form">
                                            <div className="form-row">
                                                <div className="field-group">
                                                    <label><FaCalendarAlt /> Move-in Date</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={moveInDate}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={e => setMoveInDate(e.target.value)}
                                                    />
                                                </div>
                                                <div className="field-group">
                                                    <label><FaHourglassHalf /> Duration</label>
                                                    <div className="duration-grid">
                                                        <select
                                                            required
                                                            className="premium-select"
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
                                                            className="premium-select"
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
                                                    <small className="duration-hint">Total duration: {durationLabel}</small>
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="field-group">
                                                    <label><FaUsers /> Occupants</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Number of people"
                                                        required
                                                        value={occupants}
                                                        onChange={e => setOccupants(e.target.value === '' ? '' : Number(e.target.value))}
                                                    />
                                                </div>
                                                <div className="field-group">
                                                    <label><FaUserFriends /> Living Situation</label>
                                                    <select
                                                        required
                                                        className="premium-select"
                                                        value={livingSituation}
                                                        onChange={e => setLivingSituation(e.target.value as LivingSituation)}
                                                    >
                                                        <option value="">Select situation</option>
                                                        {livingSituationOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="field-group">
                                                <label><FaCommentDots /> Message to Landlord</label>
                                                <textarea
                                                    placeholder="Introduce yourself and tell the landlord why you're a great fit..."
                                                    rows={3}
                                                    className="premium-textarea"
                                                    value={message}
                                                    onChange={e => setMessage(e.target.value)}
                                                />
                                            </div>

                                            <button type="submit" className="submit-btn">
                                                Next: Your Habits <FaChevronRight />
                                            </button>
                                        </form>
                                    )}
                                </>
                            ) : (
                                /* ── STEP 2: HABITS ── */
                                <div className="habits-selection-view">
                                    <div className="form-header">
                                        <h1>Your Habits</h1>
                                        <p>{isReadOnly
                                            ? 'Habits associated with your profile at the time of application.'
                                            : 'Let the landlord know about your lifestyle. These will also update your profile.'
                                        }</p>
                                    </div>

                                    {habitsLoading ? (
                                        <div className="habits-loading">
                                            <div className="spinner" style={{ borderTopColor: '#2563eb', margin: '0 auto 12px' }} />
                                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading habits…</p>
                                        </div>
                                    ) : (
                                        <>
                                            {isReadOnly && selectedHabits.length === 0 ? (
                                                <div className="no-habits-notice">
                                                    No habits were on your profile at the time of this application.
                                                </div>
                                            ) : (
                                                <div className="habits-grid">
                                                    {/* Preset habits — selected ones highlighted, unselected faded in read-only */}
                                                    {PRESET_HABITS.map(habit => {
                                                        const isSelected = selectedHabits.includes(habit);
                                                        return (
                                                            <div
                                                                key={habit}
                                                                className={[
                                                                    'habit-chip',
                                                                    isSelected ? 'selected' : '',
                                                                    isReadOnly ? 'readonly-chip' : '',
                                                                ].filter(Boolean).join(' ')}
                                                                onClick={() => toggleHabit(habit)}
                                                            >
                                                                {habit}
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Custom habits saved by the user but not in the preset list */}
                                                    {customSavedHabits.map(habit => (
                                                        <div
                                                            key={habit}
                                                            className={['habit-chip selected', isReadOnly ? 'readonly-chip' : ''].filter(Boolean).join(' ')}
                                                            onClick={() => toggleHabit(habit)}
                                                        >
                                                            {habit}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {!isReadOnly && (
                                                <div className="custom-habit-input">
                                                    <input
                                                        type="text"
                                                        value={customHabit}
                                                        onChange={e => setCustomHabit(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomHabit())}
                                                        placeholder="Add a custom habit…"
                                                    />
                                                    <button type="button" onClick={addCustomHabit}><FaPlus /></button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {submitError && (
                                        <div className="submit-error-banner">
                                            <FaExclamationTriangle />
                                            <span>{submitError}</span>
                                        </div>
                                    )}

                                    {!isReadOnly ? (
                                        <button
                                            onClick={handleSubmit}
                                            className={`submit-btn ${loading ? 'loading' : ''}`}
                                            disabled={loading || habitsLoading}
                                        >
                                            {loading ? <div className="spinner" /> : <><FaPaperPlane /> Submit Application</>}
                                        </button>
                                    ) : (
                                        <button onClick={onClose} className="submit-btn" style={{ marginTop: '20px' }}>
                                            Close Application View
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── SUCCESS SCREEN ── */
                    <div className="success-screen">
                        <FaCheckCircle className="check-icon-anim" />
                        <h2>Application Sent!</h2>
                        <p>Your request has been forwarded to {landlordName}. You'll be notified once they review it.</p>
                        <button className="final-btn" onClick={onClose}>Return to Properties</button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalMarkup, document.body);
};

export default ApplicationModal;