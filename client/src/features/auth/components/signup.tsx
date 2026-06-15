import React, { useState } from 'react';
import { Mail, Lock, User, UserPlus, PhoneCall, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { authService } from '../../../services/auth.service';

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

const SignUp: React.FC = () => {
  const { t } = useTranslation();
  const [strength, setStrength] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const checkStrength = (value: string) => {
    let score = 0;
    if (value.length > 6) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    setStrength(score);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'password') {
      checkStrength(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!agreeToTerms) {
      setFormError(t('auth.agreeToTermsError'));
      return;
    }

    // Must match the backend RegisterSchema password regex exactly
    // eslint-disable-next-line no-useless-escape -- mirrors server Joi pattern literally
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setFormError(t('auth.passwordRequirementError'));
      return;
    }

    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();

    setSubmitting(true);
    try {
      const { emailTaken, phoneTaken } = await authService.checkSignupAvailability({
        email,
        phone,
      });
      if (emailTaken && phoneTaken) {
        setFormError(
          'This email and phone number are already registered. Sign in with your email, or use different details.'
        );
        return;
      }
      if (emailTaken) {
        setFormError(
          'This email address is already registered. Sign in instead, or use a different email.'
        );
        return;
      }
      if (phoneTaken) {
        setFormError(
          'This phone number is already registered. Sign in instead, or use a different phone number.'
        );
        return;
      }

      await authService.register({
        email,
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone,
        role: 'TENANT',
      });

      await authService.login({
        identifier: email,
        password: formData.password,
        rememberMe: false,
      });

      localStorage.setItem('authProvider', 'email');

      try {
        await authService.sendVerificationEmail();
      } catch {
        console.warn('Could not send verification email automatically');
      }

      navigate('/verify-email', {
        replace: true,
        state: {
          email,
          returnUrl: '/complete-profile',
        },
      });
    } catch (err) {
      let msg = 'Could not create your account. Please try again.';
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as { message?: string; code?: string; errors?: { message: string }[] };
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          msg = data.errors[0].message;
        } else if (data.message) {
          msg = data.message;
        }
        if (data.code === 'EMAIL_EXISTS') {
          msg =
            'This email address is already registered. Sign in instead, or use a different email.';
        }
        if (data.code === 'PHONE_EXISTS') {
          msg =
            'This phone number is already registered. Sign in instead, or use a different phone number.';
        }
      }
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form-layout-v2" onSubmit={(e) => void handleSubmit(e)}>
      {formError && (
        <div style={{
          padding: '10px 14px', marginBottom: 12,
          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
          borderRadius: 8, fontSize: 13, fontWeight: 500,
          border: '1px solid rgba(239,68,68,0.3)',
        }}>{formError}</div>
      )}
      <div className="input-row">
        <div className="input-block">
          <User size={18}/>
          <input 
            type="text" 
            name="firstName"
            placeholder={t('auth.firstName')} 
            value={formData.firstName}
            onChange={handleChange}
            required 
            disabled={submitting}
          />
        </div>
        <div className="input-block">
          <User size={18}/>
          <input 
            type="text"
            name="lastName" 
            placeholder={t('auth.lastName')} 
            value={formData.lastName}
            onChange={handleChange}
            required 
            disabled={submitting}
          />
        </div>
      </div>

      <div className="input-block">
        <Mail size={18}/>
        <input 
          type="email" 
          name="email"
          placeholder={t('auth.email')} 
          value={formData.email}
          onChange={handleChange}
          required 
          disabled={submitting}
        />
      </div>

      <div className="input-block">
        <PhoneCall size={18}/>
        <input 
          type="tel" 
          name="phone"
          placeholder={t('auth.phone')} 
          value={formData.phone}
          onChange={handleChange}
          required 
          disabled={submitting}
        />
      </div>

      <div className="input-block">
        <Lock size={18}/>
        <input 
          type="password" 
          name="password"
          placeholder={t('auth.password')} 
          value={formData.password}
          onChange={handleChange}
          required 
          disabled={submitting}
        />
      </div>

      {/* Strength Indicator */}
      <div className="strength-meter">
        <div className={`strength-fill s-${strength}`} />
      </div>

      <label className="remember-me-label terms-agree-label">
        <input
          type="checkbox"
          name="agreeToTerms"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.target.checked)}
          disabled={submitting}
        />
        <span className="remember-me-text">
          {t('auth.agreeToTerms')}{' '}
          <Link to="/terms?hideSidebar=true&fromGuest=true" target="_blank" className="terms-inline-link">{t('auth.termsAndConditions')}</Link>
        </span>
      </label>

      <button type="submit" className="btn-primary-v2" disabled={submitting}>
        {submitting ? <Loader2 size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> : <UserPlus size={18}/>} 
        <span>{submitting ? t('auth.loading') : t('auth.signUp')}</span>
      </button>
    </form>
  );
};

export default SignUp;
