"use strict";

const STATUS_WEIGHTS = {
  pass: 1,
  empirical: 0.85,
  conditional: 0.6,
  definition: 0.35,
  open: 0.15,
  untested: 0.1,
  unreviewed: 0,
  fail: 1,
  contradicted: 1,
};

const POSITIVE_STATUSES = new Set(["pass", "empirical"]);
const RESOLVED_STATUSES = new Set(["pass", "empirical", "fail", "contradicted"]);
const RELATION_LABELS = {
  defines: "defines",
  "defined-by": "defined by",
  derives: "derives",
  "derived-from": "derived from",
  "depends-on": "depends on",
  uses: "uses",
  "used-by": "used by",
  cites: "cites",
  supports: "supports",
  "supported-by": "supported by",
  predicts: "predicts",
  "predicted-by": "predicted by",
  tests: "tests",
  "tested-by": "tested by",
  implements: "implements",
  "implemented-by": "implemented by",
  links: "related",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function validationProfile(node) {
  const entries = Object.entries(node.statuses ?? {
    symbolic: "unreviewed",
    formal: "unreviewed",
    physical: "unreviewed",
    experimental: "unreviewed",
  });
  const weighted = entries.reduce((sum, [, status]) => sum + (STATUS_WEIGHTS[status] ?? 0), 0);
  const assessed = entries.filter(([, status]) => status !== "unreviewed").length;
  const resolved = entries.filter(([, status]) => RESOLVED_STATUSES.has(status)).length;
  const positive = entries.filter(([, status]) => POSITIVE_STATUSES.has(status)).length;
  return {
    completion: Math.round((weighted / Math.max(1, entries.length)) * 100),
    coverage: Math.round((assessed / Math.max(1, entries.length)) * 100),
    resolved: Math.round((resolved / Math.max(1, entries.length)) * 100),
    positivelyValidated: Math.round((positive / Math.max(1, entries.length)) * 100),
    entries: entries.map(([dimension, status]) => ({
      dimension,
      label: titleCase(dimension),
      status,
      weight: STATUS_WEIGHTS[status] ?? 0,
    })),
    note: "Completion measures closure of the four recorded validation dimensions; it is not a probability that the object is true.",
  };
}

function adjacentOfType(graph, node, types) {
  const allowed = new Set(Array.isArray(types) ? types : [types]);
  return [...(graph.adjacency.get(node.id) ?? [])]
    .map((id) => graph.byId.get(id))
    .filter((item) => item && allowed.has(item.type));
}

function relationEdges(graph, nodeId) {
  return [
    ...(graph.outgoing.get(nodeId) ?? []).map((edge) => ({ ...edge, direction: "out" })),
    ...(graph.incoming.get(nodeId) ?? []).map((edge) => ({ ...edge, direction: "in" })),
  ];
}

function relationTo(graph, nodeId, otherId) {
  const edges = relationEdges(graph, nodeId).filter((edge) => {
    const target = edge.direction === "out" ? edge.target : edge.source;
    return target === otherId;
  });
  const preferred = edges.find((edge) => edge.relation !== "links") ?? edges[0];
  return preferred?.relation ?? "links";
}

function relatedDefinitions(graph, node, limit = 18) {
  const direct = adjacentOfType(graph, node, "Glossary");
  const seen = new Set();
  return direct
    .filter((item) => item.id !== node.id && !seen.has(item.id) && seen.add(item.id))
    .map((item) => ({
      node: item,
      relation: relationTo(graph, node.id, item.id),
      relationLabel: RELATION_LABELS[relationTo(graph, node.id, item.id)] ?? "related",
    }))
    .sort((a, b) => {
      const typedA = a.relation === "links" ? 0 : 1;
      const typedB = b.relation === "links" ? 0 : 1;
      return typedB - typedA || (b.node.degree ?? 0) - (a.node.degree ?? 0) || a.node.label.localeCompare(b.node.label);
    })
    .slice(0, limit);
}

function derivationConnections(graph, node, limit = 40) {
  const relevantTypes = node.type === "Derivations" ? ["Equations"] : ["Derivations"];
  const direct = adjacentOfType(graph, node, relevantTypes);
  const typedIds = new Set();
  for (const edge of relationEdges(graph, node.id)) {
    if (!["derives", "derived-from", "depends-on"].includes(edge.relation)) continue;
    typedIds.add(edge.direction === "out" ? edge.target : edge.source);
  }
  const all = [...direct];
  for (const id of typedIds) {
    const candidate = graph.byId.get(id);
    if (candidate && !all.some((item) => item.id === id)) all.push(candidate);
  }
  return all
    .map((item) => ({
      node: item,
      relation: relationTo(graph, node.id, item.id),
      relationLabel: RELATION_LABELS[relationTo(graph, node.id, item.id)] ?? "related",
    }))
    .sort((a, b) => {
      const typedA = ["derives", "derived-from", "depends-on"].includes(a.relation) ? 1 : 0;
      const typedB = ["derives", "derived-from", "depends-on"].includes(b.relation) ? 1 : 0;
      return typedB - typedA || (b.node.degree ?? 0) - (a.node.degree ?? 0) || a.node.label.localeCompare(b.node.label);
    })
    .slice(0, limit);
}

function hasHeading(node, names) {
  const headings = node.headings ?? new Set();
  return names.some((name) => headings.has(name.toLowerCase()));
}

function hasField(node, names) {
  const frontmatter = node.frontmatter ?? {};
  return names.some((name) => {
    const value = frontmatter[name];
    return value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
  });
}

function linkCount(graph, node, type) {
  return adjacentOfType(graph, node, type).length;
}

function relationCount(graph, node, names) {
  const allowed = new Set(names);
  return relationEdges(graph, node.id).filter((edge) => allowed.has(edge.relation)).length;
}

function researchChecklist(graph, node) {
  const checks = [];
  const add = (key, label, complete, weight = 1, reason = "") => checks.push({ key, label, complete: Boolean(complete), weight, reason });
  const validation = validationProfile(node);

  if (node.type === "Glossary") {
    add("definition", "Canonical definition", hasHeading(node, ["definition", "canonical definition"]) || hasField(node, ["definition", "canonical_definition"]), 2, "Add a canonical definition or link to the glossary registry.");
    add("equations", "Related equations", linkCount(graph, node, "Equations") > 0, 1.5, "Link the concept to equations that define or use it.");
    add("papers", "Paper appearances", linkCount(graph, node, "Papers") > 0, 1, "Link the concept to papers where it appears.");
    add("relations", "Related definitions", relatedDefinitions(graph, node, 1).length > 0, 1, "Add typed links to neighboring concepts.");
  } else if (node.type === "Equations") {
    add("derivation", "Derivation", derivationConnections(graph, node, 1).length > 0, 2, "Link a derivation using derives, derived-from, or depends-on.");
    add("definitions", "Defined symbols", linkCount(graph, node, "Glossary") > 0, 1.5, "Link the equation to the definitions of its symbols and operators.");
    add("implementation", "Executable implementation", relationCount(graph, node, ["implements", "implemented-by"]) > 0 || /sympy|lean/i.test(JSON.stringify(node.frontmatter ?? {})), 1.5, "Link SymPy, Lean, or code implementation objects.");
    add("papers", "Paper appearances", linkCount(graph, node, "Papers") > 0, 1, "Link papers that state or use the equation.");
  } else if (node.type === "Derivations") {
    add("equations", "Equation links", derivationConnections(graph, node, 1).length > 0, 2, "Link the derivation to the equations it derives or depends on.");
    add("assumptions", "Assumptions", hasHeading(node, ["assumptions", "conditions"]) || hasField(node, ["assumptions", "conditions"]), 1.5, "Record assumptions and domain conditions.");
    add("steps", "Derivation steps", hasHeading(node, ["derivation", "proof", "steps"]) || hasField(node, ["steps", "proof"]), 1.5, "Record the mathematical steps or proof.");
    add("papers", "Source papers", linkCount(graph, node, "Papers") > 0, 1, "Link the derivation to its source papers.");
  } else if (node.type === "Predictions") {
    add("equation", "Predictive equation", linkCount(graph, node, "Equations") > 0, 1.5, "Link the prediction to the equation that produces it.");
    add("experiment", "Experimental test", relationCount(graph, node, ["tests", "tested-by"]) > 0 || linkCount(graph, node, "Experiments") > 0, 2, "Link a protocol or experiment that can test the prediction.");
    add("falsifier", "Falsifier", hasHeading(node, ["falsifier", "rejection criterion"]) || hasField(node, ["falsifier", "rejection_criterion"]), 1.5, "State what result would reject the prediction.");
  } else if (node.type === "Experiments") {
    add("prediction", "Linked prediction", relationCount(graph, node, ["tests", "tested-by"]) > 0 || linkCount(graph, node, "Predictions") > 0, 1.5, "Link the experiment to the prediction it tests.");
    add("protocol", "Protocol", hasHeading(node, ["procedure", "protocol", "method"]) || hasField(node, ["procedure", "protocol"]), 1.5, "Record equipment, controls, and procedure.");
    add("evidence", "Evidence or data", relationCount(graph, node, ["supports", "supported-by"]) > 0 || linkCount(graph, node, "Evidence") > 0 || hasField(node, ["data", "dataset", "observed_result"]), 2, "Link raw data, figures, and evidence.");
    add("replication", "Replication state", hasField(node, ["replication_status", "reproducibility", "replicated"]), 1, "Record replication and reproducibility status.");
  } else if (node.type === "Papers") {
    add("equations", "Equation coverage", linkCount(graph, node, "Equations") > 0, 1.5, "Link the paper to its canonical equations.");
    add("definitions", "Definition coverage", linkCount(graph, node, "Glossary") > 0, 1, "Link concepts and definitions used by the paper.");
    add("references", "Reference coverage", linkCount(graph, node, "References") > 0, 1, "Link the paper to canonical reference objects.");
    add("claims", "Claim coverage", linkCount(graph, node, "Claims") > 0 || hasHeading(node, ["claims", "core claim"]), 1.5, "Extract and link the paper's claims.");
  } else {
    add("typed-links", "Typed research links", relationEdges(graph, node.id).some((edge) => edge.relation !== "links"), 1.5, "Add typed semantic relationships.");
    add("definition", "Purpose or definition", hasHeading(node, ["definition", "purpose", "summary", "overview"]) || hasField(node, ["definition", "purpose", "summary"]), 1.5, "Add a clear purpose, definition, or summary.");
    add("sources", "Source links", (graph.adjacency.get(node.id)?.size ?? 0) > 0, 1, "Connect the object to its sources and related objects.");
  }

  add("validation", "Validation status", validation.coverage >= 50, 2, "Record symbolic, formal, physical, and experimental status.");
  add("stable-id", "Stable ID", node.stableIdSource === "frontmatter", 1, "Assign an explicit stable ID rather than a path-derived fallback.");
  return checks;
}

function completenessProfile(graph, node) {
  const checks = researchChecklist(graph, node);
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const complete = checks.reduce((sum, check) => sum + (check.complete ? check.weight : 0), 0);
  const percent = Math.round((complete / Math.max(1, total)) * 100);
  return {
    percent,
    completeWeight: complete,
    totalWeight: total,
    checks,
    missing: checks.filter((check) => !check.complete),
  };
}

function severityWeight(issue) {
  return issue?.severity === "high" ? 14 : issue?.severity === "medium" ? 8 : 3;
}

function explicitPriority(node) {
  const value = node.frontmatter?.priority_value ?? node.frontmatter?.priority ?? node.frontmatter?.importance;
  if (typeof value === "number" && Number.isFinite(value)) return clamp(value, 0, 100);
  const text = String(value ?? "").toLowerCase();
  if (["critical", "highest", "urgent"].includes(text)) return 100;
  if (["high", "important"].includes(text)) return 80;
  if (["medium", "normal"].includes(text)) return 50;
  if (["low", "someday"].includes(text)) return 20;
  return null;
}

function priorityProfile(graph, node) {
  const validation = node.validationProfile ?? validationProfile(node);
  const completeness = node.completenessProfile ?? completenessProfile(graph, node);
  const reasons = [];
  let score = (100 - completeness.percent) * 0.46;
  score += (100 - validation.completion) * 0.18;

  const issueScore = (node.auditIssues ?? []).reduce((sum, key) => {
    const issue = graph.auditByKey.get(key);
    if (issue) reasons.push(issue.label);
    return sum + severityWeight(issue);
  }, 0);
  score += Math.min(28, issueScore);

  const centrality = clamp(Math.log2((node.degree ?? 0) + 1) * 3.5, 0, 18);
  score += centrality;
  if (centrality >= 8) reasons.push("High-connectivity object");

  const explicit = explicitPriority(node);
  if (explicit != null) {
    score = score * 0.7 + explicit * 0.3;
    reasons.push(`Explicit priority ${Math.round(explicit)}`);
  }

  for (const missing of completeness.missing.slice(0, 4)) reasons.push(missing.reason || missing.label);
  if (["fail", "contradicted"].includes(node.overallStatus)) {
    score += 12;
    reasons.unshift("Contradiction or failed validation requires resolution");
  }
  return {
    score: Math.round(clamp(score, 0, 100)),
    reasons: [...new Set(reasons.filter(Boolean))].slice(0, 7),
    explicit,
  };
}

function decorateGraph(graph) {
  for (const node of graph.nodes) node.validationProfile = validationProfile(node);
  for (const node of graph.nodes) node.completenessProfile = completenessProfile(graph, node);
  for (const node of graph.nodes) node.priorityProfile = priorityProfile(graph, node);
  graph.priorityNodes = [...graph.nodes]
    .sort((a, b) => (b.priorityProfile?.score ?? 0) - (a.priorityProfile?.score ?? 0)
      || (b.degree ?? 0) - (a.degree ?? 0)
      || a.label.localeCompare(b.label));
  graph.validationSummary = {
    averageCompletion: Math.round(graph.nodes.reduce((sum, node) => sum + (node.validationProfile?.completion ?? 0), 0) / Math.max(1, graph.nodes.length)),
    averageCoverage: Math.round(graph.nodes.reduce((sum, node) => sum + (node.validationProfile?.coverage ?? 0), 0) / Math.max(1, graph.nodes.length)),
    averageResearchCompleteness: Math.round(graph.nodes.reduce((sum, node) => sum + (node.completenessProfile?.percent ?? 0), 0) / Math.max(1, graph.nodes.length)),
  };
  return graph;
}

function buildPriorityScene(core, graph, settings) {
  const limit = clamp(Number(settings.priorityNodeLimit) || 120, 30, 400);
  const selected = (graph.priorityNodes ?? []).slice(0, limit);
  const selectedIds = new Set(selected.map((node) => node.id));
  const typeIndex = new Map(core.TYPE_ORDER.map((type, index) => [type, index]));
  const typeCount = Math.max(1, core.TYPE_ORDER.length);
  const nodes = selected.map((node, index) => {
    const lane = typeIndex.get(node.type) ?? typeCount - 1;
    const angle = index * 2.399963229728653;
    const radius = 45 + Math.sqrt(index + 1) * 46;
    const priority = node.priorityProfile?.score ?? 0;
    const laneOffset = (lane - (typeCount - 1) / 2) * 28;
    return {
      id: node.id,
      path: node.path,
      label: `${node.label}\nP${priority} · ${node.completenessProfile?.percent ?? 0}%`,
      type: node.type,
      kind: "note",
      degree: node.degree ?? 0,
      x: Math.cos(angle) * radius + laneOffset,
      y: Math.sin(angle) * radius * 0.72 - priority * 2.4,
      size: clamp(8 + priority * 0.18 + Math.log2((node.degree ?? 0) + 1), 9, 30),
      color: core.TYPE_COLORS[node.type] ?? core.TYPE_COLORS.Other,
      alwaysLabel: index < 24,
      labelPriority: 600000 - index,
      statuses: node.statuses,
      overallStatus: node.overallStatus,
      auditIssues: node.auditIssues ?? [],
      priorityScore: priority,
      completionPercent: node.completenessProfile?.percent ?? 0,
    };
  });
  const edges = graph.edges
    .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .sort((a, b) => ((b.relation !== "links") - (a.relation !== "links")) * 100 + (b.weight ?? 1) - (a.weight ?? 1))
    .slice(0, Math.min(1000, Number(settings.fullEdgeBudget) || 1700));
  return {
    key: "priority",
    mode: "priority",
    title: "Priority bubble-up",
    nodes,
    edges,
    sourceNodeCount: selected.length,
    sourceEdgeCount: edges.length,
  };
}

module.exports = {
  STATUS_WEIGHTS,
  RELATION_LABELS,
  validationProfile,
  completenessProfile,
  priorityProfile,
  decorateGraph,
  relatedDefinitions,
  derivationConnections,
  relationTo,
  buildPriorityScene,
};