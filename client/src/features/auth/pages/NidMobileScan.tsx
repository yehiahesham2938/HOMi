// client/src/features/auth/pages/NidMobileScan.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen page opened on the mobile phone after scanning the QR code.
// Route: /nid-scan/:token  (public, no auth required)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    CheckCircle2, MonitorCheck, Smartphone, IdCard, User,
    ArrowRight, Shield,
} from 'lucide-react';
import NidScanner from '../components/NidScanner';
import apiClient from '../../../config/api';
import './NidMobileScan.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type PagePhase = 'intro' | 'scanning' | 'confirm' | 'done' | 'error';

// ─── Masking helper ───────────────────────────────────────────────────────────

function maskNid(id: string): string {
    if (id.length <= 4) return id;
    return id.slice(0, 2) + '•'.repeat(id.length - 4) + id.slice(-2);
}

// ─── Component ───────────────────────────────────────────────────────────────

const NidMobileScan: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [phase, setPhase] = useState<PagePhase>('intro');
    const [scanResult, setScanResult] = useState<{ nationalId: string; fullNameArabic: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Scan success callback ─────────────────────────────────────────────────

    const handleScanSuccess = useCallback((nationalId: string, fullNameArabic: string) => {
        setScanResult({ nationalId, fullNameArabic });
        setPhase('confirm');
    }, []);

    const handleScanCancel = useCallback(() => {
        setPhase('intro');
    }, []);

    // ── Confirm & submit ──────────────────────────────────────────────────────

    const handleAccept = useCallback(async () => {
        if (!scanResult || !token) return;
        setSubmitting(true);
        try {
            await apiClient.post(`/auth/nid-session/${token}/complete`, {
                nationalId: scanResult.nationalId,
                fullNameArabic: scanResult.fullNameArabic,
            });
            setPhase('done');
        } catch (err: any) {
            const msg: string =
                err?.response?.data?.message ?? 'Failed to send your ID. Please try again.';
            setErrorMsg(msg);
            setPhase('error');
        } finally {
            setSubmitting(false);
        }
    }, [scanResult, token]);

    const handleRetry = useCallback(() => {
        setPhase('intro');
        setScanResult(null);
        setErrorMsg('');
    }, []);

    // ── Invalid token guard ───────────────────────────────────────────────────

    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
        return (
            <div className="nid-mobile-scan">
                <div className="nid-mobile-scan__card nid-mobile-scan__card--error">
                    <Shield size={48} />
                    <h2>Invalid Link</h2>
                    <p>This QR code link is invalid or has expired. Please go back to your desktop and try again.</p>
                </div>
            </div>
        );
    }

    // ── Intro ─────────────────────────────────────────────────────────────────

    if (phase === 'intro') {
        return (
            <div className="nid-mobile-scan">
                <div className="nid-mobile-scan__hero">
                    <div className="nid-mobile-scan__hero-icon">
                        <IdCard size={48} />
                    </div>
                    <h1>Verify Your National ID</h1>
                    <p>Scan the front and back of your Egyptian National ID using your phone's camera.</p>
                </div>

                <div className="nid-mobile-scan__steps-card">
                    <ul className="nid-mobile-scan__step-list">
                        <li>
                            <span className="nid-mobile-scan__step-num">1</span>
                            <div>
                                <strong>Grant camera access</strong>
                                <p>Allow HOMI to use your phone's camera</p>
                            </div>
                        </li>
                        <li>
                            <span className="nid-mobile-scan__step-num">2</span>
                            <div>
                                <strong>Scan front of your ID</strong>
                                <p>Hold the front side of your National ID clearly in frame</p>
                            </div>
                        </li>
                        <li>
                            <span className="nid-mobile-scan__step-num">3</span>
                            <div>
                                <strong>Scan the back</strong>
                                <p>Flip your ID and hold the back side in frame</p>
                            </div>
                        </li>
                        <li>
                            <span className="nid-mobile-scan__step-num">4</span>
                            <div>
                                <strong>Confirm your details</strong>
                                <p>Review and accept your name and ID number</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="nid-mobile-scan__security">
                    <Shield size={14} /> Your data is encrypted and sent directly to HOMI's secure servers.
                </div>

                <button
                    id="nid-mobile-scan-start-btn"
                    className="nid-mobile-scan__btn nid-mobile-scan__btn--primary"
                    onClick={() => setPhase('scanning')}
                >
                    Start Scanning <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    // ── Scanning ──────────────────────────────────────────────────────────────

    if (phase === 'scanning') {
        return (
            <div className="nid-mobile-scan nid-mobile-scan--scan-mode">
                <NidScanner
                    sessionToken={token}
                    onSuccess={handleScanSuccess}
                    onCancel={handleScanCancel}
                />
            </div>
        );
    }

    // ── Confirm ───────────────────────────────────────────────────────────────

    if (phase === 'confirm' && scanResult) {
        return (
            <div className="nid-mobile-scan">
                <div className="nid-mobile-scan__confirm-header">
                    <CheckCircle2 size={40} className="nid-mobile-scan__confirm-check" />
                    <h2>Review Your Details</h2>
                    <p>Please confirm this information before sending it to your desktop.</p>
                </div>

                <div className="nid-mobile-scan__confirm-card">
                    <div className="nid-mobile-scan__confirm-row">
                        <div className="nid-mobile-scan__confirm-label">
                            <User size={15} /> Full Name (Arabic)
                        </div>
                        <div className="nid-mobile-scan__confirm-value nid-mobile-scan__confirm-value--rtl">
                            {scanResult.fullNameArabic}
                        </div>
                    </div>
                    <div className="nid-mobile-scan__confirm-row">
                        <div className="nid-mobile-scan__confirm-label">
                            <IdCard size={15} /> National ID
                        </div>
                        <div className="nid-mobile-scan__confirm-value">
                            {maskNid(scanResult.nationalId)}
                        </div>
                    </div>
                </div>

                <div className="nid-mobile-scan__confirm-actions">
                    <button
                        id="nid-mobile-scan-retry-btn"
                        className="nid-mobile-scan__btn nid-mobile-scan__btn--ghost"
                        onClick={() => setPhase('scanning')}
                        disabled={submitting}
                    >
                        Retake
                    </button>
                    <button
                        id="nid-mobile-scan-accept-btn"
                        className="nid-mobile-scan__btn nid-mobile-scan__btn--primary"
                        onClick={() => void handleAccept()}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <><span className="nid-mobile-scan__btn-spinner" /> Sending…</>
                        ) : (
                            <>Accept &amp; Send <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ── Done ──────────────────────────────────────────────────────────────────

    if (phase === 'done') {
        return (
            <div className="nid-mobile-scan">
                <div className="nid-mobile-scan__done">
                    <div className="nid-mobile-scan__done-icon">
                        <MonitorCheck size={64} />
                    </div>
                    <h2>All Done!</h2>
                    <p>
                        Your National ID has been verified successfully.
                    </p>
                    <div className="nid-mobile-scan__done-hint">
                        <Smartphone size={16} />
                        You can now return to your desktop or laptop to continue setting up your profile.
                    </div>
                </div>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────

    return (
        <div className="nid-mobile-scan">
            <div className="nid-mobile-scan__card nid-mobile-scan__card--error">
                <Shield size={40} />
                <h2>Something went wrong</h2>
                <p>{errorMsg || 'An unexpected error occurred.'}</p>
                <button
                    className="nid-mobile-scan__btn nid-mobile-scan__btn--primary"
                    onClick={handleRetry}
                >
                    Try Again
                </button>
            </div>
        </div>
    );
};

export default NidMobileScan;
