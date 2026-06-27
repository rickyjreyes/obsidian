"use strict";

const { WCTGraphView } = require("./graph-view");
const rendererV07 = require("./graph-renderer-v07");
const priorityMethods = require("./graph-priority-view");
const { linkDerivationsByEquationId } = require("./graph-linker-v07");
const { decorateGraphState, decorateCurrentStates } = require("./graph-state-v08");

const originalOnOpen = WCTGraphView.prototype.onOpen;
const originalNavigate = WCTGraphView.prototype.navigate;
const originalBack = WCTGraphView.prototype.back;
const originalJump = WCTGraphView.prototype.jump;
const originalUpdateStatus = WCTGraphView.prototype.updateStatus;

const PRIORITY_TYPE_FACTORS = {
  Equations: 1.18,
  Derivations: 1.22,
  Predictions: 1.24,
  Experiments: 1.24,
  Claims: 1.18,
  Theorems: 1.15,
  Contradictions: 1.2,
  Glossary: 1,
  Papers: 0.9,
  Maps: 0.72,
  Projects: 0.85,
  Evidence: 0.95,
  References: 0.48,
  Artifacts: 0.4,
  Other: 0.62,
};

function applyPriorityTypePolicy(graph) {
  for (const node of graph.nodes) {
    const profile = node.priorityProfile;
    if (!profile) continue;
    const factor = PRIORITY_TYPE_FACTORS[node.type] ?? 0.8;
    const adjusted = Math.round(Math.max(
      profile.explicit ?? 0,
      Math.min(100, profile.score * factor),
    ));
    profile.rawScore = profile.score;
    profile.score = adjusted;
  }
  graph.priorityNodes = [...graph.nodes]
    .sort((a, b) => (b.priorityProfile?.score ?? 0) - (a.priorityProfile?.score ?? 0)
      || (b.degree ?? 0) - (a.degree ?? 0)
      || a.label.localeCompare(b.label));
}

for (const source of [rendererV07, priorityMethods]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") {
      Object.defineProperty(WCTGraphView.prototype, name, Object.getOwnPropertyDescriptor(source, name));
    }
  }
}

WCTGraphView.prototype.applyAppearance = function applyAppearance() {
  const fontScale = Math.max(0.8, Math.min(1.8, Number(this.settings.browserFontScale) || 1));
  const width = Math.max(460, Math.min(960, Number(this.settings.inspectorWidth) || 690));
  this.contentEl.style.setProperty("--wct-browser-font-scale", String(fontScale));
  this.contentEl.style.setProperty("--wct-inspector-width", `${width}px`);
  this.contentEl.style.setProperty("--wct-hover-scale", String(Math.max(0.9, Math.min(1.6, Number(this.settings.hoverCardScale) || 1))));
  if (this.inspectorWidthButton) this.inspectorWidthButton.textContent = `${Math.round(width)}px`;
  if (this.labelScaleButton) this.labelScaleButton.textContent = `Labels ${Number(this.settings.graphLabelScale ?? 1).toFixed(1)}×`;
};

WCTGraphView.prototype.changeBrowserFont = async function changeBrowserFont(delta) {
  this.settings.browserFontScale = Math.round(Math.max(0.8, Math.min(1.8, (Number(this.settings.browserFontScale) || 1) + delta)) * 10) / 10;
  this.applyAppearance();
  await this.plugin.saveSettings();
};

WCTGraphView.prototype.cycleInspectorWidth = async function cycleInspectorWidth() {
  const widths = [560, 690, 820, 940];
  const current = Number(this.settings.inspectorWidth) || 690;
  const index = widths.findIndex((width) => width >= current - 5);
  this.settings.inspectorWidth = widths[(index + 1) % widths.length];
  this.applyAppearance();
  await this.plugin.saveSettings();
};

WCTGraphView.prototype.cycleLabelScale = async function cycleLabelScale() {
  const scales = [0.9, 1, 1.15, 1.3, 1.5];
  const current = Number(this.settings.graphLabelScale) || 1;
  let index = scales.findIndex((scale) => Math.abs(scale - current) < 0.03);
  if (index < 0) index = 1;
  this.settings.graphLabelScale = scales[(index + 1) % scales.length];
  this.applyAppearance();
  this.needsRender = true;
  await this.plugin.saveSettings();
};

