import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin, Check, Bed, Sparkles, Briefcase, Wallet, CheckCircle2, Search, X } from 'lucide-react';
import Avatar from './Avatar';
import { roommateMatchingService } from '../services/roommateMatchingService';
import type { Lease, RoomConfig, IncomingRequest, SmartCandidate, WishMatch } from '../types/roommateMatchingTypes';

interface LeaseSectionProps {
    onView: (cand: SmartCandidate | WishMatch) => void;
}

function incomingToCandidate(r: IncomingRequest): SmartCandidate {
    return {
        id: r.userId,
        requestId: null,
        name: r.name,
        avatar: r.avatar,
        gender: r.gender,
        age: r.age,
        city: null,
        area: null,
        verified: r.verified,
        bio: r.bio,
        budget: null,
        moveIn: null,
        note: r.note,
        habits: r.habits,
        score: r.score,
        breakdown: r.breakdown,
        top: r.top,
        conn: 'received',
    };
}

const LeasePicker: React.FC<{ leases: Lease[]; sel: string; setSel: (id: string) => void }> = ({ leases, sel, setSel }) => {
    const { t } = useTranslation();
    return (
        <div className="lease-pick">
            <div className="panel-head" style={{ margin: '0 0 4px' }}>
                <div><h2>{t('roommate.yourLeases', 'Your leases')}</h2><p>{t('roommate.pickHomeToList', 'Pick a home to list a room in')}</p></div>
            </div>
            {leases.map((l) => (
                <div key={l.id} className={'lcard' + (sel === l.id ? ' on' : '')} onClick={() => setSel(l.id)}>
                    <div className="lcard-img">
                        <div className="ph"><Building2 size={30} /></div>
                        <span className="badge"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />{t('roommate.activeLease', 'Active lease')}</span>
                        <span className="on-dot"><Check size={14} /></span>
                    </div>
                    <div className="lcard-b">
                        <h3>{l.title}</h3>
                        <div className="addr"><MapPin size={13} color="#197cf8" />{l.addr}</div>
                        <div className="lcard-stats">
                            <div className="lstat"><div className="v">{l.beds}</div><div className="l">{t('roommate.bedrooms', 'Bedrooms')}</div></div>
                            <div className="lstat"><div className="v">{l.beds - l.occupied}</div><div className="l">{t('roommate.available', 'Available')}</div></div>
                            <div className="lstat"><div className="v">{(l.totalRent / 1000).toFixed(1)}k</div><div className="l">{t('roommate.totalMo', 'Total / mo')}</div></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const RoomConfigPanel: React.FC<{ lease: Lease; onSaved: () => void }> = ({ lease, onSaved }) => {
    const { t } = useTranslation();
    const openable = lease.beds - lease.occupied;
    const [openCount, setOpenCount] = useState(lease.roommatesWanted);
    const [rooms, setRooms] = useState<RoomConfig[]>(lease.rooms);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setOpenCount(lease.roommatesWanted);
        setRooms(lease.rooms);
    }, [lease.id]);

    const setRent = (i: number, v: number) => setRooms(rooms.map((r, j) => (j === i ? { ...r, rent: v } : r)));

    const save = async () => {
        setSaving(true);
        try {
            const payload = rooms.map((r, i) => ({
                ...r,
                listed: i >= lease.occupied && i - lease.occupied < openCount,
            }));
            await roommateMatchingService.saveLeaseConfig(lease.id, { roommatesWanted: openCount, rooms: payload });
            onSaved();
        } catch {
            alert(t('roommate.saveConfigFailed', 'Failed to save lease configuration'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="room-config">
            <div className="rc-head">
                <h3>{t('roommate.roomsRent', 'Rooms & rent')}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rm-muted)' }}>{t('roommate.roommatesWanted', 'Roommates wanted')}</span>
                    <div className="stepper">
                        <button onClick={() => setOpenCount(Math.max(1, openCount - 1))}>−</button>
                        <span className="val">{openCount}</span>
                        <button onClick={() => setOpenCount(Math.min(openable, openCount + 1))}>+</button>
                    </div>
                </div>
            </div>
            <div className="rooms">
                {rooms.map((r, i) => {
                    const yours = i < lease.occupied;
                    const listed = !yours && i - lease.occupied < openCount;
                    return (
                        <div className="room" key={i} style={!listed && !yours ? { opacity: 0.55 } : undefined}>
                            <div className="ri"><Bed size={18} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="rn">{r.name}{r.ensuite && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue-500)', marginLeft: 7 }}>· {t('roommate.ensuite', 'en-suite')}</span>}</div>
                                <div className="rs">{yours ? t('roommate.occupiedByYou', 'Occupied by you') : listed ? t('roommate.listedForRoommate', 'Listed for a roommate') : t('roommate.notListed', 'Not listed')}</div>
                            </div>
                            {yours ? (
                                <span className="occ">{t('roommate.yourRoom', 'Your room')}</span>
                            ) : (
                                <div className="rent">
                                    <input type="number" value={r.rent} disabled={!listed} onChange={(e) => setRent(i, Number(e.target.value))} />
                                    <span className="cur">{t('roommate.egpMo', 'EGP/mo')}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="rc-note">
                <Sparkles size={16} color="#197cf8" />
                {t('roommate.listingNote', { count: openCount, post: openCount !== 1 ? 's' : '', defaultValue: `Listing ${openCount} room${openCount !== 1 ? 's' : ''} · HOMI surfaces your lease to compatible roommate seekers automatically.` })}
            </div>
            <div className="rc-save">
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                    <Check size={16} />{saving ? t('roommate.savingBtn', 'Saving…') : t('roommate.saveListingBtn', 'Save listing')}
                </button>
            </div>
        </div>
    );
};

const RequestRow: React.FC<{ req: IncomingRequest; status: string; onAct: (id: string, v: string) => void; onView: (c: SmartCandidate) => void }> = ({ req, status, onAct, onView }) => {
    const { t } = useTranslation();
    return (
        <div className="reqcard">
            <Avatar name={req.name} avatar={req.avatar} size={54} radius={14} />
            <div className="ri">
                <h4>{req.name}{req.verified && <span style={{ color: 'var(--blue-500)', display: 'inline-grid' }}><CheckCircle2 size={15} /></span>}</h4>
                <div className="sub">
                    {req.age != null && <span><Briefcase size={12} />{t('roommate.yearsText', { count: req.age, defaultValue: `${req.age} yrs` })}</span>}
                    {req.note && <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Wallet size={12} />{req.note}</span>}
                </div>
            </div>
            <div className="req-score"><div className="n">{req.score}%</div><div className="l">{t('roommate.matchPercent', 'Match')}</div></div>
            {status === 'pending' ? (
                <div className="req-act">
                    <button className="icon-btn view" title={t('roommate.viewFullProfile', 'View full profile')} onClick={() => onView(incomingToCandidate(req))}><Search size={17} /></button>
                    <button className="icon-btn no" title={t('roommate.rejectBtn', 'Reject')} onClick={() => onAct(req.matchId, 'declined')}><X size={18} /></button>
                    <button className="icon-btn yes" title={t('roommate.approveBtn', 'Approve')} onClick={() => onAct(req.matchId, 'approved')}><Check size={18} /></button>
                </div>
            ) : status === 'approved' ? (
                <span className="req-done ok"><Check size={14} />{t('roommate.approvedStatus', 'Approved')}</span>
            ) : (
                <span className="req-done dec"><X size={14} />{t('roommate.declinedStatus', 'Declined')}</span>
            )}
        </div>
    );
};

const LeaseSection: React.FC<LeaseSectionProps> = ({ onView }) => {
    const { t } = useTranslation();
    const [leases, setLeases] = useState<Lease[]>([]);
    const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
    const [sel, setSel] = useState<string>('');
    const [status, setStatus] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const [ls, inc] = await Promise.all([
                roommateMatchingService.getLeases(),
                roommateMatchingService.getIncomingRequests(),
            ]);
            setLeases(ls);
            setIncoming(inc);
            setStatus(Object.fromEntries(inc.map((r) => [r.matchId, 'pending'])));
            if (ls.length && !sel) setSel(ls[0].id);
        } catch (e) {
            console.error('Failed to load leases', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const onAct = async (matchId: string, v: string) => {
        setStatus((s) => ({ ...s, [matchId]: v }));
        try {
            await roommateMatchingService.respondToRequest(matchId, v === 'approved' ? 'ACCEPTED' : 'DECLINED');
        } catch {
            setStatus((s) => ({ ...s, [matchId]: 'pending' }));
            alert(t('roommate.actionFailed', 'Action failed'));
        }
    };

    if (loading) {
        return <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="rm-spinner" /></div>;
    }

    if (leases.length === 0) {
        return (
            <div className="empty">
                <div className="ei"><Building2 size={26} /></div>
                <h3>{t('roommate.noActiveLeases', 'No active leases to list')}</h3>
                <p>{t('roommate.noActiveLeasesDesc', 'Once you have an active contract, you can list rooms here and review roommate requests.')}</p>
            </div>
        );
    }

    const lease = leases.find((l) => l.id === sel) || leases[0];
    const pending = incoming.filter((r) => status[r.matchId] === 'pending').length;

    return (
        <div className="lease-wrap">
            <LeasePicker leases={leases} sel={lease.id} setSel={setSel} />
            <div className="lease-detail">
                <RoomConfigPanel lease={lease} key={lease.id} onSaved={load} />
                <div>
                    <div className="panel-head">
                        <div><h2>{t('roommate.incomingRequestsTitle', 'Incoming roommate requests')}</h2><p>{t('roommate.incomingRequestsSub', 'Tenants who want to share your place')}</p></div>
                        <span className="count-pill">{t('roommate.pendingCount', { count: pending, defaultValue: `${pending} pending` })}</span>
                    </div>
                    {incoming.length === 0 ? (
                        <div className="empty">
                            <div className="ei"><Search size={26} /></div>
                            <h3>{t('roommate.noRequestsYet', 'No requests yet')}</h3>
                            <p>{t('roommate.noRequestsYetDesc', 'When seekers send you a connection request, they’ll appear here for you to approve or reject.')}</p>
                        </div>
                    ) : (
                        <div className="req-list">
                            {incoming.map((r) => (
                                <RequestRow key={r.matchId} req={r} status={status[r.matchId]} onAct={onAct} onView={onView} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeaseSection;

