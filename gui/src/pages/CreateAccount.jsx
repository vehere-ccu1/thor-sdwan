import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { createOwnerAccount } from '../api/client';

export default function CreateAccount({ onLogin }) {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    businessEmail: '',
    firstName: '',
    lastName: '',
    jobTitle: '',
    phoneNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const styles = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: t.color.background,
      fontFamily: t.fontFamily.sans,
      padding: 24,
    },
    card: {
      background: t.color.surface,
      padding: 32,
      borderRadius: 8,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      width: '100%',
      maxWidth: 440,
    },
    title: { margin: '0 0 8px', fontSize: t.fontSize['2xl'], fontWeight: 600, color: t.color.text },
    note: { margin: '0 0 20px', fontSize: t.fontSize.sm, color: t.color.textMuted, lineHeight: 1.5 },
    form: { display: 'flex', flexDirection: 'column', gap: 14 },
    label: { display: 'block', fontSize: t.fontSize.sm, fontWeight: 500, color: t.color.text, marginBottom: 4 },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      border: `1px solid ${t.color.border}`,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
      boxSizing: 'border-box',
    },
    button: {
      padding: t.button.paddingVertical + ' ' + t.button.paddingHorizontal,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      fontFamily: t.fontFamily.sans,
      color: t.button.primaryColor,
      background: t.button.primaryBg,
      border: 'none',
      borderRadius: t.button.borderRadius,
      cursor: 'pointer',
      marginTop: 8,
    },
    error: { fontSize: t.fontSize.sm, color: t.color.error, marginTop: 8 },
    success: { fontSize: t.fontSize.sm, color: t.color.success, marginTop: 8 },
    link: { color: t.color.primary, fontSize: t.fontSize.sm, textDecoration: 'none', marginTop: 16, display: 'inline-block' },
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { companyName, businessEmail, firstName, lastName, jobTitle, phoneNumber, password } = form;
    if (!companyName.trim() || !businessEmail.trim() || !firstName.trim() || !lastName.trim() || !password) {
      setError('Please fill Company Name, Business Email, First Name, Last Name, and Password.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    setBusy(true);
    const res = await createOwnerAccount({
      company_name: companyName.trim(),
      business_email: businessEmail.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      job_title: (jobTitle || '').trim(),
      phone_number: (phoneNumber || '').trim(),
      password,
    });
    setBusy(false);
    if (!res || !res.account_id) {
      setError('Failed to create account. Please try again.');
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onLogin?.();
      navigate('/', { replace: true });
    }, 2000);
  };

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Account created</h1>
          <p style={styles.success}>Your owner account has been created. Redirecting to sign in...</p>
          <Link to="/login" style={styles.link}>Go to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create owner account</h1>
        <p style={styles.note}>
          If you are not the owner of an account or have been invited to an account, you can create a new account below.
          There is typically one account per company. If you offer services to customers, you can add each customer as an organization in your account.
          Please refer to Account and Organizations in the documentation (available after sign-in) to learn more.
        </p>
        <form style={styles.form} onSubmit={handleSubmit}>
          <label style={styles.label}>Company Name *</label>
          <input type="text" value={form.companyName} onChange={handleChange('companyName')} style={styles.input} autoComplete="organization" />
          <label style={styles.label}>Business Email *</label>
          <input type="email" value={form.businessEmail} onChange={handleChange('businessEmail')} style={styles.input} autoComplete="email" />
          <label style={styles.label}>First Name *</label>
          <input type="text" value={form.firstName} onChange={handleChange('firstName')} style={styles.input} autoComplete="given-name" />
          <label style={styles.label}>Last Name *</label>
          <input type="text" value={form.lastName} onChange={handleChange('lastName')} style={styles.input} autoComplete="family-name" />
          <label style={styles.label}>Job Title</label>
          <input type="text" value={form.jobTitle} onChange={handleChange('jobTitle')} style={styles.input} autoComplete="organization-title" />
          <label style={styles.label}>Phone Number</label>
          <input type="tel" value={form.phoneNumber} onChange={handleChange('phoneNumber')} style={styles.input} autoComplete="tel" />
          <label style={styles.label}>Password *</label>
          <input type="password" value={form.password} onChange={handleChange('password')} style={styles.input} autoComplete="new-password" minLength={6} />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <Link to="/login" style={styles.link}>Back to sign in</Link>
      </div>
    </div>
  );
}
