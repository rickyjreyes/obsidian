"use strict";

const { Plugin, Notice } = require("obsidian");

const VIEW_TYPE = "wct-graph-view";
const GLOSSARY_INDEX = "Research/03 Glossary/WCT Glossary.md";
const CONCEPT_PREFIX = "Research/02 Concepts/";
const OVERVIEW_MAP = "Research/00 Maps/Glossary Overview Map.md";
const START_MARKER = "<!-- WCT-GLOSSARY-EXPANSION:START -->";
const END_MARKER = "<!-- WCT-GLOSSARY-EXPANSION:END -->";
const PATCHED = Symbol("wctGlossaryNetworkPatched");

const COLORS = {
  Glossary: [0.20, 0.69, 0.43, 1],
  Papers: [0.57, 0.28, 0.77, 1],
  Equations: [0.94, 0.57, 0.18, 1],
  Maps: [0.18, 0.42, 0.88, 1],
  References: [0.52, 0.57, 0.64, 1],
  Other: [0.48, 0.62, 0.78, 1],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isConceptPath = (path) => String(path ?? "").startsWith(CONCEPT_PREFIX);
const displayName = (path) => String(path ?? "").split("/").pop().replace(/\.md$/i, "");

function classifyPath(path) {
  const value = String(path ?? "");
  if (isConceptPath(value)) return "Glossary";
  if (value.includes("/01 Literature Notes/")) return "Papers";
  if (/\/\d+ Equations\//.test(value) || value.includes("/Equations/")) return "Equations";
  if (value.includes("/00 Maps/") || value === "Research/00 - Open This First.md") return "Maps";
  if (value.includes("/05 References/") || value.includes("/References/")) return "References";
  return "Other";
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/Description(?=[A-Z])/g, "")
    .replace(/Keywords.+$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,;:]$/, ".");
}

function extractLinks(content, heading) {
  const start = content.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const tail = content.slice(start + heading.length + 3);
  const next = tail.search(/\n##\s/);
  const section = next >= 0 ? tail.slice(0, next) : tail;
  const links = [];
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = pattern.exec(section))) {
    links.push({ path: match[1], label: match[2] || displayName(match[1]) });
  }
  return links;
}

function extractContext(content) {
  const start = content.indexOf("## Papers");
  if (start < 0) return "";
  const section = content.slice(start, content.indexOf("\n## ", start + 5) > 0 ? content.indexOf("\n## ", start + 5) : undefined);
  const lines = section.split("\n");
  for (const line of lines) {
    const match = line.match(/^\s{2,}-\s+(.+)/);
    if (match) return cleanText(match[1]);
  }
  return "";
}

function rebuildGraphGroups(view) {
  const graph = view.graph;
  if (!graph?.nodes?.length) return;

  const groups = new Map();
  for (const node of graph.nodes) {
    if (node.path === GLOSSARY_INDEX) {
      node.group = "Maps";
      node.color = COLORS.Maps;
    } else if (isConceptPath(node.path)) {
      node.group = "Glossary";
      node.color = COLORS.Glossary;
    }
    if (!groups.has(node.group)) groups.set(node.group, []);
    groups.get(node.group).push(node.id);
  }

  for (const ids of groups.values()) {
    ids.sort((left, right) => {
      const a = graph.byId.get(left);
      const b = graph.byId.get(right);
      return (b?.degree ?? 0) - (a?.degree ?? 0) || String(a?.label).localeCompare(String(b?.label));
    });
  }

  const groupEdges = new Map();
  for (const edge of graph.edges ?? []) {
    const source = graph.byId.get(edge.source);
    const target = graph.byId.get(edge.target);
    if (!source || !target || source.group === target.group) continue;
    const left = source.group < target.group ? source.group : target.group;
    const right = source.group < target.group ? target.group : source.group;
    const key = `${left}\u0000${right}`;
    const current = groupEdges.get(key) ?? { source: left, target: right, weight: 0, links: 0 };
    current.weight += Math.max(1, Number(edge.weight) || 1);
    current.links += 1;
    groupEdges.set(key, current);
  }

  const preferred = [
    "00 Maps", "Maps", "01 Literature Notes", "Papers", "Glossary",
    "03 Equations", "04 Equations", "Equations", "04 Derivations",
    "05 Predictions", "06 Experiments", "07 Evidence", "08 Projects",
    "References", "Other",
  ];
  graph.groups = groups;
  graph.groupEdges = [...groupEdges.values()];
  graph.orderedGroups = [...groups.keys()].sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai < 0 && bi < 0) return a.localeCompare(b);
    if (ai < 0) return 1;
    if (bi < 0) return -1;
    return ai - bi;
  });

  if (view.selectedGroup === "Concepts" || view.selectedGroup === "02 Concepts") {
    view.selectedGroup = "Glossary";
  }
}

