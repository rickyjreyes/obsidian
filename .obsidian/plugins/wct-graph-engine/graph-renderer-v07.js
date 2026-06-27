"use strict";

const base = require("./graph-renderer");
const { clamp } = require("./graph-core");

class RendererV07 {
  renderLabels(ctx, labels) {
    this.labelHitBoxes = [];
    labels.sort((a, b) => b.priority - a.priority);
    const occupied = [];
    const limit = Math.min(this.settings.labelLimit, labels.length);
    const globalScale = clamp(Number(this.settings.graphLabelScale) || 1, 0.75, 2.2);
    const focusScale = clamp(Number(this.settings.focusLabelScale) || 1.5, 1, 2.8);
    ctx.textBaseline = "top";

    for (const item of labels.slice(0, limit)) {
      const { node, screen } = item;
      const isArea = ["area", "area-link", "audit-area"].includes(node.kind);
      const focused = this.hovered?.id === node.id || this.selected?.id === node.id;
      const baseSize = isArea ? 13 : 11;
      const fontSize = Math.round(baseSize * globalScale * (focused ? focusScale : 1));
      const weight = focused ? 760 : isArea ? 650 : 520;
      ctx.font = `${weight} ${fontSize}px system-ui, sans-serif`;
      const maxChars = focused ? 54 : 36;
      const lines = String(node.label).split("\n").map((line) => line.length > maxChars && !isArea ? `${line.slice(0, maxChars - 1)}…` : line);
      const width = Math.max(...lines.map((line) => ctx.measureText(line).width), 30) + (focused ? 18 : 12);
      const lineHeight = fontSize + (focused ? 6 : 3);
      const height = lines.length * lineHeight + (focused ? 11 : 7);
      const gap = Math.max(10, node.size * Math.sqrt(this.zoom) + (focused ? 13 : 8));
      const topY = screen.y - gap - height;
      const horizontalShift = Math.max(18, width * 0.38);
      const candidates = [
        { x: screen.x - width / 2, y: topY },
        { x: screen.x - width / 2 + horizontalShift, y: topY },
        { x: screen.x - width / 2 - horizontalShift, y: topY },
        { x: screen.x - width / 2, y: screen.y + gap },
      ];
      let box = null;
      for (const candidate of candidates) {
        const test = { ...candidate, width, height };
        if (test.x < 4 || test.y < 4 || test.x + width > this.width - 4 || test.y + height > this.height - 4) continue;
        if (!focused && occupied.some((other) => !(test.x + width + 4 < other.x || other.x + other.width + 4 < test.x || test.y + height + 4 < other.y || other.y + other.height + 4 < test.y))) continue;
        box = test;
        break;
      }
      if (!box) {
        if (!isArea && !focused) continue;
        const preferredTop = screen.y - gap - height;
        box = {
          x: clamp(screen.x - width / 2, 4, this.width - width - 4),
          y: preferredTop >= 4
            ? clamp(preferredTop, 4, this.height - height - 4)
            : clamp(screen.y + gap, 4, this.height - height - 4),
          width,
          height,
        };
      }
      occupied.push(box);
      this.labelHitBoxes.push({ node, x: box.x, y: box.y, width: box.width, height: box.height });

      const accent = node.color ?? "#7f8da3";
      ctx.fillStyle = focused
        ? "rgba(10,13,18,.94)"
        : isArea
          ? "rgba(15,18,24,.84)"
          : "rgba(15,18,24,.68)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(box.x, box.y, box.width, box.height, focused ? 7 : 4);
      else ctx.rect(box.x, box.y, box.width, box.height);
      ctx.fill();

      if (focused) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,.9)";
      ctx.lineWidth = focused ? 3.4 : 2.5;
      ctx.fillStyle = focused ? "rgba(255,255,255,1)" : "rgba(244,247,252,.98)";
      lines.forEach((line, index) => {
        const x = box.x + box.width / 2;
        const y = box.y + (focused ? 6 : 4) + index * lineHeight;
        ctx.strokeText(line, x, y);
        ctx.fillText(line, x, y);
      });
    }
  }
}

const combined = {};
for (const source of [base, RendererV07.prototype]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") Object.defineProperty(combined, name, Object.getOwnPropertyDescriptor(source, name));
  }
}

module.exports = combined;