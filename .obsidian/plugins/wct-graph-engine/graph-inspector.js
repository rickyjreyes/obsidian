"use strict";

const { MarkdownRenderer } = require("obsidian");
const { TYPE_ORDER, clamp, summaryForType, compactText } = require("./graph-core");

class GraphInspectorMethods {
  async previewFor(node) {
    if (!node?.path) return { summary: "", type: node?.type ?? "Other", neighbors: [] };
    if (this.previewCache.has(node.path)) return this.previewCache.get(node.path);
    const file = this.app.vault.getAbstractFileByPath(node.path);
    const content = file ? await this.app.vault.cachedRead(file) : "";
    const summary = summaryForType(node.type, content);
    const neighbors = [...(this.graph.adjacency.get(node.id) ?? [])]
      .map((id) => this.graph.byId.get(id))
      .filter(Boolean)
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 5)
      .map((item) => item.label);
    const result = { summary, type: node.type, neighbors, content };
    this.previewCache.set(node.path, result);
    return result;
  }

  showTooltip(node, event) {
    const initial = [
      node.label,
      `${node.type} · ${node.degree} connections`,
      node.path ?? "Click to enter this area",
    ].join("\n");
    this.tooltip.setText(initial);
    this.tooltip.removeClass("is-hidden");
    this.positionTooltip(event);
    if (!node.path) return;
    const id = node.id;
    this.previewFor(node).then((preview) => {
      if (this.hovered?.id !== id) return;
      const lines = [
        node.label,
        `${node.type} · ${node.degree} connections`,
        compactText(preview.summary) || "No summary recorded yet.",
      ];
      if (preview.neighbors.length) lines.push(`Top links: ${preview.neighbors.join(" · ")}`);
      this.tooltip.setText(lines.join("\n"));
    });
  }

  positionTooltip(event) {
    const rect = this.stage.getBoundingClientRect();
    const left = clamp(event.clientX - rect.left + 16, 8, Math.max(8, this.width - 370));
    const top = clamp(event.clientY - rect.top + 16, 8, Math.max(8, this.height - 180));
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  hideTooltip() {
    this.tooltip.addClass("is-hidden");
  }

  hideInspector() {
    this.selected = null;
    this.inspector.addClass("is-hidden");
    this.needsRender = true;
  }

  inspectorSection(title) {
    const section = this.inspectorBody.createDiv({ cls: "wct-graph-inspector-section" });
    section.createEl("h3", { text: title });
    return section;
  }

  async showInspector(sceneNodeValue) {
    const node = this.graph.byId.get(sceneNodeValue.id) ?? sceneNodeValue;
    if (!node?.path) return;
    this.selected = node;
    this.inspectorTitle.empty();
    this.inspectorTitle.createEl("h2", { text: node.label });
    this.inspectorTitle.createEl("small", { text: `${node.type} · ${node.degree} connections` });
    this.inspectorBody.empty();
    this.inspectorActions.empty();

    const preview = await this.previewFor(node);
    const sectionTitle = node.type === "Equations"
      ? "Equation and meaning"
      : node.type === "Glossary"
        ? "Definition"
        : "Summary";
    const summarySection = this.inspectorSection(sectionTitle);
    const markdown = summarySection.createDiv({ cls: "wct-graph-inspector-markdown" });
    await MarkdownRenderer.render(
      this.app,
      preview.summary || "No summary has been recorded yet.",
      markdown,
      node.path,
      this.plugin,
    );

    const pathSection = this.inspectorSection("Vault location");
    pathSection.createDiv({ cls: "wct-graph-inspector-path", text: node.path });

    const groups = new Map(TYPE_ORDER.map((type) => [type, []]));
    for (const id of this.graph.adjacency.get(node.id) ?? []) {
      const connected = this.graph.byId.get(id);
      if (connected) groups.get(connected.type)?.push(connected);
    }
    for (const list of groups.values()) list.sort((a, b) => b.degree - a.degree);
    const connections = this.inspectorSection("Connected nodes");
    for (const type of TYPE_ORDER) {
      const list = groups.get(type);
      if (!list?.length) continue;
      const group = connections.createDiv({ cls: "wct-graph-connection-group" });
      group.createEl("strong", { text: `${type} (${list.length})` });
      const buttons = group.createDiv({ cls: "wct-graph-connection-buttons" });
      for (const connected of list.slice(0, 14)) {
        const button = buttons.createEl("button", { text: connected.label, attr: { type: "button" } });
        button.addEventListener("click", (event) => {
          event.preventDefault();
          this.showInspector(connected);
        });
      }
    }

    const open = this.inspectorActions.createEl("button", { text: "Open note", attr: { type: "button" } });
    open.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this.app.workspace.openLinkText(node.path, "", true);
    });

    const viewConnections = this.inspectorActions.createEl("button", { text: "View connections", attr: { type: "button" } });
    viewConnections.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.pushConnections(node.id, sceneNodeValue);
    });

    const back = this.inspectorActions.createEl("button", { text: "Back one level", attr: { type: "button" } });
    back.disabled = this.stack.length <= 1;
    back.addEventListener("click", (event) => {
      event.preventDefault();
      this.back();
    });

    const full = this.inspectorActions.createEl("button", { text: "Full graph", attr: { type: "button" } });
    full.addEventListener("click", (event) => {
      event.preventDefault();
      this.showFull();
    });

    this.inspector.removeClass("is-hidden");
    this.needsRender = true;
  }
}

module.exports = GraphInspectorMethods.prototype;