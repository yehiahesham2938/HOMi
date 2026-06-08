import React from 'react';
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
    const loc = [area, city].filter(Boolean).join(', ');
    return (
        <div className="you-strip">
            <Avatar name={name} avatar={avatar} size={50} radius={14} />
            <div className="yt">
                <h4>Your lifestyle profile</h4>
                <p>
                    {loc || 'Location not set'}
                    {budget ? ` · Budget ${budget[0].toLocaleString()}–${budget[1].toLocaleString()} EGP` : ''}
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
            <button className="edit" onClick={onEdit}>Edit habits</button>
        </div>
    );
};

export default YouStrip;
