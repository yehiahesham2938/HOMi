# 🗺️ HOMi Context & Component Diagrams Design Specification

> **Document Type:** System Architecture & Function Catalog
> **Scope:** Level 1 (Context) & Level 2/3 (Container/Component) Diagrams
> **Format:** Eraser.io Architecture-as-Code & Detailed Tables

This document contains the complete structural and functional design of the HOMi platform. It lists **every single component, file, service, controller, and function** across the frontend and backend, serving as an exhaustive reference to feed into the **Eraser.io** platform to generate the architecture diagrams.

---

## 🎨 1. Level 1: System Context Diagram

This diagram defines the high-level boundary of the HOMi platform, showing how the different actors interact with it, and how HOMi integrates with external software systems.

### 💻 Eraser.io System Context Code
Copy the block below and paste it in the **Eraser.io** Architecture diagram panel:

```d2
# Actors
tenant: Tenant {
  shape: person
  icon: user
}
landlord: Landlord {
  shape: person
  icon: user-tie
}
provider: Maintenance Provider {
  shape: person
  icon: tools
}
admin: System Admin {
  shape: person
  icon: shield
}

# HOMi System Boundary
homi: HOMi Platform {
  shape: rectangle
  color: blue
  icon: home
}

# External Services
paymob: Paymob Payment Gateway {
  shape: database
  icon: credit-card
}
gemini: Google Gemini AI {
  shape: cloud
  icon: cpu
}
valify: Valify OCR API {
  shape: cloud
  icon: fingerprint
}
google: Google OAuth 2.0 {
  shape: cloud
  icon: google
}
redis: Upstash Redis {
  shape: database
  icon: server
}
smtp: Gmail SMTP Server {
  shape: cloud
  icon: mail
}

# Interactions
tenant -> homi: "Searches props, signs leases, pays rent, raises maintenance"
landlord -> homi: "Lists props, approves rental requests, reports tenants"
provider -> homi: "Bids on maintenance, tracks route GPS, withdraws earnings"
admin -> homi: "Moderates reports, resolves disputes, issues warnings"

homi -> paymob: "Charges cards, handles wallets & payouts"
homi -> gemini: "Scorings roommate compatibility"
homi -> valify: "Proxies NID verification scans"
homi -> google: "Authenticates users"
homi -> smtp: "Sends email OTPs & official warnings"
homi -> redis: "Caches listing queries & manages active user sessions"
```

---

## ⚙️ 2. Level 2: Component & Container Diagram

This diagram details the internal software containers (frontend SPA, backend Express, database, cache) and how data flows between their components.

### 💻 Eraser.io Component Code
Copy the block below and paste it in the **Eraser.io** Architecture diagram panel:

```d2
group client [label: "Vite + React Client SPA"] {
  ui: React Pages & Components {
    icon: react
  }
  services: Client REST Services {
    icon: typescript
  }
}

group server [label: "Node.js + Express API Server"] {
  middleware: Auth & Validation Middleware {
    icon: lock
  }
  controllers: API Controllers {
    icon: gear
  }
  back_services: Business Logic Services {
    icon: code
  }
}

group data [label: "Data Storage Layer"] {
  db: Supabase PostgreSQL Database {
    icon: postgresql
  }
  cache: Upstash Redis Cache & Sessions {
    icon: redis
  }
}

# Internal Client Flows
ui -> services: "Triggers actions"

# Client to Server Flows
services -> middleware: "HTTPS REST requests"
middleware -> controllers: "Dispatches verified parameters"
controllers -> back_services: "Executes business operations"

# Server to Data Layer
back_services -> db: "Sequelize ORM queries"
back_services -> cache: "Session state HGETALL & GET cache"
```

---

## 📦 3. Exhaustive Function & Component Catalog

Below is the complete inventory of every file and function in the platform to serve as the ground truth metadata for the diagram nodes.

### 📱 3.1 Frontend Features & TSX Pages
These are the user-facing view components, located under `client/src/features/`:

#### 📁 Feature Module: `AboutUs`
- `client/src/features/AboutUs/pages/AboutUs.tsx`

#### 📁 Feature Module: `ActiveRental`
- `client/src/features/ActiveRental/components/DetailedRentCard.tsx`
- `client/src/features/ActiveRental/components/InstallmentsModal.tsx`
- `client/src/features/ActiveRental/components/MaintenanceStatus.tsx`
- `client/src/features/ActiveRental/components/OverdueRentTable.tsx`
- `client/src/features/ActiveRental/components/RentedPropertyCard.tsx`
- `client/src/features/ActiveRental/components/UpcomingPayment.tsx`
- `client/src/features/ActiveRental/pages/ActiveRental.tsx`
- `client/src/features/ActiveRental/pages/MyActives.tsx`

#### 📁 Feature Module: `Balance`
- `client/src/features/Balance/pages/Balance.tsx`

#### 📁 Feature Module: `BrowseProperties`
- `client/src/features/BrowseProperties/components/ApplicationModal.tsx`
- `client/src/features/BrowseProperties/components/BookVisitModal.tsx`
- `client/src/features/BrowseProperties/components/Filters.tsx`
- `client/src/features/BrowseProperties/components/PropertyCard.tsx`
- `client/src/features/BrowseProperties/components/PropertyDetailedModal.tsx`
- `client/src/features/BrowseProperties/components/SearchHero.tsx`
- `client/src/features/BrowseProperties/pages/ApplicationPage.tsx`
- `client/src/features/BrowseProperties/pages/BrowseProperties.tsx`
- `client/src/features/BrowseProperties/pages/PropertyDetailPage.tsx`

#### 📁 Feature Module: `ComingSoon`
- `client/src/features/ComingSoon/pages/ComingSoon.tsx`
- `client/src/features/ComingSoon/pages/HomiPlusComingSoon.tsx`

#### 📁 Feature Module: `GetHelp`
- `client/src/features/GetHelp/components/SupportHelpChat.tsx`
- `client/src/features/GetHelp/pages/GetHelp.tsx`

#### 📁 Feature Module: `Guest`
- `client/src/features/Guest/components/PropCard.tsx`
- `client/src/features/Guest/pages/GuestHome.tsx`
- `client/src/features/Guest/pages/GuestSearch.tsx`

#### 📁 Feature Module: `HomiPro`
- `client/src/features/HomiPro/components/SubscriptionProcess.tsx`
- `client/src/features/HomiPro/pages/ProMain.tsx`

#### 📁 Feature Module: `HowItWorks`
- `client/src/features/HowItWorks/pages/ForMaintenance.tsx`
- `client/src/features/HowItWorks/pages/ForTenants.tsx`
- `client/src/features/HowItWorks/pages/HowItWorks.tsx`
- `client/src/features/HowItWorks/pages/HowItWorksChoose.tsx`

#### 📁 Feature Module: `LandlordContractView`
- `client/src/features/LandlordContractView/components/ActiveLeaseContract.tsx`
- `client/src/features/LandlordContractView/components/ContractDetailView.tsx`
- `client/src/features/LandlordContractView/components/ExpiredLeaseContract.tsx`
- `client/src/features/LandlordContractView/components/SignatureModal.tsx`
- `client/src/features/LandlordContractView/components/TerminatedLeaseContract.tsx`
- `client/src/features/LandlordContractView/pages/Contract.tsx`

#### 📁 Feature Module: `LandlordPayment`
- `client/src/features/LandlordPayment/pages/LandlordPayment.tsx`

