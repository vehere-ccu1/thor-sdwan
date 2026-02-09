import { useTheme } from '../../context/ThemeContext';

export default function AboutAccounts() {
  const { theme: t } = useTheme();
  const s = {
    title: { margin: '0 0 8px', fontSize: t.fontSize['2xl'], fontWeight: 600, color: t.color.text },
    subtitle: { margin: '0 0 24px', fontSize: t.fontSize.sm, color: t.color.textMuted },
    section: { marginBottom: 28 },
    h2: { margin: '0 0 8px', fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text },
    p: { margin: '0 0 12px', lineHeight: 1.55, color: t.color.text },
    ul: { margin: '0 0 12px', paddingLeft: 20 },
    li: { marginBottom: 6, lineHeight: 1.5, color: t.color.text },
    link: { color: t.color.primary, textDecoration: 'none' },
    linkHover: { textDecoration: 'underline' },
  };

  return (
    <div>
      <h1 style={s.title}>About Accounts and Organizations</h1>
      <p style={s.subtitle}>
        Multi-tenant account and organization management.
      </p>

      <section style={s.section}>
        <p style={s.p}>
          The GUI is a multi-tenant management system that allows you to manage multiple independent and isolated networks within a single account. Such a network can represent a company (e.g. a customer of a service provider or systems integrator) or a subsidiary of an enterprise. As an example, a Service Provider with 100 enterprise customers will create 100 Organizations in his Account, each representing an enterprise customer.
        </p>
        <p style={s.p}>A few things to note:</p>
        <ul style={s.ul}>
          <li style={s.li}>At any given time, a user can view and manage Devices and other network elements of a specific organization.</li>
          <li style={s.li}>Users may be invited to the system and have access to one or more Organization/s.</li>
          <li style={s.li}>You may create Groups of Organizations and give users access to specific Groups.</li>
        </ul>
        <p style={s.p}>
          For more information refer to the section <strong>Account and User Management</strong> (Users menu).
        </p>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>Manage Accounts</h2>
        <p style={s.p}>
          The Account menu presents the account profile and allows you to update it, manage the organizations in the account and define access keys. Most of the account information are available only to the account owners. Account managers or viewers can access information at the organizations level.
        </p>
        <p style={s.p}>
          A user, if invited to other accounts, can have access to multiple accounts. The user name and selected account can be seen in the top right menu. When a user has access to multiple accounts, they can select a specific account to view and manage in the top right drop down menu.
        </p>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>Account Organizations</h2>
        <p style={s.p}>
          The Account Organizations menu provides access to all of the organizations in the account. The selected organization is marked as highlighted.
        </p>
        <p style={s.p}>
          This menu allows you to toggle between organizations. To do so, click on the organization you want to select and then click on &quot;Set Organization&quot;.
        </p>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>Enabling 2FA</h2>
        <p style={s.p}>
          As an additional layer of security, Two-Factor authentication can be set up for account owners. 2FA relies on OTP (One-Time-Password) sent to the user&apos;s email or use of &quot;Google Authenticator&quot;.
        </p>
        <p style={s.p}>
          To enable 2FA navigate to the <strong>Users</strong> section and click on the <strong>Enable 2FA</strong> button.
        </p>
      </section>
    </div>
  );
}
