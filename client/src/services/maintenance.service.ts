import apiClient from '../config/api';

// ─── Status enums ────────────────────────────────────────────────────────────

export type MaintenanceRequestStatus =
    | 'OPEN'
    | 'ASSIGNED'
    | 'EN_ROUTE'
    | 'IN_PROGRESS'
    | 'AWAITING_CONFIRMATION'
    | 'COMPLETED'
    | 'DISPUTED'
    | 'RESOLVED_BY_ADMIN'
    | 'CANCELLED';

export type MaintenanceUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MaintenanceChargeParty = 'TENANT' | 'LANDLORD';

export type MaintenanceJobApplicationStatus =
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'WITHDRAWN';

export type MaintenanceConflictStatus = 'OPEN' | 'RESOLVED';

export type MaintenanceConflictResolution = 'CHARGE_TENANT' | 'CHARGE_PROVIDER';

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface PartyMini {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    phone: string | null;
}

export interface PropertyMini {
    id: string;
    title: string;
    address: string;
    thumbnailUrl: string | null;
    lat: number | null;
    lng: number | null;
}

export interface MaintenanceLocationData {
    lat: number;
    lng: number;
    reportedAt: string;
    accuracyM: number | null;
    heading: number | null;
    speed: number | null;
}

export interface MaintenanceConflictData {
    id: string;
    requestId: string;
    tenantReason: string;
    providerCompletionNotes: string | null;
    status: MaintenanceConflictStatus;
    resolution: MaintenanceConflictResolution | null;
    adminNotes: string | null;
    resolvedAt: string | null;
    createdAt: string;
}

export interface MaintenanceRatingData {
    rating: number;
    comment: string | null;
    createdAt: string;
}

export interface MaintenanceJobApplication {
    id: string;
    requestId: string;
    providerId: string;
    finalPrice: number;
    priceBreakdown: string | null;
    coverNote: string | null;
    etaHours: number | null;
    status: MaintenanceJobApplicationStatus;
    createdAt: string;
    provider?: PartyMini & {
        rating: number;
        ratingsCount: number;
        category: string | null;
        providerType: string | null;
        businessName: string | null;
        bio: string | null;
    };
    request?: {
        id: string;
        title: string;
        description: string;
        category: string;
        urgency: MaintenanceUrgency;
        status: MaintenanceRequestStatus;
        createdAt: string;
        tenant?: PartyMini;
        property?: PropertyMini;
    };
}

export interface MaintenanceRequest {
    id: string;
    tenantId: string;
    landlordId: string;
    propertyId: string;
    contractId: string | null;
    assignedProviderId: string | null;
    category: string;
    title: string;
    description: string;
    urgency: MaintenanceUrgency;
    estimatedBudget: number | null;
    images: string[];
    status: MaintenanceRequestStatus;
    chargeParty: MaintenanceChargeParty;
    agreedPrice: number | null;
    escrowAmount: number;
    completionNotes: string | null;
    completionImages: string[];
    enRouteStartedAt: string | null;
    inProgressStartedAt: string | null;
    providerCompletedAt: string | null;
    tenantConfirmedAt: string | null;
    disputedAt: string | null;
    disputedReason: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    tenant?: PartyMini;
    landlord?: PartyMini;
    provider?: PartyMini & {
        category: string | null;
        providerType: string | null;
        businessName: string | null;
        rating: number;
        ratingsCount: number;
    };
    property?: PropertyMini;
    applications?: MaintenanceJobApplication[];
    applicationsCount?: number;
    currentLocation?: MaintenanceLocationData | null;
    conflict?: MaintenanceConflictData | null;
    rating?: MaintenanceRatingData | null;
    alreadyApplied?: boolean;
}

export interface BrowseProvider {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    providerType: 'INDIVIDUAL' | 'CENTER';
    businessName: string | null;
    primaryCategory: string;
    categories: string[];
    companyLocation: string | null;
    rating: number;
    ratingsCount: number;
    completedJobsCount: number;
}

