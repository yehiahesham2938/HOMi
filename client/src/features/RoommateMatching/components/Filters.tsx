import React from 'react';
import { Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCities, getAreas } from '../constants/habits';

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
    const { t } = useTranslation();
    const set = (k: keyof FilterState, v: string) => setF({ ...f, [k]: v });
    
    const citiesList = getCities();
    const areasList = getAreas();

    return (
        <div className="filters">
            <div className="fld">
                <label>{t('roommate.cityLabel', 'City')}</label>
                <select value={f.city} onChange={(e) => set('city', e.target.value)}>
                    {citiesList.map((c) => <option key={c}>{c}</option>)}
                </select>
            </div>
            <div className="fld">
                <label>{t('roommate.areaLabel', 'Area')}</label>
                <select value={f.area} onChange={(e) => set('area', e.target.value)}>
                    {areasList.map((c) => <option key={c}>{c}</option>)}
                </select>
            </div>
            <div className="fld">
                <label>{t('roommate.genderLabel', 'Gender')}</label>
                <select value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="Any">{t('roommate.genderAny', 'Any')}</option>
                    <option value="MALE">{t('roommate.genderMale', 'Male')}</option>
                    <option value="FEMALE">{t('roommate.genderFemale', 'Female')}</option>
                </select>
            </div>
            <div className="fld">
                <label>{t('roommate.minMatchLabel', 'Min match')}</label>
                <select value={f.min} onChange={(e) => set('min', e.target.value)}>
                    {['Any', '60%', '70%', '80%'].map((c) => (
                        <option key={c} value={c}>
                            {c === 'Any' ? t('roommate.matchAny', 'Any') : c}
                        </option>
                    ))}
                </select>
            </div>
            <div className="spacer" />
            <div className="fld" style={{ alignSelf: 'flex-end' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--rm-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter size={14} color="#197cf8" />{t('roommate.sortedByBestMatch', 'Sorted by best match')}
                </span>
            </div>
        </div>
    );
};

export default Filters;

