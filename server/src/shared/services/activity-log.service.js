import { ActivityLog } from '../../modules/admin/models/ActivityLog.js';
import { testingClockService } from './testing-clock.service.js';
class ActivityLogService {
    async log(input) {
        try {
            // Stamp activity rows with the testing-clock "now" so when the
            // tester advances the simulated date, payment-history rows show
            // the simulated date — not the real wall-clock.
            const now = testingClockService.getNow();
            await ActivityLog.create({
                actor_user_id: input.actor?.userId ?? null,
                actor_role: input.actor?.role ?? null,
                actor_email: input.actor?.email ?? null,
                action: input.action,
                entity_type: input.entityType,
                entity_id: input.entityId ?? null,
                description: input.description,
                metadata: input.metadata ?? null,
                created_at: now,
                updated_at: now,
            });
        }
        catch (error) {
            console.error('Activity log failed:', error);
        }
    }
}
export const activityLogService = new ActivityLogService();
export default activityLogService;
