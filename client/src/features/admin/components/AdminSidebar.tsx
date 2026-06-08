import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    FiActivity,
    FiAlertTriangle,
    FiChevronDown,
    FiFileText,
    FiHome,
    FiLogOut,
    FiMessageCircle,
    FiTool,
    FiUsers,
} from 'react-icons/fi';

const AdminSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const usersOpen = location.pathname.startsWith('/admin/user-management')
        || location.pathname.startsWith('/admin/user-reports')
        || location.pathname.startsWith('/admin/tenant-reports')
        || location.pathname.startsWith('/admin/support-inbox');
    const propertiesOpen = location.pathname.startsWith('/admin/property-approvals')
        || location.pathname.startsWith('/admin/properties');
    const maintenanceOpen = location.pathname.startsWith('/admin/maintenance-approvals')
        || location.pathname.startsWith('/admin/maintainers')
        || location.pathname.startsWith('/admin/maintenance-conflicts');

    const handleSignOut = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        localStorage.removeItem('authProvider');
        sessionStorage.removeItem('refreshToken');
        navigate('/admin/auth/login', { replace: true });
    };

    return (
        <aside className="admin-sidebar">
            <div className="admin-brand-card">
                <p className="admin-brand-team">Admin Team</p>
                <h2>HOMi <span>Admin</span></h2>
                <p>Control center</p>
            </div>
            <nav className="admin-nav grouped">
                <NavLink to="/admin/dashboard" end><FiHome /> Dashboard</NavLink>
                <NavLink to="/admin/contracts"><FiFileText /> Contracts</NavLink>

                <details className="admin-nav-group" open={usersOpen}>
                    <summary>
                        <span><FiUsers /> Users Management</span>
                        <FiChevronDown className="admin-nav-arrow" />
                    </summary>
                    <div className="admin-nav-sub">
                        <NavLink to="/admin/user-management"><FiUsers /> User Management</NavLink>
                        <NavLink to="/admin/user-reports"><FiAlertTriangle /> Listing Reports</NavLink>
                        <NavLink to="/admin/tenant-reports"><FiAlertTriangle /> Tenant Reports</NavLink>
                        <NavLink to="/admin/support-inbox"><FiMessageCircle /> Help Center</NavLink>
                    </div>
                </details>

                <details className="admin-nav-group" open={propertiesOpen}>
                    <summary>
                        <span><FiFileText /> Properties</span>
                        <FiChevronDown className="admin-nav-arrow" />
                    </summary>
                    <div className="admin-nav-sub">
                        <NavLink to="/admin/property-approvals"><FiFileText /> Property Approvals</NavLink>
                        <NavLink to="/admin/properties"><FiHome /> Property Details</NavLink>
                    </div>
                </details>

                <details className="admin-nav-group" open={maintenanceOpen}>
                    <summary>
                        <span><FiTool /> Maintenance</span>
                        <FiChevronDown className="admin-nav-arrow" />
                    </summary>
                    <div className="admin-nav-sub">
                        <NavLink to="/admin/maintenance-approvals"><FiTool /> Maintenance Requests</NavLink>
                        <NavLink to="/admin/maintainers"><FiUsers /> Maintainers</NavLink>
                        <NavLink to="/admin/maintenance-conflicts"><FiAlertTriangle /> Maintenance Conflicts</NavLink>
                    </div>
                </details>

                <NavLink to="/admin/activity-logs"><FiActivity /> Activity Logs</NavLink>
            </nav>
            <button className="admin-signout" onClick={handleSignOut} type="button">
                <FiLogOut /> Sign out
            </button>
        </aside>
    );
};

export default AdminSidebar;
