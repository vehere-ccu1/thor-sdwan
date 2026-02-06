import { useTheme } from '../context/ThemeContext';

export default function PlaceholderPage({ title }) {
  const { theme: t } = useTheme();
  const styles = {
    title: { margin: '0 0 16px', fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text },
    text: { margin: 0, color: t.color.textMuted, fontSize: t.fontSize.sm },
  };
  return (
    <div>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.text}>This section is under development.</p>
    </div>
  );
}
