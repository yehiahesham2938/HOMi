import { z } from 'zod';
export const VerifyPropertySchema = z.object({
    action: z.enum(['APPROVE', 'REJECT'], {
        message: "Action must be either 'APPROVE' or 'REJECT'",
    }),
    rejectionReason: z.string().optional(),
}).refine((data) => {
    if (data.action === 'REJECT' && (!data.rejectionReason || data.rejectionReason.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: 'Rejection reason is required when action is REJECT',
    path: ['rejectionReason'],
});
export const ReviewMaintenanceApplicationSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    rejectionReason: z.string().optional(),
}).refine((data) => data.action === 'APPROVE' || Boolean(data.rejectionReason?.trim()), {
    message: 'Rejection reason is required when action is REJECT',
    path: ['rejectionReason'],
});
export const SupportInboxQuerySchema = z.object({
    filter: z.enum(['all', 'unread', 'read']).default('all'),
    sort: z.enum(['oldest', 'newest']).default('newest'),
});
