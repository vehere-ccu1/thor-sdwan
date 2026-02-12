import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { getStoredApiConfig, healthCheck, loadGuiConfigFromServer } from './api/client';
import Login from './pages/Login';
import ConfigDialog from './pages/ConfigDialog';
import CreateAccount from './pages/CreateAccount';
import ForgotPassword from './pages/ForgotPassword';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import PlaceholderPage from './pages/PlaceholderPage';
import Profile from './pages/account/Profile';
import SiteManagement from './pages/account/SiteManagement';
import Users from './pages/Users';
import Tunnels from './pages/inventory/Tunnels';
import TrafficAppIdentification from './pages/inventory/TrafficAppIdentification';
import Devices from './pages/inventory/Devices';
import DeviceConfigurationHelp from './pages/inventory/DeviceConfigurationHelp';
import Tokens from './pages/inventory/Tokens';
import OrganizationFirewallPolicies from './pages/security/OrganizationFirewallPolicies';
import AuditTrail from './pages/AuditTrail';

const AUTH_KEY = 'sdwan_cms_logged_in';

function getBaseUrlAndToken() {
  if (typeof window === 'undefined') return { baseUrl: '/sdwan_cms_api/', token: '' };
  const cfg = getStoredApiConfig();
  const baseUrl = cfg?.baseUrl;
  const token = (cfg && cfg.handshakingToken != null) ? String(cfg.handshakingToken) : '';
  const c = window.__FLEXIWAN_SERVER_CONFIG__;
  const resolvedBase = baseUrl || c?.baseUrl || `${window.location.protocol}//${window.location.hostname}:${c?.apiPort || '3443'}/sdwan_cms_api/`;
  return { baseUrl: resolvedBase.endsWith('/') ? resolvedBase : resolvedBase + '/', token };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);

  useEffect(() => {
    setIsLoggedIn(sessionStorage.getItem(AUTH_KEY) === '1');
  }, []);

  useEffect(() => {
    if (configChecked) return;
    const check = async () => {
      await loadGuiConfigFromServer();
      const { baseUrl, token } = getBaseUrlAndToken();
      const result = await healthCheck(baseUrl, token);
      setConfigChecked(true);
      if (!result?.ok) setShowConfigDialog(true);
    };
    check();
  }, [configChecked]);

  const handleLogin = () => {
    sessionStorage.setItem(AUTH_KEY, '1');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('sdwan_cms_user_id');
    sessionStorage.removeItem('sdwan_cms_user_email');
    sessionStorage.removeItem('sdwan_cms_account_id');
    sessionStorage.removeItem('sdwan_cms_master_org_name');
    setIsLoggedIn(false);
  };

  if (!configChecked) {
    return (
      <ThemeProvider>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          Checking connection…
        </div>
      </ThemeProvider>
    );
  }

  if (showConfigDialog) {
    return (
      <ThemeProvider>
        <ConfigDialog onSuccess={() => setShowConfigDialog(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        {!isLoggedIn ? (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/create-account" element={<CreateAccount onLogin={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<MainLayout onLogout={handleLogout} />}>
          <Route index element={<Home />} />
          <Route path="account/profile" element={<Profile onLogout={handleLogout} />} />
          <Route path="account/sites" element={<SiteManagement />} />
            <Route path="account/organization" element={<Navigate to="/account/sites" replace />} />
          <Route path="users" element={<Users />} />
          <Route path="inventory/devices" element={<Devices />} />
          <Route path="inventory/device-configuration" element={<DeviceConfigurationHelp />} />
          <Route path="inventory/tunnels" element={<Tunnels />} />
          <Route path="inventory/peers" element={<PlaceholderPage title="Peers" />} />
          <Route path="inventory/tokens" element={<Tokens />} />
          <Route path="inventory/path-labels" element={<PlaceholderPage title="Path Labels" />} />
          <Route path="inventory/traffic-app-identification" element={<TrafficAppIdentification />} />
          <Route path="traffic-optimization/path-selections" element={<PlaceholderPage title="Path Selections" />} />
          <Route path="security/firewall" element={<OrganizationFirewallPolicies />} />
          <Route path="security/audit-trail" element={<AuditTrail />} />
          <Route path="dashboards/network" element={<PlaceholderPage title="Network Dashboard" />} />
          <Route path="dashboards/traffic" element={<PlaceholderPage title="Traffic Dashboard" />} />
          <Route path="troubleshoot/job" element={<PlaceholderPage title="Job" />} />
          <Route path="troubleshoot/notification" element={<PlaceholderPage title="Notification" />} />
        </Route>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}
