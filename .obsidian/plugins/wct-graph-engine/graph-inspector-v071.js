"use strict";

const base = require("./graph-inspector-v07");
const { TYPE_COLORS, STATUS_COLORS, RELATION_COLORS, clamp } = require("./graph-core");
const { relatedDefinitions } = require("./graph-knowledge");
const { mentionedGlossary } = require("./graph-linker-v07");
const { runPdfImporter } = require("./graph-pdf-import");
const { normalizeScientificText, compactScientificText } = require("./graph-text-v09");

function titleCase(value) {
  return String(value ?? "").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truthy(value) {
  if (value === true || value === 1) return true;
  return ["true", "yes", "verified", "complete", "done", "pass"].includes(String(value ?? "").trim().toLowerCase());
}

function firstDisplayMath(content) {
  return String(content ?? "").match(/\$\$[\s\S]*?\$\$/)?.[0] ?? "";
}

function typedRows(graph, node) {
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
    || a.other.type.localeCompare(b.other.type)
    || a.other.label.localeCompare(b.other.label));
}

function sourcePaperFor(graph, node) {
  if (node.sourcePaperId) return graph.byId.get(node.sourcePaperId) ?? null;
  const path = node.frontmatter?.source_paper;
  return path ? graph.nodes.find((candidate) => candidate.type === "Papers" && candidate.path === path) ?? null : null;
}

class InspectorV071 {
  positionTooltip(event) {
    const rect = this.stage.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const width = this.tooltip.offsetWidth || 520;
    const height = this.tooltip.offsetHeight || 360;
    let left = cursorX + 30;
    if (left + width > this.width - 8) left = cursorX - width - 30;
    let top = cursorY + 34;
    if (top + height > this.height - 8) top = cursorY - height - 34;
    this.tooltip.style.left = `${clamp(left, 8, Math.max(8, this.width - width - 8))}px`;
    this.tooltip.style.top = `${clamp(top, 8, Math.max(8, this.height - height - 8))}px`;
  }

  showTooltip(sceneNode, event) {
    base.showTooltip.call(this, sceneNode, event);
    const node = this.graph.byId.get(sceneNode.id) ?? sceneNode;
    const state = node.currentState;
    if (state) {
      this.tooltip.querySelector(".wct-hover-current-state")?.remove();
      const card = this.tooltip.createDiv({ cls: `wct-hover-current-state tone-${state.tone ?? "open"}` });
      card.createEl("strong", { text: state.label });
      card.createSpan({ text: state.summary });
      const missing = state.missing?.length ?? 0;
      card.createEl("em", { text: missing ? `${missing} required item${missing === 1 ? "" : "s"} missing` : "No required structural gaps" });
    }
    if (!node?.path) return;
    const id = node.id;
    this.previewFor(node).then(async (preview) => {
      if (this.hovered?.id !== id) return;
      this.tooltip.querySelector(".wct-hover-detail")?.remove();
      const detail = this.tooltip.createDiv({ cls: "wct-hover-detail" });
      if (node.type === "Glossary") {
        const box = detail.createDiv({ cls: "wct-hover-definition-detail" });
        box.createEl("strong", { text: "Detailed definition" });
        const definition = await this.glossaryDefinitionFor(node.label) || preview.summary;
        await this.renderMarkdown(box.createDiv(), compactScientificText(definition, 760), node.path);
      } else if (node.type === "References") {
        const box = detail.createDiv({ cls: "wct-hover-definition-detail" });
        box.createEl("strong", { text: "Reference summary" });
        box.createEl("p", { text: compactScientificText(preview.summary, 620) || "No reference summary is recorded." });
        const concepts = this.connectedByType(node, "Glossary").slice(0, 5);
        if (concepts.length) {
          const list = detail.createDiv({ cls: "wct-hover-concept-definitions" });
          list.createEl("strong", { text: "Parsed glossary concepts" });
          for (const concept of concepts) {
            const row = list.createDiv();
            row.createEl("b", { text: concept.label });
            row.createSpan({ text: compactScientificText(await this.glossaryDefinitionFor(concept.label), 240) || "Definition missing." });
          }
        }
      } else if (node.type === "Equations") {
        const box = detail.createDiv({ cls: "wct-hover-equation-detail" });
        box.createEl("strong", { text: "Rendered equation" });
        const math = firstDisplayMath(preview.content);
        if (math) await this.renderMarkdown(box.createDiv({ cls: "wct-browser-math" }), math, node.path);
        else box.createEl("p", { text: compactScientificText(preview.summary, 520) || "No readable equation block was found." });
        const relationBox = box.createDiv({ cls: "wct-hover-equation-relations" });
        for (const row of typedRows(this.graph, node).filter((item) => item.edge.relation !== "links").slice(0, 6)) {
          relationBox.createSpan({ text: `${row.direction === "out" ? "→" : "←"} ${row.edge.relation}: ${row.other.label}` });
        }
      } else {
        const box = detail.createDiv({ cls: "wct-hover-definition-detail" });
        box.createEl("strong", { text: "Detailed summary" });
        box.createEl("p", { text: compactScientificText(preview.summary, 680) || "No detailed summary is recorded." });
      }
      this.positionTooltip(event);
    });
    this.positionTooltip(event);
  }

