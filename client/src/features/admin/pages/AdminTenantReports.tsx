import { useEffect, useMemo, useState } from 'react';
import { FiShield, FiAlertCircle, FiX, FiUser, FiInfo, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/admin.service';
import AdminSidebar from '../components/AdminSidebar';
import './adminDashboard.css';
import './AdminTenantReports.css';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string }; status?: number } }).response;
        return response?.data?.message || fallback;
    }
    return fallback;
};

interface UserProfile {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    phone_number?: string;
    bio?: string;
}

interface ReportUser {
    id: string;
    email: string;
    profile?: UserProfile;
}

interface TenantReportData {
    id: string;
    reason: string;
    details: string;
    status: 'OPEN' | 'REVIEWED' | 'ACTIONED';
    created_at?: string;
    createdAt?: string;
    contract?: {
        property?: {
            id: string;
            title: string;
            address: string;
            monthly_price: number;
            type: string;
            status?: string;
            furnishing?: string;
            description?: string;
            target_tenant?: string;
            created_at?: string;
            images?: { id: string; is_main: boolean; image_url: string }[];
        }
    };
    reporter?: ReportUser;
    reportedTenant?: ReportUser;
}

const AdminTenantReports = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState<TenantReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<TenantReportData | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Advanced filtering state
    const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
    const [reasonFilter, setReasonFilter] = useState<string>('ALL');
    
    // User & Property inspection modal state
    const [inspectedUser, setInspectedUser] = useState<{ user: ReportUser, role: 'Tenant' | 'Landlord' } | null>(null);
    const [inspectedProperty, setInspectedProperty] = useState<TenantReportData['contract'] extends { property?: infer P } ? P : null>(null);

    // Action modal states
    const [actionType, setActionType] = useState<'WARN' | 'BAN' | null>(null);
    
    // Warn states
    const [warnMessage, setWarnMessage] = useState('');

    // Ban states (same as UserManagement)
    const [banType, setBanType] = useState<'until' | 'unlimited'>('until');
    const [banUntil, setBanUntil] = useState('');
    const [banReason, setBanReason] = useState('Abusive behavior');
    const [banMessage, setBanMessage] = useState('Your account is restricted due to abusive behavior.');
    const [customBanMessage, setCustomBanMessage] = useState('');

    const mockMessages = [
        { reason: 'Fake national ID', message: 'Your account was flagged for fake identity data.' },
        { reason: 'Scam activity', message: 'Your account has been suspended due to scam reports.' },
        { reason: 'Fake data', message: 'Your account has inconsistent information that violates policy.' },
        { reason: 'Abusive behavior', message: 'Your account is restricted due to abusive behavior.' },
    ];

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

    const fetchReports = async () => {
        if (!hasValidAdminSession()) {
            navigate('/admin/auth/login', { replace: true });
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getTenantReports();
            setReports(data);
        } catch (fetchError: unknown) {
            setError(getErrorMessage(fetchError, 'Failed to load reports'));
            if (typeof fetchError === 'object' && fetchError !== null && 'response' in fetchError && (fetchError as { response?: { status?: number } }).response?.status === 401) {
                navigate('/admin/auth/login', { replace: true });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchReports();
    }, []);

    const uniqueReasons = useMemo(() => {
        const reasons = new Set(reports.map(r => r.reason));
        return Array.from(reasons);
    }, [reports]);

    const processedReports = useMemo(() => {
        let filtered = reports.filter((report) => activeTab === 'OPEN' ? report.status === 'OPEN' : report.status !== 'OPEN');
        
        if (reasonFilter !== 'ALL') {
            filtered = filtered.filter(r => r.reason === reasonFilter);
        }
        
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(r => 
                r.reporter?.email.toLowerCase().includes(q) ||
                r.reportedTenant?.email.toLowerCase().includes(q) ||
                r.contract?.property?.title?.toLowerCase().includes(q) ||
                r.contract?.property?.address?.toLowerCase().includes(q) ||
                r.reason.toLowerCase().includes(q)
            );
        }
        
        filtered.sort((a, b) => {
            const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
            const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
            return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
        });
        
        return filtered;
    }, [reports, activeTab, searchQuery, sortOrder, reasonFilter]);

    const handleAction = async () => {
        if (!selectedReport || !actionType) return;

        setActionLoading(true);
        try {
            if (actionType === 'WARN') {
                if (!warnMessage.trim()) {
                    alert('Please provide a warning message.');
                    setActionLoading(false);
                    return;
                }
                await adminService.warnTenantFromReport(selectedReport.id, warnMessage);
            } else if (actionType === 'BAN') {
                await adminService.banUser(selectedReport.reportedTenant!.id, {
                    banUntil: banType === 'unlimited' ? null : banUntil || null,
                    reason: banReason,
                    message: customBanMessage.trim() || banMessage,
                });
                // Note: we might also want to mark the report as ACTIONED by warning it, 
                // but the ban API directly modifies the user. 
                // Let's call the specific tenant report ban endpoint to ensure it logs and updates report status
                await adminService.banTenantFromReport(selectedReport.id, customBanMessage.trim() || banMessage);
            }
            setSelectedReport(null);
            setActionType(null);
            setWarnMessage('');
            setCustomBanMessage('');
            await fetchReports();
        } catch (actionError: unknown) {
            alert(getErrorMessage(actionError, 'Failed to process action'));
        } finally {
            setActionLoading(false);
        }
    };

    const openActionModal = (report: TenantReportData, type: 'WARN' | 'BAN') => {
        setSelectedReport(report);
        setActionType(type);
        setWarnMessage('');
        setCustomBanMessage('');
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown Date';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Invalid date';
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="admin-shell">
            <AdminSidebar />

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>Tenant Reports</h1>
                        <p>Manage and review reports submitted by Landlords against Tenants.</p>
                    </div>
                    <span className="reports-open-pill">{reports.filter(r => r.status === 'OPEN').length} Open</span>
                </header>

                <div className="admin-toolbar">
                    <div className="toolbar-tabs">
                        <button className={activeTab === 'OPEN' ? 'active' : ''} onClick={() => setActiveTab('OPEN')}>Open Reports</button>
                        <button className={activeTab === 'CLOSED' ? 'active' : ''} onClick={() => setActiveTab('CLOSED')}>Closed Reports</button>
                    </div>
                    
                    <div className="toolbar-actions">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search by email, property, reason..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
                            <option value="ALL">All Reasons</option>
                            {uniqueReasons.map(r => (
                                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'NEWEST' | 'OLDEST')}>
                            <option value="NEWEST">Newest First</option>
                            <option value="OLDEST">Oldest First</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-state">Loading tenant reports...</div>
                ) : error ? (
                    <div className="admin-state reports-error">{error}</div>
                ) : processedReports.length === 0 ? (
                    <div className="admin-state">No reports found matching your criteria.</div>
                ) : (
                    <div className="admin-content tenant-reports-grid">
                        {processedReports.map((report) => {
                            const property = report.contract?.property;
                            const landlord = report.reporter;
                            const tenant = report.reportedTenant;
                            
                            const reportDateStr = report.createdAt || report.created_at;
                            let thumb = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80';
                            if (property?.images && property.images.length > 0) {
                                const mainImage = property.images.find(img => img.is_main);
                                thumb = mainImage?.image_url || property.images[0].image_url;
                            }

                            return (
                                <article key={report.id} className="tenant-report-card">
                                    <div className="tenant-report-head">
                                        <div>
                                            <small>Report Date</small>
                                            <h3>{formatDate(reportDateStr)}</h3>
                                        </div>
                                        <span className={`report-status-badge status-${report.status.toLowerCase()}`}>
                                            {report.status.charAt(0) + report.status.slice(1).toLowerCase()}
                                        </span>
                                    </div>

                                    <div className="tenant-report-body">
                                        <div 
                                            className="tenant-report-property clickable-box" 
                                            onClick={() => property && setInspectedProperty(property)}
                                        >
                                            <img src={thumb} alt="Property Thumbnail" />
                                            <div className="prop-details">
                                                <strong>{property?.title || 'Unknown Property'}</strong>
                                                <p>{property?.address}</p>
                                                <span>EGP {property?.monthly_price?.toLocaleString() || 0}/mo • {property?.type || 'Property'}</span>
                                            </div>
                                        </div>

                                        <div className="tenant-report-users">
                                            <div 
                                                className="tenant-user-box clickable-box" 
                                                onClick={() => landlord && setInspectedUser({ user: landlord, role: 'Landlord' })}
                                            >
                                                <div className="avatar-circle">
                                                    {landlord?.profile?.avatar_url ? (
                                                        <img src={landlord.profile.avatar_url} alt="L" />
                                                    ) : <FiUser />}
                                                </div>
                                                <div>
                                                    <small>Reported By (Landlord)</small>
                                                    <p>{landlord?.profile ? `${landlord.profile.first_name} ${landlord.profile.last_name}` : landlord?.email}</p>
                                                </div>
                                            </div>

                                            <div 
                                                className="tenant-user-box clickable-box is-tenant" 
                                                onClick={() => tenant && setInspectedUser({ user: tenant, role: 'Tenant' })}
                                            >
                                                <div className="avatar-circle">
                                                    {tenant?.profile?.avatar_url ? (
                                                        <img src={tenant.profile.avatar_url} alt="T" />
                                                    ) : <FiUser />}
                                                </div>
                                                <div>
                                                    <small>Accused (Tenant)</small>
                                                    <p>{tenant?.profile ? `${tenant.profile.first_name} ${tenant.profile.last_name}` : tenant?.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="tenant-report-reason">
                                            <strong><FiInfo style={{ marginRight: 4 }}/> Reason: {report.reason.replace(/_/g, ' ')}</strong>
                                            <p className="report-details-text">{report.details || 'No additional details provided.'}</p>
                                        </div>
                                    </div>
                                    {report.status === 'OPEN' && (
                                        <div className="tenant-report-actions">
                                            <button type="button" className="warn-btn" onClick={() => openActionModal(report, 'WARN')}>
                                                <FiAlertCircle /> Warn Tenant
                                            </button>
                                            <button type="button" className="danger-btn" onClick={() => openActionModal(report, 'BAN')}>
                                                <FiShield /> Ban Tenant
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Inspect User Modal */}
            {inspectedUser && (
                <div className="modal-backdrop" onClick={() => setInspectedUser(null)}>
                    <div className="inspect-user-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h3>{inspectedUser.role} Profile</h3>
                            <button className="close-btn" onClick={() => setInspectedUser(null)}><FiX size={20}/></button>
                        </div>
                        <div className="inspect-user-content">
                            <div className="inspect-avatar-large">
                                {inspectedUser.user.profile?.avatar_url ? (
                                    <img src={inspectedUser.user.profile.avatar_url} alt="Avatar" />
                                ) : (
                                    <div className="avatar-placeholder"><FiUser size={40}/></div>
                                )}
                            </div>
                            <div className="inspect-info">
                                <h2>{inspectedUser.user.profile?.first_name || 'No First Name'} {inspectedUser.user.profile?.last_name || 'No Last Name'}</h2>
                                <p className="inspect-email">{inspectedUser.user.email}</p>
                                <span className="inspect-id">ID: {inspectedUser.user.id}</span>
                                
                                <div className="inspect-meta">
                                    <p><strong>Phone:</strong> {inspectedUser.user.profile?.phone_number || 'N/A'}</p>
                                    <p><strong>Bio:</strong> {inspectedUser.user.profile?.bio || 'No bio provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inspect Property Modal */}
            {inspectedProperty && (
                <div className="modal-backdrop" onClick={() => setInspectedProperty(null)}>
                    <div className="inspect-property-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h3>Property Details</h3>
                            <button className="close-btn" onClick={() => setInspectedProperty(null)}><FiX size={20}/></button>
                        </div>
                        <div className="inspect-property-content">
                            {(() => {
                                let cover = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80';
                                if (inspectedProperty.images && inspectedProperty.images.length > 0) {
                                    const main = inspectedProperty.images.find((i: any) => i.is_main);
                                    cover = main?.image_url || inspectedProperty.images[0].image_url;
                                }
                                return <img src={cover} alt={inspectedProperty.title} className="prop-modal-cover" />;
                            })()}
                            <div className="prop-modal-info">
                                <h2>{inspectedProperty.title}</h2>
                                <p className="prop-modal-address">{inspectedProperty.address}</p>
                                <div className="prop-modal-grid">
                                    <div className="pm-stat">
                                        <small>Price</small>
                                        <strong>EGP {inspectedProperty.monthly_price?.toLocaleString()}/mo</strong>
                                    </div>
                                    <div className="pm-stat">
                                        <small>Type</small>
                                        <strong>{inspectedProperty.type || 'N/A'}</strong>
                                    </div>
                                    <div className="pm-stat">
                                        <small>Status</small>
                                        <strong>{inspectedProperty.status || 'N/A'}</strong>
                                    </div>
                                    <div className="pm-stat">
                                        <small>Furnishing</small>
                                        <strong>{inspectedProperty.furnishing || 'N/A'}</strong>
                                    </div>
                                    <div className="pm-stat">
                                        <small>Target</small>
                                        <strong>{inspectedProperty.target_tenant || 'N/A'}</strong>
                                    </div>
                                    <div className="pm-stat">
                                        <small>Listed</small>
                                        <strong>{formatDate(inspectedProperty.created_at)}</strong>
                                    </div>
                                </div>
                                <div className="prop-modal-desc">
                                    <small>Description</small>
                                    <p>{inspectedProperty.description || 'No description available.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Warn / Ban Action Modal */}
            {selectedReport && actionType && (
                <div className="modal-backdrop" onClick={() => { setSelectedReport(null); setActionType(null); }}>
                    <div className="tenant-report-action-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h2>{actionType === 'WARN' ? 'Warn Tenant' : 'Ban Tenant'}</h2>
                            <button className="close-btn" onClick={() => { setSelectedReport(null); setActionType(null); }}><FiX size={20}/></button>
                        </div>

                        <div className="action-target-info">
                            <div className="avatar-circle sm">
                                {selectedReport.reportedTenant?.profile?.avatar_url ? (
                                    <img src={selectedReport.reportedTenant.profile.avatar_url} alt="T" />
                                ) : <FiUser />}
                            </div>
                            <div>
                                <strong>{selectedReport.reportedTenant?.profile ? `${selectedReport.reportedTenant.profile.first_name} ${selectedReport.reportedTenant.profile.last_name}` : 'Tenant'}</strong>
                                <p>{selectedReport.reportedTenant?.email}</p>
                            </div>
                        </div>
                        
                        {actionType === 'WARN' ? (
                            <div className="form-group">
                                <label>Warning Message (sent via email & in-app notifications):</label>
                                <textarea
                                    value={warnMessage}
                                    onChange={(e) => setWarnMessage(e.target.value)}
                                    placeholder="Type the official warning message here..."
                                    rows={4}
                                />
                            </div>
                        ) : (
                            <div className="ban-settings-group">
                                <div className="form-group row-group">
                                    <div className="col">
                                        <label>Ban duration</label>
                                        <select value={banType} onChange={(e) => setBanType(e.target.value as 'until' | 'unlimited')}>
                                            <option value="until">Until date</option>
                                            <option value="unlimited">Unlimited</option>
                                        </select>
                                    </div>
                                    {banType === 'until' && (
                                        <div className="col">
                                            <label>Ban until</label>
                                            <input type="datetime-local" value={banUntil} onChange={(e) => setBanUntil(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="form-group">
                                    <label>Reason Category</label>
                                    <select
                                        value={banReason}
                                        onChange={(e) => {
                                            const selected = mockMessages.find((m) => m.reason === e.target.value);
                                            setBanReason(e.target.value);
                                            if (selected) setBanMessage(selected.message);
                                        }}
                                    >
                                        {mockMessages.map((m) => (
                                            <option key={m.reason} value={m.reason}>{m.reason}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Message template</label>
                                    <select
                                        value={banMessage}
                                        onChange={(e) => setBanMessage(e.target.value)}
                                    >
                                        {mockMessages.map((m) => (
                                            <option key={m.message} value={m.message}>{m.message}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Custom message (optional)</label>
                                    <textarea value={customBanMessage} onChange={(e) => setCustomBanMessage(e.target.value)} placeholder="Overrides the template above..." rows={3} />
                                </div>
                            </div>
                        )}

                        <div className="tenant-report-modal-actions">
                            <button type="button" className="cancel-btn" onClick={() => { setSelectedReport(null); setActionType(null); }}>Cancel</button>
                            <button 
                                type="button" 
                                className={actionType === 'WARN' ? 'warn-btn' : 'danger-btn'} 
                                onClick={handleAction} 
                                disabled={actionLoading || (actionType === 'WARN' && !warnMessage.trim())}
                            >
                                {actionLoading ? 'Processing...' : `Confirm ${actionType === 'WARN' ? 'Warning' : 'Ban'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTenantReports;
