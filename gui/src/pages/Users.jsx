import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
import CollapsibleAddPanel from '../components/CollapsibleAddPanel';
import {
  fetchAccounts,
  fetchGroups,
  fetchOrganizations,
  fetchUsers,
  fetchUserPermissions,
  createUser,
  updateUser,
  createUserPermission,
  updatePermission,
  deletePermission,
} from '../api/client';

const PERMISSION_TO_OPTIONS = [
  { value: 'account', label: 'Account' },
  { value: 'organization', label: 'Organization' },
  { value: 'group', label: 'Group' },
];

const ROLE_OPTIONS_ACCOUNT = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_OPTIONS_ORG_GROUP = [
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
];

function nextId() {
  return String(Date.now());
}

export default function Users() {
  const [accounts, setAccounts] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    account_id: '',
    name: '',
    email: '',
    role: 'manager',
    entity: '',
  });
  const [formPermissions, setFormPermissions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [groups, setGroups] = useState([]);

  const resetForm = () => {
    setForm({ account_id: selectedAccountId || '', name: '', email: '', role: 'manager', entity: '' });
    setFormPermissions([]);
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
      fetchUsers(selectedAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
    } else {
      fetchUsers().then((list) => setRecords(Array.isArray(list) ? list : []));
    }
  }, [selectedAccountId]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const accountId = form.account_id || selectedAccountId;
    if (!accountId) return;
    const res = await createUser({
      account_id: accountId,
      email: form.email.trim(),
      name: form.name.trim(),
      is_owner: form.role === 'owner',
      enabled: true,
    });
    if (res) {
      if (selectedAccountId) fetchUsers(selectedAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      else fetchUsers().then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      setRecords((prev) => [
        ...prev,
        {
          id: nextId(),
          name: form.name.trim(),
          email: form.email.trim(),
          account_id: accountId,
          role: form.role,
          entity: form.entity.trim(),
          enabled: true,
        },
      ]);
      resetForm();
    }
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      account_id: rec.account_id || selectedAccountId || '',
      name: rec.name || '',
      email: rec.email || '',
      role: rec.is_owner ? 'owner' : (rec.role_name === 'Owner' ? 'owner' : 'manager'),
      entity: rec.entity_id || rec.entity || '',
    });
    fetchUserPermissions(rec.id).then((list) =>
      setFormPermissions((list || []).map((p) => ({ id: p.id, permission_to: p.permission_to || 'account', entity_id: p.entity_id || '', entity_name: p.entity_name || '', role: p.role || 'viewer' })))
    );
    const aid = rec.account_id || selectedAccountId;
    if (aid) {
      fetchOrganizations(aid).then((list) => setOrganizations(Array.isArray(list) ? list : []));
      fetchGroups(aid).then((list) => setGroups(Array.isArray(list) ? list : []));
    } else {
      fetchOrganizations().then((list) => setOrganizations(Array.isArray(list) ? list : []));
      fetchGroups().then((list) => setGroups(Array.isArray(list) ? list : []));
    }
    setAddPanelExpanded(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim() || !form.email.trim()) return;
    const res = await updateUser(editingId, {
      name: form.name.trim(),
      is_owner: form.role === 'owner',
    });
    if (res) {
      for (const row of formPermissions) {
        if (row.id) {
          await updatePermission(row.id, { entity_name: row.entity_name, role: row.role });
        } else if (row.entity_id) {
          await createUserPermission(editingId, {
            permission_to: row.permission_to,
            entity_id: row.entity_id,
            entity_name: row.entity_name,
            role: row.role,
          });
        }
      }
      if (selectedAccountId) fetchUsers(selectedAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      else fetchUsers().then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, name: form.name.trim(), email: form.email.trim(), role: form.role }
            : r
        )
      );
      resetForm();
    }
  };

  const addPermissionRow = () => {
    setFormPermissions((prev) => [...prev, { permission_to: 'account', entity_id: '', entity_name: '', role: 'viewer' }]);
  };

  const removePermissionRow = (index) => {
    const row = formPermissions[index];
    setFormPermissions((prev) => prev.filter((_, i) => i !== index));
    if (row.id) void deletePermission(row.id);
  };

  const updatePermissionRow = (index, field, value) => {
    setFormPermissions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const entityOptions = (permissionTo) => {
    if (permissionTo === 'account') return accounts.map((a) => ({ id: a.id, name: a.billing_email || a.name || a.id }));
    if (permissionTo === 'organization') return organizations.map((o) => ({ id: o.id, name: o.name || o.id }));
    if (permissionTo === 'group') return groups.map((g) => ({ id: g.id, name: g.name || g.id }));
    return [];
  };

  const roleOptions = (permissionTo) =>
    permissionTo === 'account' ? ROLE_OPTIONS_ACCOUNT : ROLE_OPTIONS_ORG_GROUP;

  const handleDelete = (id) => {
    if (window.confirm('Delete this user?')) setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleEnable = async (rec) => {
    const res = await updateUser(rec.id, { enabled: !rec.enabled });
    if (res) {
      if (selectedAccountId) fetchUsers(selectedAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      else fetchUsers().then((list) => setRecords(Array.isArray(list) ? list : []));
    } else {
      setRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, enabled: !r.enabled } : r)));
    }
  };

  const handleResetPassword = (rec) => {
    if (window.confirm(`Send reset password for ${rec.email}?`)) {
      // Placeholder: would call API
    }
  };

  const gridCols = '1fr 1fr 1fr 90px 90px 160px 100px';
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const accountName = (id) => accounts.find((a) => a.id === id)?.billing_email || id || '—';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Account and Users</h1>
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
        title={editingId ? 'Edit user' : 'Create new user'}
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
            placeholder="Email (identity)"
            disabled={!!editingId}
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Account role (default)</label>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={s.select}>
            {ROLE_OPTIONS_ACCOUNT.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {editingId && (
          <div style={s.formRow}>
            <label style={s.label}>Roles and permissions</label>
            <p style={{ margin: '0 0 8px', fontSize: t.fontSize.sm, color: t.color.textMuted }}>
              Permission To: resource type. Entity: the account, organization, or group. Role: Owner / Manager / Viewer (Org/Group: Manager or Viewer only).
            </p>
            {formPermissions.map((row, index) => (
              <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <select
                  value={row.permission_to}
                  onChange={(e) => updatePermissionRow(index, 'permission_to', e.target.value)}
                  style={{ ...s.select, width: 130 }}
                >
                  {PERMISSION_TO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  value={row.entity_id}
                  onChange={(e) => {
                    const opt = entityOptions(row.permission_to).find((x) => x.id === e.target.value);
                    updatePermissionRow(index, 'entity_id', e.target.value);
                    updatePermissionRow(index, 'entity_name', opt ? opt.name : '');
                  }}
                  style={{ ...s.select, width: 180 }}
                >
                  <option value="">— Select —</option>
                  {row.entity_id && !entityOptions(row.permission_to).some((o) => o.id === row.entity_id) && (
                    <option value={row.entity_id}>{row.entity_name || row.entity_id}</option>
                  )}
                  {entityOptions(row.permission_to).map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <select
                  value={row.role}
                  onChange={(e) => updatePermissionRow(index, 'role', e.target.value)}
                  style={{ ...s.select, width: 110 }}
                >
                  {roleOptions(row.permission_to).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button type="button" style={{ ...s.btn, ...s.btnDanger, padding: '6px 10px' }} onClick={() => removePermissionRow(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" style={{ ...s.btn, ...s.btnSecondary, marginTop: 4 }} onClick={addPermissionRow}>
              + Add permission
            </button>
          </div>
        )}
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
        <p style={s.empty}>No users. Create an account first (Account Profile), then add users above.</p>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
            <span>Name</span>
            <span>Email</span>
            <span>Account</span>
            <span>Role</span>
            <span>Status</span>
            <span>Action</span>
            <span></span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={s.grid(gridCols)}>
              <span>{r.name || '—'}</span>
              <span>{r.email}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{accountName(r.account_id)}</span>
              <span>{r.is_owner ? 'Owner' : (r.role_name || 'Manager')}</span>
              <span>{r.enabled ? 'Enabled' : 'Disabled'}</span>
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
                <strong>{r.name || '—'}</strong>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.email}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Account: {accountName(r.account_id)}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Role: {r.is_owner ? 'Owner' : (r.role_name || 'Manager')}</span>
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
