"use strict";

const {
  MarkdownRenderer,
  Notice,
  Plugin,
} = require("obsidian");

const VIEW_TYPE = "wct-graph-view";
const PATCHED = Symbol("wctGraphNavigatorPatched");

const TYPE_ORDER = [
  "Maps",
  "Papers",
  "Glossary",
  "Equations",
  "Derivations",
  "Predictions",
  "Experiments",
  "Evidence",
  "Projects",
  "References",
  "Other",
];

const TYPE_COLORS = {
  Maps: [0.18, 0.42, 0.88, 1],
  Papers: [0.57, 0.28, 0.77, 1],
  Glossary: [0.20, 0.69, 0.43, 1],
  Equations: [0.94, 0.57, 0.18, 1],
  Derivations: [0.89, 0.33, 0.29, 1],
  Predictions: [0.92, 0.72, 0.13, 1],
  Experiments: [0.09, 0.70, 0.76, 1],
  Evidence: [0.55, 0.66, 0.18, 1],
  Projects: [0.90, 0.37, 0.58, 1],
  References: [0.52, 0.57, 0.64, 1],
  Other: [0.48, 0.62, 0.78, 1],
};

const FULL_EDGE_BUDGET = 1700;
const CONNECTION_NODE_LIMIT = 110;
const CONNECTION_EDGE_BUDGET = 700;
const SEARCH_NODE_LIMIT = 190;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const debounce = (fn, wait) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
};

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fileName(path) {
  return String(path ?? "").split("/").pop()?.replace(/\.md$/i, "") ?? "Untitled";
}

function nodeType(path) {
  const value = String(path ?? "").replace(/\\/g, "/");
  const lower = value.toLowerCase();
  if (lower.includes("/00 maps/") || value === "Research/00 - Open This First.md") return "Maps";
  if (lower.includes("/01 literature notes/")) return "Papers";
  if (lower.includes("/02 concepts/") || lower.includes("/03 glossary/")) return "Glossary";
  if (lower.includes("/04 equations/") || /\/\d+ equations\//i.test(value)) return "Equations";
  if (lower.includes("/derivations/")) return "Derivations";
  if (lower.includes("/predictions/")) return "Predictions";
  if (lower.includes("/experiments/") || lower.includes("/protocols/")) return "Experiments";
  if (lower.includes("/evidence/")) return "Evidence";
  if (lower.includes("/projects/")) return "Projects";
  if (lower.includes("/05 references/") || lower.includes("/references/")) return "References";
  return "Other";
}

function sceneNode(node, x, y, options = {}) {
  const type = options.type ?? nodeType(node.path);
  return {
    ...node,
    kind: options.kind ?? "note",
    type,
    group: type,
    color: options.color ?? TYPE_COLORS[type] ?? TYPE_COLORS.Other,
    x,
    y,
    size: options.size ?? clamp(4.2 + Math.log2((node.degree ?? 0) + 1) * 1.45, 4.2, 15),
    alwaysLabel: options.alwaysLabel ?? false,
    labelPriority: options.labelPriority ?? node.degree ?? 0,
  };
}

function edgeScore(graph, edge) {
  const source = graph.byId.get(edge.source);
  const target = graph.byId.get(edge.target);
  if (!source || !target) return -Infinity;
  const sourceType = nodeType(source.path);
  const targetType = nodeType(target.path);
  const crossType = sourceType !== targetType ? 2 : 0;
  const structural = sourceType === "Maps" || targetType === "Maps" ? 4 : 0;
  return (
    Math.max(1, Number(edge.weight) || 1) * 9 +
    Math.log2((source.degree ?? 0) + 2) +
    Math.log2((target.degree ?? 0) + 2) +
    crossType +
    structural
  );
}

function buildFullScene(view) {
  const graph = view.graph;
  const grouped = new Map(TYPE_ORDER.map((type) => [type, []]));
  for (const node of graph.nodes ?? []) {
    const type = nodeType(node.path);
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type).push(node);
  }

  const presentTypes = TYPE_ORDER.filter((type) => (grouped.get(type)?.length ?? 0) > 0);
  const centerType = presentTypes.includes("Maps") ? "Maps" : presentTypes[0];
  const outerTypes = presentTypes.filter((type) => type !== centerType);
  const centers = new Map();
  centers.set(centerType, { x: 0, y: 0 });
  outerTypes.forEach((type, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, outerTypes.length)) * Math.PI * 2;
    centers.set(type, {
      x: Math.cos(angle) * 1120,
      y: Math.sin(angle) * 760,
    });
  });

  const nodes = [];
  for (const type of presentTypes) {
    const list = grouped.get(type);
    const center = centers.get(type);
    list.sort((left, right) => (right.degree ?? 0) - (left.degree ?? 0) || left.label.localeCompare(right.label));

    nodes.push({
      id: `area:${type}`,
      path: null,
      kind: "area",
      type,
      group: type,
      label: `${type}\n${list.length} nodes`,
      x: center.x,
      y: center.y,
      size: clamp(17 + Math.log2(list.length + 1) * 2.8, 20, 40),
      color: TYPE_COLORS[type] ?? TYPE_COLORS.Other,
      degree: list.length,
      alwaysLabel: true,
      labelPriority: 300000 + list.length,
    });

    list.forEach((node, index) => {
      const angle = index * 2.399963229728653 + (hashString(node.id) % 1000) * 0.0009;
      const radius = 54 + Math.sqrt(index + 1) * 25;
      const jitter = ((hashString(`${node.id}:r`) % 1000) / 1000 - 0.5) * 18;
      nodes.push(sceneNode(
        node,
        center.x + Math.cos(angle) * (radius + jitter),
        center.y + Math.sin(angle) * (radius + jitter) * 0.84,
        {
          type,
          alwaysLabel: index < 3,
          labelPriority: index < 3 ? 150000 - index : node.degree ?? 0,
        },
      ));
    });
  }

  const edges = [...(graph.edges ?? [])]
    .sort((left, right) => edgeScore(graph, right) - edgeScore(graph, left))
    .slice(0, FULL_EDGE_BUDGET);

  return {
    mode: "full",
    title: "Full WCT graph",
    nodes,
    edges,
    sourceNodeCount: graph.nodes.length,
    sourceEdgeCount: graph.edges.length,
    renderedEdgeCount: edges.length,
  };
}

