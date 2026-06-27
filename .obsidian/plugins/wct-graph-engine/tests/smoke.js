"use strict";

const assert = require("assert");
const path = require("path");

const pluginRoot = path.resolve(__dirname, "..");
const core = require(path.join(pluginRoot, "graph-core.js"));
require(path.join(pluginRoot, "graph-semantic.js")).installSemanticGraph(core);
Object.assign(core, require(path.join(pluginRoot, "graph-timeline.js")));
Object.assign(core, require(path.join(pluginRoot, "graph-knowledge.js")));
const semanticSearch = require(path.join(pluginRoot, "graph-search-v05.js"));
const { repositoryMatches } = require(path.join(pluginRoot, "graph-repository-index.js"));
const { linkDerivationsByEquationId } = require(path.join(pluginRoot, "graph-linker-v07.js"));
const { buildAuditIssues } = require(path.join(pluginRoot, "graph-research.js"));
const { decorateGraphState, decorateCurrentStates } = require(path.join(pluginRoot, "graph-state-v08.js"));

function file(filePath, ctime) {
  return {
    path: filePath,
    basename: filePath.split("/").pop().replace(/\.md$/, ""),
    stat: { ctime, mtime: ctime },
  };
}

const source = file("Research/05 References/WCT Corpus Sources 082-114.md", Date.UTC(2025, 0, 1));
const reference = file(
  "WaveLock Research/Objects/reference - 3_ __WCT Corpus Sources 082-114__SRC-097_J_ L_ O_Brien.md",
  Date.UTC(2026, 0, 2),
);
const artifact = file("WaveLock Research/Artifacts/WCT Corpus Bibliographies Part 1B.md", Date.UTC(2026, 0, 1));
const noise = file("WaveLock Research/Objects/definition - authors.md", Date.UTC(2026, 0, 3));
const files = [source, reference, artifact, noise];

const caches = new Map([
  [source.path, {
    frontmatter: { id: "SRC-CORPUS-082-114" },
    headings: [{ heading: "WCT Corpus Sources 082-114" }],
    links: [],
  }],
  [reference.path, {
    frontmatter: {
      id: "obj_1dcc2d3a2afb",
      type: "reference",
      confidence: 0.55,
      symbolic_status: "PASS",
      formal_status: "CONDITIONAL",
      physical_status: "OPEN",
      experimental_status: "UNTESTED",
    },
    headings: [{ heading: "3. [[WCT Corpus Sources 082-114#^SRC-097|J. L. O’Brien, Optical Waveguide Analogues of Quantum Mechanics (2002).]]" }],
    links: [
      { link: "WCT Corpus Sources 082-114#^SRC-097", displayText: "J. L. O’Brien, Optical Waveguide Analogues of Quantum Mechanics (2002)." },
      { link: "art_83f18cbcdb2d", displayText: "art_83f18cbcdb2d" },
    ],
  }],
  [artifact.path, {
    frontmatter: { id: "art_83f18cbcdb2d", type: "note" },
    headings: [{ heading: "WCT Corpus Bibliographies Part 1B" }],
    links: [],
  }],
  [noise.path, {
    frontmatter: { id: "obj_noise", type: "definition", confidence: 0.55 },
    headings: [{ heading: "authors" }],
    links: [],
  }],
]);

const app = {
  vault: {
    getMarkdownFiles: () => files,
  },
  metadataCache: {
    resolvedLinks: {
      [reference.path]: { [source.path]: 1 },
    },
    getFileCache: (target) => caches.get(target.path) ?? {},
    getFirstLinkpathDest: (linkPath) => {
      const base = String(linkPath).split("#")[0];
      if (base === "WCT Corpus Sources 082-114") return source;
      return null;
    },
  },
};

const settings = {
  ...core.DEFAULT_SETTINGS,
  includeFolders: ["Research", "WaveLock Research"],
  hideOrphans: true,
  semanticObjectsOnly: true,
  priorityNodeLimit: 120,
};

const graph = core.GraphIndex.build(app, settings);
assert(graph.byId.has(reference.path), "reference object should be indexed");
assert(graph.byId.has(artifact.path), "artifact targeted by a stable ID should survive orphan filtering");
assert(!graph.byId.has(noise.path), "generic definition fragment should be suppressed");
assert.strictEqual(graph.byId.get(reference.path).type, "References");
assert.strictEqual(graph.byId.get(reference.path).stableId, "obj_1dcc2d3a2afb");

const derivedEdge = graph.edges.find((edge) =>
  edge.source === reference.path
  && edge.target === artifact.path
  && edge.relation === "derived-from"
  && edge.directed,
);
assert(derivedEdge, "reference should connect to artifact through frontmatter ID");

