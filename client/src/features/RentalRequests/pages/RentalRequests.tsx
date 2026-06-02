import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../components/global/header';
import Sidebar from '../../../components/global/Landlord/sidebar';
import Footer from '../../../components/global/footer';
import RequestCard from '../components/RequestCard';
import StatsOverview from '../components/StatsOverview';
import FilterTabs from '../components/FilterTabs';
import { FaInbox } from 'react-icons/fa'; // Added for the empty state
import rentalRequestService from '../../../services/rental-request.service';
import type { LandlordRentalRequest } from '../../../services/rental-request.service';
import './RentalRequests.css';

const RentalRequests: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('pending');
    const [requests, setRequests] = useState<LandlordRentalRequest[]>([]);

    const formatDate = (date?: string) => {
        if (!date) return t('rentalRequests.flexible', { defaultValue: 'Flexible' });
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
        return new Date(date).toLocaleDateString(locale, { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const refreshRequests = useCallback(async () => {
        try {
            const response = await rentalRequestService.getLandlordRequests();
            setRequests(response.data || []);
        } catch {
            setRequests([]);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void refreshRequests();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [refreshRequests]);

    const mappedRequests = useMemo(() => {
        return requests.map((req) => ({
            id: req.id,
            tenantId: req.tenant.id,
            propertyId: req.property.id,
            applicant: {
                name: `${req.tenant.firstName} ${req.tenant.lastName}`.trim(),
                image: req.tenant.avatarUrl?.trim() 
                    ? req.tenant.avatarUrl 
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(req.tenant.firstName + ' ' + req.tenant.lastName)}&background=random`,
                occupation: req.tenant.employment || t('sidebar.tenant'),
                company: req.tenant.workplace || '',
                income: req.tenant.income 
                    ? req.tenant.income.toString()
                    : t('rentalRequests.card.verified', { defaultValue: 'Verified' }),
                creditScore: 720,
                matchScore: 85,
                email: req.tenant.email,
                phoneNumber: req.tenant.phoneNumber || null,
                bio: req.tenant.bio || null,
            },
            property: {
                name: req.property.title,
                unit: req.property.address,
                rent: req.property.monthlyPrice ? `$${req.property.monthlyPrice}` : '',
                title: req.property.title,
            },
            status: req.status.toLowerCase(),
            message: req.message || '',
            moveInDate: formatDate(req.moveInDate),
            livingSituation: req.livingSituation.toLowerCase(),
            duration: req.duration.replace('_MONTHS', '').replace('_', ' '),
            occupants: req.occupants,
            habits: req.tenant.habits || [],
            appliedOnDate: formatDate(req.createdAt),
        }));
    }, [requests, t, i18n.language]);

    const tabCounts = useMemo(() => ({
        pending: mappedRequests.filter((req) => req.status === 'pending').length,
        review: mappedRequests.filter((req) => req.status === 'review' || req.status === 'under_review').length,
        approved: mappedRequests.filter((req) => req.status === 'approved').length,
        declined: mappedRequests.filter((req) => req.status === 'declined').length,
    }), [mappedRequests]);

    const currentRequests = useMemo(() => {
        if (activeTab === 'pending') return mappedRequests.filter((req) => req.status === 'pending');
        if (activeTab === 'review') return mappedRequests.filter((req) => req.status === 'review' || req.status === 'under_review');
        if (activeTab === 'approved') return mappedRequests.filter((req) => req.status === 'approved');
        if (activeTab === 'declined') return mappedRequests.filter((req) => req.status === 'declined');
        return mappedRequests;
    }, [activeTab, mappedRequests]);

    return (
        <div className="layout-wrapper" dir="ltr">
            <Sidebar />
            <div className="main-content">
                <Header />
                <main className="rental-requests-page">
                    <header className="page-intro">
                        <div className="intro-text">
                            <h1>{t('rentalRequests.requests')}</h1>
                            <p>{t('rentalRequests.managingRequests', { count: mappedRequests.length })}</p>
                        </div>
                        <StatsOverview totalApplicants={mappedRequests.length} />
                    </header>

                    <FilterTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={tabCounts} />

                    {/* Conditional Rendering for Empty State vs Grid */}
                    {currentRequests.length > 0 ? (
                        <div className="rental-requests-grid">
                            {currentRequests.map(req => (
                                <RequestCard key={req.id} data={req} onStatusChange={refreshRequests} />
                            ))}
                        </div>
                    ) : (
                        <div className="rr-empty-state-container">
                            <div className="rr-empty-state-icon">
                                <FaInbox />
                            </div>
                            <h3 className="rr-empty-state-title">{t('rentalRequests.noRequestsFound')}</h3>
                            <p className="rr-empty-state-text">{t('rentalRequests.noRequestsText')}</p>
                        </div>
                    )}

                </main>
                <Footer />
            </div>
        </div>
    );
};

export default RentalRequests;