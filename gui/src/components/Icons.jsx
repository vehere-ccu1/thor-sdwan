import { useTheme } from '../context/ThemeContext';

function useIconStyle() {
  const { theme } = useTheme();
  return { fill: theme.iconColor, stroke: theme.iconColor };
}

export function IconHome({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

export function IconMenu({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  );
}

export function IconChevronRight({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

export function IconChevronDown({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M7 10l5 5 5-5z" />
    </svg>
  );
}

export function IconPlus({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

export function IconMinus({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M19 13H5v-2h14v2z" />
    </svg>
  );
}

export function IconAccount({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

export function IconInfo({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}

export function IconEdit({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

export function IconTrash({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

export function IconArrowUp({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M7 14l5-5 5 5z" />
    </svg>
  );
}

export function IconArrowDown({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M7 10l5 5 5-5z" />
    </svg>
  );
}

export function IconBlocked({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" />
    </svg>
  );
}

export function IconCheck({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

export function IconClose({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

export function IconCopy({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}

/** Key / token icon for "Generate Token" action */
export function IconKey({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.64 0 4.9-1.69 5.74-4.04H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </svg>
  );
}

/** Toggle icon: grid/table view */
export function IconGrid({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path
        fill="currentColor"
        d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"
      />
    </svg>
  );
}

/** Toggle icon: ticket/list view */
export function IconTicket({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
    </svg>
  );
}

/** Toggle icon: link / graph / tree view (nodes and edges) */
export function IconLink({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <circle cx="6" cy="6" r="2.5" fill="currentColor" />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" />
      <circle cx="12" cy="18" r="2.5" fill="currentColor" />
      <path stroke="currentColor" strokeWidth="1.5" fill="none" d="M6 6 L12 18 M18 6 L12 18" />
    </svg>
  );
}

/** Export / download icon */
export function IconExport({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  );
}

/** Import / upload icon */
export function IconImport({ size = 20, ...props }) {
  const iconStyle = useIconStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props} style={iconStyle}>
      <path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zM5 18v2h14v-2H5z" />
    </svg>
  );
}
