import { RoommateRequest, RoommateRequestStatus, RoommateRequestType } from '../models/RoommateRequest.js';
import { RoommateMatch, MatchStatus, UserMatchAction, MatchSource } from '../models/RoommateMatch.js';
import type { MatchSourceType } from '../models/RoommateMatch.js';
import { User, Profile, Habit } from '../../auth/models/index.js';
import { Contract } from '../../contracts/models/Contract.js';
import { Op } from 'sequelize';
import { AIMatchingService } from './ai-matching.service.js';
import { PropertyDetailedLocation } from '../../properties/models/PropertyDetailedLocation.js';
import { Property } from '../../properties/models/Property.js';
import { PropertySpecifications } from '../../properties/models/PropertySpecifications.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { messageService } from '../../messages/services/message.service.js';
import { NotificationType } from '../../notifications/models/Notification.js';
import { compat, habitsToLabels } from '../utils/compatibility.util.js';

export class RoommateMatchingError extends Error {
    constructor(public message: string, public statusCode: number = 400, public code: string = 'ROOMMATE_MATCHING_ERROR') {
        super(message);
        this.name = 'RoommateMatchingError';
    }
}

export class RoommateMatchingService {
    /**
     * Check if a user is eligible for roommate matching
     */
    static async checkEligibility(userId: string): Promise<{ eligible: boolean; reasons: string[] }> {
        const user = await User.findByPk(userId, {
            include: [
                { model: Profile, as: 'profile' },
                { model: Habit, as: 'habits' }
            ]
        });

        if (!user) {
            throw new RoommateMatchingError('User not found', 404);
        }

        const reasons: string[] = [];

        // 1. Profile complete
        if (!user.profile || !user.profile.isVerificationComplete()) {
            reasons.push('PROFILE_INCOMPLETE');
        }

        // 2. Structured lifestyle profile complete
        if (!user.profile || !user.profile.hasLifestyleProfile()) {
            reasons.push('INSUFFICIENT_HABITS');
        }

        // 3. User role is TENANT
        if (user.role !== 'TENANT') {
            reasons.push('INVALID_ROLE');
        }

        return {
            eligible: reasons.length === 0,
            reasons
        };
    }

    /**
     * Create a new roommate request
     */
    static async createRequest(userId: string, data: any) {
        // Check eligibility
        const eligibility = await this.checkEligibility(userId);
        if (!eligibility.eligible) {
            throw new RoommateMatchingError('User is not eligible for roommate matching', 403, 'INELIGIBLE');
        }

        // Check if user already has an active request
        const existingRequest = await RoommateRequest.findOne({
            where: {
                user_id: userId,
                status: RoommateRequestStatus.ACTIVE
            }
        });

        if (existingRequest) {
            throw new RoommateMatchingError('You already have an active roommate request', 400, 'ALREADY_HAS_ACTIVE_REQUEST');
        }

        // If searching for roommate, verify contract exists and is active
        if (data.type === RoommateRequestType.SEARCH_ROOMMATE) {
            const contract = await Contract.findOne({
                where: {
                    id: data.contract_id,
                    tenant_id: userId,
                    status: 'ACTIVE'
                }
            });

            if (!contract) {
                throw new RoommateMatchingError('Active contract not found', 404);
            }
        }

        const request = await RoommateRequest.create({
            ...data,
            user_id: userId,
            status: RoommateRequestStatus.ACTIVE
        });

        return request;
    }

    /**
     * Get user's current active request
     */
    static async getMyActiveRequest(userId: string) {
        return await RoommateRequest.findOne({
            where: {
                user_id: userId,
                status: RoommateRequestStatus.ACTIVE
            },
            include: [
                { model: Contract, as: 'contract' }
            ]
        });
    }

    /**
     * Update a roommate request
     */
    static async updateRequest(userId: string, requestId: string, data: any) {
        const request = await RoommateRequest.findOne({
            where: { id: requestId, user_id: userId }
        });

        if (!request) {
            throw new RoommateMatchingError('Request not found', 404);
        }

        await request.update(data);
        return request;
    }

    /**
     * Cancel/Delete a roommate request
     */
    static async cancelRequest(userId: string, requestId: string) {
        const request = await RoommateRequest.findOne({
            where: { id: requestId, user_id: userId }
        });

        if (!request) {
            throw new RoommateMatchingError('Request not found', 404);
        }

        await request.update({ status: RoommateRequestStatus.CANCELLED });
        return { success: true };
    }

