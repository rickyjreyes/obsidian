"use strict";

const { WCTGraphView } = require("./graph-view-v07");
const rendererV09 = require("./graph-renderer-v09");
const inspectorTextV09 = require("./graph-inspector-text-v09");
const scenesV09 = require("./graph-scenes-v09");
const styleV091 = require("./graph-style-v091");
const { enrichResearchGraph } = require("./graph-enrichment-v09");
const { linkDerivationsByEquationId } = require("./graph-linker-v07");
const { decorateGraphState, decorateCurrentStates, assignPriorityRanks } = require("./graph-state-v08");
const { calibratePriorities } = require("./graph-priority-model-v091");

for (const source of [rendererV09, inspectorTextV09]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(WCTGraphView.prototype, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

const installControls = WCTGraphView.prototype.installV07Controls;
WCTGraphView.prototype.installV07Controls = function installV091Controls() {
  if (!this.plugin._wctV091StylesInstalled) {
    styleV091.installStyles(this.plugin);
    this.plugin._wctV091StylesInstalled = true;
  }
  installControls.call(this);
  if (this.pdfDerivationsButton) return;
  this.pdfDerivationsButton = this.toolbar.createEl("button", {
    text: "PDF objects",
    attr: { type: "button", title: "Import page-provenance derivations, claims, theorems, and limitations from paper PDFs" },
  });
  this.toolbar.insertBefore(this.pdfDerivationsButton, this.breadcrumbs);
  this.pdfDerivationsButton.addEventListener("click", () => this.plugin.pdfImporter?.runPdfImporter?.(this.plugin));
};

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

WCTGraphView.prototype.showFull = function showFullV091(force = false) {
  if (!this.graph) return;
  this.searchInput.value = "";
  const scene = !force && this.stack[0]?.scene?.mode === "full"
    ? this.stack[0].scene
    : scenesV09.buildFullScene(this.plugin.graphCore, this.graph, this.settings);
  this.navigate(scene, "WCT Research", { reset: true, origin: this.scene?.focusId ?? null });
};

WCTGraphView.prototype.pushCategory = function pushCategoryV091(type, originNode = null) {
  const scene = scenesV09.buildCategoryScene(this.plugin.graphCore, this.graph, type, this.settings);
  this.navigate(scene, type, { origin: originNode?.id ?? null });
};

WCTGraphView.prototype.pushConnections = function pushConnectionsV091(nodeId, originNode = null) {
  const scene = scenesV09.buildConnectionScene(this.plugin.graphCore, this.graph, nodeId, this.settings);
  if (!scene) return;
  const node = this.graph.byId.get(nodeId);
  this.navigate(scene, node?.label ?? "Connections", { origin: originNode?.id ?? nodeId });
};

module.exports = { WCTGraphView };
