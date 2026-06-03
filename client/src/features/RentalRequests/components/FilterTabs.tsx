import React from 'react';
import { useTranslation } from 'react-i18next';
import './FilterTabs.css';

interface Props {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    counts: {
        pending: number;
        review: number;
        approved: number;
        declined: number;
    };
}

const FilterTabs: React.FC<Props> = ({ activeTab, setActiveTab, counts }) => {
    const { t } = useTranslation();
    const tabs = [
        { id: 'pending', label: t('rentalRequests.pending'), count: counts.pending },
        { id: 'approved', label: t('rentalRequests.approved'), count: counts.approved },
        { id: 'declined', label: t('rentalRequests.declined'), count: counts.declined }
    ];

    return (
        <div className="filter-navigation">
            <div className="tabs-list">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
                    </button>
                ))}
            </div>
            <div className="search-filter">
                <input type="text" placeholder={t('rentalRequests.searchPlaceholder', { defaultValue: 'Search applicants...' })} />
            </div>
        </div>
    );
};

export default FilterTabs;