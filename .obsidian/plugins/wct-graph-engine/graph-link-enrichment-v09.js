"use strict";

const {
  normalizeScientificText,
  normalizeSearch,
  equationIdentity,
} = require("./graph-text-v09");

const EQUATION_ID_RE = /\b(?:M\d+[A-Z]?|E\d+[A-Z]?|CLE\d+|CM\d+|TOP\d+|CORR\d+|G1|EX|EY|EZ|FA)\b/gi;
const GENERIC_GLOSSARY = new Set([
  "model", "system", "state", "field", "result", "data", "method", "control", "analysis",
  "energy", "mass", "time", "space", "phase", "wave", "theory", "equation", "paper", "reference",
]);

function aliasesFor(node) {
  const values = [node.label];
  const aliases = node.frontmatter?.aliases;
  if (Array.isArray(aliases)) values.push(...aliases);
  else if (typeof aliases === "string") values.push(...aliases.split(/[,;\n]/));
  return [...new Set(values.map((value) => normalizeScientificText(value, { singleLine: true })).filter(Boolean))];
}

function glossaryCandidates(nodes) {
  const result = [];
  for (const node of nodes) {
    if (node.type !== "Glossary") continue;
    for (const alias of aliasesFor(node)) {
      const normalized = normalizeSearch(alias);
      if (normalized.length < 4 || GENERIC_GLOSSARY.has(normalized)) continue;
      result.push({ node, alias, normalized, words: normalized.split(" ").length });
    }
  }
  result.sort((a, b) => b.normalized.length - a.normalized.length || a.alias.localeCompare(b.alias));
  return result;
}

function containsPhrase(normalizedContent, phrase) {
  return Boolean(normalizedContent && phrase && (` ${normalizedContent} `).includes(` ${phrase} `));
}

function inferGlossaryEdges(nodes, contents, settings) {
  const candidates = glossaryCandidates(nodes);
  const edges = [];
  const counts = new Map();
  for (const node of nodes) {
    if (node.type === "Glossary") continue;
    const raw = node.virtual ? node.virtualContent : contents.get(node.id);
    const normalized = normalizeSearch(`${node.label}\n${raw ?? ""}`);
    if (!normalized) continue;
    const max = node.type === "References" || node.type === "Papers"
      ? Number(settings.glossaryMentionLimit) || 80
      : node.virtual ? 40 : 28;
    const targets = new Set();
    for (const candidate of candidates) {
      if (candidate.node.id === node.id || targets.has(candidate.node.id)) continue;
      if (!containsPhrase(normalized, candidate.normalized)) continue;
      targets.add(candidate.node.id);
      edges.push({
        source: node.id,
        target: candidate.node.id,
        relation: "mentions",
        directed: true,
        weight: candidate.words > 1 ? 2 : 1,
        inferred: true,
      });
      if (targets.size >= max) break;
    }
    if (targets.size) counts.set(node.id, targets.size);
  }
  return { edges, counts };
}

function equationIndex(nodes, contents) {
  const index = new Map();
  for (const node of nodes) {
    if (node.type !== "Equations") continue;
    const content = contents.get(node.id) ?? "";
    const identities = new Set([
      equationIdentity(node.label).id,
      equationIdentity(node.path).id,
      ...((`${node.label}\n${content}`).match(EQUATION_ID_RE) ?? []).map((id) => id.toUpperCase()),
    ].filter(Boolean));
    for (const id of identities) {
      if (!index.has(id)) index.set(id, []);
      index.get(id).push(node.id);
    }
  }
  return index;
}

function inferEquationEdges(nodes, contents) {
  const index = equationIndex(nodes, contents);
  const edges = [];
  for (const node of nodes) {
    if (!["Papers", "Claims", "Theorems", "Derivations", "Contradictions", "Experiments", "Predictions"].includes(node.type)) continue;
    const content = node.virtual ? node.virtualContent : contents.get(node.id) ?? "";
    const ids = [...new Set((`${node.label}\n${content}`).match(EQUATION_ID_RE) ?? [])].map((id) => id.toUpperCase());
    for (const equationId of ids) {
      for (const target of index.get(equationId) ?? []) {
        if (target === node.id) continue;
        const relation = node.type === "Derivations" ? "derives"
          : node.type === "Contradictions" ? "contradicts"
            : node.type === "Experiments" ? "tests"
              : "uses";
        edges.push({
          source: node.id,
          target,
          relation,
          directed: true,
          weight: 2,
          inferred: true,
          equationId,
        });
      }
    }
  }
  return edges;
}

module.exports = {
  glossaryCandidates,
  inferGlossaryEdges,
  inferEquationEdges,
};