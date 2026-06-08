import { useCallback, useEffect, useState } from 'react';
import { FaForward, FaBackward, FaUndo } from 'react-icons/fa';
import contractService from '../../services/contract.service';
import './TestingClockBadge.css';

const formatDateLabel = (iso: string): string => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const TestingClockBadge = () => {
    // Pre-populate with the real wall-clock date so the badge renders
    // immediately (before the API round-trip completes).
    const [now, setNow] = useState<string>(() => new Date().toISOString());
    const [offsetDays, setOffsetDays] = useState<number>(0);
    const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const state = await contractService.getTestingClock();
            setNow(state.now);
            setOffsetDays(Number(state.offsetDays ?? 0));
            setServerEnabled(Boolean(state.enabled));
            setLastError(null);
        } catch {
            setServerEnabled(false);
            setNow(new Date().toISOString());
            setLastError('Test Date endpoint unreachable — check that the server is running.');
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const handleAdvance = async () => {
        if (isBusy) return;
        setIsBusy(true);
        setLastError(null);
        try {
            const state = await contractService.advanceTestingClock(5);
            setNow(state.now);
            setOffsetDays(Number(state.offsetDays ?? 0));
            globalThis.dispatchEvent(new CustomEvent('homi:testing-clock-changed', {
                detail: { now: state.now, offsetDays: state.offsetDays },
            }));
        } catch (err: any) {
            setLastError(err?.response?.data?.message ?? 'Could not advance time.');
        } finally {
            setIsBusy(false);
        }
    };

    const handleGoBack = async () => {
        if (isBusy || offsetDays <= 0) return;
        setIsBusy(true);
        setLastError(null);
        try {
            const state = await contractService.advanceTestingClock(-5);
            setNow(state.now);
            setOffsetDays(Number(state.offsetDays ?? 0));
            globalThis.dispatchEvent(new CustomEvent('homi:testing-clock-changed', {
                detail: { now: state.now, offsetDays: state.offsetDays },
            }));
        } catch (err: any) {
            setLastError(err?.response?.data?.message ?? 'Could not go back in time.');
        } finally {
            setIsBusy(false);
        }
    };

    const handleReset = async () => {
        if (isBusy || offsetDays <= 0) return;
        setIsBusy(true);
        setLastError(null);
        try {
            const state = await contractService.resetTestingClock();
            setNow(state.now);
            setOffsetDays(Number(state.offsetDays ?? 0));
            globalThis.dispatchEvent(new CustomEvent('homi:testing-clock-changed', {
                detail: { now: state.now, offsetDays: state.offsetDays },
            }));
        } catch (err: any) {
            setLastError(err?.response?.data?.message ?? 'Could not reset time.');
        } finally {
            setIsBusy(false);
        }
    };

    // Hide completely when server config has test-date disabled.
    if (serverEnabled !== true) return null;

    return (
        <div className="testing-clock-badge" title={lastError ?? 'Simulated date for testing — affects rentals, payments, and maintenance.'}>
            <div className="testing-clock-meta">
                <span className="testing-clock-label">Test Date</span>
                <span className="testing-clock-value">
                    {formatDateLabel(now)}
                    {offsetDays > 0 ? <span className="testing-clock-offset"> +{offsetDays}d</span> : null}
                </span>
            </div>
            <div className="testing-clock-actions">
                <button
                    type="button"
                    className="testing-clock-btn go-back"
                    onClick={handleGoBack}
                    disabled={isBusy || offsetDays <= 0 || !serverEnabled}
                    aria-label="Go back test clock by 5 days"
                >
                    <FaBackward /> -5d
                </button>
                <button
                    type="button"
                    className="testing-clock-btn advance"
                    onClick={handleAdvance}
                    disabled={isBusy || !serverEnabled}
                    aria-label="Advance test clock by 5 days"
                >
                    <FaForward /> +5d
                </button>
                <button
                    type="button"
                    className="testing-clock-btn reset"
                    onClick={handleReset}
                    disabled={isBusy || offsetDays <= 0 || !serverEnabled}
                    aria-label="Reset test clock"
                >
                    <FaUndo /> Reset
                </button>
            </div>
        </div>
    );
};

export default TestingClockBadge;
