import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
import { IconEdit, IconTrash, IconBlocked, IconCheck, IconInfo, IconKey, IconGrid, IconTicket, IconLink, IconPlus, IconMinus } from '../components/Icons';
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
      {!!label && <label style={styles.label}>{label}</label>}
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
  const formCardRef = useRef(null);
  const nameInputRef = useRef(null);
  const [currentAccountId, setCurrentAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [formPanelExpanded, setFormPanelExpanded] = useState(false);
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
    if (currentAccountId && !editingId) {
      setForm((f) => ({ ...f, account_id: currentAccountId }));
    }
  }, [currentAccountId, editingId]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim() || !(form.job_title || '').trim()) return;
    const accountId = form.account_id || currentAccountId;
    if (!accountId) return;
    const orgList = Array.isArray(form.organizations) ? form.organizations : [];
    const groupList = Array.isArray(form.organization_group_ids) ? form.organization_group_ids : [];
    const res = await createUser({
      account_id: accountId,
      email: form.email.trim(),
      name: form.name.trim(),
      job_title: form.job_title.trim(),
      role: form.role,
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
    setFormPanelExpanded(true);
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
  };

  const roleToDisplayName = (role) => (role === 'owner' ? 'Owner' : role === 'viewer' ? 'Viewer' : 'Manager');

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
      const idJustUpdated = editingId;
      const roleDisplay = roleToDisplayName(form.role);
      if (currentAccountId) {
        fetchUsers(currentAccountId).then((list) => {
          const arr = Array.isArray(list) ? list : [];
          setRecords(arr.map((r) => (r.id === idJustUpdated ? { ...r, role_name: roleDisplay } : r)));
        });
      }
      resetForm();
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, name: form.name.trim(), email: form.email.trim(), role: form.role, role_name: roleToDisplayName(form.role) }
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

  // Grid columns: Name, Job Title, Email, Account, Role, ..., Created-At, Action (single column for all icon buttons)
  const gridCols =
    'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(80px,100px) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(100px,120px) minmax(140px,180px)';
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const graphContainerRef = useRef(null);
  const [graphHeight, setGraphHeight] = useState(520);
  useEffect(() => {
    if (viewMode !== 'graph' || !graphContainerRef.current) return;
    const el = graphContainerRef.current;
    setGraphHeight(el.offsetHeight || 520);
    const ro = new ResizeObserver(() => setGraphHeight(el.offsetHeight || 520));
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  // Graph data for link view: nodes = users, links = created_by -> user (tree of "created by" relationships)
  const graphData = useMemo(() => {
    const ids = new Set((records || []).map((r) => String(r.id)));
    const nodes = (records || []).map((r) => ({
      id: String(r.id),
      name: r.name || r.email || r.id,
      email: r.email,
      role: r.is_owner ? 'Owner' : (r.role_name || 'Manager'),
    }));
    const creatorIds = new Set(
      (records || []).flatMap((r) => (r.created_by_user_id ? [String(r.created_by_user_id)] : []))
    );
    creatorIds.forEach((id) => {
      if (!ids.has(id)) {
        nodes.push({ id, name: '(Creator)', email: '', role: '' });
        ids.add(id);
      }
    });
    const links = (records || [])
      .filter((r) => r.created_by_user_id && String(r.created_by_user_id) !== String(r.id))
      .map((r) => ({ source: String(r.created_by_user_id), target: String(r.id) }));
    return { nodes, links };
  }, [records]);

  // Tree layout for graph view: position nodes by "created by" hierarchy (roots top, children below)
  const graphLayout = useMemo(() => {
    const { nodes, links } = graphData;
    const idToNode = new Map(nodes.map((n) => [n.id, { ...n }]));
    const targets = new Set(links.map((l) => l.target));
    const roots = nodes.filter((n) => !targets.has(n.id));
    const level = new Map();
    roots.forEach((n) => level.set(n.id, 0));
    let frontier = roots.map((n) => n.id);
    while (frontier.length) {
      const next = [];
      frontier.forEach((src) => {
        links.filter((l) => l.source === src).forEach((l) => {
          if (!level.has(l.target)) {
            level.set(l.target, (level.get(src) ?? 0) + 1);
            next.push(l.target);
          }
        });
      });
      frontier = next;
    }
    nodes.forEach((n) => { if (!level.has(n.id)) level.set(n.id, 0); });
    const byLevel = new Map();
    nodes.forEach((n) => {
      const L = level.get(n.id) ?? 0;
      if (!byLevel.has(L)) byLevel.set(L, []);
      byLevel.get(L).push(n.id);
    });
    const width = 800;
    const height = Math.max(graphHeight, 400);
    const nodeWidth = 120;
    const nodeHeight = 36;
    const padding = 40;
    const positions = {};
    byLevel.forEach((ids, L) => {
      const y = padding + L * (nodeHeight + 48);
      const totalW = ids.length * (nodeWidth + 24) - 24;
      const startX = (width - totalW) / 2 + nodeWidth / 2 + 12;
      ids.forEach((id, i) => {
        positions[id] = { x: startX + i * (nodeWidth + 24), y };
      });
    });
    return { positions, width, height };
  }, [graphData, graphHeight]);

  const [nodePositions, setNodePositions] = useState({});
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const graphSvgRef = useRef(null);
  const draggedRef = useRef(false);
  useEffect(() => {
    setNodePositions({ ...graphLayout.positions });
  }, [graphData, graphHeight]);
  const getEffectivePos = (id) => nodePositions[id] ?? graphLayout.positions[id];
  useEffect(() => {
    if (!draggingNodeId || !graphSvgRef.current) return;
    const svg = graphSvgRef.current;
    const toSvg = (clientX, clientY) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { x: p.x, y: p.y };
    };
    const onMove = (e) => {
      draggedRef.current = true;
      const p = toSvg(e.clientX, e.clientY);
      setNodePositions((prev) => ({ ...prev, [draggingNodeId]: p }));
    };
    const onUp = () => setDraggingNodeId(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingNodeId]);

  const userCard = {
    card: {
      background: t.color.surface,
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      width: '100%',
      maxWidth: 480,
      overflow: 'hidden',
      marginBottom: 24,
    },
    header: {
      background: t.widgetHeader?.background ?? t.color.primary,
      color: t.widgetHeader?.color ?? '#ffffff',
      padding: `${t.widgetHeader?.paddingVertical ?? 16}px ${t.widgetHeader?.paddingHorizontal ?? 24}px`,
      textAlign: 'left',
    },
    title: {
      margin: 0,
      fontSize: t.widgetHeaderFontSize ?? t.fontSize.lg,
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    formContainer: { padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { display: 'block', fontSize: t.fontSize.sm, fontWeight: 500, color: t.color.text, marginBottom: 4 },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.color.border,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.color.border,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
      boxSizing: 'border-box',
    },
    buttonRow: { display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' },
    btnPrimary: {
      padding: t.button.paddingVertical + ' ' + t.button.paddingHorizontal,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      fontFamily: t.fontFamily.sans,
      color: t.button.primaryColor,
      background: t.button.primaryBg,
      border: 'none',
      borderRadius: t.button.borderRadius,
      cursor: 'pointer',
    },
    btnSecondary: {
      padding: t.button.paddingVertical + ' ' + t.button.paddingHorizontal,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      fontFamily: t.fontFamily.sans,
      color: t.button.secondaryColor,
      background: t.button.secondaryBg,
      border: `1px solid ${t.button.secondaryBorder}`,
      borderRadius: t.button.borderRadius,
      cursor: 'pointer',
    },
  };
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
        <div style={{ ...s.toolbar, flexWrap: 'wrap', gap: 12, marginLeft: 'auto' }}>
          <button
            type="button"
            style={{ ...s.iconBtn, ...(viewMode === 'grid' ? { opacity: 1, borderColor: t.color.primary } : {}) }}
            onClick={() => setViewMode('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            <IconGrid size={16} />
          </button>
          <button
            type="button"
            style={{ ...s.iconBtn, ...(viewMode === 'ticket' ? { opacity: 1, borderColor: t.color.primary } : {}) }}
            onClick={() => setViewMode('ticket')}
            title="Ticket view"
            aria-label="Ticket view"
          >
            <IconTicket size={16} />
          </button>
          <button
            type="button"
            style={{ ...s.iconBtn, ...(viewMode === 'graph' ? { opacity: 1, borderColor: t.color.primary } : {}) }}
            onClick={() => setViewMode('graph')}
            title="Link view (graph)"
            aria-label="Link view"
          >
            <IconLink size={16} />
          </button>
          <button
            type="button"
            style={s.iconBtn}
            title={formPanelExpanded ? 'Hide create/edit form' : 'Create new user'}
            aria-label={formPanelExpanded ? 'Hide form' : 'Create new user'}
            onClick={() => {
              if (formPanelExpanded) {
                setFormPanelExpanded(false);
              } else {
                resetForm();
                setFormPanelExpanded(true);
                requestAnimationFrame(() => {
                  formCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                  nameInputRef.current?.focus?.();
                });
              }
            }}
          >
            {formPanelExpanded ? <IconMinus size={16} /> : <IconPlus size={16} />}
          </button>
        </div>
      </div>

      {formPanelExpanded && (
      <div ref={formCardRef} style={userCard.card}>
        <div style={userCard.header}>
          <h2 style={userCard.title}>{editingId ? 'Edit user' : 'Create new user'}</h2>
        </div>
        <div style={userCard.formContainer}>
          <form
            style={userCard.form}
            onSubmit={(e) => {
              e.preventDefault();
              if (editingId) handleUpdate();
              else handleAdd();
            }}
          >
            <div style={userCard.field}>
              <input
                ref={nameInputRef}
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={userCard.input}
                placeholder="Name *"
              />
            </div>
            <div style={userCard.field}>
              <input
                type="text"
                value={form.job_title}
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                style={userCard.input}
                placeholder="Job title *"
              />
            </div>
            <div style={userCard.field}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={userCard.input}
                placeholder="Email *"
                disabled={!!editingId}
              />
            </div>
            <div style={userCard.field}>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={userCard.select}>
                {ROLE_OPTIONS_ACCOUNT.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <MultiCheckboxDropdown
              label=""
              options={organizations.map((o) => ({ value: o.id, label: o.name || o.id }))}
              value={form.organizations}
              onChange={(selected) => setForm((f) => ({ ...f, organizations: selected }))}
              placeholder="Sites"
              styles={{ formRow: userCard.field, label: userCard.label, select: userCard.select }}
              theme={t}
            />
            <MultiCheckboxDropdown
              label=""
              options={groups.map((g) => ({ value: g.id, label: g.name || g.id }))}
              value={form.organization_group_ids}
              onChange={(selected) => setForm((f) => ({ ...f, organization_group_ids: selected }))}
              placeholder="Site Groups"
              styles={{ formRow: userCard.field, label: userCard.label, select: userCard.select }}
              theme={t}
            />

            {editingId && (
              <div style={{ marginTop: 4 }}>
                {formPermissions.map((row, index) => (
                  <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <select
                      value={row.permission_to}
                      onChange={(e) => updatePermissionRow(index, 'permission_to', e.target.value)}
                      style={{ ...userCard.select, width: 130 }}
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
                      style={{ ...userCard.select, width: 180 }}
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
                      style={{ ...userCard.select, width: 110 }}
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
              </div>
            )}

            <div style={userCard.buttonRow}>
              {editingId ? (
                <>
                  <button type="submit" style={userCard.btnPrimary}>Update</button>
                  <button type="button" style={userCard.btnSecondary} onClick={() => { resetForm(); setFormPanelExpanded(false); }}>Cancel</button>
                </>
              ) : (
                <>
                  <button type="submit" style={userCard.btnPrimary}>Add</button>
                  <button type="button" style={userCard.btnSecondary} onClick={() => { resetForm(); setFormPanelExpanded(false); }}>Cancel</button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: viewMode === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
      {records.length === 0 ? (
        <p style={s.empty}>No users. Create an account first (Account Profile), then add users above.</p>
      ) : viewMode === 'graph' ? (
        <div ref={graphContainerRef} style={{ flex: 1, minHeight: 0, background: t.color.surface, borderRadius: 8, overflow: 'auto' }}>
          <svg
            ref={graphSvgRef}
            viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}
            style={{
              display: 'block',
              width: '100%',
              minWidth: graphLayout.width,
              minHeight: graphLayout.height,
              cursor: draggingNodeId ? 'grabbing' : undefined,
            }}
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={t.color.textMuted || t.color.text} />
              </marker>
            </defs>
            {graphData.links.map((link, i) => {
              const src = getEffectivePos(link.source);
              const tgt = getEffectivePos(link.target);
              if (!src || !tgt) return null;
              return (
                <line
                  key={i}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y - 22}
                  stroke={t.color.border}
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
              );
            })}
            {graphData.nodes.map((node) => {
              const pos = getEffectivePos(node.id);
              if (!pos) return null;
              const rec = records.find((r) => String(r.id) === node.id);
              const label = node.name || node.id;
              const roleLabel = node.role || '';
              const roleFill = roleLabel === 'Owner' ? '#fef3c7' : roleLabel === 'Manager' ? '#dbeafe' : roleLabel === 'Viewer' ? '#d1fae5' : '#f3f4f6';
              const roleStroke = roleLabel === 'Owner' ? '#d97706' : roleLabel === 'Manager' ? '#2563eb' : roleLabel === 'Viewer' ? '#059669' : t.color.border;
              const nodeW = 120;
              const nodeH = roleLabel ? 44 : 36;
              return (
                <g
                  key={node.id}
                  style={{ cursor: draggingNodeId ? 'grabbing' : rec ? 'grab' : 'default' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    draggedRef.current = false;
                    setDraggingNodeId(node.id);
                  }}
                  onClick={() => {
                    if (draggedRef.current) return;
                    if (rec) handleEdit(rec);
                    draggedRef.current = false;
                  }}
                >
                  <rect
                    x={pos.x - nodeW / 2}
                    y={pos.y - nodeH / 2}
                    width={nodeW}
                    height={nodeH}
                    rx={6}
                    fill={roleFill}
                    stroke={roleStroke}
                    strokeWidth={1.5}
                  />
                  <text
                    x={pos.x}
                    y={roleLabel ? pos.y - 6 : pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#1f2937"
                    fontSize={13}
                    fontWeight={600}
                    style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'inherit' }}
                  >
                    {label.length > 16 ? label.slice(0, 14) + '…' : label}
                  </text>
                  {roleLabel ? (
                    <text
                      x={pos.x}
                      y={pos.y + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#4b5563"
                      fontSize={10}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {roleLabel}
                    </text>
                  ) : null}
                  <title>{`${node.name}${node.email ? ` (${node.email})` : ''}${node.role ? ` · ${node.role}` : ''}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ ...s.gridWrapper, flex: 1, minHeight: 0 }}>
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
              <div style={{ ...s.actions, minWidth: 0, overflow: 'hidden', justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
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
        <div style={{ ...s.ticketList, flex: 1, minHeight: 0, overflow: 'auto' }}>
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
    </div>
  );
}
