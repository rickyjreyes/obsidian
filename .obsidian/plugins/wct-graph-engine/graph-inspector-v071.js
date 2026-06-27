"use strict";

const base = require("./graph-inspector-v07");
const { TYPE_COLORS, compactText } = require("./graph-core");
const { relatedDefinitions } = require("./graph-knowledge");
const { mentionedGlossary } = require("./graph-linker-v07");

class InspectorV071 {
  async renderDefinitionTab(node, preview, container) {
    await base.renderDefinitionTab.call(this, node, preview, container);

    const explicit = new Set(relatedDefinitions(this.graph, node, 100).map((item) => item.node.id));
    const mentioned = mentionedGlossary(this.graph, node, preview.content, 16)
      .filter((item) => !explicit.has(item.node.id));
    if (!mentioned.length) return;

    const section = this.inspectorSection(
      container,
      "Mentioned concepts",
      `${mentioned.length} inferred from the note text`,
    );
    section.createEl("p", {
      cls: "wct-browser-inference-note",
      text: "These links are inferred from exact concept-name mentions. Review them before promoting them to typed canonical relations.",
    });
    const list = section.createDiv({ cls: "wct-definition-link-list" });

    for (const item of mentioned) {
      const card = list.createDiv({ cls: "wct-definition-link-card is-inferred wct-browser-filter-item" });
      card.style.setProperty("--wct-related-color", TYPE_COLORS.Glossary);
      const top = card.createDiv({ cls: "wct-definition-link-heading" });
      const button = top.createEl("button", { text: item.node.label, attr: { type: "button" } });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.showInspector(item.node);
      });
      top.createSpan({ text: "mentioned" });
      const excerpt = card.createDiv({ cls: "wct-definition-link-excerpt", text: "Loading definition…" });
      const relatedPreview = await this.previewFor(item.node);
      const definition = await this.glossaryDefinitionFor(item.node.label) || relatedPreview.summary;
      excerpt.textContent = compactText(definition, 220) || "No definition recorded yet.";
    }
  }
}

const combined = {};
for (const source of [base, InspectorV071.prototype]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(combined, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

module.exports = combined;