class GlossaryStore {
  constructor(app) {
    this.app = app;
    this.byPath = new Map();
    this.loaded = false;
  }

  async load(force = false) {
    if (this.loaded && !force) return;
    this.byPath.clear();
    const file = this.app.vault.getAbstractFileByPath(GLOSSARY_INDEX);
    if (!file) return;
    const content = await this.app.vault.cachedRead(file);
    const pattern = /- \*\*\[\[02 Concepts\/([^\]|]+)(?:\|([^\]]+))?\]\]\*\*\s+—\s+([^\n]+)/g;
    let match;
    while ((match = pattern.exec(content))) {
      const path = `${CONCEPT_PREFIX}${match[1]}.md`;
      this.byPath.set(path, {
        path,
        title: match[2] || match[1],
        definition: cleanText(match[3]),
      });
    }
    this.loaded = true;
  }

  get(path) {
    return this.byPath.get(path) ?? {
      path,
      title: displayName(path),
      definition: "Definition pending full-text review.",
    };
  }
}

function createSceneNode(node, x, y, options = {}) {
  return {
    ...node,
    kind: "note",
    x,
    y,
    size: options.size ?? clamp(5 + Math.log2((node.degree ?? 0) + 1) * 1.7, 5, 16),
    alwaysLabel: options.alwaysLabel ?? false,
    labelPriority: options.labelPriority ?? node.degree ?? 0,
    color: options.color ?? node.color ?? COLORS.Other,
  };
}

function buildDefinitionScene(view, centerNode) {
  const graph = view.graph;
  const neighborIds = [...(graph.adjacency.get(centerNode.id) ?? [])]
    .filter((id) => graph.byId.has(id))
    .sort((a, b) => (graph.byId.get(b)?.degree ?? 0) - (graph.byId.get(a)?.degree ?? 0))
    .slice(0, 72);

  const buckets = { Glossary: [], Papers: [], Equations: [], Maps: [], References: [], Other: [] };
  for (const id of neighborIds) {
    const node = graph.byId.get(id);
    buckets[classifyPath(node.path)].push(node);
  }

  const nodes = [createSceneNode(centerNode, 0, 0, {
    size: 25,
    alwaysLabel: true,
    labelPriority: 200000,
    color: COLORS.Glossary,
  })];
  const edges = [];
  const ringConfig = [
    ["Glossary", 245],
    ["Papers", 430],
    ["Equations", 585],
    ["Maps", 700],
    ["References", 790],
    ["Other", 870],
  ];

  for (const [type, radius] of ringConfig) {
    const list = buckets[type];
    list.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, list.length)) * Math.PI * 2;
      nodes.push(createSceneNode(node, Math.cos(angle) * radius, Math.sin(angle) * radius * 0.78, {
        color: COLORS[type] ?? COLORS.Other,
        alwaysLabel: index < (type === "Glossary" ? 10 : 6),
        labelPriority: 90000 - radius + (node.degree ?? 0),
      }));
      edges.push({ source: centerNode.id, target: node.id, weight: 1 });
    });
  }

  const selected = new Set(nodes.map((node) => node.id));
  for (const edge of graph.edges ?? []) {
    if (edge.source === centerNode.id || edge.target === centerNode.id) continue;
    if (selected.has(edge.source) && selected.has(edge.target) && edges.length < 180) edges.push(edge);
  }

  return {
    mode: "focus",
    query: centerNode.label,
    title: `Definition map: ${centerNode.label}`,
    nodes,
    edges,
    sourceNodeCount: 1,
    sourceEdgeCount: edges.length,
    noMatches: false,
  };
}

