"use strict";

const { Plugin, Notice } = require("obsidian");

const VIEW_TYPE = "wct-graph-view";
const PATCHED = Symbol("wctGraphPolishPatched");

const AREA_ORDER = [
  "Maps",
  "Papers",
  "Concepts",
  "Glossary",
  "Equations",
  "Derivations",
  "Predictions",
  "Experiments",
  "Evidence",
  "Projects",
  "References",
  "Other",
];

const AREA_COLORS = {
  Maps: [0.18, 0.42, 0.88, 1],
  Papers: [0.57, 0.28, 0.77, 1],
  Concepts: [0.20, 0.69, 0.43, 1],
  Glossary: [0.38, 0.60, 0.84, 1],
  Equations: [0.94, 0.57, 0.18, 1],
  Derivations: [0.89, 0.33, 0.29, 1],
  Predictions: [0.92, 0.72, 0.13, 1],
  Experiments: [0.09, 0.70, 0.76, 1],
  Evidence: [0.55, 0.66, 0.18, 1],
  Projects: [0.90, 0.37, 0.58, 1],
  References: [0.52, 0.57, 0.64, 1],
  Other: [0.48, 0.62, 0.78, 1],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function areaFromPath(path, fallback = "Other") {
  const normalized = String(path ?? "").replace(/\\/g, "/");
  const lower = normalized.toLowerCase();

  if (normalized === "Research/00 - Open This First.md") return "Maps";
  if (lower.includes("/00 maps/")) return "Maps";
  if (lower.includes("/01 literature notes/") || lower.includes("/papers/")) return "Papers";
  if (lower.includes("/02 concepts/") || lower.includes("/concepts/")) return "Concepts";
  if (lower.includes("/03 glossary/") || lower.includes("/glossary/")) return "Glossary";
  if (lower.includes("/04 equations/") || lower.includes("/equations/")) return "Equations";
  if (lower.includes("/derivations/")) return "Derivations";
  if (lower.includes("/predictions/")) return "Predictions";
  if (lower.includes("/06 experiments/") || lower.includes("/experiments/")) return "Experiments";
  if (lower.includes("/evidence/")) return "Evidence";
  if (lower.includes("/projects/")) return "Projects";
  if (lower.includes("/05 references/") || lower.includes("/references/")) return "References";

  const raw = String(fallback ?? "");
  if (/map/i.test(raw)) return "Maps";
  if (/literature|paper/i.test(raw)) return "Papers";
  if (/concept/i.test(raw)) return "Concepts";
  if (/glossary/i.test(raw)) return "Glossary";
  if (/equation/i.test(raw)) return "Equations";
  if (/derivation/i.test(raw)) return "Derivations";
  if (/prediction/i.test(raw)) return "Predictions";
  if (/experiment/i.test(raw)) return "Experiments";
  if (/evidence/i.test(raw)) return "Evidence";
  if (/project/i.test(raw)) return "Projects";
  if (/reference/i.test(raw)) return "References";
  return "Other";
}

function compactCount(value) {
  const count = Number(value) || 0;
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(count / 1000)}k`;
}

function intersects(left, right, padding = 3) {
  return !(
    left.x + left.width + padding < right.x ||
    right.x + right.width + padding < left.x ||
    left.y + left.height + padding < right.y ||
    right.y + right.height + padding < left.y
  );
}

function normalizeGraph(view) {
  const graph = view.graph;
  if (!graph?.nodes?.length) return false;

  const previousSelected = view.selectedGroup;
  const groups = new Map();
  for (const node of graph.nodes) {
    const area = areaFromPath(node.path, node.group);
    node.group = area;
    node.color = AREA_COLORS[area] ?? AREA_COLORS.Other;
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(node.id);
  }

  for (const ids of groups.values()) {
    ids.sort((left, right) => {
      const leftNode = graph.byId.get(left);
      const rightNode = graph.byId.get(right);
      const degreeDelta = (rightNode?.degree ?? 0) - (leftNode?.degree ?? 0);
      return degreeDelta || String(leftNode?.label ?? "").localeCompare(String(rightNode?.label ?? ""));
    });
  }

  const groupEdges = new Map();
  for (const edge of graph.edges ?? []) {
    const sourceNode = graph.byId.get(edge.source);
    const targetNode = graph.byId.get(edge.target);
    if (!sourceNode || !targetNode || sourceNode.group === targetNode.group) continue;
    const left = sourceNode.group < targetNode.group ? sourceNode.group : targetNode.group;
    const right = sourceNode.group < targetNode.group ? targetNode.group : sourceNode.group;
    const key = `${left}\u0000${right}`;
    const current = groupEdges.get(key) ?? { source: left, target: right, weight: 0, links: 0 };
    current.weight += Math.max(1, Number(edge.weight) || 1);
    current.links += 1;
    groupEdges.set(key, current);
  }

  graph.groups = groups;
  graph.groupEdges = [...groupEdges.values()];
  graph.orderedGroups = AREA_ORDER.filter((area) => groups.has(area));

  if (previousSelected) {
    const normalizedSelected = areaFromPath("", previousSelected);
    view.selectedGroup = groups.has(normalizedSelected) ? normalizedSelected : null;
  }

  graph.__wctPolished = true;
  return true;
}

function polishScene(scene) {
  if (!scene?.nodes?.length) return scene;

  const nodes = scene.nodes.map((node) => {
    const group = areaFromPath(node.path, node.group);
    const polished = {
      ...node,
      group,
      color: AREA_COLORS[group] ?? node.color ?? AREA_COLORS.Other,
    };

    if (node.kind === "group") {
      const count = Number(node.degree) || Number(String(node.label).match(/(\d+)/)?.[1]) || 0;
      polished.label = `${group}\n${compactCount(count)} notes`;
      polished.size = clamp(18 + Math.log2(count + 1) * 3.1, 22, 44);
      polished.alwaysLabel = true;
      polished.labelPriority = 100000 + count;
    } else if (node.kind === "group-link") {
      const count = Number(node.degree) || Number(String(node.label).match(/(\d+)/)?.[1]) || 0;
      polished.label = `${group}\n${compactCount(count)} connections`;
      polished.size = clamp(13 + Math.log2(count + 1) * 2.1, 16, 28);
      polished.alwaysLabel = true;
      polished.labelPriority = 80000 + count;
    }

    return polished;
  });

  if (scene.mode === "cluster") {
    const noteNodes = nodes.filter((node) => node.kind === "note");
    const externalNodes = nodes.filter((node) => node.kind === "group-link");
    if (noteNodes.length && externalNodes.length) {
      let maxRadius = 0;
      for (const node of noteNodes) {
        maxRadius = Math.max(maxRadius, Math.hypot(Number(node.x) || 0, Number(node.y) || 0));
      }
      const externalRadius = clamp(maxRadius + 210, 650, 1420);
      externalNodes
        .sort((left, right) => (right.degree ?? 0) - (left.degree ?? 0))
        .forEach((node, index) => {
          const angle = -Math.PI / 2 + (index / Math.max(1, externalNodes.length)) * Math.PI * 2;
          node.x = Math.cos(angle) * externalRadius;
          node.y = Math.sin(angle) * externalRadius * 0.82;
        });
    }
  }

  const validIds = new Set(nodes.map((node) => node.id));
  const edges = (scene.edges ?? []).filter((edge) => validIds.has(edge.source) && validIds.has(edge.target));
  return { ...scene, nodes, edges };
}

function patchLabels(view) {
  const renderer = view.renderer;
  if (!renderer || renderer.__wctCollisionLabels) return;
  renderer.__wctCollisionLabels = true;

  renderer.renderLabels = function renderCollisionAwareLabels() {
    const context = this.labelContext;
    const scene = this.scene;
    if (!context || !scene?.nodes?.length || !this.width || !this.height) return;

    const ratio = this.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);

    const hoveredId = view.__wctMotionController?.hoveredNode?.id ?? null;
    const areaBudget = Math.max(12, Math.floor((this.width * this.height) / 24000));
    const zoomBudget = Math.max(12, Math.round(12 + this.zoom * 58));
    const detailedLimit = Math.min(this.settings.labelLimit ?? 120, areaBudget, zoomBudget);
    const limit = scene.mode === "overview" ? 30 : detailedLimit;

    let candidates = [...scene.nodes];
    candidates.sort((left, right) => {
      const leftHover = left.id === hoveredId ? 1 : 0;
      const rightHover = right.id === hoveredId ? 1 : 0;
      if (leftHover !== rightHover) return rightHover - leftHover;
      const leftGroup = left.kind === "group" || left.kind === "group-link" ? 1 : 0;
      const rightGroup = right.kind === "group" || right.kind === "group-link" ? 1 : 0;
      if (leftGroup !== rightGroup) return rightGroup - leftGroup;
      if (Number(left.alwaysLabel) !== Number(right.alwaysLabel)) {
        return Number(right.alwaysLabel) - Number(left.alwaysLabel);
      }
      return (right.labelPriority ?? right.degree ?? 0) - (left.labelPriority ?? left.degree ?? 0);
    });

    candidates = candidates.filter((node) => {
      if (node.id === hoveredId || node.alwaysLabel) return true;
      return this.zoom >= (this.settings.labelMinZoom ?? 0.16);
    }).slice(0, limit);

    const occupied = [];
    const center = { x: this.width / 2, y: this.height / 2 };

    for (const node of candidates) {
      const screen = this.worldToScreen(node.x, node.y);
      if (screen.x < -180 || screen.y < -100 || screen.x > this.width + 180 || screen.y > this.height + 100) continue;

      const isGroup = node.kind === "group" || node.kind === "group-link";
      const isHovered = node.id === hoveredId;
      const fontSize = isGroup ? 13 : isHovered ? 12 : 11;
      const weight = isGroup || isHovered ? 650 : 520;
      context.font = `${weight} ${fontSize}px system-ui, sans-serif`;

      let lines = String(node.label ?? "").split("\n");
      if (!isGroup && this.zoom < 0.85) {
        lines = lines.map((line) => line.length > 32 ? `${line.slice(0, 31)}…` : line);
      }

      const width = Math.max(...lines.map((line) => context.measureText(line).width), 20) + 12;
      const lineHeight = fontSize + 3;
      const height = lines.length * lineHeight + 7;
      const nodeRadius = Math.max(7, (node.size ?? 6) * (this.settings.nodeScale ?? 1) * 0.62);
      const outwardX = screen.x - center.x;
      const outwardY = screen.y - center.y;
      const outwardLength = Math.hypot(outwardX, outwardY) || 1;
      const ux = outwardX / outwardLength;
      const uy = outwardY / outwardLength;
      const gap = nodeRadius + 7;

      const positions = [
        { x: screen.x - width / 2, y: screen.y + gap },
        { x: screen.x - width / 2, y: screen.y - gap - height },
        { x: screen.x + gap, y: screen.y - height / 2 },
        { x: screen.x - gap - width, y: screen.y - height / 2 },
        { x: screen.x + ux * gap - width / 2, y: screen.y + uy * gap - height / 2 },
      ];

      let chosen = null;
      for (const position of positions) {
        const box = { x: position.x, y: position.y, width, height };
        const inside = box.x >= 4 && box.y >= 4 && box.x + box.width <= this.width - 4 && box.y + box.height <= this.height - 4;
        if (!inside) continue;
        if (occupied.some((other) => intersects(box, other, isGroup ? 6 : 4))) continue;
        chosen = box;
        break;
      }

      if (!chosen) {
        if (!isGroup && !isHovered) continue;
        chosen = {
          x: clamp(screen.x - width / 2, 4, Math.max(4, this.width - width - 4)),
          y: clamp(screen.y + gap, 4, Math.max(4, this.height - height - 4)),
          width,
          height,
        };
      }

      occupied.push(chosen);
      context.fillStyle = isGroup
        ? "rgba(18,20,24,.78)"
        : isHovered
          ? "rgba(18,20,24,.86)"
          : "rgba(18,20,24,.62)";
      context.beginPath();
      if (typeof context.roundRect === "function") context.roundRect(chosen.x, chosen.y, chosen.width, chosen.height, 4);
      else context.rect(chosen.x, chosen.y, chosen.width, chosen.height);
      context.fill();

      context.textAlign = "center";
      context.textBaseline = "top";
      context.lineWidth = 2.5;
      context.strokeStyle = "rgba(0,0,0,.76)";
      context.fillStyle = "rgba(240,244,250,.97)";
      lines.forEach((line, index) => {
        const x = chosen.x + chosen.width / 2;
        const y = chosen.y + 4 + index * lineHeight;
        context.strokeText(line, x, y);
        context.fillText(line, x, y);
      });
    }
  };
}

function rerender(view) {
  if (!view.graph?.nodes?.length) return;
  const query = view.searchInput?.value?.trim();
  if (query) view.showFocus(query);
  else if (view.mode === "cluster" && view.selectedGroup && view.graph.groups.has(view.selectedGroup)) {
    view.showGroup(view.selectedGroup);
  } else {
    view.showOverview();
  }
}

function patchView(view) {
  if (!view || view[PATCHED] || !view.renderer || !view.stage) return;
  view[PATCHED] = true;
  view.stage.dataset.polished = "true";

  normalizeGraph(view);
  patchLabels(view);

  const currentSetScene = view.setScene.bind(view);
  view.setScene = (scene) => currentSetScene(polishScene(scene));

  const currentRebuild = view.rebuildGraph.bind(view);
  view.rebuildGraph = async () => {
    await currentRebuild();
    if (normalizeGraph(view)) rerender(view);
  };

  rerender(view);
}

module.exports = class WCTGraphPolishPlugin extends Plugin {
  onload() {
    const patchAll = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) patchView(leaf.view);
    };

    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(patchAll, 120)));
    this.app.workspace.onLayoutReady(() => setTimeout(patchAll, 280));
    this.addCommand({
      id: "reapply-wct-graph-polish",
      name: "Reapply WCT Graph taxonomy and label polish",
      callback: () => {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
          const view = leaf.view;
          if (!view[PATCHED]) patchView(view);
          else {
            normalizeGraph(view);
            patchLabels(view);
            rerender(view);
          }
        }
        new Notice("WCT Graph taxonomy and labels refreshed");
      },
    });
  }
};