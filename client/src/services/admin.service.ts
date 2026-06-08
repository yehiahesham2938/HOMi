import apiClient from '../config/api';
import type { PropertyResponse } from './property.service';

export interface AdminStatsResponse {
    totalUsers: number;
    totalProperties: number;
    rentedProperties: number;
    activeContracts: number;
}

export interface VerifyPropertyRequest {
    action: 'APPROVE' | 'REJECT';
    rejectionReason?: string;
}

export interface PendingApprovalProperty {
    thumbnailUrl: string | null;
    id: string;
    title: string;
    description: string;
    monthlyPrice: number;
    securityDeposit: number;
    address: string;
    type: string | null;
    furnishing: string | null;
    status: string;
    createdAt: string;
    landlord: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
    } | null;
    ownershipDocs: Array<{
        id: string;
        documentUrl: string;
    }>;
    specifications: {
        bedrooms: number;
        bathrooms: number;
        areaSqft: number;
    } | null;
    detailedLocation: {
        floor: number;
        city: string;
        area: string;
        streetName: string;
        buildingNumber: string;
        unitApt: string;
        locationLat: number;
        locationLong: number;
    } | null;
    images: Array<{
        id: string;
        imageUrl: string;
        isMain: boolean;
    }>;
    amenities: Array<{
        id: string;
        name: string;
    }>;
    houseRules: Array<{
        id: string;
        name: string;
    }>;
    maintenanceResponsibilities: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
}

export interface ListingReport {
    id: string;
    reason: 'SCAM_OR_FRAUD' | 'MISLEADING_INFORMATION' | 'FAKE_PHOTOS' | 'DUPLICATE_LISTING' | 'OFFENSIVE_CONTENT' | 'UNAVAILABLE_OR_ALREADY_RENTED' | 'OTHER';
    details: string;
    status: 'OPEN' | 'REVIEWED' | 'ACTIONED';
    createdAt: string;
    property: {
        id: string;
        title: string;
        address: string;
        monthlyPrice: number;
        thumbnailUrl: string | null;
        landlord: {
            id: string;
            email: string;
            firstName?: string;
            lastName?: string;
        } | null;
    };
    reporter: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
    } | null;
}

export interface ActivityLogItem {
    id: string;
    actorUserId: string | null;
    actorRole: string | null;
    actorEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    description: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface AdminUserProfileDetails {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
    emailVerified: boolean;
    createdAt: string;
    profile: {
        firstName: string | null;
        lastName: string | null;
        phoneNumber: string | null;
        avatarUrl: string | null;
        bio: string | null;
        currentLocation: string | null;
        gender: string | null;
        birthdate: string | null;
        nationalId: string | null;
    } | null;
}

export interface AdminPropertyDetails {
    id: string;
    title: string;
    description: string;
    status: string;
    address: string;
    monthlyPrice: number;
    landlordId: string;
    deletedAt: string | null;
    landlord: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
    } | null;
}

export interface AdminSupportInboxRow {
    conversationId: string;
    user: {
        id: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    };
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
    unreadFromUser: number;
}

export interface AdminManagedUser {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
    emailVerified: boolean;
    resetTokenHash: string | null;
    resetTokenExpires: string | null;
    emailVerificationTokenHash: string | null;
    emailVerificationTokenExpires: string | null;
    isBanned: boolean;
    banReason: string | null;
    banMessage: string | null;
    banUntil: string | null;
    bannedByAdminId: string | null;
    banCreatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    profile: {
        id: string;
        userId: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
        bio: string | null;
        avatarUrl: string | null;
        currentLocation: string | null;
        nationalIdEncrypted: string | null;
        nationalIdDecrypted: string | null;
        gender: string | null;
        birthdate: string | null;
        gamificationPoints: number;
        preferredBudgetMin: number | null;
        preferredBudgetMax: number | null;
        walletBalance: number;
        walletPendingOrderId: number | null;
        walletPendingAmountCents: number | null;
        walletPendingSaveCard: boolean;
        createdAt: string;
        updatedAt: string;
    } | null;
}

export interface PendingMaintenanceApplication {
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    providerType: 'CENTER' | 'INDIVIDUAL';
    businessName: string | null;
    category: string;
    categories: string[] | null;
    criminalRecordDocument: string | null;
    selfieImage: string | null;
    nationalIdFront: string | null;
    nationalIdBack: string | null;
    numberOfEmployees: number | null;
    companyLocation: string | null;
    documentationFiles: string[] | null;
    notes: string | null;
    createdAt: string;
}

export interface AdminManagedMaintainer extends AdminManagedUser {
    providerType: 'CENTER' | 'INDIVIDUAL' | null;
    applicationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    applicationSubmittedAt: string | null;
    reviewedAt: string | null;
    businessName: string | null;
    category: string | null;
    categories: string[] | null;
    numberOfEmployees: number | null;
    companyLocation: string | null;
    notes: string | null;
}

class AdminService {
    async getDashboardStats() {
        const response = await apiClient.get<{ success: boolean; data: AdminStatsResponse }>('/admin/dashboard/stats');
        return response.data;
    }

