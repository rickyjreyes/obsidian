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
  maxClusterNodes: 220,
  maxFocusNodes: 240,
  labelLimit: 120,
  labelMinZoom: 0.16,
  nodeScale: 1,
  edgeOpacity: 0.12,
  autoRebuild: true,
};

const GROUP_ORDER = [
  "00 Maps",
  "01 Literature Notes",
  "02 Concepts",
  "03 Equations",
  "04 Derivations",
  "05 Predictions",
  "06 Experiments",
  "07 Evidence",
  "08 Projects",
  "References",
  "Other",
];

const GROUP_LABELS = {
  "00 Maps": "Maps",
  "01 Literature Notes": "Papers",
  "02 Concepts": "Concepts",
  "03 Equations": "Equations",
  "04 Derivations": "Derivations",
  "05 Predictions": "Predictions",
  "06 Experiments": "Experiments",
  "07 Evidence": "Evidence",
  "08 Projects": "Projects",
  References: "References",
  Other: "Other",
};

const GROUP_COLORS = {
  "00 Maps": [0.18, 0.42, 0.88, 1],
  "01 Literature Notes": [0.57, 0.28, 0.77, 1],
  "02 Concepts": [0.20, 0.69, 0.43, 1],
  "03 Equations": [0.94, 0.57, 0.18, 1],
  "04 Derivations": [0.89, 0.33, 0.29, 1],
  "05 Predictions": [0.92, 0.72, 0.13, 1],
  "06 Experiments": [0.09, 0.70, 0.76, 1],
  "07 Evidence": [0.55, 0.66, 0.18, 1],
  "08 Projects": [0.90, 0.37, 0.58, 1],
  References: [0.52, 0.57, 0.64, 1],
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

function basename(path) {
  const file = path.split("/").pop() ?? path;
  return file.endsWith(".md") ? file.slice(0, -3) : file;
}

function groupForPath(path) {
  if (path.includes("/05 References/")) return "References";
  const match = path.match(/Research\/(0[0-8] [^/]+)/);
  return match?.[1] ?? "Other";
}

function pathAllowed(path, settings) {
  const includes = settings.includeFolders.map((value) => value.trim()).filter(Boolean);
  const excludes = settings.excludeFolders.map((value) => value.trim()).filter(Boolean);
  if (includes.length > 0 && !includes.some((folder) => path === folder || path.startsWith(`${folder}/`))) {
    return false;
  }
  return !excludes.some((folder) => path === folder || path.startsWith(`${folder}/`) || path.includes(`/${folder}/`));
}

function sortGroups(groups) {
  return [...groups].sort((left, right) => {
    const leftIndex = GROUP_ORDER.indexOf(left);
    const rightIndex = GROUP_ORDER.indexOf(right);
    if (leftIndex < 0 && rightIndex < 0) return left.localeCompare(right);
    if (leftIndex < 0) return 1;
    if (rightIndex < 0) return -1;
    return leftIndex - rightIndex;
  });
}

class GraphIndex {
  static build(app, settings) {
    const files = app.vault
      .getMarkdownFiles()
      .filter((file) => pathAllowed(file.path, settings));

    const fileByPath = new Map(files.map((file) => [file.path, file]));
    const degree = new Map(files.map((file) => [file.path, 0]));
    const edgeWeights = new Map();
    const resolved = app.metadataCache.resolvedLinks ?? {};

    for (const [source, destinations] of Object.entries(resolved)) {
      if (!fileByPath.has(source)) continue;
      for (const [target, weightValue] of Object.entries(destinations ?? {})) {
        if (!fileByPath.has(target) || source === target) continue;
        const left = source < target ? source : target;
        const right = source < target ? target : source;
        const key = `${left}\u0000${right}`;
        edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + Math.max(1, Number(weightValue) || 1));
        degree.set(source, (degree.get(source) ?? 0) + 1);
        degree.set(target, (degree.get(target) ?? 0) + 1);
      }
    }

    let selectedFiles = files;
    if (settings.hideOrphans) {
      selectedFiles = selectedFiles.filter((file) => (degree.get(file.path) ?? 0) > 0);
    }

    const nodes = selectedFiles.map((file) => {
      const group = groupForPath(file.path);
      return {
        id: file.path,
        path: file.path,
        label: basename(file.path),
        group,
        color: GROUP_COLORS[group] ?? GROUP_COLORS.Other,
        degree: degree.get(file.path) ?? 0,
      };
    });

    const byId = new Map(nodes.map((node) => [node.id, node]));
    const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
    const edges = [];

    for (const [key, weight] of edgeWeights.entries()) {
      const [source, target] = key.split("\u0000");
      if (!byId.has(source) || !byId.has(target)) continue;
      edges.push({ source, target, weight });
      adjacency.get(source).add(target);
      adjacency.get(target).add(source);
    }

    const groups = new Map();
    for (const node of nodes) {
      if (!groups.has(node.group)) groups.set(node.group, []);
      groups.get(node.group).push(node.id);
    }
    for (const ids of groups.values()) {
      ids.sort((left, right) => {
        const delta = (byId.get(right)?.degree ?? 0) - (byId.get(left)?.degree ?? 0);
        return delta || (byId.get(left)?.label ?? "").localeCompare(byId.get(right)?.label ?? "");
      });
    }

    const groupEdges = new Map();
    for (const edge of edges) {
      const sourceGroup = byId.get(edge.source).group;
      const targetGroup = byId.get(edge.target).group;
      if (sourceGroup === targetGroup) continue;
      const left = sourceGroup < targetGroup ? sourceGroup : targetGroup;
      const right = sourceGroup < targetGroup ? targetGroup : sourceGroup;
      const key = `${left}\u0000${right}`;
      const current = groupEdges.get(key) ?? { source: left, target: right, weight: 0, links: 0 };
      current.weight += edge.weight;
      current.links += 1;
      groupEdges.set(key, current);
    }

    return {
      nodes,
      edges,
      byId,
      adjacency,
      groups,
      groupEdges: [...groupEdges.values()],
      orderedGroups: sortGroups(groups.keys()),
    };
  }
}

