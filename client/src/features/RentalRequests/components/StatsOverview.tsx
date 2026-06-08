import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaUsers, FaChartLine, FaClock } from 'react-icons/fa';
import './StatsOverview.css';

interface StatsOverviewProps {
    totalApplicants: number;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ totalApplicants }) => {
    const { t } = useTranslation();
    return (
        <div className="stats-container">
            <div className="stat-card">
                <div className="stat-icon-wrapper blue">
                    <FaUsers />
                </div>
                <div className="stat-content">
                    <label>{t('rentalRequests.stats.totalRequests')}</label>
                    <div className="stat-value-group">
                        <h2>{totalApplicants}</h2>
                        <span className="trend positive">+12%</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default StatsOverview;