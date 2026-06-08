import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiFileText, FiSearch, FiX, FiCalendar, FiDollarSign, FiUser, FiInfo } from 'react-icons/fi';
import adminService, { type AdminContractItem } from '../../../services/admin.service';
import AdminSidebar from '../components/AdminSidebar';
import './adminDashboard.css';
import './AdminContracts.css';

const AdminContracts = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<AdminContractItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<AdminContractItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

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

    const fetchContracts = async () => {
        if (!hasValidAdminSession()) {
            navigate('/admin/auth/login', { replace: true });
            return;
        }
        setLoading(true);
        try {
            const data = await adminService.getAllContracts();
            setContracts(data);
        } catch (error: unknown) {
            console.error('Failed to fetch contracts', error);
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                (error as { response?: { status?: number } }).response?.status === 401
            ) {
                navigate('/admin/auth/login', { replace: true });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchContracts();
    }, []);

    const handleOpenDetails = (contract: AdminContractItem) => {
        setSelectedContract(contract);
    };

    const handleCloseModal = () => {
        setSelectedContract(null);
    };

    // Filters and Searches
    const filteredContracts = contracts.filter((c) => {
        const matchesStatus =
            statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && c.status === 'ACTIVE') ||
            (statusFilter === 'PENDING' && c.status.startsWith('PENDING_')) ||
            (statusFilter === 'ENDED' && (c.status === 'TERMINATED' || c.status === 'EXPIRED'));

        const q = searchQuery.toLowerCase();
        const matchesSearch =
            !q ||
            c.contractId.toLowerCase().includes(q) ||
            (c.leaseId && c.leaseId.toLowerCase().includes(q)) ||
            (c.property?.title || '').toLowerCase().includes(q) ||
            (c.property?.address || '').toLowerCase().includes(q) ||
            (c.landlord?.name || '').toLowerCase().includes(q) ||
            (c.landlord?.email || '').toLowerCase().includes(q) ||
            (c.tenant?.name || '').toLowerCase().includes(q) ||
            (c.tenant?.email || '').toLowerCase().includes(q);

        return matchesStatus && matchesSearch;
    });

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'status-active';
            case 'PENDING_LANDLORD':
            case 'PENDING_TENANT':
            case 'PENDING_PAYMENT':
                return 'status-pending';
            case 'TERMINATED':
                return 'status-terminated';
            case 'EXPIRED':
                return 'status-expired';
            default:
                return '';
        }
    };

    const formatStatusText = (status: string) => {
        return status.replace(/_/g, ' ');
    };

    return (
        <div className="admin-shell">
            <AdminSidebar />

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>Lease Contracts</h1>
                        <p>Track, inspect, and monitor active and pending lease agreements.</p>
                    </div>
                </header>

                {loading ? (
                    <div className="admin-state">Loading contracts database...</div>
                ) : (
                    <div className="admin-content">
                        <section className="panel contracts-panel">
                            <div className="contracts-head">
                                <div className="filters-group">
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('ALL')}
                                    >
                                        All Contracts
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('ACTIVE')}
                                    >
                                        Active
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'PENDING' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('PENDING')}
                                    >
                                        Pending Signatures
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'ENDED' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('ENDED')}
                                    >
                                        Terminated / Expired
                                    </button>
                                </div>

                                <div className="search-box">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search by ID, property, name, email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {filteredContracts.length === 0 ? (
                                <div className="contracts-empty">
                                    <FiFileText size={44} />
                                    <h4>No contracts found</h4>
                                    <p>Try resetting filters or adjusting search queries.</p>
                                </div>
                            ) : (
                                <div className="contracts-table-wrapper">
                                    <table className="contracts-table">
                                        <thead>
                                            <tr>
                                                <th>Contract ID</th>
                                                <th>Property</th>
                                                <th>Landlord</th>
                                                <th>Tenant</th>
                                                <th>Rent / Month</th>
                                                <th>Start Date</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredContracts.map((c) => (
                                                <tr key={c.id}>
                                                    <td className="font-mono">{c.contractId}</td>
                                                    <td>
                                                        <div className="prop-info-cell">
                                                            <strong>{c.property?.title || 'Unknown'}</strong>
                                                            <span>{c.property?.address}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="user-cell">
                                                            <span>{c.landlord?.name}</span>
                                                            <small>{c.landlord?.email}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="user-cell">
                                                            <span>{c.tenant?.name}</span>
                                                            <small>{c.tenant?.email}</small>
                                                        </div>
                                                    </td>
                                                    <td className="price-cell">
                                                        EGP {c.rentAmount.toLocaleString()}
                                                    </td>
                                                    <td>
                                                        {c.moveInDate ? new Date(c.moveInDate).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${getStatusBadgeClass(c.status)}`}>
                                                            {formatStatusText(c.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="action-btn-detail"
                                                            onClick={() => handleOpenDetails(c)}
                                                            title="View details"
                                                        >
                                                            <FiInfo /> Details
                                                        </button>
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

            {selectedContract && (
                <div className="modal-backdrop" onClick={handleCloseModal}>
                    <div className="modal-card contract-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-head">
                            <h2>Lease Details — {selectedContract.contractId}</h2>
                            <button type="button" onClick={handleCloseModal}>
                                <FiX size={22} />
                            </button>
                        </div>

                        <div className="contract-modal-body">
                            <div className="modal-section-grid">
                                <div className="info-block">
                                    <h3><FiFileText /> Agreement Metadata</h3>
                                    <div className="meta-list">
                                        <p><strong>Contract Reference ID:</strong> {selectedContract.contractId}</p>
                                        {selectedContract.leaseId && <p><strong>Lease Document ID:</strong> {selectedContract.leaseId}</p>}
                                        <p><strong>Created:</strong> {new Date(selectedContract.createdAt).toLocaleString()}</p>
                                        <p>
                                            <strong>Status:</strong>{' '}
                                            <span className={`status-pill ${getStatusBadgeClass(selectedContract.status)}`}>
                                                {formatStatusText(selectedContract.status)}
                                            </span>
                                        </p>
                                        <p><strong>Payment Status:</strong> {selectedContract.paymentStatus}</p>
                                    </div>
                                </div>

                                <div className="info-block">
                                    <h3><FiDollarSign /> Financial Terms</h3>
                                    <div className="meta-list">
                                        <p className="highlight-price">
                                            <strong>Monthly Rent:</strong> EGP {selectedContract.rentAmount.toLocaleString()}
                                        </p>
                                        <p><strong>Security Deposit:</strong> EGP {selectedContract.securityDeposit.toLocaleString()}</p>
                                        <p><strong>Lease Term Duration:</strong> {selectedContract.leaseDurationMonths} Months</p>
                                        {selectedContract.moveInDate && (
                                            <p>
                                                <strong>Term Commencement:</strong>{' '}
                                                {new Date(selectedContract.moveInDate).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <hr className="divider" />

                            <div className="modal-section-grid parties-grid">
                                <div className="info-block party-block">
                                    <h3><FiUser /> Landlord (Lessor)</h3>
                                    {selectedContract.landlord ? (
                                        <div className="user-card">
                                            <strong>{selectedContract.landlord.name}</strong>
                                            <p>{selectedContract.landlord.email}</p>
                                            <span className="user-id-badge">ID: {selectedContract.landlord.id}</span>
                                        </div>
                                    ) : (
                                        <p>No landlord associated.</p>
                                    )}
                                </div>

                                <div className="info-block party-block">
                                    <h3><FiUser /> Tenant (Lessee)</h3>
                                    {selectedContract.tenant ? (
                                        <div className="user-card">
                                            <strong>{selectedContract.tenant.name}</strong>
                                            <p>{selectedContract.tenant.email}</p>
                                            <span className="user-id-badge">ID: {selectedContract.tenant.id}</span>
                                        </div>
                                    ) : (
                                        <p>No tenant associated.</p>
                                    )}
                                </div>
                            </div>

                            <hr className="divider" />

                            <div className="info-block full-width-block">
                                <h3><FiCalendar /> Associated Property</h3>
                                {selectedContract.property ? (
                                    <div className="property-assoc-card">
                                        <strong>{selectedContract.property.title}</strong>
                                        <p>{selectedContract.property.address}</p>
                                        <span className="property-id-badge">ID: {selectedContract.property.id}</span>
                                    </div>
                                ) : (
                                    <p>No property associated.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminContracts;
