"use strict";

const RELATION_ALIASES = {
  defines: "defines",
  defined_by: "defined-by",
  "defined-by": "defined-by",
  derives: "derives",
  derived_from: "derived-from",
  "derived-from": "derived-from",
  uses: "uses",
  used_by: "used-by",
  "used-by": "used-by",
  predicts: "predicts",
  predicted_by: "predicted-by",
  "predicted-by": "predicted-by",
  tests: "tests",
  tested_by: "tested-by",
  "tested-by": "tested-by",
  implements: "implements",
  implemented_by: "implemented-by",
  "implemented-by": "implemented-by",
  supports: "supports",
  supported_by: "supported-by",
  "supported-by": "supported-by",
  contradicts: "contradicts",
  cites: "cites",
  depends_on: "depends-on",
  "depends-on": "depends-on",
  refines: "refines",
  extends: "extends",
};

const RELATION_COLORS = {
  links: "#7f8da3",
  defines: "#43b66f",
  "defined-by": "#43b66f",
  derives: "#e25a52",
  "derived-from": "#e25a52",
  uses: "#4f86e8",
  "used-by": "#4f86e8",
  predicts: "#e6b52e",
  "predicted-by": "#e6b52e",
  tests: "#24b8c5",
  "tested-by": "#24b8c5",
  implements: "#e15f94",
  "implemented-by": "#e15f94",
  supports: "#8ca52e",
  "supported-by": "#8ca52e",
  contradicts: "#d94f4f",
  cites: "#8993a2",
  "depends-on": "#f09a34",
  refines: "#9b59d0",
  extends: "#9b59d0",
};

const STATUS_COLORS = {
  pass: "#35c46a",
  conditional: "#e8bd37",
  definition: "#4f86e8",
  open: "#f09a34",
  fail: "#e05252",
  contradicted: "#e05252",
  untested: "#9b59d0",
  empirical: "#24b8c5",
  unreviewed: "#7f8793",
};

const AUDIT_DEFINITIONS = [
  {
    key: "undefined-glossary",
    label: "Glossary terms missing definitions",
    description: "Concept or glossary notes without a Definition heading or definition field.",
    severity: "high",
  },
  {
    key: "equation-no-derivation",
    label: "Equations missing derivation links",
    description: "Equation notes without derives, derived-from, or depends-on relations.",
    severity: "high",
  },
  {
    key: "paper-pdf-no-derivations",
    label: "PDF papers missing imported derivations",
    description: "Paper notes with a pdf_url but no connected page-provenance PDF derivation object. Run WCT Graph Engine: Import PDF Research Objects.",
    severity: "high",
  },
  {
    key: "equation-no-implementation",
    label: "Equations missing implementation links",
    description: "Equation notes not linked to SymPy, Lean, code, or implementation notes.",
    severity: "medium",
  },
  {
    key: "prediction-untested",
    label: "Predictions without experiments",
    description: "Prediction notes without tests or tested-by relations.",
    severity: "high",
  },
  {
    key: "experiment-no-evidence",
    label: "Experiments without evidence links",
    description: "Experiment notes without supports, supported-by, evidence, or results relations.",
    severity: "medium",
  },
  {
    key: "paper-no-equations",
    label: "Papers without equation links",
    description: "Paper notes with no direct graph connection to an equation note.",
    severity: "medium",
  },
  {
    key: "unreviewed-validation",
    label: "Unreviewed validation state",
    description: "Notes with no recorded symbolic, formal, physical, or experimental status.",
    severity: "low",
  },
];

const normalizeKey = (value) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "_");

function normalizeStatus(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "unreviewed";
  if (["pass", "passed", "verified", "proved", "proven", "complete"].includes(raw)) return "pass";
  if (["conditional", "condition", "assumption", "assumption-dependent"].includes(raw)) return "conditional";
  if (["definition", "defined", "axiom", "axiomatic"].includes(raw)) return "definition";
  if (["open", "pending", "incomplete", "unknown"].includes(raw)) return "open";
  if (["fail", "failed", "false", "invalid"].includes(raw)) return "fail";
  if (["contradicted", "counterexample"].includes(raw)) return "contradicted";
  if (["untested", "not-tested"].includes(raw)) return "untested";
  if (["empirical", "observed", "candidate"].includes(raw)) return "empirical";
  return raw.replace(/\s+/g, "-");
}

function extractStatuses(frontmatter = {}) {
  return {
    symbolic: normalizeStatus(frontmatter.symbolic_status ?? frontmatter.sympy_status ?? frontmatter.symbolic),
    formal: normalizeStatus(frontmatter.formal_status ?? frontmatter.lean_status ?? frontmatter.formal),
    physical: normalizeStatus(frontmatter.physical_status ?? frontmatter.physics_status ?? frontmatter.physical),
    experimental: normalizeStatus(frontmatter.experimental_status ?? frontmatter.experiment_status ?? frontmatter.experimental),
  };
}

function overallStatus(statuses) {
  const values = Object.values(statuses ?? {});
  const priority = ["fail", "contradicted", "open", "conditional", "untested", "definition", "empirical", "pass", "unreviewed"];
  return priority.find((status) => values.includes(status)) ?? "unreviewed";
}

function listValues(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(listValues);
  if (typeof value === "string") return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "object") return Object.values(value).flatMap(listValues);
  return [String(value)];
}

