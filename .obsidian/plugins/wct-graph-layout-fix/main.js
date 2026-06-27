"use strict";

const { Plugin, Notice } = require("obsidian");
const VIEW_TYPE = "wct-graph-view";
const PATCHED = Symbol("wctGraphLayoutFix");

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clusterPositions(view) {
  const nodes = view.graph?.nodes ?? [];
  const renderer = view.renderer;
  if (!renderer || !nodes.length) return;

  const groups = [...new Set(nodes.map((node) => node.group ?? "Other"))];
  const groupIndex = new Map(groups.map((name, index) => [name, index]));
  const spacing = 430;
  const centers = groups.map((name, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, groups.length)) * Math.PI * 2;
    const ring = spacing * Math.max(1, Math.sqrt(groups.length / 6));
    return { name, x: Math.cos(angle) * ring, y: Math.sin(angle) * ring };
  });
  const members = new Map(groups.map((name) => [name, []]));
  nodes.forEach((node, index) => members.get(node.group ?? "Other").push({ node, index }));

  for (const name of groups) {
    const center = centers[groupIndex.get(name)];
    members.get(name).forEach(({ node, index }, localIndex) => {
      const angle = localIndex * 2.3999632297 + (hash(node.id ?? node.path ?? String(index)) % 1000) * 0.0008;
      const radius = 28 + Math.sqrt(localIndex + 1) * 19;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      node.x = x;
      node.y = y;
      renderer.positions[index * 2] = x;
      renderer.positions[index * 2 + 1] = y;
      node.__wctGroupIndex = groupIndex.get(name);
    });
  }
  view.__wctGroupCenters = centers;
  renderer.needsGeometry = true;
  renderer.requestRender?.();
}

