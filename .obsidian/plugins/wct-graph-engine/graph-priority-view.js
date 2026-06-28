"use strict";

const { buildPriorityScene } = require("./graph-core");
const scenesV09 = require("./graph-scenes-v09");
const { MODEL_VERSION, priorityMarkdown } = require("./graph-priority-model-v091");

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
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
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
  if (filter === "blocked") return state.tone === "blocked";
  if (filter === "pdf-missing") return state.label === "PDF derivations not imported";
  if (filter === "unreviewed") return state.tone === "unreviewed";
  if (filter === "open") return ["open", "missing"].includes(state.tone);
  if (filter === "conditional") return state.tone === "conditional";
  if (filter === "complete") return state.tone === "complete";
  return true;
}

function compareNodes(left, right, sort) {
  if (sort === "importance-desc") {
    return number(right.priorityProfile?.importance) - number(left.priorityProfile?.importance)
      || number(left.priorityRank) - number(right.priorityRank);
  }
  if (sort === "urgency-desc") {
    return number(right.priorityProfile?.urgency) - number(left.priorityProfile?.urgency)
      || number(left.priorityRank) - number(right.priorityRank);
  }
  if (sort === "missing-desc") {
    return (right.currentState?.missing?.length ?? 0) - (left.currentState?.missing?.length ?? 0)
      || number(left.priorityRank) - number(right.priorityRank);
  }
  if (sort === "completeness-asc") {
    return number(left.completenessProfile?.percent) - number(right.completenessProfile?.percent)
      || number(left.priorityRank) - number(right.priorityRank);
  }
  if (sort === "validation-asc") {
    return number(left.validationProfile?.completion) - number(right.validationProfile?.completion)
      || number(left.priorityRank) - number(right.priorityRank);
  }
  if (sort === "score-desc") {
    return number(right.priorityProfile?.score) - number(left.priorityProfile?.score)
      || number(left.priorityRank) - number(right.priorityRank);
  }
  if (sort === "name") return left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: "base" });
  return number(left.priorityRank) - number(right.priorityRank);
}

