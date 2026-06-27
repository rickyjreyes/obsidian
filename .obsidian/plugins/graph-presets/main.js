"use strict";

const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  presets: [],
  activePresetId: null,
  restoreOnStartup: true,
  adaptivePerformance: true,
  largeGraphThreshold: 800,
  maxPositionNodes: 400,
  positionBatchSize: 80,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

class GraphInterface {
  static getLeaves(app) {
    return app.workspace.getLeavesOfType("graph");
  }

  static findLeaf(app, quiet = false) {
    const leaves = GraphInterface.getLeaves(app);
    if (leaves.length === 0) {
      if (!quiet) new Notice("No Graph View open");
      return null;
    }
    const active = app.workspace.activeLeaf;
    if (active?.view?.getViewType?.() === "graph") return active;
    return leaves[0];
  }

  static getNodes(leaf) {
    return Array.isArray(leaf?.view?.renderer?.nodes)
      ? leaf.view.renderer.nodes
      : [];
  }

  static getNodeCount(leaf) {
    return GraphInterface.getNodes(leaf).length;
  }

  static captureOptions(leaf) {
    return clone(leaf?.view?.dataEngine?.getOptions?.() ?? {});
  }

  static applyOptions(leaf, options) {
    leaf?.view?.dataEngine?.setOptions?.(clone(options));
  }

  static capturePositions(leaf, maxNodes) {
    const nodes = GraphInterface.getNodes(leaf);
    if (nodes.length > maxNodes) {
      return { positions: [], skipped: true, nodeCount: nodes.length };
    }
    return {
      positions: nodes
        .filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y))
        .map((node) => ({ id: node.id, x: node.x, y: node.y })),
      skipped: false,
      nodeCount: nodes.length,
    };
  }

  static async waitForStable(
    leaf,
    { timeout = 4500, interval = 150, stableRounds = 3 } = {},
  ) {
    const started = Date.now();
    let previous = -1;
    let unchanged = 0;
    let current = GraphInterface.getNodeCount(leaf);

    while (Date.now() - started < timeout) {
      current = GraphInterface.getNodeCount(leaf);
      if (current === previous) unchanged += 1;
      else unchanged = 0;
      if (unchanged >= stableRounds) return current;
      previous = current;
      await sleep(interval);
    }
    return current;
  }

  static makePerformanceOptions(options) {
    const next = clone(options);
    next.showTags = false;
    next.showAttachments = false;
    next.hideUnresolved = true;
    next.showOrphans = false;
    next.showArrow = false;
    next.textFadeMultiplier = Math.min(finite(next.textFadeMultiplier, -2.2), -2.2);
    next.nodeSizeMultiplier = Math.min(finite(next.nodeSizeMultiplier, 1), 1);
    next.lineSizeMultiplier = Math.min(finite(next.lineSizeMultiplier, 0.35), 0.35);
    next.centerStrength = Math.min(finite(next.centerStrength, 0.22), 0.22);
    next.repelStrength = Math.min(finite(next.repelStrength, 5), 5);
    next.linkStrength = Math.min(finite(next.linkStrength, 0.3), 0.3);
    next.linkDistance = Math.min(finite(next.linkDistance, 130), 130);
    return next;
  }

  static performanceOptionsDiffer(current, optimized) {
    const keys = [
      "showTags",
      "showAttachments",
      "hideUnresolved",
      "showOrphans",
      "showArrow",
      "textFadeMultiplier",
      "nodeSizeMultiplier",
      "lineSizeMultiplier",
      "centerStrength",
      "repelStrength",
      "linkStrength",
      "linkDistance",
    ];
    return keys.some((key) => current?.[key] !== optimized?.[key]);
  }

  static async optimizeIfLarge(leaf, settings) {
    let count = await GraphInterface.waitForStable(leaf, {
      timeout: 3000,
      interval: 180,
      stableRounds: 2,
    });

    const container = leaf?.view?.containerEl;
    if (count <= settings.largeGraphThreshold) {
      if (container) {
        delete container.dataset.largeGraphOptimized;
        container.dataset.graphNodeCount = String(count);
      }
      return { optimized: false, count };
    }

    const current = GraphInterface.captureOptions(leaf);
    const optimized = GraphInterface.makePerformanceOptions(current);
    if (GraphInterface.performanceOptionsDiffer(current, optimized)) {
      GraphInterface.applyOptions(leaf, optimized);
      count = await GraphInterface.waitForStable(leaf, {
        timeout: 3000,
        interval: 180,
        stableRounds: 2,
      });
    }

    const worker = leaf?.view?.renderer?.worker;
    worker?.postMessage?.({ run: true, alpha: 0.025 });

    if (container) {
      container.dataset.largeGraphOptimized = "true";
      container.dataset.graphNodeCount = String(count);
    }
    return { optimized: true, count };
  }

  static async applyPositions(leaf, positions, settings) {
    if (!Array.isArray(positions) || positions.length === 0) {
      return { applied: 0, skipped: "no-positions" };
    }

    const count = GraphInterface.getNodeCount(leaf);
    if (count > settings.largeGraphThreshold) {
      return { applied: 0, skipped: "large-graph" };
    }

    const worker = leaf?.view?.renderer?.worker;
    if (!worker?.postMessage) {
      return { applied: 0, skipped: "no-worker" };
    }

    const visibleIds = new Set(GraphInterface.getNodes(leaf).map((node) => node.id));
    const usable = positions.filter((node) => visibleIds.has(node.id));
    const batchSize = Math.max(20, finite(settings.positionBatchSize, 80));

    for (let index = 0; index < usable.length; index += batchSize) {
      const batch = usable.slice(index, index + batchSize);
      for (const node of batch) worker.postMessage({ forceNode: node });
      await nextFrame();
    }

    worker.postMessage({ run: true, alpha: 0.07 });
    await sleep(420);

    for (let index = 0; index < usable.length; index += batchSize) {
      const batch = usable.slice(index, index + batchSize);
      for (const node of batch) {
        worker.postMessage({ forceNode: { id: node.id, x: null, y: null } });
      }
      await nextFrame();
    }

    return { applied: usable.length, skipped: null };
  }
}

