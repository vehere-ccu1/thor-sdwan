import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { IconEdit, IconTrash, IconKey, IconGrid, IconTicket, IconLink, IconPlus, IconMinus } from '../../components/Icons';
import {
  fetchGroups,
  fetchSites,
  fetchUsers,
  createGroup,
  updateGroup,
  deleteGroup,
  createSite,
  updateSite,
  deleteSite,
} from '../../api/client';

function nextId() {
  return String(Date.now());
}

function RightSlidePanel({ theme: t, onClose, title, headerStyle, titleStyle, children }) {
  const [slideOpen, setSlideOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSlideOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const panelWidth = 420;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'auto' }}>
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
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4, fontSize: 20, lineHeight: 1, opacity: 0.9 }}>×</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

export default function SiteManagement() {
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
    is_default: false,
  });
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [bulkAddGroupId, setBulkAddGroupId] = useState('');
  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkAddBusy, setBulkAddBusy] = useState(false);
  const [bulkAddResult, setBulkAddResult] = useState({ created: 0, failed: 0, errors: [] });
  const [graphZoomGroup, setGraphZoomGroup] = useState(1);
  const [graphZoomSite, setGraphZoomSite] = useState(1);
  const [sortKeyGroup, setSortKeyGroup] = useState('name');
  const [sortDirGroup, setSortDirGroup] = useState('asc');
  const [sortKeySite, setSortKeySite] = useState('name');
  const [sortDirSite, setSortDirSite] = useState('asc');
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
  const [selectedSiteIds, setSelectedSiteIds] = useState(new Set());
  const [panningGroup, setPanningGroup] = useState(false);
  const [panningSite, setPanningSite] = useState(false);
  const panStartGroupRef = useRef(null);
  const panStartSiteRef = useRef(null);
  const hasCenteredGroupRef = useRef(false);
  const hasCenteredSiteRef = useRef(false);

  const resetForm = () => {
    setForm({
      account_id: currentAccountId || '',
      group_id: '',
      name: '',
      group_name: '',
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
      fetchSites(currentAccountId).then((list) => {
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
    const res = await createSite({
      account_id: accountId,
      group_id: groupId,
      name,
      group_name: form.group_name.trim(),
      is_default: form.is_default,
    });
    if (res) {
      if (currentAccountId) fetchSites(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
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
      is_default: !!rec.is_default,
    });
    setActiveTab('site');
    setAddPanelOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    const res = await updateSite(editingId, {
      name: form.name.trim(),
      group_id: form.group_id || null,
      group_name: form.group_name,
      is_default: form.is_default,
    });
    if (res) {
      if (currentAccountId) fetchSites(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: form.name.trim(),
                group_name: form.group_name.trim(),
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
    const res = await deleteSite(id);
    if (res && res.deleted) {
      setRecords((prev) => prev.filter((r) => String(r.id) !== String(id)));
    }
  };

  const handleBulkAdd = async () => {
    const groupId = bulkAddGroupId || defaultGroupId;
    if (!groupId || !currentAccountId) return;
    const raw = (bulkAddText || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (raw.length === 0) return;
    setBulkAddBusy(true);
    setBulkAddResult({ created: 0, failed: 0, errors: [] });
    let created = 0;
    const errors = [];
    const isGroup = activeTab === 'group';
    for (const name of raw) {
      try {
        if (isGroup) {
          const res = await createGroup({
            account_id: currentAccountId,
            name,
            parent_group_id: groupId,
          });
          if (res) created += 1;
          else errors.push(name);
        } else {
          const res = await createSite({
            account_id: currentAccountId,
            group_id: groupId,
            name,
            group_name: '',
            is_default: false,
          });
          if (res) created += 1;
          else errors.push(name);
        }
      } catch (_) {
        errors.push(name);
      }
    }
    setBulkAddResult({ created, failed: errors.length, errors });
    setBulkAddBusy(false);
    if (currentAccountId) {
      fetchGroups(currentAccountId).then((list) => setGroups(Array.isArray(list) ? list : []));
      fetchSites(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
    }
  };

  const handleEditGroup = (g) => {
    setEditingGroupId(g.id);
    setGroupForm({
      name: g.name || '',
      parent_group_id: g.parent_group_id != null ? String(g.parent_group_id) : '',
    });
    setAddPanelOpen(true);
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Delete this site group?')) return;
    const res = await deleteGroup(id);
    if (res && res.deleted) {
      setGroups((prev) => prev.filter((gr) => String(gr.id) !== String(id)));
    }
  };

  // Site groups grid: checkbox, Name, Parent group, Created by, Created on, Action
  const gridColsGroups = '32px minmax(0,1.5fr) minmax(0,1.5fr) minmax(100px,1fr) minmax(120px,1fr) 120px';
  // Sites grid: checkbox, Site Name, Site Group, Master Owner, Created by, Created on, Action
  const gridCols = '32px minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(100px,1fr) minmax(120px,1fr) 120px';
  const { theme: t } = useTheme();
  const expandIconStroke = '#166534';
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

  const { levelMapGroup, childrenMapGroup, parentMapGroup } = useMemo(() => {
    const { nodes, links } = graphDataGroup;
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
    return { levelMapGroup: level, childrenMapGroup: children, parentMapGroup: parent };
  }, [graphDataGroup]);

  const [expandedNodesGroup, setExpandedNodesGroup] = useState(() => new Set());
  const [collapsedNodesGroup, setCollapsedNodesGroup] = useState(() => new Set());

  const isExpandedGroup = (id) => {
    const level = levelMapGroup.get(id) ?? 0;
    if (collapsedNodesGroup.has(id)) return false;
    if (level <= 1) return true;
    return expandedNodesGroup.has(id);
  };

  const visibleIdsGroup = useMemo(() => {
    const visible = new Set();
    const parentExpanded = (pid) => {
      const l = levelMapGroup.get(pid) ?? 0;
      if (collapsedNodesGroup.has(pid)) return false;
      return l <= 1 || expandedNodesGroup.has(pid);
    };
    const isVisible = (id) => {
      if (visible.has(id)) return true;
      const p = parentMapGroup.get(id);
      if (!p) {
        visible.add(id);
        return true;
      }
      if (!parentExpanded(p)) return false;
      if (!isVisible(p)) return false;
      visible.add(id);
      return true;
    };
    graphDataGroup.nodes.forEach((n) => isVisible(n.id));
    return visible;
  }, [graphDataGroup, levelMapGroup, parentMapGroup, expandedNodesGroup, collapsedNodesGroup]);

  const graphContainerGroupRef = useRef(null);
  const [graphSizeGroup, setGraphSizeGroup] = useState({ width: 800, height: 400 });
  useEffect(() => {
    const el = graphContainerGroupRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && typeof rect.width === 'number' && typeof rect.height === 'number') {
        setGraphSizeGroup({ width: Math.max(rect.width, 400), height: Math.max(rect.height, 300) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, viewModeGroup]);
  useEffect(() => {
    const el = graphContainerGroupRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const delta = -e.deltaY * 0.002;
      e.preventDefault();
      setGraphZoomGroup((z) => {
        const next = z + delta;
        if ((next < 0.5 && delta < 0) || (next > 2 && delta > 0)) return z;
        return Math.min(2, Math.max(0.5, next));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [activeTab, viewModeGroup]);
  const startPanGroup = useCallback((e) => {
    if (e.target.closest('g') || e.target.closest('button')) return;
    const el = graphContainerGroupRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    panStartGroupRef.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    setPanningGroup(true);
    const onMove = (ev) => {
      if (!panStartGroupRef.current) return;
      const container = graphContainerGroupRef.current;
      if (!container) return;
      container.scrollLeft = panStartGroupRef.current.scrollLeft + (panStartGroupRef.current.x - ev.clientX);
      container.scrollTop = panStartGroupRef.current.scrollTop + (panStartGroupRef.current.y - ev.clientY);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setPanningGroup(false);
      panStartGroupRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const graphLayoutGroup = useMemo(() => {
    const { nodes, links } = graphDataGroup;
    const byLevel = new Map();
    nodes.forEach((n) => {
      if (!visibleIdsGroup.has(n.id)) return;
      const L = levelMapGroup.get(n.id) ?? 0;
      if (!byLevel.has(L)) byLevel.set(L, []);
      byLevel.get(L).push(n.id);
    });
    const nodeWidth = 170;
    const nodeHeight = 56;
    const padding = 40;
    const gap = 24;
    const levelCount = byLevel.size;
    const maxLevelWidth = levelCount === 0 ? 0 : Math.max(...Array.from(byLevel.values()).map((ids) => ids.length * (nodeWidth + gap) - gap));
    const contentMinWidth = maxLevelWidth + 2 * padding;
    const contentMinHeight = levelCount * (nodeHeight + 40) + 2 * padding;
    const width = Math.max(graphSizeGroup.width, contentMinWidth, 400);
    const height = Math.max(graphSizeGroup.height, contentMinHeight, 300);
    const positions = {};
    byLevel.forEach((ids, L) => {
      const y = padding + L * (nodeHeight + 40);
      const totalW = ids.length * (nodeWidth + gap) - gap;
      const startX = (width - totalW) / 2 + nodeWidth / 2 + gap / 2;
      ids.forEach((id, i) => {
        positions[id] = { x: startX + i * (nodeWidth + gap), y };
      });
    });
    return { positions, width, height };
  }, [graphDataGroup, visibleIdsGroup, levelMapGroup, graphSizeGroup]);

  const [nodePositionsGroup, setNodePositionsGroup] = useState({});
  const [draggingNodeIdGroup, setDraggingNodeIdGroup] = useState(null);
  const graphSvgGroupRef = useRef(null);
  const draggedRefGroup = useRef(false);
  useEffect(() => {
    setNodePositionsGroup({ ...graphLayoutGroup.positions });
  }, [graphDataGroup, graphSizeGroup]);
  const getEffectivePosGroup = (id) => nodePositionsGroup[id] ?? graphLayoutGroup.positions[id];
  useEffect(() => {
    if (viewModeGroup !== 'graph') {
      hasCenteredGroupRef.current = false;
      return;
    }
    const el = graphContainerGroupRef.current;
    if (!el || hasCenteredGroupRef.current) return;
    const id = requestAnimationFrame(() => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const contentW = graphLayoutGroup.width * graphZoomGroup;
      const contentH = graphLayoutGroup.height * graphZoomGroup;
      if (contentW > cw) el.scrollLeft = (contentW - cw) / 2;
      if (contentH > ch) el.scrollTop = (contentH - ch) / 2;
      hasCenteredGroupRef.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [viewModeGroup, graphLayoutGroup.width, graphLayoutGroup.height, graphZoomGroup]);
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
      draggedRefGroup.current = true;
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

  const { levelMapSite, childrenMapSite, parentMapSite } = useMemo(() => {
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
    const children = new Map();
    const parent = new Map();
    links.forEach((l) => {
      if (!children.has(l.source)) children.set(l.source, []);
      children.get(l.source).push(l.target);
      parent.set(l.target, l.source);
    });
    return { levelMapSite: level, childrenMapSite: children, parentMapSite: parent };
  }, [graphDataSite]);

  const [expandedNodesSite, setExpandedNodesSite] = useState(() => new Set());
  const [collapsedNodesSite, setCollapsedNodesSite] = useState(() => new Set());

  const isExpandedSite = (id) => {
    const level = levelMapSite.get(id) ?? 0;
    if (collapsedNodesSite.has(id)) return false;
    if (level <= 1) return true;
    return expandedNodesSite.has(id);
  };

  const visibleIdsSite = useMemo(() => {
    const visible = new Set();
    const parentExpanded = (pid) => {
      const l = levelMapSite.get(pid) ?? 0;
      if (collapsedNodesSite.has(pid)) return false;
      return l <= 1 || expandedNodesSite.has(pid);
    };
    const isVisible = (id) => {
      if (visible.has(id)) return true;
      const p = parentMapSite.get(id);
      if (!p) {
        visible.add(id);
        return true;
      }
      if (!parentExpanded(p)) return false;
      if (!isVisible(p)) return false;
      visible.add(id);
      return true;
    };
    graphDataSite.nodes.forEach((n) => isVisible(n.id));
    return visible;
  }, [graphDataSite, levelMapSite, parentMapSite, expandedNodesSite, collapsedNodesSite]);

  const graphContainerSiteRef = useRef(null);
  const [graphSizeSite, setGraphSizeSite] = useState({ width: 800, height: 400 });
  useEffect(() => {
    const el = graphContainerSiteRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && typeof rect.width === 'number' && typeof rect.height === 'number') {
        setGraphSizeSite({ width: Math.max(rect.width, 400), height: Math.max(rect.height, 300) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, viewMode]);
  useEffect(() => {
    const el = graphContainerSiteRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const delta = -e.deltaY * 0.002;
      e.preventDefault();
      setGraphZoomSite((z) => {
        const next = z + delta;
        if ((next < 0.5 && delta < 0) || (next > 2 && delta > 0)) return z;
        return Math.min(2, Math.max(0.5, next));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [activeTab, viewMode]);
  const startPanSite = useCallback((e) => {
    if (e.target.closest('g') || e.target.closest('button')) return;
    const el = graphContainerSiteRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    panStartSiteRef.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    setPanningSite(true);
    const onMove = (ev) => {
      if (!panStartSiteRef.current) return;
      const container = graphContainerSiteRef.current;
      if (!container) return;
      container.scrollLeft = panStartSiteRef.current.scrollLeft + (panStartSiteRef.current.x - ev.clientX);
      container.scrollTop = panStartSiteRef.current.scrollTop + (panStartSiteRef.current.y - ev.clientY);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setPanningSite(false);
      panStartSiteRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const graphLayoutSite = useMemo(() => {
    const { nodes } = graphDataSite;
    const byLevel = new Map();
    nodes.forEach((n) => {
      if (!visibleIdsSite.has(n.id)) return;
      const L = levelMapSite.get(n.id) ?? 0;
      if (!byLevel.has(L)) byLevel.set(L, []);
      byLevel.get(L).push(n.id);
    });
    const nodeWidth = 170;
    const nodeHeight = 56;
    const padding = 40;
    const gap = 24;
    const levelCount = byLevel.size;
    const maxLevelWidth = levelCount === 0 ? 0 : Math.max(...Array.from(byLevel.values()).map((ids) => ids.length * (nodeWidth + gap) - gap));
    const contentMinWidth = maxLevelWidth + 2 * padding;
    const contentMinHeight = levelCount * (nodeHeight + 40) + 2 * padding;
    const width = Math.max(graphSizeSite.width, contentMinWidth, 400);
    const height = Math.max(graphSizeSite.height, contentMinHeight, 300);
    const positions = {};
    byLevel.forEach((ids, L) => {
      const y = padding + L * (nodeHeight + 40);
      const totalW = ids.length * (nodeWidth + gap) - gap;
      const startX = (width - totalW) / 2 + nodeWidth / 2 + gap / 2;
      ids.forEach((id, i) => {
        positions[id] = { x: startX + i * (nodeWidth + gap), y };
      });
    });
    return { positions, width, height };
  }, [graphDataSite, visibleIdsSite, levelMapSite, graphSizeSite]);

  const [nodePositionsSite, setNodePositionsSite] = useState({});
  const [draggingNodeIdSite, setDraggingNodeIdSite] = useState(null);
  const graphSvgSiteRef = useRef(null);
  const draggedRefSite = useRef(false);
  useEffect(() => {
    setNodePositionsSite({ ...graphLayoutSite.positions });
  }, [graphDataSite, graphSizeSite]);
  const getEffectivePosSite = (id) => nodePositionsSite[id] ?? graphLayoutSite.positions[id];
  useEffect(() => {
    if (viewMode !== 'graph') {
      hasCenteredSiteRef.current = false;
      return;
    }
    const el = graphContainerSiteRef.current;
    if (!el || hasCenteredSiteRef.current) return;
    const id = requestAnimationFrame(() => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const contentW = graphLayoutSite.width * graphZoomSite;
      const contentH = graphLayoutSite.height * graphZoomSite;
      if (contentW > cw) el.scrollLeft = (contentW - cw) / 2;
      if (contentH > ch) el.scrollTop = (contentH - ch) / 2;
      hasCenteredSiteRef.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [viewMode, graphLayoutSite.width, graphLayoutSite.height, graphZoomSite]);
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
      draggedRefSite.current = true;
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

  const sortedGroups = useMemo(() => {
    const dir = sortDirGroup === 'asc' ? 1 : -1;
    return [...groups].sort((a, b) => {
      let va, vb;
      if (sortKeyGroup === 'name') { va = (a.name || ''); vb = (b.name || ''); }
      else if (sortKeyGroup === 'parent') { va = getGroupPathLabel(a.parent_group_id); vb = getGroupPathLabel(b.parent_group_id); }
      else if (sortKeyGroup === 'created_by') { va = userEmail(a.created_by_user_id); vb = userEmail(b.created_by_user_id); }
      else { va = a.created_at || ''; vb = b.created_at || ''; }
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [groups, sortKeyGroup, sortDirGroup]);

  const sortedRecords = useMemo(() => {
    const dir = sortDirSite === 'asc' ? 1 : -1;
    return [...records].sort((a, b) => {
      let va, vb;
      if (sortKeySite === 'name') { va = (a.name || ''); vb = (b.name || ''); }
      else if (sortKeySite === 'group') { va = organizationSiteGroupLabel(a); vb = organizationSiteGroupLabel(b); }
      else if (sortKeySite === 'master_owner') { va = masterOwnerDisplay(a); vb = masterOwnerDisplay(b); }
      else if (sortKeySite === 'created_by') { va = userEmail(a.created_by_user_id); vb = userEmail(b.created_by_user_id); }
      else { va = a.created_at || ''; vb = b.created_at || ''; }
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [records, sortKeySite, sortDirSite]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchScrollRefs = useRef({});

  const searchWord = searchQuery.trim().toLowerCase();
  const matchIdsGroup = useMemo(() => {
    if (!searchWord) return [];
    const ids = [];
    if ('master-organization'.includes(searchWord) || 'master'.includes(searchWord)) ids.push(MASTER_ORG_ROOT_ID);
    groups.forEach((g) => {
      const text = [
        g.name,
        hasNoGroup(g.parent_group_id) ? '' : getGroupPathLabel(g.parent_group_id),
        userEmail(g.created_by_user_id),
        formatDate(g.created_at),
      ].join(' ').toLowerCase();
      if (text.includes(searchWord)) ids.push(String(g.id));
    });
    return ids;
  }, [groups, searchWord]);

  const matchIdsSiteGrid = useMemo(() => {
    if (!searchWord) return [];
    return records.filter((r) => {
      const text = [
        r.name,
        organizationSiteGroupLabel(r),
        masterOwnerDisplay(r),
        userEmail(r.created_by_user_id),
        formatDate(r.created_at),
      ].join(' ').toLowerCase();
      return text.includes(searchWord);
    }).map((r) => String(r.id));
  }, [records, searchWord]);

  const matchIdsSiteGraph = useMemo(() => {
    if (!searchWord) return [];
    return graphDataSite.nodes.filter((n) =>
      (n.name || '').toLowerCase().includes(searchWord)
    ).map((n) => n.id);
  }, [graphDataSite.nodes, searchWord]);

  const matchIds = activeTab === 'group'
    ? (viewModeGroup === 'graph' ? matchIdsGroup : matchIdsGroup)
    : (viewMode === 'graph' ? matchIdsSiteGraph : matchIdsSiteGrid);
  const matchCount = matchIds.length;
  const currentMatchId = matchCount > 0 ? matchIds[currentMatchIndex % matchCount] : null;

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (matchCount === 0 || currentMatchId == null) return;
    const el = searchScrollRefs.current[currentMatchId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentMatchIndex, currentMatchId, matchCount]);

  return (
    <div style={s.page}>
      {/* Tabs and toolbar in one row: Site Group | Site on the left, search + icons on the right */}
      <div style={{ ...s.formCard, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={() => setActiveTab('group')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: t.fontFamily.sans,
                fontSize: t.fontSize.base,
                color: '#2563eb',
                textDecoration: activeTab === 'group' ? 'underline' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'group' ? 700 : 400,
              }}
            >
              Site Group
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('site')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: t.fontFamily.sans,
                fontSize: t.fontSize.base,
                color: '#2563eb',
                textDecoration: activeTab === 'site' ? 'underline' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'site' ? 700 : 400,
              }}
            >
              Site
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '4px 10px' }} onClick={() => setCurrentMatchIndex((i) => (i - 1 + matchCount) % matchCount)} disabled={matchCount === 0}>Prev</button>
                  <button type="button" style={{ ...s.btn, ...s.btnSecondary, padding: '4px 10px' }} onClick={() => setCurrentMatchIndex((i) => (i + 1) % matchCount)} disabled={matchCount === 0}>Next</button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {activeTab === 'group' ? (
                <>
                  <button type="button" style={{ ...s.iconBtn, ...(viewModeGroup === 'grid' ? { opacity: 1, border: `1px solid ${t.color.primary}` } : {}) }} onClick={() => setViewModeGroup('grid')} title="Grid view" aria-label="Grid view">
                    <IconGrid size={16} />
                  </button>
                  <button type="button" style={{ ...s.iconBtn, ...(viewModeGroup === 'ticket' ? { opacity: 1, border: `1px solid ${t.color.primary}` } : {}) }} onClick={() => setViewModeGroup('ticket')} title="Ticket view" aria-label="Ticket view">
                    <IconTicket size={16} />
                  </button>
                  <button type="button" style={{ ...s.iconBtn, ...(viewModeGroup === 'graph' ? { opacity: 1, border: `1px solid ${t.color.primary}` } : {}) }} onClick={() => setViewModeGroup('graph')} title="Link view (Name vs Parent group)" aria-label="Link view">
                    <IconLink size={16} />
                  </button>
                  <button
                    type="button"
                    style={s.iconBtn}
                    title={addPanelOpen ? 'Close panel' : 'Add site groups'}
                    aria-label={addPanelOpen ? 'Close panel' : 'Add site groups'}
                    onClick={() => {
                      if (addPanelOpen) {
                        setAddPanelOpen(false);
                        if (editingId) resetForm();
                        if (editingGroupId) setEditingGroupId(null);
                      } else {
                        setEditingId(null);
                        setEditingGroupId(null);
                        resetForm();
                        setGroupForm({ name: '', parent_group_id: defaultGroupId || '' });
                        setBulkAddGroupId(defaultGroupId || '');
                        setBulkAddText('');
                        setBulkAddResult({ created: 0, failed: 0, errors: [] });
                        setAddPanelOpen(true);
                      }
                    }}
                  >
                    {addPanelOpen ? <IconMinus size={16} /> : <IconPlus size={16} />}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" style={{ ...s.iconBtn, ...(viewMode === 'grid' ? { opacity: 1, border: `1px solid ${t.color.primary}` } : {}) }} onClick={() => setViewMode('grid')} title="Grid view" aria-label="Grid view">
                    <IconGrid size={16} />
                  </button>
                  <button type="button" style={{ ...s.iconBtn, ...(viewMode === 'ticket' ? { opacity: 1, border: `1px solid ${t.color.primary}` } : {}) }} onClick={() => setViewMode('ticket')} title="Ticket view" aria-label="Ticket view">
                    <IconTicket size={16} />
                  </button>
                  <button type="button" style={{ ...s.iconBtn, ...(viewMode === 'graph' ? { opacity: 1, border: `1px solid ${t.color.primary}` } : {}) }} onClick={() => setViewMode('graph')} title="Link view (Site Name vs Site Group)" aria-label="Link view">
                    <IconLink size={16} />
                  </button>
                  <button
                    type="button"
                    style={s.iconBtn}
                    title={addPanelOpen ? 'Close panel' : 'Add sites'}
                    aria-label={addPanelOpen ? 'Close panel' : 'Add sites'}
                    onClick={() => {
                      if (addPanelOpen) {
                        setAddPanelOpen(false);
                        if (editingId) resetForm();
                        if (editingGroupId) setEditingGroupId(null);
                      } else {
                        setEditingId(null);
                        setEditingGroupId(null);
                        resetForm();
                        setGroupForm({ name: '', parent_group_id: defaultGroupId || '' });
                        setBulkAddGroupId(defaultGroupId || '');
                        setBulkAddText('');
                        setBulkAddResult({ created: 0, failed: 0, errors: [] });
                        setAddPanelOpen(true);
                      }
                    }}
                  >
                    {addPanelOpen ? <IconMinus size={16} /> : <IconPlus size={16} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {activeTab === 'group' ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Site groups: grid, ticket, or graph */}
            <div style={{ marginTop: 0, flex: 1, minHeight: 0, overflow: viewModeGroup === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
              {groups.length === 0 ? (
                <p style={s.empty}>No site groups. Use the + button to add site groups.</p>
              ) : viewModeGroup === 'graph' ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: t.color.surface, borderRadius: 8 }}>
                  <div
                    ref={graphContainerGroupRef}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowX: 'auto',
                      overflowY: 'auto',
                      cursor: panningGroup ? 'grabbing' : draggingNodeIdGroup ? undefined : 'grab',
                      userSelect: panningGroup ? 'none' : undefined,
                    }}
                    onMouseDown={startPanGroup}
                  >
                    <div style={{ width: graphLayoutGroup.width * graphZoomGroup, height: graphLayoutGroup.height * graphZoomGroup, display: 'block' }}>
                      <div style={{ transform: `scale(${graphZoomGroup})`, transformOrigin: '0 0', width: graphLayoutGroup.width, height: graphLayoutGroup.height }}>
                        <svg
                          ref={graphSvgGroupRef}
                          viewBox={`0 0 ${graphLayoutGroup.width} ${graphLayoutGroup.height}`}
                          style={{
                            display: 'block',
                            width: graphLayoutGroup.width,
                            height: graphLayoutGroup.height,
                            cursor: draggingNodeIdGroup ? 'grabbing' : undefined,
                          }}
                        >
                    <defs>
                      <marker id="arrow-group" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill={t.color.textMuted || t.color.text} />
                      </marker>
                    </defs>
                    <rect x={0} y={0} width={graphLayoutGroup.width} height={graphLayoutGroup.height} fill="transparent" style={{ pointerEvents: 'all' }} aria-hidden="true" />
                    {graphDataGroup.links
                      .filter((link) => visibleIdsGroup.has(link.source) && visibleIdsGroup.has(link.target))
                      .map((link, i) => {
                        const src = getEffectivePosGroup(link.source);
                        const tgt = getEffectivePosGroup(link.target);
                        if (!src || !tgt) return null;
                        const nodeH = 56;
                        return (
                          <line
                            key={`${link.source}-${link.target}-${i}`}
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
                    {graphDataGroup.nodes
                      .filter((node) => visibleIdsGroup.has(node.id))
                      .map((node) => {
                        const pos = getEffectivePosGroup(node.id);
                        if (!pos) return null;
                        const isMaster = node.nodeType === 'master-org';
                        const fill = isMaster ? '#fef3c7' : '#dbeafe';
                        const stroke = isMaster ? '#d97706' : '#2563eb';
const nodeW = 170;
                      const nodeH = 56;
                      const hasChildren = (childrenMapGroup.get(node.id)?.length ?? 0) > 0;
                        const expanded = isExpandedGroup(node.id);
                        const groupRec = node.id !== MASTER_ORG_ROOT_ID ? groups.find((g) => String(g.id) === node.id) : null;
                        const btnSize = 18;
                        const numActionBtns = groupRec ? 2 : 0;
                        const actionsW = numActionBtns * btnSize;
                        return (
                          <g
                            key={node.id}
                            ref={(el) => { if (el) searchScrollRefs.current[node.id] = el; }}
                            style={{ cursor: draggingNodeIdGroup ? 'grabbing' : 'grab' }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              draggedRefGroup.current = false;
                              setDraggingNodeIdGroup(node.id);
                            }}
                            onClick={() => {
                              if (draggedRefGroup.current) return;
                              setGroupForm((prev) => ({
                                ...prev,
                                parent_group_id: node.id === MASTER_ORG_ROOT_ID ? (defaultGroupId || '') : node.id,
                              }));
                              draggedRefGroup.current = false;
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
                              fill={fill}
                              stroke={currentMatchId === node.id ? '#b45309' : stroke}
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
                            {groupRec && (
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
                                  <button
                                    type="button"
                                    title="Edit"
                                    style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                                    onClick={(e) => { e.stopPropagation(); handleEditGroup(groupRec); }}
                                  >
                                    <IconEdit size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete"
                                    style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(node.id); }}
                                  >
                                    <IconTrash size={12} />
                                  </button>
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
                                  const level = levelMapGroup.get(node.id) ?? 0;
                                  if (level <= 1) {
                                    setCollapsedNodesGroup((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(node.id)) next.delete(node.id);
                                      else next.add(node.id);
                                      return next;
                                    });
                                  } else {
                                    setExpandedNodesGroup((prev) => {
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
                          </g>
                        );
                      })}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewModeGroup === 'ticket' ? (
                <div style={s.ticketList}>
                  {groups.map((g) => (
                    <div key={g.id} ref={(el) => { if (el) searchScrollRefs.current[g.id] = el; }} style={{ ...s.ticketCard, ...(currentMatchId === String(g.id) ? { backgroundColor: '#fef3c7', borderLeft: '6px solid #b45309', boxShadow: '0 0 0 2px #d97706', color: '#000' } : {}) }}>
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
                  {selectedGroupIds.size > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <button type="button" style={{ ...s.btn, ...s.btnDanger }} onClick={async () => {
                        if (!window.confirm(`Delete ${selectedGroupIds.size} selected site group(s)?`)) return;
                        for (const id of selectedGroupIds) {
                          const res = await deleteGroup(id);
                          if (res && res.deleted) setGroups((prev) => prev.filter((gr) => String(gr.id) !== String(id)));
                        }
                        setSelectedGroupIds(new Set());
                      }}>
                        Delete selected ({selectedGroupIds.size})
                      </button>
                    </div>
                  )}
                  <div style={{ ...s.grid(gridColsGroups), ...s.gridHeader }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" checked={sortedGroups.length > 0 && sortedGroups.every((g) => selectedGroupIds.has(String(g.id)))} onChange={(e) => setSelectedGroupIds(e.target.checked ? new Set(sortedGroups.map((g) => String(g.id))) : new Set())} style={{ margin: 0 }} />
                    </span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyGroup('name'); setSortDirGroup((d) => (sortKeyGroup === 'name' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Name {sortKeyGroup === 'name' ? (sortDirGroup === 'asc' ? '▲' : '▼') : ''}</span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyGroup('parent'); setSortDirGroup((d) => (sortKeyGroup === 'parent' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Parent group {sortKeyGroup === 'parent' ? (sortDirGroup === 'asc' ? '▲' : '▼') : ''}</span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyGroup('created_by'); setSortDirGroup((d) => (sortKeyGroup === 'created_by' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Created by {sortKeyGroup === 'created_by' ? (sortDirGroup === 'asc' ? '▲' : '▼') : ''}</span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeyGroup('created_at'); setSortDirGroup((d) => (sortKeyGroup === 'created_at' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Created on {sortKeyGroup === 'created_at' ? (sortDirGroup === 'asc' ? '▲' : '▼') : ''}</span>
                    <span>Action</span>
                  </div>
                  {sortedGroups.map((g) => (
                    <div key={g.id} ref={(el) => { if (el) searchScrollRefs.current[g.id] = el; }} style={{ ...s.grid(gridColsGroups), ...(currentMatchId === String(g.id) ? { backgroundColor: '#fef3c7', borderLeft: '4px solid #b45309', outline: '2px solid #d97706', outlineOffset: '-2px', color: '#000' } : {}) }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={selectedGroupIds.has(String(g.id))} onChange={() => setSelectedGroupIds((prev) => { const next = new Set(prev); if (next.has(String(g.id))) next.delete(String(g.id)); else next.add(String(g.id)); return next; })} style={{ margin: 0 }} /></span>
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
            {/* Sites: grid, ticket, or graph */}
            <div style={{ marginTop: 0, flex: 1, minHeight: 0, overflow: viewMode === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
              {viewMode === 'graph' ? (
                graphDataSite.nodes.length === 0 ? (
                  <p style={s.empty}>No site groups or sites. Use the Add panel to add in bulk.</p>
                ) : (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: t.color.surface, borderRadius: 8 }}>
                  <div
                    ref={graphContainerSiteRef}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowX: 'auto',
                      overflowY: 'auto',
                      cursor: panningSite ? 'grabbing' : draggingNodeIdSite ? undefined : 'grab',
                      userSelect: panningSite ? 'none' : undefined,
                    }}
                    onMouseDown={startPanSite}
                  >
                    <div style={{ width: graphLayoutSite.width * graphZoomSite, height: graphLayoutSite.height * graphZoomSite, display: 'block' }}>
                      <div style={{ transform: `scale(${graphZoomSite})`, transformOrigin: '0 0', width: graphLayoutSite.width, height: graphLayoutSite.height }}>
                        <svg
                          ref={graphSvgSiteRef}
                          viewBox={`0 0 ${graphLayoutSite.width} ${graphLayoutSite.height}`}
                          style={{
                            display: 'block',
                            width: graphLayoutSite.width,
                            height: graphLayoutSite.height,
                            cursor: draggingNodeIdSite ? 'grabbing' : undefined,
                          }}
                        >
                    <defs>
                      <marker id="arrow-site" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill={t.color.textMuted || t.color.text} />
                      </marker>
                    </defs>
                    <rect x={0} y={0} width={graphLayoutSite.width} height={graphLayoutSite.height} fill="transparent" style={{ pointerEvents: 'all' }} aria-hidden="true" />
                    {graphDataSite.links
                      .filter((link) => visibleIdsSite.has(link.source) && visibleIdsSite.has(link.target))
                      .map((link, i) => {
                        const src = getEffectivePosSite(link.source);
                        const tgt = getEffectivePosSite(link.target);
                        if (!src || !tgt) return null;
                        const nodeH = 56;
                        return (
                          <line
                            key={`${link.source}-${link.target}-${i}`}
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
                    {graphDataSite.nodes
                      .filter((node) => visibleIdsSite.has(node.id))
                      .map((node) => {
                        const pos = getEffectivePosSite(node.id);
                        if (!pos) return null;
                        const isMaster = node.nodeType === 'master-org';
                        const isGroup = node.nodeType === 'other-group';
                        const isSite = node.nodeType === 'site';
                        const fill = isMaster ? '#fef3c7' : isGroup ? '#dbeafe' : '#d1fae5';
                        const stroke = isMaster ? '#d97706' : isGroup ? '#2563eb' : '#059669';
                        const nodeW = 170;
                        const nodeH = 56;
                        const hasChildren = (childrenMapSite.get(node.id)?.length ?? 0) > 0;
                        const expanded = isExpandedSite(node.id);
                        const siteRec = isSite ? records.find((r) => String(r.id) === node.id) : null;
                        const groupRec = isGroup ? groups.find((g) => String(g.id) === node.id) : null;
                        const showActions = siteRec || groupRec;
                        const btnSize = 18;
                        const numActionBtns = siteRec ? 3 : (groupRec ? 2 : 0);
                        const actionsW = numActionBtns * btnSize;
                        return (
                          <g
                            key={node.id}
                            ref={(el) => { if (el) searchScrollRefs.current[node.id] = el; }}
                            style={{ cursor: draggingNodeIdSite ? 'grabbing' : 'grab' }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              draggedRefSite.current = false;
                              setDraggingNodeIdSite(node.id);
                            }}
                            onClick={() => {
                              if (draggedRefSite.current) return;
                              const groupId = isSite && siteRec
                                ? (siteRec.group_id ? String(siteRec.group_id) : '')
                                : (node.id === MASTER_ORG_ROOT_ID ? (defaultGroupId || '') : (isGroup ? node.id : ''));
                              setForm((prev) => ({ ...prev, group_id: groupId }));
                              draggedRefSite.current = false;
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
                              fill={fill}
                              stroke={currentMatchId === node.id ? '#b45309' : stroke}
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
                            {showActions && (
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
                                  {siteRec && (
                                    <button
                                      type="button"
                                      title="Generate Token"
                                      style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                                      onClick={(e) => { e.stopPropagation(); navigate('/inventory/tokens', { state: { organizationId: siteRec.id } }); }}
                                    >
                                      <IconKey size={12} />
                                    </button>
                                  )}
                                  {siteRec && (
                                    <>
                                      <button
                                        type="button"
                                        title="Edit"
                                        style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                                        onClick={(e) => { e.stopPropagation(); handleEdit(siteRec); }}
                                      >
                                        <IconEdit size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        title="Delete"
                                        style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                                        onClick={(e) => { e.stopPropagation(); handleDelete(siteRec.id); }}
                                      >
                                        <IconTrash size={12} />
                                      </button>
                                    </>
                                  )}
                                  {groupRec && !siteRec && (
                                    <>
                                      <button
                                        type="button"
                                        title="Edit"
                                        style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                                        onClick={(e) => { e.stopPropagation(); handleEditGroup(groupRec); }}
                                      >
                                        <IconEdit size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        title="Delete"
                                        style={{ ...s.iconBtn, padding: 0, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(node.id); }}
                                      >
                                        <IconTrash size={12} />
                                      </button>
                                    </>
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
                                  const level = levelMapSite.get(node.id) ?? 0;
                                  if (level <= 1) {
                                    setCollapsedNodesSite((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(node.id)) next.delete(node.id);
                                      else next.add(node.id);
                                      return next;
                                    });
                                  } else {
                                    setExpandedNodesSite((prev) => {
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
                          </g>
                        );
                      })}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                )
              ) : records.length === 0 ? (
                <p style={s.empty}>No sites. Use the Add panel to add sites or site groups.</p>
              ) : viewMode === 'grid' ? (
                <div style={s.gridWrapper}>
                  {selectedSiteIds.size > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <button type="button" style={{ ...s.btn, ...s.btnDanger }} onClick={async () => {
                        if (!window.confirm(`Delete ${selectedSiteIds.size} selected site(s)?`)) return;
                        for (const id of selectedSiteIds) {
                          const res = await deleteSite(id);
                          if (res && res.deleted) setRecords((prev) => prev.filter((r) => String(r.id) !== String(id)));
                        }
                        setSelectedSiteIds(new Set());
                      }}>
                        Delete selected ({selectedSiteIds.size})
                      </button>
                    </div>
                  )}
                  <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" checked={sortedRecords.length > 0 && sortedRecords.every((r) => selectedSiteIds.has(String(r.id)))} onChange={(e) => setSelectedSiteIds(e.target.checked ? new Set(sortedRecords.map((r) => String(r.id))) : new Set())} style={{ margin: 0 }} />
                    </span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeySite('name'); setSortDirSite((d) => (sortKeySite === 'name' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Site Name {sortKeySite === 'name' ? (sortDirSite === 'asc' ? '▲' : '▼') : ''}</span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeySite('group'); setSortDirSite((d) => (sortKeySite === 'group' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Site Group {sortKeySite === 'group' ? (sortDirSite === 'asc' ? '▲' : '▼') : ''}</span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeySite('master_owner'); setSortDirSite((d) => (sortKeySite === 'master_owner' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Master Owner {sortKeySite === 'master_owner' ? (sortDirSite === 'asc' ? '▲' : '▼') : ''}</span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeySite('created_by'); setSortDirSite((d) => (sortKeySite === 'created_by' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Created by {sortKeySite === 'created_by' ? (sortDirSite === 'asc' ? '▲' : '▼') : ''}</span>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortKeySite('created_at'); setSortDirSite((d) => (sortKeySite === 'created_at' ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}>Created on {sortKeySite === 'created_at' ? (sortDirSite === 'asc' ? '▲' : '▼') : ''}</span>
                    <span>Action</span>
                  </div>
                  {sortedRecords.map((r) => (
                    <div key={r.id} ref={(el) => { if (el) searchScrollRefs.current[String(r.id)] = el; }} style={{ ...s.grid(gridCols), ...(currentMatchId === String(r.id) ? { backgroundColor: '#fef3c7', borderLeft: '4px solid #b45309', outline: '2px solid #d97706', outlineOffset: '-2px', color: '#000' } : {}) }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={selectedSiteIds.has(String(r.id))} onChange={() => setSelectedSiteIds((prev) => { const next = new Set(prev); if (next.has(String(r.id))) next.delete(String(r.id)); else next.add(String(r.id)); return next; })} style={{ margin: 0 }} /></span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{organizationSiteGroupLabel(r)}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{masterOwnerDisplay(r)}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail(r.created_by_user_id)}</span>
                      <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</span>
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
                    <div key={r.id} ref={(el) => { if (el) searchScrollRefs.current[String(r.id)] = el; }} style={{ ...s.ticketCard, ...(currentMatchId === String(r.id) ? { backgroundColor: '#fef3c7', borderLeft: '6px solid #b45309', boxShadow: '0 0 0 2px #d97706', color: '#000' } : {}) }}>
                      <div style={s.ticketMain}>
                        <strong>{r.name}</strong>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>
                          Site group: {organizationSiteGroupLabel(r)}
                        </span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Master Owner: {masterOwnerDisplay(r)}</span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created by: {userEmail(r.created_by_user_id)}</span>
                        <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>Created on: {formatDate(r.created_at)}</span>
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

      {addPanelOpen && (
        <RightSlidePanel
          theme={t}
          onClose={() => { setAddPanelOpen(false); if (editingId) resetForm(); if (editingGroupId) setEditingGroupId(null); }}
          title={
            editingId ? 'Edit site' :
            editingGroupId ? 'Edit site group' :
            activeTab === 'group' ? 'Add site groups' : 'Add sites'
          }
          headerStyle={{
            padding: '16px 20px',
            borderBottom: `1px solid ${t.color.border}`,
            background: t.widgetHeader?.background || t.color.background,
            color: t.widgetHeader?.color || t.color.text,
          }}
          titleStyle={{ margin: 0, fontSize: t.fontSize.lg, fontWeight: 600 }}
        >
          <div style={{ padding: 20 }}>
            {editingId ? (
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                onSubmit={(e) => { e.preventDefault(); handleUpdate(); setAddPanelOpen(false); resetForm(); }}
              >
                <div style={s.formRow}>
                  <label style={s.label}>Site group</label>
                  <select
                    value={form.group_id}
                    onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                    style={s.select}
                  >
                    <option value="">— Select site group —</option>
                    {groupsSortedByPath.map((g) => (
                      <option key={g.id} value={g.id}>{getGroupPathLabel(g.id)}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>Site name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={s.input}
                    placeholder="Site name"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ ...s.btn, ...s.btnPrimary }}>Update</button>
                  <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={() => { setAddPanelOpen(false); resetForm(); }}>Cancel</button>
                </div>
              </form>
            ) : editingGroupId ? (
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = groupForm.name.trim();
                  if (!name || !currentAccountId) return;
                  const parentId = groupForm.parent_group_id || defaultGroupId;
                  if (!parentId) return;
                  if (name.includes('-')) return;
                  await updateGroup(editingGroupId, { name, parent_group_id: parentId });
                  if (currentAccountId) {
                    const list = await fetchGroups(currentAccountId);
                    setGroups(Array.isArray(list) ? list : []);
                  }
                  setGroupForm({ name: '', parent_group_id: defaultGroupId || '' });
                  setEditingGroupId(null);
                  setAddPanelOpen(false);
                }}
              >
                <div style={s.formRow}>
                  <label style={s.label}>Parent site group</label>
                  <select
                    value={groupForm.parent_group_id}
                    onChange={(e) => setGroupForm((g) => ({ ...g, parent_group_id: e.target.value }))}
                    style={s.select}
                  >
                    <option value="">— No parent</option>
                    {groupsSortedByPath.map((g) => (
                      <option key={g.id} value={g.id}>{getGroupPathLabel(g.id)}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>Site group name</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm((g) => ({ ...g, name: e.target.value.replace(/-/g, '') }))}
                    style={s.input}
                    placeholder="Site group name"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ ...s.btn, ...s.btnPrimary }}>Update</button>
                  <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={() => { setAddPanelOpen(false); setEditingGroupId(null); setGroupForm({ name: '', parent_group_id: defaultGroupId || '' }); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                onSubmit={(e) => { e.preventDefault(); handleBulkAdd(); }}
              >
                <div style={s.formRow}>
                  <label style={s.label}>{activeTab === 'group' ? 'Parent site group' : 'Site group'}</label>
                  <select
                    value={bulkAddGroupId}
                    onChange={(e) => setBulkAddGroupId(e.target.value)}
                    style={s.select}
                  >
                    <option value="">— {activeTab === 'group' ? 'No parent' : 'Select site group'} —</option>
                    {groupsSortedByPath.map((g) => (
                      <option key={g.id} value={g.id}>{getGroupPathLabel(g.id)}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>
                    {activeTab === 'group' ? 'Site group names (comma- or newline-separated)' : 'Site names (comma- or newline-separated)'}
                  </label>
                  <textarea
                    value={bulkAddText}
                    onChange={(e) => setBulkAddText(e.target.value)}
                    placeholder={activeTab === 'group' ? 'e.g. Group A, Group B' : 'e.g. Site A, Site B, Site C'}
                    style={{ ...s.input, minHeight: 140, resize: 'vertical' }}
                    rows={6}
                  />
                </div>
                {(bulkAddResult.created > 0 || bulkAddResult.failed > 0) && (
                  <p style={{ fontSize: t.fontSize.sm, color: t.color.textMuted, margin: 0 }}>
                    Created: {bulkAddResult.created}. Failed: {bulkAddResult.failed}.
                    {bulkAddResult.errors.length > 0 && ` (${bulkAddResult.errors.slice(0, 3).join(', ')}${bulkAddResult.errors.length > 3 ? '…' : ''})`}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ ...s.btn, ...s.btnPrimary }} disabled={bulkAddBusy || !bulkAddText.trim()}>
                    {bulkAddBusy ? 'Adding…' : 'Add all'}
                  </button>
                  <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={() => { setAddPanelOpen(false); }}>Close</button>
                </div>
              </form>
            )}
          </div>
        </RightSlidePanel>
      )}
    </div>
  );
}
