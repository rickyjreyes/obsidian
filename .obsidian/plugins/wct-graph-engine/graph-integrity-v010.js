"use strict";

const { nodeEquationId, validationProfile } = require("./graph-validation-sync-v010");

const NAVIGATION_LABEL = /(?:^|\b)(index|matrix|dependency map|source status|source register|canonical corrections|equation families|master equations|equations index|family index|report|dashboard)(?:\b|$)/i;
const NAVIGATION_PATH = /(?:\/00 |\/00\s|\/90 Source\/|Index\.md$|Matrix\.md$|Dependency Map\.md$|Source Status\.md$|Canonical Corrections\.md$|MASTER_EQUATIONS\.md$|EQUATIONS\.md$)/i;
const GENERIC_PREDICTION = /^(papers?|primary papers?|related papers?|abstract(?:\s*\/\s*record description)?|bibliograph(?:y|ies)|references?|source(?:s)?|record description)$/i;
const PREDICTIVE_SIGNAL = /\b(predicts?|prediction|expected|observable|measur(?:e|ed|able)|falsif|reject|testable|should|will|forecast|yields?)\b/i;

const EXPERIMENT_COMPONENTS = new Map([
  ["photodiode", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["ultraviolet illumination", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["angular modulation", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["optical excitation", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["state induction", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["persistent electrical states", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["harmonic spectrum", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["threshold dynamics", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["protocol registration", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["experimental ledger", "EXP-PHOTODIODE-HARMONIC-STATE"],
  ["532 nm optical source", "EXP-WATER-CAVITY-RESONANCE"],
  ["700 800 khz acoustic drive", "EXP-WATER-CAVITY-RESONANCE"],
  ["pda100a2 photodiode", "EXP-WATER-CAVITY-RESONANCE"],
  ["sds1104x hd oscilloscope", "EXP-WATER-CAVITY-RESONANCE"],
  ["water cavity geometry", "EXP-WATER-CAVITY-RESONANCE"],
  ["ringdown", "EXP-WATER-CAVITY-RESONANCE"],
  ["q estimate", "EXP-WATER-CAVITY-RESONANCE"],
  ["thermal controls", "EXP-WATER-CAVITY-RESONANCE"],
  ["background subtraction", "EXP-WATER-CAVITY-RESONANCE"],
  ["raw traces", "EXP-WATER-CAVITY-RESONANCE"],
]);

const MASTER_CHAIN = ["M1", "M2", "M3", "M4", "M6A", "M6B", "M7"];
const DIMENSION_CHAIN = ["M4", "E24", "E25", "E26", "E27", "E65", "E66", "E67", "E68", "E69", "E70"];

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function truthy(value) {
  return value === true || value === 1 || ["true", "yes", "pass", "verified", "complete"].includes(String(value ?? "").toLowerCase());
}

function contentFor(graph, node) {
  return node.virtualContent ?? graph.nodeContents?.get(node.id) ?? "";
}

function classifyObjectState(graph, node) {
  const frontmatter = node.frontmatter ?? {};
  const label = normalize(node.label);
  const path = String(node.path ?? "");
  const generated = path.startsWith("WaveLock Research/Objects/") || Boolean(node.virtual);
  const pdf = String(frontmatter.source_kind ?? "").toLowerCase() === "pdf";
  const manualInclude = frontmatter.priority_included === true || frontmatter.priority_excluded === false;
  const manualExclude = frontmatter.priority_included === false || frontmatter.priority_excluded === true;

  if (manualExclude) return { state: "canonical", included: false, reason: "manual-exclusion", confidence: 95 };
  if (NAVIGATION_LABEL.test(node.label) || NAVIGATION_PATH.test(path)) return { state: "navigation", included: false, reason: "navigation-object", confidence: 100 };
  if (pdf && !truthy(frontmatter.human_verified)) return { state: "review-candidate", included: false, reason: "pdf-review-pending", confidence: 22 };

  const experimentParent = EXPERIMENT_COMPONENTS.get(label);
  if (experimentParent) return { state: "source-fragment", included: false, reason: "experiment-component", confidence: 88, experimentParent };

  if (generated && node.type === "Predictions") {
    const content = `${node.label}\n${contentFor(graph, node)}`;
    if (GENERIC_PREDICTION.test(node.label) || !PREDICTIVE_SIGNAL.test(content)) {
      return { state: "source-fragment", included: false, reason: "not-a-predictive-proposition", confidence: 18, suggestedType: "source-fragment" };
    }
  }

  if (generated) return { state: "generated", included: manualInclude, reason: manualInclude ? null : "generated-object", confidence: manualInclude ? 72 : 48 };
  return { state: "canonical", included: true, reason: null, confidence: node.stableIdSource === "frontmatter" ? 100 : 88 };
}

function markDuplicates(graph) {
  const canonicalByEquation = new Map();
  for (const node of graph.nodes) {
    if (node.objectState !== "canonical" || node.type !== "Equations") continue;
    const id = nodeEquationId(node);
    if (id && !canonicalByEquation.has(id)) canonicalByEquation.set(id, node);
  }
  for (const node of graph.nodes) {
    if (node.objectState === "canonical") continue;
    const id = nodeEquationId(node);
    const canonical = id ? canonicalByEquation.get(id) : null;
    if (!canonical || canonical.id === node.id) continue;
    node.objectState = "duplicate-candidate";
    node.canonicalId = canonical.stableId ?? id;
    node.duplicateOf = canonical.id;
    node.priorityIncluded = false;
    node.priorityExclusionReason = "duplicate-of-canonical-equation";
    node.classificationConfidence = 98;
  }
}

function dependencyStatus(node) {
  const statuses = Object.values(node?.statuses ?? {});
  if (statuses.some((status) => ["fail", "contradicted"].includes(status))) return "contradicted";
  if (statuses.some((status) => status === "open")) return "open";
  if (statuses.some((status) => status === "conditional")) return "conditional";
  if (statuses.some((status) => status === "definition")) return "definition";
  if (statuses.some((status) => ["pass", "empirical"].includes(status))) return "verified";
  return "missing";
}

function applyChain(nodesByEquation, chain, graph) {
  chain.forEach((id, index) => {
    const node = nodesByEquation.get(id);
    if (!node) return;
    node.criticalPath = true;
    node.dependencyDepth = Math.max(node.dependencyDepth ?? 0, index);
    node.blockedBy = node.blockedBy ?? [];
    node.blocks = node.blocks ?? [];
    if (index > 0) {
      const upstream = nodesByEquation.get(chain[index - 1]);
      if (upstream) {
        node.blockedBy = [...new Set([...node.blockedBy, upstream.id])];
        upstream.blocks = [...new Set([...(upstream.blocks ?? []), node.id])];
      }
    }
  });
  for (const id of chain) {
    const node = nodesByEquation.get(id);
    if (!node) continue;
    const downstream = new Set();
    const visit = (current) => {
      for (const child of current.blocks ?? []) {
        if (downstream.has(child)) continue;
        downstream.add(child);
        const childNode = graph.byId.get(child);
        if (childNode) visit(childNode);
      }
    };
    visit(node);
    node.downstreamCount = downstream.size;
  }
}

function assignWorkPhase(node) {
  const id = node.registryId ?? nodeEquationId(node);
  if (node.priorityExclusionReason === "pdf-review-pending") return "Phase 6 — PDF review";
  if (["duplicate-candidate", "navigation", "source-fragment"].includes(node.objectState)) return "Phase 7 — Duplicate and classification cleanup";
  if (MASTER_CHAIN.includes(id)) return "Phase 1 — Foundational master chain";
  if (/^C[1-5]$/.test(id ?? "")) return "Phase 2 — Closure layer";
  if (DIMENSION_CHAIN.includes(id)) return "Phase 3 — Dimensionality proof chain";
  if (/^(?:E(?:9|1\d|2[0-7]|5[7-9]|6\d|70)|CLE\d+|CM\d+)$/.test(id ?? "")) return "Phase 4 — Equation implementation links";
  if (node.experimentParent || node.type === "Experiments") return "Phase 5 — Canonical experiment normalization";
  if (node.type === "Equations" && (node.validationProfile?.coverage ?? 0) === 0) return "Phase 0 — Validation synchronization";
  return "Phase 8 — General corpus backlog";
}

function refreshValidationChecklist(node) {
  node.validationProfile = validationProfile(node.statuses);
  const check = node.completenessProfile?.checks?.find((item) => item.key === "validation");
  if (!check) return;
  check.complete = node.validationProfile.coverage >= 50;
  const checks = node.completenessProfile.checks;
  const total = checks.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const complete = checks.reduce((sum, item) => sum + (item.complete ? Number(item.weight) || 0 : 0), 0);
  node.completenessProfile.totalWeight = total;
  node.completenessProfile.completeWeight = complete;
  node.completenessProfile.percent = Math.round((complete / Math.max(1, total)) * 100);
  node.completenessProfile.missing = checks.filter((item) => !item.complete);
}

function applyObjectIntegrity(graph) {
  for (const node of graph.nodes) {
    refreshValidationChecklist(node);
    const state = classifyObjectState(graph, node);
    node.objectState = state.state;
    node.priorityIncluded = state.included;
    node.priorityExclusionReason = state.reason;
    node.classificationConfidence = state.confidence;
    node.classificationReason = state.reason ?? "canonical-source-object";
    node.classificationSuggestedType = state.suggestedType ?? null;
    node.experimentParent = state.experimentParent ?? null;
    node.canonicalId = node.frontmatter?.canonical_id ?? node.stableId ?? null;
    node.blockedBy = [];
    node.blocks = [];
    node.dependencyDepth = 0;
    node.downstreamCount = 0;
    node.criticalPath = false;
  }

  markDuplicates(graph);
  const byEquation = new Map();
  for (const node of graph.nodes) {
    if (node.objectState !== "canonical" || node.type !== "Equations") continue;
    const id = nodeEquationId(node);
    if (id && !byEquation.has(id)) byEquation.set(id, node);
  }
  applyChain(byEquation, MASTER_CHAIN, graph);
  applyChain(byEquation, DIMENSION_CHAIN, graph);

  const maximumDownstream = Math.max(1, ...graph.nodes.map((candidate) => candidate.downstreamCount ?? 0));
  for (const node of graph.nodes) {
    node.dependencyStatus = node.blockedBy.length
      ? dependencyStatus(graph.byId.get(node.blockedBy[0]))
      : dependencyStatus(node);
    node.dependencyImpact = Math.round(Math.min(100,
      (node.criticalPath ? 35 : 0)
      + Math.log2((node.downstreamCount ?? 0) + 1) / Math.max(1, Math.log2(maximumDownstream + 1)) * 50
      + Math.min(15, (node.blocks?.length ?? 0) * 5),
    ));
    node.workPhase = assignWorkPhase(node);
    node.whyItMatters = node.criticalPath
      ? "Upstream object on a foundational dependency chain."
      : node.priorityIncluded
        ? `Canonical ${String(node.type).toLowerCase()} in the research corpus.`
        : `Operational cleanup item: ${node.priorityExclusionReason ?? node.objectState}.`;
    node.definitionOfDone = node.type === "Equations"
      ? "Canonical equation, assumptions, derivation, implementation links, paper appearances, and separated validation dimensions are recorded."
      : node.type === "Experiments"
        ? "Prediction, protocol, controls, raw data, uncertainty, falsifier, and replication state are recorded."
        : "Canonical type, provenance, relationships, validation state, and review state are complete.";
  }

  graph.integritySummary = {
    canonical: graph.nodes.filter((node) => node.objectState === "canonical").length,
    priorityIncluded: graph.nodes.filter((node) => node.priorityIncluded).length,
    excluded: graph.nodes.filter((node) => !node.priorityIncluded).length,
    navigation: graph.nodes.filter((node) => node.objectState === "navigation").length,
    duplicates: graph.nodes.filter((node) => node.objectState === "duplicate-candidate").length,
    pdfReview: graph.nodes.filter((node) => node.priorityExclusionReason === "pdf-review-pending").length,
    experimentComponents: graph.nodes.filter((node) => node.priorityExclusionReason === "experiment-component").length,
  };
  return graph;
}

module.exports = {
  MASTER_CHAIN,
  DIMENSION_CHAIN,
  classifyObjectState,
  applyObjectIntegrity,
};