#### 📁 Feature Module: `LandlordPublicProfile`
- `client/src/features/LandlordPublicProfile/pages/LandlordPublicProfile.tsx`

#### 📁 Feature Module: `Loading`
- `client/src/features/Loading/pages/LoadingPage.tsx`

#### 📁 Feature Module: `Maintenance`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/ApplicationsModal.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/CompletionConfirmModal.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/DetailedIssueModal.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/IssuePostCard.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/LiveTrackingModal.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/MaintenanceConfirmationGate.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/ProviderCard.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/components/ProviderProfile.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/pages/LandlordMaintenance.tsx`
- `client/src/features/Maintenance/MaintenanceForTenants&Landlords/pages/TenantMaintenance.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/AvailableJobs/components/ApplyJobModal.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/AvailableJobs/components/AvailableJobCard.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/AvailableJobs/components/AvailableJobModal.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/AvailableJobs/pages/AvailableJobs.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/Earnings/pages/Earnings.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/Home/pages/MaintenanceHome.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/JobRequests/components/DetailedMaintenanceModal.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/JobRequests/components/JobRequestCard.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/JobRequests/pages/JobRequests.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/MyJobs/components/DetailedJobModal.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/MyJobs/components/JobCard.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/MyJobs/components/ProviderJobModal.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/MyJobs/pages/MyJobs.tsx`
- `client/src/features/Maintenance/MaintenanceProvider/SideBar/MaintenanceSideBar.tsx`

#### 📁 Feature Module: `MaintenanceProvider`
- `client/src/features/MaintenanceProvider/pages/MaintenanceProviderOnboarding.tsx`

#### 📁 Feature Module: `Messages`
- `client/src/features/Messages/components/ChatInput.tsx`
- `client/src/features/Messages/components/ChatSidebar.tsx`
- `client/src/features/Messages/components/ChatWindow.tsx`
- `client/src/features/Messages/components/MessageBubble.tsx`
- `client/src/features/Messages/pages/Messages.tsx`

#### 📁 Feature Module: `MyProperties`
- `client/src/features/MyProperties/components/DetailedPropertyCard.tsx`
- `client/src/features/MyProperties/components/DisablePropertyModal.tsx`
- `client/src/features/MyProperties/components/LandlordVisitsModal.tsx`
- `client/src/features/MyProperties/components/ManagePropertyModal.tsx`
- `client/src/features/MyProperties/components/OccupiedModal.tsx`
- `client/src/features/MyProperties/pages/MyProperties.tsx`

#### 📁 Feature Module: `PageNotFound`
- `client/src/features/PageNotFound/pages/PageNotFound.tsx`

#### 📁 Feature Module: `PrePayment`
- `client/src/features/PrePayment/components/ContractPreview.tsx`
- `client/src/features/PrePayment/components/RentDetails.tsx`
- `client/src/features/PrePayment/components/SecurityDeposit.tsx`
- `client/src/features/PrePayment/components/ServiceFee.tsx`
- `client/src/features/PrePayment/components/TotalAmount.tsx`
- `client/src/features/PrePayment/pages/PaymobVerify.tsx`
- `client/src/features/PrePayment/pages/PrePayment.tsx`

#### 📁 Feature Module: `RentalRequests`
- `client/src/features/RentalRequests/components/DetailedRequestModal.tsx`
- `client/src/features/RentalRequests/components/FilterTabs.tsx`
- `client/src/features/RentalRequests/components/RequestCard.tsx`
- `client/src/features/RentalRequests/components/StatsOverview.tsx`
- `client/src/features/RentalRequests/pages/RentalRequests.tsx`

#### 📁 Feature Module: `Rewards`
- `client/src/features/Rewards/pages/Rewards.tsx`

#### 📁 Feature Module: `RoommateMatching`
- `client/src/features/RoommateMatching/components/Avatar.tsx`
- `client/src/features/RoommateMatching/components/CompatibilityBadge.tsx`
- `client/src/features/RoommateMatching/components/EligibilityGate.tsx`
- `client/src/features/RoommateMatching/components/Filters.tsx`
- `client/src/features/RoommateMatching/components/HabitDisplays.tsx`
- `client/src/features/RoommateMatching/components/LeaseSection.tsx`
- `client/src/features/RoommateMatching/components/MatchCard.tsx`
- `client/src/features/RoommateMatching/components/ProfileModal.tsx`
- `client/src/features/RoommateMatching/components/Ring.tsx`
- `client/src/features/RoommateMatching/components/SmartGrid.tsx`
- `client/src/features/RoommateMatching/components/WishBar.tsx`
- `client/src/features/RoommateMatching/components/WishResults.tsx`
- `client/src/features/RoommateMatching/components/YouStrip.tsx`
- `client/src/features/RoommateMatching/pages/RoommateMatching.tsx`

#### 📁 Feature Module: `SavedProperties`
- `client/src/features/SavedProperties/pages/SavedProperties.tsx`

#### 📁 Feature Module: `SentRequests`
- `client/src/features/SentRequests/pages/SentRequests.tsx`

#### 📁 Feature Module: `Settings`
- `client/src/features/Settings/components/Billing.tsx`
- `client/src/features/Settings/components/DeleteAccountSection.tsx`
- `client/src/features/Settings/components/LifestyleHabits.tsx`
- `client/src/features/Settings/components/MyProfile.tsx`
- `client/src/features/Settings/components/Notifications.tsx`
- `client/src/features/Settings/components/Preferences.tsx`
- `client/src/features/Settings/components/Security.tsx`
- `client/src/features/Settings/components/SettingsSidebar.tsx`
- `client/src/features/Settings/pages/Settings.tsx`

#### 📁 Feature Module: `TenantContractView`
- `client/src/features/TenantContractView/components/ActiveLeaseContract.tsx`
- `client/src/features/TenantContractView/components/ContractDetailView.tsx`
- `client/src/features/TenantContractView/components/ExpiredLeaseContract.tsx`
- `client/src/features/TenantContractView/components/SignatureModal.tsx`
- `client/src/features/TenantContractView/components/TerminatedLeaseContract.tsx`
- `client/src/features/TenantContractView/pages/Contract.tsx`

#### 📁 Feature Module: `TenantPayment`
- `client/src/features/TenantPayment/components/CreditCardModal.tsx`
- `client/src/features/TenantPayment/pages/TenantPayment.tsx`

#### 📁 Feature Module: `Terms`
- `client/src/features/Terms/pages/Terms.tsx`

#### 📁 Feature Module: `admin`
- `client/src/features/admin/components/AdminSidebar.tsx`
- `client/src/features/admin/pages/AdminActivityLogs.tsx`
- `client/src/features/admin/pages/AdminContracts.tsx`
- `client/src/features/admin/pages/AdminDashboard.tsx`
- `client/src/features/admin/pages/AdminLogin.tsx`
- `client/src/features/admin/pages/AdminMaintainers.tsx`
- `client/src/features/admin/pages/AdminMaintenanceApprovals.tsx`
- `client/src/features/admin/pages/AdminMaintenanceConflicts.tsx`
- `client/src/features/admin/pages/AdminPropertyApprovals.tsx`
- `client/src/features/admin/pages/AdminPropertyDetails.tsx`
- `client/src/features/admin/pages/AdminPropertyTerminations.tsx`
- `client/src/features/admin/pages/AdminRoommateMatching.tsx`
- `client/src/features/admin/pages/AdminSupportInbox.tsx`
- `client/src/features/admin/pages/AdminTenantReports.tsx`
- `client/src/features/admin/pages/AdminUserManagement.tsx`
- `client/src/features/admin/pages/AdminUserReports.tsx`