const citationEdge = graph.edges.find((edge) =>
  edge.source === reference.path
  && edge.target === source.path
  && edge.relation === "cites"
  && edge.directed,
);
assert(citationEdge, "reference should connect to corpus source as a directed citation");

const timeline = core.buildTimelineScene(core, graph, settings, Date.UTC(2026, 0, 3));
assert(timeline.nodes.length >= 3, "timeline should include dated semantic nodes");
assert(timeline.nodes.every((node) => Number.isFinite(node.createdAt)), "timeline nodes need creation dates");

const idSearch = semanticSearch.buildSearchScene(core, graph, "id:obj_1dcc2d3a2afb", settings);
assert.strictEqual(idSearch.sourceNodeCount, 1, "stable-ID search should find exactly the reference object");

const curvature = repositoryMatches(
  { label: "Curvature Feedback", path: "Research/02 Concepts/Curvature Feedback.md", type: "Glossary" },
  "E17 E18 regularized curvature operator and Lyapunov gradient flow",
);
assert(curvature.families.some((family) => family.key === "curvature-feedback"), "curvature feedback should map to E17-E23");
assert(curvature.repositories.some((repo) => repo.id === "wct-sympy"), "curvature feedback should map to wct-sympy");
assert(curvature.lean.some((entry) => entry.ids.includes("E18")), "E18 should expose Lean declarations");

const dimensional = repositoryMatches(
  { label: "D — Dimensionality and Functional Bounds", path: "Research/04 Equations/D.md", type: "Equations" },
  "The exact embedding threshold gives n ≤ 3. E24 E25 E26 E27.",
);
assert(dimensional.families.some((family) => family.key === "dimensional-stability"), "dimensionality should map to the canonical regularity family");

core.decorateGraph(graph);
const scoredReference = graph.byId.get(reference.path);
assert(Number.isFinite(scoredReference.validationProfile.completion), "validation completion should be numeric");
assert(scoredReference.validationProfile.completion > 0 && scoredReference.validationProfile.completion < 100, "mixed statuses should produce partial completion");
assert(Number.isFinite(scoredReference.completenessProfile.percent), "research completeness should be numeric");
assert(Number.isFinite(scoredReference.priorityProfile.score), "priority score should be numeric");
assert(graph.priorityNodes.length === graph.nodes.length, "every indexed node should receive a priority ranking");
const priorityScene = core.buildPriorityScene(core, graph, settings);
assert(priorityScene.mode === "priority", "priority scene should use priority mode");
assert(priorityScene.nodes.length > 0, "priority scene should contain ranked nodes");

const equationNode = {
  id: "Research/04 Equations/E24.md",
  path: "Research/04 Equations/E24.md",
  label: "E24 — Dimensional stability",
  type: "Equations",
  degree: 0,
  frontmatter: { id: "EQ-000024" },
};
const derivationNode = {
  id: "Research/04 Equations/Derivations/E24 Derivation.md",
  path: "Research/04 Equations/Derivations/E24 Derivation.md",
  label: "E24 Derivation",
  type: "Derivations",
  degree: 0,
  frontmatter: { id: "DRV-000024" },
};
const linkerGraph = {
  nodes: [equationNode, derivationNode],
  edges: [],
  byId: new Map([[equationNode.id, equationNode], [derivationNode.id, derivationNode]]),
  adjacency: new Map([[equationNode.id, new Set()], [derivationNode.id, new Set()]]),
  outgoing: new Map([[equationNode.id, []], [derivationNode.id, []]]),
  incoming: new Map([[equationNode.id, []], [derivationNode.id, []]]),
  auditIssues: [],
  auditByKey: new Map(),
};
linkDerivationsByEquationId(linkerGraph);
assert.strictEqual(linkerGraph.inferredDerivationEdges, 1, "shared equation IDs should infer one derivation edge");
assert(linkerGraph.edges.some((edge) => edge.source === derivationNode.id && edge.target === equationNode.id && edge.relation === "derives"), "the inferred edge should point from derivation to equation");

function emptyStatuses() {
  return { symbolic: "unreviewed", formal: "unreviewed", physical: "unreviewed", experimental: "unreviewed" };
}

