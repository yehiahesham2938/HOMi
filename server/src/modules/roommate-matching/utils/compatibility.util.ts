import { HABITS, habitLabel } from '../constants/habits.js';

export interface HabitBreakdown {
    key: string;
    label: string;
    pct: number;
    val: number;
}

export interface CompatibilityResult {
    score: number;
    breakdown: HabitBreakdown[];
    top: HabitBreakdown[];
}

interface CompatPerson {
    habits: Record<string, number>;
    city?: string | null;
    area?: string | null;
    budget?: [number, number] | null;
}

function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Non-AI lifestyle compatibility between two people, mirroring the HOMI
 * "Smart Match" design: per-habit similarity + location & budget adjustments.
 */
export function compat(you: CompatPerson, other: CompatPerson): CompatibilityResult {
    const breakdown: HabitBreakdown[] = HABITS.map((h) => {
        const yv = you.habits?.[h.key] ?? 1;
        const ov = other.habits?.[h.key] ?? 1;
        const diff = Math.abs(yv - ov); // 0..2
        const pct = Math.round((1 - diff / 2) * 100);
        return { key: h.key, label: h.label, pct, val: ov };
    });

    let score = avg(breakdown.map((b) => b.pct));

    // location bonus / penalty
    if (other.area && you.area && other.area === you.area) score += 6;
    else if (other.city && you.city && other.city === you.city) score += 2;
    else score -= 6;

    // budget overlap
    if (you.budget && other.budget) {
        const overlap = Math.min(you.budget[1], other.budget[1]) - Math.max(you.budget[0], other.budget[0]);
        if (overlap > 0) score += 3;
        else score -= 4;
    }

    score = Math.max(38, Math.min(99, Math.round(score)));
    const top = [...breakdown].sort((a, b) => b.pct - a.pct).slice(0, 4);
    return { score, breakdown, top };
}

/** Serialize a person's habits into human-readable labels for the AI prompt. */
export function habitsToLabels(habits: Record<string, number>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const h of HABITS) {
        const v = habits?.[h.key];
        if (typeof v === 'number') out[h.key] = habitLabel(h.key, v);
    }
    return out;
}