class PresetManager {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.restoredLeaves = new WeakMap();
  }

  get settings() {
    return this.plugin.settings;
  }

  list() {
    return this.settings.presets;
  }

  get(id) {
    return this.list().find((preset) => preset.id === id);
  }

  get activePresetId() {
    return this.settings.activePresetId;
  }

  async saveCurrent(name) {
    const leaf = GraphInterface.findLeaf(this.app);
    if (!leaf) throw new Error("No Graph View open");

    const capture = GraphInterface.capturePositions(
      leaf,
      this.settings.maxPositionNodes,
    );
    const now = new Date().toISOString();
    const preset = {
      id: crypto.randomUUID(),
      name,
      options: GraphInterface.captureOptions(leaf),
      nodePositions: capture.positions,
      positionNodeCount: capture.nodeCount,
      positionsSkipped: capture.skipped,
      createdAt: now,
      updatedAt: now,
    };

    this.settings.presets.push(preset);
    this.settings.activePresetId = preset.id;
    await this.plugin.saveSettings();
    this.restoredLeaves.set(leaf, preset.id);

    const suffix = capture.skipped
      ? `; positions skipped for ${capture.nodeCount} nodes`
      : `; ${capture.positions.length} positions saved`;
    new Notice(`Preset "${name}" saved${suffix}`);
    return preset;
  }

  async updateCurrent(id) {
    const leaf = GraphInterface.findLeaf(this.app);
    if (!leaf) throw new Error("No Graph View open");
    const preset = this.get(id);
    if (!preset) throw new Error("Preset not found");

    const capture = GraphInterface.capturePositions(
      leaf,
      this.settings.maxPositionNodes,
    );
    preset.options = GraphInterface.captureOptions(leaf);
    preset.nodePositions = capture.positions;
    preset.positionNodeCount = capture.nodeCount;
    preset.positionsSkipped = capture.skipped;
    preset.updatedAt = new Date().toISOString();
    await this.plugin.saveSettings();
    this.restoredLeaves.set(leaf, id);

    const suffix = capture.skipped
      ? `; positions skipped for ${capture.nodeCount} nodes`
      : `; ${capture.positions.length} positions saved`;
    new Notice(`Preset "${preset.name}" updated${suffix}`);
  }

  async activate(id, { quiet = false, force = true } = {}) {
    const preset = this.get(id);
    if (!preset) throw new Error("Preset not found");
    const leaf = GraphInterface.findLeaf(this.app, quiet);
    if (!leaf) throw new Error("No Graph View open");

    if (!force && this.restoredLeaves.get(leaf) === id) return;

    GraphInterface.applyOptions(leaf, preset.options);
    await GraphInterface.waitForStable(leaf);

    let performance = { optimized: false, count: GraphInterface.getNodeCount(leaf) };
    if (this.settings.adaptivePerformance) {
      performance = await GraphInterface.optimizeIfLarge(leaf, this.settings);
    }

    const positionResult = await GraphInterface.applyPositions(
      leaf,
      preset.nodePositions,
      this.settings,
    );

    this.settings.activePresetId = id;
    await this.plugin.saveSettings();
    this.restoredLeaves.set(leaf, id);

    if (!quiet) {
      const mode = performance.optimized
        ? ` · performance mode (${performance.count} nodes)`
        : positionResult.applied
          ? ` · restored ${positionResult.applied} positions`
          : "";
      new Notice(`Activated: ${preset.name}${mode}`);
    }
  }

  async restoreLastActive({ force = false } = {}) {
    if (!this.settings.restoreOnStartup || !this.settings.activePresetId) return;
    const leaf = GraphInterface.findLeaf(this.app, true);
    if (!leaf) return;
    await this.activate(this.settings.activePresetId, { quiet: true, force });
  }

  async optimizeOpenGraphs({ quiet = false } = {}) {
    const leaves = GraphInterface.getLeaves(this.app);
    if (leaves.length === 0) {
      if (!quiet) new Notice("No Graph View open");
      return [];
    }

    const results = [];
    for (const leaf of leaves) {
      results.push(await GraphInterface.optimizeIfLarge(leaf, this.settings));
    }

    if (!quiet) {
      const optimized = results.filter((result) => result.optimized);
      if (optimized.length > 0) {
        const largest = Math.max(...optimized.map((result) => result.count));
        new Notice(`Large-graph performance mode enabled (${largest} nodes)`);
      } else {
        const largest = Math.max(...results.map((result) => result.count));
        new Notice(`No graph exceeded ${this.settings.largeGraphThreshold} nodes (${largest} shown)`);
      }
    }
    return results;
  }

  async delete(id) {
    const index = this.settings.presets.findIndex((preset) => preset.id === id);
    if (index < 0) return;
    const name = this.settings.presets[index].name;
    this.settings.presets.splice(index, 1);
    if (this.settings.activePresetId === id) this.settings.activePresetId = null;
    await this.plugin.saveSettings();
    new Notice(`Preset "${name}" deleted`);
  }

  async rename(id, newName) {
    const preset = this.get(id);
    if (!preset) return;
    preset.name = newName;
    preset.updatedAt = new Date().toISOString();
    await this.plugin.saveSettings();
  }
}

