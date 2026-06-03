import { useNavigate } from 'react-router-dom';
import { Building2, Users, Wrench } from 'lucide-react';
import GuestNavbar from '../../../components/guest/GuestNavbar';
import '../../Guest/pages/GuestHome.css';
import './HowItWorksChoose.css';

const guestFlowState = { fromGuestHome: true as const };

/**
 * Public entry: guest picks tenant vs landlord vs maintenance story, then continues to the matching How it Works page.
 */
const HowItWorksChoose = () => {
  const navigate = useNavigate();

  return (
    <div className="guest-layout hiw-choose-layout">
      <GuestNavbar />

      <main className="hiw-choose-main">
        <div className="hiw-choose-inner">
          <p className="hiw-choose-eyebrow">How it works</p>
          <h1 className="hiw-choose-title">Who are you here for?</h1>
          <p className="hiw-choose-lede">
            Pick a path to see how HOMi fits your journey — renting a home, listing properties, or providing services.
          </p>

          <div className="hiw-choose-grid">
            <button
              type="button"
              className="hiw-choose-card hiw-choose-card--tenant"
              onClick={() => navigate('/for-tenants', { state: guestFlowState })}
            >
              <span className="hiw-choose-card-icon" aria-hidden>
                <Users size={36} strokeWidth={1.75} />
              </span>
              <h2>For tenants</h2>
              <p>Browse verified homes, apply online, sign digitally, and pay rent securely.</p>
              <span className="hiw-choose-card-cta">View tenant guide →</span>
            </button>

            <button
              type="button"
              className="hiw-choose-card hiw-choose-card--landlord"
              onClick={() => navigate('/for-landlords', { state: guestFlowState })}
            >
              <span className="hiw-choose-card-icon" aria-hidden>
                <Building2 size={36} strokeWidth={1.75} />
              </span>
              <h2>For landlords</h2>
              <p>List properties, review applicants, collect rent, and stay organized in one place.</p>
              <span className="hiw-choose-card-cta">View landlord guide →</span>
            </button>

            <button
              type="button"
              className="hiw-choose-card hiw-choose-card--maintenance"
              onClick={() => navigate('/for-maintenance', { state: guestFlowState })}
            >
              <span className="hiw-choose-card-icon" aria-hidden>
                <Wrench size={36} strokeWidth={1.75} />
              </span>
              <h2>For maintenance</h2>
              <p>Register as a provider, view local job requests, track earnings, and coordinate with clients.</p>
              <span className="hiw-choose-card-cta">View provider guide →</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HowItWorksChoose;