export interface TenantMaintenanceContext {
    contractId: string;
    property: PropertyMini;
    landlord: PartyMini;
    walletBalance: number;
    responsibilities?: Array<{ area: string; responsibleParty: string }>;
    activeRentals: Array<{
        contractId: string;
        property: PropertyMini;
        landlord: PartyMini;
        responsibilities?: Array<{ area: string; responsibleParty: string }>;
    }>;
}

export interface ProviderEarnings {
    walletBalance: number;
    totalEarned: number;
    completedJobs: number;
    activeJobs: number;
    avgRating: number;
    recentCompleted: MaintenanceRequest[];
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface PostMaintenanceIssuePayload {
    propertyId?: string;
    contractId?: string;
    category: string;
    title: string;
    description: string;
    urgency: MaintenanceUrgency;
    estimatedBudget?: number | null;
    images?: string[];
}

export interface ProviderApplyPayload {
    finalPrice: number;
    priceBreakdown?: string | null;
    coverNote?: string | null;
    etaHours?: number | null;
}

export interface UpdateLocationPayload {
    lat: number;
    lng: number;
    accuracyM?: number | null;
    heading?: number | null;
    speed?: number | null;
}

export interface MarkProviderCompletePayload {
    completionNotes?: string | null;
    completionImages: string[];
}

export interface ConfirmCompletionPayload {
    solved: boolean;
    rating?: number;
    ratingComment?: string | null;
    disputeReason?: string;
}

export interface AdminResolveConflictPayload {
    resolution: MaintenanceConflictResolution;
    adminNotes?: string | null;
}

interface ApiOk<T> {
    success: boolean;
    data: T;
    message?: string;
}

class MaintenanceService {
    // ─── Tenant ─────────────────────────────────────────────────────────────
    async getTenantContext(): Promise<TenantMaintenanceContext> {
        const r = await apiClient.get<ApiOk<TenantMaintenanceContext>>('/maintenance/tenant/context');
        return r.data.data;
    }

    async postIssue(payload: PostMaintenanceIssuePayload): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>('/maintenance/tenant/requests', payload);
        return r.data.data;
    }

    async listTenantRequests(statusFilter?: MaintenanceRequestStatus[]): Promise<MaintenanceRequest[]> {
        const r = await apiClient.get<ApiOk<MaintenanceRequest[]>>('/maintenance/tenant/requests', {
            params: statusFilter && statusFilter.length ? { status: statusFilter.join(',') } : undefined,
        });
        return r.data.data;
    }

