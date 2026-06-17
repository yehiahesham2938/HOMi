import React from 'react';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';
import { HABITS, habitLabel } from '../constants/habits';
import type { LifestyleHabits } from '../types/roommateMatchingTypes';

interface YouStripProps {
    name: string;
    avatar?: string | null;
    habits: LifestyleHabits;
    area?: string | null;
    city?: string | null;
    budget?: [number, number] | null;
    onEdit: () => void;
}

const YouStrip: React.FC<YouStripProps> = ({ name, avatar, habits, area, city, budget, onEdit }) => {
    const { t } = useTranslation();
    const loc = [area, city].filter(Boolean).join(', ');
    return (
        <div className="you-strip">
            <Avatar name={name} avatar={avatar} size={50} radius={14} />
            <div className="yt">
                <h4>{t('roommate.yourLifestyleProfile', 'Your lifestyle profile')}</h4>
                <p>
                    {loc || t('roommate.locationNotSet', 'Location not set')}
                    {budget ? ` · ${t('roommate.budgetLabel', 'Budget')} ${budget[0].toLocaleString()}–${budget[1].toLocaleString()} EGP` : ''}
                </p>
            </div>
            <div className="yhabits">
                {HABITS.slice(0, 6).map((h) => {
                    const Icon = h.icon;
                    const val = habits[h.key];
                    if (val == null) return null;
                    return <span className="htag" key={h.key}><Icon size={13} />{habitLabel(h.key, val)}</span>;
                })}
            </div>
            <button className="edit" onClick={onEdit}>{t('roommate.editHabits', 'Edit habits')}</button>
        </div>
    );
};

export default YouStrip;