function noteSceneNode(node, x, y, options = {}) {
  return {
    ...node,
    kind: options.kind ?? "note",
    x,
    y,
    size: options.size ?? clamp(5 + Math.log2(node.degree + 1) * 1.7, 5, 17),
    labelPriority: options.labelPriority ?? node.degree,
    alwaysLabel: options.alwaysLabel ?? false,
  };
}

class SceneBuilder {
  static overview(graph) {
    const groups = graph.orderedGroups.filter((group) => (graph.groups.get(group)?.length ?? 0) > 0);
    const nodes = [];
    const centerGroup = groups.includes("00 Maps") ? "00 Maps" : groups[0];
    const outerGroups = groups.filter((group) => group !== centerGroup);
    const radiusX = 520;
    const radiusY = 340;

    if (centerGroup) {
      const count = graph.groups.get(centerGroup).length;
      nodes.push({
        id: `group:${centerGroup}`,
        kind: "group",
        group: centerGroup,
        label: `${GROUP_LABELS[centerGroup] ?? centerGroup}\n${count} notes`,
        x: 0,
        y: 0,
        size: clamp(24 + Math.sqrt(count) * 1.8, 28, 54),
        color: GROUP_COLORS[centerGroup] ?? GROUP_COLORS.Other,
        degree: count,
        labelPriority: 100000,
        alwaysLabel: true,
      });
    }

    outerGroups.forEach((group, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, outerGroups.length)) * Math.PI * 2;
      const count = graph.groups.get(group).length;
      nodes.push({
        id: `group:${group}`,
        kind: "group",
        group,
        label: `${GROUP_LABELS[group] ?? group}\n${count} notes`,
        x: Math.cos(angle) * radiusX,
        y: Math.sin(angle) * radiusY,
        size: clamp(19 + Math.sqrt(count) * 1.5, 22, 48),
        color: GROUP_COLORS[group] ?? GROUP_COLORS.Other,
        degree: count,
        labelPriority: 90000 + count,
        alwaysLabel: true,
      });
    });

    const present = new Set(nodes.map((node) => node.group));
    const edges = graph.groupEdges
      .filter((edge) => present.has(edge.source) && present.has(edge.target))
      .sort((left, right) => right.links - left.links)
      .slice(0, 32)
      .map((edge) => ({
        source: `group:${edge.source}`,
        target: `group:${edge.target}`,
        weight: edge.links,
      }));

    return {
      mode: "overview",
      title: "WCT Research Overview",
      nodes,
      edges,
      sourceNodeCount: graph.nodes.length,
      sourceEdgeCount: graph.edges.length,
    };
  }

  static cluster(graph, group, settings) {
    const allIds = graph.groups.get(group) ?? [];
    const selectedIds = allIds.slice(0, settings.maxClusterNodes);
    const selectedSet = new Set(selectedIds);
    const nodes = [];
    const hubCount = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(selectedIds.length) / 2)));

    selectedIds.forEach((id, index) => {
      const node = graph.byId.get(id);
      if (index === 0) {
        nodes.push(noteSceneNode(node, 0, 0, {
          size: clamp(12 + Math.log2(node.degree + 1) * 2.2, 14, 24),
          labelPriority: 100000,
          alwaysLabel: true,
        }));
        return;
      }
      if (index < hubCount) {
        const angle = -Math.PI / 2 + ((index - 1) / Math.max(1, hubCount - 1)) * Math.PI * 2;
        nodes.push(noteSceneNode(node, Math.cos(angle) * 150, Math.sin(angle) * 150, {
          size: clamp(9 + Math.log2(node.degree + 1) * 1.8, 10, 20),
          labelPriority: 60000 + node.degree,
          alwaysLabel: index < 5,
        }));
        return;
      }
      const local = index - hubCount;
      const ringCapacity = 28;
      const ring = Math.floor(local / ringCapacity);
      const slot = local % ringCapacity;
      const capacity = Math.min(ringCapacity, selectedIds.length - hubCount - ring * ringCapacity);
      const angle = -Math.PI / 2 + (slot / Math.max(1, capacity)) * Math.PI * 2 + ring * 0.19;
      const radius = 290 + ring * 130;
      const jitter = ((hashString(id) % 1000) / 1000 - 0.5) * 26;
      nodes.push(noteSceneNode(node, Math.cos(angle) * (radius + jitter), Math.sin(angle) * (radius + jitter), {
        labelPriority: node.degree,
      }));
    });

    const internalEdges = graph.edges
      .filter((edge) => selectedSet.has(edge.source) && selectedSet.has(edge.target))
      .sort((left, right) => {
        const score = (edge) => edge.weight * 8 + (graph.byId.get(edge.source)?.degree ?? 0) + (graph.byId.get(edge.target)?.degree ?? 0);
        return score(right) - score(left);
      })
      .slice(0, Math.min(900, selectedIds.length * 5));

    const externalCounts = new Map();
    for (const id of selectedIds) {
      for (const neighborId of graph.adjacency.get(id) ?? []) {
        const neighbor = graph.byId.get(neighborId);
        if (!neighbor || neighbor.group === group) continue;
        externalCounts.set(neighbor.group, (externalCounts.get(neighbor.group) ?? 0) + 1);
      }
    }

    const externalGroups = [...externalCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);
    const externalRadius = 760 + Math.max(0, Math.ceil((selectedIds.length - hubCount) / 28) - 1) * 130;
    externalGroups.forEach(([targetGroup, count], index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, externalGroups.length)) * Math.PI * 2;
      nodes.push({
        id: `group-link:${targetGroup}`,
        kind: "group-link",
        group: targetGroup,
        label: `${GROUP_LABELS[targetGroup] ?? targetGroup}\n${count} cross-links`,
        x: Math.cos(angle) * externalRadius,
        y: Math.sin(angle) * externalRadius,
        size: clamp(17 + Math.sqrt(count), 18, 34),
        color: GROUP_COLORS[targetGroup] ?? GROUP_COLORS.Other,
        degree: count,
        labelPriority: 80000 + count,
        alwaysLabel: true,
      });
    });

    const crossEdges = externalGroups.map(([targetGroup, count]) => ({
      source: selectedIds[0],
      target: `group-link:${targetGroup}`,
      weight: count,
    }));

    return {
      mode: "cluster",
      group,
      title: GROUP_LABELS[group] ?? group,
      nodes,
      edges: [...internalEdges, ...crossEdges],
      sourceNodeCount: allIds.length,
      sourceEdgeCount: internalEdges.length,
      truncated: allIds.length > selectedIds.length,
    };
  }

  static focus(graph, query, settings) {
    const normalized = query.trim().toLowerCase();
    const matches = graph.nodes
      .filter((node) => node.label.toLowerCase().includes(normalized) || node.path.toLowerCase().includes(normalized))
      .sort((left, right) => right.degree - left.degree)
      .slice(0, 32);
    const selectedIds = new Set(matches.map((node) => node.id));
    const neighbors = [];

    for (const match of matches) {
      for (const neighborId of graph.adjacency.get(match.id) ?? []) {
        if (selectedIds.has(neighborId)) continue;
        const neighbor = graph.byId.get(neighborId);
        if (!neighbor) continue;
        neighbors.push(neighbor);
      }
    }

    neighbors.sort((left, right) => right.degree - left.degree || left.label.localeCompare(right.label));
    for (const neighbor of neighbors) {
      if (selectedIds.size >= settings.maxFocusNodes) break;
      selectedIds.add(neighbor.id);
    }

    const selected = [...selectedIds].map((id) => graph.byId.get(id));
    const matchSet = new Set(matches.map((node) => node.id));
    const nodes = [];

    matches.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, matches.length)) * Math.PI * 2;
      const radius = matches.length === 1 ? 0 : 110;
      nodes.push(noteSceneNode(node, Math.cos(angle) * radius, Math.sin(angle) * radius, {
        size: clamp(13 + Math.log2(node.degree + 1) * 2, 14, 25),
        labelPriority: 100000 + node.degree,
        alwaysLabel: true,
      }));
    });

    const nonMatches = selected.filter((node) => !matchSet.has(node.id));
    nonMatches.forEach((node, index) => {
      const ringCapacity = 44;
      const ring = Math.floor(index / ringCapacity);
      const slot = index % ringCapacity;
      const capacity = Math.min(ringCapacity, nonMatches.length - ring * ringCapacity);
      const angle = -Math.PI / 2 + (slot / Math.max(1, capacity)) * Math.PI * 2 + ring * 0.13;
      const radius = 320 + ring * 145;
      nodes.push(noteSceneNode(node, Math.cos(angle) * radius, Math.sin(angle) * radius, {
        labelPriority: node.degree,
      }));
    });

    const edges = graph.edges
      .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
      .sort((left, right) => right.weight - left.weight)
      .slice(0, Math.min(1000, selectedIds.size * 6));

    return {
      mode: "focus",
      query,
      title: `Search: ${query}`,
      nodes,
      edges,
      sourceNodeCount: matches.length,
      sourceEdgeCount: edges.length,
      noMatches: matches.length === 0,
    };
  }
}

