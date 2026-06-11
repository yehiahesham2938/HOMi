import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaMapMarkerAlt, FaUser, FaPhone, FaCar, FaCheckCircle, FaCircle, FaWrench, FaComments } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import maintenanceService, {
    type MaintenanceRequest,
    type MaintenanceLocationData,
} from '../../../../services/maintenance.service';
import socketService from '../../../../services/socket.service';
import './LiveTrackingModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    request: MaintenanceRequest | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

const LiveTrackingModal: React.FC<Props> = ({ isOpen, onClose, request }) => {
    const navigate = useNavigate();
    const [location, setLocation] = useState<MaintenanceLocationData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !request) return;
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                const cur = await maintenanceService.getCurrentLocation(request.id);
                if (!cancelled) setLocation(cur);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        socketService.connect();
        socketService.joinMaintenanceRequest(request.id);

        const handler = (payload: { requestId: string; lat: number; lng: number; reportedAt: string }) => {
            if (payload.requestId !== request.id) return;
            setLocation((prev) => ({
                lat: payload.lat,
                lng: payload.lng,
                reportedAt: payload.reportedAt,
                accuracyM: prev?.accuracyM ?? null,
                heading: prev?.heading ?? null,
                speed: prev?.speed ?? null,
            }));
        };
        socketService.onMaintenanceLocation(handler);

        return () => {
            cancelled = true;
            socketService.offMaintenanceLocation(handler);
            socketService.leaveMaintenanceRequest(request.id);
        };
    }, [isOpen, request]);

    const distanceKm = useMemo(() => {
        if (!location || !request?.property?.lat || !request?.property?.lng) return null;
        return haversineKm(location.lat, location.lng, request.property.lat, request.property.lng);
    }, [location, request]);

    if (!isOpen || !request) return null;

    const provider = request.provider;
    const fullName = `${provider?.firstName ?? ''} ${provider?.lastName ?? ''}`.trim();
    const status = request.status;
    const arrived = distanceKm != null && distanceKm < 0.1;

    return (
        <div className="lt-modal-overlay" onClick={onClose}>
            <div className="lt-modal" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <header className="lt-modal-header">
                    <div className="lt-header-content">
                        <div className="lt-title-group">
                            <h2>Live Tracking</h2>
                            <span className="lt-live-badge">
                                <FaCircle className="lt-pulse-icon" /> Live
                            </span>
                        </div>
                        <p>
                            {status === 'EN_ROUTE'
                                ? 'Your maintainer is on the way to your property.'
                                : status === 'IN_PROGRESS'
                                    ? 'Your maintainer arrived and is working on the issue.'
                                    : 'Tracking the maintainer for this issue.'}
                        </p>
                    </div>
                    <button className="lt-close-btn" onClick={onClose} aria-label="Close modal">
                        <FaTimes />
                    </button>
                </header>

                <div className="lt-modal-body">

                    {/* Provider Card */}
                    <div className="lt-provider-card">
                        <div className="lt-avatar">
                            {provider?.avatarUrl ? <img src={provider.avatarUrl} alt={fullName} /> : <FaUser />}
                        </div>
                        <div className="lt-provider-info">
                            <h4>{provider?.businessName ?? fullName ?? 'Maintainer'}</h4>
                            <div className="lt-provider-meta">
                                <span className="lt-provider-type">
                                    {provider?.providerType === 'CENTER' ? 'Service Center' : 'Independent'}
                                </span>
                            </div>
                            <div className="lt-provider-actions">
                                {provider?.phone && (
                                    <a href={`tel:${provider.phone}`} className="lt-action-link lt-phone-link">
                                        <FaPhone /> {provider.phone}
                                    </a>
                                )}
                                {provider?.id && (
                                    <button 
                                        className="lt-action-btn lt-message-btn" 
                                        onClick={() => {
                                            navigate('/messages', {
                                                state: {
                                                    participantId: provider.id,
                                                    propertyId: request.propertyId || undefined
                                                }
                                            });
                                        }}
                                    >
                                        <FaComments /> Chat
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className={`lt-status-pill ${arrived ? 'arrived' : 'en-route'}`}>
                            {arrived ? 'Arrived' : status === 'EN_ROUTE' ? 'En Route' : status === 'IN_PROGRESS' ? 'Working' : status}
                        </div>
                    </div>

                    {/* Simulated Map Area */}
                    <div className="lt-map-area">
                        {loading ? (
                            <div className="lt-map-loading">
                                <div className="lt-spinner"></div>
                                <span>Locating maintainer...</span>
                            </div>
                        ) : location ? (
                            <div className="lt-map-visuals">
                                {/* Maintainer Location Pin */}
                                <div className="lt-location-pin maintainer-pin">
                                    <div className="pin-icon bg-blue"><FaCar /></div>
                                    <div className="pin-details">
                                        <strong>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</strong>
                                        <small>Updated {new Date(location.reportedAt).toLocaleTimeString()}</small>
                                    </div>
                                </div>

                                {/* Connection Line Graphic (Decorative) */}
                                <div className="lt-route-line"></div>

                                {/* Property Location Pin */}
                                {request.property && (
                                    <div className="lt-location-pin property-pin">
                                        <div className="pin-icon bg-green"><FaMapMarkerAlt /></div>
                                        <div className="pin-details">
                                            <strong>{request.property.title}</strong>
                                            <small>{request.property.address}</small>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="lt-map-empty">
                                <FaMapMarkerAlt className="empty-icon" />
                                <span>Waiting for GPS signal...</span>
                            </div>
                        )}
                    </div>

                    {/* Telemetry Stats */}
                    <div className="lt-stats">
                        <div className="lt-stat">
                            <span className="lt-stat-label">Distance</span>
                            <strong className="text-blue">
                                {distanceKm == null ? '—' : `${distanceKm.toFixed(2)} km`}
                            </strong>
                        </div>
                        <div className="lt-stat">
                            <span className="lt-stat-label">Status</span>
                            <strong className={arrived ? 'text-green' : 'text-orange'}>
                                {arrived ? <><FaCheckCircle /> Arrived</> : <><FaWrench /> {status.replace('_', ' ')}</>}
                            </strong>
                        </div>
                        <div className="lt-stat">
                            <span className="lt-stat-label">Speed</span>
                            <strong>
                                {location?.speed != null ? `${(location.speed * 3.6).toFixed(0)} km/h` : '—'}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveTrackingModal;