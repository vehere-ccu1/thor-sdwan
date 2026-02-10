import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { countries, getFlagEmoji } from '../data/countries';
import { createOwnerAccount } from '../api/client';

export default function CreateAccount({ onLogin }) {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    businessEmail: '',
    name: '',
    country: '',
    jobTitle: '',
    phoneNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const styles = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Use the same auth background as login
      background: t.authBackground,
      fontFamily: t.fontFamily.sans,
      padding: 24,
    },
    card: {
      background: t.color.surface,
      padding: 0,
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      width: '100%',
      maxWidth: 480,
      overflow: 'hidden',
    },
    header: {
      background: t.widgetHeader.background,
      color: t.widgetHeader.color,
      padding: `${t.widgetHeader.paddingVertical}px ${t.widgetHeader.paddingHorizontal}px`,
      textAlign: 'left',
    },
    title: {
      margin: 0,
      fontSize: t.widgetHeaderFontSize,
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    note: { margin: '0 0 20px', fontSize: t.fontSize.sm, color: t.color.textMuted, lineHeight: 1.5 },
    formContainer: { padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    label: { display: 'block', fontSize: t.fontSize.sm, fontWeight: 500, color: t.color.text, marginBottom: 4 },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.color.border,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
      boxSizing: 'border-box',
    },
    inputError: {
      borderColor: t.color.error,
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
    setFieldErrors({});
    const { companyName, businessEmail, name, country, jobTitle, phoneNumber, password } = form;
    const nextFieldErrors = {};
    if (!companyName.trim()) nextFieldErrors.companyName = 'Organization (Master) is required.';
    if (!businessEmail.trim()) nextFieldErrors.businessEmail = 'Business email is required.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(businessEmail.trim())) nextFieldErrors.businessEmail = 'Enter a valid email address.';
    if (!name.trim()) nextFieldErrors.name = 'Name is required.';
    if (!country.trim()) nextFieldErrors.country = 'Country is required.';
    if (!password) nextFieldErrors.password = 'Password is required.';
    else if (password.length < 8) nextFieldErrors.password = 'Password should be at least 8 characters.';
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError('Please correct the highlighted fields.');
      return;
    }
    setBusy(true);
    const res = await createOwnerAccount({
      company_name: companyName.trim(),
      business_email: businessEmail.trim(),
      name: name.trim(),
      master_organization_name: companyName.trim(),
      country: country.trim(),
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
        <div style={styles.header}>
          <h1 style={styles.title}>Create owner account</h1>
        </div>
        <div style={styles.formContainer}>
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.field}>
            <input
              type="text"
              value={form.companyName}
              onChange={handleChange('companyName')}
              style={{ ...styles.input, ...(fieldErrors.companyName ? styles.inputError : {}) }}
              placeholder="Organization (Master) *"
              autoComplete="organization"
            />
          </div>
          <div style={styles.field}>
            <input
              type="email"
              value={form.businessEmail}
              onChange={handleChange('businessEmail')}
              style={{ ...styles.input, ...(fieldErrors.businessEmail ? styles.inputError : {}) }}
              placeholder="Business Email *"
              autoComplete="email"
            />
          </div>
          <div style={styles.field}>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              style={{ ...styles.input, ...(fieldErrors.name ? styles.inputError : {}) }}
              placeholder="Name *"
              autoComplete="name"
            />
          </div>
          <div style={styles.field}>
            <select
              value={form.country}
              onChange={handleChange('country')}
              style={{ ...styles.input, ...(fieldErrors.country ? styles.inputError : {}) }}
            >
              <option value="">Country *</option>
              <option value="IN">{getFlagEmoji('IN')} India</option>
              {countries
                .filter((c) => c.code !== 'IN')
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {getFlagEmoji(c.code)} {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div style={styles.field}>
            <input
              type="text"
              value={form.jobTitle}
              onChange={handleChange('jobTitle')}
              style={styles.input}
              placeholder="Job Title"
              autoComplete="organization-title"
            />
          </div>
          <div style={styles.field}>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={handleChange('phoneNumber')}
              style={styles.input}
              placeholder="Phone Number"
              autoComplete="tel"
            />
          </div>
          <div style={styles.field}>
            <input
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              style={{ ...styles.input, ...(fieldErrors.password ? styles.inputError : {}) }}
              placeholder="Password *"
              autoComplete="new-password"
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <Link to="/login" style={styles.link}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
