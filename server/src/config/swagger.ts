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
                url: 'https://api.homi-platform.com/api',
                description: 'Production server',
            },
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
                // ─── Shared / Auth ────────────────────────────────────────────────────────
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
                        rememberMe: {
                            type: 'boolean',
                            description: 'If true, refresh token is set as httpOnly cookie `homi_refresh_token` (not returned in JSON).',
                            example: true,
                        },
                    },
                },
                RefreshTokenRequest: {
                    type: 'object',
                    description: 'Optional when refresh JWT is sent via httpOnly cookie from Remember me.',
                    properties: {
                        refreshToken: {
                            type: 'string',
                            description: 'JWT refresh token (required if no refresh cookie)',
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
                        refreshToken: {
                            type: 'string',
                            description: 'JWT refresh token — omitted when stored in httpOnly cookie (Remember me)',
                            nullable: true,
                        },
                        user: { $ref: '#/components/schemas/User' },
                        profile: { $ref: '#/components/schemas/Profile' },
                        isNewUser: { type: 'boolean', description: 'Google OAuth only — true when account was just created' },
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

                // ─── Property Enums ───────────────────────────────────────────────────────
                PropertyStatus: {
                    type: 'string',
                    enum: ['PENDING_APPROVAL', 'AVAILABLE', 'RENTED', 'REJECTED', 'Draft', 'Published', 'Rented'],
                    description: 'Property listing status.\n- `PENDING_APPROVAL` — newly created, awaiting admin review.\n- `AVAILABLE` — admin-approved and visible to tenants.\n- `RENTED` — property currently has an active tenant.\n- `REJECTED` — admin rejected the submission (see `rejectionReason`).',
                    example: 'PENDING_APPROVAL',
                },

                // ─── Ownership Documents ──────────────────────────────────────────────
                PropertyOwnershipDoc: {
                    type: 'object',
                    description: 'A legal document uploaded by the landlord to prove property ownership. Reviewed by admins during the verification workflow.',
                    properties: {
                        id: { type: 'string', format: 'uuid', description: 'Unique document record ID' },
                        documentUrl: {
                            type: 'string',
                            description: 'Base64-encoded document string or a public URL to the uploaded file (PDF or image)',
                            example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
                        },
                    },
                },
                PropertyType: {
                    type: 'string',
                    enum: ['APARTMENT', 'VILLA', 'STUDIO', 'CHALET'],
                    description: 'Type of the property unit',
                    example: 'APARTMENT',
                },
                FurnishingStatus: {
                    type: 'string',
                    enum: ['Fully', 'Semi', 'Unfurnished'],
                    description: 'Furnishing level of the property. **Fully** = all furniture and appliances included. **Semi** = kitchen appliances + basic fixtures. **Unfurnished** = bare unit.',
                    example: 'Fully',
                },
                TargetTenant: {
                    type: 'string',
                    enum: ['ANY', 'STUDENTS', 'FAMILIES', 'TOURISTS'],
                    description: 'Preferred tenant type the landlord is targeting. Defaults to **ANY**.',
                    example: 'ANY',
                },

                // ─── Amenities ────────────────────────────────────────────────────────────
                AmenityName: {
                    type: 'string',
                    description: 'Available amenity name — must exactly match one of the seeded values',
                    enum: [
                        'Private Parking',
                        'Smart Home System',
                        '24/7 Concierge',
                        'Fitness Center',
                        'High-Speed Wi-Fi',
                        'Pet Friendly',
                        'EV Charging Station',
                        'Keyless / Biometric Entry',
                        'Rooftop Lounge',
                        'Spa & Sauna',
                        'Private Cinema / Theater Room',
                        'Valet Parking',
                        'Co-working Space / Business Center',
                        '24/7 Security System',
                        'Air Conditioning (A/C)',
                        'Kids Play Area',
                        'Intercom System',
                        '24/7 Compound Security',
                    ],
                    example: 'Fitness Center',
                },
                AmenityResponse: {
                    type: 'object',
                    description: 'An amenity record attached to a property',
                    properties: {
                        id: { type: 'string', format: 'uuid', description: 'Amenity ID', example: 'a1b2c3d4-...' },
                        name: { $ref: '#/components/schemas/AmenityName' },
                    },
                },

                // ─── House Rules ──────────────────────────────────────────────────────────
                HouseRuleName: {
                    type: 'string',
                    description: 'Available house rule name — must exactly match one of the seeded values',
                    enum: [
                        'No Smoking',
                        'Pets Allowed',
                        'No Parties or Events',
                        'Quiet Hours (10 PM - 8 AM)',
                        'No Additional Guests',
                        'No Shoes Inside',
                        'Respect Neighbours',
                        'Children Welcome',
                        'No Cooking of Strong-Smelling Food',
                        'Recycling Required',
                        'No Open Flames / Candles',
                        'CCTV on Premises',
                    ],
                    example: 'No Smoking',
                },
                HouseRuleResponse: {
                    type: 'object',
                    description: 'A house rule record attached to a property',
                    properties: {
                        id: { type: 'string', format: 'uuid', description: 'House rule ID', example: 'h1i2j3k4-...' },
                        name: { $ref: '#/components/schemas/HouseRuleName' },
                    },
                },

                // ─── Property Images ──────────────────────────────────────────────────────
                PropertyImage: {
                    type: 'object',
                    description: 'A property image record returned in responses',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        propertyId: { type: 'string', format: 'uuid' },
                        imageUrl: { type: 'string', format: 'uri', example: 'https://example.com/image1.jpg' },
                        isMain: { type: 'boolean', description: 'Whether this is the primary/cover image of the property', example: true },
                    },
                },
                PropertyImageInput: {
                    type: 'object',
                    required: ['image_url'],
                    description: 'Image object used in create/update requests',
                    properties: {
                        image_url: {
                            type: 'string',
                            format: 'uri',
                            maxLength: 500,
                            description: 'Public URL to the property image',
                            example: 'https://example.com/property-image.jpg',
                        },
                        is_main: {
                            type: 'boolean',
                            default: false,
                            description: 'Mark this image as the main cover photo. Only one image per property can be main.',
                            example: true,
                        },
                    },
                },

                // ─── Property Specifications ──────────────────────────────────────────────
                PropertySpecificationsInput: {
                    type: 'object',
                    required: ['bedrooms', 'bathrooms', 'area_sqft'],
                    description: 'Physical specifications of the property unit',
                    properties: {
                        bedrooms: {
                            type: 'integer',
                            minimum: 0,
                            description: 'Number of bedrooms. Use 0 for studios.',
                            example: 2,
                        },
                        bathrooms: {
                            type: 'integer',
                            minimum: 0,
                            description: 'Number of bathrooms',
                            example: 2,
                        },
                        area_sqft: {
                            type: 'number',
                            format: 'double',
                            minimum: 0.01,
                            description: 'Total area of the property in square feet',
                            example: 1200,
                        },
                    },
                },
                PropertySpecificationsResponse: {
                    type: 'object',
                    description: 'Physical specifications as returned in the API response',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        bedrooms: { type: 'integer', example: 2 },
                        bathrooms: { type: 'integer', example: 2 },
                        areaSqft: { type: 'number', format: 'double', example: 1200 },
                    },
                },
                PropertyMaintenanceResponsibility: {
                    type: 'object',
                    required: ['area', 'responsible_party'],
                    description: 'Maintenance area ownership defined on the property',
                    properties: {
                        area: {
                            type: 'string',
                            example: 'Structural Repairs',
                        },
                        responsible_party: {
                            type: 'string',
                            enum: ['LANDLORD', 'TENANT'],
                            example: 'LANDLORD',
                        },
                    },
                },
                PropertyDetailedLocationInput: {
                    type: 'object',
                    required: ['floor', 'city', 'area', 'street_name', 'building_number', 'unit_apt', 'location_lat', 'location_long'],
                    description: 'Detailed address breakdown and GPS coordinates',
                    properties: {
                        floor: {
                            type: 'integer',
                            description: 'Floor number',
                            example: 5,
                        },
                        city: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            example: 'Cairo',
                        },
                        area: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            example: 'Downtown',
                        },
                        street_name: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 255,
                            example: 'Tahrir Street',
                        },
                        building_number: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 50,
                            example: '3',
                        },
                        unit_apt: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 50,
                            example: 'Apt 12',
                        },
                        location_lat: {
                            type: 'number',
                            format: 'float',
                            minimum: -90,
                            maximum: 90,
                            example: 30.0444,
                        },
                        location_long: {
                            type: 'number',
                            format: 'float',
                            minimum: -180,
                            maximum: 180,
                            example: 31.2357,
                        },
                    },
                },
                PropertyDetailedLocationResponse: {
                    type: 'object',
                    description: 'Detailed location as returned in the API response',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        floor: { type: 'integer', example: 5 },
                        city: { type: 'string', example: 'Cairo' },
                        area: { type: 'string', example: 'Downtown' },
                        streetName: { type: 'string', example: 'Tahrir Street' },
                        buildingNumber: { type: 'string', example: '3' },
                        unitApt: { type: 'string', example: 'Apt 12' },
                        locationLat: { type: 'number', format: 'float', example: 30.0444 },
                        locationLong: { type: 'number', format: 'float', example: 31.2357 },
                    },
                },

                // ─── Property Response ────────────────────────────────────────────────────
                PropertyResponse: {
                    type: 'object',
                    description: 'Full property object returned by the API',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Unique property ID',
                            example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                        },
                        landlordId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the landlord that owns this property',
                        },
                        title: {
                            type: 'string',
                            description: 'Property listing title',
                            example: 'Beautiful 2BR Apartment in Downtown Cairo',
                        },
                        description: {
                            type: 'string',
                            description: 'Full description of the property',
                            example: 'Spacious apartment with modern amenities in downtown',
                        },
                        monthlyPrice: {
                            type: 'number',
                            format: 'double',
                            description: 'Monthly rent price in EGP',
                            example: 1500.00,
                        },
                        securityDeposit: {
                            type: 'number',
                            format: 'double',
                            description: 'Refundable security deposit amount in EGP',
                            example: 3000.00,
                        },
                        address: {
                            type: 'string',
                            description: 'Human-readable address string',
                            example: 'Tahrir Street, Downtown, Cairo, Egypt',
                        },
                        type: {
                            allOf: [{ $ref: '#/components/schemas/PropertyType' }],
                            nullable: true,
                            description: 'Type of property unit. null if not specified.',
                        },
                        furnishing: {
                            allOf: [{ $ref: '#/components/schemas/FurnishingStatus' }],
                            nullable: true,
                            description: 'Furnishing level of the property. null if not specified.',
                        },
                        status: {
                            $ref: '#/components/schemas/PropertyStatus',
                        },
                        targetTenant: {
                            $ref: '#/components/schemas/TargetTenant',
                        },
                        availabilityDate: {
                            type: 'string',
                            format: 'date',
                            nullable: true,
                            description: 'Date from which the property is available for rent (YYYY-MM-DD)',
                            example: '2026-03-01',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Timestamp when the property was created',
                        },
                        images: {
                            type: 'array',
                            description: 'List of all images for this property',
                            items: { $ref: '#/components/schemas/PropertyImage' },
                        },
                        amenities: {
                            type: 'array',
                            description: 'List of amenities attached to this property',
                            items: { $ref: '#/components/schemas/AmenityResponse' },
                        },
                        houseRules: {
                            type: 'array',
                            description: 'List of house rules that apply to this property',
                            items: { $ref: '#/components/schemas/HouseRuleResponse' },
                        },
                        maintenanceResponsibilities: {
                            type: 'array',
                            description: 'Maintenance responsibilities configured on this property',
                            items: { $ref: '#/components/schemas/PropertyMaintenanceResponsibility' },
                        },
                        specifications: {
                            allOf: [{ $ref: '#/components/schemas/PropertySpecificationsResponse' }],
                            nullable: true,
                            description: 'Physical specifications of the property. null if not yet provided.',
                        },
                        detailedLocation: {
                            allOf: [{ $ref: '#/components/schemas/PropertyDetailedLocationResponse' }],
                            nullable: true,
                            description: 'Detailed location breakdown and GPS coordinates.',
                        },
                        landlord: {
                            type: 'object',
                            nullable: true,
                            description: 'Basic landlord profile included when the property is fetched with landlord association.',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                firstName: { type: 'string', example: 'Ahmed' },
                                lastName: { type: 'string', example: 'Hassan' },
                                avatarUrl: { type: 'string', nullable: true },
                            },
                        },
                        rejectionReason: {
                            type: 'string',
                            nullable: true,
                            description: 'Admin-provided reason if the property was rejected. `null` if not rejected.',
                            example: 'The ownership documents provided do not match the property address.',
                        },
                        ownershipDocs: {
                            type: 'array',
                            description: 'Legal ownership documents uploaded by the landlord. Visible to admins during the verification review.',
                            items: { $ref: '#/components/schemas/PropertyOwnershipDoc' },
                        },
                    },
                },

                // ─── Create Property Request ──────────────────────────────────────────────
                CreatePropertyRequest: {
                    type: 'object',
                    required: [
                        'title',
                        'description',
                        'monthly_price',
                        'security_deposit',
                        'address',
                        'furnishing',
                        'availability_date',
                        'images',
                        'ownership_documents',
                        'specifications',
                        'detailed_location',
                    ],
                    description: 'Payload to create a new property listing. Requires landlord JWT token.',
                    properties: {
                        title: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 255,
                            description: 'Short descriptive title for the listing',
                            example: 'Beautiful 2BR Apartment in Downtown Cairo',
                        },
                        description: {
                            type: 'string',
                            minLength: 1,
                            description: 'Detailed description of the property, neighbourhood, and features',
                            example: 'Spacious apartment with modern amenities in downtown. Close to metro and shopping malls.',
                        },
                        monthly_price: {
                            type: 'number',
                            format: 'double',
                            minimum: 0.01,
                            maximum: 999999999.99,
                            description: 'Monthly rent price in EGP',
                            example: 1500.00,
                        },
                        security_deposit: {
                            type: 'number',
                            format: 'double',
                            minimum: 0,
                            maximum: 999999999.99,
                            description: 'Refundable security deposit in EGP (can be 0)',
                            example: 3000.00,
                        },
                        address: {
                            type: 'string',
                            minLength: 1,
                            description: 'Human-readable address string',
                            example: 'Tahrir Street, Downtown, Cairo, Egypt',
                        },
                        type: {
                            $ref: '#/components/schemas/PropertyType',
                            description: 'Type of property unit (optional)',
                        },
                        furnishing: {
                            $ref: '#/components/schemas/FurnishingStatus',
                        },
                        target_tenant: {
                            $ref: '#/components/schemas/TargetTenant',
                            description: 'Preferred tenant type (optional, defaults to ANY)',
                        },
                        availability_date: {
                            type: 'string',
                            format: 'date',
                            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                            description: 'Date the property becomes available for rent (YYYY-MM-DD format)',
                            example: '2026-03-01',
                        },
                        images: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/PropertyImageInput' },
                            minItems: 1,
                            description: 'At least one image is required. Only one image can have `is_main: true`.',
                        },
                        amenity_names: {
                            type: 'array',
                            description: 'List of amenity names to attach. Each value must exactly match a seeded amenity name. Omit or pass [] for no amenities.',
                            items: { $ref: '#/components/schemas/AmenityName' },
                            example: ['Fitness Center', 'High-Speed Wi-Fi'],
                            default: [],
                        },
                        house_rule_names: {
                            type: 'array',
                            description: 'List of house rule names to attach. Each value must exactly match a seeded house rule name. Omit or pass [] for no house rules.',
                            items: { $ref: '#/components/schemas/HouseRuleName' },
                            example: ['No Smoking', 'Pets Allowed'],
                            default: [],
                        },
                        maintenance_responsibilities: {
                            type: 'array',
                            description: 'Maintenance responsibilities for the property (used later in contract Step 3 display).',
                            items: { $ref: '#/components/schemas/PropertyMaintenanceResponsibility' },
                            example: [
                                { area: 'Structural Repairs', responsible_party: 'LANDLORD' },
                                { area: 'Interior Appliances', responsible_party: 'TENANT' },
                            ],
                            default: [],
                        },
                        specifications: {
                            $ref: '#/components/schemas/PropertySpecificationsInput',
                        },
                        ownership_documents: {
                            type: 'array',
                            minItems: 1,
                            description: '**Required.** One or more legal documents proving property ownership (Base64-encoded strings or URLs). Reviewed by admin before the listing is published.',
                            items: {
                                type: 'string',
                                description: 'Base64-encoded file or public URL of an ownership document (PDF, image, etc.)',
                                example: 'data:application/pdf;base64,JVBERi0xLjQK...',
                            },
                        },
                        detailed_location: {
                            $ref: '#/components/schemas/PropertyDetailedLocationInput',
                        },
                    },
                },

                // ─── Update Property Request ──────────────────────────────────────────────
                UpdatePropertyRequest: {
                    type: 'object',
                    description: 'All fields are optional — only provided fields will be updated. Requires landlord JWT token and ownership of the property.',
                    properties: {
                        title: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 255,
                            description: 'New listing title',
                            example: 'Updated 2BR Apartment – Now Pet Friendly',
                        },
                        description: {
                            type: 'string',
                            minLength: 1,
                            description: 'New listing description',
                            example: 'Updated description with newly added amenities and renovated kitchen.',
                        },
                        monthly_price: {
                            type: 'number',
                            format: 'double',
                            minimum: 0.01,
                            maximum: 999999999.99,
                            description: 'New monthly price in EGP',
                            example: 1600.00,
                        },
                        security_deposit: {
                            type: 'number',
                            format: 'double',
                            minimum: 0,
                            maximum: 999999999.99,
                            description: 'New security deposit amount in EGP',
                            example: 3200.00,
                        },
                        address: {
                            type: 'string',
                            minLength: 1,
                            description: 'Updated human-readable address',
                            example: '456 Nile Street, Giza, Egypt',
                        },
                        type: {
                            $ref: '#/components/schemas/PropertyType',
                            description: 'Updated property type',
                        },
                        furnishing: {
                            $ref: '#/components/schemas/FurnishingStatus',
                            description: 'Updated furnishing status',
                        },
                        status: {
                            $ref: '#/components/schemas/PropertyStatus',
                            description: 'Updated listing status (e.g. publish the property by setting to **Published**)',
                        },
                        target_tenant: {
                            $ref: '#/components/schemas/TargetTenant',
                            description: 'Updated preferred tenant type',
                        },
                        availability_date: {
                            type: 'string',
                            format: 'date',
                            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                            description: 'Updated availability date (YYYY-MM-DD)',
                            example: '2026-04-01',
                        },
                        images: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/PropertyImageInput' },
                            minItems: 1,
                            description: '**Replace all** existing images with this new set. Omit to leave images unchanged.',
                        },
                        amenity_names: {
                            type: 'array',
                            description: '**Replace all** amenities with this new list. Pass `[]` to remove all amenities. Omit to leave amenities unchanged.',
                            items: { $ref: '#/components/schemas/AmenityName' },
                            example: ['Rooftop Lounge', 'Pet Friendly'],
                        },
                        house_rule_names: {
                            type: 'array',
                            description: '**Replace all** house rules with this new list. Pass `[]` to remove all house rules. Omit to leave house rules unchanged.',
                            items: { $ref: '#/components/schemas/HouseRuleName' },
                            example: ['No Smoking', 'No Parties or Events'],
                        },
                        maintenance_responsibilities: {
                            type: 'array',
                            description: 'Replace all property maintenance responsibilities with this list. Omit to keep unchanged.',
                            items: { $ref: '#/components/schemas/PropertyMaintenanceResponsibility' },
                            example: [
                                { area: 'Structural Repairs', responsible_party: 'LANDLORD' },
                                { area: 'Utility Bills', responsible_party: 'TENANT' },
                            ],
                        },
                        specifications: {
                            allOf: [
                                {
                                    type: 'object',
                                    description: 'Partial update of property specifications.',
                                    properties: {
                                        bedrooms: { type: 'integer', minimum: 0, example: 3 },
                                        bathrooms: { type: 'integer', minimum: 0, example: 2 },
                                        area_sqft: { type: 'number', format: 'double', minimum: 0.01, example: 1350 },
                                    },
                                },
                            ],
                        },
                        detailed_location: {
                            allOf: [
                                {
                                    type: 'object',
                                    description: 'Partial update of detailed location.',
                                    properties: {
                                        floor: { type: 'integer', example: 6 },
                                        city: { type: 'string', minLength: 1, maxLength: 100, example: 'Giza' },
                                        area: { type: 'string', minLength: 1, maxLength: 100, example: 'Dokki' },
                                        street_name: { type: 'string', minLength: 1, maxLength: 255, example: 'Nile Street' },
                                        building_number: { type: 'string', minLength: 1, maxLength: 50, example: '7' },
                                        unit_apt: { type: 'string', minLength: 1, maxLength: 50, example: 'Apt 601' },
                                        location_lat: { type: 'number', format: 'float', example: 30.0131 },
                                        location_long: { type: 'number', format: 'float', example: 31.2089 },
                                    },
                                },
                            ],
                        },
                    },
                },

                // ─── Rental Request Enums ─────────────────────────────────────────────────
                RentalRequestDuration: {
                    type: 'string',
                    pattern: '^\\d+_MONTHS$',
                    description: 'Desired lease duration in months (from 1 to 120).',
                    example: '14_MONTHS',
                },
                LivingSituation: {
                    type: 'string',
                    enum: ['SINGLE', 'FAMILY', 'MARRIED', 'STUDENTS'],
                    description: 'Tenant living situation',
                    example: 'MARRIED',
                },
                RentalRequestStatus: {
                    type: 'string',
                    enum: ['PENDING', 'APPROVED', 'DECLINED'],
                    description: 'Rental request status. Starts as **PENDING**. Landlord can set to **APPROVED** or **DECLINED** (final).',
                    example: 'PENDING',
                },

                // ─── Habits ───────────────────────────────────────────────────────────────
                HabitName: {
                    type: 'string',
                    description: 'Available habit name — must exactly match one of the seeded values',
                    enum: [
                        'Non-smoker',
                        'Early Riser',
                        'Social',
                        'Work from Home',
                        'Vegan',
                        'Musician',
                        'Gamer',
                        'Chef at Home',
                        'Pet Owner',
                        'Very Clean',
                        'Night Owl',
                    ],
                    example: 'Non-smoker',
                },
                HabitResponse: {
                    type: 'object',
                    description: 'A habit record',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { $ref: '#/components/schemas/HabitName' },
                    },
                },

                // ─── Tenant Summary (for landlord view) ───────────────────────────────────
                TenantSummary: {
                    type: 'object',
                    description: 'Summary of tenant info shown to landlord when reviewing applications',
                    properties: {
                        id: { type: 'string', format: 'uuid', description: 'Tenant user ID' },
                        firstName: { type: 'string', example: 'Ahmed' },
                        lastName: { type: 'string', example: 'Hassan' },
                        avatarUrl: { type: 'string', format: 'uri', nullable: true, example: 'https://example.com/avatar.jpg' },
                        bio: { type: 'string', nullable: true, example: 'Software developer looking for a quiet place' },
                    },
                },

                // ─── Property Summary (in rental request) ─────────────────────────────────
                PropertySummary: {
                    type: 'object',
                    description: 'Minimal property info included in rental request responses',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string', example: 'Beautiful 2BR Apartment' },
                        address: { type: 'string', example: 'Tahrir Street, Downtown, Cairo' },
                    },
                },

                // ─── Rental Request Bodies ─────────────────────────────────────────────────
                CreateRentalRequestBody: {
                    type: 'object',
                    required: ['property_id', 'move_in_date', 'duration', 'occupants', 'living_situation'],
                    description: 'Payload to submit a rental request on a published property',
                    properties: {
                        property_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'UUID of the property to request',
                            example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                        },
                        move_in_date: {
                            type: 'string',
                            format: 'date',
                            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                            description: 'Desired move-in date (YYYY-MM-DD)',
                            example: '2026-04-01',
                        },
                        duration: {
                            $ref: '#/components/schemas/RentalRequestDuration',
                        },
                        occupants: {
                            type: 'integer',
                            minimum: 1,
                            description: 'Number of people who will live in the property',
                            example: 2,
                        },
                        living_situation: {
                            $ref: '#/components/schemas/LivingSituation',
                        },
                        message: {
                            type: 'string',
                            maxLength: 2000,
                            description: 'Optional message to the landlord',
                            example: 'We are a quiet couple looking for a long-term stay.',
                        },
                    },
                },
                UpdateRentalRequestStatusBody: {
                    type: 'object',
                    required: ['status'],
                    description: 'Payload to approve or decline a rental request',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['APPROVED', 'DECLINED'],
                            description: 'New status (only APPROVED or DECLINED allowed)',
                            example: 'APPROVED',
                        },
                    },
                },

                // ─── Rental Request Responses ─────────────────────────────────────────────
                RentalRequestResponse: {
                    type: 'object',
                    description: 'Rental request object (without tenant details)',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        tenantId: { type: 'string', format: 'uuid' },
                        propertyId: { type: 'string', format: 'uuid' },
                        moveInDate: { type: 'string', format: 'date', example: '2026-04-01' },
                        duration: { $ref: '#/components/schemas/RentalRequestDuration' },
                        occupants: { type: 'integer', example: 2 },
                        livingSituation: { $ref: '#/components/schemas/LivingSituation' },
                        message: { type: 'string', nullable: true },
                        status: { $ref: '#/components/schemas/RentalRequestStatus' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        property: {
                            allOf: [{ $ref: '#/components/schemas/PropertySummary' }],
                            nullable: true,
                        },
                    },
                },
                RentalRequestWithTenantResponse: {
                    type: 'object',
                    description: 'Rental request object with tenant profile summary and property info',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        tenantId: { type: 'string', format: 'uuid' },
                        propertyId: { type: 'string', format: 'uuid' },
                        moveInDate: { type: 'string', format: 'date', example: '2026-04-01' },
                        duration: { $ref: '#/components/schemas/RentalRequestDuration' },
                        occupants: { type: 'integer', example: 2 },
                        livingSituation: { $ref: '#/components/schemas/LivingSituation' },
                        message: { type: 'string', nullable: true },
                        status: { $ref: '#/components/schemas/RentalRequestStatus' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        tenant: { $ref: '#/components/schemas/TenantSummary' },
                        property: { $ref: '#/components/schemas/PropertySummary' },
                    },
                },
                PaginationResponse: {
                    type: 'object',
                    description: 'Pagination metadata',
                    properties: {
                        total: { type: 'integer', example: 50 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        totalPages: { type: 'integer', example: 5 },
                    },
                },

                // ─── Set User Habits ──────────────────────────────────────────────────────
                SetUserHabitsRequest: {
                    type: 'object',
                    required: ['habit_names'],
                    description: 'Payload to set (replace) the authenticated user\'s habits',
                    properties: {
                        habit_names: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/HabitName' },
                            description: 'List of habit names. Pass `[]` to clear all habits.',
                            example: ['Non-smoker', 'Early Riser', 'Work from Home'],
                        },
                    },
                },

                // ─── Contract Enums ──────────────────────────────────────────────────────
                ContractStatusEnum: {
                    type: 'string',
                    enum: ['PENDING_LANDLORD', 'PENDING_TENANT', 'ACTIVE', 'TERMINATED', 'EXPIRED'],
                    description: 'Contract lifecycle status',
                    example: 'PENDING_LANDLORD',
                },
                RentDueDateEnum: {
                    type: 'string',
                    enum: ['1ST_OF_MONTH', '5TH_OF_MONTH', 'LAST_DAY_OF_MONTH'],
                    description: 'Day of month when rent is due',
                    example: '1ST_OF_MONTH',
                },
                ResponsiblePartyEnum: {
                    type: 'string',
                    enum: ['LANDLORD', 'TENANT'],
                    description: 'Party responsible for a maintenance area',
                },
                MaintenanceAreaEnum: {
                    type: 'string',
                    description: 'Predefined maintenance area options (selectable in frontend)',
                    enum: [
                        'Structural Repairs',
                        'Interior Appliances',
                        'Utility Bills',
                        'Plumbing',
                        'Electrical',
                        'HVAC / Air Conditioning',
                        'Pest Control',
                        'Exterior Maintenance',
                        'Common Areas',
                        'Security Systems',
                    ],
                    example: 'Structural Repairs',
                },

                // ─── Contract Responses ──────────────────────────────────────────────────
                ContractResponse: {
                    type: 'object',
                    description: 'Full contract object returned by the API',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        contractId: { type: 'string', example: 'HOMI-8821' },
                        leaseId: { type: 'string', example: 'L-8829-Z', nullable: true },
                        rentalRequestId: { type: 'string', format: 'uuid' },
                        propertyId: { type: 'string', format: 'uuid' },
                        landlordId: { type: 'string', format: 'uuid' },
                        tenantId: { type: 'string', format: 'uuid' },
                        status: { $ref: '#/components/schemas/ContractStatusEnum' },
                        rentAmount: { type: 'number', nullable: true, example: 2400 },
                        securityDeposit: { type: 'number', nullable: true, example: 3000 },
                        serviceFee: { type: 'number', example: 10 },
                        paymentSchedule: { type: 'string', enum: ['MONTHLY', 'QUARTERLY', 'ANNUALLY'] },
                        rentDueDate: { $ref: '#/components/schemas/RentDueDateEnum', nullable: true },
                        lateFeeAmount: { type: 'number', nullable: true, example: 50 },
                        maxOccupants: { type: 'integer', nullable: true, example: 4 },
                        moveInDate: { type: 'string', format: 'date' },
                        leaseDurationMonths: { type: 'integer', example: 12 },
                        propertyRegistrationNumber: { type: 'string', nullable: true },
                        landlordSignedAt: { type: 'string', format: 'date-time', nullable: true },
                        tenantSignedAt: { type: 'string', format: 'date-time', nullable: true },
                        tenantAgreedTerms: { type: 'boolean' },
                        landlordNationalId: { type: 'string', nullable: true },
                        tenantNationalId: { type: 'string', nullable: true },
                        tenantEmergencyContactName: { type: 'string', nullable: true },
                        tenantEmergencyPhone: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        maintenanceResponsibilities: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    area: { $ref: '#/components/schemas/MaintenanceAreaEnum' },
                                    responsibleParty: { $ref: '#/components/schemas/ResponsiblePartyEnum' },
                                },
                            },
                        },
                    },
                },
                VerificationSummaryResponse: {
                    type: 'object',
                    description: 'Auto-generated platform verification summary',
                    properties: {
                        platformMetadata: {
                            type: 'object',
                            properties: {
                                contractId: { type: 'string', example: 'HOMI-8821' },
                                created: { type: 'string', format: 'date-time' },
                                leaseId: { type: 'string', example: 'L-8829-Z', nullable: true },
                            },
                        },
                        verifiedPropertyInfo: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                type: { type: 'string', nullable: true },
                                rooms: { type: 'string', example: '2 Bedrooms' },
                                furnishing: { type: 'string', nullable: true },
                                address: { type: 'string' },
                            },
                        },
                        paymentTerms: {
                            type: 'object',
                            properties: {
                                rent: { type: 'number', nullable: true },
                                securityDeposit: { type: 'number', nullable: true },
                                serviceFee: { type: 'number' },
                                schedule: { type: 'string' },
                            },
                        },
                        leaseDuration: {
                            type: 'object',
                            properties: {
                                moveIn: { type: 'string', format: 'date' },
                                durationMonths: { type: 'integer' },
                            },
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
            {
                name: 'Properties',
                description: 'Property listing management endpoints — create, read, update, delete.',
            },
            {
                name: 'Rental Requests',
                description: 'Tenant rental request submission and landlord review / approve / decline.',
            },
            {
                name: 'Contracts',
                description: 'Contract lifecycle management — multi-step landlord and tenant signing workflow.',
            },
            {
                name: 'Admin',
                description: '**Admin-only** endpoints for platform management. Requires an `ADMIN` role JWT. Use `POST /api/admin/auth/login` to obtain a token.',
            },
        ],
    },
    apis: ['./src/modules/**/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
