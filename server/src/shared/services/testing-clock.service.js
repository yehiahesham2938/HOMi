import { env } from '../../config/env.js';
// ─── Service ───────────────────────────────────────────────────────────────────
class TestingClockService {
    offsetDays = 0;
    snapshot = null;
    getNow() {
        const now = new Date();
        if (!this.isEnabled() || this.offsetDays === 0)
            return now;
        now.setDate(now.getDate() + this.offsetDays);
        return now;
    }
    getOffsetDays() {
        return this.offsetDays;
    }
    advanceDays(days) {
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
    reset() {
        this.offsetDays = 0;
        this.snapshot = null;
        return this.getState();
    }
    getState() {
        return {
            enabled: this.isEnabled(),
            offsetDays: this.offsetDays,
            now: this.getNow().toISOString(),
        };
    }
    hasSnapshot() {
        return this.snapshot !== null;
    }
    getSnapshot() {
        return this.snapshot;
    }
    saveSnapshot(snap) {
        if (!this.isEnabled())
            return;
        // Only save the *first* snapshot — subsequent advances accumulate on
        // top and the reset always goes back to the original baseline.
        if (this.snapshot === null) {
            this.snapshot = snap;
        }
    }
    isEnabled() {
        return env.TEST_DATE === true;
    }
}
export const testingClockService = new TestingClockService();
export default testingClockService;
