import { Router } from 'express';
import { propertyController } from '../controllers/property.controller.js';
import { validate, validateQuery } from '../../../shared/middleware/validate.middleware.js';
import { protect, requireVerified, restrictTo } from '../../../shared/middleware/auth.middleware.js';
import { propertiesListCacheMiddleware } from '../middleware/properties-cache.middleware.js';
import {
    CreatePropertySchema,
    UpdatePropertySchema,
    PropertyQuerySchema,
} from '../schemas/property.schemas.js';

const router = Router();

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Create a new property listing
 *     description: |
 *       Create a new property listing. **Only verified landlords** can access this endpoint.
 *
 *       ### Available Amenity Names (`amenity_names`)
 *       Each value must exactly match one of the following (case-sensitive):
 *       - `Private Parking`</br></br>
 *       - `Smart Home System`</br></br>
 *       - `24/7 Concierge`</br></br>
 *       - `Fitness Center`</br></br>
 *       - `High-Speed Wi-Fi`</br></br>
 *       - `Pet Friendly`</br></br>
 *       - `EV Charging Station`</br></br>
 *       - `Keyless / Biometric Entry`</br></br>
 *       - `Rooftop Lounge`</br></br>
 *       - `Spa & Sauna`</br></br>
 *       - `Private Cinema / Theater Room`</br></br>
 *       - `Valet Parking`</br></br>
 *       - `Co-working Space / Business Center`</br></br>
 *       - `24/7 Security System`</br></br>
 *       - `Air Conditioning (A/C)`</br></br>
 *       - `Kids Play Area`</br></br>
 *       - `Intercom System`</br></br>
 *       - `24/7 Compound Security`</br></br>
 *
 *       ### Available House Rule Names (`house_rule_names`)
 *       Each value must exactly match one of the following (case-sensitive):
 *       - `No Smoking`</br></br>
 *       - `Pets Allowed`</br></br>
 *       - `No Parties or Events`</br></br>
 *       - `Quiet Hours (10 PM - 8 AM)`</br></br>
 *       - `No Additional Guests`</br></br>
 *       - `No Shoes Inside`</br></br>
 *       - `Respect Neighbours`</br></br>
 *       - `Children Welcome`</br></br>
 *       - `No Cooking of Strong-Smelling Food`</br></br>
 *       - `Recycling Required`</br></br>
 *       - `No Open Flames / Candles`</br></br>
 *       - `CCTV on Premises`</br></br>
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePropertyRequest'
 *           example:
 *             title: "Beautiful 2BR Apartment in Downtown Cairo"
 *             description: "Spacious apartment with modern amenities in downtown. Close to metro and major shopping malls."
 *             monthly_price: 1500.00
 *             security_deposit: 3000.00
 *             address: "Tahrir Street, Downtown, Cairo, Egypt"
 *             type: "APARTMENT"
 *             furnishing: "Fully"
 *             target_tenant: "FAMILIES"
 *             availability_date: "2026-03-01"
 *             images:
 *               - image_url: "https://example.com/image1.jpg"
 *                 is_main: true
 *               - image_url: "https://example.com/image2.jpg"
 *                 is_main: false
 *             amenity_names:
 *               - "Fitness Center"
 *               - "High-Speed Wi-Fi"
 *               - "24/7 Security System"
 *             house_rule_names:
 *               - "No Smoking"
 *               - "Pets Allowed"
 *             maintenance_responsibilities:
 *               - area: "Structural Repairs"
 *                 responsible_party: "LANDLORD"
 *               - area: "Interior Appliances"
 *                 responsible_party: "TENANT"
 *               - area: "Utility Bills"
 *                 responsible_party: "TENANT"
 *             specifications:
 *               bedrooms: 2
 *               bathrooms: 2
 *               area_sqft: 1200
 *             detailed_location:
 *               floor: 5
 *               city: "Cairo"
 *               area: "Downtown"
 *               street_name: "Tahrir Street"
 *               building_number: "3"
 *               unit_apt: "Apt 12"
 *               location_lat: 30.0444
 *               location_long: 31.2357
 *             ownership_documents:
 *               - "data:image/jpeg;base64,/9j/4AAQ...."
 *               - "https://example.com/legal-doc.pdf"
 *     responses:
 *       201:
 *         description: Property created successfully
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
 *                   example: "Property created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: Validation error — missing required fields or invalid values
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               invalidAmenity:
 *                 summary: Invalid amenity name
 *                 value:
 *                   success: false
 *                   message: "Invalid amenity name(s): Gym. Please select from the available list."
 *                   code: "INVALID_AMENITY_NAMES"
 *               invalidHouseRule:
 *                 summary: Invalid house rule name
 *                 value:
 *                   success: false
 *                   message: "Invalid house rule name(s): No Dogs. Please select from the available list."
 *                   code: "INVALID_HOUSE_RULE_NAMES"
 *       401:
 *         description: Not authenticated — JWT token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — user is not a verified landlord
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notLandlord:
 *                 summary: User is not a landlord
 *                 value:
 *                   success: false
 *                   message: "Only landlords can create properties"
 *                   code: "FORBIDDEN"
 *               notVerified:
 *                 summary: Account not verified
 *                 value:
 *                   success: false
 *                   message: "Your account is not fully verified. Please complete verification at /complete-verification."
 *                   code: "ACCOUNT_NOT_VERIFIED"
 */
