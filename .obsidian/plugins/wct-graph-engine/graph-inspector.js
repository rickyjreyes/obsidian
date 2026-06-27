"use strict";

const obsidianApi = globalThis.__WCT_OBSIDIAN_API__;
if (!obsidianApi?.MarkdownRenderer) {
  throw new Error("WCT Graph Engine did not receive the Obsidian API before loading graph-inspector.js.");
}
const { MarkdownRenderer } = obsidianApi;
const {
  TYPE_ORDER,
  STATUS_COLORS,
  clamp,
  summaryForType,
  compactText,
} = require("./graph-core");
const { repositoryMatches } = require("./graph-repository-index");

const BROWSER_TABS = [
  ["overview", "Overview"],
  ["definition", "Definition"],
  ["equations", "Equations"],
  ["papers", "Papers"],
  ["links", "Links"],
  ["backlinks", "Backlinks"],
  ["properties", "Properties"],
  ["repositories", "Repositories"],
  ["all", "All"],
  ["source", "Source"],
];

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCreated(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return "Unknown";
  return new Date(Number(timestamp)).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stripFrontmatter(content) {
  return String(content ?? "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(content, headings) {
  const text = stripFrontmatter(content);
  for (const heading of headings) {
    const pattern = new RegExp(`^#{1,4}\\s+${escapeRegExp(heading)}\\s*$`, "im");
    const match = pattern.exec(text);
    if (!match) continue;
    const tail = text.slice(match.index + match[0].length);
    const next = tail.search(/^#{1,4}\s+/m);
    const section = (next >= 0 ? tail.slice(0, next) : tail).trim();
    if (section) return section;
  }
  return "";
}

function extractMathBlocks(content) {
  const text = String(content ?? "");
  const blocks = [];
  const seen = new Set();
  const patterns = [
    /\$\$[\s\S]*?\$\$/g,
    /```math\s*\n[\s\S]*?```/gi,
    /```latex\s*\n[\s\S]*?```/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      let value = match[0].trim();
      if (/^```(?:math|latex)/i.test(value)) {
        value = value.replace(/^```(?:math|latex)\s*/i, "$$\n").replace(/```$/, "\n$$");
      }
      if (!seen.has(value)) {
        seen.add(value);
        blocks.push(value);
      }
    }
  }
  return blocks;
}

function normalizeLookup(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (character) => ({
      "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
      "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    })[character])
    .replace(/[^a-z0-9α-ω]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function prettyKey(value) {
  const special = {
    id: "Stable ID",
    doi: "DOI",
    url: "URL",
    pdf_url: "PDF URL",
    zenodo_record: "Zenodo record",
    sympy_status: "SymPy status",
    lean_status: "Lean status",
    formal_status: "Formal / Lean status",
    symbolic_status: "Symbolic / SymPy status",
    experimental_status: "Experimental status",
    physical_status: "Physical status",
  };
  return special[value] ?? titleCase(value);
}

function prettyValue(value) {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.map(prettyValue).join(" · ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value)
    .replace(/\bTheta\b/g, "Θ")
    .replace(/\bpsi\b/g, "ψ")
    .replace(/\bsigma\b/g, "σ")
    .replace(/\bkappa\b/g, "κ")
    .replace(/\btau\b/g, "τ")
    .replace(/\blambda\b/g, "λ")
    .replace(/\bphi\b/g, "φ")
    .replace(/\bhbar\b/g, "ℏ")
    .replace(/\bDelta\b/g, "Δ")
    .replace(/\bpartial\b/g, "∂")
    .replace(/\bgrad\b/g, "∇");
}

function isPlaceholder(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return !text
    || text.includes("add a concise definition")
    || text.includes("add definition")
    || text === "todo"
    || text === "tbd";
}

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

  async glossaryDefinitionFor(label) {
    if (!this._wctGlossaryDefinitions) {
      this._wctGlossaryDefinitions = new Map();
      const file = this.app.vault.getAbstractFileByPath("Research/03 Glossary/WCT Glossary.md");
      if (file) {
        const content = await this.app.vault.cachedRead(file);
        for (const line of content.split(/\r?\n/)) {
          const match = line.match(/^-\s+\*\*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\*\*\s+[—-]\s+(.+)$/);
          if (!match) continue;
          const display = match[2] || match[1].split("/").pop();
          this._wctGlossaryDefinitions.set(normalizeLookup(display), match[3].trim());
        }
      }
    }
    return this._wctGlossaryDefinitions.get(normalizeLookup(label)) ?? "";
  }

  showTooltip(sceneNode, event) {
    const node = this.graph.byId.get(sceneNode.id) ?? sceneNode;
    const auditCount = node.auditIssues?.length ?? 0;
    const relationCount = (this.graph.outgoing.get(node.id)?.length ?? 0)
      + (this.graph.incoming.get(node.id)?.length ?? 0);
    const initial = [
      node.label,
      `${node.type} · ${node.degree} connections`,
      node.stableId ? `ID: ${node.stableId}` : null,
      node.createdAt ? `Created: ${formatCreated(node.createdAt)}` : null,
      `Validation: ${titleCase(node.overallStatus ?? "unreviewed")}`,
      relationCount ? `${relationCount} typed relations` : "No typed relations recorded",
      auditCount ? `${auditCount} audit findings` : "No audit findings",
      node.path ?? "Click to enter this area",
    ].filter(Boolean).join("\n");
    this.tooltip.setText(initial);
    this.tooltip.removeClass("is-hidden");
    this.positionTooltip(event);
    if (!node.path) return;
    const id = node.id;
    this.previewFor(node).then((preview) => {
      if (this.hovered?.id !== id) return;
      const lines = [
        node.label,
        `${node.type} · ${node.degree} connections · ${titleCase(node.overallStatus ?? "unreviewed")}`,
        node.stableId ? `ID: ${node.stableId}` : null,
        compactText(preview.summary) || "No summary recorded yet.",
      ].filter(Boolean);
      if (preview.neighbors.length) lines.push(`Top links: ${preview.neighbors.join(" · ")}`);
      if (auditCount) lines.push(`Audit: ${auditCount} open findings`);
      this.tooltip.setText(lines.join("\n"));
    });
  }

  positionTooltip(event) {
    const rect = this.stage.getBoundingClientRect();
    const left = clamp(event.clientX - rect.left + 16, 8, Math.max(8, this.width - 410));
    const top = clamp(event.clientY - rect.top + 16, 8, Math.max(8, this.height - 230));
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

  async renderMarkdown(container, markdown, sourcePath) {
    await MarkdownRenderer.render(
      this.app,
      markdown || "_No content recorded._",
      container,
      sourcePath,
      this.plugin,
    );
  }

  inspectorSection(container, title, subtitle = "") {
    const section = container.createDiv({ cls: "wct-browser-section wct-browser-filter-item" });
    const heading = section.createDiv({ cls: "wct-browser-section-heading" });
    heading.createEl("h3", { text: title });
    if (subtitle) heading.createSpan({ text: subtitle });
    return section;
  }

  createStatusBadge(container, label, status) {
    const badge = container.createDiv({ cls: "wct-graph-status-badge wct-browser-filter-item" });
    badge.style.setProperty("--wct-status-color", STATUS_COLORS[status] ?? STATUS_COLORS.unreviewed);
    badge.createSpan({ cls: "wct-graph-status-dot" });
    badge.createSpan({ cls: "wct-graph-status-label", text: label });
    badge.createSpan({ cls: "wct-graph-status-value", text: titleCase(status) });
  }

  createIdentityRow(container, label, value, tone = "neutral") {
    const row = container.createDiv({ cls: `wct-graph-identity-row wct-browser-filter-item tone-${tone}` });
    row.createSpan({ cls: "wct-graph-identity-label", text: label });
    row.createSpan({ cls: "wct-graph-identity-value", text: String(value ?? "—") });
  }

  createNodeButton(container, node, prefix = "") {
    const button = container.createEl("button", {
      cls: "wct-browser-node-button wct-browser-filter-item",
      text: `${prefix}${node.label}`,
      attr: { type: "button" },
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      this.showInspector(node);
    });
    return button;
  }

  ordinaryOutgoing(node) {
    const cache = this.app.metadataCache.getFileCache(node.file) ?? {};
    return (cache.links ?? []).map((link) => {
      const destination = this.app.metadataCache.getFirstLinkpathDest?.(link.link, node.path);
      return {
        label: link.displayText || link.link,
        link: link.link,
        path: destination?.path ?? null,
      };
    });
  }

  ordinaryBacklinks(node) {
    const rows = [];
    const resolved = this.app.metadataCache.resolvedLinks ?? {};
    for (const [source, destinations] of Object.entries(resolved)) {
      if (!destinations?.[node.path]) continue;
      const sourceNode = this.graph.byId.get(source);
      rows.push({
        path: source,
        label: sourceNode?.label ?? source.split("/").pop()?.replace(/\.md$/, "") ?? source,
        weight: destinations[node.path],
        node: sourceNode,
      });
    }
    return rows.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || a.label.localeCompare(b.label));
  }

  connectedByType(node, type) {
    return [...(this.graph.adjacency.get(node.id) ?? [])]
      .map((id) => this.graph.byId.get(id))
      .filter((connected) => connected?.type === type)
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label));
  }

  async renderOverviewTab(node, preview, container) {
    const summary = this.inspectorSection(container, "Canonical overview", `${node.type} · ${node.degree} connections`);
    const markdown = summary.createDiv({ cls: "wct-browser-markdown" });
    await this.renderMarkdown(markdown, preview.summary, node.path);

    const identity = this.inspectorSection(container, "Identity and chronology");
    const identityGrid = identity.createDiv({ cls: "wct-graph-identity-grid" });
    this.createIdentityRow(identityGrid, "Stable ID", node.stableId ?? "Missing", node.stableIdSource === "frontmatter" ? "neutral" : "info");
    this.createIdentityRow(identityGrid, "ID source", titleCase(node.stableIdSource ?? "missing"), node.stableIdSource === "frontmatter" ? "neutral" : "info");
    this.createIdentityRow(identityGrid, "Created", formatCreated(node.createdAt));
    this.createIdentityRow(identityGrid, "Date source", titleCase(node.dateSource ?? "unknown"));
    this.createIdentityRow(identityGrid, "Semantic type", node.type);

    const validation = this.inspectorSection(container, "Validation state");
    const badges = validation.createDiv({ cls: "wct-graph-status-grid" });
    this.createStatusBadge(badges, "Overall", node.overallStatus ?? "unreviewed");
    this.createStatusBadge(badges, "Symbolic / SymPy", node.statuses?.symbolic ?? "unreviewed");
    this.createStatusBadge(badges, "Formal / Lean", node.statuses?.formal ?? "unreviewed");
    this.createStatusBadge(badges, "Physical", node.statuses?.physical ?? "unreviewed");
    this.createStatusBadge(badges, "Experimental", node.statuses?.experimental ?? "unreviewed");

    const counts = this.inspectorSection(container, "Research connections");
    const grid = counts.createDiv({ cls: "wct-browser-stat-grid" });
    const stats = [
      ["Equations", this.connectedByType(node, "Equations").length],
      ["Papers", this.connectedByType(node, "Papers").length],
      ["Outgoing links", this.ordinaryOutgoing(node).length],
      ["Backlinks", this.ordinaryBacklinks(node).length],
      ["Typed outgoing", this.graph.outgoing.get(node.id)?.length ?? 0],
      ["Typed incoming", this.graph.incoming.get(node.id)?.length ?? 0],
    ];
    for (const [label, value] of stats) {
      const card = grid.createDiv({ cls: "wct-browser-stat wct-browser-filter-item" });
      card.createEl("strong", { text: String(value) });
      card.createSpan({ text: label });
    }

    if (node.auditIssues?.length) {
      const audit = this.inspectorSection(container, "Audit findings", `${node.auditIssues.length} open`);
      for (const key of node.auditIssues) {
        const issue = this.graph.auditByKey.get(key);
        if (!issue) continue;
        const card = audit.createDiv({ cls: `wct-graph-audit-card severity-${issue.severity} wct-browser-filter-item` });
        card.createEl("strong", { text: issue.label });
        card.createEl("p", { text: issue.description });
        const button = card.createEl("button", { text: "Open audit graph", attr: { type: "button" } });
        button.addEventListener("click", (event) => {
          event.preventDefault();
          this.pushAuditIssue(issue.key, { id: `audit:${issue.key}` });
        });
      }
    }
  }

  async renderDefinitionTab(node, preview, container) {
    let definition = extractSection(preview.content, ["Definition", "Canonical definition", "Meaning"]);
    if (isPlaceholder(definition) && node.type === "Glossary") {
      definition = await this.glossaryDefinitionFor(node.label);
    }
    if (isPlaceholder(definition)) definition = preview.summary;

    const section = this.inspectorSection(container, node.type === "Equations" ? "Meaning" : "Definition");
    const markdown = section.createDiv({ cls: "wct-browser-markdown wct-browser-definition" });
    await this.renderMarkdown(markdown, definition, node.path);

    const synthesis = extractSection(preview.content, ["Synthesis notes", "Interpretation", "Role in the WCT corpus", "Discussion"]);
    if (synthesis && !isPlaceholder(synthesis) && synthesis.trim() !== definition.trim()) {
      const synthesisSection = this.inspectorSection(container, "Cross-paper synthesis");
      await this.renderMarkdown(synthesisSection.createDiv({ cls: "wct-browser-markdown" }), synthesis, node.path);
    }
  }

  async renderEquationsTab(node, preview, container) {
    const blocks = extractMathBlocks(preview.content);
    const connected = this.connectedByType(node, "Equations");
    const repo = repositoryMatches(node, preview.content);

    if (!blocks.length && !connected.length && !repo.families.length && !repo.lean.length) {
      const empty = this.inspectorSection(container, "Equations");
      empty.createEl("p", { text: "No equation blocks or canonical repository mappings were found for this object." });
      return;
    }

    if (blocks.length) {
      const local = this.inspectorSection(container, "Equations in this note", `${blocks.length} rendered`);
      for (const [index, block] of blocks.entries()) {
        const card = local.createDiv({ cls: "wct-browser-equation-card wct-browser-filter-item" });
        card.createSpan({ cls: "wct-browser-card-index", text: `Local ${index + 1}` });
        await this.renderMarkdown(card.createDiv({ cls: "wct-browser-math" }), block, node.path);
      }
    }

    if (connected.length) {
      const section = this.inspectorSection(container, "Connected equation objects", `${connected.length} linked`);
      const buttons = section.createDiv({ cls: "wct-browser-button-list" });
      for (const equation of connected) this.createNodeButton(buttons, equation);
    }

    for (const family of repo.families) {
      const section = this.inspectorSection(container, family.title, family.ids.join(" · "));
      await this.renderMarkdown(section.createDiv({ cls: "wct-browser-markdown wct-browser-math" }), family.markdown, node.path);
    }

    for (const formal of repo.lean) {
      const section = this.inspectorSection(container, formal.title, formal.status);
      await this.renderMarkdown(section.createDiv({ cls: "wct-browser-markdown wct-browser-math" }), formal.markdown, node.path);
      const declarations = section.createDiv({ cls: "wct-browser-declarations wct-browser-filter-item" });
      for (const declaration of formal.declarations) declarations.createEl("code", { text: declaration });
    }
  }

  async renderPapersTab(node, preview, container) {
    const papers = this.connectedByType(node, "Papers");
    const sourceSection = extractSection(preview.content, ["Papers", "Appears in", "Related papers", "Primary papers"]);

    if (sourceSection) {
      const section = this.inspectorSection(container, "Paper references in note");
      await this.renderMarkdown(section.createDiv({ cls: "wct-browser-markdown" }), sourceSection, node.path);
    }

    const section = this.inspectorSection(container, "Connected paper objects", `${papers.length} linked`);
    if (!papers.length) {
      section.createEl("p", { text: "No paper objects are directly connected yet." });
      return;
    }
    const buttons = section.createDiv({ cls: "wct-browser-button-list" });
    for (const paper of papers) this.createNodeButton(buttons, paper);
  }

  renderTypedRelations(node, container, direction) {
    const edges = direction === "out"
      ? this.graph.outgoing.get(node.id) ?? []
      : this.graph.incoming.get(node.id) ?? [];
    if (!edges.length) return;
    const section = this.inspectorSection(container, direction === "out" ? "Typed outgoing relations" : "Typed incoming relations", `${edges.length} relations`);
    for (const edge of edges) {
      const otherId = direction === "out" ? edge.target : edge.source;
      const other = this.graph.byId.get(otherId);
      if (!other) continue;
      const row = section.createDiv({ cls: "wct-browser-relation-row wct-browser-filter-item" });
      row.createSpan({ cls: "wct-browser-relation-type", text: titleCase(edge.relation) });
      row.createSpan({ cls: "wct-browser-relation-arrow", text: direction === "out" ? "→" : "←" });
      this.createNodeButton(row, other);
    }
  }

  async renderLinksTab(node, preview, container) {
    this.renderTypedRelations(node, container, "out");
    const links = this.ordinaryOutgoing(node);
    const section = this.inspectorSection(container, "Outgoing note links", `${links.length} links`);
    if (!links.length) {
      section.createEl("p", { text: "No outgoing Obsidian links were found." });
      return;
    }
    for (const link of links) {
      const row = section.createDiv({ cls: "wct-browser-link-row wct-browser-filter-item" });
      row.createSpan({ cls: "wct-browser-link-kind", text: link.path ? "NOTE" : "UNRESOLVED" });
      const button = row.createEl("button", { text: prettyValue(link.label), attr: { type: "button" } });
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this.app.workspace.openLinkText(link.link, node.path, true);
      });
      row.createSpan({ cls: "wct-browser-link-path", text: link.path ?? link.link });
    }
  }

  async renderBacklinksTab(node, preview, container) {
    this.renderTypedRelations(node, container, "in");
    const backlinks = this.ordinaryBacklinks(node);
    const section = this.inspectorSection(container, "Obsidian backlinks", `${backlinks.length} source notes`);
    if (!backlinks.length) {
      section.createEl("p", { text: "No backlinks were found." });
      return;
    }
    for (const backlink of backlinks) {
      const row = section.createDiv({ cls: "wct-browser-link-row wct-browser-filter-item" });
      row.createSpan({ cls: "wct-browser-link-kind", text: `×${backlink.weight ?? 1}` });
      if (backlink.node) this.createNodeButton(row, backlink.node);
      else {
        const button = row.createEl("button", { text: backlink.label, attr: { type: "button" } });
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          await this.app.workspace.openLinkText(backlink.path, node.path, true);
        });
      }
      row.createSpan({ cls: "wct-browser-link-path", text: backlink.path });
    }
  }

  async renderPropertiesTab(node, preview, container) {
    const properties = node.frontmatter ?? {};
    const section = this.inspectorSection(container, "Frontmatter properties", `${Object.keys(properties).length} fields`);
    const grid = section.createDiv({ cls: "wct-browser-properties" });
    const entries = Object.entries(properties).sort(([left], [right]) => left.localeCompare(right));
    if (!entries.length) {
      section.createEl("p", { text: "This note has no frontmatter properties." });
      return;
    }
    for (const [key, value] of entries) {
      const row = grid.createDiv({ cls: "wct-browser-property-row wct-browser-filter-item" });
      row.createSpan({ cls: "wct-browser-property-key", text: prettyKey(key) });
      const rendered = row.createDiv({ cls: "wct-browser-property-value" });
      const formatted = prettyValue(value);
      if (formatted.includes("[[") || formatted.includes("$") || formatted.includes("\n")) {
        await this.renderMarkdown(rendered, formatted, node.path);
      } else {
        rendered.setText(formatted);
      }
    }

    const path = this.inspectorSection(container, "Vault location");
    path.createDiv({ cls: "wct-graph-inspector-path wct-browser-filter-item", text: node.path });
  }

  async renderRepositoriesTab(node, preview, container) {
    const matches = repositoryMatches(node, preview.content);
    const repoSection = this.inspectorSection(container, "Repository roles", `${matches.repositories.length} matched`);
    if (!matches.repositories.length) {
      repoSection.createEl("p", { text: "No canonical repository mapping was found for this object yet." });
    }
    for (const repository of matches.repositories) {
      const card = repoSection.createDiv({ cls: "wct-browser-repository-card wct-browser-filter-item" });
      card.createEl("strong", { text: repository.label });
      card.createEl("p", { text: repository.role });
      const button = card.createEl("button", { text: "Open repository", attr: { type: "button" } });
      button.addEventListener("click", () => window.open(repository.url, "_blank", "noopener"));
    }

    if (matches.equationIds.length) {
      const ids = this.inspectorSection(container, "Canonical equation IDs");
      const chips = ids.createDiv({ cls: "wct-browser-chip-list" });
      for (const id of matches.equationIds) chips.createEl("code", { cls: "wct-browser-filter-item", text: id });
    }

    for (const family of matches.families) {
      const section = this.inspectorSection(container, family.title, family.ids.join(" · "));
      await this.renderMarkdown(section.createDiv({ cls: "wct-browser-markdown wct-browser-math" }), family.markdown, node.path);
    }

    for (const formal of matches.lean) {
      const section = this.inspectorSection(container, formal.title, formal.status);
      await this.renderMarkdown(section.createDiv({ cls: "wct-browser-markdown wct-browser-math" }), formal.markdown, node.path);
      const declarations = section.createDiv({ cls: "wct-browser-declarations wct-browser-filter-item" });
      for (const declaration of formal.declarations) declarations.createEl("code", { text: declaration });
    }
  }

  async renderSourceTab(node, preview, container) {
    const section = this.inspectorSection(container, "Rendered source note");
    const markdown = section.createDiv({ cls: "wct-browser-markdown wct-browser-source" });
    await this.renderMarkdown(markdown, preview.content, node.path);
  }

  async renderAllTab(node, preview, container) {
    await this.renderDefinitionTab(node, preview, container);
    await this.renderEquationsTab(node, preview, container);
    await this.renderPapersTab(node, preview, container);
    await this.renderLinksTab(node, preview, container);
    await this.renderBacklinksTab(node, preview, container);
    await this.renderRepositoriesTab(node, preview, container);
    await this.renderPropertiesTab(node, preview, container);
  }

  filterBrowserPane() {
    if (!this.browserPane) return;
    const query = normalizeLookup(this.browserSearchInput?.value ?? "");
    for (const element of this.browserPane.querySelectorAll(".wct-browser-filter-item")) {
      const match = !query || normalizeLookup(element.textContent).includes(query);
      element.toggleClass?.("is-filtered-out", !match);
      if (!element.toggleClass) element.classList.toggle("is-filtered-out", !match);
    }
  }

  async renderBrowserTab(node, preview, key) {
    this.browserPane.empty();
    this.browserPane.setAttr("data-tab", key);
    const renderers = {
      overview: () => this.renderOverviewTab(node, preview, this.browserPane),
      definition: () => this.renderDefinitionTab(node, preview, this.browserPane),
      equations: () => this.renderEquationsTab(node, preview, this.browserPane),
      papers: () => this.renderPapersTab(node, preview, this.browserPane),
      links: () => this.renderLinksTab(node, preview, this.browserPane),
      backlinks: () => this.renderBacklinksTab(node, preview, this.browserPane),
      properties: () => this.renderPropertiesTab(node, preview, this.browserPane),
      repositories: () => this.renderRepositoriesTab(node, preview, this.browserPane),
      all: () => this.renderAllTab(node, preview, this.browserPane),
      source: () => this.renderSourceTab(node, preview, this.browserPane),
    };
    await (renderers[key] ?? renderers.overview)();
    for (const button of this.browserTabs.querySelectorAll("button")) {
      button.classList.toggle("is-active", button.dataset.tab === key);
    }
    this.filterBrowserPane();
  }

  async showInspector(sceneNodeValue) {
    const node = this.graph.byId.get(sceneNodeValue.id) ?? sceneNodeValue;
    if (!node?.path) return;
    this.selected = node;
    this.inspectorTitle.empty();
    this.inspectorTitle.createEl("h2", { text: prettyValue(node.label) });
    this.inspectorTitle.createEl("small", {
      text: `${node.type} · ${node.degree} connections · ${titleCase(node.overallStatus ?? "unreviewed")}`,
    });
    this.inspectorBody.empty();
    this.inspectorActions.empty();

    const preview = await this.previewFor(node);
    const browserHeader = this.inspectorBody.createDiv({ cls: "wct-browser-header" });
    this.browserSearchInput = browserHeader.createEl("input", {
      cls: "wct-browser-search",
      attr: {
        type: "search",
        placeholder: "Search inside this object…",
        "aria-label": "Search inside this research object",
      },
    });
    this.browserSearchInput.addEventListener("input", () => this.filterBrowserPane());

    this.browserTabs = this.inspectorBody.createDiv({ cls: "wct-browser-tabs" });
    this.browserPane = this.inspectorBody.createDiv({ cls: "wct-browser-pane" });
    for (const [key, label] of BROWSER_TABS) {
      const button = this.browserTabs.createEl("button", {
        text: label,
        attr: { type: "button", "data-tab": key },
      });
      button.dataset.tab = key;
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this.renderBrowserTab(node, preview, key);
      });
    }

    await this.renderBrowserTab(node, preview, "overview");

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