"use strict";

const path = require("path");
const { Plugin, PluginSettingTab, Setting, FileSystemAdapter, Notice } = require("obsidian");

function resolvePluginFile(plugin, filename) {
  const adapter = plugin.app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter) || typeof adapter.getBasePath !== "function") {
    throw new Error("WCT Graph Engine requires Obsidian desktop filesystem access.");
  }
  const basePath = adapter.getBasePath();
  const pluginDir = plugin.manifest.dir
    ?? `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
  return path.join(basePath, pluginDir, filename);
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
  }
}

module.exports = class WCTGraphPlugin extends Plugin {
  async onload() {
    try {
      const corePath = resolvePluginFile(this, "graph-core.js");
      const viewPath = resolvePluginFile(this, "graph-view.js");

      delete require.cache[require.resolve(corePath)];
      delete require.cache[require.resolve(viewPath)];

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
      }
    } catch (error) {
      console.error("WCT Graph Engine failed to load", error);
      new Notice(`WCT Graph Engine failed to load: ${error?.message ?? error}`);
      throw error;
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
};