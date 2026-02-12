import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { IconKey, IconTrash, IconGrid, IconTicket } from '../../components/Icons';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'deviceA', label: 'Device-A' },
  { key: 'interfaceA', label: 'Interface-A' },
  { key: 'deviceBPeer', label: 'Device-B/Peer' },
  { key: 'interfaceB', label: 'Interface-B' },
  { key: 'pathLabel', label: 'Path-Label' },
  { key: 'avgLatency', label: 'Avg-Latency' },
  { key: 'dropRate', label: 'Drop Rate' },
  { key: 'encrypt', label: 'Encrypt' },
  { key: 'status', label: 'Status' },
];

const MOCK_ROWS = [
  { id: 'T001', deviceA: 'Router-01', interfaceA: 'eth0', deviceBPeer: 'Router-02', interfaceB: 'eth1', pathLabel: 'PL-A', avgLatency: '12 ms', dropRate: '0.1%', encrypt: true, status: 'Active' },
  { id: 'T002', deviceA: 'Router-01', interfaceA: 'eth1', deviceBPeer: 'Router-03', interfaceB: 'eth0', pathLabel: 'PL-B', avgLatency: '18 ms', dropRate: '0%', encrypt: true, status: 'Active' },
  { id: 'T003', deviceA: 'Router-02', interfaceA: 'eth0', deviceBPeer: 'Router-03', interfaceB: 'eth1', pathLabel: 'PL-A', avgLatency: '22 ms', dropRate: '0.2%', encrypt: false, status: 'Active' },
  { id: 'T004', deviceA: 'Router-02', interfaceA: 'eth1', deviceBPeer: 'Router-01', interfaceB: 'eth0', pathLabel: 'PL-C', avgLatency: '8 ms', dropRate: '0%', encrypt: true, status: 'Inactive' },
  { id: 'T005', deviceA: 'Router-03', interfaceA: 'eth0', deviceBPeer: 'Router-01', interfaceB: 'eth1', pathLabel: 'PL-B', avgLatency: '15 ms', dropRate: '0.1%', encrypt: true, status: 'Active' },
];

function getDistinctValues(rows, key) {
  const set = new Set();
  rows.forEach((r) => set.add(r[key] === true ? 'Yes' : r[key] === false ? 'No' : String(r[key] ?? '')));
  return Array.from(set).sort();
}

