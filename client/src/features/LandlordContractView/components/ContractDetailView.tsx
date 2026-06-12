import React, { useEffect, useState } from 'react';
import {
    X, ChevronRight, ChevronLeft, ShieldCheck, Pencil,
    Landmark, Zap, Ban, User, DollarSign, Cpu, Clock, Globe,
    Fingerprint, CheckCircle2, FileText, Scale, MoreVertical,
    Download, Share2, MessageSquare, History
} from 'lucide-react';
import { type LeaseContract } from '../pages/Contract';
import SignatureModal from './SignatureModal';
import contractService, { type VerificationSummary } from '../../../services/contract.service';
import authService from '../../../services/auth.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';
import './ContractDetailView.css';

interface Props {
    contract: LeaseContract;
    isReadOnly?: boolean;
    onUpdated?: () => void;
    onClose: () => void;
}

import { useTranslation } from 'react-i18next';

const ContractDetailView: React.FC<Props> = ({ contract, isReadOnly = false, onUpdated, onClose }) => {
    const { t } = useTranslation();
    const todayIso = new Date().toISOString().split('T')[0];
    const draftStorageKey = `homi:landlord-contract-step1:${contract.internalId}`;
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

    // Landlord Specific State for backend api compatibility
    const [landlordData, setLandlordData] = useState({
        idFullName: contract.landlord || '',
        idNumber: contract.landlordNationalId || '',
        currentAddress: '',
        mainPhone: '',
        contractDate: todayIso,
        ownershipRef: contract.propertyRegistrationNumber || 'NOT_PROVIDED',
        rentDueDate: contract.rentDueDate || '1ST_OF_MONTH',
        lateFee: String(contract.lateFeeAmount || 0),
        occupants: String(contract.maxOccupants || 1),
        confirmed: Boolean(contract.certifyOwnership) || isReadOnly,
        permittedUse: '',
        rightToEnter: '',
        noticePeriod: '',
        earlyTermination: '',
        eviction: '',
        tenantInsurance: '',
        landlordInsurance: '',
        governingLaw: '',
        disputeResolution: '',
        amendments: '',
        emergencyName: contract.tenantEmergencyContactName || '',
        emergencyPhone: contract.tenantEmergencyPhone || ''
    });
    const [step1Errors, setStep1Errors] = useState<Partial<Record<
        'idFullName' | 'idNumber' | 'currentAddress' | 'mainPhone' | 'contractDate' | 'emergencyName' | 'emergencyPhone' | 'lateFee' | 'occupants',
        string
    >>>({});

    useEffect(() => {
        if (isReadOnly) return;
        try {
            const raw = localStorage.getItem(draftStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<typeof landlordData>;
            setLandlordData((prev) => ({
                ...prev,
                ...parsed,
                // Contract date is always pinned to today's date.
                contractDate: todayIso,
            }));
        } catch {
            // Ignore malformed local drafts.
        }
    }, [draftStorageKey, isReadOnly, todayIso]);

    useEffect(() => {
        if (isReadOnly) return;
        localStorage.setItem(draftStorageKey, JSON.stringify(landlordData));
    }, [draftStorageKey, isReadOnly, landlordData]);

    const validateStep1 = (): boolean => {
        const errors: Partial<Record<
            'idFullName' | 'idNumber' | 'currentAddress' | 'mainPhone' | 'contractDate' | 'emergencyName' | 'emergencyPhone' | 'lateFee' | 'occupants',
            string
        >> = {};

        if (!landlordData.idFullName.trim()) {
            errors.idFullName = 'Name is required';
        } else if (!/^[\u0600-\u06FF\s]+$/.test(landlordData.idFullName.trim())) {
            errors.idFullName = 'Name must be Arabic letters only';
        }

        if (!/^\d{14}$/.test(landlordData.idNumber.trim())) {
            errors.idNumber = 'National ID must be exactly 14 digits';
        }

        if (!landlordData.currentAddress.trim()) {
            errors.currentAddress = 'Current address is required';
        }

        if (!landlordData.mainPhone.trim()) {
            errors.mainPhone = 'Main phone is required';
        } else if (!/^\+?\d{8,15}$/.test(landlordData.mainPhone.trim())) {
            errors.mainPhone = 'Enter a valid phone number';
        }

        if (landlordData.contractDate !== todayIso) {
            errors.contractDate = 'Contract date must be today';
        }

        if (!landlordData.emergencyName.trim()) {
            errors.emergencyName = 'Emergency contact name is required';
        }

        if (!landlordData.emergencyPhone.trim()) {
            errors.emergencyPhone = 'Emergency phone is required';
        } else if (!/^\+?\d{8,15}$/.test(landlordData.emergencyPhone.trim())) {
            errors.emergencyPhone = 'Enter a valid emergency phone number';
        }

        const lateFee = Number(landlordData.lateFee);
        if (!Number.isFinite(lateFee) || lateFee < 0) {
            errors.lateFee = 'Late fee must be 0 or greater';
        }

        const occupants = Number(landlordData.occupants);
        if (!Number.isInteger(occupants) || occupants < 1) {
            errors.occupants = 'Max occupants must be at least 1';
        }

        setStep1Errors(errors);
        return Object.keys(errors).length === 0;
    };

    const toDueDateEnum = (value: string): '1ST_OF_MONTH' | '5TH_OF_MONTH' | 'LAST_DAY_OF_MONTH' => {
        if (value === '5TH_OF_MONTH') return '5TH_OF_MONTH';
        if (value === 'LAST_DAY_OF_MONTH') return 'LAST_DAY_OF_MONTH';
        return '1ST_OF_MONTH';
    };

    const handleNext = async () => {
        if (isReadOnly) {
            if (step === 4 && !summary) {
                try {
                    setSubmitting(true);
                    const response = await contractService.getVerificationSummary(contract.internalId);
                    setSummary(response.data);
                } catch (error) {
                    console.error('Failed to load verification summary', error);
                } finally {
                    setSubmitting(false);
                }
            }
            setStep((s) => Math.min(s + 1, 6));
            return;
        }

        try {
            if (step === 1 && !validateStep1()) {
                return;
            }
            setSubmitting(true);
            if (step === 1) {
                await contractService.updateLeaseTerms(contract.internalId, {
                    rent_due_date: toDueDateEnum(landlordData.rentDueDate),
                    late_fee_amount: Number(landlordData.lateFee),
                    max_occupants: Number(landlordData.occupants),
                    emergency_contact_name: landlordData.emergencyName,
                    emergency_phone: landlordData.emergencyPhone,
                });
            }

            if (step === 2) {
                await contractService.updateLandlordIdentity(contract.internalId, {
                    national_id: landlordData.idNumber,
                });
            }

            if (step === 3) {
                await contractService.updatePropertyConfirmation(contract.internalId, {
                    property_registration_number: landlordData.ownershipRef,
                });
            }

            if (step === 4) {
                const response = await contractService.getVerificationSummary(contract.internalId);
                setSummary(response.data);
            }

            setStep((s) => s + 1);
            if (step === 1) {
                setStep1Errors({});
            }
            onUpdated?.();
        } catch (error) {
            console.error('Failed to submit contract step', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => setStep(s => s - 1);

    const handleSign = async () => {
        if (isReadOnly) return;
        if (!savedSignature || !landlordData.confirmed) return;
        setSubmitting(true);
        try {
            await contractService.signLandlordContract(contract.internalId, {
                signature_url: savedSignature,
                certify_ownership: true,
            });
            localStorage.removeItem(draftStorageKey);
            setIsFinalized(true);
            onUpdated?.();
        } catch (error) {
            console.error('Failed to sign contract', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (isFinalized) {
        return (
            <div className="contract-overlay" dir="ltr">
                <div className="detail-panel success-panel animate-slide-in">
                    <div className="success-content">
                        <div className="success-icon-badge"><CheckCircle2 size={60} /></div>
                        <h2>{t('landlordContract.signatureRecorded')}</h2>
                        <p>{t('landlordContract.signatureDesc', { property: contract.property })}</p>
                        <div className="success-actions">
                            <button className="btn-close-dashboard" onClick={onClose}>{t('landlordContract.returnPortfolio')}</button>
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
                        <span>{t('landlordContract.panelTitle')} • {contract.property}</span>
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

                    {step === 1 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('landlordContract.contractDetails')}</h3>

                            <section className="info-section">
                                <div className="section-title"><Fingerprint size={16} /> <h4>1. {t('landlordContract.identityDate')}</h4></div>
                                <div className="input-grid">
                                    <div className="input-group">
                                        <label>{t('landlordContract.nationalIdFullName')}</label>
                                        <input
                                            className={isReadOnly ? 'readonly-field' : ''}
                                            disabled={isReadOnly}
                                            type="text"
                                            placeholder="الاسم الكامل باللغة العربية"
                                            value={landlordData.idFullName}
                                            onChange={e => {
                                                const value = e.target.value;
                                                if (/^[\u0600-\u06FF\s]*$/.test(value)) {
                                                    setLandlordData({ ...landlordData, idFullName: value });
                                                }
                                            }}
                                            style={{ direction: 'rtl' }}
                                        />
                                        {step1Errors.idFullName && <small style={{ color: '#dc2626' }}>{step1Errors.idFullName}</small>}
                                    </div>
                                    <div className="input-group">
                                        <label>{t('landlordContract.nationalIdNumber')}</label>
                                        <input
                                            className={isReadOnly ? 'readonly-field' : ''}
                                            disabled={isReadOnly}
                                            type="text"
                                            placeholder="2990101XXXXXXXX"
                                            maxLength={14}
                                            value={landlordData.idNumber}
                                            onChange={e => {
                                                const value = e.target.value;
                                                if (/^\d*$/.test(value)) {
                                                    setLandlordData({ ...landlordData, idNumber: value });
                                                }
                                            }}
                                        />
                                        {step1Errors.idNumber && <small style={{ color: '#dc2626' }}>{step1Errors.idNumber}</small>}
                                    </div>
                                    <div className="input-group full">
                                        <label>{t('landlordContract.currentAddress')}</label>
                                        <input className={isReadOnly ? 'readonly-field' : ''} disabled={isReadOnly} type="text" placeholder={t('landlordContract.currentAddressPlaceholder')} value={landlordData.currentAddress} onChange={e => setLandlordData({ ...landlordData, currentAddress: e.target.value })} />
                                        {step1Errors.currentAddress && <small style={{ color: '#dc2626' }}>{step1Errors.currentAddress}</small>}
                                    </div>
                                    <div className="input-group">
                                        <label>{t('landlordContract.mainPhone')}</label>
                                        <input
                                            className={isReadOnly ? 'readonly-field' : ''}
                                            disabled={isReadOnly}
                                            type="text"
                                            value={landlordData.mainPhone}
                                            onChange={(e) => setLandlordData({ ...landlordData, mainPhone: e.target.value })}
                                        />
                                        {step1Errors.mainPhone && <small style={{ color: '#dc2626' }}>{step1Errors.mainPhone}</small>}
                                    </div>
                                    <div className="input-group">
                                        <label>{t('landlordContract.contractDate')}</label>
                                        <input className={isReadOnly ? 'readonly-field' : ''} disabled type="date" value={todayIso} readOnly />
                                        {step1Errors.contractDate && <small style={{ color: '#dc2626' }}>{step1Errors.contractDate}</small>}
                                    </div>
                                    <div className="input-group">
                                        <label>{t('landlordContract.emergencyContactName')}</label>
                                        <input className={isReadOnly ? 'readonly-field' : ''} disabled={isReadOnly} type="text" value={landlordData.emergencyName} onChange={(e) => setLandlordData({ ...landlordData, emergencyName: e.target.value })} />
                                        {step1Errors.emergencyName && <small style={{ color: '#dc2626' }}>{step1Errors.emergencyName}</small>}
                                    </div>
                                    <div className="input-group">
                                        <label>{t('landlordContract.emergencyPhone')}</label>
                                        <input className={isReadOnly ? 'readonly-field' : ''} disabled={isReadOnly} type="tel" value={landlordData.emergencyPhone} onChange={(e) => setLandlordData({ ...landlordData, emergencyPhone: e.target.value })} />
                                        {step1Errors.emergencyPhone && <small style={{ color: '#dc2626' }}>{step1Errors.emergencyPhone}</small>}
                                    </div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><User size={16} /> <h4>2. {t('landlordContract.partiesInvolved')}</h4></div>
                                <div className="autofill-grid">
                                    <div className="field full"><label>{t('landlordContract.landlordOwner')}</label><span>{contract.landlord} • {contract.landlordEmail}</span></div>
                                    <div className="field full"><label>{t('landlordContract.tenantRenter')}</label><span>{contract.tenant} • {contract.tenantEmail || '—'}</span></div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><Landmark size={16} /> <h4>3. {t('landlordContract.propertyDetails')}</h4></div>
                                <div className="autofill-grid">
                                    <div className="field full"><label>{t('landlordContract.address')}</label><span>{contract.propertyAddress}</span></div>
                                    <div className="field full"><label>{t('landlordContract.description')}</label><span>{contract.propertyType} • {contract.propertyFurnishing}</span></div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><Clock size={16} /> <h4>4. {t('landlordContract.leaseTerm')}</h4></div>
                                <div className="autofill-grid">
                                    <div className="field"><label>{t('landlordContract.startDate')}</label><span>{contract.startDate}</span></div>
                                    <div className="field"><label>{t('landlordContract.endDate')}</label><span>{contract.duration}</span></div>
                                </div>

                            </section>
                        </div>
                    )}

                    {/* STEP 2: USE OF PROPERTY & ENTRY */}
                    {step === 2 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('landlordContract.rulesAllowances')}</h3>
                            <section className="info-section">
                                <div className="section-title"><ShieldCheck size={16} /> <h4>6. {t('landlordContract.useOfPropertyTitle')}</h4></div>
                                <div className="input-group">
                                    <label>{t('landlordContract.permittedUse')}</label>
                                    <select
                                        className={isReadOnly ? 'readonly-field' : ''}
                                        disabled={isReadOnly}
                                        value={landlordData.permittedUse}
                                        onChange={e => setLandlordData({ ...landlordData, permittedUse: e.target.value })}
                                    >
                                        <option value="">{t('landlordContract.selectPermittedUse')}</option>
                                        <option value="Residential purposes only">{t('landlordContract.residentialOnly')}</option>
                                        <option value="Residential and home office use">{t('landlordContract.residentialHomeOffice')}</option>
                                        <option value="Single-family occupancy only">{t('landlordContract.singleFamily')}</option>
                                        <option value="Temporary holiday lodging">{t('landlordContract.holidayLodging')}</option>
                                        <option value="Professional consulting services">{t('landlordContract.consulting')}</option>
                                        <option value="Artist studio and private residence">{t('landlordContract.artistStudio')}</option>
                                        <option value="Educational and tutoring activities">{t('landlordContract.educational')}</option>
                                        <option value="Shared co-living arrangement">{t('landlordContract.coLiving')}</option>
                                        <option value="Short-term corporate housing">{t('landlordContract.corporate')}</option>
                                        <option value="Quiet home-based business (no clients)">{t('landlordContract.homeBusiness')}</option>
                                    </select>
                                </div>
                            </section>
                            <section className="info-section">
                                <div className="section-title"><Globe size={16} /> <h4>7. {t('landlordContract.entryInspection')}</h4></div>
                                <div className="input-group">
                                    <label>{t('landlordContract.rightToEnter')}</label>
                                    <select
                                        className={isReadOnly ? 'readonly-field' : ''}
                                        disabled={isReadOnly}
                                        value={landlordData.rightToEnter}
                                        onChange={e => setLandlordData({ ...landlordData, rightToEnter: e.target.value })}
                                    >
                                        <option value="">{t('landlordContract.selectConditions')}</option>
                                        <option value="Maintenance, emergencies, and inspections">{t('landlordContract.maintenanceEmergencies')}</option>
                                        <option value="Emergencies and repairs only">{t('landlordContract.emergenciesOnly')}</option>
                                        <option value="With prior tenant consent only">{t('landlordContract.tenantConsentOnly')}</option>
                                        <option value="Routine inspections every 6 months">{t('landlordContract.routineInspections')}</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>{t('landlordContract.noticePeriod')}</label>
                                    <select
                                        className={isReadOnly ? 'readonly-field' : ''}
                                        disabled={isReadOnly}
                                        value={landlordData.noticePeriod}
                                        onChange={e => setLandlordData({ ...landlordData, noticePeriod: e.target.value })}
                                    >
                                        <option value="">{t('landlordContract.selectNoticePeriod')}</option>
                                        <option value="24 hours written notice">{t('landlordContract.notice24h')}</option>
                                        <option value="48 hours written notice">{t('landlordContract.notice48h')}</option>
                                        <option value="72 hours written notice">{t('landlordContract.notice72h')}</option>
                                        <option value="Emergency access only (no notice)">{t('landlordContract.emergencyAccessOnly')}</option>
                                    </select>
                                </div>
                                <div className="input-group" style={{ marginTop: '20px' }}>
                                    <label>{t('landlordContract.lateFeeAmount')}</label>
                                    <input
                                        className={isReadOnly ? 'readonly-field' : ''}
                                        disabled={isReadOnly}
                                        type="number"
                                        placeholder="e.g. 50"
                                        value={landlordData.lateFee}
                                        onChange={e => setLandlordData({ ...landlordData, lateFee: e.target.value })}
                                    />
                                    {step1Errors.lateFee && <small style={{ color: '#dc2626' }}>{step1Errors.lateFee}</small>}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STEP 3: MAINTENANCE RESPONSIBILITIES */}
                    {step === 3 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('landlordContract.maintenanceResponsibilities')}</h3>
                            <section className="info-section">
                                <div className="section-title"><Zap size={16} /> <h4>{t('landlordContract.maintenanceAllocation')}</h4></div>
                                <div className="responsibility-box scrollable">
                                    {maintenanceResponsibilities.length > 0 ? (
                                        maintenanceResponsibilities.map((item, idx) => (
                                            <div key={`${item.area}-${idx}`} className="resp-row">
                                                <span>{t('myProperties.maintenanceTypes.' + item.area, item.area)}</span>
                                                <span className={`owner-badge ${item.responsible_party === 'LANDLORD' ? 'landlord' : 'tenant'}`}>
                                                    {item.responsible_party === 'LANDLORD' ? t('landlordContract.landlordBadge') : t('landlordContract.tenantBadge')}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="resp-row"><span>{t('landlordContract.noMaintenanceRequirements')}</span><span className="owner-badge tenant">N/A</span></div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STEP 4: RENTAL AGREEMENT TERMS */}
                    {step === 4 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('landlordContract.rentalAgreementTerms')}</h3>

                            <section className="info-section">
                                <div className="section-title"><User size={16} /> <h4>{t('landlordContract.introduction')}</h4></div>
                                <div className="legal-term-box">
                                    <p>{t('landlordContract.agreementMadeBetween')}</p>
                                    <div className="party-details">
                                        <div className="party">
                                            <strong>{t('landlordContract.lessor')}</strong>
                                            <span>{landlordData.idFullName || contract.landlord}</span>
                                            <span>{t('landlordContract.idLabel')} {landlordData.idNumber || '—'}</span>
                                            <span>{t('landlordContract.addressLabel')} {landlordData.currentAddress || '—'}</span>
                                        </div>
                                        <div className="party">
                                            <strong>{t('landlordContract.lessee')}</strong>
                                            <span>{contract.tenant}</span>
                                            <span>{t('landlordContract.idLabel')} {contract.tenantNationalId || '—'}</span>
                                            <span>{t('landlordContract.addressLabel')} {contract.tenantAddress || contract.propertyAddress || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="info-section">
                                <div className="section-title"><Scale size={16} /> <h4>{t('landlordContract.mainClauses')}</h4></div>
                                <div className="legal-clauses-list">
                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause1Title')}</label>
                                        <p>{t('landlordContract.clause1Text', { address: contract.propertyAddress, type: contract.propertyType })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause2Title')}</label>
                                        <p>{t('landlordContract.clause2Text', { startDate: contract.startDate, duration: contract.duration })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause3Title')}</label>
                                        <p>{t('landlordContract.clause3Text', { amount: `$${contract.amount}` })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause4Title')}</label>
                                        <p>{t('landlordContract.clause4Text', { deposit: `$${contract.deposit}` })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause5Title')}</label>
                                        <p>{t('landlordContract.clause5Text', { lateFee: `$${landlordData.lateFee || 0}` })}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause6Title')}</label>
                                        <p>{t('landlordContract.clause6Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause7Title')}</label>
                                        <p>{t('landlordContract.clause7Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause8Title')}</label>
                                        <p>{t('landlordContract.clause8Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause9Title')}</label>
                                        <p>{t('landlordContract.clause9Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause10Title')}</label>
                                        <p>{t('landlordContract.clause10Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause11Title')}</label>
                                        <p>{t('landlordContract.clause11Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause12Title')}</label>
                                        <p>{t('landlordContract.clause12Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause13Title')}</label>
                                        <p>{t('landlordContract.clause13Text')}</p>
                                    </div>

                                    <div className="legal-clause">
                                        <label>{t('landlordContract.clause14Title')}</label>
                                        <p>{t('landlordContract.clause14Text')}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STEP 5: SUMMARY */}
                    {step === 5 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('landlordContract.platformVerificationSummary')}</h3>
                            <div className="homi-auto-box">
                                <section className="auto-section">
                                    <div className="section-title"><Cpu size={16} /> <h4>{t('landlordContract.platformMetadata')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('landlordContract.contractId')}</label><span>{summary?.platformMetadata.contractId || contract.id}</span></div>
                                        <div className="item"><label>{t('landlordContract.created')}</label><span>{summary?.platformMetadata.created ? new Date(summary.platformMetadata.created).toLocaleDateString() : new Date(contract.createdAt).toLocaleDateString()}</span></div>
                                        <div className="item"><label>{t('landlordContract.leaseId')}</label><span>{summary?.platformMetadata.leaseId || '—'}</span></div>
                                    </div>
                                </section>
                                <section className="auto-section">
                                    <div className="section-title"><Landmark size={16} /> <h4>{t('landlordContract.verifiedPropertyInfo')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('landlordContract.title')}</label><span>{summary?.verifiedPropertyInfo.title || contract.property}</span></div>
                                        <div className="item"><label>{t('landlordContract.type')}</label><span>{summary?.verifiedPropertyInfo.type || contract.propertyType}</span></div>
                                        <div className="item"><label>{t('landlordContract.rooms')}</label><span>{summary?.verifiedPropertyInfo.rooms || 'N/A'}</span></div>
                                        <div className="item"><label>{t('landlordContract.furnishing')}</label><span>{summary?.verifiedPropertyInfo.furnishing || contract.propertyFurnishing}</span></div>
                                        <div className="item full"><label>{t('landlordContract.address')}</label><span>{summary?.verifiedPropertyInfo.address || contract.propertyAddress}</span></div>
                                    </div>
                                </section>
                                <section className="auto-section">
                                    <div className="section-title"><DollarSign size={16} /> <h4>{t('landlordContract.paymentTerms')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('landlordContract.rent')}</label><span>${summary?.paymentTerms.rent ?? contract.amount}</span></div>
                                        <div className="item"><label>{t('landlordContract.securityDeposit')}</label><span>${summary?.paymentTerms.securityDeposit ?? contract.deposit}</span></div>
                                        <div className="item"><label>{t('landlordContract.serviceFee')}</label><span>${summary?.paymentTerms.serviceFee ?? 10}</span></div>
                                        <div className="item"><label>{t('landlordContract.schedule')}</label><span>{summary?.paymentTerms.schedule || 'MONTHLY'}</span></div>
                                    </div>
                                </section>
                                <section className="auto-section">
                                    <div className="section-title"><Clock size={16} /> <h4>{t('landlordContract.leaseDuration')}</h4></div>
                                    <div className="mini-grid">
                                        <div className="item"><label>{t('landlordContract.moveIn')}</label><span>{summary?.leaseDuration.moveIn ? new Date(summary.leaseDuration.moveIn).toLocaleDateString() : contract.startDate}</span></div>
                                        <div className="item"><label>{t('landlordContract.durationLabel')}</label><span>{summary?.leaseDuration.durationMonths ? `${summary.leaseDuration.durationMonths} Months` : contract.duration}</span></div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: SIGNATURE */}
                    {step === 6 && (
                        <div className="step-view animate-fade-in">
                            <h3 className="step-heading">{t('landlordContract.finalizeSign')}</h3>
                            {isReadOnly ? (
                                <div className="ownership-notice">
                                    <ShieldCheck size={20} />
                                    <p>{t('landlordContract.viewOnlyNotice')}</p>
                                </div>
                            ) : !savedSignature ? (
                                <div className="signature-trigger" onClick={() => setIsSignModalOpen(true)}>
                                    <Pencil size={24} />
                                    <p>{t('landlordContract.drawUploadSignature')}</p>
                                </div>
                            ) : (
                                <div className="signature-display-card">
                                    <div className="sig-header"><span>{t('landlordContract.verifiedSignature')}</span><button onClick={() => setIsSignModalOpen(true)}>{t('landlordContract.change')}</button></div>
                                    <div className="sig-preview"><img src={savedSignature} alt="Landlord Signature" /></div>
                                    <div className="sig-footer"><p><Globe size={12} /> Secure IP: 192.168.1.45 • {new Date().toLocaleString()}</p></div>
                                </div>
                            )}
                            <div className="confirmation-check">
                                <input className={isReadOnly ? 'readonly-checkbox' : ''} disabled={isReadOnly} type="checkbox" id="landlord-final" checked={landlordData.confirmed} onChange={(e) => setLandlordData({ ...landlordData, confirmed: e.target.checked })} />
                                <label className={isReadOnly ? 'readonly-label' : ''} htmlFor="landlord-final">{t('landlordContract.certifyText')}</label>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="panel-footer-nav">
                    {step > 1 && <button className="btn-nav-secondary" onClick={handleBack}><ChevronLeft size={18} /> {t('landlordContract.back')}</button>}
                    <button
                        className="btn-nav-primary"
                        disabled={
                            (!isReadOnly && (step === 6 && (!savedSignature || !landlordData.confirmed))) ||
                            submitting
                        }
                        onClick={step === 6 ? (isReadOnly ? onClose : handleSign) : handleNext}
                    >
                        {submitting ? t('landlordContract.saving') : step === 6 ? (isReadOnly ? t('landlordContract.close') : t('landlordContract.signAgreement')) : t('landlordContract.continue')} <ChevronRight size={18} />
                    </button>
                </footer>
            </div>

            {!isReadOnly && (
                <SignatureModal isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} onSave={(sig) => { setSavedSignature(sig); setIsSignModalOpen(false); }} />
            )}
        </div>
    );
};

export default ContractDetailView;