#### 📁 Feature Module: `auth`
- `client/src/features/auth/components/GoogleLoginBtn.tsx`
- `client/src/features/auth/components/LandlordCredentials.tsx`
- `client/src/features/auth/components/LandlordProperties.tsx`
- `client/src/features/auth/components/NidQrBridge.tsx`
- `client/src/features/auth/components/NidScanner.tsx`
- `client/src/features/auth/components/StepAvatarFinish.tsx`
- `client/src/features/auth/components/StepGuidelines.tsx`
- `client/src/features/auth/components/StepUserType.tsx`
- `client/src/features/auth/components/TenantCredentials.tsx`
- `client/src/features/auth/components/TenantLifestyle.tsx`
- `client/src/features/auth/components/signin.tsx`
- `client/src/features/auth/components/signup.tsx`
- `client/src/features/auth/pages/AccountBannedPage.tsx`
- `client/src/features/auth/pages/CompleteProfile.tsx`
- `client/src/features/auth/pages/EmailVerificationPage.tsx`
- `client/src/features/auth/pages/ForgotPasswordPage.tsx`
- `client/src/features/auth/pages/LoginPage.tsx`
- `client/src/features/auth/pages/NidMobileScan.tsx`
- `client/src/features/auth/pages/ResetPasswordPage.tsx`
- `client/src/features/auth/pages/VerifyEmailCallback.tsx`
- `client/src/features/auth/pages/authPage.tsx`

#### 📁 Feature Module: `home`
- `client/src/features/home/components/LandlordHomeComponents/AddPropertyCard.tsx`
- `client/src/features/home/components/LandlordHomeComponents/AddPropertyModal.tsx`
- `client/src/features/home/components/LandlordHomeComponents/NotificationBar.tsx`
- `client/src/features/home/components/LandlordHomeComponents/Notifications.tsx`
- `client/src/features/home/components/LandlordHomeComponents/PaymentState.tsx`
- `client/src/features/home/components/LandlordHomeComponents/PropertyCard.tsx`
- `client/src/features/home/components/LandlordHomeComponents/TenantAI.tsx`
- `client/src/features/home/components/LandlordHomeComponents/optimizeListingModal.tsx`
- `client/src/features/home/components/TenantHomeComponents/ActiveRentalsCard.tsx`
- `client/src/features/home/components/TenantHomeComponents/MaintenanceRequests.tsx`
- `client/src/features/home/components/TenantHomeComponents/Notifications.tsx`
- `client/src/features/home/components/TenantHomeComponents/NotificationsBar.tsx`
- `client/src/features/home/components/TenantHomeComponents/QuickActions.tsx`
- `client/src/features/home/components/TenantHomeComponents/RewardsSummary.tsx`
- `client/src/features/home/components/TenantHomeComponents/UpcomingPayments.tsx`
- `client/src/features/home/pages/AddPropertyPage.tsx`
- `client/src/features/home/pages/LandlordHome.tsx`
- `client/src/features/home/pages/TenantHome.tsx`

### 🔌 3.2 Frontend Services & API Functions
These services coordinate the HTTP communication with the backend API, located under `client/src/services/`:

#### 📄 File: `client/src/services/admin.service.ts`

| Function / Method | Description |
|---|---|
| `actionTerminationRequest()` | Calls backend endpoint related to `admin.service` service. |
| `banTenantFromReport()` | Calls backend endpoint related to `admin.service` service. |
| `banUser()` | Calls backend endpoint related to `admin.service` service. |
| `getActivityLogs()` | Calls backend endpoint related to `admin.service` service. |
| `getAllContracts()` | Calls backend endpoint related to `admin.service` service. |
| `getAllProperties()` | Calls backend endpoint related to `admin.service` service. |
| `getDashboardStats()` | Calls backend endpoint related to `admin.service` service. |
| `getListingReports()` | Calls backend endpoint related to `admin.service` service. |
| `getMaintainersForManagement()` | Calls backend endpoint related to `admin.service` service. |
| `getPendingMaintenanceApplications()` | Calls backend endpoint related to `admin.service` service. |
| `getPendingProperties()` | Calls backend endpoint related to `admin.service` service. |
| `getPropertyDetails()` | Calls backend endpoint related to `admin.service` service. |
| `getSupportInbox()` | Calls backend endpoint related to `admin.service` service. |
| `getTenantReports()` | Calls backend endpoint related to `admin.service` service. |
| `getTerminationRequests()` | Calls backend endpoint related to `admin.service` service. |
| `getUserProfile()` | Calls backend endpoint related to `admin.service` service. |
| `getUsersForManagement()` | Calls backend endpoint related to `admin.service` service. |
| `removeListingFromReport()` | Calls backend endpoint related to `admin.service` service. |
| `reviewMaintenanceApplication()` | Calls backend endpoint related to `admin.service` service. |
| `unbanUser()` | Calls backend endpoint related to `admin.service` service. |
| `verifyProperty()` | Calls backend endpoint related to `admin.service` service. |
| `warnTenantFromReport()` | Calls backend endpoint related to `admin.service` service. |

#### 📄 File: `client/src/services/auth.service.ts`

| Function / Method | Description |
|---|---|
| `changePassword()` | Calls backend endpoint related to `auth.service` service. |
| `checkMaintenanceAvailability()` | Calls backend endpoint related to `auth.service` service. |
| `checkSignupAvailability()` | Calls backend endpoint related to `auth.service` service. |
| `clearLocalAuthState()` | Calls backend endpoint related to `auth.service` service. |
| `completeVerification()` | Calls backend endpoint related to `auth.service` service. |
| `deleteAccount()` | Calls backend endpoint related to `auth.service` service. |
| `deletePasskeys()` | Calls backend endpoint related to `auth.service` service. |
| `forgotPassword()` | Calls backend endpoint related to `auth.service` service. |
| `getCurrentUser()` | Calls backend endpoint related to `auth.service` service. |
| `getLifestyleHabits()` | Calls backend endpoint related to `auth.service` service. |
| `getPasskeyAuthenticationOptions()` | Calls backend endpoint related to `auth.service` service. |
| `getPasskeyRegistrationOptions()` | Calls backend endpoint related to `auth.service` service. |
| `getProfile()` | Calls backend endpoint related to `auth.service` service. |
| `getUserHabits()` | Calls backend endpoint related to `auth.service` service. |
| `if()` | Calls backend endpoint related to `auth.service` service. |
| `isAuthenticated()` | Calls backend endpoint related to `auth.service` service. |
| `isTenantSession()` | Calls backend endpoint related to `auth.service` service. |
| `login()` | Calls backend endpoint related to `auth.service` service. |
| `loginWithGoogle()` | Calls backend endpoint related to `auth.service` service. |
| `logout()` | Calls backend endpoint related to `auth.service` service. |
| `maintenanceApply()` | Calls backend endpoint related to `auth.service` service. |
| `maintenanceLogin()` | Calls backend endpoint related to `auth.service` service. |
| `nidOcr()` | Calls backend endpoint related to `auth.service` service. |
| `nidSessionOcr()` | Calls backend endpoint related to `auth.service` service. |
| `register()` | Calls backend endpoint related to `auth.service` service. |
| `resetPassword()` | Calls backend endpoint related to `auth.service` service. |
| `resolvePostAuthRoute()` | Calls backend endpoint related to `auth.service` service. |
| `sendVerificationEmail()` | Calls backend endpoint related to `auth.service` service. |
| `setHabits()` | Calls backend endpoint related to `auth.service` service. |
| `setLifestyleHabits()` | Calls backend endpoint related to `auth.service` service. |
| `skipOnboardingStep3()` | Calls backend endpoint related to `auth.service` service. |
| `tryRestoreSession()` | Calls backend endpoint related to `auth.service` service. |
| `updateProfile()` | Calls backend endpoint related to `auth.service` service. |
| `updateRole()` | Calls backend endpoint related to `auth.service` service. |
| `verifyEmail()` | Calls backend endpoint related to `auth.service` service. |
| `verifyPasskeyAuthentication()` | Calls backend endpoint related to `auth.service` service. |
| `verifyPasskeyRegistration()` | Calls backend endpoint related to `auth.service` service. |

