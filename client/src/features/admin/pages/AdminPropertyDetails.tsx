import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiHome, FiSearch, FiX, FiDollarSign, FiUser, FiInfo, FiLayers } from 'react-icons/fi';
import adminService, { type AdminPropertyListItem } from '../../../services/admin.service';
import AdminSidebar from '../components/AdminSidebar';
import './adminDashboard.css';
import './AdminPropertyDetails.css';

const PROPERTY_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80';

const AdminPropertyDetails = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState<AdminPropertyListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState<AdminPropertyListItem | null>(null);
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

    const fetchProperties = async () => {
        if (!hasValidAdminSession()) {
            navigate('/admin/auth/login', { replace: true });
            return;
        }
        setLoading(true);
        try {
            const data = await adminService.getAllProperties();
            setProperties(data);
        } catch (error: unknown) {
            console.error('Failed to fetch admin properties list', error);
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
        void fetchProperties();
    }, []);

    const handleOpenDetails = (property: AdminPropertyListItem) => {
        setSelectedProperty(property);
    };

    const handleCloseModal = () => {
        setSelectedProperty(null);
    };

    // Filter and search logic
    const filteredProperties = properties.filter((p) => {
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

        const q = searchQuery.toLowerCase();
        const matchesSearch =
            !q ||
            p.title.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q) ||
            (p.type || '').toLowerCase().includes(q) ||
            (p.landlord?.name || '').toLowerCase().includes(q) ||
            (p.landlord?.email || '').toLowerCase().includes(q);

        return matchesStatus && matchesSearch;
    });

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return 'status-available';
            case 'RENTED':
                return 'status-rented';
            case 'PENDING_APPROVAL':
                return 'status-pending-app';
            case 'REJECTED':
                return 'status-rejected';
            case 'DRAFT':
                return 'status-draft';
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
                        <h1>Property Details</h1>
                        <p>Explore, search, and inspect all landlord property listings across the system.</p>
                    </div>
                </header>

                {loading ? (
                    <div className="admin-state">Loading properties registry...</div>
                ) : (
                    <div className="admin-content">
                        <section className="panel properties-panel">
                            <div className="properties-head">
                                <div className="filters-group">
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('ALL')}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'AVAILABLE' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('AVAILABLE')}
                                    >
                                        Available
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'RENTED' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('RENTED')}
                                    >
                                        Rented
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'PENDING_APPROVAL' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('PENDING_APPROVAL')}
                                    >
                                        Pending Approval
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-tab ${statusFilter === 'REJECTED' ? 'active' : ''}`}
                                        onClick={() => setStatusFilter('REJECTED')}
                                    >
                                        Rejected
                                    </button>
                                </div>

                                <div className="search-box">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search by title, location, landlord..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {filteredProperties.length === 0 ? (
                                <div className="properties-empty">
                                    <FiHome size={44} />
                                    <h4>No properties found</h4>
                                    <p>Try matching with other filters or search queries.</p>
                                </div>
                            ) : (
                                <div className="properties-grid-layout">
                                    {filteredProperties.map((p) => (
                                        <article key={p.id} className="property-item-card">
                                            <div className="card-thumb">
                                                <img src={p.thumbnailUrl || PROPERTY_FALLBACK_IMAGE} alt={p.title} />
                                                <span className={`status-badge ${getStatusBadgeClass(p.status)}`}>
                                                    {formatStatusText(p.status)}
                                                </span>
                                            </div>
                                            <div className="card-details">
                                                <h4>{p.title}</h4>
                                                <p className="address">{p.address}</p>
                                                <div className="price-type">
                                                    <strong className="price">EGP {p.monthlyPrice.toLocaleString()}/mo</strong>
                                                    <span className="type-tag">{p.type || 'Apartment'}</span>
                                                </div>
                                                <div className="landlord-info">
                                                    <FiUser className="icon" />
                                                    <span>{p.landlord?.name || 'N/A'}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="detail-action-btn"
                                                    onClick={() => handleOpenDetails(p)}
                                                >
                                                    <FiInfo /> Inspect Listing
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>

            {selectedProperty && (
                <div className="modal-backdrop" onClick={handleCloseModal}>
                    <div className="modal-card property-inspect-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-head">
                            <h2>Property Details Summary</h2>
                            <button type="button" onClick={handleCloseModal}>
                                <FiX size={22} />
                            </button>
                        </div>

                        <div className="inspect-modal-body">
                            <div className="modal-preview-section">
                                <img
                                    src={selectedProperty.thumbnailUrl || PROPERTY_FALLBACK_IMAGE}
                                    alt={selectedProperty.title}
                                    className="inspect-preview-image"
                                />
                            </div>

                            <div className="inspect-details-section">
                                <h3>{selectedProperty.title}</h3>
                                <p className="inspect-address">{selectedProperty.address}</p>

                                <div className="inspect-meta-grid">
                                    <div className="meta-box price-box">
                                        <FiDollarSign className="icon" />
                                        <div>
                                            <span>Monthly Rent</span>
                                            <strong>EGP {selectedProperty.monthlyPrice.toLocaleString()}</strong>
                                        </div>
                                    </div>
                                    <div className="meta-box type-box">
                                        <FiLayers className="icon" />
                                        <div>
                                            <span>Listing Type</span>
                                            <strong>{selectedProperty.type || 'Apartment'}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="inspect-section">
                                    <h4><FiUser /> Landlord Information</h4>
                                    {selectedProperty.landlord ? (
                                        <div className="landlord-card-detail">
                                            <strong>{selectedProperty.landlord.name}</strong>
                                            <p>{selectedProperty.landlord.email}</p>
                                            <span className="uid-label font-mono">ID: {selectedProperty.landlord.id}</span>
                                        </div>
                                    ) : (
                                        <p>No landlord data available.</p>
                                    )}
                                </div>

                                <div className="inspect-section">
                                    <h4><FiClock /> Timeline Details</h4>
                                    <div className="timeline-detail-list">
                                        <p><strong>Created:</strong> {new Date(selectedProperty.createdAt).toLocaleString()}</p>
                                        <p>
                                            <strong>Status:</strong>{' '}
                                            <span className={`status-badge ${getStatusBadgeClass(selectedProperty.status)}`}>
                                                {formatStatusText(selectedProperty.status)}
                                            </span>
                                        </p>
                                        <p><strong>Furnishing:</strong> {selectedProperty.furnishing || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPropertyDetails;
