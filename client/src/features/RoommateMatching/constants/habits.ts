import {
    Moon, Sparkles, Users, Volume2, Cigarette, PawPrint, ChefHat, Laptop,
    type LucideIcon,
} from 'lucide-react';

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
    return dim.opts[val] ?? '';
}

export const CITIES = ['Any city', 'Cairo', 'Giza', 'Alexandria'];
export const AREAS = ['Any area', 'Maadi', 'Nasr City', 'Zamalek', 'Heliopolis', 'Dokki', 'New Cairo'];

export const WISH_EXAMPLES = [
    'A quiet non-smoker in Maadi who works from home, budget under 9000',
    'A social roommate who cooks and is fine with my cat',
    'A spotless early riser near a metro station',
    'Someone calm for long study nights',
];

export const WISH_STEPS = [
    'Reading your wish…',
    'Scanning verified roommates…',
    'Scoring lifestyle & location fit…',
    'Writing your matches…',
];
