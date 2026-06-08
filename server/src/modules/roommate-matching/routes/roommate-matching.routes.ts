import { Router } from 'express';
import { RoommateMatchingController } from '../controllers/roommate-matching.controller.js';
import { protect } from '../../../shared/middleware/auth.middleware.js';
import { validate } from '../../../shared/middleware/validate.middleware.js';
import {
    createRoommateRequestSchema,
    updateRoommateRequestSchema,
    respondToMatchSchema,
    wishSchema,
    connectSchema,
    saveLeaseConfigSchema
} from '../schemas/roommate-matching.schema.js';

const router = Router();

// All roommate matching routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/roommate-matching/eligibility:
 *   get:
 *     summary: Check if user is eligible for roommate matching
 *     tags: [RoommateMatching]
 */
router.get('/eligibility', RoommateMatchingController.checkEligibility);

/**
 * @swagger
 * /api/roommate-matching/requests:
 *   post:
 *     summary: Create a new roommate request
 *     tags: [RoommateMatching]
 */
router.post('/requests', validate(createRoommateRequestSchema), RoommateMatchingController.createRequest);

/**
 * @swagger
 * /api/roommate-matching/requests/me:
 *   get:
 *     summary: Get my active roommate request
 *     tags: [RoommateMatching]
 */
router.get('/requests/me', RoommateMatchingController.getMyActiveRequest);

/**
 * @swagger
 * /api/roommate-matching/requests/browse:
 *   get:
 *     summary: Browse active roommate requests
 *     tags: [RoommateMatching]
 */
router.get('/requests/browse', RoommateMatchingController.browseRequests);

/**
 * @swagger
 * /api/roommate-matching/requests/{id}:
 *   patch:
 *     summary: Update a roommate request
 *     tags: [RoommateMatching]
 */
router.patch('/requests/:id', validate(updateRoommateRequestSchema), RoommateMatchingController.updateRequest);
router.delete('/requests/:id', RoommateMatchingController.cancelRequest);

/**
 * @swagger
 * /api/roommate-matching/requests/{id}/find-matches:
 *   post:
 *     summary: Trigger AI matching for a request
 *     tags: [RoommateMatching]
 */
router.post('/requests/:id/find-matches', RoommateMatchingController.findMatches);

/**
 * @swagger
 * /api/roommate-matching/matches:
 *   get:
 *     summary: Get my roommate matches
 *     tags: [RoommateMatching]
 */
router.get('/matches', RoommateMatchingController.getMatches);

/**
 * @swagger
 * /api/roommate-matching/matches/{id}/respond:
 *   patch:
 *     summary: Respond to a match (Accept/Decline)
 *     tags: [RoommateMatching]
 */
router.patch('/matches/:id/respond', validate(respondToMatchSchema), RoommateMatchingController.respondToMatch);

/* ── New concept: Smart Match, HOMI Wish, Connect, Lease workspace ── */

/**
 * @swagger
 * /api/roommate-matching/smart-matches:
 *   get:
 *     summary: Non-AI habit-based compatible roommates
 *     tags: [RoommateMatching]
 */
router.get('/smart-matches', RoommateMatchingController.smartMatches);

/**
 * @swagger
 * /api/roommate-matching/wish:
 *   post:
 *     summary: HOMI Wish — AI free-text roommate matchmaking
 *     tags: [RoommateMatching]
 */
router.post('/wish', validate(wishSchema), RoommateMatchingController.wish);

/**
 * @swagger
 * /api/roommate-matching/connect:
 *   post:
 *     summary: Send a roommate connection request to a user
 *     tags: [RoommateMatching]
 */
router.post('/connect', validate(connectSchema), RoommateMatchingController.connect);

/**
 * @swagger
 * /api/roommate-matching/leases:
 *   get:
 *     summary: Get my active leases as configurable lease objects
 *     tags: [RoommateMatching]
 */
router.get('/leases', RoommateMatchingController.getLeases);

/**
 * @swagger
 * /api/roommate-matching/leases/incoming:
 *   get:
 *     summary: Incoming roommate connection requests awaiting my response
 *     tags: [RoommateMatching]
 */
router.get('/leases/incoming', RoommateMatchingController.getIncomingRequests);

/**
 * @swagger
 * /api/roommate-matching/leases/{contractId}/config:
 *   put:
 *     summary: Save room/rent/occupant config for a lease
 *     tags: [RoommateMatching]
 */
router.put('/leases/:contractId/config', validate(saveLeaseConfigSchema), RoommateMatchingController.saveLeaseConfig);

export default router;
