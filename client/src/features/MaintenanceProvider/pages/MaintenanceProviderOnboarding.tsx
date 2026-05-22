import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../../services/auth.service';
import { MAINTENANCE_CATEGORIES } from '../../Maintenance/constants/categories';
import './MaintenanceProviderOnboarding.css';

type ProviderType = 'CENTER' | 'INDIVIDUAL';
type ViewMode = 'apply' | 'login';
type Lang = 'en' | 'ar';
type LoginStatusPopup = {
    title: string;
    body: string;
    extra?: string;
};

const TEXT = {
    en: {
        join: 'Join as Provider',
        signIn: 'Provider Sign In',
        portalTitle: 'Maintenance Provider Portal',
        portalSubtitle: 'Easy onboarding for individuals and centers with admin verification.',
        backHome: 'Back to Home',
        language: 'Language',
        english: 'English',
        arabic: 'Arabic',
        individual: 'Individual',
        center: 'Center / Company',
        step: 'Step',
        of: 'of',
        basicData: 'Basic Data',
        selfie: 'Selfie',
        nationalId: 'National ID',
        criminal: 'Criminal Record',
        centerDocs: 'Categories & Documents',
        notesSubmit: 'Notes & Submit',
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email',
        password: 'Password',
        phone: 'Phone number',
        mainCategory: 'Main category',
        businessName: 'Center / company name',
        employees: 'Number of employees',
        location: 'Company location',
        next: 'Next',
        previous: 'Previous',
        submitRequest: 'Submit provider request',
        loading: 'Submitting...',
        notesLabel: 'Additional notes for admin review (optional)',
        loginIdentifier: 'Email or phone',
        remember: 'Remember me',
        loginBtn: 'Sign in as maintenance provider',
        loginLoading: 'Signing in...',
        selfieTitle: 'Selfie verification',
        selfieDesc: 'Take a clear selfie so admin can verify your identity.',
        takeSelfie: 'Take selfie',
        retakeSelfie: 'Retake selfie',
        selfieRequired: 'Selfie required',
        selfieCaptured: 'Selfie captured',
        idTitle: 'National ID capture',
        idDesc: 'Capture front and back inside the ID frame.',
        idCapture: 'Capture national ID front/back',
        idRetake: 'Retake national ID',
        idFrontRequired: 'ID front required',
        idBackRequired: 'ID back required',
        idFrontCaptured: 'ID front captured',
        idBackCaptured: 'ID back captured',
        criminalTitle: 'Criminal record certificate',
        criminalDesc: 'Upload your criminal record certificate as PDF or image.',
        criminalInput: 'Criminal record certificate (PDF/Image)',
        criminalRequired: 'Certificate required',
        criminalCaptured: 'Certificate uploaded',
        centerTitle: 'Categories and company documents',
        centerDesc: 'Centers can select multiple categories and upload supporting docs.',
        addCategory: 'Add center category',
        companyDocs: 'Company documents (PDF/Image, multiple)',
        doc: 'Document',
        cameraSelfie: 'Take a selfie',
        cameraFront: 'Capture National ID (Front)',
        cameraBack: 'Capture National ID (Back)',
        cameraSelfieGuide: 'Center your face inside the guide.',
        cameraIdGuide: 'Place the front side of your national ID inside the rectangle.',
        cameraFlip: 'National ID detected. Great. Please flip the card and capture the back side.',
        cancel: 'Cancel',
        capture: 'Capture',
        basicError: 'Please complete all basic data fields first.',
        centerBasicError: 'Please complete all center/company data fields first.',
        emailError: 'Please enter a valid email address before continuing.',
        passwordError: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
        employeeError: 'Number of employees must be greater than 0.',
        selfieError: 'Please take a selfie before continuing.',
        idError: 'Please capture both front and back of the national ID.',
        criminalError: 'Please upload criminal record certificate before continuing.',
        centerStepError: 'Please add at least one category and one company document.',
        emailExistsError: 'This email is already registered. Please use another email.',
        phoneExistsError: 'This phone number is already registered. Please use another phone number.',
        otherCategory: 'Other (write your category)',
        customCategoryPlaceholder: 'Write category name',
        addCustomCategory: 'Add',
        cameraError: 'Camera access failed. You can still upload files manually.',
        submitError: 'Could not submit your application.',
        signinError: 'Could not sign in.',
        pendingPopupTitle: 'Request Still Under Review',
        pendingPopupBody: 'Your request is still under review by admin. Please try again later.',
        bannedPopupTitle: 'Account Restricted',
        bannedPopupBody: 'Your maintainer account is currently banned by admin.',
        closePopup: 'Close',
        successTitle: 'Request Received Successfully',
        successBody: 'Your maintenance provider request is now pending admin approval. We will contact you soon after review.',
        successCta: 'Go to Provider Sign In',
        successClose: 'Close',
    },
    ar: {
        join: 'التسجيل كفني صيانة',
        signIn: 'دخول الفني',
        portalTitle: 'بوابة فنيين الصيانة',
        portalSubtitle: 'تسجيل سهل للأفراد والشركات مع مراجعة الإدارة.',
        backHome: 'العودة للرئيسية',
        language: 'اللغة',
        english: 'الإنجليزية',
        arabic: 'العربية',
        individual: 'فرد',
        center: 'مركز / شركة',
        step: 'الخطوة',
        of: 'من',
        basicData: 'البيانات الأساسية',
        selfie: 'صورة شخصية',
        nationalId: 'الهوية الوطنية',
        criminal: 'صحيفة الحالة الجنائية',
        centerDocs: 'التخصصات والمستندات',
        notesSubmit: 'ملاحظات وإرسال',
        firstName: 'الاسم الأول',
        lastName: 'الاسم الأخير',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        phone: 'رقم الهاتف',
        mainCategory: 'التخصص الرئيسي',
        businessName: 'اسم المركز / الشركة',
        employees: 'عدد الموظفين',
        location: 'موقع الشركة',
        next: 'التالي',
        previous: 'السابق',
        submitRequest: 'إرسال طلب الفني',
        loading: 'جارٍ الإرسال...',
        notesLabel: 'ملاحظات إضافية للإدارة (اختياري)',
        loginIdentifier: 'البريد الإلكتروني أو الهاتف',
        remember: 'تذكّرني',
        loginBtn: 'تسجيل الدخول كفني صيانة',
        loginLoading: 'جارٍ تسجيل الدخول...',
        selfieTitle: 'التحقق بالصورة الشخصية',
        selfieDesc: 'التقط صورة شخصية واضحة ليتم التحقق من هويتك.',
        takeSelfie: 'التقاط صورة شخصية',
        retakeSelfie: 'إعادة التقاط الصورة',
        selfieRequired: 'الصورة الشخصية مطلوبة',
        selfieCaptured: 'تم التقاط الصورة الشخصية',
        idTitle: 'التقاط الهوية الوطنية',
        idDesc: 'التقط الوجه الأمامي والخلفي داخل إطار الهوية.',
        idCapture: 'التقاط الهوية الأمامية/الخلفية',
        idRetake: 'إعادة تصوير الهوية',
        idFrontRequired: 'الوجه الأمامي مطلوب',
        idBackRequired: 'الوجه الخلفي مطلوب',
        idFrontCaptured: 'تم التقاط الوجه الأمامي',
        idBackCaptured: 'تم التقاط الوجه الخلفي',
        criminalTitle: 'صحيفة الحالة الجنائية',
        criminalDesc: 'ارفع صحيفة الحالة الجنائية بصيغة PDF أو صورة.',
        criminalInput: 'صحيفة الحالة الجنائية (PDF/صورة)',
        criminalRequired: 'المستند مطلوب',
        criminalCaptured: 'تم رفع المستند',
        centerTitle: 'التخصصات ومستندات الشركة',
        centerDesc: 'يمكن للمراكز اختيار أكثر من تخصص ورفع المستندات.',
        addCategory: 'إضافة تخصص للمركز',
        companyDocs: 'مستندات الشركة (PDF/صورة - متعدد)',
        doc: 'مستند',
        cameraSelfie: 'التقاط صورة شخصية',
        cameraFront: 'تصوير الهوية (الوجه الأمامي)',
        cameraBack: 'تصوير الهوية (الوجه الخلفي)',
        cameraSelfieGuide: 'ضع وجهك داخل الإطار.',
        cameraIdGuide: 'ضع الوجه الأمامي للهوية داخل المستطيل.',
        cameraFlip: 'تم اكتشاف الهوية. ممتاز، اقلب البطاقة وصوّر الوجه الخلفي.',
        cancel: 'إلغاء',
        capture: 'التقاط',
        basicError: 'يرجى استكمال كل البيانات الأساسية أولاً.',
        centerBasicError: 'يرجى استكمال كل بيانات المركز/الشركة أولاً.',
        emailError: 'يرجى إدخال بريد إلكتروني صحيح.',
        passwordError: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز خاص.',
        employeeError: 'عدد الموظفين يجب أن يكون أكبر من 0.',
        selfieError: 'يرجى التقاط الصورة الشخصية أولاً.',
        idError: 'يرجى تصوير الوجهين الأمامي والخلفي للهوية.',
        criminalError: 'يرجى رفع صحيفة الحالة الجنائية أولاً.',
        centerStepError: 'يرجى إضافة تخصص واحد على الأقل ومستند شركة واحد على الأقل.',
        emailExistsError: 'الإيميل ده مسجل بالفعل. من فضلك استخدم إيميل تاني.',
        phoneExistsError: 'رقم الموبايل ده مسجل بالفعل. من فضلك استخدم رقم تاني.',
        otherCategory: 'أخرى (اكتب تخصصك)',
        customCategoryPlaceholder: 'اكتب اسم التخصص',
        addCustomCategory: 'إضافة',
        cameraError: 'تعذر الوصول للكاميرا. يمكنك رفع الملفات يدويًا.',
        submitError: 'تعذر إرسال الطلب.',
        signinError: 'تعذر تسجيل الدخول.',
        pendingPopupTitle: 'طلبك لسه تحت المراجعة',
        pendingPopupBody: 'طلبك ما زال قيد مراجعة الإدارة. حاول مرة تانية لاحقًا.',
        bannedPopupTitle: 'الحساب موقوف',
        bannedPopupBody: 'حساب الفني متوقوف حاليًا من الإدارة.',
        closePopup: 'إغلاق',
        successTitle: 'تم استلام طلبك بنجاح',
        successBody: 'طلب فني الصيانة بتاعك دلوقتي قيد المراجعة عند الإدارة. هنتواصل معاك قريب بعد المراجعة.',
        successCta: 'الذهاب لتسجيل دخول الفني',
        successClose: 'إغلاق',
    },
} as const;