router.post(
    '/',
    protect,
    requireVerified,
    validate(CreatePropertySchema),
    propertyController.createProperty.bind(propertyController)
);

/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Get all properties
 *     description: |
 *       Retrieve a paginated list of properties with optional filtering.
 *       No authentication required — publicly accessible.
 *
 *       **Price filters** (`minPrice`, `maxPrice`) can be combined.
 *       If both are provided, `minPrice` must be ≤ `maxPrice`.
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Published, Rented]
 *         description: Filter by listing status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [APARTMENT, VILLA, STUDIO, CHALET]
 *         description: Filter by property type
 *       - in: query
 *         name: furnishing
 *         schema:
 *           type: string
 *           enum: [Fully, Semi, Unfurnished]
 *         description: Filter by furnishing level
 *       - in: query
 *         name: target_tenant
 *         schema:
 *           type: string
 *           enum: [ANY, STUDENTS, FAMILIES, TOURISTS]
 *         description: Filter by the landlord's preferred tenant type
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *           example: 500
 *         description: Minimum monthly price (inclusive)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *           example: 3000
 *         description: Maximum monthly price (inclusive)
 *       - in: query
 *         name: landlordId
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         description: Filter by landlord UUID — use this to list all properties of a specific landlord
 *       - in: query
 *         name: availabilityDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-03-01"
 *         description: Filter by exact availability date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *           example: 1
 *         description: Page number for pagination (1-indexed)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *           example: 10
 *         description: Number of results per page (max 100)
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
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
 *                     properties:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PropertyResponse'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 50
 *                           description: Total number of matching properties
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               success: false
 *               message: "Minimum price must be less than or equal to maximum price"
 *               code: "VALIDATION_ERROR"
 */
router.get(
    '/',
    validateQuery(PropertyQuerySchema),
    propertiesListCacheMiddleware,
    propertyController.getAllProperties.bind(propertyController)
);

router.get(
    '/landlords/:landlordId/public-profile',
    propertyController.getPublicLandlordProfile.bind(propertyController)
);

