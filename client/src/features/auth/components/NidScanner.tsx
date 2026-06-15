import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Camera, Zap, ZapOff, RotateCcw, CheckCircle2, XCircle,
    AlertTriangle, ArrowRight, Upload, IdCard, Shield,
    FileCheck,
} from 'lucide-react';
import { authService } from '../../../services/auth.service';
import './NidScanner.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type ScannerPhase =
    | 'permission'
    | 'front'
    | 'flipping'
    | 'back'
    | 'processing'
    | 'result';

interface OcrResult {
    nationalId: string;
    fullNameArabic: string;
    expiryDate: string;
    expired: boolean;
    fraudDetected: boolean;
}

interface NidScannerProps {
    sessionToken?: string;
    onSuccess: (nationalId: string, fullNameArabic: string) => void;
    onCancel: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Capture the current video frame onto a canvas and return a compressed base64 JPEG.
 * We cap the output at 1200px wide to balance quality vs payload size.
 */
function captureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string {
    const srcW = video.videoWidth  || 1280;
    const srcH = video.videoHeight || 720;

    // Max 1400px wide (enough for Valify OCR, not too heavy for the API)
    const MAX_W = 1400;
    const scale = srcW > MAX_W ? MAX_W / srcW : 1;

    canvas.width  = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas context unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 0.88 quality keeps the file small (~150-300 KB) while staying clear enough for OCR
    return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
}

function isExpired(raw: string): boolean {
    if (!raw) return false;
    // "DD/MM/YYYY"
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const d = m
        ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
        : new Date(raw);
    return !isNaN(d.getTime()) && d < new Date();
}

function maskNid(nid: string): string {
    if (nid.length !== 14) return nid;
    return nid.slice(0, 2) + '**********' + nid.slice(12);
}

// ─── Component ──────────────────────────────────────────────────────────────

const NidScanner: React.FC<NidScannerProps> = ({ sessionToken, onSuccess, onCancel }) => {
    const [phase, setPhase]                   = useState<ScannerPhase>('permission');
    const [error, setError]                   = useState<string | null>(null);
    const [flashOn, setFlashOn]               = useState(false);
    const [frontImg, setFrontImg]             = useState<string | null>(null);
    const [ocrResult, setOcrResult]           = useState<OcrResult | null>(null);
    const [processingStep, setProcessingStep] = useState(0);
    const [flipDone, setFlipDone]             = useState(false);

    const videoRef    = useRef<HTMLVideoElement>(null);
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const streamRef   = useRef<MediaStream | null>(null);

    // ── Camera ──────────────────────────────────────────────────────────────

    const startCamera = useCallback(async () => {
        // Stop any existing stream first
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width:  { ideal: 1920, min: 640 },
                    height: { ideal: 1080, min: 480 },
                    frameRate: { ideal: 30, min: 15 },
                },
                audio: false,
            });
            streamRef.current = stream;

