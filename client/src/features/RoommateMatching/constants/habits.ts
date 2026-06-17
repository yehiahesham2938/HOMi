import {
    Moon, Sparkles, Users, Volume2, Cigarette, PawPrint, ChefHat, Laptop,
    type LucideIcon,
} from 'lucide-react';
import i18n from '../../../i18n/i18n';

export interface HabitDimension {
    key: string;
    label: string;
    icon: LucideIcon;
    opts: [string, string, string];
}

export const HABITS: HabitDimension[] = [
    { key: 'sleep', label: 'Sleep', icon: Moon, opts: ['Early bird', 'Flexible', 'Night owl'] },
    { key: 'clean', label: 'Tidiness', icon: Sparkles, opts: ['Relaxed', 'Tidy', 'Spotless'] },
    { key: 'social', label: 'Guests', icon: Users, opts: ['Rarely', 'Sometimes', 'Often'] },
    { key: 'noise', label: 'Noise', icon: Volume2, opts: ['Very quiet', 'Moderate', 'Lively'] },
    { key: 'smoke', label: 'Smoking', icon: Cigarette, opts: ['Non-smoker', 'Outdoor only', 'Smoker'] },
    { key: 'pets', label: 'Pets', icon: PawPrint, opts: ['No pets', 'Pet-friendly', 'Has pets'] },
    { key: 'cook', label: 'Cooking', icon: ChefHat, opts: ['Eats out', 'Cooks sometimes', 'Cooks daily'] },
    { key: 'work', label: 'Work', icon: Laptop, opts: ['At office', 'Hybrid', 'Works from home'] },
];

export const HABIT_KEYS = HABITS.map((h) => h.key);

export function habitLabel(key: string, val: number): string {
    const dim = HABITS.find((h) => h.key === key);
    if (!dim || val == null) return '';
    return i18n.t(`habits.${key}.opts.${val}`, dim.opts[val] ?? '');
}

export function habitDimensionLabel(key: string): string {
    const dim = HABITS.find((h) => h.key === key);
    if (!dim) return '';
    return i18n.t(`habits.${key}.label`, dim.label);
}

export const CITIES = ['Any city', 'Cairo', 'Giza', 'Alexandria'];
export const AREAS = ['Any area', 'Maadi', 'Nasr City', 'Zamalek', 'Heliopolis', 'Dokki', 'New Cairo'];

export function getCities(): string[] {
    return [
        i18n.t('roommate.cityAny', 'Any city'),
        i18n.t('roommate.cityCairo', 'Cairo'),
        i18n.t('roommate.cityGiza', 'Giza'),
        i18n.t('roommate.cityAlexandria', 'Alexandria'),
    ];
}

export function getAreas(): string[] {
    return [
        i18n.t('roommate.areaAny', 'Any area'),
        i18n.t('roommate.areaMaadi', 'Maadi'),
        i18n.t('roommate.areaNasrCity', 'Nasr City'),
        i18n.t('roommate.areaZamalek', 'Zamalek'),
        i18n.t('roommate.areaHeliopolis', 'Heliopolis'),
        i18n.t('roommate.areaDokki', 'Dokki'),
        i18n.t('roommate.areaNewCairo', 'New Cairo'),
    ];
}

export const WISH_EXAMPLES = [
    'A quiet non-smoker in Maadi who works from home, budget under 9000',
    'A social roommate who cooks and is fine with my cat',
    'A spotless early riser near a metro station',
    'Someone calm for long study nights',
];

export function getWishExamples(): string[] {
    return [
        i18n.t('roommate.wishEx1', 'A quiet non-smoker in Maadi who works from home, budget under 9000'),
        i18n.t('roommate.wishEx2', 'A social roommate who cooks and is fine with my cat'),
        i18n.t('roommate.wishEx3', 'A spotless early riser near a metro station'),
        i18n.t('roommate.wishEx4', 'Someone calm for long study nights'),
    ];
}

export const WISH_STEPS = [
    'Reading your wish…',
    'Scanning verified roommates…',
    'Scoring lifestyle & location fit…',
    'Writing your matches…',
];

export function getWishSteps(): string[] {
    return [
        i18n.t('roommate.stepReading', 'Reading your wish…'),
        i18n.t('roommate.stepScanning', 'Scanning verified roommates…'),
        i18n.t('roommate.stepScoring', 'Scoring lifestyle & location fit…'),
        i18n.t('roommate.stepWriting', 'Writing your matches…'),
    ];
}

