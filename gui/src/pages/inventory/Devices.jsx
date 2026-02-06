import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import {
  General,
  Interfaces,
  Dhcp,
  Routing,
  Policies,
  StaticRoutes,
  Apps,
  Logs,
  PacketTraces,
  Configuration,
  Command,
} from './devices';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'interfaces', label: 'Interfaces' },
  { id: 'dhcp', label: 'DHCP' },
  { id: 'routing', label: 'Routing' },
  { id: 'policies', label: 'Policies' },
  { id: 'static-routes', label: 'Static Routes' },
  { id: 'apps', label: 'Apps' },
  { id: 'logs', label: 'Logs' },
  { id: 'packet-traces', label: 'Packet Traces' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'command', label: 'Command' },
];

const TAB_PANELS = {
  general: General,
  interfaces: Interfaces,
  dhcp: Dhcp,
  routing: Routing,
  policies: Policies,
  'static-routes': StaticRoutes,
  apps: Apps,
  logs: Logs,
  'packet-traces': PacketTraces,
  configuration: Configuration,
  command: Command,
};

export default function Devices() {
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const [activeTab, setActiveTab] = useState('general');

  const tabBarStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    borderBottom: `2px solid ${t.color.border}`,
    marginBottom: 24,
    paddingBottom: 0,
  };

  const tabStyle = (isActive) => ({
    padding: '10px 16px',
    border: 'none',
    borderBottom: isActive ? `2px solid ${t.color.primary}` : '2px solid transparent',
    marginBottom: -2,
    background: 'none',
    fontFamily: t.fontFamily.sans,
    fontSize: t.fontSize.sm,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? t.color.primary : t.color.textMuted,
    cursor: 'pointer',
  });

  const contentStyle = {
    ...s.formCard,
    minHeight: 200,
    padding: 24,
  };

  const Panel = TAB_PANELS[activeTab];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Inventory – Devices</h1>
      </div>

      <div style={tabBarStyle}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={tabStyle(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={contentStyle}>
        {Panel ? <Panel /> : null}
      </div>
    </div>
  );
}
