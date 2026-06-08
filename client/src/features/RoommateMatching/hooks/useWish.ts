import { useRef, useState } from 'react';
import { roommateMatchingService } from '../services/roommateMatchingService';
import type { WishMatch } from '../types/roommateMatchingTypes';

export interface WishState {
    wish: string;
    setWish: (v: string) => void;
    busy: boolean;
    step: number;
    results: WishMatch[] | null;
    ran: boolean;
    err: string;
    run: (text?: string) => Promise<void>;
    reset: () => void;
}

export function useWish(): WishState {
    const [wish, setWish] = useState('');
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState(-1);
    const [results, setResults] = useState<WishMatch[] | null>(null);
    const [ran, setRan] = useState(false);
    const [err, setErr] = useState('');
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };

    async function run(text?: string) {
        const q = (text ?? wish).trim();
        if (!q || busy) return;
        setWish(q);
        setBusy(true);
        setErr('');
        setResults(null);
        setRan(true);
        setStep(0);
        clearTimers();
        [0, 1, 2, 3].forEach((s, i) => timers.current.push(setTimeout(() => setStep(s), i * 900)));
        try {
            const matches = await roommateMatchingService.wish(q);
            clearTimers();
            setStep(3);
            await new Promise((r) => setTimeout(r, 350));
            setResults(matches);
        } catch (e) {
            clearTimers();
            setResults([]);
            setErr('soft');
        } finally {
            setBusy(false);
            setStep(-1);
        }
    }

    function reset() {
        setResults(null);
        setRan(false);
        setWish('');
        setErr('');
    }

    return { wish, setWish, busy, step, results, ran, err, run, reset };
}
