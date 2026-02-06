import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import CollapsibleAddPanel from '../../components/CollapsibleAddPanel';

const TUNNEL_KEY_METHODS = [
  { value: 'IKEv2', label: 'IKEv2' },
  { value: 'IKEv1', label: 'IKEv1' },
  { value: 'PSK', label: 'PSK' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'EAP', label: 'EAP' },
  { value: '', label: '— Select —' },
];

function nextId() {
  return String(Date.now());
}

export default function Organizations() {
  const [records, setRecords] = useState([]);
  const [defaultId, setDefaultId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    group: '',
    tunnelKeyExchangeMethod: '',
  });

  const resetForm = () => {
    setForm({ name: '', group: '', tunnelKeyExchangeMethod: '' });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const id = nextId();
    setRecords((prev) => [
      ...prev,
      { id, name: form.name.trim(), group: form.group.trim(), tunnelKeyExchangeMethod: form.tunnelKeyExchangeMethod || null },
    ]);
    if (defaultId === null) setDefaultId(id);
    resetForm();
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      name: rec.name,
      group: rec.group || '',
      tunnelKeyExchangeMethod: rec.tunnelKeyExchangeMethod || '',
    });
    setAddPanelExpanded(true);
  };

  const handleUpdate = () => {
    if (!editingId || !form.name.trim()) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? { ...r, name: form.name.trim(), group: form.group.trim(), tunnelKeyExchangeMethod: form.tunnelKeyExchangeMethod || null }
          : r
      )
    );
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this record?')) setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  useEffect(() => {
    if (!records.length) setDefaultId(null);
    else if (defaultId && !records.some((r) => r.id === defaultId)) setDefaultId(records[0].id);
  }, [records]);

  const handleSetDefault = (id) => {
    setDefaultId(id);
  };

  const gridCols = '1fr 1fr 140px 120px 100px';
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Account Organizations</h1>
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
          <label style={s.label}>Group</label>
          <input
            type="text"
            value={form.group}
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
            style={s.input}
            placeholder="Group"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Tunnel Key Exchange Method</label>
          <select
            value={form.tunnelKeyExchangeMethod}
            onChange={(e) => setForm((f) => ({ ...f, tunnelKeyExchangeMethod: e.target.value }))}
            style={s.select}
          >
            {TUNNEL_KEY_METHODS.map((opt) => (
              <option key={opt.value || '_'} value={opt.value}>
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
            <span>Group</span>
            <span>Tunnel Key Exchange</span>
            <span>Action</span>
            <span></span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={s.grid(gridCols)}>
              <span>{r.name}</span>
              <span>{r.group || '—'}</span>
              <span>{r.tunnelKeyExchangeMethod || '—'}</span>
              <span>
                <button
                  type="button"
                  style={{
                    ...s.btn,
                    ...s.btnSecondary,
                    padding: '6px 10px',
                    opacity: defaultId === r.id ? 0.7 : 1,
                  }}
                  onClick={() => handleSetDefault(r.id)}
                  title={defaultId === r.id ? 'Default' : 'Set as default'}
                >
                  {defaultId === r.id ? 'Default' : 'Set-Default'}
                </button>
              </span>
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
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Group: {r.group || '—'}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>
                  Tunnel: {r.tunnelKeyExchangeMethod || '—'}
                </span>
                {defaultId === r.id && (
                  <span style={{ fontSize: t.fontSize.xs, color: t.color.primary, fontWeight: 500 }}>Default</span>
                )}
              </div>
              <div style={s.actions}>
                <button
                  type="button"
                  style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }}
                  onClick={() => handleSetDefault(r.id)}
                  title={defaultId === r.id ? 'Default' : 'Set as default'}
                >
                  {defaultId === r.id ? 'Default' : 'Set-Default'}
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
