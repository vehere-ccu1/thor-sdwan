import { useTheme } from '../context/ThemeContext';

export default function About() {
  const { theme: t } = useTheme();
  const styles = {
    title: { margin: '0 0 16px', fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text },
    text: { margin: '0 0 8px', color: t.color.textMuted },
  };
  return (
    <div>
      <h1 style={styles.title}>About</h1>
      <p style={styles.text}>{t.productName}</p>
      <p style={styles.text}>{t.companyName}</p>
    </div>
  );
}
