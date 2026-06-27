"use strict";

const { Notice, Plugin } = require("obsidian");

const VIEW_TYPE = "wct-graph-view";
const PATCHED = Symbol("wctGraphPointerFixPatched");

function isUiTarget(event) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    ".wct-graph-inspector, .wct-graph-toolbar, .wct-graph-tooltip, .wct-graph-breadcrumbs, button, input, a",
  ));
}

function releasePointerState(view, stage, pointerId) {
  view.dragging = false;
  view.dragMoved = false;
  stage.style.cursor = "grab";
  try {
    if (pointerId != null && stage.hasPointerCapture?.(pointerId)) {
      stage.releasePointerCapture(pointerId);
    }
  } catch (_) {}
}

function patchView(view) {
  const controller = view?.__wctGraphNavigator;
  const stage = view?.stage;
  const renderer = view?.renderer;
  if (!controller || !stage || !renderer || controller[PATCHED]) return;
  controller[PATCHED] = true;

  releasePointerState(view, stage, null);

  if (controller.onPointerDown) stage.removeEventListener("pointerdown", controller.onPointerDown, true);
  if (controller.onPointerUp) stage.removeEventListener("pointerup", controller.onPointerUp, true);
  if (controller.onPointerMove) stage.removeEventListener("pointermove", controller.onPointerMove, true);
  if (controller.onPointerLeave) stage.removeEventListener("pointerleave", controller.onPointerLeave, true);

  let activeNodePointer = null;

  const clearNodePointer = (event) => {
    const pointerId = activeNodePointer?.pointerId ?? event?.pointerId;
    activeNodePointer = null;
    controller.pointerStart = null;
    releasePointerState(view, stage, pointerId);
  };

  const onPointerDown = (event) => {
    if (event.button !== 0 || isUiTarget(event)) return;
    const node = renderer.hitTest(event.clientX, event.clientY, stage.getBoundingClientRect());
    if (!node?.path) {
      activeNodePointer = null;
      controller.pointerStart = null;
      return;
    }

    activeNodePointer = {
      pointerId: event.pointerId,
      nodeId: node.id,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    controller.pointerStart = { x: event.clientX, y: event.clientY };
    releasePointerState(view, stage, event.pointerId);
    stage.style.cursor = "pointer";
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onPointerMove = (event) => {
    if (isUiTarget(event)) return;

    if (activeNodePointer && event.pointerId === activeNodePointer.pointerId) {
      const distance = Math.hypot(
        event.clientX - activeNodePointer.x,
        event.clientY - activeNodePointer.y,
      );
      if (distance > 6) activeNodePointer.moved = true;
      releasePointerState(view, stage, event.pointerId);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (view.dragging) return;
    const node = renderer.hitTest(event.clientX, event.clientY, stage.getBoundingClientRect());
    if (!node?.path) {
      controller.hoverToken += 1;
      view.tooltip?.hide();
      stage.style.cursor = "grab";
      return;
    }

    stage.style.cursor = "pointer";
    const token = ++controller.hoverToken;
    controller.showHover?.(node, event, token);
  };

  const onPointerUp = (event) => {
    if (isUiTarget(event)) return;
    if (!activeNodePointer || event.pointerId !== activeNodePointer.pointerId) return;

    const interaction = activeNodePointer;
    const node = renderer.hitTest(event.clientX, event.clientY, stage.getBoundingClientRect());
    clearNodePointer(event);
    event.preventDefault();
    event.stopImmediatePropagation();

    if (interaction.moved || !node?.path || node.id !== interaction.nodeId) return;
    controller.inspector?.show(node);
  };

  const onPointerCancel = (event) => {
    if (!activeNodePointer || event.pointerId === activeNodePointer.pointerId) clearNodePointer(event);
  };

  const onLostPointerCapture = (event) => {
    if (activeNodePointer && event.pointerId === activeNodePointer.pointerId) clearNodePointer(event);
  };

  const onPointerLeave = () => {
    controller.hoverToken += 1;
    view.tooltip?.hide();
    if (!activeNodePointer) stage.style.cursor = "grab";
  };

  stage.addEventListener("pointerdown", onPointerDown, true);
  stage.addEventListener("pointermove", onPointerMove, true);
  stage.addEventListener("pointerup", onPointerUp, true);
  stage.addEventListener("pointercancel", onPointerCancel, true);
  stage.addEventListener("lostpointercapture", onLostPointerCapture, true);
  stage.addEventListener("pointerleave", onPointerLeave, true);

  controller.__wctPointerFixCleanup = () => {
    stage.removeEventListener("pointerdown", onPointerDown, true);
    stage.removeEventListener("pointermove", onPointerMove, true);
    stage.removeEventListener("pointerup", onPointerUp, true);
    stage.removeEventListener("pointercancel", onPointerCancel, true);
    stage.removeEventListener("lostpointercapture", onLostPointerCapture, true);
    stage.removeEventListener("pointerleave", onPointerLeave, true);
    clearNodePointer();
    controller[PATCHED] = false;
  };
}

module.exports = class WCTGraphPointerFixPlugin extends Plugin {
  onload() {
    const patchAll = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) patchView(leaf.view);
    };

    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(patchAll, 120)));
    this.app.workspace.onLayoutReady(() => setTimeout(patchAll, 500));

    this.addCommand({
      id: "release-stuck-graph-pointer",
      name: "Release stuck graph pointer",
      callback: () => {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
          releasePointerState(leaf.view, leaf.view.stage, null);
          patchView(leaf.view);
        }
        new Notice("WCT Graph pointer state released");
      },
    });
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.__wctGraphNavigator?.__wctPointerFixCleanup?.();
    }
  }
};