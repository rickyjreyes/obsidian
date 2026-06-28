"use strict";

const assert = require("assert");
const path = require("path");

const root = path.resolve(__dirname, "..");
const { calibratePriorities, priorityMarkdown, MODEL_VERSION } = require(path.join(root, "graph-priority-model-v091.js"));
const { assignPriorityRanks } = require(path.join(root, "graph-state-v08.js"));

function statuses() {
  return { symbolic: "unreviewed", formal: "unreviewed", physical: "unreviewed", experimental: "unreviewed" };
}

const master = {
  id: "m6b",
  path: "Research/04 Equations/M6B.md",
  label: "M6B — Nonlinear Curvature Operator",
  type: "Equations",
  stableId: "EQ-M6B",
  stableIdSource: "frontmatter",
  degree: 12,
  frontmatter: { id: "EQ-M6B" },
  headings: new Set(),
  statuses: statuses(),
  overallStatus: "unreviewed",
  auditIssues: ["equation-no-derivation", "equation-no-implementation"],
  completenessProfile: {
    percent: 17,
    missing: [
      { label: "Derivation" },
      { label: "Executable implementation" },
      { label: "Paper appearances" },
    ],
  },
  validationProfile: { completion: 0, coverage: 0 },
  priorityProfile: { explicit: null },
};

const genericExperiment = {
  id: "experiment-fragment",
  path: "WaveLock Research/Objects/angular-modulation.md",
  label: "Angular modulation",
  type: "Experiments",
  stableId: "OBJ-EXPERIMENT",
  stableIdSource: "frontmatter",
  degree: 0,
  frontmatter: { id: "OBJ-EXPERIMENT" },
  headings: new Set(),
  statuses: statuses(),
  overallStatus: "unreviewed",
  auditIssues: ["prediction-untested", "experiment-no-evidence"],
  completenessProfile: {
    percent: 11,
    missing: [
      { label: "Linked prediction" },
      { label: "Protocol" },
      { label: "Evidence or data" },
    ],
  },
  validationProfile: { completion: 0, coverage: 0 },
  priorityProfile: { explicit: null },
};

const derivation = {
  id: "drv-m6b",
  path: "Research/08 Derivations/M6B.md",
  label: "M6B Derivation",
  type: "Derivations",
  stableId: "DRV-M6B",
  stableIdSource: "frontmatter",
  degree: 4,
  frontmatter: { id: "DRV-M6B" },
  headings: new Set(["derivation"]),
  statuses: statuses(),
  overallStatus: "unreviewed",
  auditIssues: [],
  completenessProfile: { percent: 50, missing: [{ label: "Validation status" }] },
  validationProfile: { completion: 0, coverage: 0 },
  priorityProfile: { explicit: null },
};

const edge = { source: derivation.id, target: master.id, relation: "derives", directed: true, weight: 2 };
const nodes = [master, genericExperiment, derivation];
const graph = {
  nodes,
  edges: [edge],
  byId: new Map(nodes.map((node) => [node.id, node])),
  adjacency: new Map([
    [master.id, new Set([derivation.id])],
    [genericExperiment.id, new Set()],
    [derivation.id, new Set([master.id])],
  ]),
  outgoing: new Map([
    [master.id, []],
    [genericExperiment.id, []],
    [derivation.id, [edge]],
  ]),
  incoming: new Map([
    [master.id, [edge]],
    [genericExperiment.id, []],
    [derivation.id, []],
  ]),
  auditByKey: new Map([
    ["equation-no-derivation", { severity: "high", label: "Equation missing derivation" }],
    ["equation-no-implementation", { severity: "medium", label: "Equation missing implementation" }],
    ["prediction-untested", { severity: "high", label: "Prediction untested" }],
    ["experiment-no-evidence", { severity: "medium", label: "Experiment missing evidence" }],
  ]),
};

calibratePriorities(graph);
assignPriorityRanks(graph);

assert.strictEqual(MODEL_VERSION, "2.0");
assert(master.priorityProfile.importance > genericExperiment.priorityProfile.importance, "a connected master equation should carry more research importance than an unlinked experiment fragment");
assert(master.priorityProfile.score > genericExperiment.priorityProfile.score, "combined action priority should distinguish impact rather than saturating every incomplete object at 100");
assert(graph.priorityNodes[0].id === master.id, "the master equation should rank above the generic experiment fragment in this fixture");
assert(graph.priorityNodes.some((node) => node.priorityProfile.score < 100), "the calibrated model should preserve score separation");
assert.deepStrictEqual(graph.priorityNodes.map((node) => node.priorityRank), [1, 2, 3]);

for (const node of graph.priorityNodes) {
  node.currentState = {
    label: "Not assessed",
    missingLabels: node.completenessProfile.missing.map((item) => item.label),
  };
}
const exported = priorityMarkdown(graph.priorityNodes);
assert(exported.includes("Importance"));
assert(exported.includes("Urgency"));
assert(exported.includes("M6B — Nonlinear Curvature Operator"));
assert(exported.split("\n").filter((line) => line.startsWith("| ")).length >= 5, "Markdown export should include the full ranked table");

console.log("WCT Graph Engine 0.9.1 priority tests passed");