const pdfPaper = {
  id: "Research/01 Literature Notes/Test PDF Paper.md",
  path: "Research/01 Literature Notes/Test PDF Paper.md",
  label: "Test PDF Paper",
  type: "Papers",
  degree: 0,
  frontmatter: { id: "PAP-TEST", pdf_url: "https://example.org/test.pdf" },
  headings: new Set(["overview"]),
  statuses: emptyStatuses(),
  overallStatus: "unreviewed",
  stableId: "PAP-TEST",
  stableIdSource: "frontmatter",
  auditIssues: [],
};
const pdfGraph = {
  nodes: [pdfPaper],
  edges: [],
  byId: new Map([[pdfPaper.id, pdfPaper]]),
  adjacency: new Map([[pdfPaper.id, new Set()]]),
  outgoing: new Map([[pdfPaper.id, []]]),
  incoming: new Map([[pdfPaper.id, []]]),
  groups: new Map([["Papers", [pdfPaper.id]]]),
  auditIssues: [],
  auditByKey: new Map(),
};
pdfGraph.auditIssues = buildAuditIssues(pdfGraph);
pdfGraph.auditByKey = new Map(pdfGraph.auditIssues.map((issue) => [issue.key, issue]));
for (const issue of pdfGraph.auditIssues) for (const id of issue.nodeIds) pdfGraph.byId.get(id)?.auditIssues.push(issue.key);
decorateGraphState(pdfGraph);
decorateCurrentStates(pdfGraph);
assert(pdfGraph.auditByKey.get("paper-pdf-no-derivations")?.nodeIds.includes(pdfPaper.id), "PDF paper without imported derivations should be audited");
assert.strictEqual(pdfPaper.currentState.label, "PDF derivations not imported", "PDF paper should explain its current missing state");
assert(pdfPaper.completenessProfile.missing.some((check) => check.key === "pdf-derivations"), "paper completeness should require PDF derivation import");

const pdfDerivation = {
  id: "Research/08 Derivations/PDF/Test PDF Paper/Test Derivation.md",
  path: "Research/08 Derivations/PDF/Test PDF Paper/Test Derivation.md",
  label: "Test PDF Paper — Derivation — pp. 2-3",
  type: "Derivations",
  degree: 2,
  frontmatter: {
    id: "DRV-PDF-TEST",
    source_kind: "pdf",
    source_pages: "2-3",
    human_verified: false,
    canonical_latex_verified: false,
  },
  headings: new Set(["derivation", "current state", "what is missing"]),
  statuses: emptyStatuses(),
  overallStatus: "unreviewed",
  stableId: "DRV-PDF-TEST",
  stableIdSource: "frontmatter",
  auditIssues: [],
};
const pdfEdge = {
  source: pdfDerivation.id,
  target: pdfPaper.id,
  relation: "derived-from",
  directed: true,
  weight: 2,
};
pdfPaper.degree = 2;
pdfPaper.auditIssues = [];
pdfGraph.nodes.push(pdfDerivation);
pdfGraph.edges.push(pdfEdge);
pdfGraph.byId.set(pdfDerivation.id, pdfDerivation);
pdfGraph.adjacency.set(pdfDerivation.id, new Set([pdfPaper.id]));
pdfGraph.adjacency.get(pdfPaper.id).add(pdfDerivation.id);
pdfGraph.outgoing.set(pdfDerivation.id, [pdfEdge]);
pdfGraph.incoming.set(pdfDerivation.id, []);
pdfGraph.outgoing.get(pdfPaper.id).length = 0;
pdfGraph.incoming.get(pdfPaper.id).push(pdfEdge);
pdfGraph.groups.set("Derivations", [pdfDerivation.id]);
pdfGraph.auditIssues = buildAuditIssues(pdfGraph);
pdfGraph.auditByKey = new Map(pdfGraph.auditIssues.map((issue) => [issue.key, issue]));
for (const node of pdfGraph.nodes) node.auditIssues = [];
for (const issue of pdfGraph.auditIssues) for (const id of issue.nodeIds) pdfGraph.byId.get(id)?.auditIssues.push(issue.key);
decorateGraphState(pdfGraph);
decorateCurrentStates(pdfGraph);
assert(!pdfGraph.auditByKey.get("paper-pdf-no-derivations")?.nodeIds.includes(pdfPaper.id), "connected PDF derivation should clear the missing-import audit");
assert.notStrictEqual(pdfPaper.currentState.label, "PDF derivations not imported", "paper current state should change after import");
assert.strictEqual(pdfDerivation.currentState.label, "PDF extraction awaiting review", "generated derivation should explain that human review is still missing");
assert(pdfDerivation.completenessProfile.missing.some((check) => check.key === "human-verification"), "PDF derivation should require human verification");
assert(pdfDerivation.completenessProfile.missing.some((check) => check.key === "canonical-latex"), "PDF derivation should require canonical LaTeX verification");

console.log("WCT Graph Engine smoke test passed");