const MaintenanceProviderOnboarding = () => {
    const navigate = useNavigate();
    const [lang, setLang] = useState<Lang>('en');
    const [mode, setMode] = useState<ViewMode>('apply');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [validationPopup, setValidationPopup] = useState<string | null>(null);
    const [loginStatusPopup, setLoginStatusPopup] = useState<LoginStatusPopup | null>(null);

    const [providerType, setProviderType] = useState<ProviderType>('INDIVIDUAL');
    const [selectedCenterCategories, setSelectedCenterCategories] = useState<string[]>([]);
    const [customCenterCategory, setCustomCenterCategory] = useState('');
    const [customIndividualCategory, setCustomIndividualCategory] = useState('');
    const [documentationFiles, setDocumentationFiles] = useState<string[]>([]);
    const [criminalRecordFile, setCriminalRecordFile] = useState<string>('');
    const [selfieImage, setSelfieImage] = useState<string>('');
    const [nationalIdFront, setNationalIdFront] = useState<string>('');
    const [nationalIdBack, setNationalIdBack] = useState<string>('');
    const [cameraOpen, setCameraOpen] = useState<null | 'selfie' | 'idFront' | 'idBack'>(null);
    const [idGuideMessage, setIdGuideMessage] = useState<string>(TEXT.en.cameraIdGuide);
    const [applyStep, setApplyStep] = useState(1);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [applyForm, setApplyForm] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        businessName: '',
        category: '',
        numberOfEmployees: '',
        companyLocation: '',
        notes: '',
    });

    const [loginForm, setLoginForm] = useState({
        identifier: '',
        password: '',
        rememberMe: false,
    });

    const t = TEXT[lang];
    const isArabic = lang === 'ar';

    const updateApply = (key: string, value: string) => {
        setApplyForm((prev) => ({ ...prev, [key]: value }));
    };

    const showValidationIssue = (message: string) => {
        setError(message);
        setValidationPopup(message);
    };

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraOpen(null);
    };

    useEffect(() => {
        const openCamera = async () => {
            if (!cameraOpen) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch {
                setError(t.cameraError);
                setCameraOpen(null);
            }
        };
        void openCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, [cameraOpen, t.cameraError]);

    const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const onPickSingleFile = async (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: (value: string) => void
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const data = await readFileAsDataUrl(file);
        setter(data);
    };

    const onPickMultiFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const encoded = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
        setDocumentationFiles((prev) => [...prev, ...encoded]);
    };

    const captureFromCamera = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 1280;
        canvas.height = videoRef.current.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.92);

        if (cameraOpen === 'selfie') {
            setSelfieImage(data);
            closeCamera();
            return;
        }
        if (cameraOpen === 'idFront') {
            setNationalIdFront(data);
            setIdGuideMessage(t.cameraFlip);
            setCameraOpen('idBack');
            return;
        }
        if (cameraOpen === 'idBack') {
            setNationalIdBack(data);
            closeCamera();
        }
    };

    const removeDocumentAt = (index: number) => {
        setDocumentationFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const providerCategoryOptions = useMemo(() => [...MAINTENANCE_CATEGORIES], []);
    const passwordRegex = new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+\\-=\\[\\]{};':\"\\\\|,.<>/]).{8,}$"
    );

    const categoryLabel = (value: string) => {
        if (!isArabic) return value;
        const map: Record<string, string> = {
            Plumbing: 'السباكة',
            Electrical: 'الكهرباء',
            Painting: 'الدهانات',
            'AC Service': 'تكييف',
            Gardening: 'الحدائق',
            Flooring: 'الأرضيات',
            Other: 'أخرى',
        };
        return map[value] || value;
    };

    const stepTitles = providerType === 'INDIVIDUAL'
        ? [t.basicData, t.selfie, t.nationalId, t.criminal, t.notesSubmit]
        : [t.basicData, t.centerDocs, t.notesSubmit];
    const isFinalStep = applyStep >= stepTitles.length;

    const normalizeCategory = (value: string) => value.trim().replace(/\s+/g, ' ');

    const addCenterCustomCategory = () => {
        const value = normalizeCategory(customCenterCategory);
        if (!value) return;
        if (!selectedCenterCategories.includes(value)) {
            setSelectedCenterCategories((prev) => [...prev, value]);
        }
        setCustomCenterCategory('');
    };

    const ensureUniqueContactData = async () => {
        const payload: { email?: string; phone?: string } = {
            email: applyForm.email.trim() || undefined,
            phone: applyForm.phone.trim() || undefined,
        };
        if (!payload.email && !payload.phone) return true;
        setCheckingAvailability(true);
        try {
            const result = await authService.checkMaintenanceAvailability(payload);
            if (result.emailExists) {
                showValidationIssue(t.emailExistsError);
                return false;
            }
            if (result.phoneExists) {
                showValidationIssue(t.phoneExistsError);
                return false;
            }
            return true;
        } catch {
            return true;
        } finally {
            setCheckingAvailability(false);
        }
    };

    const goNextStep = async () => {
        if (providerType === 'INDIVIDUAL') {
            if (applyStep === 1) {
                const firstName = applyForm.firstName.trim();
                const lastName = applyForm.lastName.trim();
                const email = applyForm.email.trim();
                const phone = applyForm.phone.trim();
                const password = applyForm.password;
                if (!firstName || !lastName || !email || !phone || !applyForm.category) {
                    showValidationIssue(t.basicError);
                    return;
                }
                if (applyForm.category === 'Other' && !normalizeCategory(customIndividualCategory)) {
                    showValidationIssue(t.basicError);
                    return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    showValidationIssue(t.emailError);
                    return;
                }
                if (!/^\+?[0-9\s\-()]{8,20}$/.test(phone)) {
                    showValidationIssue(lang === 'ar'
                        ? 'من فضلك اكتب رقم موبايل صحيح قبل ما تكمل.'
                        : 'Please enter a valid phone number before continuing.');
                    return;
                }
                if (!passwordRegex.test(password)) {
                    showValidationIssue(t.passwordError);
                    return;
                }
                const isUnique = await ensureUniqueContactData();
                if (!isUnique) return;
            }
            if (applyStep === 2 && !selfieImage) {
                showValidationIssue(t.selfieError);
                return;
            }
            if (applyStep === 3 && (!nationalIdFront || !nationalIdBack)) {
                showValidationIssue(t.idError);
                return;
            }
            if (applyStep === 4 && !criminalRecordFile) {
                showValidationIssue(t.criminalError);
                return;
            }
        }
        if (providerType === 'CENTER') {
            if (applyStep === 1) {
                const firstName = applyForm.firstName.trim();
                const lastName = applyForm.lastName.trim();
                const email = applyForm.email.trim();
                const phone = applyForm.phone.trim();
                const password = applyForm.password;
                const businessName = applyForm.businessName.trim();
                const companyLocation = applyForm.companyLocation.trim();
                const employeeCount = Number(applyForm.numberOfEmployees);
                const hasBasic =
                    firstName &&
                    lastName &&
                    email &&
                    password &&
                    phone &&
                    businessName &&
                    companyLocation &&
                    applyForm.numberOfEmployees;
                if (!hasBasic) {
                    showValidationIssue(t.centerBasicError);
                    return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    showValidationIssue(t.emailError);
                    return;
                }
                if (!/^\+?[0-9\s\-()]{8,20}$/.test(phone)) {
                    showValidationIssue(lang === 'ar'
                        ? 'من فضلك اكتب رقم موبايل صحيح قبل ما تكمل.'
                        : 'Please enter a valid phone number before continuing.');
                    return;
                }
                if (!passwordRegex.test(password)) {
                    showValidationIssue(t.passwordError);
                    return;
                }
                if (!Number.isFinite(employeeCount) || employeeCount <= 0) {
                    showValidationIssue(t.employeeError);
                    return;
                }
                const isUnique = await ensureUniqueContactData();
                if (!isUnique) return;
            }
            if (applyStep === 2 && (selectedCenterCategories.length === 0 || documentationFiles.length === 0)) {
                showValidationIssue(t.centerStepError);
                return;
            }
        }
        setError(null);
        setApplyStep((prev) => Math.min(prev + 1, stepTitles.length));
    };

    const validateStepOneFieldOnBlur = (
        field: 'email' | 'phone' | 'password' | 'firstName' | 'lastName'
    ) => {
        if (applyStep !== 1 || mode !== 'apply') return;

        if (field === 'firstName' && !applyForm.firstName.trim()) {
            showValidationIssue(lang === 'ar' ? 'من فضلك اكتب الاسم الأول.' : 'Please enter first name.');
            return;
        }
        if (field === 'lastName' && !applyForm.lastName.trim()) {
            showValidationIssue(lang === 'ar' ? 'من فضلك اكتب الاسم الأخير.' : 'Please enter last name.');
            return;
        }
        if (field === 'email' && applyForm.email.trim()) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applyForm.email.trim())) {
                showValidationIssue(t.emailError);
                return;
            }
            void authService.checkMaintenanceAvailability({ email: applyForm.email.trim() })
                .then((result) => {
                    if (result.emailExists) showValidationIssue(t.emailExistsError);
                })
                .catch(() => undefined);
            return;
        }
        if (field === 'phone' && applyForm.phone.trim()) {
            if (!/^\+?[0-9\s\-()]{8,20}$/.test(applyForm.phone.trim())) {
                showValidationIssue(lang === 'ar'
                    ? 'من فضلك اكتب رقم موبايل صحيح.'
                    : 'Please enter a valid phone number.');
                return;
            }
            void authService.checkMaintenanceAvailability({ phone: applyForm.phone.trim() })
                .then((result) => {
                    if (result.phoneExists) showValidationIssue(t.phoneExistsError);
                })
                .catch(() => undefined);
            return;
        }
        if (field === 'password' && applyForm.password && !passwordRegex.test(applyForm.password)) {
            showValidationIssue(t.passwordError);
        }
    };

    const goPrevStep = () => {
        setApplyStep((prev) => Math.max(prev - 1, 1));
    };

    const submitApplication = async () => {
        setError(null);
        setLoading(true);
        try {
            await authService.maintenanceApply({
                email: applyForm.email.trim(),
                password: applyForm.password,
                firstName: applyForm.firstName.trim(),
                lastName: applyForm.lastName.trim(),
                phone: applyForm.phone.trim(),
                providerType,
                businessName: providerType === 'CENTER' ? applyForm.businessName.trim() : undefined,
                category: providerType === 'CENTER'
                    ? selectedCenterCategories[0]
                    : (applyForm.category === 'Other'
                        ? normalizeCategory(customIndividualCategory)
                        : applyForm.category.trim()),
                categories: providerType === 'CENTER' ? selectedCenterCategories : undefined,
                criminalRecordDocument: providerType === 'INDIVIDUAL' ? criminalRecordFile : undefined,
                selfieImage: providerType === 'INDIVIDUAL' ? selfieImage : undefined,
                nationalIdFront: providerType === 'INDIVIDUAL' ? nationalIdFront : undefined,
                nationalIdBack: providerType === 'INDIVIDUAL' ? nationalIdBack : undefined,
                numberOfEmployees:
                    providerType === 'CENTER' && applyForm.numberOfEmployees
                        ? Number(applyForm.numberOfEmployees)
                        : undefined,
                companyLocation: providerType === 'CENTER' ? applyForm.companyLocation.trim() : undefined,
                documentationFiles: providerType === 'CENTER' ? documentationFiles : undefined,
                notes: applyForm.notes.trim() || undefined,
            });
            setShowSuccessModal(true);
        } catch (err: unknown) {
            const responseData = typeof err === 'object' && err !== null && 'response' in err
                ? (err as { response?: { data?: { message?: string; errors?: Array<{ field?: string; message?: string }> } } }).response?.data
                : null;
            const firstFieldError = responseData?.errors?.[0];
            const msg = firstFieldError
                ? `${firstFieldError.field ? `${firstFieldError.field}: ` : ''}${firstFieldError.message || 'Invalid value'}`
                : (responseData?.message || null);
            setError(msg || t.submitError);
        } finally {
            setLoading(false);
        }
    };

    const submitLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = await authService.maintenanceLogin({
                identifier: loginForm.identifier.trim(),
                password: loginForm.password,
                rememberMe: loginForm.rememberMe,
            });
            const next = authService.resolvePostAuthRoute(result);
            navigate(next, { replace: true });
        } catch (err: unknown) {
            const data = typeof err === 'object' && err !== null && 'response' in err
                ? (err as { response?: { data?: { message?: string; code?: string; details?: { reason?: string; message?: string; banUntil?: string | null; isUnlimited?: boolean } } } }).response?.data
                : null;
            const code = data?.code;
            const msg = data?.message;

            if (code === 'MAINTENANCE_REQUEST_PENDING' || msg?.toLowerCase().includes('under review')) {
                setLoginStatusPopup({
                    title: t.pendingPopupTitle,
                    body: msg || t.pendingPopupBody,
                });
                return;
            }

            if (code === 'ACCOUNT_BANNED') {
                const details = data?.details;
                const untilText = details?.isUnlimited
                    ? (lang === 'ar' ? 'مدة الإيقاف: غير محدد' : 'Ban duration: Unlimited')
                    : details?.banUntil
                        ? `${lang === 'ar' ? 'تاريخ انتهاء الإيقاف' : 'Ban until'}: ${new Date(details.banUntil).toLocaleString()}`
                        : undefined;
                const reasonText = details?.reason
                    ? `${lang === 'ar' ? 'السبب' : 'Reason'}: ${details.reason}`
                    : undefined;
                setLoginStatusPopup({
                    title: t.bannedPopupTitle,
                    body: details?.message || msg || t.bannedPopupBody,
                    extra: [reasonText, untilText].filter(Boolean).join('\n'),
                });
                return;
            }

            setError(msg || t.signinError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`mp-page ${isArabic ? 'rtl' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
            <main className="mp-main">
                <div className="mp-lang-row mp-lang-outside">
                    <label>{t.language}</label>
                    <button className={`mp-lang ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>{t.english}</button>
                    <button className={`mp-lang ${lang === 'ar' ? 'active' : ''}`} onClick={() => setLang('ar')}>{t.arabic}</button>
                </div>
                <section className="mp-shell">
                    <div className="mp-logo-wrap">
                        <img src="/logo.png" alt="HOMi" className="mp-logo" />
                    </div>

                    <div className="mp-mode-row">
                        <button className={`mp-mode-card ${mode === 'apply' ? 'active' : ''}`} onClick={() => setMode('apply')}>{t.join}</button>
                        <button className={`mp-mode-card ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>{t.signIn}</button>
                        <button className="mp-home-link" onClick={() => navigate('/')}>{t.backHome}</button>
                    </div>

                    <h1>{t.portalTitle}</h1>
                    <p>{t.portalSubtitle}</p>

                    {mode === 'apply' && (
                        <form onSubmit={(e) => e.preventDefault()} className="mp-form">
                            <div className="mp-type-switch">
                                <button type="button" className={providerType === 'INDIVIDUAL' ? 'active' : ''} onClick={() => { setProviderType('INDIVIDUAL'); setApplyStep(1); }}>{t.individual}</button>
                                <button type="button" className={providerType === 'CENTER' ? 'active' : ''} onClick={() => { setProviderType('CENTER'); setApplyStep(1); }}>{t.center}</button>
                            </div>

                            <div className="mp-progress-wrap">
                                <div className="mp-progress-track">
                                    <div className="mp-progress-fill" style={{ width: `${(applyStep / stepTitles.length) * 100}%` }} />
                                </div>
                                <p className="mp-progress-label">
                                    {t.step} {applyStep} {t.of} {stepTitles.length}: {stepTitles[applyStep - 1]}
                                </p>
                            </div>

                            {applyStep === 1 && (
                                <div className="mp-grid-2">
                                    <input placeholder={t.firstName} value={applyForm.firstName} onChange={(e) => updateApply('firstName', e.target.value)} onBlur={() => validateStepOneFieldOnBlur('firstName')} required />
                                    <input placeholder={t.lastName} value={applyForm.lastName} onChange={(e) => updateApply('lastName', e.target.value)} onBlur={() => validateStepOneFieldOnBlur('lastName')} required />
                                    <input type="email" placeholder={t.email} value={applyForm.email} onChange={(e) => updateApply('email', e.target.value)} onBlur={() => validateStepOneFieldOnBlur('email')} required />
                                    <input type="password" placeholder={t.password} value={applyForm.password} onChange={(e) => updateApply('password', e.target.value)} onBlur={() => validateStepOneFieldOnBlur('password')} required />
                                    <input placeholder={t.phone} value={applyForm.phone} onChange={(e) => updateApply('phone', e.target.value)} onBlur={() => validateStepOneFieldOnBlur('phone')} required />
                                    {providerType === 'INDIVIDUAL' && (
                                        <>
                                            <select value={applyForm.category} onChange={(e) => updateApply('category', e.target.value)} required>
                                                <option value="">{t.mainCategory}</option>
                                                {providerCategoryOptions.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
                                            </select>
                                            {applyForm.category === 'Other' && (
                                                <input
                                                    placeholder={t.customCategoryPlaceholder}
                                                    value={customIndividualCategory}
                                                    onChange={(e) => setCustomIndividualCategory(e.target.value)}
                                                />
                                            )}
                                        </>
                                    )}
                                    {providerType === 'CENTER' && (
                                        <>
                                            <input placeholder={t.businessName} value={applyForm.businessName} onChange={(e) => updateApply('businessName', e.target.value)} required />
                                            <input type="number" min="1" placeholder={t.employees} value={applyForm.numberOfEmployees} onChange={(e) => updateApply('numberOfEmployees', e.target.value)} required />
                                            <input placeholder={t.location} value={applyForm.companyLocation} onChange={(e) => updateApply('companyLocation', e.target.value)} required />
                                        </>
                                    )}
                                </div>
                            )}

                            {providerType === 'INDIVIDUAL' && applyStep === 2 && (
                                <div className="mp-step-card">
                                    <h3>{t.selfieTitle}</h3>
                                    <p>{t.selfieDesc}</p>
                                    <button type="button" onClick={() => setCameraOpen('selfie')}>{selfieImage ? t.retakeSelfie : t.takeSelfie}</button>
                                    <div className="mp-capture-status"><span>{selfieImage ? t.selfieCaptured : t.selfieRequired}</span></div>
                                </div>
                            )}

                            {providerType === 'INDIVIDUAL' && applyStep === 3 && (
                                <div className="mp-step-card">
                                    <h3>{t.idTitle}</h3>
                                    <p>{t.idDesc}</p>
                                    <button type="button" onClick={() => { setIdGuideMessage(t.cameraIdGuide); setCameraOpen('idFront'); }}>
                                        {nationalIdFront && nationalIdBack ? t.idRetake : t.idCapture}
                                    </button>
                                    <div className="mp-capture-status">
                                        <span>{nationalIdFront ? t.idFrontCaptured : t.idFrontRequired}</span>
                                        <span>{nationalIdBack ? t.idBackCaptured : t.idBackRequired}</span>
                                    </div>
                                </div>
                            )}

                            {providerType === 'INDIVIDUAL' && applyStep === 4 && (
                                <div className="mp-step-card">
                                    <h3>{t.criminalTitle}</h3>
                                    <p>{t.criminalDesc}</p>
                                    <label className="mp-file-label">
                                        {t.criminalInput}
                                        <input type="file" accept="application/pdf,image/*" onChange={(e) => void onPickSingleFile(e, setCriminalRecordFile)} required />
                                    </label>
                                    <div className="mp-capture-status"><span>{criminalRecordFile ? t.criminalCaptured : t.criminalRequired}</span></div>
                                </div>
                            )}

                            {providerType === 'CENTER' && applyStep === 2 && (
                                <div className="mp-step-card">
                                    <h3>{t.centerTitle}</h3>
                                    <p>{t.centerDesc}</p>
                                    <div className="mp-categories-wrap">
                                        <div className="mp-category-list">
                                            {providerCategoryOptions.map((item) => {
                                                const selected = selectedCenterCategories.includes(item);
                                                return (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        className={`mp-category-pill ${selected ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setSelectedCenterCategories((prev) =>
                                                                selected ? prev.filter((x) => x !== item) : [...prev, item]
                                                            );
                                                        }}
                                                    >
                                                        {categoryLabel(item)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mp-custom-category-row">
                                            <input
                                                placeholder={t.customCategoryPlaceholder}
                                                value={customCenterCategory}
                                                onChange={(e) => setCustomCenterCategory(e.target.value)}
                                            />
                                            <button type="button" className="mp-add-category-btn" onClick={addCenterCustomCategory}>
                                                + {t.addCustomCategory}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mp-tags">
                                        {selectedCenterCategories.map((item) => (
                                            <button key={item} type="button" className="mp-tag" onClick={() => setSelectedCenterCategories((prev) => prev.filter((x) => x !== item))}>
                                                {categoryLabel(item)} x
                                            </button>
                                        ))}
                                    </div>
                                    <label className="mp-file-label">
                                        {t.companyDocs}
                                        <input type="file" accept="application/pdf,image/*" multiple onChange={(e) => void onPickMultiFile(e)} required={documentationFiles.length === 0} />
                                    </label>
                                    <div className="mp-doc-list">
                                        {documentationFiles.map((_, idx) => (
                                            <button type="button" key={`doc-${idx}`} className="mp-doc-chip" onClick={() => removeDocumentAt(idx)}>
                                                {t.doc} {idx + 1} x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {((providerType === 'INDIVIDUAL' && applyStep === 5) || (providerType === 'CENTER' && applyStep === 3)) && (
                                <div className="mp-step-card">
                                    <h3>{t.notesSubmit}</h3>
                                    <textarea placeholder={t.notesLabel} value={applyForm.notes} onChange={(e) => updateApply('notes', e.target.value)} />
                                </div>
                            )}

                            <div className="mp-step-actions">
                                <button type="button" className="secondary" onClick={goPrevStep} disabled={applyStep === 1}>{t.previous}</button>
                                {!isFinalStep
                                    ? <button type="button" onClick={() => void goNextStep()} disabled={checkingAvailability}>{checkingAvailability ? '...' : t.next}</button>
                                    : <button type="button" onClick={() => void submitApplication()} disabled={loading}>{loading ? t.loading : t.submitRequest}</button>}
                            </div>
                        </form>
                    )}

                    {mode === 'login' && (
                        <form onSubmit={submitLogin} className="mp-form">
                            <div className="mp-grid-2">
                                <input placeholder={t.loginIdentifier} value={loginForm.identifier} onChange={(e) => setLoginForm((p) => ({ ...p, identifier: e.target.value }))} required />
                                <input type="password" placeholder={t.password} value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required />
                            </div>
                            <label className="mp-checkbox">
                                <input type="checkbox" checked={loginForm.rememberMe} onChange={(e) => setLoginForm((p) => ({ ...p, rememberMe: e.target.checked }))} />
                                {t.remember}
                            </label>
                            <button type="submit" disabled={loading}>{loading ? t.loginLoading : t.loginBtn}</button>
                        </form>
                    )}

                    {error && <p className="mp-error">{error}</p>}
                </section>
            </main>

            {cameraOpen && (
                <div className="mp-camera-overlay">
                    <div className="mp-camera-card">
                        <h3>
                            {cameraOpen === 'selfie'
                                ? t.cameraSelfie
                                : cameraOpen === 'idFront'
                                    ? t.cameraFront
                                    : t.cameraBack}
                        </h3>
                        <p>{cameraOpen === 'selfie' ? t.cameraSelfieGuide : idGuideMessage}</p>
                        <div className={`mp-camera-preview ${cameraOpen === 'selfie' ? 'selfie' : 'id'}`}>
                            <video ref={videoRef} playsInline muted />
                            <div className="mp-camera-guide" />
                        </div>
                        <div className="mp-camera-actions">
                            <button type="button" className="secondary" onClick={closeCamera}>{t.cancel}</button>
                            <button type="button" onClick={captureFromCamera}>{t.capture}</button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="mp-success-overlay" onClick={() => setShowSuccessModal(false)}>
                    <div className="mp-success-card" onClick={(e) => e.stopPropagation()}>
                        <img src="/logo.png" alt="HOMi" className="mp-success-logo" />
                        <h2>{t.successTitle}</h2>
                        <p>{t.successBody}</p>
                        <div className="mp-success-actions">
                            <button type="button" className="secondary" onClick={() => setShowSuccessModal(false)}>{t.successClose}</button>
                            <button type="button" onClick={() => { setShowSuccessModal(false); setMode('login'); }}>{t.successCta}</button>
                        </div>
                    </div>
                </div>
            )}

            {validationPopup && (
                <div className="mp-success-overlay" onClick={() => setValidationPopup(null)}>
                    <div className="mp-success-card" onClick={(e) => e.stopPropagation()}>
                        <h2>{lang === 'ar' ? 'في مشكلة محتاجة تعديل' : 'Please fix this issue'}</h2>
                        <p>{validationPopup}</p>
                        <div className="mp-success-actions">
                            <button type="button" onClick={() => setValidationPopup(null)}>
                                {lang === 'ar' ? 'تمام' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loginStatusPopup && (
                <div className="mp-success-overlay" onClick={() => setLoginStatusPopup(null)}>
                    <div className="mp-success-card" onClick={(e) => e.stopPropagation()}>
                        <img src="/logo.png" alt="HOMi" className="mp-success-logo" />
                        <h2>{loginStatusPopup.title}</h2>
                        <p>{loginStatusPopup.body}</p>
                        {loginStatusPopup.extra && (
                            <p style={{ whiteSpace: 'pre-line', marginTop: 10 }}>{loginStatusPopup.extra}</p>
                        )}
                        <div className="mp-success-actions">
                            <button type="button" onClick={() => setLoginStatusPopup(null)}>
                                {t.closePopup}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceProviderOnboarding;