export default function Tunnels() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const s = getDataPageStyles(t);
  const [rows, setRows] = useState(MOCK_ROWS);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'ticket'
  const [filters, setFilters] = useState([]); // [{ columnKey, value }, ...]
  const [searchOpen, setSearchOpen] = useState(false);
  const [columnSelect, setColumnSelect] = useState(false);
  const [valueSelect, setValueSelect] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const searchRef = useRef(null);

  const filteredRows = useMemo(() => {
    if (!filters.length) return rows;
    return rows.filter((row) =>
      filters.every(({ columnKey, value }) => {
        const cell = row[columnKey];
        const str = cell === true ? 'Yes' : cell === false ? 'No' : String(cell ?? '');
        return str === value;
      })
    );
  }, [rows, filters]);

  const distinctByColumn = useMemo(() => {
    const o = {};
    COLUMNS.forEach((col) => {
      o[col.key] = getDistinctValues(rows, col.key);
    });
    return o;
  }, [rows]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const va = sortKey === 'encrypt' ? (a[sortKey] ? 'Yes' : 'No') : String(a[sortKey] ?? '');
      const vb = sortKey === 'encrypt' ? (b[sortKey] ? 'Yes' : 'No') : String(b[sortKey] ?? '');
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [filteredRows, sortKey, sortDir]);

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

  const handleDelete = (id) => {
    if (window.confirm('Delete this tunnel?')) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const gridCols = '32px 60px 90px 90px 100px 90px 70px 90px 80px 60px 80px 80px';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Inventory – Tunnels</h1>
        <div style={{ ...s.toolbar, marginLeft: 'auto' }}>
          <button
            type="button"
            style={s.iconBtn}
            onClick={() => setViewMode(viewMode === 'grid' ? 'ticket' : 'grid')}
            title={viewMode === 'grid' ? 'Ticket view' : 'Grid view'}
            aria-label={viewMode === 'grid' ? 'Ticket view' : 'Grid view'}
          >
            {viewMode === 'grid' ? <IconTicket size={16} /> : <IconGrid size={16} />}
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
                  <div style={{ fontSize: t.fontSize.xs, color: t.color.textMuted, marginBottom: 6 }}>Select column</div>
                  {COLUMNS.map((col) => (
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
              const col = COLUMNS.find((c) => c.key === f.columnKey);
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

      {filteredRows.length === 0 ? (
        <p style={s.empty}>No tunnels match the current filters.</p>
      ) : viewMode === 'grid' ? (
        <>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <button type="button" style={{ ...s.btn, ...s.btnDanger }} onClick={() => {
                if (!window.confirm(`Delete ${selectedIds.size} selected tunnel(s)?`)) return;
                setRows((prev) => prev.filter((r) => !selectedIds.has(String(r.id))));
                setSelectedIds(new Set());
              }}>
                Delete selected ({selectedIds.size})
              </button>
            </div>
          )}
          <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={sortedRows.length > 0 && sortedRows.every((r) => selectedIds.has(String(r.id)))} onChange={(e) => setSelectedIds(e.target.checked ? new Set(sortedRows.map((r) => String(r.id))) : new Set())} style={{ margin: 0 }} /></span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('id'); setSortDir((d) => (sortKey === 'id' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>ID {sortKey === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('deviceA'); setSortDir((d) => (sortKey === 'deviceA' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Device-A {sortKey === 'deviceA' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('interfaceA'); setSortDir((d) => (sortKey === 'interfaceA' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Interface-A {sortKey === 'interfaceA' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('deviceBPeer'); setSortDir((d) => (sortKey === 'deviceBPeer' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Device-B/Peer {sortKey === 'deviceBPeer' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('interfaceB'); setSortDir((d) => (sortKey === 'interfaceB' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Interface-B {sortKey === 'interfaceB' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('pathLabel'); setSortDir((d) => (sortKey === 'pathLabel' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Path-Label {sortKey === 'pathLabel' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('avgLatency'); setSortDir((d) => (sortKey === 'avgLatency' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Avg-Latency {sortKey === 'avgLatency' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('dropRate'); setSortDir((d) => (sortKey === 'dropRate' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Drop Rate {sortKey === 'dropRate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('encrypt'); setSortDir((d) => (sortKey === 'encrypt' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Encrypt {sortKey === 'encrypt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('status'); setSortDir((d) => (sortKey === 'status' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Status {sortKey === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span>Action</span>
          </div>
          {sortedRows.map((r) => (
            <div key={r.id} style={s.grid(gridCols)}>
              <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={selectedIds.has(String(r.id))} onChange={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(String(r.id))) next.delete(String(r.id)); else next.add(String(r.id)); return next; })} style={{ margin: 0 }} /></span>
              <span>{r.id}</span>
              <span>{r.deviceA}</span>
              <span>{r.interfaceA}</span>
              <span>{r.deviceBPeer}</span>
              <span>{r.interfaceB}</span>
              <span>{r.pathLabel}</span>
              <span>{r.avgLatency}</span>
              <span>{r.dropRate}</span>
              <span>{r.encrypt ? 'Yes' : 'No'}</span>
              <span>{r.status}</span>
              <div style={s.actions}>
                <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token">
                  <IconKey size={16} />
                </button>
                <button type="button" style={s.iconBtn} onClick={() => handleDelete(r.id)} title="Delete">
                  <IconTrash size={16} />
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={s.ticketList}>
          {filteredRows.map((r) => (
            <div key={r.id} style={s.ticketCard}>
              <div style={s.ticketMain}>
                <strong>{r.id}</strong>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.deviceA} / {r.interfaceA}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>→ {r.deviceBPeer} / {r.interfaceB}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Path: {r.pathLabel}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.avgLatency} · {r.dropRate}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Encrypt: {r.encrypt ? 'Yes' : 'No'}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.status}</span>
              </div>
              <div style={s.actions}>
                <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token">
                  <IconKey size={16} />
                </button>
                <button type="button" style={s.iconBtn} onClick={() => handleDelete(r.id)} title="Delete">
                  <IconTrash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