class WebGLSceneRenderer {
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
    this.scene = { nodes: [], edges: [] };
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.raf = 0;
    this.initGl();
  }

  initGl() {
    const gl = this.gl;
    const nodeVertex = `#version 300 es
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
        gl_PointSize = clamp(a_size * u_nodeScale, 3.0, 64.0);
        v_color = a_color;
      }
    `;
    const nodeFragment = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        vec2 point = gl_PointCoord * 2.0 - 1.0;
        float radius = dot(point, point);
        if (radius > 1.0) discard;
        float alpha = smoothstep(1.0, 0.68, radius);
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

    this.nodeProgram = this.createProgram(nodeVertex, nodeFragment);
    this.edgeProgram = this.createProgram(edgeVertex, edgeFragment);
    this.nodeVao = gl.createVertexArray();
    this.nodeBuffer = gl.createBuffer();
    this.edgeVao = gl.createVertexArray();
    this.edgeBuffer = gl.createBuffer();

    gl.bindVertexArray(this.nodeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
    const stride = 7 * 4;
    const nodePosition = gl.getAttribLocation(this.nodeProgram, "a_position");
    const nodeSize = gl.getAttribLocation(this.nodeProgram, "a_size");
    const nodeColor = gl.getAttribLocation(this.nodeProgram, "a_color");
    gl.enableVertexAttribArray(nodePosition);
    gl.vertexAttribPointer(nodePosition, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(nodeSize);
    gl.vertexAttribPointer(nodeSize, 1, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(nodeColor);
    gl.vertexAttribPointer(nodeColor, 4, gl.FLOAT, false, stride, 3 * 4);

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
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
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

  setScene(scene) {
    this.scene = scene;
    const nodeById = new Map(scene.nodes.map((node) => [node.id, node]));
    const nodeData = [];
    for (const node of scene.nodes) nodeData.push(node.x, node.y, node.size, ...node.color);
    const edgeData = [];
    for (const edge of scene.edges) {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;
      edgeData.push(source.x, source.y, target.x, target.y);
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nodeData), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeData), gl.STATIC_DRAW);
    this.nodeCount = nodeData.length / 7;
    this.edgeVertexCount = edgeData.length / 2;
    this.fit();
  }

  resize(width, height, devicePixelRatio) {
    const ratio = Math.min(2, Math.max(1, devicePixelRatio || 1));
    for (const canvas of [this.glCanvas, this.labelCanvas]) {
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    this.width = width;
    this.height = height;
    this.devicePixelRatio = ratio;
    this.requestRender();
  }

  fit() {
    if (!this.scene.nodes.length || !this.width || !this.height) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of this.scene.nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
    const graphWidth = Math.max(160, maxX - minX + 160);
    const graphHeight = Math.max(160, maxY - minY + 160);
    this.zoom = clamp(Math.min(this.width / graphWidth, this.height / graphHeight) * 0.92, 0.04, 4);
    this.panX = -((minX + maxX) * 0.5) * this.zoom;
    this.panY = -((minY + maxY) * 0.5) * this.zoom;
    this.requestRender();
  }

  pan(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.requestRender();
  }

  zoomAt(factor, clientX, clientY, rect) {
    const localX = clientX - rect.left - rect.width / 2;
    const localY = clientY - rect.top - rect.height / 2;
    const oldZoom = this.zoom;
    const nextZoom = clamp(oldZoom * factor, 0.035, 16);
    const worldX = (localX - this.panX) / oldZoom;
    const worldY = (localY - this.panY) / oldZoom;
    this.zoom = nextZoom;
    this.panX = localX - worldX * nextZoom;
    this.panY = localY - worldY * nextZoom;
    this.requestRender();
  }

  worldToScreen(x, y) {
    return {
      x: x * this.zoom + this.panX + this.width / 2,
      y: y * this.zoom + this.panY + this.height / 2,
    };
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
    gl.uniform4f(gl.getUniformLocation(this.edgeProgram, "u_edgeColor"), 0.55, 0.64, 0.74, this.settings.edgeOpacity);
    gl.bindVertexArray(this.edgeVao);
    gl.drawArrays(gl.LINES, 0, this.edgeVertexCount);

    gl.useProgram(this.nodeProgram);
    gl.uniform2fv(gl.getUniformLocation(this.nodeProgram, "u_viewport"), viewport);
    gl.uniform2fv(gl.getUniformLocation(this.nodeProgram, "u_pan"), pan);
    gl.uniform1f(gl.getUniformLocation(this.nodeProgram, "u_zoom"), this.zoom);
    gl.uniform1f(gl.getUniformLocation(this.nodeProgram, "u_nodeScale"), this.settings.nodeScale);
    gl.bindVertexArray(this.nodeVao);
    gl.drawArrays(gl.POINTS, 0, this.nodeCount);
    gl.bindVertexArray(null);
    this.renderLabels();
  }

  renderLabels() {
    const context = this.labelContext;
    const ratio = this.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);

    let candidates = this.scene.nodes.filter((node) => node.alwaysLabel || this.zoom >= this.settings.labelMinZoom);
    candidates = candidates
      .sort((left, right) => Number(right.alwaysLabel) - Number(left.alwaysLabel) || right.labelPriority - left.labelPriority)
      .slice(0, this.scene.mode === "overview" ? 30 : this.settings.labelLimit);

    context.textAlign = "center";
    context.textBaseline = "top";
    for (const node of candidates) {
      const screen = this.worldToScreen(node.x, node.y);
      if (screen.x < -140 || screen.y < -60 || screen.x > this.width + 140 || screen.y > this.height + 80) continue;
      const isGroup = node.kind === "group" || node.kind === "group-link";
      const fontSize = isGroup ? 13 : 11;
      context.font = `${isGroup ? 600 : 500} ${fontSize}px system-ui, sans-serif`;
      context.lineWidth = 3.5;
      context.strokeStyle = "rgba(0,0,0,.72)";
      context.fillStyle = "rgba(238,243,250,.96)";
      const lines = String(node.label).split("\n");
      const startY = screen.y + Math.max(7, node.size * this.settings.nodeScale * 0.55 + 5);
      lines.forEach((line, index) => {
        const y = startY + index * (fontSize + 2);
        context.strokeText(line, screen.x, y);
        context.fillText(line, screen.x, y);
      });
    }
  }

  hitTest(clientX, clientY, rect) {
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestDistance = Infinity;
    for (const node of this.scene.nodes) {
      const screen = this.worldToScreen(node.x, node.y);
      const dx = x - screen.x;
      const dy = y - screen.y;
      const distance = dx * dx + dy * dy;
      const radius = Math.max(10, node.size * this.settings.nodeScale * 0.7);
      if (distance <= radius * radius && distance < bestDistance) {
        best = node;
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
    this.graph = null;
    this.scene = null;
    this.mode = "overview";
    this.selectedGroup = null;
    this.dragging = false;
    this.dragMoved = false;
    this.refreshDebounced = debounce(() => this.rebuildGraph(), 450);
    this.searchDebounced = debounce(() => this.applySearch(), 160);
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
    this.backButton = this.toolbar.createEl("button", { text: "Back" });
    this.overviewButton = this.toolbar.createEl("button", { text: "Overview" });
    this.searchInput = this.toolbar.createEl("input", {
      cls: "wct-graph-search",
      attr: { type: "search", placeholder: "Find a paper, concept, equation, or source…" },
    });
    this.fitButton = this.toolbar.createEl("button", { text: "Fit" });
    this.rebuildButton = this.toolbar.createEl("button", { text: "Rebuild" });
    this.status = this.toolbar.createDiv({ cls: "wct-graph-status" });

    this.stage = content.createDiv({ cls: "wct-graph-stage" });
    this.glCanvas = this.stage.createEl("canvas", { cls: "wct-graph-canvas" });
    this.labelCanvas = this.stage.createEl("canvas", { cls: "wct-graph-labels" });
    this.tooltip = this.stage.createDiv({ cls: "wct-graph-tooltip" });
    this.tooltip.hide();

    try {
      this.renderer = new WebGLSceneRenderer(this.glCanvas, this.labelCanvas, this.plugin.settings);
    } catch (error) {
      this.stage.empty();
      this.stage.createDiv({ cls: "wct-graph-error", text: `WCT Graph could not start: ${error.message}` });
      return;
    }

    this.installEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
    this.resize();
    await this.rebuildGraph();
  }

  installEvents() {
    this.backButton.addEventListener("click", () => this.showOverview());
    this.overviewButton.addEventListener("click", () => this.showOverview());
    this.searchInput.addEventListener("input", () => this.searchDebounced());
    this.fitButton.addEventListener("click", () => this.renderer.fit());
    this.rebuildButton.addEventListener("click", () => this.rebuildGraph());

    this.stage.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.renderer.zoomAt(Math.exp(-event.deltaY * 0.0012), event.clientX, event.clientY, this.stage.getBoundingClientRect());
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
      const detail = node.kind === "note" ? `${node.path}\n${node.degree} links` : node.label.replace("\n", " · ");
      this.tooltip.setText(detail);
      this.tooltip.style.left = `${event.offsetX + 14}px`;
      this.tooltip.style.top = `${event.offsetY + 14}px`;
      this.tooltip.show();
    });

    const finishPointer = async (event) => {
      if (!this.dragging) return;
      this.dragging = false;
      try { this.stage.releasePointerCapture(event.pointerId); } catch (_) {}
      if (this.dragMoved) return;
      const node = this.renderer.hitTest(event.clientX, event.clientY, this.stage.getBoundingClientRect());
      if (!node) return;
      if (node.kind === "group" || node.kind === "group-link") {
        this.showGroup(node.group);
      } else if (node.kind === "note") {
        await this.app.workspace.openLinkText(node.path, "", true);
      }
    };
    this.stage.addEventListener("pointerup", finishPointer);
    this.stage.addEventListener("pointercancel", () => { this.dragging = false; });
    this.stage.addEventListener("dblclick", () => this.renderer.fit());
  }

  resize() {
    if (!this.renderer) return;
    const rect = this.stage.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
  }

  async rebuildGraph() {
    if (!this.renderer) return;
    this.status.setText("Indexing research graph…");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.graph = GraphIndex.build(this.app, this.plugin.settings);
    const query = this.searchInput?.value?.trim();
    if (query) this.showFocus(query);
    else if (this.mode === "cluster" && this.selectedGroup) this.showGroup(this.selectedGroup);
    else this.showOverview();
  }

  requestRefresh() {
    this.refreshDebounced();
  }

  setScene(scene) {
    this.scene = scene;
    this.renderer.settings = this.plugin.settings;
    this.renderer.setScene(scene);
    this.backButton.disabled = scene.mode === "overview";
    this.updateStatus();
  }

  showOverview() {
    if (!this.graph) return;
    this.mode = "overview";
    this.selectedGroup = null;
    if (this.searchInput) this.searchInput.value = "";
    this.setScene(SceneBuilder.overview(this.graph));
  }

  showGroup(group) {
    if (!this.graph || !this.graph.groups.has(group)) return;
    this.mode = "cluster";
    this.selectedGroup = group;
    if (this.searchInput) this.searchInput.value = "";
    this.setScene(SceneBuilder.cluster(this.graph, group, this.plugin.settings));
  }

  showFocus(query) {
    if (!this.graph) return;
    this.mode = "focus";
    this.setScene(SceneBuilder.focus(this.graph, query, this.plugin.settings));
  }

  applySearch() {
    const query = this.searchInput.value.trim();
    if (!query) {
      if (this.selectedGroup) this.showGroup(this.selectedGroup);
      else this.showOverview();
      return;
    }
    this.showFocus(query);
  }

  updateStatus() {
    if (!this.scene || !this.graph) return;
    if (this.scene.mode === "overview") {
      this.status.setText(`${this.scene.nodes.length} areas · ${this.graph.nodes.length.toLocaleString()} notes · ${this.graph.edges.length.toLocaleString()} links`);
    } else if (this.scene.mode === "cluster") {
      const truncation = this.scene.truncated ? ` · showing top ${this.scene.nodes.filter((node) => node.kind === "note").length}` : "";
      this.status.setText(`${this.scene.title} · ${this.scene.sourceNodeCount.toLocaleString()} notes${truncation} · ${this.scene.sourceEdgeCount.toLocaleString()} internal links`);
    } else {
      const visibleNotes = this.scene.nodes.filter((node) => node.kind === "note").length;
      this.status.setText(this.scene.noMatches ? `No matches for “${this.scene.query}”` : `${this.scene.sourceNodeCount} matches · ${visibleNotes} focused notes · ${this.scene.sourceEdgeCount} links`);
    }
  }

  async onClose() {
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
      .setDesc("Comma-separated folders indexed by WCT Graph.")
      .addText((text) => text.setValue(this.plugin.settings.includeFolders.join(", ")).onChange(async (value) => {
        this.plugin.settings.includeFolders = value.split(",").map((item) => item.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Comma-separated folders omitted from WCT Graph.")
      .addText((text) => text.setValue(this.plugin.settings.excludeFolders.join(", ")).onChange(async (value) => {
        this.plugin.settings.excludeFolders = value.split(",").map((item) => item.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Hide orphan notes")
      .setDesc("Exclude notes with no resolved links.")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.hideOrphans).onChange(async (value) => {
        this.plugin.settings.hideOrphans = value;
        await this.plugin.saveSettings();
        this.plugin.refreshViews();
      }));

    new Setting(containerEl)
      .setName("Maximum notes per cluster")
      .setDesc("Large categories show highest-degree notes first.")
      .addText((text) => text.setValue(String(this.plugin.settings.maxClusterNodes)).onChange(async (value) => {
        this.plugin.settings.maxClusterNodes = clamp(Math.round(Number(value) || 220), 40, 1000);
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Maximum focused notes")
      .setDesc("Maximum matches and one-hop neighbors displayed by search.")
      .addText((text) => text.setValue(String(this.plugin.settings.maxFocusNodes)).onChange(async (value) => {
        this.plugin.settings.maxFocusNodes = clamp(Math.round(Number(value) || 240), 40, 1000);
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Maximum labels")
      .setDesc("Limits note labels in cluster and search views.")
      .addText((text) => text.setValue(String(this.plugin.settings.labelLimit)).onChange(async (value) => {
        this.plugin.settings.labelLimit = clamp(Math.round(Number(value) || 120), 20, 500);
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Automatic rebuild")
      .setDesc("Refresh open graph views when links or notes change.")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.autoRebuild).onChange(async (value) => {
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
    this.addCommand({ id: "open-wct-graph", name: "Open WCT Graph", callback: () => this.activateView() });
    this.addCommand({ id: "rebuild-wct-graph", name: "Rebuild open WCT Graph views", callback: () => this.refreshViews() });
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