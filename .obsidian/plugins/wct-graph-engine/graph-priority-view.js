"use strict";

const { buildPriorityScene } = require("./graph-core");

class GraphPriorityMethods {
  buildPriorityPanel(stage) {
    this.priorityPanel = stage.createDiv({ cls: "wct-priority-panel is-hidden" });
    const header = this.priorityPanel.createDiv({ cls: "wct-priority-header" });
    const title = header.createDiv();
    title.createEl("strong", { text: "Priority queue" });
    this.prioritySummary = title.createEl("small", { text: "Ranked by incomplete validation, missing links, audits, and centrality." });
    this.priorityCollapseButton = header.createEl("button", { text: "—", attr: { type: "button", "aria-label": "Collapse priority list" } });
    this.priorityCollapseButton.addEventListener("click", () => {
      this.priorityPanel.toggleClass("is-collapsed", !this.priorityPanel.hasClass("is-collapsed"));
      this.priorityCollapseButton.setText(this.priorityPanel.hasClass("is-collapsed") ? "+" : "—");
    });
    this.priorityFilter = this.priorityPanel.createEl("input", {
      cls: "wct-priority-filter",
      attr: { type: "search", placeholder: "Filter priority list…", "aria-label": "Filter priority list" },
    });
    this.priorityFilter.addEventListener("input", () => this.renderPriorityList());
    this.priorityList = this.priorityPanel.createDiv({ cls: "wct-priority-list" });
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
    this.renderPriorityList();
  }

  hidePriorityPanel() {
    this.priorityPanel?.addClass("is-hidden");
  }

  renderPriorityList() {
    if (!this.priorityList || !this.graph) return;
    this.priorityList.empty();
    const query = String(this.priorityFilter?.value ?? "").trim().toLowerCase();
    const limit = Number(this.settings.priorityListLimit) || 80;
    const nodes = (this.graph.priorityNodes ?? [])
      .filter((node) => !query || [node.label, node.type, node.path, ...(node.priorityProfile?.reasons ?? [])].join(" ").toLowerCase().includes(query))
      .slice(0, limit);

    const summary = this.graph.validationSummary ?? {};
    this.prioritySummary?.setText(
      `${nodes.length} shown · corpus validation ${summary.averageCompletion ?? 0}% · research completeness ${summary.averageResearchCompleteness ?? 0}%`,
    );

    for (const [index, node] of nodes.entries()) {
      const item = this.priorityList.createEl("button", {
        cls: "wct-priority-item",
        attr: { type: "button" },
      });
      item.style.setProperty("--wct-priority-color", this.plugin.graphCore.TYPE_COLORS[node.type] ?? this.plugin.graphCore.TYPE_COLORS.Other);
      const rank = item.createDiv({ cls: "wct-priority-rank", text: String(index + 1) });
      rank.setAttr("aria-hidden", "true");
      const body = item.createDiv({ cls: "wct-priority-body" });
      const heading = body.createDiv({ cls: "wct-priority-title" });
      heading.createSpan({ text: node.label });
      heading.createEm({ text: `P${node.priorityProfile?.score ?? 0}` });
      const meters = body.createDiv({ cls: "wct-priority-meters" });
      const completion = node.completenessProfile?.percent ?? 0;
      const validation = node.validationProfile?.completion ?? 0;
      meters.createSpan({ text: `${completion}% complete` });
      meters.createSpan({ text: `${validation}% validation` });
      const reason = node.priorityProfile?.reasons?.[0];
      if (reason) body.createDiv({ cls: "wct-priority-reason", text: reason });
      item.addEventListener("click", (event) => {
        event.preventDefault();
        this.showInspector(node);
      });
    }
  }
}

module.exports = GraphPriorityMethods.prototype;