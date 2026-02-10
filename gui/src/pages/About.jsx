import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function About() {
  const { theme: t } = useTheme();
  const styles = {
    title: { margin: '0 0 16px', fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text },
    text: { margin: '0 0 8px', color: t.color.textMuted },
    section: { marginTop: 24 },
    link: { color: t.color.primary, textDecoration: 'none' },
  };
  return (
    <div>
      <h1 style={styles.title}>About</h1>
      <p style={styles.text}>{t.productName}</p>
      <p style={styles.text}>{t.manufacturer_name}</p>
      <section style={styles.section}>
        {/* Accounts and Organizations page removed */}
        <p style={styles.text}>
          <Link to="/inventory/device-configuration" style={styles.link}>Device Configuration</Link> — device settings, interfaces, WAN/LAN, DHCP, and troubleshooting.
        </p>
      </section>
    </div>
  );
}
