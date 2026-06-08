import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingPage from "./features/Loading/pages/LoadingPage";
import AuthPage from "./features/auth/pages/authPage";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "./features/auth/pages/ResetPasswordPage";
import EmailVerificationPage from "./features/auth/pages/EmailVerificationPage";
import TenantHome from "./features/home/pages/TenantHome";
import LandlordHome from "./features/home/pages/LandlordHome";
import CompleteProfile from "./features/auth/pages/CompleteProfile";
import MyProperties from "./features/MyProperties/pages/MyProperties";
import RentalRequests from "./features/RentalRequests/pages/RentalRequests";
import BrowseProperties from "./features/BrowseProperties/pages/BrowseProperties";
import ActiveRental from "./features/ActiveRental/pages/ActiveRental";
import Settings from "./features/Settings/pages/Settings";
import Messages from "./features/Messages/pages/Messages";
import RoommateMatching from "./features/RoommateMatching/pages/RoommateMatching";
import Balance from "./features/Balance/pages/Balance";
import PrePayment from "./features/PrePayment/pages/PrePayment";
import PaymobVerify from "./features/PrePayment/pages/PaymobVerify";
import SavedProperties from "./features/SavedProperties/pages/SavedProperties";
import AboutUs from "./features/AboutUs/pages/AboutUs";
import GetHelp from "./features/GetHelp/pages/GetHelp";
import MyActives from "./features/ActiveRental/pages/MyActives";
import TenantPayment from "./features/TenantPayment/pages/TenantPayment";
import LandlordPayment from "./features/LandlordPayment/pages/LandlordPayment";
import HowItWorks from "./features/HowItWorks/pages/HowItWorks";
import HowItWorksChoose from "./features/HowItWorks/pages/HowItWorksChoose";
import ForTenants from "./features/HowItWorks/pages/ForTenants";
import ForMaintenance from "./features/HowItWorks/pages/ForMaintenance";
import ProMain from "./features/HomiPro/pages/ProMain";
import Rewards from "./features/Rewards/pages/Rewards";
import AdminLogin from "./features/admin/pages/AdminLogin";
import AdminDashboard from "./features/admin/pages/AdminDashboard";
import AdminPropertyApprovals from "./features/admin/pages/AdminPropertyApprovals";
import AdminUserReports from "./features/admin/pages/AdminUserReports";
import AdminActivityLogs from "./features/admin/pages/AdminActivityLogs";
import AdminUserManagement from "./features/admin/pages/AdminUserManagement";
import AdminSupportInbox from "./features/admin/pages/AdminSupportInbox";
import AdminMaintenanceApprovals from "./features/admin/pages/AdminMaintenanceApprovals";
import AdminMaintainers from "./features/admin/pages/AdminMaintainers";
import AdminRoommateMatching from "./features/admin/pages/AdminRoommateMatching";
import AdminContracts from "./features/admin/pages/AdminContracts";
import AdminPropertyDetails from "./features/admin/pages/AdminPropertyDetails";

import Contract from "./features/TenantContractView/pages/Contract";
import LandlordContract from "./features/LandlordContractView/pages/Contract";
import GuestHome from "./features/Guest/pages/GuestHome";
import GuestSearch from "./features/Guest/pages/GuestSearch";
import AuthGuard from "./components/global/AuthGuard";
import SentRequests from "./features/SentRequests/pages/SentRequests";
import PageNotFound from "./features/PageNotFound/pages/PageNotFound";
import LandlordPublicProfile from "./features/LandlordPublicProfile/pages/LandlordPublicProfile";
import VerifyEmailCallback from "./features/auth/pages/VerifyEmailCallback";
import AccountBannedPage from "./features/auth/pages/AccountBannedPage";

