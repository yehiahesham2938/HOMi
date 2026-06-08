import { Router } from 'express';
import { contractController } from '../controllers/contract.controller.js';
import { validate, validateQuery } from '../../../shared/middleware/validate.middleware.js';
import { protect } from '../../../shared/middleware/auth.middleware.js';
import {
    LandlordLeaseTermsSchema,
    LandlordIdentitySchema,
    LandlordPropertyConfirmationSchema,
    LandlordSignSchema,
    TenantIdentitySchema,
    TenantSignSchema,
    VerifyPaymobPaymentSchema,
    VerifyWalletTopupSchema,
    WalletTopupInitiateSchema,
    ContractQuerySchema,
} from '../schemas/contract.schemas.js';

const router = Router();

router.get(
    '/testing/clock',
    protect,
    contractController.getTestingClock.bind(contractController)
);

router.post(
    '/testing/clock/advance',
    protect,
    contractController.advanceTestingClock.bind(contractController)
);

router.post(
    '/testing/clock/reset',
    protect,
    contractController.resetTestingClock.bind(contractController)
);

/**
 * @swagger
 * /contracts/landlord:
 *   get:
 *     summary: Get landlord's contracts
 *     description: |
 *       Retrieve a paginated list of all contracts where the authenticated user
 *       is the landlord. Includes contracts in all statuses.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_LANDLORD, PENDING_TENANT, ACTIVE, TERMINATED, EXPIRED]
 *         description: Filter by contract status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Landlord's contracts retrieved successfully
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
 *                     $ref: '#/components/schemas/ContractResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 */
router.get(
    '/landlord',
    protect,
    validateQuery(ContractQuerySchema),
    contractController.getLandlordContracts.bind(contractController)
);

/**
 * @swagger
 * /contracts/tenant:
 *   get:
 *     summary: Get tenant's contracts
 *     description: |
 *       Retrieve a paginated list of contracts for the authenticated tenant.
 *       **Only contracts where the landlord has already signed** (status ≥ PENDING_TENANT)
 *       are visible to tenants.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_TENANT, PENDING_PAYMENT, ACTIVE, TERMINATED, EXPIRED]
 *         description: Filter by contract status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Tenant's contracts retrieved successfully
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
 *                     $ref: '#/components/schemas/ContractResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 */
router.get(
    '/tenant',
    protect,
    validateQuery(ContractQuerySchema),
    contractController.getTenantContracts.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}:
 *   get:
 *     summary: Get contract details
 *     description: |
 *       Retrieve full details of a specific contract including maintenance
 *       responsibilities, landlord/tenant info, and property details.
 *       Only the landlord or tenant on the contract can view it.
 *       Tenants cannot view contracts with PENDING_LANDLORD status.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the contract
 *     responses:
 *       200:
 *         description: Contract details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ContractResponse'
 *       403:
 *         description: Not authorized or contract not ready for tenant
 *       404:
 *         description: Contract not found
 */
