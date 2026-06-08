import React from 'react';

interface RingProps {
    pct: number;
    size?: number;
    stroke?: number;
}

const Ring: React.FC<RingProps> = ({ pct, size = 54, stroke = 5 }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c - (pct / 100) * c;
    const col = pct >= 80 ? '#10b981' : pct >= 65 ? '#197cf8' : '#f59e0b';
    return (
        <div className="ring" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef2f9" strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={col}
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={off}
                    style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)' }}
                />
            </svg>
            <div className="num">{pct}<small>%</small></div>
        </div>
    );
};

export default Ring;
