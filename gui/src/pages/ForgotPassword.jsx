import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function ForgotPassword() {
  const { theme: t } = useTheme();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const styles = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Use the shared auth background for consistency with login/create-account
      background: t.authBackground,
      fontFamily: t.fontFamily.sans,
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
    },
    subtitle: { margin: '0 0 24px', fontSize: t.fontSize.sm, color: t.color.textMuted },
    formContainer: { padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
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
    message: { fontSize: t.fontSize.sm, color: t.color.textMuted, marginTop: 8 },
    success: { fontSize: t.fontSize.sm, color: t.color.success, marginTop: 8 },
    link: { color: t.color.primary, fontSize: t.fontSize.sm, textDecoration: 'none', marginTop: 16, display: 'inline-block' },
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    // Placeholder: OTP would be sent by backend to registered email
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    setStep(2);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword || newPassword.length < 6) {
      setMessage('Enter the OTP and a new password (at least 6 characters).');
      return;
    }
    setBusy(true);
    setMessage('');
    // Placeholder: verify OTP and update password via API
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    setMessage('Password reset is not yet connected to the backend. Configure OTP and reset API to enable.');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Forgot Password</h1>
        </div>
        <div style={styles.formContainer}>
        {step === 1 ? (
          <form style={styles.form} onSubmit={handleSendOtp}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {message && <div style={styles.message}>{message}</div>}
            <button type="submit" style={styles.button} disabled={busy}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form style={styles.form} onSubmit={handleResetPassword}>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={styles.input}
              placeholder="OTP (from email)"
              autoComplete="one-time-code"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              placeholder="New password (at least 6 characters)"
              minLength={6}
              autoComplete="new-password"
            />
            {message && <div style={styles.message}>{message}</div>}
            <button type="submit" style={styles.button} disabled={busy}>
              {busy ? 'Resetting…' : 'Reset password'}
            </button>
            <button type="button" style={{ ...styles.button, background: t.button.secondaryBg, color: t.button.secondaryColor, border: `1px solid ${t.button.secondaryBorder}` }} onClick={() => setStep(1)}>
              Use another email
            </button>
          </form>
        )}

        <Link to="/login" style={styles.link}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
