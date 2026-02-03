import swaggerJsdoc, { type Options } from 'swagger-jsdoc';

const options: Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HOMi API Documentation',
            version: '1.0.0',
            description: 'REST API documentation for the HOMi rental management platform',
            contact: {
                name: 'HOMi Support',
                email: 'support@homi.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT access token',
                },
            },
            schemas: {
                // User & Profile
                UserRole: {
                    type: 'string',
                    enum: ['LANDLORD', 'TENANT', 'MAINTENANCE_PROVIDER', 'ADMIN'],
                    description: 'User role in the system',
                },
                Gender: {
                    type: 'string',
                    enum: ['MALE', 'FEMALE'],
                    description: 'User gender',
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        role: { $ref: '#/components/schemas/UserRole' },
                        isVerified: { type: 'boolean', description: 'Whether user has completed full verification (profile + email)' },
                        emailVerified: { type: 'boolean', description: 'Whether user email address is verified' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Profile: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        bio: { type: 'string', nullable: true },
                        avatarUrl: { type: 'string', nullable: true },
                        gender: { $ref: '#/components/schemas/Gender', nullable: true },
                        birthdate: { type: 'string', format: 'date', nullable: true },
                        gamificationPoints: { type: 'integer' },
                        preferredBudgetMin: { type: 'number', nullable: true },
                        preferredBudgetMax: { type: 'number', nullable: true },
                        isVerificationComplete: { type: 'boolean' },
                    },
                },

                // Auth Requests
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'firstName', 'lastName', 'phone', 'role'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            maxLength: 255,
                            example: 'user@example.com',
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            maxLength: 100,
                            description: 'Must contain uppercase, lowercase, and digit',
                            example: 'SecurePass123',
                        },
                        firstName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            example: 'John',
                        },
                        lastName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            example: 'Doe',
                        },
                        phone: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 20,
                            example: '+201234567890',
                        },
                        role: {
                            type: 'string',
                            enum: ['LANDLORD', 'TENANT'],
                            description: 'Only LANDLORD or TENANT can self-register',
                            example: 'TENANT',
                        },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['identifier', 'password'],
                    description: 'Login with email or phone number. The system auto-detects which one you provided.',
                    properties: {
                        identifier: {
                            type: 'string',
                            description: 'Email address or phone number',
                            example: 'user@example.com',
                        },
                        password: {
                            type: 'string',
                            example: 'SecurePass123',
                        },
                    },
                },
                CompleteVerificationRequest: {
                    type: 'object',
                    description: 'Request body for completing account verification. Note: User ID is extracted from the JWT token in the Authorization header, not from this request body.',
                    required: ['nationalId', 'gender', 'birthdate'],
                    properties: {
                        nationalId: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 50,
                            description: 'National ID number (will be encrypted before storage)',
                            example: '29901011234567',
                        },
                        gender: {
                            type: 'string',
                            enum: ['MALE', 'FEMALE'],
                            description: 'User gender',
                            example: 'MALE',
                        },
                        birthdate: {
                            type: 'string',
                            format: 'date',
                            description: 'Date of birth in YYYY-MM-DD format',
                            example: '1999-01-01',
                        },
                    },
                },
                ForgotPasswordRequest: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'user@example.com',
                        },
                    },
                },
                ResetPasswordRequest: {
                    type: 'object',
                    required: ['token', 'newPassword'],
                    properties: {
                        token: {
                            type: 'string',
                            minLength: 64,
                            maxLength: 64,
                            description: 'Reset token from email',
                        },
                        newPassword: {
                            type: 'string',
                            minLength: 8,
                            maxLength: 100,
                            description: 'Must contain uppercase, lowercase, and digit',
                            example: 'NewSecurePass456',
                        },
                    },
                },

                // Auth Responses
                AuthSuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string', description: 'JWT access token (15m expiry)' },
                        refreshToken: { type: 'string', description: 'JWT refresh token (7d expiry)' },
                        user: { $ref: '#/components/schemas/User' },
                        profile: { $ref: '#/components/schemas/Profile' },
                    },
                },
                UserProfileResponse: {
                    type: 'object',
                    description: 'Response for GET /auth/me endpoint containing user and profile data',
                    properties: {
                        user: { $ref: '#/components/schemas/User' },
                        profile: { $ref: '#/components/schemas/Profile' },
                    },
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Validation failed' },
                        code: { type: 'string', example: 'VALIDATION_ERROR' },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        code: { type: 'string' },
                    },
                },

                // Update Profile
                UpdateProfileRequest: {
                    type: 'object',
                    description: 'Request body for updating user profile. All fields are optional.',
                    properties: {
                        firstName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            description: 'Updated first name',
                            example: 'John',
                        },
                        lastName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            description: 'Updated last name',
                            example: 'Doe',
                        },
                        phone: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 20,
                            description: 'Updated phone number',
                            example: '+201234567890',
                        },
                        bio: {
                            type: 'string',
                            maxLength: 500,
                            nullable: true,
                            description: 'User bio or description',
                            example: 'Software developer passionate about real estate',
                        },
                        avatarUrl: {
                            type: 'string',
                            format: 'uri',
                            maxLength: 500,
                            nullable: true,
                            description: 'URL to user avatar image',
                            example: 'https://example.com/avatar.jpg',
                        },
                        preferredBudgetMin: {
                            type: 'number',
                            nullable: true,
                            description: 'Minimum preferred budget for property search',
                            example: 5000,
                        },
                        preferredBudgetMax: {
                            type: 'number',
                            nullable: true,
                            description: 'Maximum preferred budget for property search',
                            example: 10000,
                        },
                    },
                },

                // Email Verification
                EmailVerificationResponse: {
                    type: 'object',
                    description: 'Response for email verification endpoints',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Verification email sent. Please check your inbox.' },
                        emailVerified: {
                            type: 'boolean',
                            description: 'Whether the email is now verified',
                            example: false,
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Health',
                description: 'Server health check endpoints',
            },
            {
                name: 'Authentication',
                description: 'User authentication and registration endpoints',
            },
        ],
    },
    apis: ['./src/modules/**/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
