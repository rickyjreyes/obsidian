"use strict";
const { Plugin } = require("obsidian");
const TYPE = "wct-graph-view";
function apply(view) {
  const root = view && view.__wctGraphNavigator && view.__wctGraphNavigator.inspector && view.__wctGraphNavigator.inspector.root;
  if (!root || root.dataset.graphPanelSafe === "1") return;
  root.dataset.graphPanelSafe = "1";
  const guard = (event) => {
    view.dragging = false;
    view.dragMoved = false;
    event.cancelBubble = true;
  };
  root.onpointerdown = guard;
  root.onpointermove = guard;
  root.onpointerup = guard;
  root.onpointercancel = guard;
  root.onwheel = (event) => { event.cancelBubble = true; };
}
module.exports = class extends Plugin {
  onload() {
    const run = () => this.app.workspace.getLeavesOfType(TYPE).forEach((leaf) => apply(leaf.view));
    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(run, 150)));
    this.app.workspace.onLayoutReady(() => setTimeout(run, 650));
  }
};