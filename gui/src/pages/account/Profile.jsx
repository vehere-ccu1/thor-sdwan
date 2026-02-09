import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { countries, getFlagEmoji } from '../../data/countries';
import CollapsibleAddPanel from '../../components/CollapsibleAddPanel';
import { fetchAccounts, createAccount, updateAccount } from '../../api/client';

function nextId() {
  return String(Date.now());
}

export default function Profile() {
  const { theme: t } = useTheme();
  const styles = {
    ...getDataPageStyles(t),
    grid: getDataPageStyles(t).grid('1fr 1fr 120px 100px'),
    flag: { fontSize: '1.5rem' },
  };
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    billing_email: '',
    country: '',
    notifications: false,
  });

  const resetForm = () => {
    setForm({ name: '', billing_email: '', country: '', notifications: false });
    setEditingId(null);
  };

  useEffect(() => {
    fetchAccounts().then((list) => setRecords(Array.isArray(list) ? list : []));
  }, []);

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      name: rec.name || '',
      billing_email: rec.billing_email || '',
      country: rec.country || '',
      notifications: !!rec.notifications,
    });
    setAddPanelExpanded(true);
  };

  const handleAdd = async () => {
    if (!form.billing_email.trim()) return;
    const res = await createAccount({
      name: form.name.trim() || form.billing_email.trim(),
      billing_email: form.billing_email.trim(),
    });
    if (res) {
      fetchAccounts().then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      setRecords((prev) => [
        ...prev,
        {
          id: nextId(),
          name: form.name.trim() || form.billing_email.trim(),
          billing_email: form.billing_email.trim(),
          country: form.country || null,
          notifications: form.notifications,
        },
      ]);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !form.billing_email.trim()) return;
    const res = await updateAccount(editingId, {
      name: form.name.trim() || form.billing_email.trim(),
      billing_email: form.billing_email.trim(),
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

  const handleDelete = (id) => {
    if (window.confirm('Delete this account?')) setRecords((prev) => prev.filter((r) => r.id !== id));
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
        title={editingId ? 'Edit account' : 'Create new account'}
        expanded={addPanelExpanded}
        onToggle={() => setAddPanelExpanded((v) => !v)}
      >
        <div style={styles.formRow}>
          <label style={styles.label}>Company / Account name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={styles.input}
            placeholder="Company or account name"
          />
        </div>
        <div style={styles.formRow}>
          <label style={styles.label}>Billing email</label>
          <input
            type="email"
            value={form.billing_email}
            onChange={(e) => setForm((f) => ({ ...f, billing_email: e.target.value }))}
            style={styles.input}
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
            {countries.map((c) => (
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
          {editingId ? (
            <>
              <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleUpdate}>
                Update
              </button>
              <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={resetForm}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleAdd}>
              Add
            </button>
          )}
        </div>
      </CollapsibleAddPanel>

      {records.length === 0 ? (
        <p style={styles.empty}>No accounts. Create one above (billing email = account identity).</p>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ ...styles.grid, ...styles.gridHeader }}>
            <span>Company / Account name</span>
            <span>Billing email</span>
            <span>Country</span>
            <span>Notifications</span>
            <span>Actions</span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={styles.grid}>
              <span>{r.name || '—'}</span>
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
                  Delete
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
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{countryName(r.country)}</span>
                <span style={{ fontSize: t.fontSize.sm }}>{r.notifications ? 'Notifications on' : 'Notifications off'}</span>
              </div>
              <div style={styles.actions}>
                <button type="button" style={{ ...styles.btn, ...styles.btnSecondary, padding: '6px 10px' }} onClick={() => handleEdit(r)}>
                  Edit
                </button>
                <button type="button" style={{ ...styles.btn, ...styles.btnDanger, padding: '6px 10px' }} onClick={() => handleDelete(r.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