class GlossaryDrawer {
  constructor(plugin, view) {
    this.plugin = plugin;
    this.view = view;
    this.node = null;
    this.root = view.stage.createDiv({ cls: "wct-glossary-drawer is-hidden" });
    this.header = this.root.createDiv({ cls: "wct-glossary-drawer-header" });
    this.titleBox = this.header.createDiv({ cls: "wct-glossary-drawer-title" });
    this.closeButton = this.header.createEl("button", { cls: "wct-glossary-close", text: "×" });
    this.body = this.root.createDiv({ cls: "wct-glossary-drawer-body" });
    this.actions = this.root.createDiv({ cls: "wct-glossary-actions" });
    this.closeButton.addEventListener("click", () => this.hide());
  }

  section(title) {
    const section = this.body.createDiv({ cls: "wct-glossary-section" });
    section.createEl("h3", { text: title });
    return section;
  }

  addChips(section, links) {
    const list = section.createDiv({ cls: "wct-glossary-chip-list" });
    if (!links.length) {
      list.createSpan({ text: "No direct links recorded yet.", cls: "setting-item-description" });
      return;
    }
    for (const link of links.slice(0, 14)) {
      const button = list.createEl("button", { cls: "wct-glossary-chip", text: link.label });
      button.addEventListener("click", async () => {
        if (isConceptPath(link.path)) {
          const node = this.view.graph.byId.get(link.path);
          if (node) await this.show(node);
          else await this.view.app.workspace.openLinkText(link.path, "", true);
        } else {
          await this.view.app.workspace.openLinkText(link.path, "", true);
        }
      });
    }
  }

  async show(node) {
    this.node = node;
    await this.plugin.store.load();
    const entry = this.plugin.store.get(node.path);
    const file = this.view.app.vault.getAbstractFileByPath(node.path);
    const content = file ? await this.view.app.vault.cachedRead(file) : "";
    const papers = extractLinks(content, "Papers");
    const related = extractLinks(content, "Related concepts");
    const context = extractContext(content);

    this.titleBox.empty();
    this.titleBox.createEl("h2", { text: entry.title });
    this.titleBox.createEl("small", { text: `${node.degree ?? 0} graph connections` });
    this.body.empty();
    this.actions.empty();

    const definition = this.section("Definition");
    definition.createDiv({ cls: "wct-glossary-definition", text: entry.definition });

    if (context) {
      const role = this.section("Role in the WCT corpus");
      role.createDiv({ cls: "wct-glossary-context", text: context });
    }

    this.addChips(this.section("Connected definitions"), related);
    this.addChips(this.section("Used in papers"), papers);

    const open = this.actions.createEl("button", { text: "Open definition note" });
    open.addEventListener("click", () => this.view.app.workspace.openLinkText(node.path, "", true));
    const map = this.actions.createEl("button", { text: "Map connections" });
    map.addEventListener("click", () => {
      this.view.mode = "focus";
      this.view.searchInput.value = "";
      this.view.setScene(buildDefinitionScene(this.view, node));
      this.view.updateStatus?.();
      this.hide();
    });
    const glossary = this.actions.createEl("button", { text: "All definitions" });
    glossary.addEventListener("click", () => {
      this.view.searchInput.value = "";
      this.view.showGroup("Glossary");
      this.hide();
    });
    const overview = this.actions.createEl("button", { text: "Overview map note" });
    overview.addEventListener("click", () => this.view.app.workspace.openLinkText(OVERVIEW_MAP, "", true));

    this.root.removeClass("is-hidden");
  }

  hide() {
    this.root.addClass("is-hidden");
  }

  destroy() {
    this.root.remove();
  }
}

