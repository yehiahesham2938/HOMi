import React from 'react';

interface AvatarProps {
    name: string;
    avatar?: string | null;
    size?: number;
    radius?: number;
    className?: string;
}

const AV_BG = ['#197cf8', '#7c3aed', '#0ea5e9', '#0891b2', '#2563eb', '#6366f1'];

function initials(name: string): string {
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({ name, avatar, size = 62, radius = 16, className = '' }) => {
    const style: React.CSSProperties = { width: size, height: size, borderRadius: radius };
    if (avatar) {
        return <img className={className} src={avatar} alt={name} style={{ ...style, objectFit: 'cover' }} />;
    }
    const bg = AV_BG[(name.charCodeAt(0) || 0) % AV_BG.length];
    return (
        <div className={`av ${className}`} style={{ ...style, background: bg, fontSize: size * 0.34 }}>
            {initials(name)}
        </div>
    );
};

export default Avatar;