function createWorker() {
  const source = String.raw`
    self.onmessage = (event) => {
      const m = event.data;
      if (m.type !== "layout") return;
      const n = m.count;
      const p = new Float32Array(m.positions);
      const edges = new Uint32Array(m.edges);
      const degree = new Float32Array(m.degrees);
      const groups = new Uint16Array(m.groups);
      const centers = new Float32Array(m.centers);
      const v = new Float32Array(n * 2);
      const cellSize = 150;

      for (let iter = 0; iter < m.iterations; iter += 1) {
        const cells = new Map();
        for (let i = 0; i < n; i += 1) {
          const x = p[i * 2], y = p[i * 2 + 1];
          const gx = Math.floor(x / cellSize), gy = Math.floor(y / cellSize);
          const key = gx + "," + gy;
          let cell = cells.get(key);
          if (!cell) {
            cell = { gx, gy, count: 0, x: 0, y: 0, members: [] };
            cells.set(key, cell);
          }
          cell.count += 1; cell.x += x; cell.y += y; cell.members.push(i);
        }
        const list = [...cells.values()];
        for (const cell of list) { cell.x /= cell.count; cell.y /= cell.count; }

        const cool = 1 - iter / Math.max(1, m.iterations);
        const globalRepel = 820 * (0.35 + 0.65 * cool);
        const localRepel = 1120 * (0.4 + 0.6 * cool);
        const clusterPull = 0.0030 + 0.0014 * (1 - cool);
        const spring = 0.00105;

        for (let i = 0; i < n; i += 1) {
          const o = i * 2, x = p[o], y = p[o + 1];
          const gx = Math.floor(x / cellSize), gy = Math.floor(y / cellSize);
          let fx = -x * 0.00006, fy = -y * 0.00006;

          for (const cell of list) {
            const near = Math.abs(cell.gx - gx) <= 1 && Math.abs(cell.gy - gy) <= 1;
            if (near) {
              for (const j of cell.members) {
                if (j === i) continue;
                const dx = x - p[j * 2], dy = y - p[j * 2 + 1];
                const d2 = dx * dx + dy * dy + 28;
                const f = localRepel / d2;
                fx += dx * f; fy += dy * f;
              }
            } else {
              const dx = x - cell.x, dy = y - cell.y;
              const d2 = dx * dx + dy * dy + 80;
              const f = globalRepel * cell.count / d2;
              fx += dx * f; fy += dy * f;
            }
          }

          const g = groups[i];
          fx += (centers[g * 2] - x) * clusterPull;
          fy += (centers[g * 2 + 1] - y) * clusterPull;
          v[o] = (v[o] + fx) * 0.83;
          v[o + 1] = (v[o + 1] + fy) * 0.83;
        }

        for (let e = 0; e < edges.length; e += 2) {
          const a = edges[e], b = edges[e + 1];
          const ao = a * 2, bo = b * 2;
          const dx = p[bo] - p[ao], dy = p[bo + 1] - p[ao + 1];
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const same = groups[a] === groups[b];
          const desired = same
            ? 92 + Math.min(55, Math.log2(degree[a] + degree[b] + 2) * 7)
            : 270 + Math.min(100, Math.log2(degree[a] + degree[b] + 2) * 9);
          const f = (distance - desired) * spring * (same ? 1 : 0.35);
          const fx = dx / distance * f, fy = dy / distance * f;
          v[ao] += fx; v[ao + 1] += fy; v[bo] -= fx; v[bo + 1] -= fy;
        }

        const maxStep = 10 * (0.22 + 0.78 * cool);
        for (let i = 0; i < n; i += 1) {
          const o = i * 2;
          p[o] += Math.max(-maxStep, Math.min(maxStep, v[o]));
          p[o + 1] += Math.max(-maxStep, Math.min(maxStep, v[o + 1]));
        }

        if (iter % m.publishEvery === 0 || iter === m.iterations - 1) {
          const snapshot = new Float32Array(p);
          self.postMessage({ positions: snapshot.buffer, iteration: iter, done: iter === m.iterations - 1 }, [snapshot.buffer]);
        }
      }
    };
  `;
  const blob = new Blob([source], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  worker.__wctUrl = url;
  return worker;
}

function patchRenderer(renderer, view) {
  if (!renderer || renderer.__wctEdgeBudgetFix) return;
  renderer.__wctEdgeBudgetFix = true;
  renderer.settings.labelMinZoom = Math.min(renderer.settings.labelMinZoom ?? 0.55, 0.24);
  renderer.settings.labelLimit = Math.min(renderer.settings.labelLimit ?? 140, 100);
  renderer.settings.edgeOpacity = Math.min(renderer.settings.edgeOpacity ?? 0.24, 0.065);

  renderer.rebuildVisibleGeometry = function rebuildVisibleGeometry() {
    if (!this.width || !this.height) return;
    const margin = 90;
    const visibleSet = new Set();
    const nodeData = [];
    this.visibleNodes = [];
    this.visibleNodeIndices = [];

    for (let index = 0; index < this.nodes.length; index += 1) {
      if (this.filteredNodeSet && !this.filteredNodeSet.has(index)) continue;
      const x = this.positions[index * 2], y = this.positions[index * 2 + 1];
      const screen = this.worldToScreen(x, y);
      if (screen.x < -margin || screen.y < -margin || screen.x > this.width + margin || screen.y > this.height + margin) continue;
      const node = this.nodes[index];
      visibleSet.add(index);
      this.visibleNodes.push(node);
      this.visibleNodeIndices.push(index);
      nodeData.push(x, y, node.size, ...node.color);
    }

    if (!this.__wctRankedEdges || this.__wctRankedEdgesSource !== this.edges) {
      this.__wctRankedEdgesSource = this.edges;
      this.__wctRankedEdges = [...this.edges].sort((left, right) => {
        const score = (edge) => {
          const a = this.nodes[edge.source], b = this.nodes[edge.target];
          return (edge.weight ?? 1) * 8 + Math.log2((a?.degree ?? 0) + 1) + Math.log2((b?.degree ?? 0) + 1);
        };
        return score(right) - score(left);
      });
    }

    const zoomFactor = Math.max(0, Math.min(1, (this.zoom - 0.18) / 0.9));
    const budget = this.filteredNodeSet ? 3200 : Math.round(850 + 2350 * zoomFactor);
    const edgeData = [];
    let count = 0;
    for (const edge of this.__wctRankedEdges) {
      if (count >= budget) break;
      if (this.filteredNodeSet && (!this.filteredNodeSet.has(edge.source) || !this.filteredNodeSet.has(edge.target))) continue;
      if (!visibleSet.has(edge.source) && !visibleSet.has(edge.target)) continue;
      edgeData.push(
        this.positions[edge.source * 2], this.positions[edge.source * 2 + 1],
        this.positions[edge.target * 2], this.positions[edge.target * 2 + 1],
      );
      count += 1;
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nodeData), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeData), gl.DYNAMIC_DRAW);
    this.visibleNodeCount = nodeData.length / 7;
    this.visibleEdgeVertexCount = edgeData.length / 2;
    view.__wctRenderedEdges = count;
    this.needsGeometry = false;
  };
}

