import React from 'react';
import { 
    X, CheckCircle2, Download, 
    User, DollarSign, Calendar, MapPin, 
    ShieldCheck, Clock, Building2, Eye, Receipt,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { type LeaseContract } from '../pages/Contract';
import './ActiveLeaseContract.css';

interface Props {
    contract: LeaseContract;
    onClose: () => void;
}

import { useTranslation } from 'react-i18next';
import pdfService from '../../../services/pdf.service';
import contractService, { type TenantPaymentHistoryItem } from '../../../services/contract.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';

const ActiveLeaseContract: React.FC<Props> = ({ contract, onClose }) => {
    const { t } = useTranslation();
    const landlordNameAr = contract.landlordEmail ? (localStorage.getItem('arabicName_email_' + contract.landlordEmail) || undefined) : undefined;
    const tenantNameAr = contract.tenantEmail ? (localStorage.getItem('arabicName_email_' + contract.tenantEmail) || undefined) : undefined;
    const [previewLang, setPreviewLang] = React.useState<'en' | 'ar' | null>(null);
    const [currentPreviewPage, setCurrentPreviewPage] = React.useState(1);
    const [recentReceipt, setRecentReceipt] = React.useState<TenantPaymentHistoryItem | null>(null);
    const [loadingReceipt, setLoadingReceipt] = React.useState(true);

    // Reset page when lang changes
    React.useEffect(() => {
        if (previewLang) setCurrentPreviewPage(1);
    }, [previewLang]);

    React.useEffect(() => {
        const fetchRecentPayment = async () => {
            try {
                const history = await contractService.getPaymentHistory(10);
                // For landlord, we look for CREDITS related to this contract
                const contractPayments = history.filter(h => h.entityId === contract.internalId && h.direction === 'CREDIT');
                if (contractPayments.length > 0) {
                    setRecentReceipt(contractPayments[0]);
                }
            } catch (err) {
                console.error('Failed to fetch payment history:', err);
            } finally {
                setLoadingReceipt(false);
            }
        };
        void fetchRecentPayment();
    }, [contract.internalId]);

    const handleDownloadPDF = async (lang: 'en' | 'ar') => {
        const pdfData = {
            id: contract.id,
            property: contract.property,
            propertyAddress: contract.propertyAddress,
            propertyType: contract.propertyType,
            landlord: contract.landlord,
            landlordNameAr,
            landlordNationalId: contract.landlordNationalId,
            landlordAddress: contract.landlordAddress || 'Cairo, Egypt',
            tenant: contract.tenant,
            tenantNameAr,
            tenantNationalId: contract.tenantNationalId,
            tenantAddress: contract.tenantAddress || contract.propertyAddress,
            startDate: contract.startDate,
            duration: contract.duration,
            amount: contract.amount,
            deposit: contract.deposit,
            lateFeeAmount: contract.lateFeeAmount,
            permittedUse: contract.permittedUse || 'Residential purposes only',
            rightToEnter: contract.rightToEnter || 'With 24h notice',
            noticePeriod: contract.noticePeriod || '24 Hours',
            maintenanceResponsibilities: contract.maintenanceResponsibilities,
            landlordSignature: contract.landlordSignature,
            tenantSignature: contract.tenantSignature,
            executionDate: new Date(contract.createdAt).toLocaleDateString(),
        };
        await pdfService.generateContractPDF(pdfData as any, lang);
    };

    // Localization Helpers for Preview
    const toArNum = (val: string | number | undefined | null, forceAr = false) => {
        if (val === undefined || val === null) return '—';
        if (!forceAr) return val.toString();
        return val.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
    };

    const translateDate = (dateStr: string | undefined | null, forceAr = false) => {
        if (!dateStr) return '—';
        if (!forceAr) return dateStr;
        const monthsAr: { [key: string]: string } = {
            'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس', 'Apr': 'أبريل', 'May': 'مايو', 'Jun': 'يونيو',
            'Jul': 'يوليو', 'Aug': 'أغسطس', 'Sep': 'سبتمبر', 'Oct': 'أكتوبر', 'Nov': 'نوفمبر', 'Dec': 'ديسمبر',
            'January': 'يناير', 'February': 'فبراير', 'March': 'مارس', 'April': 'أبريل', 'June': 'يونيو',
            'July': 'يوليو', 'August': 'أغسطس', 'September': 'سبتمبر', 'October': 'أكتوبر', 'November': 'نوفمبر', 'December': 'ديسمبر'
        };
        let res = dateStr;
        Object.keys(monthsAr).forEach(m => {
            res = res.replace(new RegExp(m, 'gi'), monthsAr[m]);
        });
        return toArNum(res, true);
    };

    const formatDurationAr = (durationStr: string | undefined | null, forceAr = false) => {
        if (!durationStr) return '—';
        if (!forceAr) return durationStr;
        const numMatch = durationStr.match(/\d+/);
        if (!numMatch) return durationStr;
        const n = parseInt(numMatch[0]);
        const isMonth = durationStr.toLowerCase().includes('month');
        const isYear = durationStr.toLowerCase().includes('year');
        if (isMonth) {
            if (n === 1) return 'شهر واحد';
            if (n === 2) return 'شهرين';
            if (n >= 3 && n <= 10) return `${toArNum(n, true)} شهور`;
            return `${toArNum(n, true)} شهر`;
        }
        if (isYear) {
            if (n === 1) return 'سنة واحدة';
            if (n === 2) return 'سنتين';
            if (n >= 3 && n <= 10) return `${toArNum(n, true)} سنوات`;
            return `${toArNum(n, true)} سنة`;
        }
        return toArNum(durationStr, true);
    };

    const localizedPreview = {
        id: toArNum(contract.id, previewLang === 'ar'),
        amount: toArNum(contract.amount, previewLang === 'ar'),
        deposit: toArNum(contract.deposit, previewLang === 'ar'),
        lateFee: toArNum(contract.lateFeeAmount || 0, previewLang === 'ar'),
        startDate: translateDate(contract.startDate, previewLang === 'ar'),
        duration: formatDurationAr(contract.duration, previewLang === 'ar'),
        propertyType: previewLang === 'ar' ? 'وحدة سكنية' : (contract.propertyType || 'Residential'),
        permittedUse: previewLang === 'ar' ? 'للسكن فقط' : (contract.permittedUse || 'Residential'),
        rightToEnter: previewLang === 'ar' ? 'بإخطار مسبق ٢٤ ساعة' : (contract.rightToEnter || 'With 24h Notice'),
        notice: previewLang === 'ar' ? '٢٤ ساعة' : (contract.noticePeriod || '24 Hours'),
        executionDate: translateDate(new Date(contract.createdAt).toLocaleDateString(), previewLang === 'ar')
    };

    return (
        <div className="active-contract-overlay" dir="ltr">
            <div className="active-detail-panel animate-slide-in-panel">
                <header className="active-panel-header">
                    <div className="header-status-badge">
                        <CheckCircle2 size={16} />
                        <span>{t('activeLease.activeLease')}</span>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Close panel">
                        <X size={20}/>
                    </button>
                </header>

                <div className="active-panel-content">
                    <div className="contract-header-info">
                        <h2>{contract.property}</h2>
                        <p className="contract-id-ref">{t('activeLease.contractReference')}: {contract.id}</p>
                    </div>

                    <div className="action-ribbon">
                        <button className="btn-secondary-action" onClick={() => handleDownloadPDF('en')}>
                            <Download size={16} /> {t('activeLease.downloadPDF')} (EN)
                        </button>
                        <button className="btn-secondary-action" onClick={() => handleDownloadPDF('ar')}>
                            <Download size={16} /> {t('activeLease.downloadPDF')} (AR)
                        </button>
                        <button className="btn-secondary-action" onClick={() => setPreviewLang('en')}>
                            <Eye size={16} /> {t('activeLease.viewContract')} (EN)
                        </button>
                        <button className="btn-secondary-action" onClick={() => setPreviewLang('ar')}>
                            <Eye size={16} /> {t('activeLease.viewContract')} (AR)
                        </button>
                    </div>

                    <div className="info-cards-grid">
                        {/* Lease Terms Card */}
                        <section className="info-card">
                            <div className="card-header">
                                <Calendar size={18} className="icon-blue" />
                                <h3>{t('activeLease.leaseTerms')}</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">{t('activeLease.startDate')}</span>
                                    <span className="value">{contract.startDate}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('activeLease.duration')}</span>
                                    <span className="value">{contract.duration}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('activeLease.status')}</span>
                                    <span className="value status-active">{t('activeLease.inEffect')}</span>
                                </div>
                            </div>
                        </section>

                        {/* Financials Card */}
                        <section className="info-card">
                            <div className="card-header">
                                <DollarSign size={18} className="icon-green" />
                                <h3>{t('activeLease.financials')}</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">{t('activeLease.monthlyRent')}</span>
                                    <span className="value highlight">${contract.amount}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('activeLease.securityDeposit')}</span>
                                    <span className="value">${contract.deposit}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('activeLease.nextPayment')}</span>
                                    <span className="value">{contract.rentDueDate.replaceAll('_', ' ')}</span>
                                </div>
                            </div>
                        </section>

                        {/* Parties Involved Card */}
                        <section className="info-card full-width">
                            <div className="card-header">
                                <User size={18} className="icon-purple" />
                                <h3>{t('activeLease.partiesInvolved')}</h3>
                            </div>
                            <div className="card-content multi-col">
                                <div className="party-box">
                                    <span className="party-role">{t('activeLease.tenant')}</span>
                                    <span className="party-name">{contract.tenant}</span>
                                    <span className="party-status"><ShieldCheck size={14}/> {t('activeLease.verified')}</span>
                                    {contract.tenantEmergencyContactName && (
                                        <div className="emergency-info-sub">
                                            <span className="sub-label">{t('activeLease.emergencyContact') || 'Emergency Contact'}:</span>
                                            <span className="sub-value">{contract.tenantEmergencyContactName}</span>
                                            <span className="sub-value phone">{contract.tenantEmergencyPhone}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="party-box">
                                    <span className="party-role">{t('activeLease.landlord')}</span>
                                    <span className="party-name">{contract.landlord}</span>
                                    <span className="party-status"><ShieldCheck size={14}/> {t('activeLease.verified')}</span>
                                </div>
                            </div>
                        </section>

                        {/* Property Details Card */}
                        <section className="info-card full-width">
                            <div className="card-header">
                                <Building2 size={18} className="icon-orange" />
                                <h3>{t('activeLease.propertyDetails')}</h3>
                            </div>
                            <div className="card-content">
                                <div className="data-row">
                                    <span className="label">{t('activeLease.address')}</span>
                                    <span className="value flex-value"><MapPin size={14}/> {contract.propertyAddress}</span>
                                </div>
                                <div className="data-row">
                                    <span className="label">{t('activeLease.usage')}</span>
                                    <span className="value">{contract.propertyType}</span>
                                </div>
                            </div>
                        </section>

                        {/* Recent Payment Receipt Card (Landlord View) */}
                        <section className="info-card full-width">
                            <div className="card-header">
                                <Receipt size={18} className="icon-green" />
                                <h3>{t('activeLease.recentPaymentReceived')}</h3>
                            </div>
                            <div className="card-content">
                                {loadingReceipt ? (
                                    <div className="loading-state">Loading...</div>
                                ) : recentReceipt ? (
                                    <div className="receipt-display-box">
                                        <div className="receipt-main-info">
                                            <div className="receipt-col">
                                                <span className="label">{t('activeLease.dateReceived')}</span>
                                                <span className="value">{new Date(recentReceipt.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="receipt-col">
                                                <span className="label">{t('activeLease.reference')}</span>
                                                <span className="value">{recentReceipt.reference}</span>
                                            </div>
                                            <div className="receipt-col">
                                                <span className="label">{t('activeLease.totalCredit')}</span>
                                                <span className="value highlight">${recentReceipt.amount}</span>
                                            </div>
                                        </div>
                                        <div className="receipt-breakdown">
                                            <div className="breakdown-row">
                                                <span>{t('activeLease.monthlyRent')}</span>
                                                <span>${contract.amount}</span>
                                            </div>
                                            {recentReceipt.type === 'CONTRACT_INITIAL' && (
                                                <div className="breakdown-row">
                                                    <span>{t('activeLease.securityDeposit')}</span>
                                                    <span>${contract.deposit}</span>
                                                </div>
                                            )}
                                            <div className="breakdown-row-note">
                                                <p>* {t('activeLease.landlordReceiptNote')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="no-receipt-state">{t('activeLease.noReceiptFound')}</div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="execution-footer">
                        <Clock size={16} />
                        <p>{t('activeLease.executionNote')}</p>
                    </div>
                </div>
            </div>

            {previewLang && (
                <div className="contract-preview-overlay">
                    <div className="preview-container animate-fade-in">
                        <header className="preview-header">
                            <div className="header-left">
                                <h3>{t('activeLease.contractPreview')} ({previewLang.toUpperCase()})</h3>
                                <span className="page-indicator">Page {currentPreviewPage} of 2</span>
                            </div>
                            <div className="header-actions">
                                <div className="pagination-controls">
                                    <button 
                                        className="icon-btn" 
                                        disabled={currentPreviewPage === 1}
                                        onClick={() => setCurrentPreviewPage(1)}
                                    >
                                        <ChevronLeft size={20}/>
                                    </button>
                                    <button 
                                        className="icon-btn" 
                                        disabled={currentPreviewPage === 2}
                                        onClick={() => setCurrentPreviewPage(2)}
                                    >
                                        <ChevronRight size={20}/>
                                    </button>
                                </div>
                                <button className="icon-btn close-preview" onClick={() => setPreviewLang(null)}><X size={20}/></button>
                            </div>
                        </header>
                        <div className="preview-body">
                            <div className="preview-document" dir={previewLang === 'ar' ? 'rtl' : 'ltr'}>
                                {currentPreviewPage === 1 ? (
                                    <>
                                        <div className="pdf-header-preview">
                                            <h1>{previewLang === 'en' ? 'RESIDENTIAL LEASE AGREEMENT' : 'عقد إيجار وحدة سكنية'}</h1>
                                            <div className="ref-no">{previewLang === 'en' ? 'Contract Ref' : 'رقم مرجع العقد'}: {localizedPreview.id}</div>
                                        </div>
                                        
                                        {/* Section 1: Parties */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '1. PARTIES INVOLVED' : '١. أطراف التعاقد'}</div>
                                            <div className="pdf-data-grid">
                                                <div className="pdf-party-card">
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Lessor (Landlord)' : 'المؤجر (الطرف الأول)'}</span>
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{previewLang === 'ar' ? (landlordNameAr || contract.landlord) : contract.landlord}</span><br/>
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract.landlordNationalId)}</span><br/>
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract.landlordAddress || '—'}</span>
                                                </div>
                                                <div className="pdf-party-card">
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Lessee (Tenant)' : 'المستأجر (الطرف الثاني)'}</span>
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{previewLang === 'ar' ? (tenantNameAr || contract.tenant) : contract.tenant}</span><br/>
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract.tenantNationalId)}</span><br/>
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract.tenantAddress || contract.propertyAddress}</span>
                                                    {contract.tenantEmergencyContactName && (
                                                        <>
                                                            <br/>
                                                            <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'Emergency Contact' : 'جهة اتصال الطوارئ'}:</span> <span className="pdf-data-value">{contract.tenantEmergencyContactName} ({toArNum(contract.tenantEmergencyPhone)})</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Property & Terms */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '2. PROPERTY & TERMS' : '٢. بيانات العقار والمدة'}</div>
                                            <div className="pdf-data-grid">
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Property Address' : 'عنوان العقار المؤجر'}</span><span className="pdf-data-value">{contract.propertyAddress}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Property Type' : 'نوع العقار'}</span><span className="pdf-data-value">{localizedPreview.propertyType}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Lease Start Date' : 'تاريخ بداية العقد'}</span><span className="pdf-data-value">{localizedPreview.startDate}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Lease Duration' : 'مدة التعاقد'}</span><span className="pdf-data-value">{localizedPreview.duration}</span></div>
                                            </div>
                                        </div>

                                        {/* Section 3: Financials */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '3. FINANCIAL OBLIGATIONS' : '٣. الالتزامات المالية'}</div>
                                            <div className="pdf-data-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Monthly Rent Amount' : 'القيمة الإيجارية الشهرية'}</span><span className="pdf-data-value" style={{ color: '#27ae60', fontWeight: 'bold' }}>{previewLang === 'en' ? '$' : ''}{localizedPreview.amount}{previewLang === 'ar' ? ' جنية مصري' : ''}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Security Deposit' : 'مبلغ التأمين'}</span><span className="pdf-data-value" style={{ color: '#2980b9', fontWeight: 'bold' }}>{previewLang === 'en' ? '$' : ''}{localizedPreview.deposit}{previewLang === 'ar' ? ' جنية مصري' : ''}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Late Fee Penalty' : 'غرامة التأخير'}</span><span className="pdf-data-value" style={{ color: '#c0392b', fontWeight: 'bold' }}>{previewLang === 'en' ? '$' : ''}{localizedPreview.lateFee}{previewLang === 'ar' ? ' جنية مصري' : ''}</span></div>
                                            </div>
                                        </div>

                                        {/* Section 4: Rules */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '4. RULES & PERMISSIONS' : '٤. القواعد والأذونات'}</div>
                                            <div className="pdf-data-grid">
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Permitted Use' : 'الغرض من الاستخدام'}</span><span className="pdf-data-value">{localizedPreview.permittedUse}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Access/Entry Rights' : 'حق الدخول للمعاينة'}</span><span className="pdf-data-value">{localizedPreview.rightToEnter}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Notice Period' : 'مدة الإخطار المسبق'}</span><span className="pdf-data-value">{localizedPreview.notice}</span></div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Section 5: Legal Clauses (Full) */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '5. LEGAL CLAUSES & COVENANTS' : '٥. البنود القانونية'}</div>
                                            <div className="pdf-clause-list">
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 1: Description of the Rented Property{"\n"}
                                                            The Lessor hereby leases to the Lessee, and the Lessee hereby leases from the Lessor, the real property located at {contract.propertyAddress}, consisting of the specific residential unit ({contract.propertyType || 'Residential'}). The Lessee acknowledges that they have inspected the property and found it to be in good, clean, and tenantable condition, suitable for its permitted residential use.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الأول: وصف العقار المؤجر{"\n"}
                                                            يؤجر المؤجر بموجب هذا العقد للمستأجر، ويستأجر المستأجر من المؤجر، العقار الكائن في {contract.propertyAddress}، والمكون من الوحدة السكنية المحددة (وحدة سكنية). ويقر المستأجر بأنه قد عاين العقار المعاينة التامة النافية للجهالة ووجده في حالة جيدة ونظيفة وصالحة للاستخدام السكني المخصص له.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 2: Lease Term & Duration{"\n"}
                                                            This lease agreement shall commence on {contract.startDate} and continue for a fixed duration of {contract.duration}. Upon the expiration of the lease term, this agreement shall terminate automatically. Any renewal or extension of this lease must be agreed upon in writing by both parties by signing a new agreement prior to the expiration date.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثاني: مدة عقد الإيجار{"\n"}
                                                            يبدأ سريان هذا العقد في تاريخ {translateDate(contract.startDate, true)} ويستمر لمدة محددة قدرها {formatDurationAr(contract.duration, true)}. وينتهي هذا العقد تلقائياً بقوة القانون عند نهاية مدته دون حاجة إلى إخطار أو إنذار. ولا يتجدد هذا العقد تلقائياً إلا بموجب اتفاق مكتوب وجديد موقع من كلا الطرفين قبل تاريخ انتهاء العقد.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 3: Rental Value & Payments{"\n"}
                                                            The monthly rent for the leased property is set at L.E{contract.amount}, payable in advance on the first day of each calendar month. Payments must be processed through the HOMI platform or directly to the Lessor, who shall issue a digital receipt. The Lessee shall not withhold or deduct any amount from the monthly rent for any reason whatsoever.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثالث: القيمة الإيجارية وسدادها{"\n"}
                                                            تم تحديد الأجرة الشهرية للعقار المؤجر بمبلغ {toArNum(contract.amount, true)} جنية مصري، وتدفع مقدماً في اليوم الأول من كل شهر ميلادي. يجب سداد القيمة الإيجارية من خلال منصة هومي (HOMI) أو مباشرة للمؤجر الذي يلتزم بإصدار إيصال رقمي يفيد الاستلام. ولا يحق للمستأجر حبس أو خصم أي جزء من الأجرة الشهرية لأي سبب من الأسباب.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 4: Security Deposit{"\n"}
                                                            A security deposit of L.E{contract.deposit} shall be paid by the Lessee and held securely in HOMI's escrow system during the active lease cycle. The Lessor shall have no access to these funds while the lease remains active. Upon successful completion of the lease term and full payment of all financial obligations, the security deposit shall be automatically refunded to the Lessee. If the lease is terminated due to Lessee's default, non-payment, or breach of contract, the security deposit shall be forfeited and released to the Lessor.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الرابع: مبلغ التأمين{"\n"}
                                                            يلتزم المستأجر بسداد مبلغ تأمين قدره {toArNum(contract.deposit, true)} جنية مصري، ويُاحتفظ به بشكل آمن في نظام الضمان التابع لمنصة هومي (HOMI) طوال فترة الإيجار النشطة. ولا يحق للمؤجر سحب أو استخدام هذه الأموال طالما ظل العقد سارياً. وعند انتهاء مدة الإيجار بنجاح وسداد المستأجر لكافة التزاماته المالية، يتم رد مبلغ التأمين تلقائياً إلى المستأجر. وفي حالة إنهاء العقد بسبب تقصير المستأجر أو عدم السداد أو الإخلال بشروط العقد، يُصادر مبلغ التأمين ويُحول لصالح المؤجر.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 5: Late Payment & Default{"\n"}
                                                            If the Lessee fails to pay the monthly rent within five (5) days of the due date, a late fee penalty of L.E{contract.lateFeeAmount || 0} shall be assessed. If the payment delay continues beyond fifteen (15) days, the Lessor shall have the absolute right to terminate this agreement immediately, evict the Lessee, and reclaim possession of the property without requiring a prior court ruling or formal notices.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الخامس: التأخر في سداد الأجرة والفسخ{"\n"}
                                                            في حالة تأخر المستأجر في دفع الإيجار لمدة تتجاوز خمسة (٥) أيام من تاريخ الاستحقاق، تطبق غرامة تأخير قدرها {toArNum(contract.lateFeeAmount || 0, true)} جنية مصري. وإذا استمر التأخر في السداد لأكثر من خمسة عشر (١٥) يوماً، يحق للمؤجر فسخ العقد فوراً، وإخلاء المستأجر واسترداد حيازة العقار دون الحاجة لحكم قضائي مسبق أو إجراءات رسمية.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 6: Subleasing & Assignments{"\n"}
                                                            The Lessee is strictly prohibited from subleasing the property, assigning this lease, or transferring any part of the tenancy to a third party without obtaining the prior written consent of the Lessor. Any unauthorized subleasing or assignment shall be considered a material breach and shall result in the immediate termination of this contract.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند السادس: التأجير من الباطن والتنازل{"\n"}
                                                            يُحظر على المستأجر حظراً تاماً إعادة تأجير العقار من الباطن، أو التنازل عن الإيجار، أو نقل أي جزء من حقوق الإيجار إلى الغير دون الحصول على موافقة كتابية مسبقة من المؤجر. ويعتبر أي تأجير من الباطن أو تنازل غير مصرح به إخلالاً جوهرياً يؤدي إلى فسخ العقد فوراً.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 7: Permitted Use of the Property{"\n"}
                                                            The leased property must be used solely and exclusively for residential purposes by the Lessee and their immediate family members. The Lessee shall comply with all local housing regulations and shall not conduct any commercial, professional, or illegal activities within the premises, nor cause any disturbance or nuisance to the neighbors.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند السابع: الغرض من الاستخدام{"\n"}
                                                            يجب استخدام العقار المؤجر لأغراض السكن الخاص فقط للمستأجر وأفرد أسرته المقيمين معه. ويتعهد المستأجر بالالتزام بجميع القوانين واللوائح السكنية المحلية، ويُحظر عليه القيام بأي أنشطة تجارية أو مهنية أو غير قانونية داخل العقار، أو التسبب في أي إزعاج أو مضايقة للجيران.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 8: Modifications & Alterations{"\n"}
                                                            The Lessee shall not perform any structural modifications, alterations, additions, or decorations to the property (such as drilling walls, dividing rooms, or changing doors and windows) without the prior written consent of the Lessor. In the event of unauthorized changes, the Lessee must restore the property to its original state at their own expense.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثامن: التعديلات والتغييرات بالعقار{"\n"}
                                                            يُحظر على المستأجر إجراء أي تعديلات هيكلية، أو تغييرات، أو إضافات، أو أعمال ديكور في العقار (مثل هدم أو بناء أو تقسيم الغرف أو فتح نوافذ وأبواب) دون الحصول على موافقة كتابية مسبقة من المؤجر. وفي حالة القيام بذلك بدون موافقة، يلتزم المستأجر بإعادة العقار إلى حالته الأصلية على نفقته الخاصة.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 9: Maintenance & Care{"\n"}
                                                            The Lessee commits to using the property with utmost care and responsibility. The Lessee shall be responsible for routine minor maintenance and repairs resulting from daily use and negligence. Major structural repairs and maintenance of core building systems shall be the responsibility of the Lessor, in accordance with the maintenance responsibility allocation set forth in this agreement.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند التاسع: الصيانة والمحافظة على العقار{"\n"}
                                                            يتعهد المستأجر باستخدام العقار المؤجر بعناية ومسؤولية تامة والمحافظة عليه. ويتحمل المستأجر تكاليف الصيانة الدورية البسيطة والإصلاحات الناتجة عن الاستخدام اليومي أو الإهمال. بينما يتحمل المؤجر مسؤولية الإصلاحات الهيكلية الكبرى وصيانة الأنظمة الأساسية للمبنى وفقاً لجدول توزيع مسؤوليات الصيانة الوارد في هذا العقد.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 10: Eviction & Holdover Compensation{"\n"}
                                                            Upon the expiration or termination of this lease, the Lessee must vacate the property and return it to the Lessor in its original clean condition. Any holdover or failure to vacate shall constitute illegal occupation, and the Lessee shall be liable to pay the Lessor double the daily rent rate for each day of delay as liquidated damages, in addition to legal costs.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند العاشر: الإخلاء عند انتهاء العقد والتعويض عن التأخير{"\n"}
                                                            عند انتهاء مدة الإيجار أو فسخ العقد، يلتزم المستأجر بإخلاء العقار وتسليمه للمؤجر بحالته الأصلية النظيفة. ويعتبر أي تأخر في الإخلاء شغلاً غير قانوني للعقار، ويلتزم المستأجر بدفع تعويض للمؤجر يعادل ضعف الأجرة اليومية عن كل يوم تأخير كتعويض اتفاقي، بالإضافة إلى تحمل المصاريف القانونية.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 11: Utilities & Public Charges{"\n"}
                                                            The Lessee shall bear the full responsibility for the timely payment of all utility bills (including water, electricity, natural gas, internet, and trash collection fees) during the tenancy term. The Lessee must provide proof of payment of all such utility bills to the Lessor upon request.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الحادي عشر: فواتير المرافق والرسوم{"\n"}
                                                            يتحمل المستأجر المسؤولية الكاملة عن سداد جميع فواتير المرافق (بما في ذلك المياه، والكهرباء، والغاز الطبيعي، والإنترنت، ورسوم النظافة) في مواعيدها المحددة طوال فترة الإيجار. ويلتزم المستأجر بتقديم ما يثبت سداد هذه الفواتير للمؤجر عند الطلب.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 12: Early Termination & Notices{"\n"}
                                                            Neither party may terminate this lease agreement early except as provided by law or by mutual written agreement. If the Lessee wishes to vacate the property prior to the end of the term, they must provide at least thirty (30) days written notice and pay a penalty equivalent to one month's rent, unless the early termination is due to Lessor's failure to maintain the property in habitable condition.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثاني عشر: الإنهاء المبكر والإخطارات{"\n"}
                                                            لا يحق لأي من الطرفين إنهاء هذا العقد مبكراً إلا بموجب ما ينص عليه القانون أو بالاتفاق الكتابي المتبادل. وفي حال رغبة المستأجر في الإخلاء قبل نهاية المدة، يجب عليه تقديم إخطار كتابي مدته ثلاثون (٣٠) يوماً على الأقل، وسداد غرامة تعادل أجرة شهر واحد، ما لم يكن الإنهاء بسبب إخفاق المؤجر في صيانة العقار.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 13: Addresses for Legal Notice{"\n"}
                                                            All notices, demands, or legal correspondence required under this lease shall be sent to the parties' respective primary addresses stated in this agreement. Any change in address must be communicated to the other party in writing immediately, otherwise notices sent to the listed addresses shall be deemed legally delivered.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثالث عشر: العناوين والمراسلات القانونية{"\n"}
                                                            تعتبر جميع الإخطارات أو المراسلات القانونية المطلوبة بموجب هذا العقد صحيحة ومنتجة لأثرها إذا أُرسلت إلى العناوين الرئيسية لكل من الطرفين المذكورة في صدر هذا العقد. ويجب إبلاغ الطرف الآخر فوراً بأي تغيير في العنوان، وإلا اعتُبرت المراسلات الموجهة للعنوان المذكور مسلّمة قانوناً.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 14: Governing Law & Jurisdiction{"\n"}
                                                            This lease agreement shall be governed by and construed in accordance with the local laws of the Arab Republic of Egypt. Any disputes arising from the interpretation, execution, or breach of this agreement shall be subject to the exclusive jurisdiction of the competent local courts where the property is located.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الرابع عشر: القانون الواجب التطبيق والاختصاص القضائي{"\n"}
                                                            يخضع هذا العقد ويفسر وفقاً للقوانين المعمول بها في جمهورية مصر العربية. ويخضع أي نزاع ينشأ عن تفسير أو تنفيذ أو الإخلال ببنود هذا العقد للاختصاص القضائي الحصري للمحاكم المحلية المختصة التي يقع في دائرتها العقار المؤجر.
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 6: Signatures */}
                                        <div className="pdf-signature-area">
                                            <div className="pdf-sig-box">
                                                <span className="pdf-data-label">{previewLang === 'en' ? 'Landlord Signature' : 'توقيع المؤجر'}</span>
                                                {normalizeSignatureUrl(contract.landlordSignature) ? (
                                                    <img src={normalizeSignatureUrl(contract.landlordSignature)} alt="Landlord signature" className="pdf-sig-img" />
                                                ) : (
                                                    <div className="pdf-sig-img" style={{ fontSize: '10px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', height: '60px' }}>
                                                        {previewLang === 'en' ? 'Digitally Signed' : 'تم التوقيع رقمياً'}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '11px' }}>{previewLang === 'en' ? 'Date' : 'التاريخ'}: {localizedPreview.executionDate}</div>
                                            </div>
                                            <div className="pdf-sig-box">
                                                <span className="pdf-data-label">{previewLang === 'en' ? 'Tenant Signature' : 'توقيع المستأجر'}</span>
                                                {normalizeSignatureUrl(contract.tenantSignature) ? (
                                                    <img src={normalizeSignatureUrl(contract.tenantSignature)} alt="Tenant signature" className="pdf-sig-img" />
                                                ) : (
                                                    <div className="pdf-sig-img" style={{ fontSize: '10px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', height: '60px' }}>
                                                        {previewLang === 'en' ? 'Digitally Signed' : 'تم التوقيع رقمياً'}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '11px' }}>{previewLang === 'en' ? 'Date' : 'التاريخ'}: {localizedPreview.executionDate}</div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="pdf-footer-preview">
                                    {previewLang === 'en' ? 'Digitally Verified Agreement • HOMI Platform • Timestamped Security' : 'عقد موثق رقمياً • منصة هومي (HOMI) • حماية تقنية وتوقيع زمنى'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveLeaseContract;