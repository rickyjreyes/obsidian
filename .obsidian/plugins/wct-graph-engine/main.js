"use strict";

const path = require("path");
const obsidianApi = require("obsidian");
const { Plugin, PluginSettingTab, Setting, Notice } = obsidianApi;

globalThis.__WCT_OBSIDIAN_API__ = obsidianApi;

function resolvePluginFile(plugin, filename) {
  const adapter = plugin.app.vault.adapter;
  const pluginDir = plugin.manifest.dir
    ?? `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
  const relativePath = `${pluginDir}/${filename}`.replace(/\\/g, "/");

  if (typeof adapter.getFullPath === "function") {
    return adapter.getFullPath(relativePath);
  }

  if (typeof adapter.getBasePath === "function") {
    return path.join(adapter.getBasePath(), ...relativePath.split("/"));
  }

  throw new Error("WCT Graph Engine could not resolve its plugin directory.");
}

class WCTGraphSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const { clamp } = this.plugin.graphCore;
    containerEl.empty();
    containerEl.createEl("h2", { text: "WCT Graph" });

    new Setting(containerEl)
      .setName("Include folders")
      .setDesc("Comma-separated vault folders to index.")
      .addText((text) => text
        .setValue(this.plugin.settings.includeFolders.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.includeFolders = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Hide orphan notes")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.hideOrphans)
        .onChange(async (value) => {
          this.plugin.settings.hideOrphans = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Full graph edge budget")
      .setDesc("Limits rendered edges while retaining every indexed node.")
      .addText((text) => text
        .setValue(String(this.plugin.settings.fullEdgeBudget))
        .onChange(async (value) => {
          this.plugin.settings.fullEdgeBudget = clamp(Number(value) || 1700, 200, 5000);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Motion")
      .setDesc("Full keeps ambient movement and particles, Reduced lowers animation cost, and Off renders only when needed.")
      .addDropdown((dropdown) => dropdown
        .addOption("full", "Full")
        .addOption("reduced", "Reduced")
        .addOption("off", "Off")
        .setValue(this.plugin.settings.motionMode ?? "full")
        .onChange(async (value) => {
          this.plugin.settings.motionMode = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    new Setting(containerEl)
      .setName("Validation status rings")
      .setDesc("Draw the overall SymPy, Lean, physical, and experimental state around each note.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showStatusRings !== false)
        .onChange(async (value) => {
          this.plugin.settings.showStatusRings = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    new Setting(containerEl)
      .setName("Typed relation arrows")
      .setDesc("Show direction for defines, derives, predicts, tests, implements, supports, and related research links.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showRelationArrows !== false)
        .onChange(async (value) => {
          this.plugin.settings.showRelationArrows = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));
  }
}

module.exports = class WCTGraphPlugin extends Plugin {
  async onload() {
    try {
      globalThis.__WCT_OBSIDIAN_API__ = obsidianApi;

      const moduleNames = [
        "graph-research.js",
        "graph-core.js",
        "graph-renderer.js",
        "graph-input.js",
        "graph-inspector.js",
        "graph-interaction.js",
        "graph-view.js",
      ];
      const modulePaths = moduleNames.map((name) => resolvePluginFile(this, name));
      for (const modulePath of modulePaths) {
        try {
          delete require.cache[require.resolve(modulePath)];
        } catch (_) {}
      }

      const corePath = resolvePluginFile(this, "graph-core.js");
      const viewPath = resolvePluginFile(this, "graph-view.js");
      this.graphCore = require(corePath);
      const { WCTGraphView } = require(viewPath);
      const {
        VIEW_TYPE,
        DEFAULT_SETTINGS,
        debounce,
      } = this.graphCore;

      this.viewType = VIEW_TYPE;
      this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

      this.registerView(VIEW_TYPE, (leaf) => new WCTGraphView(leaf, this));
      this.addCommand({
        id: "open-wct-graph",
        name: "Open WCT Graph",
        callback: () => this.activateView(),
      });
      this.addCommand({
        id: "open-wct-research-audit",
        name: "Open WCT Research Audit",
        callback: async () => {
          await this.activateView();
          this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view?.showAudit?.();
        },
      });
      this.addSettingTab(new WCTGraphSettingTab(this.app, this));

      if (this.settings.autoRebuild) {
        const rebuild = debounce(() => {
          for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
            leaf.view.rebuildGraph?.();
          }
        }, 700);
        this.registerEvent(this.app.metadataCache.on("resolved", rebuild));
        this.registerEvent(this.app.vault.on("create", rebuild));
        this.registerEvent(this.app.vault.on("delete", rebuild));
        this.registerEvent(this.app.vault.on("rename", rebuild));
        this.registerEvent(this.app.vault.on("modify", rebuild));
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
    }
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(this.viewType)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: this.viewType, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    if (globalThis.__WCT_OBSIDIAN_API__ === obsidianApi) {
      delete globalThis.__WCT_OBSIDIAN_API__;
    }
  }
};