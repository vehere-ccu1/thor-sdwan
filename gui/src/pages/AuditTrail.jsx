import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
import { IconKey } from '../components/Icons';
import { fetchAuditTrail } from '../api/client';

const GROUP_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'action', label: 'By action' },
  { value: 'resource', label: 'By resource' },
  { value: 'user_email', label: 'By user' },
];

function formatTs(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleString();
  } catch (_) {
    return ts;
  }
}

export default function AuditTrail() {
  const [rows, setRows] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    action: '',
    resource: '',
    groupBy: '',
  });
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('ts');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const userId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_user_id') : null;

  const load = () => {
    if (!userId) {
      setRows([]);
      setGrouped([]);
      return;
    }
    setLoading(true);
    fetchAuditTrail({
      userId,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      action: filters.action || undefined,
      resource: filters.resource || undefined,
      groupBy: filters.groupBy || undefined,
    })
      .then(({ rows: r, grouped: g }) => {
        setRows(Array.isArray(r) ? r : []);
        setGrouped(Array.isArray(g) ? g : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [userId, filters.dateFrom, filters.dateTo, filters.action, filters.resource, filters.groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const s = getDataPageStyles(t);
  const gridCols = '32px 140px 1fr 100px 120px 120px 1fr 100px 80px';

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = a[sortKey] ?? ''; const vb = b[sortKey] ?? '';
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return cmp * dir;
    });
  }, [rows, sortKey, sortDir]);

  if (!userId) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Audit Trail</h1>
        <p style={s.empty}>Session missing user. Please sign in again to view the audit trail.</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Audit Trail</h1>
        <div style={{ ...s.toolbar, flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.fontSize.sm }}>
            <span style={{ color: t.color.textMuted }}>From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              style={{ ...s.input, width: 140, maxWidth: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.fontSize.sm }}>
            <span style={{ color: t.color.textMuted }}>To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              style={{ ...s.input, width: 140, maxWidth: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.fontSize.sm }}>
            <span style={{ color: t.color.textMuted }}>Action</span>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              placeholder="Filter action"
              style={{ ...s.input, width: 120, maxWidth: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.fontSize.sm }}>
            <span style={{ color: t.color.textMuted }}>Resource</span>
            <input
              type="text"
              value={filters.resource}
              onChange={(e) => setFilters((f) => ({ ...f, resource: e.target.value }))}
              placeholder="Filter resource"
              style={{ ...s.input, width: 120, maxWidth: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.fontSize.sm }}>
            <span style={{ color: t.color.textMuted }}>Group by</span>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters((f) => ({ ...f, groupBy: e.target.value }))}
              style={{ ...s.select, width: 140, maxWidth: 'none' }}
            >
              {GROUP_BY_OPTIONS.map((o) => (
                <option key={o.value || 'none'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {filters.groupBy && grouped.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: t.color.surface, borderRadius: 8, fontSize: t.fontSize.sm }}>
          <strong style={{ color: t.color.textMuted }}>Summary</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {grouped.map(({ key, count }) => (
              <span key={key || 'empty'} style={{ color: t.color.text }}>
                {key || '(empty)'}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <p style={s.empty}>No audit records. Visibility depends on your role (Owner / Manager / Viewer).</p>
      ) : (
        <>
          <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={sortedRows.length > 0 && sortedRows.every((r) => selectedIds.has(String(r.id || r.ts + r.user_id)))} onChange={(e) => setSelectedIds(e.target.checked ? new Set(sortedRows.map((r) => String(r.id || r.ts + r.user_id))) : new Set())} style={{ margin: 0 }} /></span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('ts'); setSortDir((d) => (sortKey === 'ts' ? (d === 'asc' ? 'desc' : 'asc') : 'desc')); }}>Time {sortKey === 'ts' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('user_email'); setSortDir((d) => (sortKey === 'user_email' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>User {sortKey === 'user_email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('action'); setSortDir((d) => (sortKey === 'action' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Action {sortKey === 'action' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('resource'); setSortDir((d) => (sortKey === 'resource' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Resource {sortKey === 'resource' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('resource_id'); setSortDir((d) => (sortKey === 'resource_id' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Resource ID {sortKey === 'resource_id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('details'); setSortDir((d) => (sortKey === 'details' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Details {sortKey === 'details' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKey('ip'); setSortDir((d) => (sortKey === 'ip' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>IP {sortKey === 'ip' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            <span>Action</span>
          </div>
          {sortedRows.map((r) => {
            const rowId = r.id || r.ts + r.user_id;
            return (
              <div key={rowId} style={s.grid(gridCols)}>
                <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={selectedIds.has(String(rowId))} onChange={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(String(rowId))) next.delete(String(rowId)); else next.add(String(rowId)); return next; })} style={{ margin: 0 }} /></span>
                <span style={{ fontSize: t.fontSize.sm, color: t.color.textMuted }}>{formatTs(r.ts)}</span>
                <span>{r.user_email || '—'}</span>
                <span>{r.action || '—'}</span>
                <span>{r.resource || '—'}</span>
                <span style={{ fontSize: t.fontSize.sm }}>{r.resource_id || '—'}</span>
                <span style={{ fontSize: t.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }} title={r.details}>{r.details || '—'}</span>
                <span style={{ fontSize: t.fontSize.sm, color: t.color.textMuted }}>{r.ip || '—'}</span>
                <div style={s.actions}>
                  <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token">
                    <IconKey size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
      <p style={{ marginTop: 16, fontSize: t.fontSize.xs, color: t.color.textMuted }}>
        Records are read-only and removed automatically by retention policy. No delete action is available.
      </p>
    </div>
  );
}
