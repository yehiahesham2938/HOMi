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
    UpdateProfileSchema,
    ChangePasswordSchema,
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
 *     description: |
 *       Login with email or phone number and password to receive JWT tokens.
 *       The system automatically detects whether you're using an email or phone number.
 *       Unverified users can login but should complete verification.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             loginWithEmail:
 *               summary: Login with email
 *               value:
 *                 identifier: "user@example.com"
 *                 password: "Password123"
 *             loginWithPhone:
 *               summary: Login with phone number
 *               value:
 *                 identifier: "+201234567890"
 *                 password: "Password123"
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
 *     description: |
 *       Send a password reset email to the user.
 *       The email contains a link to reset the password.
 *       
 *       **Note**: The reset link expires in 1 hour.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *             example:
 *               success: true
 *               message: "Password reset email sent. Please check your inbox."
 *       404:
 *         description: Email not found in the system
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "No account found with this email address"
 *               code: "EMAIL_NOT_FOUND"
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

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: |
 *       Fetch the authenticated user's profile information.
 *       
 *       **Authentication Required**: This endpoint requires a valid JWT access token in the Authorization header.
 *       
 *       **Use Case**: This endpoint is used when a user clicks on their avatar or name to view their profile details.
 *       It returns the user's information regardless of verification status.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT access token in Bearer format
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *             example:
 *               user:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 email: "user@example.com"
 *                 role: "TENANT"
 *                 isVerified: true
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *               profile:
 *                 id: "123e4567-e89b-12d3-a456-426614174001"
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 phoneNumber: "+201234567890"
 *                 bio: "Software developer"
 *                 avatarUrl: "https://example.com/avatar.jpg"
 *                 gender: "MALE"
 *                 birthdate: "1999-01-01"
 *                 gamificationPoints: 100
 *                 preferredBudgetMin: 5000
 *                 preferredBudgetMax: 10000
 *                 isVerificationComplete: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Access denied. No token provided."
 *               code: "NO_TOKEN"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "User not found"
 *               code: "USER_NOT_FOUND"
 */
router.get(
    '/me',
    protect,
    authController.getCurrentUser.bind(authController)
);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: |
 *       Update the authenticated user's profile details.
 *       All fields are optional - only provided fields will be updated.
 *       
 *       **Authentication Required**: This endpoint requires a valid JWT access token.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             bio: "Software developer passionate about real estate"
 *             preferredBudgetMin: 5000
 *             preferredBudgetMax: 10000
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
    '/profile',
    protect,
    validate(UpdateProfileSchema),
    authController.updateProfile.bind(authController)
);

/**
 * @swagger
 * /auth/send-verification-email:
 *   post:
 *     summary: Send email verification link
 *     description: |
 *       Send a verification email to the authenticated user's email address.
 *       The email contains a link that, when clicked, verifies the user's email.
 *       
 *       **Authentication Required**: This endpoint requires a valid JWT access token.
 *       
 *       **Note**: If email is already verified, returns success with a message indicating so.
 *       The verification link expires in 24 hours.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailVerificationResponse'
 *             examples:
 *               emailSent:
 *                 summary: Email sent
 *                 value:
 *                   success: true
 *                   message: "Verification email sent. Please check your inbox."
 *                   emailVerified: false
 *               alreadyVerified:
 *                 summary: Already verified
 *                 value:
 *                   success: true
 *                   message: "Email is already verified."
 *                   emailVerified: true
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/send-verification-email',
    protect,
    authController.sendVerificationEmail.bind(authController)
);

/**
 * @swagger
 * /auth/verify-email:
 *   get:
 *     summary: Verify email address
 *     description: |
 *       Verify user's email address using the token from the verification email.
 *       This endpoint is called when the user clicks the verification link in their email.
 *       
 *       **No Authentication Required**: The token serves as authentication.
 *       
 *       On success, returns an HTML page confirming the verification.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token from email (64 characters)
 *         example: "abc123..."
 *     responses:
 *       200:
 *         description: Email verified successfully (returns HTML page)
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: HTML confirmation page
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidToken:
 *                 summary: Invalid token
 *                 value:
 *                   success: false
 *                   message: "Invalid or expired verification token"
 *                   code: "INVALID_VERIFICATION_TOKEN"
 *               expiredToken:
 *                 summary: Expired token
 *                 value:
 *                   success: false
 *                   message: "Verification token has expired. Please request a new one."
 *                   code: "VERIFICATION_TOKEN_EXPIRED"
 */
router.get(
    '/verify-email',
    authController.verifyEmail.bind(authController)
);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change user password
 *     description: |
 *       Change the authenticated user's password.
 *       
 *       **Authentication Required**: This endpoint requires a valid JWT access token.
 *       
 *       **Validation Requirements**:
 *       - Current password must be correct
 *       - New password must be different from current password
 *       - New password must be at least 8 characters
 *       - New password must contain at least one uppercase letter
 *       - New password must contain at least one lowercase letter
 *       - New password must contain at least one digit
 *       - New password must contain at least one special character (@$!%*?&#^()_+-=[]{};\:'"|,.<>/)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: User's current password
 *                 example: "OldPassword123!"
 *               newPassword:
 *                 type: string
 *                 description: New password (must meet complexity requirements)
 *                 minLength: 8
 *                 maxLength: 100
 *                 example: "NewPassword456!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *             example:
 *               success: true
 *               message: "Password changed successfully."
 *       400:
 *         description: Validation error or new password same as current
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               samePassword:
 *                 summary: New password same as current
 *                 value:
 *                   success: false
 *                   message: "New password must be different from current password"
 *                   code: "SAME_PASSWORD"
 *               validationError:
 *                 summary: Password validation failed
 *                 value:
 *                   success: false
 *                   message: "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
 *                   code: "VALIDATION_ERROR"
 *       401:
 *         description: Not authenticated or incorrect current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notAuthenticated:
 *                 summary: Not authenticated
 *                 value:
 *                   success: false
 *                   message: "User not authenticated"
 *                   code: "NOT_AUTHENTICATED"
 *               invalidPassword:
 *                 summary: Current password incorrect
 *                 value:
 *                   success: false
 *                   message: "Current password is incorrect"
 *                   code: "INVALID_CURRENT_PASSWORD"
 */
router.put(
    '/change-password',
    protect,
    validate(ChangePasswordSchema),
    authController.changePassword.bind(authController)
);

export default router;
