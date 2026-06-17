import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../../../components/global/header';
import GuestHeader from '../../../components/global/GuestHeader';
import Footer from '../../../components/global/footer';
import TenantSidebar from '../../../components/global/Tenant/sidebar';
import LandlordSidebar from '../../../components/global/Landlord/sidebar';
import MaintenanceSideBar from '../../Maintenance/MaintenanceProvider/SideBar/MaintenanceSideBar';
import { authService } from '../../../services/auth.service';
import { useTranslation } from 'react-i18next';
import './Terms.css';

const Terms = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [searchParams] = useSearchParams();

    const user = authService.getCurrentUser()?.user;
    const role = user?.role; // TENANT, LANDLORD, MAINTENANCE_PROVIDER

    const renderSidebar = () => {
        if (role === 'TENANT') return <TenantSidebar />;
        if (role === 'LANDLORD') return <LandlordSidebar />;
        if (role === 'MAINTENANCE_PROVIDER') return <MaintenanceSideBar />;
        return null;
    };

    // Sidebar is shown only when the user is logged in
    const hasSidebar = !!role;
    const isGuestView = searchParams.get('fromGuest') === 'true';

    return (
        <div className={`terms-root ${hasSidebar ? 'with-sidebar' : 'guest-view'}`}>
            {isGuestView ? <GuestHeader showBackToHome={true} /> : <Header />}
            {hasSidebar && renderSidebar()}

            <main className={hasSidebar ? 'main-wrapper' : 'terms-full-wrapper'}>
                <div className="terms-content-area">
                    <div className="terms-header">
                        <h1>{isAr ? 'شروط الاستخدام وسياسة الخصوصية' : 'Terms of Use & Privacy Policy'}</h1>
                        <p className="last-updated">{isAr ? 'آخر تحديث: يونيو 2026' : 'Last Updated: June 2026'}</p>
                    </div>

                    {isAr ? (
                        <div className="terms-body" dir="rtl" style={{ textAlign: 'right' }}>

                            {/* ── Section 1: Introduction ── */}
                            <section id="introduction-ar" className="legal-section">
                                <h2>1. مقدمة وقبول الشروط</h2>
                                <p>مرحباً بكم في هومي (HOMi). تحكم شروط الخدمة وسياسة الخصوصية هذه ("الشروط") وصولك واستخدامك للمنصة الرقمية، والموقع الإلكتروني، وتطبيقات الهاتف المحمول (يُشار إليها مجتمعة بـ "المنصة"). بتسجيل حسابك، أو وصولك، أو استخدامك للمنصة كمستأجر، أو مالك، أو مقدم خدمة صيانة، فإنك تدخل في اتفاقية ملزمة قانوناً مع هومي.</p>
                                <p>تخضع هذه الشروط لقوانين جمهورية مصر العربية، بما في ذلك على سبيل المثال لا الحصر القانون رقم 4 لسنة 1996 (العقارات)، والقانون رقم 136 لسنة 1981 (الإسكان)، والقانون رقم 15 لسنة 2004 (التوقيع الإلكتروني)، والقانون رقم 151 لسنة 2020 (حماية البيانات الشخصية).</p>
                                <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إبلاغك بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعارات المنصة. استمرارك في استخدام المنصة بعد التغييرات يُعد قبولاً للشروط المعدلة.</p>
                            </section>

                            {/* ── Section 2: Platform Role ── */}
                            <section id="role-ar" className="legal-section">
                                <h2>2. دور المنصة وحدود المسؤولية</h2>
                                <p><strong>هومي هي منصة وساطة رقمية:</strong> توفر هومي سوقاً إلكترونياً يربط بين المستأجرين والمُلاك ومقدمي خدمات الصيانة. لا تملك هومي أو تدير أو تُشغل أي عقارات معروضة على المنصة، وليست طرفاً في عقود الإيجار المُبرمة بين المستخدمين.</p>
                                <p><strong>حدود المسؤولية:</strong> لأقصى حد يسمح به القانون المصري، تُخلي هومي مسؤوليتها عن:</p>
                                <ul>
                                    <li>الحالة الإنشائية أو سلامة أو قانونية أي عقار معروض.</li>
                                    <li>أي تعثر مالي، أو إيجارات غير مدفوعة، أو أضرار بالممتلكات يتسبب فيها المستأجرون.</li>
                                    <li>جودة أو سلامة أو دقة المواعيد للخدمات التي يقدمها مقدمو خدمات الصيانة.</li>
                                    <li>أي إصابة شخصية أو ضرر بالممتلكات يقع داخل أي عقار مُستأجر.</li>
                                </ul>
                                <p>يقتصر إجمالي مسؤولية هومي عن أي مطالبات ناشئة عن استخدامك للمنصة على إجمالي الرسوم التي دفعتها لهومي خلال الستة (6) أشهر السابقة للحدث الموجب للمطالبة.</p>
                            </section>

                            {/* ── Section 3: Accounts ── */}
                            <section id="accounts-ar" className="legal-section">
                                <h2>3. تسجيل الحساب والتحقق من الهوية</h2>
                                <h3>3.1 معلومات دقيقة</h3>
                                <p>لاستخدام هومي، يجب عليك التسجيل والتحقق من هويتك. أنت توافق على تقديم معلومات صحيحة ودقيقة وكاملة، بما في ذلك بطاقة رقم قومي مصرية أو جواز سفر ساري المفعول. يُعد تقديم مستندات مزيفة أو مزورة جريمة جنائية بموجب القانون المصري وسيؤدي إلى الإلغاء الفوري للحساب وإبلاغ السلطات.</p>
                                <h3>3.2 أمان الحساب</h3>
                                <p>أنت المسؤول الوحيد عن حماية بيانات اعتماد تسجيل الدخول الخاصة بك. توافق على إبلاغ هومي فوراً عن أي استخدام غير مصرح به لحسابك. هومي ليست مسؤولة عن أي خسائر ناتجة عن اختراق بيانات الاعتماد الخاصة بك.</p>
                            </section>

                            {/* ── Section 4: Property Search ── */}
                            <section id="property-finder-ar" className="legal-section">
                                <h2>4. البحث عن العقارات ومطابقة شركاء السكن</h2>
                                <p><strong>عروض العقارات:</strong> تعمل هومي فقط كمنصة لاكتشاف الإعلانات العقارية. بينما نسعى جاهدين لضمان تقديم المُلاك لأوصاف دقيقة، فإننا لا نقوم بفحص العقارات فعلياً. يجب على المستأجرين بذل العناية الواجبة وتفقد العقار بأنفسهم قبل توقيع العقد.</p>
                                <p><strong>مطابقة شركاء السكن:</strong> توفر خوارزمية مطابقة شركاء السكن اقتراحات بناءً على التفضيلات المقدمة من المستخدمين. تُجري هومي عمليات تحقق من الهوية ولكنها لا تقوم بفحوصات خلفية سلوكية شاملة. يتواصل المستخدمون مع شركاء السكن المحتملين على مسؤوليتهم الخاصة ويُنصحون باستخدام حكمهم الشخصي واتخاذ احتياطات السلامة.</p>
                            </section>

                            {/* ── Section 5: Digital Leases ── */}
                            <section id="leases-ar" className="legal-section">
                                <h2>5. عقود الإيجار الرقمية والتوقيعات الإلكترونية</h2>
                                <p>تستخدم جميع عقود الإيجار المُبرمة عبر هومي توقيعات إلكترونية مشفرة. بتوقيعك على مستند في هومي، فإنك تقر وتوافق صراحةً على ما يلي:</p>
                                <ul>
                                    <li>بموجب القانون المصري رقم 15 لسنة 2004، تتمتع التوقيعات الإلكترونية بنفس الصلاحية القانونية وقابلية الإنفاذ والحجية الإثباتية للتوقيعات اليدوية تماماً.</li>
                                    <li>يُشكل العقد الموقع رقمياً عقداً مدنياً مُلزماً وقابلاً للإنفاذ في المحاكم المصرية المختصة.</li>
                                    <li>أنك قد قرأت وفهمت ووافقت على الشروط المحددة لعقد الإيجار المُنشأ بينك وبين الطرف الآخر.</li>
                                </ul>
                            </section>

                            {/* ── Section 6: Financial ── */}
                            <section id="financial-ar" className="legal-section">
                                <h2>6. المعاملات المالية والمدفوعات</h2>
                                <h3>6.1 العملة وبوابات الدفع</h3>
                                <p>تتم معالجة جميع المعاملات المالية، بما في ذلك مدفوعات الإيجار ومبالغ التأمين ورسوم الخدمات، بالجنيه المصري (EGP). تستخدم هومي بوابات دفع تابعة لجهات خارجية متوافقة مع لوائح البنك المركزي المصري (مثل Paymob، Fawry). ببدء الدفع، فإنك توافق على شروط شركائنا في معالجة المدفوعات.</p>
                                <h3>6.2 تحصيل الإيجار وصرفه</h3>
                                <p>يُفوض المستأجرون هومي بخصم الإيجار الشهري من طريقة الدفع المختارة. يُقر المُلاك بأن هومي تعمل كوكيل تحصيل محدود. ستقوم هومي بصرف الإيجار المُحصل إلى الحساب البنكي المحدد للمالك في غضون ثلاثة (3) إلى خمسة (5) أيام عمل، بعد خصم أي رسوم مطبقة للمنصة.</p>
                                <h3>6.3 مبالغ التأمين ورسوم التأخير</h3>
                                <p>يتم الاحتفاظ بمبالغ التأمين (وديعة التأمين) بشكل آمن في نظام الضمان (Escrow) التابع لهومي طوال فترة عقد الإيجار النشط، ولا يمكن للمالك سحبها أو التصرف فيها خلال هذه الفترة.</p>
                                <p>عند انتهاء مدة الإيجار بنجاح وسداد المستأجر لجميع الدفعات المستحقة، يتم إرجاع مبلغ التأمين تلقائيًا إلى رصيد محفظة المستأجر على المنصة. أما في حال تم إنهاء العقد بسبب تعثر المستأجر في السداد أو عدم دفع الإيجار، يتم مصادرة مبلغ التأمين وتحويله بالكامل إلى رصيد محفظة المالك.</p>
                                <p>قد يترتب على تأخير مدفوعات الإيجار رسوم تأخير كما هو موضح في عقد الإيجار المحدد، وبما يخضع للحدود القانونية المصرية.</p>
                                <h3>6.4 مكافحة غسيل الأموال (AML)</h3>
                                <p>يجب ألا يستخدم المستخدمون المنصة لغسيل الأموال، أو تمويل الإرهاب، أو أي أنشطة غير مشروعة. تحتفظ هومي بالحق في تجميد الحسابات والإبلاغ عن المعاملات المشبوهة للهيئة العامة للرقابة المالية المصرية (FRA).</p>
                            </section>

                            {/* ── Section 7: Tenant Obligations ── */}
                            <section id="tenant-obligations-ar" className="legal-section">
                                <h2>7. التزامات المستأجر</h2>
                                <p>بصفتك مستأجراً، فإنك توافق على:</p>
                                <ul>
                                    <li>دفع الإيجار وفواتير المرافق المطبقة (الكهرباء، المياه، الغاز، الإنترنت) في موعدها.</li>
                                    <li>استخدام العقار للأغراض السكنية حصرياً. يُمنع الاستخدام التجاري منعاً باتاً ما لم يُصرح المالك بذلك صراحةً كتابةً.</li>
                                    <li>الامتناع عن تأجير العقار من الباطن، كلياً أو جزئياً، دون موافقة كتابية مسبقة من المالك (وفقاً للقانون رقم 136 لسنة 1981).</li>
                                    <li>الحفاظ على العقار في حالة جيدة وتحمل المسؤولية المالية عن الأضرار الاستهلاكية اليومية أو الأضرار الناتجة عن الإهمال.</li>
                                    <li>إخلاء العقار فور الإنهاء القانوني أو انتهاء مدة العقد. يُعد البقاء بعد المدة إشغالاً غير قانوني.</li>
                                </ul>
                            </section>

                            {/* ── Section 8: Landlord Obligations ── */}
                            <section id="landlord-obligations-ar" className="legal-section">
                                <h2>8. التزامات المالك</h2>
                                <p>بصفتك مالكاً، فإنك توافق على:</p>
                                <ul>
                                    <li>التأكد من أن جميع إعلانات العقارات دقيقة، وصادقة، وغير مضللة فيما يتعلق بالمرافق أو الحالة أو الموقع.</li>
                                    <li>امتلاك الحق القانوني، أو الملكية، أو التوكيل المعتمد لتأجير العقار.</li>
                                    <li>ضمان حق المستأجر في الانتفاع الهادئ بالعقار، خالياً من التدخلات غير المبررة.</li>
                                    <li>إجراء الصيانة الهيكلية والإصلاحات الرئيسية على الفور لضمان بقاء العقار صالحاً للسكن، كما يقتضيه القانون المدني المصري.</li>
                                    <li>تسجيل عقد الإيجار في الشهر العقاري المحلي أو قسم الشرطة إذا اقتضت اللوائح البلدية المحلية ذلك.</li>
                                </ul>
                            </section>

                            {/* ── Section 9: Maintenance Providers ── */}
                            <section id="maintenance-obligations-ar" className="legal-section">
                                <h2>9. مقدمو خدمات الصيانة</h2>
                                <p>يوافق مقدمو خدمات الصيانة العاملون على هومي على:</p>
                                <ul>
                                    <li>حيازة كافة التراخيص المهنية، والتصاريح، والشهادات اللازمة التي يتطلبها القانون المصري لأداء خدماتهم.</li>
                                    <li>تنفيذ العمل بعناية مهنية والالتزام بمعايير السلامة الوطنية.</li>
                                    <li>تقديم تقديرات دقيقة واحترام الأسعار المتفق عليها.</li>
                                    <li>تحمل المسؤولية الكاملة عن أي أضرار بالممتلكات أو إصابات شخصية ناتجة عن الإهمال في العمل.</li>
                                </ul>
                            </section>

                            {/* ── Section 10: Maintenance Responsibilities Separation (NEW) ── */}
                            <section id="maintenance-responsibility-ar" className="legal-section">
                                <h2>10. فصل مسؤوليات الصيانة بين الأطراف</h2>
                                <p>تفصل منصة هومي فصلاً واضحاً بين مسؤوليات الصيانة المنوطة بكل طرف في عقد الإيجار. يتحمل كل طرف تكاليف مسؤولياته الصيانية المعتمدة والمحددة في العقد بشكل كامل ودون أي مشاركة من الطرف الآخر.</p>
                                <h3>10.1 مسؤوليات المالك</h3>
                                <p>يتحمل المالك مسؤولية الصيانة الهيكلية الكبرى وصيانة أنظمة المبنى الأساسية، بما في ذلك الأعمال التي صُنفت صراحةً باعتبارها من مسؤوليته في العقد. يلتزم المالك بسداد تكاليف هذه الأعمال بشكل مستقل.</p>
                                <h3>10.2 مسؤوليات المستأجر</h3>
                                <p>يتحمل المستأجر مسؤولية الصيانة الدورية البسيطة الناتجة عن الاستخدام اليومي، فضلاً عن أي بند صيانة صُنِّف في العقد باعتباره من مسؤوليته. يلتزم المستأجر بسداد هذه التكاليف بشكل مستقل.</p>
                                <h3>10.3 تحديد المسؤوليات في العقد</h3>
                                <p>عند إنشاء عقد الإيجار عبر هومي، يُحدد المالك قائمة بمسؤوليات الصيانة ومن يتحمل كل منها (المالك أو المستأجر). يطلع المستأجر على هذه القائمة قبل توقيع العقد ويوافق عليها صراحةً. وتُعدّ هذه القائمة جزءاً لا يتجزأ من العقد القانوني الملزم.</p>
                                <p><strong>تنبيه مهم:</strong> لا يُمكن لأي طرف مطالبة الطرف الآخر بتحمل تكاليف صيانة لم تُحدد في العقد على أنها من مسؤولية ذلك الطرف.</p>
                            </section>

                            {/* ── Section 11: Lease Termination Terms (NEW) ── */}
                            <section id="termination-lease-ar" className="legal-section">
                                <h2>11. شروط إنهاء عقد الإيجار</h2>
                                <p>يخضع إنهاء عقد الإيجار عبر منصة هومي للسيناريوهات القانونية التالية، وتُحدَّد معاملة مبلغ التأمين ومدفوعات الإيجار وفقاً لكل سيناريو:</p>
                                <h3>11.1 الإنهاء بطلب من المستأجر (خروج مبكر بدون خطأ من المالك)</h3>
                                <p>يدفع المستأجر إيجار الشهر الحالي بالكامل، ويُصادر مبلغ التأمين بالكامل لصالح المالك.</p>
                                <h3>11.2 الإنهاء بطلب من المستأجر (اتفاق متبادل)</h3>
                                <p>يدفع المستأجر إيجار الشهر الحالي بالكامل، ويُعاد مبلغ التأمين للمستأجر ما لم يتفق الطرفان على خلاف ذلك.</p>
                                <h3>11.3 الإنهاء بطلب من المستأجر (إخلال من المالك)</h3>
                                <p>في حالة إخفاق المالك في إجراء الصيانة الأساسية أو أصبح العقار غير صالح للسكن، ينتهي العقد فوراً ويُعاد مبلغ التأمين بالكامل للمستأجر.</p>
                                <h3>11.4 الإنهاء بطلب من المالك (تعثر المستأجر في سداد الإيجار)</h3>
                                <p>في حال تعثر المستأجر في سداد الإيجار، يُصادر مبلغ التأمين بالكامل لصالح المالك.</p>
                                <h3>11.5 الإنهاء بطلب من المالك (تلفيات العقار)</h3>
                                <p>يُحصَّل إيجار الشهر الحالي ويُصادر مبلغ التأمين بالكامل لصالح المالك.</p>
                                <h3>11.6 الإنهاء بطلب من المالك (مخالفة شروط العقد)</h3>
                                <p>يُحصَّل إيجار الشهر الحالي ويُصادر مبلغ التأمين بالكامل لصالح المالك.</p>
                                <h3>11.7 الإنهاء بطلب من المالك (إشغال غير مصرح به / إيجار من الباطن)</h3>
                                <p>يُحصَّل إيجار الشهر الحالي ويُصادر مبلغ التأمين بالكامل لصالح المالك مع تطبيق خصم إضافي للأضرار إن وُجدت.</p>
                            </section>

                            {/* ── Section 12: Auto-Cancellation (NEW) ── */}
                            <section id="auto-cancellation-ar" className="legal-section">
                                <h2>12. الإلغاء التلقائي للعقود المعلقة</h2>
                                <p>لضمان استمرارية وكفاءة العمليات على المنصة، تطبق هومي سياسة الإلغاء التلقائي على العقود المعلقة وفق الآتي:</p>
                                <p><strong>إذا ظل عقد الإيجار في حالة "انتظار توقيع المستأجر" أو "انتظار الدفع" لأكثر من عشرة (10) أيام من تاريخ إنشائه، يتم إلغاؤه تلقائياً بواسطة المنصة دون الحاجة إلى أي إجراء من أي طرف.</strong></p>
                                <ul>
                                    <li><strong>انتظار توقيع المستأجر:</strong> إذا لم يوقع المستأجر على العقد في غضون 10 أيام من إنشائه، يُلغى العقد تلقائياً.</li>
                                    <li><strong>انتظار الدفع:</strong> إذا أتمّ المستأجر التوقيع لكنه لم يسدد المبالغ المطلوبة (الإيجار الأول ومبلغ التأمين) في غضون 10 أيام، يُلغى العقد تلقائياً.</li>
                                </ul>
                                <p>تُرسل المنصة إشعارات تذكيرية للمستأجر قبل انتهاء المهلة. بعد الإلغاء التلقائي، يعود العقار إلى حالة متاح، ويمكن للمالك إنشاء عقد جديد مع مستأجر آخر.</p>
                            </section>

                            {/* ── Section 13: Divorce Clause (NEW) ── */}
                            <section id="divorce-clause-ar" className="legal-section">
                                <h2>13. بند الطلاق وتأثيره على عقد الإيجار</h2>
                                <p>في حال وقوع الطلاق بين المستأجرين أو الشاغلين للوحدة السكنية خلال فترة سريان عقد الإيجار، تسري الأحكام التالية:</p>
                                <ul>
                                    <li><strong>استثناء العقار من التقاسم الزوجي:</strong> تُعد الوحدة السكنية المستأجرة وعقد الإيجار المبرم عبر منصة هومي خارج نطاق منازعات تقسيم الأصول الزوجية. العقار ليس ملكاً لأي من الطرفين، وبالتالي لا يُدرج في إجراءات التقسيم أو النفقة المرتبطة بالعقار.</li>
                                    <li><strong>استمرارية العقد:</strong> يستمر عقد الإيجار نافذاً بشروطه الأصلية بصرف النظر عن الوضع الشخصي للمستأجرين. يظل الطرف المُدرج كمستأجر رئيسي في العقد مسؤولاً قانونياً عن جميع الالتزامات التعاقدية.</li>
                                    <li><strong>التسوية الداخلية:</strong> أي ترتيبات بين الأطراف المطلقة فيما يتعلق بمن يبقى في الوحدة هي شأن داخلي بينهم ولا تُعدّل العقد الأصلي المبرم مع المالك عبر المنصة.</li>
                                    <li><strong>الإنهاء بالتراضي:</strong> في حال رغب كلا الطرفين في إنهاء العقد نتيجة الطلاق، يُطبَّق سيناريو "الإنهاء باتفاق متبادل" المنصوص عليه في البند السابق.</li>
                                </ul>
                                <p>لا تتحمل هومي أي مسؤولية عن النزاعات الأسرية التي قد تنشأ بين المستأجرين، ولا تُبدي أي رأي في من له الحق في السكن بموجب أحكام الطلاق. تُقدم هومي المنصة كوسيط عقاري رقمي حصراً.</p>
                            </section>

                            {/* ── Section 14: Privacy Policy ── */}
                            <section id="privacy-policy-ar" className="legal-section">
                                <h2>14. سياسة الخصوصية وحماية البيانات</h2>
                                <p>توضح سياسة الخصوصية هذه كيفية قيامنا بجمع بياناتك الشخصية، ومعالجتها، وحمايتها في التزام صارم بقانون حماية البيانات الشخصية المصري (القانون رقم 151 لسنة 2020).</p>
                                <h3>14.1 البيانات التي نجمعها</h3>
                                <ul>
                                    <li><strong>بيانات الهوية:</strong> الاسم الكامل، أرقام البطاقة القومية/جواز السفر، تاريخ الميلاد، وصور الوجه (للتحقق).</li>
                                    <li><strong>بيانات التواصل:</strong> عناوين البريد الإلكتروني، وأرقام الهواتف، والعناوين الفعلية.</li>
                                    <li><strong>البيانات المالية:</strong> تفاصيل الحساب البنكي، ورموز بطاقات الائتمان/الخصم (المُخزنة بشكل آمن لدى شركائنا المتوافقين مع PCI-DSS)، وسجل المعاملات.</li>
                                    <li><strong>بيانات الاستخدام والجهاز:</strong> عناوين الـ IP، وأنواع المتصفحات، ومعرفات الأجهزة، وسجلات التفاعل مع المنصة.</li>
                                </ul>
                                <h3>14.2 كيف نستخدم بياناتك</h3>
                                <p>نقوم بمعالجة بياناتك بناءً على الضرورة التعاقدية، والالتزامات القانونية، والمصالح المشروعة من أجل:</p>
                                <ul>
                                    <li>التحقق من هويتك لمنع الاحتيال والحفاظ على سوق موثوق.</li>
                                    <li>تسهيل تنفيذ عقود الإيجار الرقمية ومعالجة المعاملات المالية.</li>
                                    <li>تقديم دعم العملاء وحل النزاعات.</li>
                                    <li>تحسين وظائف المنصة، والأمان، وتجربة المستخدم.</li>
                                </ul>
                                <h3>14.3 مشاركة البيانات والإفصاح عنها</h3>
                                <p>لا تقوم هومي ببيع بياناتك الشخصية لجهات تسويق خارجية. نحن نشارك البيانات فقط مع:</p>
                                <ul>
                                    <li>الأطراف المقابلة (مثل مشاركة هوية المستأجر المتحقق منها مع المالك قبل توقيع العقد).</li>
                                    <li>مقدمي الخدمات (بوابات الدفع، الاستضافة السحابية، مقدمي خدمات الرسائل القصيرة) بموجب اتفاقيات سرية صارمة.</li>
                                    <li>جهات إنفاذ القانون أو الهيئات التنظيمية عندما يكون ذلك مفروضاً قانوناً بموجب أمر قضائي مصري صالح.</li>
                                </ul>
                                <h3>14.4 تخزين البيانات والنقل عبر الحدود</h3>
                                <p>يتم تشفير بياناتك أثناء التخزين وأثناء النقل. تُستضاف قواعد البيانات الأساسية على بنية تحتية سحابية آمنة ومتوافقة. لا نقوم بنقل البيانات الشخصية الحساسة خارج حدود مصر دون الحصول على التراخيص اللازمة من مركز حماية البيانات المصري، مما يضمن بقاء بياناتك محمية تحت السيادة الوطنية.</p>
                                <h3>14.5 حقوق الخصوصية الخاصة بك</h3>
                                <p>بموجب القانون 151 لسنة 2020، تمتلك الحق في:</p>
                                <ul>
                                    <li>الوصول إلى البيانات الشخصية التي نحتفظ بها عنك.</li>
                                    <li>طلب تصحيح البيانات غير الدقيقة أو غير المكتملة.</li>
                                    <li>طلب حذف بياناتك (الحق في النسيان)، مع مراعاة التزاماتنا القانونية بالاحتفاظ بسجلات المعاملات والعقود لأغراض الضرائب ومكافحة الاحتيال.</li>
                                    <li>سحب الموافقة على معالجة البيانات الاختيارية (مثل المراسلات التسويقية).</li>
                                </ul>
                            </section>

                            {/* ── Section 15: HOMi Pro ── */}
                            <section id="homi-pro-ar" className="legal-section">
                                <h2>15. اشتراكات هومي برو (HOMi Pro)</h2>
                                <p><strong>شروط الاشتراك:</strong> من خلال الاشتراك في "هومي برو"، فإنك توافق على دفع رسوم الاشتراك المحددة بناءً على خطة الفوترة المختارة (شهرية، سنوية، أو مخصصة). تُجدد الاشتراكات تلقائياً ما لم يتم الإلغاء قبل نهاية دورة الفوترة الحالية.</p>
                                <p><strong>سياسة الإلغاء والاسترداد:</strong> يمكنك إلغاء اشتراكك في أي وقت. يسري الإلغاء في نهاية دورة الفوترة الحالية. لا تقدم هومي أي مبالغ مستردة جزئية أو كاملة للفترات غير المستخدمة، باستثناء ما تفرضه القوانين المصرية لحماية المستهلك.</p>
                                <p><strong>تعديلات الميزات:</strong> تحتفظ هومي بالحق في تعديل، أو إضافة، أو إزالة أي ميزات مضمنة في باقة "برو" مع إشعار مسبق معقول للمشتركين النشطين.</p>
                            </section>

                            {/* ── Section 16: Dispute Resolution ── */}
                            <section id="disputes-ar" className="legal-section">
                                <h2>16. تسوية المنازعات</h2>
                                <p><strong>الوساطة:</strong> يجب أولاً إحالة أي نزاعات تنشأ بين المستخدمين، أو بين مستخدم وهومي، إلى مركز وساطة هومي الداخلي في محاولة حسنة النية للتوصل إلى حل ودي.</p>
                                <p><strong>الاختصاص القضائي:</strong> في حال فشل الوساطة، يخضع النزاع للاختصاص الحصري للمحاكم المصرية المختصة بناءً على الموقع الجغرافي للعقار المعني، أو المقر الرئيسي المسجل لهومي في القاهرة، مصر. وتكون لغة الإجراءات هي اللغة العربية.</p>
                            </section>

                            {/* ── Section 17: Platform Termination ── */}
                            <section id="platform-termination-ar" className="legal-section">
                                <h2>17. الإنهاء والتعليق (حساب المنصة)</h2>
                                <p>تحتفظ هومي بالحق، وفقاً لتقديرها المطلق، في تعليق أو إنهاء حسابك، أو إزالة إعلاناتك، أو تقييد وصولك إلى المنصة دون إشعار مسبق إذا قمت بـ:</p>
                                <ul>
                                    <li>انتهاك أي بند من هذه الشروط أو القانون المصري المعمول به.</li>
                                    <li>الفشل في سداد الرسوم أو الإيجارات المستحقة.</li>
                                    <li>تلقي مراجعات سلبية متكررة أو شكاوى بخصوص سلوكك.</li>
                                    <li>تقديم مستندات احتيالية أو الانخراط في ممارسات خادعة.</li>
                                </ul>
                                <p>إنهاء حسابك لا يُعفيك من أي التزامات ملزمة قانوناً بموجب عقود الإيجار السارية.</p>
                            </section>
                        </div>

                    ) : (
                    <div className="terms-body">

                        {/* ── Section 1: Introduction ── */}
                        <section id="introduction" className="legal-section">
                            <h2>1. Introduction & Acceptance</h2>
                            <p>Welcome to HOMi. These Terms of Service and Privacy Policy ("Terms") govern your access to and use of the HOMi digital platform, website, and mobile applications (collectively, the "Platform"). By registering an account, accessing, or using the Platform as a Tenant, Landlord, or Maintenance Provider, you enter into a legally binding agreement with HOMi.</p>
                            <p>These Terms are governed by the laws of the Arab Republic of Egypt, including but not limited to Law No. 4 of 1996 (Real Estate), Law No. 136 of 1981 (Housing), Law No. 15 of 2004 (Electronic Signatures), and Law No. 151 of 2020 (Personal Data Protection).</p>
                            <p>We reserve the right to modify these Terms at any time. Significant changes will be communicated via email or platform notifications. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
                        </section>

                        {/* ── Section 2: Platform Role ── */}
                        <section id="role" className="legal-section">
                            <h2>2. Role of the Platform & Limitation of Liability</h2>
                            <p><strong>HOMi is a Digital Facilitator:</strong> HOMi provides an online marketplace connecting Tenants, Landlords, and Maintenance Providers. HOMi does not own, manage, or operate any real estate properties listed on the Platform and is not a party to the lease agreements executed between users.</p>
                            <p><strong>Limitation of Liability:</strong> To the maximum extent permitted by Egyptian law, HOMi disclaims all liability for:</p>
                            <ul>
                                <li>The structural condition, safety, or legality of any listed property.</li>
                                <li>Any financial defaults, unpaid rent, or property damage caused by Tenants.</li>
                                <li>The quality, safety, or timeliness of services rendered by Maintenance Providers.</li>
                                <li>Personal injury or property damage occurring on any leased premises.</li>
                            </ul>
                            <p>HOMi's total liability for any claims arising out of your use of the Platform shall not exceed the total fees paid by you to HOMi in the six (6) months preceding the event giving rise to the claim.</p>
                        </section>

                        {/* ── Section 3: Accounts ── */}
                        <section id="accounts" className="legal-section">
                            <h2>3. Account Registration & Identity Verification</h2>
                            <h3>3.1 Accurate Information</h3>
                            <p>To use HOMi, you must register and verify your identity. You agree to provide true, accurate, and complete information, including a valid Egyptian National ID or Passport. Providing false or forged documents is a criminal offense under Egyptian law and will result in immediate account termination and reporting to the authorities.</p>
                            <h3>3.2 Account Security</h3>
                            <p>You are solely responsible for safeguarding your login credentials. You agree to notify HOMi immediately of any unauthorized use of your account. HOMi is not liable for any losses caused by compromised credentials.</p>
                        </section>

                        {/* ── Section 4: Property Search ── */}
                        <section id="property-finder" className="legal-section">
                            <h2>4. Property Search & Roommate Matching</h2>
                            <p><strong>Property Listings:</strong> HOMi acts solely as a discovery platform for real estate listings. While we strive to ensure landlords provide accurate descriptions, we do not physically inspect properties. Tenants must conduct their own due diligence before signing a lease.</p>
                            <p><strong>Roommate Matching:</strong> Our roommate matching algorithm provides suggestions based on user-submitted preferences. HOMi conducts identity verification but does not perform extensive behavioral background checks. Users engage with potential roommates at their own risk and are encouraged to exercise personal judgment and safety precautions.</p>
                        </section>

                        {/* ── Section 5: Digital Leases ── */}
                        <section id="leases" className="legal-section">
                            <h2>5. Digital Leases & Electronic Signatures</h2>
                            <p>All lease agreements executed through HOMi utilize cryptographic electronic signatures. By signing a document on HOMi, you explicitly acknowledge and agree that:</p>
                            <ul>
                                <li>Under Egyptian Law No. 15 of 2004, electronic signatures hold the exact same legal validity, enforceability, and evidentiary weight as handwritten signatures.</li>
                                <li>The digitally signed lease constitutes a binding civil contract enforceable in the competent Egyptian courts.</li>
                                <li>You have read, understood, and agreed to the specific terms of the lease generated between you and the counterparty.</li>
                            </ul>
                        </section>

                        {/* ── Section 6: Financial ── */}
                        <section id="financial" className="legal-section">
                            <h2>6. Financial Transactions & Payments</h2>
                            <h3>6.1 Currency and Gateways</h3>
                            <p>All financial transactions, including rent payments, security deposits, and service fees, are processed in Egyptian Pounds (EGP). HOMi utilizes Central Bank of Egypt (CBE) compliant third-party payment gateways (e.g., Paymob, Fawry). By initiating a payment, you agree to the terms of our payment processing partners.</p>
                            <h3>6.2 Rent Collection & Disbursements</h3>
                            <p>Tenants authorize HOMi to charge their selected payment method for monthly rent. Landlords acknowledge that HOMi acts as a limited collection agent. HOMi will disburse collected rent to the Landlord's designated bank account within three (3) to five (5) business days, less any applicable platform fees.</p>
                            <h3>6.3 Security Deposits & Late Fees</h3>
                            <p>Security deposits paid by the Tenant at the start of the lease are held securely in HOMi's escrow system during the active lease cycle, and the Landlord cannot withdraw or access these funds while the lease is active.</p>
                            <p>Upon successful completion of the lease term (provided the Tenant has paid all monthly installments), the security deposit is automatically refunded back to the Tenant's wallet balance. If the lease is terminated due to Tenant non-payment or default, the security deposit is forfeited and released to the Landlord's wallet balance.</p>
                            <p>Late rent payments may incur late fees as outlined in the specific lease agreement, subject to Egyptian legal limits.</p>
                            <h3>6.4 Anti-Money Laundering (AML)</h3>
                            <p>Users must not use the Platform for money laundering, terrorist financing, or any illicit activities. HOMi reserves the right to freeze accounts and report suspicious transactions to the Egyptian Financial Regulatory Authority (FRA).</p>
                        </section>

                        {/* ── Section 7: Tenant Obligations ── */}
                        <section id="tenant-obligations" className="legal-section">
                            <h2>7. Tenant Obligations</h2>
                            <p>As a Tenant, you agree to:</p>
                            <ul>
                                <li>Pay rent and applicable utility bills (electricity, water, gas, internet) on time.</li>
                                <li>Use the property exclusively for residential purposes. Commercial use is strictly prohibited unless explicitly authorized by the Landlord in writing.</li>
                                <li>Refrain from subleasing the property, in whole or in part, without the Landlord's prior written consent (in accordance with Law No. 136 of 1981).</li>
                                <li>Maintain the property in good condition and be financially responsible for day-to-day consumable damages or damages caused by negligence.</li>
                                <li>Vacate the premises immediately upon the lawful termination or expiration of the lease. Overstaying constitutes illegal occupation.</li>
                            </ul>
                        </section>

                        {/* ── Section 8: Landlord Obligations ── */}
                        <section id="landlord-obligations" className="legal-section">
                            <h2>8. Landlord Obligations</h2>
                            <p>As a Landlord, you agree to:</p>
                            <ul>
                                <li>Ensure that all property listings are accurate, truthful, and not misleading regarding amenities, condition, or location.</li>
                                <li>Possess the legal right, title, or authorized proxy to lease the property.</li>
                                <li>Guarantee the Tenant's right to quiet enjoyment of the property, free from unwarranted intrusions.</li>
                                <li>Perform structural and major maintenance repairs promptly to ensure the property remains habitable, as required by Egyptian civil law.</li>
                                <li>Register the lease agreement with the local real estate registry or police station if required by local municipal regulations.</li>
                            </ul>
                        </section>

                        {/* ── Section 9: Maintenance Providers ── */}
                        <section id="maintenance-obligations" className="legal-section">
                            <h2>9. Maintenance Providers</h2>
                            <p>Maintenance Providers operating on HOMi agree to:</p>
                            <ul>
                                <li>Hold all necessary trade licenses, permits, and certifications required by Egyptian law to perform their services.</li>
                                <li>Execute work with professional diligence and adhere to national safety standards.</li>
                                <li>Provide accurate estimates and honor agreed-upon pricing.</li>
                                <li>Assume full liability for any property damage or personal injury resulting from negligent workmanship.</li>
                            </ul>
                        </section>

                        {/* ── Section 10: Maintenance Responsibilities Separation (NEW) ── */}
                        <section id="maintenance-responsibility" className="legal-section">
                            <h2>10. Separation of Maintenance Responsibilities</h2>
                            <p>HOMi clearly separates maintenance responsibilities between the parties in each lease agreement. Each party is solely responsible for paying for the maintenance obligations assigned to them in the contract, with no obligation on the other party to contribute.</p>
                            <h3>10.1 Landlord's Responsibilities</h3>
                            <p>The Landlord bears responsibility for major structural maintenance and core building system upkeep, including all items explicitly classified as the Landlord's responsibility in the lease. The Landlord is solely responsible for the costs of these maintenance works.</p>
                            <h3>10.2 Tenant's Responsibilities</h3>
                            <p>The Tenant bears responsibility for routine minor maintenance resulting from daily use and negligence, as well as any maintenance item classified as the Tenant's responsibility in the lease. The Tenant is solely responsible for the costs of these maintenance works.</p>
                            <h3>10.3 Responsibility Allocation in the Contract</h3>
                            <p>When creating a lease through HOMi, the Landlord specifies a maintenance responsibility list indicating who bears responsibility for each area (Landlord or Tenant). The Tenant reviews and explicitly accepts this list before signing the lease. This list forms an integral, legally binding part of the lease agreement.</p>
                            <p><strong>Important:</strong> Neither party may demand that the other party bear maintenance costs not designated as that party's responsibility in the lease contract.</p>
                        </section>

                        {/* ── Section 11: Lease Termination Terms (NEW) ── */}
                        <section id="termination-lease" className="legal-section">
                            <h2>11. Lease Termination Terms</h2>
                            <p>Lease termination on the HOMi platform is governed by the following legally defined scenarios, each specifying the treatment of the security deposit and outstanding rent:</p>
                            <h3>11.1 Tenant-Initiated Early Exit (No Landlord Fault)</h3>
                            <p>The current month's rent is paid in full, and the security deposit is fully forfeited to the Landlord.</p>
                            <h3>11.2 Tenant-Initiated Mutual Agreement</h3>
                            <p>The current month's rent is paid in full, and the security deposit is returned to the Tenant unless otherwise agreed upon by both parties.</p>
                            <h3>11.3 Tenant-Initiated Termination Due to Landlord Breach</h3>
                            <p>If the Landlord fails to perform critical maintenance or the property becomes uninhabitable, the lease is terminated immediately and the security deposit is fully refunded to the Tenant.</p>
                            <h3>11.4 Landlord-Initiated Termination Due to Rent Default</h3>
                            <p>If the Tenant fails to pay rent as agreed, the security deposit is fully forfeited to the Landlord.</p>
                            <h3>11.5 Landlord-Initiated Termination Due to Property Damage</h3>
                            <p>The current month's rent is collected and the security deposit is fully forfeited to the Landlord.</p>
                            <h3>11.6 Landlord-Initiated Termination Due to Lease Violation</h3>
                            <p>The current month's rent is collected and the security deposit is fully forfeited to the Landlord.</p>
                            <h3>11.7 Landlord-Initiated Termination Due to Unauthorized Occupancy / Subleasing</h3>
                            <p>The current month's rent is collected, the security deposit is fully forfeited to the Landlord, and additional damage deductions may apply.</p>
                        </section>

                        {/* ── Section 12: Auto-Cancellation (NEW) ── */}
                        <section id="auto-cancellation" className="legal-section">
                            <h2>12. Automatic Cancellation of Pending Contracts</h2>
                            <p>To ensure platform efficiency and prevent stale contracts, HOMi enforces the following automatic cancellation policy:</p>
                            <p><strong>If a lease contract remains in "Pending Tenant Signature" or "Pending Payment" status for more than ten (10) days from its creation date, it will be automatically cancelled by the platform — no action required by either party.</strong></p>
                            <ul>
                                <li><strong>Pending Tenant Signature:</strong> If the Tenant does not sign the contract within 10 days of its creation, it is automatically cancelled.</li>
                                <li><strong>Pending Payment:</strong> If the Tenant has signed but has not completed the required first-month rent and security deposit payment within 10 days, the contract is automatically cancelled.</li>
                            </ul>
                            <p>The platform sends reminder notifications to the Tenant before the deadline. After automatic cancellation, the property reverts to "Available" status, and the Landlord may create a new contract with another Tenant.</p>
                        </section>

                        {/* ── Section 13: Divorce Clause (NEW) ── */}
                        <section id="divorce-clause" className="legal-section">
                            <h2>13. Divorce Clause & Effect on Lease Agreement</h2>
                            <p>In the event of a divorce between tenants or occupants of the leased property during the lease term, the following provisions apply:</p>
                            <ul>
                                <li><strong>Exclusion from Marital Asset Division:</strong> The leased residential property and the lease agreement executed through HOMi are excluded from any marital asset division proceedings or disputes. Since neither party owns the property, it cannot be included in division orders or related spousal support calculations tied to the residence.</li>
                                <li><strong>Contract Continuity:</strong> The lease agreement remains in full force under its original terms, regardless of the personal circumstances of the occupants. The party listed as the primary Tenant on the contract remains legally responsible for all contractual obligations.</li>
                                <li><strong>Internal Arrangements:</strong> Any private arrangements between the divorcing parties regarding who remains in the unit are their own internal matter and do not modify the original lease agreement with the Landlord through the platform.</li>
                                <li><strong>Termination by Mutual Agreement:</strong> If both parties wish to terminate the lease as a result of divorce, the "Mutual Agreement Termination" scenario described in Section 11.2 shall apply.</li>
                            </ul>
                            <p>HOMi bears no responsibility for any family disputes arising between tenants and does not adjudicate residential rights under divorce proceedings. HOMi acts exclusively as a digital real estate facilitation platform.</p>
                        </section>

                        {/* ── Section 14: Privacy Policy ── */}
                        <section id="privacy-policy" className="legal-section">
                            <h2>14. Privacy Policy & Data Protection</h2>
                            <p>This Privacy Policy outlines how we collect, process, and protect your personal data in strict compliance with the Egyptian Personal Data Protection Law (Law No. 151 of 2020).</p>
                            <h3>14.1 Data We Collect</h3>
                            <ul>
                                <li><strong>Identity Data:</strong> Full name, National ID/Passport numbers, date of birth, and facial photographs (for verification).</li>
                                <li><strong>Contact Data:</strong> Email addresses, phone numbers, and physical addresses.</li>
                                <li><strong>Financial Data:</strong> Bank account details, credit/debit card tokens (stored securely by our PCI-DSS compliant partners), and transaction history.</li>
                                <li><strong>Usage & Device Data:</strong> IP addresses, browser types, device identifiers, and platform interaction logs.</li>
                            </ul>
                            <h3>14.2 How We Use Your Data</h3>
                            <p>We process your data based on contractual necessity, legal obligations, and legitimate interests to:</p>
                            <ul>
                                <li>Verify your identity to prevent fraud and maintain a trusted marketplace.</li>
                                <li>Facilitate the execution of digital leases and process financial transactions.</li>
                                <li>Provide customer support and resolve disputes.</li>
                                <li>Improve platform functionality, security, and user experience.</li>
                            </ul>
                            <h3>14.3 Data Sharing & Disclosure</h3>
                            <p>HOMi does not sell your personal data to third-party marketers. We only share data with:</p>
                            <ul>
                                <li>Counterparties (e.g., sharing a Tenant's verified identity with a Landlord prior to lease signing).</li>
                                <li>Service providers (payment gateways, cloud hosting, SMS providers) under strict confidentiality agreements.</li>
                                <li>Law enforcement or regulatory bodies when legally mandated by a valid Egyptian court order or warrant.</li>
                            </ul>
                            <h3>14.4 Data Storage & Cross-Border Transfers</h3>
                            <p>Your data is encrypted at rest and in transit. Primary databases are hosted on secure, compliant cloud infrastructure. We do not transfer sensitive personal data outside the borders of Egypt without acquiring the necessary licenses from the Egyptian Data Protection Center, ensuring your data remains protected under national sovereignty.</p>
                            <h3>14.5 Your Privacy Rights</h3>
                            <p>Under Law 151/2020, you possess the right to:</p>
                            <ul>
                                <li>Access the personal data we hold about you.</li>
                                <li>Request the correction of inaccurate or incomplete data.</li>
                                <li>Request the deletion of your data (Right to be Forgotten), subject to our legal obligations to retain transaction and lease records for tax and anti-fraud purposes.</li>
                                <li>Withdraw consent for optional data processing (e.g., marketing communications).</li>
                            </ul>
                        </section>

                        {/* ── Section 15: HOMi Pro ── */}
                        <section id="homi-pro" className="legal-section">
                            <h2>15. HOMi Pro Subscriptions</h2>
                            <p><strong>Subscription Terms:</strong> By subscribing to HOMi Pro, you agree to pay the applicable subscription fees based on your selected billing cycle (monthly, annually, or custom). Subscriptions automatically renew unless canceled prior to the end of the current billing cycle.</p>
                            <p><strong>Cancellation & Refund Policy:</strong> You may cancel your subscription at any time. Cancellations will take effect at the end of the current billing cycle. HOMi does not provide partial or full refunds for unused periods, except as mandated by Egyptian consumer protection laws.</p>
                            <p><strong>Feature Modifications:</strong> HOMi reserves the right to modify, add, or remove features included in the Pro package with reasonable prior notice to active subscribers.</p>
                        </section>

                        {/* ── Section 16: Dispute Resolution ── */}
                        <section id="disputes" className="legal-section">
                            <h2>16. Dispute Resolution</h2>
                            <p><strong>Mediation:</strong> Any disputes arising between users, or between a user and HOMi, shall first be submitted to HOMi's internal mediation center in a good-faith attempt to reach an amicable resolution.</p>
                            <p><strong>Jurisdiction:</strong> If mediation fails, the dispute shall be subject to the exclusive jurisdiction of the competent Egyptian Courts based on the geographical location of the property in question, or HOMi's registered headquarters in Cairo, Egypt. The proceedings shall be conducted in Arabic.</p>
                        </section>

                        {/* ── Section 17: Platform Termination ── */}
                        <section id="termination" className="legal-section">
                            <h2>17. Account Termination & Suspension</h2>
                            <p>HOMi reserves the right, at its sole discretion, to suspend or terminate your account, remove your listings, or restrict your access to the Platform without prior notice if you:</p>
                            <ul>
                                <li>Violate any provision of these Terms or applicable Egyptian law.</li>
                                <li>Fail to pay outstanding fees or rent.</li>
                                <li>Receive repeated negative reviews or complaints regarding your conduct.</li>
                                <li>Provide fraudulent documents or engage in deceptive practices.</li>
                            </ul>
                            <p>Termination of your account does not relieve you of any legally binding obligations under active lease agreements.</p>
                        </section>
                    </div>
                    )}
                </div>
                <Footer />
            </main>
        </div>
    );
};

export default Terms;
