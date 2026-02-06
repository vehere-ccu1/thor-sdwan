import { useTheme } from '../../../context/ThemeContext';

export default function PlaceholderTab({ title }) {
  const { theme: t } = useTheme();
  return (
    <>
      <h2 style={{ margin: '0 0 12px', fontSize: t.fontSize.lg, fontWeight: 600, color: t.color.text }}>
        {title}
      </h2>
      <p style={{ margin: 0, color: t.color.textMuted, fontSize: t.fontSize.sm }}>
        Content for this tab will be defined later.
      </p>
    </>
  );
}
