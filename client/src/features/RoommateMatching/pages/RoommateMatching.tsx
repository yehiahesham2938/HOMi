import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight, Search, Home } from 'lucide-react';

import { roommateMatchingService } from '../services/roommateMatchingService';
import { authService } from '../../../services/auth.service';
import type {
    EligibilityResponse, SmartCandidate, WishMatch, LifestyleHabits, ConnStatus,
} from '../types/roommateMatchingTypes';

import EligibilityGate from '../components/EligibilityGate';
import YouStrip from '../components/YouStrip';
import Filters, { type FilterState } from '../components/Filters';
import SmartGrid from '../components/SmartGrid';
import WishBar from '../components/WishBar';
import WishResults from '../components/WishResults';
import LeaseSection from '../components/LeaseSection';
import ProfileModal from '../components/ProfileModal';
import { useWish } from '../hooks/useWish';

// Global layout
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import '../../home/pages/TenantHome.css';
import './RoommateMatching.css';

const RoommateMatching: React.FC = () => {
    const navigate = useNavigate();
    const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [tab, setTab] = useState<'B' | 'A'>('B');
    const [youHabits, setYouHabits] = useState<LifestyleHabits>({});

    const [filters, setFilters] = useState<FilterState>({ city: 'Cairo', area: 'Any area', gender: 'Any', min: 'Any' });
    const [smart, setSmart] = useState<SmartCandidate[]>([]);
    const [smartLoading, setSmartLoading] = useState(false);

    const [override, setOverride] = useState<Record<string, ConnStatus>>({});
    const [profile, setProfile] = useState<SmartCandidate | WishMatch | null>(null);

    const wish = useWish();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const youName = `${currentUser.first_name || currentUser.firstName || 'You'}${currentUser.last_name ? ' ' + currentUser.last_name : ''}`;
    const youAvatar = currentUser.avatar_url || currentUser.avatarUrl || null;

    const init = async () => {
        try {
            setLoading(true);
            const el = await roommateMatchingService.checkEligibility();
            setEligibility(el);
            if (el.eligible) {
                try {
                    const lf = await authService.getLifestyleHabits();
                    setYouHabits(lf.lifestyle_habits || {});
                } catch { /* non-fatal */ }
            }
        } catch (e) {
            console.error('Eligibility check failed', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { init(); }, []);

    const loadSmart = useCallback(async () => {
        setSmartLoading(true);
        try {
            const list = await roommateMatchingService.smartMatches(filters);
            setSmart(list);
        } catch (e) {
            console.error('Smart match load failed', e);
        } finally {
            setSmartLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (eligibility?.eligible && tab === 'B') loadSmart();
    }, [eligibility, tab, loadSmart]);

    const connFor = (c: SmartCandidate | WishMatch): ConnStatus => override[c.id] ?? c.conn;

    const handleConnect = async (cand: SmartCandidate | WishMatch) => {
        const source = (cand as WishMatch).reason ? 'WISH' : 'SMART';
        setOverride((o) => ({ ...o, [cand.id]: 'sent' }));
        try {
            const res = await roommateMatchingService.connect(cand.id, source, cand.score, (cand as WishMatch).reason);
            if (res.status === 'updated') setOverride((o) => ({ ...o, [cand.id]: 'mutual' }));
        } catch {
            setOverride((o) => ({ ...o, [cand.id]: 'none' }));
            alert('Failed to send connection request');
        }
    };

    /* ── Loading ─────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="tenant-dashboard-root">
                <Sidebar />
                <div className="main-wrapper">
                    <Header />
                    <main className="content-area" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
                        <div className="rmx"><div className="rm-spinner" /></div>
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    /* ── Eligibility gate ────────────────────────────────────── */
    if (eligibility && !eligibility.eligible) {
        return (
            <div className="tenant-dashboard-root">
                <Sidebar />
                <div className="main-wrapper">
                    <Header />
                    <main className="content-area">
                        <EligibilityGate reasons={eligibility.reasons} />
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    /* ── Main (Wish-First) ───────────────────────────────────── */
    return (
        <div className="tenant-dashboard-root">
            <Sidebar />
            <div className="main-wrapper">
                <Header />
                <main className="content-area">
                    <div className="rmx">
                        <div className="page-head" style={{ marginBottom: 26 }}>
                            <div className="crumb"><Users size={14} /> Matching <ArrowRight size={13} /> <b>Roommates</b></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                <h1>Make a <span className="g">wish</span>. Meet your roommate.</h1>
                                <div className="subseg">
                                    <button className={tab === 'B' ? 'on' : ''} onClick={() => setTab('B')}><Search size={16} />Find a place</button>
                                    <button className={tab === 'A' ? 'on' : ''} onClick={() => setTab('A')}><Home size={16} />My lease</button>
                                </div>
                            </div>
                        </div>

                        {tab === 'A' ? (
                            <LeaseSection onView={setProfile} />
                        ) : (
                            <>
                                <WishBar state={wish} hero />
                                <WishResults state={wish} youHabits={youHabits} onConnect={handleConnect} onView={setProfile} />

                                <div className="or-divider">
                                    <div className="ln" />
                                    <span>Or browse smart matches</span>
                                    <div className="ln" />
                                </div>

                                <YouStrip name={youName} avatar={youAvatar} habits={youHabits} onEdit={() => navigate('/settings')} />
                                <Filters f={filters} setF={setFilters} />
                                <div className="panel-head">
                                    <div>
                                        <h2>Compatible roommates near you</h2>
                                        <p>Habit-based matching, no AI — ranked by your combined lifestyle fit.</p>
                                    </div>
                                    <span className="count-pill">{smart.length} people</span>
                                </div>
                                {smartLoading ? (
                                    <div style={{ display: 'grid', placeItems: 'center', padding: 50 }}><div className="rm-spinner" /></div>
                                ) : (
                                    <SmartGrid
                                        candidates={smart.map((c) => ({ ...c, conn: connFor(c) }))}
                                        youHabits={youHabits}
                                        onConnect={handleConnect}
                                        onView={setProfile}
                                    />
                                )}
                            </>
                        )}

                        <ProfileModal
                            cand={profile}
                            conn={profile ? connFor(profile) : 'none'}
                            onConnect={(c) => { handleConnect(c); setProfile(null); }}
                            onClose={() => setProfile(null)}
                        />
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default RoommateMatching;