  async renderDefinitionTab(node, preview, container) {
    await base.renderDefinitionTab.call(this, node, preview, container);
    const explicit = new Set(relatedDefinitions(this.graph, node, 100).map((item) => item.node.id));
    const mentioned = mentionedGlossary(this.graph, node, preview.content, 32).filter((item) => !explicit.has(item.node.id));

    if (mentioned.length) {
      const section = this.inspectorSection(container, "Mentioned concepts", `${mentioned.length} inferred from exact note text`);
      section.createEl("p", { cls: "wct-browser-inference-note", text: "Inferred exact-name mentions remain distinct from canonical typed relations." });
      const list = section.createDiv({ cls: "wct-definition-link-list" });
      for (const item of mentioned) {
        const card = list.createDiv({ cls: "wct-definition-link-card is-inferred wct-browser-filter-item" });
        card.style.setProperty("--wct-related-color", TYPE_COLORS.Glossary);
        const top = card.createDiv({ cls: "wct-definition-link-heading" });
        const button = top.createEl("button", { text: item.node.label, attr: { type: "button" } });
        button.addEventListener("click", () => this.showInspector(item.node));
        top.createSpan({ text: "mentioned" });
        const definition = await this.glossaryDefinitionFor(item.node.label) || (await this.previewFor(item.node)).summary;
        card.createDiv({ cls: "wct-definition-link-excerpt", text: compactScientificText(definition, 420) || "No definition recorded yet." });
      }
    }

    if (node.type === "References") {
      const concepts = this.connectedByType(node, "Glossary");
      const section = this.inspectorSection(container, "Glossary definitions parsed from this reference", `${concepts.length} resolved concepts`);
      if (!concepts.length) section.createEl("p", { text: "No exact glossary term mentions were resolved from this reference." });
      for (const concept of concepts) {
        const card = section.createDiv({ cls: "wct-reference-definition-card wct-browser-filter-item" });
        const button = card.createEl("button", { text: concept.label, attr: { type: "button" } });
        button.addEventListener("click", () => this.showInspector(concept));
        card.createEl("p", { text: compactScientificText(await this.glossaryDefinitionFor(concept.label), 620) || "Definition missing from the canonical glossary." });
      }
    }
  }

