import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import ForgotPassword from './pages/ForgotPassword';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import About from './pages/About';
import PlaceholderPage from './pages/PlaceholderPage';
import Profile from './pages/account/Profile';
import Organizations from './pages/account/Organizations';
import AboutAccounts from './pages/account/AboutAccounts';
import Configuration from './pages/account/Configuration';
import Users from './pages/Users';
import Tunnels from './pages/inventory/Tunnels';
import TrafficAppIdentification from './pages/inventory/TrafficAppIdentification';
import Devices from './pages/inventory/Devices';
import DeviceConfigurationHelp from './pages/inventory/DeviceConfigurationHelp';
import Tokens from './pages/inventory/Tokens';
import OrganizationFirewallPolicies from './pages/security/OrganizationFirewallPolicies';
import AuditTrail from './pages/AuditTrail';

const AUTH_KEY = 'sdwan_cms_logged_in';

function getConfig() {
  return typeof window !== 'undefined' && window.__FLEXIWAN_SERVER_CONFIG__
    ? window.__FLEXIWAN_SERVER_CONFIG__
    : { baseUrl: '/sdwan_cms_api/' };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [config] = useState(getConfig); // for future API baseUrl

  useEffect(() => {
    setIsLoggedIn(sessionStorage.getItem(AUTH_KEY) === '1');
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem(AUTH_KEY, '1');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('sdwan_cms_user_id');
    sessionStorage.removeItem('sdwan_cms_user_email');
    setIsLoggedIn(false);
  };

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
          <Route path="account/profile" element={<Profile />} />
          <Route path="account/about" element={<AboutAccounts />} />
          <Route path="account/organizations" element={<Organizations />} />
          <Route path="account/configuration" element={<Configuration />} />
          <Route path="account/billing" element={<PlaceholderPage title="Billing" />} />
          <Route path="account/access-key" element={<PlaceholderPage title="Access Key" />} />
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
          <Route path="about" element={<About />} />
        </Route>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}
