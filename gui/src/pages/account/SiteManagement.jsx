import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { IconGrid, IconTicket, IconLink, IconPlus, IconMinus, IconExport, IconImport } from '../../components/Icons';
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
import SiteManagementGroups from './SiteManagementGroups';
import SiteManagementSites from './SiteManagementSites';

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
  const [sortKeyGroup, setSortKeyGroup] = useState('name');
  const [sortDirGroup, setSortDirGroup] = useState('asc');
  const [sortKeySite, setSortKeySite] = useState('name');
  const [sortDirSite, setSortDirSite] = useState('asc');
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
  const [selectedSiteIds, setSelectedSiteIds] = useState(new Set());
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [importCsvHeaders, setImportCsvHeaders] = useState([]);
  const [importCsvRows, setImportCsvRows] = useState([]);
  const [importMapping, setImportMapping] = useState({});
  const [importDuplicates, setImportDuplicates] = useState([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState({ created: 0, skipped: 0, failed: 0, errors: [] });

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

  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
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
  const MASTER_ORG_ROOT_ID = '__master_org_root__';

  const getGroupIdByPathLabel = (label) => {
    const L = (label || '').trim();
    const byPath = groups.find((g) => getGroupPathLabel(g.id) === L);
    if (byPath) return byPath.id;
    const byName = groups.find((g) => hasNoGroup(g.parent_group_id) && (g.name || '').trim() === L);
    return byName ? byName.id : '';
  };

  function parseCSVLine(line) {
    const result = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let cell = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { cell += line[i++]; }
        }
        result.push(cell);
        while (i < line.length && (line[i] === ',' || line[i] === ' ')) i++;
      } else {
        let cell = '';
        while (i < line.length && line[i] !== ',') cell += line[i++];
        result.push(cell.trim());
        if (line[i] === ',') i++;
      }
    }
    return result;
  }
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { headers: [], rows: [] };
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map((l) => parseCSVLine(l));
    return { headers, rows };
  }

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

  const escapeCsv = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const exportGroupCSV = () => {
    const headers = ['Name', 'Parent Group', 'Created By', 'Created On'];
    const rows = sortedGroups.map((g) => [
      escapeCsv(g.name),
      escapeCsv(hasNoGroup(g.parent_group_id) ? masterOrgName : getGroupPathLabel(g.parent_group_id)),
      escapeCsv(userEmail(g.created_by_user_id)),
      escapeCsv(formatDate(g.created_at)),
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `site-groups-${currentAccountId || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportSiteCSV = () => {
    const headers = ['Name', 'Site Group', 'Master Owner', 'Created By', 'Created On'];
    const rows = sortedRecords.map((r) => [
      escapeCsv(r.name),
      escapeCsv(organizationSiteGroupLabel(r)),
      escapeCsv(masterOwnerDisplay(r)),
      escapeCsv(userEmail(r.created_by_user_id)),
      escapeCsv(formatDate(r.created_at)),
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sites-${currentAccountId || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openImportPanel = () => {
    setImportCsvHeaders([]);
    setImportCsvRows([]);
    setImportMapping({});
    setImportDuplicates([]);
    setImportResult({ created: 0, skipped: 0, failed: 0, errors: [] });
    setImportPanelOpen(true);
  };
  const handleImportFile = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { headers, rows } = parseCSV(ev.target?.result ?? '');
        setImportCsvHeaders(headers);
        setImportCsvRows(rows);
        const mapping = {};
        if (headers.length > 0) mapping.name = String(0);
        if (headers.length > 1) mapping[activeTab === 'group' ? 'parent_group' : 'site_group'] = String(1);
        setImportMapping(mapping);
        setImportDuplicates([]);
        setImportResult({ created: 0, skipped: 0, failed: 0, errors: [] });
      } catch (err) {
        console.error(err);
        setImportCsvHeaders([]);
        setImportCsvRows([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };
  const runDuplicateCheck = () => {
    const keyName = importMapping.name;
    const keyParent = importMapping[activeTab === 'group' ? 'parent_group' : 'site_group'];
    if (keyName == null || keyParent == null) return;
    const nameIdx = parseInt(keyName, 10);
    const parentIdx = parseInt(keyParent, 10);
    const existingSet = new Set();
    if (activeTab === 'group') {
      groups.forEach((g) => {
        const parentLabel = hasNoGroup(g.parent_group_id) ? masterOrgName : getGroupPathLabel(g.parent_group_id);
        existingSet.add(`${(g.name || '').trim()}\n${(parentLabel || '').trim()}`);
      });
    } else {
      records.forEach((r) => {
        const parentLabel = organizationSiteGroupLabel(r);
        existingSet.add(`${(r.name || '').trim()}\n${(parentLabel || '').trim()}`);
      });
    }
    const duplicates = [];
    importCsvRows.forEach((row, i) => {
      const name = (row[nameIdx] ?? '').trim();
      const parent = (row[parentIdx] ?? '').trim();
      if (existingSet.has(`${name}\n${parent}`)) duplicates.push({ index: i, name, parent });
    });
    setImportDuplicates(duplicates);
  };
  const runImport = async () => {
    const keyName = importMapping.name;
    const keyParent = importMapping[activeTab === 'group' ? 'parent_group' : 'site_group'];
    if (keyName == null || keyParent == null) return;
    const nameIdx = parseInt(keyName, 10);
    const parentIdx = parseInt(keyParent, 10);
    const duplicateSet = new Set(importDuplicates.map((d) => d.index));
    const toImport = importCsvRows
      .map((row, i) => ({ row, i }))
      .filter(({ i }) => !duplicateSet.has(i))
      .map(({ row }) => ({ name: (row[nameIdx] ?? '').trim(), parentLabel: (row[parentIdx] ?? '').trim() }));
    let created = 0;
    const errors = [];
    setImportBusy(true);
    setImportResult({ created: 0, skipped: importDuplicates.length, failed: 0, errors: [] });
    try {
      for (const { name, parentLabel } of toImport) {
        if (!name) continue;
        try {
          if (activeTab === 'group') {
            const parent_group_id = getGroupIdByPathLabel(parentLabel) || defaultGroupId || '';
            await createGroup({ account_id: currentAccountId, name, parent_group_id: parent_group_id || undefined });
          } else {
            const group_id = getGroupIdByPathLabel(parentLabel) || defaultGroupId || '';
            await createSite({ account_id: currentAccountId, group_id, name, group_name: parentLabel, is_default: false });
          }
          created++;
        } catch (err) {
          errors.push({ name, message: err?.message || String(err) });
        }
      }
      setImportResult({ created, skipped: importDuplicates.length, failed: errors.length, errors });
      if (created > 0) {
        if (activeTab === 'group') fetchGroups(currentAccountId).then((list) => setGroups(Array.isArray(list) ? list : []));
        else fetchSites(currentAccountId).then((list) => setRecords(Array.isArray(list) ? list : []));
      }
    } finally {
      setImportBusy(false);
    }
  };

  const onDeleteSelectedGroups = async (ids) => {
    if (!window.confirm(`Delete ${ids.size} selected site group(s)?`)) return;
    for (const id of ids) {
      const res = await deleteGroup(id);
      if (res && res.deleted) setGroups((prev) => prev.filter((gr) => String(gr.id) !== String(id)));
    }
    setSelectedGroupIds(new Set());
  };
  const onDeleteSelectedSites = async (ids) => {
    if (!window.confirm(`Delete ${ids.size} selected site(s)?`)) return;
    for (const id of ids) {
      const res = await deleteSite(id);
      if (res && res.deleted) setRecords((prev) => prev.filter((r) => String(r.id) !== String(id)));
    }
    setSelectedSiteIds(new Set());
  };

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

  const siteGraphNodeNames = useMemo(() => [
    { id: MASTER_ORG_ROOT_ID, name: 'Master-Organization' },
    ...groups.map((g) => ({ id: String(g.id), name: getGroupPathLabel(g.id) })),
    ...records.map((r) => ({ id: String(r.id), name: r.name || r.id })),
  ], [groups, records, getGroupPathLabel]);
  const matchIdsSiteGraph = useMemo(() => {
    if (!searchWord) return [];
    return siteGraphNodeNames.filter((n) => (n.name || '').toLowerCase().includes(searchWord)).map((n) => n.id);
  }, [siteGraphNodeNames, searchWord]);

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
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
                  <button type="button" style={s.iconBtn} onClick={exportGroupCSV} title="Export to CSV" aria-label="Export to CSV">
                    <IconExport size={16} />
                  </button>
                  <button type="button" style={s.iconBtn} onClick={openImportPanel} title="Import from CSV" aria-label="Import from CSV">
                    <IconImport size={16} />
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
                  <button type="button" style={s.iconBtn} onClick={exportSiteCSV} title="Export to CSV" aria-label="Export to CSV">
                    <IconExport size={16} />
                  </button>
                  <button type="button" style={s.iconBtn} onClick={openImportPanel} title="Import from CSV" aria-label="Import from CSV">
                    <IconImport size={16} />
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
            <div style={{ marginTop: 0, flex: 1, minHeight: 0, overflow: viewModeGroup === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
              <SiteManagementGroups
                groups={groups}
                users={users}
                s={s}
                t={t}
                viewModeGroup={viewModeGroup}
                setViewModeGroup={setViewModeGroup}
                sortKeyGroup={sortKeyGroup}
                setSortKeyGroup={setSortKeyGroup}
                sortDirGroup={sortDirGroup}
                setSortDirGroup={setSortDirGroup}
                sortedGroups={sortedGroups}
                selectedGroupIds={selectedGroupIds}
                setSelectedGroupIds={setSelectedGroupIds}
                searchScrollRefs={searchScrollRefs}
                currentMatchId={currentMatchId}
                getGroupPathLabel={getGroupPathLabel}
                hasNoGroup={hasNoGroup}
                userEmail={userEmail}
                formatDate={formatDate}
                defaultGroupId={defaultGroupId}
                handleEditGroup={handleEditGroup}
                handleDeleteGroup={handleDeleteGroup}
                setGroupForm={setGroupForm}
                onDeleteSelectedGroups={onDeleteSelectedGroups}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginTop: 0, flex: 1, minHeight: 0, overflow: viewMode === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
              <SiteManagementSites
                groups={groups}
                records={records}
                users={users}
                s={s}
                t={t}
                viewMode={viewMode}
                setViewMode={setViewMode}
                sortKeySite={sortKeySite}
                setSortKeySite={setSortKeySite}
                sortDirSite={sortDirSite}
                setSortDirSite={setSortDirSite}
                sortedRecords={sortedRecords}
                selectedSiteIds={selectedSiteIds}
                setSelectedSiteIds={setSelectedSiteIds}
                searchScrollRefs={searchScrollRefs}
                currentMatchId={currentMatchId}
                getGroupPathLabel={getGroupPathLabel}
                hasNoGroup={hasNoGroup}
                organizationSiteGroupLabel={organizationSiteGroupLabel}
                masterOwnerDisplay={masterOwnerDisplay}
                userEmail={userEmail}
                formatDate={formatDate}
                defaultGroupId={defaultGroupId}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                handleEditGroup={handleEditGroup}
                handleDeleteGroup={handleDeleteGroup}
                setForm={setForm}
                onDeleteSelectedSites={onDeleteSelectedSites}
              />
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

      {importPanelOpen && (
        <RightSlidePanel
          theme={t}
          onClose={() => { setImportPanelOpen(false); setImportCsvHeaders([]); setImportCsvRows([]); setImportDuplicates([]); }}
          title={activeTab === 'group' ? 'Import site groups from CSV' : 'Import sites from CSV'}
          headerStyle={{
            padding: '16px 20px',
            borderBottom: `1px solid ${t.color.border}`,
            background: t.widgetHeader?.background || t.color.background,
            color: t.widgetHeader?.color || t.color.text,
          }}
          titleStyle={{ margin: 0, fontSize: t.fontSize.lg, fontWeight: 600 }}
        >
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={s.formRow}>
              <label style={s.label}>CSV file</label>
              <input type="file" accept=".csv" onChange={handleImportFile} style={{ ...s.input, maxWidth: 320 }} />
            </div>
            {importCsvHeaders.length > 0 && (
              <>
                <p style={{ margin: 0, fontSize: t.fontSize.sm, color: t.color.textMuted }}>
                  Map CSV columns to fields. Rows: {importCsvRows.length}. Headers: {importCsvHeaders.join(', ')}
                </p>
                <div style={s.formRow}>
                  <label style={s.label}>Name (required)</label>
                  <select
                    value={importMapping.name ?? ''}
                    onChange={(e) => setImportMapping((m) => ({ ...m, name: e.target.value }))}
                    style={s.select}
                  >
                    <option value="">— Select column —</option>
                    {importCsvHeaders.map((h, i) => (
                      <option key={i} value={String(i)}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>{activeTab === 'group' ? 'Parent group (required)' : 'Site group (required)'}</label>
                  <select
                    value={importMapping[activeTab === 'group' ? 'parent_group' : 'site_group'] ?? ''}
                    onChange={(e) => setImportMapping((m) => ({ ...m, [activeTab === 'group' ? 'parent_group' : 'site_group']: e.target.value }))}
                    style={s.select}
                  >
                    <option value="">— Select column —</option>
                    {importCsvHeaders.map((h, i) => (
                      <option key={i} value={String(i)}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={{ ...s.btn, ...s.btnSecondary }} onClick={runDuplicateCheck} disabled={importMapping.name == null || importMapping[activeTab === 'group' ? 'parent_group' : 'site_group'] == null}>
                    Check duplicates
                  </button>
                  <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={runImport} disabled={importBusy || importCsvRows.length === 0}>
                    {importBusy ? 'Importing…' : 'Skip duplicates and import rest'}
                  </button>
                </div>
                {importDuplicates.length > 0 && (
                  <div style={{ padding: 12, background: t.color.surface, borderRadius: 8, border: `1px solid ${t.color.border}` }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: t.color.text }}>
                      {importDuplicates.length} duplicate(s) will be skipped
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: t.fontSize.sm, color: t.color.textMuted, maxHeight: 120, overflow: 'auto' }}>
                      {importDuplicates.slice(0, 20).map((d, i) => (
                        <li key={i}>{d.name} ({activeTab === 'group' ? 'Parent' : 'Group'}: {d.parent})</li>
                      ))}
                      {importDuplicates.length > 20 && <li>… and {importDuplicates.length - 20} more</li>}
                    </ul>
                  </div>
                )}
                {(importResult.created > 0 || importResult.failed > 0) && (
                  <p style={{ margin: 0, fontSize: t.fontSize.sm, color: t.color.textMuted }}>
                    Imported: {importResult.created}. Skipped (duplicates): {importResult.skipped}. Failed: {importResult.failed}.
                    {importResult.errors.length > 0 && ` First error: ${importResult.errors[0]?.message ?? ''}`}
                  </p>
                )}
              </>
            )}
            {importCsvHeaders.length === 0 && (
              <p style={{ margin: 0, fontSize: t.fontSize.sm, color: t.color.textMuted }}>Choose a CSV file to import. Required columns: Name, {activeTab === 'group' ? 'Parent group' : 'Site group'}.</p>
            )}
          </div>
        </RightSlidePanel>
      )}
    </div>
  );
}
