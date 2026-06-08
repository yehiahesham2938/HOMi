import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCircle, CheckCircle2, ArrowRight, Sparkles, Lock } from 'lucide-react';
import '../pages/RoommateMatching.css';

interface EligibilityGateProps {
    reasons: string[];
}

const EligibilityGate: React.FC<EligibilityGateProps> = ({ reasons = [] }) => {
    const navigate = useNavigate();
    const hasReason = (r: string) => Array.isArray(reasons) && reasons.includes(r);

    return (
        <div className="rm-eligibility animate-fade-in">
            {/* Lock Icon */}
            <div className="rm-lock-icon">
                <div className="main-icon">
                    <Lock size={30} />
                </div>
                <div className="sparkle">
                    <Sparkles size={14} />
                </div>
            </div>

            <h2>
                Unlock <span className="hl">Roommate Matching</span>
            </h2>
            <p>
                Complete your verification and lifestyle profile to access our AI-powered matching pool.
            </p>

            {/* Requirements Grid */}
            <div className="rm-req-grid">
                {/* Identity Profile */}
                <div className={`rm-req-card ${!hasReason('PROFILE_INCOMPLETE') ? 'done' : ''}`}>
                    <div className={`icon-box ${hasReason('PROFILE_INCOMPLETE') ? 'pending' : 'complete'}`}>
                        {hasReason('PROFILE_INCOMPLETE') ? <UserCircle size={22} /> : <CheckCircle2 size={22} />}
                    </div>
                    <h4>Identity Profile</h4>
                    <span className="sub">Verification, gender, and birthdate.</span>
                    {!hasReason('PROFILE_INCOMPLETE') && (
                        <CheckCircle2 size={15} strokeWidth={3} className="rm-req-check" />
                    )}
                </div>

                {/* Lifestyle Habits */}
                <div className={`rm-req-card ${!hasReason('INSUFFICIENT_HABITS') ? 'done' : ''}`}>
                    <div className={`icon-box ${hasReason('INSUFFICIENT_HABITS') ? 'pending' : 'complete'}`}>
                        {hasReason('INSUFFICIENT_HABITS') ? <Sparkles size={22} /> : <CheckCircle2 size={22} />}
                    </div>
                    <h4>Lifestyle Habits</h4>
                    <span className="sub">Select at least 3 habits.</span>
                    {!hasReason('INSUFFICIENT_HABITS') && (
                        <CheckCircle2 size={15} strokeWidth={3} className="rm-req-check" />
                    )}
                </div>
            </div>

            <button className="rm-gate-btn" onClick={() => navigate('/settings')}>
                Update My Profile <ArrowRight size={18} />
            </button>

            <div className="rm-badges" style={{ marginTop: '2rem' }}>
                <span><ShieldCheck size={14} /> Secured</span>
                <span><Sparkles size={14} /> AI Matching</span>
            </div>
        </div>
    );
};

export default EligibilityGate;
