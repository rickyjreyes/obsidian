"use strict";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function timelineBounds(graph) {
  const dates = graph.nodes
    .map((node) => Number(node.createdAt))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  if (!dates.length) {
    const now = Date.now();
    return { min: now, max: now, dates: [now] };
  }
  return { min: dates[0], max: dates[dates.length - 1], dates };
}

function noteNode(core, node, x, y, options = {}) {
  return {
    id: node.id,
    path: node.path,
    label: node.label,
    type: node.type,
    kind: "note",
    degree: node.degree ?? 0,
    x,
    y,
    timelineX: x,
    createdAt: node.createdAt,
    dateSource: node.dateSource,
    stableId: node.stableId,
    size: options.size ?? clamp(4.8 + Math.log2((node.degree ?? 0) + 1) * 1.4, 4.8, 14.5),
    color: core.TYPE_COLORS[node.type] ?? core.TYPE_COLORS.Other,
    alwaysLabel: options.alwaysLabel ?? false,
    labelPriority: options.labelPriority ?? node.degree ?? 0,
    statuses: node.statuses,
    overallStatus: node.overallStatus,
    auditIssues: node.auditIssues ?? [],
  };
}

function edgeScore(graph, edge) {
  const source = graph.byId.get(edge.source);
  const target = graph.byId.get(edge.target);
  if (!source || !target) return -Infinity;
  const typed = edge.relation && edge.relation !== "links" ? 14 : 0;
  return typed + Math.max(1, edge.weight ?? 1) * 5 + Math.log2((source.degree ?? 0) + 2) + Math.log2((target.degree ?? 0) + 2);
}

function buildTimelineScene(core, graph, settings, cutoff) {
  const bounds = timelineBounds(graph);
  const effectiveCutoff = Number.isFinite(cutoff) ? cutoff : bounds.max;
  const maxNodes = Math.max(100, Number(settings.timelineMaxNodes) || 2200);

  const eligible = graph.nodes
    .filter((node) => Number(node.createdAt) <= effectiveCutoff)
    .sort((a, b) => Number(a.createdAt) - Number(b.createdAt) || (b.degree ?? 0) - (a.degree ?? 0));

  const selected = eligible.length > maxNodes
    ? eligible
      .sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0) || Number(a.createdAt) - Number(b.createdAt))
      .slice(0, maxNodes)
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
    : eligible;

  const selectedIds = new Set(selected.map((node) => node.id));
  const typeIndex = new Map(core.TYPE_ORDER.map((type, index) => [type, index]));
  const typeCount = Math.max(1, core.TYPE_ORDER.length);
  const span = Math.max(1, bounds.max - bounds.min);
  const nodes = selected.map((node, index) => {
    const progress = clamp((Number(node.createdAt) - bounds.min) / span, 0, 1);
    const x = -980 + progress * 1960;
    const lane = typeIndex.get(node.type) ?? typeCount - 1;
    const laneY = (lane - (typeCount - 1) / 2) * 78;
    const jitter = ((core.hashString(`${node.id}:timeline`) % 1000) / 1000 - 0.5) * 52;
    return noteNode(core, node, x, laneY + jitter, {
      alwaysLabel: index < 18 || node.degree > 20,
      labelPriority: node.degree + (index < 18 ? 180000 - index : 0),
    });
  });

  const edges = graph.edges
    .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .sort((a, b) => edgeScore(graph, b) - edgeScore(graph, a))
    .slice(0, Math.min(Number(settings.fullEdgeBudget) || 1700, 2200));

  return {
    key: `timeline:${Math.round(effectiveCutoff)}`,
    mode: "timeline",
    title: "Idea timeline",
    nodes,
    edges,
    cutoff: effectiveCutoff,
    minDate: bounds.min,
    maxDate: bounds.max,
    sourceNodeCount: selected.length,
    eligibleNodeCount: eligible.length,
    sourceEdgeCount: edges.length,
  };
}

module.exports = { timelineBounds, buildTimelineScene };