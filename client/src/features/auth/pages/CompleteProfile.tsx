import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    User, IdCard, Globe,
    Home, Building2, UploadCloud, ArrowRight, ArrowLeft,
    Calendar, Clock, CheckCircle2,
    Briefcase, LogOut,
} from 'lucide-react';
import axios from 'axios';
import './CompleteProfile.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../../services/auth.service';
import type { Gender } from '../../../types/auth.types';
import NidScanner from '../../auth/components/NidScanner';

type UserRole = 'tenant' | 'landlord' | null;

interface Step1Draft {
    birthdate: string;
    gender: Gender | '';
    nationalId: string;         // always populated by scanner result
    preferredLanguage: string;
    fullNameArabic: string;     // extracted from NID OCR
}

interface TenantStep3Draft {
    employment: string;
    workplace: string;
    incomeRange: string;
    moveInDate: string;
    propertyType: string;
    duration: string;
    budgetMin: string;
    budgetMax: string;
}

interface LandlordStep3Draft {
    accountType: string;
    companyName: string;
    totalProperties: string;
    yearsExperience: string;
    businessAddress: string;
    availability: string;
}

function formatDateForInput(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = String(iso).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

const defaultStep1 = (): Step1Draft => ({
    birthdate: '',
    gender: '',
    nationalId: '',
    preferredLanguage: 'en',
    fullNameArabic: '',
});

const defaultTenantStep3 = (): TenantStep3Draft => ({
    employment: '',
    workplace: '',
    incomeRange: '',
    moveInDate: '',
    propertyType: '',
    duration: '',
    budgetMin: '',
    budgetMax: '',
});

const defaultLandlordStep3 = (): LandlordStep3Draft => ({
    accountType: '',
    companyName: '',
    totalProperties: '',
    yearsExperience: '',
    businessAddress: '',
    availability: '',
});

type CachedProfile = NonNullable<ReturnType<typeof authService.getCurrentUser>>['profile'];

function hydrateStep1FromProfile(profile: CachedProfile | null | undefined): Step1Draft {
    const d = defaultStep1();
    if (!profile) return d;
    d.birthdate = formatDateForInput(profile.birthdate);
    const rawG = (profile.gender as Gender | '') || '';
    d.gender = rawG === 'MALE' || rawG === 'FEMALE' ? rawG : '';
    d.nationalId = '';
    d.preferredLanguage = profile.preferredLanguage || 'en';
    d.fullNameArabic = (profile as { fullNameArabic?: string | null }).fullNameArabic || '';
    return d;
}

function mergeStep1Hydration(profile: CachedProfile | null | undefined, prev: Step1Draft): Step1Draft {
    const next = hydrateStep1FromProfile(profile);
    const verificationComplete = profile?.isVerificationComplete === true;
    
    if (!verificationComplete) {
        if (prev.nationalId.replace(/\D/g, '').length > 0) next.nationalId = prev.nationalId;
        if (prev.fullNameArabic) next.fullNameArabic = prev.fullNameArabic;
        if (prev.birthdate) next.birthdate = prev.birthdate;
        if (prev.gender) next.gender = prev.gender;
        if (prev.preferredLanguage) next.preferredLanguage = prev.preferredLanguage;
    }
    return next;
}

/** Age at last birthday; null if date invalid. */
function ageFromBirthdate(isoYmd: string): number | null {
    const t = isoYmd.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
    const [y, m, d] = t.split('-').map(Number);
    const birth = new Date(y, m - 1, d);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age;
}

function maxBirthdateForMinimumAge(minAge: number): string {
    const cap = new Date();
    cap.setFullYear(cap.getFullYear() - minAge);
    return cap.toISOString().slice(0, 10);
}

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const;

function parseYmdParts(isoYmd: string): { y: number; m: number; d: number } | null {
    const t = isoYmd.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
    const [y, m, d] = t.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return { y, m, d };
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

/** Calendar-valid YYYY-MM-DD; normalizes day when month/year constrain it */
function normalizeBirthIso(y: number, m: number, d: number): string | null {
    const dim = daysInMonth(y, m);
    const day = Math.min(Math.max(1, d), dim);
    const dt = new Date(y, m - 1, day);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1) return null;
    const mm = String(m).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
}

function formatBirthdateDisplayLong(isoYmd: string): string {
    const p = parseYmdParts(isoYmd);
    if (!p) return '';
    const dt = new Date(p.y, p.m - 1, p.d);
    return dt.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

type DobPart = number | '';

interface DobParts {
    d: DobPart;
    m: DobPart;
    y: DobPart;
}

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';

/** Resize and encode as JPEG data URL so profile updates stay within API limits. */
function fileToAvatarDataUrl(file: File, maxDim = 720, quality = 0.82): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const blobUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                const scale = maxDim / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not process image.'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error('Could not read image.'));
        };
        img.src = blobUrl;
    });
}

function tenantPrefsFromProfile(profile: CachedProfile | null | undefined): Partial<TenantStep3Draft> {
    const out: Partial<TenantStep3Draft> = {};
    if (!profile) return out;
    const raw = profile.tenantRentalPreferences;
    if (raw && typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        const s = (v: unknown) => (typeof v === 'string' ? v : '');
        out.employment = s(o.employment);
        out.workplace = s(o.workplace);
        out.incomeRange = s(o.incomeRange);
        out.moveInDate = s(o.moveInDate);
        out.propertyType = s(o.propertyType);
        out.duration = s(o.duration);
    }
    if (profile.preferredBudgetMin != null) out.budgetMin = String(profile.preferredBudgetMin);
    if (profile.preferredBudgetMax != null) out.budgetMax = String(profile.preferredBudgetMax);
    return out;
}

function landlordBizFromProfile(profile: CachedProfile | null | undefined): Partial<LandlordStep3Draft> {
    const out: Partial<LandlordStep3Draft> = {};
    if (!profile) return out;
    const raw = profile.landlordBusinessProfile;
    if (raw && typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        const s = (v: unknown) => (typeof v === 'string' ? v : '');
        const n = (v: unknown) => (typeof v === 'number' ? String(v) : typeof v === 'string' ? v : '');
        out.accountType = s(o.accountType);
        out.companyName = s(o.companyName);
        out.totalProperties = n(o.totalProperties);
        out.yearsExperience = n(o.yearsExperience);
        out.availability = s(o.availability);
    }
    if (profile.bio) out.businessAddress = profile.bio;
    return out;
}

function validateTenantStep3(t: TenantStep3Draft): string | null {
    if (!t.employment.trim()) return 'Please select employment.';
    if (!t.workplace.trim()) return 'Please enter workplace or university.';
    if (!t.incomeRange.trim()) return 'Please select income range.';
    if (!t.moveInDate.trim()) return 'Please choose a move-in date.';
    if (!t.propertyType.trim()) return 'Please select property type.';
    if (!t.duration.trim()) return 'Please select duration.';
    if (!t.budgetMin.trim() || !t.budgetMax.trim()) return 'Please enter minimum and maximum budget.';
    const min = Number(t.budgetMin);
    const max = Number(t.budgetMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
        return 'Budget values must be valid numbers greater than zero.';
    }
    if (min > max) return 'Minimum budget cannot be greater than maximum budget.';
    return null;
}