import MaintenanceHome from "./features/Maintenance/MaintenanceProvider/Home/pages/MaintenanceHome";
import JobRequests from "./features/Maintenance/MaintenanceProvider/JobRequests/pages/JobRequests";
import MyJobs from "./features/Maintenance/MaintenanceProvider/MyJobs/pages/MyJobs";
import AvailableJobs from "./features/Maintenance/MaintenanceProvider/AvailableJobs/pages/AvailableJobs";
import Earnings from "./features/Maintenance/MaintenanceProvider/Earnings/pages/Earnings";
import TenantMaintenance from "./features/Maintenance/MaintenanceForTenants&Landlords/pages/TenantMaintenance";
import LandlordMaintenance from "./features/Maintenance/MaintenanceForTenants&Landlords/pages/LandlordMaintenance";
import MaintenanceProviderOnboarding from "./features/MaintenanceProvider/pages/MaintenanceProviderOnboarding";
import MaintenanceConfirmationGate from "./features/Maintenance/MaintenanceForTenants&Landlords/components/MaintenanceConfirmationGate";
import Terms from "./features/Terms/pages/Terms";
import AddPropertyPage from "./features/home/pages/AddPropertyPage";
import PropertyDetailPage from "./features/BrowseProperties/pages/PropertyDetailPage";
import ApplicationPage from "./features/BrowseProperties/pages/ApplicationPage";
import AdminMaintenanceConflicts from "./features/admin/pages/AdminMaintenanceConflicts";



