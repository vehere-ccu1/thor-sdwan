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
    title: { margin: '0 0 8px', fontSize: t.fontSize['2xl'], fontWeight: 600, color: t.color.text },
    subtitle: { margin: '0 0 24px', fontSize: t.fontSize.sm, color: t.color.textMuted },
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
    setMessage('');
    // Placeholder: OTP would be sent by backend to registered email
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    setMessage('If this email is registered, an OTP has been sent. Check your inbox.');
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
        <h1 style={styles.title}>Forgot Password</h1>
        <p style={styles.subtitle}>
          Reset your password using an OTP sent to your registered email.
        </p>

        {step === 1 ? (
          <form style={styles.form} onSubmit={handleSendOtp}>
            <label style={styles.label}>Registered email</label>
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
            <label style={styles.label}>OTP (from email)</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={styles.input}
              placeholder="Enter OTP"
              autoComplete="one-time-code"
            />
            <label style={styles.label}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              placeholder="At least 6 characters"
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
  );
}
