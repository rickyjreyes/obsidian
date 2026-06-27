"use strict";

const {
  hashString,
  clamp,
  RELATION_COLORS,
  STATUS_COLORS,
} = require("./graph-core");

function rgba(hex, alpha) {
  const value = String(hex ?? "#7f8da3").replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((character) => `${character}${character}`).join("")
    : value.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}

function shortDate(timestamp) {
  if (!Number.isFinite(timestamp)) return "—";
  return new Date(timestamp).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

class GraphRendererMethods {
  startLoop() {
    const loop = (time) => {
      this.raf = requestAnimationFrame(loop);
      this.tickTimeline?.(time);
      const forceActive = this.stepTimelineForce?.(time) ?? false;
      this.updateAnimations(time);
      const activeMotion = this.settings.motionMode !== "off" && !document.hidden;
      if (this.needsRender || this.animation || this.cameraAnimation || activeMotion || forceActive || this.timelinePlaying) {
        this.render(time);
      }
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

  drawArrow(ctx, a, b, targetRadius, color) {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const x = b.x - Math.cos(angle) * (targetRadius + 4);
    const y = b.y - Math.sin(angle) * (targetRadius + 4);
    const size = 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(angle - Math.PI / 6) * size, y - Math.sin(angle - Math.PI / 6) * size);
    ctx.lineTo(x - Math.cos(angle + Math.PI / 6) * size, y - Math.sin(angle + Math.PI / 6) * size);
    ctx.closePath();
    ctx.fill();
  }

  drawTimelineAxis(ctx) {
    if (this.scene?.mode !== "timeline") return;
    const y = this.height - 28;
    const left = this.worldToScreen(-980, 0).x;
    const right = this.worldToScreen(980, 0).x;
    const minX = clamp(Math.min(left, right), 18, this.width - 18);
    const maxX = clamp(Math.max(left, right), 18, this.width - 18);
    const progress = clamp((this.scene.cutoff - this.scene.minDate) / Math.max(1, this.scene.maxDate - this.scene.minDate), 0, 1);
    const markerX = minX + (maxX - minX) * progress;

    ctx.strokeStyle = "rgba(170,185,210,.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(235,242,255,.55)";
    ctx.beginPath();
    ctx.moveTo(markerX, 12);
    ctx.lineTo(markerX, y + 4);
    ctx.stroke();

    ctx.fillStyle = "rgba(225,232,244,.75)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(shortDate(this.scene.minDate), minX, y + 5);
    ctx.textAlign = "center";
    ctx.fillText(shortDate((this.scene.minDate + this.scene.maxDate) / 2), (minX + maxX) / 2, y + 5);
    ctx.textAlign = "right";
    ctx.fillText(shortDate(this.scene.maxDate), maxX, y + 5);
  }

  render(time) {
    if (!this.context || !this.scene) return;
    const ctx = this.context;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = getComputedStyle(this.stage).getPropertyValue("--background-primary") || "#111318";
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawTimelineAxis(ctx);

    const nodeById = new Map(this.scene.nodes.map((node) => [node.id, node]));
    const edgeAlpha = (this.animation?.edgeAlpha ?? 1) * this.settings.edgeOpacity;
    ctx.lineWidth = 1;
    const relationLabels = [];

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
      const relationColor = RELATION_COLORS[edge.relation] ?? RELATION_COLORS.links;
      const alpha = highlighted ? Math.min(0.9, edgeAlpha * 6) : edge.relation === "links" ? edgeAlpha : Math.min(0.52, edgeAlpha * 2.7);
      const color = rgba(relationColor, alpha);
      ctx.strokeStyle = color;
      ctx.lineWidth = edge.relation === "links" ? 1 : 1.35;
      if (edge.relation !== "links") ctx.setLineDash([5, 3]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (edge.directed && this.settings.showRelationArrows !== false) {
        const targetRadius = Math.max(3, target.size * this.settings.nodeScale * Math.sqrt(this.zoom));
        this.drawArrow(ctx, a, b, targetRadius, color);
      }

      if (highlighted && edge.relation !== "links") {
        relationLabels.push({
          text: edge.relation.replace(/-/g, " ").toUpperCase(),
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          color: relationColor,
        });
      }
    }

    const labels = [];
    for (const node of this.scene.nodes) {
      const position = this.displayPositions.get(node.id) ?? node;
      const phase = (hashString(node.id) % 1000) * 0.00628;
      const motionScale = this.settings.motionMode === "full" ? 1 : this.settings.motionMode === "reduced" ? 0.3 : 0;
      const ambient = this.scene.mode !== "timeline" && node.kind === "note" && !this.animation
        ? 1.8 * motionScale * Math.sin(time * 0.0008 + phase)
        : 0;
      const screen = this.worldToScreen(position.x + ambient, position.y + ambient * 0.45);
      if (screen.x < -40 || screen.y < -40 || screen.x > this.width + 40 || screen.y > this.height + 40) continue;
      const hovered = this.hovered?.id === node.id;
      const selected = this.selected?.id === node.id;
      const isHub = ["area", "audit-area"].includes(node.kind);
      const pulse = isHub && motionScale > 0 ? 1 + 0.08 * motionScale * Math.sin(time * 0.002 + phase) : 1;
      const radius = Math.max(2.4, node.size * this.settings.nodeScale * pulse * Math.sqrt(this.zoom));

      if (hovered || selected || isHub) {
        ctx.fillStyle = `${node.color}22`;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius + (hovered ? 9 : 6), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (this.settings.showStatusRings !== false && node.kind === "note") {
        const statusColor = STATUS_COLORS[node.overallStatus] ?? STATUS_COLORS.unreviewed;
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = node.auditIssues?.length ? 2.5 : 1.6;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius + 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (hovered || selected) {
        ctx.strokeStyle = "rgba(245,248,255,.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (["area", "area-link", "audit-area"].includes(node.kind) || node.alwaysLabel || hovered || selected) {
        labels.push({ node, screen, priority: (hovered ? 1000000 : 0) + (selected ? 900000 : 0) + node.labelPriority });
      }
    }

    let particleCount = 0;
    if (this.settings.motionMode === "full") particleCount = Math.min(this.scene.mode === "full" ? 70 : this.scene.mode === "timeline" ? 45 : 110, this.scene.edges.length);
    else if (this.settings.motionMode === "reduced") particleCount = Math.min(this.scene.mode === "full" ? 18 : this.scene.mode === "timeline" ? 12 : 32, this.scene.edges.length);

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
      ctx.fillStyle = rgba(RELATION_COLORS[edge.relation] ?? RELATION_COLORS.links, 0.5);
      ctx.beginPath();
      ctx.arc(x, y, 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const label of relationLabels) {
      ctx.font = "650 9px system-ui, sans-serif";
      const width = ctx.measureText(label.text).width + 8;
      ctx.fillStyle = "rgba(12,15,20,.88)";
      ctx.fillRect(label.x - width / 2, label.y - 8, width, 15);
      ctx.fillStyle = label.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label.text, label.x, label.y - 0.5);
    }

    this.renderLabels(ctx, labels);
    this.needsRender = false;
  }

  renderLabels(ctx, labels) {
    this.labelHitBoxes = [];
    labels.sort((a, b) => b.priority - a.priority);
    const occupied = [];
    const limit = Math.min(this.settings.labelLimit, labels.length);
    ctx.textBaseline = "top";
    for (const item of labels.slice(0, limit)) {
      const { node, screen } = item;
      const isArea = ["area", "area-link", "audit-area"].includes(node.kind);
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
      this.labelHitBoxes.push({ node, x: box.x, y: box.y, width: box.width, height: box.height });
      ctx.fillStyle = isArea ? "rgba(15,18,24,.84)" : "rgba(15,18,24,.68)";
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