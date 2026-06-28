"use strict";

const { buildAuditIssues, AUDIT_DEFINITIONS } = require("./graph-research");
const { scientificCompare, equationCompare } = require("./graph-text-v09");

const EQUATION_ID_PATTERN = /\b(?:M\d+[A-Z]?|E\d+[A-Z]?|CLE\d+|CM\d+|TOP\d+|CORR\d+|G1|EX|EY|EZ|FA)\b/g;

function equationIds(value) {
  return [...new Set(String(value ?? "").toUpperCase().match(EQUATION_ID_PATTERN) ?? [])];
}

function nodeText(node) {
  return [node.label, node.path, node.virtualContent, JSON.stringify(node.frontmatter ?? {})].join(" ");
}

function edgeKey(edge) {
  return `${edge.source}\u0000${edge.target}\u0000${edge.relation}\u0000${edge.directed ? 1 : 0}`;
}

function refreshAuditIssues(graph) {
  const standardKeys = new Set(AUDIT_DEFINITIONS.map((definition) => definition.key));
  const supplemental = (graph.auditIssues ?? []).filter((issue) => !standardKeys.has(issue.key));
  graph.auditIssues = [...buildAuditIssues(graph), ...supplemental];
  graph.auditByKey = new Map(graph.auditIssues.map((issue) => [issue.key, issue]));
  for (const node of graph.nodes) node.auditIssues = [];
  for (const issue of graph.auditIssues) {
    for (const id of issue.nodeIds ?? []) graph.byId.get(id)?.auditIssues.push(issue.key);
  }
  return graph;
}

function sortGroup(graph, type, ids) {
  ids.sort((left, right) => {
    const a = graph.byId.get(left);
    const b = graph.byId.get(right);
    if (!a || !b) return 0;
    if (type === "Glossary") return scientificCompare(a.label, b.label);
    if (type === "Equations") return equationCompare(a.label, b.label);
    if (["Claims", "Theorems", "Derivations", "Contradictions"].includes(type)) {
      return scientificCompare(a.sourcePaperLabel ?? a.frontmatter?.source_paper ?? "", b.sourcePaperLabel ?? b.frontmatter?.source_paper ?? "")
        || Number(a.sourceIndex ?? a.frontmatter?.source_index ?? 0) - Number(b.sourceIndex ?? b.frontmatter?.source_index ?? 0)
        || scientificCompare(a.label, b.label);
    }
    return (b.degree ?? 0) - (a.degree ?? 0) || scientificCompare(a.label, b.label);
  });
}

function linkDerivationsByEquationId(graph) {
  const equationsById = new Map();
  const derivationsById = new Map();

  for (const node of graph.nodes) {
    const ids = equationIds(nodeText(node));
    const destination = node.type === "Equations"
      ? equationsById
      : node.type === "Derivations"
        ? derivationsById
        : null;
    if (!destination) continue;
    for (const id of ids) {
      if (!destination.has(id)) destination.set(id, []);
      destination.get(id).push(node);
    }
  }

  const existing = new Set(graph.edges.map(edgeKey));
  let added = 0;
  for (const [id, derivations] of derivationsById) {
    const equations = equationsById.get(id) ?? [];
    for (const derivation of derivations) {
      for (const equation of equations) {
        if (derivation.id === equation.id) continue;
        const edge = {
          source: derivation.id,
          target: equation.id,
          relation: "derives",
          directed: true,
          weight: 2,
          inferred: true,
          inference: `shared-equation-id:${id}`,
          equationId: id,
        };
        const key = edgeKey(edge);
        if (existing.has(key)) continue;
        existing.add(key);
        graph.edges.push(edge);
        graph.adjacency.get(derivation.id)?.add(equation.id);
        graph.adjacency.get(equation.id)?.add(derivation.id);
        graph.outgoing.get(derivation.id)?.push(edge);
        graph.incoming.get(equation.id)?.push(edge);
        derivation.degree = (derivation.degree ?? 0) + edge.weight;
        equation.degree = (equation.degree ?? 0) + edge.weight;
        added += 1;
      }
    }
  }

  for (const [type, ids] of graph.groups ?? []) sortGroup(graph, type, ids);

  graph.inferredDerivationEdges = added;
  refreshAuditIssues(graph);
  return graph;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\[\[[^\]]+\]\]/g, " ")
    .replace(/[^a-z0-9α-ω]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mentionedGlossary(graph, node, content, limit = 12) {
  const text = ` ${normalize(content)} `;
  if (!text.trim()) return [];
  return graph.nodes
    .filter((candidate) => candidate.type === "Glossary" && candidate.id !== node.id)
    .map((candidate) => ({ candidate, term: normalize(candidate.label) }))
    .filter(({ term }) => term.length >= 4 && term.split(" ").length <= 7 && text.includes(` ${term} `))
    .sort((a, b) => b.term.length - a.term.length || scientificCompare(a.candidate.label, b.candidate.label))
    .slice(0, limit)
    .map(({ candidate }) => ({
      node: candidate,
      relation: "mentioned",
      relationLabel: "mentioned in text",
    }));
}

module.exports = {
  equationIds,
  refreshAuditIssues,
  linkDerivationsByEquationId,
  mentionedGlossary,
};