function buildConnectionScene(view, centerId) {
  const graph = view.graph;
  const center = graph.byId.get(centerId);
  if (!center) return null;

  const neighborIds = [...(graph.adjacency.get(centerId) ?? [])]
    .filter((id) => graph.byId.has(id))
    .sort((left, right) => {
      const a = graph.byId.get(left);
      const b = graph.byId.get(right);
      return (b?.degree ?? 0) - (a?.degree ?? 0) || String(a?.label).localeCompare(String(b?.label));
    })
    .slice(0, CONNECTION_NODE_LIMIT);

  const grouped = new Map(TYPE_ORDER.map((type) => [type, []]));
  for (const id of neighborIds) {
    const node = graph.byId.get(id);
    const type = nodeType(node.path);
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type).push(node);
  }

  const presentTypes = TYPE_ORDER.filter((type) => (grouped.get(type)?.length ?? 0) > 0);
  const nodes = [sceneNode(center, 0, 0, {
    size: 26,
    alwaysLabel: true,
    labelPriority: 400000,
  })];

  presentTypes.forEach((type, typeIndex) => {
    const list = grouped.get(type);
    const anchorAngle = -Math.PI / 2 + (typeIndex / Math.max(1, presentTypes.length)) * Math.PI * 2;
    const anchorRadius = 510;
    const anchorX = Math.cos(anchorAngle) * anchorRadius;
    const anchorY = Math.sin(anchorAngle) * anchorRadius * 0.78;

    nodes.push({
      id: `connection-area:${centerId}:${type}`,
      path: null,
      kind: "area",
      type,
      group: type,
      label: `${type}\n${list.length} connected`,
      x: anchorX,
      y: anchorY,
      size: clamp(14 + Math.log2(list.length + 1) * 2.2, 16, 29),
      color: TYPE_COLORS[type] ?? TYPE_COLORS.Other,
      degree: list.length,
      alwaysLabel: true,
      labelPriority: 250000 + list.length,
    });

    list.forEach((node, index) => {
      const angle = index * 2.399963229728653 + typeIndex * 0.23;
      const radius = 62 + Math.sqrt(index + 1) * 27;
      nodes.push(sceneNode(
        node,
        anchorX + Math.cos(angle) * radius,
        anchorY + Math.sin(angle) * radius * 0.82,
        {
          type,
          alwaysLabel: index < 5,
          labelPriority: index < 5 ? 170000 - index : node.degree ?? 0,
        },
      ));
    });
  });

  const selected = new Set([centerId, ...neighborIds]);
  const edges = (graph.edges ?? [])
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((left, right) => edgeScore(graph, right) - edgeScore(graph, left))
    .slice(0, CONNECTION_EDGE_BUDGET);

  return {
    mode: "connections",
    focusId: centerId,
    title: `Connections: ${center.label}`,
    nodes,
    edges,
    sourceNodeCount: selected.size,
    sourceEdgeCount: edges.length,
  };
}

