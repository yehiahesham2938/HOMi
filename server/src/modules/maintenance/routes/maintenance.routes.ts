import { Router } from 'express';
import { protect, restrictTo } from '../../../shared/middleware/auth.middleware.js';
import { UserRole } from '../../auth/models/User.js';
import { maintenanceController } from '../controllers/maintenance.controller.js';

const router = Router();

router.use(protect);

// ─── Browse providers (any logged-in user) ────────────────────────────────
router.get('/providers', maintenanceController.listProviders.bind(maintenanceController));

// ─── Tenant ───────────────────────────────────────────────────────────────
router.get(
    '/tenant/context',
    restrictTo(UserRole.TENANT),
    maintenanceController.getTenantContext.bind(maintenanceController)
);
router.post(
    '/tenant/requests',
    restrictTo(UserRole.TENANT),
    maintenanceController.postIssue.bind(maintenanceController)
);
router.get(
    '/tenant/requests',
    restrictTo(UserRole.TENANT),
    maintenanceController.listTenantRequests.bind(maintenanceController)
);
router.get(
    '/tenant/awaiting-confirmation',
    restrictTo(UserRole.TENANT),
    maintenanceController.getAwaitingConfirmation.bind(maintenanceController)
);
router.post(
    '/tenant/requests/:id/cancel',
    restrictTo(UserRole.TENANT),
    maintenanceController.cancelRequest.bind(maintenanceController)
);
router.post(
    '/tenant/requests/:id/confirm-completion',
    restrictTo(UserRole.TENANT),
    maintenanceController.confirmCompletion.bind(maintenanceController)
);
router.post(
    '/tenant/applications/:applicationId/accept',
    restrictTo(UserRole.TENANT),
    maintenanceController.acceptApplication.bind(maintenanceController)
);

// ─── Landlord ─────────────────────────────────────────────────────────────
router.get(
    '/landlord/requests',
    restrictTo(UserRole.LANDLORD),
    maintenanceController.listLandlordRequests.bind(maintenanceController)
);
router.post(
    '/landlord/applications/:applicationId/accept',
    restrictTo(UserRole.LANDLORD),
    maintenanceController.acceptApplication.bind(maintenanceController)
);

// ─── Provider ─────────────────────────────────────────────────────────────
router.get(
    '/provider/jobs/available',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.listAvailableJobs.bind(maintenanceController)
);
router.get(
    '/provider/jobs/mine',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.listProviderRequests.bind(maintenanceController)
);
router.get(
    '/provider/applications',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.listMyApplications.bind(maintenanceController)
);
router.get(
    '/provider/earnings',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.getProviderEarnings.bind(maintenanceController)
);
router.post(
    '/provider/requests/:id/apply',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.applyToRequest.bind(maintenanceController)
);
router.post(
    '/provider/requests/:id/en-route',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.setEnRoute.bind(maintenanceController)
);
router.post(
    '/provider/requests/:id/arrived',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.setArrived.bind(maintenanceController)
);
router.post(
    '/provider/requests/:id/location',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.updateLocation.bind(maintenanceController)
);
router.post(
    '/provider/requests/:id/complete',
    restrictTo(UserRole.MAINTENANCE_PROVIDER),
    maintenanceController.markComplete.bind(maintenanceController)
);

// ─── Tenant + landlord + provider + admin ─────────────────────────────────
router.get('/requests/:id', maintenanceController.getOne.bind(maintenanceController));
router.get(
    '/requests/:id/applications',
    restrictTo(UserRole.TENANT, UserRole.LANDLORD),
    maintenanceController.listApplicationsForRequest.bind(maintenanceController)
);
router.get('/requests/:id/location', maintenanceController.getCurrentLocation.bind(maintenanceController));

// ─── Admin: conflicts ─────────────────────────────────────────────────────
router.get(
    '/admin/conflicts',
    restrictTo(UserRole.ADMIN),
    maintenanceController.listAdminConflicts.bind(maintenanceController)
);
router.post(
    '/admin/conflicts/:conflictId/resolve',
    restrictTo(UserRole.ADMIN),
    maintenanceController.resolveConflict.bind(maintenanceController)
);

export default router;
