"use strict";

const { buildPriorityScene } = require("./graph-core");
const scenesV09 = require("./graph-scenes-v09");
const { MODEL_VERSION, priorityMarkdown, workQueueMarkdown } = require("./graph-priority-model-v010");

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function addOption(select, value, label) {
  const option = select.createEl("option", { text: label });
  option.value = value;
  return option;
}

function notify(message, timeout = 5000) {
  const Notice = globalThis.__WCT_OBSIDIAN_API__?.Notice;
  if (Notice) new Notice(message, timeout);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy was rejected by the desktop environment.");
}

function stateMatches(node, filter) {
  if (!filter || filter === "all") return true;
  const state = node.currentState ?? {};
  if (filter === "blocked") return state.tone === "blocked" || node.blockedBy?.length > 0;
  if (filter === "unreviewed") return state.tone === "unreviewed";
  if (filter === "open") return ["open", "missing"].includes(state.tone);
  if (filter === "conditional") return state.tone === "conditional";
  if (filter === "complete") return state.tone === "complete";
  if (filter === "sympy-open") return node.statuses?.symbolic === "open";
  if (filter === "lean-open") return node.statuses?.formal === "open";
  if (filter === "pdf-review") return node.priorityExclusionReason === "pdf-review-pending";
  return true;
}

function compareNodes(left, right, sort) {
  const rank = number(left.priorityRank) - number(right.priorityRank);
  if (sort === "importance-desc") return number(right.priorityProfile?.importance) - number(left.priorityProfile?.importance) || rank;
  if (sort === "urgency-desc") return number(right.priorityProfile?.urgency) - number(left.priorityProfile?.urgency) || rank;
  if (sort === "confidence-desc") return number(right.priorityProfile?.confidence) - number(left.priorityProfile?.confidence) || rank;
  if (sort === "dependency-desc") return number(right.priorityProfile?.dependencyImpact) - number(left.priorityProfile?.dependencyImpact) || rank;
  if (sort === "missing-desc") return (right.currentState?.missing?.length ?? 0) - (left.currentState?.missing?.length ?? 0) || rank;
  if (sort === "completeness-asc") return number(left.completenessProfile?.percent) - number(right.completenessProfile?.percent) || rank;
  if (sort === "validation-asc") return number(left.validationProfile?.completion) - number(right.validationProfile?.completion) || rank;
  if (sort === "score-desc") return number(right.priorityProfile?.score) - number(left.priorityProfile?.score) || rank;
  if (sort === "name") return left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: "base" });
  return rank;
}

function nodeListForMode(graph, mode) {
  if (mode === "importance") return graph.scientificImportanceNodes ?? [];
  if (mode === "work") return graph.workQueueNodes ?? [];
  if (mode === "excluded") return graph.excludedPriorityNodes ?? [];
  if (mode === "pdf") return graph.pdfReviewNodes ?? [];
  return graph.priorityNodes ?? [];
}

