import React from 'react';
import type { RoommateMatch } from '../types/roommateMatchingTypes';
import { MapPin, Check, Zap, User, ShieldCheck } from 'lucide-react';
import '../pages/RoommateMatching.css';

interface MatchCardProps {
    match: RoommateMatch;
    currentUserId: string;
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, currentUserId, onAccept, onDecline }) => {
    const isAccepted = match.status === 'ACCEPTED';
    const otherUser = match.requester_id === currentUserId ? match.matchedUser : match.requester;
    const otherRequest = match.requester_id === currentUserId ? match.matchedRequest : match.request;
    const locationCity = otherRequest?.preferred_city || 'Cairo';
    const locationArea = otherRequest?.preferred_area || '';
    const displayLocation = locationArea ? `${locationArea}, ${locationCity}` : locationCity;
    const compatibility = Math.round(match.compatibility_score);
    const currentUserAction = match.requester_id === currentUserId ? match.requester_action : match.matched_user_action;

    const scoreClass = compatibility >= 80 ? 'rm-score-high' : compatibility >= 60 ? 'rm-score-mid' : 'rm-score-low';

    return (
        <div className="rm-card">
            {/* Gradient Header */}
            <div className="rm-card-header">
                <div className={`rm-score-badge ${scoreClass}`}>
                    <Zap size={14} fill="currentColor" />
                    {compatibility}% Match
                </div>
                {match.status === 'PENDING' && (
                    <span className="rm-new-pill">New</span>
                )}
            </div>

            {/* Body */}
            <div className="rm-card-body">
                {/* Avatar */}
                <div className="rm-avatar-wrap">
                    <div className="rm-avatar">
                        {otherUser?.profile?.avatar_url ? (
                            <img src={otherUser.profile.avatar_url} alt="Profile" />
                        ) : (
                            <User size={32} color="#cbd5e1" />
                        )}
                    </div>
                </div>

                {/* Name */}
                <div className="rm-card-name">
                    <h3>{otherUser?.profile?.first_name || 'HOMi User'}</h3>
                    <div className="rm-card-location">
                        <MapPin size={13} /> {displayLocation}
                    </div>
                </div>

                {/* Reason */}
                <div className="rm-card-reason">
                    <div className="label">Why you'll match</div>
                    <div className="text">
                        "{match.ai_explanation || 'Compatible habits and lifestyle preferences.'}"
                    </div>
                </div>

                {/* Actions */}
                <div className="rm-card-actions">
                    {match.status === 'PENDING' && currentUserAction === 'NONE' ? (
                        <>
                            <button className="rm-btn-skip" onClick={() => onDecline(match.id)}>
                                Skip
                            </button>
                            <button className="rm-btn-connect" onClick={() => onAccept(match.id)}>
                                <Check size={18} /> Connect
                            </button>
                        </>
                    ) : match.status === 'PENDING' && currentUserAction === 'ACCEPTED' ? (
                        <div className="rm-status-result" style={{ background: '#f1f5f9', color: '#64748b' }}>
                            Waiting for response...
                        </div>
                    ) : (
                        <div className={`rm-status-result ${isAccepted ? 'rm-status-accepted' : 'rm-status-declined'}`}>
                            {isAccepted ? (
                                <><ShieldCheck size={18} /> Mutual Match!</>
                            ) : (
                                'Declined'
                            )}
                        </div>
                    )}
                </div>
                {isAccepted && (
                    <p className="rm-mutual-hint">Check your messages to connect</p>
                )}
            </div>
        </div>
    );
};

export default MatchCard;
