import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { IconEdit, IconTrash, IconGrid, IconTicket, IconLink } from '../../components/Icons';

const MASTER_ORG_ROOT_ID = '__master_org_root__';
const gridColsGroups = '32px minmax(0,1.5fr) minmax(0,1.5fr) minmax(100px,1fr) minmax(120px,1fr) 120px';
const expandIconStroke = '#166534';

export default function SiteManagementGroups({
  groups,
  users,
  s,
  t,
  viewModeGroup,
  setViewModeGroup,
  sortKeyGroup,
  setSortKeyGroup,
  sortDirGroup,
  setSortDirGroup,
  sortedGroups,
  selectedGroupIds,
  setSelectedGroupIds,
  searchScrollRefs,
  currentMatchId,
  getGroupPathLabel,
  hasNoGroup,
  userEmail,
  formatDate,
  defaultGroupId,
  handleEditGroup,
  handleDeleteGroup,
  setGroupForm,
  onDeleteSelectedGroups,
}) {
  const [expandedNodesGroup, setExpandedNodesGroup] = useState(() => new Set());
  const [collapsedNodesGroup, setCollapsedNodesGroup] = useState(() => new Set());
  const graphContainerGroupRef = useRef(null);
  const [graphSizeGroup, setGraphSizeGroup] = useState({ width: 800, height: 400 });
  const [graphZoomGroup, setGraphZoomGroup] = useState(1);
  const [panningGroup, setPanningGroup] = useState(false);
  const panStartGroupRef = useRef(null);
  const hasCenteredGroupRef = useRef(false);
  const [nodePositionsGroup, setNodePositionsGroup] = useState({});
  const [draggingNodeIdGroup, setDraggingNodeIdGroup] = useState(null);
  const graphSvgGroupRef = useRef(null);
  const draggedRefGroup = useRef(false);

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
  }, [groups, hasNoGroup]);

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

  const isExpandedGroup = useCallback((id) => {
    const level = levelMapGroup.get(id) ?? 0;
    if (collapsedNodesGroup.has(id)) return false;
    if (level <= 1) return true;
    return expandedNodesGroup.has(id);
  }, [levelMapGroup, collapsedNodesGroup, expandedNodesGroup]);

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
  }, [viewModeGroup]);

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
  }, [viewModeGroup]);

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
    const { nodes } = graphDataGroup;
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

  if (groups.length === 0) {
    return <p style={s.empty}>No site groups. Use the + button to add site groups.</p>;
  }

  if (viewModeGroup === 'graph') {
    return (
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
    );
  }

  if (viewModeGroup === 'ticket') {
    return (
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
    );
  }

  return (
    <div style={s.gridWrapper}>
      {selectedGroupIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            style={{ ...s.btn, ...s.btnDanger }}
            onClick={() => onDeleteSelectedGroups(selectedGroupIds)}
          >
            Delete selected ({selectedGroupIds.size})
          </button>
        </div>
      )}
      <div style={{ ...s.grid(gridColsGroups), ...s.gridHeader }}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={sortedGroups.length > 0 && sortedGroups.every((g) => selectedGroupIds.has(String(g.id)))}
            onChange={(e) => setSelectedGroupIds(e.target.checked ? new Set(sortedGroups.map((g) => String(g.id))) : new Set())}
            style={{ margin: 0 }}
          />
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
  );
}
