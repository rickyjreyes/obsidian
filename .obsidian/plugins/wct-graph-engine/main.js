"use strict";

const {
  ItemView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} = require("obsidian");

const VIEW_TYPE = "wct-graph-view";
const VIEW_NAME = "WCT Graph";

const DEFAULT_SETTINGS = {
  includeFolders: ["Research"],
  excludeFolders: [".obsidian", "Templates"],
  hideOrphans: true,
  maxNodes: 6000,
  labelLimit: 140,
  labelMinZoom: 0.55,
  layoutIterations: 260,
  layoutPublishEvery: 8,
  nodeScale: 1,
  edgeOpacity: 0.24,
  autoRebuild: true,
};

const GROUP_COLORS = {
  "00 Maps": [0.16, 0.31, 0.74, 1],
  "01 Literature Notes": [0.55, 0.25, 0.72, 1],
  "02 Concepts": [0.22, 0.66, 0.42, 1],
  "03 Equations": [0.93, 0.53, 0.18, 1],
  "04 Derivations": [0.89, 0.34, 0.30, 1],
  "05 Predictions": [0.90, 0.68, 0.12, 1],
  "06 Experiments": [0.10, 0.66, 0.72, 1],
  "07 Evidence": [0.52, 0.64, 0.16, 1],
  "08 Projects": [0.88, 0.38, 0.57, 1],
  References: [0.48, 0.52, 0.58, 1],
  Other: [0.48, 0.62, 0.78, 1],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const debounce = (fn, wait) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
};

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function groupForPath(path) {
  if (path.includes("/05 References/")) return "References";
  const match = path.match(/Research\/(0[0-8] [^/]+)/);
  return match?.[1] ?? "Other";
}

function basename(path) {
  const file = path.split("/").pop() ?? path;
  return file.endsWith(".md") ? file.slice(0, -3) : file;
}

function pathAllowed(path, settings) {
  const includes = settings.includeFolders.map((value) => value.trim()).filter(Boolean);
  const excludes = settings.excludeFolders.map((value) => value.trim()).filter(Boolean);
  if (includes.length > 0 && !includes.some((folder) => path === folder || path.startsWith(`${folder}/`))) {
    return false;
  }
  return !excludes.some((folder) => path === folder || path.startsWith(`${folder}/`) || path.includes(`/${folder}/`));
}

