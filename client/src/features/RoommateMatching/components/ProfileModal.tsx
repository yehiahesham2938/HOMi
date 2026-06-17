import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin, CheckCircle2, MessageSquare, Check, UserPlus, Wallet, Calendar } from 'lucide-react';
import Avatar from './Avatar';
import Ring from './Ring';
import { HABITS, habitLabel, habitDimensionLabel } from '../constants/habits';
import type { SmartCandidate, WishMatch, ConnStatus } from '../types/roommateMatchingTypes';

interface ProfileModalProps {
    cand: SmartCandidate | WishMatch | null;
    conn: ConnStatus;
    onConnect: (cand: SmartCandidate | WishMatch) => void;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ cand, conn, onConnect, onClose }) => {
    const { t } = useTranslation();
    if (!cand) return null;
    const sent = conn === 'sent';
    const mutual = conn === 'mutual';

    return (
        <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-hero">
                    <button className="modal-x" onClick={onClose}><X size={18} /></button>
                    <div className="modal-prof">
                        <Avatar name={cand.name} avatar={cand.avatar} size={74} radius={18} />
                        <div>
                            <h2>{cand.name}{cand.verified && <CheckCircle2 size={18} />}</h2>
                            <div className="mp">
                                {(cand.area || cand.city) && (
                                    <span><MapPin size={14} />{[cand.area, cand.city].filter(Boolean).join(', ')}</span>
                                )}
                                {cand.age != null && <span>· {t('roommate.yearsText', { count: cand.age, defaultValue: `${cand.age} yrs` })}</span>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-body">
                    <div className="modal-score">
                        <Ring pct={cand.score} size={56} />
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--rm-ink)' }}>{t('roommate.lifestyleCompatPercent', { percent: cand.score, defaultValue: `${cand.score}% lifestyle compatibility` })}</div>
                            <div style={{ fontSize: 13, color: 'var(--rm-muted)' }}>{t('roommate.compatBasisDesc', 'Based on your combined habits, location and budget')}</div>
                        </div>
                    </div>
                    {cand.bio && (
                        <div className="modal-section">
                            <h4>{t('roommate.aboutHeader', 'About')}</h4>
                            <p className="modal-bio">{cand.bio}</p>
                        </div>
                    )}
                    <div className="modal-section">
                        <h4>{t('roommate.lifestyleHabitsHeader', 'Lifestyle & habits')}</h4>
                        <div className="hgrid">
                            {HABITS.map((h) => {
                                const Icon = h.icon;
                                const val = cand.habits[h.key];
                                if (val == null) return null;
                                return (
                                    <div className="hg" key={h.key}>
                                        <div className="hgi"><Icon size={16} /></div>
                                        <div>
                                            <div className="hgl">{habitDimensionLabel(h.key)}</div>
                                            <div className="hgv">{habitLabel(h.key, val)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {(cand.budget || cand.moveIn) && (
                        <div className="modal-section" style={{ marginBottom: 0 }}>
                            <h4>{t('roommate.preferencesHeader', 'Preferences')}</h4>
                            <div className="hgrid">
                                {cand.budget && (
                                    <div className="hg"><div className="hgi"><Wallet size={16} /></div>
                                        <div><div className="hgl">{t('roommate.budgetLabel', 'Budget')}</div><div className="hgv">{cand.budget[0].toLocaleString()}–{cand.budget[1].toLocaleString()} EGP</div></div></div>
                                )}
                                {cand.moveIn && (
                                    <div className="hg"><div className="hgi"><Calendar size={16} /></div>
                                        <div><div className="hgl">{t('roommate.moveInLabel', 'Move-in')}</div><div className="hgv">{new Date(cand.moveIn).toLocaleDateString()}</div></div></div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-foot">
                    <button className="btn btn-ghost" onClick={onClose} style={{ flex: '0 0 auto' }}><X size={16} />{t('roommate.closeBtn', 'Close')}</button>
                    {mutual ? (
                        <button className="btn btn-primary btn-block"><MessageSquare size={16} />{t('roommate.messageUserBtn', { name: cand.name.split(' ')[0], defaultValue: `Message ${cand.name.split(' ')[0]}` })}</button>
                    ) : sent ? (
                        <button className="btn btn-soft btn-block" disabled><Check size={16} />{t('roommate.connRequestSentStatus', 'Connection request sent')}</button>
                    ) : (
                        <button className="btn btn-primary btn-block" onClick={() => onConnect(cand)}>
                            <UserPlus size={16} />{t('roommate.sendConnRequestBtn', 'Send connection request')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;

