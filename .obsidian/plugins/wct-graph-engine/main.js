"use strict";

const path = require("path");
const obsidianApi = require("obsidian");
const { Plugin, PluginSettingTab, Setting, Notice } = obsidianApi;

globalThis.__WCT_OBSIDIAN_API__ = obsidianApi;

function pluginFile(plugin, filename) {
  const adapter = plugin.app.vault.adapter;
  const dir = plugin.manifest.dir ?? `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
  const relative = `${dir}/${filename}`.replace(/\\/g, "/");
  if (typeof adapter.getFullPath === "function") return adapter.getFullPath(relative);
  if (typeof adapter.getBasePath === "function") return path.join(adapter.getBasePath(), ...relative.split("/"));
  throw new Error("WCT Graph Engine could not resolve its plugin directory.");
}

class WCTSettings extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const plugin = this.plugin;
    const { clamp } = plugin.graphCore;
    containerEl.empty();
    containerEl.createEl("h2", { text: "WCT Graph" });

    new Setting(containerEl).setName("Include folders")
      .setDesc("Comma-separated vault folders to index.")
      .addText((text) => text.setValue(plugin.settings.includeFolders.join(", ")).onChange(async (value) => {
        plugin.settings.includeFolders = value.split(",").map((item) => item.trim()).filter(Boolean);
        await plugin.saveSettings();
      }));

    for (const [key, name, description] of [
      ["includeGeneratedObjects", "Generated research objects", "Include semantic objects and artifacts from WaveLock Research."],
      ["semanticObjectsOnly", "Semantic object filter", "Hide obvious parser fragments and metadata-only objects."],
      ["hideOrphans", "Hide orphan notes", "Hide objects with no resolved graph connection."],
      ["showStatusRings", "Validation status rings", "Show aggregate SymPy, Lean, physical, and experimental state."],
      ["showRelationArrows", "Typed relation arrows", "Show direction for typed research relations."],
    ]) {
      new Setting(containerEl).setName(name).setDesc(description)
        .addToggle((toggle) => toggle.setValue(plugin.settings[key] !== false).onChange(async (value) => {
          plugin.settings[key] = value;
          await plugin.saveSettings();
          key === "showStatusRings" || key === "showRelationArrows" ? plugin.refreshViews() : plugin.rebuildViews();
        }));
    }

    new Setting(containerEl).setName("Full graph edge budget")
      .addText((text) => text.setValue(String(plugin.settings.fullEdgeBudget)).onChange(async (value) => {
        plugin.settings.fullEdgeBudget = clamp(Number(value) || 1700, 200, 5000);
        await plugin.saveSettings();
      }));

    new Setting(containerEl).setName("Timeline node budget")
      .addText((text) => text.setValue(String(plugin.settings.timelineMaxNodes ?? 2200)).onChange(async (value) => {
        plugin.settings.timelineMaxNodes = clamp(Number(value) || 2200, 200, 5000);
        await plugin.saveSettings();
      }));

    new Setting(containerEl).setName("Motion")
      .addDropdown((dropdown) => dropdown
        .addOption("full", "Full").addOption("reduced", "Reduced").addOption("off", "Off")
        .setValue(plugin.settings.motionMode ?? "full").onChange(async (value) => {
          plugin.settings.motionMode = value;
          await plugin.saveSettings();
          plugin.refreshViews();
        }));
  }
}

module.exports = class WCTGraphPlugin extends Plugin {
  async onload() {
    try {
      globalThis.__WCT_OBSIDIAN_API__ = obsidianApi;
      const names = [
        "graph-research.js", "graph-core.js", "graph-semantic.js", "graph-audit.js",
        "graph-timeline.js", "graph-search-v05.js", "graph-force.js", "graph-renderer.js",
        "graph-input.js", "graph-repository-index.js", "graph-inspector.js",
        "graph-interaction.js", "graph-timeline-view.js", "graph-style-v05.js",
        "graph-style-v06.js", "graph-view.js",
      ];
      for (const name of names) {
        const full = pluginFile(this, name);
        try { delete require.cache[require.resolve(full)]; } catch (_) {}
      }

      this.graphCore = require(pluginFile(this, "graph-core.js"));
      require(pluginFile(this, "graph-semantic.js")).installSemanticGraph(this.graphCore);
      this.graphCore.buildAuditScene = require(pluginFile(this, "graph-audit.js")).buildAuditScene;
      Object.assign(this.graphCore, require(pluginFile(this, "graph-timeline.js")));
      const search = require(pluginFile(this, "graph-search-v05.js"));
      this.graphCore.buildSearchScene = (graph, query, settings) => search.buildSearchScene(this.graphCore, graph, query, settings);
      require(pluginFile(this, "graph-style-v05.js")).installStyles(this);
      require(pluginFile(this, "graph-style-v06.js")).installStyles(this);

      const { WCTGraphView } = require(pluginFile(this, "graph-view.js"));
      const { VIEW_TYPE, DEFAULT_SETTINGS, debounce } = this.graphCore;
      this.viewType = VIEW_TYPE;
      this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() ?? {});
      if (this.settings.includeGeneratedObjects !== false) {
        this.settings.includeFolders = [...new Set([...(this.settings.includeFolders ?? ["Research"]), "WaveLock Research"])];
      }

      this.registerView(VIEW_TYPE, (leaf) => new WCTGraphView(leaf, this));
      this.addCommand({ id: "open-wct-graph", name: "Open WCT Graph", callback: () => this.activateView() });
      this.addCommand({ id: "open-wct-research-audit", name: "Open WCT Research Audit", callback: async () => {
        await this.activateView();
        this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view?.showAudit?.();
      }});
      this.addCommand({ id: "open-wct-idea-timeline", name: "Open WCT Idea Timeline", callback: async () => {
        await this.activateView();
        this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view?.showTimeline?.();
      }});
      this.addSettingTab(new WCTSettings(this.app, this));

      if (this.settings.autoRebuild) {
        const rebuild = debounce(() => this.rebuildViews(), 900);
        for (const event of ["create", "delete", "rename", "modify"]) this.registerEvent(this.app.vault.on(event, rebuild));
        this.registerEvent(this.app.metadataCache.on("resolved", rebuild));
      }
    } catch (error) {
      console.error("WCT Graph Engine failed to load", error);
      new Notice(`WCT Graph Engine failed to load: ${error?.message ?? error}`);
      throw error;
    }
  }

  refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(this.viewType)) {
      leaf.view.settings = this.settings;
      leaf.view.motionButton?.setText(leaf.view.motionButtonText?.() ?? "Motion");
      leaf.view.needsRender = true;
      leaf.view.wakeTimelineForce?.(2500);
    }
  }

  rebuildViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(this.viewType)) leaf.view.rebuildGraph?.();
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(this.viewType)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: this.viewType, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async saveSettings() { await this.saveData(this.settings); }

  onunload() {
    if (globalThis.__WCT_OBSIDIAN_API__ === obsidianApi) delete globalThis.__WCT_OBSIDIAN_API__;
  }
};