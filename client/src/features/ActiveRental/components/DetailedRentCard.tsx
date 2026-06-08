import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './DetailedRentCard.css';
import {
    FaCalendarAlt, FaUserCircle,
    FaFileDownload, FaMapMarkerAlt, FaGavel, FaTimes, FaHome,
    FaBed, FaBath, FaRulerCombined, FaEye,
    FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import pdfService from '../../../services/pdf.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';
import { propertyService } from '../../../services/property.service';
import { mapPropertyToUI } from '../../../utils/propertyMapping';

interface RentalProps {
    rental: {
        title: string;
        address: string;
        landlord: string;
        leaseStart: string;
        leaseEnd: string;
        sqft: number;
        image: string | null;
        propertyType?: string;
        houseRules: string[];
        monthlyRent: number;
    };
    contract: any;
}

const DetailedRentCard: React.FC<RentalProps> = ({ rental, contract }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showRules, setShowRules] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [previewLang, setPreviewLang] = useState<'en' | 'ar' | null>(null);
    const [currentPreviewPage, setCurrentPreviewPage] = useState(1);

    // Reset page when lang changes
    useEffect(() => {
        if (previewLang) setCurrentPreviewPage(1);
    }, [previewLang]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setShowRules(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDownloadPDF = async (lang: 'en' | 'ar') => {
        if (!contract) return;
        const pdfData = {
            id: contract.id,
            property: rental.title,
            propertyAddress: rental.address,
            propertyType: rental.propertyType || 'Apartment',
            landlord: rental.landlord,
            landlordNationalId: contract.landlordNationalId,
            landlordAddress: contract.landlordAddress || 'Cairo, Egypt',
            tenant: `${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}`.trim() || 'Tenant',
            tenantNationalId: contract.tenantNationalId,
            tenantAddress: contract.tenantAddress || rental.address,
            startDate: rental.leaseStart,
            duration: `${contract.leaseDurationMonths || 12} Months`,
            amount: rental.monthlyRent,
            deposit: contract.securityDeposit || 0,
            lateFeeAmount: contract.lateFeeAmount || 0,
            permittedUse: contract.permittedUse || 'Residential purposes only',
            rightToEnter: contract.rightToEnter || 'With 24h notice',
            noticePeriod: contract.noticePeriod || '24 Hours',
            maintenanceResponsibilities: contract.maintenanceResponsibilities,
            landlordSignature: normalizeSignatureUrl(contract.landlordSignature),
            tenantSignature: normalizeSignatureUrl(contract.tenantSignature),
            executionDate: new Date(contract.createdAt).toLocaleDateString(),
        };
        await pdfService.generateContractPDF(pdfData as any, lang);
    };

    const houseRules = rental.houseRules;
    const locationBadge = rental.address.split(',')[1]?.trim() || rental.address;

    const handleViewPropertyDetails = () => {
        const propertyId = contract?.property?.id || contract?.propertyId;
        if (!propertyId) return;
        navigate(`/properties/${propertyId}`);
    };

    // Derived values for progress calculation
    const leaseDuration = contract?.leaseDurationMonths ?? 12;
    const paidMonths = contract?.paidInstallments ?? 1;
    const progressPercent = Math.min(100, Math.max(0, (paidMonths / leaseDuration) * 100));

    const bedrooms = contract?.propertySpecifications?.bedrooms ?? 0;
    const bathrooms = contract?.propertySpecifications?.bathrooms ?? 0;
    const areaSqft = contract?.propertySpecifications?.areaSqft ?? rental.sqft ?? 0;

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
        id: toArNum(contract?.id),
        amount: toArNum(rental.monthlyRent),
        deposit: toArNum(contract?.securityDeposit ?? contract?.deposit ?? 0),
        lateFee: toArNum(contract?.lateFeeAmount || 0),
        startDate: translateDate(rental.leaseStart),
        duration: formatDurationAr(`${contract?.leaseDurationMonths || 12} Months`),
        propertyType: previewLang === 'ar' ? 'وحدة سكنية' : (rental.propertyType || 'Residential'),
        permittedUse: previewLang === 'ar' ? 'للسكن فقط' : (contract?.permittedUse || 'Residential purposes only'),
        rightToEnter: previewLang === 'ar' ? 'بإخطار مسبق ٢٤ ساعة' : (contract?.rightToEnter || 'With 24h notice'),
        notice: previewLang === 'ar' ? '٢٤ ساعة' : (contract?.noticePeriod || '24 Hours'),
        executionDate: translateDate(contract?.createdAt ? new Date(contract.createdAt).toLocaleDateString() : '')
    };

    return (
        <div className="premium-detailed-card animate-fade-in" dir="ltr">
            <div className="card-visual-side">
                {rental.image ? (
                    <img src={rental.image} alt={rental.title} className="hero-rental-img" />
                ) : (
                    <div className="hero-rental-img placeholder-rental-img" aria-label="Property image unavailable">
                        <FaHome />
                        <span>{t('landlordHomeComponents.noPhotos')}</span>
                    </div>
                )}
                <div className="glass-status-tag">{t('activeLease.inEffect')}</div>
            </div>

            <div className="card-content-side">
                <div className="card-actions-row">
                    <div className="pdf-buttons-group">
                        <button className="download-contract-btn" onClick={() => handleDownloadPDF('en')}>
                            <FaFileDownload />
                            <span>{t('activeLease.downloadPDF')} (EN)</span>
                        </button>
                        <button className="download-contract-btn" onClick={() => handleDownloadPDF('ar')}>
                            <FaFileDownload />
                            <span>{t('activeLease.downloadPDF')} (AR)</span>
                        </button>
                        <button className="download-contract-btn" onClick={() => setPreviewLang('en')}>
                            <FaEye />
                            <span>{t('activeLease.viewContract')} (EN)</span>
                        </button>
                        <button className="download-contract-btn" onClick={() => setPreviewLang('ar')}>
                            <FaEye />
                            <span>{t('activeLease.viewContract')} (AR)</span>
                        </button>
                    </div>

                    <div className="rules-wrapper">
                        <button
                            className={`rules-trigger-btn ${showRules ? 'active' : ''}`}
                            onClick={() => setShowRules(!showRules)}
                        >
                            <FaGavel />
                            <span>{t('activeLease.houseRules')}</span>
                        </button>

                        {showRules && (
                            <div className="mini-rules-modal" ref={modalRef}>
                                <div className="rules-header">
                                    <span>{t('activeLease.propertyRules')}</span>
                                    <FaTimes className="close-rules" onClick={() => setShowRules(false)} />
                                </div>
                                <ul className="rules-list">
                                    {(houseRules.length > 0 ? houseRules : [t('landlordHomeComponents.noHouseRulesProvided')]).map((rule) => (
                                        <li key={rule}>{rule}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <header className="rental-header">
                    <div className="location-row">
                        <div className="location-badge">
                            <FaMapMarkerAlt /> {locationBadge}
                        </div>
                        <button
                            type="button"
                            className="btn-view-property-details"
                            onClick={handleViewPropertyDetails}
                        >
                            <FaEye />
                            View property details
                        </button>
                    </div>
                    <h2>{rental.title}</h2>
                    <p className="full-address">{rental.address}</p>
                </header>

                <div className="info-grid-modern">
                    <div className="landlord-profile-card">
                        <div className="landlord-avatar-placeholder">
                            {rental.landlord.charAt(0).toUpperCase()}
                        </div>
                        <div className="landlord-details">
                            <span className="landlord-label">{t('activeLease.landlord')}</span>
                            <span className="landlord-name">{rental.landlord}</span>
                        </div>
                        <div className="landlord-contact-badge">Owner</div>
                    </div>

                    <div className="lease-progress-container">
                        <div className="lease-progress-header">
                            <span>Lease Progress</span>
                            <strong>{paidMonths} / {leaseDuration} mo</strong>
                        </div>
                        <div className="lease-progress-bar-outer">
                            <div className="lease-progress-bar-inner" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="lease-progress-labels">
                            <span>Start ({rental.leaseStart})</span>
                            <span>End ({rental.leaseEnd})</span>
                        </div>
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
                                        <FaChevronLeft size={20}/>
                                    </button>
                                    <button 
                                        className="icon-btn" 
                                        disabled={currentPreviewPage === 2}
                                        onClick={() => setCurrentPreviewPage(2)}
                                    >
                                        <FaChevronRight size={20}/>
                                    </button>
                                </div>
                                <button className="icon-btn close-preview" onClick={() => setPreviewLang(null)}><FaTimes size={20}/></button>
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
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{rental.landlord}</span><br/>
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract?.landlordNationalId)}</span><br/>
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract?.landlordAddress || 'Cairo, Egypt'}</span>
                                                </div>
                                                <div className="pdf-party-card">
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Lessee (Tenant)' : 'المستأجر (الطرف الثاني)'}</span>
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{`${contract?.tenant?.firstName || ''} ${contract?.tenant?.lastName || ''}`.trim() || 'Tenant'}</span><br/>
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract?.tenantNationalId)}</span><br/>
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract?.tenantAddress || rental.address}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Property & Terms */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '2. PROPERTY & TERMS' : '٢. بيانات العقار والمدة'}</div>
                                            <div className="pdf-data-grid">
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Property Address' : 'عنوان العقار المؤجر'}</span><span className="pdf-data-value">{rental.address}</span></div>
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
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '1.' : '١.'} {previewLang === 'en' ? `Description: The property is located at ${rental.address}. It consists of the unit specified (${localizedPreview.propertyType}).` : `الوصف: يقع العقار في ${rental.address}. ويتكون من الوحدة المحددة (${localizedPreview.propertyType}).`}</div>
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
                                                <div className="pdf-clause-item">{previewLang === 'en' ? '14.' : '١٤.'} {previewLang === 'en' ? 'Jurisdiction: Digital copies provided to both parties. Subject to local courts.' : 'الاختصاص: نسختان رقميتان للطرفين. يخضع العقد للمحاكم المحلية.'}</div>
                                            </div>
                                        </div>

                                        {/* Section 6: Signatures */}
                                        <div className="pdf-signature-area">
                                            <div className="pdf-sig-box">
                                                <span className="pdf-data-label">{previewLang === 'en' ? 'Landlord Signature' : 'توقيع المؤجر'}</span>
                                                {normalizeSignatureUrl(contract?.landlordSignature) ? (
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
                                                {normalizeSignatureUrl(contract?.tenantSignature) ? (
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

export default DetailedRentCard;