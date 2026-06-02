//client\src\services\rental-request.service.ts
import apiClient from '../config/api';

export type RentalDuration = `${number}_MONTHS`;
export type LivingSituation = 'SINGLE' | 'FAMILY' | 'MARRIED' | 'STUDENTS';

export interface SubmitRentalRequestPayload {
    property_id: string;
    move_in_date: string;          // YYYY-MM-DD
    duration: RentalDuration;
    occupants: number;
    living_situation: LivingSituation;
    message: string;
}

export interface RentalRequestResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        propertyId: string;
        tenantId: string;
        status: string;
        moveInDate: string;
        duration: RentalDuration;
        occupants: number;
        livingSituation: LivingSituation;
        message: string;
        createdAt: string;
    };
}

export type RentalRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface MyRentalRequest {
    id: string;
    status: RentalRequestStatus;
    moveInDate: string;
    duration: RentalDuration;
    occupants: number;
    livingSituation: LivingSituation;
    message: string;
    createdAt: string;
    property: {
        id: string;
        title: string;
        address: string;
        landlordId?: string;
        monthlyPrice: number;
        securityDeposit: number;
        images: { imageUrl: string; isMain: boolean }[];
        landlord: {
            firstName: string;
            lastName: string;
            avatarUrl: string | null;
            isVerified?: boolean;
        } | null;
        specifications: {
            bedrooms: number;
            bathrooms: number;
            areaSqft: number;
        } | null;
    };
}

export interface MyRentalRequestsResponse {
    success: boolean;
    data: MyRentalRequest[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface LandlordRentalRequest {
    id: string;
    status: RentalRequestStatus;
    moveInDate: string;
    duration: RentalDuration;
    occupants: number;
    livingSituation: LivingSituation;
    message: string;
    createdAt: string;
    tenant: {
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
    };
    property: {
        id: string;
        title: string;
        address: string;
        monthlyPrice?: number;
    };
}

export interface LandlordRentalRequestsResponse {
    success: boolean;
    data: LandlordRentalRequest[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

class RentalRequestService {
    async submitRentalRequest(payload: SubmitRentalRequestPayload): Promise<RentalRequestResponse> {
        const response = await apiClient.post<RentalRequestResponse>('/rental-requests', payload);
        return response.data;
    }

    async getMyRequests(params?: {
        status?: RentalRequestStatus;
        page?: number;
        limit?: number;
    }): Promise<MyRentalRequestsResponse> {
        const response = await apiClient.get<MyRentalRequestsResponse>('/rental-requests/my-requests', { params });
        return response.data;
    }

    async getLandlordRequests(params?: {
        status?: RentalRequestStatus;
        page?: number;
        limit?: number;
    }): Promise<LandlordRentalRequestsResponse> {
        const response = await apiClient.get<LandlordRentalRequestsResponse>('/rental-requests/landlord', { params });
        return response.data;
    }

    async updateRequestStatus(id: string, status: 'APPROVED' | 'DECLINED'): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.put<{ success: boolean; message: string }>(`/rental-requests/${id}/status`, { status });
        return response.data;
    }

    async cancelMyRequest(id: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.patch<{ success: boolean; message: string }>(`/rental-requests/${id}/cancel`);
        return response.data;
    }
}

export const rentalRequestService = new RentalRequestService();
export default rentalRequestService;