class GraphPriorityMethods {
  buildPriorityPanel(stage) {
    this.priorityMode = "primary";
    this.priorityPanel = stage.createDiv({ cls: "wct-priority-panel is-hidden" });
    const header = this.priorityPanel.createDiv({ cls: "wct-priority-header" });
    const title = header.createDiv();
    title.createEl("strong", { text: "Priority integrity and research work queue" });
    this.prioritySummary = title.createEl("small", { text: `Model ${MODEL_VERSION}: importance, urgency, confidence, and dependency impact.` });
    this.priorityCollapseButton = header.createEl("button", { text: "—", attr: { type: "button", "aria-label": "Collapse priority table" } });
    this.priorityCollapseButton.addEventListener("click", () => {
      const collapsed = !this.priorityPanel.classList.contains("is-collapsed");
      this.priorityPanel.classList.toggle("is-collapsed", collapsed);
      this.priorityCollapseButton.textContent = collapsed ? "+" : "—";
    });

    const mode = this.priorityPanel.createDiv({ cls: "wct-priority-mode-toggle" });
    for (const [value, label] of [["primary", "Canonical priority"], ["importance", "Scientific importance"], ["work", "Research work queue"], ["excluded", "Excluded / cleanup"], ["pdf", "PDF review"]]) {
      const button = mode.createEl("button", { text: label, attr: { type: "button" } });
      button.dataset.mode = value;
      button.classList.toggle("is-active", value === this.priorityMode);
      button.addEventListener("click", () => {
        this.priorityMode = value;
        for (const item of mode.querySelectorAll("button")) item.classList.toggle("is-active", item.dataset.mode === value);
        this.renderPriorityList();
      });
    }

    const controls = this.priorityPanel.createDiv({ cls: "wct-priority-controls" });
    this.priorityFilter = controls.createEl("input", { cls: "wct-priority-filter", attr: { type: "search", placeholder: "Search ID, object, state, blocker, validation, phase, or path…" } });
    this.priorityTypeFilter = controls.createEl("select", { cls: "wct-priority-select" });
    addOption(this.priorityTypeFilter, "all", "All types");
    this.priorityObjectStateFilter = controls.createEl("select", { cls: "wct-priority-select" });
    addOption(this.priorityObjectStateFilter, "all", "All object states");
    this.priorityStateFilter = controls.createEl("select", { cls: "wct-priority-select" });
    for (const [value, label] of [["all", "All research states"], ["blocked", "Blocked"], ["unreviewed", "Not assessed"], ["open", "Open / missing"], ["conditional", "Conditional"], ["complete", "Complete"], ["sympy-open", "SymPy OPEN"], ["lean-open", "Lean OPEN"], ["pdf-review", "PDF review pending"]]) addOption(this.priorityStateFilter, value, label);
    this.prioritySort = controls.createEl("select", { cls: "wct-priority-select" });
    for (const [value, label] of [["rank-asc", "Current rank"], ["score-desc", "Combined priority"], ["importance-desc", "Scientific importance"], ["urgency-desc", "Work urgency"], ["confidence-desc", "Confidence"], ["dependency-desc", "Dependency impact"], ["missing-desc", "Most missing"], ["completeness-asc", "Least complete"], ["validation-asc", "Least validated"], ["name", "Name"]]) addOption(this.prioritySort, value, label);
    const missingLabel = controls.createEl("label", { cls: "wct-priority-missing-toggle" });
    this.priorityMissingOnly = missingLabel.createEl("input", { attr: { type: "checkbox" } });
    missingLabel.createSpan({ text: "Missing only" });

    for (const [text, handler] of [
      ["Copy filtered", () => this.copyPriorityRows(this.priorityRows(), "filtered")],
      ["Copy all canonical", () => this.copyPriorityRows(this.graph.priorityNodes ?? [], "canonical")],
      ["Export priority", () => this.exportPriorityRows(false)],
      ["Export work queue", () => this.exportPriorityRows(true)],
    ]) {
      const button = controls.createEl("button", { text, cls: "wct-priority-export-button", attr: { type: "button" } });
      button.addEventListener("click", handler);
    }

    for (const control of [this.priorityFilter, this.priorityTypeFilter, this.priorityObjectStateFilter, this.priorityStateFilter, this.prioritySort, this.priorityMissingOnly]) {
      control.addEventListener(control === this.priorityFilter ? "input" : "change", () => this.renderPriorityList());
    }

    this.priorityTableWrap = this.priorityPanel.createDiv({ cls: "wct-priority-table-wrap" });
    this.priorityTable = this.priorityTableWrap.createEl("table", { cls: "wct-priority-table" });
    const headerRow = this.priorityTable.createEl("thead").createEl("tr");
    for (const label of ["Rank", "Object", "Type", "Object state", "Priority", "Importance", "Urgency", "Confidence", "Dependency", "Complete", "Validation", "Validation dimensions", "Current state", "Blocked by / blocks", "Missing work", "Phase"]) headerRow.createEl("th", { text: label });
    this.priorityTableBody = this.priorityTable.createEl("tbody");
    this.populatePriorityTypes();
    this.populatePriorityObjectStates();
  }

  async copyPriorityRows(nodes, label) {
    try {
      await copyText(priorityMarkdown(nodes, { title: `WCT ${label} Priority Rank`, graph: this.graph }));
      notify(`Copied ${nodes.length.toLocaleString()} ${label} rows.`);
    } catch (error) {
      notify(`Could not copy priority rows: ${error?.message ?? error}`, 9000);
    }
  }

  async exportPriorityRows(workQueue) {
    const nodes = workQueue ? (this.graph.workQueueNodes ?? []) : (this.graph.priorityNodes ?? []);
    const targetPath = workQueue ? "Research/WCT Research Work Queue.md" : "Research/WCT Corpus Priority Rank.md";
    const markdown = workQueue
      ? workQueueMarkdown(nodes, { graph: this.graph })
      : priorityMarkdown(nodes, { title: "WCT Canonical Corpus Priority Rank", graph: this.graph });
    try {
      const existing = this.app.vault.getAbstractFileByPath(targetPath);
      if (existing) await this.app.vault.modify(existing, markdown);
      else await this.app.vault.create(targetPath, markdown);
      notify(`Exported ${nodes.length.toLocaleString()} rows to ${targetPath}.`);
      await this.app.workspace.openLinkText(targetPath.slice(0, -3), "", true);
    } catch (error) {
      notify(`Could not export: ${error?.message ?? error}`, 9000);
    }
  }

