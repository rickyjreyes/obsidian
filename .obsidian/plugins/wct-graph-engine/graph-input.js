"use strict";

const { clamp } = require("./graph-core");

class GraphInputMethods {
  resize() {
    const rect = this.stage.getBoundingClientRect();
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.pixelRatio = ratio;
    this.canvas.width = Math.floor(this.width * ratio);
    this.canvas.height = Math.floor(this.height * ratio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.needsRender = true;
  }

  fitScene(animated = false) {
    if (!this.scene?.nodes?.length || !this.width || !this.height) return;
    const xs = this.scene.nodes.map((node) => node.x);
    const ys = this.scene.nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(200, maxX - minX + 260);
    const spanY = Math.max(200, maxY - minY + 220);
    const targetZoom = clamp(Math.min(this.width / spanX, this.height / spanY), 0.08, 2.3);
    const targetPanX = -(minX + maxX) / 2;
    const targetPanY = -(minY + maxY) / 2;
    if (!animated) {
      this.zoom = targetZoom;
      this.panX = targetPanX;
      this.panY = targetPanY;
    } else {
      this.cameraAnimation = {
        start: performance.now(),
        duration: 520,
        fromZoom: this.zoom,
        toZoom: targetZoom,
        fromPanX: this.panX,
        toPanX: targetPanX,
        fromPanY: this.panY,
        toPanY: targetPanY,
      };
    }
    this.needsRender = true;
  }

  worldToScreen(x, y) {
    return {
      x: this.width / 2 + (x + this.panX) * this.zoom,
      y: this.height / 2 + (y + this.panY) * this.zoom,
    };
  }

  screenToWorld(x, y) {
    return {
      x: (x - this.width / 2) / this.zoom - this.panX,
      y: (y - this.height / 2) / this.zoom - this.panY,
    };
  }

  hitTest(clientX, clientY) {
    if (!this.scene) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestDistance = Infinity;
    for (const node of this.scene.nodes) {
      const position = this.displayPositions.get(node.id) ?? { x: node.x, y: node.y };
      const screen = this.worldToScreen(position.x, position.y);
      const radius = Math.max(8, node.size * this.settings.nodeScale * this.zoom + 5);
      const distance = Math.hypot(x - screen.x, y - screen.y);
      if (distance <= radius && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  }

  onPointerDown(event) {
    if (event.button !== 0) return;
    const node = this.hitTest(event.clientX, event.clientY);
    if (node) {
      this.pendingNode = {
        pointerId: event.pointerId,
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      this.canvas.style.cursor = "pointer";
      return;
    }
    this.drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: this.panX,
      panY: this.panY,
    };
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.style.cursor = "grabbing";
  }

  onPointerMove(event) {
    if (this.pendingNode && event.pointerId === this.pendingNode.pointerId) {
      const distance = Math.hypot(event.clientX - this.pendingNode.x, event.clientY - this.pendingNode.y);
      if (distance > 6) {
        this.pendingNode.moved = true;
        this.drag = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          panX: this.panX,
          panY: this.panY,
        };
        this.pendingNode = null;
        this.canvas.setPointerCapture(event.pointerId);
        this.canvas.style.cursor = "grabbing";
      }
      return;
    }
    if (this.drag && event.pointerId === this.drag.pointerId) {
      this.panX = this.drag.panX + (event.clientX - this.drag.x) / this.zoom;
      this.panY = this.drag.panY + (event.clientY - this.drag.y) / this.zoom;
      this.needsRender = true;
      return;
    }
    const node = this.hitTest(event.clientX, event.clientY);
    if (node?.id !== this.hovered?.id) {
      this.hovered = node;
      if (node) this.showTooltip(node, event);
      else this.hideTooltip();
      this.needsRender = true;
    } else if (node) {
      this.positionTooltip(event);
    }
    this.canvas.style.cursor = node ? "pointer" : "grab";
  }

  onPointerUp(event) {
    if (this.pendingNode && event.pointerId === this.pendingNode.pointerId) {
      const pending = this.pendingNode;
      this.pendingNode = null;
      const node = this.hitTest(event.clientX, event.clientY);
      if (!pending.moved && node?.id === pending.nodeId) this.activateNode(node);
    }
    if (this.drag && event.pointerId === this.drag.pointerId) {
      this.drag = null;
      try {
        if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
      } catch (_) {}
    }
    this.canvas.style.cursor = this.hovered ? "pointer" : "grab";
  }

  resetPointer(event) {
    this.pendingNode = null;
    this.drag = null;
    try {
      if (event?.pointerId != null && this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    } catch (_) {}
    this.canvas.style.cursor = "grab";
  }

  activateNode(node) {
    if (node.kind === "area" || node.kind === "area-link") {
      this.pushCategory(node.type, node);
      return;
    }
    if (node.kind === "note") this.showInspector(node);
  }

  onWheel(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const before = this.screenToWorld(sx, sy);
    const factor = Math.exp(-event.deltaY * 0.0012);
    this.zoom = clamp(this.zoom * factor, 0.05, 4.5);
    const after = this.screenToWorld(sx, sy);
    this.panX += after.x - before.x;
    this.panY += after.y - before.y;
    this.needsRender = true;
  }
}

module.exports = GraphInputMethods.prototype;