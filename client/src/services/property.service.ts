import apiClient from '../config/api';

export interface PropertyImageResponse {
    id: string;
    propertyId: string;
    imageUrl: string;
    isMain: boolean;
}

export interface AmenityResponse {
    id: string;
    name: string;
}

export interface HouseRuleResponse {
    id: string;
    name: string;
}

export interface PropertySpecificationsResponse {
    id: string;
    bedrooms: number;
    bathrooms: number;
    areaSqft: number;
}

export interface PropertyOwnershipDocResponse {
    id: string;
    documentUrl: string;
}

export interface PropertyLandlordResponse {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    isVerified: boolean;
}

/** Present when API includes detailed location (browse / detail). */
export interface PropertyDetailedLocationResponse {
    id: string;
    locationLat: number;
    locationLong: number;
}

export interface PropertyResponse {
    id: string;
    landlordId: string;
    title: string;
    description: string;
    monthlyPrice: number;
    securityDeposit: number;
    address: string;
    type: string | null;
    furnishing: string | null;
    status: string;
    targetTenant: string;
    availabilityDate: string | null;
    createdAt: string;
    images: PropertyImageResponse[];
    amenities: AmenityResponse[];
    houseRules: HouseRuleResponse[];
    maintenanceResponsibilities?: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
    specifications: PropertySpecificationsResponse | null;
    detailedLocation?: PropertyDetailedLocationResponse | null;
    landlord: PropertyLandlordResponse | null;
    ownershipDocs: PropertyOwnershipDocResponse[];
    rejectionReason?: string | null;
}

/** Minimal shape to resolve landlord UUID from API or UI-mapped listing (browse modal, cards, etc.). */
export interface LandlordIdCarrier {
    ownerId?: string | number;
    landlordId?: string;
    landlord_id?: string;
    landlord?: { id?: string } | null;
}

/** Landlord UUID for `/landlords/:id` — tolerates camelCase or snake_case API fields and nested `landlord.id`. */
export function resolveLandlordUserIdFromFields(property: LandlordIdCarrier): string {
    const raw = property.landlordId ?? property.landlord_id ?? property.landlord?.id;
    return raw != null ? String(raw).trim() : '';
}

export function resolveLandlordUserIdFromPropertyResponse(property: PropertyResponse): string {
    const p = property as PropertyResponse & { landlord_id?: string };
    return resolveLandlordUserIdFromFields(p);
}

/**
 * Same as {@link resolveLandlordUserIdFromFields} but prefers `ownerId` when present
 * (e.g. `BrowsePropertyUI` / modal payloads mapped from listings).
 */
export function resolveLandlordUserIdForPublicProfile(property: LandlordIdCarrier): string {
    if (property.ownerId != null && String(property.ownerId).trim() !== '') {
        return String(property.ownerId).trim();
    }
    return resolveLandlordUserIdFromFields(property);
}

export interface PropertyQueryParams {
    status?: string;
    type?: 'APARTMENT' | 'VILLA' | 'STUDIO' | 'CHALET';
    furnishing?: 'Fully' | 'Semi' | 'Unfurnished';
    target_tenant?: 'ANY' | 'STUDENTS' | 'FAMILIES' | 'TOURISTS';
    minPrice?: number;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    page?: number;
    limit?: number;
    landlordId?: string;
}

interface GetPropertiesApiResponse {
    success: boolean;
    data: PropertyResponse[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

interface GetPropertyByIdApiResponse {
    success: boolean;
    data: PropertyResponse;
}

export interface CreatePropertyPayload {
    title: string;
    description: string;
    monthly_price: number;
    security_deposit: number;
    address: string;
    type: 'APARTMENT' | 'VILLA' | 'STUDIO' | 'CHALET';
    furnishing: 'Fully' | 'Semi' | 'Unfurnished';
    target_tenant: 'ANY' | 'STUDENTS' | 'FAMILIES' | 'TOURISTS';
    availability_date: string;
    images: Array<{
        image_url: string;
        is_main: boolean;
    }>;
    amenity_names?: string[];
    house_rule_names?: string[];
    specifications: {
        bedrooms: number;
        bathrooms: number;
        area_sqft: number;
    };
    ownership_documents: string[];
    maintenance_responsibilities?: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
    detailed_location: {
        floor: number;
        city: string;
        area: string;
        street_name: string;
        building_number: string;
        unit_apt: string;
        location_lat: number;
        location_long: number;
    };
}

interface PropertyMutationResponse {
    success: boolean;
    message: string;
    data: PropertyResponse;
}

export interface ReportListingPayload {
    reason:
        | 'SCAM_OR_FRAUD'
        | 'MISLEADING_INFORMATION'
        | 'FAKE_PHOTOS'
        | 'DUPLICATE_LISTING'
        | 'OFFENSIVE_CONTENT'
        | 'UNAVAILABLE_OR_ALREADY_RENTED'
        | 'OTHER';
    details: string;
}

class PropertyService {
    async getAllProperties(params?: PropertyQueryParams): Promise<GetPropertiesApiResponse> {
        const response = await apiClient.get<GetPropertiesApiResponse>('/properties', { params });
        return response.data;
    }

    async createProperty(payload: CreatePropertyPayload): Promise<PropertyMutationResponse> {
        const response = await apiClient.post<PropertyMutationResponse>('/properties', payload);
        return response.data;
    }

    async getPropertyById(propertyId: string): Promise<GetPropertyByIdApiResponse> {
        const response = await apiClient.get<GetPropertyByIdApiResponse>(`/properties/${propertyId}`);
        return response.data;
    }

    async publishProperty(propertyId: string): Promise<PropertyMutationResponse> {
        const response = await apiClient.put<PropertyMutationResponse>(`/properties/${propertyId}`, {
            status: 'Published',
        });
        return response.data;
    }

    async updateProperty(propertyId: string, payload: Record<string, unknown>): Promise<PropertyMutationResponse> {
        const response = await apiClient.put<PropertyMutationResponse>(`/properties/${propertyId}`, payload);
        return response.data;
    }

    async reportProperty(propertyId: string, payload: ReportListingPayload): Promise<{ success: boolean; message: string; data: { id: string; status: string } }> {
        const response = await apiClient.post<{ success: boolean; message: string; data: { id: string; status: string } }>(
            `/properties/${propertyId}/report`,
            payload
        );
        return response.data;
    }

    async getPublicLandlordProfile(landlordId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            firstName: string;
            lastName: string;
            avatarUrl: string | null;
            isVerified: boolean;
        };
    }> {
        const response = await apiClient.get(`/properties/landlords/${landlordId}/public-profile`);
        return response.data;
    }
}

export const propertyService = new PropertyService();
export default propertyService;