class GraphPriorityMethods {
  buildPriorityPanel(stage) {
    this.priorityPanel = stage.createDiv({ cls: "wct-priority-panel is-hidden" });
    const header = this.priorityPanel.createDiv({ cls: "wct-priority-header" });
    const title = header.createDiv();
    title.createEl("strong", { text: "Corpus priority rank" });
    this.prioritySummary = title.createEl("small", { text: `Model ${MODEL_VERSION}: research importance plus unfinished-work urgency.` });
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
        placeholder: "Search rank, object, state, missing item, ID, or path…",
        "aria-label": "Search priority table",
      },
    });
    this.priorityTypeFilter = controls.createEl("select", {
      cls: "wct-priority-select",
      attr: { "aria-label": "Filter priority table by object type" },
    });
    addOption(this.priorityTypeFilter, "all", "All types");
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
    ]) addOption(this.priorityStateFilter, value, label);

    this.prioritySort = controls.createEl("select", {
      cls: "wct-priority-select",
      attr: { "aria-label": "Sort priority table" },
    });
    for (const [value, label] of [
      ["rank-asc", "Corpus rank"],
      ["score-desc", "Priority score"],
      ["importance-desc", "Importance"],
      ["urgency-desc", "Urgency"],
      ["missing-desc", "Most missing"],
      ["completeness-asc", "Least complete"],
      ["validation-asc", "Least validated"],
      ["name", "Name"],
    ]) addOption(this.prioritySort, value, label);

    const missingLabel = controls.createEl("label", { cls: "wct-priority-missing-toggle" });
    this.priorityMissingOnly = missingLabel.createEl("input", { attr: { type: "checkbox" } });
    missingLabel.createSpan({ text: "Missing only" });

    this.priorityCopyFilteredButton = controls.createEl("button", {
      text: "Copy filtered",
      cls: "wct-priority-export-button",
      attr: { type: "button", title: "Copy every currently filtered row as Markdown" },
    });
    this.priorityCopyAllButton = controls.createEl("button", {
      text: "Copy all",
      cls: "wct-priority-export-button",
      attr: { type: "button", title: "Copy the complete corpus priority list as Markdown" },
    });
    this.priorityExportButton = controls.createEl("button", {
      text: "Export .md",
      cls: "wct-priority-export-button",
      attr: { type: "button", title: "Write the complete list to Research/WCT Corpus Priority Rank.md" },
    });

    for (const control of [this.priorityFilter, this.priorityTypeFilter, this.priorityStateFilter, this.prioritySort, this.priorityMissingOnly]) {
      control.addEventListener(control === this.priorityFilter ? "input" : "change", () => this.renderPriorityList());
    }
    this.priorityCopyFilteredButton.addEventListener("click", () => this.copyPriorityRows(this.priorityRows(), "filtered"));
    this.priorityCopyAllButton.addEventListener("click", () => this.copyPriorityRows(this.graph.priorityNodes ?? [], "complete"));
    this.priorityExportButton.addEventListener("click", () => this.exportPriorityRows());

    this.priorityTableWrap = this.priorityPanel.createDiv({ cls: "wct-priority-table-wrap" });
    this.priorityTable = this.priorityTableWrap.createEl("table", { cls: "wct-priority-table" });
    const head = this.priorityTable.createEl("thead");
    const headerRow = head.createEl("tr");
    for (const label of ["Rank", "Object", "Type", "Priority", "Importance", "Urgency", "Complete", "Validation", "Current state", "What is missing"]) {
      headerRow.createEl("th", { text: label });
    }
    this.priorityTableBody = this.priorityTable.createEl("tbody");
    this.populatePriorityTypes();
  }

  async copyPriorityRows(nodes, label) {
    try {
      const markdown = priorityMarkdown(nodes, { title: label === "complete" ? "WCT Complete Corpus Priority Rank" : "WCT Filtered Corpus Priority Rank" });
      await copyText(markdown);
      notify(`Copied ${nodes.length.toLocaleString()} ${label} priority rows.`);
    } catch (error) {
      console.error("WCT priority copy failed", error);
      notify(`Could not copy priority rows: ${error?.message ?? error}`, 9000);
    }
  }

  async exportPriorityRows() {
    const nodes = this.graph.priorityNodes ?? [];
    const targetPath = "Research/WCT Corpus Priority Rank.md";
    const markdown = priorityMarkdown(nodes, { title: "WCT Complete Corpus Priority Rank" });
    try {
      const existing = this.app.vault.getAbstractFileByPath(targetPath);
      if (existing) await this.app.vault.modify(existing, markdown);
      else await this.app.vault.create(targetPath, markdown);
      notify(`Exported ${nodes.length.toLocaleString()} priority rows to ${targetPath}.`);
      await this.app.workspace.openLinkText(targetPath.slice(0, -3), "", true);
    } catch (error) {
      console.error("WCT priority export failed", error);
      notify(`Could not export the priority list: ${error?.message ?? error}`, 9000);
    }
  }

  populatePriorityTypes() {
    if (!this.priorityTypeFilter || !this.graph) return;
    const selected = this.priorityTypeFilter.value || "all";
    while (this.priorityTypeFilter.options.length > 1) this.priorityTypeFilter.remove(1);
    const types = [...new Set(this.graph.nodes.map((node) => node.type))].sort((a, b) => a.localeCompare(b));
    for (const type of types) addOption(this.priorityTypeFilter, type, type);
    this.priorityTypeFilter.value = types.includes(selected) ? selected : "all";
  }

  showPriority() {
    if (!this.graph) return;
    this.searchInput.value = "";
    const rootScene = this.stack[0]?.scene?.mode === "full"
      ? this.stack[0].scene
      : scenesV09.buildFullScene(this.plugin.graphCore, this.graph, this.settings);
    this.stack = [{ label: "WCT Research", scene: rootScene }];
    const scene = buildPriorityScene(this.plugin.graphCore, this.graph, this.settings);
    for (const sceneNode of scene.nodes) {
      const source = this.graph.byId.get(sceneNode.id);
      if (!source) continue;
      sceneNode.label = `${source.label}\n#${source.priorityRank}/${source.priorityTotal} · P${source.priorityProfile?.score ?? 0} · I${source.priorityProfile?.importance ?? 0} · U${source.priorityProfile?.urgency ?? 0}`;
      sceneNode.priorityRank = source.priorityRank;
      sceneNode.priorityTotal = source.priorityTotal;
    }
    this.navigate(scene, "Corpus priority", { origin: null });
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
    const sort = this.prioritySort?.value ?? "rank-asc";
    const limit = Number(this.settings.priorityListLimit) || 5000;

    return (this.graph.priorityNodes ?? [])
      .filter((node) => type === "all" || node.type === type)
      .filter((node) => stateMatches(node, state))
      .filter((node) => !missingOnly || (node.currentState?.missing?.length ?? 0) > 0)
      .filter((node) => {
        if (!query) return true;
        const searchable = [
          node.priorityRank,
          node.priorityKey,
          node.label,
          node.type,
          node.path,
          node.stableId,
          node.overallStatus,
          node.currentState?.label,
          node.currentState?.summary,
          node.priorityProfile?.score,
          node.priorityProfile?.importance,
          node.priorityProfile?.urgency,
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
    const total = this.graph.priorityNodes?.length ?? this.graph.nodes.length;
    const summary = this.graph.validationSummary ?? {};
    const missingCount = nodes.filter((node) => (node.currentState?.missing?.length ?? 0) > 0).length;
    if (this.prioritySummary) {
      this.prioritySummary.textContent = `${nodes.length.toLocaleString()} shown of ${total.toLocaleString()} ranked objects · model ${MODEL_VERSION}: 68% importance + 32% urgency · ${missingCount.toLocaleString()} with missing work · ${summary.averageResearchCompleteness ?? 0}% completeness · ${summary.averageCompletion ?? 0}% validation`;
    }

    if (!nodes.length) {
      const row = this.priorityTableBody.createEl("tr");
      const cell = row.createEl("td", { text: "No objects match the current search and filters." });
      cell.colSpan = 10;
      cell.classList.add("wct-priority-empty");
      return;
    }

    for (const node of nodes) {
      const state = node.currentState ?? { label: "Unknown", summary: "", missingLabels: [] };
      const row = this.priorityTableBody.createEl("tr", { cls: `tone-${state.tone ?? "open"}` });
      row.style.setProperty("--wct-priority-color", this.plugin.graphCore.TYPE_COLORS[node.type] ?? this.plugin.graphCore.TYPE_COLORS.Other);
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `Open rank ${node.priorityRank}, ${node.label}`);

      const rank = row.createEl("td", { cls: "wct-priority-rank" });
      rank.createEl("strong", { text: `#${node.priorityRank ?? "—"}` });
      rank.createEl("small", { text: `/${node.priorityTotal ?? total}` });

      const objectCell = row.createEl("td", { cls: "wct-priority-object" });
      objectCell.createEl("strong", { text: node.label });
      objectCell.createEl("small", { text: node.stableId ?? node.path ?? "No stable ID" });
      row.createEl("td", { cls: "wct-priority-type", text: node.type });
      row.createEl("td", { cls: "wct-priority-number is-priority", text: String(node.priorityProfile?.score ?? 0) });
      row.createEl("td", { cls: "wct-priority-number is-importance", text: String(node.priorityProfile?.importance ?? 0) });
      row.createEl("td", { cls: "wct-priority-number is-urgency", text: String(node.priorityProfile?.urgency ?? 0) });
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