class GraphPresetsSettingTab extends PluginSettingTab {
  constructor(app, manager, plugin) {
    super(app, plugin);
    this.manager = manager;
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Graph Presets & Performance" });

    new Setting(containerEl)
      .setName("Adaptive large-graph mode")
      .setDesc("Automatically disables unresolved nodes, orphans, arrows, attachments, and expensive force settings when the graph exceeds the threshold.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.adaptivePerformance)
          .onChange(async (value) => {
            this.plugin.settings.adaptivePerformance = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Large-graph threshold")
      .setDesc("Performance mode activates at this many visible graph nodes.")
      .addText((text) =>
        text
          .setPlaceholder("800")
          .setValue(String(this.plugin.settings.largeGraphThreshold))
          .onChange(async (value) => {
            const parsed = Math.max(100, Math.round(Number(value) || 800));
            this.plugin.settings.largeGraphThreshold = parsed;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Maximum nodes with saved positions")
      .setDesc("Above this count, a preset saves filters and colors but not hundreds of node coordinates.")
      .addText((text) =>
        text
          .setPlaceholder("400")
          .setValue(String(this.plugin.settings.maxPositionNodes))
          .onChange(async (value) => {
            const parsed = Math.max(50, Math.round(Number(value) || 400));
            this.plugin.settings.maxPositionNodes = parsed;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Restore active preset on startup")
      .setDesc("Restores once per graph tab. It no longer reruns on every layout change.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.restoreOnStartup)
          .onChange(async (value) => {
            this.plugin.settings.restoreOnStartup = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Optimize open graph now")
      .setDesc("Runs the adaptive node-count check immediately.")
      .addButton((button) =>
        button.setButtonText("Optimize").onClick(() =>
          this.manager.optimizeOpenGraphs({ quiet: false }),
        ),
      );

    containerEl.createEl("h3", { text: "Saved presets" });
    const presets = this.manager.list();
    if (presets.length === 0) {
      containerEl.createEl("p", {
        text: "No presets yet. Open a Graph View, set filters/colors, then use the Presets panel.",
        cls: "setting-item-description",
      });
      return;
    }

    for (const preset of presets) {
      const filter = preset.options?.search || "(all)";
      const positionCount = preset.nodePositions?.length ?? 0;
      const positionLabel = preset.positionsSkipped
        ? "positions skipped"
        : `${positionCount} positions`;
      new Setting(containerEl)
        .setName(preset.name)
        .setDesc(`Filter: ${filter} · ${positionLabel} · ${preset.updatedAt?.slice(0, 10) ?? ""}`)
        .addExtraButton((button) =>
          button.setIcon("pencil").setTooltip("Rename").onClick(async () => {
            const name = window.prompt("New name:", preset.name);
            if (name?.trim() && name.trim() !== preset.name) {
              await this.manager.rename(preset.id, name.trim());
              this.display();
            }
          }),
        )
        .addExtraButton((button) =>
          button.setIcon("trash").setTooltip("Delete").onClick(async () => {
            await this.manager.delete(preset.id);
            this.display();
          }),
        );
    }
  }
}

const PANEL_ID = "graph-presets-panel";

class HeaderUI {
  static injectAll(app, manager) {
    for (const leaf of GraphInterface.getLeaves(app)) {
      const container = leaf?.view?.containerEl;
      if (!container || container.querySelector(`#${PANEL_ID}`)) continue;
      HeaderUI.injectOne(leaf, manager);
    }
  }

  static injectOne(leaf, manager) {
    const graphContainer = leaf.view.containerEl;
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = [
      "position:absolute",
      "bottom:12px",
      "left:12px",
      "z-index:10",
      "background:var(--background-primary)",
      "border:1px solid var(--background-modifier-border)",
      "border-radius:8px",
      "padding:6px 8px",
      "font-size:12px",
      "box-shadow:0 2px 8px rgba(0,0,0,.15)",
      "min-width:220px",
    ].join(";");
    graphContainer.appendChild(panel);

    const toggle = panel.createEl("button", { text: "📁 Presets" });
    toggle.style.cssText = "font-size:12px;width:100%;cursor:pointer;";
    const body = panel.createEl("div");
    body.style.display = "none";

    const status = body.createEl("div");
    status.style.cssText = "margin:5px 0;color:var(--text-muted);font-size:11px;";

    const select = body.createEl("select", { cls: "dropdown" });
    select.style.cssText = "width:100%;margin-bottom:4px;";

    const row = body.createEl("div");
    row.style.cssText = "display:flex;gap:3px;";
    const primary = row.createEl("button");
    primary.style.cssText = "font-size:11px;flex:1;";
    const add = row.createEl("button", { text: "+" });
    add.style.cssText = "font-size:11px;flex:0 0 26px;";
    const optimize = row.createEl("button", { text: "⚡" });
    optimize.style.cssText = "font-size:11px;flex:0 0 28px;";
    optimize.title = "Optimize large graph";
    const remove = row.createEl("button", { text: "🗑" });
    remove.style.cssText = "font-size:11px;flex:0 0 30px;color:var(--text-error);";

    let expanded = false;
    toggle.addEventListener("click", () => {
      expanded = !expanded;
      body.style.display = expanded ? "block" : "none";
      toggle.textContent = expanded ? "📁 Presets ▲" : "📁 Presets";
      if (expanded) HeaderUI.refresh(leaf, select, primary, add, status, manager);
    });

    select.addEventListener("change", async () => {
      if (!select.value) return;
      try {
        await manager.activate(select.value);
        HeaderUI.refresh(leaf, select, primary, add, status, manager);
      } catch (error) {
        new Notice(error.message);
      }
    });

    primary.addEventListener("click", async () => {
      const active = manager.activePresetId;
      if (active) {
        await manager.updateCurrent(active);
        HeaderUI.refresh(leaf, select, primary, add, status, manager);
      } else {
        HeaderUI.promptSave(select, primary, add, remove, optimize, status, manager, leaf);
      }
    });

    add.addEventListener("click", () =>
      HeaderUI.promptSave(select, primary, add, remove, optimize, status, manager, leaf),
    );

    optimize.addEventListener("click", async () => {
      await manager.optimizeOpenGraphs({ quiet: false });
      HeaderUI.refresh(leaf, select, primary, add, status, manager);
    });

    remove.addEventListener("click", async () => {
      if (!select.value) return new Notice("No preset selected");
      const preset = manager.get(select.value);
      if (preset && confirm(`Delete "${preset.name}"?`)) {
        await manager.delete(preset.id);
        HeaderUI.refresh(leaf, select, primary, add, status, manager);
      }
    });
  }

  static promptSave(select, primary, add, remove, optimize, status, manager, leaf) {
    if (select.parentElement?.querySelector("input.graph-preset-name")) return;
    const input = document.createElement("input");
    input.className = "graph-preset-name";
    input.type = "text";
    input.placeholder = "preset name...";
    input.style.cssText = "width:100%;margin-bottom:4px;font-size:12px;";
    select.before(input);
    primary.style.display = "none";
    add.style.display = "none";
    remove.style.display = "none";
    optimize.style.display = "none";

    const finish = () => {
      input.remove();
      primary.style.display = "";
      add.style.display = "";
      remove.style.display = "";
      optimize.style.display = "";
    };

    const save = async () => {
      const name = input.value.trim();
      finish();
      if (!name) return;
      try {
        await manager.saveCurrent(name);
        HeaderUI.refresh(leaf, select, primary, add, status, manager);
      } catch (error) {
        new Notice(error.message);
      }
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") save();
      if (event.key === "Escape") finish();
    });
    input.focus();
  }

  static refresh(leaf, select, primary, add, status, manager) {
    const presets = manager.list();
    const active = manager.activePresetId;
    select.innerHTML = "";

    if (presets.length === 0) {
      const option = select.createEl("option", { value: "", text: "No presets" });
      option.disabled = true;
      option.selected = true;
      primary.textContent = "Save";
      add.style.display = "none";
    } else {
      const hasActive = presets.some((preset) => preset.id === active);
      primary.textContent = hasActive ? "Update" : "Save";
      add.style.display = "";
      for (const preset of presets) {
        const option = select.createEl("option", {
          value: preset.id,
          text: preset.name,
        });
        if (preset.id === active) option.selected = true;
      }
    }

    const count = GraphInterface.getNodeCount(leaf);
    const optimized = leaf.view.containerEl.dataset.largeGraphOptimized === "true";
    status.textContent = optimized
      ? `⚡ Performance mode · ${count} nodes`
      : `${count} visible nodes`;
    HeaderUI.updateTabTitle(leaf, manager);
  }

  static updateTabTitle(leaf, manager) {
    const title = leaf?.tabHeaderEl?.querySelector(".workspace-tab-header-inner-title");
    if (!title) return;
    const active = manager.get(manager.activePresetId);
    const count = GraphInterface.getNodeCount(leaf);
    title.textContent = active ? `Graph: ${active.name} (${count})` : `Graph view (${count})`;
  }
}

module.exports = class GraphPresetsPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.presetManager = new PresetManager(this);
    this.layoutTimer = null;
    this.optimizeTimer = null;

    this.addCommand({
      id: "save-preset",
      name: "Save current graph as preset",
      callback: async () => {
        const name = `Preset ${this.settings.presets.length + 1}`;
        try {
          await this.presetManager.saveCurrent(name);
        } catch (error) {
          new Notice(error.message);
        }
      },
    });

    this.addCommand({
      id: "restore-last-preset",
      name: "Restore last active preset now",
      callback: () => this.presetManager.restoreLastActive({ force: true }),
    });

    this.addCommand({
      id: "optimize-large-graph",
      name: "Optimize graph when node count is large",
      callback: () => this.presetManager.optimizeOpenGraphs({ quiet: false }),
    });

    this.addSettingTab(new GraphPresetsSettingTab(this.app, this.presetManager, this));

    const schedule = () => this.scheduleGraphWork();
    this.registerEvent(this.app.workspace.on("layout-change", schedule));
    this.registerEvent(this.app.metadataCache.on("resolved", schedule));

    this.app.workspace.onLayoutReady(() => this.scheduleGraphWork());
  }

  scheduleGraphWork() {
    clearTimeout(this.layoutTimer);
    this.layoutTimer = setTimeout(async () => {
      HeaderUI.injectAll(this.app, this.presetManager);
      if (this.settings.restoreOnStartup) {
        try {
          await this.presetManager.restoreLastActive({ force: false });
        } catch (error) {
          console.debug("Graph preset restore skipped:", error);
        }
      }

      clearTimeout(this.optimizeTimer);
      if (this.settings.adaptivePerformance) {
        this.optimizeTimer = setTimeout(async () => {
          try {
            await this.presetManager.optimizeOpenGraphs({ quiet: true });
            HeaderUI.injectAll(this.app, this.presetManager);
          } catch (error) {
            console.debug("Large graph optimization skipped:", error);
          }
        }, 900);
      }
    }, 350);
  }

  onunload() {
    clearTimeout(this.layoutTimer);
    clearTimeout(this.optimizeTimer);
    document.querySelectorAll(`#${PANEL_ID}`).forEach((element) => element.remove());
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
    if (!Array.isArray(this.settings.presets)) this.settings.presets = [];
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};