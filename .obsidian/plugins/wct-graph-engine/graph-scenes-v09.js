"use strict";

const {
  firstMeaningfulLetter,
  equationIdentity,
  scientificCompare,
} = require("./graph-text-v09");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sceneNode(core, node, x, y, options = {}) {
  const type = options.type ?? node.type;
  return {
    id: node.id,
    path: node.path,
    label: options.label ?? node.label,
    type,
    kind: options.kind ?? "note",
    degree: options.degree ?? node.degree ?? 0,
    x,
    y,
    size: options.size ?? clamp(5.2 + Math.log2((node.degree ?? 0) + 1) * 1.35, 5.2, 16),
    color: options.color ?? core.TYPE_COLORS[type] ?? core.TYPE_COLORS.Other,
    shape: options.shape ?? core.TYPE_SHAPES?.[type] ?? "circle",
    alwaysLabel: options.alwaysLabel ?? false,
    labelPriority: options.labelPriority ?? node.degree ?? 0,
    statuses: node.statuses,
    overallStatus: node.overallStatus,
    auditIssues: node.auditIssues ?? [],
    stableId: node.stableId,
    priorityRank: node.priorityRank,
    priorityScore: node.priorityProfile?.score,
  };
}

function areaNode(core, type, count, x, y, context = "objects", options = {}) {
  return {
    id: options.id ?? `area:${type}`,
    path: null,
    label: options.label ?? `${type}\n${count.toLocaleString()} ${context}`,
    type,
    kind: options.kind ?? "area",
    degree: count,
    x,
    y,
    size: options.size ?? clamp(21 + Math.log2(count + 1) * 2.9, 24, 46),
    color: options.color ?? core.TYPE_COLORS[type] ?? core.TYPE_COLORS.Other,
    shape: options.shape ?? core.TYPE_SHAPES?.[type] ?? "circle",
    alwaysLabel: true,
    labelPriority: options.labelPriority ?? 600000 + count,
    clusterKey: options.clusterKey,
  };
}

function buildFullScene(core, graph, settings) {
  const present = core.TYPE_ORDER.filter((type) => (graph.groups.get(type)?.length ?? 0) > 0);
  const root = {
    id: "corpus:wct-research",
    path: null,
    label: `WCT Research\n${graph.nodes.length.toLocaleString()} objects`,
    type: "WCT Research",
    kind: "corpus-root",
    degree: graph.nodes.length,
    x: 0,
    y: 0,
    size: 58,
    color: core.TYPE_COLORS["WCT Research"] ?? "#f0f4ff",
    shape: "hexagon",
    alwaysLabel: true,
    labelPriority: 1000000,
  };
  const nodes = [root];
  const edges = [];
  const previewPerType = clamp(Number(settings.fullPreviewPerType) || 28, 0, 80);

  present.forEach((type, typeIndex) => {
    const ids = graph.groups.get(type) ?? [];
    const angle = -Math.PI / 2 + (typeIndex / Math.max(1, present.length)) * Math.PI * 2;
    const center = { x: Math.cos(angle) * 1200, y: Math.sin(angle) * 800 };
    const hub = areaNode(core, type, ids.length, center.x, center.y, "objects", {
      id: `area:${type}`,
      kind: "area",
      size: 34 + Math.min(16, Math.log2(ids.length + 1) * 2),
    });
    nodes.push(hub);
    edges.push({ source: root.id, target: hub.id, relation: "contains", directed: true, weight: Math.max(2, Math.round(Math.log2(ids.length + 1))), showLabel: false, synthetic: true });

    ids.slice(0, previewPerType).forEach((id, index) => {
      const node = graph.byId.get(id);
      if (!node) return;
      const localAngle = index * 2.399963229728653;
      const radius = 62 + Math.sqrt(index + 1) * 31;
      nodes.push(sceneNode(core, node,
        center.x + Math.cos(localAngle) * radius,
        center.y + Math.sin(localAngle) * radius * 0.78,
        { alwaysLabel: index < 4, labelPriority: 250000 - index },
      ));
      edges.push({ source: hub.id, target: node.id, relation: "has-member", directed: true, weight: 1, synthetic: true });
    });
  });

  return {
    key: "full-v09",
    mode: "full",
    title: "WCT Research",
    nodes,
    edges,
    sourceNodeCount: graph.nodes.length,
    sourceEdgeCount: graph.edges.length,
    previewNodeCount: nodes.length - 1,
  };
}

