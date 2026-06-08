import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { requireAdmin } from '../../../shared/middleware/admin.middleware.js';
import { validateQuery } from '../../../shared/middleware/validate.middleware.js';
import { SupportInboxQuerySchema } from '../schemas/admin.schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: |
 *       **🔒 Admin-Only Endpoints** — Requires a valid JWT token belonging to a user with the `ADMIN` role.
 *
 *       ### How to Get an Admin Token
 *       1. Call `POST /api/admin/auth/login` with admin credentials.
 *       2. Copy the `accessToken` from the response.
 *       3. Click **Authorize** at the top of this page and enter: `Bearer <accessToken>`.
 *
 *       ### Property Verification Workflow
 *       - Landlords submit properties → status becomes `PENDING_APPROVAL`.
 *       - Admin reviews the listing and ownership documents via `GET /api/admin/properties/pending`.
 *       - Admin approves (`AVAILABLE`) or rejects (`REJECTED`) via `PATCH /api/admin/properties/:id/verify`.
 */

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: Admin login
 *     description: |
 *       Authenticate as an administrator. This endpoint validates credentials and additionally
 *       verifies that the account has the `ADMIN` role — regular tenant/landlord accounts are rejected.
 *
 *       **On success**, store the returned `accessToken` and use it as a Bearer token
 *       for all subsequent admin requests.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@homi.app
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "adminSecret123"
 *     responses:
 *       200:
 *         description: Admin authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Admin logged in successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: ADMIN
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email and password are required"
 *               code: "ADMIN_ERROR"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account exists but does not have ADMIN role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Forbidden. Admin access required."
 *               code: "ADMIN_ERROR"
 */
router.post('/auth/login', adminController.login.bind(adminController));

// All routes below require admin authentication
router.use(requireAdmin);

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get platform dashboard statistics
 *     description: |
 *       Returns a real-time snapshot of key platform metrics.
 *       Useful for populating the admin overview dashboard.
 *
 *       | Field | Description |
 *       |---|---|
 *       | `totalUsers` | Total registered users across all roles |
 *       | `totalProperties` | All property records in the system |
 *       | `rentedProperties` | Properties with status `RENTED` |
 *       | `activeContracts` | Contracts currently in `ACTIVE` status |
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 342
 *                     totalProperties:
 *                       type: integer
 *                       example: 128
 *                     rentedProperties:
 *                       type: integer
 *                       example: 56
 *                     activeContracts:
 *                       type: integer
 *                       example: 48
 *       401:
 *         description: Missing or invalid admin token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not an ADMIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/dashboard/stats', adminController.getDashboardStats.bind(adminController));

router.get(
    '/support/inbox',
    validateQuery(SupportInboxQuerySchema),
    adminController.getSupportInbox.bind(adminController)
);