function App() {
  return (
    <BrowserRouter>
      <MaintenanceConfirmationGate />
      <Routes>
        {/* Entry Point */}
        <Route path="/" element={<LoadingPage />} />

        {/* Tenant Routes — protected */}
        <Route path="/tenant-home" element={<AuthGuard allowedRoles={['TENANT']}><TenantHome /></AuthGuard>} />
        <Route path="/browse-properties" element={<BrowseProperties />} /> {/* guests can browse; Apply Now button guards itself */}
        <Route path="/landlords/:landlordId" element={<LandlordPublicProfile />} />
        <Route path="/active-rental" element={<AuthGuard allowedRoles={['TENANT']}><ActiveRental /></AuthGuard>} />
        <Route path="/prepayment-page" element={<AuthGuard allowedRoles={['TENANT']}><PrePayment /></AuthGuard>} />
        <Route path="/payment/verify" element={<AuthGuard allowedRoles={['TENANT']}><PaymobVerify /></AuthGuard>} />
        <Route path="/saved-properties" element={<AuthGuard allowedRoles={['TENANT']}><SavedProperties /></AuthGuard>} />
        <Route path="/actives" element={<AuthGuard allowedRoles={['TENANT']}><MyActives /></AuthGuard>} />
        <Route path="/tenant-payment" element={<AuthGuard allowedRoles={['TENANT']}><TenantPayment /></AuthGuard>} />
        <Route path="/tenant-contracts" element={<AuthGuard allowedRoles={['TENANT']}><Contract /></AuthGuard>} />
        <Route path="/sent-requests" element={<AuthGuard allowedRoles={['TENANT']}><SentRequests /></AuthGuard>} />
        <Route path="/rewards" element={<AuthGuard allowedRoles={['TENANT']}><Rewards /></AuthGuard>} />
        <Route
          path="/matching"
          element={<AuthGuard allowedRoles={['TENANT']}><RoommateMatching /></AuthGuard>}
        />
        <Route
          path="/roommate-matching"
          element={<AuthGuard allowedRoles={['TENANT']}><RoommateMatching /></AuthGuard>}
        />
        <Route path="/tenant-maintenance" element={<AuthGuard allowedRoles={['TENANT']}><TenantMaintenance /></AuthGuard>} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/properties/:id/apply" element={<AuthGuard allowedRoles={['TENANT']}><ApplicationPage /></AuthGuard>} />

        {/* Landlord Routes — protected */}
        <Route path="/landlord-home" element={<AuthGuard allowedRoles={['LANDLORD']}><LandlordHome /></AuthGuard>} />
        <Route path="/my-properties" element={<AuthGuard allowedRoles={['LANDLORD']}><MyProperties /></AuthGuard>} />
        <Route path="/rental-requests" element={<AuthGuard allowedRoles={['LANDLORD']}><RentalRequests /></AuthGuard>} />
        <Route path="/landlord-payment" element={<AuthGuard allowedRoles={['LANDLORD']}><LandlordPayment /></AuthGuard>} />
        <Route path="/landlord-contracts" element={<AuthGuard allowedRoles={['LANDLORD']}><LandlordContract /></AuthGuard>} />
        <Route path="/landlord-maintenance" element={<AuthGuard allowedRoles={['LANDLORD']}><LandlordMaintenance /></AuthGuard>} />
        <Route path="/properties/add" element={<AuthGuard allowedRoles={['LANDLORD']}><AddPropertyPage /></AuthGuard>} />



        {/* Maintenance Routes */}
        <Route path="/maintenance-home" element={<AuthGuard allowedRoles={['MAINTENANCE_PROVIDER']}><MaintenanceHome /></AuthGuard>} />
        <Route path="/maintenance-requests" element={<AuthGuard allowedRoles={['MAINTENANCE_PROVIDER']}><JobRequests /></AuthGuard>} />
        <Route path="/my-jobs" element={<AuthGuard allowedRoles={['MAINTENANCE_PROVIDER']}><MyJobs /></AuthGuard>} />
        <Route path="/available-jobs" element={<AuthGuard allowedRoles={['MAINTENANCE_PROVIDER']}><AvailableJobs /></AuthGuard>} />
        <Route path="/earnings" element={<AuthGuard allowedRoles={['MAINTENANCE_PROVIDER']}><Earnings /></AuthGuard>} />
        <Route path="/maintenance-providers" element={<MaintenanceProviderOnboarding />} />

        {/* Global Dashboard Routes */}

        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/get-help" element={<GetHelp />} />
        <Route path="/how-it-works-choose" element={<HowItWorksChoose />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/for-landlords" element={<HowItWorks />} />
        <Route path="/for-tenants" element={<ForTenants />} />
        <Route path="/for-maintenance" element={<ForMaintenance />} />
        <Route path="/homi-pro" element={<ProMain />} />
        <Route path="/terms" element={<Terms />} />

        {/* Global Dashboard Routes — protected */}
        <Route path="/balance" element={<AuthGuard><Balance /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
        <Route path="/messages" element={<AuthGuard><Messages /></AuthGuard>} />

        <Route path="/not-found" element={<PageNotFound />} />

        {/* Guest Routes — public */}
        <Route path="/guest-home" element={<GuestHome />} />
        <Route path="/guest-search" element={<GuestSearch />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/auth/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
        <Route path="/admin/property-approvals" element={<AuthGuard allowedRoles={['ADMIN']}><AdminPropertyApprovals /></AuthGuard>} />
        <Route path="/admin/properties" element={<AuthGuard allowedRoles={['ADMIN']}><AdminPropertyDetails /></AuthGuard>} />
        <Route path="/admin/contracts" element={<AuthGuard allowedRoles={['ADMIN']}><AdminContracts /></AuthGuard>} />
        <Route path="/admin/user-reports" element={<AuthGuard allowedRoles={['ADMIN']}><AdminUserReports /></AuthGuard>} />
        <Route path="/admin/user-management" element={<AuthGuard allowedRoles={['ADMIN']}><AdminUserManagement /></AuthGuard>} />
        <Route path="/admin/activity-logs" element={<AuthGuard allowedRoles={['ADMIN']}><AdminActivityLogs /></AuthGuard>} />
        <Route path="/admin/support-inbox" element={<AuthGuard allowedRoles={['ADMIN']}><AdminSupportInbox /></AuthGuard>} />
        <Route path="/admin/maintenance-approvals" element={<AuthGuard allowedRoles={['ADMIN']}><AdminMaintenanceApprovals /></AuthGuard>} />
        <Route path="/admin/maintainers" element={<AuthGuard allowedRoles={['ADMIN']}><AdminMaintainers /></AuthGuard>} />
        <Route path="/admin/roommate-matching" element={<AuthGuard allowedRoles={['ADMIN']}><AdminRoommateMatching /></AuthGuard>} />
        <Route path="/admin/maintenance-conflicts" element={<AuthGuard allowedRoles={['ADMIN']}><AdminMaintenanceConflicts /></AuthGuard>} />

        {/* Auth Routes — public */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/verify-email-callback" element={<VerifyEmailCallback />} />
        <Route path="/account-banned" element={<AccountBannedPage />} />

        {/* Unknown routes — must be last */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
