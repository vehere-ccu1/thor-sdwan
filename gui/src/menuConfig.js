/**
 * Right-slide main menu structure.
 * All paths and labels for the side panel.
 */
export const menuItems = [
  { path: '/', label: 'Home' },
  {
    label: 'Account',
    children: [
      { path: '/account/profile', label: 'Profile' },
      { path: '/account/organizations', label: 'Organizations' },
      { path: '/account/billing', label: 'Billing' },
      { path: '/account/access-key', label: 'Access Key' },
    ],
  },
  { path: '/users', label: 'Users' },
  {
    label: 'Inventory',
    children: [
      { path: '/inventory/devices', label: 'Devices' },
      { path: '/inventory/tunnels', label: 'Tunnels' },
      { path: '/inventory/peers', label: 'Peers' },
      { path: '/inventory/tokens', label: 'Tokens' },
      { path: '/inventory/path-labels', label: 'Path Labels' },
      { path: '/inventory/traffic-app-identification', label: 'Traffic App Identification' },
    ],
  },
  {
    label: 'Traffic Optimization',
    children: [
      { path: '/traffic-optimization/path-selections', label: 'Path Selections' },
    ],
  },
  {
    label: 'Security',
    children: [
      { path: '/security/firewall', label: 'Organization Firewall Policies' },
    ],
  },
  {
    label: 'Dashboards',
    children: [
      { path: '/dashboards/network', label: 'Network' },
      { path: '/dashboards/traffic', label: 'Traffic' },
    ],
  },
  {
    label: 'Troubleshoot',
    children: [
      { path: '/troubleshoot/job', label: 'Job' },
      { path: '/troubleshoot/notification', label: 'Notification' },
    ],
  },
  { path: '/about', label: 'About' },
  { type: 'modeToggle' },
];
