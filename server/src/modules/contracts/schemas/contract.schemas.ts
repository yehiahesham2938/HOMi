import { z } from 'zod';
import { ContractStatus, RentDueDate } from '../models/Contract.js';

/**
 * Landlord Step 1: Lease Terms & Financials
 */
export const LandlordLeaseTermsSchema = z.object({
    rent_due_date: z.enum(
        [RentDueDate.FIRST_OF_MONTH, RentDueDate.FIFTH_OF_MONTH, RentDueDate.LAST_DAY_OF_MONTH],
        { message: 'Rent due date must be 1ST_OF_MONTH, 5TH_OF_MONTH, or LAST_DAY_OF_MONTH' }
    ),
    late_fee_amount: z
        .number({ error: 'Late fee amount is required' })
        .min(0, 'Late fee amount must be at least 0'),
    max_occupants: z
        .number({ error: 'Max occupants is required' })
        .int('Max occupants must be an integer')
        .min(1, 'Max occupants must be at least 1'),
    emergency_contact_name: z.string().optional(),
    emergency_phone: z.string().optional(),
});

/**
 * Landlord Step 2: Identity Details
 */
export const LandlordIdentitySchema = z.object({
    national_id: z
        .string({ error: 'National ID is required' })
        .min(1, 'National ID cannot be empty')
        .max(50, 'National ID must be at most 50 characters'),
});

/**
 * Landlord Step 3: Property Ownership Confirmation & Maintenance
 */
export const LandlordPropertyConfirmationSchema = z.object({
    property_registration_number: z
        .string({ error: 'Property registration number is required' })
        .min(1, 'Property registration number cannot be empty')
        .max(100, 'Property registration number must be at most 100 characters'),
});

/**
 * Landlord Step 5: Sign Contract
 */
export const LandlordSignSchema = z.object({
    signature_url: z
        .string({ error: 'Signature is required' })
        .min(1, 'Signature URL cannot be empty')
        .max(2_000_000, 'Signature payload is too large'),
    certify_ownership: z
        .boolean({ error: 'Ownership certification is required' })
        .refine((val) => val === true, 'You must certify that you are the legal owner'),
});

/**
 * Tenant Step 2: Identity Verification
 */
export const TenantIdentitySchema = z.object({
    national_id: z
        .string({ error: 'National ID is required' })
        .min(1, 'National ID cannot be empty')
        .max(50, 'National ID must be at most 50 characters'),
    emergency_contact_name: z
        .string({ error: 'Emergency contact name is required' })
        .min(1, 'Emergency contact name cannot be empty')
        .max(200, 'Emergency contact name must be at most 200 characters'),
    emergency_phone: z
        .string({ error: 'Emergency phone is required' })
        .min(1, 'Emergency phone cannot be empty')
        .max(50, 'Emergency phone must be at most 50 characters'),
});

/**
 * Tenant Step 4: Sign Contract
 */
export const TenantSignSchema = z.object({
    signature_url: z
        .string({ error: 'Signature is required' })
        .min(1, 'Signature URL cannot be empty')
        .max(2_000_000, 'Signature payload is too large'),
    agree_to_terms: z
        .boolean({ error: 'Terms agreement is required' })
        .refine((val) => val === true, 'You must agree to the HOMI terms'),
});

/**
 * Verify Paymob Payment
 */
export const VerifyPaymobPaymentSchema = z.object({
    transaction_id: z
        .number({ error: 'Transaction ID is required' })
        .int('Transaction ID must be an integer')
        .positive('Transaction ID must be positive'),
});

/**
 * Initiate wallet top-up checkout
 */
export const WalletTopupInitiateSchema = z.object({
    amount: z
        .number({ error: 'Top-up amount is required' })
        .positive('Top-up amount must be greater than zero')
        .max(1000000, 'Top-up amount is too large'),
    payment_method: z.enum(['CARD', 'WALLET']).default('CARD'),
    save_card: z.boolean().optional(),
});

/**
 * Verify wallet top-up transaction
 */
export const VerifyWalletTopupSchema = z.object({
    transaction_id: z
        .number({ error: 'Transaction ID is required' })
        .int('Transaction ID must be an integer')
        .positive('Transaction ID must be positive'),
});

/**
 * Contract List Query Parameters
 */
export const ContractQuerySchema = z.object({
    status: z
        .enum([
            ContractStatus.PENDING_LANDLORD,
            ContractStatus.PENDING_TENANT,
            ContractStatus.PENDING_PAYMENT,
            ContractStatus.ACTIVE,
            ContractStatus.TERMINATED,
            ContractStatus.EXPIRED,
        ])
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
}).passthrough();

export type LandlordLeaseTermsInput = z.infer<typeof LandlordLeaseTermsSchema>;
export type LandlordIdentityInput = z.infer<typeof LandlordIdentitySchema>;
export type LandlordPropertyConfirmationInput = z.infer<typeof LandlordPropertyConfirmationSchema>;
export type LandlordSignInput = z.infer<typeof LandlordSignSchema>;
export type TenantIdentityInput = z.infer<typeof TenantIdentitySchema>;
export type TenantSignInput = z.infer<typeof TenantSignSchema>;
export type VerifyPaymobPaymentInput = z.infer<typeof VerifyPaymobPaymentSchema>;
export type WalletTopupInitiateInput = z.infer<typeof WalletTopupInitiateSchema>;
export type VerifyWalletTopupInput = z.infer<typeof VerifyWalletTopupSchema>;
export type ContractQueryInput = z.infer<typeof ContractQuerySchema>;

export default {
    LandlordLeaseTermsSchema,
    LandlordIdentitySchema,
    LandlordPropertyConfirmationSchema,
    LandlordSignSchema,
    TenantIdentitySchema,
    TenantSignSchema,
    VerifyPaymobPaymentSchema,
    WalletTopupInitiateSchema,
    VerifyWalletTopupSchema,
    ContractQuerySchema,
};