class GraphIndex {
  static build(app, settings) {
    const files = app.vault
      .getMarkdownFiles()
      .filter((file) => pathAllowed(file.path, settings));

    const fileByPath = new Map(files.map((file) => [file.path, file]));
    const degree = new Map(files.map((file) => [file.path, 0]));
    const rawEdges = [];
    const resolved = app.metadataCache.resolvedLinks ?? {};

    for (const [source, destinations] of Object.entries(resolved)) {
      if (!fileByPath.has(source)) continue;
      for (const [target, weight] of Object.entries(destinations ?? {})) {
        if (!fileByPath.has(target) || source === target) continue;
        rawEdges.push({ source, target, weight: Math.max(1, Number(weight) || 1) });
        degree.set(source, (degree.get(source) ?? 0) + 1);
        degree.set(target, (degree.get(target) ?? 0) + 1);
      }
    }

    let selected = files;
    if (settings.hideOrphans) {
      selected = selected.filter((file) => (degree.get(file.path) ?? 0) > 0);
    }

    selected.sort((a, b) => {
      const delta = (degree.get(b.path) ?? 0) - (degree.get(a.path) ?? 0);
      return delta || a.path.localeCompare(b.path);
    });

    if (selected.length > settings.maxNodes) {
      selected = selected.slice(0, settings.maxNodes);
    }

    const selectedSet = new Set(selected.map((file) => file.path));
    const nodes = selected.map((file, index) => {
      const hash = hashString(file.path);
      const angle = ((hash % 100000) / 100000) * Math.PI * 2;
      const radius = 40 + Math.sqrt(index + 1) * 15;
      const nodeDegree = degree.get(file.path) ?? 0;
      const group = groupForPath(file.path);
      return {
        id: file.path,
        path: file.path,
        label: basename(file.path),
        group,
        color: GROUP_COLORS[group] ?? GROUP_COLORS.Other,
        degree: nodeDegree,
        size: clamp(3.2 + Math.log2(nodeDegree + 1) * 1.45, 3.2, 14),
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });

    const indexById = new Map(nodes.map((node, index) => [node.id, index]));
    const seen = new Set();
    const edges = [];

    for (const edge of rawEdges) {
      if (!selectedSet.has(edge.source) || !selectedSet.has(edge.target)) continue;
      const source = indexById.get(edge.source);
      const target = indexById.get(edge.target);
      if (source == null || target == null) continue;
      const key = source < target ? `${source}:${target}` : `${target}:${source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source, target, weight: edge.weight });
    }

    return { nodes, edges, indexById };
  }
}

function createLayoutWorker() {
  const source = String.raw`
    let cancelled = false;

    function seededNoise(index) {
      const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
      return (x - Math.floor(x)) - 0.5;
    }

    self.onmessage = (event) => {
      const message = event.data;
      if (message.type === "cancel") {
        cancelled = true;
        return;
      }
      if (message.type !== "layout") return;

      cancelled = false;
      const count = message.count;
      const positions = new Float32Array(message.positions);
      const edgePairs = new Uint32Array(message.edges);
      const degrees = new Float32Array(message.degrees);
      const iterations = message.iterations;
      const publishEvery = message.publishEvery;
      const velocity = new Float32Array(count * 2);
      const cellSize = 105;

      for (let iteration = 0; iteration < iterations && !cancelled; iteration += 1) {
        const grid = new Map();
        for (let index = 0; index < count; index += 1) {
          const x = positions[index * 2];
          const y = positions[index * 2 + 1];
          const gx = Math.floor(x / cellSize);
          const gy = Math.floor(y / cellSize);
          const key = gx + "," + gy;
          let bucket = grid.get(key);
          if (!bucket) {
            bucket = [];
            grid.set(key, bucket);
          }
          bucket.push(index);
        }

        const cooling = 1 - iteration / Math.max(1, iterations);
        const repulsion = 360 * (0.2 + cooling * 0.8);
        const attraction = 0.0028;
        const center = 0.0009;

        for (let index = 0; index < count; index += 1) {
          const offset = index * 2;
          const x = positions[offset];
          const y = positions[offset + 1];
          const gx = Math.floor(x / cellSize);
          const gy = Math.floor(y / cellSize);
          let fx = -x * center;
          let fy = -y * center;

          for (let dx = -1; dx <= 1; dx += 1) {
            for (let dy = -1; dy <= 1; dy += 1) {
              const bucket = grid.get((gx + dx) + "," + (gy + dy));
              if (!bucket) continue;
              for (const other of bucket) {
                if (other === index) continue;
                const ox = positions[other * 2];
                const oy = positions[other * 2 + 1];
                const rx = x - ox;
                const ry = y - oy;
                const distance2 = rx * rx + ry * ry + 18;
                if (distance2 > cellSize * cellSize * 2.4) continue;
                const force = repulsion / distance2;
                fx += rx * force;
                fy += ry * force;
              }
            }
          }

          if (!Number.isFinite(fx) || !Number.isFinite(fy)) {
            fx = seededNoise(index) * 0.1;
            fy = seededNoise(index + 17) * 0.1;
          }
          velocity[offset] = (velocity[offset] + fx) * 0.82;
          velocity[offset + 1] = (velocity[offset + 1] + fy) * 0.82;
        }

        for (let edge = 0; edge < edgePairs.length; edge += 2) {
          const source = edgePairs[edge];
          const target = edgePairs[edge + 1];
          const sourceOffset = source * 2;
          const targetOffset = target * 2;
          const dx = positions[targetOffset] - positions[sourceOffset];
          const dy = positions[targetOffset + 1] - positions[sourceOffset + 1];
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const desired = 58 + Math.min(110, (degrees[source] + degrees[target]) * 1.2);
          const force = (distance - desired) * attraction;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          velocity[sourceOffset] += fx;
          velocity[sourceOffset + 1] += fy;
          velocity[targetOffset] -= fx;
          velocity[targetOffset + 1] -= fy;
        }

        const maxStep = 8 * (0.25 + cooling * 0.75);
        for (let index = 0; index < count; index += 1) {
          const offset = index * 2;
          const vx = Math.max(-maxStep, Math.min(maxStep, velocity[offset]));
          const vy = Math.max(-maxStep, Math.min(maxStep, velocity[offset + 1]));
          positions[offset] += vx;
          positions[offset + 1] += vy;
        }

        if (iteration % publishEvery === 0 || iteration === iterations - 1) {
          const snapshot = new Float32Array(positions);
          self.postMessage(
            { type: "positions", positions: snapshot.buffer, iteration, done: iteration === iterations - 1 },
            [snapshot.buffer],
          );
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

class WebGLGraphRenderer {
  constructor(glCanvas, labelCanvas, settings) {
    this.glCanvas = glCanvas;
    this.labelCanvas = labelCanvas;
    this.settings = settings;
    this.gl = glCanvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    if (!this.gl) throw new Error("WebGL 2 is required for WCT Graph");
    this.labelContext = labelCanvas.getContext("2d");
    this.nodes = [];
    this.edges = [];
    this.positions = new Float32Array(0);
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.query = "";
    this.filteredNodeSet = null;
    this.visibleNodes = [];
    this.visibleNodeIndices = [];
    this.needsGeometry = true;
    this.raf = 0;
    this.initGl();
  }

  initGl() {
    const gl = this.gl;
    const vertexShader = `#version 300 es
      in vec2 a_position;
      in float a_size;
      in vec4 a_color;
      uniform vec2 u_viewport;
      uniform vec2 u_pan;
      uniform float u_zoom;
      uniform float u_nodeScale;
      out vec4 v_color;
      void main() {
        vec2 pixel = a_position * u_zoom + u_pan;
        vec2 clip = vec2(pixel.x / (u_viewport.x * 0.5), -pixel.y / (u_viewport.y * 0.5));
        gl_Position = vec4(clip, 0.0, 1.0);
        gl_PointSize = clamp(a_size * u_nodeScale, 2.0, 28.0);
        v_color = a_color;
      }
    `;
    const fragmentShader = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        vec2 point = gl_PointCoord * 2.0 - 1.0;
        float radius = dot(point, point);
        if (radius > 1.0) discard;
        float alpha = smoothstep(1.0, 0.72, radius);
        outColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    `;
    const edgeVertex = `#version 300 es
      in vec2 a_position;
      uniform vec2 u_viewport;
      uniform vec2 u_pan;
      uniform float u_zoom;
      void main() {
        vec2 pixel = a_position * u_zoom + u_pan;
        vec2 clip = vec2(pixel.x / (u_viewport.x * 0.5), -pixel.y / (u_viewport.y * 0.5));
        gl_Position = vec4(clip, 0.0, 1.0);
      }
    `;
    const edgeFragment = `#version 300 es
      precision mediump float;
      uniform vec4 u_edgeColor;
      out vec4 outColor;
      void main() { outColor = u_edgeColor; }
    `;

    this.nodeProgram = this.createProgram(vertexShader, fragmentShader);
    this.edgeProgram = this.createProgram(edgeVertex, edgeFragment);
    this.nodeVao = gl.createVertexArray();
    this.nodeBuffer = gl.createBuffer();
    this.edgeVao = gl.createVertexArray();
    this.edgeBuffer = gl.createBuffer();

    gl.bindVertexArray(this.nodeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
    const stride = 7 * 4;
    const position = gl.getAttribLocation(this.nodeProgram, "a_position");
    const size = gl.getAttribLocation(this.nodeProgram, "a_size");
    const color = gl.getAttribLocation(this.nodeProgram, "a_color");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(size);
    gl.vertexAttribPointer(size, 1, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(color, 4, gl.FLOAT, false, stride, 3 * 4);

    gl.bindVertexArray(this.edgeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
    const edgePosition = gl.getAttribLocation(this.edgeProgram, "a_position");
    gl.enableVertexAttribArray(edgePosition);
    gl.vertexAttribPointer(edgePosition, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.bindVertexArray(null);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message || "Shader compilation failed");
      }
      return shader;
    };

    const program = gl.createProgram();
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Shader linking failed");
    }
    return program;
  }

  setGraph(graph) {
    this.nodes = graph.nodes;
    this.edges = graph.edges;
    this.positions = new Float32Array(this.nodes.length * 2);
    this.nodes.forEach((node, index) => {
      this.positions[index * 2] = node.x;
      this.positions[index * 2 + 1] = node.y;
    });
    this.query = "";
    this.filteredNodeSet = null;
    this.needsGeometry = true;
    this.fit();
  }

  setPositions(positions) {
    if (positions.length !== this.positions.length) return;
    this.positions = positions;
    this.needsGeometry = true;
    this.requestRender();
  }

  setQuery(query) {
    this.query = query.trim().toLowerCase();
    if (!this.query) {
      this.filteredNodeSet = null;
    } else {
      const matches = new Set();
      this.nodes.forEach((node, index) => {
        if (node.label.toLowerCase().includes(this.query) || node.path.toLowerCase().includes(this.query)) {
          matches.add(index);
        }
      });
      const expanded = new Set(matches);
      for (const edge of this.edges) {
        if (matches.has(edge.source)) expanded.add(edge.target);
        if (matches.has(edge.target)) expanded.add(edge.source);
      }
      this.filteredNodeSet = expanded;
    }
    this.needsGeometry = true;
    this.requestRender();
  }

  resize(width, height, devicePixelRatio) {
    const pixelWidth = Math.max(1, Math.floor(width * devicePixelRatio));
    const pixelHeight = Math.max(1, Math.floor(height * devicePixelRatio));
    for (const canvas of [this.glCanvas, this.labelCanvas]) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    this.width = width;
    this.height = height;
    this.devicePixelRatio = devicePixelRatio;
    this.needsGeometry = true;
    this.requestRender();
  }

  fit() {
    if (!this.nodes.length || !this.width || !this.height) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let index = 0; index < this.nodes.length; index += 1) {
      minX = Math.min(minX, this.positions[index * 2]);
      maxX = Math.max(maxX, this.positions[index * 2]);
      minY = Math.min(minY, this.positions[index * 2 + 1]);
      maxY = Math.max(maxY, this.positions[index * 2 + 1]);
    }
    const graphWidth = Math.max(100, maxX - minX);
    const graphHeight = Math.max(100, maxY - minY);
    this.zoom = clamp(Math.min(this.width / graphWidth, this.height / graphHeight) * 0.82, 0.08, 4);
    this.panX = -((minX + maxX) * 0.5) * this.zoom;
    this.panY = -((minY + maxY) * 0.5) * this.zoom;
    this.needsGeometry = true;
    this.requestRender();
  }

  pan(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.needsGeometry = true;
    this.requestRender();
  }

  zoomAt(factor, clientX, clientY, rect) {
    const localX = clientX - rect.left - rect.width / 2;
    const localY = clientY - rect.top - rect.height / 2;
    const oldZoom = this.zoom;
    const nextZoom = clamp(oldZoom * factor, 0.04, 14);
    const worldX = (localX - this.panX) / oldZoom;
    const worldY = (localY - this.panY) / oldZoom;
    this.zoom = nextZoom;
    this.panX = localX - worldX * nextZoom;
    this.panY = localY - worldY * nextZoom;
    this.needsGeometry = true;
    this.requestRender();
  }

  worldToScreen(x, y) {
    return {
      x: x * this.zoom + this.panX + this.width / 2,
      y: y * this.zoom + this.panY + this.height / 2,
    };
  }

  rebuildVisibleGeometry() {
    if (!this.width || !this.height) return;
    const margin = 80;
    const nodeData = [];
    const visibleSet = new Set();
    this.visibleNodes = [];
    this.visibleNodeIndices = [];

    for (let index = 0; index < this.nodes.length; index += 1) {
      if (this.filteredNodeSet && !this.filteredNodeSet.has(index)) continue;
      const x = this.positions[index * 2];
      const y = this.positions[index * 2 + 1];
      const screen = this.worldToScreen(x, y);
      if (screen.x < -margin || screen.y < -margin || screen.x > this.width + margin || screen.y > this.height + margin) {
        continue;
      }
      const node = this.nodes[index];
      visibleSet.add(index);
      this.visibleNodes.push(node);
      this.visibleNodeIndices.push(index);
      nodeData.push(x, y, node.size, ...node.color);
    }

    const edgeData = [];
    for (const edge of this.edges) {
      if (!visibleSet.has(edge.source) && !visibleSet.has(edge.target)) continue;
      if (this.filteredNodeSet && (!this.filteredNodeSet.has(edge.source) || !this.filteredNodeSet.has(edge.target))) continue;
      edgeData.push(
        this.positions[edge.source * 2],
        this.positions[edge.source * 2 + 1],
        this.positions[edge.target * 2],
        this.positions[edge.target * 2 + 1],
      );
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nodeData), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeData), gl.DYNAMIC_DRAW);
    this.visibleNodeCount = nodeData.length / 7;
    this.visibleEdgeVertexCount = edgeData.length / 2;
    this.needsGeometry = false;
  }

  requestRender() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }

  render() {
    if (!this.width || !this.height) return;
    if (this.needsGeometry) this.rebuildVisibleGeometry();
    const gl = this.gl;
    gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const viewport = [this.width, this.height];
    const pan = [this.panX, this.panY];

    gl.useProgram(this.edgeProgram);
    gl.uniform2fv(gl.getUniformLocation(this.edgeProgram, "u_viewport"), viewport);
    gl.uniform2fv(gl.getUniformLocation(this.edgeProgram, "u_pan"), pan);
    gl.uniform1f(gl.getUniformLocation(this.edgeProgram, "u_zoom"), this.zoom);
    gl.uniform4f(
      gl.getUniformLocation(this.edgeProgram, "u_edgeColor"),
      0.55,
      0.63,
      0.72,
      this.settings.edgeOpacity,
    );
    gl.bindVertexArray(this.edgeVao);
    gl.drawArrays(gl.LINES, 0, this.visibleEdgeVertexCount);

    gl.useProgram(this.nodeProgram);
    gl.uniform2fv(gl.getUniformLocation(this.nodeProgram, "u_viewport"), viewport);
    gl.uniform2fv(gl.getUniformLocation(this.nodeProgram, "u_pan"), pan);
    gl.uniform1f(gl.getUniformLocation(this.nodeProgram, "u_zoom"), this.zoom);
    gl.uniform1f(gl.getUniformLocation(this.nodeProgram, "u_nodeScale"), this.settings.nodeScale);
    gl.bindVertexArray(this.nodeVao);
    gl.drawArrays(gl.POINTS, 0, this.visibleNodeCount);
    gl.bindVertexArray(null);

    this.renderLabels();
  }

  renderLabels() {
    const context = this.labelContext;
    const ratio = this.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    if (this.zoom < this.settings.labelMinZoom) return;

    const ranked = this.visibleNodeIndices
      .map((index) => ({ index, node: this.nodes[index] }))
      .sort((a, b) => b.node.degree - a.node.degree)
      .slice(0, this.settings.labelLimit);

    context.font = "11px var(--font-interface, sans-serif)";
    context.textBaseline = "middle";
    context.lineWidth = 3;
    context.strokeStyle = "rgba(0,0,0,.58)";
    context.fillStyle = "rgba(235,240,248,.94)";

    for (const entry of ranked) {
      const x = this.positions[entry.index * 2];
      const y = this.positions[entry.index * 2 + 1];
      const screen = this.worldToScreen(x, y);
      const offset = entry.node.size * 0.7 + 4;
      context.strokeText(entry.node.label, screen.x + offset, screen.y);
      context.fillText(entry.node.label, screen.x + offset, screen.y);
    }
  }

  hitTest(clientX, clientY, rect) {
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    let best = null;
    let bestDistance = Infinity;
    for (const index of this.visibleNodeIndices) {
      const screen = this.worldToScreen(this.positions[index * 2], this.positions[index * 2 + 1]);
      const dx = localX - screen.x;
      const dy = localY - screen.y;
      const distance = dx * dx + dy * dy;
      const radius = Math.max(8, this.nodes[index].size * 1.4);
      if (distance <= radius * radius && distance < bestDistance) {
        best = this.nodes[index];
        bestDistance = distance;
      }
    }
    return best;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    const gl = this.gl;
    gl.deleteBuffer(this.nodeBuffer);
    gl.deleteBuffer(this.edgeBuffer);
    gl.deleteVertexArray(this.nodeVao);
    gl.deleteVertexArray(this.edgeVao);
    gl.deleteProgram(this.nodeProgram);
    gl.deleteProgram(this.edgeProgram);
  }
}

class WCTGraphView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.graph = { nodes: [], edges: [] };
    this.worker = null;
    this.paused = false;
    this.dragging = false;
    this.dragMoved = false;
    this.refreshDebounced = debounce(() => this.refreshGraph(), 450);
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return VIEW_NAME;
  }

  getIcon() {
    return "network";
  }

  async onOpen() {
    const content = this.containerEl.children[1];
    content.empty();
    content.addClass("wct-graph-view");

    this.toolbar = content.createDiv({ cls: "wct-graph-toolbar" });
    this.searchInput = this.toolbar.createEl("input", {
      cls: "wct-graph-search",
      attr: { type: "search", placeholder: "Filter nodes and neighbors…" },
    });
    this.fitButton = this.toolbar.createEl("button", { text: "Fit" });
    this.rebuildButton = this.toolbar.createEl("button", { text: "Rebuild" });
    this.pauseButton = this.toolbar.createEl("button", { text: "Pause layout" });
    this.status = this.toolbar.createDiv({ cls: "wct-graph-status" });

    this.stage = content.createDiv({ cls: "wct-graph-stage" });
    this.glCanvas = this.stage.createEl("canvas", { cls: "wct-graph-canvas" });
    this.labelCanvas = this.stage.createEl("canvas", { cls: "wct-graph-labels" });
    this.tooltip = this.stage.createDiv({ cls: "wct-graph-tooltip" });
    this.tooltip.hide();

    try {
      this.renderer = new WebGLGraphRenderer(this.glCanvas, this.labelCanvas, this.plugin.settings);
    } catch (error) {
      this.stage.empty();
      this.stage.createDiv({
        cls: "wct-graph-error",
        text: `WCT Graph could not start: ${error.message}`,
      });
      return;
    }

    this.installEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
    this.resize();
    await this.refreshGraph();
  }

  installEvents() {
    this.searchInput.addEventListener("input", () => {
      this.renderer.setQuery(this.searchInput.value);
      this.updateStatus();
    });
    this.fitButton.addEventListener("click", () => this.renderer.fit());
    this.rebuildButton.addEventListener("click", () => this.refreshGraph());
    this.pauseButton.addEventListener("click", () => {
      this.paused = !this.paused;
      this.pauseButton.textContent = this.paused ? "Resume layout" : "Pause layout";
      if (this.paused) this.stopLayout();
      else this.startLayout();
    });

    this.stage.addEventListener("wheel", (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0012);
      this.renderer.zoomAt(factor, event.clientX, event.clientY, this.stage.getBoundingClientRect());
      this.updateStatus();
    }, { passive: false });

    this.stage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.dragging = true;
      this.dragMoved = false;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.stage.setPointerCapture(event.pointerId);
    });

    this.stage.addEventListener("pointermove", (event) => {
      if (this.dragging) {
        const dx = event.clientX - this.lastPointerX;
        const dy = event.clientY - this.lastPointerY;
        if (Math.abs(dx) + Math.abs(dy) > 1) this.dragMoved = true;
        this.lastPointerX = event.clientX;
        this.lastPointerY = event.clientY;
        this.renderer.pan(dx, dy);
        return;
      }

      const node = this.renderer.hitTest(event.clientX, event.clientY, this.stage.getBoundingClientRect());
      if (!node) {
        this.tooltip.hide();
        this.stage.style.cursor = "grab";
        return;
      }
      this.stage.style.cursor = "pointer";
      this.tooltip.setText(`${node.label}\n${node.path}\n${node.degree} links`);
      this.tooltip.style.left = `${event.offsetX + 14}px`;
      this.tooltip.style.top = `${event.offsetY + 14}px`;
      this.tooltip.show();
    });

    const endPointer = async (event) => {
      if (!this.dragging) return;
      this.dragging = false;
      try { this.stage.releasePointerCapture(event.pointerId); } catch (_) {}
      if (this.dragMoved) return;
      const node = this.renderer.hitTest(event.clientX, event.clientY, this.stage.getBoundingClientRect());
      if (node) await this.app.workspace.openLinkText(node.path, "", true);
    };
    this.stage.addEventListener("pointerup", endPointer);
    this.stage.addEventListener("pointercancel", () => { this.dragging = false; });
    this.stage.addEventListener("dblclick", () => this.renderer.fit());
  }

  resize() {
    if (!this.renderer) return;
    const rect = this.stage.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
  }

  async refreshGraph() {
    if (!this.renderer) return;
    this.stopLayout();
    this.status.setText("Indexing vault graph…");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.graph = GraphIndex.build(this.app, this.plugin.settings);
    this.renderer.settings = this.plugin.settings;
    this.renderer.setGraph(this.graph);
    this.updateStatus();
    if (!this.paused) this.startLayout();
  }

  requestRefresh() {
    this.refreshDebounced();
  }

  startLayout() {
    if (!this.graph.nodes.length || this.paused) return;
    this.stopLayout();
    this.worker = createLayoutWorker();
    this.worker.onmessage = (event) => {
      if (event.data.type !== "positions") return;
      this.renderer.setPositions(new Float32Array(event.data.positions));
      this.updateStatus(event.data.iteration, event.data.done);
      if (event.data.done) this.stopLayout(false);
    };
    this.worker.onerror = (error) => {
      console.error("WCT Graph layout worker failed", error);
      new Notice("WCT Graph layout worker stopped");
      this.stopLayout();
    };

    const positions = new Float32Array(this.renderer.positions);
    const edgePairs = new Uint32Array(this.graph.edges.length * 2);
    this.graph.edges.forEach((edge, index) => {
      edgePairs[index * 2] = edge.source;
      edgePairs[index * 2 + 1] = edge.target;
    });
    const degrees = new Float32Array(this.graph.nodes.map((node) => node.degree));

    this.worker.postMessage({
      type: "layout",
      count: this.graph.nodes.length,
      positions: positions.buffer,
      edges: edgePairs.buffer,
      degrees: degrees.buffer,
      iterations: this.plugin.settings.layoutIterations,
      publishEvery: this.plugin.settings.layoutPublishEvery,
    }, [positions.buffer, edgePairs.buffer, degrees.buffer]);
  }

  stopLayout(sendCancel = true) {
    if (!this.worker) return;
    if (sendCancel) this.worker.postMessage({ type: "cancel" });
    this.worker.terminate();
    if (this.worker.__wctUrl) URL.revokeObjectURL(this.worker.__wctUrl);
    this.worker = null;
  }

  updateStatus(iteration = null, done = false) {
    if (!this.renderer) return;
    const visible = this.renderer.visibleNodeCount ?? this.graph.nodes.length;
    const parts = [
      `${this.graph.nodes.length.toLocaleString()} nodes`,
      `${this.graph.edges.length.toLocaleString()} edges`,
      `${visible.toLocaleString()} visible`,
      `${Math.round(this.renderer.zoom * 100)}%`,
    ];
    if (iteration != null && !done) parts.push(`layout ${iteration + 1}/${this.plugin.settings.layoutIterations}`);
    if (this.searchInput?.value) parts.push(`filter: ${this.searchInput.value}`);
    this.status.setText(parts.join(" · "));
  }

  async onClose() {
    this.stopLayout();
    this.resizeObserver?.disconnect();
    this.renderer?.destroy();
  }
}

class WCTGraphSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "WCT Graph Engine" });

    new Setting(containerEl)
      .setName("Included folders")
      .setDesc("Comma-separated vault folders to index. Leave empty for the whole vault.")
      .addText((text) => text
        .setValue(this.plugin.settings.includeFolders.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.includeFolders = value.split(",").map((item) => item.trim()).filter(Boolean);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Comma-separated folders omitted from the graph index.")
      .addText((text) => text
        .setValue(this.plugin.settings.excludeFolders.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.excludeFolders = value.split(",").map((item) => item.trim()).filter(Boolean);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Hide orphan notes")
      .setDesc("Exclude notes with no resolved links.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.hideOrphans)
        .onChange(async (value) => {
          this.plugin.settings.hideOrphans = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    new Setting(containerEl)
      .setName("Maximum indexed nodes")
      .setDesc("Highest-degree notes are retained first when the vault exceeds this limit.")
      .addText((text) => text
        .setValue(String(this.plugin.settings.maxNodes))
        .onChange(async (value) => {
          this.plugin.settings.maxNodes = clamp(Math.round(Number(value) || 6000), 100, 50000);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Maximum visible labels")
      .setDesc("Only the highest-degree visible nodes receive labels.")
      .addText((text) => text
        .setValue(String(this.plugin.settings.labelLimit))
        .onChange(async (value) => {
          this.plugin.settings.labelLimit = clamp(Math.round(Number(value) || 140), 0, 1000);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Layout iterations")
      .setDesc("More iterations improve separation but take longer.")
      .addText((text) => text
        .setValue(String(this.plugin.settings.layoutIterations))
        .onChange(async (value) => {
          this.plugin.settings.layoutIterations = clamp(Math.round(Number(value) || 260), 20, 2000);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Automatic rebuild")
      .setDesc("Refresh open WCT Graph views when vault links or files change.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.autoRebuild)
        .onChange(async (value) => {
          this.plugin.settings.autoRebuild = value;
          await this.plugin.saveSettings();
        }));
  }
}

module.exports = class WCTGraphPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE, (leaf) => new WCTGraphView(leaf, this));
    this.addRibbonIcon("network", "Open WCT Graph", () => this.activateView());
    this.addCommand({
      id: "open-wct-graph",
      name: "Open WCT Graph",
      callback: () => this.activateView(),
    });
    this.addCommand({
      id: "rebuild-wct-graph",
      name: "Rebuild open WCT Graph views",
      callback: () => this.refreshViews(),
    });
    this.addSettingTab(new WCTGraphSettingTab(this.app, this));

    const scheduleRefresh = debounce(() => {
      if (this.settings.autoRebuild) this.refreshViews();
    }, 700);
    this.registerEvent(this.app.metadataCache.on("resolved", scheduleRefresh));
    this.registerEvent(this.app.vault.on("create", scheduleRefresh));
    this.registerEvent(this.app.vault.on("delete", scheduleRefresh));
    this.registerEvent(this.app.vault.on("rename", scheduleRefresh));
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  refreshViews() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof WCTGraphView) leaf.view.requestRefresh();
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
    if (!Array.isArray(this.settings.includeFolders)) this.settings.includeFolders = ["Research"];
    if (!Array.isArray(this.settings.excludeFolders)) this.settings.excludeFolders = [".obsidian", "Templates"];
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};