async function syncExpandedNotes(plugin) {
  await plugin.store.load(true);
  const files = plugin.app.vault.getMarkdownFiles().filter((file) => isConceptPath(file.path));
  const resolved = plugin.app.metadataCache.resolvedLinks ?? {};
  let updated = 0;

  new Notice(`Expanding ${files.length} glossary definition notes…`);
  for (const file of files) {
    const original = await plugin.app.vault.cachedRead(file);
    const entry = plugin.store.get(file.path);
    const linked = Object.keys(resolved[file.path] ?? {});
    const related = linked.filter(isConceptPath).slice(0, 8);
    const papers = linked.filter((path) => path.includes("/01 Literature Notes/")).slice(0, 8);
    const context = extractContext(original);

    const linkList = (items) => items.length
      ? items.map((path) => `- [[${path.replace(/\.md$/i, "")}]]`).join("\n")
      : "- No direct links recorded yet.";

    const block = [
      START_MARKER,
      "## Definition",
      "",
      entry.definition,
      "",
      "## Role in the WCT corpus",
      "",
      context || "This term is part of the WCT concept graph. Its precise role should be checked against the linked papers and equations.",
      "",
      "## Connection path",
      "",
      `- Overview: [[${OVERVIEW_MAP.replace(/\.md$/i, "")}]]`,
      `- Interactive map: open **WCT Graph**, enter “${entry.title},” or select **Map connections** from its definition panel.`,
      "",
      "### Related definitions",
      "",
      linkList(related),
      "",
      "### Papers using this term",
      "",
      linkList(papers),
      END_MARKER,
    ].join("\n");

    let next;
    const start = original.indexOf(START_MARKER);
    const end = original.indexOf(END_MARKER);
    if (start >= 0 && end > start) {
      next = `${original.slice(0, start)}${block}${original.slice(end + END_MARKER.length)}`;
    } else {
      const papersHeading = original.indexOf("## Papers");
      next = papersHeading >= 0
        ? `${original.slice(0, papersHeading).trimEnd()}\n\n${block}\n\n${original.slice(papersHeading)}`
        : `${original.trimEnd()}\n\n${block}\n`;
    }

    if (next !== original) {
      await plugin.app.vault.modify(file, next);
      updated += 1;
    }
  }
  new Notice(`Expanded ${updated} glossary definition notes.`);
}

function patchView(plugin, view) {
  if (!view || view[PATCHED] || !view.graph || !view.renderer || !view.stage) return;
  view[PATCHED] = true;
  rebuildGraphGroups(view);
  view.__wctGlossaryDrawer = new GlossaryDrawer(plugin, view);
  view.__wctGlossaryBadge = view.stage.createDiv({
    cls: "wct-glossary-map-badge",
    text: "Glossary nodes: click for definition · Map connections for local overview",
  });

  const currentRebuild = view.rebuildGraph.bind(view);
  view.rebuildGraph = async () => {
    await currentRebuild();
    rebuildGraphGroups(view);
    if (view.mode === "cluster" && view.selectedGroup === "Glossary") view.showGroup("Glossary");
    else view.showOverview();
  };

  let pointerStart = null;
  const onPointerDown = (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event) => {
    if (!pointerStart) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (moved > 5) return;
    const node = view.renderer.hitTest(event.clientX, event.clientY, view.stage.getBoundingClientRect());
    if (!node || node.kind !== "note" || !isConceptPath(node.path)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    view.__wctGlossaryDrawer.show(node);
  };
  view.stage.addEventListener("pointerdown", onPointerDown, true);
  view.stage.addEventListener("pointerup", onPointerUp, true);

  view.__wctGlossaryCleanup = () => {
    view.stage.removeEventListener("pointerdown", onPointerDown, true);
    view.stage.removeEventListener("pointerup", onPointerUp, true);
    view.__wctGlossaryDrawer?.destroy();
    view.__wctGlossaryBadge?.remove();
  };

  if (view.mode === "overview") view.showOverview();
}

module.exports = class WCTGlossaryNetworkPlugin extends Plugin {
  async onload() {
    this.store = new GlossaryStore(this.app);
    await this.store.load();

    const patchAll = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) patchView(this, leaf.view);
    };
    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(patchAll, 150)));
    this.app.workspace.onLayoutReady(() => setTimeout(patchAll, 350));

    this.addCommand({
      id: "sync-expanded-glossary-notes",
      name: "Synchronize expanded definitions into all glossary notes",
      callback: () => syncExpandedNotes(this),
    });
    this.addCommand({
      id: "open-glossary-overview-map",
      name: "Open Glossary Overview Map",
      callback: () => this.app.workspace.openLinkText(OVERVIEW_MAP, "", true),
    });
    this.addCommand({
      id: "open-glossary-graph",
      name: "Open glossary definitions in WCT Graph",
      callback: async () => {
        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
        if (!leaf) {
          new Notice("Open WCT Graph first, then run this command again.");
          return;
        }
        patchView(this, leaf.view);
        rebuildGraphGroups(leaf.view);
        leaf.view.showGroup("Glossary");
        await this.app.workspace.revealLeaf(leaf);
      },
    });
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.__wctGlossaryCleanup?.();
    }
  }
};