#### 📄 File: `client/src/services/contract.service.ts`

| Function / Method | Description |
|---|---|
| `advanceTestingClock()` | Calls backend endpoint related to `contract.service` service. |
| `getContractById()` | Calls backend endpoint related to `contract.service` service. |
| `getContractInstallments()` | Calls backend endpoint related to `contract.service` service. |
| `getContractPaymentDetails()` | Calls backend endpoint related to `contract.service` service. |
| `getLandlordContracts()` | Calls backend endpoint related to `contract.service` service. |
| `getPaymentHistory()` | Calls backend endpoint related to `contract.service` service. |
| `getTenantContracts()` | Calls backend endpoint related to `contract.service` service. |
| `getTestingClock()` | Calls backend endpoint related to `contract.service` service. |
| `getVerificationSummary()` | Calls backend endpoint related to `contract.service` service. |
| `getWalletBalance()` | Calls backend endpoint related to `contract.service` service. |
| `if()` | Calls backend endpoint related to `contract.service` service. |
| `initiatePaymobPayment()` | Calls backend endpoint related to `contract.service` service. |
| `initiateWalletTopup()` | Calls backend endpoint related to `contract.service` service. |
| `payContractFromBalance()` | Calls backend endpoint related to `contract.service` service. |
| `payMonthlyRentFromBalance()` | Calls backend endpoint related to `contract.service` service. |
| `reportTenant()` | Calls backend endpoint related to `contract.service` service. |
| `resetTestingClock()` | Calls backend endpoint related to `contract.service` service. |
| `setContractAutopay()` | Calls backend endpoint related to `contract.service` service. |
| `signLandlordContract()` | Calls backend endpoint related to `contract.service` service. |
| `signTenantContract()` | Calls backend endpoint related to `contract.service` service. |
| `terminateLease()` | Calls backend endpoint related to `contract.service` service. |
| `updateLandlordIdentity()` | Calls backend endpoint related to `contract.service` service. |
| `updateLeaseTerms()` | Calls backend endpoint related to `contract.service` service. |
| `updatePropertyConfirmation()` | Calls backend endpoint related to `contract.service` service. |
| `updateTenantIdentity()` | Calls backend endpoint related to `contract.service` service. |
| `verifyPaymobPayment()` | Calls backend endpoint related to `contract.service` service. |
| `verifyWalletTopup()` | Calls backend endpoint related to `contract.service` service. |
| `withdrawWalletBalance()` | Calls backend endpoint related to `contract.service` service. |

#### 📄 File: `client/src/services/maintenance.service.ts`

| Function / Method | Description |
|---|---|
| `acceptApplication()` | Calls backend endpoint related to `maintenance.service` service. |
| `acceptApplicationAsLandlord()` | Calls backend endpoint related to `maintenance.service` service. |
| `applyToRequest()` | Calls backend endpoint related to `maintenance.service` service. |
| `cancelTenantRequest()` | Calls backend endpoint related to `maintenance.service` service. |
| `confirmCompletion()` | Calls backend endpoint related to `maintenance.service` service. |
| `getAwaitingConfirmation()` | Calls backend endpoint related to `maintenance.service` service. |
| `getCurrentLocation()` | Calls backend endpoint related to `maintenance.service` service. |
| `getProviderEarnings()` | Calls backend endpoint related to `maintenance.service` service. |
| `getRequest()` | Calls backend endpoint related to `maintenance.service` service. |
| `getTenantContext()` | Calls backend endpoint related to `maintenance.service` service. |
| `listApplicationsForRequest()` | Calls backend endpoint related to `maintenance.service` service. |
| `listAvailableJobs()` | Calls backend endpoint related to `maintenance.service` service. |
| `listConflicts()` | Calls backend endpoint related to `maintenance.service` service. |
| `listLandlordRequests()` | Calls backend endpoint related to `maintenance.service` service. |
| `listMyApplications()` | Calls backend endpoint related to `maintenance.service` service. |
| `listProviderRequests()` | Calls backend endpoint related to `maintenance.service` service. |
| `listProviders()` | Calls backend endpoint related to `maintenance.service` service. |
| `listTenantRequests()` | Calls backend endpoint related to `maintenance.service` service. |
| `markComplete()` | Calls backend endpoint related to `maintenance.service` service. |
| `postIssue()` | Calls backend endpoint related to `maintenance.service` service. |
| `resolveConflict()` | Calls backend endpoint related to `maintenance.service` service. |
| `setArrived()` | Calls backend endpoint related to `maintenance.service` service. |
| `setEnRoute()` | Calls backend endpoint related to `maintenance.service` service. |
| `updateLocation()` | Calls backend endpoint related to `maintenance.service` service. |

#### 📄 File: `client/src/services/message.service.ts`

| Function / Method | Description |
|---|---|
| `getConversationMessages()` | Calls backend endpoint related to `message.service` service. |
| `getSupportThread()` | Calls backend endpoint related to `message.service` service. |
| `getUnreadBadge()` | Calls backend endpoint related to `message.service` service. |
| `listConversations()` | Calls backend endpoint related to `message.service` service. |
| `markConversationRead()` | Calls backend endpoint related to `message.service` service. |
| `sendMessage()` | Calls backend endpoint related to `message.service` service. |
| `sendSupportMessage()` | Calls backend endpoint related to `message.service` service. |
| `startConversation()` | Calls backend endpoint related to `message.service` service. |

#### 📄 File: `client/src/services/notification.service.ts`

| Function / Method | Description |
|---|---|
| `list()` | Calls backend endpoint related to `notification.service` service. |
| `markAllRead()` | Calls backend endpoint related to `notification.service` service. |
| `markRead()` | Calls backend endpoint related to `notification.service` service. |
| `remove()` | Calls backend endpoint related to `notification.service` service. |
| `unreadCount()` | Calls backend endpoint related to `notification.service` service. |

#### 📄 File: `client/src/services/passkey.service.ts`

| Function / Method | Description |
|---|---|
| `authenticateWithPasskey()` | Calls backend endpoint related to `passkey.service` service. |
| `disablePasskeyForCurrentUser()` | Calls backend endpoint related to `passkey.service` service. |
| `hasSavedPasskeyForCachedUser()` | Calls backend endpoint related to `passkey.service` service. |
| `hasSavedPasskeyForCurrentUser()` | Calls backend endpoint related to `passkey.service` service. |
| `if()` | Calls backend endpoint related to `passkey.service` service. |
| `isSupported()` | Calls backend endpoint related to `passkey.service` service. |
| `registerPasskeyForCurrentUser()` | Calls backend endpoint related to `passkey.service` service. |

#### 📄 File: `client/src/services/payment-method.service.ts`