            const vid = videoRef.current;
            if (vid) {
                vid.srcObject = stream;
                // Ensure playback starts — important on iOS / some Androids
                vid.onloadedmetadata = () => {
                    void vid.play().catch(() => {/* silently ignore if already playing */});
                };
                // Also try immediately in case metadata already loaded
                void vid.play().catch(() => {});
            }
            setError(null);
        } catch (err) {
            console.error('Camera error:', err);
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError('Camera access denied. Please allow camera access in your browser settings.');
            } else {
                setError('Could not start camera. Please ensure no other app is using it.');
            }
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // Start camera when entering front/back phase
    useEffect(() => {
        if (phase === 'front' || phase === 'back') {
            void startCamera();
        }
        return () => {
            if (phase !== 'front' && phase !== 'back') {
                stopCamera();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // Cleanup on unmount
    useEffect(() => () => stopCamera(), [stopCamera]);

    // ── Flash ────────────────────────────────────────────────────────────────

    const toggleFlash = async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            const newOn = !flashOn;
            try {
                await track.applyConstraints({ advanced: [{ torch: newOn }] } as any);
            } catch (e1) {
                await track.applyConstraints({ torch: newOn } as any);
            }
            setFlashOn(newOn);
        } catch (err) {
            console.error('Torch unsupported:', err);
            alert('Flash is not supported on your device or browser.');
        }
    };

    // ── Capture ──────────────────────────────────────────────────────────────

    const doCapture = useCallback(() => {
        const vid = videoRef.current;
        const cvs = canvasRef.current;
        if (!vid || !cvs || vid.readyState < 2) return;
        try {
            const b64 = captureFrame(vid, cvs);
            if (phase === 'front') {
                setFrontImg(b64);
                stopCamera();
                setFlipDone(false);
                setPhase('flipping');
                // flip card animation: 900ms flip → short pause → open back camera
                setTimeout(() => {
                    setFlipDone(true);
                    setTimeout(() => setPhase('back'), 500);
                }, 900);
            } else if (phase === 'back') {
                stopCamera();
                void runOcr(frontImg!, b64);
            }
        } catch (e) {
            setError('Could not capture image. Try again.');
        }
    }, [phase, frontImg, stopCamera]);

    // ── OCR ───────────────────────────────────────────────────────────────────

    const runOcr = async (front: string, back: string) => {
        setPhase('processing');
        setProcessingStep(0);
        setError(null);

        const t1 = setTimeout(() => setProcessingStep(1), 1500);
        const t2 = setTimeout(() => setProcessingStep(2), 3500);

        try {
            const data = sessionToken
                ? await authService.nidSessionOcr(sessionToken, front, back)
                : await authService.nidOcr(front, back);

            clearTimeout(t1);
            clearTimeout(t2);
            setProcessingStep(2);

            const nid     = (data.result?.front_nid || data.result?.back_nid || '').replace(/\D/g, '');
            const firstName = data.result?.first_name || '';
            const lastNameRest = data.result?.full_name || '';
            const name    = `${firstName} ${lastNameRest}`.trim() || '';
            const expiry  = data.result?.expiry_date || '';
            const expired = data.document_verification_plus?.expired ?? isExpired(expiry);
            const fraud   = data.advanced_confidence?.is_face_fraud_detected ?? false;

            setOcrResult({ nationalId: nid, fullNameArabic: name, expiryDate: expiry, expired, fraudDetected: fraud });
            setPhase('result');
        } catch (err: unknown) {
            clearTimeout(t1);
            clearTimeout(t2);
            console.error('NID OCR error:', err);

            // Try to extract a meaningful message from the server response
            let msg = 'Could not verify the ID. Please try again in better lighting.';
            if (err && typeof err === 'object' && 'response' in err) {
                const axErr = err as { response?: { data?: { message?: string; detail?: unknown } } };
                const serverMsg = axErr.response?.data?.message;
                if (serverMsg) msg = serverMsg;
            }
            setError(msg);
            setOcrResult(null);
            setPhase('result');
        }
    };

    // ── Recapture ─────────────────────────────────────────────────────────────

    const handleRecapture = () => {
        setFrontImg(null);
        setOcrResult(null);
        setError(null);
        setFlashOn(false);
        setFlipDone(false);
        setPhase('front');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    const progressPills = (
        <div className="nid-progress">
            <span className={`nid-pill ${phase === 'front'
                ? 'nid-pill--active'
                : (frontImg ? 'nid-pill--done' : 'nid-pill--inactive')}`}>
                {frontImg ? <CheckCircle2 size={13} /> : <IdCard size={13} />}
                Front
            </span>
            <span className="nid-pill-divider" />
            <span className={`nid-pill ${phase === 'flipping' || phase === 'back'
                ? 'nid-pill--active'
                : (phase === 'processing' || phase === 'result' ? 'nid-pill--done' : 'nid-pill--inactive')}`}>
                {phase === 'processing' || phase === 'result' ? <CheckCircle2 size={13} /> : <RotateCcw size={13} />}
                Back
            </span>
            <span className="nid-pill-divider" />
            <span className={`nid-pill ${phase === 'processing'
                ? 'nid-pill--active'
                : (phase === 'result' && !error ? 'nid-pill--done' : 'nid-pill--inactive')}`}>
                {phase === 'result' && !error ? <CheckCircle2 size={13} /> : <Shield size={13} />}
                Verify
            </span>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // PHASES
    // ─────────────────────────────────────────────────────────────────────────

    // ── PERMISSION ────────────────────────────────────────────────────────────
    if (phase === 'permission') {
        return (
            <div className="nid-overlay">
                <div className="nid-perm-card">
                    <div className="nid-perm-icon">
                        <Camera size={40} strokeWidth={1.5} />
                    </div>
                    <h2 className="nid-perm-title">Scan Your National ID</h2>
                    <p className="nid-perm-body">
                        We need to capture both sides of your Egyptian National ID. Your images are securely processed and only the ID number is saved to your account.
                    </p>
                    <ul className="nid-perm-features">
                        <li className="nid-perm-feature"><span className="nid-perm-feature-dot" />Camera used only for ID capture</li>
                        <li className="nid-perm-feature"><span className="nid-perm-feature-dot" />OCR processed securely by Valify</li>
                        <li className="nid-perm-feature"><span className="nid-perm-feature-dot" />Only your ID number is stored</li>
                    </ul>
                    {error && <div className="nid-error-inline">{error}</div>}
                    <button className="nid-btn-primary" onClick={() => { setError(null); setPhase('front'); }}>
                        <Camera size={18} /> Allow Camera &amp; Start
                    </button>
                    <button className="nid-btn-secondary" onClick={onCancel}>Cancel</button>
                </div>
            </div>
        );
    }

    // ── FLIP ANIMATION ────────────────────────────────────────────────────────
    if (phase === 'flipping') {
        return (
            <div className="nid-overlay">
                <div className="nid-card">
                    <div className="nid-header">
                        <div className="nid-logo-row">
                            <div className="nid-logo-icon"><IdCard size={20} /></div>
                            <h1 className="nid-title">Front Captured ✓</h1>
                        </div>
                        <p className="nid-subtitle">Now flip your ID card to show the back</p>
                    </div>
                    {progressPills}
                    <div className="nid-flip-scene">
                        <div className={`nid-flip-card ${flipDone ? 'nid-flip-card--flipped' : ''}`}>
                            <div className="nid-flip-face">
                                <img src={`data:image/jpeg;base64,${frontImg}`} alt="Front of ID" />
                            </div>
                            <div className="nid-flip-face nid-flip-face--back nid-flip-face--placeholder">
                                <Camera size={48} color="rgba(37,99,235,0.4)" strokeWidth={1.5} />
                                <p className="nid-flip-placeholder-text">Flip your ID to show the back side, then tap Capture</p>
                            </div>
                        </div>
                    </div>
                    <div className="nid-instruction">
                        <div className="nid-instruction-label">🔄 Step 2 of 2 — Back Side</div>
                        <div className="nid-instruction-text">
                            Physically flip your ID card over. The back side has the machine-readable zone at the bottom.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PROCESSING ────────────────────────────────────────────────────────────
    if (phase === 'processing') {
        const steps = [
            'Connecting to verification service…',
            'Extracting ID information…',
            'Validating document security…',
        ];
        return (
            <div className="nid-overlay">
                <div className="nid-card">
                    <div className="nid-processing">
                        <div className="nid-spinner-wrap">
                            <div className="nid-spinner-ring nid-spinner-ring--outer" />
                            <div className="nid-spinner-ring nid-spinner-ring--inner" />
                            <div className="nid-spinner-icon"><Shield size={24} strokeWidth={1.5} /></div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p className="nid-processing-title">Verifying Your ID</p>
                            <p className="nid-processing-sub">This takes 5–20 seconds</p>
                        </div>
                        <ul className="nid-steps-list">
                            {steps.map((s, i) => (
                                <li key={i} className={`nid-step-item ${
                                    i < processingStep ? 'nid-step-item--done' :
                                    i === processingStep ? 'nid-step-item--active' : ''}`}>
                                    <span className="nid-step-dot" />{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // ── RESULT ────────────────────────────────────────────────────────────────
    if (phase === 'result') {
        if (error || !ocrResult) {
            return (
                <div className="nid-overlay">
                    <div className="nid-result-popup">
                        <div className="nid-result-icon nid-result-icon--error"><XCircle size={40} /></div>
                        <h2 className="nid-result-title">Scan Failed</h2>
                        <p className="nid-result-body">{error || 'Unknown error. Please try again.'}</p>
                        <div className="nid-result-actions">
                            <button className="nid-btn-primary" onClick={handleRecapture}><RotateCcw size={18} /> Try Again</button>
                            <button className="nid-btn-secondary" onClick={onCancel}>Cancel</button>
                        </div>
                    </div>
                </div>
            );
        }
        if (ocrResult.nationalId.length !== 14) {
            return (
                <div className="nid-overlay">
                    <div className="nid-result-popup">
                        <div className="nid-result-icon nid-result-icon--warn"><AlertTriangle size={40} /></div>
                        <h2 className="nid-result-title">ID Not Read Clearly</h2>
                        <p className="nid-result-body">We couldn't read a valid 14-digit ID. Please try again with better lighting and ensure all corners are visible.</p>
                        <div className="nid-result-actions">
                            <button className="nid-btn-primary" onClick={handleRecapture}><RotateCcw size={18} /> Recapture</button>
                            <button className="nid-btn-secondary" onClick={onCancel}>Cancel</button>
                        </div>
                    </div>
                </div>
            );
        }
        if (ocrResult.expired) {
            return (
                <div className="nid-overlay">
                    <div className="nid-result-popup">
                        <div className="nid-result-icon nid-result-icon--error"><XCircle size={40} /></div>
                        <h2 className="nid-result-title">ID Has Expired</h2>
                        <p className="nid-result-body">Your National ID expired on <strong>{ocrResult.expiryDate}</strong>. Please renew it before continuing.</p>
                        <div className="nid-result-actions">
                            <button className="nid-btn-primary" onClick={handleRecapture}><RotateCcw size={18} /> Scan Different ID</button>
                            <button className="nid-btn-secondary" onClick={onCancel}>Cancel</button>
                        </div>
                    </div>
                </div>
            );
        }
        if (ocrResult.fraudDetected) {
            return (
                <div className="nid-overlay">
                    <div className="nid-result-popup">
                        <div className="nid-result-icon nid-result-icon--error"><AlertTriangle size={40} /></div>
                        <h2 className="nid-result-title">Document Issue Detected</h2>
                        <p className="nid-result-body">Our system flagged a potential issue with this document. Please scan the original physical ID in good lighting.</p>
                        <div className="nid-result-actions">
                            <button className="nid-btn-primary" onClick={handleRecapture}><RotateCcw size={18} /> Try Again</button>
                            <button className="nid-btn-secondary" onClick={onCancel}>Cancel</button>
                        </div>
                    </div>
                </div>
            );
        }
        // ✅ SUCCESS
        return (
            <div className="nid-overlay">
                <div className="nid-result-popup">
                    <div className="nid-result-icon nid-result-icon--success"><CheckCircle2 size={44} /></div>
                    <h2 className="nid-result-title">ID Verified Successfully</h2>
                    <p className="nid-result-body">Your Egyptian National ID has been validated. Review the information below.</p>
                    <div className="nid-data-card">
                        {ocrResult.fullNameArabic && (
                            <>
                                <div className="nid-data-row">
                                    <span className="nid-data-label">Full Name (Arabic)</span>
                                    <span className="nid-data-value nid-data-value--arabic">{ocrResult.fullNameArabic}</span>
                                </div>
                                <div className="nid-data-divider" />
                            </>
                        )}
                        <div className="nid-data-row">
                            <span className="nid-data-label">National ID</span>
                            <span className="nid-data-value nid-data-value--mono">{maskNid(ocrResult.nationalId)}</span>
                        </div>
                        <div className="nid-data-divider" />
                        <div className="nid-data-row">
                            <span className="nid-data-label">Expiry</span>
                            <span className="nid-data-value">{ocrResult.expiryDate || '—'}</span>
                        </div>
                        <div className="nid-data-divider" />
                        <div className="nid-data-row">
                            <span className="nid-data-label">Status</span>
                            <span className="nid-badge nid-badge--green"><FileCheck size={11} /> Valid</span>
                        </div>
                    </div>
                    <div className="nid-result-actions">
                        <button className="nid-btn-primary" onClick={() => onSuccess(ocrResult.nationalId, ocrResult.fullNameArabic)}>
                            Continue <ArrowRight size={18} />
                        </button>
                        <button className="nid-btn-secondary" onClick={handleRecapture}><RotateCcw size={16} /> Rescan</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── FRONT / BACK (live camera) ────────────────────────────────────────────
    const isFront = phase === 'front';
    return (
        <div className="nid-overlay">
            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="nid-capture-canvas" aria-hidden />

            <div className="nid-card">
                <div className="nid-header">
                    <div className="nid-logo-row">
                        <div className="nid-logo-icon"><IdCard size={20} /></div>
                        <h1 className="nid-title">National ID Scan</h1>
                    </div>
                    <p className="nid-subtitle">
                        {isFront
                            ? 'Hold the FRONT of your ID flat inside the frame'
                            : 'Now show the BACK of your ID inside the frame'}
                    </p>
                </div>

                {progressPills}

                {/* Camera frame */}
                <div className="nid-frame-wrap">
                    <video
                        ref={videoRef}
                        className="nid-video"
                        autoPlay
                        playsInline
                        muted
                        disablePictureInPicture
                        style={{ pointerEvents: 'none' }}
                    />

                    {/* Corner brackets */}
                    <span className="nid-corner nid-corner--tl" />
                    <span className="nid-corner nid-corner--tr" />
                    <span className="nid-corner nid-corner--bl" />
                    <span className="nid-corner nid-corner--br" />

                    {/* Scan line — only when no error */}
                    {!error && <div className="nid-scanline" aria-hidden />}

                    {/* Flash toggle */}
                    <button
                        className={`nid-flash-btn ${flashOn ? 'nid-flash-btn--on' : ''}`}
                        onClick={() => void toggleFlash()}
                        title={flashOn ? 'Turn flash off' : 'Turn flash on'}
                        aria-label={flashOn ? 'Turn flash off' : 'Turn flash on'}
                    >
                        {flashOn ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
                    </button>

                    {/* Camera error overlay */}
                    {error && (
                        <div className="nid-permission-inner">
                            <div className="nid-permission-icon-wrap">
                                <Camera size={36} color="rgba(37,99,235,0.7)" strokeWidth={1.5} />
                            </div>
                            <p className="nid-permission-title">Camera Unavailable</p>
                            <p className="nid-permission-text">{error}</p>
                            <button
                                className="nid-btn-primary"
                                style={{ marginTop: 8 }}
                                onClick={startCamera}
                            >
                                <RotateCcw size={16} /> Retry Camera
                            </button>
                        </div>
                    )}
                </div>

                {/* Instruction */}
                <div className="nid-instruction">
                    <div className="nid-instruction-label">
                        {isFront ? '📋 Step 1 of 2 — Front Side' : '🔄 Step 2 of 2 — Back Side'}
                    </div>
                    <div className="nid-instruction-text">
                        {isFront
                            ? 'Keep the ID flat and still. Ensure all 4 corners are visible and text is sharp before tapping Capture.'
                            : 'Make sure the barcode at the bottom is fully visible and the text is sharp.'}
                    </div>
                </div>

                {/* Actions */}
                <div className="nid-actions">
                    <button
                        className="nid-btn-capture"
                        onClick={doCapture}
                        disabled={!!error}
                        aria-label={`Capture ${isFront ? 'front' : 'back'} of ID`}
                    >
                        <span className="nid-btn-capture__inner" />
                    </button>
                    <span className="nid-capture-label">Tap to Capture</span>

                    {/* Upload link removed */}
                    <button className="nid-btn-secondary" style={{ marginTop: 4, maxWidth: 200 }} onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NidScanner;
