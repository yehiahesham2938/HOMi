import React, { useState, useEffect } from 'react';
import { roommateMatchingService } from '../services/roommateMatchingService';
import contractService from '../../../services/contract.service';
import type { LandlordContract } from '../../../services/contract.service';
import type { RoommateRequest, RoommateMatch, EligibilityResponse } from '../types/roommateMatchingTypes';
import EligibilityGate from '../components/EligibilityGate';
import MatchCard from '../components/MatchCard';
import CreateRequestModal from '../components/CreateRequestModal';
import { Search, Home, UserPlus, RefreshCw, Loader2, ArrowRight, ShieldCheck, Sparkles, MapPin } from 'lucide-react';

// Global Layout Components
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Tenant/sidebar';
import Footer from '../../../components/global/footer';
import '../../home/pages/TenantHome.css'; // Reuse dashboard layout styles
import './RoommateMatching.css';

/**
 * RoommateMatching Component
 * Main feature page for finding roommates and apartments.
 * Handles AI-based matching, eligibility checks, and request creation.
 */
const RoommateMatching: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'SEARCH_APARTMENT' | 'SEARCH_ROOMMATE'>('SEARCH_APARTMENT');
    const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
    const [myRequest, setMyRequest] = useState<RoommateRequest | null>(null);
    const [matches, setMatches] = useState<RoommateMatch[]>([]);
    const [activeContracts, setActiveContracts] = useState<LandlordContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [matchingInProgress, setMatchingInProgress] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchData = async () => {
        try {
            setLoading(true);
            const el = await roommateMatchingService.checkEligibility();
            setEligibility(el);

            if (el.eligible) {
                const [req, contractsRes] = await Promise.all([
                    roommateMatchingService.getMyActiveRequest(),
                    contractService.getTenantContracts({ status: 'ACTIVE' })
                ]);
                
                setActiveContracts(contractsRes.data || []);
                setMyRequest(req);
                
                if (req) {
                    setActiveTab(req.type);
                    const m = await roommateMatchingService.getMatches();
                    setMatches(m);
                }
            }
        } catch (error) {
            console.error('Error fetching matching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateRequest = async (data: any) => {
        try {
            const req = await roommateMatchingService.createRequest(data);
            setMyRequest(req);
            setShowCreateModal(false);
            handleFindMatches(req.id);
        } catch (error: any) {
            alert('Failed to create request: ' + (error.response?.data?.message || error.message || 'Unknown error'));
        }
    };

    const handleFindMatches = async (requestId: string) => {
        try {
            setMatchingInProgress(true);
            await roommateMatchingService.findMatches(requestId);
            const m = await roommateMatchingService.getMatches();
            setMatches(m);
        } catch (error) {
            console.error('Matching failed:', error);
        } finally {
            setMatchingInProgress(false);
        }
    };

    const handleAcceptMatch = async (matchId: string) => {
        try {
            await roommateMatchingService.respondToMatch(matchId, 'ACCEPTED');
            const m = await roommateMatchingService.getMatches();
            setMatches(m);
        } catch (error) {
            alert('Action failed');
        }
    };

    const handleDeclineMatch = async (matchId: string) => {
        try {
            await roommateMatchingService.respondToMatch(matchId, 'DECLINED');
            const m = await roommateMatchingService.getMatches();
            setMatches(m);
        } catch (error) {
            alert('Action failed');
        }
    };

    const handleCancelRequest = async () => {
        if (!myRequest) return;
        if (window.confirm('Are you sure you want to cancel your matching request?')) {
            try {
                await roommateMatchingService.cancelRequest(myRequest.id);
                setMyRequest(null);
                setMatches([]);
            } catch (error) {
                alert('Cancel failed');
            }
        }
    };

    /* ── Loading state ─────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="tenant-dashboard-root">
                <Sidebar />
                <div className="main-wrapper">
                    <Header />
                    <main className="content-area" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
                        <Loader2 className="animate-spin" size={42} style={{ color: '#197cf8' }} />
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    /* ── Eligibility gate ──────────────────────────────────────── */
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

    /* ── Main page ─────────────────────────────────────────────── */
    return (
        <div className="tenant-dashboard-root">
            <Sidebar />
            <div className="main-wrapper">
                <Header />
                <main className="content-area animate-fade-in">

                    {/* Page Header */}
                    <div className="rm-page-header">
                        <h1>
                            <span className="gradient-text">Roommate</span> Matching
                        </h1>
                        <p>AI-powered compatibility scoring for your next shared home.</p>
                        {myRequest && (
                            <button className="rm-cancel-btn" onClick={handleCancelRequest}>
                                Cancel My Request
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="rm-tabs">
                        <div className="rm-tabs-inner">
                            <button
                                onClick={() => !myRequest && setActiveTab('SEARCH_APARTMENT')}
                                disabled={!!myRequest && myRequest.type !== 'SEARCH_APARTMENT'}
                                className={`rm-tab ${activeTab === 'SEARCH_APARTMENT' ? 'active' : ''}`}
                            >
                                <Home size={17} /> Search for Apartment
                            </button>
                            <button
                                onClick={() => !myRequest && setActiveTab('SEARCH_ROOMMATE')}
                                disabled={!!myRequest && myRequest.type !== 'SEARCH_ROOMMATE'}
                                className={`rm-tab ${activeTab === 'SEARCH_ROOMMATE' ? 'active' : ''}`}
                            >
                                <UserPlus size={17} /> Search for Roommate
                            </button>
                        </div>
                    </div>

                    {/* ── No request: CTA state ──────────────────────────── */}
                    {!myRequest ? (
                        <div className="rm-empty-state">
                            <div className="rm-empty-icon">
                                {activeTab === 'SEARCH_APARTMENT' ? <Home size={40} /> : <UserPlus size={40} />}
                            </div>
                            <h2>
                                {activeTab === 'SEARCH_APARTMENT'
                                    ? 'Find your dream shared home'
                                    : 'Find the perfect roommate'}
                            </h2>
                            <p>
                                {activeTab === 'SEARCH_APARTMENT'
                                    ? 'Join our matching pool to find verified tenants who have an active contract and are looking for a compatible roommate.'
                                    : 'List your room and let our AI find the most compatible candidates based on habits, lifestyle, and preferences.'}
                            </p>
                            <button className="rm-cta-btn" onClick={() => setShowCreateModal(true)}>
                                Create My Request <ArrowRight size={18} />
                            </button>
                            <div className="rm-badges">
                                <span><ShieldCheck size={16} /> AI Verified</span>
                                <span><Sparkles size={16} /> Best Matches</span>
                            </div>
                        </div>
                    ) : (
                        /* ── Has request: banner + matches ───────────────── */
                        <>
                            {/* Active Request Banner */}
                            <div className="rm-active-banner">
                                <div className="rm-banner-left">
                                    <div className="rm-banner-icon">
                                        <RefreshCw className={matchingInProgress ? 'animate-spin' : ''} size={24} />
                                    </div>
                                    <div className="rm-banner-info">
                                        <div className="rm-banner-badges">
                                            <span className="rm-status-pill">Active</span>
                                            <span className="rm-status-dot" />
                                        </div>
                                        <h3>
                                            {myRequest.type === 'SEARCH_APARTMENT'
                                                ? 'Searching for Apartment'
                                                : 'Searching for Roommate'}
                                        </h3>
                                        <p className="rm-banner-meta">
                                            <MapPin size={14} />
                                            {myRequest.preferred_area || 'Current Location'}
                                            {myRequest.budget_min || myRequest.budget_max
                                                ? ` • ${myRequest.budget_min}–${myRequest.budget_max} EGP`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className="rm-refresh-btn"
                                    onClick={() => handleFindMatches(myRequest.id)}
                                    disabled={matchingInProgress}
                                >
                                    <RefreshCw size={16} className={matchingInProgress ? 'animate-spin' : ''} />
                                    {matchingInProgress ? 'Matching…' : 'Refresh Matches'}
                                </button>
                            </div>

                            {/* Matches Section */}
                            <div>
                                <div className="rm-matches-header">
                                    <div>
                                        <h2>Recommended for You</h2>
                                        <p>Our AI analyzed compatibility factors to find these matches.</p>
                                    </div>
                                    <span className="rm-match-count">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                                </div>

                                {matches.length > 0 ? (
                                    <div className="rm-matches-grid">
                                        {matches.map(match => (
                                            <MatchCard
                                                key={match.id}
                                                match={match}
                                                currentUserId={currentUser.id}
                                                onAccept={handleAcceptMatch}
                                                onDecline={handleDeclineMatch}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rm-no-matches">
                                        <div className="rm-no-matches-icon"><Search size={32} /></div>
                                        <h3>No matches found yet</h3>
                                        <p>We're still searching for the perfect roommate. Try refreshing or check back later!</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </main>
                <Footer />
            </div>

            {showCreateModal && (
                <CreateRequestModal
                    type={activeTab}
                    activeContracts={activeContracts}
                    activeContractId={null}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateRequest}
                />
            )}
        </div>
    );
};

export default RoommateMatching;