function categoryClusterKey(node, type) {
  if (type === "Glossary") return firstMeaningfulLetter(node.label);
  if (type === "Equations") return equationIdentity(node.label).family;
  if (["Claims", "Theorems", "Derivations", "Contradictions"].includes(type)) {
    return node.sourcePaperLabel || node.frontmatter?.source_paper || "Unassigned source";
  }
  if (type === "Papers") {
    const date = Number(node.createdAt);
    return Number.isFinite(date) ? String(new Date(date).getUTCFullYear()) : "Unknown year";
  }
  if (type === "Repositories") return "Repositories";
  return firstMeaningfulLetter(node.label);
}

function clusterOrder(type, left, right) {
  if (type === "Equations") {
    const order = ["Master", "Canonical", "CLE", "CM", "TOP", "CORR", "Auxiliary", "Other"];
    return order.indexOf(left) - order.indexOf(right);
  }
  if (type === "Papers") return Number(right) - Number(left);
  return scientificCompare(left, right);
}

function buildCategoryScene(core, graph, type, settings) {
  const ids = (graph.groups.get(type) ?? []).slice(0, Number(settings.maxCategoryNodes) || 1200);
  const members = ids.map((id) => graph.byId.get(id)).filter(Boolean);
  const clusters = new Map();
  for (const node of members) {
    const key = categoryClusterKey(node, type);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(node);
  }
  const clusterEntries = [...clusters.entries()].sort(([left], [right]) => clusterOrder(type, left, right));
  const nodes = [areaNode(core, type, members.length, 0, 0, "objects", { size: 38 })];
  const edges = [];
  const columns = Math.max(1, Math.ceil(Math.sqrt(clusterEntries.length)));
  const spacingX = type === "Glossary" ? 430 : 520;
  const spacingY = type === "Glossary" ? 350 : 420;

  clusterEntries.forEach(([cluster, list], clusterIndex) => {
    const row = Math.floor(clusterIndex / columns);
    const column = clusterIndex % columns;
    const x = (column - (columns - 1) / 2) * spacingX;
    const rows = Math.ceil(clusterEntries.length / columns);
    const y = (row - (rows - 1) / 2) * spacingY + 130;
    const clusterId = `cluster:${type}:${cluster}`;
    const hub = areaNode(core, type, list.length, x, y, "objects", {
      id: clusterId,
      kind: "cluster-area",
      label: `${cluster}\n${list.length}`,
      size: clamp(15 + Math.log2(list.length + 1) * 2.4, 17, 31),
      clusterKey: cluster,
      labelPriority: 700000 - clusterIndex,
    });
    nodes.push(hub);
    edges.push({ source: `area:${type}`, target: clusterId, relation: "contains", directed: true, weight: 2, synthetic: true });

    list.forEach((node, index) => {
      const localAngle = index * 2.399963229728653;
      const radius = 44 + Math.sqrt(index + 1) * (type === "Glossary" ? 23 : 27);
      nodes.push(sceneNode(core, node,
        x + Math.cos(localAngle) * radius,
        y + Math.sin(localAngle) * radius * 0.78,
        {
          alwaysLabel: index < (type === "Equations" ? 12 : 8),
          labelPriority: 400000 - clusterIndex * 1000 - index,
        },
      ));
      edges.push({ source: clusterId, target: node.id, relation: "has-member", directed: true, weight: 1, synthetic: true });
    });
  });

  const selected = new Set(ids);
  const internal = graph.edges
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((a, b) => (b.relation !== "links" ? 1 : 0) - (a.relation !== "links" ? 1 : 0) || b.weight - a.weight)
    .slice(0, Math.min(1800, ids.length * 8))
    .map((edge) => ({ ...edge, showLabel: type === "Equations" && edge.relation !== "links" }));

  return {
    key: `category-v09:${type}`,
    mode: "category",
    title: type,
    type,
    nodes,
    edges: [...edges, ...internal],
    sourceNodeCount: members.length,
    sourceEdgeCount: internal.length,
    sortedBy: type === "Glossary" ? "alphabet" : type === "Equations" ? "equation family and ID" : "source and name",
  };
}

