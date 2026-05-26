import { z } from 'zod';
import { PropertyStatus, FurnishingStatus, PropertyType, TargetTenant } from '../models/Property.js';

/**
 * Property Image Schema
 */
export const PropertyImageSchema = z.object({
    image_url: z
        .string()
        .min(1, 'Image is required')
        .refine(
            (value) => {
                const isHttpUrl = /^https?:\/\/.+/i.test(value);
                const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
                return isHttpUrl || isDataImage;
            },
            { message: 'Image must be a valid URL or a base64 data image' }
        ),
    is_main: z
        .boolean()
        .default(false),
});

export type PropertyImageInput = z.infer<typeof PropertyImageSchema>;

/**
 * Property Specifications Schema
 */
export const PropertySpecificationsSchema = z.object({
    bedrooms: z
        .number({ error: 'Bedrooms is required' })
        .int('Bedrooms must be an integer')
        .min(0, 'Bedrooms cannot be negative'),
    bathrooms: z
        .number({ error: 'Bathrooms is required' })
        .int('Bathrooms must be an integer')
        .min(0, 'Bathrooms cannot be negative'),
    area_sqft: z
        .number({ error: 'Area is required' })
        .positive('Area must be a positive number'),
});

export type PropertySpecificationsInput = z.infer<typeof PropertySpecificationsSchema>;

export const PropertyMaintenanceResponsibilitySchema = z.object({
    area: z
        .string()
        .min(1, 'Maintenance area is required')
        .max(100, 'Maintenance area must be at most 100 characters'),
    responsible_party: z.enum(['LANDLORD', 'TENANT'], {
        message: 'Responsible party must be LANDLORD or TENANT',
    }),
});

/**
 * Property Detailed Location Schema
 */
export const PropertyDetailedLocationSchema = z.object({
    floor: z
        .number({ error: 'Floor is required' })
        .int('Floor must be an integer'),
    city: z
        .string({ error: 'City is required' })
        .min(1, 'City is required')
        .max(100, 'City must be at most 100 characters')
        .trim(),
    area: z
        .string({ error: 'Area is required' })
        .min(1, 'Area is required')
        .max(100, 'Area must be at most 100 characters')
        .trim(),
    street_name: z
        .string({ error: 'Street name is required' })
        .min(1, 'Street name is required')
        .max(255, 'Street name must be at most 255 characters')
        .trim(),
    building_number: z
        .string({ error: 'Building number is required' })
        .min(1, 'Building number is required')
        .max(50, 'Building number must be at most 50 characters')
        .trim(),
    unit_apt: z
        .string({ error: 'Unit/Apt is required' })
        .min(1, 'Unit/Apt is required')
        .max(50, 'Unit/Apt must be at most 50 characters')
        .trim(),
    location_lat: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
    location_long: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
});

export type PropertyDetailedLocationInput = z.infer<typeof PropertyDetailedLocationSchema>;

/**
 * Create Property Schema
 * Validates property creation request
 */
