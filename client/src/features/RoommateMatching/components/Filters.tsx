import React from 'react';
import { Filter } from 'lucide-react';
import { CITIES, AREAS } from '../constants/habits';

export interface FilterState {
    city: string;
    area: string;
    gender: string;
    min: string;
}

interface FiltersProps {
    f: FilterState;
    setF: (f: FilterState) => void;
}

const Filters: React.FC<FiltersProps> = ({ f, setF }) => {
    const set = (k: keyof FilterState, v: string) => setF({ ...f, [k]: v });
    return (
        <div className="filters">
            <div className="fld">
                <label>City</label>
                <select value={f.city} onChange={(e) => set('city', e.target.value)}>
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
            </div>
            <div className="fld">
                <label>Area</label>
                <select value={f.area} onChange={(e) => set('area', e.target.value)}>
                    {AREAS.map((c) => <option key={c}>{c}</option>)}
                </select>
            </div>
            <div className="fld">
                <label>Gender</label>
                <select value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option>Any</option><option value="MALE">Male</option><option value="FEMALE">Female</option>
                </select>
            </div>
            <div className="fld">
                <label>Min match</label>
                <select value={f.min} onChange={(e) => set('min', e.target.value)}>
                    {['Any', '60%', '70%', '80%'].map((c) => <option key={c}>{c}</option>)}
                </select>
            </div>
            <div className="spacer" />
            <div className="fld" style={{ alignSelf: 'flex-end' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--rm-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter size={14} color="#197cf8" />Sorted by best match
                </span>
            </div>
        </div>
    );
};

export default Filters;
