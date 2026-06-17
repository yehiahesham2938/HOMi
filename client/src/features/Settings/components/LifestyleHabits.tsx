import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './MyProfile.css'; // Reuse profile styles for consistency
import { FaMagic } from 'react-icons/fa';
import { authService } from '../../../services/auth.service';
import { HABITS } from '../../RoommateMatching/constants/habits';

interface LifestyleHabitsProps {
    role?: string | null;
}

type Habits = Record<string, number>;

const LifestyleHabits: React.FC<LifestyleHabitsProps> = ({ role }) => {
    const { t } = useTranslation();
    const [habits, setHabits] = useState<Habits>({});
    const [initial, setInitial] = useState<Habits>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const fetchHabits = async () => {
            try {
                if (role === 'TENANT') {
                    const data = await authService.getLifestyleHabits();
                    const lf = data.lifestyle_habits || {};
                    setHabits(lf);
                    setInitial(lf);
                }
            } catch (err) {
                console.error('Failed to fetch lifestyle habits:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHabits();
    }, [role]);

    const allSet = HABITS.every((h) => typeof habits[h.key] === 'number');
    const hasChanges = JSON.stringify(habits) !== JSON.stringify(initial);

    const handleSave = async () => {
        if (!allSet) return;
        setSaving(true);
        setMessage(null);
        try {
            await authService.setLifestyleHabits(habits);
            setInitial({ ...habits });
            setMessage({ type: 'success', text: t('settings.preferencesSaved', 'Lifestyle profile updated successfully!') });
        } catch {
            setMessage({ type: 'error', text: t('settings.errFailedSaveLifestyle', 'Failed to update lifestyle profile. Please try again.') });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    if (loading) {
        return (
            <div className="profile-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <div className="loading-spinner" style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#197cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    return (
        <div className="profile-wrapper">
            <div className="profile-edit-surface">
                <div className="form-section-title">{t('settings.lifestyleProfile')}</div>
                <p className="section-subtitle">{t('settings.lifestyleSubtitle')}</p>

                {message && (
                    <div style={{
                        padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 500,
                        background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: message.type === 'success' ? '#15803d' : '#dc2626',
                        border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                        {message.text}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: '1rem' }}>
                    {HABITS.map((h) => {
                        const Icon = h.icon;
                        const current = habits[h.key];
                        return (
                            <div key={h.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                                    <Icon size={16} color="#197cf8" />{t(`habits.${h.key}.label`, h.label)}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {h.opts.map((opt, i) => {
                                        const active = current === i;
                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setHabits((prev) => ({ ...prev, [h.key]: i }))}
                                                style={{
                                                    flex: '1 1 120px', padding: '10px 14px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
                                                    cursor: 'pointer', transition: '.18s',
                                                    border: active ? '1.5px solid #197cf8' : '1px solid #e7ecf3',
                                                    background: active ? 'linear-gradient(135deg,#197cf8,#1161d9)' : '#f8fafc',
                                                    color: active ? '#fff' : '#475569',
                                                }}
                                            >
                                                {t(`habits.${h.key}.opts.${i}`, opt)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!allSet && (
                    <div className="habit-warning" style={{ marginTop: 16 }}>
                        <span className="warning-dot" />
                        {t('settings.answerAllWarning', { count: HABITS.length })}
                    </div>
                )}

                <button
                    className="prime-save-button"
                    onClick={handleSave}
                    disabled={saving || !hasChanges || !allSet}
                    style={{ opacity: saving || !hasChanges || !allSet ? 0.65 : 1, marginTop: '1rem' }}
                >
                    {saving ? t('settings.saving') : t('settings.saveLifestyle')}
                </button>

                <div style={{ marginTop: '2rem', background: '#f0f9ff', border: '1px solid #dbeafe', padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ padding: 8, background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}>
                        <FaMagic style={{ color: '#197cf8' }} />
                    </div>
                    <div>
                        <h4 style={{ color: '#0b4aaa', margin: 0, fontSize: '1rem' }}>{t('settings.aiMatchingReady')}</h4>
                        <p style={{ color: '#1d4ed8', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
                            {t('settings.aiMatchingDesc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LifestyleHabits;
