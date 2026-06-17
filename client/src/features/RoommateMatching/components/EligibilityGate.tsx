import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircle, CheckCircle2, ArrowRight, Sparkles, Lock } from 'lucide-react';
import '../pages/RoommateMatching.css';

interface EligibilityGateProps {
    reasons: string[];
}

const EligibilityGate: React.FC<EligibilityGateProps> = ({ reasons = [] }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const hasReason = (r: string) => Array.isArray(reasons) && reasons.includes(r);

    return (
        <div className="rmx">
            <div className="gate animate-in">
                <div className="gate-lock">
                    <div className="main-icon"><Lock size={30} /></div>
                    <div className="sparkle"><Sparkles size={14} /></div>
                </div>

                <h2>{t('roommate.gateTitle', 'Unlock')} <span className="hl">{t('roommate.gateHighlight', 'Roommate Matching')}</span></h2>
                <p>{t('roommate.gateSub', 'Complete your verification and lifestyle profile to access HOMI Wish and Smart Match.')}</p>

                <div className="gate-grid">
                    <div className={`gate-card ${!hasReason('PROFILE_INCOMPLETE') ? 'done' : ''}`}>
                        <div className={`icon-box ${hasReason('PROFILE_INCOMPLETE') ? 'pending' : 'complete'}`}>
                            {hasReason('PROFILE_INCOMPLETE') ? <UserCircle size={22} /> : <CheckCircle2 size={22} />}
                        </div>
                        <h4>{t('roommate.identityProfileTitle', 'Identity Profile')}</h4>
                        <span className="sub">{t('roommate.identityProfileDesc', 'Verification, gender, and birthdate.')}</span>
                    </div>

                    <div className={`gate-card ${!hasReason('INSUFFICIENT_HABITS') ? 'done' : ''}`}>
                        <div className={`icon-box ${hasReason('INSUFFICIENT_HABITS') ? 'pending' : 'complete'}`}>
                            {hasReason('INSUFFICIENT_HABITS') ? <Sparkles size={22} /> : <CheckCircle2 size={22} />}
                        </div>
                        <h4>{t('roommate.lifestyleProfileTitle', 'Lifestyle Profile')}</h4>
                        <span className="sub">{t('roommate.lifestyleProfileDesc', 'Answer the 8 quick lifestyle questions.')}</span>
                    </div>
                </div>

                <button className="btn btn-primary" onClick={() => navigate('/settings')}>
                    {t('roommate.updateMyProfile', 'Update My Profile')} <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default EligibilityGate;

