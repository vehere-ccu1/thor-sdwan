import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SideMenu from './SideMenu';
import { IconMenu } from './Icons';

export default function MainLayout({ onLogout }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const navigate = useNavigate();
  const { theme, mode } = useTheme();

  const handleLogout = () => {
    onLogout?.();
    navigate('/login', { replace: true });
  };

  const layoutStyle = {
    minHeight: '100vh',
    fontFamily: theme.fontFamily.sans,
    color: theme.color.text,
  };
  const headerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: theme.header.height,
    background: theme.header.background,
    color: theme.header.color,
    paddingLeft: theme.header.paddingHorizontal,
    paddingRight: theme.header.paddingHorizontal,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: theme.header.fontSize,
    fontWeight: theme.header.fontWeight,
    boxShadow: theme.header.boxShadow,
    zIndex: 101,
  };
  const mainStyle = {
    paddingTop: theme.header.height,
    paddingLeft: theme.sideMenu.width,
    minHeight: '100vh',
    background: theme.color.background,
  };
  const mainContentStyle = { padding: 24, maxWidth: 1200, margin: '0 auto' };

  return (
    <div style={layoutStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <IconMenu size={24} />
          </button>
          <span>{theme.productName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ opacity: 0.8, fontSize: theme.fontSize.sm }}>{theme.companyName}</span>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)',
              border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)'}`,
              color: 'inherit',
              padding: '6px 12px',
              borderRadius: theme.button.borderRadius,
              fontSize: theme.fontSize.sm,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>
      {menuOpen && <SideMenu />}
      <main style={{ ...mainStyle, paddingLeft: menuOpen ? theme.sideMenu.width : 24 }}>
        <div style={mainContentStyle}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
