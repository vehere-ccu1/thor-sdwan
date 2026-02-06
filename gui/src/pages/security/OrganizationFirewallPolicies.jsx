import { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import {
  IconEdit,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconBlocked,
  IconCheck,
  IconClose,
  IconPlus,
  IconMinus,
} from '../../components/Icons';

const RULE_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'destination', label: 'Destination' },
  { key: 'source', label: 'Source' },
  { key: 'action', label: 'Action' },
  { key: 'description', label: 'Description' },
];

const MOCK_OUTBOUND = [
  { id: 'O1', name: 'Block-Social', destination: '0.0.0.0/0', source: '* Any', action: 'Deny', description: '', enabled: true },
  { id: 'O2', name: 'Block-Streaming', destination: '192.168.0.0/24', source: '* Any', action: 'Deny', description: '', enabled: true },
  { id: 'O3', name: 'Default-Deny', destination: '*', source: '* Any', action: 'Deny', description: '', enabled: true },
];

const MOCK_INBOUND = [
  { id: 'I1', name: 'Deny-All-In', destination: '0.0.0.0/0', source: '* Any', action: 'Deny', description: '', enabled: true },
  { id: 'I2', name: 'Allow-Management', destination: '10.0.0.0/8', source: '* Any', action: 'Deny', description: '', enabled: false },
];

function getDistinctValues(rows, key) {
  const set = new Set();
  rows.forEach((r) => set.add(String(r[key] ?? '')));
  return Array.from(set).sort();
}

const PROTOCOL_OPTIONS = ['TCP', 'UDP', 'ICMP', 'Any'];
const ACTION_OPTIONS = ['Allow', 'Deny'];

