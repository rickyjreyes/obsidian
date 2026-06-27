"use strict";

const base = require("./graph-renderer-v07");
const { hashString, clamp, RELATION_COLORS, STATUS_COLORS } = require("./graph-core");

function rgba(hex, alpha) {
  const value = String(hex ?? "#7f8da3").replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((character) => `${character}${character}`).join("")
    : value.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}

function polygon(ctx, x, y, radius, sides, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index / sides) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (!index) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function star(ctx, x, y, radius, points = 5) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI / 2 + (index / (points * 2)) * Math.PI * 2;
    const local = index % 2 ? radius * 0.46 : radius;
    const px = x + Math.cos(angle) * local;
    const py = y + Math.sin(angle) * local;
    if (!index) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function drawShape(ctx, shape, x, y, radius) {
  const r = Math.max(2, radius);
  switch (shape) {
    case "hexagon": polygon(ctx, x, y, r, 6); break;
    case "octagon": polygon(ctx, x, y, r, 8, Math.PI / 8); break;
    case "diamond": polygon(ctx, x, y, r, 4, 0); break;
    case "triangle": polygon(ctx, x, y + r * 0.12, r * 1.08, 3); break;
    case "square": roundedRect(ctx, x - r * 0.78, y - r * 0.78, r * 1.56, r * 1.56, Math.max(2, r * 0.16)); break;
    case "rounded-square": roundedRect(ctx, x - r * 0.84, y - r * 0.84, r * 1.68, r * 1.68, r * 0.38); break;
    case "document": {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.68, y - r * 0.88);
      ctx.lineTo(x + r * 0.28, y - r * 0.88);
      ctx.lineTo(x + r * 0.68, y - r * 0.48);
      ctx.lineTo(x + r * 0.68, y + r * 0.88);
      ctx.lineTo(x - r * 0.68, y + r * 0.88);
      ctx.closePath();
      break;
    }
    case "folder": {
      ctx.beginPath();
      ctx.moveTo(x - r, y - r * 0.5);
      ctx.lineTo(x - r * 0.28, y - r * 0.5);
      ctx.lineTo(x, y - r * 0.82);
      ctx.lineTo(x + r, y - r * 0.82);
      ctx.lineTo(x + r, y + r * 0.75);
      ctx.lineTo(x - r, y + r * 0.75);
      ctx.closePath();
      break;
    }
    case "pill": roundedRect(ctx, x - r, y - r * 0.56, r * 2, r * 1.12, r * 0.56); break;
    case "star": star(ctx, x, y, r, 5); break;
    case "cross": {
      const w = r * 0.42;
      ctx.beginPath();
      ctx.moveTo(x - w, y - r);
      ctx.lineTo(x + w, y - r);
      ctx.lineTo(x + w, y - w);
      ctx.lineTo(x + r, y - w);
      ctx.lineTo(x + r, y + w);
      ctx.lineTo(x + w, y + w);
      ctx.lineTo(x + w, y + r);
      ctx.lineTo(x - w, y + r);
      ctx.lineTo(x - w, y + w);
      ctx.lineTo(x - r, y + w);
      ctx.lineTo(x - r, y - w);
      ctx.lineTo(x - w, y - w);
      ctx.closePath();
      break;
    }
    case "flask": {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.28, y - r);
      ctx.lineTo(x + r * 0.28, y - r);
      ctx.lineTo(x + r * 0.28, y - r * 0.3);
      ctx.lineTo(x + r * 0.82, y + r * 0.72);
      ctx.quadraticCurveTo(x + r * 0.96, y + r, x + r * 0.55, y + r);
      ctx.lineTo(x - r * 0.55, y + r);
      ctx.quadraticCurveTo(x - r * 0.96, y + r, x - r * 0.82, y + r * 0.72);
      ctx.lineTo(x - r * 0.28, y - r * 0.3);
      ctx.closePath();
      break;
    }
    case "ring":
    case "circle":
    default:
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
  }
}

