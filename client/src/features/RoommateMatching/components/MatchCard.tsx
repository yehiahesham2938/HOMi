import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, CheckCircle2, Search, MessageSquare, Check, UserPlus, Sparkles } from 'lucide-react';
import Avatar from './Avatar';
import Ring from './Ring';
import { HabitBars, HabitTags } from './HabitDisplays';
import type { SmartCandidate, WishMatch, LifestyleHabits, ConnStatus } from '../types/roommateMatchingTypes';

interface MatchCardProps {
    cand: SmartCandidate | WishMatch;
    youHabits: LifestyleHabits;
    conn: ConnStatus;
    onConnect: (cand: SmartCandidate | WishMatch) => void;
    onView: (cand: SmartCandidate | WishMatch) => void;
    wish?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ cand, youHabits, conn, onConnect, onView, wish = false }) => {
    const { t } = useTranslation();
    const sent = conn === 'sent';
    const mutual = conn === 'mutual';
    const wishReason = (cand as WishMatch).reason;

    return (
        <div className={'mcard' + (wish ? ' wishful' : '')}>
            <div className="mcard-top">
                <Avatar name={cand.name} avatar={cand.avatar} size={62} radius={16} className="mc-ava" />
                <div className="mc-id">
                    <h3>
                        {cand.name}
                        {cand.verified && <span className="vf" title={t('roommate.verifiedTooltip', 'Verified')}><CheckCircle2 size={15} /></span>}
                    </h3>
                    <div className="mc-meta">
                        {cand.area && <span className="mp"><MapPin size={13} color="#197cf8" />{cand.area}</span>}
                        {cand.age != null && <><span>·</span><span>{t('roommate.yearsText', { count: cand.age, defaultValue: `${cand.age} yrs` })}</span></>}
                    </div>
                </div>
                <Ring pct={cand.score} />
            </div>
            <div className="mc-body">
                {wish && wishReason ? (
                    <div className="mc-reason">
                        <div className="lab"><Sparkles size={13} />{t('roommate.whyWishPicked', 'Why HOMI Wish picked them')}</div>
                        <p>{wishReason}</p>
                    </div>
                ) : (
                    <HabitBars top={cand.top} />
                )}
                <HabitTags habits={cand.habits} youHabits={youHabits} max={4} />
                <div className="mc-act">
                    <button className="mc-skip" title={t('roommate.viewProfileTooltip', 'View profile')} onClick={() => onView(cand)}><Search size={17} /></button>
                    {mutual ? (
                        <button className="mc-sent mc-chat"><MessageSquare size={15} />{t('roommate.messageBtn', 'Message')}</button>
                    ) : sent ? (
                        <button className="mc-sent"><Check size={15} />{t('roommate.requestSentStatus', 'Request sent')}</button>
                    ) : (
                        <button className={'btn ' + (wish ? 'btn-wish' : 'btn-primary')} onClick={() => onConnect(cand)}>
                            <UserPlus size={16} />{t('roommate.connectBtn', 'Connect')}
                        </button>
                    )}
                </div>
                {mutual && (
                    <div style={{ textAlign: 'center', fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: -4 }}>
                        <Check size={12} /> {t('roommate.youMatchedSayHi', 'You matched — say hi!')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchCard;

