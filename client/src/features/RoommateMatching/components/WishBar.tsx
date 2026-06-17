import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Wand2, Check } from 'lucide-react';
import { getWishExamples, getWishSteps } from '../constants/habits';
import type { WishState } from '../hooks/useWish';

const Sparkle: React.FC<{ top: number; left: number; size: number; delay: number }> = ({ top, left, size, delay }) => (
    <span className="wish-spk" style={{ top: top + '%', left: left + '%', width: size, height: size, animationDelay: delay + 's' }} />
);

const Sparkles2: React.FC<{ n: number }> = ({ n }) => {
    const spk = useRef<Array<{ top: number; left: number; size: number; delay: number }> | null>(null);
    if (!spk.current) {
        spk.current = Array.from({ length: n }, () => ({
            top: Math.random() * 100,
            left: Math.random() * 100,
            size: 1.5 + Math.random() * 3,
            delay: Math.random() * 3.4,
        }));
    }
    return <>{spk.current.map((s, i) => <Sparkle key={i} {...s} />)}</>;
};

interface WishBarProps {
    state: WishState;
    hero?: boolean;
}

const WishBar: React.FC<WishBarProps> = ({ state, hero = true }) => {
    const { t } = useTranslation();
    const { wish, setWish, busy, step, run } = state;
    const taRef = useRef<HTMLTextAreaElement>(null);

    const grow = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    };

    useEffect(() => {
        grow(taRef.current);
        const on = () => grow(taRef.current);
        window.addEventListener('resize', on);
        return () => window.removeEventListener('resize', on);
    }, [wish]);

    const wishExamples = getWishExamples();
    const wishSteps = getWishSteps();

    return (
        <div className="wish">
            <div className="wish-inner">
                <Sparkles2 n={hero ? 18 : 10} />
                <div className="wish-eyebrow">
                    <Sparkles size={15} color="#c4b5fd" />
                    <span className="logo">{t('roommate.wishLogo', 'HOMI WISH')}</span>
                    <span style={{ color: '#7e84b5', letterSpacing: '.06em' }}>· {t('roommate.aiMatchmaker', 'AI MATCHMAKER')}</span>
                </div>
                {hero && <h2 className="wish-title">{t('roommate.wishTitleText1', 'Describe your perfect roommate.')}<br /><span className="sh">{t('roommate.wishTitleText2', 'Let the AI find them.')}</span></h2>}
                {hero && <p className="wish-sub">{t('roommate.wishSubtitleText', 'Forget filters. Tell HOMI Wish exactly who — and where — you’re looking for, in your own words.')}</p>}
                <div className="wish-field">
                    <Wand2 size={20} className="star" />
                    <textarea
                        ref={taRef}
                        rows={1}
                        value={wish}
                        onChange={(e) => setWish(e.target.value)}
                        onInput={(e) => grow(e.currentTarget)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                run();
                            }
                        }}
                        placeholder={t('roommate.wishPlaceholder', 'write your wish and HOMI AI will make it happen')}
                        disabled={busy}
                    />
                    <button className="wish-go" onClick={() => run()} disabled={busy}>
                        {busy ? <><span className="wish-orb" style={{ width: 18, height: 18 }} />{t('roommate.granting', 'Granting…’')}</>
                            : <><Sparkles size={17} />{t('roommate.makeItHappen', 'Make it happen')}</>}
                    </button>
                </div>
                {!busy && (
                    <div className="wish-chips">
                        <span>{t('roommate.tryLabel', 'Try:')}</span>
                        {wishExamples.slice(0, hero ? 4 : 2).map((ex, i) => (
                            <button key={i} className="wish-chip" onClick={() => setWish(ex)}>{ex}</button>
                        ))}
                    </div>
                )}
                {busy && (
                    <div className="wish-steps">
                        {wishSteps.map((s, i) => (
                            <div key={i} className={'wstep' + (i <= step ? ' on' : '')}>
                                <span className="wd">{i < step && <Check size={11} />}</span>{s}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishBar;