WCTGraphView.prototype.installV07Controls = function installV07Controls() {
  const priorityCount = Math.min(Number(this.settings.priorityNodeLimit) || 120, this.graph?.nodes?.length ?? 0);
  this.priorityButton = this.toolbar.createEl("button", { text: `Priority ${priorityCount}`, attr: { type: "button" } });
  this.toolbar.insertBefore(this.priorityButton, this.breadcrumbs);
  this.priorityButton.addEventListener("click", () => this.showPriority());

  this.labelScaleButton = this.toolbar.createEl("button", { text: "Labels", attr: { type: "button" } });
  this.toolbar.insertBefore(this.labelScaleButton, this.fitButton);
  this.labelScaleButton.addEventListener("click", () => this.cycleLabelScale());

  const header = this.inspectorTitle?.parentElement;
  if (header) {
    const controls = document.createElement("div");
    controls.className = "wct-inspector-reading-controls";
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "A−";
    down.title = "Decrease panel text size";
    down.addEventListener("click", () => this.changeBrowserFont(-0.1));
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "A+";
    up.title = "Increase panel text size";
    up.addEventListener("click", () => this.changeBrowserFont(0.1));
    this.inspectorWidthButton = document.createElement("button");
    this.inspectorWidthButton.type = "button";
    this.inspectorWidthButton.title = "Cycle panel width";
    this.inspectorWidthButton.addEventListener("click", () => this.cycleInspectorWidth());
    controls.append(down, up, this.inspectorWidthButton);
    header.insertBefore(controls, this.closeInspectorButton);
  }

  this.buildPriorityPanel(this.stage);
  this.applyAppearance();
};

WCTGraphView.prototype.onOpen = async function onOpenV07() {
  await originalOnOpen.call(this);
  this.installV07Controls();
};

WCTGraphView.prototype.rebuildGraph = async function rebuildGraphV07() {
  this.status?.setText("Indexing, linking, and scoring…");
  this.graph = this.plugin.graphCore.GraphIndex.build(this.app, this.settings);
  linkDerivationsByEquationId(this.graph);
  decorateGraphState(this.graph);
  applyPriorityTypePolicy(this.graph);
  decorateCurrentStates(this.graph);
  this.previewCache.clear();
  this.timelineBounds = this.plugin.graphCore.timelineBounds(this.graph);
  this.auditButton?.setText(`Audit ${this.graph.auditIssues.reduce((sum, issue) => sum + issue.nodeIds.length, 0)}`);
  this.timelineButton?.setText(`Timeline ${this.graph.nodes.length.toLocaleString()}`);
  this.priorityButton?.setText(`Priority ${Math.min(Number(this.settings.priorityNodeLimit) || 120, this.graph.nodes.length)}`);
  this.showFull(true);
  const rejected = this.graph.semanticRejectedCount ? ` · ${this.graph.semanticRejectedCount.toLocaleString()} noise nodes hidden` : "";
  const inferred = this.graph.inferredDerivationEdges ? ` · ${this.graph.inferredDerivationEdges} ID-matched derivation links` : "";
  const summary = this.graph.validationSummary ?? {};
  this.status?.setText(
    `${this.graph.nodes.length.toLocaleString()} nodes · ${this.graph.edges.length.toLocaleString()} links · ${summary.averageResearchCompleteness ?? 0}% complete · ${summary.averageCompletion ?? 0}% validation${inferred}${rejected}`,
  );
  this.renderPriorityList?.();
};

WCTGraphView.prototype.navigate = function navigateV07(scene, label, options = {}) {
  originalNavigate.call(this, scene, label, options);
  if (scene?.mode === "priority") {
    this.priorityPanel?.removeClass("is-hidden");
    this.renderPriorityList?.();
  } else {
    this.hidePriorityPanel?.();
  }
};

WCTGraphView.prototype.back = function backV07() {
  originalBack.call(this);
  if (this.scene?.mode === "priority") {
    this.priorityPanel?.removeClass("is-hidden");
    this.renderPriorityList?.();
  } else this.hidePriorityPanel?.();
};

WCTGraphView.prototype.jump = function jumpV07(index) {
  originalJump.call(this, index);
  if (this.scene?.mode === "priority") {
    this.priorityPanel?.removeClass("is-hidden");
    this.renderPriorityList?.();
  } else this.hidePriorityPanel?.();
};

WCTGraphView.prototype.updateStatus = function updateStatusV07() {
  if (this.scene?.mode === "priority") {
    const summary = this.graph?.validationSummary ?? {};
    this.status.setText(
      `Priority bubble-up · ${this.scene.sourceNodeCount} objects · ${summary.averageResearchCompleteness ?? 0}% corpus completeness · ${summary.averageCompletion ?? 0}% validation`,
    );
    return;
  }
  originalUpdateStatus.call(this);
};

module.exports = { WCTGraphView };