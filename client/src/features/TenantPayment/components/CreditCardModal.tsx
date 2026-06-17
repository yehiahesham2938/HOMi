import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Lock, Info, CheckCircle } from 'lucide-react';
import './CreditCardModal.css';
import paymentMethodService, { type SavedPaymentMethod } from '../../../services/payment-method.service';
import { useTranslation } from 'react-i18next';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: (method: SavedPaymentMethod) => void;
}

const CreditCardModal: React.FC<ModalProps> = ({ isOpen, onClose, onSaved }) => {
    const { t } = useTranslation();
    const [cardData, setCardData] = useState({
        number: '',
        holder: '',
        expiry: '',
        cvv: ''
    });
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    let saveButtonText = t('creditCard.saveMethod');
    if (isSaving) saveButtonText = t('creditCard.saving');
    if (isSuccess) saveButtonText = t('creditCard.saved');

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name } = e.target;
        let { value } = e.target;
        setErrorMessage(null);

        // Auto-format Card Number: Add space after every 4 digits
        if (name === 'number') {
            value = value
                .replaceAll(/\D/g, '') // Remove all non-digit characters
                .replaceAll(/(\d{4})(?=\d)/g, '$1 ') // Add a space after every 4 digits
                .trim();
        }

        // Auto-format Expiry Date: Add " / " after the first 2 digits (MM)
        if (name === 'expiry') {
            value = value.replaceAll(/\D/g, ''); // Remove non-digits
            if (value.length > 2) {
                value = `${value.slice(0, 2)} / ${value.slice(2, 4)}`;
            }
        }

        // CVV should only be numbers
        if (name === 'cvv') {
            value = value.replaceAll(/\D/g, '');
        }

        setCardData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const digits = cardData.number.replaceAll(/\D/g, '');
        const expiryDigits = cardData.expiry.replaceAll(/\D/g, '');
        const expMonth = Number(expiryDigits.slice(0, 2));
        const expYearShort = Number(expiryDigits.slice(2, 4));
        const expYear = expYearShort ? 2000 + expYearShort : 0;

        if (digits.length < 13 || digits.length > 19) {
            setErrorMessage(t('creditCard.errCardNumber'));
            return;
        }

        if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
            setErrorMessage(t('creditCard.errExpiry'));
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);

        try {
            // Simulated provider tokenization step: in production this token must come from
            // the payment provider SDK (Paymob/Stripe), not generated from raw card data locally.
            const providerToken = `pm_tok_${Date.now()}_${digits.slice(-4)}`;
            const brand = digits.startsWith('4') ? 'VISA' : 'MASTERCARD';

            const created = await paymentMethodService.createMethod({
                provider: 'PAYMOB',
                provider_payment_token: providerToken,
                brand,
                last4: digits.slice(-4),
                exp_month: expMonth,
                exp_year: expYear,
                cardholder_name: cardData.holder.trim(),
                is_default: true,
            });

            setIsSuccess(true);
            onSaved?.(created);

            setTimeout(() => {
                setIsSuccess(false);
                onClose();
                setCardData({ number: '', holder: '', expiry: '', cvv: '' });
            }, 1200);
        } catch {
            setErrorMessage(t('creditCard.errUnableToSave'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="payment-modal-layer">
            <button
                type="button"
                className="payment-modal-overlay"
                aria-label="Close add payment method modal"
                onClick={onClose}
            />

            <div className="credit-card-modal-container animate-slide-up">
                <header className="modal-header">
                    <div className="header-icon-title">
                        <div className="shield-icon-box"><ShieldCheck size={20} /></div>
                        <h3>{t('creditCard.addMethod')}</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="modal-body">
                    {/* Live Card Preview */}
                    <div className={`card-preview-visual ${cardData.number.startsWith('4') ? 'visa-theme' : 'master-theme'}`}>
                        <div className="card-top-row">
                            <CreditCard size={32} strokeWidth={1.5} />
                            <span className="card-type-label">
                                {cardData.number.startsWith('4') ? 'VISA' : 'MASTERCARD'}
                            </span>
                        </div>
                        <div className="card-number-display">
                            {cardData.number || '•••• •••• •••• ••••'}
                        </div>
                        <div className="card-bottom-row">
                            <div className="card-holder-info">
                                <span></span>
                                <span>{cardData.holder || t('creditCard.yourName')}</span>
                            </div>
                            <div className="card-expiry-info">
                                <span>{t('creditCard.expires')} </span>
                                <span>{cardData.expiry || t('creditCard.mmyy')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Success Message Banner */}
                    {isSuccess && (
                        <div className="success-banner">
                            <CheckCircle size={18} />
                            <span>{t('creditCard.successAdded')}</span>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="error-banner" role="alert">
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Input Form */}
                    <form className="card-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <span>{t('creditCard.holderName')}</span>
                            <input 
                                type="text" 
                                name="holder"
                                value={cardData.holder}
                                placeholder={t('creditCard.holderPlaceholder')}
                                onChange={handleInputChange}
                                maxLength={26}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <span>{t('creditCard.cardNumber')}</span>
                            <div className="input-with-icon">
                                <Lock size={14} className="input-lock" />
                                <input 
                                    type="text" 
                                    name="number"
                                    value={cardData.number}
                                    placeholder="0000 0000 0000 0000"
                                    onChange={handleInputChange}
                                    maxLength={19}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row-dual">
                            <div className="form-group">
                                <span>{t('creditCard.expiryDate')}</span>
                                <input 
                                    type="text" 
                                    name="expiry"
                                    value={cardData.expiry}
                                    placeholder={t('creditCard.expiryPlaceholder')}
                                    onChange={handleInputChange}
                                    maxLength={7} // 4 digits + 3 spaces/slashes
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <span className="flex-align">
                                    {t('creditCard.cvv')} <Info size={12} className="info-icon" />
                                </span>
                                <input 
                                    type="password" 
                                    name="cvv"
                                    value={cardData.cvv}
                                    placeholder="•••"
                                    onChange={handleInputChange}
                                    maxLength={4} // Some AMEX cards have 4
                                    required
                                />
                            </div>
                        </div>

                        <div className="security-notice">
                            <Lock size={12} />
                            <p>{t('creditCard.securityNotice')}</p>
                        </div>

                        <button type="submit" className="submit-card-btn" disabled={isSuccess || isSaving}>
                            {saveButtonText}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreditCardModal;