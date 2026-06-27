"use strict";

const { hashString, clamp } = require("./graph-core");

class GraphRendererMethods {
  startLoop() {
    const loop = (time) => {
      this.raf = requestAnimationFrame(loop);
      this.updateAnimations(time);
      if (this.needsRender || this.scene) this.render(time);
    };
    this.raf = requestAnimationFrame(loop);
  }

  updateAnimations(time) {
    if (this.animation) {
      const progress = clamp((time - this.animation.start) / this.animation.duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayPositions.clear();
      for (const node of this.scene.nodes) {
        const start = this.animation.starts.get(node.id) ?? { x: node.x, y: node.y };
        const target = this.animation.targets.get(node.id) ?? { x: node.x, y: node.y };
        this.displayPositions.set(node.id, {
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
        });
      }
      this.animation.edgeAlpha = eased;
      if (progress >= 1) this.animation = null;
      this.needsRender = true;
    } else if (this.scene) {
      for (const node of this.scene.nodes) {
        if (!this.displayPositions.has(node.id)) this.displayPositions.set(node.id, { x: node.x, y: node.y });
      }
    }
    if (this.cameraAnimation) {
      const progress = clamp((time - this.cameraAnimation.start) / this.cameraAnimation.duration, 0, 1);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      this.zoom = this.cameraAnimation.fromZoom + (this.cameraAnimation.toZoom - this.cameraAnimation.fromZoom) * eased;
      this.panX = this.cameraAnimation.fromPanX + (this.cameraAnimation.toPanX - this.cameraAnimation.fromPanX) * eased;
      this.panY = this.cameraAnimation.fromPanY + (this.cameraAnimation.toPanY - this.cameraAnimation.fromPanY) * eased;
      if (progress >= 1) this.cameraAnimation = null;
      this.needsRender = true;
    }
  }

  render(time) {
    if (!this.context || !this.scene) return;
    const ctx = this.context;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = getComputedStyle(this.stage).getPropertyValue("--background-primary") || "#111318";
    ctx.fillRect(0, 0, this.width, this.height);

    const nodeById = new Map(this.scene.nodes.map((node) => [node.id, node]));
    const edgeAlpha = (this.animation?.edgeAlpha ?? 1) * this.settings.edgeOpacity;
    ctx.lineWidth = 1;
    for (const edge of this.scene.edges) {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;
      const sp = this.displayPositions.get(source.id) ?? source;
      const tp = this.displayPositions.get(target.id) ?? target;
      const a = this.worldToScreen(sp.x, sp.y);
      const b = this.worldToScreen(tp.x, tp.y);
      if ((a.x < -20 && b.x < -20) || (a.y < -20 && b.y < -20) || (a.x > this.width + 20 && b.x > this.width + 20) || (a.y > this.height + 20 && b.y > this.height + 20)) continue;
      const highlighted = this.hovered && (edge.source === this.hovered.id || edge.target === this.hovered.id)
        || this.selected && (edge.source === this.selected.id || edge.target === this.selected.id);
      ctx.strokeStyle = highlighted ? `rgba(210,225,255,${Math.min(0.75, edgeAlpha * 5)})` : `rgba(150,170,200,${edgeAlpha})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    const labels = [];
    for (const node of this.scene.nodes) {
      const position = this.displayPositions.get(node.id) ?? node;
      const phase = (hashString(node.id) % 1000) * 0.00628;
      const ambient = node.kind === "note" && !this.animation ? 1.8 * Math.sin(time * 0.0008 + phase) : 0;
      const screen = this.worldToScreen(position.x + ambient, position.y + ambient * 0.45);
      if (screen.x < -40 || screen.y < -40 || screen.x > this.width + 40 || screen.y > this.height + 40) continue;
      const hovered = this.hovered?.id === node.id;
      const selected = this.selected?.id === node.id;
      const pulse = node.kind === "area" ? 1 + 0.08 * Math.sin(time * 0.002 + phase) : 1;
      const radius = Math.max(2.4, node.size * this.settings.nodeScale * pulse * Math.sqrt(this.zoom));
      if (hovered || selected || node.kind === "area") {
        ctx.fillStyle = `${node.color}22`;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius + (hovered ? 9 : 6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (hovered || selected) {
        ctx.strokeStyle = "rgba(245,248,255,.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (node.kind === "area" || node.kind === "area-link" || node.alwaysLabel || hovered || selected) {
        labels.push({ node, screen, priority: (hovered ? 1000000 : 0) + (selected ? 900000 : 0) + node.labelPriority });
      }
    }

    const particleCount = Math.min(this.scene.mode === "full" ? 70 : 110, this.scene.edges.length);
    for (let index = 0; index < particleCount; index += 1) {
      const edge = this.scene.edges[index];
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;
      const sp = this.displayPositions.get(source.id) ?? source;
      const tp = this.displayPositions.get(target.id) ?? target;
      const a = this.worldToScreen(sp.x, sp.y);
      const b = this.worldToScreen(tp.x, tp.y);
      const t = (time * (0.00009 + (index % 7) * 0.000012) + index * 0.137) % 1;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      ctx.fillStyle = "rgba(210,225,255,.42)";
      ctx.beginPath();
      ctx.arc(x, y, 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    this.renderLabels(ctx, labels);
    this.needsRender = false;
  }

  renderLabels(ctx, labels) {
    labels.sort((a, b) => b.priority - a.priority);
    const occupied = [];
    const limit = Math.min(this.settings.labelLimit, labels.length);
    ctx.textBaseline = "top";
    for (const item of labels.slice(0, limit)) {
      const { node, screen } = item;
      const isArea = node.kind === "area" || node.kind === "area-link";
      const fontSize = isArea ? 13 : 11;
      ctx.font = `${isArea ? 650 : 520} ${fontSize}px system-ui, sans-serif`;
      const lines = String(node.label).split("\n").map((line) => line.length > 36 && !isArea ? `${line.slice(0, 35)}…` : line);
      const width = Math.max(...lines.map((line) => ctx.measureText(line).width), 30) + 12;
      const lineHeight = fontSize + 3;
      const height = lines.length * lineHeight + 7;
      const gap = Math.max(10, node.size * Math.sqrt(this.zoom) + 8);
      const candidates = [
        { x: screen.x - width / 2, y: screen.y + gap },
        { x: screen.x - width / 2, y: screen.y - gap - height },
        { x: screen.x + gap, y: screen.y - height / 2 },
        { x: screen.x - gap - width, y: screen.y - height / 2 },
      ];
      let box = null;
      for (const candidate of candidates) {
        const test = { ...candidate, width, height };
        if (test.x < 4 || test.y < 4 || test.x + width > this.width - 4 || test.y + height > this.height - 4) continue;
        if (occupied.some((other) => !(test.x + width + 4 < other.x || other.x + other.width + 4 < test.x || test.y + height + 4 < other.y || other.y + other.height + 4 < test.y))) continue;
        box = test;
        break;
      }
      if (!box) {
        if (!isArea && this.hovered?.id !== node.id && this.selected?.id !== node.id) continue;
        box = { x: clamp(screen.x - width / 2, 4, this.width - width - 4), y: clamp(screen.y + gap, 4, this.height - height - 4), width, height };
      }
      occupied.push(box);
      ctx.fillStyle = isArea ? "rgba(15,18,24,.82)" : "rgba(15,18,24,.68)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(box.x, box.y, box.width, box.height, 4);
      else ctx.rect(box.x, box.y, box.width, box.height);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,.85)";
      ctx.lineWidth = 2.5;
      ctx.fillStyle = "rgba(244,247,252,.98)";
      lines.forEach((line, index) => {
        const x = box.x + box.width / 2;
        const y = box.y + 4 + index * lineHeight;
        ctx.strokeText(line, x, y);
        ctx.fillText(line, x, y);
      });
    }
  }
}

module.exports = GraphRendererMethods.prototype;