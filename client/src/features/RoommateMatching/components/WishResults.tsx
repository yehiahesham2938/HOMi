import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Search, RefreshCw } from 'lucide-react';
import MatchCard from './MatchCard';
import type { WishState } from '../hooks/useWish';
import type { SmartCandidate, WishMatch, LifestyleHabits } from '../types/roommateMatchingTypes';

interface WishResultsProps {
    state: WishState;
    youHabits: LifestyleHabits;
    onConnect: (cand: SmartCandidate | WishMatch) => void;
    onView: (cand: SmartCandidate | WishMatch) => void;
}

const WishResults: React.FC<WishResultsProps> = ({ state, youHabits, onConnect, onView }) => {
    const { t } = useTranslation();
    const { results, wish, err, run, busy } = state;
    if (busy && !results) return null;
    if (!results) return null;

    if (results.length === 0) {
        return (
            <div style={{ marginTop: 24 }}>
                <div className="empty">
                    <div className="ei"><Search size={26} /></div>
                    <h3>{t('roommate.noStrongWishMatch', 'No strong match for that wish — yet')}</h3>
                    <p>{t('roommate.noStrongWishMatchDesc', 'Try describing the vibe differently, or widen your budget and area. New roommates join HOMI every day.')}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginTop: 6 }}>
            <div className="wish-resbar">
                <div className="ic"><Sparkles size={20} /></div>
                <div>
                    <h3>{t('roommate.wishFoundMatches', { count: results.length, matches: results.length !== 1 ? 'es' : '', defaultValue: `HOMI Wish found ${results.length} match${results.length !== 1 ? 'es' : ''}` })}</h3>
                    <p>{err === 'soft' ? t('roommate.rankedOnDevice', { defaultValue: 'Ranked on-device · ' }) : ''}{t('roommate.forYourWish', { wish, defaultValue: `For your wish: “${wish}”` })}</p>
                </div>
                <button className="btn btn-ghost btn-sm again" onClick={() => run(wish)} disabled={busy}>
                    <RefreshCw size={14} />{t('roommate.regenerateBtn', { defaultValue: 'Regenerate' })}
                </button>
            </div>
            <div className="mgrid">
                {results.map((m) => (
                    <MatchCard key={m.id} cand={m} youHabits={youHabits} wish conn={m.conn} onConnect={onConnect} onView={onView} />
                ))}
            </div>
        </div>
    );
};

export default WishResults;

