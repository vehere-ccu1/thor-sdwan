import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { countries, getFlagEmoji } from '../../data/countries';
import CollapsibleAddPanel from '../../components/CollapsibleAddPanel';
import { fetchAccounts, updateAccount, deleteAccount } from '../../api/client';

export default function Profile({ onLogout }) {
  const { theme: t } = useTheme();
  const styles = {
    ...getDataPageStyles(t),
    grid: getDataPageStyles(t).grid('1.2fr 1fr 1.2fr 120px 100px 120px'),
    flag: { fontSize: '1.5rem' },
  };
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    owner_name: '',
    owner_job_title: '',
    billing_email: '',
    country: '',
    notifications: false,
  });

  const resetForm = () => {
    setForm({ name: '', owner_name: '', owner_job_title: '', billing_email: '', country: '', notifications: false });
    setEditingId(null);
  };

  const currentAccountId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_account_id') : null;
  useEffect(() => {
    fetchAccounts().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setRecords(currentAccountId ? arr.filter((r) => String(r.id) === String(currentAccountId)) : arr);
    });
  }, [currentAccountId]);

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      name: rec.name || '',
      owner_name: rec.owner_name || '',
      owner_job_title: rec.owner_job_title || '',
      billing_email: rec.billing_email || '',
      country: rec.country || '',
      notifications: !!rec.notifications,
    });
    setAddPanelExpanded(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.billing_email.trim()) return;
    const res = await updateAccount(editingId, {
      name: form.name.trim() || form.billing_email.trim(),
      owner_name: form.owner_name.trim(),
      owner_job_title: form.owner_job_title.trim(),
      billing_email: form.billing_email.trim(),
      country: form.country || '',
      notifications: !!form.notifications,
    });
    if (res) {
      fetchAccounts().then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, name: form.name.trim(), billing_email: form.billing_email.trim(), country: form.country || null, notifications: form.notifications }
            : r
        )
      );
      resetForm();
    }
  };

  const navigate = useNavigate();
  const handleDelete = async (id) => {
    const isOwnAccount = String(id) === String(currentAccountId);
    const message = isOwnAccount
      ? 'This will permanently delete your account, all users, sites, site-groups, and master-organization. You will be logged out. Are you sure?'
      : 'Delete this account? All users in this account will also be removed.';
    if (!window.confirm(message)) return;
    const res = await deleteAccount(id);
    if (res && res.deleted) {
      if (isOwnAccount) {
        onLogout?.();
        navigate('/login', { replace: true });
      } else {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        fetchAccounts().then((list) => setRecords(Array.isArray(list) ? list : []));
      }
    }
  };

  const countryName = (code) => countries.find((c) => c.code === code)?.name || code || '—';

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Account Profile</h1>
        <div style={styles.toolbar}>
          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'ticket' : 'grid')}
          >
            {viewMode === 'grid' ? 'Ticket view' : 'Grid view'}
          </button>
        </div>
      </div>

      <CollapsibleAddPanel
        title="Edit account"
        expanded={addPanelExpanded}
        onToggle={() => setAddPanelExpanded((v) => !v)}
      >
        <div style={styles.formRow}>
          <label style={styles.label}>Organization / Account name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={styles.input}
            disabled
            placeholder="Organization or account name"
          />
        </div>
        <div style={styles.formRow}>
          <label style={styles.label}>Owner name</label>
          <input
            type="text"
            value={form.owner_name}
            onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
            style={styles.input}
            placeholder="Owner full name"
          />
        </div>
        <div style={styles.formRow}>
          <label style={styles.label}>Owner job title</label>
          <input
            type="text"
            value={form.owner_job_title}
            onChange={(e) => setForm((f) => ({ ...f, owner_job_title: e.target.value }))}
            style={styles.input}
            placeholder="Owner job title"
          />
        </div>
        <div style={styles.formRow}>
          <label style={styles.label}>Billing email</label>
          <input
            type="email"
            value={form.billing_email}
            onChange={(e) => setForm((f) => ({ ...f, billing_email: e.target.value }))}
            style={styles.input}
            disabled
            placeholder="Email for billing and account owner"
          />
        </div>
        <div style={styles.formRow}>
          <label style={styles.label}>Country</label>
          <select
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            style={styles.select}
          >
            <option value="">— Select country —</option>
            {/* Keep India (IND) at the top */}
            <option value="IN">{getFlagEmoji('IN')} India</option>
            {countries
              .filter((c) => c.code !== 'IN')
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {getFlagEmoji(c.code)} {c.name}
                </option>
              ))}
          </select>
        </div>
        <div style={styles.formRow}>
          <label style={{ ...styles.label, display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.notifications}
              onChange={(e) => setForm((f) => ({ ...f, notifications: e.target.checked }))}
              style={styles.checkbox}
            />
            Notifications
          </label>
        </div>
        <div style={styles.toolbar}>
          {editingId && (
            <>
              <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleUpdate}>
                Update
              </button>
              <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={resetForm}>
                Cancel
              </button>
            </>
          )}
        </div>
      </CollapsibleAddPanel>

      {records.length === 0 ? (
        <p style={styles.empty}>No accounts available.</p>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ ...styles.grid, ...styles.gridHeader }}>
            <span>Organization / Account name</span>
            <span>Owner Name</span>
            <span>Owner Job Title</span>
            <span>Owner Email ID</span>
            <span>Country</span>
            <span>Notifications</span>
            <span>Actions</span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={styles.grid}>
              <span>{r.name || '—'}</span>
              <span>{r.owner_name || '—'}</span>
              <span>{r.owner_job_title || '—'}</span>
              <span>{r.billing_email || '—'}</span>
              <span>
                <span style={styles.flag}>{getFlagEmoji(r.country)}</span> {countryName(r.country)}
              </span>
              <span>{r.notifications ? 'Yes' : 'No'}</span>
              <div style={styles.actions}>
                <button type="button" style={{ ...styles.btn, ...styles.btnSecondary, padding: '6px 10px' }} onClick={() => handleEdit(r)}>
                  Edit
                </button>
                <button type="button" style={{ ...styles.btn, ...styles.btnDanger, padding: '6px 10px' }} onClick={() => handleDelete(r.id)}>
                  {String(r.id) === String(currentAccountId) ? 'Delete my account' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={styles.ticketList}>
          {records.map((r) => (
            <div key={r.id} style={styles.ticketCard}>
              <div style={styles.ticketMain}>
                <span style={styles.flag}>{getFlagEmoji(r.country)}</span>
                <strong>{r.name || r.billing_email}</strong>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.billing_email}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>
                  Owner: {r.owner_name || '—'}
                  {r.owner_job_title ? ` (${r.owner_job_title})` : ''}
                </span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{countryName(r.country)}</span>
                <span style={{ fontSize: t.fontSize.sm }}>{r.notifications ? 'Notifications on' : 'Notifications off'}</span>
              </div>
              <div style={styles.actions}>
                <button type="button" style={{ ...styles.btn, ...styles.btnSecondary, padding: '6px 10px' }} onClick={() => handleEdit(r)}>
                  Edit
                </button>
                <button type="button" style={{ ...styles.btn, ...styles.btnDanger, padding: '6px 10px' }} onClick={() => handleDelete(r.id)}>
                  {String(r.id) === String(currentAccountId) ? 'Delete my account' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
