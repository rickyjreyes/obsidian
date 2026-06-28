"use strict";

const MODEL_VERSION = "2.0";

const TYPE_BASE_IMPORTANCE = {
  Contradictions: 78,
  Predictions: 72,
  Theorems: 70,
  Equations: 68,
  Claims: 66,
  Derivations: 64,
  Experiments: 60,
  Evidence: 58,
  Papers: 56,
  Glossary: 44,
  Repositories: 42,
  Projects: 38,
  Maps: 34,
  References: 22,
  Artifacts: 18,
  Other: 26,
};

const HIGH_VALUE_NEIGHBOR_WEIGHTS = {
  Contradictions: 1.8,
  Predictions: 1.6,
  Experiments: 1.6,
  Equations: 1.5,
  Theorems: 1.5,
  Derivations: 1.4,
  Claims: 1.3,
  Evidence: 1.3,
  Papers: 1,
  Repositories: 0.8,
  Glossary: 0.5,
  References: 0.35,
  Artifacts: 0.2,
  Other: 0.4,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function relationEdges(graph, node) {
  return [
    ...(graph.outgoing?.get(node.id) ?? []),
    ...(graph.incoming?.get(node.id) ?? []),
  ];
}

function connectedNodes(graph, node) {
  return [...(graph.adjacency?.get(node.id) ?? [])]
    .map((id) => graph.byId?.get(id))
    .filter(Boolean);
}

function hasRelation(graph, node, names) {
  const allowed = new Set(names);
  return relationEdges(graph, node).some((edge) => allowed.has(edge.relation));
}

function hasConnectedType(graph, node, types) {
  const allowed = new Set(Array.isArray(types) ? types : [types]);
  return connectedNodes(graph, node).some((candidate) => allowed.has(candidate.type));
}

function hasHeadingOrField(node, names) {
  const headings = node.headings ?? new Set();
  const frontmatter = node.frontmatter ?? {};
  return names.some((name) => headings.has(String(name).toLowerCase())
    || (frontmatter[name] != null && frontmatter[name] !== ""));
}

function explicitPriority(node) {
  if (Number.isFinite(node.priorityProfile?.explicit)) return clamp(Number(node.priorityProfile.explicit), 0, 100);
  const value = node.frontmatter?.priority_value ?? node.frontmatter?.priority ?? node.frontmatter?.importance;
  if (typeof value === "number" && Number.isFinite(value)) return clamp(value, 0, 100);
  const text = String(value ?? "").toLowerCase();
  if (["critical", "highest", "urgent"].includes(text)) return 100;
  if (["high", "important"].includes(text)) return 80;
  if (["medium", "normal"].includes(text)) return 50;
  if (["low", "someday"].includes(text)) return 20;
  return null;
}

function equationBoost(node) {
  if (node.type !== "Equations") return { value: 0, reason: null };
  const text = `${node.label ?? ""} ${node.stableId ?? ""} ${node.path ?? ""}`.toUpperCase();
  if (/\bM\d+[A-Z]?\b|\bMASTER\b/.test(text)) return { value: 14, reason: "Master equation or master system" };
  if (/\b(?:E\d+[A-Z]?|CLE\d+|CM\d+|TOP\d+|CORR\d+)\b/.test(text)) return { value: 7, reason: "Canonical equation family" };
  return { value: 0, reason: null };
}

function domainSpecificBoost(graph, node) {
  const reasons = [];
  let value = 0;
  const add = (amount, reason) => {
    value += amount;
    reasons.push(reason);
  };

  if (node.type === "Equations") {
    if (hasConnectedType(graph, node, "Derivations") || hasRelation(graph, node, ["derives", "derived-from", "depends-on"])) add(7, "Connected derivation");
    if (hasRelation(graph, node, ["implements", "implemented-by"])) add(5, "Executable or formal implementation");
    if (hasConnectedType(graph, node, "Papers")) add(3, "Appears in papers");
  } else if (node.type === "Predictions") {
    if (hasConnectedType(graph, node, "Equations")) add(6, "Equation-backed prediction");
    if (hasConnectedType(graph, node, "Experiments") || hasRelation(graph, node, ["tests", "tested-by"])) add(8, "Has an experimental test");
    if (hasHeadingOrField(node, ["falsifier", "rejection_criterion", "rejection criterion"])) add(5, "Has a falsifier");
  } else if (node.type === "Experiments") {
    if (hasConnectedType(graph, node, "Predictions") || hasRelation(graph, node, ["tests", "tested-by"])) add(8, "Tests a prediction");
    if (hasHeadingOrField(node, ["procedure", "protocol", "method"])) add(5, "Has a protocol");
    if (hasConnectedType(graph, node, "Evidence") || hasRelation(graph, node, ["supports", "supported-by"])) add(6, "Has evidence or data");
  } else if (node.type === "Derivations") {
    if (hasConnectedType(graph, node, "Equations")) add(7, "Derives canonical equations");
    if (hasHeadingOrField(node, ["assumptions", "conditions"])) add(4, "Assumptions recorded");
  } else if (node.type === "Theorems") {
    if (hasConnectedType(graph, node, ["Equations", "Derivations"])) add(7, "Formal mathematical support");
  } else if (node.type === "Claims") {
    if (hasConnectedType(graph, node, ["Equations", "Predictions", "Experiments", "Evidence"])) add(6, "Connected support or test path");
  } else if (node.type === "Contradictions") {
    add(7, "Contradiction requires resolution");
  } else if (node.type === "Papers") {
    if (hasConnectedType(graph, node, "Claims")) add(4, "Claims extracted");
    if (hasConnectedType(graph, node, "Equations")) add(4, "Equation coverage");
  }

  return { value, reasons };
}

function importanceProfile(graph, node, stats) {
  const reasons = [];
  let value = TYPE_BASE_IMPORTANCE[node.type] ?? TYPE_BASE_IMPORTANCE.Other;
  reasons.push(`${node.type} base impact`);

  const equation = equationBoost(node);
  if (equation.value) {
    value += equation.value;
    reasons.push(equation.reason);
  }

  const maxDegree = Math.max(1, stats.maxDegree ?? 1);
  const centrality = Math.log2((node.degree ?? 0) + 1) / Math.max(1, Math.log2(maxDegree + 1));
  const centralityBoost = clamp(centrality * 12, 0, 12);
  value += centralityBoost;
  if (centralityBoost >= 4) reasons.push("High corpus connectivity");

  const typedRelations = relationEdges(graph, node).filter((edge) => edge.relation && edge.relation !== "links");
  const relationDiversity = new Set(typedRelations.map((edge) => edge.relation)).size;
  const relationBoost = Math.min(8, relationDiversity * 1.6);
  value += relationBoost;
  if (relationBoost >= 3) reasons.push("Multiple typed research relations");

  const neighbors = connectedNodes(graph, node);
  const weightedReach = neighbors.reduce((sum, candidate) => sum + (HIGH_VALUE_NEIGHBOR_WEIGHTS[candidate.type] ?? 0.4), 0);
  const reachBoost = Math.min(8, Math.log2(weightedReach + 1) * 2.2);
  value += reachBoost;
  if (reachBoost >= 3) reasons.push("Cross-object research reach");

  const domain = domainSpecificBoost(graph, node);
  value += domain.value;
  reasons.push(...domain.reasons);

  if (node.stableIdSource === "frontmatter") value += 2;
  if (node.virtual || String(node.frontmatter?.source_kind ?? "").toLowerCase() === "pdf") {
    value -= node.frontmatter?.human_verified === true ? 1 : 6;
    if (node.frontmatter?.human_verified !== true) reasons.push("Extraction awaits source verification");
  }

  const explicit = explicitPriority(node);
  if (explicit != null) {
    value = value * 0.7 + explicit * 0.3;
    reasons.push(`Explicit importance ${Math.round(explicit)}`);
  }

  return {
    score: Math.round(clamp(value, 0, 100)),
    reasons: [...new Set(reasons.filter(Boolean))],
    explicit,
  };
}

function urgencyProfile(graph, node) {
  const completeness = node.completenessProfile?.percent ?? 0;
  const validation = node.validationProfile?.completion ?? 0;
  const reasons = [];
  let value = (100 - completeness) * 0.52;
  value += (100 - validation) * 0.14;

  let audit = 0;
  for (const key of node.auditIssues ?? []) {
    const issue = graph.auditByKey?.get(key);
    const weight = issue?.severity === "high" ? 12 : issue?.severity === "medium" ? 7 : 2;
    audit += weight;
    if (issue?.label) reasons.push(issue.label);
  }
  value += Math.min(24, audit);

  if (["fail", "contradicted"].includes(node.overallStatus)) {
    value += 18;
    reasons.unshift("Failed or contradicted validation");
  }
  if (String(node.frontmatter?.source_kind ?? "").toLowerCase() === "pdf" && node.frontmatter?.human_verified !== true) {
    value += 7;
    reasons.push("PDF extraction requires human review");
  }

  const missingCount = node.completenessProfile?.missing?.length ?? 0;
  if (missingCount) reasons.push(`${missingCount} incomplete research requirements`);
  if ((node.validationProfile?.coverage ?? 0) === 0) reasons.push("Validation state is unrecorded");

  return {
    score: Math.round(clamp(value, 0, 100)),
    reasons: [...new Set(reasons.filter(Boolean))],
  };
}

function calibratePriorities(graph) {
  const stats = {
    maxDegree: Math.max(1, ...graph.nodes.map((node) => Number(node.degree) || 0)),
  };

  for (const node of graph.nodes) {
    const importance = importanceProfile(graph, node, stats);
    const urgency = urgencyProfile(graph, node);
    const score = Math.round(clamp(importance.score * 0.68 + urgency.score * 0.32, 0, 100));
    node.priorityProfile = {
      ...(node.priorityProfile ?? {}),
      score,
      importance: importance.score,
      urgency: urgency.score,
      importanceReasons: importance.reasons,
      urgencyReasons: urgency.reasons,
      reasons: [...new Set([...importance.reasons, ...urgency.reasons])].slice(0, 10),
      explicit: importance.explicit,
      modelVersion: MODEL_VERSION,
    };
  }

  graph.priorityNodes = [...graph.nodes].sort((a, b) =>
    (b.priorityProfile?.score ?? 0) - (a.priorityProfile?.score ?? 0)
    || (b.priorityProfile?.importance ?? 0) - (a.priorityProfile?.importance ?? 0)
    || (b.priorityProfile?.urgency ?? 0) - (a.priorityProfile?.urgency ?? 0)
    || (b.degree ?? 0) - (a.degree ?? 0)
    || String(a.label ?? "").localeCompare(String(b.label ?? ""), undefined, { numeric: true, sensitivity: "base" }),
  );
  return graph;
}

function cleanCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function priorityMarkdown(nodes, options = {}) {
  const title = options.title ?? "WCT Corpus Priority Rank";
  const generated = new Date().toISOString();
  const lines = [
    `# ${title}`,
    "",
    `- **Generated:** ${generated}`,
    `- **Priority model:** ${MODEL_VERSION} — 68% research importance + 32% unfinished-work urgency`,
    `- **Objects:** ${nodes.length.toLocaleString()}`,
    "",
    "| Rank | Stable ID | Object | Type | Priority | Importance | Urgency | Complete | Validation | Current state | Missing | Path |",
    "|---:|---|---|---|---:|---:|---:|---:|---:|---|---|---|",
  ];

  for (const node of nodes) {
    const missing = (node.currentState?.missingLabels ?? node.completenessProfile?.missing?.map((item) => item.label) ?? []).join("; ");
    lines.push(`| ${node.priorityRank ?? ""} | ${cleanCell(node.stableId)} | ${cleanCell(node.label)} | ${cleanCell(node.type)} | ${node.priorityProfile?.score ?? 0} | ${node.priorityProfile?.importance ?? 0} | ${node.priorityProfile?.urgency ?? 0} | ${node.completenessProfile?.percent ?? 0}% | ${node.validationProfile?.completion ?? 0}% | ${cleanCell(node.currentState?.label)} | ${cleanCell(missing)} | ${cleanCell(node.path)} |`);
  }
  return `${lines.join("\n")}\n`;
}

module.exports = {
  MODEL_VERSION,
  TYPE_BASE_IMPORTANCE,
  importanceProfile,
  urgencyProfile,
  calibratePriorities,
  priorityMarkdown,
};