/**
 * @swagger
 * /properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     description: |
 *       Retrieve full details of a specific property including its images, amenities,
 *       house rules, and physical specifications. No authentication required.
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the property to retrieve
 *         example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PropertyResponse'
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
router.get(
    '/:id',
    propertyController.getPropertyById.bind(propertyController)
);

/**
 * @swagger
 * /properties/{id}:
 *   put:
 *     summary: Update a property
 *     description: |
 *       Update one or more fields of an existing property. **Only the property owner** can update it.
 *
 *       **Important notes:**
 *       - Fields not included in the request body are left unchanged.
 *       - **`images`**: If provided, **all existing images are deleted** and replaced with the new set.
 *       - **`amenity_names`**: If provided, **all existing amenities are replaced**. Pass `[]` to remove all.
 *       - **`house_rule_names`**: If provided, **all existing house rules are replaced**. Pass `[]` to remove all.
 *       - **`specifications`**: Partial update — only provided specification fields are updated.
 *       - To publish a draft property, set `status: "Published"`.
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the property to update
 *         example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePropertyRequest'
 *           example:
 *             title: "Updated 2BR Apartment – Renovated Kitchen"
 *             monthly_price: 1600.00
 *             security_deposit: 3200.00
 *             type: "APARTMENT"
 *             furnishing: "Semi"
 *             status: "Published"
 *             target_tenant: "FAMILIES"
 *             availability_date: "2026-04-01"
 *             amenity_names:
 *               - "Rooftop Lounge"
 *               - "Pet Friendly"
 *             house_rule_names:
 *               - "No Smoking"
 *               - "Quiet Hours (10 PM - 8 AM)"
 *             maintenance_responsibilities:
 *               - area: "Structural Repairs"
 *                 responsible_party: "LANDLORD"
 *               - area: "Interior Appliances"
 *                 responsible_party: "TENANT"
 *             specifications:
 *               bedrooms: 3
 *               area_sqft: 1350
 *             detailed_location:
 *               floor: 6
 *               city: "Giza"
 *               street_name: "Nile Street"
 *               building_number: "7"
 *               unit_apt: "Apt 601"
 *               location_lat: 30.0131
 *               location_long: 31.2089
 *     responses:
 *       200:
 *         description: Property updated successfully
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
 *                   example: "Property updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: Validation error or invalid amenity/house rule name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated — JWT token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorized — user does not own this property
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "You do not have permission to update this property"
 *               code: "FORBIDDEN"
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
router.put(
    '/:id',
    protect,
    validate(UpdatePropertySchema),
    propertyController.updateProperty.bind(propertyController)
);

/**
 * @swagger
 * /properties/{id}:
 *   delete:
 *     summary: Delete a property
 *     description: |
 *       Soft-delete a property listing. **Only the property owner** can delete it.
 *       The record is not permanently removed from the database (paranoid/soft-delete).
 *       Deleted properties will no longer appear in any listing queries.
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the property to delete
 *         example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *     responses:
 *       200:
 *         description: Property deleted successfully
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
 *                   example: "Property deleted successfully"
 *       401:
 *         description: Not authenticated — JWT token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorized — user does not own this property
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "You do not have permission to delete this property"
 *               code: "FORBIDDEN"
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
router.delete(
    '/:id',
    protect,
    propertyController.deleteProperty.bind(propertyController)
);

router.post(
    '/:id/report',
    protect,
    requireVerified,
    restrictTo('TENANT'),
    propertyController.reportProperty.bind(propertyController)
);

router.post(
    '/:id/visits',
    protect,
    requireVerified,
    restrictTo('TENANT'),
    propertyController.bookVisit.bind(propertyController)
);

router.get(
    '/:id/my-visit',
    protect,
    requireVerified,
    restrictTo('TENANT'),
    propertyController.getMyVisit.bind(propertyController)
);

router.get(
    '/:id/visits',
    protect,
    requireVerified,
    restrictTo('LANDLORD'),
    propertyController.getPropertyVisits.bind(propertyController)
);

router.patch(
    '/:id/visits/:visitId',
    protect,
    requireVerified,
    restrictTo('LANDLORD'),
    propertyController.updateVisitStatus.bind(propertyController)
);

export default router;