function relationForPair(graph, centerId, otherId) {
  const outgoing = (graph.outgoing.get(centerId) ?? []).find((edge) => edge.target === otherId);
  if (outgoing) return { edge: outgoing, direction: "out" };
  const incoming = (graph.incoming.get(centerId) ?? []).find((edge) => edge.source === otherId);
  if (incoming) return { edge: incoming, direction: "in" };
  const ordinary = graph.edges.find((edge) => !edge.directed && ((edge.source === centerId && edge.target === otherId) || (edge.target === centerId && edge.source === otherId)));
  return ordinary ? { edge: ordinary, direction: "both" } : { edge: { relation: "links", weight: 1 }, direction: "both" };
}

function buildConnectionScene(core, graph, centerId, settings) {
  const center = graph.byId.get(centerId);
  if (!center) return null;
  const neighbors = [...(graph.adjacency.get(centerId) ?? [])]
    .map((id) => graph.byId.get(id))
    .filter(Boolean)
    .slice(0, Number(settings.maxConnectionNodes) || 140);
  const grouped = new Map();
  for (const node of neighbors) {
    const relation = relationForPair(graph, centerId, node.id);
    const key = `${relation.edge.relation}|${node.type}|${relation.direction}`;
    if (!grouped.has(key)) grouped.set(key, { relation: relation.edge.relation, type: node.type, direction: relation.direction, nodes: [] });
    grouped.get(key).nodes.push(node);
  }
  const groups = [...grouped.values()].sort((a, b) => a.relation.localeCompare(b.relation) || core.TYPE_ORDER.indexOf(a.type) - core.TYPE_ORDER.indexOf(b.type));
  const nodes = [sceneNode(core, center, 0, 0, { size: 31, alwaysLabel: true, labelPriority: 900000 })];
  const edges = [];

  groups.forEach((group, groupIndex) => {
    const angle = -Math.PI / 2 + (groupIndex / Math.max(1, groups.length)) * Math.PI * 2;
    const x = Math.cos(angle) * 680;
    const y = Math.sin(angle) * 500;
    const direction = group.direction === "out" ? "→" : group.direction === "in" ? "←" : "↔";
    const hubId = `relation:${centerId}:${group.relation}:${group.type}:${group.direction}`;
    nodes.push(areaNode(core, group.type, group.nodes.length, x, y, "connected", {
      id: hubId,
      kind: "relation-area",
      label: `${direction} ${group.relation.replace(/-/g, " ")}\n${group.type} · ${group.nodes.length}`,
      size: 23,
      labelPriority: 800000 - groupIndex,
    }));
    edges.push({ source: centerId, target: hubId, relation: group.relation, directed: group.direction !== "both", weight: 3, showLabel: true, synthetic: true });

    group.nodes.sort((a, b) => scientificCompare(a.label, b.label)).forEach((node, index) => {
      const localAngle = index * 2.399963229728653;
      const radius = 62 + Math.sqrt(index + 1) * 28;
      nodes.push(sceneNode(core, node,
        x + Math.cos(localAngle) * radius,
        y + Math.sin(localAngle) * radius * 0.8,
        { alwaysLabel: index < 8, labelPriority: 500000 - groupIndex * 100 - index },
      ));
      const pair = relationForPair(graph, centerId, node.id);
      edges.push({
        source: pair.direction === "in" ? node.id : centerId,
        target: pair.direction === "in" ? centerId : node.id,
        relation: pair.edge.relation,
        directed: Boolean(pair.edge.directed),
        weight: pair.edge.weight ?? 1,
        showLabel: pair.edge.relation !== "links",
      });
    });
  });

  return {
    key: `connections-v09:${centerId}`,
    mode: "connections",
    title: center.label,
    focusId: centerId,
    nodes,
    edges,
    sourceNodeCount: neighbors.length + 1,
    sourceEdgeCount: edges.length,
  };
}

module.exports = {
  sceneNode,
  areaNode,
  buildFullScene,
  buildCategoryScene,
  buildConnectionScene,
};