function extractRelations(frontmatter = {}) {
  const relations = [];
  const sources = [];
  if (frontmatter.relations && typeof frontmatter.relations === "object") sources.push(frontmatter.relations);
  sources.push(frontmatter);

  for (const source of sources) {
    for (const [rawKey, rawValue] of Object.entries(source ?? {})) {
      const relation = RELATION_ALIASES[normalizeKey(rawKey)];
      if (!relation) continue;
      for (const target of listValues(rawValue)) relations.push({ relation, target });
    }
  }

  const seen = new Set();
  return relations.filter((item) => {
    const key = `${item.relation}\u0000${item.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fileMetadata(app, file) {
  const cache = app.metadataCache.getFileCache(file) ?? {};
  const frontmatter = cache.frontmatter ?? {};
  const headings = new Set((cache.headings ?? []).map((heading) => String(heading.heading ?? "").trim().toLowerCase()));
  const statuses = extractStatuses(frontmatter);
  return {
    frontmatter,
    headings,
    statuses,
    overallStatus: overallStatus(statuses),
    relations: extractRelations(frontmatter),
  };
}

function resolveRelationTarget(app, sourcePath, target, fileByPath) {
  const cleaned = String(target ?? "")
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .split("|")[0]
    .trim();
  if (!cleaned) return null;
  if (fileByPath.has(cleaned)) return cleaned;
  if (fileByPath.has(`${cleaned}.md`)) return `${cleaned}.md`;
  const destination = app.metadataCache.getFirstLinkpathDest?.(cleaned, sourcePath);
  return destination && fileByPath.has(destination.path) ? destination.path : null;
}

function buildExplicitRelationEdges(app, files, fileByPath, metadataByPath) {
  const edges = [];
  for (const file of files) {
    const metadata = metadataByPath.get(file.path);
    for (const relation of metadata?.relations ?? []) {
      const target = resolveRelationTarget(app, file.path, relation.target, fileByPath);
      if (!target || target === file.path) continue;
      edges.push({
        source: file.path,
        target,
        relation: relation.relation,
        directed: true,
        weight: 2,
      });
    }
  }
  return edges;
}

function hasRelation(graph, nodeId, names) {
  const set = new Set(names);
  return (graph.outgoing.get(nodeId) ?? []).some((edge) => set.has(edge.relation))
    || (graph.incoming.get(nodeId) ?? []).some((edge) => set.has(edge.relation));
}

function hasConnectedType(graph, nodeId, type) {
  return [...(graph.adjacency.get(nodeId) ?? [])]
    .some((id) => graph.byId.get(id)?.type === type);
}

function hasConnectedPdfDerivation(graph, nodeId) {
  return [...(graph.adjacency.get(nodeId) ?? [])].some((id) => {
    const candidate = graph.byId.get(id);
    return candidate?.type === "Derivations"
      && String(candidate.frontmatter?.source_kind ?? "").toLowerCase() === "pdf";
  });
}

function buildAuditIssues(graph) {
  const issues = AUDIT_DEFINITIONS.map((definition) => ({ ...definition, nodeIds: [] }));
  const byKey = new Map(issues.map((issue) => [issue.key, issue]));

  for (const node of graph.nodes) {
    const headings = node.headings ?? new Set();
    const frontmatter = node.frontmatter ?? {};
    const statuses = Object.values(node.statuses ?? {});

    if (node.type === "Glossary" && !headings.has("definition") && !frontmatter.definition) {
      byKey.get("undefined-glossary").nodeIds.push(node.id);
    }

    if (node.type === "Equations" && !hasRelation(graph, node.id, ["derives", "derived-from", "depends-on"])) {
      byKey.get("equation-no-derivation").nodeIds.push(node.id);
    }

    if (node.type === "Equations" && !hasRelation(graph, node.id, ["implements", "implemented-by"])) {
      byKey.get("equation-no-implementation").nodeIds.push(node.id);
    }

    if (node.type === "Predictions" && !hasRelation(graph, node.id, ["tests", "tested-by"])) {
      byKey.get("prediction-untested").nodeIds.push(node.id);
    }

    if (node.type === "Experiments" && !hasRelation(graph, node.id, ["supports", "supported-by", "tests", "tested-by"])) {
      byKey.get("experiment-no-evidence").nodeIds.push(node.id);
    }

    if (node.type === "Papers") {
      if (!hasConnectedType(graph, node.id, "Equations")) {
        byKey.get("paper-no-equations").nodeIds.push(node.id);
      }
      if (frontmatter.pdf_url && !hasConnectedPdfDerivation(graph, node.id)) {
        byKey.get("paper-pdf-no-derivations").nodeIds.push(node.id);
      }
    }

    if (statuses.every((status) => status === "unreviewed")) {
      byKey.get("unreviewed-validation").nodeIds.push(node.id);
    }
  }

  return issues.filter((issue) => issue.nodeIds.length > 0);
}

module.exports = {
  RELATION_ALIASES,
  RELATION_COLORS,
  STATUS_COLORS,
  AUDIT_DEFINITIONS,
  normalizeStatus,
  extractStatuses,
  overallStatus,
  extractRelations,
  fileMetadata,
  buildExplicitRelationEdges,
  buildAuditIssues,
};