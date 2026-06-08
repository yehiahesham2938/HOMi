// client\src\features\MyProperties\components\OccupiedModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    FaTimes, FaUserCircle, FaCalendarAlt, FaHourglassHalf,
    FaUsers, FaExclamationTriangle, FaSignOutAlt, FaMoneyBillWave,
    FaRegCalendarCheck, FaSpinner, FaCheckCircle
} from 'react-icons/fa';
import { contractService, type LandlordContract, type ContractInstallments, type RentInstallmentItem } from '../../../services/contract.service';
import './OccupiedModal.css';

interface OccupiedModalProps {
    contract: LandlordContract;
    onClose: () => void;
}

const OccupiedModal: React.FC<OccupiedModalProps> = ({ contract, onClose }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [installments, setInstallments] = useState<ContractInstallments | null>(null);

    // Reporting States
    const [reportView, setReportView] = useState<'none' | 'report' | 'terminate'>('none');
    const [reportReason, setReportReason] = useState('LATE_PAYMENT');
    const [reportDetails, setReportDetails] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch installments to get latest payment details
                const instRes = await contractService.getContractInstallments(contract.id);
                if (instRes) {
                    setInstallments(instRes);
                }
            } catch (err) {
                console.error("Failed to fetch installments", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [contract.id]);

    const handleReportSubmit = async () => {
        if (!reportDetails.trim()) {
            setErrorMsg('Please provide details for the report.');
            return;
        }
        setActionLoading(true);
        setErrorMsg('');
        try {
            await contractService.reportTenant(contract.id, {
                reason: reportReason,
                details: reportDetails
            });
            setSuccessMsg('Report submitted successfully to the administration.');
            setTimeout(() => {
                setReportView('none');
                setSuccessMsg('');
                setReportDetails('');
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Failed to submit report.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleTerminateSubmit = async () => {
        if (!reportDetails.trim()) {
            setErrorMsg('Please provide reasons for early termination.');
            return;
        }
        setActionLoading(true);
        setErrorMsg('');
        try {
            await contractService.terminateLease(contract.id, {
                reason: reportDetails
            });
            setSuccessMsg('Lease termination request submitted to administration.');
            setTimeout(() => {
                setReportView('none');
                setSuccessMsg('');
                setReportDetails('');
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Failed to submit request.');
        } finally {
            setActionLoading(false);
        }
    };

    // Derived Data
    const tenantName = contract.tenant
        ? `${contract.tenant.firstName} ${contract.tenant.lastName}`
        : 'Unknown Tenant';

    // Calculate dates
    const startDate = new Date(contract.moveInDate).toLocaleDateString();

    let endDate = '—';
    if (contract.moveInDate && contract.leaseDurationMonths) {
        const d = new Date(contract.moveInDate);
        d.setMonth(d.getMonth() + contract.leaseDurationMonths);
        endDate = d.toLocaleDateString();
    }

    // Installments processing
    let lastPaidDate = 'None';
    let upcomingDeadline = 'None';
    let upcomingAmount = 0;

    if (installments && installments.items.length > 0) {
        const paidItems = installments.items.filter(i => i.isPaid).sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime());
        if (paidItems.length > 0 && paidItems[0].paidAt) {
            lastPaidDate = new Date(paidItems[0].paidAt).toLocaleDateString();
        }

        const nextPayable = installments.items.find(i => !i.isPaid);
        if (nextPayable) {
            upcomingDeadline = new Date(nextPayable.dueDate).toLocaleDateString();
            upcomingAmount = nextPayable.totalAmount;
        }
    } else {
        // Fallback if no installments fetched yet
        upcomingAmount = contract.rentAmount || 0;
    }

    return createPortal(
        <div className="occupied-modal-overlay" onClick={onClose} dir="ltr">
            <div className="occupied-modal-container" onClick={(e) => e.stopPropagation()}>

                <header className="occ-header">
                    <h2><FaCheckCircle /> Occupancy Details</h2>
                    <button className="occ-close-btn" onClick={onClose}><FaTimes /></button>
                </header>

                <div className="occ-content">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <FaSpinner className="fa-spin" size={30} color="#3b82f6" />
                        </div>
                    ) : (
                        <>
                            {/* Tenant Profile */}
                            <div className="occ-tenant-profile">
                                <div className="occ-tenant-avatar">
                                    <img 
                                        src={contract.tenant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantName)}&background=6366f1&color=fff&size=120`}
                                        alt={tenantName}
                                        onError={(e) => {
                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantName)}&background=6366f1&color=fff&size=120`;
                                        }}
                                    />
                                </div>
                                <div className="occ-tenant-info">
                                    <h3>{tenantName}</h3>
                                    <p>{contract.tenant?.email}</p>
                                </div>
                            </div>

                            {/* Financial Banner */}
                            <div className="occ-financial-banner">
                                <div className="occ-fin-item">
                                    <label>Monthly Rent</label>
                                    <span>${contract.rentAmount}</span>
                                </div>
                                <div className="occ-fin-divider"></div>
                                <div className="occ-fin-item">
                                    <label>Next Payment Due</label>
                                    <span>${upcomingAmount}</span>
                                </div>
                                <div className="occ-fin-divider"></div>
                                <div className="occ-fin-item">
                                    <label>Deadline</label>
                                    <span style={{ fontSize: '1.2rem', marginTop: '6px' }}>{upcomingDeadline}</span>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="occ-details-grid">
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon blue"><FaCalendarAlt /></div>
                                    <div className="occ-detail-text">
                                        <label>Lease Period</label>
                                        <span>{startDate} - {endDate}</span>
                                    </div>
                                </div>
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon purple"><FaHourglassHalf /></div>
                                    <div className="occ-detail-text">
                                        <label>Total Duration</label>
                                        <span>{contract.leaseDurationMonths} Months</span>
                                    </div>
                                </div>
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon green"><FaUsers /></div>
                                    <div className="occ-detail-text">
                                        <label>Occupants</label>
                                        <span>{contract.maxOccupants || 1} Registered</span>
                                    </div>
                                </div>
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon orange"><FaRegCalendarCheck /></div>
                                    <div className="occ-detail-text">
                                        <label>Last Rent Paid</label>
                                        <span>{lastPaidDate}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Inline Reporting Forms */}
                            {reportView !== 'none' && (
                                <div className="occ-report-form animate-fade-in" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>
                                        {reportView === 'report' ? 'Report Tenant' : 'Request Lease Termination'}
                                    </h4>

                                    {errorMsg && <div style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{errorMsg}</div>}
                                    {successMsg && <div style={{ color: '#10b981', marginBottom: '12px', fontSize: '0.9rem' }}><FaCheckCircle /> {successMsg}</div>}

                                    {reportView === 'report' && (
                                        <div className="occ-form-group">
                                            <label>Reason for Report</label>
                                            <select className="occ-select" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                                                <option value="LATE_PAYMENT">Late Payment</option>
                                                <option value="PROPERTY_DAMAGE">Property Damage</option>
                                                <option value="NOISE_COMPLAINT">Noise Complaint</option>
                                                <option value="UNAUTHORIZED_OCCUPANTS">Unauthorized Occupants</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="occ-form-group">
                                        <label>{reportView === 'report' ? 'Details' : 'Reason for Termination'}</label>
                                        <textarea
                                            className="occ-textarea"
                                            placeholder="Please provide details for the administration..."
                                            value={reportDetails}
                                            onChange={(e) => setReportDetails(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="occ-submit-actions">
                                        <button className="occ-btn-cancel" onClick={() => setReportView('none')} disabled={actionLoading}>Cancel</button>
                                        <button
                                            className="occ-btn-submit"
                                            onClick={reportView === 'report' ? handleReportSubmit : handleTerminateSubmit}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? <FaSpinner className="fa-spin" /> : 'Submit to Admin'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {reportView === 'none' && !loading && (
                    <footer className="occ-actions">
                        <button className="occ-btn occ-btn-report" onClick={() => setReportView('report')}>
                            <FaExclamationTriangle /> Report Tenant
                        </button>
                        <button className="occ-btn occ-btn-terminate" onClick={() => setReportView('terminate')}>
                            <FaSignOutAlt /> Terminate Lease
                        </button>
                    </footer>
                )}

            </div>
        </div>,
        document.body
    );
};

export default OccupiedModal;
