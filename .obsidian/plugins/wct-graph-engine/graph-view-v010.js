"use strict";

const { WCTGraphView } = require("./graph-view-v07");
const rendererV09 = require("./graph-renderer-v09");
const inspectorTextV09 = require("./graph-inspector-text-v09");
const scenesV09 = require("./graph-scenes-v09");
const styleV091 = require("./graph-style-v091");
const styleV010 = require("./graph-style-v010");
const { enrichResearchGraph } = require("./graph-enrichment-v09");
const { linkDerivationsByEquationId } = require("./graph-linker-v07");
const { decorateGraphState, decorateCurrentStates, assignPriorityRanks } = require("./graph-state-v08");
const { loadValidationRegistry, applyValidationRegistry } = require("./graph-validation-sync-v010");
const { applyObjectIntegrity } = require("./graph-integrity-v010");
const { calibratePriorities } = require("./graph-priority-model-v010");

for (const source of [rendererV09, inspectorTextV09]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(WCTGraphView.prototype, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

const installControls = WCTGraphView.prototype.installV07Controls;
WCTGraphView.prototype.installV07Controls = function installV010Controls() {
  if (!this.plugin._wctV010StylesInstalled) {
    styleV091.installStyles(this.plugin);
    styleV010.installStyles(this.plugin);
    this.plugin._wctV010StylesInstalled = true;
  }
  installControls.call(this);
  if (!this.pdfDerivationsButton) {
    this.pdfDerivationsButton = this.toolbar.createEl("button", {
      text: "PDF objects",
      attr: { type: "button", title: "Import page-provenance derivations, claims, theorems, and limitations from paper PDFs" },
    });
    this.toolbar.insertBefore(this.pdfDerivationsButton, this.breadcrumbs);
    this.pdfDerivationsButton.addEventListener("click", () => this.plugin.pdfImporter?.runPdfImporter?.(this.plugin));
  }
  if (!this.validationSyncButton) {
    this.validationSyncButton = this.toolbar.createEl("button", {
      text: "Sync validation",
      attr: { type: "button", title: "Refresh the canonical SymPy and Lean validation registry" },
    });
    this.toolbar.insertBefore(this.validationSyncButton, this.breadcrumbs);
    this.validationSyncButton.addEventListener("click", async () => {
      this.validationSyncButton.disabled = true;
      this.validationSyncButton.textContent = "Syncing…";
      await loadValidationRegistry(this.plugin, { force: true });
      await this.rebuildGraph();
      this.validationSyncButton.disabled = false;
      this.validationSyncButton.textContent = "Sync validation";
    });
  }
};

WCTGraphView.prototype.rebuildGraph = async function rebuildGraphV010() {
  this.status?.setText("Indexing canonical and generated research objects…");
  let graph = this.plugin.graphCore.GraphIndex.build(this.app, this.settings);
  this.status?.setText("Parsing paper objects, equations, and glossary references…");
  graph = await enrichResearchGraph(this.plugin.graphCore, this.app, graph, this.settings);
  linkDerivationsByEquationId(graph);
  decorateGraphState(graph);

  this.status?.setText("Synchronizing SymPy and Lean validation…");
  const registry = this.settings.autoSyncValidation === false
    ? this.plugin.validationRegistry
    : await loadValidationRegistry(this.plugin);
  if (registry) applyValidationRegistry(graph, registry);

  this.status?.setText("Resolving canonical objects, duplicates, blockers, and work phases…");
  applyObjectIntegrity(graph);
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
  this.priorityButton?.setText(`Priority ${this.graph.priorityNodes.length.toLocaleString()}`);
  this.populatePriorityTypes?.();
  this.populatePriorityObjectStates?.();
  this.showFull(true);

  const counts = this.graph.paperObjectCounts ?? {};
  const integrity = this.graph.integritySummary ?? {};
  const validation = this.graph.validationRegistrySummary ?? {};
  const syncState = registry
    ? `${validation.matched ?? 0}/${validation.totalRegistryObjects ?? 0} validation matches`
    : `validation sync unavailable${this.plugin.validationRegistryError ? `: ${this.plugin.validationRegistryError}` : ""}`;
  this.status?.setText(
    `${this.graph.nodes.length.toLocaleString()} objects · ${this.graph.priorityNodes.length.toLocaleString()} canonical priorities · `
    + `${integrity.excluded ?? 0} excluded operational objects · ${syncState} · `
    + `${counts.Claims ?? 0} claims · ${counts.Theorems ?? 0} theorems · ${counts.Derivations ?? 0} derivations`,
  );
  this.renderPriorityList?.();
};

WCTGraphView.prototype.showFull = function showFullV010(force = false) {
  if (!this.graph) return;
  this.searchInput.value = "";
  const scene = !force && this.stack[0]?.scene?.mode === "full"
    ? this.stack[0].scene
    : scenesV09.buildFullScene(this.plugin.graphCore, this.graph, this.settings);
  this.navigate(scene, "WCT Research", { reset: true, origin: this.scene?.focusId ?? null });
};

WCTGraphView.prototype.pushCategory = function pushCategoryV010(type, originNode = null) {
  const scene = scenesV09.buildCategoryScene(this.plugin.graphCore, this.graph, type, this.settings);
  this.navigate(scene, type, { origin: originNode?.id ?? null });
};

WCTGraphView.prototype.pushConnections = function pushConnectionsV010(nodeId, originNode = null) {
  const scene = scenesV09.buildConnectionScene(this.plugin.graphCore, this.graph, nodeId, this.settings);
  if (!scene) return;
  const node = this.graph.byId.get(nodeId);
  this.navigate(scene, node?.label ?? "Connections", { origin: originNode?.id ?? nodeId });
};

module.exports = { WCTGraphView };
