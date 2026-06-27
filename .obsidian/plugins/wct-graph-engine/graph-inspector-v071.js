"use strict";

const base = require("./graph-inspector-v07");
const { TYPE_COLORS, STATUS_COLORS, clamp, compactText } = require("./graph-core");
const { relatedDefinitions } = require("./graph-knowledge");
const { mentionedGlossary } = require("./graph-linker-v07");
const { runPdfImporter } = require("./graph-pdf-import");

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truthy(value) {
  if (value === true || value === 1) return true;
  return ["true", "yes", "verified", "complete", "done", "pass"].includes(String(value ?? "").trim().toLowerCase());
}

class InspectorV071 {
  positionTooltip(event) {
    const rect = this.stage.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const width = this.tooltip.offsetWidth || 430;
    const height = this.tooltip.offsetHeight || 250;
    let left = cursorX + 30;
    if (left + width > this.width - 8) left = cursorX - width - 30;
    let top = cursorY + 34;
    if (top + height > this.height - 8) top = cursorY - height - 34;
    this.tooltip.style.left = `${clamp(left, 8, Math.max(8, this.width - width - 8))}px`;
    this.tooltip.style.top = `${clamp(top, 8, Math.max(8, this.height - height - 8))}px`;
  }

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

  renderPdfDerivationState(node, container) {
    const isPaperPdf = node.type === "Papers" && Boolean(node.frontmatter?.pdf_url);
    const isPdfDerivation = node.type === "Derivations" && String(node.frontmatter?.source_kind ?? "").toLowerCase() === "pdf";
    if (!isPaperPdf && !isPdfDerivation) return;

    const connected = this.connectedByType(node, "Derivations")
      .filter((candidate) => String(candidate.frontmatter?.source_kind ?? "").toLowerCase() === "pdf");
    const section = this.inspectorSection(
      container,
      "PDF derivation state",
      isPaperPdf ? `${connected.length} imported derivation objects` : "Page-provenance extraction",
    );
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
      facts.createSpan({ text: `Extractor: ${node.frontmatter?.extraction_method ?? "unknown"}` });
    }

    const actions = state.createDiv({ cls: "wct-pdf-state-actions" });
    if (node.frontmatter?.pdf_url || node.frontmatter?.source_pdf) {
      const openPdf = actions.createEl("button", { text: "Open source PDF", attr: { type: "button" } });
      openPdf.addEventListener("click", () => window.open(node.frontmatter.pdf_url ?? node.frontmatter.source_pdf, "_blank", "noopener"));
    }
    if (isPaperPdf) {
      const importButton = actions.createEl("button", {
        text: connected.length ? "Re-import this PDF" : "Import this PDF's derivations",
        attr: { type: "button" },
      });
      importButton.addEventListener("click", () => runPdfImporter(this.plugin, { paper: node.label, refresh: connected.length > 0 }));
      const allButton = actions.createEl("button", { text: "Import all PDF derivations", attr: { type: "button" } });
      allButton.addEventListener("click", () => runPdfImporter(this.plugin));
    }

    if (connected.length) {
      const list = section.createDiv({ cls: "wct-browser-button-list" });
      for (const derivation of connected) this.createNodeButton(list, derivation);
    }
  }

  async renderDerivationsTab(node, preview, container) {
    this.renderPdfDerivationState(node, container);
    await base.renderDerivationsTab.call(this, node, preview, container);
  }

  async renderPriorityTab(node, preview, container) {
    const state = node.currentState ?? {
      label: "Unknown",
      summary: "No current-state profile is available.",
      tone: "open",
      missing: node.completenessProfile?.missing ?? [],
    };

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

    const missingSection = this.inspectorSection(
      container,
      "What is missing",
      `${state.missing?.length ?? 0} required items`,
    );
    if (!state.missing?.length) {
      missingSection.createDiv({ cls: "wct-missing-none wct-browser-filter-item", text: "No required workflow fields or links are missing. Remaining work, if any, is validation rather than structure." });
    } else {
      for (const check of state.missing) {
        const row = missingSection.createDiv({ cls: "wct-missing-detail wct-browser-filter-item" });
        row.createSpan({ cls: "wct-missing-marker", text: "○" });
        const body = row.createDiv();
        body.createEl("strong", { text: check.label });
        body.createEl("p", { text: check.reason || "This required item has not been recorded." });
      }
    }

    await base.renderPriorityTab.call(this, node, preview, container);
  }
}

const combined = {};
for (const source of [base, InspectorV071.prototype]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(combined, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

module.exports = combined;