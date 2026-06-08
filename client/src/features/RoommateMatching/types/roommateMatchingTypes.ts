export type RoommateRequestType = 'SEARCH_APARTMENT' | 'SEARCH_ROOMMATE';
export type RoommateRequestStatus = 'ACTIVE' | 'PAUSED' | 'MATCHED' | 'EXPIRED' | 'CANCELLED';
export type PreferredGender = 'MALE' | 'FEMALE' | 'ANY';
export type MatchStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type UserMatchAction = 'NONE' | 'ACCEPTED' | 'DECLINED';

export interface RoommateRequest {
    id: string;
    user_id: string;
    type: RoommateRequestType;
    status: RoommateRequestStatus;
    contract_id: string | null;
    preferred_city: string | null;
    preferred_area: string | null;
    budget_min: number | null;
    budget_max: number | null;
    preferred_gender: PreferredGender | null;
    preferred_move_in_date: string | null;
    additional_note: string | null;
    max_occupants: number | null;
    expires_at: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        profile?: {
            first_name: string;
            gender: string;
            avatar_url: string | null;
        };
    };
}

export interface RoommateMatch {
    id: string;
    request_id: string;
    matched_request_id: string;
    requester_id: string;
    matched_user_id: string;
    compatibility_score: number;
    ai_explanation: string | null;
    status: MatchStatus;
    requester_action: UserMatchAction;
    matched_user_action: UserMatchAction;
    created_at: string;
    updated_at: string;
    requester?: {
        id: string;
        profile?: {
            first_name: string;
            last_name: string;
            avatar_url: string | null;
            gender: string;
        };
    };
    matchedUser?: {
        id: string;
        profile?: {
            first_name: string;
            last_name: string;
            avatar_url: string | null;
            gender: string;
        };
    };
    request?: {
        preferred_city: string | null;
        preferred_area: string | null;
    };
    matchedRequest?: {
        preferred_city: string | null;
        preferred_area: string | null;
    };
}

export interface EligibilityResponse {
    eligible: boolean;
    reasons: string[];
}
