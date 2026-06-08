import { env } from '../../config/env.js';

// ─── Snapshot types ────────────────────────────────────────────────────────────

interface ContractSnapshot {
    id: string;
    status: string;
    payment_status: string;
    payment_verified_at: Date | null;
    paymob_order_id: bigint | null;
    paymob_transaction_id: bigint | null;
    landlord_signed_at: Date | null;
    tenant_signed_at: Date | null;
    tenant_agreed_terms: boolean;
    autopay_enabled: boolean;
}

interface ProfileSnapshot {
    user_id: string;
    wallet_balance: number;
    wallet_pending_order_id: bigint | null;
    wallet_pending_amount_cents: number | null;
    wallet_pending_save_card: boolean;
}

interface PropertySnapshot {
    id: string;
    status: string;
}

interface RentalRequestSnapshot {
    id: string;
    status: string;
}

interface ActivityLogSnapshot {
    /** IDs of ActivityLog rows that were created after the snapshot was taken. */
    newRowIds: string[];
}

interface MaintenanceChargeSnapshot {
    id: string;
    status: string;
    applied_at: Date | null;
}

interface MaintenanceRequestSnapshot {
    id: string;
    status: string;
    en_route_started_at: Date | null;
    in_progress_started_at: Date | null;
    provider_completed_at: Date | null;
    tenant_confirmed_at: Date | null;
    disputed_at: Date | null;
    resolved_at: Date | null;
}

interface NotificationSnapshot {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    related_entity_type: string | null;
    related_entity_id: string | null;
    data: Record<string, unknown>;
    is_read: boolean;
    read_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

interface DbSnapshot {
    takenAt: string;           // ISO — the real-wall-clock moment the snap was taken
    contracts: ContractSnapshot[];
    profiles: ProfileSnapshot[];
    properties: PropertySnapshot[];
    rentalRequests: RentalRequestSnapshot[];
    activityLogCutoff: string; // ISO — delete logs created after this timestamp
    maintenanceCharges: MaintenanceChargeSnapshot[];
    maintenanceRequests: MaintenanceRequestSnapshot[];
    notifications: NotificationSnapshot[];
}

// ─── Service ───────────────────────────────────────────────────────────────────

class TestingClockService {
    private offsetDays = 0;
    private snapshot: DbSnapshot | null = null;

    getNow(): Date {
        const now = new Date();
        if (!this.isEnabled() || this.offsetDays === 0) return now;
        now.setDate(now.getDate() + this.offsetDays);
        return now;
    }

    getOffsetDays(): number {
        return this.offsetDays;
    }

    advanceDays(days: number): { enabled: boolean; offsetDays: number; now: string } {
        if (!this.isEnabled()) {
            return {
                enabled: false,
                offsetDays: this.offsetDays,
                now: new Date().toISOString(),
            };
        }
        this.offsetDays += Math.max(0, Math.floor(days));
        return this.getState();
    }

    reset(): { enabled: boolean; offsetDays: number; now: string } {
        this.offsetDays = 0;
        this.snapshot = null;
        return this.getState();
    }

    getState(): { enabled: boolean; offsetDays: number; now: string } {
        return {
            enabled: this.isEnabled(),
            offsetDays: this.offsetDays,
            now: this.getNow().toISOString(),
        };
    }

    hasSnapshot(): boolean {
        return this.snapshot !== null;
    }

    getSnapshot(): DbSnapshot | null {
        return this.snapshot;
    }

    saveSnapshot(snap: DbSnapshot): void {
        if (!this.isEnabled()) return;
        // Only save the *first* snapshot — subsequent advances accumulate on
        // top and the reset always goes back to the original baseline.
        if (this.snapshot === null) {
            this.snapshot = snap;
        }
    }

    private isEnabled(): boolean {
        return env.TEST_DATE === true;
    }
}

export const testingClockService = new TestingClockService();
export default testingClockService;