    async cancelTenantRequest(requestId: string): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/tenant/requests/${requestId}/cancel`
        );
        return r.data.data;
    }

    async getAwaitingConfirmation(): Promise<MaintenanceRequest | null> {
        const r = await apiClient.get<ApiOk<MaintenanceRequest | null>>(
            '/maintenance/tenant/awaiting-confirmation'
        );
        return r.data.data;
    }

    async confirmCompletion(
        requestId: string,
        payload: ConfirmCompletionPayload
    ): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/tenant/requests/${requestId}/confirm-completion`,
            payload
        );
        return r.data.data;
    }

    async acceptApplication(applicationId: string): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/tenant/applications/${applicationId}/accept`
        );
        return r.data.data;
    }

    async acceptApplicationAsLandlord(applicationId: string): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/landlord/applications/${applicationId}/accept`
        );
        return r.data.data;
    }

    // ─── Browse / requests ──────────────────────────────────────────────────
    async listProviders(opts: {
        category?: string;
        type?: 'INDIVIDUAL' | 'CENTER';
        search?: string;
    } = {}): Promise<BrowseProvider[]> {
        const r = await apiClient.get<ApiOk<BrowseProvider[]>>('/maintenance/providers', { params: opts });
        return r.data.data;
    }

    async getRequest(requestId: string): Promise<MaintenanceRequest> {
        const r = await apiClient.get<ApiOk<MaintenanceRequest>>(`/maintenance/requests/${requestId}`);
        return r.data.data;
    }

    async listApplicationsForRequest(requestId: string): Promise<MaintenanceJobApplication[]> {
        const r = await apiClient.get<ApiOk<MaintenanceJobApplication[]>>(
            `/maintenance/requests/${requestId}/applications`
        );
        return r.data.data;
    }

    async getCurrentLocation(requestId: string): Promise<MaintenanceLocationData | null> {
        const r = await apiClient.get<ApiOk<MaintenanceLocationData | null>>(
            `/maintenance/requests/${requestId}/location`
        );
        return r.data.data;
    }

    // ─── Landlord ───────────────────────────────────────────────────────────
    async listLandlordRequests(): Promise<MaintenanceRequest[]> {
        const r = await apiClient.get<ApiOk<MaintenanceRequest[]>>('/maintenance/landlord/requests');
        return r.data.data;
    }

    // ─── Provider ───────────────────────────────────────────────────────────
    async listAvailableJobs(opts: { category?: string; search?: string } = {}): Promise<MaintenanceRequest[]> {
        const r = await apiClient.get<ApiOk<MaintenanceRequest[]>>('/maintenance/provider/jobs/available', {
            params: opts,
        });
        return r.data.data;
    }

    async listProviderRequests(statusFilter?: MaintenanceRequestStatus[]): Promise<MaintenanceRequest[]> {
        const r = await apiClient.get<ApiOk<MaintenanceRequest[]>>('/maintenance/provider/jobs/mine', {
            params: statusFilter && statusFilter.length ? { status: statusFilter.join(',') } : undefined,
        });
        return r.data.data;
    }

    async listMyApplications(): Promise<MaintenanceJobApplication[]> {
        const r = await apiClient.get<ApiOk<MaintenanceJobApplication[]>>(
            '/maintenance/provider/applications'
        );
        return r.data.data;
    }

    async getProviderEarnings(): Promise<ProviderEarnings> {
        const r = await apiClient.get<ApiOk<ProviderEarnings>>('/maintenance/provider/earnings');
        return r.data.data;
    }

    async applyToRequest(
        requestId: string,
        payload: ProviderApplyPayload
    ): Promise<MaintenanceJobApplication> {
        const r = await apiClient.post<ApiOk<MaintenanceJobApplication>>(
            `/maintenance/provider/requests/${requestId}/apply`,
            payload
        );
        return r.data.data;
    }

    async setEnRoute(requestId: string): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/provider/requests/${requestId}/en-route`
        );
        return r.data.data;
    }

    async setArrived(requestId: string): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/provider/requests/${requestId}/arrived`
        );
        return r.data.data;
    }

    async updateLocation(
        requestId: string,
        payload: UpdateLocationPayload
    ): Promise<MaintenanceLocationData> {
        const r = await apiClient.post<ApiOk<MaintenanceLocationData>>(
            `/maintenance/provider/requests/${requestId}/location`,
            payload
        );
        return r.data.data;
    }

    async markComplete(
        requestId: string,
        payload: MarkProviderCompletePayload
    ): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/provider/requests/${requestId}/complete`,
            payload
        );
        return r.data.data;
    }

    // ─── Admin ──────────────────────────────────────────────────────────────
    async listConflicts(opts: { all?: boolean } = {}): Promise<MaintenanceRequest[]> {
        const r = await apiClient.get<ApiOk<MaintenanceRequest[]>>('/maintenance/admin/conflicts', {
            params: opts.all ? { all: 'true' } : undefined,
        });
        return r.data.data;
    }

    async resolveConflict(
        conflictId: string,
        payload: AdminResolveConflictPayload
    ): Promise<MaintenanceRequest> {
        const r = await apiClient.post<ApiOk<MaintenanceRequest>>(
            `/maintenance/admin/conflicts/${conflictId}/resolve`,
            payload
        );
        return r.data.data;
    }
}

export const maintenanceService = new MaintenanceService();
export default maintenanceService;