    async getPendingProperties() {
        const response = await apiClient.get<{ success: boolean; data: PendingApprovalProperty[] }>('/admin/properties/pending');
        return response.data.data;
    }

    async verifyProperty(id: string, payload: VerifyPropertyRequest) {
        const response = await apiClient.patch<{ success: boolean; message: string; data: PropertyResponse }>(`/admin/properties/${id}/verify`, payload);
        return response.data;
    }

    async getListingReports() {
        const response = await apiClient.get<{ success: boolean; data: ListingReport[] }>('/admin/reports/listings');
        return response.data.data;
    }

    async removeListingFromReport(reportId: string) {
        const response = await apiClient.delete<{ success: boolean; message: string; data: { reportId: string; propertyId: string } }>(
            `/admin/reports/${reportId}/remove-listing`
        );
        return response.data;
    }

    async getActivityLogs(params?: { page?: number; limit?: number }) {
        const response = await apiClient.get<{ success: boolean; data: ActivityLogItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
            '/admin/activity-logs',
            { params }
        );
        return response.data;
    }

    async getUserProfile(userId: string) {
        const response = await apiClient.get<{ success: boolean; data: AdminUserProfileDetails }>(`/admin/users/${userId}/profile`);
        return response.data.data;
    }

    async getPropertyDetails(propertyId: string) {
        const response = await apiClient.get<{ success: boolean; data: AdminPropertyDetails }>(`/admin/properties/${propertyId}/details`);
        return response.data.data;
    }

    async getUsersForManagement() {
        const response = await apiClient.get<{ success: boolean; data: { landlords: AdminManagedUser[]; tenants: AdminManagedUser[] } }>(
            '/admin/users/management/all'
        );
        return response.data.data;
    }

    async getMaintainersForManagement() {
        const response = await apiClient.get<{ success: boolean; data: { centers: AdminManagedMaintainer[]; individuals: AdminManagedMaintainer[] } }>(
            '/admin/users/management/maintainers'
        );
        return response.data.data;
    }

    async banUser(
        userId: string,
        payload: { banUntil: string | null; reason: string; message: string }
    ) {
        const response = await apiClient.patch<{ success: boolean; message: string }>(`/admin/users/${userId}/ban`, payload);
        return response.data;
    }

    async unbanUser(userId: string) {
        const response = await apiClient.patch<{ success: boolean; message: string }>(`/admin/users/${userId}/unban`);
        return response.data;
    }

    async getSupportInbox(params?: { filter?: 'all' | 'unread' | 'read'; sort?: 'oldest' | 'newest' }) {
        const response = await apiClient.get<{ success: boolean; data: AdminSupportInboxRow[] }>('/admin/support/inbox', {
            params: {
                filter: params?.filter ?? 'all',
                sort: params?.sort ?? 'newest',
            },
        });
        return response.data.data;
    }

    async getPendingMaintenanceApplications() {
        const response = await apiClient.get<{ success: boolean; data: PendingMaintenanceApplication[] }>(
            '/admin/maintenance-providers/pending'
        );
        return response.data.data;
    }

    async reviewMaintenanceApplication(
        id: string,
        payload: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }
    ) {
        const response = await apiClient.patch<{ success: boolean; message: string }>(
            `/admin/maintenance-providers/${id}/review`,
            payload
        );
        return response.data;
    }

    async getAllContracts() {
        const response = await apiClient.get<{ success: boolean; data: AdminContractItem[] }>('/admin/contracts');
        return response.data.data;
    }

    async getAllProperties() {
        const response = await apiClient.get<{ success: boolean; data: AdminPropertyListItem[] }>('/admin/properties');
        return response.data.data;
    }

    async getTenantReports() {
        const response = await apiClient.get<{ success: boolean; data: any[] }>('/admin/tenant-reports');
        return response.data.data;
    }

    async warnTenantFromReport(reportId: string, message: string) {
        const response = await apiClient.post<{ success: boolean; message: string }>(`/admin/tenant-reports/${reportId}/warn`, { message });
        return response.data;
    }

    async banTenantFromReport(reportId: string, reason: string) {
        const response = await apiClient.post<{ success: boolean; message: string }>(`/admin/tenant-reports/${reportId}/ban`, { reason });
        return response.data;
    }
}

export interface AdminContractItem {
    id: string;
    contractId: string;
    leaseId: string | null;
    status: string;
    rentAmount: number;
    securityDeposit: number;
    moveInDate: string;
    leaseDurationMonths: number;
    paymentStatus: string;
    createdAt: string;
    property: {
        id: string;
        title: string;
        address: string;
    } | null;
    landlord: {
        id: string;
        email: string;
        name: string;
    } | null;
    tenant: {
        id: string;
        email: string;
        name: string;
    } | null;
}

export interface AdminPropertyListItem {
    id: string;
    title: string;
    address: string;
    monthlyPrice: number;
    status: string;
    type: string | null;
    furnishing: string | null;
    createdAt: string;
    thumbnailUrl: string | null;
    landlord: {
        id: string;
        email: string;
        name: string;
    } | null;
}

export const adminService = new AdminService();
export default adminService;
