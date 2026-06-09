import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { normalizeSignatureUrl } from '../shared/utils/signatureUrl';

export interface PDFContractData {
    id: string;
    property: string;
    propertyAddress: string;
    propertyType: string;
    landlord: string;
    landlordNameAr?: string;   // Arabic name for the landlord (used in AR PDF)
    landlordNationalId?: string;
    landlordAddress?: string;
    tenant: string;
    tenantNameAr?: string;     // Arabic name for the tenant (used in AR PDF)
    tenantNationalId?: string;
    tenantAddress?: string;
    startDate: string;
    duration: string;
    amount: number;
    deposit: number;
    lateFeeAmount?: number;
    permittedUse?: string;
    rightToEnter?: string;
    noticePeriod?: string;
    maintenanceResponsibilities?: Array<{ area: string; responsible_party: string }>;
    landlordSignature?: string;
    tenantSignature?: string;
    executionDate: string;
}

class PDFService {
    async generateContractPDF(data: PDFContractData, lang: 'en' | 'ar') {
        const isAr = lang === 'ar';
        const landlordSignature = normalizeSignatureUrl(data.landlordSignature);
        const tenantSignature = normalizeSignatureUrl(data.tenantSignature);

        // Helper for styles
        const styles = `
            .pdf-page {
                width: 210mm;
                min-height: 297mm;
                padding: 20mm;
                background: white;
                color: #1a1a1a;
                font-family: ${isAr ? '"Segoe UI", Tahoma, Arial, sans-serif' : 'serif'};
                box-sizing: border-box;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            .pdf-header {
                text-align: center;
                border-bottom: 2px solid #2c3e50;
                padding-bottom: 15px;
                margin-bottom: 25px;
            }
            .pdf-header h1 {
                margin: 0;
                font-size: 28px;
                color: #2c3e50;
                letter-spacing: ${isAr ? '0' : '1px'};
                font-weight: bold;
                line-height: 1.2;
            }
            .pdf-header .ref-no {
                font-size: 14px;
                color: #7f8c8d;
                margin-top: 8px;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-size: 18px;
                font-weight: bold;
                color: #2c3e50;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 8px;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: ${isAr ? '0' : '0.5px'};
            }
            .data-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                font-size: 14px;
            }
            .data-item {
                margin-bottom: 10px;
            }
            .data-label {
                font-weight: bold;
                color: #34495e;
                display: block;
                margin-bottom: 4px;
                font-size: 12px;
                text-transform: uppercase;
            }
            .data-value {
                color: #2c3e50;
                font-size: 15px;
            }
            .party-card {
                border: 1px solid #ecf0f1;
                padding: 15px;
                border-radius: 8px;
                background: #fdfdfd;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            .clause-list {
                font-size: 14px;
                line-height: 1.7;
                color: #2c3e50;
            }
            .clause-item {
                margin-bottom: 15px;
                text-align: justify;
                padding-bottom: 8px;
                border-bottom: 1px solid #f9f9f9;
            }
            .signature-area {
                margin-top: auto;
                display: flex;
                justify-content: space-between;
                padding-top: 40px;
            }
            .sig-box {
                width: 45%;
                text-align: center;
                border: 1px solid #eee;
                padding: 20px;
                border-radius: 10px;
                background: #fafafa;
            }
            .sig-img {
                max-width: 200px;
                max-height: 80px;
                margin: 15px 0;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 11px;
                color: #95a5a6;
                border-top: 1px solid #ecf0f1;
                padding-top: 15px;
                letter-spacing: ${isAr ? '0' : '0.5px'};
                width: 100%;
            }
            [dir="rtl"] .section-title { text-align: right; }
            [dir="rtl"] .data-grid { text-align: right; }
            [dir="rtl"] .clause-item { text-align: right; }
            [dir="rtl"] .pdf-header { text-align: center; }
            [dir="rtl"] .footer { text-align: center; }
        `;

        const t = {
            en: {
                title: 'RESIDENTIAL LEASE AGREEMENT',
                ref: 'Contract Ref',
                sec1: '1. PARTIES INVOLVED',
                lessor: 'Lessor (Landlord)',
                lessee: 'Lessee (Tenant)',
                sec2: '2. PROPERTY & TERMS',
                sec3: '3. FINANCIAL OBLIGATIONS',
                sec4: '4. RULES & PERMISSIONS',
                sec5: '5. LEGAL CLAUSES & COVENANTS',
                id: 'National ID',
                address: 'Primary Address',
                propAddr: 'Property Address',
                propType: 'Property Type',
                startDate: 'Lease Start Date',
                duration: 'Lease Duration',
                monthlyRent: 'Monthly Rent Amount',
                securityDeposit: 'Security Deposit',
                lateFee: 'Late Fee Penalty',
                permittedUse: 'Permitted Use',
                rightToEnter: 'Access/Entry Rights',
                notice: 'Notice Period',
                landlordSig: 'Landlord Signature',
                tenantSig: 'Tenant Signature',
                date: 'Execution Date',
                footer: 'Digitally Verified Agreement • HOMI Platform • Timestamped Security',
                clause1: '1. Description: The property is located at {{address}}. It consists of the unit specified ({{type}}).',
                clause2: '2. Duration: The contract starts on {{startDate}} and has a duration of {{duration}}.',
                clause3: '3. Value: The monthly rent is {{amount}}. It must be paid in advance at the beginning of each month.',
                clause4: '4. Deposit: A security deposit of {{deposit}} is paid and held in HOMi escrow. Refunded to Tenant on successful completion, or forfeited to Landlord on non-payment default.',
                clause5: '5. Late Payment: A late fee of {{lateFee}} applies if payment is delayed more than 5 days.',
                clause6: '6. No Subleasing: Lessee cannot sublease or make changes without written consent.',
                clause7: '7. Use: Property must be used for residential purposes only. Any other use terminates contract.',
                clause8: '8. Expenses: Lessee expenses (decorations/improvements) are not reimbursable by lessor.',
                clause9: '9. Condition: Lessee must return property in original condition. Liable for negligence.',
                clause10: '10. Eviction: Lessee must vacate at end of term. Delay results in illegal occupation.',
                clause11: '11. Utilities: Lessee is responsible for water, electricity, gas, and internet bills.',
                clause12: '12. Termination: Early termination requires one month notice or one month rent penalty.',
                clause13: '13. Correspondence: Addresses in contract are valid for all legal notices.',
                clause14: '14. Jurisdiction: Digital copies provided to both parties. Subject to local courts.'
            },
            ar: {
                title: 'عقد إيجار وحدة سكنية',
                ref: 'رقم مرجع العقد',
                sec1: '١. أطراف التعاقد',
                lessor: 'المؤجر (الطرف الأول)',
                lessee: 'المستأجر (الطرف الثاني)',
                sec2: '٢. بيانات العقار والمدة',
                sec3: '٣. الالتزامات المالية',
                sec4: '٤. القواعد والأذونات',
                sec5: '٥. البنود القانونية',
                id: 'الرقم القومي',
                address: 'العنوان الحالي',
                propAddr: 'عنوان العقار المؤجر',
                propType: 'نوع العقار',
                startDate: 'تاريخ بداية العقد',
                duration: 'مدة التعاقد',
                monthlyRent: 'القيمة الإيجارية الشهرية',
                securityDeposit: 'مبلغ التأمين',
                lateFee: 'غرامة التأخير',
                permittedUse: 'الغرض من الاستخدام',
                rightToEnter: 'حق الدخول للمعاينة',
                notice: 'مدة الإخطار المسبق',
                landlordSig: 'توقيع المؤجر',
                tenantSig: 'توقيع المستأجر',
                date: 'تاريخ التوقيع',
                footer: 'عقد موثق رقمياً • منصة هومي (HOMI) • حماية تقنية وتوقيع زمنى',
                clause1: '١. الوصف: يقع العقار في {{address}}. ويتكون من الوحدة المحددة ({{type}}).',
                clause2: '٢. المدة: يبدأ العقد في {{startDate}} ومدته {{duration}}.',
                clause3: '٣. القيمة: مبلغ الإيجار الشهرى هو {{amount}}. يجب دفعه مقدماً في بداية كل شهر.',
                clause4: '٤. التأمين: يتم دفع تأمين قدره {{deposit}} يُحتفظ به في ضمان هومي. يُرد للمستأجر عند إتمام العقد بنجاح، أو يُصادر للمؤجر في حال تعثر السداد.',
                clause5: '٥. التأخير: تطبق غرامة {{lateFee}} في حال التأخر عن الدفع لأكثر من ٥ أيام.',
                clause6: '٦. التنازل: لا يجوز للمستأجر التنازل عن الإيجار أو تغيير العقار دون موافقة.',
                clause7: '٧. الاستخدام: يستخدم العقار للسكن فقط. أي استخدام آخر ينهي العقد تلقائياً.',
                clause8: '٨. المصاريف: مصاريف المستأجر (تحسينات/ديكور) لا يستردها وتصبح جزءاً من العقار.',
                clause9: '٩. الحالة: يجب إعادة العقار بحالته الأصلية. المستأجر مسؤول عن أي إهمال.',
                clause10: '١٠. الإخلاء: يجب الإخلاء عند انتهاء العقد. التأخير يعتبر شغلاً غير قانوني.',
                clause11: '١١. المرافق: المستأجر مسؤول عن دفع فواتير الكهرباء والمياه والغاز والإنترنت.',
                clause12: '١٢. الإنهاء: يتطلب الإنهاء المبكر إخطاراً قبل شهر أو دفع إيجار شهر غرامة.',
                clause13: '١٣. المراسلات: العناوين المذكورة صحيحة لجميع الإخطارات القانونية والمراسلات.',
                clause14: '١٤. الاختصاص: نسختان رقميتان للطرفين. يخضع العقد للمحاكم المحلية.'
            }
        }[lang];

        const toArNum = (val: string | number | undefined | null) => {
            if (val === undefined || val === null) return '—';
            if (!isAr) return val.toString();
            return val.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
        };

        const monthsAr: { [key: string]: string } = {
            'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس', 'Apr': 'أبريل', 'May': 'مايو', 'Jun': 'يونيو',
            'Jul': 'يوليو', 'Aug': 'أغسطس', 'Sep': 'سبتمبر', 'Oct': 'أكتوبر', 'Nov': 'نوفمبر', 'Dec': 'ديسمبر',
            'January': 'يناير', 'February': 'فبراير', 'March': 'مارس', 'April': 'أبريل', 'June': 'يونيو',
            'July': 'يوليو', 'August': 'أغسطس', 'September': 'سبتمبر', 'October': 'أكتوبر', 'November': 'نوفمبر', 'December': 'ديسمبر'
        };

        const translateDate = (dateStr: string | undefined | null) => {
            if (!dateStr) return '—';
            if (!isAr) return dateStr;
            let res = dateStr;
            Object.keys(monthsAr).forEach(m => {
                res = res.replace(new RegExp(m, 'gi'), monthsAr[m]);
            });
            return toArNum(res);
        };

        const formatDurationAr = (durationStr: string | undefined | null) => {
            if (!durationStr) return '—';
            if (!isAr) return durationStr;
            
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

        const replace = (text: string, values: any) => text.replace(/{{(\w+)}}/g, (_, k) => values[k] || '');

        const localizedData = {
            id: toArNum(data.id),
            amount: toArNum(data.amount),
            deposit: toArNum(data.deposit),
            lateFee: toArNum(data.lateFeeAmount || 0),
            startDate: translateDate(data.startDate),
            duration: formatDurationAr(data.duration),
            propertyType: isAr ? 'وحدة سكنية' : (data.propertyType || 'Residential'),
            permittedUse: isAr ? 'للسكن فقط' : (data.permittedUse || 'Residential'),
            rightToEnter: isAr ? 'بإخطار مسبق ٢٤ ساعة' : (data.rightToEnter || 'With 24h Notice'),
            notice: isAr ? '٢٤ ساعة' : (data.noticePeriod || '24 Hours'),
            executionDate: translateDate(data.executionDate)
        };

        const clauses = [
            replace(t.clause1, { address: data.propertyAddress, type: localizedData.propertyType }),
            replace(t.clause2, { startDate: localizedData.startDate, duration: localizedData.duration }),
            replace(t.clause3, { amount: `${isAr ? '' : 'L.E'}${localizedData.amount}${isAr ? ' جنية مصري' : ''}` }),
            replace(t.clause4, { deposit: `${isAr ? '' : 'L.E'}${localizedData.deposit}${isAr ? ' جنية مصري' : ''}` }),
            replace(t.clause5, { lateFee: `${isAr ? '' : 'L.E'}${localizedData.lateFee}${isAr ? ' جنية مصري' : ''}` }),
            t.clause6, t.clause7, t.clause8, t.clause9, t.clause10, t.clause11, t.clause12, t.clause13, t.clause14
        ];

        const renderPage = (content: string) => `
            <div class="pdf-page" dir="${isAr ? 'rtl' : 'ltr'}">
                <style>${styles}</style>
                <div class="pdf-header">
                    <h1>${t.title}</h1>
                    <div class="ref-no">${t.ref}: ${localizedData.id}</div>
                </div>
                ${content}
                <div class="footer">${t.footer}</div>
            </div>
        `;

        const page1Content = `
            <div class="section">
                <div class="section-title">${t.sec1}</div>
                <div class="data-grid">
                    <div class="party-card">
                        <span class="data-label">${t.lessor}</span>
                        <span class="data-value" style="font-size: 15px; font-weight: bold;">${isAr ? (data.landlordNameAr || data.landlord) : data.landlord}</span><br/>
                        <span class="data-label" style="margin-top: 8px;">${t.id}:</span> <span class="data-value">${toArNum(data.landlordNationalId)}</span><br/>
                        <span class="data-label">${t.address}:</span> <span class="data-value">${data.landlordAddress || '—'}</span>
                    </div>
                    <div class="party-card">
                        <span class="data-label">${t.lessee}</span>
                        <span class="data-value" style="font-size: 15px; font-weight: bold;">${isAr ? (data.tenantNameAr || data.tenant) : data.tenant}</span><br/>
                        <span class="data-label" style="margin-top: 8px;">${t.id}:</span> <span class="data-value">${toArNum(data.tenantNationalId)}</span><br/>
                        <span class="data-label">${t.address}:</span> <span class="data-value">${data.tenantAddress || '—'}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${t.sec2}</div>
                <div class="data-grid">
                    <div class="data-item"><span class="data-label">${t.propAddr}</span><span class="data-value">${data.propertyAddress}</span></div>
                    <div class="data-item"><span class="data-label">${t.propType}</span><span class="data-value">${localizedData.propertyType}</span></div>
                    <div class="data-item"><span class="data-label">${t.startDate}</span><span class="data-value">${localizedData.startDate}</span></div>
                    <div class="data-item"><span class="data-label">${t.duration}</span><span class="data-value">${localizedData.duration}</span></div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${t.sec3}</div>
                <div class="data-grid" style="grid-template-columns: repeat(3, 1fr);">
                    <div class="data-item"><span class="data-label">${t.monthlyRent}</span><span class="data-value" style="font-size: 18px; color: #27ae60; font-weight: bold;">${isAr ? '' : 'L.E'}${localizedData.amount}${isAr ? ' جنية مصري' : ''}</span></div>
                    <div class="data-item"><span class="data-label">${t.securityDeposit}</span><span class="data-value" style="font-size: 18px; color: #2980b9; font-weight: bold;">${isAr ? '' : 'L.E'}${localizedData.deposit}${isAr ? ' جنية مصري' : ''}</span></div>
                    <div class="data-item"><span class="data-label">${t.lateFee}</span><span class="data-value" style="font-size: 18px; color: #c0392b; font-weight: bold;">${isAr ? '' : 'L.E'}${localizedData.lateFee}${isAr ? ' جنية مصري' : ''}</span></div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${t.sec4}</div>
                <div class="data-grid">
                    <div class="data-item"><span class="data-label">${t.permittedUse}</span><span class="data-value">${localizedData.permittedUse}</span></div>
                    <div class="data-item"><span class="data-label">${t.rightToEnter}</span><span class="data-value">${localizedData.rightToEnter}</span></div>
                    <div class="data-item"><span class="data-label">${t.notice}</span><span class="data-value">${localizedData.notice}</span></div>
                </div>
            </div>
        `;

        const page2Content = `
            <div class="section">
                <div class="section-title">${t.sec5}</div>
                <div class="clause-list">
                    ${clauses.map(c => `<div class="clause-item">${c}</div>`).join('')}
                </div>
            </div>

            <div class="section signature-area">
                <div class="sig-box">
                    <span class="data-label">${t.landlordSig}</span>
                    ${landlordSignature ? `<img src="${landlordSignature}" class="sig-img" />` : '<div style="height: 70px; border: 1px dashed #ccc; margin: 10px 0;"></div>'}
                    <div style="font-size: 11px;">${t.date}: ${localizedData.executionDate}</div>
                </div>
                <div class="sig-box">
                    <span class="data-label">${t.tenantSig}</span>
                    ${tenantSignature ? `<img src="${tenantSignature}" class="sig-img" />` : '<div style="height: 70px; border: 1px dashed #ccc; margin: 10px 0;"></div>'}
                    <div style="font-size: 11px;">${t.date}: ${localizedData.executionDate}</div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.innerHTML = renderPage(page1Content) + renderPage(page2Content);
        document.body.appendChild(container);

        try {
            const pages = container.querySelectorAll('.pdf-page');
            const pdf = new jsPDF('p', 'mm', 'a4');

            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i] as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                });
                const imgData = canvas.toDataURL('image/png');
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            }

            pdf.save(`${data.property.replace(/\s+/g, '_')}_Contract_${lang}.pdf`);
        } finally {
            document.body.removeChild(container);
        }
    }
}

export default new PDFService();
