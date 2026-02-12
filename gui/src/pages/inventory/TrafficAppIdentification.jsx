import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import CollapsibleAddPanel from '../../components/CollapsibleAddPanel';
import { IconEdit, IconTrash, IconKey, IconGrid, IconTicket } from '../../components/Icons';

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
  const navigate = useNavigate();
  const s = getDataPageStyles(t);

  const [manualRows, setManualRows] = useState([]);
  const [predefineRows, setPredefineRows] = useState(PREDEFINE_ROWS);
  const [viewModeManual, setViewModeManual] = useState('grid');
  const [viewModePredefine, setViewModePredefine] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPredefine, setEditingPredefine] = useState(false);
  const [sortKeyManual, setSortKeyManual] = useState('name');
  const [sortDirManual, setSortDirManual] = useState('asc');
  const [selectedManualIds, setSelectedManualIds] = useState(new Set());
  const [sortKeyPredefine, setSortKeyPredefine] = useState('name');
  const [sortDirPredefine, setSortDirPredefine] = useState('asc');
  const [selectedPredefineIds, setSelectedPredefineIds] = useState(new Set());
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

  const gridCols = '32px 1fr 1fr 100px 100px 90px 120px';

  const sortedManualRows = useMemo(() => {
    const dir = sortDirManual === 'asc' ? 1 : -1;
    return [...manualRows].sort((a, b) => {
      const va = String(a[sortKeyManual] ?? ''); const vb = String(b[sortKeyManual] ?? '');
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [manualRows, sortKeyManual, sortDirManual]);

  const sortedPredefineRows = useMemo(() => {
    const dir = sortDirPredefine === 'asc' ? 1 : -1;
    return [...predefineRows].sort((a, b) => {
      const va = String(a[sortKeyPredefine] ?? ''); const vb = String(b[sortKeyPredefine] ?? '');
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [predefineRows, sortKeyPredefine, sortDirPredefine]);

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
            <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token">
              <IconKey size={16} />
            </button>
            <button type="button" style={s.iconBtn} onClick={() => onUpdate(r)} title="Update">
              <IconEdit size={16} />
            </button>
            {onDelete && (
              <button type="button" style={s.iconBtn} onClick={() => onDelete(r.id)} title="Delete">
                <IconTrash size={16} />
              </button>
            )}
            {showRefresh && (
              <button type="button" style={s.iconBtn} onClick={() => onRefresh(r.id)} title="Refresh">
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
            <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token">
              <IconKey size={16} />
            </button>
            <button type="button" style={s.iconBtn} onClick={() => onUpdate(r)} title="Update">
              <IconEdit size={16} />
            </button>
            {onDelete && (
              <button type="button" style={s.iconBtn} onClick={() => onDelete(r.id)} title="Delete">
                <IconTrash size={16} />
              </button>
            )}
            {showRefresh && (
              <button type="button" style={s.iconBtn} onClick={() => onRefresh(r.id)} title="Refresh">
                Refresh
              </button>
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
              style={s.iconBtn}
              onClick={() => setViewModeManual(viewModeManual === 'grid' ? 'ticket' : 'grid')}
              title={viewModeManual === 'grid' ? 'Ticket view' : 'Grid view'}
              aria-label={viewModeManual === 'grid' ? 'Ticket view' : 'Grid view'}
            >
              {viewModeManual === 'grid' ? <IconTicket size={16} /> : <IconGrid size={16} />}
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
          <>
            {selectedManualIds.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <button type="button" style={{ ...s.btn, ...s.btnDanger }} onClick={() => {
                  if (!window.confirm(`Delete ${selectedManualIds.size} selected item(s)?`)) return;
                  setManualRows((prev) => prev.filter((r) => !selectedManualIds.has(String(r.id))));
                  setSelectedManualIds(new Set());
                }}>
                  Delete selected ({selectedManualIds.size})
                </button>
              </div>
            )}
            <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={sortedManualRows.length > 0 && sortedManualRows.every((r) => selectedManualIds.has(String(r.id)))} onChange={(e) => setSelectedManualIds(e.target.checked ? new Set(sortedManualRows.map((r) => String(r.id))) : new Set())} style={{ margin: 0 }} /></span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyManual('name'); setSortDirManual((d) => (sortKeyManual === 'name' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Name {sortKeyManual === 'name' ? (sortDirManual === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyManual('description'); setSortDirManual((d) => (sortKeyManual === 'description' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Description {sortKeyManual === 'description' ? (sortDirManual === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyManual('category'); setSortDirManual((d) => (sortKeyManual === 'category' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Category {sortKeyManual === 'category' ? (sortDirManual === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyManual('serviceClass'); setSortDirManual((d) => (sortKeyManual === 'serviceClass' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Service Class {sortKeyManual === 'serviceClass' ? (sortDirManual === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyManual('importance'); setSortDirManual((d) => (sortKeyManual === 'importance' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Importance {sortKeyManual === 'importance' ? (sortDirManual === 'asc' ? '▲' : '▼') : ''}</span>
              <span>Action</span>
            </div>
            {sortedManualRows.map((r) => (
              <div key={r.id} style={s.grid(gridCols)}>
                <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={selectedManualIds.has(String(r.id))} onChange={() => setSelectedManualIds((prev) => { const next = new Set(prev); if (next.has(String(r.id))) next.delete(String(r.id)); else next.add(String(r.id)); return next; })} style={{ margin: 0 }} /></span>
                <span>{r.name}</span>
                <span>{r.description || '—'}</span>
                <span>{r.category || '—'}</span>
                <span>{r.serviceClass || '—'}</span>
                <span>{r.importance || '—'}</span>
                <div style={s.actions}>
                  <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token"><IconKey size={16} /></button>
                  <button type="button" style={s.iconBtn} onClick={() => handleEditManual(r)} title="Update"><IconEdit size={16} /></button>
                  <button type="button" style={s.iconBtn} onClick={() => handleDeleteManual(r.id)} title="Delete"><IconTrash size={16} /></button>
                </div>
              </div>
            ))}
          </>
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
              style={s.iconBtn}
              onClick={() => setViewModePredefine(viewModePredefine === 'grid' ? 'ticket' : 'grid')}
              title={viewModePredefine === 'grid' ? 'Ticket view' : 'Grid view'}
              aria-label={viewModePredefine === 'grid' ? 'Ticket view' : 'Grid view'}
            >
              {viewModePredefine === 'grid' ? <IconTicket size={16} /> : <IconGrid size={16} />}
            </button>
          </div>
        </div>

        {viewModePredefine === 'grid' ? (
          <>
            <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={sortedPredefineRows.length > 0 && sortedPredefineRows.every((r) => selectedPredefineIds.has(String(r.id)))} onChange={(e) => setSelectedPredefineIds(e.target.checked ? new Set(sortedPredefineRows.map((r) => String(r.id))) : new Set())} style={{ margin: 0 }} /></span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyPredefine('name'); setSortDirPredefine((d) => (sortKeyPredefine === 'name' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Name {sortKeyPredefine === 'name' ? (sortDirPredefine === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyPredefine('description'); setSortDirPredefine((d) => (sortKeyPredefine === 'description' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Description {sortKeyPredefine === 'description' ? (sortDirPredefine === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyPredefine('category'); setSortDirPredefine((d) => (sortKeyPredefine === 'category' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Category {sortKeyPredefine === 'category' ? (sortDirPredefine === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyPredefine('serviceClass'); setSortDirPredefine((d) => (sortKeyPredefine === 'serviceClass' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Service Class {sortKeyPredefine === 'serviceClass' ? (sortDirPredefine === 'asc' ? '▲' : '▼') : ''}</span>
              <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyPredefine('importance'); setSortDirPredefine((d) => (sortKeyPredefine === 'importance' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Importance {sortKeyPredefine === 'importance' ? (sortDirPredefine === 'asc' ? '▲' : '▼') : ''}</span>
              <span>Action</span>
            </div>
            {sortedPredefineRows.map((r) => (
              <div key={r.id} style={s.grid(gridCols)}>
                <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={selectedPredefineIds.has(String(r.id))} onChange={() => setSelectedPredefineIds((prev) => { const next = new Set(prev); if (next.has(String(r.id))) next.delete(String(r.id)); else next.add(String(r.id)); return next; })} style={{ margin: 0 }} /></span>
                <span>{r.name}</span>
                <span>{r.description || '—'}</span>
                <span>{r.category || '—'}</span>
                <span>{r.serviceClass || '—'}</span>
                <span>{r.importance || '—'}</span>
                <div style={s.actions}>
                  <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token"><IconKey size={16} /></button>
                  <button type="button" style={s.iconBtn} onClick={() => handleEditPredefine(r)} title="Update"><IconEdit size={16} /></button>
                  <button type="button" style={s.iconBtn} onClick={() => handleRefreshPredefine(r.id)} title="Refresh">Refresh</button>
                </div>
              </div>
            ))}
          </>
        ) : (
          renderTickets(predefineRows, handleEditPredefine, null, handleRefreshPredefine, true)
        )}
      </section>
    </div>
  );
}