export const CreatePropertySchema = z.object({
    title: z
        .string()
        .min(1, 'Title is required')
        .max(255, 'Title must be at most 255 characters')
        .trim(),
    description: z
        .string()
        .min(1, 'Description is required')
        .trim(),
    monthly_price: z
        .number({ error: 'Monthly price is required' })
        .positive('Monthly price must be a positive number')
        .max(999999999.99, 'Monthly price is too large'),
    security_deposit: z
        .number({ error: 'Security deposit is required' })
        .min(0, 'Security deposit cannot be negative')
        .max(999999999.99, 'Security deposit is too large'),
    address: z
        .string()
        .min(1, 'Address is required')
        .trim(),
    type: z.enum(
        [PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.STUDIO, PropertyType.CHALET],
        { message: 'Type must be APARTMENT, VILLA, STUDIO, or CHALET' }
    ).optional(),
    furnishing: z.enum(
        [FurnishingStatus.FULLY, FurnishingStatus.SEMI, FurnishingStatus.UNFURNISHED],
        { message: 'Furnishing must be Fully, Semi, or Unfurnished' }
    ),
    target_tenant: z.enum(
        [TargetTenant.ANY, TargetTenant.STUDENTS, TargetTenant.FAMILIES, TargetTenant.TOURISTS],
        { message: 'Target tenant must be ANY, STUDENTS, FAMILIES, or TOURISTS' }
    ).optional(),
    availability_date: z
        .string({ error: 'Availability date is required' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Availability date must be in YYYY-MM-DD format'),
    images: z
        .array(PropertyImageSchema)
        .min(1, 'At least one image is required')
        .refine(
            (images) => {
                // Ensure at most one main image
                const mainImages = images.filter(img => img.is_main);
                return mainImages.length <= 1;
            },
            {
                message: 'Only one image can be marked as main',
            }
        ),
    amenity_names: z
        .array(z.string().min(1, 'Amenity name cannot be empty'))
        .optional()
        .default([]),
    house_rule_names: z
        .array(z.string().min(1, 'House rule name cannot be empty'))
        .optional()
        .default([]),
    maintenance_responsibilities: z
        .array(PropertyMaintenanceResponsibilitySchema)
        .optional()
        .default([]),
    specifications: PropertySpecificationsSchema,
    detailed_location: PropertyDetailedLocationSchema,
    ownership_documents: z
        .array(
            z.string().refine(
                (value) => {
                    const isHttpUrl = /^https?:\/\/.+/i.test(value);
                    const isDataDocument = /^data:(image\/[a-zA-Z0-9.+-]+|application\/pdf);base64,/.test(value);
                    return isHttpUrl || isDataDocument;
                },
                { message: 'Document must be a valid URL or a base64 encoded document' }
            )
        )
        .min(1, 'At least one ownership document is required'),
});

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;

/**
 * Update Property Schema
 * All fields are optional
 */
export const UpdatePropertySchema = z.object({
    title: z
        .string()
        .min(1, 'Title cannot be empty')
        .max(255, 'Title must be at most 255 characters')
        .trim()
        .optional(),
    description: z
        .string()
        .min(1, 'Description cannot be empty')
        .trim()
        .optional(),
    monthly_price: z
        .number()
        .positive('Monthly price must be a positive number')
        .max(999999999.99, 'Monthly price is too large')
        .optional(),
    security_deposit: z
        .number()
        .min(0, 'Security deposit cannot be negative')
        .max(999999999.99, 'Security deposit is too large')
        .optional(),
    address: z
        .string()
        .min(1, 'Address cannot be empty')
        .trim()
        .optional(),
    type: z.enum(
        [PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.STUDIO, PropertyType.CHALET],
        { message: 'Type must be APARTMENT, VILLA, STUDIO, or CHALET' }
    ).optional(),
    furnishing: z.enum(
        [FurnishingStatus.FULLY, FurnishingStatus.SEMI, FurnishingStatus.UNFURNISHED],
        { message: 'Furnishing must be Fully, Semi, or Unfurnished' }
    ).optional(),
    status: z.enum(
        [PropertyStatus.DRAFT, PropertyStatus.PENDING_APPROVAL, PropertyStatus.AVAILABLE, PropertyStatus.REJECTED, PropertyStatus.RENTED, PropertyStatus.UNAVAILABLE],
        { message: 'Status is invalid' }
    ).optional(),
    target_tenant: z.enum(
        [TargetTenant.ANY, TargetTenant.STUDENTS, TargetTenant.FAMILIES, TargetTenant.TOURISTS],
        { message: 'Target tenant must be ANY, STUDENTS, FAMILIES, or TOURISTS' }
    ).optional(),
    availability_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Availability date must be in YYYY-MM-DD format')
        .or(z.null())
        .optional(),
    images: z
        .array(PropertyImageSchema)
        .min(1, 'At least one image is required if updating images')
        .refine(
            (images) => {
                const mainImages = images.filter(img => img.is_main);
                return mainImages.length <= 1;
            },
            {
                message: 'Only one image can be marked as main',
            }
        )
        .optional(),
    amenity_names: z
        .array(z.string().min(1, 'Amenity name cannot be empty'))
        .optional(),
    house_rule_names: z
        .array(z.string().min(1, 'House rule name cannot be empty'))
        .optional(),
    maintenance_responsibilities: z
        .array(PropertyMaintenanceResponsibilitySchema)
        .optional(),
    specifications: PropertySpecificationsSchema.partial().optional(),
    detailed_location: PropertyDetailedLocationSchema.partial().optional(),
    ownership_documents: z
        .array(
            z.string().refine(
                (value) => {
                    const isHttpUrl = /^https?:\/\/.+/i.test(value);
                    const isDataDocument = /^data:(image\/[a-zA-Z0-9.+-]+|application\/pdf);base64,/.test(value);
                    return isHttpUrl || isDataDocument;
                },
                { message: 'Document must be a valid URL or a base64 encoded document' }
            )
        )
        .optional(),
});

export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;

/**
 * Property Query Schema
 * Validates query parameters for listing properties
 * All parameters are optional - empty query is valid
 */
export const PropertyQuerySchema = z.object({
    status: z
        .preprocess((val) => {
            if (typeof val === 'string' && val.includes(',')) {
                return val.split(',');
            }
            return val;
        }, z.union([
            z.enum([PropertyStatus.DRAFT, PropertyStatus.PENDING_APPROVAL, PropertyStatus.AVAILABLE, PropertyStatus.REJECTED, PropertyStatus.RENTED, PropertyStatus.UNAVAILABLE]),
            z.array(z.enum([PropertyStatus.DRAFT, PropertyStatus.PENDING_APPROVAL, PropertyStatus.AVAILABLE, PropertyStatus.REJECTED, PropertyStatus.RENTED, PropertyStatus.UNAVAILABLE]))
        ]))
        .optional(),
    type: z
        .enum([PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.STUDIO, PropertyType.CHALET])
        .optional(),
    furnishing: z
        .enum([FurnishingStatus.FULLY, FurnishingStatus.SEMI, FurnishingStatus.UNFURNISHED])
        .optional(),
    target_tenant: z
        .enum([TargetTenant.ANY, TargetTenant.STUDENTS, TargetTenant.FAMILIES, TargetTenant.TOURISTS])
        .optional(),
    minPrice: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
        .transform(Number)
        .optional(),
    maxPrice: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
        .transform(Number)
        .optional(),
    landlordId: z
        .string()
        .uuid('Invalid landlord ID format')
        .optional(),
    availabilityDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Availability date must be in YYYY-MM-DD format')
        .optional(),
    lat: z
        .string()
        .transform(Number)
        .optional(),
    lng: z
        .string()
        .transform(Number)
        .optional(),
    radiusKm: z
        .string()
        .transform(Number)
        .optional(),
    page: z
        .string()
        .regex(/^\d+$/, 'Page must be a positive integer')
        .default('1')
        .transform(Number)
        .optional(),
    limit: z
        .string()
        .regex(/^\d+$/, 'Limit must be a positive integer')
        .default('10')
        .transform(Number)
        .refine((val) => val <= 100, 'Limit cannot exceed 100')
        .optional(),
}).refine(
    (data) => {
        if (data.minPrice && data.maxPrice) {
            return data.minPrice <= data.maxPrice;
        }
        return true;
    },
    {
        message: 'Minimum price must be less than or equal to maximum price',
        path: ['minPrice'],
    }
).passthrough(); // Allow empty query object

export type PropertyQueryInput = z.infer<typeof PropertyQuerySchema>;

export default {
    CreatePropertySchema,
    UpdatePropertySchema,
    PropertyQuerySchema,
    PropertyImageSchema,
    PropertySpecificationsSchema,
    PropertyDetailedLocationSchema,
};