function patchView(view) {
  if (!view || view[PATCHED] || !view.renderer || !view.graph) return;
  view[PATCHED] = true;
  patchRenderer(view.renderer, view);
  view.plugin.settings.labelMinZoom = 0.24;
  view.plugin.settings.labelLimit = 100;
  view.plugin.settings.edgeOpacity = 0.065;
  view.plugin.settings.layoutIterations = 460;
  view.plugin.settings.layoutPublishEvery = 12;

  view.startLayout = function startLayout() {
    if (!this.graph?.nodes?.length || this.paused) return;
    this.stopLayout();
    clusterPositions(this);
    this.worker = createWorker();
    this.worker.onmessage = (event) => {
      this.renderer.setPositions(new Float32Array(event.data.positions));
      const rendered = this.__wctRenderedEdges ?? 0;
      this.status?.setText(
        `${this.graph.nodes.length.toLocaleString()} nodes · ${this.graph.edges.length.toLocaleString()} links · ${rendered.toLocaleString()} rendered · layout ${event.data.iteration + 1}/460`,
      );
      if (event.data.done) {
        this.renderer.fit();
        this.stopLayout(false);
      }
    };
    this.worker.onerror = (error) => {
      console.error("WCT Graph hotfix worker failed", error);
      new Notice("WCT Graph layout hotfix stopped");
      this.stopLayout();
    };

    const positions = new Float32Array(this.renderer.positions);
    const edges = new Uint32Array(this.graph.edges.length * 2);
    this.graph.edges.forEach((edge, index) => {
      edges[index * 2] = edge.source;
      edges[index * 2 + 1] = edge.target;
    });
    const degrees = new Float32Array(this.graph.nodes.map((node) => node.degree ?? 0));
    const groups = new Uint16Array(this.graph.nodes.map((node) => node.__wctGroupIndex ?? 0));
    const centers = new Float32Array((this.__wctGroupCenters ?? []).flatMap((center) => [center.x, center.y]));
    this.worker.postMessage({
      type: "layout",
      count: this.graph.nodes.length,
      positions: positions.buffer,
      edges: edges.buffer,
      degrees: degrees.buffer,
      groups: groups.buffer,
      centers: centers.buffer,
      iterations: 460,
      publishEvery: 12,
    }, [positions.buffer, edges.buffer, degrees.buffer, groups.buffer, centers.buffer]);
  };

  view.stopLayout();
  view.startLayout();
}

module.exports = class WCTGraphLayoutFix extends Plugin {
  onload() {
    const patchAll = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) patchView(leaf.view);
    };
    this.registerEvent(this.app.workspace.on("layout-change", () => setTimeout(patchAll, 120)));
    this.app.workspace.onLayoutReady(() => setTimeout(patchAll, 250));
    this.addCommand({
      id: "repair-wct-graph-layout",
      name: "Repair WCT Graph layout now",
      callback: () => {
        patchAll();
        new Notice("WCT Graph clustered layout reapplied");
      },
    });
  }
};