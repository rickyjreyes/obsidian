"use strict";

const { ItemView } = require("obsidian");
const rendererMethods = require("./graph-renderer");
const interactionMethods = require("./graph-interaction");
const {
  VIEW_TYPE,
  VIEW_NAME,
  debounce,
  GraphIndex,
  buildFullScene,
  buildCategoryScene,
  buildConnectionScene,
  buildSearchScene,
} = require("./graph-core");

class WCTGraphView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.settings = plugin.settings;
    this.graph = null;
    this.scene = null;
    this.stack = [];
    this.previewCache = new Map();
    this.hovered = null;
    this.selected = null;
    this.displayPositions = new Map();
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.drag = null;
    this.pendingNode = null;
    this.animation = null;
    this.raf = null;
    this.needsRender = true;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return VIEW_NAME; }
  getIcon() { return "git-fork"; }

  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("wct-graph-root");

    this.toolbar = root.createDiv({ cls: "wct-graph-toolbar" });
    this.backButton = this.toolbar.createEl("button", { text: "Back" });
    this.fullButton = this.toolbar.createEl("button", { text: "Full graph" });
    this.breadcrumbs = this.toolbar.createDiv({ cls: "wct-graph-breadcrumbs" });
    this.searchInput = this.toolbar.createEl("input", {
      cls: "wct-graph-search",
      attr: { type: "search", placeholder: "Find a paper, concept, equation, or source…" },
    });
    this.fitButton = this.toolbar.createEl("button", { text: "Fit" });
    this.rebuildButton = this.toolbar.createEl("button", { text: "Rebuild" });
    this.status = this.toolbar.createSpan({ cls: "wct-graph-status" });

    this.stage = root.createDiv({ cls: "wct-graph-stage" });
    this.canvas = this.stage.createEl("canvas", { cls: "wct-graph-canvas" });
    this.context = this.canvas.getContext("2d");
    this.tooltip = this.stage.createDiv({ cls: "wct-graph-tooltip is-hidden" });
    this.inspector = this.stage.createDiv({ cls: "wct-graph-inspector is-hidden" });
    this.buildInspectorShell();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
    this.resize();
    this.bindEvents();
    await this.rebuildGraph();
    this.startLoop();
  }

  buildInspectorShell() {
    const header = this.inspector.createDiv({ cls: "wct-graph-inspector-header" });
    this.inspectorTitle = header.createDiv({ cls: "wct-graph-inspector-title" });
    this.closeInspectorButton = header.createEl("button", {
      cls: "wct-graph-inspector-close",
      text: "×",
      attr: { type: "button", "aria-label": "Close details" },
    });
    this.inspectorBody = this.inspector.createDiv({ cls: "wct-graph-inspector-body" });
    this.inspectorActions = this.inspector.createDiv({ cls: "wct-graph-inspector-actions" });
    this.closeInspectorButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.hideInspector();
    });
  }

  bindEvents() {
    this.backButton.addEventListener("click", () => this.back());
    this.fullButton.addEventListener("click", () => this.showFull());
    this.fitButton.addEventListener("click", () => this.fitScene(true));
    this.rebuildButton.addEventListener("click", () => this.rebuildGraph());
    this.searchInput.addEventListener("input", debounce(() => {
      const query = this.searchInput.value.trim();
      if (!query) this.showFull();
      else this.showSearch(query);
    }, 180));

    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("pointerup", (event) => this.onPointerUp(event));
    this.canvas.addEventListener("pointercancel", (event) => this.resetPointer(event));
    this.canvas.addEventListener("lostpointercapture", (event) => this.resetPointer(event));
    this.canvas.addEventListener("pointerleave", () => {
      if (!this.drag && !this.pendingNode) {
        this.hovered = null;
        this.hideTooltip();
        this.canvas.style.cursor = "grab";
      }
    });
    this.canvas.addEventListener("dblclick", (event) => {
      const node = this.hitTest(event.clientX, event.clientY);
      if (node?.kind === "note") this.pushConnections(node.id, node);
      else if (node?.kind === "area") this.pushCategory(node.type, node);
    });
    this.canvas.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
  }

  async rebuildGraph() {
    this.status.setText("Indexing…");
    this.graph = GraphIndex.build(this.app, this.settings);
    this.previewCache.clear();
    this.showFull(true);
    this.status.setText(`${this.graph.nodes.length.toLocaleString()} nodes · ${this.graph.edges.length.toLocaleString()} links`);
  }

  showFull(force = false) {
    if (!this.graph) return;
    this.searchInput.value = "";
    const scene = !force && this.stack[0]?.scene?.mode === "full"
      ? this.stack[0].scene
      : buildFullScene(this.graph, this.settings);
    this.navigate(scene, "Full graph", { reset: true, origin: this.scene?.focusId ?? null });
  }

  pushCategory(type, originNode = null) {
    const scene = buildCategoryScene(this.graph, type, this.settings);
    this.navigate(scene, type, { origin: originNode?.id ?? null });
  }

  pushConnections(nodeId, originNode = null) {
    const scene = buildConnectionScene(this.graph, nodeId, this.settings);
    if (!scene) return;
    const node = this.graph.byId.get(nodeId);
    this.navigate(scene, node?.label ?? "Connections", { origin: originNode?.id ?? nodeId });
  }

  showSearch(query) {
    if (!this.graph) return;
    const rootScene = this.stack[0]?.scene?.mode === "full"
      ? this.stack[0].scene
      : buildFullScene(this.graph, this.settings);
    this.stack = [{ label: "Full graph", scene: rootScene }];
    const scene = buildSearchScene(this.graph, query, this.settings);
    this.navigate(scene, `Search: ${query}`, { origin: null });
  }

  navigate(scene, label, options = {}) {
    if (!scene) return;
    const previous = this.scene;
    if (options.reset) this.stack = [{ label, scene }];
    else this.stack.push({ label, scene });
    this.scene = scene;
    this.selected = null;
    this.hideInspector();
    this.beginTransition(previous, scene, options.origin);
    this.renderBreadcrumbs();
    this.updateStatus();
  }

  back() {
    if (this.stack.length <= 1) return;
    const previous = this.scene;
    this.stack.pop();
    this.scene = this.stack[this.stack.length - 1].scene;
    this.hideInspector();
    this.beginTransition(previous, this.scene, this.scene.focusId ?? null);
    this.renderBreadcrumbs();
    this.updateStatus();
  }

  jump(index) {
    if (index < 0 || index >= this.stack.length) return;
    const previous = this.scene;
    this.stack = this.stack.slice(0, index + 1);
    this.scene = this.stack[this.stack.length - 1].scene;
    this.hideInspector();
    this.beginTransition(previous, this.scene, this.scene.focusId ?? null);
    this.renderBreadcrumbs();
    this.updateStatus();
  }

  renderBreadcrumbs() {
    this.breadcrumbs.empty();
    this.stack.forEach((item, index) => {
      if (index) this.breadcrumbs.createSpan({ cls: "wct-graph-breadcrumb-separator", text: "›" });
      const button = this.breadcrumbs.createEl("button", { text: item.label, attr: { type: "button" } });
      button.disabled = index === this.stack.length - 1;
      button.addEventListener("click", () => this.jump(index));
    });
    this.backButton.disabled = this.stack.length <= 1;
  }

  updateStatus() {
    const scene = this.scene;
    if (!scene) return;
    if (scene.mode === "full") {
      this.status.setText(`${scene.sourceNodeCount.toLocaleString()} nodes · ${scene.sourceEdgeCount.toLocaleString()} total links · ${scene.edges.length.toLocaleString()} rendered`);
    } else if (scene.mode === "search") {
      this.status.setText(scene.noMatches
        ? `No matches for “${scene.query}”`
        : `${scene.sourceNodeCount} matches · ${scene.nodes.length} visible nodes`);
    } else {
      this.status.setText(`${scene.title} · ${scene.sourceNodeCount.toLocaleString()} nodes · ${scene.sourceEdgeCount.toLocaleString()} links · depth ${this.stack.length - 1}`);
    }
  }

  beginTransition(previous, next, originId) {
    const previousPositions = new Map((previous?.nodes ?? []).map((node) => [
      node.id,
      this.displayPositions.get(node.id) ?? { x: node.x, y: node.y },
    ]));
    const targetById = new Map(next.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
    let origin = previousPositions.get(originId);
    if (!origin && originId) origin = previousPositions.get(`area:${originId}`);
    if (!origin) origin = { x: 0, y: 0 };
    const starts = new Map();
    for (const node of next.nodes) {
      const prior = previousPositions.get(node.id);
      starts.set(node.id, prior ?? {
        x: origin.x + (node.x - origin.x) * 0.12,
        y: origin.y + (node.y - origin.y) * 0.12,
      });
    }
    this.animation = {
      start: performance.now(),
      duration: 620,
      starts,
      targets: targetById,
      edgeAlpha: 0,
    };
    this.fitScene(true);
    this.needsRender = true;
  }

  async onClose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
  }
}

for (const source of [interactionMethods, rendererMethods]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") {
      Object.defineProperty(WCTGraphView.prototype, name, Object.getOwnPropertyDescriptor(source, name));
    }
  }
}

module.exports = { WCTGraphView };