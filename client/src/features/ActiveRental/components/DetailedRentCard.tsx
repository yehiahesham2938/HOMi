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
    const landlordEmail = contract?.landlord?.email;
    const tenantEmail = contract?.tenant?.email;
    const landlordNameAr = landlordEmail ? (localStorage.getItem('arabicName_email_' + landlordEmail) || undefined) : undefined;
    const tenantNameAr = tenantEmail ? (localStorage.getItem('arabicName_email_' + tenantEmail) || undefined) : undefined;
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
            landlordNameAr,
            landlordNationalId: contract.landlordNationalId,
            landlordAddress: contract.landlordAddress || 'Cairo, Egypt',
            tenant: `${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}`.trim() || 'Tenant',
            tenantNameAr,
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
    const toArNum = (val: string | number | undefined | null, forceAr = false) => {
        if (val === undefined || val === null) return '—';
        if (!forceAr && previewLang !== 'ar') return val.toString();
        return val.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
    };

    const translateDate = (dateStr: string | undefined | null, forceAr = false) => {
        if (!dateStr) return '—';
        if (!forceAr && previewLang !== 'ar') return dateStr;
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
        if (!forceAr && previewLang !== 'ar') return durationStr;
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
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{previewLang === 'ar' ? (landlordNameAr || rental.landlord) : rental.landlord}</span><br/>
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract?.landlordNationalId)}</span><br/>
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract?.landlordAddress || 'Cairo, Egypt'}</span>
                                                </div>
                                                <div className="pdf-party-card">
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Lessee (Tenant)' : 'المستأجر (الطرف الثاني)'}</span>
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{previewLang === 'ar' ? (tenantNameAr || `${contract?.tenant?.firstName || ''} ${contract?.tenant?.lastName || ''}`.trim()) : `${contract?.tenant?.firstName || ''} ${contract?.tenant?.lastName || ''}`.trim() || 'Tenant'}</span><br/>
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
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 1: Description of the Rented Property{"\n"}
                                                            The Lessor hereby leases to the Lessee, and the Lessee hereby leases from the Lessor, the real property located at {rental.address}, consisting of the specific residential unit ({rental.propertyType || 'Residential'}). The Lessee acknowledges that they have inspected the property and found it to be in good, clean, and tenantable condition, suitable for its permitted residential use.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الأول: وصف العقار المؤجر{"\n"}
                                                            يؤجر المؤجر بموجب هذا العقد للمستأجر، ويستأجر المستأجر من المؤجر، العقار الكائن في {rental.address}، والمكون من الوحدة السكنية المحددة (وحدة سكنية). ويقر المستأجر بأنه قد عاين العقار المعاينة التامة النافية للجهالة ووجده في حالة جيدة ونظيفة وصالحة للاستخدام السكني المخصص له.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 2: Lease Term & Duration{"\n"}
                                                            This lease agreement shall commence on {rental.leaseStart} and continue for a fixed duration of {contract?.leaseDurationMonths || 12} Months. Upon the expiration of the lease term, this agreement shall terminate automatically. Any renewal or extension of this lease must be agreed upon in writing by both parties by signing a new agreement prior to the expiration date.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثاني: مدة عقد الإيجار{"\n"}
                                                            يبدأ سريان هذا العقد في تاريخ {translateDate(rental.leaseStart, true)} ويستمر لمدة محددة قدرها {formatDurationAr(`${contract?.leaseDurationMonths || 12} Months`, true)}. وينتهي هذا العقد تلقائياً بقوة القانون عند نهاية مدته دون حاجة إلى إخطار أو إنذار. ولا يتجدد هذا العقد تلقائياً إلا بموجب اتفاق مكتوب وجديد موقع من كلا الطرفين قبل تاريخ انتهاء العقد.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 3: Rental Value & Payments{"\n"}
                                                            The monthly rent for the leased property is set at L.E{rental.monthlyRent}, payable in advance on the first day of each calendar month. Payments must be processed through the HOMI platform or directly to the Lessor, who shall issue a digital receipt. The Lessee shall not withhold or deduct any amount from the monthly rent for any reason whatsoever.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثالث: القيمة الإيجارية وسدادها{"\n"}
                                                            تم تحديد الأجرة الشهرية للعقار المؤجر بمبلغ {toArNum(rental.monthlyRent, true)} جنية مصري، وتدفع مقدماً في اليوم الأول من كل شهر ميلادي. يجب سداد القيمة الإيجارية من خلال منصة هومي (HOMI) أو مباشرة للمؤجر الذي يلتزم بإصدار إيصال رقمي يفيد الاستلام. ولا يحق للمستأجر حبس أو خصم أي جزء من الأجرة الشهرية لأي سبب من الأسباب.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 4: Security Deposit{"\n"}
                                                            A security deposit of L.E{contract?.securityDeposit ?? contract?.deposit ?? 0} shall be paid by the Lessee and held securely in HOMI's escrow system during the active lease cycle. The Lessor shall have no access to these funds while the lease remains active. Upon successful completion of the lease term and full payment of all financial obligations, the security deposit shall be automatically refunded to the Lessee. If the lease is terminated due to Lessee's default, non-payment, or breach of contract, the security deposit shall be forfeited and released to the Lessor.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الرابع: مبلغ التأمين{"\n"}
                                                            يلتزم المستأجر بسداد مبلغ تأمين قدره {toArNum(contract?.securityDeposit ?? contract?.deposit ?? 0, true)} جنية مصري، ويُاحتفظ به بشكل آمن في نظام الضمان التابع لمنصة هومي (HOMI) طوال فترة الإيجار النشطة. ولا يحق للمؤجر سحب أو استخدام هذه الأموال طالما ظل العقد سارياً. وعند انتهاء مدة الإيجار بنجاح وسداد المستأجر لكافة التزاماته المالية، يتم رد مبلغ التأمين تلقائياً إلى المستأجر. وفي حالة إنهاء العقد بسبب تقصير المستأجر أو عدم السداد أو الإخلال بشروط العقد، يُصادر مبلغ التأمين ويُحول لصالح المؤجر.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 5: Late Payment & Default{"\n"}
                                                            If the Lessee fails to pay the monthly rent within five (5) days of the due date, a late fee penalty of L.E{contract?.lateFeeAmount || 0} shall be assessed. If the payment delay continues beyond fifteen (15) days, the Lessor shall have the absolute right to terminate this agreement immediately, evict the Lessee, and reclaim possession of the property without requiring a prior court ruling or formal notices.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الخامس: التأخر في سداد الأجرة والفسخ{"\n"}
                                                            في حالة تأخر المستأجر في دفع الإيجار لمدة تتجاوز خمسة (٥) أيام من تاريخ الاستحقاق، تطبق غرامة تأخير قدرها {toArNum(contract?.lateFeeAmount || 0, true)} جنية مصري. وإذا استمر التأخر في السداد لأكثر من خمسة عشر (١٥) يوماً، يحق للمؤجر فسخ العقد فوراً، وإخلاء المستأجر واسترداد حيازة العقار دون الحاجة لحكم قضائي مسبق أو إجراءات رسمية.
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
                                                            يجب استخدام العقار المؤجر لأغراض السكن الخاص فقط للمستأجر وأفراد أسرته المقيمين معه. ويتعهد المستأجر بالالتزام بجميع القوانين واللوائح السكنية المحلية، ويُحظر عليه القيام بأي أنشطة تجارية أو مهنية أو غير قانونية داخل العقار، أو التسبب في أي إزعاج أو مضايقة للجيران.
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