  renderPdfDerivationState(node, container) {
    const isPaperPdf = node.type === "Papers" && Boolean(node.frontmatter?.pdf_url);
    const isPdfDerivation = node.type === "Derivations" && String(node.frontmatter?.source_kind ?? "").toLowerCase() === "pdf";
    if (!isPaperPdf && !isPdfDerivation) return;
    const connected = this.connectedByType(node, "Derivations").filter((candidate) => String(candidate.frontmatter?.source_kind ?? "").toLowerCase() === "pdf");
    const section = this.inspectorSection(container, "PDF derivation state", isPaperPdf ? `${connected.length} imported derivation objects` : "Page-provenance extraction");
    const state = section.createDiv({ cls: `wct-pdf-state-card tone-${node.currentState?.tone ?? "missing"} wct-browser-filter-item` });
    state.createEl("strong", { text: node.currentState?.label ?? (connected.length ? "Imported" : "Not imported") });
    state.createEl("p", { text: node.currentState?.summary ?? "The current PDF derivation state has not been calculated." });
    const facts = state.createDiv({ cls: "wct-pdf-state-facts" });
    if (isPaperPdf) {
      facts.createSpan({ text: `PDF: ${node.frontmatter.pdf_url ? "available" : "missing"}` });
      facts.createSpan({ text: `Imported sections: ${connected.length}` });
    } else {
      facts.createSpan({ text: `Pages: ${node.frontmatter?.source_pages ?? "unknown"}` });
      facts.createSpan({ text: `Human review: ${truthy(node.frontmatter?.human_verified) ? "verified" : "pending"}` });
      facts.createSpan({ text: `Canonical LaTeX: ${truthy(node.frontmatter?.canonical_latex_verified) ? "verified" : "pending"}` });
    }
    const actions = state.createDiv({ cls: "wct-pdf-state-actions" });
    if (node.frontmatter?.pdf_url || node.frontmatter?.source_pdf) {
      const openPdf = actions.createEl("button", { text: "Open source PDF", attr: { type: "button" } });
      openPdf.addEventListener("click", () => window.open(node.frontmatter.pdf_url ?? node.frontmatter.source_pdf, "_blank", "noopener"));
    }
    if (isPaperPdf) {
      const importButton = actions.createEl("button", { text: connected.length ? "Re-import this PDF" : "Import this PDF's derivations", attr: { type: "button" } });
      importButton.addEventListener("click", () => runPdfImporter(this.plugin, { paper: node.label, refresh: connected.length > 0 }));
    }
    if (connected.length) {
      const list = section.createDiv({ cls: "wct-browser-button-list" });
      for (const derivation of connected) this.createNodeButton(list, derivation);
    }
  }

  renderEquationConnectionMap(node, container) {
    const rows = typedRows(this.graph, node);
    const section = this.inspectorSection(container, "Equation relationship map", `${rows.length} connections`);
    if (!rows.length) {
      section.createEl("p", { text: "No equation relationship is recorded." });
      return;
    }
    const table = section.createEl("table", { cls: "wct-equation-relation-table" });
    const header = table.createEl("thead").createEl("tr");
    for (const label of ["Direction", "Relation", "Type", "Connected object", "Equation ID"]) header.createEl("th", { text: label });
    const body = table.createEl("tbody");
    for (const row of rows) {
      const tr = body.createEl("tr", { cls: "wct-browser-filter-item" });
      tr.style.setProperty("--wct-relation-color", RELATION_COLORS[row.edge.relation] ?? RELATION_COLORS.links);
      tr.createEl("td", { text: row.direction === "out" ? "→" : "←" });
      tr.createEl("td", { text: row.edge.relation.replace(/-/g, " ") });
      tr.createEl("td", { text: row.other.type });
      this.createNodeButton(tr.createEl("td"), row.other);
      tr.createEl("td", { text: row.edge.equationId ?? "—" });
    }
  }

  async renderEquationsTab(node, preview, container) {
    await base.renderEquationsTab.call(this, node, preview, container);
    if (node.type === "Equations" || node.type === "Derivations" || this.connectedByType(node, "Equations").length) this.renderEquationConnectionMap(node, container);
  }

  async renderDerivationsTab(node, preview, container) {
    this.renderPdfDerivationState(node, container);
    await base.renderDerivationsTab.call(this, node, preview, container);
  }

  paperObjects(node, type) {
    const paper = node.type === "Papers" ? node : sourcePaperFor(this.graph, node);
    if (!paper) return [];
    return [...(this.graph.adjacency.get(paper.id) ?? [])]
      .map((id) => this.graph.byId.get(id))
      .filter((candidate) => candidate?.type === type && (candidate.sourcePaperId === paper.id || candidate.frontmatter?.source_paper === paper.path))
      .sort((a, b) => Number(a.sourceIndex ?? 0) - Number(b.sourceIndex ?? 0) || a.label.localeCompare(b.label));
  }