function drawRelationLabel(ctx, label) {
  ctx.font = "700 9px system-ui, sans-serif";
  const width = ctx.measureText(label.text).width + 10;
  ctx.fillStyle = "rgba(10,13,18,.94)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(label.x - width / 2, label.y - 8, width, 16, 5);
    ctx.fill();
  } else ctx.fillRect(label.x - width / 2, label.y - 8, width, 16);
  ctx.fillStyle = label.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.text, label.x, label.y);
}

class RendererV09 {
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

      const highlighted = Boolean(this.hovered && (edge.source === this.hovered.id || edge.target === this.hovered.id)
        || this.selected && (edge.source === this.selected.id || edge.target === this.selected.id));
      const relationColor = RELATION_COLORS[edge.relation] ?? RELATION_COLORS.links;
      const synthetic = Boolean(edge.synthetic);
      const alpha = highlighted ? Math.min(0.95, edgeAlpha * 7)
        : synthetic ? Math.min(0.34, edgeAlpha * 2.1)
          : edge.relation === "links" ? edgeAlpha : Math.min(0.58, edgeAlpha * 3);
      const color = rgba(relationColor, alpha);
      ctx.strokeStyle = color;
      ctx.lineWidth = highlighted ? 2.2 : edge.relation === "links" ? 1 : 1.45;
      if (edge.relation !== "links") ctx.setLineDash(synthetic ? [2, 5] : [6, 3]);
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

      if ((highlighted || edge.showLabel) && edge.relation !== "links") {
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
      if (screen.x < -50 || screen.y < -50 || screen.x > this.width + 50 || screen.y > this.height + 50) continue;
      const hovered = this.hovered?.id === node.id;
      const selected = this.selected?.id === node.id;
      const isHub = ["area", "audit-area", "cluster-area", "relation-area", "corpus-root"].includes(node.kind);
      const pulse = isHub && motionScale > 0 ? 1 + 0.065 * motionScale * Math.sin(time * 0.002 + phase) : 1;
      const radius = Math.max(2.4, node.size * this.settings.nodeScale * pulse * Math.sqrt(this.zoom));
      const shape = node.shape ?? this.plugin.graphCore.TYPE_SHAPES?.[node.type] ?? "circle";

      if (hovered || selected || isHub) {
        ctx.fillStyle = rgba(node.color, hovered ? 0.18 : 0.11);
        drawShape(ctx, shape, screen.x, screen.y, radius + (hovered ? 10 : 7));
        ctx.fill();
      }

      ctx.fillStyle = node.color;
      drawShape(ctx, shape, screen.x, screen.y, radius);
      if (shape === "ring") {
        ctx.strokeStyle = node.color;
        ctx.lineWidth = Math.max(2, radius * 0.28);
        ctx.stroke();
      } else ctx.fill();

      if (this.settings.showStatusRings !== false && node.kind === "note") {
        const statusColor = STATUS_COLORS[node.overallStatus] ?? STATUS_COLORS.unreviewed;
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = node.auditIssues?.length ? 2.5 : 1.6;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (hovered || selected) {
        ctx.strokeStyle = "rgba(245,248,255,.98)";
        ctx.lineWidth = 2;
        drawShape(ctx, shape, screen.x, screen.y, radius + 6);
        ctx.stroke();
      }

      if (["area", "area-link", "audit-area", "cluster-area", "relation-area", "corpus-root"].includes(node.kind) || node.alwaysLabel || hovered || selected) {
        labels.push({ node, screen, priority: (hovered ? 1000000 : 0) + (selected ? 900000 : 0) + (node.labelPriority ?? 0) });
      }
    }

    let particleCount = 0;
    if (this.settings.motionMode === "full") particleCount = Math.min(this.scene.mode === "full" ? 60 : 95, this.scene.edges.length);
    else if (this.settings.motionMode === "reduced") particleCount = Math.min(this.scene.mode === "full" ? 16 : 28, this.scene.edges.length);
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
      ctx.fillStyle = rgba(RELATION_COLORS[edge.relation] ?? RELATION_COLORS.links, 0.5);
      ctx.beginPath();
      ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const label of relationLabels.slice(0, 80)) drawRelationLabel(ctx, label);
    this.renderLabels(ctx, labels);
    this.needsRender = false;
  }
}

const combined = {};
for (const source of [base, RendererV09.prototype]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(combined, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

module.exports = combined;