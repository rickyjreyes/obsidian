"use strict";

const { Plugin, Notice } = require("obsidian");

const VIEW_TYPE = "wct-graph-view";
const PATCHED = Symbol("wctGraphMotionPatched");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;

function rgba(color, alpha = 1) {
  const values = Array.isArray(color) ? color : [0.55, 0.68, 0.84, 1];
  return `rgba(${Math.round(values[0] * 255)}, ${Math.round(values[1] * 255)}, ${Math.round(values[2] * 255)}, ${clamp(alpha, 0, 1)})`;
}

function averagePoint(nodes) {
  if (!nodes.length) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const node of nodes) {
    x += Number(node.x) || 0;
    y += Number(node.y) || 0;
  }
  return { x: x / nodes.length, y: y / nodes.length };
}

class MotionController {
  constructor(view) {
    this.view = view;
    this.renderer = view.renderer;
    this.stage = view.stage;
    this.toolbar = view.toolbar;
    this.enabled = !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    this.transitionId = 0;
    this.transitioning = false;
    this.hoveredNode = null;
    this.destroyed = false;
    this.lastAmbientFrame = 0;
    this.originalSetScene = view.setScene.bind(view);
    this.originalOnClose = view.onClose.bind(view);

    this.installCanvas();
    this.installToggle();
    this.installEvents();
    this.patchView();
    this.resize();
    this.startAmbientLoop();

    if (this.renderer.scene?.nodes?.length && this.enabled) {
      const scene = this.renderer.scene;
      requestAnimationFrame(() => this.transitionTo(scene, { intro: true, duration: 720 }));
    }
  }

  installCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "wct-graph-motion-canvas";
    this.stage.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");
    this.stage.dataset.motionEnabled = String(this.enabled);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
  }

  installToggle() {
    this.toggleButton = document.createElement("button");
    this.toggleButton.className = "wct-graph-motion-toggle";
    this.toggleButton.addEventListener("click", () => {
      this.enabled = !this.enabled;
      this.stage.dataset.motionEnabled = String(this.enabled);
      this.toggleButton.textContent = this.enabled ? "Motion: On" : "Motion: Off";
      if (!this.enabled) {
        this.transitionId += 1;
        this.transitioning = false;
        this.clearOverlay();
        const scene = this.renderer.scene;
        if (scene?.nodes?.length) this.originalSetScene(scene);
      } else {
        const scene = this.renderer.scene;
        if (scene?.nodes?.length) this.transitionTo(scene, { intro: true, duration: 560 });
      }
    });
    this.toggleButton.textContent = this.enabled ? "Motion: On" : "Motion: Off";
    const fitButton = this.view.fitButton;
    if (fitButton?.parentElement === this.toolbar) this.toolbar.insertBefore(this.toggleButton, fitButton);
    else this.toolbar.appendChild(this.toggleButton);
  }

  installEvents() {
    this.pointerMove = (event) => {
      if (!this.enabled || this.transitioning) return;
      this.hoveredNode = this.renderer.hitTest(
        event.clientX,
        event.clientY,
        this.stage.getBoundingClientRect(),
      );
    };
    this.pointerLeave = () => {
      this.hoveredNode = null;
    };
    this.stage.addEventListener("pointermove", this.pointerMove, { capture: true });
    this.stage.addEventListener("pointerleave", this.pointerLeave, { capture: true });
  }

  patchView() {
    this.view.setScene = (scene) => {
      if (!this.enabled) {
        this.originalSetScene(scene);
        return;
      }
      this.transitionTo(scene, { duration: 620 });
    };

    this.view.onClose = async () => {
      this.destroy();
      return this.originalOnClose();
    };
  }

  resize() {
    const rect = this.stage.getBoundingClientRect();
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.width = rect.width;
    this.height = rect.height;
    this.ratio = ratio;
  }

  transitionTo(scene, options = {}) {
    if (!scene?.nodes?.length || this.destroyed) {
      this.originalSetScene(scene);
      return;
    }

    const duration = options.duration ?? 620;
    const intro = options.intro === true;
    const previousScene = this.renderer.scene?.nodes?.length ? this.renderer.scene : null;
    const previousById = new Map((previousScene?.nodes ?? []).map((node) => [node.id, node]));
    const targetById = new Map(scene.nodes.map((node) => [node.id, node]));
    const sharedNodes = scene.nodes.filter((node) => previousById.has(node.id));
    const sharedCenter = averagePoint(sharedNodes.map((node) => previousById.get(node.id)));
    const groupAnchor = previousScene?.nodes?.find((node) =>
      node.id === `group:${scene.group}` || node.group === scene.group && node.kind === "group",
    );
    const fallback = groupAnchor
      ? { x: groupAnchor.x, y: groupAnchor.y }
      : sharedNodes.length
        ? sharedCenter
        : { x: 0, y: 0 };

    this.originalSetScene(scene);
    const targetZoom = this.renderer.zoom;
    const targetPanX = this.renderer.panX;
    const targetPanY = this.renderer.panY;

    const startNodes = new Map();
    for (const target of scene.nodes) {
      const previous = previousById.get(target.id);
      if (previous && !intro) {
        startNodes.set(target.id, {
          x: previous.x,
          y: previous.y,
          size: previous.size,
          color: previous.color,
          alpha: 1,
        });
      } else {
        const scale = intro ? 0.15 : 1;
        startNodes.set(target.id, {
          x: fallback.x + (target.x - fallback.x) * scale,
          y: fallback.y + (target.y - fallback.y) * scale,
          size: Math.max(1.5, target.size * 0.22),
          color: target.color,
          alpha: 0,
        });
      }
    }

    this.renderer.zoom = targetZoom;
    this.renderer.panX = targetPanX;
    this.renderer.panY = targetPanY;
    this.transitionId += 1;
    const id = this.transitionId;
    this.transitioning = true;
    const started = performance.now();

    const step = (now) => {
      if (this.destroyed || id !== this.transitionId) return;
      const raw = clamp((now - started) / duration, 0, 1);
      const positionProgress = easeOutCubic(raw);
      const revealProgress = easeInOutCubic(raw);
      const animatedNodes = scene.nodes.map((target) => {
        const start = startNodes.get(target.id);
        const color = target.color ?? [0.55, 0.68, 0.84, 1];
        const startColor = start.color ?? color;
        return {
          ...target,
          x: start.x + (target.x - start.x) * positionProgress,
          y: start.y + (target.y - start.y) * positionProgress,
          size: start.size + (target.size - start.size) * positionProgress,
          color: [
            startColor[0] + (color[0] - startColor[0]) * positionProgress,
            startColor[1] + (color[1] - startColor[1]) * positionProgress,
            startColor[2] + (color[2] - startColor[2]) * positionProgress,
            (start.alpha + (1 - start.alpha) * revealProgress) * (color[3] ?? 1),
          ],
        };
      });

      const animatedScene = { ...scene, nodes: animatedNodes };
      this.uploadScene(animatedScene, revealProgress);
      this.renderer.scene = animatedScene;
      this.renderer.requestRender();

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        this.transitioning = false;
        this.renderer.scene = scene;
        this.renderer.zoom = targetZoom;
        this.renderer.panX = targetPanX;
        this.renderer.panY = targetPanY;
        this.originalSetScene(scene);
      }
    };

    requestAnimationFrame(step);
  }

  uploadScene(scene, revealProgress) {
    const renderer = this.renderer;
    const gl = renderer.gl;
    const nodeById = new Map(scene.nodes.map((node) => [node.id, node]));
    const nodeData = [];
    for (const node of scene.nodes) {
      nodeData.push(node.x, node.y, node.size, ...(node.color ?? [0.55, 0.68, 0.84, 1]));
    }

    const edgeData = [];
    const visibleEdgeCount = Math.floor(scene.edges.length * clamp(revealProgress * 1.15, 0, 1));
    for (let index = 0; index < visibleEdgeCount; index += 1) {
      const edge = scene.edges[index];
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;
      edgeData.push(source.x, source.y, target.x, target.y);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.nodeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nodeData), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.edgeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeData), gl.DYNAMIC_DRAW);
    renderer.nodeCount = nodeData.length / 7;
    renderer.edgeVertexCount = edgeData.length / 2;
  }

  startAmbientLoop() {
    const loop = (timestamp) => {
      if (this.destroyed) return;
      this.ambientRaf = requestAnimationFrame(loop);
      if (!this.enabled || this.transitioning) return;
      if (timestamp - this.lastAmbientFrame < 33) return;
      this.lastAmbientFrame = timestamp;
      this.drawAmbient(timestamp);
    };
    this.ambientRaf = requestAnimationFrame(loop);
  }

  drawAmbient(timestamp) {
    const context = this.context;
    const renderer = this.renderer;
    const scene = renderer.scene;
    if (!context || !scene?.nodes?.length || !this.width || !this.height) return;

    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    context.globalCompositeOperation = "lighter";
    const nodeById = new Map(scene.nodes.map((node) => [node.id, node]));

    const pulsingNodes = scene.nodes
      .filter((node) => node.kind === "group" || node.kind === "group-link" || node.alwaysLabel)
      .slice(0, 24);
    for (let index = 0; index < pulsingNodes.length; index += 1) {
      const node = pulsingNodes[index];
      const screen = renderer.worldToScreen(node.x, node.y);
      const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.0018 + index * 0.73);
      const radius = Math.max(8, node.size * renderer.settings.nodeScale * 0.62) + 5 + pulse * 7;
      const gradient = context.createRadialGradient(screen.x, screen.y, radius * 0.15, screen.x, screen.y, radius);
      gradient.addColorStop(0, rgba(node.color, 0.16 + pulse * 0.06));
      gradient.addColorStop(1, rgba(node.color, 0));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const edgeBudget = Math.min(scene.mode === "overview" ? 36 : 72, scene.edges.length);
    for (let index = 0; index < edgeBudget; index += 1) {
      const edge = scene.edges[index];
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;
      const sourceScreen = renderer.worldToScreen(source.x, source.y);
      const targetScreen = renderer.worldToScreen(target.x, target.y);
      const phase = (timestamp * (0.00016 + (index % 5) * 0.000018) + index * 0.137) % 1;
      const x = sourceScreen.x + (targetScreen.x - sourceScreen.x) * phase;
      const y = sourceScreen.y + (targetScreen.y - sourceScreen.y) * phase;
      const radius = scene.mode === "overview" ? 2.3 : 1.7;
      context.fillStyle = rgba(source.color, scene.mode === "overview" ? 0.7 : 0.46);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    if (this.hoveredNode) {
      const node = nodeById.get(this.hoveredNode.id) ?? this.hoveredNode;
      const screen = renderer.worldToScreen(node.x, node.y);
      const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.006);
      context.strokeStyle = rgba(node.color, 0.78);
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(screen.x, screen.y, Math.max(12, node.size * 0.8) + pulse * 4, 0, Math.PI * 2);
      context.stroke();
    }

    context.globalCompositeOperation = "source-over";
  }

  clearOverlay() {
    if (!this.context || !this.width || !this.height) return;
    this.context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    this.context.clearRect(0, 0, this.width, this.height);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.transitionId += 1;
    cancelAnimationFrame(this.ambientRaf);
    this.resizeObserver?.disconnect();
    this.stage.removeEventListener("pointermove", this.pointerMove, { capture: true });
    this.stage.removeEventListener("pointerleave", this.pointerLeave, { capture: true });
    this.toggleButton?.remove();
    this.canvas?.remove();
    this.view[PATCHED] = false;
  }
}

function patchView(view) {
  if (!view || view[PATCHED] || !view.renderer || !view.stage || !view.toolbar) return;
  view[PATCHED] = true;
  view.__wctMotionController = new MotionController(view);
}

module.exports = class WCTGraphMotionPlugin extends Plugin {
  onload() {
    const patchAll = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) patchView(leaf.view);
    };

    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(patchAll, 100)));
    this.app.workspace.onLayoutReady(() => setTimeout(patchAll, 240));
    this.addCommand({
      id: "toggle-wct-graph-motion",
      name: "Toggle WCT Graph motion",
      callback: () => {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (!leaves.length) {
          new Notice("Open WCT Graph first");
          return;
        }
        for (const leaf of leaves) {
          patchView(leaf.view);
          leaf.view.__wctMotionController?.toggleButton?.click();
        }
      },
    });
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.__wctMotionController?.destroy();
    }
  }
};