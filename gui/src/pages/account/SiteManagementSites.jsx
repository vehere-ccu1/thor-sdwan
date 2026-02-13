import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconEdit, IconTrash, IconKey, IconGrid, IconTicket, IconLink } from '../../components/Icons';

const MASTER_ORG_ROOT_ID = '__master_org_root__';
const gridCols = '32px minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(100px,1fr) minmax(120px,1fr) 120px';
const expandIconStroke = '#166534';

export default function SiteManagementSites({
  groups,
  records,
  users,
  s,
  t,
  viewMode,
  setViewMode,
  sortKeySite,
  setSortKeySite,
  sortDirSite,
  setSortDirSite,
  sortedRecords,
  selectedSiteIds,
  setSelectedSiteIds,
  searchScrollRefs,
  currentMatchId,
  getGroupPathLabel,
  hasNoGroup,
  organizationSiteGroupLabel,
  masterOwnerDisplay,
  userEmail,
  formatDate,
  defaultGroupId,
  handleEdit,
  handleDelete,
  handleEditGroup,
  handleDeleteGroup,
  setForm,
  onDeleteSelectedSites,
}) {
  const navigate = useNavigate();
  const [expandedNodesSite, setExpandedNodesSite] = useState(() => new Set());
  const [collapsedNodesSite, setCollapsedNodesSite] = useState(() => new Set());
  const graphContainerSiteRef = useRef(null);
  const [graphSizeSite, setGraphSizeSite] = useState({ width: 800, height: 400 });
  const [graphZoomSite, setGraphZoomSite] = useState(1);
  const [panningSite, setPanningSite] = useState(false);
  const panStartSiteRef = useRef(null);
  const hasCenteredSiteRef = useRef(false);
  const [nodePositionsSite, setNodePositionsSite] = useState({});
  const [draggingNodeIdSite, setDraggingNodeIdSite] = useState(null);
  const graphSvgSiteRef = useRef(null);
  const draggedRefSite = useRef(false);

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
  }, [groups, records, getGroupPathLabel, hasNoGroup]);

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

  const isExpandedSite = useCallback((id) => {
    const level = levelMapSite.get(id) ?? 0;
    if (collapsedNodesSite.has(id)) return false;
    if (level <= 1) return true;
    return expandedNodesSite.has(id);
  }, [levelMapSite, collapsedNodesSite, expandedNodesSite]);

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
  }, [viewMode]);

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
  }, [viewMode]);

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

  if (viewMode === 'graph') {
    if (graphDataSite.nodes.length === 0) {
      return <p style={s.empty}>No site groups or sites. Use the Add panel to add in bulk.</p>;
    }
    return (
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
    );
  }

  if (records.length === 0) {
    return <p style={s.empty}>No sites. Use the Add panel to add sites or site groups.</p>;
  }

  if (viewMode === 'grid') {
    return (
      <div style={s.gridWrapper}>
        {selectedSiteIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              style={{ ...s.btn, ...s.btnDanger }}
              onClick={() => onDeleteSelectedSites(selectedSiteIds)}
            >
              Delete selected ({selectedSiteIds.size})
            </button>
          </div>
        )}
        <div style={{ ...s.grid(gridCols), ...s.gridHeader }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={sortedRecords.length > 0 && sortedRecords.every((r) => selectedSiteIds.has(String(r.id)))}
              onChange={(e) => setSelectedSiteIds(e.target.checked ? new Set(sortedRecords.map((r) => String(r.id))) : new Set())}
              style={{ margin: 0 }}
            />
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
    );
  }

  return (
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
  );
}
