"use strict";

const base = require("./graph-inspector");
const {
  TYPE_COLORS,
  compactText,
} = require("./graph-core");
const {
  relatedDefinitions,
  derivationConnections,
  RELATION_LABELS,
} = require("./graph-knowledge");

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripFrontmatter(content) {
  return String(content ?? "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function extractSection(content, headings) {
  const text = stripFrontmatter(content);
  for (const heading of headings) {
    const match = new RegExp(`^#{1,4}\\s+${escapeRegExp(heading)}\\s*$`, "im").exec(text);
    if (!match) continue;
    const tail = text.slice(match.index + match[0].length);
    const next = tail.search(/^#{1,4}\s+/m);
    const value = (next >= 0 ? tail.slice(0, next) : tail).trim();
    if (value) return value;
  }
  return "";
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function typeFacet(node) {
  const map = {
    Glossary: "Definition",
    Equations: "Equation",
    Derivations: "Derivation",
    References: "Reference",
    Papers: "Paper",
    Predictions: "Prediction",
    Experiments: "Experiment",
    Evidence: "Evidence",
    Claims: "Claim",
    Theorems: "Theorem",
  };
  return map[node.type] ?? node.type;
}

class InspectorV07 {
  renderProgress(container, label, value, color, detail = "") {
    const card = container.createDiv({ cls: "wct-progress-card wct-browser-filter-item" });
    card.style.setProperty("--wct-progress-color", color);
    const heading = card.createDiv({ cls: "wct-progress-heading" });
    heading.createSpan({ text: label });
    heading.createEl("strong", { text: `${Math.round(value)}%` });
    const track = card.createDiv({ cls: "wct-progress-track" });
    const fill = track.createDiv({ cls: "wct-progress-fill" });
    fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    if (detail) card.createDiv({ cls: "wct-progress-detail", text: detail });
    return card;
  }

  showTooltip(sceneNode, event) {
    const node = this.graph.byId.get(sceneNode.id) ?? sceneNode;
    const color = TYPE_COLORS[node.type] ?? TYPE_COLORS.Other;
    const validation = node.validationProfile ?? { completion: 0, coverage: 0 };
    const completeness = node.completenessProfile ?? { percent: 0 };
    const priority = node.priorityProfile ?? { score: 0, reasons: [] };
    const definitions = relatedDefinitions(this.graph, node, 99).length;
    const equations = [...(this.graph.adjacency.get(node.id) ?? [])]
      .map((id) => this.graph.byId.get(id))
      .filter((item) => item?.type === "Equations").length;
    const derivations = derivationConnections(this.graph, node, 99).length;
    const references = [...(this.graph.adjacency.get(node.id) ?? [])]
      .map((id) => this.graph.byId.get(id))
      .filter((item) => item?.type === "References").length;

    this.tooltip.empty();
    this.tooltip.style.setProperty("--wct-hover-color", color);
    this.tooltip.setAttribute("data-object-type", node.type);
    const header = this.tooltip.createDiv({ cls: "wct-hover-header" });
    header.createSpan({ cls: "wct-hover-type", text: typeFacet(node) });
    header.createEl("strong", { text: node.label });
    const metrics = header.createDiv({ cls: "wct-hover-metrics" });
    metrics.createSpan({ text: `${validation.completion}% validation` });
    metrics.createSpan({ text: `${completeness.percent}% complete` });
    metrics.createSpan({ text: `P${priority.score}` });

    const facets = this.tooltip.createDiv({ cls: "wct-hover-facets" });
    const addFacet = (label, count, facet) => {
      if (!count) return;
      const chip = facets.createSpan({ text: `${label} ${count}` });
      chip.setAttribute("data-facet", facet);
    };
    addFacet("Definitions", definitions, "definition");
    addFacet("Equations", equations, "equation");
    addFacet("Derivations", derivations, "derivation");
    addFacet("References", references, "reference");
    addFacet("Links", node.degree ?? 0, "link");

    const summary = this.tooltip.createDiv({ cls: "wct-hover-summary", text: "Loading definition or summary…" });
    if (priority.reasons?.[0]) this.tooltip.createDiv({ cls: "wct-hover-priority", text: `Next: ${priority.reasons[0]}` });
    this.tooltip.removeClass("is-hidden");
    this.positionTooltip(event);

    if (!node.path) return;
    const id = node.id;
    this.previewFor(node).then(async (preview) => {
      if (this.hovered?.id !== id) return;
      let text = preview.summary;
      if (node.type === "Glossary") text = await this.glossaryDefinitionFor(node.label) || preview.summary;
      summary.textContent = compactText(text, 330) || "No definition or summary recorded yet.";
      this.positionTooltip(event);
    });
  }

  async renderOverviewTab(node, preview, container) {
    const health = this.inspectorSection(container, "Completion and priority", "Coverage, not truth probability");
    const progress = health.createDiv({ cls: "wct-progress-grid" });
    this.renderProgress(progress, "Research completeness", node.completenessProfile?.percent ?? 0, TYPE_COLORS[node.type] ?? TYPE_COLORS.Other, "Required links and fields for this object type.");
    this.renderProgress(progress, "Validation completion", node.validationProfile?.completion ?? 0, "#35c46a", node.validationProfile?.note ?? "");
    this.renderProgress(progress, "Validation coverage", node.validationProfile?.coverage ?? 0, "#4f86e8", "How many symbolic, formal, physical, and experimental dimensions have a recorded state.");
    this.renderProgress(progress, "Priority", node.priorityProfile?.score ?? 0, "#e25a52", "Higher means central and incomplete, contradicted, or blocked by missing research links.");

    await base.renderOverviewTab.call(this, node, preview, container);
  }

  async renderDefinitionTab(node, preview, container) {
    await base.renderDefinitionTab.call(this, node, preview, container);
    const related = relatedDefinitions(this.graph, node, 18);
    if (!related.length) return;

    const section = this.inspectorSection(container, "Related definitions", `${related.length} Wikipedia-style concept links`);
    const list = section.createDiv({ cls: "wct-definition-link-list" });
    for (const item of related) {
      const card = list.createDiv({ cls: "wct-definition-link-card wct-browser-filter-item" });
      card.style.setProperty("--wct-related-color", TYPE_COLORS[item.node.type] ?? TYPE_COLORS.Glossary);
      const top = card.createDiv({ cls: "wct-definition-link-heading" });
      const button = top.createEl("button", { text: item.node.label, attr: { type: "button" } });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.showInspector(item.node);
      });
      top.createSpan({ text: item.relationLabel });
      const excerpt = card.createDiv({ cls: "wct-definition-link-excerpt", text: "Loading definition…" });
      const relatedPreview = await this.previewFor(item.node);
      const definition = await this.glossaryDefinitionFor(item.node.label) || relatedPreview.summary;
      excerpt.textContent = compactText(definition, 220) || "No definition recorded yet.";
    }
  }

  async renderEquationsTab(node, preview, container) {
    await base.renderEquationsTab.call(this, node, preview, container);
    const derivations = derivationConnections(this.graph, node, 40);
    if (!derivations.length) return;
    const section = this.inspectorSection(container, node.type === "Derivations" ? "Equations established" : "Linked derivations", `${derivations.length} connected`);
    const list = section.createDiv({ cls: "wct-derivation-link-list" });
    for (const item of derivations) {
      const row = list.createDiv({ cls: "wct-derivation-link-row wct-browser-filter-item" });
      row.createSpan({ cls: "wct-derivation-relation", text: titleCase(item.relationLabel) });
      this.createNodeButton(row, item.node);
      row.createSpan({ cls: "wct-derivation-completion", text: `${item.node.completenessProfile?.percent ?? 0}%` });
    }
  }

  async renderDerivationsTab(node, preview, container) {
    const local = extractSection(preview.content, ["Derivation", "Proof", "Derivation steps", "Steps", "Mathematical derivation"]);
    if (local) {
      const section = this.inspectorSection(container, "Derivation in this note");
      await this.renderMarkdown(section.createDiv({ cls: "wct-browser-markdown wct-browser-math wct-derivation-source" }), local, node.path);
    }

    const connections = derivationConnections(this.graph, node, 60);
    const title = node.type === "Derivations" ? "Equations connected to this derivation" : "Derivations connected to this equation";
    const section = this.inspectorSection(container, title, `${connections.length} linked`);
    if (!connections.length) {
      section.createEl("p", { text: "No derivation relationship is recorded yet. Add derives, derived-from, or depends-on metadata." });
      return;
    }
    for (const item of connections) {
      const card = section.createDiv({ cls: "wct-derivation-card wct-browser-filter-item" });
      const heading = card.createDiv({ cls: "wct-derivation-card-heading" });
      heading.createSpan({ text: RELATION_LABELS[item.relation] ?? item.relationLabel });
      const button = heading.createEl("button", { text: item.node.label, attr: { type: "button" } });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.showInspector(item.node);
      });
      const relatedPreview = await this.previewFor(item.node);
      card.createDiv({ cls: "wct-derivation-card-summary", text: compactText(relatedPreview.summary, 280) || "No derivation summary recorded." });
      const meter = card.createDiv({ cls: "wct-inline-meter" });
      const fill = meter.createDiv({ cls: "wct-inline-meter-fill" });
      fill.style.width = `${item.node.completenessProfile?.percent ?? 0}%`;
    }
  }

  async renderPriorityTab(node, preview, container) {
    const priority = node.priorityProfile ?? { score: 0, reasons: [] };
    const completeness = node.completenessProfile ?? { percent: 0, checks: [], missing: [] };
    const validation = node.validationProfile ?? { completion: 0, entries: [] };

    const score = this.inspectorSection(container, "Priority value", "Action priority, not scientific importance");
    const hero = score.createDiv({ cls: "wct-priority-hero wct-browser-filter-item" });
    hero.createEl("strong", { text: String(priority.score) });
    const heroText = hero.createDiv();
    heroText.createSpan({ text: "Priority score" });
    heroText.createEl("small", { text: `${completeness.percent}% research complete · ${validation.completion}% validation complete` });

    if (priority.reasons?.length) {
      const reasons = this.inspectorSection(container, "Why it bubbled up");
      const list = reasons.createEl("ol", { cls: "wct-priority-reasons" });
      for (const reason of priority.reasons) list.createEl("li", { cls: "wct-browser-filter-item", text: reason });
    }

    const checklist = this.inspectorSection(container, "Completion checklist", `${completeness.checks?.filter((item) => item.complete).length ?? 0}/${completeness.checks?.length ?? 0} items`);
    for (const check of completeness.checks ?? []) {
      const row = checklist.createDiv({ cls: `wct-check-row wct-browser-filter-item ${check.complete ? "is-complete" : "is-missing"}` });
      row.createSpan({ cls: "wct-check-symbol", text: check.complete ? "✓" : "○" });
      const body = row.createDiv();
      body.createEl("strong", { text: check.label });
      if (!check.complete && check.reason) body.createEl("small", { text: check.reason });
    }

    const validationSection = this.inspectorSection(container, "Validation dimensions");
    for (const entry of validation.entries ?? []) {
      const row = validationSection.createDiv({ cls: "wct-validation-dimension wct-browser-filter-item" });
      row.createSpan({ text: entry.label });
      row.createEl("strong", { text: titleCase(entry.status) });
      row.createEl("em", { text: `${Math.round(entry.weight * 100)}%` });
    }
  }

  async renderAllTab(node, preview, container) {
    await this.renderDefinitionTab(node, preview, container);
    await this.renderEquationsTab(node, preview, container);
    await this.renderDerivationsTab(node, preview, container);
    await this.renderPriorityTab(node, preview, container);
    await base.renderPapersTab.call(this, node, preview, container);
    await base.renderLinksTab.call(this, node, preview, container);
    await base.renderBacklinksTab.call(this, node, preview, container);
    await base.renderRepositoriesTab.call(this, node, preview, container);
    await base.renderPropertiesTab.call(this, node, preview, container);
  }

  async renderBrowserTab(node, preview, key) {
    if (!["derivations", "priority"].includes(key)) {
      return base.renderBrowserTab.call(this, node, preview, key);
    }
    this.browserPane.empty();
    this.browserPane.setAttr("data-tab", key);
    if (key === "derivations") await this.renderDerivationsTab(node, preview, this.browserPane);
    else await this.renderPriorityTab(node, preview, this.browserPane);
    for (const button of this.browserTabs.querySelectorAll("button")) {
      button.classList.toggle("is-active", button.dataset.tab === key);
    }
    this.filterBrowserPane();
  }

  addBrowserTab(key, label, beforeKey = null) {
    if (this.browserTabs.querySelector(`button[data-tab="${key}"]`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.tab = key;
    button.textContent = label;
    const before = beforeKey ? this.browserTabs.querySelector(`button[data-tab="${beforeKey}"]`) : null;
    this.browserTabs.insertBefore(button, before);
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const node = this.selected;
      if (!node) return;
      const preview = await this.previewFor(node);
      await this.renderBrowserTab(node, preview, key);
    });
  }

  async showInspector(sceneNodeValue) {
    await base.showInspector.call(this, sceneNodeValue);
    const node = this.selected;
    if (!node) return;
    this.inspector.style.setProperty("--wct-object-color", TYPE_COLORS[node.type] ?? TYPE_COLORS.Other);
    this.inspector.setAttribute("data-object-type", node.type);
    this.addBrowserTab("priority", "Priority", "definition");
    this.addBrowserTab("derivations", "Derivations", "papers");
  }
}

const combined = {};
for (const source of [base, InspectorV07.prototype]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(combined, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

module.exports = combined;