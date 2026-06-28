"use strict";

const assert = require("assert");
const path = require("path");
const root = path.resolve(__dirname, "..");
const core = require(path.join(root, "graph-core.js"));
const ontology = require(path.join(root, "graph-ontology-v09.js"));
const text = require(path.join(root, "graph-text-v09.js"));
const paperObjects = require(path.join(root, "graph-paper-objects-v09.js"));
const links = require(path.join(root, "graph-link-enrichment-v09.js"));
const scenes = require(path.join(root, "graph-scenes-v09.js"));
const { assignPriorityRanks } = require(path.join(root, "graph-state-v08.js"));

ontology.installOntology(core);

assert.strictEqual(text.normalizeScientificText("Î± â‰¤ Î²"), "α ≤ β");
assert.strictEqual(ontology.classifySpecialPath("Research/06 Experiments/Test.md", "Projects"), "Experiments");
assert.strictEqual(ontology.classifySpecialPath("Research/06 Repositories/wct-lean.md", "Experiments"), "Repositories");
assert(text.equationCompare("E9 — Rail", "E24 — Bound") < 0);
assert(text.equationCompare("M2 — Master", "E1 — Canonical") < 0);

const extracted = paperObjects.extractPaperObjects(`
# Key Results
- The model predicts a finite selected shell near E12.
# Theorem
Theorem: stable equilibria exist only in the permitted dimensions.
# Derivation
Starting from E24, substitution therefore yields the bound.
E24 = E25
E25 = E26
E26 = E27
# Limitations
- The statement cannot hold when the regularity assumptions fail.
`);
for (const type of ["Claims", "Theorems", "Derivations", "Contradictions"]) {
  assert(extracted.some((item) => item.type === type), `missing ${type}`);
}

const glossary = { id: "g1", path: "g.md", label: "Curvature Operator", type: "Glossary", frontmatter: {} };
const reference = { id: "r1", path: "r.md", label: "Reference", type: "References", frontmatter: {} };
const inferred = links.inferGlossaryEdges(
  [glossary, reference],
  new Map([[reference.id, "The curvature operator controls localization."]]),
  { glossaryMentionLimit: 80 },
);
assert(inferred.edges.some((edge) => edge.source === "r1" && edge.target === "g1" && edge.relation === "mentions"));

const nodes = [
  { id: "g1", label: "Alpha Field", path: "a.md", type: "Glossary", degree: 2, statuses: {}, auditIssues: [] },
  { id: "g2", label: "Beta Field", path: "b.md", type: "Glossary", degree: 1, statuses: {}, auditIssues: [] },
  { id: "e9", label: "E9 — Rail", path: "e9.md", type: "Equations", degree: 3, statuses: {}, auditIssues: [] },
  { id: "e24", label: "E24 — Bound", path: "e24.md", type: "Equations", degree: 4, statuses: {}, auditIssues: [] },
  { id: "repo", label: "wct-lean", path: "Research/06 Repositories/wct-lean.md", type: "Repositories", degree: 1, statuses: {}, auditIssues: [] },
];
const edge = { source: "e24", target: "g1", relation: "uses", directed: true, weight: 2 };
const graph = {
  nodes,
  edges: [edge],
  byId: new Map(nodes.map((node) => [node.id, node])),
  groups: new Map(core.TYPE_ORDER.map((type) => [type, nodes.filter((node) => node.type === type).map((node) => node.id)])),
  adjacency: new Map(nodes.map((node) => [node.id, new Set()])),
  outgoing: new Map(nodes.map((node) => [node.id, []])),
  incoming: new Map(nodes.map((node) => [node.id, []])),
};
graph.adjacency.get("e24").add("g1");
graph.adjacency.get("g1").add("e24");
graph.outgoing.get("e24").push(edge);
graph.incoming.get("g1").push(edge);

const full = scenes.buildFullScene(core, graph, { fullPreviewPerType: 4 });
assert(full.nodes.some((node) => node.id === "corpus:wct-research" && node.shape === "hexagon"));
assert(full.nodes.some((node) => node.id === "area:Repositories" && node.shape === "folder"));
assert(scenes.buildCategoryScene(core, graph, "Glossary", { maxCategoryNodes: 100 }).nodes.some((node) => node.id === "cluster:Glossary:A"));
assert(scenes.buildCategoryScene(core, graph, "Equations", { maxCategoryNodes: 100 }).nodes.some((node) => node.id === "cluster:Equations:Canonical"));
assert(scenes.buildConnectionScene(core, graph, "e24", { maxConnectionNodes: 20 }).nodes.some((node) => node.kind === "relation-area"));

nodes.forEach((node, index) => { node.priorityProfile = { score: 90 - index }; });
graph.priorityNodes = [...nodes];
assignPriorityRanks(graph);
assert.deepStrictEqual(graph.priorityNodes.map((node) => node.priorityRank), [1, 2, 3, 4, 5]);
assert(graph.priorityNodes.every((node) => node.priorityTotal === 5));

console.log("WCT Graph Engine 0.9 tests passed");
