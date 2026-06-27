"use strict";

const { buildPriorityScene } = require("./graph-core");

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function stateMatches(node, filter) {
  if (!filter || filter === "all") return true;
  const state = node.currentState ?? {};
  if (filter === "blocked") return state.tone === "blocked";
  if (filter === "pdf-missing") return state.label === "PDF derivations not imported";
  if (filter === "unreviewed") return state.tone === "unreviewed";
  if (filter === "open") return ["open", "missing"].includes(state.tone);
  if (filter === "conditional") return state.tone === "conditional";
  if (filter === "complete") return state.tone === "complete";
  return true;
}

function compareNodes(left, right, sort) {
  if (sort === "missing-desc") {
    return (right.currentState?.missing?.length ?? 0) - (left.currentState?.missing?.length ?? 0)
      || number(right.priorityProfile?.score) - number(left.priorityProfile?.score);
  }
  if (sort === "completeness-asc") {
    return number(left.completenessProfile?.percent) - number(right.completenessProfile?.percent)
      || number(right.priorityProfile?.score) - number(left.priorityProfile?.score);
  }
  if (sort === "validation-asc") {
    return number(left.validationProfile?.completion) - number(right.validationProfile?.completion)
      || number(right.priorityProfile?.score) - number(left.priorityProfile?.score);
  }
  if (sort === "name") return left.label.localeCompare(right.label);
  return number(right.priorityProfile?.score) - number(left.priorityProfile?.score)
    || (right.currentState?.missing?.length ?? 0) - (left.currentState?.missing?.length ?? 0)
    || left.label.localeCompare(right.label);
}

class GraphPriorityMethods {
  buildPriorityPanel(stage) {
    this.priorityPanel = stage.createDiv({ cls: "wct-priority-panel is-hidden" });
    const header = this.priorityPanel.createDiv({ cls: "wct-priority-header" });
    const title = header.createDiv();
    title.createEl("strong", { text: "Priority table" });
    this.prioritySummary = title.createEl("small", { text: "Searchable research state, missing work, and action priority." });
    this.priorityCollapseButton = header.createEl("button", { text: "—", attr: { type: "button", "aria-label": "Collapse priority table" } });
    this.priorityCollapseButton.addEventListener("click", () => {
      const collapsed = !this.priorityPanel.classList.contains("is-collapsed");
      this.priorityPanel.classList.toggle("is-collapsed", collapsed);
      this.priorityCollapseButton.textContent = collapsed ? "+" : "—";
    });

    const controls = this.priorityPanel.createDiv({ cls: "wct-priority-controls" });
    this.priorityFilter = controls.createEl("input", {
      cls: "wct-priority-filter",
      attr: {
        type: "search",
        placeholder: "Search object, state, missing item, ID, or path…",
        "aria-label": "Search priority table",
      },
    });
    this.priorityTypeFilter = controls.createEl("select", {
      cls: "wct-priority-select",
      attr: { "aria-label": "Filter priority table by object type" },
    });
    this.priorityTypeFilter.createEl("option", { text: "All types", value: "all" });
    this.priorityStateFilter = controls.createEl("select", {
      cls: "wct-priority-select",
      attr: { "aria-label": "Filter priority table by current state" },
    });
    for (const [value, label] of [
      ["all", "All states"],
      ["blocked", "Failed / contradicted"],
      ["pdf-missing", "PDF derivations missing"],
      ["unreviewed", "Not assessed"],
      ["open", "Open / missing"],
      ["conditional", "Conditional / review"],
      ["complete", "Complete"],
    ]) this.priorityStateFilter.createEl("option", { text: label, value });

    this.prioritySort = controls.createEl("select", {
      cls: "wct-priority-select",
      attr: { "aria-label": "Sort priority table" },
    });
    for (const [value, label] of [
      ["priority-desc", "Highest priority"],
      ["missing-desc", "Most missing"],
      ["completeness-asc", "Least complete"],
      ["validation-asc", "Least validated"],
      ["name", "Name"],
    ]) this.prioritySort.createEl("option", { text: label, value });

    const missingLabel = controls.createEl("label", { cls: "wct-priority-missing-toggle" });
    this.priorityMissingOnly = missingLabel.createEl("input", { attr: { type: "checkbox" } });
    missingLabel.createSpan({ text: "Missing only" });

    for (const control of [this.priorityFilter, this.priorityTypeFilter, this.priorityStateFilter, this.prioritySort, this.priorityMissingOnly]) {
      control.addEventListener(control === this.priorityFilter ? "input" : "change", () => this.renderPriorityList());
    }

    this.priorityTableWrap = this.priorityPanel.createDiv({ cls: "wct-priority-table-wrap" });
    this.priorityTable = this.priorityTableWrap.createEl("table", { cls: "wct-priority-table" });
    const head = this.priorityTable.createEl("thead");
    const headerRow = head.createEl("tr");
    for (const label of ["#", "Object", "Type", "Priority", "Complete", "Validation", "Current state", "What is missing"]) {
      headerRow.createEl("th", { text: label });
    }
    this.priorityTableBody = this.priorityTable.createEl("tbody");
    this.populatePriorityTypes();
  }