function NewRuleForm({ theme: t, s, onSubmit, onCancel }) {
  const [enabled, setEnabled] = useState(true);
  const [description, setDescription] = useState('');
  const [appDestination, setAppDestination] = useState('');
  const [source, setSource] = useState('* Any');
  const [ipRanges, setIpRanges] = useState(['']);
  const [protocols, setProtocols] = useState(['Any']);
  const [portRanges, setPortRanges] = useState(['']);
  const [interfaces, setInterfaces] = useState(['']);
  const [action, setAction] = useState('Deny');

  const addIpRange = () => setIpRanges((prev) => [...prev, '']);
  const removeIpRange = (i) => setIpRanges((prev) => prev.filter((_, idx) => idx !== i));
  const setIpRange = (i, v) => setIpRanges((prev) => { const n = [...prev]; n[i] = v; return n; });

  const addProtocol = () => setProtocols((prev) => [...prev, 'Any']);
  const removeProtocol = (i) => setProtocols((prev) => prev.filter((_, idx) => idx !== i));
  const setProtocol = (i, v) => setProtocols((prev) => { const n = [...prev]; n[i] = v; return n; });

  const addPortRange = () => setPortRanges((prev) => [...prev, '']);
  const removePortRange = (i) => setPortRanges((prev) => prev.filter((_, idx) => idx !== i));
  const setPortRange = (i, v) => setPortRanges((prev) => { const n = [...prev]; n[i] = v; return n; });

  const addInterface = () => setInterfaces((prev) => [...prev, '']);
  const removeInterface = (i) => setInterfaces((prev) => prev.filter((_, idx) => idx !== i));
  const setInterface = (i, v) => setInterfaces((prev) => { const n = [...prev]; n[i] = v; return n; });

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = appDestination || 'New rule';
    const destination = ipRanges.filter(Boolean).join(', ') || '*';
    onSubmit({
      id: `R${Date.now()}`,
      name,
      destination,
      source: source || '* Any',
      action,
      description,
      enabled,
      appDestination,
      ipRanges: ipRanges.filter(Boolean),
      protocols,
      portRanges: portRanges.filter(Boolean),
      interfaces: interfaces.filter(Boolean),
    });
  };

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 };
  const inputStyle = { ...s.input, maxWidth: '100%', minWidth: 0 };
  const formRow = { marginBottom: 12 };
  const twoCol = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' };

  return (
    <form onSubmit={handleSubmit} style={{ ...s.formCard, marginBottom: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', marginBottom: 12, alignItems: 'flex-end' }}>
        <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0, paddingTop: 8 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={s.checkbox} />
          Enabled
        </label>
        <div style={{ minWidth: 120, flex: '1 1 140px' }}>
          <label style={s.label}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} placeholder="Optional" />
        </div>
        <div style={{ minWidth: 120, flex: '1 1 140px' }}>
          <label style={s.label}>App/Destination</label>
          <input type="text" value={appDestination} onChange={(e) => setAppDestination(e.target.value)} style={inputStyle} placeholder="App or destination" />
        </div>
        <div style={{ minWidth: 100, flex: '1 1 120px' }}>
          <label style={s.label}>Source</label>
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle} placeholder="* Any" />
        </div>
        <div style={{ minWidth: 90 }}>
          <label style={s.label}>Action</label>
          <select value={action} onChange={(e) => setAction(e.target.value)} style={{ ...s.select, width: '100%' }}>
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={twoCol}>
        <div style={formRow}>
          <label style={s.label}>Multi IP Address Range</label>
          {ipRanges.map((val, i) => (
            <div key={i} style={rowStyle}>
              <input type="text" value={val} onChange={(e) => setIpRange(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="e.g. 192.168.0.0/24" />
              <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 8px', flexShrink: 0 }} onClick={() => removeIpRange(i)}>−</button>
            </div>
          ))}
          <button type="button" style={{ ...s.btn, ...s.btnSecondary, marginTop: 4, padding: '4px 8px', fontSize: t.fontSize.sm }} onClick={addIpRange}>
            <IconPlus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add
          </button>
        </div>
        <div style={formRow}>
          <label style={s.label}>Protocols</label>
          {protocols.map((val, i) => (
            <div key={i} style={rowStyle}>
              <select value={val} onChange={(e) => setProtocol(i, e.target.value)} style={{ ...s.select, flex: 1, minWidth: 0 }}>
                {PROTOCOL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 8px', flexShrink: 0 }} onClick={() => removeProtocol(i)}>−</button>
            </div>
          ))}
          <button type="button" style={{ ...s.btn, ...s.btnSecondary, marginTop: 4, padding: '4px 8px', fontSize: t.fontSize.sm }} onClick={addProtocol}>
            <IconPlus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add
          </button>
        </div>
      </div>

      <div style={twoCol}>
        <div style={formRow}>
          <label style={s.label}>Multi Port Ranges</label>
          {portRanges.map((val, i) => (
            <div key={i} style={rowStyle}>
              <input type="text" value={val} onChange={(e) => setPortRange(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="e.g. 80-443 or 8080" />
              <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 8px', flexShrink: 0 }} onClick={() => removePortRange(i)}>−</button>
            </div>
          ))}
          <button type="button" style={{ ...s.btn, ...s.btnSecondary, marginTop: 4, padding: '4px 8px', fontSize: t.fontSize.sm }} onClick={addPortRange}>
            <IconPlus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add
          </button>
        </div>
        <div style={formRow}>
          <label style={s.label}>Interfaces</label>
          {interfaces.map((val, i) => (
            <div key={i} style={rowStyle}>
              <input type="text" value={val} onChange={(e) => setInterface(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="e.g. eth0" />
              <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '6px 8px', flexShrink: 0 }} onClick={() => removeInterface(i)}>−</button>
            </div>
          ))}
          <button type="button" style={{ ...s.btn, ...s.btnSecondary, marginTop: 4, padding: '4px 8px', fontSize: t.fontSize.sm }} onClick={addInterface}>
            <IconPlus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add
          </button>
        </div>
      </div>

      <div style={{ ...s.actions, marginTop: 12 }}>
        <button type="submit" style={{ ...s.btn, ...s.btnPrimary }}>Add rule</button>
        <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function RulesTable({ title, rows, allRows, setRows, theme: t, s, viewMode, addPanelExpanded, onToggleAddPanel, addPanelContent }) {
  const move = (id, dir) => {
    const list = allRows ?? rows;
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  const toggleEnabled = (id) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const remove = (id) => {
    if (window.confirm('Delete this rule?')) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const gridCols = '1fr 1fr 100px 100px 1fr 140px';

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: t.fontSize.lg, fontWeight: 600, color: t.color.text }}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onToggleAddPanel}
          style={{
            ...iconBtn(t),
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
            border: `1px solid ${t.color.border}`,
            borderRadius: t.button.borderRadius,
          }}
          title={addPanelExpanded ? 'Close panel' : 'Create new rule'}
          aria-label={addPanelExpanded ? 'Close panel' : 'Create new rule'}
        >
          {addPanelExpanded ? <IconMinus size={20} /> : <IconPlus size={20} />}
        </button>
      </div>
      {addPanelExpanded && addPanelContent}
      {viewMode === 'grid' ? (
        <>
          <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
            <span>Name</span>
            <span>Destination</span>
            <span>Source</span>
            <span>Action</span>
            <span>Description</span>
            <span>Rule Actions</span>
          </div>
          {rows.map((r, index) => {
            const fullIndex = (allRows ?? rows).findIndex((x) => x.id === r.id);
            const canMoveUp = fullIndex > 0;
            const canMoveDown = fullIndex >= 0 && fullIndex < (allRows ?? rows).length - 1;
            return (
              <div key={r.id} style={s.grid(gridCols)}>
                <span>{r.name}</span>
                <span>{r.destination}</span>
                <span>{r.source}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: r.action === 'Allow' ? (t.color.success ?? '#22c55e') : t.color.error }}>
                  {r.action === 'Allow' ? (
                    <IconCheck size={18} style={{ fill: t.color.success ?? '#22c55e', color: t.color.success ?? '#22c55e' }} />
                  ) : (
                    <IconBlocked size={18} style={{ fill: t.color.error, color: t.color.error }} />
                  )}
                  {r.action}
                </span>
                <span style={{ color: t.color.textMuted }}>{r.description || '—'}</span>
                <div style={{ ...s.actions, flexWrap: 'nowrap' }}>
                  {ruleActionButtons(t, r, index, rows, allRows, move, toggleEnabled, remove)}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div style={s.ticketList}>
          {rows.map((r, index) => {
            const fullIndex = (allRows ?? rows).findIndex((x) => x.id === r.id);
            const canMoveUp = fullIndex > 0;
            const canMoveDown = fullIndex >= 0 && fullIndex < (allRows ?? rows).length - 1;
            return (
              <div key={r.id} style={s.ticketCard}>
                <div style={s.ticketMain}>
                  <strong>{r.name}</strong>
                  <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Dest: {r.destination}</span>
                  <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Source: {r.source}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: t.fontSize.sm, color: r.action === 'Allow' ? (t.color.success ?? '#22c55e') : t.color.error }}>
                    {r.action === 'Allow' ? <IconCheck size={16} /> : <IconBlocked size={16} style={{ fill: t.color.error, color: t.color.error }} />}
                    {r.action}
                  </span>
                  {r.description ? <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.description}</span> : null}
                </div>
                <div style={{ ...s.actions, flexWrap: 'nowrap' }}>
                  {ruleActionButtons(t, r, index, rows, allRows, move, toggleEnabled, remove)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ruleActionButtons(t, r, index, rows, allRows, move, toggleEnabled, remove) {
  const list = allRows ?? rows;
  const fullIndex = list.findIndex((x) => x.id === r.id);
  const canMoveUp = fullIndex > 0;
  const canMoveDown = fullIndex >= 0 && fullIndex < list.length - 1;
  return (
    <>
      <button type="button" style={iconBtn(t)} title="Edit" aria-label="Edit">
        <IconEdit size={18} />
      </button>
      <button type="button" style={iconBtn(t)} title={r.enabled ? 'Disable' : 'Enable'} aria-label={r.enabled ? 'Disable' : 'Enable'} onClick={() => toggleEnabled(r.id)}>
        {r.enabled ? <IconClose size={18} /> : <IconCheck size={18} />}
      </button>
      <button type="button" style={iconBtn(t)} title="Move up" aria-label="Move up" onClick={() => move(r.id, 'up')} disabled={!canMoveUp}>
        <IconArrowUp size={18} />
      </button>
      <button type="button" style={iconBtn(t)} title="Move down" aria-label="Move down" onClick={() => move(r.id, 'down')} disabled={!canMoveDown}>
        <IconArrowDown size={18} />
      </button>
      <button type="button" style={iconBtn(t)} title="Delete" aria-label="Delete" onClick={() => remove(r.id)}>
        <IconTrash size={18} />
      </button>
    </>
  );
}

function iconBtn(t) {
  return {
    padding: 6,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: t.color.textMuted,
    borderRadius: 4,
  };
}

export default function OrganizationFirewallPolicies() {
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const [outbound, setOutbound] = useState(MOCK_OUTBOUND);
  const [inbound, setInbound] = useState(MOCK_INBOUND);
  const [outboundAddOpen, setOutboundAddOpen] = useState(false);
  const [inboundAddOpen, setInboundAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'ticket'
  const [filters, setFilters] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [columnSelect, setColumnSelect] = useState(false);
  const [valueSelect, setValueSelect] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const searchRef = useRef(null);

  const allRows = useMemo(() => [...outbound, ...inbound], [outbound, inbound]);

  const filteredOutbound = useMemo(() => {
    if (!filters.length) return outbound;
    return outbound.filter((row) =>
      filters.every(({ columnKey, value }) => String(row[columnKey] ?? '') === value)
    );
  }, [outbound, filters]);

  const filteredInbound = useMemo(() => {
    if (!filters.length) return inbound;
    return inbound.filter((row) =>
      filters.every(({ columnKey, value }) => String(row[columnKey] ?? '') === value)
    );
  }, [inbound, filters]);

  const distinctByColumn = useMemo(() => {
    const o = {};
    RULE_COLUMNS.forEach((col) => {
      o[col.key] = getDistinctValues(allRows, col.key);
    });
    return o;
  }, [allRows]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setColumnSelect(false);
        setValueSelect(false);
        setSelectedColumn(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addFilter = (columnKey, value) => {
    setFilters((prev) => [...prev.filter((f) => f.columnKey !== columnKey), { columnKey, value }]);
    setSelectedColumn(null);
    setValueSelect(false);
    setColumnSelect(true);
  };

  const removeFilter = (index) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Placeholder: would call API to save and push to devices
    window.alert('Save & Update Devices (placeholder)');
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Firewall Policy</h1>
        <div style={s.toolbar}>
          <button
            type="button"
            style={{ ...s.btn, ...s.btnSecondary }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'ticket' : 'grid')}
          >
            {viewMode === 'grid' ? 'Ticket view' : 'Grid view'}
          </button>
          <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleSave}>
            Save & Update Devices
          </button>
        </div>
      </div>

      <div style={{ ...s.formCard, padding: '12px 16px', marginBottom: 16 }}>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <input
            type="text"
            readOnly
            placeholder="Click to search by column…"
            onClick={() => {
              setSearchOpen(true);
              setColumnSelect(true);
              setValueSelect(false);
              setSelectedColumn(null);
            }}
            style={{
              ...s.input,
              maxWidth: 400,
              cursor: 'pointer',
              background: t.color.surface,
            }}
          />
          {searchOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                minWidth: 220,
                background: t.color.surface,
                border: `1px solid ${t.color.border}`,
                borderRadius: t.button.borderRadius,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 200,
                padding: 8,
              }}
            >
              {columnSelect && (
                <div style={{ marginBottom: selectedColumn ? 8 : 0 }}>
                  <div style={{ fontSize: t.fontSize.xs, color: t.color.textMuted, marginBottom: 6 }}>
                    Select column
                  </div>
                  {RULE_COLUMNS.map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => {
                        setSelectedColumn(col);
                        setColumnSelect(false);
                        setValueSelect(true);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontFamily: t.fontFamily.sans,
                        fontSize: t.fontSize.sm,
                        color: t.color.text,
                        borderRadius: 4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.color.background;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              )}
              {valueSelect && selectedColumn && (
                <div>
                  <div style={{ fontSize: t.fontSize.xs, color: t.color.textMuted, marginBottom: 6 }}>
                    Value for {selectedColumn.label}
                  </div>
                  {(distinctByColumn[selectedColumn.key] || []).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => addFilter(selectedColumn.key, val)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontFamily: t.fontFamily.sans,
                        fontSize: t.fontSize.sm,
                        color: t.color.text,
                        borderRadius: 4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.color.background;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      {val || '(empty)'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {filters.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {filters.map((f, i) => {
              const col = RULE_COLUMNS.find((c) => c.key === f.columnKey);
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: t.color.background,
                    borderRadius: t.button.borderRadius,
                    fontSize: t.fontSize.sm,
                    color: t.color.text,
                  }}
                >
                  <span style={{ color: t.color.textMuted }}>{col?.label}:</span> {f.value}
                  <button
                    type="button"
                    onClick={() => removeFilter(i)}
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: t.color.textMuted,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                    aria-label="Remove filter"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <RulesTable
        title="Outbound rules"
        rows={filteredOutbound}
        allRows={outbound}
        setRows={setOutbound}
        theme={t}
        s={s}
        viewMode={viewMode}
        addPanelExpanded={outboundAddOpen}
        onToggleAddPanel={() => setOutboundAddOpen((v) => !v)}
        addPanelContent={
          outboundAddOpen && (
            <NewRuleForm
              theme={t}
              s={s}
              onSubmit={(rule) => {
                setOutbound((prev) => [...prev, rule]);
                setOutboundAddOpen(false);
              }}
              onCancel={() => setOutboundAddOpen(false)}
            />
          )
        }
      />
      <RulesTable
        title="Inbound rules"
        rows={filteredInbound}
        allRows={inbound}
        setRows={setInbound}
        theme={t}
        s={s}
        viewMode={viewMode}
        addPanelExpanded={inboundAddOpen}
        onToggleAddPanel={() => setInboundAddOpen((v) => !v)}
        addPanelContent={
          inboundAddOpen && (
            <NewRuleForm
              theme={t}
              s={s}
              onSubmit={(rule) => {
                setInbound((prev) => [...prev, rule]);
                setInboundAddOpen(false);
              }}
              onCancel={() => setInboundAddOpen(false)}
            />
          )
        }
      />
    </div>
  );
}
