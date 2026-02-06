import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { countries, getFlagEmoji } from '../../data/countries';
import CollapsibleAddPanel from '../../components/CollapsibleAddPanel';

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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'ticket'
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    companyName: '',
    country: '',
    notifications: false,
  });

  const resetForm = () => {
    setForm({ companyName: '', country: '', notifications: false });
    setEditingId(null);
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      companyName: rec.companyName,
      country: rec.country || '',
      notifications: rec.notifications,
    });
    setAddPanelExpanded(true);
  };

  const handleAdd = () => {
    if (!form.companyName.trim()) return;
    setRecords((prev) => [
      ...prev,
      { id: nextId(), companyName: form.companyName.trim(), country: form.country || null, notifications: !!form.notifications },
    ]);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingId || !form.companyName.trim()) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? { ...r, companyName: form.companyName.trim(), country: form.country || null, notifications: !!form.notifications }
          : r
      )
    );
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this record?')) setRecords((prev) => prev.filter((r) => r.id !== id));
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
        title={editingId ? 'Edit record' : 'Create new'}
        expanded={addPanelExpanded}
        onToggle={() => setAddPanelExpanded((v) => !v)}
      >
        <div style={styles.formRow}>
          <label style={styles.label}>Company Name</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            style={styles.input}
            placeholder="Company name"
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
        <p style={styles.empty}>No records. Add one above.</p>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ ...styles.grid, ...styles.gridHeader }}>
            <span>Company Name</span>
            <span>Country</span>
            <span>Notifications</span>
            <span>Actions</span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={styles.grid}>
              <span>{r.companyName}</span>
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
                <strong>{r.companyName}</strong>
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
