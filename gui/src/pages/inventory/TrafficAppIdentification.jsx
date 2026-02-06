import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import CollapsibleAddPanel from '../../components/CollapsibleAddPanel';

const CATEGORIES = ['Browser', 'Streaming', 'VoIP', 'Gaming', 'Business', 'Other'];
const SERVICE_CLASSES = ['Real-time', 'Interactive', 'Bulk', 'Best-effort'];
const IMPORTANCE_OPTIONS = ['Low', 'Medium', 'High'];

const PREDEFINE_ROWS = [
  { id: 'P001', name: 'HTTP/HTTPS', description: 'Web browsing', category: 'Browser', serviceClass: 'Interactive', importance: 'Medium' },
  { id: 'P002', name: 'Netflix', description: 'Video streaming', category: 'Streaming', serviceClass: 'Bulk', importance: 'Low' },
  { id: 'P003', name: 'Zoom', description: 'Video conferencing', category: 'Business', serviceClass: 'Real-time', importance: 'High' },
  { id: 'P004', name: 'Slack', description: 'Team messaging', category: 'Business', serviceClass: 'Interactive', importance: 'Medium' },
  { id: 'P005', name: 'Steam', description: 'Gaming platform', category: 'Gaming', serviceClass: 'Real-time', importance: 'High' },
];

function nextId() {
  return String(Date.now());
}

