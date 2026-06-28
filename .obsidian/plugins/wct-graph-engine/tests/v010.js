"use strict";

const assert = require("assert");
const path = require("path");
const root = path.resolve(__dirname, "..");

const { applyValidationRegistry } = require(path.join(root, "graph-validation-sync-v010.js"));
const { applyObjectIntegrity } = require(path.join(root, "graph-integrity-v010.js"));
const { calibratePriorities, priorityMarkdown, workQueueMarkdown, MODEL_VERSION } = require(path.join(root, "graph-priority-model-v010.js"));
const { assignPriorityRanks } = require(path.join(root, "graph-state-v08.js"));

function node(id, label, type, extra = {}) {
  return {
    id,
    path: extra.path ?? `Research/${label}.md`,
    label,
    type,
    stableId: extra.stableId ?? id,
    stableIdSource: extra.stableIdSource ?? "frontmatter",
    degree: extra.degree ?? 0,
    frontmatter: extra.frontmatter ?? {},
    headings: extra.headings ?? new Set(),
    statuses: { symbolic: "unreviewed", formal: "unreviewed", physical: "unreviewed", experimental: "unreviewed" },
    overallStatus: "unreviewed",
    auditIssues: extra.auditIssues ?? [],
    completenessProfile: extra.completenessProfile ?? {
      percent: 25,
      checks: [
        { key: "implementation", label: "Executable implementation", complete: false, weight: 1.5 },
        { key: "validation", label: "Validation status", complete: false, weight: 2 },
        { key: "papers", label: "Paper appearances", complete: false, weight: 1 },
      ],
      missing: [
        { key: "implementation", label: "Executable implementation", weight: 1.5 },
        { key: "validation", label: "Validation status", weight: 2 },
        { key: "papers", label: "Paper appearances", weight: 1 },
      ],
    },
    validationProfile: { completion: 0, coverage: 0 },
    currentState: { label: "Not assessed", missingLabels: ["Executable implementation", "Validation status"] },
    ...extra,
  };
}

const nodes = [
  node("m1", "ME1 — Curvature Locking Functional", "Equations", { stableId: "ME1", degree: 5 }),
  node("m2", "ME2 — Curvature Operator & Lyapunov Energy", "Equations", { stableId: "ME2", degree: 8 }),
  node("m3", "ME3 — Swift–Hohenberg Spectral Selector", "Equations", { stableId: "ME3", degree: 4 }),
  node("index", "Master Equations Index", "Equations", { path: "Research/04 Equations/01 Master and Closure Equations/Master Equations Index.md", stableIdSource: "derived-path" }),
  node("generated-papers", "Papers", "Predictions", { path: "WaveLock Research/Objects/prediction - Papers.md", virtualContent: "Papers" }),
  node("pdf-ctr", "Extracted contradiction", "Contradictions", { path: "Research/09 Paper Objects/PDF/Test.md", frontmatter: { source_kind: "pdf", human_verified: false } }),
  node("duplicate-m2", "ME2 — Curvature Operator", "Experiments", { path: "WaveLock Research/Objects/experiment - ME2.md", stableId: "OBJ-ME2" }),
  node("component", "Photodiode", "Glossary", { path: "Research/02 Concepts/Photodiode.md" }),
  node("experiment", "Photodiode Harmonic-State Experiment", "Experiments", { stableId: "EXP-PHOTODIODE-HARMONIC-STATE", frontmatter: { scientific_importance: 78, work_urgency: 88 } }),
];

const graph = {
  nodes,
  byId: new Map(nodes.map((item) => [item.id, item])),
  edges: [],
  adjacency: new Map(nodes.map((item) => [item.id, new Set()])),
  outgoing: new Map(nodes.map((item) => [item.id, []])),
  incoming: new Map(nodes.map((item) => [item.id, []])),
  auditByKey: new Map(),
  nodeContents: new Map(nodes.map((item) => [item.id, item.virtualContent ?? ""])),
};

applyValidationRegistry(graph, {
  schema_version: "2.0.0",
  registry_id: "fixture",
  generated_at: "2026-06-28T00:00:00Z",
  objects: [{
    canonical_id: "M2",
    status: { effective: "PASS", source_file: "equations/full_registry.yaml" },
    verification: { outcome: "PASS", checker: ["check_m2"], kind: "SYMBOLIC_IDENTITY" },
    formalization: { status: "CONDITIONAL", declarations: ["m2_statement"], source: "WCT/M2.lean" },
    empirical_validation: { status: "NOT_TESTED" },
    dependencies: { papers: [] },
  }],
});

assert.strictEqual(graph.byId.get("m2").statuses.symbolic, "pass");
assert.strictEqual(graph.byId.get("m2").statuses.formal, "conditional");
assert.strictEqual(graph.byId.get("m2").statuses.physical, "unreviewed", "SymPy PASS must not create physical PASS");
assert.strictEqual(graph.byId.get("m2").statuses.experimental, "untested", "SymPy PASS must not create experimental PASS");
assert(graph.byId.get("m2").validationProfile.coverage > 0, "registry match must remove false zero validation coverage");

applyObjectIntegrity(graph);
assert.strictEqual(graph.byId.get("index").objectState, "navigation");
assert.strictEqual(graph.byId.get("index").priorityIncluded, false);
assert.strictEqual(graph.byId.get("generated-papers").priorityExclusionReason, "not-a-predictive-proposition");
assert.strictEqual(graph.byId.get("pdf-ctr").priorityExclusionReason, "pdf-review-pending");
assert.strictEqual(graph.byId.get("duplicate-m2").objectState, "duplicate-candidate");
assert.strictEqual(graph.byId.get("duplicate-m2").duplicateOf, "m2");
assert.strictEqual(graph.byId.get("component").priorityExclusionReason, "experiment-component");
assert.strictEqual(graph.byId.get("experiment").priorityIncluded, true);
assert(graph.byId.get("m1").blocks.includes("m2"), "ME1 must block ME2 in the foundational chain");
assert(graph.byId.get("m2").blockedBy.includes("m1"), "ME2 must expose its upstream blocker");

calibratePriorities(graph);
assignPriorityRanks(graph);
assert.strictEqual(MODEL_VERSION, "3.0");
assert(!graph.priorityNodes.includes(graph.byId.get("index")), "navigation notes must not compete in canonical priority");
assert(!graph.priorityNodes.includes(graph.byId.get("pdf-ctr")), "unverified PDF contradictions must be in a review queue");
assert(graph.pdfReviewNodes.includes(graph.byId.get("pdf-ctr")));
assert(graph.priorityNodes[0].priorityProfile.score < 100, "new model should avoid saturation in the fixture");
assert(graph.byId.get("m1").priorityProfile.dependencyImpact > graph.byId.get("experiment").priorityProfile.dependencyImpact, "upstream blockers should receive dependency impact");

for (const item of graph.nodes) {
  item.currentState = item.currentState ?? { label: "Not assessed", missingLabels: [] };
}
const exported = priorityMarkdown(graph.priorityNodes, { graph });
assert(exported.includes("Object state"));
assert(exported.includes("Symbolic"));
assert(exported.includes("Dependency"));
const queue = workQueueMarkdown(graph.workQueueNodes.slice(0, 5), { graph });
assert(queue.includes("Why it matters"));
assert(queue.includes("Definition of done"));

console.log("WCT Graph Engine 0.10.0 integrity tests passed");
