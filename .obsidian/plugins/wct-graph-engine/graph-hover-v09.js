"use strict";

const base = require("./graph-inspector-v071");
const { compactScientificText } = require("./graph-text-v09");

function extractMathBlocks(content) {
  const values = [];
  const seen = new Set();
  for (const pattern of [/\$\$[\s\S]*?\$\$/g, /```(?:math|latex)\s*\n[\s\S]*?```/gi]) {
    for (const match of String(content ?? "").matchAll(pattern)) {
      let value = match[0].trim();
      if (/^```/i.test(value)) value = value.replace(/^```(?:math|latex)\s*/i, "$$\n").replace(/```$/, "\n$$");
      if (!seen.has(value)) {
        seen.add(value);
        values.push(value);
      }
    }
  }
  return values;
}

function relationRows(graph, node) {
  const rows = [];
  for (const edge of graph.outgoing.get(node.id) ?? []) {
    const other = graph.byId.get(edge.target);
    if (other) rows.push({ direction: "out", edge, other });
  }
  for (const edge of graph.incoming.get(node.id) ?? []) {
    const other = graph.byId.get(edge.source);
    if (other) rows.push({ direction: "in", edge, other });
  }
  return rows.sort((a, b) => (b.edge.relation !== "links" ? 1 : 0) - (a.edge.relation !== "links" ? 1 : 0)
    || a.edge.relation.localeCompare(b.edge.relation)
    || a.other.label.localeCompare(b.other.label));
}

class HoverV09 {
  showTooltip(sceneNode, event) {
    base.showTooltip.call(this, sceneNode, event);
    const node = this.graph.byId.get(sceneNode.id) ?? sceneNode;
    if (!node?.path) return;
    const id = node.id;

    this.previewFor(node).then(async (preview) => {
      if (this.hovered?.id !== id) return;
      this.tooltip.querySelector(".wct-hover-detail")?.remove();
      const detail = this.tooltip.createDiv({ cls: "wct-hover-detail" });

      if (node.type === "Glossary" || node.type === "References") {
        const definition = node.type === "Glossary"
          ? await this.glossaryDefinitionFor(node.label) || preview.summary
          : preview.summary;
        const box = detail.createDiv({ cls: "wct-hover-definition-detail" });
        box.createEl("strong", { text: node.type === "References" ? "Reference summary" : "Detailed definition" });
        await this.renderMarkdown(box.createDiv(), compactScientificText(definition, 760), node.path);
      }

      if (node.type === "References") {
        const concepts = this.connectedByType(node, "Glossary").slice(0, 5);
        if (concepts.length) {
          const list = detail.createDiv({ cls: "wct-hover-concept-definitions" });
          list.createEl("strong", { text: "Parsed glossary concepts" });
          for (const concept of concepts) {
            const definition = await this.glossaryDefinitionFor(concept.label);
            const row = list.createDiv();
            row.createEl("b", { text: concept.label });
            row.createSpan({ text: compactScientificText(definition, 240) || "Definition missing." });
          }
        }
      }

      if (node.type === "Equations") {
        const math = extractMathBlocks(preview.content)[0];
        const box = detail.createDiv({ cls: "wct-hover-equation-detail" });
        box.createEl("strong", { text: "Rendered equation" });
        if (math) await this.renderMarkdown(box.createDiv({ cls: "wct-browser-math" }), math, node.path);
        else box.createEl("p", { text: compactScientificText(preview.summary, 520) || "No readable equation block was found." });

        const typed = relationRows(this.graph, node).filter((row) => row.edge.relation !== "links").slice(0, 6);
        if (typed.length) {
          const map = box.createDiv({ cls: "wct-hover-equation-relations" });
          for (const row of typed) {
            map.createSpan({ text: `${row.direction === "out" ? "→" : "←"} ${row.edge.relation}: ${row.other.label}` });
          }
        }
      }

      if (!["Glossary", "References", "Equations"].includes(node.type)) {
        const summary = detail.createDiv({ cls: "wct-hover-definition-detail" });
        summary.createEl("strong", { text: "Detailed summary" });
        summary.createEl("p", { text: compactScientificText(preview.summary, 680) || "No detailed summary is recorded." });
      }
      this.positionTooltip(event);
    });
  }
}

module.exports = {
  ...HoverV09.prototype,
  relationRows,
};