import { useTheme } from '../../context/ThemeContext';

export default function DeviceConfigurationHelp() {
  const { theme: t } = useTheme();
  const s = {
    title: { margin: '0 0 8px', fontSize: t.fontSize['2xl'], fontWeight: 600, color: t.color.text },
    subtitle: { margin: '0 0 24px', fontSize: t.fontSize.sm, color: t.color.textMuted },
    section: { marginBottom: 28 },
    h2: { margin: '0 0 8px', fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text },
    h3: { margin: '0 0 6px', fontSize: t.fontSize.lg, fontWeight: 600, color: t.color.text },
    p: { margin: '0 0 12px', lineHeight: 1.55, color: t.color.text },
    ul: { margin: '0 0 12px', paddingLeft: 20 },
    li: { marginBottom: 6, lineHeight: 1.5, color: t.color.text },
    note: { marginTop: 12, padding: 12, background: t.color.background, borderRadius: 6, fontSize: t.fontSize.sm, color: t.color.textMuted },
  };

  return (
    <div>
      <h1 style={s.title}>Device Configuration</h1>
      <p style={s.subtitle}>
        Devices can be configured and centrally managed from the CMS GUI.
      </p>

      <section style={s.section}>
        <h2 style={s.h2}>Device settings</h2>
        <p style={s.p}>
          Each device&apos;s settings can be accessed by clicking on a device name from <strong>Inventory &gt; Devices</strong>. If the device has been just added or not yet approved, vRouter will not be in running state.
        </p>
        <p style={s.p}>
          <strong>Interfaces</strong> settings will open by default, showing current networking configuration. If the device was approved but not yet configured, all interfaces are shown grayed out as they are not assigned yet. To configure an interface it first must be assigned. Some interfaces may show IPs since initial configuration was done using local Firewall-Router.
        </p>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>Menu structure</h2>
        <p style={s.p}>Device settings in the CMS GUI are categorized into:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>General</strong></li>
          <li style={s.li}><strong>Configuration</strong></li>
          <li style={s.li}><strong>Status</strong></li>
          <li style={s.li}><strong>Troubleshooting</strong></li>
        </ul>

        <h3 style={s.h3}>General</h3>
        <p style={s.p}>
          Hardware configuration settings for the Firewall-Router (where the agent is installed). IKEv2 key/cert generation buttons to simplify securing your network.
        </p>

        <h3 style={s.h3}>Configuration</h3>
        <ul style={s.ul}>
          <li style={s.li}><strong>Interfaces</strong> — network interfaces and settings</li>
          <li style={s.li}><strong>Firewall &amp; NAT</strong> — firewall rules and NAT</li>
          <li style={s.li}><strong>Static Routes</strong> — static routing</li>
          <li style={s.li}><strong>OSPF</strong> — Open Shortest Path First</li>
          <li style={s.li}><strong>BGP</strong> — Border Gateway Protocol</li>
          <li style={s.li}><strong>Routing Filters</strong> — control traffic flow</li>
        </ul>

        <h3 style={s.h3}>Status</h3>
        <ul style={s.ul}>
          <li style={s.li}>Apps, BGP Neighbors, DHCP, Policies</li>
          <li style={s.li}>Routing Table, Statistics, VRRP</li>
        </ul>

        <h3 style={s.h3}>Troubleshooting</h3>
        <ul style={s.ul}>
          <li style={s.li}><strong>Command</strong> — CLI for advanced troubleshooting</li>
          <li style={s.li}><strong>Edge Settings</strong>, <strong>Logs</strong>, <strong>Packet Traces</strong>, <strong>Recovery Info</strong></li>
        </ul>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>Network configuration</h2>
        <p style={s.p}>The Interfaces page shows columns for networking. Default columns:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Type</strong> — WAN, LAN, or TRUNK. At least one WAN and one LAN are required. TRUNK is used for VLANs.</li>
          <li style={s.li}><strong>Assigned</strong> — Yes: interface can be configured. No: not used with Firewall-Router.</li>
          <li style={s.li}><strong>IPv4</strong>, <strong>GW</strong>, <strong>Metric</strong> — IP, gateway, and priority (primary/secondary).</li>
          <li style={s.li}><strong>Public IP</strong> — detected via STUN.</li>
          <li style={s.li}><strong>Path Labels</strong> — logical labels for traffic/tunnels.</li>
          <li style={s.li}><strong>Routing</strong> — LAN supports OSPF and BGP; OSPF is enabled on LAN by default.</li>
        </ul>
        <p style={s.p}>More columns (Modify columns icon): MAC, MTU, DHCP/Static, QoS.</p>
        <p style={s.p}>
          Configure from the table or via each interface&apos;s settings. Set <strong>Assigned</strong> to Yes, then set Type (WAN/LAN/TRUNK). For WAN/LAN, configure IPv4 in CIDR format. Use the settings icon next to an interface for full options.
        </p>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>WAN interface settings</h2>
        <p style={s.p}>
          Assigned, Type (WAN), IP Address (or via DHCP), Gateway, MAC, MTU (default 1500), Get DNS via DHCP, Path Labels, QoS Policy, Bandwidth Tx/Rx, Public IP, STUN (NAT traversal, on by default), Internet access status, Force 4789 UDP port, Monitor internet, VLAN sub-interfaces.
        </p>
        <div style={s.note}>
          <strong>Note:</strong> Each WAN has gateway monitoring for failover. Lower metric = higher priority. Multiple WANs enable automatic failover.
        </div>
        <div style={s.note}>
          <strong>NAT Traversal:</strong> CMS GUI enables it by default so devices can establish tunnels behind NAT. It is adjusted automatically based on public/private WAN IP.
        </div>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>LAN interface settings</h2>
        <p style={s.p}>
          Assigned, Type (LAN), IP Address (gateway for LAN clients), MTU, DHCP/Static (for WAN), MAC, Routing (OSPF/BGP; OSPF enabled on LAN by default), VLAN sub-interfaces.
        </p>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>DHCP server</h2>
        <p style={s.p}>
          CMS GUI offers DHCP server support for LAN interfaces. You can create and configure the DHCP server through the interface settings. Supported features:
        </p>
        <ul style={s.ul}>
          <li style={s.li}><strong>IP range</strong> — define the range for LAN clients</li>
          <li style={s.li}><strong>DNS</strong> — DNS server configuration for LAN clients</li>
          <li style={s.li}><strong>Lease times</strong> — default and maximum DHCP lease time</li>
          <li style={s.li}><strong>Static IP assignments</strong> — fixed IPs for specific devices</li>
          <li style={s.li}><strong>DHCP options</strong> — e.g. options 42, 66</li>
        </ul>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>LAN bridge</h2>
        <p style={s.p}>
          Two or more network interfaces can be bridged when assigned the same IP and CIDR. Clients connected to any of those interfaces will use the same IP range.
        </p>
      </section>
    </div>
  );
}
