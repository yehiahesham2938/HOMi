import React, { useState } from 'react';
import {
    X, ChevronRight, ChevronLeft, Pencil, ShieldCheck,
    Landmark, Zap, Ban, User, DollarSign, Cpu, Clock, Globe,
    Fingerprint, CheckCircle2, CreditCard
} from 'lucide-react';
import { type LeaseContract } from '../pages/Contract';
import SignatureModal from './SignatureModal';
import contractService, { type VerificationSummary } from '../../../services/contract.service';
import authService from '../../../services/auth.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';
import './ContractDetailView.css';

interface Props {
    contract: LeaseContract;
    onUpdated?: () => void;
    onClose: () => void;
}

import { useTranslation } from 'react-i18next';

const ContractDetailView: React.FC<Props> = ({ contract, onUpdated, onClose }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [savedSignature, setSavedSignature] = useState<string | null>(() => {
        const userState = authService.getCurrentUser();
        return normalizeSignatureUrl(userState?.profile?.e_signature_url) || null;
    });
    const [isFinalized, setIsFinalized] = useState(false);
    const [summary, setSummary] = useState<VerificationSummary | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const maintenanceResponsibilities = contract.maintenanceResponsibilities ?? [];

    const [tenantData, setTenantData] = useState({
        idFullName: contract.tenant || '',
        idNumber: contract.tenantNationalId || '',
        currentAddress: '',
        mainPhone: '',
        emergencyName: contract.tenantEmergencyContactName || '',
        emergencyPhone: contract.tenantEmergencyPhone || '',
        confirmed: false
    });

    const handleNext = async () => {
        try {
            setSubmitting(true);
            if (step === 3) {
                await contractService.updateTenantIdentity(contract.internalId, {
                    national_id: tenantData.idNumber,
                    emergency_contact_name: tenantData.emergencyName,
                    emergency_phone: tenantData.emergencyPhone,
                });
                const summaryResponse = await contractService.getVerificationSummary(contract.internalId);
                setSummary(summaryResponse.data);
                onUpdated?.();
            }
            setStep((s) => Math.min(s + 1, 6));
        } catch (error) {
            console.error('Failed to process tenant step', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => setStep(s => s - 1);

    const handleSignatureSave = (signatureData: string) => {
        setSavedSignature(signatureData);
        setIsSignModalOpen(false);
    };

    const handleFinalExecute = async () => {
        if (!savedSignature || !tenantData.confirmed) return;
        setSubmitting(true);
        try {
            await contractService.signTenantContract(contract.internalId, {
                signature_url: savedSignature,
                agree_to_terms: true,
            });
            setIsFinalized(true);
            onUpdated?.();
        } catch (error) {
            console.error('Failed to sign tenant contract', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (isFinalized) {
        return (
            <div className="contract-overlay" dir="ltr">
                <div className="detail-panel success-panel animate-slide-in">
                    <div className="success-content">
                        <div className="success-icon-badge">
                            <CheckCircle2 size={60} />
                        </div>
                        <h2>{t('tenantContract.agreementExecuted')}</h2>
                        <p>{t('tenantContract.agreementDesc', { property: contract.property })}</p>

                        <div className="success-actions">
                            <button className="btn-pay-action" onClick={() => globalThis.location.href = '/tenant-payment?tab=pending'}>
                                <CreditCard size={18} /> {t('tenantContract.goToPayments')}
                            </button>
                            <button className="btn-close-dashboard" onClick={onClose}>
                                {t('tenantContract.backToDashboard')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="contract-overlay" dir="ltr">
            <div className="detail-panel animate-slide-in">
                <header className="panel-header">
                    <div className="header-title">
                        <span>{contract.id} • {contract.property}</span>
                    </div>
                    <div className="header-actions">
                        <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </header>

                <div className="panel-content">
                    <div className="contract-stepper">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <React.Fragment key={i}>
                                <div className={`step-pill ${step >= i ? 'active' : ''}`}>{i}</div>
                                {i < 6 && <div className={`step-line ${step > i ? 'active' : ''}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* STEP 1: PARTIES, PROPERTY, LEASE TERM */}
                    {step === 1 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('tenantContract.contractDetails')}</h3>

                            <section className="info-section">
                                <div className="section-title"><Fingerprint size={16} /> <h4>1. {t('tenantContract.identityDate')}</h4></div>
                                <div className="input-grid">
                                    <div className="input-group">
                                        <label>{t('tenantContract.nationalIdFullName')}</label>
                                        <input
                                            type="text"
                                            placeholder="الاسم الكامل باللغة العربية"
                                            value={tenantData.idFullName}
                                            onChange={e => {
                                                const value = e.target.value;
                                                if (/^[\u0600-\u06FF\s]*$/.test(value)) {
                                                    setTenantData({ ...tenantData, idFullName: value });
                                                }
                                            }}
                                            style={{ direction: 'rtl' }}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('tenantContract.nationalIdNumber')}</label>
                                        <input
                                            type="text"
                                            placeholder="2990101XXXXXXXX"
                                            maxLength={14}
                                            value={tenantData.idNumber}
                                            onChange={e => {
                                                const value = e.target.value;
                                                if (/^\d*$/.test(value)) {
                                                    setTenantData({ ...tenantData, idNumber: value });
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="input-group full">
                                        <label>{t('tenantContract.currentAddress')}</label>
                                        <input
                                            type="text"
                                            placeholder={t('tenantContract.currentAddressPlaceholder')}
                                            value={tenantData.currentAddress}
                                            onChange={e => setTenantData({ ...tenantData, currentAddress: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('tenantContract.mainPhone')}</label>
                                        <input
                                            type="text"
                                            placeholder={t('tenantContract.mainPhonePlaceholder')}
                                            value={tenantData.mainPhone}
                                            onChange={e => setTenantData({ ...tenantData, mainPhone: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('tenantContract.contractDate')}</label>
                                        <input className="readonly-field" disabled type="date" value={new Date().toISOString().split('T')[0]} />
                                    </div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><User size={16} /> <h4>2. {t('tenantContract.partiesInvolved')}</h4></div>
                                <div className="autofill-grid">
                                    <div className="field full"><label>{t('tenantContract.landlordOwner')}</label><span>{contract.landlord} • {contract.landlordEmail}</span></div>
                                    <div className="field full"><label>{t('tenantContract.tenantRenter')}</label><span>{contract.tenant} • {contract.tenantEmail}</span></div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><Landmark size={16} /> <h4>3. {t('tenantContract.propertyDetails')}</h4></div>
                                <div className="autofill-grid">
                                    <div className="field full"><label>{t('tenantContract.address')}</label><span>{contract.propertyAddress}</span></div>
                                    <div className="field full"><label>{t('tenantContract.description')}</label><span>{contract.propertyType} • {contract.propertyFurnishing}</span></div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><Clock size={16} /> <h4>4. {t('tenantContract.leaseTerm')}</h4></div>
                                <div className="autofill-grid">
                                    <div className="field"><label>{t('tenantContract.startDate')}</label><span>{contract.startDate}</span></div>
                                    <div className="field"><label>{t('tenantContract.endDate')}</label><span>{contract.duration}</span></div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STEP 2: USE OF PROPERTY & ENTRY */}
                    {step === 2 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('tenantContract.rulesAllowances')}</h3>
                            <section className="info-section">
                                <div className="section-title"><ShieldCheck size={16} /> <h4>6. {t('tenantContract.useOfPropertyTitle')}</h4></div>
                                <div className="input-group">
                                    <label>{t('tenantContract.permittedUse')}</label>
                                    <select className="readonly-field" disabled value={'Residential purposes only'}>
                                        <option value="Residential purposes only">{t('tenantContract.residentialOnly')}</option>
                                    </select>
                                </div>
                            </section>
                            <section className="info-section">
                                <div className="section-title"><Globe size={16} /> <h4>7. {t('tenantContract.entryInspection')}</h4></div>
                                <div className="input-group">
                                    <label>{t('tenantContract.rightToEnter')}</label>
                                    <select className="readonly-field" disabled value={'Maintenance, emergencies, and inspections'}>
                                        <option value="Maintenance, emergencies, and inspections">{t('tenantContract.maintenanceEmergencies')}</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>{t('tenantContract.noticePeriod')}</label>
                                    <select className="readonly-field" disabled value={'24 hours written notice'}>
                                        <option value="24 hours written notice">{t('tenantContract.notice24h')}</option>
                                    </select>
                                </div>
                                <div className="input-group" style={{ marginTop: '20px' }}>
                                    <label>{t('tenantContract.lateFeeAmount')}</label>
                                    <input className="readonly-field" disabled type="number" value={contract.lateFeeAmount || 0} />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STEP 3: MAINTENANCE & EMERGENCY DETAILS */}
                    {step === 3 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('tenantContract.emergencyMaintenance')}</h3>
                            <section className="info-section">
                                <div className="section-title"><User size={16} /> <h4>{t('tenantContract.emergencyContact')}</h4></div>
                                <div className="input-grid">
                                    <div className="input-group">
                                        <label>{t('tenantContract.emergencyContactName')}</label>
                                        <input 
                                            type="text" 
                                            placeholder="Full Name"
                                            value={tenantData.emergencyName} 
                                            onChange={(e) => setTenantData({ ...tenantData, emergencyName: e.target.value })} 
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('tenantContract.emergencyPhone')}</label>
                                        <input 
                                            type="tel" 
                                            placeholder="Phone Number"
                                            value={tenantData.emergencyPhone} 
                                            onChange={(e) => setTenantData({ ...tenantData, emergencyPhone: e.target.value })} 
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><Zap size={16} /> <h4>{t('tenantContract.maintenanceResponsibilities')}</h4></div>
                                <div className="responsibility-box scrollable">
                                    {maintenanceResponsibilities.length > 0 ? (
                                        maintenanceResponsibilities.map((item, idx) => (
                                            <div key={`${item.area}-${idx}`} className="resp-row">
                                                <span>{t('myProperties.maintenanceTypes.' + item.area, item.area)}</span>
                                                <span className={`owner-badge ${item.responsible_party === 'LANDLORD' ? 'landlord' : 'tenant'}`}>
                                                    {item.responsible_party === 'LANDLORD' ? t('tenantContract.landlordBadge') : t('tenantContract.tenantBadge')}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="resp-row"><span>{t('tenantContract.noMaintenanceRequirements')}</span><span className="owner-badge tenant">N/A</span></div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STEP 4: RENTAL AGREEMENT TERMS */}
                    {step === 4 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('tenantContract.rentalAgreementTerms')}</h3>

                            <section className="info-section">
                                <div className="section-title"><User size={16} /> <h4>{t('tenantContract.introduction')}</h4></div>
                                <div className="legal-term-box">
                                    <p>{t('tenantContract.agreementMadeBetween')}</p>
                                    <div className="party-details">
                                        <div className="party">
                                            <strong>{t('tenantContract.lessor')}</strong>
                                            <span>{contract.landlord}</span>
                                            <span>{t('tenantContract.idLabel')} {'—'}</span>
                                            <span>{t('tenantContract.addressLabel')} {'—'}</span>
                                        </div>
                                        <div className="party">
                                            <strong>{t('tenantContract.lessee')}</strong>
                                            <span>{tenantData.idFullName || contract.tenant}</span>
                                            <span>{t('tenantContract.idLabel')} {tenantData.idNumber || '—'}</span>
                                            <span>{t('tenantContract.addressLabel')} {tenantData.currentAddress || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><h4>{t('tenantContract.mainClauses')}</h4></div>
                                <div className="legal-clauses-list">
                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause1Title')}</label>
                                        <p>{t('tenantContract.clause1Text', { address: contract.propertyAddress, type: contract.propertyType })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause2Title')}</label>
                                        <p>{t('tenantContract.clause2Text', { startDate: contract.startDate, duration: contract.duration })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause3Title')}</label>
                                        <p>{t('tenantContract.clause3Text', { amount: `$${contract.amount}` })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause4Title')}</label>
                                        <p>{t('tenantContract.clause4Text', { deposit: `$${contract.deposit}` })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause5Title')}</label>
                                        <p>{t('tenantContract.clause5Text', { lateFee: `$${contract.lateFeeAmount || 0}` })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause6Title')}</label>
                                        <p>{t('tenantContract.clause6Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause7Title')}</label>
                                        <p>{t('tenantContract.clause7Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause8Title')}</label>
                                        <p>{t('tenantContract.clause8Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause9Title')}</label>
                                        <p>{t('tenantContract.clause9Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause10Title')}</label>
                                        <p>{t('tenantContract.clause10Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause11Title')}</label>
                                        <p>{t('tenantContract.clause11Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause12Title')}</label>
                                        <p>{t('tenantContract.clause12Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause13Title')}</label>
                                        <p>{t('tenantContract.clause13Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('tenantContract.clause14Title')}</label>
                                        <p>{t('tenantContract.clause14Text')}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STEP 5: SUMMARY */}
                    {step === 5 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('tenantContract.platformVerificationSummary')}</h3>
                            <div className="homi-auto-box">
                                <section className="auto-section">
                                    <div className="section-title"><Cpu size={16} /> <h4>{t('tenantContract.platformMetadata')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('tenantContract.contractId')}</label><span>{summary?.platformMetadata.contractId || contract.id}</span></div>
                                        <div className="item"><label>{t('tenantContract.created')}</label><span>{summary?.platformMetadata.created ? new Date(summary.platformMetadata.created).toLocaleDateString() : new Date(contract.createdAt).toLocaleDateString()}</span></div>
                                        <div className="item"><label>{t('tenantContract.leaseId')}</label><span>{summary?.platformMetadata.leaseId || contract.leaseId}</span></div>
                                    </div>
                                </section>
                                <section className="auto-section">
                                    <div className="section-title"><Landmark size={16} /> <h4>{t('tenantContract.verifiedPropertyInfo')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('tenantContract.titleLabel')}</label><span>{summary?.verifiedPropertyInfo.title || contract.property}</span></div>
                                        <div className="item"><label>{t('tenantContract.type')}</label><span>{summary?.verifiedPropertyInfo.type || contract.propertyType}</span></div>
                                        <div className="item"><label>{t('tenantContract.rooms')}</label><span>{summary?.verifiedPropertyInfo.rooms || 'N/A'}</span></div>
                                        <div className="item"><label>{t('tenantContract.furnishing')}</label><span>{summary?.verifiedPropertyInfo.furnishing || contract.propertyFurnishing}</span></div>
                                        <div className="item full"><label>{t('tenantContract.address')}</label><span>{summary?.verifiedPropertyInfo.address || contract.propertyAddress}</span></div>
                                    </div>
                                </section>
                                <section className="auto-section">
                                    <div className="section-title"><DollarSign size={16} /> <h4>{t('tenantContract.paymentTerms')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('tenantContract.rent')}</label><span>${summary?.paymentTerms.rent ?? contract.amount}</span></div>
                                        <div className="item"><label>{t('tenantContract.securityDeposit')}</label><span>${summary?.paymentTerms.securityDeposit ?? contract.deposit}</span></div>
                                        <div className="item"><label>{t('tenantContract.serviceFee')}</label><span>${summary?.paymentTerms.serviceFee ?? 10}</span></div>
                                        <div className="item"><label>{t('tenantContract.schedule')}</label><span>{summary?.paymentTerms.schedule || 'MONTHLY'}</span></div>
                                    </div>
                                </section>
                                <section className="auto-section">
                                    <div className="section-title"><Clock size={16} /> <h4>{t('tenantContract.leaseDuration')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('tenantContract.moveIn')}</label><span>{summary?.leaseDuration.moveIn ? new Date(summary.leaseDuration.moveIn).toLocaleDateString() : contract.startDate}</span></div>
                                        <div className="item"><label>{t('tenantContract.durationLabel')}</label><span>{summary?.leaseDuration.durationMonths ? `${summary.leaseDuration.durationMonths} Months` : contract.duration}</span></div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: SIGNATURE */}
                    {step === 6 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('tenantContract.finalizeSign')}</h3>
                            {!savedSignature ? (
                                <div className="signature-trigger" onClick={() => setIsSignModalOpen(true)}>
                                    <Pencil size={24} />
                                    <p>{t('tenantContract.drawUploadSignature')}</p>
                                </div>
                            ) : (
                                <div className="signature-display-card">
                                    <div className="sig-header">
                                        <span>{t('tenantContract.verifiedSignature')}</span>
                                        <button onClick={() => setIsSignModalOpen(true)}>{t('tenantContract.change')}</button>
                                    </div>
                                    <div className="sig-preview">
                                        <img src={savedSignature} alt="Tenant Signature" />
                                    </div>
                                    <div className="sig-footer">
                                        <p><Globe size={12} /> Timestamped IP: 192.168.1.45 • {new Date().toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                            <div className="confirmation-check">
                                <input
                                    type="checkbox"
                                    id="final"
                                    checked={tenantData.confirmed}
                                    onChange={(e) => setTenantData({ ...tenantData, confirmed: e.target.checked })}
                                />
                                <label htmlFor="final">{t('tenantContract.agreeTerms')}</label>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="panel-footer-nav">
                    {step > 1 && (
                        <button className="btn-nav-secondary" onClick={handleBack}>
                            <ChevronLeft size={18} /> {t('tenantContract.back')}
                        </button>
                    )}
                    <button
                        className="btn-nav-primary"
                        disabled={
                            submitting ||
                            (step === 1 && (!tenantData.idFullName || !tenantData.idNumber || !tenantData.currentAddress || !tenantData.mainPhone)) ||
                            (step === 3 && (!tenantData.emergencyName || !tenantData.emergencyPhone)) ||
                            (step === 6 && (!savedSignature || !tenantData.confirmed))
                        }
                        onClick={step === 6 ? handleFinalExecute : handleNext}
                    >
                        {submitting ? t('tenantContract.saving') : step === 6 ? t('tenantContract.confirmExecute') : t('tenantContract.continue')} <ChevronRight size={18} />
                    </button>
                </footer>
            </div>

            <SignatureModal
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                onSave={handleSignatureSave}
            />
        </div>
    );
};

export default ContractDetailView;