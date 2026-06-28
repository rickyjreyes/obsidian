"use strict";

const { nodeEquationId } = require("./graph-validation-sync-v010");

const MODEL_VERSION = "3.0";
const WEIGHTS = Object.freeze({ importance: 0.50, urgency: 0.20, dependency: 0.20, confidence: 0.10 });

const TYPE_IMPORTANCE = {
  Theorems: 72,
  Equations: 66,
  Claims: 64,
  Predictions: 62,
  Experiments: 60,
  Derivations: 58,
  Contradictions: 58,
  Evidence: 54,
  Papers: 48,
  Glossary: 38,
  Repositories: 34,
  Projects: 30,
  Maps: 18,
  References: 16,
  Artifacts: 14,
  Other: 20,
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function manualValue(node, names) {
  for (const name of names) {
    const value = number(node.frontmatter?.[name]);
    if (value != null) return clamp(value);
  }
  return null;
}

function canonicalImportance(node) {
  const id = node.registryId ?? nodeEquationId(node) ?? "";
  let value = TYPE_IMPORTANCE[node.type] ?? TYPE_IMPORTANCE.Other;
  const reasons = [`${node.type} base importance`];

  if (/^M(?:1|2|3|4|6A|6B|7)$/.test(id)) {
    value += 23;
    reasons.push("Foundational master-chain equation");
  } else if (/^M\d/.test(id)) {
    value += 16;
    reasons.push("Master equation");
  } else if (/^C[1-5]$/.test(id)) {
    value += 14;
    reasons.push("Closure-layer equation");
  } else if (/^(?:E\d+|CLE\d+|CM\d+|TOP\d+|CORR\d+)$/.test(id)) {
    value += 7;
    reasons.push("Canonical equation family");
  }

  if (node.criticalPath) {
    value += 8;
    reasons.push("Critical dependency path");
  }
  if ((node.downstreamCount ?? 0) > 0) {
    value += Math.min(8, Math.log2(node.downstreamCount + 1) * 2.5);
    reasons.push(`${node.downstreamCount} downstream objects`);
  }
  if ((node.degree ?? 0) > 0) value += Math.min(5, Math.log2(node.degree + 1));
  if (node.objectState !== "canonical") value -= 18;
  if (!node.priorityIncluded) value -= 20;

  const manual = manualValue(node, ["scientific_importance", "importance"]);
  if (manual != null) {
    value = value * 0.6 + manual * 0.4;
    reasons.push(`Manual scientific importance ${manual}`);
  }

  return { score: Math.round(clamp(value)), reasons, manual };
}

function urgency(node) {
  const completeness = node.completenessProfile?.percent ?? 0;
  const coverage = node.validationProfile?.coverage ?? 0;
  const missing = node.completenessProfile?.missing?.length ?? 0;
  let value = (100 - completeness) * 0.42 + (100 - coverage) * 0.18 + Math.min(18, missing * 3);
  const reasons = [];
  if (missing) reasons.push(`${missing} incomplete requirements`);
  if (coverage === 0) reasons.push("Validation synchronization or review required");
  if (["fail", "contradicted"].includes(node.overallStatus)) {
    value += 20;
    reasons.unshift("Failed or contradicted status");
  }
  if (node.dependencyStatus === "contradicted") {
    value += 15;
    reasons.unshift("Blocked by contradicted dependency");
  } else if (["missing", "open"].includes(node.dependencyStatus) && node.criticalPath) {
    value += 10;
    reasons.push("Open critical-path dependency");
  }
  if (node.priorityExclusionReason === "pdf-review-pending") {
    value = Math.min(value, 62);
    reasons.push("PDF review candidate, separated from canonical priority");
  }
  const manual = manualValue(node, ["work_urgency", "urgency"]);
  if (manual != null) {
    value = value * 0.6 + manual * 0.4;
    reasons.push(`Manual urgency ${manual}`);
  }
  return { score: Math.round(clamp(value)), reasons, manual };
}

function finalPriority(node, components) {
  const calculated = Math.round(clamp(
    components.importance * WEIGHTS.importance
    + components.urgency * WEIGHTS.urgency
    + components.dependency * WEIGHTS.dependency
    + components.confidence * WEIGHTS.confidence,
  ));
  const override = manualValue(node, ["priority_override"]);
  return {
    calculated,
    override,
    final: override == null ? calculated : Math.round(override),
  };
}

function calibratePriorities(graph) {
  for (const node of graph.nodes) {
    const importance = canonicalImportance(node);
    const urgent = urgency(node);
    const confidence = Math.round(clamp(node.classificationConfidence ?? 50));
    const dependency = Math.round(clamp(node.dependencyImpact ?? 0));
    const final = finalPriority(node, {
      importance: importance.score,
      urgency: urgent.score,
      dependency,
      confidence,
    });
    node.priorityProfile = {
      ...(node.priorityProfile ?? {}),
      score: final.final,
      calculatedScore: final.calculated,
      priorityOverride: final.override,
      importance: importance.score,
      urgency: urgent.score,
      confidence,
      dependencyImpact: dependency,
      importanceReasons: importance.reasons,
      urgencyReasons: urgent.reasons,
      reasons: [...new Set([...importance.reasons, ...urgent.reasons])].slice(0, 12),
      modelVersion: MODEL_VERSION,
      weights: WEIGHTS,
    };
  }

  const rank = (left, right) =>
    (right.priorityProfile?.score ?? 0) - (left.priorityProfile?.score ?? 0)
    || (right.priorityProfile?.dependencyImpact ?? 0) - (left.priorityProfile?.dependencyImpact ?? 0)
    || (right.priorityProfile?.importance ?? 0) - (left.priorityProfile?.importance ?? 0)
    || (right.priorityProfile?.urgency ?? 0) - (left.priorityProfile?.urgency ?? 0)
    || String(left.label ?? "").localeCompare(String(right.label ?? ""), undefined, { numeric: true, sensitivity: "base" });

  graph.priorityNodes = graph.nodes.filter((node) => node.priorityIncluded !== false).sort(rank);
  graph.excludedPriorityNodes = graph.nodes.filter((node) => node.priorityIncluded === false).sort(rank);
  graph.scientificImportanceNodes = graph.priorityNodes.slice().sort((left, right) =>
    (right.priorityProfile?.importance ?? 0) - (left.priorityProfile?.importance ?? 0)
    || (right.priorityProfile?.dependencyImpact ?? 0) - (left.priorityProfile?.dependencyImpact ?? 0)
    || rank(left, right));
  graph.workQueueNodes = graph.nodes.slice().sort((left, right) =>
    Number(Boolean(right.criticalPath && right.blocks?.length)) - Number(Boolean(left.criticalPath && left.blocks?.length))
    || (right.priorityProfile?.dependencyImpact ?? 0) - (left.priorityProfile?.dependencyImpact ?? 0)
    || (right.priorityProfile?.score ?? 0) - (left.priorityProfile?.score ?? 0)
    || (right.priorityProfile?.urgency ?? 0) - (left.priorityProfile?.urgency ?? 0)
    || String(left.label ?? "").localeCompare(String(right.label ?? "")));
  graph.pdfReviewNodes = graph.nodes.filter((node) => node.priorityExclusionReason === "pdf-review-pending")
    .sort((a, b) => (b.priorityProfile?.urgency ?? 0) - (a.priorityProfile?.urgency ?? 0));
  return graph;
}

function cleanCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function listValue(value, graph) {
  return (value ?? []).map((id) => graph?.byId?.get(id)?.stableId ?? graph?.byId?.get(id)?.label ?? id).join("; ");
}

function priorityMarkdown(nodes, options = {}) {
  const graph = options.graph;
  const lines = [
    `# ${options.title ?? "WCT Corpus Priority Rank"}`,
    "",
    `- **Generated:** ${new Date().toISOString()}`,
    `- **Priority model:** ${MODEL_VERSION} — 50% importance + 20% urgency + 20% dependency impact + 10% confidence`,
    `- **Objects:** ${nodes.length.toLocaleString()}`,
    "",
    "| Rank | Stable ID | Object | Type | Object state | Included | Priority | Calculated | Override | Importance | Urgency | Confidence | Dependency | Complete | Validation | Symbolic | Formal | Physical | Experimental | Current state | Blocked by | Blocks | Missing | Phase | Path |",
    "|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const node of nodes) {
    const missing = (node.currentState?.missingLabels ?? node.completenessProfile?.missing?.map((item) => item.label) ?? []).join("; ");
    lines.push(`| ${node.priorityRank ?? ""} | ${cleanCell(node.stableId)} | ${cleanCell(node.label)} | ${cleanCell(node.type)} | ${cleanCell(node.objectState)} | ${node.priorityIncluded !== false ? "yes" : "no"} | ${node.priorityProfile?.score ?? 0} | ${node.priorityProfile?.calculatedScore ?? 0} | ${node.priorityProfile?.priorityOverride ?? ""} | ${node.priorityProfile?.importance ?? 0} | ${node.priorityProfile?.urgency ?? 0} | ${node.priorityProfile?.confidence ?? 0} | ${node.priorityProfile?.dependencyImpact ?? 0} | ${node.completenessProfile?.percent ?? 0}% | ${node.validationProfile?.completion ?? 0}% | ${cleanCell(node.statuses?.symbolic)} | ${cleanCell(node.statuses?.formal)} | ${cleanCell(node.statuses?.physical)} | ${cleanCell(node.statuses?.experimental)} | ${cleanCell(node.currentState?.label)} | ${cleanCell(listValue(node.blockedBy, graph))} | ${cleanCell(listValue(node.blocks, graph))} | ${cleanCell(missing)} | ${cleanCell(node.workPhase)} | ${cleanCell(node.path)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function workQueueMarkdown(nodes, options = {}) {
  const graph = options.graph;
  const groups = new Map();
  for (const node of nodes) {
    const phase = node.workPhase ?? "Phase 8 — General corpus backlog";
    if (!groups.has(phase)) groups.set(phase, []);
    groups.get(phase).push(node);
  }
  const lines = [
    "# WCT Research Work Queue",
    "",
    `- **Generated:** ${new Date().toISOString()}`,
    `- **Model:** ${MODEL_VERSION}`,
    "",
  ];
  for (const [phase, items] of [...groups].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
    lines.push(`## ${phase}`, "");
    for (const node of items) {
      lines.push(`### ${node.label}`,
        `- **Priority:** ${node.priorityProfile?.score ?? 0}`,
        `- **Why it matters:** ${node.whyItMatters ?? ""}`,
        `- **What is missing:** ${(node.currentState?.missingLabels ?? []).join("; ") || "No recorded structural gap"}`,
        `- **Blocked by:** ${listValue(node.blockedBy, graph) || "None"}`,
        `- **Blocks:** ${listValue(node.blocks, graph) || "None"}`,
        `- **Files:** ${node.path ?? ""}`,
        `- **Definition of done:** ${node.definitionOfDone ?? ""}`,
        "");
    }
  }
  return `${lines.join("\n")}\n`;
}

module.exports = {
  MODEL_VERSION,
  WEIGHTS,
  calibratePriorities,
  priorityMarkdown,
  workQueueMarkdown,
};