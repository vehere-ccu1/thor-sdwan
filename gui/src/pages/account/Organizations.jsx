import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { IconEdit, IconTrash, IconKey } from '../../components/Icons';
import {
  fetchGroups,
  fetchOrganizations,
  fetchUsers,
  createGroup,
  updateGroup,
  deleteGroup,
  createOrganization,
  updateOrganization,
  deleteOrganization,
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
  const navigate = useNavigate();
  const [currentAccountId, setCurrentAccountId] = useState('');
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('group'); // 'group' | 'site'
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    parent_group_id: '',
  });
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
      account_id: currentAccountId || '',
      group_id: '',
      name: '',
      group_name: '',
      tunnel_key_exchange: 'ikev2',
      is_default: false,
    });
    setEditingId(null);
  };

  useEffect(() => {
    const aid = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_account_id') : null;
    if (aid) setCurrentAccountId(aid);
  }, []);

  useEffect(() => {
    if (currentAccountId) {
      fetchGroups(currentAccountId).then((list) => setGroups(Array.isArray(list) ? list : []));
      fetchUsers(currentAccountId).then((list) => setUsers(Array.isArray(list) ? list : []));
      fetchOrganizations(currentAccountId).then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setRecords(arr);
      });
    } else {
      setGroups([]);
      setUsers([]);
      setRecords([]);
    }
  }, [currentAccountId]);

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) return;
    const accountId = form.account_id || currentAccountId;
    if (!accountId) return;
    // Require a Site group selection (default to the Master-Organization group if none selected).
    const groupId = form.group_id || defaultGroupId;
    if (!groupId) return;
    const res = await createOrganization({
      account_id: accountId,
      group_id: groupId,
      name,
      group_name: form.group_name.trim(),
      tunnel_key_exchange: form.tunnel_key_exchange || 'ikev2',
      is_default: form.is_default,
    });
    if (res) {
      if (currentAccountId) fetchOrganizations(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
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
      resetForm();
    }
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      account_id: rec.account_id || currentAccountId || '',
      group_id: rec.group_id || '',
      name: rec.name || '',
      group_name: rec.group_name || '',
      tunnel_key_exchange: rec.tunnel_key_exchange || 'ikev2',
      is_default: !!rec.is_default,
    });
    setActiveTab('site');
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
      if (currentAccountId) fetchOrganizations(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this site?')) return;
    const res = await deleteOrganization(id);
    if (res && res.deleted) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (currentAccountId) fetchOrganizations(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
    }
  };

  const handleEditGroup = (g) => {
    setEditingGroupId(g.id);
    setGroupForm({
      name: g.name || '',
      parent_group_id: g.parent_group_id != null ? String(g.parent_group_id) : '',
    });
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Delete this site group?')) return;
    const res = await deleteGroup(id);
    if (res && res.deleted) {
      setGroups((prev) => prev.filter((gr) => gr.id !== id));
      if (currentAccountId) fetchGroups(currentAccountId).then((list) => setGroups(Array.isArray(list) ? list : []));
    }
  };

  // Site groups grid: Name, Parent group, Created by, Created on, Action
  const gridColsGroups = 'minmax(0,1.5fr) minmax(0,1.5fr) minmax(100px,1fr) minmax(120px,1fr) 120px';
  // Sites grid: Site Name, Site Group, Master Owner, Created by, Created on, Key Exchange, Action
  const gridCols = 'minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(100px,1fr) minmax(120px,1fr) 90px 120px';
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const groupName = (id) => groups.find((g) => g.id === id)?.name || id || '—';
  const masterOrgName = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_master_org_name') : null) || '—';
  /** Build hierarchical label: "MasterOrgName - ParentSiteGroup - ChildSiteGroup" from root to this group.
   *  When there is no group/parent, we show the account master-organization name from Profile.
   */
  const getGroupPathLabel = (groupId) => {
    if (!groupId || String(groupId) === '00000000-0000-0000-0000-000000000000') return masterOrgName;
    const idMap = new Map(groups.map((g) => [String(g.id), g]));
    const path = [];
    let currentId = String(groupId);
    const seen = new Set();
    while (currentId && idMap.has(currentId) && !seen.has(currentId)) {
      seen.add(currentId);
      const g = idMap.get(currentId);
      path.push(g.name || g.id);
      currentId = g.parent_group_id != null ? String(g.parent_group_id) : '';
    }
    const chain = path.reverse();
    if (!chain.length) return masterOrgName;
    return [masterOrgName, ...chain].join(' - ');
  };
  /** Groups sorted by path so dropdown shows Parent before Child */
  const groupsSortedByPath = [...groups].sort((a, b) =>
    getGroupPathLabel(a.id).localeCompare(getGroupPathLabel(b.id))
  );
  const defaultGroupId = groups.find((g) => (g.name || '').trim() === masterOrgName)?.id
    || groups.find((g) => !g.parent_group_id || String(g.parent_group_id) === '00000000-0000-0000-0000-000000000000')?.id
    || '';
  const userLabel = (id) => (id && id !== '00000000-0000-0000-0000-000000000000' ? (id.length > 8 ? id.slice(0, 8) + '…' : id) : '—');
  const userEmail = (id) => {
    if (!id || id === '00000000-0000-0000-0000-000000000000') return '—';
    const u = users.find((x) => String(x.id) === String(id));
    return (u && (u.email || u.name)) || userLabel(id);
  };
  const masterOwnerDisplay = (r) => {
    const email = userEmail(r.master_owner_user_id);
    return email !== '—' ? email : masterOrgName;
  };
  const formatDate = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—');

  return (
    <div style={s.page}>
      {/* Tab panel: Create site group | Create new site */}
      <div style={s.formCard}>
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${t.color.border}`, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setActiveTab('group')}
            style={{
              ...s.btn,
              ...s.btnSecondary,
              borderRadius: 0,
              borderBottom: activeTab === 'group' ? `2px solid ${t.button.primaryBg}` : '2px solid transparent',
              fontWeight: activeTab === 'group' ? 600 : 400,
              marginBottom: -1,
            }}
          >
            Create site group
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('site')}
            style={{
              ...s.btn,
              ...s.btnSecondary,
              borderRadius: 0,
              borderBottom: activeTab === 'site' ? `2px solid ${t.button.primaryBg}` : '2px solid transparent',
              fontWeight: activeTab === 'site' ? 600 : 400,
              marginBottom: -1,
            }}
          >
            Create new site
          </button>
        </div>
        {activeTab === 'group' ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-end', gap: 12, marginBottom: 0 }}>
              <div style={{ ...s.formRow, marginBottom: 0, flex: '1 1 0', minWidth: 0, maxWidth: 220 }}>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((g) => ({ ...g, name: e.target.value.replace(/-/g, '') }))}
                  style={{ ...s.input, maxWidth: '100%' }}
                  placeholder="Site group"
                />
              </div>
              <div style={{ ...s.formRow, marginBottom: 0, flex: '1 1 0', minWidth: 0, maxWidth: 220 }}>
                <select
                  value={groupForm.parent_group_id}
                  onChange={(e) => setGroupForm((g) => ({ ...g, parent_group_id: e.target.value }))}
                  style={{ ...s.select, maxWidth: '100%' }}
                  title="Parent site group"
                >
                  <option value="">{masterOrgName}</option>
                  {groupsSortedByPath.map((g) => (
                    <option key={g.id} value={g.id}>
                      {getGroupPathLabel(g.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  style={{ ...s.btn, ...s.btnPrimary }}
                  onClick={async () => {
                    const name = groupForm.name.trim();
                    if (!name || !currentAccountId) return;
                    // Require a parent site-group for all new groups (use the default Master-Organization group if nothing selected).
                    const parentId = groupForm.parent_group_id || defaultGroupId;
                    if (!parentId) return;
                    if (name.includes('-')) return; // hyphen not allowed in site group name
                    if (editingGroupId) {
                      await updateGroup(editingGroupId, {
                        name,
                        parent_group_id: parentId,
                      });
                    } else {
                      await createGroup({
                        account_id: currentAccountId,
                        name,
                        parent_group_id: parentId,
                      });
                    }
                    if (currentAccountId) {
                      const list = await fetchGroups(currentAccountId);
                      setGroups(Array.isArray(list) ? list : []);
                    }
                    setGroupForm({ name: '', parent_group_id: defaultGroupId || '' });
                    setEditingGroupId(null);
                  }}
                >
                  {editingGroupId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
            {/* Site groups data grid */}
            <div style={{ marginTop: 24 }}>
              {groups.length === 0 ? (
                <p style={s.empty}>No site groups. Add one above.</p>
              ) : (
                <div style={s.gridWrapper}>
                  <div style={{ ...s.grid(gridColsGroups), ...s.gridHeader }}>
                    <span>Name</span>
                    <span>Parent group</span>
                    <span>Created by</span>
                    <span>Created on</span>
                    <span>Action</span>
                  </div>
                  {groups.map((g) => (
                    <div key={g.id} style={s.grid(gridColsGroups)}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name || '—'}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getGroupPathLabel(g.parent_group_id)}
                      </span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail(g.created_by_user_id)}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(g.created_at)}</span>
                      <div style={s.actions}>
                        <button type="button" style={s.iconBtn} onClick={() => handleEditGroup(g)} title="Edit">
                          <IconEdit size={16} />
                        </button>
                        <button type="button" style={s.iconBtn} onClick={() => handleDeleteGroup(g.id)} title="Delete">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-end', gap: 12, marginBottom: 0 }}>
              <div style={{ ...s.formRow, marginBottom: 0, flex: '1 1 0', minWidth: 0, maxWidth: 200 }}>
                <select
                  value={form.group_id}
                  onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                  style={{ ...s.select, maxWidth: '100%' }}
                  title="Site group"
                >
                  <option value="">{masterOrgName}</option>
                  {groupsSortedByPath.map((g) => (
                    <option key={g.id} value={g.id}>
                      {getGroupPathLabel(g.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ ...s.formRow, marginBottom: 0, flex: '1 1 0', minWidth: 0, maxWidth: 200 }}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={{ ...s.input, maxWidth: '100%' }}
                  placeholder="Site name"
                />
              </div>
              <div style={{ ...s.formRow, marginBottom: 0, flex: '1 1 0', minWidth: 0, maxWidth: 200 }}>
                <select
                  value={form.tunnel_key_exchange}
                  onChange={(e) => setForm((f) => ({ ...f, tunnel_key_exchange: e.target.value }))}
                  style={{ ...s.select, maxWidth: '100%' }}
                  title="Tunnel Key Exchange Method"
                >
                  {TUNNEL_KEY_METHODS.map((opt) => (
                    <option key={opt.value || '_'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flexShrink: 0 }}>
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
            </div>
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <button
                type="button"
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={() => setViewMode(viewMode === 'grid' ? 'ticket' : 'grid')}
              >
                {viewMode === 'grid' ? 'Ticket view' : 'Grid view'}
              </button>
            </div>
            {/* Sites data grid */}
            <div style={{ marginTop: 0 }}>
              {records.length === 0 ? (
                <p style={s.empty}>No sites. Add one above.</p>
              ) : viewMode === 'grid' ? (
                <div style={s.gridWrapper}>
                  <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
                    <span>Site Name</span>
                    <span>Site Group</span>
                    <span>Master Owner</span>
                    <span>Created by</span>
                    <span>Created on</span>
                    <span>Key Exchange</span>
                    <span>Action</span>
                  </div>
                  {records.map((r) => (
                    <div key={r.id} style={s.grid(gridCols)}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{getGroupPathLabel(r.group_id) || r.group_name_resolved || r.group_name || '—'}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{masterOwnerDisplay(r)}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail(r.created_by_user_id)}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</span>
                      <span>{r.tunnel_key_exchange || '—'}</span>
                      <div style={s.actions}>
                        <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens', { state: { organizationId: r.id } })} title="Generate Token">
                          <IconKey size={16} />
                        </button>
                        <button type="button" style={s.iconBtn} onClick={() => handleEdit(r)} title="Edit">
                          <IconEdit size={16} />
                        </button>
                        <button type="button" style={s.iconBtn} onClick={() => handleDelete(r.id)} title="Delete">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={s.ticketList}>
                  {records.map((r) => (
                    <div key={r.id} style={s.ticketCard}>
                      <div style={s.ticketMain}>
                        <strong>{r.name}</strong>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>
                          Site group: {getGroupPathLabel(r.group_id) || r.group_name_resolved || r.group_name || '—'}
                        </span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Master Owner: {masterOwnerDisplay(r)}</span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created by: {userEmail(r.created_by_user_id)}</span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created on: {formatDate(r.created_at)}</span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Key Exchange: {r.tunnel_key_exchange || '—'}</span>
                      </div>
                      <div style={s.actions}>
                        <button type="button" style={s.iconBtn} onClick={() => navigate('/inventory/tokens', { state: { organizationId: r.id } })} title="Generate Token">
                          <IconKey size={16} />
                        </button>
                        <button type="button" style={s.iconBtn} onClick={() => handleEdit(r)} title="Edit">
                          <IconEdit size={16} />
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
          </>
        )}
      </div>
    </div>
  );
}
