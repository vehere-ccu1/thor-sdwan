import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { IconEdit, IconTrash, IconKey, IconGrid, IconTicket, IconLink } from '../../components/Icons';
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
  const [viewModeGroup, setViewModeGroup] = useState('grid'); // 'grid' | 'ticket' | 'graph'
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
  const NIL_GROUP_ID = '00000000-0000-0000-0000-000000000000';
  const hasNoGroup = (groupId) => !groupId || String(groupId) === NIL_GROUP_ID;
  const getGroupPathLabel = (groupId) => {
    if (hasNoGroup(groupId)) return masterOrgName;
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
    // Path is already root → child → …; don't prepend masterOrgName (would duplicate root name)
    return chain.length === 1 ? chain[0] : chain.join(' - ');
  };
  /** Groups sorted by path so dropdown shows Parent before Child */
  const groupsSortedByPath = [...groups].sort((a, b) =>
    getGroupPathLabel(a.id).localeCompare(getGroupPathLabel(b.id))
  );
  const defaultGroupId = groups.find((g) => (g.name || '').trim() === masterOrgName)?.id
    || groups.find((g) => !g.parent_group_id || String(g.parent_group_id) === '00000000-0000-0000-0000-000000000000')?.id
    || '';

  // --- Group tab graph: tree with Master-Organization as single root (parent → child links)
  const MASTER_ORG_ROOT_ID = '__master_org_root__';
  const graphDataGroup = useMemo(() => {
    const nodes = [
      { id: MASTER_ORG_ROOT_ID, name: 'Master-Organization', nodeType: 'master-org' },
      ...groups.map((g) => ({
        id: String(g.id),
        name: g.name || g.id,
        nodeType: hasNoGroup(g.parent_group_id) ? 'master-org' : 'other-group',
      })),
    ];
    const links = [];
    groups.forEach((g) => {
      const gid = String(g.id);
      if (hasNoGroup(g.parent_group_id)) {
        links.push({ source: MASTER_ORG_ROOT_ID, target: gid });
      } else {
        links.push({ source: String(g.parent_group_id), target: gid });
      }
    });
    return { nodes, links };
  }, [groups]);

  const graphContainerGroupRef = useRef(null);
  const [graphHeightGroup, setGraphHeightGroup] = useState(400);
  useEffect(() => {
    const el = graphContainerGroupRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (typeof h === 'number') setGraphHeightGroup(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, viewModeGroup]);

  const graphLayoutGroup = useMemo(() => {
    const { nodes, links } = graphDataGroup;
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
    const height = Math.max(graphHeightGroup, 400);
    const nodeWidth = 140;
    const nodeHeight = 48;
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
  }, [graphDataGroup, graphHeightGroup]);

  const [nodePositionsGroup, setNodePositionsGroup] = useState({});
  const [draggingNodeIdGroup, setDraggingNodeIdGroup] = useState(null);
  const graphSvgGroupRef = useRef(null);
  useEffect(() => {
    setNodePositionsGroup({ ...graphLayoutGroup.positions });
  }, [graphDataGroup, graphHeightGroup]);
  const getEffectivePosGroup = (id) => nodePositionsGroup[id] ?? graphLayoutGroup.positions[id];
  useEffect(() => {
    if (!draggingNodeIdGroup || !graphSvgGroupRef.current) return;
    const svg = graphSvgGroupRef.current;
    const toSvg = (clientX, clientY) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    const onMove = (e) => {
      const p = toSvg(e.clientX, e.clientY);
      setNodePositionsGroup((prev) => ({ ...prev, [draggingNodeIdGroup]: { x: p.x, y: p.y } }));
    };
    const onUp = () => setDraggingNodeIdGroup(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingNodeIdGroup]);

  // --- Site tab graph: tree with Master-Organization as single root (parent → child links)
  const graphDataSite = useMemo(() => {
    const nodes = [
      { id: MASTER_ORG_ROOT_ID, name: 'Master-Organization', nodeType: 'master-org' },
      ...groups.map((g) => ({
        id: String(g.id),
        name: getGroupPathLabel(g.id),
        nodeType: hasNoGroup(g.parent_group_id) ? 'master-org' : 'other-group',
      })),
      ...records.map((r) => ({
        id: String(r.id),
        name: r.name || r.id,
        nodeType: 'site',
      })),
    ];
    const links = [];
    groups.forEach((g) => {
      const gid = String(g.id);
      if (hasNoGroup(g.parent_group_id)) {
        links.push({ source: MASTER_ORG_ROOT_ID, target: gid });
      } else {
        links.push({ source: String(g.parent_group_id), target: gid });
      }
    });
    records.forEach((r) => {
      if (!hasNoGroup(r.group_id)) {
        links.push({ source: String(r.group_id), target: String(r.id) });
      } else {
        links.push({ source: MASTER_ORG_ROOT_ID, target: String(r.id) });
      }
    });
    return { nodes, links };
  }, [groups, records]);

  const graphContainerSiteRef = useRef(null);
  const [graphHeightSite, setGraphHeightSite] = useState(400);
  useEffect(() => {
    const el = graphContainerSiteRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (typeof h === 'number') setGraphHeightSite(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, viewMode]);

  const graphLayoutSite = useMemo(() => {
    const { nodes, links } = graphDataSite;
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
    const height = Math.max(graphHeightSite, 400);
    const nodeWidth = 140;
    const nodeHeight = 48;
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
  }, [graphDataSite, graphHeightSite]);

  const [nodePositionsSite, setNodePositionsSite] = useState({});
  const [draggingNodeIdSite, setDraggingNodeIdSite] = useState(null);
  const graphSvgSiteRef = useRef(null);
  useEffect(() => {
    setNodePositionsSite({ ...graphLayoutSite.positions });
  }, [graphDataSite, graphHeightSite]);
  const getEffectivePosSite = (id) => nodePositionsSite[id] ?? graphLayoutSite.positions[id];
  useEffect(() => {
    if (!draggingNodeIdSite || !graphSvgSiteRef.current) return;
    const svg = graphSvgSiteRef.current;
    const toSvg = (clientX, clientY) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    const onMove = (e) => {
      const p = toSvg(e.clientX, e.clientY);
      setNodePositionsSite((prev) => ({ ...prev, [draggingNodeIdSite]: { x: p.x, y: p.y } }));
    };
    const onUp = () => setDraggingNodeIdSite(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingNodeIdSite]);

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
  /** Site group label for an organization. Master-Organization has no site group → show "—". */
  const organizationSiteGroupLabel = (r) =>
    hasNoGroup(r.group_id) ? '—' : (getGroupPathLabel(r.group_id) || r.group_name_resolved || r.group_name || '—');

  return (
    <div style={s.page}>
      {/* Tab panel: Create site group | Create new site */}
      <div style={{ ...s.formCard, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
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
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
                  <option value="">— No parent</option>
                  {groupsSortedByPath.map((g) => (
                    <option key={g.id} value={g.id}>
                      {getGroupPathLabel(g.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', gap: 8 }}>
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
                {editingGroupId ? (
                  <button
                    type="button"
                    style={{ ...s.btn, ...s.btnSecondary }}
                    onClick={() => {
                      setGroupForm({ name: '', parent_group_id: defaultGroupId || '' });
                      setEditingGroupId(null);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
            <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'flex-end', gap: 0 }}>
              <button
                type="button"
                style={{ ...s.iconBtn, ...(viewModeGroup === 'grid' ? { opacity: 1, borderColor: t.color.primary } : {}) }}
                onClick={() => setViewModeGroup('grid')}
                title="Grid view"
                aria-label="Grid view"
              >
                <IconGrid size={16} />
              </button>
              <button
                type="button"
                style={{ ...s.iconBtn, ...(viewModeGroup === 'ticket' ? { opacity: 1, borderColor: t.color.primary } : {}) }}
                onClick={() => setViewModeGroup('ticket')}
                title="Ticket view"
                aria-label="Ticket view"
              >
                <IconTicket size={16} />
              </button>
              <button
                type="button"
                style={{ ...s.iconBtn, ...(viewModeGroup === 'graph' ? { opacity: 1, borderColor: t.color.primary } : {}) }}
                onClick={() => setViewModeGroup('graph')}
                title="Link view (Name vs Parent group)"
                aria-label="Link view"
              >
                <IconLink size={16} />
              </button>
            </div>
            {/* Site groups: grid, ticket, or graph */}
            <div style={{ marginTop: 0, flex: 1, minHeight: 0, overflow: viewModeGroup === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
              {groups.length === 0 ? (
                <p style={s.empty}>No site groups. Add one above.</p>
              ) : viewModeGroup === 'graph' ? (
                <div ref={graphContainerGroupRef} style={{ flex: 1, minHeight: 0, background: t.color.surface, borderRadius: 8, overflow: 'auto' }}>
                  <svg
                    ref={graphSvgGroupRef}
                    viewBox={`0 0 ${graphLayoutGroup.width} ${graphLayoutGroup.height}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      minWidth: graphLayoutGroup.width,
                      minHeight: graphLayoutGroup.height,
                      cursor: draggingNodeIdGroup ? 'grabbing' : undefined,
                    }}
                  >
                    <defs>
                      <marker id="arrow-group" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill={t.color.textMuted || t.color.text} />
                      </marker>
                    </defs>
                    {graphDataGroup.links.map((link, i) => {
                      const src = getEffectivePosGroup(link.source);
                      const tgt = getEffectivePosGroup(link.target);
                      if (!src || !tgt) return null;
                      const nodeH = 48;
                      return (
                        <line
                          key={i}
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y - nodeH / 2}
                          stroke={t.color.border}
                          strokeWidth={1.5}
                          markerEnd="url(#arrow-group)"
                        />
                      );
                    })}
                    {graphDataGroup.nodes.map((node) => {
                      const pos = getEffectivePosGroup(node.id);
                      if (!pos) return null;
                      const isMaster = node.nodeType === 'master-org';
                      const fill = isMaster ? '#fef3c7' : '#dbeafe';
                      const stroke = isMaster ? '#d97706' : '#2563eb';
                      const nodeW = 140;
                      const nodeH = 48;
                      return (
                        <g
                          key={node.id}
                          style={{ cursor: draggingNodeIdGroup ? 'grabbing' : 'grab' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDraggingNodeIdGroup(node.id);
                          }}
                        >
                          <rect
                            x={pos.x - nodeW / 2}
                            y={pos.y - nodeH / 2}
                            width={nodeW}
                            height={nodeH}
                            rx={6}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={1.5}
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
                              {node.name || node.id}
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : viewModeGroup === 'ticket' ? (
                <div style={s.ticketList}>
                  {groups.map((g) => (
                    <div key={g.id} style={s.ticketCard}>
                      <div style={s.ticketMain}>
                        <strong>{g.name || '—'}</strong>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>
                          Parent group: {hasNoGroup(g.parent_group_id) ? '—' : getGroupPathLabel(g.parent_group_id)}
                        </span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created by: {userEmail(g.created_by_user_id)}</span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created on: {formatDate(g.created_at)}</span>
                      </div>
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
                        {hasNoGroup(g.parent_group_id) ? '—' : getGroupPathLabel(g.parent_group_id)}
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
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-end', gap: 12, marginBottom: 0 }}>
              <div style={{ ...s.formRow, marginBottom: 0, flex: '1 1 0', minWidth: 0, maxWidth: 200 }}>
                <select
                  value={form.group_id}
                  onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                  style={{ ...s.select, maxWidth: '100%' }}
                  title="Site group"
                >
                  <option value="">— Select site group —</option>
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
              <div style={{ flexShrink: 0, display: 'flex', gap: 8 }}>
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
            <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'flex-end', gap: 0 }}>
              <button
                type="button"
                style={s.iconBtn}
                onClick={() => setViewMode('grid')}
                title="Grid view"
                aria-label="Grid view"
              >
                <IconGrid size={16} />
              </button>
              <button
                type="button"
                style={s.iconBtn}
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
                title="Link view (Site Name vs Site Group)"
                aria-label="Link view"
              >
                <IconLink size={16} />
              </button>
            </div>
            {/* Sites: grid, ticket, or graph */}
            <div style={{ marginTop: 0, flex: 1, minHeight: 0, overflow: viewMode === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
              {viewMode === 'graph' ? (
                graphDataSite.nodes.length === 0 ? (
                  <p style={s.empty}>No site groups or sites. Add one above.</p>
                ) : (
                <div ref={graphContainerSiteRef} style={{ flex: 1, minHeight: 0, background: t.color.surface, borderRadius: 8, overflow: 'auto' }}>
                  <svg
                    ref={graphSvgSiteRef}
                    viewBox={`0 0 ${graphLayoutSite.width} ${graphLayoutSite.height}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      minWidth: graphLayoutSite.width,
                      minHeight: graphLayoutSite.height,
                      cursor: draggingNodeIdSite ? 'grabbing' : undefined,
                    }}
                  >
                    <defs>
                      <marker id="arrow-site" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill={t.color.textMuted || t.color.text} />
                      </marker>
                    </defs>
                    {graphDataSite.links.map((link, i) => {
                      const src = getEffectivePosSite(link.source);
                      const tgt = getEffectivePosSite(link.target);
                      if (!src || !tgt) return null;
                      const nodeH = 48;
                      return (
                        <line
                          key={i}
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y - nodeH / 2}
                          stroke={t.color.border}
                          strokeWidth={1.5}
                          markerEnd="url(#arrow-site)"
                        />
                      );
                    })}
                    {graphDataSite.nodes.map((node) => {
                      const pos = getEffectivePosSite(node.id);
                      if (!pos) return null;
                      const isMaster = node.nodeType === 'master-org';
                      const isGroup = node.nodeType === 'other-group';
                      const isSite = node.nodeType === 'site';
                      const fill = isMaster ? '#fef3c7' : isGroup ? '#dbeafe' : '#d1fae5';
                      const stroke = isMaster ? '#d97706' : isGroup ? '#2563eb' : '#059669';
                      const nodeW = 140;
                      const nodeH = 48;
                      return (
                        <g
                          key={node.id}
                          style={{ cursor: draggingNodeIdSite ? 'grabbing' : 'grab' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDraggingNodeIdSite(node.id);
                          }}
                        >
                          <rect
                            x={pos.x - nodeW / 2}
                            y={pos.y - nodeH / 2}
                            width={nodeW}
                            height={nodeH}
                            rx={6}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={1.5}
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
                              {node.name || node.id}
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                )
              ) : records.length === 0 ? (
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
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{organizationSiteGroupLabel(r)}</span>
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
                          Site group: {organizationSiteGroupLabel(r)}
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
          </div>
        )}
      </div>
    </div>
  );
}
