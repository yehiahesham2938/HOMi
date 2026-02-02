import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../../../shared/middleware/validate.middleware.js';
import { protect } from '../../../shared/middleware/auth.middleware.js';
import {
    RegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    CompleteVerificationSchema,
    GoogleLoginSchema,
} from '../schemas/auth.schemas.js';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with essential fields. User starts as unverified and must complete verification to access all features.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/register',
    validate(RegisterSchema),
    authController.register.bind(authController)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     description: Login with email and password to receive JWT tokens. Unverified users can login but should complete verification.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/login',
    validate(LoginSchema),
    authController.login.bind(authController)
);

/**
 * @swagger
 * /auth/complete-verification:
 *   post:
 *     summary: Complete account verification
 *     description: |
 *       Complete account verification by submitting required profile fields.
 *       
 *       **IMPORTANT**: This endpoint requires BOTH:
 *       1. **JWT Authentication**: Include your access token in the Authorization header (Bearer token)
 *       2. **Request Body**: Provide nationalId, gender, and birthdate in the JSON body
 *       
 *       The user ID is extracted from the JWT token, so you don't need to send it in the body.
 *       After successful verification, the user's is_verified status will be set to true.
 *       
 *       **Flow**:
 *       - User registers → receives JWT tokens (is_verified = false)
 *       - User logs in → can login even if unverified
 *       - User fills verification form → calls this endpoint with JWT + verification data
 *       - Account becomes verified → is_verified = true
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Verification fields to complete the user profile
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteVerificationRequest'
 *           example:
 *             nationalId: "29901011234567"
 *             gender: "MALE"
 *             birthdate: "1999-01-01"
 *     responses:
 *       200:
 *         description: Verification completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *             example:
 *               success: true
 *               message: "Verification completed successfully. Your account is now fully verified."
 *       400:
 *         description: Validation error or already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Account is already verified"
 *               code: "ALREADY_VERIFIED"
 *       401:
 *         description: Not authenticated - JWT token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "User not authenticated"
 *               code: "NOT_AUTHENTICATED"
 */
router.post(
    '/complete-verification',
    protect,
    validate(CompleteVerificationSchema),
    authController.completeVerification.bind(authController)
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send a password reset email to the user. Always returns success to prevent email enumeration.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent (if account exists)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 */
router.post(
    '/forgot-password',
    validate(ForgotPasswordSchema),
    authController.forgotPassword.bind(authController)
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Reset user password using the token received via email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/reset-password',
    validate(ResetPasswordSchema),
    authController.resetPassword.bind(authController)
);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Authenticate with Google OAuth
 *     description: |
 *       Login or register using Google OAuth 2.0. 
 *       
 *       **How it works:**
 *       1. Frontend obtains Google access token via Google Sign-In
 *       2. Frontend sends the token to this endpoint
 *       3. Backend verifies token with Google's UserInfo API
 *       4. If user exists: login and return HOMi tokens
 *       5. If new user: auto-register with TENANT role and return HOMi tokens
 *       
 *       **Auto-Registration Details:**
 *       - New users are created with `is_verified: true` (Google verified email)
 *       - Default role: TENANT
 *       - Profile populated with Google's first name, last name, and avatar
 *       - Phone number and national ID are left empty (must be collected later)
 *       - Password is set to placeholder "GOOGLE_OAUTH_USER" (they can't use password login)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - googleAccessToken
 *             properties:
 *               googleAccessToken:
 *                 type: string
 *                 description: Google access token obtained from Google Sign-In on frontend
 *                 example: "ya29.a0AfH6SMBx..."
 *     responses:
 *       200:
 *         description: Login/registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error or missing email from Google
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid Google access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid Google access token"
 *               code: "INVALID_GOOGLE_TOKEN"
 *       500:
 *         description: Server error during registration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/google',
    validate(GoogleLoginSchema),
    authController.googleLogin.bind(authController)
);

export default router;