/**
 * @swagger
 * /admin/properties/pending:
 *   get:
 *     summary: Get all pending-approval property submissions
 *     description: |
 *       Returns a list of all properties currently in `PENDING_APPROVAL` status,
 *       ordered oldest-first so the earliest submissions are reviewed first (FIFO queue).
 *
 *       Each item includes:
 *       - Core property details (title, address, price)
 *       - Landlord contact info (name, email, phone)
 *       - All uploaded **ownership documents** for review
 *
 *       Use this endpoint to populate the verification queue in the admin portal.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                       title:
 *                         type: string
 *                         example: "Cozy 2BR in Maadi"
 *                       description:
 *                         type: string
 *                       address:
 *                         type: string
 *                         example: "Street 9, Maadi, Cairo"
 *                       status:
 *                         type: string
 *                         enum: [PENDING_APPROVAL]
 *                         example: PENDING_APPROVAL
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       landlord:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           email:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                       ownershipDocs:
 *                         type: array
 *                         description: Legal documents uploaded by the landlord to prove ownership
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             documentUrl:
 *                               type: string
 *                               description: Base64-encoded or URL string of the document
 *       401:
 *         description: Missing or invalid admin token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not an ADMIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/properties/pending', adminController.getPendingProperties.bind(adminController));

/**
 * @swagger
 * /admin/properties/{id}/verify:
 *   patch:
 *     summary: Approve or reject a pending property submission
 *     description: |
 *       Processes a verification decision on a property that is in `PENDING_APPROVAL` status.
 *
 *       ### Action: `APPROVE`
 *       - Sets property status → **`AVAILABLE`** (publicly listed).
 *       - Clears any previous `rejection_reason`.
 *
 *       ### Action: `REJECT`
 *       - Sets property status → **`REJECTED`**.
 *       - `rejectionReason` is **required** and is stored on the property record.
 *       - The landlord can later view the reason and resubmit.
 *
 *       > ⚠️ Only properties with `PENDING_APPROVAL` status can be verified.
 *       > Trying to verify an already-approved or rejected property returns a `400` error.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the property to verify
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *                 description: The verification decision
 *               rejectionReason:
 *                 type: string
 *                 description: Required when action is REJECT. Explains why the property was denied.
 *                 example: "Ownership documents appear forged or unreadable."
 *           examples:
 *             approve:
 *               summary: Approve the property
 *               value:
 *                 action: APPROVE
 *             reject:
 *               summary: Reject the property with a reason
 *               value:
 *                 action: REJECT
 *                 rejectionReason: "The uploaded title deed does not match the property address provided."
 *     responses:
 *       200:
 *         description: Property verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   examples:
 *                     approved:
 *                       value: "Property has been approved."
 *                     rejected:
 *                       value: "Property has been rejected."
 *                 data:
 *                   $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: |
 *           Validation error. Possible causes:
 *           - `action` is not `APPROVE` or `REJECT`
 *           - `rejectionReason` is missing when `action` is `REJECT`
 *           - Property is not in `PENDING_APPROVAL` status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidAction:
 *                 summary: Invalid action value
 *                 value:
 *                   success: false
 *                   message: "Action must be either 'APPROVE' or 'REJECT'"
 *                   code: "ADMIN_ERROR"
 *               missingReason:
 *                 summary: Rejection reason is required
 *                 value:
 *                   success: false
 *                   message: "Rejection reason is required when action is REJECT"
 *                   code: "ADMIN_ERROR"
 *               invalidStatus:
 *                 summary: Property is not pending
 *                 value:
 *                   success: false
 *                   message: "Property is not pending approval"
 *                   code: "INVALID_STATUS"
 *       401:
 *         description: Missing or invalid admin token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not an ADMIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Property not found"
 *               code: "PROPERTY_NOT_FOUND"
 */
router.patch('/properties/:id/verify', adminController.verifyProperty.bind(adminController));
router.get('/maintenance-providers/pending', adminController.getPendingMaintenanceApplications.bind(adminController));
router.patch('/maintenance-providers/:id/review', adminController.reviewMaintenanceApplication.bind(adminController));
router.get('/reports/listings', adminController.getListingReports.bind(adminController));
router.delete('/reports/:reportId/remove-listing', adminController.removeReportedListing.bind(adminController));
router.get('/activity-logs', adminController.getActivityLogs.bind(adminController));
router.get('/users/:userId/profile', adminController.getUserProfile.bind(adminController));
router.get('/users/management/all', adminController.getUsersForManagement.bind(adminController));
router.get('/users/management/maintainers', adminController.getMaintainersForManagement.bind(adminController));
router.patch('/users/:userId/ban', adminController.banUser.bind(adminController));
router.patch('/users/:userId/unban', adminController.unbanUser.bind(adminController));
router.get('/properties/:propertyId/details', adminController.getPropertyDetails.bind(adminController));
router.get('/contracts', adminController.getAllContracts.bind(adminController));
router.get('/properties', adminController.getAllProperties.bind(adminController));

export default router;
