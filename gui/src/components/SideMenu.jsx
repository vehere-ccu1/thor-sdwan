import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { menuItems } from '../menuConfig';
import { IconHome, IconChevronRight } from './Icons';

function MenuLink({ to, label, isHome, theme }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'));
  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 24px',
    color: theme.sideMenu.itemColor,
    textDecoration: 'none',
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.sm,
    borderLeft: '3px solid transparent',
  };
  const activeStyle = {
    background: theme.sideMenu.itemActiveBg,
    color: theme.sideMenu.itemActiveColor,
    fontWeight: 500,
    borderLeftColor: theme.sideMenu.itemActiveColor,
  };
  return (
    <Link
      to={to}
      style={{ ...linkStyle, ...(isActive ? activeStyle : {}) }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = theme.sideMenu.itemHoverBg;
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      {isHome && <IconHome size={18} />}
      <span>{label}</span>
    </Link>
  );
}

function ModeToggleButton({ theme, mode, setMode }) {
  const nextMode = mode === 'dark' ? 'light' : 'dark';
  const label = mode === 'dark' ? 'Light Mode' : 'Dark Mode';
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMode(nextMode);
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 24px',
        width: '100%',
        border: 'none',
        background: 'transparent',
        color: theme.sideMenu.itemColor,
        fontFamily: theme.fontFamily.sans,
        fontSize: theme.fontSize.sm,
        cursor: 'pointer',
        textAlign: 'left',
        borderLeft: '3px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.sideMenu.itemHoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span>{label}</span>
    </button>
  );
}

const SUB_MENU_INDENT = 16;

function MenuGroup({ label, children, theme }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          padding: '12px 24px 6px',
          fontSize: theme.sideMenu.groupLabelFontSize,
          fontWeight: theme.sideMenu.groupLabelFontWeight,
          color: theme.sideMenu.groupLabelColor,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ display: 'inline-flex', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
          <IconChevronRight size={14} />
        </span>
        {label}
      </button>
      {open && <div style={{ paddingLeft: SUB_MENU_INDENT }}>{children}</div>}
    </>
  );
}

export default function SideMenu() {
  const { mode, setMode, theme } = useTheme();

  const panelStyle = {
    position: 'fixed',
    top: theme.header.height,
    left: 0,
    width: theme.sideMenu.width,
    height: `calc(100vh - ${theme.header.height})`,
    background: theme.sideMenu.background,
    borderRight: theme.sideMenu.borderRight,
    boxShadow: theme.sideMenu.boxShadow,
    overflowY: 'auto',
    zIndex: 100,
  };

  return (
    <nav style={panelStyle}>
      <ul style={{ listStyle: 'none', margin: 0, padding: '16px 0' }}>
        {menuItems.map((item) =>
          item.type === 'modeToggle' ? (
            <li key="modeToggle">
              <ModeToggleButton theme={theme} mode={mode} setMode={setMode} />
            </li>
          ) : item.children ? (
            <li key={item.label}>
              <MenuGroup label={item.label} theme={theme}>
                {item.children.map((child) => (
                  <MenuLink key={child.path} to={child.path} label={child.label} theme={theme} />
                ))}
              </MenuGroup>
            </li>
          ) : (
            <li key={item.path || item.label}>
              <MenuLink to={item.path} label={item.label} isHome={item.path === '/'} theme={theme} />
            </li>
          )
        )}
      </ul>
    </nav>
  );
}
