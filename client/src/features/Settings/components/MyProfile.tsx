// client/src/features/Settings/components/MyProfile.tsx
import React, { useState, useEffect, useRef } from 'react';
import './MyProfile.css';
import { FaCamera, FaIdBadge, FaEnvelope, FaPhone, FaMapMarkerAlt, FaUserCircle } from 'react-icons/fa';
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

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [currentLocation, setCurrentLocation] = useState('');
    const [arabicName, setArabicName] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const originalFirstName = profile?.firstName ?? '';
    const originalLastName = profile?.lastName ?? '';
    const originalPhone = profile?.phoneNumber ?? '';
    const originalBio = profile?.bio ?? '';
    const originalLocation = profile?.currentLocation ?? '';
    const originalArabicName = user?.id ? (localStorage.getItem(`arabicName_${user.id}`) ?? '') : '';
    const hasChanges =
        (isMaintainer
            ? bio !== originalBio
            : (
                firstName !== originalFirstName ||
                lastName !== originalLastName ||
                phone !== originalPhone ||
                bio !== originalBio ||
                currentLocation !== originalLocation ||
                arabicName !== originalArabicName
            ));

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
                if (data.user?.id) {
                    const savedAr = localStorage.getItem(`arabicName_${data.user.id}`);
                    setArabicName(savedAr ?? '');
                }
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
                    if (cached.user?.id) {
                        const savedAr = localStorage.getItem(`arabicName_${cached.user.id}`);
                        setArabicName(savedAr ?? '');
                    }
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

        // Resize to max 300×300 px using canvas, then export as JPEG 80%
        // so the base64 string stays small enough for the DB (typically ~30–50 KB)
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
                // Optimistic preview
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
            // ── Client-side validation ────────────────────────────────────
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

            // Only send fields that have actually changed vs the stored original.
            // This prevents 400 errors from the backend when nothing changed,
            // and avoids sending an empty phone (Google OAuth users may have none).
            const cached = authService.getCurrentUser();
            const orig = cached?.profile;
            const payload: UpdateProfileRequest = {};

            if (!isMaintainer) {
                if (firstName !== (orig?.firstName ?? '')) payload.firstName = firstName;
                if (lastName !== (orig?.lastName ?? '')) payload.lastName = lastName;
                // Only include phone if it's non-empty AND different from original
                if (phone && phone !== (orig?.phoneNumber ?? '')) payload.phone = phone;
            }
            if (bio !== (orig?.bio ?? '')) {
                const nextBio = bio.trim();
                payload.bio = nextBio === '' ? undefined : nextBio;
            }
            if (!isMaintainer && currentLocation !== (orig?.currentLocation ?? '')) {
                payload.currentLocation = currentLocation.trim() || null;
            }

            let arNameChanged = false;
            if (user?.id && arabicName !== originalArabicName) {
                localStorage.setItem(`arabicName_${user.id}`, arabicName.trim());
                arNameChanged = true;
            }

            if (Object.keys(payload).length === 0) {
                if (arNameChanged) {
                    setMessage({ type: 'success', text: 'Arabic name updated successfully!' });
                    setSaving(false);
                    setUser(prev => prev ? { ...prev } : null);
                    setTimeout(() => setMessage(null), 3000);
                    return;
                }
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
            // Auto-clear the message after 4 seconds
            setTimeout(() => setMessage(null), 4000);
        }
    };

    const getRoleLabel = (role?: string) => {
        if (role === 'LANDLORD') return 'Landlord';
        if (role === 'TENANT') return 'Tenant';
        return role ?? 'Member';
    };

    const formatDate = (date?: Date | string) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        `${firstName} ${lastName}`.trim() || 'User'
    )}&background=6366f1&color=fff&size=150`;

    const [avatarSrc, setAvatarSrc] = useState<string>(profile?.avatarUrl || fallbackAvatar);

    // Sync avatar when profile loads
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
                    {!isMaintainer && (
                        <div className="modern-field">
                            <FaIdBadge className="field-icon" />
                            <div className="field-content">
                                <label>Full Name (Arabic)</label>
                                <input
                                    type="text"
                                    value={arabicName}
                                    onChange={(e) => setArabicName(e.target.value)}
                                    placeholder="الاسم الكامل باللغة العربية"
                                    dir="rtl"
                                    style={{ textAlign: 'right', fontFamily: 'inherit' }}
                                />
                            </div>
                        </div>
                    )}
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
                    <div className="modern-field">
                        <FaPhone className="field-icon" />
                        <div className="field-content">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                readOnly={isMaintainer}
                                style={isMaintainer ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
                            />
                        </div>
                    </div>
                    <div className="modern-field" style={{ gridColumn: '1 / -1' }}>
                        <FaUserCircle className="field-icon" />
                        <div className="field-content">
                            <label>Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell others a bit about yourself"
                                rows={3}
                                style={{
                                    resize: 'vertical',
                                    minHeight: 72,
                                    width: '100%',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>
                    </div>
                    {!isMaintainer && (
                        <div className="modern-field">
                            <FaMapMarkerAlt className="field-icon" />
                            <div className="field-content">
                                <label>Current location</label>
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