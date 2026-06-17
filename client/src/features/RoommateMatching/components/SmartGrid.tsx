import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import MatchCard from './MatchCard';
import type { SmartCandidate, WishMatch, LifestyleHabits } from '../types/roommateMatchingTypes';

interface SmartGridProps {
    candidates: SmartCandidate[];
    youHabits: LifestyleHabits;
    onConnect: (cand: SmartCandidate | WishMatch) => void;
    onView: (cand: SmartCandidate | WishMatch) => void;
}

const SmartGrid: React.FC<SmartGridProps> = ({ candidates, youHabits, onConnect, onView }) => {
    const { t } = useTranslation();
    if (candidates.length === 0) {
        return (
            <div className="empty">
                <div className="ei"><Search size={26} /></div>
                <h3>{t('roommate.noRoommatesMatchFilters', 'No roommates match these filters')}</h3>
                <p>{t('roommate.noRoommatesMatchFiltersDesc', 'Try widening your area or lowering the minimum match score.')}</p>
            </div>
        );
    }
    return (
        <div className="mgrid">
            {candidates.map((c) => (
                <MatchCard key={c.id} cand={c} youHabits={youHabits} conn={c.conn} onConnect={onConnect} onView={onView} />
            ))}
        </div>
    );
};

export default SmartGrid;

