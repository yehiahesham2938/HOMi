import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../../components/global/header';
import Footer from '../../../../components/global/footer';
import Sidebar from '../../../../components/global/Landlord/sidebar';
import LiveTrackingModal from '../components/LiveTrackingModal';
import ApplicationsModal from '../components/ApplicationsModal';
import './LandlordMaintenance.css';
import {
    FaTools, FaClock, FaExclamationTriangle, FaWallet
} from 'react-icons/fa';
import DetailedIssueModal from '../components/DetailedIssueModal';
import IssuePostCard from '../components/IssuePostCard';
import maintenanceService, {
    type MaintenanceRequest,
} from '../../../../services/maintenance.service';
import socketService from '../../../../services/socket.service';
import Loader from '../../../../components/global/Loader';



const LandlordMaintenance: React.FC = () => {
    const { t } = useTranslation();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
    const [trackRequest, setTrackRequest] = useState<MaintenanceRequest | null>(null);
    const [appsRequest, setAppsRequest] = useState<MaintenanceRequest | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const list = await maintenanceService.listLandlordRequests();
            setRequests(list);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load maintenance.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        socketService.connect();
        const handler = () => { void load(); };
        socketService.onMaintenanceStatus(handler);
        socketService.onNotificationNew(handler);
        return () => {
            socketService.offMaintenanceStatus(handler);
            socketService.offNotificationNew(handler);
        };
    }, [load]);

    const totals = useMemo(() => {
        const active = requests.filter((r) => !['COMPLETED', 'CANCELLED', 'RESOLVED_BY_ADMIN'].includes(r.status));
        const onLandlord = requests.filter((r) => r.chargeParty === 'LANDLORD');
        const totalLandlordCharges = onLandlord.reduce((s, r) => s + (r.agreedPrice ?? 0), 0);
        const open = requests.filter((r) => r.status === 'OPEN').length;
        return {
            active: active.length,
            open,
            disputes: requests.filter((r) => r.status === 'DISPUTED').length,
            landlordCharges: totalLandlordCharges,
        };
    }, [requests]);

    return (
        <div className="landlord-maintenance-hub-wrapper">
            <div className="landlord-maintenance-layout">
                <Sidebar />
                <div className="landlord-maintenance-content">
                    <Header />

                    <main className="maintenance-main-container">
                        <header className="maintenance-hero">
                            <div className="hero-glass-mesh"></div>
                            <div className="hero-text">
                                <span className="pre-title">Property care overview</span>
                                <h1>Maintenance for your properties</h1>
                                <p>Watch over every maintenance event happening at your properties — fully transparent.</p>
                            </div>

                            <div className="maintenance-quick-stats">
                                <div className="mini-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaTools className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{totals.active}</span>
                                        <span className="stat-desc">Active issues</span>
                                    </div>
                                </div>
                                <div className="mini-stat accent">
                                    <div className="stat-icon-wrapper">
                                        <FaClock className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{totals.open}</span>
                                        <span className="stat-desc">Awaiting maintainer</span>
                                    </div>
                                </div>
                                <div className="mini-stat warning-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaExclamationTriangle className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">{totals.disputes}</span>
                                        <span className="stat-desc">Open disputes</span>
                                    </div>
                                </div>
                                <div className="mini-stat wallet-stat">
                                    <div className="stat-icon-wrapper">
                                        <FaWallet className="stat-icon" />
                                    </div>
                                    <div className="stat-text-group">
                                        <span className="stat-num">EGP {totals.landlordCharges.toFixed(0)}</span>
                                        <span className="stat-desc">Charged to you</span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {error && <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, marginBottom: '1rem' }}>{error}</div>}

                        <section className="l-tab-content-wrapper">
                            <div className="l-tab-pane animate-in">
                                <div className="l-section-header">
                                    <div>
                                        <h2>All maintenance requests</h2>
                                        <p>Notifications about each event are also delivered to your inbox.</p>
                                    </div>
                                </div>

                                {loading ? (
                                    <Loader text="Loading maintenance data..." />
                                ) : requests.length === 0 ? (
                                    <div className="empty-state-container">
                                        <div className="empty-state-icon-box"><FaTools /></div>
                                        <h3>No maintenance yet</h3>
                                        <p>You'll see issues here as soon as your tenants report any.</p>
                                    </div>
                                ) : (
                                    <div className="marketplace-grid">
                                        {requests.map((req) => (
                                            <IssuePostCard
                                                key={req.id}
                                                request={req}
                                                role="LANDLORD"
                                                onDetails={setSelected}
                                                onBids={setAppsRequest}
                                                onTrack={setTrackRequest}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>

                    <DetailedIssueModal
                        isOpen={!!selected}
                        onClose={() => setSelected(null)}
                        isViewOnly
                        initialData={selected}
                        onPostSuccess={() => {}}
                    />

                    {trackRequest && (
                        <LiveTrackingModal
                            isOpen
                            onClose={() => setTrackRequest(null)}
                            request={trackRequest}
                        />
                    )}

                    <ApplicationsModal
                        isOpen={!!appsRequest}
                        onClose={() => setAppsRequest(null)}
                        request={appsRequest}
                        onAccepted={() => {
                            setAppsRequest(null);
                            void load();
                        }}
                    />

                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default LandlordMaintenance;