| Function / Method | Description |
|---|---|
| `createMethod()` | Calls backend endpoint related to `payment-method.service` service. |
| `deleteMethod()` | Calls backend endpoint related to `payment-method.service` service. |
| `getMyMethods()` | Calls backend endpoint related to `payment-method.service` service. |
| `setDefault()` | Calls backend endpoint related to `payment-method.service` service. |

#### 📄 File: `client/src/services/pdf.service.ts`

| Function / Method | Description |
|---|---|
| `for()` | Calls backend endpoint related to `pdf.service` service. |
| `generateContractPDF()` | Calls backend endpoint related to `pdf.service` service. |
| `if()` | Calls backend endpoint related to `pdf.service` service. |

#### 📄 File: `client/src/services/property.service.ts`

| Function / Method | Description |
|---|---|
| `bookVisit()` | Calls backend endpoint related to `property.service` service. |
| `createProperty()` | Calls backend endpoint related to `property.service` service. |
| `getAllProperties()` | Calls backend endpoint related to `property.service` service. |
| `getMyVisit()` | Calls backend endpoint related to `property.service` service. |
| `getPropertyById()` | Calls backend endpoint related to `property.service` service. |
| `getPropertyVisits()` | Calls backend endpoint related to `property.service` service. |
| `getPublicLandlordProfile()` | Calls backend endpoint related to `property.service` service. |
| `publishProperty()` | Calls backend endpoint related to `property.service` service. |
| `reportProperty()` | Calls backend endpoint related to `property.service` service. |
| `updateProperty()` | Calls backend endpoint related to `property.service` service. |
| `updateVisitStatus()` | Calls backend endpoint related to `property.service` service. |

#### 📄 File: `client/src/services/rental-request.service.ts`

| Function / Method | Description |
|---|---|
| `cancelMyRequest()` | Calls backend endpoint related to `rental-request.service` service. |
| `getLandlordRequests()` | Calls backend endpoint related to `rental-request.service` service. |
| `getMyRequests()` | Calls backend endpoint related to `rental-request.service` service. |
| `submitRentalRequest()` | Calls backend endpoint related to `rental-request.service` service. |
| `updateRequestStatus()` | Calls backend endpoint related to `rental-request.service` service. |

#### 📄 File: `client/src/services/rewards.service.ts`

| Function / Method | Description |
|---|---|
| `getDashboardData()` | Calls backend endpoint related to `rewards.service` service. |
| `if()` | Calls backend endpoint related to `rewards.service` service. |

#### 📄 File: `client/src/services/saved-properties.service.ts`

| Function / Method | Description |
|---|---|
| `clearAll()` | Calls backend endpoint related to `saved-properties.service` service. |
| `getSavedIds()` | Calls backend endpoint related to `saved-properties.service` service. |
| `getSavedProperties()` | Calls backend endpoint related to `saved-properties.service` service. |
| `removeSavedProperty()` | Calls backend endpoint related to `saved-properties.service` service. |
| `saveProperty()` | Calls backend endpoint related to `saved-properties.service` service. |

#### 📄 File: `client/src/services/socket.service.ts`

| Function / Method | Description |
|---|---|
| `connect()` | Calls backend endpoint related to `socket.service` service. |
| `disconnect()` | Calls backend endpoint related to `socket.service` service. |
| `if()` | Calls backend endpoint related to `socket.service` service. |
| `joinConversation()` | Calls backend endpoint related to `socket.service` service. |
| `joinMaintenanceRequest()` | Calls backend endpoint related to `socket.service` service. |
| `leaveConversation()` | Calls backend endpoint related to `socket.service` service. |
| `leaveMaintenanceRequest()` | Calls backend endpoint related to `socket.service` service. |
| `resetAuthState()` | Calls backend endpoint related to `socket.service` service. |

### ⚙️ 3.3 Backend Controllers
Controllers manage API routing request parameters, invoke backend service operations, and return HTTP payloads. Located under `server/src/modules/*/controllers/`:

#### 📄 File: `server/src/modules/admin/controllers/admin.controller.ts`

