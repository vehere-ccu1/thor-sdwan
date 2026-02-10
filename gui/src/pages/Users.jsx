import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
import CollapsibleAddPanel from '../components/CollapsibleAddPanel';
import { IconEdit, IconTrash, IconBlocked, IconCheck, IconInfo, IconKey } from '../components/Icons';
import {
  fetchAccounts,
  fetchGroups,
  fetchOrganizations,
  fetchUsers,
  fetchUserPermissions,
  createUser,
  updateUser,
  deleteUser,
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

function MultiCheckboxDropdown({ label, options, value, onChange, placeholder, styles, theme }) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
  const summary = selectedLabels.length ? selectedLabels.join(', ') : placeholder;

  const toggleOption = (val) => {
    const exists = value.includes(val);
    const next = exists ? value.filter((v) => v !== val) : [...value, val];
    onChange(next);
  };

  return (
    <div style={{ ...styles.formRow, position: 'relative' }}>
      <label style={styles.label}>{label}</label>
      <button
        type="button"
        style={{
          ...styles.select,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: summary ? theme.color.text : theme.color.textMuted,
          }}
        >
          {summary || placeholder}
        </span>
        <span style={{ marginLeft: 8, color: theme.color.textMuted }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            background: theme.color.surface,
            border: `1px solid ${theme.color.border}`,
            borderRadius: 4,
            boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: '6px 10px',
                fontSize: theme.fontSize.sm,
                color: theme.color.textMuted,
              }}
            >
              No options
            </div>
          ) : (
            options.map((o) => (
              <label
                key={o.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={value.includes(o.value)}
                  onChange={() => toggleOption(o.value)}
                  style={{ margin: 0 }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: theme.fontSize.sm,
                  }}
                >
                  {o.label}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function nextId() {
  return String(Date.now());
}

export default function Users() {
  const navigate = useNavigate();
  const [currentAccountId, setCurrentAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    account_id: '',
    name: '',
    job_title: '',
    email: '',
    role: 'manager',
    entity: '',
    organizations: [],
    organization_group_ids: [],
  });
  const [formPermissions, setFormPermissions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [groups, setGroups] = useState([]);

  const resetForm = () => {
    setForm({
      account_id: currentAccountId || '',
      name: '',
      job_title: '',
      email: '',
      role: 'manager',
      entity: '',
      organizations: [],
      organization_group_ids: [],
    });
    setFormPermissions([]);
    setEditingId(null);
  };

  useEffect(() => {
    const aid = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_account_id') : null;
    if (aid) setCurrentAccountId(aid);
  }, []);

  useEffect(() => {
    fetchAccounts().then((list) => setAccounts(Array.isArray(list) ? list : []));
  }, []);

  useEffect(() => {
    if (currentAccountId) {
      fetchUsers(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      fetchOrganizations(currentAccountId).then((list) => setOrganizations(Array.isArray(list) ? list : []));
      fetchGroups(currentAccountId).then((list) => setGroups(Array.isArray(list) ? list : []));
    } else {
      setRecords([]);
      setOrganizations([]);
      setGroups([]);
    }
  }, [currentAccountId]);

  useEffect(() => {
    if (addPanelExpanded && currentAccountId) {
      fetchOrganizations(currentAccountId).then((list) => setOrganizations(Array.isArray(list) ? list : []));
      fetchGroups(currentAccountId).then((list) => setGroups(Array.isArray(list) ? list : []));
      if (!editingId) setForm((f) => ({ ...f, account_id: currentAccountId }));
    }
  }, [addPanelExpanded, currentAccountId]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const accountId = form.account_id || currentAccountId;
    if (!accountId) return;
    const orgList = Array.isArray(form.organizations) ? form.organizations : [];
    const groupList = Array.isArray(form.organization_group_ids) ? form.organization_group_ids : [];
    const res = await createUser({
      account_id: accountId,
      email: form.email.trim(),
      name: form.name.trim(),
      job_title: form.job_title.trim(),
      is_owner: form.role === 'owner',
      enabled: true,
      organizations: orgList,
      organization_group_ids: groupList,
    });
    if (res) {
      if (currentAccountId) fetchUsers(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
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
      account_id: rec.account_id || currentAccountId || '',
      name: rec.name || '',
      job_title: rec.job_title || '',
      email: rec.email || '',
      role: rec.is_owner ? 'owner' : (rec.role_name === 'Owner' ? 'owner' : 'manager'),
      entity: rec.entity_id || rec.entity || '',
      organizations: Array.isArray(rec.organizations) ? [...rec.organizations] : [],
      organization_group_ids: Array.isArray(rec.organization_group_ids) ? [...rec.organization_group_ids] : [],
    });
    fetchUserPermissions(rec.id).then((list) =>
      setFormPermissions((list || []).map((p) => ({ id: p.id, permission_to: p.permission_to || 'account', entity_id: p.entity_id || '', entity_name: p.entity_name || '', role: p.role || 'viewer' })))
    );
    const aid = rec.account_id || currentAccountId;
    if (aid) {
      fetchOrganizations(aid).then((list) => setOrganizations(Array.isArray(list) ? list : []));
      fetchGroups(aid).then((list) => setGroups(Array.isArray(list) ? list : []));
    }
    setAddPanelExpanded(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim() || !form.email.trim()) return;
    const orgList = Array.isArray(form.organizations) ? form.organizations : [];
    const groupList = Array.isArray(form.organization_group_ids) ? form.organization_group_ids : [];
    const res = await updateUser(editingId, {
      name: form.name.trim(),
      job_title: form.job_title.trim(),
      role: form.role,
      is_owner: form.role === 'owner',
      organizations: orgList,
      organization_group_ids: groupList,
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
      if (currentAccountId) fetchUsers(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    const res = await deleteUser(id);
    if (res && res.deleted) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (currentAccountId) fetchUsers(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
    }
  };

  const handleToggleEnable = async (rec) => {
    const res = await updateUser(rec.id, { enabled: !rec.enabled });
    if (res) {
      if (currentAccountId) fetchUsers(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
    } else {
      setRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, enabled: !r.enabled } : r)));
    }
  };

  const handleResetPassword = (rec) => {
    if (window.confirm(`Send reset password for ${rec.email}?`)) {
      // Placeholder: would call API
    }
  };

  // Grid columns: Name, Email, Account, Role, Master-Owner, Created-By, Orgs, Groups, Created-At, Action, Action (fixed width so they stay inside)
  const gridCols =
    'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(80px,100px) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(100px,120px) 80px 80px';
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const accountName = (id) => accounts.find((a) => a.id === id)?.billing_email || id || '—';
  const orgLabel = (id) => organizations.find((o) => o.id === id)?.name || (id && id.length > 8 ? id.slice(0, 8) + '…' : id) || '—';
  const groupLabel = (id) => groups.find((g) => g.id === id)?.name || (id && id.length > 8 ? id.slice(0, 8) + '…' : id) || '—';
  const userLabel = (id) => {
    if (!id) return '—';
    const u = records.find((x) => x.id === id);
    return u ? (u.name || u.email || id) : (id.length > 8 ? id.slice(0, 8) + '…' : id);
  };
  const formatDate = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const currentUserId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_user_id') : null;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ ...s.toolbar, flexWrap: 'wrap', gap: 12 }}>
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
          <label style={s.label}>Job title</label>
          <input
            type="text"
            value={form.job_title}
            onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
            style={s.input}
            placeholder="Job title"
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
        <MultiCheckboxDropdown
          label="Sites"
          options={organizations.map((o) => ({ value: o.id, label: o.name || o.id }))}
          value={form.organizations}
          onChange={(selected) => setForm((f) => ({ ...f, organizations: selected }))}
          placeholder="Select sites"
          styles={s}
          theme={t}
        />
        <MultiCheckboxDropdown
          label="Site Groups"
          options={groups.map((g) => ({ value: g.id, label: g.name || g.id }))}
          value={form.organization_group_ids}
          onChange={(selected) => setForm((f) => ({ ...f, organization_group_ids: selected }))}
          placeholder="Select site groups"
          styles={s}
          theme={t}
        />
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
        <div style={s.gridWrapper}>
          <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
            <span>Name</span>
            <span>Job Title</span>
            <span>Email</span>
            <span>Account</span>
            <span>Role</span>
            <span>Master-Owner</span>
            <span>Created-By</span>
            <span>Organizations</span>
            <span>Groups</span>
            <span>Created-At</span>
            <span>Action</span>
            <span></span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={s.grid(gridCols)}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || '—'}</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.job_title || '—'}</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{accountName(r.account_id)}</span>
              <span>{r.is_owner ? 'Owner' : (r.role_name || 'Manager')}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userLabel(r.master_owner_user_id)}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userLabel(r.created_by_user_id)}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{Array.isArray(r.organizations) ? r.organizations.map(orgLabel).join(', ') || '—' : '—'}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{Array.isArray(r.organization_group_ids) ? r.organization_group_ids.map(groupLabel).join(', ') || '—' : '—'}</span>
              <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{formatDate(r.created_at)}</span>
              <div style={{ ...s.actions, minWidth: 0, overflow: 'hidden', justifyContent: 'flex-start' }}>
                {currentUserId !== r.id && (
                  <button
                    type="button"
                    style={s.iconBtn}
                    onClick={() => handleToggleEnable(r)}
                    title={r.enabled ? 'Disable user' : 'Enable user'}
                  >
                    {r.enabled ? <IconBlocked size={16} /> : <IconCheck size={16} />}
                  </button>
                )}
                <button
                  type="button"
                  style={s.iconBtn}
                  onClick={() => handleResetPassword(r)}
                  title="Send reset password email"
                >
                  <IconInfo size={16} />
                </button>
              </div>
              <div style={{ ...s.actions, minWidth: 0, overflow: 'hidden', justifyContent: 'flex-start' }}>
                <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token">
                  <IconKey size={16} />
                </button>
                <button type="button" style={s.iconBtn} onClick={() => handleEdit(r)} title="Edit user">
                  <IconEdit size={16} />
                </button>
                {!r.is_owner && (
                  <button type="button" style={s.iconBtn} onClick={() => handleDelete(r.id)} title="Delete user">
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={s.ticketList}>
          {records.map((r) => (
            <div key={r.id} style={s.ticketCard}>
              <div style={s.ticketMain}>
                <strong>{r.name || '—'}</strong>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.email}</span>
                {r.job_title && (
                  <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Job title: {r.job_title}</span>
                )}
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Account: {accountName(r.account_id)}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Role: {r.is_owner ? 'Owner' : (r.role_name || 'Manager')}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Master-Owner: {userLabel(r.master_owner_user_id)}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created-By: {userLabel(r.created_by_user_id)}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Organizations: {Array.isArray(r.organizations) ? r.organizations.map(orgLabel).join(', ') || '—' : '—'}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Groups: {Array.isArray(r.organization_group_ids) ? r.organization_group_ids.map(groupLabel).join(', ') || '—' : '—'}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created-At: {formatDate(r.created_at)}</span>
                {!r.enabled && (
                  <span style={{ fontSize: t.fontSize.xs, color: t.color.error, fontWeight: 500 }}>Disabled</span>
                )}
              </div>
              <div style={s.actions}>
                {currentUserId !== r.id && (
                  <button type="button" style={s.iconBtn} onClick={() => handleToggleEnable(r)} title={r.enabled ? 'Disable user' : 'Enable user'}>
                    {r.enabled ? <IconBlocked size={16} /> : <IconCheck size={16} />}
                  </button>
                )}
                <button type="button" style={s.iconBtn} onClick={() => handleResetPassword(r)} title="Send reset password email">
                  <IconInfo size={16} />
                </button>
                <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens')} title="Generate Token">
                  <IconKey size={16} />
                </button>
                <button type="button" style={s.iconBtn} onClick={() => handleEdit(r)} title="Edit user">
                  <IconEdit size={16} />
                </button>
                {!r.is_owner && (
                  <button type="button" style={s.iconBtn} onClick={() => handleDelete(r.id)} title="Delete user">
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