function buildSearchScene(view, query) {
  const normalized = query.trim().toLowerCase();
  const graph = view.graph;
  const matches = (graph.nodes ?? [])
    .filter((node) => node.label.toLowerCase().includes(normalized) || node.path.toLowerCase().includes(normalized))
    .sort((left, right) => (right.degree ?? 0) - (left.degree ?? 0))
    .slice(0, 36);

  const selected = new Set(matches.map((node) => node.id));
  for (const match of matches) {
    const neighbors = [...(graph.adjacency.get(match.id) ?? [])]
      .sort((left, right) => (graph.byId.get(right)?.degree ?? 0) - (graph.byId.get(left)?.degree ?? 0));
    for (const id of neighbors) {
      if (selected.size >= SEARCH_NODE_LIMIT) break;
      selected.add(id);
    }
    if (selected.size >= SEARCH_NODE_LIMIT) break;
  }

  const selectedNodes = [...selected].map((id) => graph.byId.get(id)).filter(Boolean);
  const grouped = new Map(TYPE_ORDER.map((type) => [type, []]));
  for (const node of selectedNodes) grouped.get(nodeType(node.path)).push(node);
  const presentTypes = TYPE_ORDER.filter((type) => grouped.get(type).length > 0);
  const nodes = [];

  presentTypes.forEach((type, typeIndex) => {
    const list = grouped.get(type);
    const angle = -Math.PI / 2 + (typeIndex / Math.max(1, presentTypes.length)) * Math.PI * 2;
    const anchorX = Math.cos(angle) * 560;
    const anchorY = Math.sin(angle) * 420;
    list.forEach((node, index) => {
      const localAngle = index * 2.399963229728653;
      const radius = 30 + Math.sqrt(index + 1) * 24;
      const isMatch = matches.some((match) => match.id === node.id);
      nodes.push(sceneNode(
        node,
        anchorX + Math.cos(localAngle) * radius,
        anchorY + Math.sin(localAngle) * radius * 0.82,
        {
          type,
          size: isMatch ? clamp(12 + Math.log2((node.degree ?? 0) + 1) * 1.7, 13, 23) : undefined,
          alwaysLabel: isMatch || index < 3,
          labelPriority: isMatch ? 300000 + (node.degree ?? 0) : node.degree ?? 0,
        },
      ));
    });
  });

  const edges = (graph.edges ?? [])
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((left, right) => edgeScore(graph, right) - edgeScore(graph, left))
    .slice(0, CONNECTION_EDGE_BUDGET);

  return {
    mode: "search",
    query,
    title: `Search: ${query}`,
    nodes,
    edges,
    sourceNodeCount: matches.length,
    sourceEdgeCount: edges.length,
    noMatches: matches.length === 0,
  };
}

