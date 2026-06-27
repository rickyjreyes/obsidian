"use strict";

const { MarkdownRenderer, Plugin } = require("obsidian");

const VIEW_TYPE = "wct-graph-view";
const GLOSSARY_INDEX = "Research/03 Glossary/WCT Glossary.md";
const CONCEPT_PREFIX = "Research/02 Concepts/";
const PATCHED = Symbol("wctGraphContentDetailsPatched");

const isConcept = (path) => String(path ?? "").startsWith(CONCEPT_PREFIX);

function cleanDefinition(value) {
  return String(value ?? "")
    .replace(/Description(?=[A-Z])/g, "")
    .replace(/Keywords.+$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,;:]$/, ".");
}

function explicitDefinition(content) {
  const match = String(content ?? "").match(/^## Definition\s*$([\s\S]*?)(?=^##\s|\Z)/im);
  if (!match) return "";
  const definition = match[1].trim();
  if (!definition) return "";
  if (/add a concise definition|definition pending|no summary/i.test(definition)) return "";
  return definition;
}

class DefinitionStore {
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
        title: match[2] || match[1],
        definition: cleanDefinition(match[3]),
      });
    }
    this.loaded = true;
  }

  get(path) {
    return this.byPath.get(path) ?? null;
  }
}

function filterScene(scene) {
  if (!scene?.nodes?.length) return scene;
  const nodes = scene.nodes.filter((node) => node.path !== GLOSSARY_INDEX);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = (scene.edges ?? []).filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  return { ...scene, nodes, edges };
}

async function patchInspector(plugin, controller) {
  const inspector = controller?.inspector;
  if (!inspector || inspector.__wctCanonicalDefinitions) return;
  inspector.__wctCanonicalDefinitions = true;
  const originalShow = inspector.show.bind(inspector);

  inspector.show = async (node) => {
    await originalShow(node);
    if (!isConcept(node?.path)) return;

    const file = inspector.view.app.vault.getAbstractFileByPath(node.path);
    const content = file ? await inspector.view.app.vault.cachedRead(file) : "";
    if (explicitDefinition(content)) return;

    await plugin.store.load();
    const entry = plugin.store.get(node.path);
    if (!entry?.definition) return;

    const section = inspector.body.querySelector(".wct-graph-inspector-section");
    const title = section?.querySelector("h3");
    const target = section?.querySelector(".wct-graph-inspector-markdown");
    if (!target) return;

    if (title) title.textContent = "Definition";
    target.empty();
    await MarkdownRenderer.render(
      inspector.view.app,
      entry.definition,
      target,
      node.path,
      plugin,
    );
  };
}

function patchView(plugin, view) {
  const controller = view?.__wctGraphNavigator;
  if (!controller || controller[PATCHED]) return;
  controller[PATCHED] = true;

  const originalApply = controller.applyScene.bind(controller);
  controller.applyScene = (scene, label, options = {}) => originalApply(filterScene(scene), label, options);
  patchInspector(plugin, controller);
  controller.root(true);
}

module.exports = class WCTGraphContentDetailsPlugin extends Plugin {
  async onload() {
    this.store = new DefinitionStore(this.app);
    await this.store.load();

    const patchAll = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) patchView(this, leaf.view);
    };

    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(patchAll, 180)));
    this.registerEvent(this.app.metadataCache.on("resolved", () => {
      this.store.load(true);
      setTimeout(patchAll, 220);
    }));
    this.app.workspace.onLayoutReady(() => setTimeout(patchAll, 460));
  }
};