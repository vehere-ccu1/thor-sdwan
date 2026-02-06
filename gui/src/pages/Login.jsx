import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

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
      background: t.color.background,
      fontFamily: t.fontFamily.sans,
    },
    card: {
      background: t.color.surface,
      padding: 32,
      borderRadius: 8,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      width: '100%',
      maxWidth: 360,
    },
    title: {
      margin: '0 0 8px',
      fontSize: t.fontSize['2xl'],
      fontWeight: 600,
      color: t.color.text,
    },
    subtitle: {
      margin: '0 0 24px',
      fontSize: t.fontSize.sm,
      color: t.color.textMuted,
    },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    label: {
      display: 'block',
      fontSize: t.fontSize.sm,
      fontWeight: 500,
      color: t.color.text,
      marginBottom: 4,
    },
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter username and password.');
      return;
    }
    onLogin?.({ username, password });
    navigate('/', { replace: true });
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t.productName}</h1>
        <p style={styles.subtitle}>{t.companyName}</p>
        <form style={styles.form} onSubmit={handleSubmit}>
          <label style={styles.label}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoComplete="username"
          />
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