function validateLandlordStep3(t: LandlordStep3Draft): string | null {
    if (!t.accountType.trim()) return 'Please select account type.';
    if (!t.companyName.trim()) return 'Please enter company or legal name.';
    if (!t.totalProperties.trim()) return 'Please enter total properties.';
    const tp = Number(t.totalProperties);
    if (!Number.isFinite(tp) || tp < 0) return 'Total properties must be a valid number (0 or more).';
    if (!t.yearsExperience.trim()) return 'Please enter years of experience.';
    const ye = Number(t.yearsExperience);
    if (!Number.isFinite(ye) || ye < 0) return 'Years of experience must be a valid number (0 or more).';
    if (!t.businessAddress.trim()) return 'Please enter business address.';
    if (!t.availability.trim()) return 'Please enter availability.';
    return null;
}

const CompleteProfile: React.FC = () => {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // NID Scanner mid-step state
    const [showNidScanner, setShowNidScanner] = useState(false);
    // Pending data that will be submitted AFTER scanner succeeds
    const pendingSubmitRef = useRef<{ nationalId: string; fullNameArabic: string } | null>(null);

    const [step1, setStep1] = useState<Step1Draft>(defaultStep1);
    const [tenantStep3, setTenantStep3] = useState<TenantStep3Draft>(defaultTenantStep3);
    const [landlordStep3, setLandlordStep3] = useState<LandlordStep3Draft>(defaultLandlordStep3);

    const [avatarUploading, setAvatarUploading] = useState(false);
    const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | null>(
        () => authService.getCurrentUser()?.profile?.avatarUrl ?? null
    );

    const navigate = useNavigate();
    const location = useLocation();

    const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const [settingsOnlyFlow, setSettingsOnlyFlow] = useState(false);

    const maxBirthdateFor18Plus = useMemo(() => maxBirthdateForMinimumAge(18), []);

    const latestAllowedBirth = useMemo(
        () => parseYmdParts(maxBirthdateFor18Plus),
        [maxBirthdateFor18Plus]
    );

    const minBirthYear = useMemo(() => new Date().getFullYear() - 120, []);

    const birthYearOptions = useMemo(() => {
        if (!latestAllowedBirth) return [] as number[];
        const years: number[] = [];
        for (let y = latestAllowedBirth.y; y >= minBirthYear; y--) {
            years.push(y);
        }
        return years;
    }, [latestAllowedBirth, minBirthYear]);

    const [dobParts, setDobParts] = useState<DobParts>({ d: '', m: '', y: '' });

    /** Keep dropdowns in sync when step1 is hydrated from the server (not while user is editing partial selection). */
    useEffect(() => {
        const p = parseYmdParts(step1.birthdate);
        if (p) {
            setDobParts({ d: p.d, m: p.m, y: p.y });
        }
    }, [step1.birthdate]);

    const monthOptionsForYear = useMemo(() => {
        return MONTH_NAMES.map((name, i) => ({ value: i + 1, name }));
    }, []);

    const monthSelectOptions = useMemo(() => {
        if (!latestAllowedBirth || dobParts.y === '') return monthOptionsForYear;
        const y = Number(dobParts.y);
        if (y < latestAllowedBirth.y) return monthOptionsForYear;
        if (y > latestAllowedBirth.y) return monthOptionsForYear;
        return monthOptionsForYear.filter((m) => m.value <= latestAllowedBirth.m);
    }, [dobParts.y, latestAllowedBirth, monthOptionsForYear]);

    const daySelectOptions = useMemo(() => {
        if (dobParts.y === '' || dobParts.m === '') {
            return Array.from({ length: 31 }, (_, i) => i + 1);
        }
        const y = Number(dobParts.y);
        const m = Number(dobParts.m);
        let max = daysInMonth(y, m);
        if (latestAllowedBirth && y === latestAllowedBirth.y && m === latestAllowedBirth.m) {
            max = Math.min(max, latestAllowedBirth.d);
        }
        return Array.from({ length: max }, (_, i) => i + 1);
    }, [dobParts.y, dobParts.m, latestAllowedBirth]);

    const applyDobChange = useCallback(
        (patch: Partial<DobParts>) => {
            setDobParts((prev) => {
                const next: DobParts = {
                    d: patch.d !== undefined ? patch.d : prev.d,
                    m: patch.m !== undefined ? patch.m : prev.m,
                    y: patch.y !== undefined ? patch.y : prev.y,
                };

                if (next.d === '' || next.m === '' || next.y === '') {
                    setStep1((s) => ({ ...s, birthdate: '' }));
                    return next;
                }

                const y = Number(next.y);
                const m = Number(next.m);
                const d = Number(next.d);
                let iso = normalizeBirthIso(y, m, d);
                if (!iso) {
                    setStep1((s) => ({ ...s, birthdate: '' }));
                    return next;
                }
                if (iso > maxBirthdateFor18Plus) {
                    iso = maxBirthdateFor18Plus;
                }
                const normalized = parseYmdParts(iso);
                if (!normalized) {
                    setStep1((s) => ({ ...s, birthdate: '' }));
                    return next;
                }
                setStep1((s) => ({ ...s, birthdate: iso }));
                return { d: normalized.d, m: normalized.m, y: normalized.y };
            });
        },
        [maxBirthdateFor18Plus]
    );

    /** If the selected year/month no longer allows the current month (18+ cap), clamp. */
    useEffect(() => {
        if (dobParts.y === '' || dobParts.m === '' || !latestAllowedBirth) return;
        const y = Number(dobParts.y);
        const m = Number(dobParts.m);
        if (y === latestAllowedBirth.y && m > latestAllowedBirth.m) {
            applyDobChange({ m: latestAllowedBirth.m });
        }
    }, [dobParts.y, dobParts.m, latestAllowedBirth, applyDobChange]);

    /** If the selected day is invalid for the month/year (e.g. 31 → February), clamp. */
    useEffect(() => {
        if (dobParts.y === '' || dobParts.m === '' || dobParts.d === '' || !latestAllowedBirth) return;
        const y = Number(dobParts.y);
        const mo = Number(dobParts.m);
        const d = Number(dobParts.d);
        let max = daysInMonth(y, mo);
        if (y === latestAllowedBirth.y && mo === latestAllowedBirth.m) {
            max = Math.min(max, latestAllowedBirth.d);
        }
        if (d > max) {
            applyDobChange({ d: max });
        }
    }, [dobParts.y, dobParts.m, dobParts.d, latestAllowedBirth, applyDobChange]);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const locState = location.state as {
                step?: number;
                role?: string;
                fromSettings?: boolean;
                initialStep?: number;
            } | null;

            const isAuthed = authService.isAuthenticated();
            if (isAuthed) {
                try {
                    await authService.getProfile();
                } catch {
                    /* ignore */
                }
            }

            if (cancelled) return;

            const cached = authService.getCurrentUser();
            const profile = cached?.profile;
            const emailVerified = cached?.user?.emailVerified ?? false;

            if (
                isAuthed &&
                cached &&
                !locState?.fromSettings &&
                !locState?.step &&
                !locState?.initialStep
            ) {
                const step2Done = profile?.onboardingStep2Completed === true;
                const onboardingDone =
                    profile?.onboardingStep3Completed === true || profile?.onboardingStep3Skipped === true;
                if (profile?.isVerificationComplete && step2Done && onboardingDone) {
                    navigate('/', {
                        state: { next: authService.resolvePostAuthRoute(), force: true },
                        replace: true,
                    });
                    setHydrated(true);
                    return;
                }
            }

            if (
                locState?.fromSettings &&
                locState?.initialStep === 1 &&
                isAuthed &&
                cached &&
                profile?.isVerificationComplete
            ) {
                setSettingsOnlyFlow(true);
                setStep(1);
                setRole(cached.user.role === 'LANDLORD' ? 'landlord' : 'tenant');
                setAlreadyLoggedIn(true);
                setStep1((prev) => mergeStep1Hydration(profile, prev));
                setHydrated(true);
                return;
            }

            if (locState?.step === 3) {
                setSettingsOnlyFlow(!!locState.fromSettings);
                setStep(3);
                const r = (locState.role || cached?.user?.role || 'TENANT').toString().toUpperCase();
                setRole(r === 'LANDLORD' ? 'landlord' : 'tenant');
                if (cached) {
                    setAlreadyLoggedIn(true);
                    setStep1((prev) => mergeStep1Hydration(cached.profile, prev));
                    if (r === 'TENANT') {
                        setTenantStep3({
                            ...defaultTenantStep3(),
                            ...tenantPrefsFromProfile(cached.profile),
                        });
                    } else {
                        setLandlordStep3({
                            ...defaultLandlordStep3(),
                            ...landlordBizFromProfile(cached.profile),
                        });
                    }
                }
                setHydrated(true);
                return;
            }

            if (cached) {
                setAlreadyLoggedIn(true);

                const hasAppRole = cached.user.role === 'LANDLORD' || cached.user.role === 'TENANT';
                const idDone = !!cached.profile?.isVerificationComplete;

                if (locState?.fromSettings && idDone && hasAppRole) {
                    setSettingsOnlyFlow(true);
                    setStep(3);
                    setRole(cached.user.role === 'LANDLORD' ? 'landlord' : 'tenant');
                    setStep1((prev) => mergeStep1Hydration(cached.profile, prev));
                    if (cached.user.role === 'TENANT') {
                        setTenantStep3({
                            ...defaultTenantStep3(),
                            ...tenantPrefsFromProfile(cached.profile),
                        });
                    } else {
                        setLandlordStep3({
                            ...defaultLandlordStep3(),
                            ...landlordBizFromProfile(cached.profile),
                        });
                    }
                    setHydrated(true);
                    return;
                }

                setSettingsOnlyFlow(false);

                if (!idDone) {
                    setStep(1);
                    setStep1((prev) => mergeStep1Hydration(cached.profile, prev));
                } else if (
                    localStorage.getItem('authProvider') === 'email' &&
                    !emailVerified
                ) {
                    navigate('/verify-email', {
                        replace: true,
                        state: {
                            email: cached.user.email,
                            returnUrl: '/complete-profile',
                            role: cached.user.role === 'LANDLORD' ? 'landlord' : 'tenant',
                        },
                    });
                    setHydrated(true);
                    return;
                } else if (hasAppRole && cached.profile?.onboardingStep2Completed !== true) {
                    setStep(2);
                    setRole(cached.user.role === 'LANDLORD' ? 'landlord' : 'tenant');
                    setStep1((prev) => mergeStep1Hydration(cached.profile, prev));
                } else if (
                    hasAppRole &&
                    !cached.profile?.onboardingStep3Completed &&
                    !cached.profile?.onboardingStep3Skipped
                ) {
                    setStep(3);
                    setRole(cached.user.role === 'LANDLORD' ? 'landlord' : 'tenant');
                    setStep1((prev) => mergeStep1Hydration(cached.profile, prev));
                    if (cached.user.role === 'TENANT') {
                        setTenantStep3({
                            ...defaultTenantStep3(),
                            ...tenantPrefsFromProfile(cached.profile),
                        });
                    } else {
                        setLandlordStep3({
                            ...defaultLandlordStep3(),
                            ...landlordBizFromProfile(cached.profile),
                        });
                    }
                } else if (!hasAppRole) {
                    setStep(2);
                    setStep1((prev) => mergeStep1Hydration(cached.profile, prev));
                } else {
                    navigate('/', {
                        state: { next: authService.resolvePostAuthRoute(), force: true },
                        replace: true,
                    });
                    setHydrated(true);
                    return;
                }

                setHydrated(true);
                return;
            }

            navigate('/auth');
            setHydrated(true);
        })();

        return () => {
            cancelled = true;
        };
    }, [navigate, location.state]);

    useEffect(() => {
        if (!hydrated) return;
        setHeaderAvatarUrl(authService.getCurrentUser()?.profile?.avatarUrl ?? null);
    }, [hydrated]);

    useEffect(() => {
        if (step !== 2 || role !== null) return;
        const r = authService.getCurrentUser()?.user?.role;
        if (r === 'LANDLORD') setRole('landlord');
        else if (r === 'TENANT') setRole('tenant');
    }, [step, role]);

    /**
     * When `nationalIdOptional` is true, skip national ID checks (field locked after role step or settings).
     */
    const validateStep1 = (draft: Step1Draft, nationalIdOptional: boolean): string | null => {
        if (!draft.birthdate.trim()) return 'Please enter your date of birth.';
        const age = ageFromBirthdate(draft.birthdate);
        if (age === null) return 'Please enter a valid date of birth.';
        if (age < 18) return 'You must be at least 18 years old to use HOMi.';
        if (draft.gender !== 'MALE' && draft.gender !== 'FEMALE') return 'Please select Male or Female.';
        if (!nationalIdOptional) {
            const digits = draft.nationalId.replace(/\D/g, '');
            if (!digits) return 'Please scan your National ID using the camera to proceed.';
            if (!/^\d{14}$/.test(digits)) return 'National ID must be exactly 14 digits. Please rescan your ID.';
        }
        return null;
    };

    const goNextFromStep1 = async () => {
        const cached = authService.getCurrentUser();
        const verificationComplete = !!cached?.profile?.isVerificationComplete;
        const nationalIdLocked = !!settingsOnlyFlow && verificationComplete;
        const msg = validateStep1(step1, nationalIdLocked);
        if (msg) {
            setError(msg);
            return;
        }
        setError(null);

        // If NID not yet scanned (and not locked), show the camera scanner mid-step
        if (!nationalIdLocked && !step1.nationalId) {
            setShowNidScanner(true);
            return;
        }

        if (settingsOnlyFlow) {
            setLoading(true);
            try {
                if (alreadyLoggedIn && cached?.user) {
                    if (localStorage.getItem('authProvider') === 'email' && !cached.user.emailVerified) {
                        setError('Please verify your email before saving identity.');
                        return;
                    }
                    if (!verificationComplete) {
                        await authService.completeVerification({
                            nationalId: step1.nationalId.replace(/\D/g, ''),
                            gender: step1.gender as Gender,
                            birthdate: step1.birthdate,
                            preferredLanguage: step1.preferredLanguage,
                        });
                        // Save arabic name if we have one
                        if (step1.fullNameArabic) {
                            await authService.updateProfile({ fullNameArabic: step1.fullNameArabic });
                        }
                    } else if (step1.preferredLanguage) {
                        await authService.updateProfile({
                            preferredLanguage: step1.preferredLanguage,
                        });
                    }
                    await authService.getProfile();
                    setHeaderAvatarUrl(authService.getCurrentUser()?.profile?.avatarUrl ?? null);
                }
                navigate('/settings');
            } catch (err) {
                let errorMessage = 'Could not save identity. Please try again.';
                if (axios.isAxiosError(err) && err.response?.data) {
                    const data = err.response.data as { message?: string };
                    if (data.message) errorMessage = data.message;
                }
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
            return;
        }

        if (alreadyLoggedIn && cached?.user) {
            if (localStorage.getItem('authProvider') === 'email' && !cached.user.emailVerified) {
                setError('Please verify your email before saving identity.');
                return;
            }
            if (!cached.profile?.onboardingStep2Completed) {
                setLoading(true);
                try {
                    await authService.completeVerification({
                        nationalId: step1.nationalId.replace(/\D/g, ''),
                        gender: step1.gender as Gender,
                        birthdate: step1.birthdate,
                        preferredLanguage: step1.preferredLanguage,
                    });
                    // Save arabic name if we have one
                    if (step1.fullNameArabic) {
                        await authService.updateProfile({ fullNameArabic: step1.fullNameArabic });
                    }
                    await authService.getProfile();
                    setHeaderAvatarUrl(authService.getCurrentUser()?.profile?.avatarUrl ?? null);
                } catch (err) {
                    let errorMessage = 'Could not save identity. Please try again.';
                    if (axios.isAxiosError(err) && err.response?.data) {
                        const data = err.response.data as { message?: string; code?: string };
                        if (data.message) errorMessage = data.message;
                    }
                    setError(errorMessage);
                    setLoading(false);
                    return;
                } finally {
                    setLoading(false);
                }
            }
        }

        setStep(2);
    };

    const handleRoleSelection = async () => {
        if (!role) {
            setError('Please select a role');
            return;
        }

        if (!alreadyLoggedIn) {
            setError('Please sign in to continue.');
            navigate('/auth', { replace: true });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await authService.updateRole({ role: role.toUpperCase() });
            await authService.getProfile();
            const u = authService.getCurrentUser();
            const userEmail = u?.user?.email;

            if (localStorage.getItem('authProvider') === 'email' && !u?.user.emailVerified) {
                navigate('/verify-email', {
                    replace: true,
                    state: {
                        email: userEmail,
                        returnUrl: '/complete-profile',
                        step: 3,
                        role,
                    },
                });
                return;
            }

            const p = u?.profile;
            if (p?.onboardingStep3Completed || p?.onboardingStep3Skipped) {
                navigate('/', {
                    state: { next: authService.resolvePostAuthRoute(), force: true },
                    replace: true,
                });
                return;
            }

            navigate('/complete-profile', {
                replace: true,
                state: {
                    step: 3,
                    role: role as 'tenant' | 'landlord',
                    ...(settingsOnlyFlow ? { fromSettings: true } : {}),
                },
            });
        } catch (err) {
            console.error('❌ Role update failed:', err);
            let errorMessage = 'Could not save your role. Please try again.';
            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data as { message?: string; errors?: { message: string }[] };
                if (Array.isArray(data.errors) && data.errors.length > 0) {
                    errorMessage = data.errors[0].message;
                } else if (data.message) {
                    errorMessage = data.message;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        setError(null);
        if (settingsOnlyFlow) {
            navigate('/settings');
            return;
        }
        if (step > 1) setStep((s) => s - 1);
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please choose a JPG, PNG, or WebP image.');
            return;
        }
        setAvatarUploading(true);
        setError(null);
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            await authService.updateProfile({ avatarUrl: dataUrl });
            await authService.getProfile();
            setHeaderAvatarUrl(authService.getCurrentUser()?.profile?.avatarUrl ?? null);
        } catch (err) {
            let msg = 'Could not upload photo. Try a smaller image.';
            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data as { message?: string };
                if (data.message) msg = data.message;
            }
            setError(msg);
        } finally {
            setAvatarUploading(false);
        }
    };

    /** Step bar: go back to a previous step (forward only via form buttons). */
    const handleStepSegmentClick = (num: 1 | 2 | 3) => {
        setError(null);
        if (num >= step || settingsOnlyFlow) return;
        setStep(num);
    };

    const handleStep3Skip = async () => {
        setLoading(true);
        setError(null);
        try {
            await authService.skipOnboardingStep3();
            navigate('/', { state: { next: authService.resolvePostAuthRoute(), force: true }, replace: true });
        } catch (err) {
            console.error('Skip failed:', err);
            const msg =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? (err.response.data as { message: string }).message
                    : 'Could not save your profile. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        navigate('/auth', { replace: true });
    };


    const submitTenantProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const v = validateTenantStep3(tenantStep3);
            if (v) {
                setError(v);
                return;
            }

            const cached = authService.getCurrentUser();
            if (!cached) {
                setError('Session expired. Please sign in again.');
                return;
            }

            if (!cached.profile.isVerificationComplete) {
                const msg = validateStep1(step1, false);
                if (msg) {
                    setError(msg);
                    return;
                }
                await authService.completeVerification({
                    nationalId: step1.nationalId.replace(/\D/g, ''),
                    gender: step1.gender as Gender,
                    birthdate: step1.birthdate,
                    preferredLanguage: step1.preferredLanguage,
                });
            }

            const min = Number(tenantStep3.budgetMin);
            const max = Number(tenantStep3.budgetMax);
            await authService.updateProfile({
                preferredBudgetMin: min,
                preferredBudgetMax: max,
                preferredLanguage: step1.preferredLanguage || null,
                tenantRentalPreferences: {
                    employment: tenantStep3.employment.trim(),
                    workplace: tenantStep3.workplace.trim(),
                    incomeRange: tenantStep3.incomeRange.trim(),
                    moveInDate: tenantStep3.moveInDate.trim(),
                    propertyType: tenantStep3.propertyType.trim(),
                    duration: tenantStep3.duration.trim(),
                },
                onboardingStep3Complete: true,
            });

            await authService.getProfile();

            navigate('/', { state: { next: authService.resolvePostAuthRoute(), force: true }, replace: true });
        } catch (err) {
            console.error(err);
            let errorMessage = 'Could not save your profile. Please try again.';
            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data as { message?: string; code?: string };
                if (data.code === 'ALREADY_VERIFIED' || data.code === 'EMAIL_NOT_VERIFIED') {
                    errorMessage = data.message || errorMessage;
                } else if (data.message) errorMessage = data.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const submitLandlordProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const v = validateLandlordStep3(landlordStep3);
            if (v) {
                setError(v);
                return;
            }

            const cached = authService.getCurrentUser();
            if (!cached) {
                setError('Session expired. Please sign in again.');
                return;
            }

            if (!cached.profile.isVerificationComplete) {
                const msg = validateStep1(step1, false);
                if (msg) {
                    setError(msg);
                    return;
                }
                await authService.completeVerification({
                    nationalId: step1.nationalId.replace(/\D/g, ''),
                    gender: step1.gender as Gender,
                    birthdate: step1.birthdate,
                    preferredLanguage: step1.preferredLanguage,
                });
            }

            const businessBio = landlordStep3.businessAddress.trim();
            const tp = Number(landlordStep3.totalProperties);
            const ye = Number(landlordStep3.yearsExperience);
            await authService.updateProfile({
                bio: businessBio,
                preferredLanguage: step1.preferredLanguage || null,
                landlordBusinessProfile: {
                    accountType: landlordStep3.accountType.trim(),
                    companyName: landlordStep3.companyName.trim(),
                    totalProperties: tp,
                    yearsExperience: ye,
                    availability: landlordStep3.availability.trim(),
                },
                onboardingStep3Complete: true,
            });

            await authService.getProfile();

            navigate('/', { state: { next: authService.resolvePostAuthRoute(), force: true }, replace: true });
        } catch (err) {
            console.error(err);
            let errorMessage = 'Could not save your profile. Please try again.';
            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data as { message?: string };
                if (data.message) errorMessage = data.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const stepIndicator = useCallback(
        (num: number) => {
            if (!settingsOnlyFlow) {
                const completed = step > num;
                const active = step === num;
                return { completed, active };
            }
            if (step === 1) {
                if (num === 1) return { completed: false, active: true };
                if (num === 2) return { completed: false, active: false };
                return { completed: false, active: false };
            }
            if (num === 1) return { completed: true, active: false };
            if (num === 2) return { completed: step === 3, active: step === 2 };
            return { completed: false, active: step === 3 };
        },
        [settingsOnlyFlow, step]
    );

    if (!hydrated) {
        return (
            <div className="onboarding-viewport">
                <div className="onboarding-card" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ color: '#94a3b8' }}>Loading…</p>
                </div>
            </div>
        );
    }

    const req = <span style={{ color: '#dc2626' }}>*</span>;

    const cpProfile = authService.getCurrentUser()?.profile;
    const nationalIdFieldLocked = !!settingsOnlyFlow && cpProfile?.isVerificationComplete === true;
    const nidAlreadyScanned = !!step1.nationalId && /^\d{14}$/.test(step1.nationalId);

    const stepLabels: Array<{ num: 1 | 2 | 3; title: string; subtitle: string }> = [
        { num: 1, title: 'Identity', subtitle: 'Basics' },
        { num: 2, title: 'Journey', subtitle: 'Role' },
        { num: 3, title: 'Profile', subtitle: 'Details' },
    ];

    return (
        <>
        {/* NID Scanner mid-step overlay */}
        {showNidScanner && (
            <NidScanner
                onSuccess={(nationalId, fullNameArabic) => {
                    setShowNidScanner(false);
                    setStep1((s) => ({ ...s, nationalId, fullNameArabic }));
                    // Immediately proceed with submission after scanner closes
                    setError(null);
                    // Small delay so state settles before calling goNextFromStep1
                    setTimeout(() => {
                        void (async () => {
                            const cached = authService.getCurrentUser();
                            const verificationComplete = !!cached?.profile?.isVerificationComplete;
                            const nationalIdLocked = !!settingsOnlyFlow && verificationComplete;

                            if (settingsOnlyFlow) {
                                setLoading(true);
                                try {
                                    if (alreadyLoggedIn && cached?.user) {
                                        if (!verificationComplete) {
                                            await authService.completeVerification({
                                                nationalId,
                                                gender: step1.gender as Gender,
                                                birthdate: step1.birthdate,
                                                preferredLanguage: step1.preferredLanguage,
                                            });
                                            if (fullNameArabic) {
                                                await authService.updateProfile({ fullNameArabic });
                                            }
                                        } else if (step1.preferredLanguage) {
                                            await authService.updateProfile({ preferredLanguage: step1.preferredLanguage });
                                        }
                                        await authService.getProfile();
                                        setHeaderAvatarUrl(authService.getCurrentUser()?.profile?.avatarUrl ?? null);
                                    }
                                    navigate('/settings');
                                } catch (err) {
                                    let errorMessage = 'Could not save identity. Please try again.';
                                    if (axios.isAxiosError(err) && err.response?.data) {
                                        const data = err.response.data as { message?: string };
                                        if (data.message) errorMessage = data.message;
                                    }
                                    setError(errorMessage);
                                } finally {
                                    setLoading(false);
                                }
                                return;
                            }

                            if (alreadyLoggedIn && cached?.user) {
                                if (!cached.profile?.onboardingStep2Completed) {
                                    setLoading(true);
                                    try {
                                        await authService.completeVerification({
                                            nationalId,
                                            gender: step1.gender as Gender,
                                            birthdate: step1.birthdate,
                                            preferredLanguage: step1.preferredLanguage,
                                        });
                                        if (fullNameArabic) {
                                            await authService.updateProfile({ fullNameArabic });
                                        }
                                        await authService.getProfile();
                                        setHeaderAvatarUrl(authService.getCurrentUser()?.profile?.avatarUrl ?? null);
                                    } catch (err) {
                                        let errorMessage = 'Could not save identity. Please try again.';
                                        if (axios.isAxiosError(err) && err.response?.data) {
                                            const data = err.response.data as { message?: string; code?: string };
                                            if (data.message) errorMessage = data.message;
                                        }
                                        setError(errorMessage);
                                        setLoading(false);
                                        return;
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }
                            setStep(2);
                        })();
                    }, 50);
                }}
                onCancel={() => setShowNidScanner(false)}
            />
        )}
        <div
            className={`onboarding-viewport${step > 1 && !settingsOnlyFlow ? ' onboarding-viewport--step-back' : ''}`}
            onClick={(ev) => {
                if (ev.target !== ev.currentTarget) return;
                // Back navigation disabled as requested
            }}
            role="presentation"
        >
            <div
                className="onboarding-card cp-shell"
                style={{ position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
                role="presentation"
            >
                <nav className="cp-step-bar" aria-label="Onboarding steps">
                    {stepLabels.map(({ num, title, subtitle }) => {
                        const { completed, active } = stepIndicator(num);
                        const isPast = step > num;
                        const isFuture = step < num;
                        const isLockedInSettings = settingsOnlyFlow && isPast;
                        const canGoBack = false; // Disabled as requested
                        return (
                            <button
                                key={num}
                                type="button"
                                className={[
                                    'cp-step-segment',
                                    active ? 'cp-step-segment--active' : '',
                                    completed || isPast ? 'cp-step-segment--done' : '',
                                    canGoBack ? 'cp-step-segment--clickable' : '',
                                    isFuture ? 'cp-step-segment--future' : '',
                                    isLockedInSettings ? 'cp-step-segment--muted' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                aria-current={active ? 'step' : undefined}
                                disabled={isLockedInSettings}
                                onClick={() => {
                                    if (!canGoBack) return;
                                    handleStepSegmentClick(num);
                                }}
                            >
                                <span className="cp-step-segment__track">
                                    <span className="cp-step-segment__fill" aria-hidden />
                                </span>
                                <span className="cp-step-segment__body">
                                    <span className="cp-step-segment__icon">
                                        {completed && !active ? (
                                            <CheckCircle2 size={18} strokeWidth={2.5} />
                                        ) : (
                                            <span className="cp-step-segment__num">{num}</span>
                                        )}
                                    </span>
                                    <span className="cp-step-segment__text">
                                        <span className="cp-step-segment__title">{title}</span>
                                        <span className="cp-step-segment__subtitle">{subtitle}</span>
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="cp-card-body">
                    <div className="cp-card-toolbar">
                        {headerAvatarUrl ? (
                            <div className="cp-toolbar-avatar" title="Profile photo">
                                <img 
                                    src={headerAvatarUrl} 
                                    alt="" 
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authService.getCurrentUser()?.profile?.firstName || 'User')}&background=random`;
                                    }}
                                />
                            </div>
                        ) : (
                            <span className="cp-toolbar-spacer" aria-hidden />
                        )}
                        {/* Logout — visible during initial onboarding (steps 1 & 2), not in settings flow */}
                        {!settingsOnlyFlow && step < 3 ? (
                            <button
                                type="button"
                                className="cp-logout-btn"
                                onClick={() => void handleLogout()}
                                title="Sign out"
                            >
                                <LogOut size={14} />
                                Sign out
                            </button>
                        ) : (
                            <span className="cp-toolbar-spacer" aria-hidden />
                        )}
                    </div>

                {error && (
                    <div
                        style={{
                            padding: '12px',
                            backgroundColor: '#fee',
                            color: '#c00',
                            borderRadius: '4px',
                            marginBottom: '16px',
                            fontSize: '14px',
                        }}
                    >
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="step-fade-in">
                        <div className="section-title">
                            <h1>Create your identity</h1>
                            <p>Personalize your account to start connecting with the community.</p>
                        </div>

                        <div className="avatar-picker">
                            <button
                                type="button"
                                className={`avatar-circle ${headerAvatarUrl ? 'avatar-circle--has-photo' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={avatarUploading}
                            >
                                {headerAvatarUrl ? (
                                    <img className="avatar-circle__img" src={headerAvatarUrl} alt="" />
                                ) : (
                                    <>
                                        <UploadCloud size={28} />
                                        <span>{avatarUploading ? 'Uploading…' : 'Add Photo'}</span>
                                    </>
                                )}
                                {headerAvatarUrl && !avatarUploading && (
                                    <span className="avatar-circle__badge" aria-hidden>
                                        <UploadCloud size={16} />
                                    </span>
                                )}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept={AVATAR_ACCEPT}
                                hidden
                                onChange={(e) => void handleAvatarFileChange(e)}
                            />
                        </div>

                        <div className="modern-form-grid">
                            <div className="form-field full birthdate-field">
                                <label
                                    className="form-field__label form-field__label--with-icon"
                                    htmlFor="cp-dob-day"
                                >
                                    <Calendar size={18} className="form-field__label-icon" aria-hidden />
                                    <span>Date of Birth {req}</span>
                                </label>
                                <div
                                    className="birthdate-summary"
                                    role="status"
                                    aria-live="polite"
                                >
                                    {step1.birthdate && ageFromBirthdate(step1.birthdate) !== null ? (
                                        <span className="birthdate-summary__value">
                                            {formatBirthdateDisplayLong(step1.birthdate)}
                                        </span>
                                    ) : (
                                        <span className="birthdate-summary__placeholder">
                                            Your selected date will appear here
                                        </span>
                                    )}
                                </div>
                                <div className="birthdate-selects" aria-label="Date of birth">
                                    <div className="birthdate-select-cell">
                                        <span className="birthdate-select-caption" id="cp-dob-day-lbl">
                                            Day
                                        </span>
                                        <select
                                            id="cp-dob-day"
                                            aria-labelledby="cp-dob-day-lbl"
                                            className="birthdate-select"
                                            value={dobParts.d === '' ? '' : String(dobParts.d)}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                applyDobChange({ d: v === '' ? '' : Number(v) });
                                            }}
                                        >
                                            <option value="">Day</option>
                                            {daySelectOptions.map((day) => (
                                                <option key={day} value={day}>
                                                    {day}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="birthdate-select-cell">
                                        <span className="birthdate-select-caption" id="cp-dob-month-lbl">
                                            Month
                                        </span>
                                        <select
                                            id="cp-dob-month"
                                            aria-labelledby="cp-dob-month-lbl"
                                            className="birthdate-select"
                                            value={dobParts.m === '' ? '' : String(dobParts.m)}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                applyDobChange({ m: v === '' ? '' : Number(v) });
                                            }}
                                        >
                                            <option value="">Month</option>
                                            {monthSelectOptions.map((mo) => (
                                                <option key={mo.value} value={mo.value}>
                                                    {mo.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="birthdate-select-cell">
                                        <span className="birthdate-select-caption" id="cp-dob-year-lbl">
                                            Year
                                        </span>
                                        <select
                                            id="cp-dob-year"
                                            aria-labelledby="cp-dob-year-lbl"
                                            className="birthdate-select"
                                            value={dobParts.y === '' ? '' : String(dobParts.y)}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                applyDobChange({ y: v === '' ? '' : Number(v) });
                                            }}
                                        >
                                            <option value="">Year</option>
                                            {birthYearOptions.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="form-field">
                                <label
                                    className="form-field__label form-field__label--with-icon"
                                    htmlFor="cp-step1-gender"
                                >
                                    <User size={18} className="form-field__label-icon" aria-hidden />
                                    <span>Gender {req}</span>
                                </label>
                                <select
                                    id="cp-step1-gender"
                                    className="select-field-brand"
                                    value={step1.gender}
                                    onChange={(e) =>
                                        setStep1((s) => ({ ...s, gender: e.target.value as Gender | '' }))
                                    }
                                >
                                    <option value="">Select…</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>
                        <div className="form-field">
                                <label
                                    className="form-field__label form-field__label--with-icon"
                                    htmlFor="cp-step1-national-id"
                                >
                                    <IdCard size={18} className="form-field__label-icon" aria-hidden />
                                    <span>National ID {req}</span>
                                </label>
                                {nationalIdFieldLocked ? (
                                    // Already verified — show locked indicator
                                    <div style={{
                                        padding: '13px 16px',
                                        borderRadius: 14,
                                        border: '1.5px solid rgba(34,197,94,0.35)',
                                        background: 'rgba(34,197,94,0.06)',
                                        fontSize: '0.9rem',
                                        color: '#166534',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}>
                                        <CheckCircle2 size={16} color="#16a34a" />
                                        National ID verified
                                    </div>
                                ) : nidAlreadyScanned ? (
                                    // Scanned this session — show read-only with rescan option
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{
                                            padding: '13px 16px',
                                            borderRadius: 14,
                                            border: '1.5px solid rgba(37,99,235,0.35)',
                                            background: 'rgba(37,99,235,0.05)',
                                            fontSize: '0.9rem',
                                            color: '#1e3a8a',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            letterSpacing: '0.06em',
                                            fontFamily: 'monospace',
                                        }}>
                                            <CheckCircle2 size={16} color="#2563eb" />
                                            {step1.nationalId.slice(0, 2) + '**********' + step1.nationalId.slice(12)}
                                        </div>
                                        <button
                                            type="button"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#2563eb',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                textUnderlineOffset: '3px',
                                                textAlign: 'left',
                                                padding: '2px 0',
                                                fontFamily: 'inherit',
                                            }}
                                            onClick={() => {
                                                setStep1((s) => ({ ...s, nationalId: '', fullNameArabic: '' }));
                                                setShowNidScanner(true);
                                            }}
                                        >
                                            Rescan ID
                                        </button>
                                    </div>
                                ) : (
                                    // Not yet scanned — show camera scan prompt button
                                    <button
                                        type="button"
                                        id="cp-step1-national-id"
                                        onClick={() => setShowNidScanner(true)}
                                        style={{
                                            width: '100%',
                                            padding: '13px 16px',
                                            borderRadius: 14,
                                            border: '1.5px dashed rgba(37,99,235,0.5)',
                                            background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(37,99,235,0.02))',
                                            fontSize: '0.9rem',
                                            color: '#2563eb',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            transition: 'all 0.2s',
                                            textAlign: 'left',
                                            fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.08)'; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(37,99,235,0.02))'; }}
                                    >
                                        <IdCard size={20} />
                                        Scan National ID with Camera
                                    </button>
                                )}
                            </div>
                            {/* Arabic name field — shown only after successful scan */}
                            {nidAlreadyScanned && step1.fullNameArabic && (
                                <div className="form-field full">
                                    <label
                                        className="form-field__label form-field__label--with-icon"
                                        htmlFor="cp-step1-arabic-name"
                                    >
                                        <User size={18} className="form-field__label-icon" aria-hidden />
                                        <span>Full Name (Arabic)</span>
                                    </label>
                                    <input
                                        id="cp-step1-arabic-name"
                                        type="text"
                                        readOnly
                                        dir="rtl"
                                        value={step1.fullNameArabic}
                                        style={{
                                            fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
                                            fontSize: '1rem',
                                            background: 'rgba(37,99,235,0.03)',
                                            border: '1.5px solid rgba(37,99,235,0.2)',
                                            color: '#1e3a8a',
                                            fontWeight: 600,
                                            cursor: 'default',
                                        }}
                                        title="Extracted from your National ID"
                                    />
                                </div>
                            )}
                            <div className="form-field">
                                <label
                                    className="form-field__label form-field__label--with-icon"
                                    htmlFor="cp-step1-language"
                                >
                                    <Globe size={18} className="form-field__label-icon" aria-hidden />
                                    <span>Preferred Language</span>
                                </label>
                                <select
                                    id="cp-step1-language"
                                    className="select-field-brand"
                                    value={step1.preferredLanguage}
                                    onChange={(e) =>
                                        setStep1((s) => ({ ...s, preferredLanguage: e.target.value }))
                                    }
                                >
                                    <option value="ar">Arabic (العربية)</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>

                        <div className="action-footer">
                            {settingsOnlyFlow && (
                                <button type="button" className="btn-back" onClick={goBack} disabled={loading}>
                                    <ArrowLeft size={18} /> Back to Settings
                                </button>
                            )}
                            <button className="btn-continue" onClick={() => void goNextFromStep1()}>
                                {settingsOnlyFlow ? 'Save changes' : 'Next Step'} <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="step-fade-in">
                        <div className="section-title center">
                            <h1>Choose your journey</h1>
                            <p>Are you looking for a home or managing properties?</p>
                        </div>

                        <div className="role-grid">
                            <div
                                className={`role-option ${role === 'tenant' ? 'selected' : ''}`}
                                onClick={() => setRole('tenant')}
                            >
                                <div className="role-visual">
                                    <User size={32} />
                                </div>
                                <h3>Tenant</h3>
                                <p>Finding my next dream rental</p>
                            </div>
                            <div
                                className={`role-option ${role === 'landlord' ? 'selected' : ''}`}
                                onClick={() => setRole('landlord')}
                            >
                                <div className="role-visual">
                                    <Home size={32} />
                                </div>
                                <h3>Landlord</h3>
                                <p>Listing and managing assets</p>
                            </div>
                        </div>

                        <div className="action-footer">
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {settingsOnlyFlow && (
                                    <button type="button" className="btn-back" onClick={goBack} disabled={loading}>
                                        <ArrowLeft size={18} /> Back to Settings
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn-continue"
                                    disabled={!role || loading}
                                    onClick={() => void handleRoleSelection()}
                                >
                                    {loading ? 'Saving…' : 'Continue'} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && role === 'tenant' && (
                    <div className="step-fade-in">
                        <div className="section-title">
                            <h1>Rental Preferences</h1>
                            <p>This helps us find listings that match your lifestyle.</p>
                        </div>

                        <div className="modern-form-grid">
                            <div className="form-field">
                                <label>Employment {req}</label>
                                <select
                                    value={tenantStep3.employment}
                                    onChange={(e) =>
                                        setTenantStep3((s) => ({ ...s, employment: e.target.value }))
                                    }
                                >
                                    <option value="" disabled>
                                        Select…
                                    </option>
                                    <option value="Employed">Employed</option>
                                    <option value="Self-employed">Self-employed</option>
                                    <option value="Student">Student</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label
                                    className="form-field__label form-field__label--with-icon"
                                    htmlFor="cp-step3-workplace"
                                >
                                    <Briefcase size={18} className="form-field__label-icon" aria-hidden />
                                    <span>Workplace / Uni {req}</span>
                                </label>
                                <input
                                    id="cp-step3-workplace"
                                    type="text"
                                    placeholder="Company/School"
                                    value={tenantStep3.workplace}
                                    onChange={(e) =>
                                        setTenantStep3((s) => ({ ...s, workplace: e.target.value }))
                                    }
                                />
                            </div>
                             <div className="form-field">
                                 <label>Net Monthly Income ($) {req}</label>
                                 <input
                                     type="number"
                                     placeholder="Ex: 2500"
                                     value={tenantStep3.incomeRange}
                                     onChange={(e) =>
                                         setTenantStep3((s) => ({ ...s, incomeRange: e.target.value }))
                                     }
                                 />
                             </div>
                            <div className="form-field">
                                <label>Move-in Date {req}</label>
                                <input
                                    type="date"
                                    value={tenantStep3.moveInDate}
                                    onChange={(e) =>
                                        setTenantStep3((s) => ({ ...s, moveInDate: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>Property Type {req}</label>
                                <select
                                    value={tenantStep3.propertyType}
                                    onChange={(e) =>
                                        setTenantStep3((s) => ({ ...s, propertyType: e.target.value }))
                                    }
                                >
                                    <option value="" disabled>
                                        Select…
                                    </option>
                                    <option value="Apartment">Apartment</option>
                                    <option value="Villa">Villa</option>
                                    <option value="Studio">Studio</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Duration {req}</label>
                                <select
                                    value={tenantStep3.duration}
                                    onChange={(e) =>
                                        setTenantStep3((s) => ({ ...s, duration: e.target.value }))
                                    }
                                >
                                    <option value="" disabled>
                                        Select…
                                    </option>
                                    <option value="6 Months">6 Months</option>
                                    <option value="1 Year">1 Year</option>
                                    <option value="Long-term">Long-term</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Min Budget ($) {req}</label>
                                <input
                                    type="number"
                                    placeholder="500"
                                    value={tenantStep3.budgetMin}
                                    onChange={(e) =>
                                        setTenantStep3((s) => ({ ...s, budgetMin: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>Max Budget ($) {req}</label>
                                <input
                                    type="number"
                                    placeholder="2500"
                                    value={tenantStep3.budgetMax}
                                    onChange={(e) =>
                                        setTenantStep3((s) => ({ ...s, budgetMax: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="action-footer action-footer--step3">
                            <div className="action-footer__primary-row">
                                {settingsOnlyFlow && (
                                    <button
                                        type="button"
                                        className="btn-back"
                                        onClick={() => navigate('/settings')}
                                        disabled={loading}
                                    >
                                        <ArrowLeft size={18} /> Back to Settings
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn-finish"
                                    onClick={() => void submitTenantProfile()}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving…' : 'Complete Profile'}
                                </button>
                            </div>
                            {!settingsOnlyFlow && (
                                <button
                                    type="button"
                                    className="btn-skip"
                                    onClick={() => void handleStep3Skip()}
                                    disabled={loading}
                                >
                                    Skip for now
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {step === 3 && role === 'landlord' && (
                    <div className="step-fade-in">
                        <div className="section-title">
                            <h1>Business Profile</h1>
                            <p>Verified landlords receive more high-quality inquiries.</p>
                        </div>

                        <div className="modern-form-grid">
                            <div className="form-field">
                                <label>Account Type {req}</label>
                                <select
                                    value={landlordStep3.accountType}
                                    onChange={(e) =>
                                        setLandlordStep3((s) => ({ ...s, accountType: e.target.value }))
                                    }
                                >
                                    <option value="" disabled>
                                        Select…
                                    </option>
                                    <option value="Individual Owner">Individual Owner</option>
                                    <option value="Agency">Agency</option>
                                    <option value="Company">Company</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Company Name {req}</label>
                                <input
                                    type="text"
                                    placeholder="Legal name or &quot;Individual&quot;"
                                    value={landlordStep3.companyName}
                                    onChange={(e) =>
                                        setLandlordStep3((s) => ({ ...s, companyName: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>Total Properties {req}</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    min={0}
                                    value={landlordStep3.totalProperties}
                                    onChange={(e) =>
                                        setLandlordStep3((s) => ({ ...s, totalProperties: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>Years Experience {req}</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 5"
                                    min={0}
                                    value={landlordStep3.yearsExperience}
                                    onChange={(e) =>
                                        setLandlordStep3((s) => ({ ...s, yearsExperience: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field full">
                                <label
                                    className="form-field__label form-field__label--with-icon"
                                    htmlFor="cp-step3-business-address"
                                >
                                    <Building2 size={18} className="form-field__label-icon" aria-hidden />
                                    <span>Business Address {req}</span>
                                </label>
                                <input
                                    id="cp-step3-business-address"
                                    type="text"
                                    placeholder="Full address"
                                    value={landlordStep3.businessAddress}
                                    onChange={(e) =>
                                        setLandlordStep3((s) => ({ ...s, businessAddress: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label
                                    className="form-field__label form-field__label--with-icon"
                                    htmlFor="cp-step3-availability"
                                >
                                    <Clock size={18} className="form-field__label-icon" aria-hidden />
                                    <span>Availability {req}</span>
                                </label>
                                <input
                                    id="cp-step3-availability"
                                    type="text"
                                    placeholder="e.g. 9AM - 5PM"
                                    value={landlordStep3.availability}
                                    onChange={(e) =>
                                        setLandlordStep3((s) => ({ ...s, availability: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="action-footer action-footer--step3">
                            <div className="action-footer__primary-row">
                                {settingsOnlyFlow && (
                                    <button
                                        type="button"
                                        className="btn-back"
                                        onClick={() => navigate('/settings')}
                                        disabled={loading}
                                    >
                                        <ArrowLeft size={18} /> Back to Settings
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn-finish"
                                    onClick={() => void submitLandlordProfile()}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving…' : 'Finish Setup'}
                                </button>
                            </div>
                            {!settingsOnlyFlow && (
                                <button
                                    type="button"
                                    className="btn-skip"
                                    onClick={() => void handleStep3Skip()}
                                    disabled={loading}
                                >
                                    Skip for now
                                </button>
                            )}
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
        </>
    );
};

export default CompleteProfile;