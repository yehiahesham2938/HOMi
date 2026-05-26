// client\src\features\MyProperties\components\DisablePropertyModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaBan, FaCalendarAlt, FaCalendarTimes, FaSpinner } from 'react-icons/fa';
import propertyService from '../../../services/property.service';
import './DisablePropertyModal.css';

interface DisablePropertyModalProps {
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DisablePropertyModal: React.FC<DisablePropertyModalProps> = ({ propertyId, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [disableType, setDisableType] = useState<'temporary' | 'indefinite'>('temporary');
  
  // Default chosen date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const [chosenDate, setChosenDate] = useState(tomorrowStr);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      const payload: Record<string, any> = {
        status: 'UNAVAILABLE'
      };

      if (disableType === 'temporary') {
        if (!chosenDate) {
          setErrorMsg('Please select a date.');
          setLoading(false);
          return;
        }
        payload.availability_date = chosenDate;
      } else {
        payload.availability_date = null;
      }

      const res = await propertyService.updateProperty(propertyId, payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to update property status.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="disable-modal-overlay" onClick={onClose} dir="ltr">
      <div className="disable-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="disable-modal-header">
          <h2><FaBan /> Disable Property Listing</h2>
          <button className="disable-close-btn" onClick={onClose}><FaTimes /></button>
        </header>

        <div className="disable-modal-content">
          <p className="disable-warning-text">
            Disabling this property will temporarily remove it from public listings (Search, Browse, and Guest Home). Tenants will not be able to view or apply for it.
          </p>

          {errorMsg && <div className="disable-error-banner">{errorMsg}</div>}

          <div className="disable-options-list">
            {/* Option 1: Temporary */}
            <div 
              className={`disable-option-card ${disableType === 'temporary' ? 'active' : ''}`}
              onClick={() => setDisableType('temporary')}
            >
              <input 
                type="radio" 
                name="disableType" 
                id="type-temporary"
                checked={disableType === 'temporary'}
                onChange={() => setDisableType('temporary')}
              />
              <div className="option-info">
                <label htmlFor="type-temporary" className="option-title">
                  <FaCalendarAlt className="icon" /> Disable until a chosen date
                </label>
                <p className="option-description">
                  The property will automatically become available and listed again on the selected date.
                </p>

                {disableType === 'temporary' && (
                  <div className="date-picker-container" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="date" 
                      className="disable-date-input"
                      min={tomorrowStr}
                      value={chosenDate}
                      onChange={(e) => setChosenDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Option 2: Indefinite */}
            <div 
              className={`disable-option-card ${disableType === 'indefinite' ? 'active' : ''}`}
              onClick={() => setDisableType('indefinite')}
            >
              <input 
                type="radio" 
                name="disableType" 
                id="type-indefinite"
                checked={disableType === 'indefinite'}
                onChange={() => setDisableType('indefinite')}
              />
              <div className="option-info">
                <label htmlFor="type-indefinite" className="option-title">
                  <FaCalendarTimes className="icon" /> Disable indefinitely
                </label>
                <p className="option-description">
                  The property will remain hidden until you manually enable it again.
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="disable-modal-actions">
          <button className="disable-btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="disable-btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? <FaSpinner className="fa-spin" /> : 'Confirm Disable'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default DisablePropertyModal;
