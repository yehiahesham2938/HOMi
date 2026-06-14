import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import QRCode from 'qrcode';
import {
    QrCode, CheckCircle2, RefreshCw, Wifi, WifiOff, MonitorSmartphone,
    Smartphone, Lock
} from 'lucide-react';
import apiClient from '../../../config/api';
import './NidQrBridge.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NidQrBridgeProps {
    onSuccess: (nationalId: string, fullNameArabic: string) => void;
    onCancel: () => void;
}

type BridgePhase = 'loading' | 'waiting' | 'success' | 'expired' | 'error';

// ─── Component ───────────────────────────────────────────────────────────────

const NidQrBridge: React.FC<NidQrBridgeProps> = ({ onSuccess, onCancel }) => {
    const [phase, setPhase] = useState<BridgePhase>('loading');
    const [token, setToken] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(600); // 10 min in seconds
    const [socketConnected, setSocketConnected] = useState(false);
    const [successData, setSuccessData] = useState<{ fullNameArabic: string; nationalId: string } | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const cleanup = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    const buildQrUrl = (tok: string): string => {
        const origin = window.location.origin;
        return `${origin}/nid-scan/${tok}`;
    };

    const handleNidCompleted = useCallback(
        (payload: { nationalId: string; fullNameArabic: string }) => {
            cleanup();
            setSuccessData(payload);
            setPhase('success');
            // Give the user a moment to see the success screen, then advance
            setTimeout(() => {
                onSuccess(payload.nationalId, payload.fullNameArabic);
            }, 2800);
        },
        [cleanup, onSuccess]
    );

    // ── Fetch token & setup ───────────────────────────────────────────────────

    const initSession = useCallback(async () => {
        cleanup();
        setPhase('loading');
        setTimeLeft(600);

        try {
            const { data } = await apiClient.post<{ token: string }>('/auth/nid-session');
            const tok = data.token;
            setToken(tok);

            // Generate QR code canvas
            const qrUrl = buildQrUrl(tok);
            const dataUrl = await QRCode.toDataURL(qrUrl, {
                width: 256,
                margin: 2,
                color: { dark: '#0f172a', light: '#f8fafc' },
                errorCorrectionLevel: 'M',
            });
            setQrDataUrl(dataUrl);
            setPhase('waiting');

            // ── Socket.IO (preferred, real-time) ─────────────────────────────
            const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string) || '/api';
            const baseUrl =
                apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')
                    ? apiBaseUrl.replace(/\/api\/?$/, '')
                    : window.location.origin;

            const socket = io(`${baseUrl}/nid-session`, {
                path: '/socket.io',
                transports: ['websocket', 'polling'],
                withCredentials: true,
                reconnectionAttempts: 5,
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                setSocketConnected(true);
                socket.emit('join', { token: tok });
            });
            socket.on('disconnect', () => setSocketConnected(false));
            socket.on('nid:completed', handleNidCompleted);

            // ── Polling fallback ─────────────────────────────────────────────
            pollRef.current = setInterval(async () => {
                try {
                    const { data: pollData } = await apiClient.get<{
                        status: 'pending' | 'completed';
                        nationalId?: string;
                        fullNameArabic?: string;
                    }>(`/auth/nid-session/${tok}`);

                    if (pollData.status === 'completed' && pollData.nationalId && pollData.fullNameArabic) {
                        handleNidCompleted({ nationalId: pollData.nationalId, fullNameArabic: pollData.fullNameArabic });
                    }
                } catch {
                    /* ignore poll errors — socket is primary */
                }
            }, 4000);

            // ── Countdown ────────────────────────────────────────────────────
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        cleanup();
                        setPhase('expired');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch {
            setPhase('error');
        }
    }, [cleanup, handleNidCompleted]);

    useEffect(() => {
        void initSession();
        return cleanup;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Formatting ────────────────────────────────────────────────────────────

    const formatTime = (secs: number): string => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (phase === 'loading') {
        return (
            <div className="nid-qr-bridge">
                <div className="nid-qr-bridge__loading">
                    <div className="nid-qr-bridge__spinner" />
                    <p>Generating secure QR code…</p>
                </div>
            </div>
        );
    }

    if (phase === 'success' && successData) {
        return (
            <div className="nid-qr-bridge">
                <div className="nid-qr-bridge__success">
                    <div className="nid-qr-bridge__success-icon">
                        <CheckCircle2 size={72} />
                    </div>
                    <h2>Identity Verified!</h2>
                    <p className="nid-qr-bridge__success-name">{successData.fullNameArabic}</p>
                    <p className="nid-qr-bridge__success-hint">Continuing your profile…</p>
                </div>
            </div>
        );
    }

    if (phase === 'expired') {
        return (
            <div className="nid-qr-bridge">
                <div className="nid-qr-bridge__expired">
                    <WifiOff size={48} />
                    <h2>QR Code Expired</h2>
                    <p>The QR code timed out after 10 minutes.</p>
                    <button className="nid-qr-bridge__btn nid-qr-bridge__btn--primary" onClick={() => void initSession()}>
                        <RefreshCw size={16} /> Generate New QR
                    </button>
                    <button className="nid-qr-bridge__btn nid-qr-bridge__btn--ghost" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div className="nid-qr-bridge">
                <div className="nid-qr-bridge__expired">
                    <WifiOff size={48} />
                    <h2>Connection Error</h2>
                    <p>Could not create a scan session. Please check your connection.</p>
                    <button className="nid-qr-bridge__btn nid-qr-bridge__btn--primary" onClick={() => void initSession()}>
                        <RefreshCw size={16} /> Retry
                    </button>
                    <button className="nid-qr-bridge__btn nid-qr-bridge__btn--ghost" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // phase === 'waiting'
    return (
        <div className="nid-qr-bridge">
            <div className="nid-qr-bridge__header">
                <div className="nid-qr-bridge__header-icons">
                    <MonitorSmartphone size={28} />
                </div>
                <h2>Scan with Your Phone</h2>
                <p>Your phone camera can scan the national ID. Point your phone at the QR code below.</p>
            </div>

            <div className="nid-qr-bridge__body">
                {/* QR code */}
                <div className="nid-qr-bridge__qr-wrapper">
                    {qrDataUrl && (
                        <img
                            src={qrDataUrl}
                            alt="NID scan QR code"
                            className="nid-qr-bridge__qr-img"
                            width={224}
                            height={224}
                        />
                    )}
                    <div className={`nid-qr-bridge__qr-corner nid-qr-bridge__qr-corner--tl`} />
                    <div className={`nid-qr-bridge__qr-corner nid-qr-bridge__qr-corner--tr`} />
                    <div className={`nid-qr-bridge__qr-corner nid-qr-bridge__qr-corner--bl`} />
                    <div className={`nid-qr-bridge__qr-corner nid-qr-bridge__qr-corner--br`} />
                </div>

                {/* Timer */}
                <div className={`nid-qr-bridge__timer ${timeLeft < 60 ? 'nid-qr-bridge__timer--urgent' : ''}`}>
                    Expires in <span>{formatTime(timeLeft)}</span>
                </div>

                {/* Socket status */}
                <div className={`nid-qr-bridge__status ${socketConnected ? 'nid-qr-bridge__status--live' : 'nid-qr-bridge__status--poll'}`}>
                    {socketConnected ? <Wifi size={13} /> : <Wifi size={13} />}
                    {socketConnected ? 'Live — waiting for your phone' : 'Polling for response…'}
                </div>

                {/* Steps */}
                <ol className="nid-qr-bridge__steps">
                    <li>
                        <span className="nid-qr-bridge__step-num">1</span>
                        <span>Open your phone's camera or QR scanner app</span>
                    </li>
                    <li>
                        <span className="nid-qr-bridge__step-num">2</span>
                        <span>Point it at the QR code above</span>
                    </li>
                    <li>
                        <span className="nid-qr-bridge__step-num">3</span>
                        <span>Scan your National ID front &amp; back</span>
                    </li>
                    <li>
                        <span className="nid-qr-bridge__step-num">4</span>
                        <span>Tap <strong>Accept</strong> to confirm your details</span>
                    </li>
                </ol>

                {/* Warning */}
                <div className="nid-qr-bridge__warning">
                    <Lock size={14} />
                    Do not close this window. Your verification will appear here automatically.
                </div>
            </div>

            <div className="nid-qr-bridge__footer">
                <button className="nid-qr-bridge__btn nid-qr-bridge__btn--ghost nid-qr-bridge__btn--sm" onClick={onCancel}>
                    Cancel
                </button>
                <button className="nid-qr-bridge__btn nid-qr-bridge__btn--secondary nid-qr-bridge__btn--sm" onClick={() => void initSession()}>
                    <RefreshCw size={13} /> Refresh QR
                </button>
            </div>
        </div>
    );
};

export default NidQrBridge;
