import apiClient from '../../../config/api';
import type { 
    EligibilityResponse, 
    RoommateRequest, 
    RoommateMatch,
    SmartCandidate,
    WishMatch,
    Lease,
    IncomingRequest,
    RoomConfig,
    ConnStatus,
} from '../types/roommateMatchingTypes';

class RoommateMatchingService {
    /**
     * Check if user is eligible for roommate matching
     */
    async checkEligibility(): Promise<EligibilityResponse> {
        const response = await apiClient.get<EligibilityResponse>('/roommate-matching/eligibility');
        return response.data;
    }

    /**
     * Create a new roommate request
     */
    async createRequest(data: any): Promise<RoommateRequest> {
        const response = await apiClient.post<RoommateRequest>('/roommate-matching/requests', data);
        return response.data;
    }

    /**
     * Get user's current active request
     */
    async getMyActiveRequest(): Promise<RoommateRequest | null> {
        const response = await apiClient.get<RoommateRequest | null>('/roommate-matching/requests/me');
        return response.data;
    }

    /**
     * Update a roommate request
     */
    async updateRequest(id: string, data: any): Promise<RoommateRequest> {
        const response = await apiClient.patch<RoommateRequest>(`/roommate-matching/requests/${id}`, data);
        return response.data;
    }

    /**
     * Cancel a roommate request
     */
    async cancelRequest(id: string): Promise<void> {
        await apiClient.delete(`/roommate-matching/requests/${id}`);
    }

    /**
     * Trigger AI matching for a request
     */
    async findMatches(id: string): Promise<{ found: number }> {
        const response = await apiClient.post<{ found: number }>(`/roommate-matching/requests/${id}/find-matches`);
        return response.data;
    }

    /**
     * Get user's matches
     */
    async getMatches(): Promise<RoommateMatch[]> {
        const response = await apiClient.get<RoommateMatch[]>('/roommate-matching/matches');
        return response.data;
    }

    /**
     * Respond to a match
     */
    async respondToMatch(id: string, action: 'ACCEPTED' | 'DECLINED'): Promise<RoommateMatch> {
        const response = await apiClient.patch<RoommateMatch>(`/roommate-matching/matches/${id}/respond`, { action });
        return response.data;
    }

    /**
     * Browse active requests
     */
    async browseRequests(filters: any = {}): Promise<RoommateRequest[]> {
        const response = await apiClient.get<RoommateRequest[]>('/roommate-matching/requests/browse', { params: filters });
        return response.data;
    }

    /* ── New concept: Smart Match, HOMI Wish, Connect, Lease ──────── */

    /** Non-AI habit-based compatible roommates */
    async smartMatches(filters: { city?: string; area?: string; gender?: string; min?: string } = {}): Promise<SmartCandidate[]> {
        const response = await apiClient.get<SmartCandidate[]>('/roommate-matching/smart-matches', { params: filters });
        return response.data;
    }

    /** HOMI Wish — AI free-text matchmaking */
    async wish(wish: string): Promise<WishMatch[]> {
        const response = await apiClient.post<{ matches: WishMatch[] }>('/roommate-matching/wish', { wish });
        return response.data.matches;
    }

    /** Send a connection request to a user */
    async connect(targetUserId: string, source: 'SMART' | 'WISH' | 'DIRECT' = 'SMART', score?: number, reason?: string): Promise<{ status: string; matchId: string }> {
        const response = await apiClient.post<{ status: string; matchId: string }>('/roommate-matching/connect', { targetUserId, source, score, reason });
        return response.data;
    }

    /** Active leases as configurable lease objects */
    async getLeases(): Promise<Lease[]> {
        const response = await apiClient.get<Lease[]>('/roommate-matching/leases');
        return response.data;
    }

    /** Persist room/rent/occupant config for a lease */
    async saveLeaseConfig(contractId: string, data: { roommatesWanted: number; rooms: RoomConfig[] }): Promise<void> {
        await apiClient.put(`/roommate-matching/leases/${contractId}/config`, data);
    }

    /** Incoming roommate connection requests awaiting my response */
    async getIncomingRequests(): Promise<IncomingRequest[]> {
        const response = await apiClient.get<IncomingRequest[]>('/roommate-matching/leases/incoming');
        return response.data;
    }

    /** Approve / reject an incoming request (reuses match respond) */
    async respondToRequest(matchId: string, action: 'ACCEPTED' | 'DECLINED'): Promise<void> {
        await apiClient.patch(`/roommate-matching/matches/${matchId}/respond`, { action });
    }
}

export type { ConnStatus };

export const roommateMatchingService = new RoommateMatchingService();
export default roommateMatchingService;
