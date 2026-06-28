"use strict";

const { WCTGraphView } = require("./graph-view-v08");
const { enrichResearchGraph } = require("./graph-enrichment-v09");
const { linkDerivationsByEquationId } = require("./graph-linker-v07");
const { decorateGraphState, decorateCurrentStates, assignPriorityRanks } = require("./graph-state-v08");
const { calibratePriorities } = require("./graph-priority-model-v091");

WCTGraphView.prototype.rebuildGraph = async function rebuildGraphV091() {
  this.status?.setText("Indexing all corpus nodes…");
  let graph = this.plugin.graphCore.GraphIndex.build(this.app, this.settings);
  this.status?.setText("Parsing paper objects and glossary references…");
  graph = await enrichResearchGraph(this.plugin.graphCore, this.app, graph, this.settings);
  linkDerivationsByEquationId(graph);
  decorateGraphState(graph);
  calibratePriorities(graph);
  assignPriorityRanks(graph);
  decorateCurrentStates(graph);
  this.graph = graph;

  this.previewCache.clear();
  this._wctGlossaryDefinitions = null;
  this._wctGlossaryDefinitionsV09 = null;
  this.timelineBounds = this.plugin.graphCore.timelineBounds(this.graph);
  this.auditButton?.setText(`Audit ${this.graph.auditIssues.reduce((sum, issue) => sum + issue.nodeIds.length, 0)}`);
  this.timelineButton?.setText(`Timeline ${this.graph.nodes.length.toLocaleString()}`);
  this.priorityButton?.setText(`Priority ${this.graph.nodes.length.toLocaleString()}`);
  this.populatePriorityTypes?.();
  this.showFull(true);

  const counts = this.graph.paperObjectCounts ?? {};
  this.status?.setText(`${this.graph.nodes.length.toLocaleString()} objects · ${this.graph.edges.length.toLocaleString()} links · ${this.graph.inferredGlossaryEdges ?? 0} glossary links · ${counts.Claims ?? 0} claims · ${counts.Theorems ?? 0} theorems · ${counts.Derivations ?? 0} derivations · ${counts.Contradictions ?? 0} contradictions`);
  this.renderPriorityList?.();
};

module.exports = { WCTGraphView };