  populatePriorityTypes() {
    if (!this.priorityTypeFilter || !this.graph) return;
    const selected = this.priorityTypeFilter.value || "all";
    while (this.priorityTypeFilter.options.length > 1) this.priorityTypeFilter.remove(1);
    const types = [...new Set(this.graph.nodes.map((node) => node.type))].sort();
    for (const type of types) addOption(this.priorityTypeFilter, type, type);
    this.priorityTypeFilter.value = types.includes(selected) ? selected : "all";
  }

  populatePriorityObjectStates() {
    if (!this.priorityObjectStateFilter || !this.graph) return;
    const selected = this.priorityObjectStateFilter.value || "all";
    while (this.priorityObjectStateFilter.options.length > 1) this.priorityObjectStateFilter.remove(1);
    const states = [...new Set(this.graph.nodes.map((node) => node.objectState).filter(Boolean))].sort();
    for (const state of states) addOption(this.priorityObjectStateFilter, state, state);
    this.priorityObjectStateFilter.value = states.includes(selected) ? selected : "all";
  }

  showPriority() {
    if (!this.graph) return;
    this.priorityMode = "primary";
    this.showPriorityScene(this.graph.priorityNodes ?? [], "Canonical priority");
  }

  showWorkQueue() {
    if (!this.graph) return;
    this.priorityMode = "work";
    this.showPriorityScene(this.graph.workQueueNodes ?? [], "Research work queue");
  }

  showPriorityScene(nodes, label) {
    this.searchInput.value = "";
    const rootScene = this.stack[0]?.scene?.mode === "full" ? this.stack[0].scene : scenesV09.buildFullScene(this.plugin.graphCore, this.graph, this.settings);
    this.stack = [{ label: "WCT Research", scene: rootScene }];
    const scene = buildPriorityScene(this.plugin.graphCore, { ...this.graph, priorityNodes: nodes }, this.settings);
    for (const sceneNode of scene.nodes) {
      const source = this.graph.byId.get(sceneNode.id);
      if (!source) continue;
      sceneNode.label = `${source.label}\nP${source.priorityProfile?.score ?? 0} · I${source.priorityProfile?.importance ?? 0} · U${source.priorityProfile?.urgency ?? 0} · D${source.priorityProfile?.dependencyImpact ?? 0}`;
    }
    this.navigate(scene, label, { origin: null });
    this.priorityPanel?.removeClass("is-hidden");
    for (const button of this.priorityPanel.querySelectorAll(".wct-priority-mode-toggle button")) button.classList.toggle("is-active", button.dataset.mode === this.priorityMode);
    this.populatePriorityTypes();
    this.populatePriorityObjectStates();
    this.renderPriorityList();
  }

  hidePriorityPanel() { this.priorityPanel?.addClass("is-hidden"); }

  priorityRows() {
    const query = normalize(this.priorityFilter?.value);
    const type = this.priorityTypeFilter?.value ?? "all";
    const objectState = this.priorityObjectStateFilter?.value ?? "all";
    const state = this.priorityStateFilter?.value ?? "all";
    const missingOnly = Boolean(this.priorityMissingOnly?.checked);
    const sort = this.prioritySort?.value ?? "rank-asc";
    const limit = Number(this.settings.priorityListLimit) || 5000;
    return nodeListForMode(this.graph, this.priorityMode)
      .filter((node) => type === "all" || node.type === type)
      .filter((node) => objectState === "all" || node.objectState === objectState)
      .filter((node) => stateMatches(node, state))
      .filter((node) => !missingOnly || (node.currentState?.missing?.length ?? 0) > 0)
      .filter((node) => !query || normalize([
        node.priorityRank, node.stableId, node.label, node.type, node.path, node.objectState,
        node.priorityExclusionReason, node.currentState?.label, node.currentState?.summary,
        node.workPhase, node.registryId, node.statuses?.symbolic, node.statuses?.formal,
        ...(node.currentState?.missingLabels ?? []), ...(node.priorityProfile?.reasons ?? []),
      ].join(" ")).includes(query))
      .sort((left, right) => compareNodes(left, right, sort))
      .slice(0, limit);
  }

