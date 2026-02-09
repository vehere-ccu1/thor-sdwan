import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import CollapsibleAddPanel from '../../components/CollapsibleAddPanel';
import {
  fetchAccounts,
  fetchGroups,
  fetchOrganizations,
  createOrganization,
  updateOrganization,
} from '../../api/client';

const TUNNEL_KEY_METHODS = [
  { value: 'ikev2', label: 'IKEv2' },
  { value: 'ikev1', label: 'IKEv1' },
  { value: 'PSK', label: 'PSK' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'EAP', label: 'EAP' },
  { value: '', label: '— Select —' },
];

function nextId() {
  return String(Date.now());
}

export default function Organizations() {
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [defaultId, setDefaultId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    account_id: '',
    group_id: '',
    name: '',
    group_name: '',
    tunnel_key_exchange: 'ikev2',
    is_default: false,
  });

  const resetForm = () => {
    setForm({
      account_id: selectedAccountId || '',
      group_id: '',
      name: '',
      group_name: '',
      tunnel_key_exchange: 'ikev2',
      is_default: false,
    });
    setEditingId(null);
  };

  useEffect(() => {
    fetchAccounts().then((list) => {
      setAccounts(list);
      if (!selectedAccountId && list.length > 0) setSelectedAccountId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchGroups(selectedAccountId).then((list) => setGroups(Array.isArray(list) ? list : []));
      fetchOrganizations(selectedAccountId).then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setRecords(arr);
        const def = arr.find((r) => r.is_default);
        setDefaultId(def ? def.id : (arr[0] ? arr[0].id : null));
      });
    } else {
      setGroups([]);
      fetchOrganizations().then((list) => setRecords(Array.isArray(list) ? list : []));
    }
  }, [selectedAccountId]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const accountId = form.account_id || selectedAccountId;
    if (!accountId) return;
    const res = await createOrganization({
      account_id: accountId,
      group_id: form.group_id || null,
      name: form.name.trim(),
      group_name: form.group_name.trim(),
      tunnel_key_exchange: form.tunnel_key_exchange || 'ikev2',
      is_default: form.is_default,
    });
    if (res) {
      if (selectedAccountId) fetchOrganizations(selectedAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      else fetchOrganizations().then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      const id = nextId();
      setRecords((prev) => [
        ...prev,
        {
          id,
          account_id: accountId,
          name: form.name.trim(),
          group_name: form.group_name.trim(),
          tunnel_key_exchange: form.tunnel_key_exchange || 'ikev2',
          is_default: form.is_default,
        },
      ]);
      if (defaultId === null) setDefaultId(id);
      resetForm();
    }
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      account_id: rec.account_id || selectedAccountId || '',
      group_id: rec.group_id || '',
      name: rec.name || '',
      group_name: rec.group_name || '',
      tunnel_key_exchange: rec.tunnel_key_exchange || 'ikev2',
      is_default: !!rec.is_default,
    });
    setAddPanelExpanded(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    const res = await updateOrganization(editingId, {
      name: form.name.trim(),
      group_id: form.group_id || null,
      group_name: form.group_name,
      tunnel_key_exchange: form.tunnel_key_exchange || 'ikev2',
      is_default: form.is_default,
    });
    if (res) {
      if (selectedAccountId) fetchOrganizations(selectedAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      else fetchOrganizations().then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: form.name.trim(),
                group_name: form.group_name.trim(),
                tunnel_key_exchange: form.tunnel_key_exchange,
                is_default: form.is_default,
              }
            : r
        )
      );
      resetForm();
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this organization?')) setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  useEffect(() => {
    if (!records.length) setDefaultId(null);
    else if (defaultId && !records.some((r) => r.id === defaultId)) setDefaultId(records[0].id);
  }, [records]);

  const handleSetDefault = async (id) => {
    const rec = records.find((r) => r.id === id);
    if (!rec) return;
    await updateOrganization(id, { is_default: true });
    setRecords((prev) => prev.map((r) => ({ ...r, is_default: r.id === id })));
    setDefaultId(id);
  };

  const gridCols = '1fr 1fr 1fr 120px 120px 100px';
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const accountName = (id) => accounts.find((a) => a.id === id)?.billing_email || id || '—';
  const groupName = (id) => groups.find((g) => g.id === id)?.name || id || '—';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Organizations</h1>
        <div style={{ ...s.toolbar, flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.fontSize.sm }}>
            <span style={{ color: t.color.textMuted }}>Account</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{ ...s.select, width: 'auto', minWidth: 180 }}
            >
              <option value="">All</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.billing_email || a.name || a.id}
                </option>
              ))}
            </select>
          </label>
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
        title={editingId ? 'Edit organization' : 'Create new organization'}
        expanded={addPanelExpanded}
        onToggle={() => setAddPanelExpanded((v) => !v)}
      >
        <div style={s.formRow}>
          <label style={s.label}>Account</label>
          <select
            value={form.account_id}
            onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
            style={s.select}
            disabled={!!editingId}
          >
            <option value="">— Select —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.billing_email || a.name || a.id}
              </option>
            ))}
          </select>
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Group</label>
          <select
            value={form.group_id}
            onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
            style={s.select}
          >
            <option value="">— None —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Organization name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={s.input}
            placeholder="Network / organization name"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Group name (display)</label>
          <input
            type="text"
            value={form.group_name}
            onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))}
            style={s.input}
            placeholder="Optional"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Tunnel Key Exchange Method</label>
          <select
            value={form.tunnel_key_exchange}
            onChange={(e) => setForm((f) => ({ ...f, tunnel_key_exchange: e.target.value }))}
            style={s.select}
          >
            {TUNNEL_KEY_METHODS.map((opt) => (
              <option key={opt.value || '_'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={s.formRow}>
          <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
              style={s.checkbox}
            />
            Set as default organization
          </label>
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
        <p style={s.empty}>No organizations. Create an account first (Account Profile), then add organizations above.</p>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
            <span>Name</span>
            <span>Account</span>
            <span>Group</span>
            <span>Tunnel Key Exchange</span>
            <span>Action</span>
            <span></span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={s.grid(gridCols)}>
              <span>{r.name}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{accountName(r.account_id)}</span>
              <span>{r.group_name_resolved || r.group_name || groupName(r.group_id) || '—'}</span>
              <span>{r.tunnel_key_exchange || '—'}</span>
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
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Account: {accountName(r.account_id)}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>
                  Group: {r.group_name_resolved || r.group_name || groupName(r.group_id) || '—'}
                </span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Tunnel: {r.tunnel_key_exchange || '—'}</span>
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
