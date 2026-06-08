import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaHome, FaImage, FaMapMarkerAlt, FaTools } from 'react-icons/fa';

interface StepperIndicatorProps {
    step: number;
    handleTabClick: (stepIndex: number) => void;
}

const StepperIndicator: React.FC<StepperIndicatorProps> = ({ step, handleTabClick }) => {
    const { t } = useTranslation();

    return (
        <aside className="page-sidebar-stepper">
            <div className="sidebar-stepper-title">Listing Steps</div>
            <nav className="sidebar-steps-list">
                <button type="button" onClick={() => handleTabClick(1)} className={`sidebar-step-item-btn ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                    <div className="step-icon-circle">
                        {step > 1 ? '✓' : <FaHome />}
                    </div>
                    <div className="step-text-meta">
                        <span className="step-txt-label">Step 1</span>
                        <span className="step-txt">{t('myProperties.tabs.general')}</span>
                    </div>
                </button>

                <button type="button" onClick={() => handleTabClick(2)} className={`sidebar-step-item-btn ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                    <div className="step-icon-circle">
                        {step > 2 ? '✓' : <FaImage />}
                    </div>
                    <div className="step-text-meta">
                        <span className="step-txt-label">Step 2</span>
                        <span className="step-txt">{t('myProperties.tabs.media')}</span>
                    </div>
                </button>

                <button type="button" onClick={() => handleTabClick(3)} className={`sidebar-step-item-btn ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                    <div className="step-icon-circle">
                        {step > 3 ? '✓' : <FaMapMarkerAlt />}
                    </div>
                    <div className="step-text-meta">
                        <span className="step-txt-label">Step 3</span>
                        <span className="step-txt">{t('myProperties.labels.locationDetails')}</span>
                    </div>
                </button>

                <button type="button" onClick={() => handleTabClick(4)} className={`sidebar-step-item-btn ${step === 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
                    <div className="step-icon-circle">
                        <FaTools />
                    </div>
                    <div className="step-text-meta">
                        <span className="step-txt-label">Step 4</span>
                        <span className="step-txt">{t('myProperties.tabs.maintenance')}</span>
                    </div>
                </button>
            </nav>
        </aside>
    );
};

export default StepperIndicator;
