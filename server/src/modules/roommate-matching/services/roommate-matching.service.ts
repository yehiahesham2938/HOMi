import { RoommateRequest, RoommateRequestStatus, RoommateRequestType } from '../models/RoommateRequest.js';
import { RoommateMatch, MatchStatus, UserMatchAction } from '../models/RoommateMatch.js';
import { User, Profile, Habit } from '../../auth/models/index.js';
import { Contract } from '../../contracts/models/Contract.js';
import { Op } from 'sequelize';
import { AIMatchingService } from './ai-matching.service.js';
import { PropertyDetailedLocation } from '../../properties/models/PropertyDetailedLocation.js';
import { Property } from '../../properties/models/Property.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { messageService } from '../../messages/services/message.service.js';
import { NotificationType } from '../../notifications/models/Notification.js';

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

        // 2. At least 3 habits
        if (!(user as any).habits || (user as any).habits.length < 3) {
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
