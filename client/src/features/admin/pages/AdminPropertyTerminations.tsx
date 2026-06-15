import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiCheck, FiX, FiInfo, FiFileText, FiHome, FiUser, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import adminService, { type AdminTerminationRequest } from '../../../services/admin.service';
import AdminSidebar from '../components/AdminSidebar';
import './adminDashboard.css';
import './AdminPropertyTerminations.css';

const AdminPropertyTerminations: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<AdminTerminationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant');
    const [selectedRequest, setSelectedRequest] = useState<AdminTerminationRequest | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Action inputs
    const [damageDeduction, setDamageDeduction] = useState<number>(0);
    const [mutualDepositOption, setMutualDepositOption] = useState<'TENANT' | 'LANDLORD' | 'SPLIT'>('TENANT');
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [actionError, setActionError] = useState<string>('');
    const [actionSuccess, setActionSuccess] = useState<string>('');

    const hasValidAdminSession = () => {
        const token = localStorage.getItem('accessToken');
        const rawUser = localStorage.getItem('user');
        if (!token || !rawUser) return false;
        try {
            const parsed = JSON.parse(rawUser) as { role?: string };
            return parsed.role === 'ADMIN';
        } catch {
            return false;
        }
    };

    const fetchRequests = async () => {
        if (!hasValidAdminSession()) {
            navigate('/admin/auth/login', { replace: true });
            return;
        }
        setLoading(true);
        try {
            const data = await adminService.getTerminationRequests();
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch termination requests', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchRequests();
    }, []);

    const handleSelectRequest = (req: AdminTerminationRequest) => {
        setSelectedRequest(req);
        setDamageDeduction(0);
        setMutualDepositOption('TENANT');
        setRejectionReason('');
        setActionError('');
        setActionSuccess('');
    };

    const handleCloseModal = () => {
        setSelectedRequest(null);
    };

    const handleAction = async (action: 'APPROVE' | 'REJECT') => {
        if (!selectedRequest) return;
        if (action === 'REJECT' && !rejectionReason.trim()) {
            setActionError('Please enter a rejection reason.');
            return;
        }

        setActionLoading(true);
        setActionError('');
        setActionSuccess('');
        try {
            await adminService.actionTerminationRequest(selectedRequest.id, {
                action,
                rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
                damageDeduction: selectedRequest.scenario === 'Early exit' || selectedRequest.scenario === 'Mutual Agreement' || selectedRequest.scenario === 'Unauthorized Occupancy' ? damageDeduction : 0,
                mutualDepositOption: selectedRequest.scenario === 'Mutual Agreement' ? mutualDepositOption : undefined,
            });
            setActionSuccess(`Lease termination successfully ${action === 'APPROVE' ? 'approved' : 'rejected'}.`);
            setTimeout(() => {
                handleCloseModal();
                void fetchRequests();
            }, 2000);
        } catch (error: any) {
            setActionError(error.response?.data?.message || 'Failed to process request.');
        } finally {
            setActionLoading(false);
        }
    };

    // Filter requests
    const filteredRequests = requests.filter((req) => {
        const role = req.requester?.role || '';
        if (activeTab === 'tenant') {
            return role === 'TENANT';
        }
        return role === 'LANDLORD';
    });

    // Helper to calculate halfway lease info
    const getHalfwayInfo = (req: AdminTerminationRequest) => {
        if (!req.contract?.moveInDate || !req.contract?.leaseDurationMonths) return null;
        const moveIn = new Date(req.contract.moveInDate);
        const duration = req.contract.leaseDurationMonths;
        const halfwayDate = new Date(moveIn);
        halfwayDate.setMonth(halfwayDate.getMonth() + duration / 2);
        
        const now = new Date();
        const isPastHalfway = now >= halfwayDate;
        
        return {
            halfwayDate: halfwayDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            isPastHalfway,
        };
    };

    return (
        <div className="admin-shell">
            <AdminSidebar />

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>Lease Terminations</h1>
                        <p>Manage and process early lease termination and settlement requests.</p>
                    </div>
                </header>

                <div className="termination-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'tenant' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tenant')}
                    >
                        Tenant Requests
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'landlord' ? 'active' : ''}`}
                        onClick={() => setActiveTab('landlord')}
                    >
                        Landlord Requests
                    </button>
                </div>

                {loading ? (
                    <div className="admin-state">Loading termination requests...</div>
                ) : (
                    <div className="admin-content">
                        <section className="panel requests-panel">
                            {filteredRequests.length === 0 ? (
                                <div className="panel-empty-state">
                                    <FiCheck className="empty-icon" />
                                    <h3>No pending termination requests</h3>
                                    <p>Everything is caught up.</p>
                                </div>
                            ) : (
                                <div className="requests-table-wrapper">
                                    <table className="requests-table">
                                        <thead>
                                            <tr>
                                                <th>Property</th>
                                                <th>Requester</th>
                                                <th>Termination Condition / Reason</th>
                                                <th>Status</th>
                                                <th>Submitted</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRequests.map((req) => (
                                                <tr key={req.id}>
                                                    <td>
                                                        <div className="table-property-cell">
                                                            <strong>{req.contract?.property?.title || 'Unknown Property'}</strong>
                                                            <span>{req.contract?.property?.address}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="table-requester-cell">
                                                            <strong>{req.requesterName || 'Unknown User'}</strong>
                                                            <span>{req.requester?.email}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="table-scenario-cell">
                                                            <span className={`scenario-badge ${req.scenario ? req.scenario.replace(' ', '-').toLowerCase() : ''}`}>
                                                                {req.scenario || 'No Condition Specified'}
                                                            </span>
                                                            <p>{req.details || req.reason}</p>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${req.status.toLowerCase()}`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {new Date(req.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td>
                                                        {req.status === 'PENDING' ? (
                                                            <button 
                                                                className="review-action-btn"
                                                                onClick={() => handleSelectRequest(req)}
                                                            >
                                                                Review
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="review-action-btn view"
                                                                onClick={() => handleSelectRequest(req)}
                                                            >
                                                                View Details
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>

            {selectedRequest && (
                <div className="modal-backdrop" onClick={handleCloseModal}>
                    <div className="modal-card termination-review-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-head">
                            <h2>Review Lease Termination</h2>
                            <button type="button" className="close-modal-x" onClick={handleCloseModal}><FiX size={20} /></button>
                        </div>
                        
                        <div className="review-modal-body">
                            {actionError && <div className="error-message-banner">{actionError}</div>}
                            {actionSuccess && <div className="success-message-banner">{actionSuccess}</div>}

                            <div className="review-grid">
                                <div className="review-section main-info">
                                    <h3><FiHome /> Property & Lease Details</h3>
                                    <div className="info-card-lite">
                                        <p><b>Property:</b> {selectedRequest.contract?.property?.title || 'N/A'}</p>
                                        <p><b>Address:</b> {selectedRequest.contract?.property?.address || 'N/A'}</p>
                                        <p><b>Rent:</b> EGP {selectedRequest.contract?.rentAmount?.toLocaleString()}/mo</p>
                                        <p><b>Security Deposit:</b> EGP {selectedRequest.contract?.securityDeposit?.toLocaleString()}</p>
                                        <p><b>Move-in Date:</b> {selectedRequest.contract?.moveInDate ? new Date(selectedRequest.contract.moveInDate).toLocaleDateString() : 'N/A'}</p>
                                        <p><b>Duration:</b> {selectedRequest.contract?.leaseDurationMonths} months</p>
                                    </div>
                                </div>

                                <div className="review-section requester-info">
                                    <h3><FiUser /> Requester Profile</h3>
                                    <div className="info-card-lite">
                                        <p><b>Name:</b> {selectedRequest.requesterName || 'N/A'}</p>
                                        <p><b>Email:</b> {selectedRequest.requester?.email || 'N/A'}</p>
                                        <p><b>Account Role:</b> {selectedRequest.requester?.role}</p>
                                        <p><b>Tenant:</b> {selectedRequest.contract?.tenantName}</p>
                                        <p><b>Landlord:</b> {selectedRequest.contract?.landlordName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="review-section request-reason-box">
                                <h3><FiFileText /> Request Details</h3>
                                <div className="reason-text-area">
                                    <p className="scenario-label">Termination Condition: <span>{selectedRequest.scenario}</span></p>
                                    <div className="explanation-bubble">
                                        {selectedRequest.details || selectedRequest.reason}
                                    </div>
                                </div>
                            </div>

                            {/* Halfway Lease calculation info for Early exit */}
                            {selectedRequest.scenario === 'Early exit' && getHalfwayInfo(selectedRequest) && (
                                <div className="halfway-info-box">
                                    <FiInfo />
                                    <div>
                                        <strong>Lease Halfway Progress Check</strong>
                                        <p>
                                            Lease halfway date: {getHalfwayInfo(selectedRequest)?.halfwayDate}. 
                                            Currently: {getHalfwayInfo(selectedRequest)?.isPastHalfway ? (
                                                <span className="success-text">Past Halfway (Refundable Deposit minus damage deductions)</span>
                                            ) : (
                                                <span className="warning-text">Before Halfway (Forfeit Deposit penalty applies)</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedRequest.status === 'PENDING' && (
                                <div className="settlement-controls-box">
                                    <h3><FiDollarSign /> Settlement Adjustments</h3>
                                    
                                    {/* Early exit adjustment input */}
                                    {(selectedRequest.scenario === 'Early exit' || selectedRequest.scenario === 'Unauthorized Occupancy') && (
                                        <div className="control-group">
                                            <label>Damage Deductions (EGP)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={damageDeduction}
                                                onChange={(e) => setDamageDeduction(Math.max(0, Number(e.target.value)))}
                                                placeholder="Enter damage deduction amount"
                                            />
                                            <span className="helper-text">
                                                {selectedRequest.scenario === 'Unauthorized Occupancy'
                                                    ? "Enter damage amount to deduct from tenant's wallet balance."
                                                    : "Enter damage amount to deduct from security deposit."}
                                            </span>
                                        </div>
                                    )}

                                    {/* Mutual Agreement adjustments */}
                                    {selectedRequest.scenario === 'Mutual Agreement' && (
                                        <div className="controls-row">
                                            <div className="control-group">
                                                <label>Mutual Agreement Deposit Allocation</label>
                                                <select 
                                                    value={mutualDepositOption}
                                                    onChange={(e) => setMutualDepositOption(e.target.value as any)}
                                                >
                                                    <option value="TENANT">Refund fully to Tenant</option>
                                                    <option value="LANDLORD">Forfeit fully to Landlord</option>
                                                    <option value="SPLIT">Split 50/50 for Tenant & Landlord</option>
                                                </select>
                                            </div>
                                            <div className="control-group">
                                                <label>Damage Deductions (EGP)</label>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={damageDeduction}
                                                    onChange={(e) => setDamageDeduction(Math.max(0, Number(e.target.value)))}
                                                    placeholder="Enter damage deduction"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Auto rent warning */}
                                    <div className="auto-rent-disclaimer">
                                        <FiAlertCircle />
                                        <span>
                                            Note: The system will automatically calculate unpaid rent installments up to today, deduct it from the tenant's wallet/deposit refund, and credit it to the landlord.
                                        </span>
                                    </div>

                                    {/* Actions form */}
                                    <div className="rejection-reason-control">
                                        <label>Rejection Feedback (Required only if rejecting request)</label>
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Specify why you are rejecting the termination request..."
                                        />
                                    </div>

                                    <div className="review-action-buttons">
                                        <button 
                                            type="button" 
                                            className="reject-action-btn"
                                            onClick={() => handleAction('REJECT')}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? 'Processing...' : 'Reject Request'}
                                        </button>
                                        <button 
                                            type="button" 
                                            className="approve-action-btn"
                                            onClick={() => handleAction('APPROVE')}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? 'Processing...' : 'Approve & Settle'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedRequest.status !== 'PENDING' && (
                                <div className="processed-details-box">
                                    <h4>Request Processed</h4>
                                    <p>This lease termination request has been resolved as <strong>{selectedRequest.status}</strong>.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPropertyTerminations;
