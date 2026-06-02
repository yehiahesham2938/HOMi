import type {
    RentalRequestDurationType,
    RentalRequestStatusType,
    LivingSituationType,
} from '../models/RentalRequest.js';

// ─── Create Rental Request ────────────────────────────────────────────────────

export interface CreateRentalRequestInput {
    property_id: string;
    move_in_date: string; // ISO date string (YYYY-MM-DD)
    duration: RentalRequestDurationType;
    occupants: number;
    living_situation: LivingSituationType;
    message?: string;
}

// ─── Update Rental Request Status ─────────────────────────────────────────────

export interface UpdateRentalRequestStatusInput {
    status: 'APPROVED' | 'DECLINED';
}

// ─── Tenant Summary (for landlord view) ───────────────────────────────────────

export interface TenantSummary {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    income?: string;
    habits?: string[];
    email?: string;
    phoneNumber?: string | null;
    employment?: string | null;
    workplace?: string | null;
}

// ─── Rental Request Response ──────────────────────────────────────────────────

export interface RentalRequestResponse {
    id: string;
    tenantId: string;
    propertyId: string;
    moveInDate: Date | string;
    duration: RentalRequestDurationType;
    occupants: number;
    livingSituation: LivingSituationType;
    message: string | null;
    status: RentalRequestStatusType;
    createdAt: Date;
    updatedAt: Date;
    tenant?: TenantSummary;
    property?: {
        id: string;
        title: string;
        address: string;
        landlordId?: string;
        monthlyPrice?: number;
        securityDeposit?: number;
        images?: { imageUrl: string; isMain: boolean }[];
        landlord?: {
            firstName: string;
            lastName: string;
            avatarUrl: string | null;
            isVerified?: boolean;
        };
        specifications?: {
            bedrooms: number;
            bathrooms: number;
            areaSqft: number;
        };
    };
}

// ─── Rental Request List Response ─────────────────────────────────────────────

export interface RentalRequestListResponse {
    rentalRequests: RentalRequestResponse[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ─── Success Response ─────────────────────────────────────────────────────────

export interface RentalRequestSuccessResponse {
    success: boolean;
    message: string;
}
