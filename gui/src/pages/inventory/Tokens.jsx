import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchTokens, createToken, revokeToken, fetchOrganizations } from '../../api/client';

export default function Tokens() {
  const { theme: t } = useTheme();
  const [tokens, setTokens] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [newTokenOpen, setNewTokenOpen] = useState(false);
  const [form, setForm] = useState({ organization_id: '', label: '' });
  const [createdToken, setCreatedToken] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchTokens().then((list) => setTokens(Array.isArray(list) ? list : []));
    fetchOrganizations().then((list) => setOrganizations(Array.isArray(list) ? list : []));
  }, []);

  const loadTokens = () => fetchTokens().then((list) => setTokens(Array.isArray(list) ? list : []));

  const handleCreateToken = async () => {
    if (!form.organization_id.trim()) return;
    setBusy(true);
    setCreatedToken(null);
    const res = await createToken({ organization_id: form.organization_id.trim(), label: form.label.trim() });
    setBusy(false);
    if (res && res.token_base64) {
      setCreatedToken(res);
      loadTokens();
    }
  };

  const handleRevoke = async (id) => {
    if (!id) return;
    const res = await revokeToken(id);
    if (res) loadTokens();
  };

  const s = {
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    title: { margin: 0, fontSize: t.fontSize['2xl'], fontWeight: 600, color: t.color.text },
    btn: {
      padding: `${t.button.paddingVertical} ${t.button.paddingHorizontal}`,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      borderRadius: t.button.borderRadius,
      border: 'none',
      cursor: 'pointer',
      background: t.button.primaryBg,
      color: t.button.primaryColor,
    },
    btnSecondary: {
      padding: `${t.button.paddingVertical} ${t.button.paddingHorizontal}`,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      borderRadius: t.button.borderRadius,
      border: `1px solid ${t.button.secondaryBorder}`,
      cursor: 'pointer',
      background: t.button.secondaryBg,
      color: t.button.secondaryColor,
    },
    section: { marginBottom: 28 },
    h2: { margin: '0 0 8px', fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text },
    p: { margin: '0 0 12px', lineHeight: 1.55, color: t.color.text },
    ul: { margin: '0 0 12px', paddingLeft: 20 },
    li: { marginBottom: 6, lineHeight: 1.5, color: t.color.text },
    code: { fontFamily: t.fontFamily.mono, fontSize: t.fontSize.sm, background: t.color.background, padding: '2px 6px', borderRadius: 4 },
    note: { marginTop: 12, padding: 12, background: t.color.background, borderRadius: 6, fontSize: t.fontSize.sm, color: t.color.textMuted },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
    th: { textAlign: 'left', padding: '8px 12px', borderBottom: `2px solid ${t.color.border}`, color: t.color.textMuted, fontWeight: 600, fontSize: t.fontSize.sm },
    td: { padding: '8px 12px', borderBottom: `1px solid ${t.color.border}`, color: t.color.text },
    input: { padding: '6px 10px', borderRadius: 4, border: `1px solid ${t.color.border}`, background: t.color.surface, color: t.color.text, minWidth: 200 },
    select: { padding: '6px 10px', borderRadius: 4, border: `1px solid ${t.color.border}`, background: t.color.surface, color: t.color.text, minWidth: 220 },
    label: { display: 'inline-block', marginRight: 8, marginBottom: 4, color: t.color.textMuted, fontSize: t.fontSize.sm },
    tokenBlock: { fontFamily: t.fontFamily.mono, fontSize: t.fontSize.xs, wordBreak: 'break-all', padding: 12, background: t.color.background, borderRadius: 6, marginTop: 8 },
  };

  return (
    <div>
      <header style={s.header}>
        <h1 style={s.title}>Tokens</h1>
        <button type="button" style={s.btn} onClick={() => { setNewTokenOpen(true); setCreatedToken(null); setForm({ organization_id: organizations[0]?.id || '', label: '' }); }}>
          New Token
        </button>
      </header>

      {tokens.length > 0 && (
        <section style={s.section}>
          <h2 style={s.h2}>Active tokens</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Organization</th>
                <th style={s.th}>Label</th>
                <th style={s.th}>Created</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((tok) => (
                <tr key={tok.id}>
                  <td style={s.td}>{tok.organization_name || tok.organization_id}</td>
                  <td style={s.td}>{tok.label || '—'}</td>
                  <td style={s.td}>{tok.created_at ? new Date(tok.created_at).toLocaleString() : '—'}</td>
                  <td style={s.td}>
                    <button type="button" style={{ ...s.btnSecondary, padding: '4px 10px', fontSize: t.fontSize.xs }} onClick={() => handleRevoke(tok.id)}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={s.section}>
        <h2 style={s.h2}>Device registration</h2>
        <p style={s.p}>
          The purpose of device registration is to connect a newly installed device (using the agent at sites) to your CMS GUI account.
        </p>
      </section>

      <section style={s.section}>
        <h2 style={s.h2}>Token creation</h2>
        <p style={s.p}>
          To register a device, begin by creating your organization&apos;s token. The organization token requires generation only once and is applicable to all devices within a single organization. It&apos;s worth noting that having multiple tokens within a single organization is also supported, enhancing security measures in the event of unauthorized physical access to a device.
        </p>
        <p style={s.p}>
          To create a token from the CMS, go to <strong>Inventory &gt; Tokens</strong> and select the &quot;New Token&quot; button.
        </p>
        <p style={s.p}>The token is produced from the JSON content by <strong>compressing it (no encryption)</strong>, then encoding as <strong>base64</strong>. The JSON contains the following information:</p>
        <ul style={s.ul}>
          <li style={s.li}>CMS API listening public IP and PORT</li>
          <li style={s.li}>Encryption-key information for communication between the agent and the CMS API (PQC) — used at runtime; the token file itself is not encrypted</li>
          <li style={s.li}>Organization name</li>
          <li style={s.li}>
            Random hex string, used as the token in the REST API for validation. In every request the agent and the API send <span style={s.code}>Unix-Time-Stamp</span> and <span style={s.code}>SHA256(random-hex-string + Unix-Time-Stamp)</span>. The listener recalculates <span style={s.code}>SHA256(random-hex-string + received-unix-timestamp)</span> and only responds if the calculated SHA256 equals the received SHA256.
          </li>
        </ul>
        <div style={s.note}>
          <strong>Authentication:</strong> Request validation uses a time-based HMAC: the client sends a Unix timestamp and SHA256(token_secret + timestamp); the server recomputes the same hash and accepts the request only when it matches.
        </div>
        <p style={s.p}>
          The same token entry is stored in the <strong>ClickHouse database at the CMS</strong>, so the API can validate agent requests and associate devices with the correct organization.
        </p>
      </section>

      {newTokenOpen && (
        <div style={{ marginTop: 24, padding: 16, border: `1px solid ${t.color.border}`, borderRadius: 8, background: t.color.surface }}>
          <h3 style={{ margin: '0 0 12px', fontSize: t.fontSize.lg, color: t.color.text }}>New Token</h3>
          <p style={{ margin: '0 0 12px', color: t.color.textMuted, fontSize: t.fontSize.sm }}>Creates a token (compress JSON + base64) and stores the same entry in the CMS ClickHouse DB.</p>
          <div style={{ marginBottom: 12 }}>
            <div style={s.label}>Organization</div>
            <select style={s.select} value={form.organization_id} onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}>
              <option value="">Select organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name || org.id}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={s.label}>Label (optional)</div>
            <input style={s.input} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Site A" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={s.btn} onClick={handleCreateToken} disabled={busy || !form.organization_id}>Create token</button>
            <button type="button" style={s.btnSecondary} onClick={() => { setNewTokenOpen(false); setCreatedToken(null); }}>Close</button>
          </div>
          {createdToken && createdToken.token_base64 && (
            <div style={{ marginTop: 16 }}>
              <div style={s.label}>Token (base64) — copy and use for device registration</div>
              <pre style={s.tokenBlock}>{createdToken.token_base64}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