router.get(
    '/:id',
    protect,
    contractController.getContractById.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/verification-summary:
 *   get:
 *     summary: Get platform verification summary
 *     description: |
 *       Auto-generated read-only summary containing platform metadata,
 *       verified property information, payment terms, and lease duration.
 *       Used as Step 4 for landlords and Step 3 for tenants.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Verification summary generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/VerificationSummaryResponse'
 */
router.get(
    '/:id/verification-summary',
    protect,
    contractController.getVerificationSummary.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/landlord/lease-terms:
 *   put:
 *     summary: "Landlord Step 1: Lease Terms & Financials"
 *     description: |
 *       Configure the financial terms and occupancy rules for the contract.
 *       Only available when contract status is PENDING_LANDLORD.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rent_due_date, late_fee_amount, max_occupants]
 *             properties:
 *               rent_due_date:
 *                 type: string
 *                 enum: [1ST_OF_MONTH, 5TH_OF_MONTH, LAST_DAY_OF_MONTH]
 *               late_fee_amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 50
 *               max_occupants:
 *                 type: integer
 *                 minimum: 1
 *                 example: 4
 *     responses:
 *       200:
 *         description: Lease terms submitted
 *       400:
 *         description: Validation error or contract not in correct status
 *       403:
 *         description: Not the contract landlord
 */
router.put(
    '/:id/landlord/lease-terms',
    protect,
    validate(LandlordLeaseTermsSchema),
    contractController.submitLandlordLeaseTerms.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/landlord/identity:
 *   put:
 *     summary: "Landlord Step 2: Identity Details"
 *     description: |
 *       Submit identity verification details.
 *       National ID is encrypted before storage.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [national_id]
 *             properties:
 *               national_id:
 *                 type: string
 *                 description: National ID or Business Registration Number
 *                 example: "29901011234567"
 *     responses:
 *       200:
 *         description: Identity details submitted
 */
router.put(
    '/:id/landlord/identity',
    protect,
    validate(LandlordIdentitySchema),
    contractController.submitLandlordIdentity.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/landlord/property-confirmation:
 *   put:
 *     summary: "Landlord Step 3: Property Ownership Confirmation"
 *     description: |
 *       Confirm property ownership for the selected contract property.
 *       Maintenance responsibilities are now sourced from the property model
 *       (configured during property creation/update), not from this endpoint.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [property_registration_number]
 *             properties:
 *               property_registration_number:
 *                 type: string
 *                 description: Property deed or registration reference number
 *                 example: "REG-99210-XB"
 *           examples:
 *             ownership_only:
 *               summary: Property registration number only
 *               value:
 *                 property_registration_number: "REG-99210-XB"
 *     responses:
 *       200:
 *         description: Property confirmation submitted
 */
router.put(
    '/:id/landlord/property-confirmation',
    protect,
    validate(LandlordPropertyConfirmationSchema),
    contractController.submitLandlordPropertyConfirmation.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/landlord/sign:
 *   put:
 *     summary: "Landlord Step 5: Sign Contract"
 *     description: |
 *       Sign the contract as landlord. All previous steps (lease terms,
 *       identity, property confirmation) must be completed first.
 *       Moves the contract from PENDING_LANDLORD to PENDING_TENANT.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signature_url, certify_ownership]
 *             properties:
 *               signature_url:
 *                 type: string
 *                 description: URL to uploaded or drawn digital signature
 *                 example: "https://storage.homi.com/signatures/landlord-123.png"
 *               certify_ownership:
 *                 type: boolean
 *                 description: Must be true — certifies legal property ownership
 *                 example: true
 *     responses:
 *       200:
 *         description: Contract signed by landlord, now awaiting tenant
 *       400:
 *         description: Previous steps not completed
 */
router.put(
    '/:id/landlord/sign',
    protect,
    validate(LandlordSignSchema),
    contractController.signContractLandlord.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/tenant/identity:
 *   put:
 *     summary: "Tenant Step 2: Identity Verification"
 *     description: |
 *       Submit tenant identity verification details.
 *       National ID is encrypted before storage.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [national_id, emergency_contact_name, emergency_phone]
 *             properties:
 *               national_id:
 *                 type: string
 *                 example: "29901011234567"
 *               emergency_contact_name:
 *                 type: string
 *                 example: "Sarah Johnson"
 *               emergency_phone:
 *                 type: string
 *                 example: "+20 100 123 4567"
 *     responses:
 *       200:
 *         description: Identity verification submitted
 */
router.put(
    '/:id/tenant/identity',
    protect,
    validate(TenantIdentitySchema),
    contractController.submitTenantIdentity.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/tenant/sign:
 *   put:
 *     summary: "Tenant Step 4: Sign Contract"
 *     description: |
 *       Sign the contract as tenant. Identity verification (Step 2) must be
 *       completed first. Moves the contract from PENDING_TENANT to PENDING_PAYMENT.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signature_url, agree_to_terms]
 *             properties:
 *               signature_url:
 *                 type: string
 *                 description: URL to uploaded or drawn digital signature
 *                 example: "https://storage.homi.com/signatures/tenant-456.png"
 *               agree_to_terms:
 *                 type: boolean
 *                 description: Must be true — agrees to HOMI terms and legally binding signature
 *                 example: true
 *     responses:
 *       200:
 *         description: Contract signed by tenant, now awaiting payment verification
 *       400:
 *         description: Identity verification not completed
 */
router.put(
    '/:id/tenant/sign',
    protect,
    validate(TenantSignSchema),
    contractController.signContractTenant.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/payments/paymob/initiate:
 *   post:
 *     summary: "Tenant Payment: Initiate Paymob checkout"
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Checkout session created and iframe URL returned
 */
router.post(
    '/:id/payments/paymob/initiate',
    protect,
    contractController.initiatePaymobPayment.bind(contractController)
);

/**
 * @swagger
 * /contracts/{id}/payments/paymob/verify:
 *   post:
 *     summary: "Tenant Payment: Verify Paymob transaction"
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transaction_id]
 *             properties:
 *               transaction_id:
 *                 type: integer
 *                 example: 987654321
 *     responses:
 *       200:
 *         description: Payment verified and contract activated
 */
router.post(
    '/:id/payments/paymob/verify',
    protect,
    validate(VerifyPaymobPaymentSchema),
    contractController.verifyPaymobPayment.bind(contractController)
);

router.get(
    '/payments/wallet/balance',
    protect,
    contractController.getWalletBalance.bind(contractController)
);

router.get(
    '/payments/history',
    protect,
    contractController.getTenantPaymentHistory.bind(contractController)
);

router.post(
    '/:id/payments/balance/pay',
    protect,
    contractController.payContractFromBalance.bind(contractController)
);

router.post(
    '/:id/payments/balance/pay-rent',
    protect,
    contractController.payMonthlyRentFromBalance.bind(contractController)
);

router.get(
    '/:id/installments',
    protect,
    contractController.getContractInstallments.bind(contractController)
);

router.patch(
    '/:id/autopay',
    protect,
    contractController.updateAutopay.bind(contractController)
);

router.post(
    '/payments/wallet/topup/initiate',
    protect,
    validate(WalletTopupInitiateSchema),
    contractController.initiateWalletTopup.bind(contractController)
);

router.post(
    '/payments/wallet/topup/verify',
    protect,
    validate(VerifyWalletTopupSchema),
    contractController.verifyWalletTopup.bind(contractController)
);

router.post(
    '/:id/report-tenant',
    protect,
    contractController.reportTenant.bind(contractController)
);

router.post(
    '/:id/terminate',
    protect,
    contractController.terminateLease.bind(contractController)
);

export default router;
