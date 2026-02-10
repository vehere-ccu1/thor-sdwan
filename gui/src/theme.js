/**
 * GUI theme for SD-WAN-CMS.
 * Single source for fonts, colors, buttons, header, and icon styling.
 * Supports light and dark mode via getTheme(mode).
 */

const baseTheme = {
  productName: 'SD-WAN-CMS',
  manufacturer_name: 'TBD',
  fontFamily: {
    sans: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  // Default header font-size for widget/card titles
  widgetHeaderFontSize: '1.125rem',
  // Shared background for auth pages (login, create-account, forgot-password) – light gray → dark gray
  authBackground:
    'radial-gradient(circle at top, rgba(230,230,230,0.95) 0%, rgba(140,140,140,0.96) 45%, rgba(60,60,60,0.98) 100%)',
  // Reusable header style for cards/widgets (auth now, later in-app)
  widgetHeader: {
    background: '#0b1f3b',
    color: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  addPanelExpandIcon: 'plus',
};

const lightMode = {
  color: {
    primary: '#1a5fb4',
    primaryHover: '#1c71d8',
    text: '#1e1e1e',
    textMuted: '#5e5e5e',
    border: '#d4d4d4',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#c01c28',
    success: '#2ec27e',
  },
  iconColor: '#1a5fb4',
  button: {
    primaryBg: '#1a5fb4',
    primaryBgHover: '#1c71d8',
    primaryColor: '#ffffff',
    secondaryBg: 'transparent',
    secondaryBorder: '#1a5fb4',
    secondaryColor: '#1a5fb4',
    borderRadius: '6px',
    paddingVertical: '8px',
    paddingHorizontal: '16px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  header: {
    background: '#1a5fb4',
    color: '#ffffff',
    height: '56px',
    paddingHorizontal: '24px',
    fontSize: '1.125rem',
    fontWeight: '600',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  },
  sideMenu: {
    width: '280px',
    background: '#ffffff',
    borderRight: '1px solid #d4d4d4',
    boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
    itemColor: '#1e1e1e',
    itemHoverBg: '#f0f0f0',
    itemActiveBg: '#e8f0fe',
    itemActiveColor: '#1a5fb4',
    groupLabelColor: '#5e5e5e',
    groupLabelFontSize: '0.75rem',
    groupLabelFontWeight: '600',
  },
};

const darkMode = {
  color: {
    primary: '#62a0ea',
    primaryHover: '#89b4fa',
    text: '#e6e6e6',
    textMuted: '#a0a0a0',
    border: '#4a4a4a',
    background: '#1e1e1e',
    surface: '#2d2d2d',
    error: '#f66151',
    success: '#57e389',
  },
  iconColor: '#62a0ea',
  button: {
    primaryBg: '#62a0ea',
    primaryBgHover: '#89b4fa',
    primaryColor: '#1e1e1e',
    secondaryBg: 'transparent',
    secondaryBorder: '#62a0ea',
    secondaryColor: '#62a0ea',
    borderRadius: '6px',
    paddingVertical: '8px',
    paddingHorizontal: '16px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  header: {
    background: '#2d2d2d',
    color: '#e6e6e6',
    height: '56px',
    paddingHorizontal: '24px',
    fontSize: '1.125rem',
    fontWeight: '600',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  sideMenu: {
    width: '280px',
    background: '#2d2d2d',
    borderRight: '1px solid #4a4a4a',
    boxShadow: '2px 0 8px rgba(0,0,0,0.3)',
    itemColor: '#e6e6e6',
    itemHoverBg: '#3d3d3d',
    itemActiveBg: '#1a3a5c',
    itemActiveColor: '#89b4fa',
    groupLabelColor: '#a0a0a0',
    groupLabelFontSize: '0.75rem',
    groupLabelFontWeight: '600',
  },
};

const modes = { light: lightMode, dark: darkMode };

/**
 * Returns the full theme for the given mode ('light' | 'dark').
 * Use with ThemeContext: useTheme().theme
 */
export function getTheme(mode = 'light') {
  const m = modes[mode] || lightMode;
  return {
    ...baseTheme,
    ...m,
  };
}

/** @deprecated Use getTheme(mode) or useTheme().theme for mode-aware theme */
export const theme = getTheme('light');

export default theme;
