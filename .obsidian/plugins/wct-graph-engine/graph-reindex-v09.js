"use strict";

const { buildAuditIssues } = require("./graph-research");
const { scientificCompare, equationCompare } = require("./graph-text-v09");

function edgeKey(edge) {
  if (edge.directed) return `${edge.source}\u0000${edge.target}\u0000${edge.relation}\u00001`;
  const pair = [edge.source, edge.target].sort();
  return `${pair[0]}\u0000${pair[1]}\u0000${edge.relation}\u00000`;
}

function dedupeEdges(edges, nodeIds) {
  const map = new Map();
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) continue;
    const normalized = {
      ...edge,
      relation: edge.relation ?? "links",
      directed: Boolean(edge.directed),
      weight: Math.max(1, Number(edge.weight) || 1),
    };
    const key = edgeKey(normalized);
    const existing = map.get(key);
    if (existing) existing.weight += normalized.weight;
    else map.set(key, normalized);
  }
  return [...map.values()];
}

function compareNodes(byId, left, right, type) {
  const a = byId.get(left);
  const b = byId.get(right);
  if (!a || !b) return 0;
  if (type === "Glossary") return scientificCompare(a.label, b.label);
  if (type === "Equations") return equationCompare(a.label, b.label);
  if (["Claims", "Theorems", "Derivations", "Contradictions"].includes(type)) {
    return scientificCompare(a.sourcePaperLabel ?? "", b.sourcePaperLabel ?? "")
      || Number(a.sourceIndex ?? 0) - Number(b.sourceIndex ?? 0)
      || scientificCompare(a.label, b.label);
  }
  if (type === "Papers") {
    return Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0)
      || scientificCompare(a.label, b.label);
  }
  return scientificCompare(a.label, b.label);
}

function rebuildGraph(core, graph, nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const nodeIds = new Set(byId.keys());
  const filteredEdges = dedupeEdges(edges, nodeIds);
  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  const degree = new Map(nodes.map((node) => [node.id, 0]));

  for (const edge of filteredEdges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + edge.weight);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + edge.weight);
    if (edge.directed) {
      outgoing.get(edge.source)?.push(edge);
      incoming.get(edge.target)?.push(edge);
    }
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;

  const groups = new Map(core.TYPE_ORDER.map((type) => [type, []]));
  for (const node of nodes) {
    if (!groups.has(node.type)) groups.set(node.type, []);
    groups.get(node.type).push(node.id);
  }
  for (const [type, ids] of groups) ids.sort((left, right) => compareNodes(byId, left, right, type));

  const rebuilt = {
    ...graph,
    nodes,
    edges: filteredEdges,
    byId,
    adjacency,
    outgoing,
    incoming,
    groups,
    byStableId: new Map(nodes.filter((node) => node.stableId).map((node) => [node.stableId, node.id])),
  };
  rebuilt.auditIssues = buildAuditIssues(rebuilt);
  rebuilt.auditByKey = new Map(rebuilt.auditIssues.map((issue) => [issue.key, issue]));
  for (const node of nodes) node.auditIssues = [];
  for (const issue of rebuilt.auditIssues) {
    for (const id of issue.nodeIds) byId.get(id)?.auditIssues.push(issue.key);
  }
  return rebuilt;
}

async function readNodeContents(app, nodes) {
  const result = new Map();
  const real = nodes.filter((node) => node.path && !node.virtual);
  const batchSize = 48;
  for (let offset = 0; offset < real.length; offset += batchSize) {
    const batch = real.slice(offset, offset + batchSize);
    const values = await Promise.all(batch.map(async (node) => {
      try {
        const file = node.file ?? app.vault.getAbstractFileByPath(node.path);
        return [node.id, file ? await app.vault.cachedRead(file) : ""];
      } catch (error) {
        console.warn(`[WCT enrichment] Could not read ${node.path}`, error);
        return [node.id, ""];
      }
    }));
    for (const [id, content] of values) result.set(id, content);
  }
  return result;
}

module.exports = {
  rebuildGraph,
  readNodeContents,
};