import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaTimes, FaTag, FaAlignLeft, FaDollarSign, FaImage,
    FaExclamationCircle, FaUpload, FaCheckCircle, FaTrash, FaWallet,
    FaHome, FaMapMarkerAlt
} from 'react-icons/fa';
import './DetailedIssueModal.css';
import { MAINTENANCE_CATEGORIES } from '../../constants/categories';
import maintenanceService, {
    type MaintenanceUrgency,
    type MaintenanceRequest,
    type TenantMaintenanceContext,
} from '../../../../services/maintenance.service';

interface DetailedIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPostSuccess: (createdRequest: MaintenanceRequest) => void;
    isViewOnly?: boolean;
    initialData?: MaintenanceRequest | null;
}

const CATEGORIES = [...MAINTENANCE_CATEGORIES];

const URGENCY_OPTIONS: { value: MaintenanceUrgency; label: string }[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' },
];

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ''));
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

const DetailedIssueModal: React.FC<DetailedIssueModalProps> = ({
    isOpen,
    onClose,
    onPostSuccess,
    isViewOnly = false,
    initialData = null
}) => {
    const { t } = useTranslation();
    const [category, setCategory] = useState<string>('plumbing');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');
    const [urgency, setUrgency] = useState<MaintenanceUrgency>('MEDIUM');
    const [imagesBase64, setImagesBase64] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedContractId, setSelectedContractId] = useState<string>('');

    const [context, setContext] = useState<TenantMaintenanceContext | null>(null);
    const [loadingContext, setLoadingContext] = useState(false);
    const activeRentals = context?.activeRentals;

    // Fetch tenant context (active property + wallet) when opening for posting
    useEffect(() => {
        if (!isOpen || isViewOnly) return;
        let cancelled = false;
        const load = async () => {
            try {
                setLoadingContext(true);
                setError(null);
                const ctx = await maintenanceService.getTenantContext();
                if (!cancelled) {
                    setContext(ctx);
                    setSelectedContractId(ctx.contractId);
                }
            } catch (err: any) {
                if (cancelled) return;
                const msg =
                    err?.response?.data?.code === 'NO_ACTIVE_RENTAL'
                        ? 'You need an active rental to post a maintenance issue.'
                        : err?.response?.data?.message ?? 'Could not load your active property.';
                setError(msg);
            } finally {
                if (!cancelled) setLoadingContext(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [isOpen, isViewOnly]);

    // Reset / load initial state when opening
    useEffect(() => {
        if (!isOpen) return;
        setShowSuccess(false);
        setError(null);
        setIsSubmitting(false);
        if (initialData && isViewOnly) {
            setCategory(initialData.category);
            setTitle(initialData.title);
            setDescription(initialData.description);
            setBudget(initialData.estimatedBudget != null ? String(initialData.estimatedBudget) : '');
            setUrgency(initialData.urgency);
            setImagesBase64(initialData.images ?? []);
        } else {
            setCategory('plumbing');
            setTitle('');
            setDescription('');
            setBudget('');
            setUrgency('MEDIUM');
            setImagesBase64([]);
            setSelectedContractId('');
        }
    }, [isOpen, isViewOnly, initialData]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        try {
            const next: string[] = [];
            for (const f of files) {
                if (f.size > 5 * 1024 * 1024) {
                    setError(`"${f.name}" is larger than 5 MB.`);
                    continue;
                }
                next.push(await fileToBase64(f));
            }
            setImagesBase64((prev) => [...prev, ...next]);
        } catch {
            setError('Failed to read one or more images.');
        }
    };

    const removeImage = (index: number) => {
        setImagesBase64((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) {
            setError('Title is required');
            return;
        }
        if (!description.trim()) {
            setError('Description is required');
            return;
        }
        try {
            setIsSubmitting(true);
            const selectedRental = context?.activeRentals?.find((r) => r.contractId === selectedContractId);
            const created = await maintenanceService.postIssue({
                contractId: selectedContractId || context?.contractId,
                propertyId: selectedRental?.property.id ?? context?.property.id,
                category,
                title: title.trim(),
                description: description.trim(),
                urgency,
                estimatedBudget: budget ? Number(budget) : null,
                images: imagesBase64,
            });
            setShowSuccess(true);
            onPostSuccess(created);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to post issue.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const balanceCheck = useMemo(() => {
        if (!context) return null;
        const balance = context.walletBalance;
        const tooLow = balance < 1; // arbitrary, real check is done on accept
        return { balance, tooLow };
    }, [context]);

    if (!isOpen) return null;

    if (showSuccess) {
        return (
            <div className="issue-modal-overlay" onClick={onClose}>
                <div className="issue-modal-container success-state" onClick={(e) => e.stopPropagation()}>
                    <div className="success-content">
                        <div className="success-icon-wrapper">
                            <FaCheckCircle />
                        </div>
                        <h2>Issue posted</h2>
                        <p>Your maintenance request is now live. Approved providers will start sending applications with their final price.</p>
                        <button className="done-btn" onClick={onClose}>Great, thanks!</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="issue-modal-overlay" onClick={onClose}>
            <div className="issue-modal-container" onClick={(e) => e.stopPropagation()}>
                <header className="issue-modal-header">
                    <div className="header-title">
                        <div className="header-icon-box">
                            <FaExclamationCircle />
                        </div>
                        <div>
                            <h2>{isViewOnly ? 'Issue Details' : 'Report a New Issue'}</h2>
                            <p>{isViewOnly ? 'View the status and details of your posted issue.' : 'Maintenance is paid from your HOMi wallet.'}</p>
                        </div>
                    </div>
                    <button className="close-modal-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </header>

                <form className="issue-modal-form" onSubmit={handleSubmit}>
                    <div className="modal-scrollable-content">
                        {/* ─── Active property header ─────────────────────── */}
                        {!isViewOnly && (
                            <div className="active-property-card" style={{
                                display: 'flex', gap: '1rem', padding: '1rem',
                                border: '1px solid #e5e7eb', borderRadius: 16,
                                marginBottom: '1.25rem', background: 'linear-gradient(180deg, #fafafe, #f4f6ff)',
                            }}>
                                {loadingContext ? (
                                    <div style={{ padding: '0.5rem' }}>Loading your active rental…</div>
                                ) : context ? (
                                    <>
                                        <div style={{
                                            width: 96, height: 96, flex: '0 0 96px',
                                            borderRadius: 12, overflow: 'hidden', background: '#e5e7eb',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {context.property.thumbnailUrl ? (
                                                <img src={context.property.thumbnailUrl} alt="property"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <FaHome size={32} color="#94a3b8" />
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, color: '#6366f1', fontWeight: 700 }}>
                                                Maintaining
                                            </div>
                                            <h3 style={{ margin: '0.15rem 0 0.35rem', fontSize: '1.1rem' }}>{context.property.title}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.9rem' }}>
                                                <FaMapMarkerAlt /> {context.property.address}
                                            </div>
                                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    fontSize: '0.85rem', color: '#0f172a', background: '#fff',
                                                    border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 999,
                                                }}>
                                                    <FaWallet color="#16a34a" /> Wallet: <strong>EGP {Number(context.walletBalance).toFixed(2)}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: '0.5rem', color: '#b91c1c' }}>{error ?? 'No active rental.'}</div>
                                )}
                            </div>
                        )}

                        {!isViewOnly && activeRentals && activeRentals.length > 1 && (
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label><FaHome /> Select Property to Maintain</label>
                                <select
                                    value={selectedContractId}
                                    onChange={(e) => {
                                        const nextContractId = e.target.value;
                                        setSelectedContractId(nextContractId);
                                        const chosen = activeRentals.find((r) => r.contractId === nextContractId);
                                        if (chosen) {
                                            setContext((prev) => prev ? {
                                                ...prev,
                                                contractId: chosen.contractId,
                                                property: chosen.property,
                                                landlord: chosen.landlord,
                                            } : prev);
                                        }
                                    }}
                                    disabled={loadingContext}
                                >
                                    {activeRentals.map((r) => (
                                        <option key={r.contractId} value={r.contractId}>
                                            {r.property.title} - {r.property.address}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca',
                                color: '#b91c1c', borderRadius: 12, marginBottom: '1rem', fontSize: '0.9rem',
                            }}>{error}</div>
                        )}

                        <div className="form-grid">
                            <div className="form-group">
                                <label><FaTag /> Category</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} required disabled={isViewOnly}>
                                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{t('myProperties.maintenanceTypes.' + cat, cat)}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label><FaExclamationCircle /> Urgency Level</label>
                                <div className="urgency-pills">
                                    {URGENCY_OPTIONS.map((opt) => (
                                        <button key={opt.value} type="button"
                                            className={`urgency-pill ${urgency === opt.value ? 'active' : ''} ${opt.value.toLowerCase()}`}
                                            onClick={() => !isViewOnly && setUrgency(opt.value)}
                                            disabled={isViewOnly}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label><FaTag /> Title</label>
                            <input type="text" placeholder="Brief title (e.g. Leaking kitchen pipe)"
                                value={title} onChange={(e) => setTitle(e.target.value)}
                                required disabled={isViewOnly} />
                        </div>

                        <div className="form-group">
                            <label><FaAlignLeft /> Description</label>
                            <textarea
                                placeholder="Describe the issue in detail so providers can quote accurately…"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                disabled={isViewOnly}
                            />
                        </div>

                        <div className="form-group">
                            <label><FaDollarSign /> Estimated Budget (Optional)</label>
                            <div className="budget-input-wrapper">
                                <span className="currency-label">EGP</span>
                                <input type="number" placeholder="0.00" value={budget}
                                    onChange={(e) => setBudget(e.target.value)} disabled={isViewOnly} />
                            </div>
                            <small>The actual price will come from the maintainer's application after review.</small>
                        </div>

                        {!isViewOnly && (
                            <div className="form-group">
                                <label><FaWallet /> Payment Method</label>
                                <div style={{
                                    padding: '0.85rem 1rem', border: '1px solid #d1d5db',
                                    borderRadius: 12, background: '#f0fdf4', color: '#166534',
                                    display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600,
                                }}>
                                    <FaWallet /> HOMi Wallet (only payment method)
                                </div>
                                <small>Once you accept a provider, their final price is held in escrow from your wallet and released only after you confirm the job is solved.</small>
                                {balanceCheck && balanceCheck.tooLow && (
                                    <div style={{
                                        marginTop: 10, padding: '0.75rem 1rem', background: '#fef3c7',
                                        color: '#92400e', borderRadius: 12, fontSize: '0.9rem',
                                    }}>
                                        Your wallet is empty. Please top up before approving any provider.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label><FaImage /> Evidence Photos</label>
                            {!isViewOnly && (
                                <div className="upload-area" onClick={() => document.getElementById('image-upload')?.click()}>
                                    <input type="file" id="image-upload" multiple accept="image/*"
                                        onChange={handleImageChange} hidden />
                                    <div className="upload-placeholder">
                                        <FaUpload className="upload-icon" />
                                        <p>Click to upload evidence</p>
                                        <span>PNG, JPG up to 5MB each</span>
                                    </div>
                                </div>
                            )}

                            {imagesBase64.length > 0 ? (
                                <div className="previews-grid">
                                    {imagesBase64.map((url, index) => (
                                        <div key={index} className="preview-item">
                                            <img src={url} alt={`Preview ${index}`} />
                                            {!isViewOnly && (
                                                <button type="button" className="remove-img-btn" onClick={() => removeImage(index)}>
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : isViewOnly && (
                                <div className="no-images-view">
                                    <FaImage />
                                    <span>No evidence images provided</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <footer className="issue-modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>{isViewOnly ? 'Close' : 'Cancel'}</button>
                        {!isViewOnly && (
                            <button type="submit" className="submit-btn"
                                disabled={isSubmitting || !context || loadingContext}>
                                {isSubmitting ? 'Posting…' : 'Post Issue'}
                            </button>
                        )}
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default DetailedIssueModal;
