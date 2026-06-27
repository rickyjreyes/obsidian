"use strict";

const { classifySpecialPath } = require("./graph-ontology-v09");
const { normalizeScientificText } = require("./graph-text-v09");
const { rebuildGraph, readNodeContents } = require("./graph-reindex-v09");
const { extractVirtualPaperObjects } = require("./graph-paper-objects-v09");
const { inferGlossaryEdges, inferEquationEdges } = require("./graph-link-enrichment-v09");

function normalizeNodeMetadata(nodes) {
  for (const node of nodes) {
    node.label = normalizeScientificText(node.label, { singleLine: true }) || node.label;
    node.type = classifySpecialPath(node.path, node.type);
    node.corpusMember = true;
  }
}

async function enrichResearchGraph(core, app, graph, settings) {
  normalizeNodeMetadata(graph.nodes);
  const contents = await readNodeContents(app, graph.nodes);

  const extracted = settings.extractPaperObjects === false
    ? { nodes: [], edges: [], counts: { Claims: 0, Theorems: 0, Derivations: 0, Contradictions: 0 } }
    : extractVirtualPaperObjects(core, graph.nodes.filter((node) => node.type === "Papers"), contents);

  for (const node of extracted.nodes) contents.set(node.id, node.virtualContent ?? "");
  const nodes = [...graph.nodes, ...extracted.nodes];
  const glossary = settings.inferGlossaryMentions === false
    ? { edges: [], counts: new Map() }
    : inferGlossaryEdges(nodes, contents, settings);
  const equationEdges = inferEquationEdges(nodes, contents);

  const rebuilt = rebuildGraph(core, graph, nodes, [
    ...graph.edges,
    ...extracted.edges,
    ...glossary.edges,
    ...equationEdges,
  ]);
  rebuilt.nodeContents = contents;
  rebuilt.virtualObjectCount = extracted.nodes.length;
  rebuilt.paperObjectCounts = extracted.counts;
  rebuilt.inferredGlossaryEdges = glossary.edges.length;
  rebuilt.inferredEquationEdges = equationEdges.length;
  rebuilt.glossaryMentionCounts = glossary.counts;
  rebuilt.corpusRoot = {
    id: "corpus:wct-research",
    label: "WCT Research",
    type: "WCT Research",
    kind: "corpus-root",
    degree: rebuilt.nodes.length,
  };
  return rebuilt;
}

module.exports = {
  normalizeNodeMetadata,
  enrichResearchGraph,
};
