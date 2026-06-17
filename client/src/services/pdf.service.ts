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
                white-space: pre-line;
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
                clause1: 'Term 1: Description of the Rented Property\nThe Lessor hereby leases to the Lessee, and the Lessee hereby leases from the Lessor, the real property located at {{address}}, consisting of the specific residential unit ({{type}}). The Lessee acknowledges that they have inspected the property and found it to be in good, clean, and tenantable condition, suitable for its permitted residential use.',
                clause2: 'Term 2: Lease Term & Duration\nThis lease agreement shall commence on {{startDate}} and continue for a fixed duration of {{duration}}. Upon the expiration of the lease term, this agreement shall terminate automatically. Any renewal or extension of this lease must be agreed upon in writing by both parties by signing a new agreement prior to the expiration date.',
                clause3: 'Term 3: Rental Value & Payments\nThe monthly rent for the leased property is set at {{amount}}, payable in advance on the first day of each calendar month. Payments must be processed through the HOMI platform or directly to the Lessor, who shall issue a digital receipt. The Lessee shall not withhold or deduct any amount from the monthly rent for any reason whatsoever.',
                clause4: 'Term 4: Security Deposit\nA security deposit of {{deposit}} shall be paid by the Lessee and held securely in HOMI\'s escrow system during the active lease cycle. The Lessor shall have no access to these funds while the lease remains active. Upon successful completion of the lease term and full payment of all financial obligations, the security deposit shall be automatically refunded to the Lessee. If the lease is terminated due to Lessee\'s default, non-payment, or breach of contract, the security deposit shall be forfeited and released to the Lessor.',
                clause5: 'Term 5: Late Payment & Default\nIf the Lessee fails to pay the monthly rent within five (5) days of the due date, a late fee penalty of {{lateFee}} shall be assessed. If the payment delay continues beyond fifteen (15) days, the Lessor shall have the absolute right to terminate this agreement immediately, evict the Lessee, and reclaim possession of the property without requiring a prior court ruling or formal notices.',
                clause6: 'Term 6: Subleasing & Assignments\nThe Lessee is strictly prohibited from subleasing the property, assigning this lease, or transferring any part of the tenancy to a third party without obtaining the prior written consent of the Lessor. Any unauthorized subleasing or assignment shall be considered a material breach and shall result in the immediate termination of this contract.',
                clause7: 'Term 7: Permitted Use of the Property\nThe leased property must be used solely and exclusively for residential purposes by the Lessee and their immediate family members. The Lessee shall comply with all local housing regulations and shall not conduct any commercial, professional, or illegal activities within the premises, nor cause any disturbance or nuisance to the neighbors.',
                clause8: 'Term 8: Modifications & Alterations\nThe Lessee shall not perform any structural modifications, alterations, additions, or decorations to the property (such as drilling walls, dividing rooms, or changing doors and windows) without the prior written consent of the Lessor. In the event of unauthorized changes, the Lessee must restore the property to its original state at their own expense.',
                clause9: 'Term 9: Maintenance & Care\nThe Lessee commits to using the property with utmost care and responsibility. The Lessee shall be responsible for routine minor maintenance and repairs resulting from daily use and negligence. Major structural repairs and maintenance of core building systems shall be the responsibility of the Lessor, in accordance with the maintenance responsibility allocation set forth in this agreement.\n\nMaintenance responsibilities are separated and allocated between the parties as specified in the contract details. Each party is solely responsible for paying for their approved maintenance obligations.',
                clause10: 'Term 10: Eviction & Holdover Compensation\nUpon the expiration or termination of this lease, the Lessee must vacate the property and return it to the Lessor in its original clean condition. Any holdover or failure to vacate shall constitute illegal occupation, and the Lessee shall be liable to pay the Lessor double the daily rent rate for each day of delay as liquidated damages, in addition to legal costs.',
                clause11: 'Term 11: Utilities & Public Charges\nThe Lessee shall bear the full responsibility for the timely payment of all utility bills (including water, electricity, natural gas, internet, and trash collection fees) during the tenancy term. The Lessee must provide proof of payment of all such utility bills to the Lessor upon request.',
                clause12: 'Term 12: Early Termination & Notices\nNeither party may terminate this lease agreement early except as provided by law or by mutual written agreement. If the Lessee wishes to vacate the property prior to the end of the term, they must provide at least thirty (30) days written notice and pay a penalty equivalent to one month\'s rent, unless the early termination is due to Lessor\'s failure to maintain the property in habitable condition.\n\nEarly lease termination is governed by the following scenarios:\n- Tenant-Initiated Early Exit (No landlord fault): Paid current month rent, security deposit fully forfeited to the landlord.\n- Tenant-Initiated Mutual Agreement: Paid current month rent, deposit returned to tenant (unless otherwise agreed).\n- Tenant-Initiated Landlord Breach: Landlord fails to perform critical maintenance or property becomes uninhabitable; contract is ended immediately and deposit is fully refunded to tenant.\n- Landlord-Initiated Rent Default: Tenant fails to pay rent, deposit forfeited to landlord.\n- Landlord-Initiated Property Damage: Current month rent collected, deposit forfeited to landlord.\n- Landlord-Initiated Lease Violation: Current month rent collected, deposit forfeited to landlord.\n- Landlord-Initiated Unauthorized Occupancy: Current month rent collected, deposit forfeited to landlord, and damage deductions may apply.\nAdditionally, if a lease contract remains pending tenant signature or pending payment for more than ten (10) days from its creation date, it will be automatically cancelled by the platform. In the event of a divorce between the tenants/occupants during the lease duration, this property and lease agreement are excluded from the marital disputes or division.',
                clause13: 'Term 13: Addresses for Legal Notice\nAll notices, demands, or legal correspondence required under this lease shall be sent to the parties\' respective primary addresses stated in this agreement. Any change in address must be communicated to the other party in writing immediately, otherwise notices sent to the listed addresses shall be deemed legally delivered.',
                clause14: 'Term 14: Governing Law & Jurisdiction\nThis lease agreement shall be governed by and construed in accordance with the local laws of the Arab Republic of Egypt. Any disputes arising from the interpretation, execution, or breach of this agreement shall be subject to the exclusive jurisdiction of the competent local courts where the property is located.'
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
                clause1: 'البند الأول: وصف العقار المؤجر\nيؤجر المؤجر بموجب هذا العقد للمستأجر، ويستأجر المستأجر من المؤجر، العقار الكائن في {{address}}، والمكون من الوحدة السكنية المحددة ({{type}}). ويقر المستأجر بأنه قد عاين العقار المعاينة التامة النافية للجهالة ووجده في حالة جيدة ونظيفة وصالحة للاستخدام السكني المخصص له.',
                clause2: 'البند الثاني: مدة عقد الإيجار\nيبدأ سريان هذا العقد في تاريخ {{startDate}} ويستمر لمدة محددة قدرها {{duration}}. وينتهي هذا العقد تلقائياً بقوة القانون عند نهاية مدته دون حاجة إلى إخطار أو إنذار. ولا يتجدد هذا العقد تلقائياً إلا بموجب اتفاق مكتوب وجديد موقع من كلا الطرفين قبل تاريخ انتهاء العقد.',
                clause3: 'البند الثالث: القيمة الإيجارية وسدادها\nتم تحديد الأجرة الشهرية للعقار المؤجر بمبلغ {{amount}}، وتدفع مقدماً في اليوم الأول من كل شهر ميلادي. يجب سداد القيمة الإيجارية من خلال منصة هومي (HOMI) أو مباشرة للمؤجر الذي يلتزم بإصدار إيصال رقمي يفيد الاستلام. ولا يحق للمستأجر حبس أو خصم أي جزء من الأجرة الشهرية لأي سبب من الأسباب.',
                clause4: 'البند الرابع: مبلغ التأمين\nيلتزم المستأجر بسداد مبلغ تأمين قدره {{deposit}}، ويُاحتفظ به بشكل آمن في نظام الضمان التابع لمنصة هومي (HOMI) طوال فترة الإيجار النشطة. ولا يحق للمؤجر سحب أو استخدام هذه الأموال طالما ظل العقد سارياً. وعند انتهاء مدة الإيجار بنجاح وسداد المستأجر لكافة التزاماته المالية، يتم رد مبلغ التأمين تلقائياً إلى المستأجر. وفي حالة إنهاء العقد بسبب تقصير المستأجر أو عدم السداد أو الإخلال بشروط العقد، يُصادر مبلغ التأمين ويُحول لصالح المؤجر.',
                clause5: 'البند الخامس: التأخر في سداد الأجرة والفسخ\nفي حالة تأخر المستأجر في دفع الإيجار لمدة تتجاوز خمسة (٥) أيام من تاريخ الاستحقاق، تطبق غرامة تأخير قدرها {{lateFee}}. وإذا استمر التأخر في السداد لأكثر من خمسة عشر (١٥) يوماً، يحق للمؤجر فسخ العقد فوراً، وإخلاء المستأجر واسترداد حيازة العقار دون الحاجة لحكم قضائي مسبق أو إجراءات رسمية.',
                clause6: 'البند السادس: التأجير من الباطن والتنازل\nيُحظر على المستأجر حظراً تاماً إعادة تأجير العقار من الباطن، أو التنازل عن الإيجار، أو نقل أي جزء من حقوق الإيجار إلى الغير دون الحصول على موافقة كتابية مسبقة من المؤجر. ويعتبر أي تأجير من الباطن أو تنازل غير مصرح به إخلالاً جوهرياً يؤدي إلى فسخ العقد فوراً.',
                clause7: 'البند السابع: الغرض من الاستخدام\nيجب استخدام العقار المؤجر لأغراض السكن الخاص فقط للمستأجر وأفراد أسرته المقيمين معه. ويتعهد المستأجر بالالتزام بجميع القوانين واللوائح السكنية المحلية، ويُحظر عليه القيام بأي أنشطة تجارية أو مهنية أو غير قانونية داخل العقار، أو التسبب في أي إزعاج أو مضايقة للجيران.',
                clause8: 'البند الثامن: التعديلات والتغييرات بالعقار\nيُحظر على المستأجر إجراء أي تعديلات هيكلية، أو تغييرات، أو إضافات، أو أعمال ديكور في العقار (مثل هدم أو بناء أو تقسيم الغرف أو فتح نوافذ وأبواب) دون الحصول على موافقة كتابية مسبقة من المؤجر. وفي حالة القيام بذلك بدون موافقة، يلتزم المستأجر بإعادة العقار إلى حالته الأصلية على نفقته الخاصة.',
                clause9: 'البند التاسع: الصيانة والمحافظة على العقار\nيتعهد المستأجر باستخدام العقار المؤجر بعناية ومسؤولية تامة والمحافظة عليه. ويتحمل المستأجر تكاليف الصيانة الدورية البسيطة والإصلاحات الناتجة عن الاستخدام اليومي أو الإهمال. بينما يتحمل المؤجر مسؤولية الإصلاحات الهيكلية الكبرى وصيانة الأنظمة الأساسية للمبنى وفقاً لجدول توزيع مسؤوليات الصيانة الوارد في هذا العقد.\n\nيتم تقسيم وتحديد مسؤوليات الصيانة بين الطرفين كما هو موضح في تفاصيل العقد. ويتحمل كل طرف وحده التكاليف المالية لمسؤوليات الصيانة المعتمدة والخاصة به.',
                clause10: 'البند العاشر: الإخلاء عند انتهاء العقد والتعويض عن التأخير\nعند انتهاء مدة الإيجار أو فسخ العقد، يلتزم المستأجر بإخلاء العقار وتسليمه للمؤجر بحالته الأصلية النظيفة. ويعتبر أي تأخر في الإخلاء شغلاً غير قانوني للعقار، ويلتزم المستأجر بدفع تعويض للمؤجر يعادل ضعف الأجرة اليومية عن كل يوم تأخير كتعويض اتفاقي، بالإضافة إلى تحمل المصاريف القانونية.',
                clause11: 'البند الحادي عشر: فواتير المرافق والرسوم\nيتحمل المستأجر المسؤولية الكاملة عن سداد جميع فواتير المرافق (بما في ذلك المياه، والكهرباء، والغاز الطبيعي، والإنترنت، ورسوم النظافة) في مواعيدها المحددة طوال فترة الإيجار. ويلتزم المستأجر بتقديم ما يثبت سداد هذه الفواتير للمؤجر عند الطلب.',
                clause12: 'البند الثاني عشر: الإنهاء المبكر والإخطارات\nلا يحق لأي من الطرفين إنهاء هذا العقد مبكراً إلا بموجب ما ينص عليه القانون أو بالاتفاق الكتابي المتبادل. وفي حال رغبة المستأجر في الإخلاء قبل نهاية المدة، يجب عليه تقديم إخطار كتابي مدته ثلاثون (٣٠) يوماً على الأقل، وسداد غرامة تعادل أجرة شهر واحد، ما لم يكن الإنهاء بسبب إخفاق المؤجر في صيانة العقار.\n\nيخضع إنهاء عقد الإيجار المبكر للسيناريوهات التالية:\n- إنهاء بطلب من المستأجر (خروج مبكر بدون خطأ من المالك): يتم دفع إيجار الشهر الحالي بالكامل ومصادرة مبلغ التأمين بالكامل لصالح المالك.\n- إنهاء بطلب من المستأجر (اتفاق متبادل): يتم دفع إيجار الشهر الحالي بالكامل وإعادة مبلغ التأمين للمستأجر (ما لم يتم الاتفاق على خلاف ذلك).\n- إنهاء بطلب من المستأجر (إخلال من المالك): إخفاق المالك في إجراء الصيانة الأساسية أو عدم صلاحية العقار للسكن؛ ينتهي العقد فوراً ويُعاد مبلغ التأمين بالكامل للمستأجر.\n- إنهاء بطلب من المالك (التعثر عن سداد الإيجار): تعثر المستأجر في السداد، ويُصادر مبلغ التأمين بالكامل لصالح المالك.\n- إنهاء بطلب من المالك (تلفيات العقار): تحصيل إيجار الشهر الحالي ومصادرة مبلغ التأمين بالكامل لصالح المالك.\n- إنهاء بطلب من المالك (مخالفة العقد): تحصيل إيجار الشهر الحالي ومصادرة مبلغ التأمين بالكامل لصالح المالك.\n- إنهاء بطلب من المالك (إشغال غير مصرح به / إيجار من الباطن): تحصيل إيجار الشهر الحالي ومصادرة مبلغ التأمين بالكامل لصالح المالك مع تطبيق خصم الأضرار.\nبالإضافة إلى ذلك، إذا ظل عقد الإيجار قيد انتظار توقيع المستأجر أو قيد انتظار الدفع لأكثر من عشرة (١٠) أيام من تاريخ إنشائه، فسيتم إلغاؤه تلقائياً بواسطة المنصة. وفي حالة حدوث طلاق بين المستأجرين/الشاغلين خلال فترة الإيجار، فإن هذا العقار المستأجر وعقد الإيجار يخرجان من أي نزاعات أو تقسيم للمأوى الزوجي.',
                clause13: 'البند الثالث عشر: العناوين والمراسلات القانونية\nتعتبر جميع الإخطارات أو المراسلات القانونية المطلوبة بموجب هذا العقد صحيحة ومنتجة لأثرها إذا أُرسلت إلى العناوين الرئيسية لكل من الطرفين المذكورة في صدر هذا العقد. ويجب إبلاغ الطرف الآخر فوراً بأي تغيير في العنوان، وإلا اعتُبرت المراسلات الموجهة للعنوان المذكور مسلّمة قانوناً.',
                clause14: 'البند الرابع عشر: القانون الواجب التطبيق والاختصاص القضائي\nيخضع هذا العقد ويفسر وفقاً للقوانين المعمول بها في جمهورية مصر العربية. ويخضع أي نزاع ينشأ عن تفسير أو تنفيذ أو الإخلال ببنود هذا العقد للاخيار القضائي الحصري للمحاكم المحلية المختصة التي يقع في دائرتها العقار المؤجر.'
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
                    ${clauses.slice(0, 5).map(c => `<div class="clause-item">${c}</div>`).join('')}
                </div>
            </div>
        `;

        const page3Content = `
            <div class="section">
                <div class="clause-list">
                    ${clauses.slice(5, 10).map(c => `<div class="clause-item">${c}</div>`).join('')}
                </div>
            </div>
        `;

        const page4Content = `
            <div class="section">
                <div class="clause-list">
                    ${clauses.slice(10).map(c => `<div class="clause-item">${c}</div>`).join('')}
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
        container.innerHTML = renderPage(page1Content) + renderPage(page2Content) + renderPage(page3Content) + renderPage(page4Content);
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