  populatePriorityTypes() {
    if (!this.priorityTypeFilter || !this.graph) return;
    const selected = this.priorityTypeFilter.value || "all";
    while (this.priorityTypeFilter.options.length > 1) this.priorityTypeFilter.remove(1);
    const types = [...new Set(this.graph.nodes.map((node) => node.type))].sort();
    for (const type of types) this.priorityTypeFilter.createEl("option", { text: type, value: type });
    this.priorityTypeFilter.value = types.includes(selected) ? selected : "all";
  }

  showPriority() {
    if (!this.graph) return;
    this.searchInput.value = "";
    const rootScene = this.stack[0]?.scene?.mode === "full"
      ? this.stack[0].scene
      : this.plugin.graphCore.buildFullScene(this.graph, this.settings);
    this.stack = [{ label: "Full graph", scene: rootScene }];
    const scene = buildPriorityScene(this.plugin.graphCore, this.graph, this.settings);
    this.navigate(scene, "Priority", { origin: null });
    this.priorityPanel?.removeClass("is-hidden");
    this.populatePriorityTypes();
    this.renderPriorityList();
  }

  hidePriorityPanel() {
    this.priorityPanel?.addClass("is-hidden");
  }

  priorityRows() {
    const query = normalize(this.priorityFilter?.value);
    const type = this.priorityTypeFilter?.value ?? "all";
    const state = this.priorityStateFilter?.value ?? "all";
    const missingOnly = Boolean(this.priorityMissingOnly?.checked);
    const sort = this.prioritySort?.value ?? "priority-desc";
    const limit = Number(this.settings.priorityListLimit) || 200;

    return (this.graph.priorityNodes ?? [])
      .filter((node) => type === "all" || node.type === type)
      .filter((node) => stateMatches(node, state))
      .filter((node) => !missingOnly || (node.currentState?.missing?.length ?? 0) > 0)
      .filter((node) => {
        if (!query) return true;
        const searchable = [
          node.label,
          node.type,
          node.path,
          node.stableId,
          node.overallStatus,
          node.currentState?.label,
          node.currentState?.summary,
          ...(node.currentState?.missingLabels ?? []),
          ...(node.priorityProfile?.reasons ?? []),
        ].join(" ");
        return normalize(searchable).includes(query);
      })
      .sort((left, right) => compareNodes(left, right, sort))
      .slice(0, limit);
  }

  renderPriorityList() {
    if (!this.priorityTableBody || !this.graph) return;
    this.priorityTableBody.empty();
    const nodes = this.priorityRows();
    const summary = this.graph.validationSummary ?? {};
    const missingCount = nodes.filter((node) => (node.currentState?.missing?.length ?? 0) > 0).length;
    if (this.prioritySummary) {
      this.prioritySummary.textContent = `${nodes.length} shown · ${missingCount} with missing work · ${summary.averageResearchCompleteness ?? 0}% corpus completeness · ${summary.averageCompletion ?? 0}% validation`;
    }

    if (!nodes.length) {
      const row = this.priorityTableBody.createEl("tr");
      const cell = row.createEl("td", { text: "No objects match the current search and filters." });
      cell.colSpan = 8;
      cell.classList.add("wct-priority-empty");
      return;
    }

    for (const [index, node] of nodes.entries()) {
      const state = node.currentState ?? { label: "Unknown", summary: "", missingLabels: [] };
      const row = this.priorityTableBody.createEl("tr", { cls: `tone-${state.tone ?? "open"}` });
      row.style.setProperty("--wct-priority-color", this.plugin.graphCore.TYPE_COLORS[node.type] ?? this.plugin.graphCore.TYPE_COLORS.Other);
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `Open ${node.label}`);
      row.createEl("td", { cls: "wct-priority-rank", text: String(index + 1) });

      const objectCell = row.createEl("td", { cls: "wct-priority-object" });
      objectCell.createEl("strong", { text: node.label });
      objectCell.createEl("small", { text: node.stableId ?? node.path ?? "No stable ID" });
      row.createEl("td", { cls: "wct-priority-type", text: node.type });
      row.createEl("td", { cls: "wct-priority-number is-priority", text: String(node.priorityProfile?.score ?? 0) });
      row.createEl("td", { cls: "wct-priority-number", text: `${node.completenessProfile?.percent ?? 0}%` });
      row.createEl("td", { cls: "wct-priority-number", text: `${node.validationProfile?.completion ?? 0}%` });

      const stateCell = row.createEl("td", { cls: "wct-priority-state" });
      stateCell.createEl("strong", { text: state.label });
      stateCell.createEl("small", { text: state.summary });

      const missingCell = row.createEl("td", { cls: "wct-priority-missing" });
      const missing = state.missingLabels ?? [];
      if (!missing.length) missingCell.createSpan({ cls: "is-complete", text: "No required gaps" });
      else {
        missing.slice(0, 3).forEach((label) => missingCell.createSpan({ text: label }));
        if (missing.length > 3) missingCell.createSpan({ cls: "is-more", text: `+${missing.length - 3} more` });
      }

      const open = () => this.showInspector(node);
      row.addEventListener("click", open);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    }
  }
}

module.exports = GraphPriorityMethods.prototype;