/**
 * Structured roommate lifestyle habit dimensions.
 * Each dimension is scored 0, 1 or 2 (index into `opts`).
 * Shared by the non-AI compatibility engine and the HOMI Wish AI prompt.
 */
export interface HabitDimension {
    key: string;
    label: string;
    opts: [string, string, string];
}

export const HABITS: HabitDimension[] = [
    { key: 'sleep', label: 'Sleep', opts: ['Early bird', 'Flexible', 'Night owl'] },
    { key: 'clean', label: 'Tidiness', opts: ['Relaxed', 'Tidy', 'Spotless'] },
    { key: 'social', label: 'Guests', opts: ['Rarely', 'Sometimes', 'Often'] },
    { key: 'noise', label: 'Noise', opts: ['Very quiet', 'Moderate', 'Lively'] },
    { key: 'smoke', label: 'Smoking', opts: ['Non-smoker', 'Outdoor only', 'Smoker'] },
    { key: 'pets', label: 'Pets', opts: ['No pets', 'Pet-friendly', 'Has pets'] },
    { key: 'cook', label: 'Cooking', opts: ['Eats out', 'Cooks sometimes', 'Cooks daily'] },
    { key: 'work', label: 'Work', opts: ['At office', 'Hybrid', 'Works from home'] },
];

export const HABIT_KEYS = HABITS.map((h) => h.key);

export function habitLabel(key: string, val: number): string {
    const dim = HABITS.find((h) => h.key === key);
    if (!dim || val == null) return '';
    return dim.opts[val] ?? '';
}

/** Validate a lifestyle_habits object: all keys present and each 0-2 */
export function isValidLifestyle(habits: unknown): habits is Record<string, number> {
    if (!habits || typeof habits !== 'object') return false;
    const h = habits as Record<string, unknown>;
    return HABIT_KEYS.every((k) => {
        const v = h[k];
        return typeof v === 'number' && v >= 0 && v <= 2;
    });
}