  async renderPaperObjectsTab(node, preview, container) {
    const sourcePaper = node.type === "Papers" ? node : sourcePaperFor(this.graph, node);
    if (sourcePaper && sourcePaper.id !== node.id) {
      const source = this.inspectorSection(container, "Source paper");
      this.createNodeButton(source, sourcePaper);
    }
    for (const type of ["Claims", "Theorems", "Derivations", "Contradictions"]) {
      const objects = this.paperObjects(node, type);
      const section = this.inspectorSection(container, type, `${objects.length} explicit objects found in ingested paper text`);
      if (!objects.length) {
        section.createEl("p", { text: `No explicit ${type.toLowerCase()} were found in the currently ingested note or PDF-derived objects.` });
        continue;
      }
      for (const object of objects) {
        const card = section.createDiv({ cls: `wct-paper-object-card type-${type.toLowerCase()} wct-browser-filter-item` });
        const heading = card.createDiv();
        heading.createSpan({ text: object.sourceHeading ?? object.frontmatter?.source_heading ?? type.slice(0, -1) });
        this.createNodeButton(heading, object);
        card.createEl("p", { text: compactScientificText(object.virtualContent ?? object.label, 700) });
      }
    }
  }

  async renderPriorityTab(node, preview, container) {
    const rank = this.inspectorSection(container, "Corpus priority rank", `${node.priorityTotal ?? this.graph.nodes.length} ranked objects`);
    const rankCard = rank.createDiv({ cls: "wct-priority-rank-card wct-browser-filter-item" });
    rankCard.createEl("strong", { text: `#${node.priorityRank ?? "—"}` });
    const detail = rankCard.createDiv();
    detail.createSpan({ text: `of ${(node.priorityTotal ?? this.graph.nodes.length).toLocaleString()} objects` });
    detail.createEl("small", { text: `Diagnostic score ${node.priorityProfile?.score ?? 0}/100; the rank is unique across the corpus.` });

    const state = node.currentState ?? { label: "Unknown", summary: "No current-state profile is available.", tone: "open", missing: node.completenessProfile?.missing ?? [] };
    const current = this.inspectorSection(container, "Current state", `${state.assessed ?? 0}/4 validation dimensions assessed`);
    const stateCard = current.createDiv({ cls: `wct-current-state-card tone-${state.tone} wct-browser-filter-item` });
    stateCard.createEl("strong", { text: state.label });
    stateCard.createEl("p", { text: state.summary });
    const matrix = current.createDiv({ cls: "wct-current-state-matrix" });
    for (const [dimension, status] of Object.entries(node.statuses ?? {})) {
      const item = matrix.createDiv({ cls: "wct-current-state-dimension wct-browser-filter-item" });
      item.style.setProperty("--wct-state-color", STATUS_COLORS[status] ?? STATUS_COLORS.unreviewed);
      item.createSpan({ text: titleCase(dimension) });
      item.createEl("strong", { text: titleCase(status) });
    }
    const missingSection = this.inspectorSection(container, "What is missing", `${state.missing?.length ?? 0} required items`);
    if (!state.missing?.length) missingSection.createDiv({ cls: "wct-missing-none wct-browser-filter-item", text: "No required workflow fields or links are missing." });
    for (const check of state.missing ?? []) {
      const row = missingSection.createDiv({ cls: "wct-missing-detail wct-browser-filter-item" });
      row.createSpan({ cls: "wct-missing-marker", text: "○" });
      const body = row.createDiv();
      body.createEl("strong", { text: check.label });
      body.createEl("p", { text: check.reason || "This required item has not been recorded." });
    }
    await base.renderPriorityTab.call(this, node, preview, container);
  }

  async renderBrowserTab(node, preview, key) {
    if (key !== "objects") return base.renderBrowserTab.call(this, node, preview, key);
    this.browserPane.empty();
    this.browserPane.setAttr("data-tab", key);
    await this.renderPaperObjectsTab(node, preview, this.browserPane);
    for (const button of this.browserTabs.querySelectorAll("button")) button.classList.toggle("is-active", button.dataset.tab === key);
    this.filterBrowserPane();
  }

  async renderAllTab(node, preview, container) {
    await base.renderAllTab.call(this, node, preview, container);
    await this.renderPaperObjectsTab(node, preview, container);
  }

  async showInspector(sceneNodeValue) {
    await base.showInspector.call(this, sceneNodeValue);
    this.addBrowserTab("objects", "Paper objects", "papers");
  }
}

const combined = {};
for (const source of [base, InspectorV071.prototype]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(combined, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

module.exports = combined;