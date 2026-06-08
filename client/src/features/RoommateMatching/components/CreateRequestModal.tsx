import React, { useState } from 'react';
import { X, MapPin, DollarSign, Users, Calendar, Info, Home } from 'lucide-react';
import '../pages/RoommateMatching.css';

interface CreateRequestModalProps {
    type: 'SEARCH_APARTMENT' | 'SEARCH_ROOMMATE';
    activeContracts?: Array<{ id: string; property?: { title: string; address: string } }>;
    activeContractId?: string | null;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ type, activeContracts = [], activeContractId, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        preferred_city: 'Cairo',
        preferred_area: '',
        budget_min: 0,
        budget_max: 0,
        preferred_gender: 'ANY',
        preferred_move_in_date: '',
        additional_note: '',
        max_occupants: 1,
        contract_id: activeContractId || (activeContracts.length > 0 ? activeContracts[0].id : null)
    });

    const isApartmentSearch = type === 'SEARCH_APARTMENT';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Clean empty string values to null so the database doesn't crash on invalid Date casts
        const payload = {
            ...formData,
            type,
            preferred_move_in_date: formData.preferred_move_in_date || null,
            budget_min: formData.budget_min || 0,
            budget_max: formData.budget_max || 0,
        };
        
        onSubmit(payload);
    };

    return (
        <div className="rm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rm-modal">
                {/* Header */}
                <div className="rm-modal-header">
                    <button className="rm-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                    <h2>
                        {isApartmentSearch ? <MapPin size={22} /> : <Home size={22} />}
                        {isApartmentSearch ? 'Find a Place to Share' : 'Find a Roommate'}
                    </h2>
                    <p>
                        {isApartmentSearch
                            ? 'Set your preferences to find the perfect roommate with a contract.'
                            : 'Find someone compatible to join you in your current place.'}
                    </p>
                </div>

                {/* Body */}
                <div className="rm-modal-body">
                    <form className="rm-form" onSubmit={handleSubmit}>

                        {isApartmentSearch ? (
                            <div className="rm-field-row">
                                <div className="rm-field">
                                    <label><MapPin size={14} /> City</label>
                                    <select
                                        value={formData.preferred_city}
                                        onChange={(e) => setFormData({...formData, preferred_city: e.target.value})}
                                    >
                                        <option value="Cairo">Cairo</option>
                                        <option value="Giza">Giza</option>
                                        <option value="Alexandria">Alexandria</option>
                                    </select>
                                </div>
                                <div className="rm-field">
                                    <label>Area</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Nasr City"
                                        value={formData.preferred_area}
                                        onChange={(e) => setFormData({...formData, preferred_area: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="rm-field">
                                <label><Home size={14} /> Select Apartment</label>
                                {activeContracts.length > 0 ? (
                                    <select
                                        value={formData.contract_id || ''}
                                        onChange={(e) => setFormData({...formData, contract_id: e.target.value})}
                                        required
                                    >
                                        {activeContracts.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.property?.title || 'Apartment'} - {c.property?.address || 'Unknown address'}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="rm-info-box" style={{ color: '#ef4444', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                                        <Info size={20} color="#ef4444" />
                                        <span>You don't have any active contracts to list for roommate matching.</span>
                                    </div>
                                )}
                                <div className="rm-info-box" style={{ marginTop: '10px' }}>
                                    <Info size={20} />
                                    <span>We'll use this active contract's location and rent details for matching.</span>
                                </div>
                            </div>
                        )}

                        {isApartmentSearch && (
                            <div className="rm-field">
                                <label><DollarSign size={14} /> Monthly Budget Range (EGP)</label>
                                <div className="rm-field-row">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={formData.budget_min || ''}
                                        onChange={(e) => setFormData({...formData, budget_min: Number(e.target.value)})}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={formData.budget_max || ''}
                                        onChange={(e) => setFormData({...formData, budget_max: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="rm-field-row">
                            <div className="rm-field">
                                <label><Users size={14} /> Roommate Gender</label>
                                <select
                                    value={formData.preferred_gender}
                                    onChange={(e) => setFormData({...formData, preferred_gender: e.target.value})}
                                >
                                    <option value="ANY">Any</option>
                                    <option value="MALE">Male only</option>
                                    <option value="FEMALE">Female only</option>
                                </select>
                            </div>
                            <div className="rm-field">
                                <label><Calendar size={14} /> Move-in Date</label>
                                <input
                                    type="date"
                                    value={formData.preferred_move_in_date}
                                    onChange={(e) => setFormData({...formData, preferred_move_in_date: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="rm-field">
                            <label>Additional Notes</label>
                            <textarea
                                placeholder="Tell potential roommates something about yourself or your preferences..."
                                value={formData.additional_note}
                                onChange={(e) => setFormData({...formData, additional_note: e.target.value})}
                            />
                        </div>

                        <button type="submit" className="rm-submit-btn">
                            Start Matching
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateRequestModal;
