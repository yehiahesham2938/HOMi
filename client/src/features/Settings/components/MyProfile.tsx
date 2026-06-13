// client/src/features/Settings/components/MyProfile.tsx
import React, { useState, useEffect, useRef } from 'react';
import './MyProfile.css';
import { FaCamera, FaIdBadge, FaEnvelope, FaPhone, FaMapMarkerAlt, FaUserCircle, FaLock, FaIdCard } from 'react-icons/fa';
import { authService } from '../../../services/auth.service';
import type { UserResponse, ProfileResponse, UpdateProfileRequest } from '../../../types/auth.types';

interface MyProfileProps {
    role?: string | null;
    /** Shown next to Active since / Points when profile is complete — opens step 3 in Complete profile. */
    onUpdatePreferencesShortcut?: () => void;
}

const MyProfile: React.FC<MyProfileProps> = ({ role, onUpdatePreferencesShortcut }) => {
    const isMaintainer = role === 'MAINTENANCE_PROVIDER';
    const [user, setUser] = useState<UserResponse | null>(null);
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Editable form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [currentLocation, setCurrentLocation] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Computed originals for change detection
    const originalFirstName    = profile?.firstName    ?? '';
    const originalLastName     = profile?.lastName     ?? '';
    const originalPhone        = profile?.phoneNumber  ?? '';
    const originalBio          = profile?.bio          ?? '';
    const originalLocation     = profile?.currentLocation ?? '';

    const hasChanges = isMaintainer
        ? bio !== originalBio
        : (
            firstName !== originalFirstName ||
            lastName  !== originalLastName  ||
            phone     !== originalPhone     ||
            bio       !== originalBio       ||
            currentLocation !== originalLocation
        );

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await authService.getProfile();
                setUser(data.user);
                setProfile(data.profile);
                setFirstName(data.profile.firstName);
                setLastName(data.profile.lastName);
                setPhone(data.profile.phoneNumber);
                setBio(data.profile.bio ?? '');
                setCurrentLocation(data.profile.currentLocation ?? '');
            } catch {
                // Fall back to locally-cached data if the request fails
                const cached = authService.getCurrentUser();
                if (cached) {
                    setUser(cached.user);
                    setProfile(cached.profile);
                    setFirstName(cached.profile.firstName);
                    setLastName(cached.profile.lastName);
                    setPhone(cached.profile.phoneNumber);
                    setBio(cached.profile.bio ?? '');
                    setCurrentLocation(cached.profile.currentLocation ?? '');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // ── Avatar upload ──────────────────────────────────────────────────────
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file.' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image must be smaller than 10 MB.' });
            return;
        }

        const resizeImage = (src: string): Promise<string> =>
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 300;
                    let { width, height } = img;
                    if (width > height) {
                        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
                    } else {
                        if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = src;
            });

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const resized = await resizeImage(reader.result as string);
                setAvatarSrc(resized);
                setUploadingAvatar(true);
                setMessage(null);
                const updated = await authService.updateProfile({ avatarUrl: resized });
                setUser(updated.user);
                setProfile(updated.profile);
                window.dispatchEvent(new Event('storage'));
                setMessage({ type: 'success', text: 'Profile photo updated!' });
                setTimeout(() => setMessage(null), 3000);
            } catch {
                setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.' });
                setAvatarSrc(profile?.avatarUrl || fallbackAvatar);
            } finally {
                setUploadingAvatar(false);
                e.target.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            if (!isMaintainer && !firstName.trim()) {
                setMessage({ type: 'error', text: 'First name cannot be empty.' });
                setSaving(false);
                return;
            }
            if (!isMaintainer && !lastName.trim()) {
                setMessage({ type: 'error', text: 'Last name cannot be empty.' });
                setSaving(false);
                return;
            }

            const cached = authService.getCurrentUser();
            const orig   = cached?.profile;
            const payload: UpdateProfileRequest = {};

            if (!isMaintainer) {
                if (firstName !== (orig?.firstName ?? ''))         payload.firstName = firstName;
                if (lastName  !== (orig?.lastName  ?? ''))         payload.lastName  = lastName;
                if (phone && phone !== (orig?.phoneNumber ?? ''))  payload.phone     = phone;
            }
            if (bio !== (orig?.bio ?? '')) {
                const nextBio = bio.trim();
                payload.bio = nextBio === '' ? undefined : nextBio;
            }
            if (!isMaintainer && currentLocation !== (orig?.currentLocation ?? '')) {
                payload.currentLocation = currentLocation.trim() || null;
            }

            if (Object.keys(payload).length === 0) {
                setMessage({ type: 'success', text: 'No changes to save.' });
                setSaving(false);
                setTimeout(() => setMessage(null), 3000);
                return;
            }

            const updated = await authService.updateProfile(payload);
            setUser(updated.user);
            setProfile(updated.profile);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update profile. Please try again.';
            setMessage({ type: 'error', text: msg });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    const getRoleLabel = (r?: string) => {
        if (r === 'LANDLORD') return 'Landlord';
        if (r === 'TENANT')   return 'Tenant';
        return r ?? 'Member';
    };

    const formatDate = (date?: Date | string) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        `${firstName} ${lastName}`.trim() || 'User'
    )}&background=6366f1&color=fff&size=150`;

    const [avatarSrc, setAvatarSrc] = useState<string>(profile?.avatarUrl || fallbackAvatar);

    useEffect(() => {
        setAvatarSrc(profile?.avatarUrl || fallbackAvatar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.avatarUrl]);

    if (loading) {
        return (
            <div className="profile-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <div className="loading-spinner" style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    const updatePrefsLabel =
        user?.role === 'LANDLORD' ? 'Update business profile' : 'Update rental preferences';

    // Read-only verified identity fields from DB
    const arabicName       = profile?.fullNameArabic   || null;
    const maskedNid        = profile?.maskedNationalId || null;
    const isVerified       = profile?.isVerificationComplete ?? false;

    return (
        <div className="profile-wrapper">
            <div className="profile-identity-card">
                <div className="identity-left-cluster">
                    <div className="avatar-main-wrapper">
                        <img
                            src={avatarSrc}
                            alt="Profile"
                            onError={() => setAvatarSrc(fallbackAvatar)}
                            referrerPolicy="no-referrer"
                            style={{ opacity: uploadingAvatar ? 0.6 : 1, transition: 'opacity 0.2s' }}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                        />
                        <button
                            className="edit-btn-floating"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            title="Change profile photo"
                            style={{ opacity: uploadingAvatar ? 0.6 : 1 }}
                        >
                            <FaCamera />
                        </button>
                    </div>
                    <div className="identity-text">
                        <h3>{`${firstName} ${lastName}`.trim() || 'User'}</h3>
                        <p>{getRoleLabel(user?.role)}</p>
                    </div>
                </div>
                {!isMaintainer && (
                    <div className="identity-stats-actions">
                        <div className="identity-stats">
                            <div className="stat">
                                <span>Active Since</span>
                                <strong>{formatDate(user?.createdAt)}</strong>
                            </div>
                            <div className="stat">
                                <span>Points</span>
                                <strong>{profile?.gamificationPoints ?? 0}</strong>
                            </div>
                        </div>
                        {onUpdatePreferencesShortcut ? (
                            <button
                                type="button"
                                className="profile-update-prefs-btn"
                                onClick={onUpdatePreferencesShortcut}
                            >
                                {updatePrefsLabel}
                            </button>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="profile-edit-surface">
                <div className="form-section-title">Personal Details</div>

                {message && (
                    <div
                        style={{
                            padding: '10px 16px',
                            borderRadius: 8,
                            marginBottom: 16,
                            fontSize: 14,
                            fontWeight: 500,
                            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            color: message.type === 'success' ? '#15803d' : '#dc2626',
                            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                        }}
                    >
                        {message.text}
                    </div>
                )}

                <div className="input-group-modern">
                    {/* First Name */}
                    <div className="modern-field">
                        <FaIdBadge className="field-icon" />
                        <div className="field-content">
                            <label>First Name</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First name"
                                readOnly={isMaintainer}
                                style={isMaintainer ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
                            />
                        </div>
                    </div>

                    {/* Last Name */}
                    <div className="modern-field">
                        <FaIdBadge className="field-icon" />
                        <div className="field-content">
                            <label>Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last name"
                                readOnly={isMaintainer}
                                style={isMaintainer ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
                            />
                        </div>
                    </div>

                    {/* Email — always read-only */}
                    <div className="modern-field">
                        <FaEnvelope className="field-icon" />
                        <div className="field-content">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={user?.email ?? ''}
                                readOnly
                                style={{ opacity: 0.65, cursor: 'not-allowed' }}
                                title="Email cannot be changed here"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="modern-field">
                        <FaPhone className="field-icon" />
                        <div className="field-content">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+20 10 0000 0000"
                                readOnly={isMaintainer}
                                style={isMaintainer ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="modern-field" style={{ gridColumn: '1 / -1' }}>
                        <FaUserCircle className="field-icon" />
                        <div className="field-content">
                            <label>Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell others a bit about yourself"
                                rows={3}
                                style={{ resize: 'vertical', minHeight: 72, width: '100%', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>

                    {/* Current location */}
                    {!isMaintainer && (
                        <div className="modern-field">
                            <FaMapMarkerAlt className="field-icon" />
                            <div className="field-content">
                                <label>Current Location</label>
                                <input
                                    type="text"
                                    value={currentLocation}
                                    onChange={(e) => setCurrentLocation(e.target.value)}
                                    placeholder="City, Country"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Verified Identity section ─────────────────────────── */}
                {!isMaintainer && isVerified && (maskedNid || arabicName) && (
                    <>
                        <div className="form-section-title" style={{ marginTop: 28 }}>
                            Verified Identity
                            <span style={{
                                marginLeft: 10,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: '#16a34a',
                                background: 'rgba(34,197,94,0.1)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                padding: '2px 8px',
                                borderRadius: 20,
                            }}>
                                ✓ Locked
                            </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16, marginTop: -4 }}>
                            These fields are set by your National ID scan and cannot be changed here.
                        </p>
                        <div className="input-group-modern">
                            {maskedNid && (
                                <div className="modern-field">
                                    <FaIdCard className="field-icon" style={{ color: '#2563eb' }} />
                                    <div className="field-content">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            National ID
                                            <FaLock size={10} style={{ color: '#94a3b8' }} />
                                        </label>
                                        <input
                                            type="text"
                                            value={maskedNid}
                                            readOnly
                                            title="National ID is locked after verification"
                                            style={{
                                                cursor: 'not-allowed',
                                                fontFamily: 'monospace',
                                                letterSpacing: '0.12em',
                                                fontSize: '0.95rem',
                                                background: 'rgba(37,99,235,0.04)',
                                                border: '1.5px solid rgba(37,99,235,0.2)',
                                                color: '#1e40af',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            {arabicName && (
                                <div className="modern-field">
                                    <FaIdBadge className="field-icon" style={{ color: '#2563eb' }} />
                                    <div className="field-content">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            Full Name (Arabic)
                                            <FaLock size={10} style={{ color: '#94a3b8' }} />
                                        </label>
                                        <input
                                            type="text"
                                            value={arabicName}
                                            readOnly
                                            dir="rtl"
                                            title="Arabic name is extracted from your National ID scan"
                                            style={{
                                                cursor: 'not-allowed',
                                                fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
                                                fontSize: '1.05rem',
                                                fontWeight: 600,
                                                textAlign: 'right',
                                                background: 'rgba(37,99,235,0.04)',
                                                border: '1.5px solid rgba(37,99,235,0.2)',
                                                color: '#1e40af',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <button
                    className="prime-save-button"
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    style={{ opacity: saving || !hasChanges ? 0.65 : 1 }}
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default MyProfile;