import { z } from 'zod';
import { RoommateRequestType, PreferredGender } from '../models/RoommateRequest.js';

export const createRoommateRequestSchema = z.object({
    type: z.enum([RoommateRequestType.SEARCH_APARTMENT, RoommateRequestType.SEARCH_ROOMMATE]),
    contract_id: z.string().uuid().optional().nullable(),
    preferred_city: z.string().min(1).max(100).optional().nullable(),
    preferred_area: z.string().min(1).max(100).optional().nullable(),
    budget_min: z.number().min(0).optional().nullable(),
    budget_max: z.number().min(0).optional().nullable(),
    preferred_gender: z.enum([PreferredGender.MALE, PreferredGender.FEMALE, PreferredGender.ANY]).optional().nullable(),
    preferred_move_in_date: z.string().optional().nullable(), // Will be parsed to date
    additional_note: z.string().max(1000).optional().nullable(),
    max_occupants: z.number().int().min(1).optional().nullable(),
}).refine((data) => {
        if (data.type === RoommateRequestType.SEARCH_ROOMMATE) {
            return !!data.contract_id;
        }
        return true;
    }, {
        message: "contract_id is required when searching for a roommate",
        path: ["contract_id"],
    }).refine((data) => {
        if (data.type === RoommateRequestType.SEARCH_APARTMENT) {
            return !!data.preferred_city && !!data.preferred_area;
        }
        return true;
    }, {
        message: "preferred_city and preferred_area are required when searching for an apartment",
    });

export const updateRoommateRequestSchema = z.object({
    status: z.enum(['ACTIVE', 'PAUSED', 'MATCHED', 'EXPIRED', 'CANCELLED']).optional(),
    preferred_city: z.string().min(1).max(100).optional().nullable(),
    preferred_area: z.string().min(1).max(100).optional().nullable(),
    budget_min: z.number().min(0).optional().nullable(),
    budget_max: z.number().min(0).optional().nullable(),
    preferred_gender: z.enum([PreferredGender.MALE, PreferredGender.FEMALE, PreferredGender.ANY]).optional().nullable(),
    preferred_move_in_date: z.string().optional().nullable(),
    additional_note: z.string().max(1000).optional().nullable(),
    max_occupants: z.number().int().min(1).optional().nullable(),
});

export const respondToMatchSchema = z.object({
    action: z.enum(['ACCEPTED', 'DECLINED']),
});

export const wishSchema = z.object({
    wish: z.string().min(3).max(500),
});

export const connectSchema = z.object({
    targetUserId: z.string().uuid(),
    source: z.enum(['SMART', 'WISH', 'DIRECT']).optional(),
    score: z.number().min(0).max(100).optional(),
    reason: z.string().max(500).optional().nullable(),
});

const roomConfigSchema = z.object({
    name: z.string(),
    ensuite: z.boolean().optional(),
    rent: z.number().min(0),
    listed: z.boolean().optional(),
});

export const saveLeaseConfigSchema = z.object({
    roommatesWanted: z.number().int().min(0),
    rooms: z.array(roomConfigSchema),
});
