import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaTimes, FaCar, FaCheckCircle, FaImage, FaTools, FaUpload, FaTrash,
    FaMapMarkerAlt, FaUser, FaPhone, FaPlay, FaStop,
} from 'react-icons/fa';
import maintenanceService, {
    type MaintenanceRequest,
} from '../../../../../services/maintenance.service';
import socketService from '../../../../../services/socket.service';
import './ProviderJobModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    job: MaintenanceRequest | null;
    onUpdated: (updated: MaintenanceRequest) => void;
}

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ''));
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

const ProviderJobModal: React.FC<Props> = ({ isOpen, onClose, job, onUpdated }) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [completionNotes, setCompletionNotes] = useState('');
    const [completionImages, setCompletionImages] = useState<string[]>([]);
    const [sharingLocation, setSharingLocation] = useState(false);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setCompletionNotes('');
            setCompletionImages([]);
        }
    }, [isOpen]);

    function stopSharingLocation() {
        if (watchIdRef.current != null) {
            navigator.geolocation?.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setSharingLocation(false);
    }

    useEffect(() => {
        return () => stopSharingLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!isOpen || !job) return null;

    const tenantName = job.tenant ? `${job.tenant.firstName} ${job.tenant.lastName}`.trim() : 'Tenant';

    const callApi = async (label: string, fn: () => Promise<MaintenanceRequest>) => {
        try {
            setBusy(label);
            setError(null);
            const updated = await fn();
            onUpdated(updated);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Action failed.');
        } finally {
            setBusy(null);
        }
    };

    const startSharingLocation = () => {
        if (!('geolocation' in navigator)) {
            setError('Geolocation is not available in this browser.');
            return;
        }
        socketService.connect();
        socketService.joinMaintenanceRequest(job.id);
        setSharingLocation(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
                try {
                    await maintenanceService.updateLocation(job.id, {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracyM: pos.coords.accuracy,
                        heading: pos.coords.heading,
                        speed: pos.coords.speed,
                    });
                } catch {
                    /* swallow — keep sharing */
                }
            },
            () => {
                setError('Could not access your location. Please allow location.');
                stopSharingLocation();
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10_000 }
        );
    };

    const onImagesPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const next: string[] = [];
        for (const f of files) {
            if (f.size > 5 * 1024 * 1024) {
                setError(`"${f.name}" is larger than 5 MB.`);
                continue;
            }
            next.push(await fileToBase64(f));
        }
        setCompletionImages((prev) => [...prev, ...next]);
    };

    const removeImage = (i: number) =>
        setCompletionImages((prev) => prev.filter((_, idx) => idx !== i));

    const submitComplete = async () => {
        if (completionImages.length === 0) {
            setError('Please upload at least one photo of the resolved issue before completing.');
            return;
        }
        await callApi('complete', () =>
            maintenanceService.markComplete(job.id, {
                completionImages,
                completionNotes: completionNotes.trim() || null,
            })
        );
        stopSharingLocation();
    };

    return (
        <div className="pjm-overlay" onClick={onClose}>
            <div className="pjm-modal" onClick={(e) => e.stopPropagation()}>
                <header className="pjm-header">
                    <div>
                        <span className="pjm-tag">{t('myProperties.maintenanceTypes.' + job.category, job.category)} · {job.urgency}</span>
                        <h2>{job.title}</h2>
                        <p>{job.description}</p>
                    </div>
                    <button className="pjm-close" onClick={onClose}><FaTimes /></button>
                </header>

                {error && <div className="pjm-error">{error}</div>}

                <div className="pjm-body">
                    <div className="pjm-info-grid">
                        <div className="pjm-info-card">
                            <span className="pjm-info-label"><FaUser /> Tenant</span>
                            <strong>{tenantName}</strong>
                            {job.tenant?.phone && (
                                <a href={`tel:${job.tenant.phone}`} className="pjm-link"><FaPhone /> {job.tenant.phone}</a>
                            )}
                        </div>
                        <div className="pjm-info-card">
                            <span className="pjm-info-label"><FaMapMarkerAlt /> Property</span>
                            <strong>{job.property?.title ?? '—'}</strong>
                            <small>{job.property?.address ?? ''}</small>
                        </div>
                        <div className="pjm-info-card">
                            <span className="pjm-info-label">Agreed price</span>
                            <strong>EGP {Number(job.agreedPrice ?? 0).toFixed(2)}</strong>
                            <small>Released to you after tenant confirms</small>
                        </div>
                        <div className="pjm-info-card">
                            <span className="pjm-info-label">Status</span>
                            <strong>{job.status.replace('_', ' ')}</strong>
                        </div>
                    </div>

                    {job.images.length > 0 && (
                        <section>
                            <h4><FaImage /> Issue photos from tenant</h4>
                            <div className="pjm-thumbs">
                                {job.images.map((u, i) => (
                                    <a key={i} href={u} target="_blank" rel="noreferrer">
                                        <img src={u} alt={`Issue ${i + 1}`} />
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ─── Lifecycle actions ────────────────────────────── */}
                    <section className="pjm-actions-row">
                        {job.status === 'ASSIGNED' && (
                            <button
                                className="pjm-btn pjm-btn-primary"
                                disabled={!!busy}
                                onClick={() => callApi('en-route', () => maintenanceService.setEnRoute(job.id))}
                            >
                                <FaCar /> {busy === 'en-route' ? 'Marking…' : 'I\'m on my way'}
                            </button>
                        )}
                        {job.status === 'EN_ROUTE' && (
                            <>
                                {!sharingLocation ? (
                                    <button className="pjm-btn pjm-btn-primary" onClick={startSharingLocation}>
                                        <FaPlay /> Start sharing live location
                                    </button>
                                ) : (
                                    <button className="pjm-btn pjm-btn-secondary" onClick={stopSharingLocation}>
                                        <FaStop /> Stop sharing location
                                    </button>
                                )}
                                <button
                                    className="pjm-btn pjm-btn-success"
                                    disabled={!!busy}
                                    onClick={() => callApi('arrived', () => maintenanceService.setArrived(job.id))}
                                >
                                    <FaCheckCircle /> {busy === 'arrived' ? 'Marking…' : 'I\'ve arrived & started working'}
                                </button>
                            </>
                        )}
                    </section>

                    {(job.status === 'IN_PROGRESS' || job.status === 'EN_ROUTE') && (
                        <section className="pjm-complete-section">
                            <h4><FaTools /> Complete this job</h4>
                            <p>Upload photos of the resolved issue and add an optional note. The tenant will be forced to confirm whether the issue was solved.</p>

                            <div className="pjm-upload-area" onClick={() => document.getElementById(`pjm-upload-${job.id}`)?.click()}>
                                <input id={`pjm-upload-${job.id}`} type="file" multiple accept="image/*" hidden onChange={onImagesPicked} />
                                <FaUpload />
                                <span>Tap to upload completion photos</span>
                                <small>PNG / JPG up to 5 MB each</small>
                            </div>

                            {completionImages.length > 0 && (
                                <div className="pjm-thumbs">
                                    {completionImages.map((u, i) => (
                                        <div key={i} className="pjm-thumb-wrap">
                                            <img src={u} alt={`Complete ${i + 1}`} />
                                            <button className="pjm-remove-img" onClick={() => removeImage(i)}><FaTrash /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <textarea
                                rows={3}
                                placeholder="Brief description of work done (optional)…"
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                            />

                            <button
                                className="pjm-btn pjm-btn-success"
                                disabled={busy === 'complete'}
                                onClick={submitComplete}
                            >
                                <FaCheckCircle /> {busy === 'complete' ? 'Submitting…' : 'Mark job as complete'}
                            </button>
                        </section>
                    )}

                    {job.status === 'AWAITING_CONFIRMATION' && (
                        <section className="pjm-info-banner">
                            <FaCheckCircle />
                            <div>
                                <strong>Awaiting tenant confirmation</strong>
                                <p>The tenant will be forced to confirm whether the issue was solved. Once they confirm, your payment is released automatically.</p>
                            </div>
                        </section>
                    )}

                    {job.status === 'DISPUTED' && (
                        <section className="pjm-info-banner pjm-info-warning">
                            <FaTimes />
                            <div>
                                <strong>Tenant has disputed this job</strong>
                                <p>The HOMi admin team will review the case and decide on the payment.</p>
                            </div>
                        </section>
                    )}

                    {job.status === 'COMPLETED' && (
                        <section className="pjm-info-banner pjm-info-success">
                            <FaCheckCircle />
                            <div>
                                <strong>Job complete & paid</strong>
                                <p>EGP {Number(job.agreedPrice ?? 0).toFixed(2)} has been released to your wallet.</p>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderJobModal;
