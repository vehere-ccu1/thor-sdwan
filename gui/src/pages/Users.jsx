import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
import CollapsibleAddPanel from '../components/CollapsibleAddPanel';

const PERMISSION_TO = [
  { value: 'Account', label: 'Account' },
  { value: 'Organization', label: 'Organization' },
];

const ROLES = [
  { value: 'Owner', label: 'Owner' },
  { value: 'Manager', label: 'Manager' },
];

function nextId() {
  return String(Date.now());
}

export default function Users() {
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    permissionTo: 'Account',
    entity: '',
    role: 'Manager',
  });

  const resetForm = () => {
    setForm({ name: '', email: '', permissionTo: 'Account', entity: '', role: 'Manager' });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setRecords((prev) => [
      ...prev,
      {
        id: nextId(),
        name: form.name.trim(),
        email: form.email.trim(),
        permissionTo: form.permissionTo,
        entity: form.entity.trim(),
        role: form.role,
        enabled: true,
      },
    ]);
    resetForm();
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      name: rec.name,
      email: rec.email,
      permissionTo: rec.permissionTo || 'Account',
      entity: rec.entity || '',
      role: rec.role || 'Manager',
    });
    setAddPanelExpanded(true);
  };

  const handleUpdate = () => {
    if (!editingId || !form.name.trim() || !form.email.trim()) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? {
              ...r,
              name: form.name.trim(),
              email: form.email.trim(),
              permissionTo: form.permissionTo,
              entity: form.entity.trim(),
              role: form.role,
            }
          : r
      )
    );
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this user?')) setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleEnable = (rec) => {
    setRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleResetPassword = (rec) => {
    if (window.confirm(`Send reset password for ${rec.email}?`)) {
      // Placeholder: would call API
    }
  };

  const gridCols = '1fr 1fr 100px 1fr 90px 140px 100px';
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Users</h1>
        <div style={s.toolbar}>
          <button
            type="button"
            style={{ ...s.btn, ...s.btnSecondary }}
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
        <div style={s.formRow}>
          <label style={s.label}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={s.input}
            placeholder="Name"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            style={s.input}
            placeholder="Email"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Permission To</label>
          <select
            value={form.permissionTo}
            onChange={(e) => setForm((f) => ({ ...f, permissionTo: e.target.value }))}
            style={s.select}
          >
            {PERMISSION_TO.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Entity</label>
          <input
            type="text"
            value={form.entity}
            onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value }))}
            style={s.input}
            placeholder="Entity"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Role</label>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={s.select}>
            {ROLES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={s.toolbar}>
          {editingId ? (
            <>
              <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleUpdate}>
                Update
              </button>
              <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={resetForm}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd}>
              Add
            </button>
          )}
        </div>
      </CollapsibleAddPanel>

      {records.length === 0 ? (
        <p style={s.empty}>No records. Add one above.</p>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
            <span>Name</span>
            <span>Email</span>
            <span>Permission To</span>
            <span>Entity</span>
            <span>Role</span>
            <span>Action</span>
            <span></span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={s.grid(gridCols)}>
              <span>{r.name}</span>
              <span>{r.email}</span>
              <span>{r.permissionTo || '—'}</span>
              <span>{r.entity || '—'}</span>
              <span>{r.role || '—'}</span>
              <div style={s.actions}>
                <button
                  type="button"
                  style={{
                    ...s.btn,
                    ...(r.enabled ? s.btnDanger : s.btnPrimary),
                    padding: '6px 10px',
                  }}
                  onClick={() => handleToggleEnable(r)}
                >
                  {r.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }}
                  onClick={() => handleResetPassword(r)}
                >
                  Reset-Password
                </button>
              </div>
              <div style={s.actions}>
                <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }} onClick={() => handleEdit(r)}>
                  Edit
                </button>
                <button type="button" style={{ ...s.btn, ...s.btnDanger, padding: '6px 10px' }} onClick={() => handleDelete(r.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={s.ticketList}>
          {records.map((r) => (
            <div key={r.id} style={s.ticketCard}>
              <div style={s.ticketMain}>
                <strong>{r.name}</strong>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.email}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Permission: {r.permissionTo}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Entity: {r.entity || '—'}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Role: {r.role}</span>
                {!r.enabled && (
                  <span style={{ fontSize: t.fontSize.xs, color: t.color.error, fontWeight: 500 }}>Disabled</span>
                )}
              </div>
              <div style={s.actions}>
                <button
                  type="button"
                  style={{ ...s.btn, ...(r.enabled ? s.btnDanger : s.btnPrimary), padding: '6px 10px' }}
                  onClick={() => handleToggleEnable(r)}
                >
                  {r.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }}
                  onClick={() => handleResetPassword(r)}
                >
                  Reset-Password
                </button>
                <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }} onClick={() => handleEdit(r)}>
                  Edit
                </button>
                <button type="button" style={{ ...s.btn, ...s.btnDanger, padding: '6px 10px' }} onClick={() => handleDelete(r.id)}>
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