| Controller Method | Description |
|---|---|
| `actionTerminationRequest(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `banTenantFromReport(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `banUser(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getActivityLogs(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getAllContracts(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getAllProperties(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getDashboardStats(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getListingReports(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getMaintainersForManagement(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getPendingMaintenanceApplications(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getPendingProperties(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getPropertyDetails(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getSupportInbox(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getTenantReports(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getTerminationRequests(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getUserProfile(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `getUsersForManagement(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `login(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `removeReportedListing(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `reviewMaintenanceApplication(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `unbanUser(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `verifyProperty(req, res, next)` | Dispatches route inputs for `admin.controller`. |
| `warnTenantFromReport(req, res, next)` | Dispatches route inputs for `admin.controller`. |

#### 📄 File: `server/src/modules/auth/controllers/auth.controller.ts`

| Controller Method | Description |
|---|---|
| `applyMaintenanceProvider(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `changePassword(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `checkMaintenanceAvailability(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `checkSignupAvailability(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `completeNidSession(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `completeVerification(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `createNidSession(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `deleteAccount(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `deletePasskeys(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `forgotPassword(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `getCurrentUser(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `getLifestyleHabits(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `getNidSession(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `getUserHabits(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `googleLogin(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `listPasskeys(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `login(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `logout(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `maintenanceLogin(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `nidOcr(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `nidSessionOcr(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `passkeyAuthenticationOptions(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `passkeyAuthenticationVerify(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `passkeyRegistrationOptions(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `passkeyRegistrationVerify(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `refresh(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `register(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `resetPassword(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `sendVerificationEmail(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `setLifestyleHabits(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `setUserHabits(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `skipOnboardingStep3(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `updateProfile(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `updateRole(req, res, next)` | Dispatches route inputs for `auth.controller`. |
| `verifyEmail(req, res, next)` | Dispatches route inputs for `auth.controller`. |

#### 📄 File: `server/src/modules/contracts/controllers/contract.controller.ts`

| Controller Method | Description |
|---|---|
| `advanceTestingClock(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getContractById(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getContractInstallments(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getLandlordContracts(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getTenantContracts(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getTenantPaymentHistory(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getTestingClock(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getVerificationSummary(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `getWalletBalance(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `initiatePaymobPayment(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `initiateWalletTopup(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `payContractFromBalance(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `payMonthlyRentFromBalance(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `reportTenant(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `resetTestingClock(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `signContractLandlord(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `signContractTenant(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `submitLandlordIdentity(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `submitLandlordLeaseTerms(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `submitLandlordPropertyConfirmation(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `submitTenantIdentity(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `terminateLease(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `updateAutopay(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `verifyPaymobPayment(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `verifyWalletTopup(req, res, next)` | Dispatches route inputs for `contract.controller`. |
| `withdrawWalletBalance(req, res, next)` | Dispatches route inputs for `contract.controller`. |

#### 📄 File: `server/src/modules/maintenance/controllers/maintenance.controller.ts`

| Controller Method | Description |
|---|---|
| `acceptApplication(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `applyToRequest(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `cancelRequest(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `confirmCompletion(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `getAwaitingConfirmation(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `getCurrentLocation(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `getOne(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `getProviderEarnings(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `getTenantContext(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listAdminConflicts(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listApplicationsForRequest(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listAvailableJobs(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listLandlordRequests(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listMyApplications(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listProviderRequests(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listProviders(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `listTenantRequests(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `markComplete(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `postIssue(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `resolveConflict(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `setArrived(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `setEnRoute(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |
| `updateLocation(req, res, next)` | Dispatches route inputs for `maintenance.controller`. |

#### 📄 File: `server/src/modules/messages/controllers/message.controller.ts`

| Controller Method | Description |
|---|---|
| `getConversationMessages(req, res, next)` | Dispatches route inputs for `message.controller`. |
| `getUnreadBadge(req, res, next)` | Dispatches route inputs for `message.controller`. |
| `listConversations(req, res, next)` | Dispatches route inputs for `message.controller`. |
| `markConversationRead(req, res, next)` | Dispatches route inputs for `message.controller`. |
| `sendMessage(req, res, next)` | Dispatches route inputs for `message.controller`. |
| `startConversation(req, res, next)` | Dispatches route inputs for `message.controller`. |

#### 📄 File: `server/src/modules/messages/controllers/support.controller.ts`

| Controller Method | Description |
|---|---|
| `getSupportThread(req, res, next)` | Dispatches route inputs for `support.controller`. |
| `sendSupportMessage(req, res, next)` | Dispatches route inputs for `support.controller`. |

#### 📄 File: `server/src/modules/notifications/controllers/notification.controller.ts`

| Controller Method | Description |
|---|---|
| `list(req, res, next)` | Dispatches route inputs for `notification.controller`. |
| `markAllRead(req, res, next)` | Dispatches route inputs for `notification.controller`. |
| `markRead(req, res, next)` | Dispatches route inputs for `notification.controller`. |
| `remove(req, res, next)` | Dispatches route inputs for `notification.controller`. |
| `unreadCount(req, res, next)` | Dispatches route inputs for `notification.controller`. |

#### 📄 File: `server/src/modules/payment-methods/controllers/payment-method.controller.ts`

| Controller Method | Description |
|---|---|
| `createMethod(req, res, next)` | Dispatches route inputs for `payment-method.controller`. |
| `deleteMethod(req, res, next)` | Dispatches route inputs for `payment-method.controller`. |
| `getMyMethods(req, res, next)` | Dispatches route inputs for `payment-method.controller`. |
| `setDefaultMethod(req, res, next)` | Dispatches route inputs for `payment-method.controller`. |

#### 📄 File: `server/src/modules/properties/controllers/property.controller.ts`

| Controller Method | Description |
|---|---|
| `bookVisit(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `createProperty(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `deleteProperty(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `getAllProperties(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `getImage(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `getMyVisit(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `getPropertyById(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `getPropertyVisits(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `getPublicLandlordProfile(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `invalidatePropertyListCache(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `reportProperty(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `updateProperty(req, res, next)` | Dispatches route inputs for `property.controller`. |
| `updateVisitStatus(req, res, next)` | Dispatches route inputs for `property.controller`. |

#### 📄 File: `server/src/modules/rental-requests/controllers/rental-request.controller.ts`

| Controller Method | Description |
|---|---|
| `cancelMyRentalRequest(req, res, next)` | Dispatches route inputs for `rental-request.controller`. |
| `createRentalRequest(req, res, next)` | Dispatches route inputs for `rental-request.controller`. |
| `getLandlordRentalRequests(req, res, next)` | Dispatches route inputs for `rental-request.controller`. |
| `getMyRentalRequests(req, res, next)` | Dispatches route inputs for `rental-request.controller`. |
| `getRentalRequestById(req, res, next)` | Dispatches route inputs for `rental-request.controller`. |
| `updateRentalRequestStatus(req, res, next)` | Dispatches route inputs for `rental-request.controller`. |

#### 📄 File: `server/src/modules/roommate-matching/controllers/roommate-matching.controller.ts`

| Controller Method | Description |
|---|---|
| `browseRequests(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `cancelRequest(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `checkEligibility(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `connect(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `createRequest(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `findMatches(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `getIncomingRequests(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `getLeases(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `getMatches(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `getMyActiveRequest(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `respondToMatch(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `saveLeaseConfig(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `smartMatches(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `updateRequest(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |
| `wish(req, res, next)` | Dispatches route inputs for `roommate-matching.controller`. |

#### 📄 File: `server/src/modules/saved-properties/controllers/saved-properties.controller.ts`

| Controller Method | Description |
|---|---|
| `clearSavedProperties(req, res, next)` | Dispatches route inputs for `saved-properties.controller`. |
| `getMySavedProperties(req, res, next)` | Dispatches route inputs for `saved-properties.controller`. |
| `getMySavedPropertyIds(req, res, next)` | Dispatches route inputs for `saved-properties.controller`. |
| `removeSavedProperty(req, res, next)` | Dispatches route inputs for `saved-properties.controller`. |
| `saveProperty(req, res, next)` | Dispatches route inputs for `saved-properties.controller`. |

### ⚙️ 3.4 Backend Business Services
Services execute core business logic, database transactions, validation, notifications, and caching. Located under `server/src/modules/*/services/`:

#### 📄 File: `server/src/modules/admin/services/admin.service.ts`

| Business Function | Description |
|---|---|
| `actionTerminationRequest(...)` | Business operations for `admin.service` module. |
| `banTenantFromReport(...)` | Business operations for `admin.service` module. |
| `banUserForAdmin(...)` | Business operations for `admin.service` module. |
| `for(...)` | Business operations for `admin.service` module. |
| `getActivityLogs(...)` | Business operations for `admin.service` module. |
| `getAllContracts(...)` | Business operations for `admin.service` module. |
| `getAllPropertiesForAdmin(...)` | Business operations for `admin.service` module. |
| `getDashboardStats(...)` | Business operations for `admin.service` module. |
| `getListingReports(...)` | Business operations for `admin.service` module. |
| `getMaintainersForManagement(...)` | Business operations for `admin.service` module. |
| `getPendingMaintenanceApplications(...)` | Business operations for `admin.service` module. |
| `getPendingProperties(...)` | Business operations for `admin.service` module. |
| `getPropertyDetailsForAdmin(...)` | Business operations for `admin.service` module. |
| `getSupportInbox(...)` | Business operations for `admin.service` module. |
| `getTenantReports(...)` | Business operations for `admin.service` module. |
| `getTerminationRequests(...)` | Business operations for `admin.service` module. |
| `getUserProfileForAdmin(...)` | Business operations for `admin.service` module. |
| `getUsersForManagement(...)` | Business operations for `admin.service` module. |
| `if(...)` | Business operations for `admin.service` module. |
| `removeListingFromReport(...)` | Business operations for `admin.service` module. |
| `reviewMaintenanceApplication(...)` | Business operations for `admin.service` module. |
| `unbanUserForAdmin(...)` | Business operations for `admin.service` module. |
| `verifyProperty(...)` | Business operations for `admin.service` module. |
| `warnTenantFromReport(...)` | Business operations for `admin.service` module. |

#### 📄 File: `server/src/modules/auth/services/auth.service.ts`

| Business Function | Description |
|---|---|
| `applyAsMaintenanceProvider(...)` | Business operations for `auth.service` module. |
| `changePassword(...)` | Business operations for `auth.service` module. |
| `checkMaintenanceAvailability(...)` | Business operations for `auth.service` module. |
| `checkSignupAvailability(...)` | Business operations for `auth.service` module. |
| `completeVerification(...)` | Business operations for `auth.service` module. |
| `deleteAccount(...)` | Business operations for `auth.service` module. |
| `enforceBanPolicy(...)` | Business operations for `auth.service` module. |
| `findUserByLoginIdentifier(...)` | Business operations for `auth.service` module. |
| `for(...)` | Business operations for `auth.service` module. |
| `forgotPassword(...)` | Business operations for `auth.service` module. |
| `getCurrentUser(...)` | Business operations for `auth.service` module. |
| `getLifestyleHabits(...)` | Business operations for `auth.service` module. |
| `getUserHabits(...)` | Business operations for `auth.service` module. |
| `if(...)` | Business operations for `auth.service` module. |
| `login(...)` | Business operations for `auth.service` module. |
| `loginWithGoogle(...)` | Business operations for `auth.service` module. |
| `loginWithPasskey(...)` | Business operations for `auth.service` module. |
| `maintenanceLogin(...)` | Business operations for `auth.service` module. |
| `refreshAccessToken(...)` | Business operations for `auth.service` module. |
| `register(...)` | Business operations for `auth.service` module. |
| `resetPassword(...)` | Business operations for `auth.service` module. |
| `sendVerificationEmail(...)` | Business operations for `auth.service` module. |
| `setLifestyleHabits(...)` | Business operations for `auth.service` module. |
| `setUserHabits(...)` | Business operations for `auth.service` module. |
| `skipOnboardingStep3(...)` | Business operations for `auth.service` module. |
| `updateProfile(...)` | Business operations for `auth.service` module. |
| `updateRole(...)` | Business operations for `auth.service` module. |
| `verifyEmail(...)` | Business operations for `auth.service` module. |

#### 📄 File: `server/src/modules/auth/services/valify.service.ts`

*No public methods declared.*

#### 📄 File: `server/src/modules/auth/services/webauthn.service.ts`

| Business Function | Description |
|---|---|
| `authenticationOptions(...)` | Business operations for `webauthn.service` module. |
| `authenticationVerify(...)` | Business operations for `webauthn.service` module. |
| `deleteAllPasskeys(...)` | Business operations for `webauthn.service` module. |
| `if(...)` | Business operations for `webauthn.service` module. |
| `listPasskeys(...)` | Business operations for `webauthn.service` module. |
| `registrationOptions(...)` | Business operations for `webauthn.service` module. |
| `registrationVerify(...)` | Business operations for `webauthn.service` module. |

#### 📄 File: `server/src/modules/contracts/services/contract.service.ts`

| Business Function | Description |
|---|---|
| `advanceTestingClock(...)` | Business operations for `contract.service` module. |
| `advanceTestingClockWithSnapshot(...)` | Business operations for `contract.service` module. |
| `captureDbSnapshot(...)` | Business operations for `contract.service` module. |
| `createContractFromApproval(...)` | Business operations for `contract.service` module. |
| `executeApprovedLeaseTermination(...)` | Business operations for `contract.service` module. |
| `expireCompletedLeases(...)` | Business operations for `contract.service` module. |
| `findAndValidateLandlordContract(...)` | Business operations for `contract.service` module. |
| `findAndValidateTenantContract(...)` | Business operations for `contract.service` module. |
| `findAndValidateTenantPaymentContract(...)` | Business operations for `contract.service` module. |
| `for(...)` | Business operations for `contract.service` module. |
| `getContractById(...)` | Business operations for `contract.service` module. |
| `getContractInstallments(...)` | Business operations for `contract.service` module. |
| `getLandlordContracts(...)` | Business operations for `contract.service` module. |
| `getTenantContracts(...)` | Business operations for `contract.service` module. |
| `getTenantPaymentHistory(...)` | Business operations for `contract.service` module. |
| `getTestingClockState(...)` | Business operations for `contract.service` module. |
| `getVerificationSummary(...)` | Business operations for `contract.service` module. |
| `getWalletBalance(...)` | Business operations for `contract.service` module. |
| `if(...)` | Business operations for `contract.service` module. |
| `initiatePaymobPayment(...)` | Business operations for `contract.service` module. |
| `initiateWalletTopup(...)` | Business operations for `contract.service` module. |
| `payContractFromBalance(...)` | Business operations for `contract.service` module. |
| `payMonthlyRentFromBalance(...)` | Business operations for `contract.service` module. |
| `reportTenant(...)` | Business operations for `contract.service` module. |
| `requestLeaseTermination(...)` | Business operations for `contract.service` module. |
| `resetTestingClock(...)` | Business operations for `contract.service` module. |
| `resetTestingClockWithRestore(...)` | Business operations for `contract.service` module. |
| `restoreDbSnapshot(...)` | Business operations for `contract.service` module. |
| `runAutopaySweepForTenant(...)` | Business operations for `contract.service` module. |
| `runDailyLeaseCycleCheck(...)` | Business operations for `contract.service` module. |
| `setContractAutopay(...)` | Business operations for `contract.service` module. |
| `signContractLandlord(...)` | Business operations for `contract.service` module. |
| `signContractTenant(...)` | Business operations for `contract.service` module. |
| `submitLandlordIdentity(...)` | Business operations for `contract.service` module. |
| `submitLandlordLeaseTerms(...)` | Business operations for `contract.service` module. |
| `submitLandlordPropertyConfirmation(...)` | Business operations for `contract.service` module. |
| `submitTenantIdentity(...)` | Business operations for `contract.service` module. |
| `syncPropertyStatuses(...)` | Business operations for `contract.service` module. |
| `verifyPaymobPayment(...)` | Business operations for `contract.service` module. |
| `verifyWalletTopup(...)` | Business operations for `contract.service` module. |
| `withdrawWalletBalance(...)` | Business operations for `contract.service` module. |

#### 📄 File: `server/src/modules/maintenance/services/maintenance.service.ts`

| Business Function | Description |
|---|---|
| `acceptApplication(...)` | Business operations for `maintenance.service` module. |
| `applyToRequest(...)` | Business operations for `maintenance.service` module. |
| `cancelRequest(...)` | Business operations for `maintenance.service` module. |
| `confirmCompletion(...)` | Business operations for `maintenance.service` module. |
| `creditWallet(...)` | Business operations for `maintenance.service` module. |
| `debitWallet(...)` | Business operations for `maintenance.service` module. |
| `deriveChargeParty(...)` | Business operations for `maintenance.service` module. |
| `findProvidersForCategory(...)` | Business operations for `maintenance.service` module. |
| `for(...)` | Business operations for `maintenance.service` module. |
| `formatApplication(...)` | Business operations for `maintenance.service` module. |
| `formatRequest(...)` | Business operations for `maintenance.service` module. |
| `getActiveContractsForTenant(...)` | Business operations for `maintenance.service` module. |
| `getActiveRentalForTenantSelection(...)` | Business operations for `maintenance.service` module. |
| `getAwaitingConfirmation(...)` | Business operations for `maintenance.service` module. |
| `getCurrentLocation(...)` | Business operations for `maintenance.service` module. |
| `getProviderEarnings(...)` | Business operations for `maintenance.service` module. |
| `getRequest(...)` | Business operations for `maintenance.service` module. |
| `getTenantActiveContext(...)` | Business operations for `maintenance.service` module. |
| `if(...)` | Business operations for `maintenance.service` module. |
| `listAllConflictsForAdmin(...)` | Business operations for `maintenance.service` module. |
| `listApplicationsForTenant(...)` | Business operations for `maintenance.service` module. |
| `listApprovedProviders(...)` | Business operations for `maintenance.service` module. |
| `listAvailableJobsForProvider(...)` | Business operations for `maintenance.service` module. |
| `listLandlordRequests(...)` | Business operations for `maintenance.service` module. |
| `listMyApplications(...)` | Business operations for `maintenance.service` module. |
| `listOpenConflictsForAdmin(...)` | Business operations for `maintenance.service` module. |
| `listProviderRequests(...)` | Business operations for `maintenance.service` module. |
| `listTenantRequests(...)` | Business operations for `maintenance.service` module. |
| `markProviderComplete(...)` | Business operations for `maintenance.service` module. |
| `postIssue(...)` | Business operations for `maintenance.service` module. |
| `providerArrived(...)` | Business operations for `maintenance.service` module. |
| `providerSetEnRoute(...)` | Business operations for `maintenance.service` module. |
| `resolveConflict(...)` | Business operations for `maintenance.service` module. |
| `updateLocation(...)` | Business operations for `maintenance.service` module. |

#### 📄 File: `server/src/modules/messages/services/message.service.ts`

| Business Function | Description |
|---|---|
| `assertConversationAccess(...)` | Business operations for `message.service` module. |
| `canUserAccessConversation(...)` | Business operations for `message.service` module. |
| `emitConversationUpdated(...)` | Business operations for `message.service` module. |
| `for(...)` | Business operations for `message.service` module. |
| `getConversationMessages(...)` | Business operations for `message.service` module. |
| `getConversationWithUnreadForUser(...)` | Business operations for `message.service` module. |
| `getUnreadBadge(...)` | Business operations for `message.service` module. |
| `getUnreadCountMap(...)` | Business operations for `message.service` module. |
| `if(...)` | Business operations for `message.service` module. |
| `listConversations(...)` | Business operations for `message.service` module. |
| `markConversationRead(...)` | Business operations for `message.service` module. |
| `mergeDuplicateConversations(...)` | Business operations for `message.service` module. |
| `mergeOneParticipantPair(...)` | Business operations for `message.service` module. |
| `sendMessage(...)` | Business operations for `message.service` module. |
| `startConversation(...)` | Business operations for `message.service` module. |

#### 📄 File: `server/src/modules/messages/services/support.service.ts`

| Business Function | Description |
|---|---|
| `if(...)` | Business operations for `support.service` module. |

#### 📄 File: `server/src/modules/notifications/services/notification.service.ts`

| Business Function | Description |
|---|---|
| `cleanupOld(...)` | Business operations for `notification.service` module. |
| `create(...)` | Business operations for `notification.service` module. |
| `createMany(...)` | Business operations for `notification.service` module. |
| `deleteNotification(...)` | Business operations for `notification.service` module. |
| `getUnreadCount(...)` | Business operations for `notification.service` module. |
| `listForUser(...)` | Business operations for `notification.service` module. |
| `markAllRead(...)` | Business operations for `notification.service` module. |
| `markRead(...)` | Business operations for `notification.service` module. |

#### 📄 File: `server/src/modules/payment-methods/services/payment-method.service.ts`

| Business Function | Description |
|---|---|
| `createMethod(...)` | Business operations for `payment-method.service` module. |
| `deleteMethod(...)` | Business operations for `payment-method.service` module. |
| `if(...)` | Business operations for `payment-method.service` module. |
| `listMyMethods(...)` | Business operations for `payment-method.service` module. |
| `setDefaultMethod(...)` | Business operations for `payment-method.service` module. |

#### 📄 File: `server/src/modules/properties/services/property.service.ts`

| Business Function | Description |
|---|---|
| `bookVisit(...)` | Business operations for `property.service` module. |
| `createProperty(...)` | Business operations for `property.service` module. |
| `deleteProperty(...)` | Business operations for `property.service` module. |
| `getAllProperties(...)` | Business operations for `property.service` module. |
| `getMyVisit(...)` | Business operations for `property.service` module. |
| `getPropertyById(...)` | Business operations for `property.service` module. |
| `getPropertyVisits(...)` | Business operations for `property.service` module. |
| `getPublicLandlordProfile(...)` | Business operations for `property.service` module. |
| `if(...)` | Business operations for `property.service` module. |
| `reportProperty(...)` | Business operations for `property.service` module. |
| `resolveAmenityNames(...)` | Business operations for `property.service` module. |
| `resolveHouseRuleNames(...)` | Business operations for `property.service` module. |
| `updateProperty(...)` | Business operations for `property.service` module. |
| `updateVisitStatus(...)` | Business operations for `property.service` module. |

#### 📄 File: `server/src/modules/rental-requests/services/rental-request.service.ts`

| Business Function | Description |
|---|---|
| `cancelTenantRentalRequest(...)` | Business operations for `rental-request.service` module. |
| `createRentalRequest(...)` | Business operations for `rental-request.service` module. |
| `getLandlordRentalRequests(...)` | Business operations for `rental-request.service` module. |
| `getRentalRequestById(...)` | Business operations for `rental-request.service` module. |
| `getTenantRentalRequests(...)` | Business operations for `rental-request.service` module. |
| `if(...)` | Business operations for `rental-request.service` module. |
| `updateRentalRequestStatus(...)` | Business operations for `rental-request.service` module. |

#### 📄 File: `server/src/modules/roommate-matching/services/ai-matching.service.ts`

| Business Function | Description |
|---|---|
| `rankByWish(...)` | Business operations for `ai-matching.service` module. |
| `scoreCompatibility(...)` | Business operations for `ai-matching.service` module. |

#### 📄 File: `server/src/modules/roommate-matching/services/roommate-matching.service.ts`

| Business Function | Description |
|---|---|
| `browseRequests(...)` | Business operations for `roommate-matching.service` module. |
| `buildYou(...)` | Business operations for `roommate-matching.service` module. |
| `cancelRequest(...)` | Business operations for `roommate-matching.service` module. |
| `checkEligibility(...)` | Business operations for `roommate-matching.service` module. |
| `connStatus(...)` | Business operations for `roommate-matching.service` module. |
| `connect(...)` | Business operations for `roommate-matching.service` module. |
| `createRequest(...)` | Business operations for `roommate-matching.service` module. |
| `findMatches(...)` | Business operations for `roommate-matching.service` module. |
| `for(...)` | Business operations for `roommate-matching.service` module. |
| `getCandidatePool(...)` | Business operations for `roommate-matching.service` module. |
| `getIncomingRequests(...)` | Business operations for `roommate-matching.service` module. |
| `getLeases(...)` | Business operations for `roommate-matching.service` module. |
| `getMatches(...)` | Business operations for `roommate-matching.service` module. |
| `getMyActiveRequest(...)` | Business operations for `roommate-matching.service` module. |
| `if(...)` | Business operations for `roommate-matching.service` module. |
| `respondToMatch(...)` | Business operations for `roommate-matching.service` module. |
| `saveLeaseConfig(...)` | Business operations for `roommate-matching.service` module. |
| `smartMatches(...)` | Business operations for `roommate-matching.service` module. |
| `updateRequest(...)` | Business operations for `roommate-matching.service` module. |
| `wish(...)` | Business operations for `roommate-matching.service` module. |

#### 📄 File: `server/src/modules/saved-properties/services/saved-properties.service.ts`

| Business Function | Description |
|---|---|
| `clearMySavedProperties(...)` | Business operations for `saved-properties.service` module. |
| `getMySavedProperties(...)` | Business operations for `saved-properties.service` module. |
| `getMySavedPropertyIds(...)` | Business operations for `saved-properties.service` module. |
| `if(...)` | Business operations for `saved-properties.service` module. |
| `removeSavedProperty(...)` | Business operations for `saved-properties.service` module. |
| `saveProperty(...)` | Business operations for `saved-properties.service` module. |

---

*Generated automatically from client and server typescript sources - June 2026*