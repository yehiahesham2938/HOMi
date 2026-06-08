import React from 'react';
import { 
    X, CheckCircle2, FileText, Download, 
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
            landlordNationalId: contract.landlordNationalId,
            landlordAddress: contract.landlordAddress || 'Cairo, Egypt',
            tenant: contract.tenant,
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
    const toArNum = (val: string | number | undefined | null) => {
        if (val === undefined || val === null) return '—';
        if (previewLang !== 'ar') return val.toString();
        return val.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
    };

    const translateDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return '—';
        if (previewLang !== 'ar') return dateStr;
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
        return toArNum(res);
    };

    const formatDurationAr = (durationStr: string | undefined | null) => {
        if (!durationStr) return '—';
        if (previewLang !== 'ar') return durationStr;
        const numMatch = durationStr.match(/\d+/);
        if (!numMatch) return durationStr;
        const n = parseInt(numMatch[0]);
        const isMonth = durationStr.toLowerCase().includes('month');
        const isYear = durationStr.toLowerCase().includes('year');
        if (isMonth) {
            if (n === 1) return 'شهر واحد';
            if (n === 2) return 'شهرين';
            if (n >= 3 && n <= 10) return `${toArNum(n)} شهور`;
            return `${toArNum(n)} شهر`;
        }
        if (isYear) {
            if (n === 1) return 'سنة واحدة';
            if (n === 2) return 'سنتين';
            if (n >= 3 && n <= 10) return `${toArNum(n)} سنوات`;
            return `${toArNum(n)} سنة`;
        }
        return toArNum(durationStr);
    };

    const localizedPreview = {
        id: toArNum(contract.id),
        amount: toArNum(contract.amount),
        deposit: toArNum(contract.deposit),
        lateFee: toArNum(contract.lateFeeAmount || 0),
        startDate: translateDate(contract.startDate),
        duration: formatDurationAr(contract.duration),
        propertyType: previewLang === 'ar' ? 'وحدة سكنية' : (contract.propertyType || 'Residential'),
        permittedUse: previewLang === 'ar' ? 'للسكن فقط' : (contract.permittedUse || 'Residential'),
        rightToEnter: previewLang === 'ar' ? 'بإخطار مسبق ٢٤ ساعة' : (contract.rightToEnter || 'With 24h Notice'),
        notice: previewLang === 'ar' ? '٢٤ ساعة' : (contract.noticePeriod || '24 Hours'),
        executionDate: translateDate(new Date(contract.createdAt).toLocaleDateString())
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
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{contract.landlord}</span><br/>
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract.landlordNationalId)}</span><br/>
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract.landlordAddress || '—'}</span>
                                                </div>
                                                <div className="pdf-party-card">
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Lessee (Tenant)' : 'المستأجر (الطرف الثاني)'}</span>
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{contract.tenant}</span><br/>
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract.tenantNationalId)}</span><br/>
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract.tenantAddress || contract.propertyAddress}</span>
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
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '1.' : '١.'} {previewLang === 'en' ? `Description: The property is located at ${contract.propertyAddress}. It consists of the unit specified (${localizedPreview.propertyType}).` : `الوصف: يقع العقار في ${contract.propertyAddress}. ويتكون من الوحدة المحددة (${localizedPreview.propertyType}).`}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '2.' : '٢.'} {previewLang === 'en' ? `Duration: The contract starts on ${localizedPreview.startDate} and has a duration of ${localizedPreview.duration}.` : `المدة: يبدأ العقد في ${localizedPreview.startDate} ومدته ${localizedPreview.duration}.`}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '3.' : '٣.'} {previewLang === 'en' ? `Value: The monthly rent is $${localizedPreview.amount}. It must be paid in advance at the beginning of each month.` : `القيمة: مبلغ الإيجار الشهرى هو ${localizedPreview.amount} جنية مصري. يجب دفعه مقدماً في بداية كل شهر.`}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '4.' : '٤.'} {previewLang === 'en' ? `Deposit: A security deposit of $${localizedPreview.deposit} is paid and held in HOMi escrow. Refunded to Tenant on successful completion, or forfeited to Landlord on non-payment default.` : `التأمين: يتم دفع تأمين قدره ${localizedPreview.deposit} جنية مصري يُحتفظ به في ضمان هومي. يُرد للمستأجر عند إتمام العقد بنجاح، أو يُصادر للمؤجر في حال تعثر السداد.`}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '5.' : '٥.'} {previewLang === 'en' ? `Late Payment: A late fee of $${localizedPreview.lateFee} applies if payment is delayed more than 5 days.` : `التأخير: تطبق غرامة ${localizedPreview.lateFee} جنية مصري في حال التأخر عن الدفع لأكثر من ٥ أيام.`}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '6.' : '٦.'} {previewLang === 'en' ? 'No Subleasing: Lessee cannot sublease or make changes without written consent.' : 'التنازل: لا يجوز للمستأجر التنازل عن الإيجار أو تغيير العقار دون موافقة.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '7.' : '٧.'} {previewLang === 'en' ? 'Use: Property must be used for residential purposes only. Any other use terminates contract.' : 'الاستخدام: يستخدم العقار للسكن فقط. أي استخدام آخر ينهي العقد تلقائياً.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '8.' : '٨.'} {previewLang === 'en' ? 'Expenses: Lessee expenses (decorations/improvements) are not reimbursable by lessor.' : 'المصاريف: مصاريف المستأجر (تحسينات/ديكور) لا يستردها وتصبح جزءاً من العقار.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '9.' : '٩.'} {previewLang === 'en' ? 'Condition: Lessee must return property in original condition. Liable for negligence.' : 'الحالة: يجب إعادة العقار بحالته الأصلية. المستأجر مسؤول عن أي إهمال.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '10.' : '١٠.'} {previewLang === 'en' ? 'Eviction: Lessee must vacate at end of term. Delay results in illegal occupation.' : 'الإخلاء: يجب الإخلاء عند انتهاء العقد. التأخير يعتبر شغلاً غير قانوني.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '11.' : '١١.'} {previewLang === 'en' ? 'Utilities: Lessee is responsible for water, electricity, gas, and internet bills.' : 'المرافق: المستأجر مسؤول عن دفع فواتير الكهرباء والمياه والغاز والإنترنت.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '12.' : '١٢.'} {previewLang === 'en' ? 'Termination: Early termination requires one month notice or one month rent penalty.' : 'الإنهاء: يتطلب الإنهاء المبكر إخطاراً قبل شهر أو دفع إيجار شهر غرامة.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '13.' : '١٣.'} {previewLang === 'en' ? 'Correspondence: Addresses in contract are valid for all legal notices.' : 'المراسلات: العناوين المذكورة صحيحة لجميع الإخطارات القانونية والمراسلات.'}</div>
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '14.' : '١٤.'} {previewLang === 'en' ? 'Jurisdiction: Digital copies provided to both parties. Subject to local courts.' : 'الاخصاص: نسختان رقميتان للطرفين. يخضع العقد للمحاكم المحلية.'}</div>
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