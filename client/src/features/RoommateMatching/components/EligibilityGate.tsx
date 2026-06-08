import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, CheckCircle2, ArrowRight, Sparkles, Lock } from 'lucide-react';
import '../pages/RoommateMatching.css';

interface EligibilityGateProps {
    reasons: string[];
}

const EligibilityGate: React.FC<EligibilityGateProps> = ({ reasons = [] }) => {
    const navigate = useNavigate();
    const hasReason = (r: string) => Array.isArray(reasons) && reasons.includes(r);

    return (
        <div className="rmx">
            <div className="gate animate-in">
                <div className="gate-lock">
                    <div className="main-icon"><Lock size={30} /></div>
                    <div className="sparkle"><Sparkles size={14} /></div>
                </div>

                <h2>Unlock <span className="hl">Roommate Matching</span></h2>
                <p>Complete your verification and lifestyle profile to access HOMI Wish and Smart Match.</p>

                <div className="gate-grid">
                    <div className={`gate-card ${!hasReason('PROFILE_INCOMPLETE') ? 'done' : ''}`}>
                        <div className={`icon-box ${hasReason('PROFILE_INCOMPLETE') ? 'pending' : 'complete'}`}>
                            {hasReason('PROFILE_INCOMPLETE') ? <UserCircle size={22} /> : <CheckCircle2 size={22} />}
                        </div>
                        <h4>Identity Profile</h4>
                        <span className="sub">Verification, gender, and birthdate.</span>
                    </div>

                    <div className={`gate-card ${!hasReason('INSUFFICIENT_HABITS') ? 'done' : ''}`}>
                        <div className={`icon-box ${hasReason('INSUFFICIENT_HABITS') ? 'pending' : 'complete'}`}>
                            {hasReason('INSUFFICIENT_HABITS') ? <Sparkles size={22} /> : <CheckCircle2 size={22} />}
                        </div>
                        <h4>Lifestyle Profile</h4>
                        <span className="sub">Answer the 8 quick lifestyle questions.</span>
                    </div>
                </div>

                <button className="btn btn-primary" onClick={() => navigate('/settings')}>
                    Update My Profile <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default EligibilityGate;
