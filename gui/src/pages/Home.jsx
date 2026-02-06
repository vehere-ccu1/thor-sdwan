import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const { theme: t } = useTheme();
  const styles = {
    title: { margin: '0 0 8px', fontSize: t.fontSize['2xl'], fontWeight: 600, color: t.color.text },
    text: { margin: 0, color: t.color.textMuted },
  };
  return (
    <div>
      <h1 style={styles.title}>Welcome to {t.productName}</h1>
      <p style={styles.text}>Use the menu on the right to navigate.</p>
    </div>
  );
}
