import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaTimes, FaMapMarkerAlt, FaUser, FaTag, FaClock,
    FaDollarSign, FaImage, FaCheckCircle, FaArrowRight, FaInfoCircle, FaListAlt
} from 'react-icons/fa';
import maintenanceService, {
    type MaintenanceRequest,
} from '../../../../../services/maintenance.service';
import './AvailableJobModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    job: MaintenanceRequest | null;
    onApplied: (updatedJob: MaintenanceRequest) => void;
}

const ApplyJobModal: React.FC<Props> = ({ isOpen, onClose, job, onApplied }) => {
    const { t } = useTranslation();
    const [finalPrice, setFinalPrice] = useState('');
    const [priceBreakdown, setPriceBreakdown] = useState('');
    const [coverNote, setCoverNote] = useState('');
    const [etaHours, setEtaHours] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setFinalPrice('');
            setPriceBreakdown('');
            setCoverNote('');
            setEtaHours('');
            setError(null);
            setShowSuccess(false);
            setSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen || !job) return null;

    const handleApply = async () => {
        if (!finalPrice || Number(finalPrice) <= 0) {
            setError('Please enter your final price (including all parts and labour).');
            return;
        }
        try {
            setSubmitting(true);
            setError(null);
            await maintenanceService.applyToRequest(job.id, {
                finalPrice: Number(finalPrice),
                priceBreakdown: priceBreakdown.trim() || null,
                coverNote: coverNote.trim() || null,
                etaHours: etaHours ? Number(etaHours) : null,
            });
            const refreshed = await maintenanceService.getRequest(job.id).catch(() => job);
            onApplied(refreshed);
            setShowSuccess(true);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Could not submit your application.');
        } finally {
            setSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="market-modal-overlay" onClick={onClose}>
                <div className="market-modal-container success-mode" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-success-state">
                        <div className="success-icon-circle"><FaCheckCircle /></div>
                        <h2>Application sent!</h2>
                        <p>The tenant has been notified. They'll choose between providers and approve one.</p>
                        <button className="modal-success-close-btn" onClick={onClose}>Back to marketplace</button>
                    </div>
                </div>
            </div>
        );
    }

    const tenantName = job.tenant ? `${job.tenant.firstName} ${job.tenant.lastName}`.trim() : 'Tenant';
    const propertyLabel = job.property ? `${job.property.title} — ${job.property.address}` : '—';

    return (
        <div className="market-modal-overlay" onClick={onClose}>
            <div className="market-modal-container" onClick={(e) => e.stopPropagation()}>
                <header className="market-modal-header">
                    <div className="modal-header-left">
                        <div className={`modal-urgency-badge ${job.urgency.toLowerCase()}`}>{job.urgency} priority</div>
                        <h2>Apply for this job</h2>
                    </div>
                    <button className="modal-exit-btn" onClick={onClose} aria-label="Close window">
                        <FaTimes />
                    </button>
                </header>

                <div className="market-modal-scroll-area">
                    <div className="modal-grid-layout">
                        <div className="modal-info-column">
                            <section className="modal-info-block">
                                <label className="modal-block-label"><FaTag /> Category</label>
                                <h3 className="modal-job-type">{t('myProperties.maintenanceTypes.' + job.category, job.category)} — {job.title}</h3>
                            </section>

                            <section className="modal-info-block">
                                <label className="modal-block-label"><FaClock /> Job summary</label>
                                <p className="modal-job-description">{job.description}</p>
                            </section>

                            <div className="modal-data-row">
                                <div className="data-cell">
                                    <label><FaUser /> Posted by</label>
                                    <p>{tenantName}</p>
                                </div>
                                <div className="data-cell">
                                    <label><FaMapMarkerAlt /> Property</label>
                                    <p>{propertyLabel}</p>
                                </div>
                                <div className="data-cell">
                                    <label><FaClock /> Published</label>
                                    <p>{new Date(job.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="data-cell">
                                    <label><FaDollarSign /> Tenant budget</label>
                                    <p>{job.estimatedBudget ? `EGP ${Number(job.estimatedBudget).toFixed(2)}` : 'Not specified'}</p>
                                </div>
                            </div>

                            {job.images.length > 0 && (
                                <section className="modal-info-block photos-block">
                                    <label className="modal-block-label"><FaImage /> Issue photos</label>
                                    <div className="modal-photo-gallery">
                                        {job.images.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="gallery-thumb">
                                                <img src={url} alt={`Evidence ${i + 1}`} />
                                                <div className="thumb-overlay">View Full</div>
                                            </a>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="modal-side-column">
                            <div className="reward-summary-card">
                                <label>Your final price (incl. parts, labour, transport)</label>
                                <div className="reward-value" style={{ alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '1rem', color: '#94a3b8' }}>EGP</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={finalPrice}
                                        onChange={(e) => setFinalPrice(e.target.value)}
                                        placeholder="0.00"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: '#fff',
                                            fontSize: '2rem',
                                            fontWeight: 800,
                                            width: '100%',
                                        }}
                                    />
                                </div>
                                <div className="reward-divider" />
                                <p className="reward-disclaimer">This is the total amount the tenant will be charged from their HOMi wallet.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}><FaListAlt style={{ marginRight: 4 }} /> Price breakdown (optional)</label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Labour 400, replacement tap 250, sealant 50…"
                                    value={priceBreakdown}
                                    onChange={(e) => setPriceBreakdown(e.target.value)}
                                    style={{ padding: '0.6rem 0.8rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', resize: 'vertical' }}
                                />

                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Cover note (optional)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Tell the tenant why you're a great fit…"
                                    value={coverNote}
                                    onChange={(e) => setCoverNote(e.target.value)}
                                    style={{ padding: '0.6rem 0.8rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', resize: 'vertical' }}
                                />

                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>ETA in hours (optional)</label>
                                <input
                                    type="number"
                                    min={1}
                                    placeholder="e.g. 2"
                                    value={etaHours}
                                    onChange={(e) => setEtaHours(e.target.value)}
                                    style={{ padding: '0.6rem 0.8rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                />
                            </div>

                            {error && (
                                <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.6rem 0.8rem', borderRadius: 10, fontSize: '0.85rem' }}>
                                    {error}
                                </div>
                            )}

                            <div className="application-policy-box">
                                <FaInfoCircle className="policy-icon" />
                                <div className="policy-text">
                                    <h4>Escrow protection</h4>
                                    <p>If the tenant accepts, the price is held in escrow and released to you only after they confirm the work is done.</p>
                                </div>
                            </div>

                            <div className="modal-side-actions">
                                <button className="modal-btn-apply" disabled={submitting || !!job.alreadyApplied} onClick={handleApply}>
                                    {job.alreadyApplied ? 'Already applied' : submitting ? 'Submitting…' : (
                                        <>Submit application <FaArrowRight /></>
                                    )}
                                </button>
                                <button className="modal-btn-close" onClick={onClose}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyJobModal;
