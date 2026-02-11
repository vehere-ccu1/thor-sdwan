import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getDataPageStyles } from '../styles/dataPageStyles';
import { IconEdit, IconTrash, IconBlocked, IconCheck, IconInfo, IconGrid, IconTicket, IconLink, IconPlus, IconMinus } from '../components/Icons';
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
import { countries } from '../data/countries';

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

function MultiCheckboxDropdown({ label, options, value, onChange, placeholder, styles, theme, disabled }) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
  const summary = selectedLabels.length ? selectedLabels.join(', ') : placeholder;

  const toggleOption = (val) => {
    if (disabled) return;
    const exists = value.includes(val);
    const next = exists ? value.filter((v) => v !== val) : [...value, val];
    onChange(next);
  };

  return (
    <div style={{ ...styles.formRow, position: 'relative' }}>
      {!!label && <label style={styles.label}>{label}</label>}
      <button
        type="button"
        disabled={disabled}
        style={{
          ...styles.select,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.75 : 1,
        }}
        onClick={() => !disabled && setOpen((v) => !v)}
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

function RightSlidePanel({ theme: t, onClose, title, headerStyle, titleStyle, children }) {
  const [slideOpen, setSlideOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSlideOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const panelWidth = 420;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          opacity: slideOpen ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
        aria-label="Close"
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: panelWidth,
          maxWidth: '90vw',
          background: t.color.surface,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
          transform: slideOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={titleStyle}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 4,
              fontSize: 20,
              lineHeight: 1,
              opacity: 0.9,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function nextId() {
  return String(Date.now());
}

export default function Users() {
  const navigate = useNavigate();
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
    country: '',
    notifications: false,
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
      country: '',
      notifications: false,
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
      country: rec.country || '',
      notifications: !!rec.notifications,
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
    if (!editingId || !form.name.trim()) return;
    const isOwner = records.find((r) => r.id === editingId)?.is_owner === true;
    if (isOwner) {
      const res = await updateUser(editingId, {
        name: form.name.trim(),
        job_title: (form.job_title || '').trim(),
        country: form.country || null,
        notifications: !!form.notifications,
      });
      if (res && currentAccountId) {
        fetchUsers(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      } else if (!res) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === editingId
              ? { ...r, name: form.name.trim(), job_title: form.job_title?.trim() ?? r.job_title, country: form.country || r.country, notifications: !!form.notifications }
              : r
          )
        );
      }
      resetForm();
      return;
    }
    if (!form.email.trim()) return;
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

  const { levelMap, childrenMap, parentMap } = useMemo(() => {
    const { nodes, links } = graphData;
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
    const children = new Map();
    const parent = new Map();
    links.forEach((l) => {
      if (!children.has(l.source)) children.set(l.source, []);
      children.get(l.source).push(l.target);
      parent.set(l.target, l.source);
    });
    return { levelMap: level, childrenMap: children, parentMap: parent };
  }, [graphData]);

  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [collapsedNodes, setCollapsedNodes] = useState(() => new Set());
  const isExpanded = (id) => {
    const level = levelMap.get(id) ?? 0;
    if (collapsedNodes.has(id)) return false;
    if (level <= 1) return true;
    return expandedNodes.has(id);
  };
  const visibleIds = useMemo(() => {
    const visible = new Set();
    const parentExpanded = (pid) => {
      const l = levelMap.get(pid) ?? 0;
      if (collapsedNodes.has(pid)) return false;
      return l <= 1 || expandedNodes.has(pid);
    };
    const isVisible = (id) => {
      if (visible.has(id)) return true;
      const p = parentMap.get(id);
      if (!p) {
        visible.add(id);
        return true;
      }
      if (!parentExpanded(p)) return false;
      if (!isVisible(p)) return false;
      visible.add(id);
      return true;
    };
    graphData.nodes.forEach((n) => isVisible(n.id));
    return visible;
  }, [graphData, levelMap, parentMap, expandedNodes, collapsedNodes]);

  // Tree layout for graph view: position nodes by "created by" hierarchy (roots top, children below)
  const graphLayout = useMemo(() => {
    const { nodes } = graphData;
    const byLevel = new Map();
    nodes.forEach((n) => {
      if (!visibleIds.has(n.id)) return;
      const L = levelMap.get(n.id) ?? 0;
      if (!byLevel.has(L)) byLevel.set(L, []);
      byLevel.get(L).push(n.id);
    });
    const width = 800;
    const height = Math.max(graphHeight, 400);
    const nodeWidth = 170;
    const nodeHeight = 56;
    const padding = 40;
    const positions = {};
    byLevel.forEach((ids, L) => {
      const y = padding + L * (nodeHeight + 40);
      const totalW = ids.length * (nodeWidth + 24) - 24;
      const startX = (width - totalW) / 2 + nodeWidth / 2 + 12;
      ids.forEach((id, i) => {
        positions[id] = { x: startX + i * (nodeWidth + 24), y };
      });
    });
    return { positions, width, height };
  }, [graphData, visibleIds, levelMap, graphHeight]);

  // Search: substring match across columns, highlight, Prev/Next, scroll into view
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchScrollRefs = useRef({});

  const [nodePositions, setNodePositions] = useState({});
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const graphSvgRef = useRef(null);
  const draggedRef = useRef(false);
  useEffect(() => {
    setNodePositions({ ...graphLayout.positions });
  }, [graphLayout]);
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
    checkboxRow: { display: 'flex', alignItems: 'center', gap: 8 },
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
  const editingRecord = editingId ? records.find((r) => r.id === editingId) : null;
  const isEditingMasterOwner = editingRecord?.is_owner === true;
  const searchWord = searchQuery.trim().toLowerCase();
  const matchIdsGrid = useMemo(() => {
    if (!searchWord) return [];
    return records.filter((r) => {
      const text = [
        r.name,
        r.job_title,
        r.email,
        accountName(r.account_id),
        r.is_owner ? 'Owner' : (r.role_name || 'Manager'),
        userLabel(r.master_owner_user_id),
        userLabel(r.created_by_user_id),
        Array.isArray(r.organizations) ? r.organizations.map(orgLabel).join(' ') : '',
        Array.isArray(r.organization_group_ids) ? r.organization_group_ids.map(groupLabel).join(' ') : '',
        formatDate(r.created_at),
      ].join(' ').toLowerCase();
      return text.includes(searchWord);
    }).map((r) => String(r.id));
  }, [records, searchWord, accounts, organizations, groups]);
  const matchIdsGraph = useMemo(() => {
    if (!searchWord) return [];
    return graphData.nodes.filter((n) => {
      const text = [(n.name || ''), (n.email || ''), (n.role || '')].join(' ').toLowerCase();
      return text.includes(searchWord);
    }).map((n) => n.id);
  }, [graphData.nodes, searchWord]);
  const matchIds = viewMode === 'graph' ? matchIdsGraph : matchIdsGrid;
  const matchCount = matchIds.length;
  const currentMatchId = matchCount > 0 ? matchIds[currentMatchIndex % matchCount] : null;
  useEffect(() => { setCurrentMatchIndex(0); }, [searchQuery]);
  useEffect(() => {
    if (matchCount === 0 || currentMatchId == null) return;
    const el = searchScrollRefs.current[currentMatchId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentMatchIndex, currentMatchId, matchCount]);
  const currentUserId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_user_id') : null;
  const expandIconStroke = '#166534';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ ...s.toolbar, flexWrap: 'wrap', gap: 12, marginLeft: 'auto', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...s.input, width: 140 }}
            />
            {searchWord && (
              <>
                <span style={{ fontSize: t.fontSize.sm, color: t.color.textMuted, whiteSpace: 'nowrap' }}>
                  {matchCount > 0 ? `${(currentMatchIndex % matchCount) + 1} of ${matchCount}` : '0 matches'}
                </span>
                <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '4px 10px' }} onClick={() => setCurrentMatchIndex((i) => (i - 1 + matchCount) % matchCount)} disabled={matchCount === 0}>
                  Prev
                </button>
                <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '4px 10px' }} onClick={() => setCurrentMatchIndex((i) => (i + 1) % matchCount)} disabled={matchCount === 0}>
                  Next
                </button>
              </>
            )}
          </div>
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
            title={formPanelExpanded ? 'Close panel' : 'Create User'}
            aria-label={formPanelExpanded ? 'Close panel' : 'Create User'}
            onClick={() => {
              if (formPanelExpanded) {
                setFormPanelExpanded(false);
              } else {
                resetForm();
                setFormPanelExpanded(true);
                requestAnimationFrame(() => { nameInputRef.current?.focus?.(); });
              }
            }}
          >
            {formPanelExpanded ? <IconMinus size={16} /> : <IconPlus size={16} />}
          </button>
        </div>
      </div>

      {formPanelExpanded && (
      <RightSlidePanel
        theme={t}
        onClose={() => setFormPanelExpanded(false)}
        title={editingId ? 'Edit User' : 'Create User'}
        headerStyle={userCard.header}
        titleStyle={userCard.title}
      >
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
            {isEditingMasterOwner && (
              <>
                <div style={userCard.field}>
                  <label style={userCard.label}>Country</label>
                  <select
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    style={userCard.select}
                  >
                    <option value="">— Select country —</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...userCard.field, ...userCard.checkboxRow }}>
                  <input
                    type="checkbox"
                    id="user-notifications"
                    checked={form.notifications}
                    onChange={(e) => setForm((f) => ({ ...f, notifications: e.target.checked }))}
                    style={{ margin: 0 }}
                  />
                  <label htmlFor="user-notifications" style={{ ...userCard.label, marginBottom: 0 }}>Notifications</label>
                </div>
                <p style={{ margin: 0, fontSize: t.fontSize.sm, color: t.color.textMuted }}>
                  Only Name, Job Title, Country and Notifications can be changed for the Master-Owner.
                </p>
              </>
            )}
            <div style={userCard.field}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={userCard.input}
                placeholder="Email *"
                disabled={!!editingId}
                readOnly={!!editingId}
              />
            </div>
            <div style={userCard.field}>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                style={userCard.select}
                disabled={!!editingId && isEditingMasterOwner}
              >
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
              disabled={!!editingId && isEditingMasterOwner}
            />
            <MultiCheckboxDropdown
              label=""
              options={groups.map((g) => ({ value: g.id, label: g.name || g.id }))}
              value={form.organization_group_ids}
              onChange={(selected) => setForm((f) => ({ ...f, organization_group_ids: selected }))}
              placeholder="Site Groups"
              styles={{ formRow: userCard.field, label: userCard.label, select: userCard.select }}
              theme={t}
              disabled={!!editingId && isEditingMasterOwner}
            />

            {editingId && (
              <div style={{ marginTop: 4 }}>
                {formPermissions.map((row, index) => (
                  <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <select
                      value={row.permission_to}
                      onChange={(e) => updatePermissionRow(index, 'permission_to', e.target.value)}
                      style={{ ...userCard.select, width: 130 }}
                      disabled={isEditingMasterOwner}
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
                      disabled={isEditingMasterOwner}
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
                      disabled={isEditingMasterOwner}
                    >
                      {roleOptions(row.permission_to).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button type="button" style={{ ...s.btn, ...s.btnDanger, padding: '6px 10px' }} onClick={() => removePermissionRow(index)} disabled={isEditingMasterOwner}>
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
      </RightSlidePanel>
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
            {graphData.links
              .filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target))
              .map((link, i) => {
                const src = getEffectivePos(link.source);
                const tgt = getEffectivePos(link.target);
                if (!src || !tgt) return null;
                const nodeH = 56;
                return (
                  <line
                    key={i}
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y - nodeH / 2}
                    stroke={t.color.border}
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            {graphData.nodes
              .filter((node) => visibleIds.has(node.id))
              .map((node) => {
                const pos = getEffectivePos(node.id);
                if (!pos) return null;
                const rec = records.find((r) => String(r.id) === node.id);
                const roleLabel = node.role || '';
                const roleFill = roleLabel === 'Owner' ? '#fef3c7' : roleLabel === 'Manager' ? '#dbeafe' : roleLabel === 'Viewer' ? '#d1fae5' : '#f3f4f6';
                const roleStroke = roleLabel === 'Owner' ? '#d97706' : roleLabel === 'Manager' ? '#2563eb' : roleLabel === 'Viewer' ? '#059669' : t.color.border;
                const nodeW = 170;
                const nodeH = 56;
                const hasChildren = (childrenMap.get(node.id)?.length ?? 0) > 0;
                const expanded = isExpanded(node.id);
                const btnSize = 18;
                const numActionBtns = rec ? (currentUserId === rec.id ? 2 : (rec.is_owner ? 3 : 4)) : 0;
                const actionsW = numActionBtns * btnSize;
                return (
                  <g
                    key={node.id}
                    ref={(el) => { if (el) searchScrollRefs.current[node.id] = el; }}
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
                    {currentMatchId === node.id && (
                      <rect
                        x={pos.x - nodeW / 2 - 4}
                        y={pos.y - nodeH / 2 - 4}
                        width={nodeW + 8}
                        height={nodeH + 8}
                        rx={10}
                        fill="none"
                        stroke="#b45309"
                        strokeWidth={5}
                      />
                    )}
                    <rect
                      x={pos.x - nodeW / 2}
                      y={pos.y - nodeH / 2}
                      width={nodeW}
                      height={nodeH}
                      rx={6}
                      fill={roleFill}
                      stroke={currentMatchId === node.id ? '#b45309' : roleStroke}
                      strokeWidth={currentMatchId === node.id ? 3 : 1.5}
                    />
                    <foreignObject
                      x={pos.x - nodeW / 2}
                      y={pos.y - nodeH / 2}
                      width={nodeW}
                      height={nodeH}
                      style={{ overflow: 'hidden', pointerEvents: 'none' }}
                    >
                      <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 8px',
                          wordBreak: 'break-word',
                          overflow: 'hidden',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#1f2937',
                          textAlign: 'center',
                          lineHeight: 1.25,
                          boxSizing: 'border-box',
                        }}
                      >
                        <span>{node.name || node.id}</span>
                        {roleLabel ? <span style={{ fontSize: 10, color: '#4b5563', fontWeight: 400 }}>{roleLabel}</span> : null}
                      </div>
                    </foreignObject>
                    {rec && (
                      <foreignObject
                        x={pos.x - nodeW / 2}
                        y={pos.y - nodeH / 2}
                        width={actionsW}
                        height={btnSize}
                        style={{ overflow: 'visible', pointerEvents: 'all' }}
                      >
                        <div
                          xmlns="http://www.w3.org/1999/xhtml"
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 2,
                            width: '100%',
                            height: '100%',
                            background: 'transparent',
                          }}
                        >
                          {currentUserId !== rec.id && (
                            <button
                              type="button"
                              title={rec.enabled ? 'Disable user' : 'Enable user'}
                              style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                              onClick={(e) => { e.stopPropagation(); handleToggleEnable(rec); }}
                            >
                              {rec.enabled ? <IconBlocked size={12} /> : <IconCheck size={12} />}
                            </button>
                          )}
                          <button
                            type="button"
                            title="Send reset password email"
                            style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                            onClick={(e) => { e.stopPropagation(); handleResetPassword(rec); }}
                          >
                            <IconInfo size={12} />
                          </button>
                          <button
                            type="button"
                            title="Edit User"
                            style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                            onClick={(e) => { e.stopPropagation(); handleEdit(rec); }}
                          >
                            <IconEdit size={12} />
                          </button>
                          {!rec.is_owner && (
                            <button
                              type="button"
                              title="Delete user"
                              style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                              onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }}
                            >
                              <IconTrash size={12} />
                            </button>
                          )}
                        </div>
                      </foreignObject>
                    )}
                    {hasChildren && (
                      <g
                        style={{ cursor: 'pointer', pointerEvents: 'all' }}
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const level = levelMap.get(node.id) ?? 0;
                          if (level <= 1) {
                            setCollapsedNodes((prev) => {
                              const next = new Set(prev);
                              if (next.has(node.id)) next.delete(node.id);
                              else next.add(node.id);
                              return next;
                            });
                          } else {
                            setExpandedNodes((prev) => {
                              const next = new Set(prev);
                              if (next.has(node.id)) next.delete(node.id);
                              else next.add(node.id);
                              return next;
                            });
                          }
                        }}
                        transform={`translate(${pos.x + nodeW / 2 - 9}, ${pos.y - nodeH / 2 + 9})`}
                      >
                        <circle r={7} fill="transparent" stroke={t.color.border} strokeWidth={1.2} />
                        {expanded ? (
                          <path d="M -3 0 L 3 0" stroke={expandIconStroke} strokeWidth={1.5} strokeLinecap="round" />
                        ) : (
                          <path d="M -3 0 L 3 0 M 0 -3 L 0 3" stroke={expandIconStroke} strokeWidth={1.5} strokeLinecap="round" />
                        )}
                      </g>
                    )}
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
            <div key={r.id} ref={(el) => { if (el) searchScrollRefs.current[String(r.id)] = el; }} style={{ ...s.grid(gridCols), ...(currentMatchId === String(r.id) ? { backgroundColor: '#fef3c7', borderLeft: '4px solid #b45309', outline: '2px solid #d97706', outlineOffset: '-2px', color: '#000' } : {}) }}>
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
                <button type="button" style={s.iconBtn} onClick={() => handleEdit(r)} title="Edit User">
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
            <div key={r.id} ref={(el) => { if (el) searchScrollRefs.current[String(r.id)] = el; }} style={{ ...s.ticketCard, ...(currentMatchId === String(r.id) ? { backgroundColor: '#fef3c7', borderLeft: '6px solid #b45309', boxShadow: '0 0 0 2px #d97706', color: '#000' } : {}) }}>
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
                <button type="button" style={s.iconBtn} onClick={() => handleEdit(r)} title="Edit User">
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
