import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { login as apiLogin } from '../api/client';

export default function Login({ onLogin }) {
  const { theme: t } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const styles = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Shared auth background from theme
      background: t.authBackground,
      fontFamily: t.fontFamily.sans,
      padding: 24,
    },
    card: {
      background: t.color.surface,
      padding: 0,
      borderRadius: 12,
      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
      width: '100%',
      maxWidth: 380,
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
      textTransform: 'uppercase',
    },
    formContainer: { padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      border: `1px solid ${t.color.border}`,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
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
    links: {
      marginTop: 20,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
      alignItems: 'center',
    },
    link: { color: t.color.primary, fontSize: t.fontSize.sm, textDecoration: 'none' },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter username and password.');
      return;
    }
    const res = await apiLogin({ email: username.trim(), password });
    if (res?.ok && res?.user_id) {
      sessionStorage.setItem('sdwan_cms_user_id', res.user_id);
      if (res.email) sessionStorage.setItem('sdwan_cms_user_email', res.email);
      if (res.account_id) sessionStorage.setItem('sdwan_cms_account_id', res.account_id);
      if (res.master_organization_name != null) sessionStorage.setItem('sdwan_cms_master_org_name', res.master_organization_name);
      onLogin?.({ username, password });
      navigate('/', { replace: true });
    } else {
      setError(res?.detail || 'Invalid email or password.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t.productName}</h1>
        </div>
        <div style={styles.formContainer}>
        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            placeholder="Username"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Password"
            autoComplete="current-password"
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button}>
            Sign in
          </button>
          <div style={styles.links}>
            <Link to="/forgot-password" style={styles.link}>Forgot Password</Link>
            <Link to="/create-account" style={styles.link}>Create account</Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
