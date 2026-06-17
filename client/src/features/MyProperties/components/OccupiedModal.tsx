// client\src\features\MyProperties\components\OccupiedModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    FaTimes, FaCalendarAlt, FaHourglassHalf,
    FaUsers, FaExclamationTriangle, FaSignOutAlt,
    FaRegCalendarCheck, FaSpinner, FaCheckCircle,
    FaFileDownload, FaEye, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { contractService, type LandlordContract, type ContractInstallments } from '../../../services/contract.service';
import pdfService, { type PDFContractData } from '../../../services/pdf.service';
import { normalizeSignatureUrl } from '../../../shared/utils/signatureUrl';
import './OccupiedModal.css';

interface OccupiedModalProps {
    contract: LandlordContract;
    onClose: () => void;
}

const OccupiedModal: React.FC<OccupiedModalProps> = ({ contract, onClose }) => {
    const { t } = useTranslation();
    const landlordEmail = contract?.landlord?.email;
    const tenantEmail = contract?.tenant?.email;
    const landlordNameAr = landlordEmail ? (localStorage.getItem('arabicName_email_' + landlordEmail) || undefined) : undefined;
    const tenantNameAr = tenantEmail ? (localStorage.getItem('arabicName_email_' + tenantEmail) || undefined) : undefined;

    const [previewLang, setPreviewLang] = useState<'en' | 'ar' | null>(null);
    const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Reset page when lang changes
    useEffect(() => {
        if (previewLang) setCurrentPreviewPage(1);
    }, [previewLang]);
    const [installments, setInstallments] = useState<ContractInstallments | null>(null);

    // Reporting States
    const [reportView, setReportView] = useState<'none' | 'report' | 'terminate'>('none');
    const [reportReason, setReportReason] = useState('LATE_PAYMENT');
    const [terminateScenario, setTerminateScenario] = useState('Property Damage');
    const [reportDetails, setReportDetails] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch installments to get latest payment details
                const instRes = await contractService.getContractInstallments(contract.id);
                if (instRes) {
                    setInstallments(instRes);
                }
            } catch (err) {
                console.error("Failed to fetch installments", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [contract.id]);

    const handleReportSubmit = async () => {
        if (!reportDetails.trim()) {
            setErrorMsg('Please provide details for the report.');
            return;
        }
        setActionLoading(true);
        setErrorMsg('');
        try {
            await contractService.reportTenant(contract.id, {
                reason: reportReason,
                details: reportDetails
            });
            setSuccessMsg('Report submitted successfully to the administration.');
            setTimeout(() => {
                setReportView('none');
                setSuccessMsg('');
                setReportDetails('');
            }, 3000);
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMsg(error.response?.data?.message || 'Failed to submit report.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleTerminateSubmit = async () => {
        if (!reportDetails.trim()) {
            setErrorMsg('Please provide details or reasons for early termination.');
            return;
        }
        setActionLoading(true);
        setErrorMsg('');
        try {
            await contractService.terminateLease(contract.id, {
                scenario: terminateScenario,
                details: reportDetails,
                reason: `Landlord early termination (${terminateScenario}): ${reportDetails}`
            });
            setSuccessMsg('Lease termination request submitted to administration.');
            setTimeout(() => {
                setReportView('none');
                setSuccessMsg('');
                setReportDetails('');
                setTerminateScenario('Property Damage');
            }, 3000);
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMsg(error.response?.data?.message || 'Failed to submit request.');
        } finally {
            setActionLoading(false);
        }
    };

    // Derived Data
    const tenantName = contract.tenant
        ? `${contract.tenant.firstName} ${contract.tenant.lastName}`
        : 'Unknown Tenant';

    // Calculate dates
    const startDate = new Date(contract.moveInDate).toLocaleDateString();

    let endDate = '—';
    if (contract.moveInDate && contract.leaseDurationMonths) {
        const d = new Date(contract.moveInDate);
        d.setMonth(d.getMonth() + contract.leaseDurationMonths);
        endDate = d.toLocaleDateString();
    }

    // Installments processing
    let lastPaidDate = 'None';
    let upcomingDeadline = 'None';
    let upcomingAmount = 0;

    if (installments && installments.items.length > 0) {
        const paidItems = installments.items.filter(i => i.isPaid).sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime());
        if (paidItems.length > 0 && paidItems[0].paidAt) {
            lastPaidDate = new Date(paidItems[0].paidAt).toLocaleDateString();
        }

        const nextPayable = installments.items.find(i => !i.isPaid);
        if (nextPayable) {
            upcomingDeadline = new Date(nextPayable.dueDate).toLocaleDateString();
            upcomingAmount = nextPayable.totalAmount;
        }
    } else {
        // Fallback if no installments fetched yet
        upcomingAmount = contract.rentAmount || 0;
    }

    const landlordName = contract.landlord
        ? `${contract.landlord.firstName || ''} ${contract.landlord.lastName || ''}`.trim()
        : 'Landlord';

    const handleDownloadPDF = async (lang: 'en' | 'ar') => {
        if (!contract) return;
        const pdfData = {
            id: contract.id,
            property: contract.property?.title || 'Property',
            propertyAddress: contract.property?.address || 'Property Address',
            propertyType: contract.property?.type || 'Apartment',
            landlord: landlordName,
            landlordNameAr,
            landlordNationalId: contract.landlordNationalId,
            landlordAddress: contract.landlordAddress || 'Cairo, Egypt',
            tenant: tenantName,
            tenantNameAr,
            tenantNationalId: contract.tenantNationalId,
            tenantAddress: contract.tenantAddress || contract.property?.address || '',
            startDate: new Date(contract.moveInDate).toLocaleDateString(),
            duration: `${contract.leaseDurationMonths || 12} Months`,
            amount: contract.rentAmount,
            deposit: contract.securityDeposit || 0,
            lateFeeAmount: contract.lateFeeAmount || 0,
            permittedUse: contract.permittedUse || 'Residential purposes only',
            rightToEnter: contract.rightToEnter || 'With 24h notice',
            noticePeriod: contract.noticePeriod || '24 Hours',
            notice: contract.noticePeriod || '24 Hours',
            maintenanceResponsibilities: contract.maintenanceResponsibilities,
            landlordSignature: normalizeSignatureUrl(contract.landlordSignature),
            tenantSignature: normalizeSignatureUrl(contract.tenantSignature),
            executionDate: new Date(contract.createdAt).toLocaleDateString(),
        };
        await pdfService.generateContractPDF(pdfData as PDFContractData, lang);
    };

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
        amount: toArNum(contract?.rentAmount),
        deposit: toArNum(contract?.securityDeposit ?? contract?.deposit ?? 0),
        lateFee: toArNum(contract?.lateFeeAmount || 0),
        startDate: translateDate(contract?.moveInDate ? new Date(contract.moveInDate).toLocaleDateString() : ''),
        duration: formatDurationAr(`${contract?.leaseDurationMonths || 12} Months`),
        propertyType: previewLang === 'ar' ? 'وحدة سكنية' : (contract?.property?.type || 'Residential'),
        permittedUse: previewLang === 'ar' ? 'للسكن فقط' : (contract?.permittedUse || 'Residential purposes only'),
        rightToEnter: previewLang === 'ar' ? 'بإخطار مسبق ٢٤ ساعة' : (contract?.rightToEnter || 'With 24h notice'),
        notice: previewLang === 'ar' ? '٢٤ ساعة' : (contract?.noticePeriod || '24 Hours'),
        executionDate: translateDate(contract?.createdAt ? new Date(contract.createdAt).toLocaleDateString() : '')
    };

    return createPortal(
        <div className="occupied-modal-overlay" onClick={onClose} dir="ltr">
            <div className="occupied-modal-container" onClick={(e) => e.stopPropagation()}>

                <header className="occ-header">
                    <h2><FaCheckCircle /> Occupancy Details</h2>
                    <button className="occ-close-btn" onClick={onClose}><FaTimes /></button>
                </header>

                <div className="occ-content">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <FaSpinner className="fa-spin" size={30} color="#3b82f6" />
                        </div>
                    ) : (
                        <>
                            {/* Tenant Profile */}
                            <div className="occ-tenant-profile">
                                <div className="occ-tenant-avatar">
                                    <img
                                        src={contract.tenant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantName)}&background=6366f1&color=fff&size=120`}
                                        alt={tenantName}
                                        onError={(e) => {
                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantName)}&background=6366f1&color=fff&size=120`;
                                        }}
                                    />
                                </div>
                                <div className="occ-tenant-info">
                                    <h3>{tenantName}</h3>
                                    <p>{contract.tenant?.email}</p>
                                </div>
                            </div>

                            {/* Financial Banner */}
                            <div className="occ-financial-banner">
                                <div className="occ-fin-item">
                                    <label>Monthly Rent</label>
                                    <span>${contract.rentAmount}</span>
                                </div>
                                <div className="occ-fin-divider"></div>
                                <div className="occ-fin-item">
                                    <label>Next Payment Due</label>
                                    <span>${upcomingAmount}</span>
                                </div>
                                <div className="occ-fin-divider"></div>
                                <div className="occ-fin-item">
                                    <label>Deadline</label>
                                    <span style={{ fontSize: '1.2rem', marginTop: '6px' }}>{upcomingDeadline}</span>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="occ-details-grid">
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon blue"><FaCalendarAlt /></div>
                                    <div className="occ-detail-text">
                                        <label>Lease Period</label>
                                        <span>{startDate} - {endDate}</span>
                                    </div>
                                </div>
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon purple"><FaHourglassHalf /></div>
                                    <div className="occ-detail-text">
                                        <label>Total Duration</label>
                                        <span>{contract.leaseDurationMonths} Months</span>
                                    </div>
                                </div>
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon green"><FaUsers /></div>
                                    <div className="occ-detail-text">
                                        <label>Occupants</label>
                                        <span>{contract.maxOccupants || 1} Registered</span>
                                    </div>
                                </div>
                                <div className="occ-detail-card">
                                    <div className="occ-detail-icon orange"><FaRegCalendarCheck /></div>
                                    <div className="occ-detail-text">
                                        <label>Last Rent Paid</label>
                                        <span>{lastPaidDate}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contract Documents */}
                            <div className="occ-contract-section">
                                <h4>Contract Agreements</h4>
                                <div className="occ-contract-buttons-container">
                                    <div className="occ-contract-action-group">
                                        <span className="occ-action-label">Agreement PDF</span>
                                        <div className="occ-action-button-group">
                                            <button className="occ-action-pill-btn" onClick={() => handleDownloadPDF('en')} title="Download English PDF">
                                                <FaFileDownload /> EN
                                            </button>
                                            <button className="occ-action-pill-btn" onClick={() => handleDownloadPDF('ar')} title="Download Arabic PDF">
                                                <FaFileDownload /> AR
                                            </button>
                                        </div>
                                    </div>
                                    <div className="occ-contract-action-group">
                                        <span className="occ-action-label">Digital Lease</span>
                                        <div className="occ-action-button-group">
                                            <button className="occ-action-pill-btn" onClick={() => setPreviewLang('en')} title="View English Lease">
                                                <FaEye /> EN
                                            </button>
                                            <button className="occ-action-pill-btn" onClick={() => setPreviewLang('ar')} title="View Arabic Lease">
                                                <FaEye /> AR
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Inline Reporting Forms */}
                            {reportView !== 'none' && (
                                <div className="occ-report-form animate-fade-in" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>
                                        {reportView === 'report' ? 'Report Tenant' : 'Request Lease Termination'}
                                    </h4>

                                    {errorMsg && <div style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{errorMsg}</div>}
                                    {successMsg && <div style={{ color: '#10b981', marginBottom: '12px', fontSize: '0.9rem' }}><FaCheckCircle /> {successMsg}</div>}

                                    {reportView === 'report' && (
                                        <div className="occ-form-group">
                                            <label>Reason for Report</label>
                                            <select className="occ-select" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                                                <option value="LATE_PAYMENT">Late Payment</option>
                                                <option value="PROPERTY_DAMAGE">Property Damage</option>
                                                <option value="NOISE_COMPLAINT">Noise Complaint</option>
                                                <option value="UNAUTHORIZED_OCCUPANTS">Unauthorized Occupants</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                    )}

                                    {reportView === 'terminate' && (
                                        <div className="occ-form-group">
                                            <label>Termination Reason</label>
                                            <select className="occ-select" value={terminateScenario} onChange={(e) => setTerminateScenario(e.target.value)}>
                                                <option value="Property Damage">Property Damage</option>
                                                <option value="Lease Violation">Lease Violation (Illegal Activity)</option>
                                                <option value="Unauthorized Occupancy">Unauthorized Occupancy</option>
                                                <option value="LANDLORD_INITIATED">Early Exit (No tenant fault)</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="occ-form-group">
                                        <label>{reportView === 'report' ? 'Details' : 'Additional Details & Explanation'}</label>
                                        <textarea
                                            className="occ-textarea"
                                            placeholder="Please provide details for the administration..."
                                            value={reportDetails}
                                            onChange={(e) => setReportDetails(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="occ-submit-actions">
                                        <button className="occ-btn-cancel" onClick={() => setReportView('none')} disabled={actionLoading}>Cancel</button>
                                        <button
                                            className="occ-btn-submit"
                                            onClick={reportView === 'report' ? handleReportSubmit : handleTerminateSubmit}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? <FaSpinner className="fa-spin" /> : 'Submit to Admin'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {reportView === 'none' && !loading && (
                    <footer className="occ-actions">
                        <button className="occ-btn occ-btn-report" onClick={() => setReportView('report')}>
                            <FaExclamationTriangle /> Report Tenant
                        </button>
                        <button className="occ-btn occ-btn-terminate" onClick={() => setReportView('terminate')}>
                            <FaSignOutAlt /> Terminate Lease
                        </button>
                    </footer>
                )}

            </div>

            {previewLang && (
                <div className="contract-preview-overlay" onClick={(e) => { e.stopPropagation(); setPreviewLang(null); }}>
                    <div className="preview-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <header className="preview-header">
                            <div className="header-left">
                                <h3>{t('activeLease.contractPreview', 'Contract Preview')} ({previewLang.toUpperCase()})</h3>
                                <span className="page-indicator">
                                    {previewLang === 'ar'
                                        ? `صفحة ${toArNum(currentPreviewPage, true)} من ٢`
                                        : `Page ${currentPreviewPage} of 2`}
                                </span>
                            </div>
                            <div className="header-actions">
                                <div className="pagination-controls">
                                    <button
                                        className="icon-btn"
                                        disabled={currentPreviewPage === 1}
                                        onClick={() => setCurrentPreviewPage(1)}
                                    >
                                        <FaChevronLeft size={20} />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        disabled={currentPreviewPage === 2}
                                        onClick={() => setCurrentPreviewPage(2)}
                                    >
                                        <FaChevronRight size={20} />
                                    </button>
                                </div>
                                <button className="icon-btn close-preview" onClick={() => setPreviewLang(null)}><FaTimes size={20} /></button>
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
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{previewLang === 'ar' ? (landlordNameAr || landlordName) : landlordName}</span><br />
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract?.landlordNationalId)}</span><br />
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract?.landlordAddress || 'Cairo, Egypt'}</span>
                                                </div>
                                                <div className="pdf-party-card">
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Lessee (Tenant)' : 'المستأجر (الطرف الثاني)'}</span>
                                                    <span className="pdf-data-value" style={{ fontWeight: 'bold' }}>{previewLang === 'ar' ? (tenantNameAr || tenantName) : tenantName}</span><br />
                                                    <span className="pdf-data-label" style={{ marginTop: '8px' }}>{previewLang === 'en' ? 'National ID' : 'الرقم القومي'}:</span> <span className="pdf-data-value">{toArNum(contract?.tenantNationalId)}</span><br />
                                                    <span className="pdf-data-label">{previewLang === 'en' ? 'Primary Address' : 'العنوان الحالي'}:</span> <span className="pdf-data-value">{contract?.tenantAddress || contract.property?.address || ''}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Property & Terms */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '2. PROPERTY & TERMS' : '٢. بيانات العقار والمدة'}</div>
                                            <div className="pdf-data-grid">
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Property Address' : 'عنوان العقار المؤجر'}</span><span className="pdf-data-value">{contract.property?.address || 'Property Address'}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Property Type' : 'نوع العقار'}</span><span className="pdf-data-value">{localizedPreview.propertyType}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Lease Start Date' : 'تاريخ بداية العقد'}</span><span className="pdf-data-value">{localizedPreview.startDate}</span></div>
                                                <div className="pdf-data-item"><span className="pdf-data-label">{previewLang === 'en' ? 'Lease Duration' : 'مدة التعاقد'}</span><span className="pdf-data-value">{localizedPreview.duration}</span></div>
                                            </div>
                                        </div>

                                        {/* Section 3: Financials */}
                                        <div className="pdf-section">
                                            <div className="pdf-section-title">{previewLang === 'en' ? '3. FINANCIAL OBLIGATIONS' : '٣. الالتزامات المالية'}</div>
                                            <div className="pdf-data-grid-3col">
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
                                                            The Lessor hereby leases to the Lessee, and the Lessee hereby leases from the Lessor, the real property located at {contract.property?.address || 'Property Address'}, consisting of the specific residential unit ({contract.property?.type || 'Apartment'}). The Lessee acknowledges that they have inspected the property and found it to be in good, clean, and tenantable condition, suitable for its permitted residential use.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الأول: وصف العقار المؤجر{"\n"}
                                                            يؤجر المؤجر بموجب هذا العقد للمستأجر، ويستأجر المستأجر من المؤجر، العقار الكائن في {contract.property?.address || 'عنوان العقار'}، والمكون من الوحدة السكنية المحددة (وحدة سكنية). ويقر المستأجر بأنه قد عاين العقار المعاينة التامة النافية للجهالة ووجده في حالة جيدة ونظيفة وصالحة للاستخدام السكني المخصص له.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 2: Lease Term & Duration{"\n"}
                                                            This lease agreement shall commence on {startDate} and continue for a fixed duration of {contract?.leaseDurationMonths || 12} Months. Upon the expiration of the lease term, this agreement shall terminate automatically. Any renewal or extension of this lease must be agreed upon in writing by both parties by signing a new agreement prior to the expiration date.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثاني: مدة عقد الإيجار{"\n"}
                                                            يبدأ سريان هذا العقد في تاريخ {translateDate(startDate, true)} ويستمر لمدة محددة قدرها {formatDurationAr(`${contract?.leaseDurationMonths || 12} Months`, true)}. وينتهي هذا العقد تلقائياً بقوة القانون عند نهاية مدته دون حاجة إلى إخطار أو إنذار. ولا يتجدد هذا العقد تلقائياً إلا بموجب اتفاق مكتوب وجديد موقع من كلا الطرفين قبل تاريخ انتهاء العقد.
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pdf-clause-item">
                                                    {previewLang === 'en' ? (
                                                        <>
                                                            Term 3: Rental Value & Payments{"\n"}
                                                            The monthly rent for the leased property is set at L.E{contract.rentAmount}, payable in advance on the first day of each calendar month. Payments must be processed through the HOMI platform or directly to the Lessor, who shall issue a digital receipt. The Lessee shall not withhold or deduct any amount from the monthly rent for any reason whatsoever.
                                                        </>
                                                    ) : (
                                                        <>
                                                            البند الثالث: القيمة الإيجارية وسدادها{"\n"}
                                                            تم تحديد الأجرة الشهرية للعقار المؤجر بمبلغ {toArNum(contract.rentAmount, true)} جنية مصري، وتدفع مقدماً في اليوم الأول من كل شهر ميلادي. يجب سداد القيمة الإيجارية من خلال منصة هومي (HOMI) أو مباشرة للمؤجر الذي يلتزم بإصدار إيصال رقمي يفيد الاستلام. ولا يحق للمستأجر حبس أو خصم أي جزء من الأجرة الشهرية لأي سبب من الأسباب.
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

        </div>,
        document.body
    );
};

export default OccupiedModal;