  renderPriorityList() {
    if (!this.priorityTableBody || !this.graph) return;
    this.priorityTableBody.empty();
    const nodes = this.priorityRows();
    const integrity = this.graph.integritySummary ?? {};
    const validation = this.graph.validationRegistrySummary ?? {};
    this.prioritySummary.textContent = `${nodes.length.toLocaleString()} shown · mode ${this.priorityMode} · model ${MODEL_VERSION} · ${integrity.priorityIncluded ?? 0} canonical priorities · ${integrity.excluded ?? 0} excluded · ${validation.matched ?? 0} validation matches`;
    if (!nodes.length) {
      const row = this.priorityTableBody.createEl("tr");
      const cell = row.createEl("td", { text: "No objects match the current mode and filters." });
      cell.colSpan = 16;
      return;
    }

    for (const node of nodes) {
      const row = this.priorityTableBody.createEl("tr", { cls: `tone-${node.currentState?.tone ?? "open"}` });
      row.style.setProperty("--wct-priority-color", this.plugin.graphCore.TYPE_COLORS[node.type] ?? this.plugin.graphCore.TYPE_COLORS.Other);
      const rank = row.createEl("td", { cls: "wct-priority-rank" });
      rank.createEl("strong", { text: node.priorityRank ? `#${node.priorityRank}` : "—" });
      rank.createEl("small", { text: node.registryId ?? node.stableId ?? "" });
      const object = row.createEl("td", { cls: "wct-priority-object" });
      object.createEl("strong", { text: node.label });
      object.createEl("small", { text: node.path ?? "" });
      row.createEl("td", { cls: "wct-priority-type", text: node.type });
      const state = row.createEl("td", { cls: `wct-priority-object-state ${node.priorityIncluded === false ? "is-excluded" : ""}` });
      state.createEl("strong", { text: node.objectState ?? "unknown" });
      if (node.priorityExclusionReason) state.createEl("small", { cls: "wct-priority-exclusion", text: node.priorityExclusionReason });
      row.createEl("td", { cls: "wct-priority-number is-priority", text: String(node.priorityProfile?.score ?? 0) });
      row.createEl("td", { cls: "wct-priority-number is-importance", text: String(node.priorityProfile?.importance ?? 0) });
      row.createEl("td", { cls: "wct-priority-number is-urgency", text: String(node.priorityProfile?.urgency ?? 0) });
      row.createEl("td", { cls: "wct-priority-number is-confidence", text: String(node.priorityProfile?.confidence ?? 0) });
      row.createEl("td", { cls: "wct-priority-number is-dependency", text: String(node.priorityProfile?.dependencyImpact ?? 0) });
      row.createEl("td", { cls: "wct-priority-number", text: `${node.completenessProfile?.percent ?? 0}%` });
      row.createEl("td", { cls: "wct-priority-number", text: `${node.validationProfile?.completion ?? 0}%` });
      const dimensions = row.createEl("td").createDiv({ cls: "wct-priority-validation-grid" });
      for (const [key, label] of [["symbolic", "S"], ["formal", "F"], ["physical", "P"], ["experimental", "E"]]) dimensions.createSpan({ cls: node.statuses?.[key] ?? "unreviewed", text: `${label}:${node.statuses?.[key] ?? "unreviewed"}` });
      const current = row.createEl("td", { cls: "wct-priority-state" });
      current.createEl("strong", { text: node.currentState?.label ?? "Unknown" });
      current.createEl("small", { text: node.currentState?.summary ?? "" });
      const blockers = row.createEl("td").createDiv({ cls: "wct-priority-blockers" });
      const names = (ids) => (ids ?? []).map((id) => this.graph.byId.get(id)?.stableId ?? this.graph.byId.get(id)?.label ?? id).join(", ");
      blockers.createSpan({ text: `Blocked by: ${names(node.blockedBy) || "—"}` });
      blockers.createSpan({ text: `Blocks: ${names(node.blocks) || "—"}` });
      const missing = row.createEl("td", { cls: "wct-priority-missing" });
      const missingLabels = node.currentState?.missingLabels ?? [];
      if (!missingLabels.length) missing.createSpan({ cls: "is-complete", text: "No required gaps" });
      else missingLabels.slice(0, 4).forEach((label) => missing.createSpan({ text: label }));
      row.createEl("td", { cls: "wct-priority-phase", text: node.workPhase ?? "" });
      const open = () => this.showInspector(node);
      row.addEventListener("click", open);
      row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
      row.tabIndex = 0;
    }
  }
}

module.exports = GraphPriorityMethods.prototype;