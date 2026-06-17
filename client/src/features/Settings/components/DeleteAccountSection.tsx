import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { FaExclamationTriangle } from 'react-icons/fa';
import authService from '../../../services/auth.service';

type DeleteAccountSectionProps = {
    onBackToProfile?: () => void;
};

export type AccountDeleteBlockers = {
    propertyCount: number;
    rentalRequestCount: number;
    contractCount: number;
};

function parseDeleteAccountError(err: unknown, t: any): { message: string; blockers?: AccountDeleteBlockers } {
    if (!axios.isAxiosError(err)) {
        return { message: t('settings.errSomethingWentWrong', 'Something went wrong. Please try again.') };
    }
    const data = err.response?.data as
        | { message?: string; code?: string; details?: AccountDeleteBlockers }
        | undefined;
    if (!data?.message) {
        return { message: t('settings.errSomethingWentWrong', 'Something went wrong. Please try again.') };
    }
    if (data.code === 'ACCOUNT_HAS_DEPENDENCIES' && data.details) {
        return { message: data.message, blockers: data.details };
    }
    return { message: data.message };
}

const DeleteAccountSection: React.FC<DeleteAccountSectionProps> = ({ onBackToProfile }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<{ message: string; blockers?: AccountDeleteBlockers } | null>(null);

    const handleConfirmDelete = async () => {
        setError(null);
        setDeleting(true);
        try {
            await authService.deleteAccount();
            setShowConfirm(false);
            navigate('/auth', { replace: true });
        } catch (err) {
            setError(parseDeleteAccountError(err, t));
            setShowConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <div className="delete-zone-container animate-fade-in">
                <div className="danger-icon-wrapper">
                    <FaExclamationTriangle />
                </div>
                <h2>{t('settings.deleteZoneTitle')}</h2>
                <p>
                    {t('settings.deleteWarning1')}
                </p>
                <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#64748b' }}>
                    {t('settings.deleteWarning2')}
                </p>

                {error && (
                    <div
                        style={{
                            marginTop: '1.25rem',
                            textAlign: 'left',
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#b91c1c',
                            fontSize: 14,
                            lineHeight: 1.5,
                        }}
                    >
                        <div style={{ fontWeight: 600, marginBottom: error.blockers ? 8 : 0 }}>{t('settings.cannotDelete')}</div>
                        <div>{error.message}</div>
                        {error.blockers && (
                            <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
                                {error.blockers.propertyCount > 0 && (
                                    <li>
                                        {t('settings.blockerProperties', { count: error.blockers.propertyCount })}
                                    </li>
                                )}
                                {error.blockers.rentalRequestCount > 0 && (
                                    <li>
                                        {t('settings.blockerRequests', { count: error.blockers.rentalRequestCount })}
                                    </li>
                                )}
                                {error.blockers.contractCount > 0 && (
                                    <li>{t('settings.blockerContracts', { count: error.blockers.contractCount })}</li>
                                )}
                            </ul>
                        )}
                    </div>
                )}

                <div className="delete-actions">
                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => (onBackToProfile ? onBackToProfile() : navigate(-1))}
                    >
                        {t('settings.keepAccount')}
                    </button>
                    <button
                        type="button"
                        className="danger-confirm-btn"
                        disabled={deleting}
                        onClick={() => {
                            setError(null);
                            setShowConfirm(true);
                        }}
                    >
                        {t('settings.deletePermanentlyBtn')}
                    </button>
                </div>
            </div>

            {showConfirm && (
                <div
                    className="delete-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-account-confirm-title"
                    onClick={() => !deleting && setShowConfirm(false)}
                >
                    <div
                        className="delete-confirm-dialog"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="delete-account-confirm-title" style={{ margin: '0 0 10px', fontSize: 18 }}>
                            {t('settings.deleteConfirmTitle')}
                        </h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.55 }}>
                            {t('settings.deleteConfirmDesc')}
                        </p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="cancel-btn"
                                disabled={deleting}
                                onClick={() => setShowConfirm(false)}
                            >
                                {t('settings.noKeepMyAccount')}
                            </button>
                            <button
                                type="button"
                                className="danger-confirm-btn"
                                disabled={deleting}
                                onClick={handleConfirmDelete}
                            >
                                {deleting ? t('settings.deleting') : t('settings.yesDeleteForever')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeleteAccountSection;