export default function TrafficAppIdentification() {
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);

  const [manualRows, setManualRows] = useState([]);
  const [predefineRows, setPredefineRows] = useState(PREDEFINE_ROWS);
  const [viewModeManual, setViewModeManual] = useState('grid');
  const [viewModePredefine, setViewModePredefine] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPredefine, setEditingPredefine] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    serviceClass: '',
    importance: 'Medium',
  });

  const resetForm = () => {
    setForm({ name: '', description: '', category: '', serviceClass: '', importance: 'Medium' });
    setEditingId(null);
    setEditingPredefine(false);
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    setManualRows((prev) => [
      ...prev,
      {
        id: nextId(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category || null,
        serviceClass: form.serviceClass || null,
        importance: form.importance || 'Medium',
      },
    ]);
    resetForm();
  };

  const handleEditManual = (rec) => {
    setEditingPredefine(false);
    setEditingId(rec.id);
    setForm({
      name: rec.name,
      description: rec.description || '',
      category: rec.category || '',
      serviceClass: rec.serviceClass || '',
      importance: rec.importance || 'Medium',
    });
    setAddPanelExpanded(true);
  };

  const handleEditPredefine = (rec) => {
    setEditingId(null);
    setEditingPredefine(rec.id);
    setForm({
      name: rec.name,
      description: rec.description || '',
      category: rec.category || '',
      serviceClass: rec.serviceClass || '',
      importance: rec.importance || 'Medium',
    });
    setAddPanelExpanded(true);
  };

  const handleUpdate = () => {
    if (!form.name.trim()) return;
    if (editingPredefine) {
      setPredefineRows((prev) =>
        prev.map((r) =>
          r.id === editingPredefine
            ? {
                ...r,
                name: form.name.trim(),
                description: form.description.trim(),
                category: form.category || null,
                serviceClass: form.serviceClass || null,
                importance: form.importance || 'Medium',
              }
            : r
        )
      );
    } else if (editingId) {
      setManualRows((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: form.name.trim(),
                description: form.description.trim(),
                category: form.category || null,
                serviceClass: form.serviceClass || null,
                importance: form.importance || 'Medium',
              }
            : r
        )
      );
    }
    resetForm();
  };

  const handleDeleteManual = (id) => {
    if (window.confirm('Delete this app identification?')) setManualRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRefreshPredefine = (id) => {
    // Placeholder: refresh from source
    window.alert('Refresh from source (placeholder)');
  };

  const gridCols = '1fr 1fr 100px 100px 90px 120px';

  const renderGrid = (rows, onUpdate, onDelete, onRefresh, showRefresh) => (
    <>
      <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
        <span>Name</span>
        <span>Description</span>
        <span>Category</span>
        <span>Service Class</span>
        <span>Importance</span>
        <span>Action</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} style={s.grid(gridCols)}>
          <span>{r.name}</span>
          <span>{r.description || '—'}</span>
          <span>{r.category || '—'}</span>
          <span>{r.serviceClass || '—'}</span>
          <span>{r.importance || '—'}</span>
          <div style={s.actions}>
            <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }} onClick={() => onUpdate(r)}>
              Update
            </button>
            {onDelete && (
              <button type="button" style={{ ...s.btn, ...s.btnDanger, padding: '6px 10px' }} onClick={() => onDelete(r.id)}>
                Delete
              </button>
            )}
            {showRefresh && (
              <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }} onClick={() => onRefresh(r.id)}>
                Refresh
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );

  const renderTickets = (rows, onUpdate, onDelete, onRefresh, showRefresh) => (
    <div style={s.ticketList}>
      {rows.map((r) => (
        <div key={r.id} style={s.ticketCard}>
          <div style={s.ticketMain}>
            <strong>{r.name}</strong>
            <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.description || '—'}</span>
            <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.category}</span>
            <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.serviceClass}</span>
            <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.importance}</span>
          </div>
          <div style={s.actions}>
            <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }} onClick={() => onUpdate(r)}>Update</button>
            {onDelete && (
              <button type="button" style={{ ...s.btn, ...s.btnDanger, padding: '6px 10px' }} onClick={() => onDelete(r.id)}>Delete</button>
            )}
            {showRefresh && (
              <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 10px' }} onClick={() => onRefresh(r.id)}>Refresh</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Inventory – Traffic App Identification</h1>
      </div>

      {/* Manual App Identifiers */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text }}>Manual App Identifiers</h2>
          <div style={s.toolbar}>
            <button
              type="button"
              style={{ ...s.btn, ...s.btnPrimary }}
              onClick={() => { resetForm(); setAddPanelExpanded(true); }}
            >
              New App Identification
            </button>
            <button
              type="button"
              style={{ ...s.btn, ...s.btnSecondary }}
              onClick={() => setViewModeManual(viewModeManual === 'grid' ? 'ticket' : 'grid')}
            >
              {viewModeManual === 'grid' ? 'Ticket view' : 'Grid view'}
            </button>
          </div>
        </div>

        <CollapsibleAddPanel
          title={editingId ? 'Edit record' : editingPredefine ? 'Edit predefined' : 'Create new'}
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
            <label style={s.label}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={s.input}
              placeholder="Description"
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={s.select}
            >
              <option value="">— Select —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Service Class</label>
            <select
              value={form.serviceClass}
              onChange={(e) => setForm((f) => ({ ...f, serviceClass: e.target.value }))}
              style={s.select}
            >
              <option value="">— Select —</option>
              {SERVICE_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Importance</label>
            <select
              value={form.importance}
              onChange={(e) => setForm((f) => ({ ...f, importance: e.target.value }))}
              style={s.select}
            >
              {IMPORTANCE_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={s.toolbar}>
            {(editingId || editingPredefine) ? (
              <>
                <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleUpdate}>Update</button>
                <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={resetForm}>Cancel</button>
              </>
            ) : (
              <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd}>Add</button>
            )}
          </div>
        </CollapsibleAddPanel>

        {manualRows.length === 0 ? (
          <p style={s.empty}>No manual app identifiers. Create one above.</p>
        ) : viewModeManual === 'grid' ? (
          renderGrid(manualRows, handleEditManual, handleDeleteManual, null, false)
        ) : (
          renderTickets(manualRows, handleEditManual, handleDeleteManual, null, false)
        )}
      </section>

      {/* Predefine-App Identifiers */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: t.fontSize.xl, fontWeight: 600, color: t.color.text }}>Predefine-App Identifiers</h2>
          <div style={s.toolbar}>
            <button
              type="button"
              style={{ ...s.btn, ...s.btnSecondary }}
              onClick={() => setViewModePredefine(viewModePredefine === 'grid' ? 'ticket' : 'grid')}
            >
              {viewModePredefine === 'grid' ? 'Ticket view' : 'Grid view'}
            </button>
          </div>
        </div>

        {viewModePredefine === 'grid' ? (
          renderGrid(predefineRows, handleEditPredefine, null, handleRefreshPredefine, true)
        ) : (
          renderTickets(predefineRows, handleEditPredefine, null, handleRefreshPredefine, true)
        )}
      </section>
    </div>
  );
}