    /**
     * Get matches for a request
     */
    static async getMatches(userId: string) {
        const myRequest = await this.getMyActiveRequest(userId);
        if (!myRequest) {
            return [];
        }

        return await RoommateMatch.findAll({
            where: {
                [Op.or]: [
                    { requester_id: userId, request_id: myRequest.id },
                    { matched_user_id: userId, matched_request_id: myRequest.id }
                ],
                status: { [Op.ne]: MatchStatus.DECLINED }
            },
            include: [
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url', 'gender'] }]
                },
                {
                    model: User,
                    as: 'matchedUser',
                    attributes: ['id'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'last_name', 'avatar_url', 'gender'] }]
                },
                {
                    model: RoommateRequest,
                    as: 'request',
                    attributes: ['preferred_city', 'preferred_area']
                },
                {
                    model: RoommateRequest,
                    as: 'matchedRequest',
                    attributes: ['preferred_city', 'preferred_area']
                }
            ],
            order: [['compatibility_score', 'DESC']]
        });
    }

    /**
     * Respond to a match
     */
    static async respondToMatch(userId: string, matchId: string, action: 'ACCEPTED' | 'DECLINED') {
        const match = await RoommateMatch.findByPk(matchId);

        if (!match) {
            throw new RoommateMatchingError('Match not found', 404);
        }

        if (match.requester_id === userId) {
            match.requester_action = action;
        } else if (match.matched_user_id === userId) {
            match.matched_user_action = action;
        } else {
            throw new RoommateMatchingError('Unauthorized', 403);
        }

        // Update overall status
        if (action === 'DECLINED') {
            match.status = MatchStatus.DECLINED;
        } else if (match.requester_action === UserMatchAction.ACCEPTED && match.matched_user_action === UserMatchAction.ACCEPTED) {
            match.status = MatchStatus.ACCEPTED;
            
            // 1. Notify both users
            await Promise.all([
                notificationService.create({
                    userId: match.requester_id,
                    type: NotificationType.SYSTEM,
                    title: '🎉 It\'s a Match!',
                    body: 'You and your potential roommate have both accepted the match. Start chatting now!',
                    relatedEntityType: 'RoommateMatch',
                    relatedEntityId: match.id
                }),
                notificationService.create({
                    userId: match.matched_user_id,
                    type: NotificationType.SYSTEM,
                    title: '🎉 It\'s a Match!',
                    body: 'You and your potential roommate have both accepted the match. Start chatting now!',
                    relatedEntityType: 'RoommateMatch',
                    relatedEntityId: match.id
                })
            ]);

            // 2. Auto-create message thread
            await messageService.startConversation(match.requester_id, {
                participantId: match.matched_user_id,
                initialMessage: "Hey! We've been matched as potential roommates on HOMi. Nice to meet you!"
            });
        } else {
            // Notify the other user that someone accepted
            const notifierId = match.requester_id === userId ? match.matched_user_id : match.requester_id;
            const actorName = (await Profile.findOne({ where: { user_id: userId } }))?.first_name || 'Someone';
            
            await notificationService.create({
                userId: notifierId,
                type: NotificationType.SYSTEM,
                title: '✅ Match accepted',
                body: `${actorName} accepted your roommate match! Accept back to start chatting.`,
                relatedEntityType: 'RoommateMatch',
                relatedEntityId: match.id
            });
        }

        await match.save();
        return match;
    }

    /**
     * Browse active requests (public view)
     */
    static async browseRequests(userId: string, filters: any) {
        const where: any = {
            status: RoommateRequestStatus.ACTIVE,
            user_id: { [Op.ne]: userId } // Don't show own request
        };

        if (filters.city) where.preferred_city = filters.city;
        if (filters.area) where.preferred_area = filters.area;
        if (filters.type) where.type = filters.type;

        return await RoommateRequest.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id'],
                    include: [{ model: Profile, as: 'profile', attributes: ['first_name', 'gender', 'avatar_url'] }]
                }
            ],
            limit: 50,
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Find and score matches for a request
     */
    static async findMatches(userId: string, requestId: string) {
        const myRequest = await RoommateRequest.findOne({
            where: { id: requestId, user_id: userId, status: RoommateRequestStatus.ACTIVE },
            include: [
                { model: User, as: 'user', include: [{ model: Profile, as: 'profile' }, { model: Habit, as: 'habits' }] },
                { model: Contract, as: 'contract', include: [{ model: Property, as: 'property', include: [{ model: PropertyDetailedLocation, as: 'detailedLocation' }] }] }
            ]
        });

        if (!myRequest) {
            throw new RoommateMatchingError('Active request not found', 404);
        }

        // 1. Pre-filter candidates
        const oppositeType = myRequest.type === RoommateRequestType.SEARCH_APARTMENT 
            ? RoommateRequestType.SEARCH_ROOMMATE 
            : RoommateRequestType.SEARCH_APARTMENT;

        // Determine location to search for
        let searchCity = myRequest.preferred_city;
        let searchArea = myRequest.preferred_area;

        if (myRequest.type === RoommateRequestType.SEARCH_ROOMMATE && myRequest.contract?.property?.detailedLocation) {
            searchCity = myRequest.contract.property.detailedLocation.city;
            searchArea = myRequest.contract.property.detailedLocation.area;
        }

        const candidates = await RoommateRequest.findAll({
            where: {
                type: oppositeType,
                status: RoommateRequestStatus.ACTIVE,
                user_id: { [Op.ne]: userId },
                preferred_city: searchCity,
                // Add area overlap if possible, but keep city as hard requirement
            },
            include: [
                { model: User, as: 'user', include: [{ model: Profile, as: 'profile' }, { model: Habit, as: 'habits' }] },
                { model: Contract, as: 'contract', include: [{ model: Property, as: 'property', include: [{ model: PropertyDetailedLocation, as: 'detailedLocation' }] }] }
            ],
            limit: 20 // Cap for AI costs
        });

        const newMatches = [];

        for (const candidate of candidates) {
            // Check if match already exists
            const existingMatch = await RoommateMatch.findOne({
                where: {
                    [Op.or]: [
                        { request_id: myRequest.id, matched_request_id: candidate.id },
                        { request_id: candidate.id, matched_request_id: myRequest.id }
                    ]
                }
            });

            if (existingMatch) continue;

            // Prepare data for AI
            const userAData = this.prepareUserDataForAI(myRequest);
            const userBData = this.prepareUserDataForAI(candidate);

            // 2. AI Scoring
            const aiResult = await AIMatchingService.scoreCompatibility(userAData, userBData);

            // 3. Save Match
            const match = await RoommateMatch.create({
                request_id: myRequest.id,
                matched_request_id: candidate.id,
                requester_id: userId,
                matched_user_id: candidate.user_id,
                compatibility_score: aiResult.compatibility_score,
                ai_explanation: aiResult.explanation,
                status: MatchStatus.PENDING
            });

            newMatches.push(match);

            // Send notification if score is high
            if (aiResult.compatibility_score >= 80) {
                await notificationService.create({
                    userId: candidate.user_id,
                    type: NotificationType.SYSTEM,
                    title: '🎯 Great match found!',
                    body: `You have a ${aiResult.compatibility_score}% compatibility score with ${myRequest.user?.profile?.first_name}! Check your matches.`,
                    relatedEntityType: 'RoommateMatch',
                    relatedEntityId: match.id
                });
            }
        }

        return { found: newMatches.length };
    }

    /* ============================================================
       New concept: Smart Match, HOMI Wish, Connect, Lease workspace
       ============================================================ */

    /** Build the "you" reference used for compatibility scoring. */
    private static async buildYou(userId: string) {
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const myReq = await RoommateRequest.findOne({
            where: { user_id: userId, status: RoommateRequestStatus.ACTIVE },
        });
        const budget: [number, number] | null =
            profile?.preferred_budget_min != null && profile?.preferred_budget_max != null
                ? [Number(profile.preferred_budget_min), Number(profile.preferred_budget_max)]
                : myReq?.budget_min != null && myReq?.budget_max != null
                    ? [Number(myReq.budget_min), Number(myReq.budget_max)]
                    : null;
        return {
            habits: (profile?.lifestyle_habits as Record<string, number>) || {},
            city: myReq?.preferred_city || profile?.current_location || null,
            area: myReq?.preferred_area || null,
            budget,
            gender: profile?.gender || null,
        };
    }

    private static ageFromBirthdate(birthdate: Date | null | undefined): number | null {
        if (!birthdate) return null;
        return new Date().getFullYear() - new Date(birthdate).getFullYear();
    }

    /** Gather the candidate pool: other tenants with a lifestyle profile + active request. */
    private static async getCandidatePool(userId: string) {
        const requests = await RoommateRequest.findAll({
            where: {
                status: RoommateRequestStatus.ACTIVE,
                user_id: { [Op.ne]: userId },
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    where: { role: 'TENANT' },
                    include: [{ model: Profile, as: 'profile' }],
                },
            ],
            order: [['created_at', 'DESC']],
            limit: 60,
        });

        const seen = new Set<string>();
        const pool: Array<{ user: User; request: RoommateRequest; profile: Profile }> = [];
        for (const req of requests) {
            const user = req.user as User | undefined;
            const profile = user?.profile as Profile | undefined;
            if (!user || !profile) continue;
            if (!profile.hasLifestyleProfile()) continue;
            if (seen.has(user.id)) continue;
            seen.add(user.id);
            pool.push({ user, request: req, profile });
        }
        return pool;
    }

    /** Connection status between me and another user. */
    private static async connStatus(userId: string, otherUserId: string): Promise<'none' | 'sent' | 'received' | 'mutual'> {
        const match = await RoommateMatch.findOne({
            where: {
                [Op.or]: [
                    { requester_id: userId, matched_user_id: otherUserId },
                    { requester_id: otherUserId, matched_user_id: userId },
                ],
                status: { [Op.ne]: MatchStatus.DECLINED },
            },
        });
        if (!match) return 'none';
        if (match.status === MatchStatus.ACCEPTED) return 'mutual';
        const iAmRequester = match.requester_id === userId;
        const myAction = iAmRequester ? match.requester_action : match.matched_user_action;
        const otherAction = iAmRequester ? match.matched_user_action : match.requester_action;
        if (myAction === UserMatchAction.ACCEPTED && otherAction !== UserMatchAction.ACCEPTED) return 'sent';
        if (otherAction === UserMatchAction.ACCEPTED && myAction !== UserMatchAction.ACCEPTED) return 'received';
        return 'sent';
    }

    private static buildCandidateDTO(
        entry: { user: User; request: RoommateRequest; profile: Profile },
        you: Awaited<ReturnType<typeof RoommateMatchingService.buildYou>>,
    ) {
        const { user, request, profile } = entry;
        const habits = (profile.lifestyle_habits as Record<string, number>) || {};
        const budget: [number, number] | null =
            request.budget_min != null && request.budget_max != null
                ? [Number(request.budget_min), Number(request.budget_max)]
                : null;
        const c = compat(you, {
            habits,
            city: request.preferred_city,
            area: request.preferred_area,
            budget,
        });
        return {
            id: user.id,
            requestId: request.id,
            name: `${profile.first_name} ${profile.last_name}`.trim(),
            avatar: profile.avatar_url || null,
            gender: profile.gender || null,
            age: this.ageFromBirthdate(profile.birthdate),
            city: request.preferred_city || null,
            area: request.preferred_area || null,
            verified: profile.isVerificationComplete(),
            bio: profile.bio || null,
            budget,
            moveIn: request.preferred_move_in_date || null,
            note: request.additional_note || null,
            habits,
            score: c.score,
            breakdown: c.breakdown,
            top: c.top,
        };
    }

    /** Section B — non-AI Smart Match list. */
    static async smartMatches(userId: string, filters: { city?: string; area?: string; gender?: string; min?: string }): Promise<any[]> {
        const you = await this.buildYou(userId);
        const pool = await this.getCandidatePool(userId);

        let dtos = pool.map((e) => this.buildCandidateDTO(e, you));

        if (filters.city && filters.city !== 'Any city') dtos = dtos.filter((d) => d.city === filters.city);
        if (filters.area && filters.area !== 'Any area') dtos = dtos.filter((d) => d.area === filters.area);
        if (filters.gender && filters.gender !== 'Any') dtos = dtos.filter((d) => d.gender === filters.gender);
        if (filters.min && filters.min !== 'Any') {
            const min = parseInt(filters.min, 10);
            if (!Number.isNaN(min)) dtos = dtos.filter((d) => d.score >= min);
        }

        dtos.sort((a, b) => b.score - a.score);

        // attach connection status
        const withConn = await Promise.all(
            dtos.map(async (d) => ({ ...d, conn: await this.connStatus(userId, d.id) })),
        );
        return withConn;
    }

    /** Section B — HOMI Wish AI matching. */
    static async wish(userId: string, wishText: string): Promise<any[]> {
        const you = await this.buildYou(userId);
        const pool = await this.getCandidatePool(userId);
        const dtos = pool.map((e) => this.buildCandidateDTO(e, you));

        const roster = dtos.map((d) => ({
            id: d.id,
            name: d.name,
            area: d.area,
            city: d.city,
            age: d.age,
            gender: d.gender,
            budget: d.budget ? `${d.budget[0]}-${d.budget[1]} EGP` : null,
            moveIn: d.moveIn,
            habits: habitsToLabels(d.habits),
            bio: d.bio,
            baseScore: d.score,
        }));

        const ranked = await AIMatchingService.rankByWish(wishText, roster);

        const byId = new Map(dtos.map((d) => [d.id, d]));
        const matches = await Promise.all(
            ranked
                .filter((r) => byId.has(r.id))
                .map(async (r) => {
                    const cand = byId.get(r.id)!;
                    return {
                        ...cand,
                        score: r.score,
                        reason: r.reason,
                        conn: await this.connStatus(userId, cand.id),
                    };
                }),
        );
        return matches;
    }

    /** Section B — send a connection request to another user. */
    static async connect(userId: string, targetUserId: string, source: MatchSourceType, score?: number, reason?: string): Promise<{ status: string; matchId: string }> {
        if (userId === targetUserId) {
            throw new RoommateMatchingError('You cannot connect with yourself', 400);
        }
        const target = await User.findByPk(targetUserId);
        if (!target) throw new RoommateMatchingError('User not found', 404);

        let match = await RoommateMatch.findOne({
            where: {
                [Op.or]: [
                    { requester_id: userId, matched_user_id: targetUserId },
                    { requester_id: targetUserId, matched_user_id: userId },
                ],
                status: { [Op.ne]: MatchStatus.DECLINED },
            },
        });

        if (!match) {
            match = await RoommateMatch.create({
                requester_id: userId,
                matched_user_id: targetUserId,
                request_id: null,
                matched_request_id: null,
                compatibility_score: score != null ? Math.round(score) : 0,
                ai_explanation: reason || null,
                source: source || MatchSource.SMART,
                status: MatchStatus.PENDING,
                requester_action: UserMatchAction.ACCEPTED,
                matched_user_action: UserMatchAction.NONE,
            });

            const me = await Profile.findOne({ where: { user_id: userId } });
            await notificationService.create({
                userId: targetUserId,
                type: NotificationType.SYSTEM,
                title: '🤝 New roommate connection request',
                body: `${me?.first_name || 'Someone'} wants to connect as a roommate on HOMi. Review their request!`,
                relatedEntityType: 'RoommateMatch',
                relatedEntityId: match.id,
            });
            return { status: 'sent', matchId: match.id };
        }

        // Existing match: if the other side initiated, my click accepts it (mutual).
        return await this.respondToMatch(userId, match.id, 'ACCEPTED').then(() => ({ status: 'updated', matchId: match!.id }));
    }

    /** Section A — the user's active leases as configurable lease objects. */
    static async getLeases(userId: string): Promise<any[]> {
        const contracts = await Contract.findAll({
            where: { tenant_id: userId, status: 'ACTIVE' },
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: [
                        { model: PropertyDetailedLocation, as: 'detailedLocation' },
                        { model: PropertySpecifications, as: 'specifications' },
                    ],
                },
            ],
        });

        const result = [];
        for (const contract of contracts) {
            const property = contract.property as Property | undefined;
            const specs = (property as any)?.specifications as PropertySpecifications | undefined;
            const loc = (property as any)?.detailedLocation as PropertyDetailedLocation | undefined;
            const beds = specs?.bedrooms || contract.max_occupants || 2;
            const rent = Number(contract.rent_amount) || 0;

            // existing listing for this contract (if any)
            const listing = await RoommateRequest.findOne({
                where: {
                    user_id: userId,
                    contract_id: contract.id,
                    type: RoommateRequestType.SEARCH_ROOMMATE,
                    status: RoommateRequestStatus.ACTIVE,
                },
            });

            let rooms = (listing?.rooms_config as Array<Record<string, unknown>>) || null;
            if (!rooms) {
                // derive default rooms from bedrooms
                rooms = Array.from({ length: beds }, (_, i) => ({
                    name: i === 0 ? 'Master Room' : `Room ${i + 1}`,
                    ensuite: i === 0,
                    rent: beds > 0 ? Math.round(rent / beds) : rent,
                    listed: i > 0,
                }));
            }

            result.push({
                id: contract.id,
                listingId: listing?.id || null,
                title: property?.title || 'My Lease',
                addr: property?.address || [loc?.area, loc?.city].filter(Boolean).join(', '),
                city: loc?.city || null,
                area: loc?.area || null,
                totalRent: rent,
                beds,
                occupied: 1,
                roommatesWanted: listing?.max_occupants ?? Math.max(1, beds - 1),
                rooms,
            });
        }
        return result;
    }

    /** Section A — persist room/rent/occupant config for a lease (upserts a SEARCH_ROOMMATE listing). */
    static async saveLeaseConfig(
        userId: string,
        contractId: string,
        data: { roommatesWanted: number; rooms: Array<Record<string, unknown>> },
    ) {
        const contract = await Contract.findOne({
            where: { id: contractId, tenant_id: userId, status: 'ACTIVE' },
            include: [{ model: Property, as: 'property', include: [{ model: PropertyDetailedLocation, as: 'detailedLocation' }] }],
        });
        if (!contract) throw new RoommateMatchingError('Active contract not found', 404);

        const loc = (contract.property as any)?.detailedLocation as PropertyDetailedLocation | undefined;

        let listing = await RoommateRequest.findOne({
            where: { user_id: userId, contract_id: contractId, type: RoommateRequestType.SEARCH_ROOMMATE },
        });

        const payload = {
            user_id: userId,
            type: RoommateRequestType.SEARCH_ROOMMATE,
            status: RoommateRequestStatus.ACTIVE,
            contract_id: contractId,
            preferred_city: loc?.city || null,
            preferred_area: loc?.area || null,
            max_occupants: data.roommatesWanted,
            rooms_config: data.rooms,
        };

        if (listing) {
            await listing.update(payload);
        } else {
            listing = await RoommateRequest.create(payload as any);
        }
        return listing;
    }

    /** Section A — incoming roommate connection requests awaiting my response. */
    static async getIncomingRequests(userId: string): Promise<any[]> {
        const matches = await RoommateMatch.findAll({
            where: {
                matched_user_id: userId,
                matched_user_action: UserMatchAction.NONE,
                status: MatchStatus.PENDING,
            },
            include: [
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id'],
                    include: [{ model: Profile, as: 'profile' }],
                },
            ],
            order: [['created_at', 'DESC']],
        });

        const you = await this.buildYou(userId);
        return matches.map((m) => {
            const requester = m.requester as User | undefined;
            const profile = requester?.profile as Profile | undefined;
            const habits = (profile?.lifestyle_habits as Record<string, number>) || {};
            const c = compat(you, { habits, city: null, area: null, budget: null });
            return {
                matchId: m.id,
                userId: m.requester_id,
                name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'HOMi User',
                avatar: profile?.avatar_url || null,
                gender: profile?.gender || null,
                age: this.ageFromBirthdate(profile?.birthdate),
                verified: profile?.isVerificationComplete() || false,
                bio: profile?.bio || null,
                note: m.ai_explanation || null,
                habits,
                score: m.compatibility_score || c.score,
                breakdown: c.breakdown,
                top: c.top,
            };
        });
    }

    private static prepareUserDataForAI(request: RoommateRequest) {
        const user = request.user!;
        const profile = user.profile!;
        const habits = ((user as any).habits || []).map((h: any) => h.name);
        
        let city = request.preferred_city;
        let area = request.preferred_area;
        let budgetMin = request.budget_min;
        let budgetMax = request.budget_max;

        if (request.type === RoommateRequestType.SEARCH_ROOMMATE && request.contract) {
            city = request.contract.property?.detailedLocation?.city || null;
            area = request.contract.property?.detailedLocation?.area || null;
            budgetMin = Number(request.contract.rent_amount) || null;
            budgetMax = budgetMin;
        }

        return {
            first_name: profile.first_name,
            gender: profile.gender,
            age: profile.birthdate ? new Date().getFullYear() - new Date(profile.birthdate).getFullYear() : null,
            habits,
            budget_range: { min: budgetMin, max: budgetMax },
            location: { city, area },
            preferred_roommate_gender: request.preferred_gender,
            additional_note: request.additional_note
        };
    }
}
