import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
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
  const s = getDataPageStyles(t);
  const gridCols = '140px 1fr 100px 120px 120px 1fr 100px';

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
            <span>Time</span>
            <span>User</span>
            <span>Action</span>
            <span>Resource</span>
            <span>Resource ID</span>
            <span>Details</span>
            <span>IP</span>
          </div>
          {rows.map((r) => (
            <div key={r.id || r.ts + r.user_id} style={s.grid(gridCols)}>
              <span style={{ fontSize: t.fontSize.sm, color: t.color.textMuted }}>{formatTs(r.ts)}</span>
              <span>{r.user_email || '—'}</span>
              <span>{r.action || '—'}</span>
              <span>{r.resource || '—'}</span>
              <span style={{ fontSize: t.fontSize.sm }}>{r.resource_id || '—'}</span>
              <span style={{ fontSize: t.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }} title={r.details}>{r.details || '—'}</span>
              <span style={{ fontSize: t.fontSize.sm, color: t.color.textMuted }}>{r.ip || '—'}</span>
            </div>
          ))}
        </>
      )}
      <p style={{ marginTop: 16, fontSize: t.fontSize.xs, color: t.color.textMuted }}>
        Records are read-only and removed automatically by retention policy. No delete action is available.
      </p>
    </div>
  );
}
