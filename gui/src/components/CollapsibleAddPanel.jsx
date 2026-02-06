import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
import { IconChevronDown, IconPlus, IconMinus } from './Icons';

/**
 * Collapsible panel for "Add / Create new" form on data pages.
 * Header is always visible; click to expand/collapse the form content.
 * Icon is controlled by theme.addPanelExpandIcon: 'plus' (default) or 'chevron'.
 */
export default function CollapsibleAddPanel({ title = 'Create new', expanded, onToggle, children }) {
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const usePlus = (t.addPanelExpandIcon || 'plus') === 'plus';

  return (
    <div style={s.formCard}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: 0,
          margin: 0,
          marginBottom: expanded ? 16 : 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontFamily: t.fontFamily.sans,
          fontSize: t.fontSize.lg,
          fontWeight: 600,
          color: t.color.text,
          textAlign: 'left',
        }}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span style={{ display: 'inline-flex', color: t.color.text }}>
          {usePlus ? (
            expanded ? (
              <IconMinus size={24} />
            ) : (
              <IconPlus size={24} />
            )
          ) : (
            <span
              style={{
                display: 'inline-flex',
                transition: 'transform 0.2s',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <IconChevronDown size={24} />
            </span>
          )}
        </span>
      </button>
      {expanded && children}
    </div>
  );
}
