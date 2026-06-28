"use strict";

const base = require("./graph-inspector-v071");
const {
  normalizeScientificText,
  normalizeSearch,
  compactScientificText,
} = require("./graph-text-v09");

function normalizeMarkdownText(value) {
  const parts = String(value ?? "").split(/(\$\$[\s\S]*?\$\$|\$[^\n$]+\$|```[\s\S]*?```)/g);
  return parts.map((part, index) => index % 2 ? part : normalizeScientificText(part)).join("");
}

function firstMath(content) {
  const text = String(content ?? "");
  const display = text.match(/\$\$[\s\S]*?\$\$/)?.[0];
  if (display) return display;
  const bracketed = text.match(/\\\[[\s\S]*?\\\]/)?.[0];
  if (bracketed) return bracketed.replace(/^\\\[/, "$$").replace(/\\\]$/, "$$");
  const fenced = text.match(/```(?:math|latex)\s*\n([\s\S]*?)```/i)?.[1];
  if (fenced) return `$$\n${fenced.trim()}\n$$`;
  const inline = text.match(/\$([^$\n]{3,500})\$/)?.[1];
  return inline ? `$$\n${inline.trim()}\n$$` : "";
}

function typedEquationRows(graph, node) {
  const rows = [];
  for (const edge of graph.outgoing.get(node.id) ?? []) {
    const other = graph.byId.get(edge.target);
    if (other && edge.relation !== "links") rows.push({ arrow: "→", edge, other });
  }
  for (const edge of graph.incoming.get(node.id) ?? []) {
    const other = graph.byId.get(edge.source);
    if (other && edge.relation !== "links") rows.push({ arrow: "←", edge, other });
  }
  return rows.sort((a, b) => a.edge.relation.localeCompare(b.edge.relation) || a.other.label.localeCompare(b.other.label));
}

class InspectorTextV09 {
  async previewFor(node) {
    if (node?.virtual) {
      return {
        summary: normalizeScientificText(node.virtualContent, { singleLine: true }),
        type: node.type,
        neighbors: [...(this.graph.adjacency.get(node.id) ?? [])]
          .map((id) => this.graph.byId.get(id)?.label)
          .filter(Boolean)
          .slice(0, 8),
        content: `# ${node.label}\n\n## ${node.type.slice(0, -1)}\n\n${node.virtualContent}\n\n## Source paper\n\n[[${node.sourcePaperPath}|${node.sourcePaperLabel}]]`,
      };
    }
    const preview = await base.previewFor.call(this, node);
    return {
      ...preview,
      summary: normalizeScientificText(preview.summary, { singleLine: true }),
    };
  }

  async glossaryDefinitionFor(label) {
    if (!this._wctGlossaryDefinitionsV09) {
      this._wctGlossaryDefinitionsV09 = new Map();
      const file = this.app.vault.getAbstractFileByPath("Research/03 Glossary/WCT Glossary.md");
      if (file) {
        const content = await this.app.vault.cachedRead(file);
        const lines = content.split(/\r?\n/);
        for (let index = 0; index < lines.length; index += 1) {
          const match = lines[index].match(/^\s*[-*]\s+\*\*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\*\*\s*(?:—|–|-|:)\s*(.*)$/);
          if (!match) continue;
          const display = match[2] || match[1].split("/").pop();
          let definition = match[3].trim();
          let cursor = index + 1;
          while (cursor < lines.length && !/^\s*[-*]\s+\*\*\[\[/.test(lines[cursor]) && !/^#{1,5}\s+/.test(lines[cursor])) {
            const continuation = lines[cursor].trim();
            if (continuation) definition += ` ${continuation}`;
            cursor += 1;
          }
          definition = normalizeScientificText(definition, { singleLine: true });
          if (definition) this._wctGlossaryDefinitionsV09.set(normalizeSearch(display), definition);
        }
      }
    }
    const fallback = await base.glossaryDefinitionFor.call(this, label);
    return this._wctGlossaryDefinitionsV09.get(normalizeSearch(label))
      ?? normalizeScientificText(fallback, { singleLine: true });
  }

  async renderMarkdown(container, markdown, sourcePath) {
    const value = container.classList.contains("wct-browser-definition")
      || container.classList.contains("wct-hover-definition-detail")
      ? normalizeMarkdownText(markdown)
      : markdown;
    return base.renderMarkdown.call(this, container, value, sourcePath);
  }

  showTooltip(sceneNode, event) {
    base.showTooltip.call(this, sceneNode, event);
    const node = this.graph.byId.get(sceneNode.id) ?? sceneNode;
    if (node?.type !== "Equations" || !node.path) return;
    const id = node.id;
    this.previewFor(node).then(async (preview) => {
      if (this.hovered?.id !== id) return;
      this.tooltip.querySelector(".wct-hover-detail")?.remove();
      const detail = this.tooltip.createDiv({ cls: "wct-hover-detail" });
      const box = detail.createDiv({ cls: "wct-hover-equation-detail" });
      box.createEl("strong", { text: "Rendered equation" });
      const math = firstMath(preview.content);
      if (math) await this.renderMarkdown(box.createDiv({ cls: "wct-browser-math" }), math, node.path);
      else box.createEl("p", { text: compactScientificText(preview.summary, 560) || "No readable LaTeX block was found." });
      const relations = box.createDiv({ cls: "wct-hover-equation-relations" });
      for (const row of typedEquationRows(this.graph, node).slice(0, 8)) {
        relations.createSpan({ text: `${row.arrow} ${row.edge.relation}: ${row.other.label}` });
      }
      this.positionTooltip(event);
    });
  }
}

module.exports = InspectorTextV09.prototype;