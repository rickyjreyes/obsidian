"use strict";

function parseQuery(query) {
  const tokens = [];
  const pattern = /(\w+):(?:"([^"]+)"|'([^']+)'|([^\s]+))|"([^"]+)"|'([^']+)'|([^\s]+)/g;
  let match;
  while ((match = pattern.exec(query))) {
    if (match[1]) {
      tokens.push({ key: match[1].toLowerCase(), value: match[2] ?? match[3] ?? match[4] ?? "" });
    } else {
      tokens.push({ key: "text", value: match[5] ?? match[6] ?? match[7] ?? "" });
    }
  }
  return tokens;
}

function parseDate(value) {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function nodeMatches(node, tokens) {
  const statusText = [node.overallStatus, ...Object.values(node.statuses ?? {})].join(" ").toLowerCase();
  const text = [
    node.label,
    node.path,
    node.type,
    node.stableId,
    statusText,
    ...(node.auditIssues ?? []),
  ].join(" ").toLowerCase();

  return tokens.every(({ key, value }) => {
    const normalized = String(value).toLowerCase();
    if (key === "text") return text.includes(normalized);
    if (key === "id" || key === "uuid") return String(node.stableId ?? "").toLowerCase().includes(normalized);
    if (key === "type") return String(node.type ?? "").toLowerCase().includes(normalized);
    if (key === "status") return statusText.includes(normalized);
    if (key === "path") return String(node.path ?? "").toLowerCase().includes(normalized);
    if (key === "audit") return (node.auditIssues ?? []).some((issue) => issue.toLowerCase().includes(normalized));
    if (key === "after") {
      const date = parseDate(value);
      return date == null || Number(node.createdAt) >= date;
    }
    if (key === "before") {
      const date = parseDate(value);
      return date == null || Number(node.createdAt) <= date;
    }
    return text.includes(`${key}:${normalized}`) || text.includes(normalized);
  });
}

function sceneNode(core, node, x, y, direct, index) {
  return {
    id: node.id,
    path: node.path,
    label: node.label,
    type: node.type,
    kind: "note",
    degree: node.degree ?? 0,
    x,
    y,
    size: direct
      ? core.clamp(13 + Math.log2((node.degree ?? 0) + 1) * 1.5, 14, 24)
      : core.clamp(4.8 + Math.log2((node.degree ?? 0) + 1) * 1.4, 4.8, 14),
    color: core.TYPE_COLORS[node.type] ?? core.TYPE_COLORS.Other,
    alwaysLabel: direct || index < 3,
    labelPriority: direct ? 400000 + (node.degree ?? 0) : node.degree ?? 0,
    statuses: node.statuses,
    overallStatus: node.overallStatus,
    auditIssues: node.auditIssues ?? [],
  };
}

function buildSearchScene(core, graph, query, settings) {
  const tokens = parseQuery(query);
  const matches = graph.nodes
    .filter((node) => nodeMatches(node, tokens))
    .sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0) || a.label.localeCompare(b.label))
    .slice(0, 60);

  const selected = new Set(matches.map((node) => node.id));
  for (const match of matches) {
    for (const id of [...(graph.adjacency.get(match.id) ?? [])]
      .sort((a, b) => (graph.byId.get(b)?.degree ?? 0) - (graph.byId.get(a)?.degree ?? 0))) {
      if (selected.size >= 260) break;
      selected.add(id);
    }
    if (selected.size >= 260) break;
  }

  const grouped = new Map(core.TYPE_ORDER.map((type) => [type, []]));
  for (const id of selected) {
    const node = graph.byId.get(id);
    if (!node) continue;
    if (!grouped.has(node.type)) grouped.set(node.type, []);
    grouped.get(node.type).push(node);
  }
  const matchIds = new Set(matches.map((node) => node.id));
  const present = [...grouped.entries()].filter(([, list]) => list.length).map(([type]) => type);
  const nodes = [];

  present.forEach((type, index) => {
    const list = grouped.get(type);
    const angle = -Math.PI / 2 + (index / Math.max(1, present.length)) * Math.PI * 2;
    const anchorX = Math.cos(angle) * 650;
    const anchorY = Math.sin(angle) * 470;
    list.forEach((node, localIndex) => {
      const localAngle = localIndex * 2.399963229728653;
      const radius = 30 + Math.sqrt(localIndex + 1) * 28;
      nodes.push(sceneNode(
        core,
        node,
        anchorX + Math.cos(localAngle) * radius,
        anchorY + Math.sin(localAngle) * radius * 0.82,
        matchIds.has(node.id),
        localIndex,
      ));
    });
  });

  const edges = graph.edges
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((a, b) => {
      const typedA = a.relation !== "links" ? 10 : 0;
      const typedB = b.relation !== "links" ? 10 : 0;
      return typedB + (b.weight ?? 1) - typedA - (a.weight ?? 1);
    })
    .slice(0, 1000);

  return {
    key: `search:${query.trim().toLowerCase()}`,
    mode: "search",
    title: `Search: ${query}`,
    query,
    nodes,
    edges,
    sourceNodeCount: matches.length,
    sourceEdgeCount: edges.length,
    noMatches: matches.length === 0,
  };
}

module.exports = { buildSearchScene, parseQuery, nodeMatches };