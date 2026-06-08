import React from 'react';
import { HABITS, habitLabel } from '../constants/habits';
import type { HabitBreakdown, LifestyleHabits } from '../types/roommateMatchingTypes';

export const HabitBars: React.FC<{ top: HabitBreakdown[] }> = ({ top }) => (
    <div className="hbar">
        {top.map((b) => (
            <div className="hbar-row" key={b.key}>
                <span className="hl">{b.label}</span>
                <span className="ht"><i style={{ width: b.pct + '%' }} /></span>
                <span className="hv">{b.pct}%</span>
            </div>
        ))}
    </div>
);

interface HabitTagsProps {
    habits: LifestyleHabits;
    youHabits?: LifestyleHabits;
    max?: number;
}

export const HabitTags: React.FC<HabitTagsProps> = ({ habits, youHabits, max = 4 }) => {
    const list = HABITS.slice(0, max);
    return (
        <div className="htags">
            {list.map((h) => {
                const Icon = h.icon;
                const val = habits[h.key];
                if (val == null) return null;
                const match = youHabits && youHabits[h.key] === val;
                return (
                    <span className={'htag' + (match ? ' match' : '')} key={h.key}>
                        <Icon size={13} />{habitLabel(h.key, val)}
                    </span>
                );
            })}
        </div>
    );
};