function stripFrontmatter(content) {
  return String(content ?? "").replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function extractSection(content, headings) {
  const text = stripFrontmatter(content);
  for (const heading of headings) {
    const pattern = new RegExp(`^#{2,3}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im");
    const match = pattern.exec(text);
    if (!match) continue;
    const start = match.index + match[0].length;
    const tail = text.slice(start);
    const next = tail.search(/^#{1,3}\s+/m);
    const section = (next >= 0 ? tail.slice(0, next) : tail).trim();
    if (section) return section;
  }
  return "";
}

function firstParagraph(content) {
  const text = stripFrontmatter(content)
    .replace(/^#.+$/gm, "")
    .replace(/^> \[![^\]]+\].*$/gm, "")
    .trim();
  return text.split(/\n\s*\n/).find((part) => {
    const cleaned = part.trim();
    return cleaned && !cleaned.startsWith("-") && !cleaned.startsWith("```") && !cleaned.startsWith("$$");
  })?.trim() ?? "";
}

function firstEquation(content) {
  const block = String(content ?? "").match(/\$\$[\s\S]*?\$\$/);
  if (block) return block[0];
  const inline = String(content ?? "").match(/\$[^\n$]+\$/);
  return inline?.[0] ?? "";
}

function compactPlain(value, max = 220) {
  const text = String(value ?? "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, label) => label || fileName(path))
    .replace(/[*_`>#]/g, "")
    .replace(/\$+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function summaryForType(type, content) {
  if (type === "Glossary") {
    return extractSection(content, ["Definition", "Synthesis notes", "Role in the WCT corpus"]) || firstParagraph(content);
  }
  if (type === "Papers") {
    return extractSection(content, ["Abstract", "Summary", "Description", "Core claim"]) || firstParagraph(content);
  }
  if (type === "Equations") {
    const equation = firstEquation(content);
    const meaning = extractSection(content, ["Meaning", "Interpretation", "Purpose", "Definition"]);
    return [equation, meaning].filter(Boolean).join("\n\n") || firstParagraph(content);
  }
  if (type === "References") {
    return extractSection(content, ["Summary", "Relevance", "Connection to WCT"]) || firstParagraph(content);
  }
  return extractSection(content, ["Summary", "Purpose", "Overview", "Definition"]) || firstParagraph(content);
}

class NodeInspector {
  constructor(controller) {
    this.controller = controller;
    this.view = controller.view;
    this.plugin = controller.plugin;
    this.node = null;

    this.root = this.view.stage.createDiv({ cls: "wct-graph-inspector is-hidden" });
    this.header = this.root.createDiv({ cls: "wct-graph-inspector-header" });
    this.title = this.header.createDiv({ cls: "wct-graph-inspector-title" });
    this.closeButton = this.header.createEl("button", { text: "×" });
    this.body = this.root.createDiv({ cls: "wct-graph-inspector-body" });
    this.actions = this.root.createDiv({ cls: "wct-graph-inspector-actions" });
    this.closeButton.addEventListener("click", () => this.hide());
  }

  section(title) {
    const section = this.body.createDiv({ cls: "wct-graph-inspector-section" });
    section.createEl("h3", { text: title });
    return section;
  }

  async renderMarkdown(container, markdown, path) {
    const target = container.createDiv({ cls: "wct-graph-inspector-markdown" });
    if (!markdown) {
      target.setText("No summary has been recorded yet.");
      return;
    }
    await MarkdownRenderer.render(this.view.app, markdown, target, path, this.plugin);
  }

  async show(node) {
    if (!node?.path) return;
    this.node = node;
    const graphNode = this.view.graph.byId.get(node.id) ?? node;
    const type = nodeType(graphNode.path);
    const file = this.view.app.vault.getAbstractFileByPath(graphNode.path);
    const content = file ? await this.view.app.vault.cachedRead(file) : "";
    const summary = summaryForType(type, content);
    const neighbors = [...(this.view.graph.adjacency.get(graphNode.id) ?? [])]
      .map((id) => this.view.graph.byId.get(id))
      .filter(Boolean)
      .sort((left, right) => (right.degree ?? 0) - (left.degree ?? 0));

    this.title.empty();
    this.title.createEl("h2", { text: graphNode.label });
    this.title.createEl("small", {
      text: `${type} · ${graphNode.degree ?? neighbors.length} connections`,
    });
    this.body.empty();
    this.actions.empty();

    await this.renderMarkdown(this.section(type === "Equations" ? "Equation and meaning" : "Summary"), summary, graphNode.path);

    const pathSection = this.section("Vault location");
    pathSection.createDiv({ cls: "wct-graph-inspector-path", text: graphNode.path });

    const groups = new Map();
    for (const neighbor of neighbors) {
      const neighborType = nodeType(neighbor.path);
      if (!groups.has(neighborType)) groups.set(neighborType, []);
      groups.get(neighborType).push(neighbor);
    }

    const connections = this.section("Connected nodes");
    const groupRoot = connections.createDiv({ cls: "wct-graph-connection-groups" });
    for (const typeName of TYPE_ORDER) {
      const list = groups.get(typeName);
      if (!list?.length) continue;
      const group = groupRoot.createDiv({ cls: "wct-graph-connection-group" });
      group.createEl("strong", { text: `${typeName} (${list.length})` });
      const buttons = group.createDiv({ cls: "wct-graph-connection-buttons" });
      for (const neighbor of list.slice(0, 12)) {
        const button = buttons.createEl("button", { text: neighbor.label });
        button.addEventListener("click", () => this.show(neighbor));
      }
    }

    const openButton = this.actions.createEl("button", { text: "Open note" });
    openButton.addEventListener("click", () => this.view.app.workspace.openLinkText(graphNode.path, "", true));

    const connectionsButton = this.actions.createEl("button", { text: "View connections" });
    connectionsButton.addEventListener("click", () => {
      this.controller.pushConnections(graphNode);
      this.hide();
    });

    const backButton = this.actions.createEl("button", { text: "Back one level" });
    backButton.disabled = this.controller.stack.length <= 1;
    backButton.addEventListener("click", () => {
      this.controller.back();
      this.hide();
    });

    const rootButton = this.actions.createEl("button", { text: "Full graph" });
    rootButton.addEventListener("click", () => {
      this.controller.root();
      this.hide();
    });

    this.root.removeClass("is-hidden");
  }

  hide() {
    this.root.addClass("is-hidden");
  }

  destroy() {
    this.root.remove();
  }
}

class GraphNavigatorController {
  constructor(plugin, view) {
    this.plugin = plugin;
    this.view = view;
    this.stack = [];
    this.previewCache = new Map();
    this.hoverToken = 0;
    this.destroyed = false;
    this.originalOnClose = view.onClose.bind(view);

    this.installToolbar();
    this.inspector = new NodeInspector(this);
    this.badge = view.stage.createDiv({ cls: "wct-graph-depth-badge" });
    this.installPointerHandling();
    this.overrideViewNavigation();
    this.root(true);
  }

  installToolbar() {
    const oldSearch = this.view.searchInput;
    const search = oldSearch.cloneNode(true);
    oldSearch.replaceWith(search);
    this.view.searchInput = search;

    const oldBack = this.view.backButton;
    const back = oldBack.cloneNode(true);
    oldBack.replaceWith(back);
    this.view.backButton = back;
    back.textContent = "Back";

    const oldOverview = this.view.overviewButton;
    const root = oldOverview.cloneNode(true);
    oldOverview.replaceWith(root);
    this.view.overviewButton = root;
    root.textContent = "Full graph";

    this.breadcrumbs = document.createElement("div");
    this.breadcrumbs.className = "wct-graph-breadcrumbs";
    search.before(this.breadcrumbs);

    back.addEventListener("click", () => this.back());
    root.addEventListener("click", () => this.root());
    search.addEventListener("input", debounce(() => {
      const query = search.value.trim();
      if (!query) {
        this.root();
        return;
      }
      this.search(query);
    }, 170));
  }

  installPointerHandling() {
    this.pointerStart = null;
    this.onPointerDown = (event) => {
      this.pointerStart = { x: event.clientX, y: event.clientY };
    };
    this.onPointerUp = (event) => {
      if (!this.pointerStart) return;
      const moved = Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y);
      this.pointerStart = null;
      if (moved > 5) return;
      const node = this.view.renderer.hitTest(event.clientX, event.clientY, this.view.stage.getBoundingClientRect());
      if (!node?.path) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.inspector.show(node);
    };
    this.onPointerMove = (event) => {
      const node = this.view.renderer.hitTest(event.clientX, event.clientY, this.view.stage.getBoundingClientRect());
      if (!node?.path) return;
      const token = ++this.hoverToken;
      this.showHover(node, event, token);
    };
    this.onPointerLeave = () => {
      this.hoverToken += 1;
    };

    this.view.stage.addEventListener("pointerdown", this.onPointerDown, true);
    this.view.stage.addEventListener("pointerup", this.onPointerUp, true);
    this.view.stage.addEventListener("pointermove", this.onPointerMove, true);
    this.view.stage.addEventListener("pointerleave", this.onPointerLeave, true);
  }

  async previewFor(node) {
    if (this.previewCache.has(node.path)) return this.previewCache.get(node.path);
    const file = this.view.app.vault.getAbstractFileByPath(node.path);
    const content = file ? await this.view.app.vault.cachedRead(file) : "";
    const type = nodeType(node.path);
    const summary = compactPlain(summaryForType(type, content), 190);
    const neighbors = [...(this.view.graph.adjacency.get(node.id) ?? [])]
      .map((id) => this.view.graph.byId.get(id))
      .filter(Boolean)
      .sort((left, right) => (right.degree ?? 0) - (left.degree ?? 0))
      .slice(0, 4)
      .map((item) => item.label);
    const preview = { type, summary, neighbors };
    this.previewCache.set(node.path, preview);
    return preview;
  }

  async showHover(node, event, token) {
    const tooltip = this.view.tooltip;
    if (!tooltip) return;
    const basic = `${node.label}\n${nodeType(node.path)} · ${node.degree ?? 0} connections\n${node.path}`;
    requestAnimationFrame(() => {
      if (token !== this.hoverToken) return;
      tooltip.setText(basic);
      tooltip.style.left = `${event.offsetX + 16}px`;
      tooltip.style.top = `${event.offsetY + 16}px`;
      tooltip.show();
    });

    const preview = await this.previewFor(node);
    if (token !== this.hoverToken) return;
    const lines = [
      node.label,
      `${preview.type} · ${node.degree ?? 0} connections`,
      preview.summary || "No summary recorded yet.",
    ];
    if (preview.neighbors.length) lines.push(`Top links: ${preview.neighbors.join(" · ")}`);
    requestAnimationFrame(() => {
      if (token !== this.hoverToken) return;
      tooltip.setText(lines.join("\n"));
      tooltip.style.left = `${event.offsetX + 16}px`;
      tooltip.style.top = `${event.offsetY + 16}px`;
      tooltip.show();
    });
  }

  overrideViewNavigation() {
    this.view.showOverview = () => this.root(true);
    this.view.showGroup = () => this.root();
    this.view.showFocus = (query) => this.search(query);
    this.view.onClose = async () => {
      this.destroy();
      return this.originalOnClose();
    };
  }

  applyScene(scene, label, options = {}) {
    if (!scene) return;
    if (options.reset) {
      this.stack = [{ label, scene }];
    } else if (options.replace) {
      this.stack[this.stack.length - 1] = { label, scene };
    } else {
      this.stack.push({ label, scene });
    }
    this.view.mode = scene.mode;
    this.view.selectedGroup = null;
    this.view.setScene(scene);
    this.renderBreadcrumbs();
    this.updateStatus();
  }

  root(forceRebuild = false) {
    if (!this.view.graph?.nodes?.length) return;
    this.view.searchInput.value = "";
    const currentRoot = this.stack[0]?.scene;
    const scene = forceRebuild || !currentRoot || currentRoot.mode !== "full"
      ? buildFullScene(this.view)
      : currentRoot;
    this.applyScene(scene, "Full graph", { reset: true });
  }

  search(query) {
    if (!this.view.graph?.nodes?.length) return;
    const scene = buildSearchScene(this.view, query);
    const rootScene = this.stack[0]?.scene?.mode === "full" ? this.stack[0].scene : buildFullScene(this.view);
    this.stack = [{ label: "Full graph", scene: rootScene }];
    this.applyScene(scene, `Search: ${query}`);
  }

  pushConnections(node) {
    const graphNode = this.view.graph.byId.get(node.id) ?? node;
    const scene = buildConnectionScene(this.view, graphNode.id);
    if (!scene) return;
    this.applyScene(scene, graphNode.label);
  }

  back() {
    if (this.stack.length <= 1) return;
    this.stack.pop();
    const current = this.stack[this.stack.length - 1];
    this.view.mode = current.scene.mode;
    this.view.setScene(current.scene);
    this.renderBreadcrumbs();
    this.updateStatus();
  }

  jump(index) {
    if (index < 0 || index >= this.stack.length) return;
    this.stack = this.stack.slice(0, index + 1);
    const current = this.stack[this.stack.length - 1];
    this.view.mode = current.scene.mode;
    this.view.setScene(current.scene);
    this.renderBreadcrumbs();
    this.updateStatus();
  }

  renderBreadcrumbs() {
    this.breadcrumbs.empty();
    this.stack.forEach((item, index) => {
      if (index > 0) this.breadcrumbs.createSpan({ cls: "wct-graph-breadcrumb-separator", text: "›" });
      const button = this.breadcrumbs.createEl("button", { text: item.label });
      button.disabled = index === this.stack.length - 1;
      button.addEventListener("click", () => this.jump(index));
    });
    this.view.backButton.disabled = this.stack.length <= 1;
    this.badge.setText(
      this.stack.length <= 1
        ? "Full graph · click any node for details"
        : `Connection depth ${this.stack.length - 1} · use breadcrumbs or Back to unwind`,
    );
  }

  updateStatus() {
    const current = this.stack[this.stack.length - 1]?.scene;
    if (!current) return;
    if (current.mode === "full") {
      this.view.status.setText(
        `${current.sourceNodeCount.toLocaleString()} nodes · ${current.sourceEdgeCount.toLocaleString()} total links · ${current.renderedEdgeCount.toLocaleString()} rendered`,
      );
    } else if (current.mode === "connections") {
      this.view.status.setText(
        `${current.title} · ${current.sourceNodeCount.toLocaleString()} nodes · ${current.sourceEdgeCount.toLocaleString()} links · depth ${this.stack.length - 1}`,
      );
    } else if (current.mode === "search") {
      this.view.status.setText(
        current.noMatches
          ? `No matches for “${current.query}”`
          : `${current.sourceNodeCount} matches · ${current.nodes.length} visible nodes · ${current.sourceEdgeCount} links`,
      );
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.view.stage.removeEventListener("pointerdown", this.onPointerDown, true);
    this.view.stage.removeEventListener("pointerup", this.onPointerUp, true);
    this.view.stage.removeEventListener("pointermove", this.onPointerMove, true);
    this.view.stage.removeEventListener("pointerleave", this.onPointerLeave, true);
    this.inspector?.destroy();
    this.badge?.remove();
    this.breadcrumbs?.remove();
    this.view[PATCHED] = false;
  }
}

function patchView(plugin, view) {
  if (!view || view[PATCHED] || !view.graph || !view.renderer || !view.stage) return;
  view[PATCHED] = true;
  view.__wctGraphNavigator = new GraphNavigatorController(plugin, view);
}

module.exports = class WCTGraphNavigatorPlugin extends Plugin {
  onload() {
    const patchAll = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) patchView(this, leaf.view);
    };

    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(patchAll, 120)));
    this.app.workspace.onLayoutReady(() => setTimeout(patchAll, 320));

    this.addCommand({
      id: "open-full-wct-graph",
      name: "Open full graph",
      callback: async () => {
        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
        if (!leaf) {
          new Notice("Open WCT Graph first.");
          return;
        }
        patchView(this, leaf.view);
        leaf.view.__wctGraphNavigator?.root(true);
        await this.app.workspace.revealLeaf(leaf);
      },
    });

    this.addCommand({
      id: "back-one-connection-level",
      name: "Back one connection level",
      callback: () => {
        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
        leaf?.view?.__wctGraphNavigator?.back();
      },
    });
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.__wctGraphNavigator?.destroy();
    }
  }
};