"use strict";

const {
  RELATION_COLORS,
  STATUS_COLORS,
  fileMetadata,
  buildExplicitRelationEdges,
  buildAuditIssues,
} = require("./graph-research");

const VIEW_TYPE = "wct-graph-view";
const VIEW_NAME = "WCT Graph";

const DEFAULT_SETTINGS = {
  includeFolders: ["Research"],
  excludeFolders: [".obsidian", "Templates"],
  hideOrphans: true,
  fullEdgeBudget: 1700,
  maxCategoryNodes: 320,
  maxConnectionNodes: 140,
  labelLimit: 90,
  nodeScale: 1,
  edgeOpacity: 0.12,
  autoRebuild: true,
  motionMode: "full",
  showStatusRings: true,
  showRelationArrows: true,
};

const TYPE_ORDER = [
  "Maps",
  "Papers",
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

const TYPE_COLORS = {
  Maps: "#4f86e8",
  Papers: "#9b59d0",
  Glossary: "#43b66f",
  Equations: "#f09a34",
  Derivations: "#e25a52",
  Predictions: "#e6b52e",
  Experiments: "#24b8c5",
  Evidence: "#8ca52e",
  Projects: "#e15f94",
  References: "#8993a2",
  Other: "#7598bf",
};

const AUDIT_COLORS = {
  high: "#e05252",
  medium: "#f09a34",
  low: "#8993a2",
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function basename(path) {
  const file = String(path ?? "").split("/").pop() ?? String(path ?? "");
  return file.endsWith(".md") ? file.slice(0, -3) : file;
}

function classifyPath(path) {
  const value = String(path ?? "").replace(/\\/g, "/");
  const lower = value.toLowerCase();
  if (lower.includes("/00 maps/") || value === "Research/00 - Open This First.md") return "Maps";
  if (lower.includes("/01 literature notes/") || lower.includes("/papers/")) return "Papers";
  if (lower.includes("/02 concepts/") || lower.includes("/03 glossary/") || lower.includes("/glossary/")) return "Glossary";
  if (lower.includes("/04 equations/") || /\/\d+ equations\//i.test(value) || lower.includes("/equations/")) return "Equations";
  if (lower.includes("/derivations/")) return "Derivations";
  if (lower.includes("/predictions/")) return "Predictions";
  if (lower.includes("/experiments/") || lower.includes("/protocols/")) return "Experiments";
  if (lower.includes("/evidence/")) return "Evidence";
  if (lower.includes("/projects/")) return "Projects";
  if (lower.includes("/05 references/") || lower.includes("/references/")) return "References";
  return "Other";
}

function pathAllowed(path, settings) {
  const includes = settings.includeFolders.map((value) => value.trim()).filter(Boolean);
  const excludes = settings.excludeFolders.map((value) => value.trim()).filter(Boolean);
  if (includes.length && !includes.some((folder) => path === folder || path.startsWith(`${folder}/`))) return false;
  return !excludes.some((folder) => path === folder || path.startsWith(`${folder}/`) || path.includes(`/${folder}/`));
}

function edgeKey(edge) {
  if (edge.directed) return `${edge.source}\u0000${edge.target}\u0000${edge.relation}\u00001`;
  const left = edge.source < edge.target ? edge.source : edge.target;
  const right = edge.source < edge.target ? edge.target : edge.source;
  return `${left}\u0000${right}\u0000${edge.relation}\u00000`;
}

function addEdge(edgeMap, edge) {
  const normalized = {
    source: edge.source,
    target: edge.target,
    relation: edge.relation ?? "links",
    directed: Boolean(edge.directed),
    weight: Math.max(1, Number(edge.weight) || 1),
  };
  if (!normalized.directed && normalized.source > normalized.target) {
    [normalized.source, normalized.target] = [normalized.target, normalized.source];
  }
  const key = edgeKey(normalized);
  const current = edgeMap.get(key);
  if (current) current.weight += normalized.weight;
  else edgeMap.set(key, normalized);
}

function stripFrontmatter(content) {
  return String(content ?? "").replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function extractSection(content, headings) {
  const text = stripFrontmatter(content);
  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`^#{2,3}\\s+${escaped}\\s*$`, "im").exec(text);
    if (!match) continue;
    const tail = text.slice(match.index + match[0].length);
    const next = tail.search(/^#{1,3}\s+/m);
    const section = (next >= 0 ? tail.slice(0, next) : tail).trim();
    if (section) return section;
  }
  return "";
}

function firstParagraph(content) {
  const text = stripFrontmatter(content)
    .replace(/^#.+$/gm, "")
    .replace(/^> \[![^\]]+\].*$/gm, "")
    .trim();
  return text.split(/\n\s*\n/).find((part) => {
    const value = part.trim();
    return value && !value.startsWith("-") && !value.startsWith("```") && !value.startsWith("$$");
  })?.trim() ?? "";
}

function firstEquation(content) {
  return String(content ?? "").match(/\$\$[\s\S]*?\$\$/)?.[0]
    ?? String(content ?? "").match(/\$[^\n$]+\$/)?.[0]
    ?? "";
}

function summaryForType(type, content) {
  if (type === "Glossary") {
    return extractSection(content, ["Definition", "Synthesis notes", "Role in the WCT corpus"])
      || firstParagraph(content);
  }
  if (type === "Papers") {
    return extractSection(content, ["Abstract", "Summary", "Description", "Core claim"])
      || firstParagraph(content);
  }
  if (type === "Equations") {
    const equation = firstEquation(content);
    const meaning = extractSection(content, ["Meaning", "Interpretation", "Purpose", "Definition"]);
    return [equation, meaning].filter(Boolean).join("\n\n") || firstParagraph(content);
  }
  if (type === "References") {
    return extractSection(content, ["Summary", "Relevance", "Connection to WCT"])
      || firstParagraph(content);
  }
  return extractSection(content, ["Summary", "Purpose", "Overview", "Definition"])
    || firstParagraph(content);
}

function compactText(value, max = 230) {
  const text = String(value ?? "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, label) => label || basename(path))
    .replace(/[*_`>#]/g, "")
    .replace(/\$+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

class GraphIndex {
  static build(app, settings) {
    const files = app.vault.getMarkdownFiles().filter((file) => pathAllowed(file.path, settings));
    const fileByPath = new Map(files.map((file) => [file.path, file]));
    const metadataByPath = new Map(files.map((file) => [file.path, fileMetadata(app, file)]));
    const edgeMap = new Map();
    const resolved = app.metadataCache.resolvedLinks ?? {};

    for (const [source, destinations] of Object.entries(resolved)) {
      if (!fileByPath.has(source)) continue;
      for (const [target, rawWeight] of Object.entries(destinations ?? {})) {
        if (!fileByPath.has(target) || source === target) continue;
        addEdge(edgeMap, {
          source,
          target,
          relation: "links",
          directed: false,
          weight: rawWeight,
        });
      }
    }

    for (const edge of buildExplicitRelationEdges(app, files, fileByPath, metadataByPath)) {
      addEdge(edgeMap, edge);
    }

    const edges = [...edgeMap.values()];
    const degrees = new Map(files.map((file) => [file.path, 0]));
    for (const edge of edges) {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + edge.weight);
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + edge.weight);
    }

    let nodes = files.map((file) => {
      const metadata = metadataByPath.get(file.path);
      return {
        id: file.path,
        path: file.path,
        label: basename(file.path),
        type: classifyPath(file.path),
        degree: degrees.get(file.path) ?? 0,
        file,
        frontmatter: metadata.frontmatter,
        headings: metadata.headings,
        statuses: metadata.statuses,
        overallStatus: metadata.overallStatus,
        relations: metadata.relations,
        auditIssues: [],
      };
    });

    if (settings.hideOrphans) nodes = nodes.filter((node) => node.degree > 0);
    const allowed = new Set(nodes.map((node) => node.id));
    const filteredEdges = edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
    const outgoing = new Map(nodes.map((node) => [node.id, []]));
    const incoming = new Map(nodes.map((node) => [node.id, []]));

    for (const edge of filteredEdges) {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
      if (edge.directed) {
        outgoing.get(edge.source)?.push(edge);
        incoming.get(edge.target)?.push(edge);
      }
    }

    const groups = new Map(TYPE_ORDER.map((type) => [type, []]));
    for (const node of nodes) {
      if (!groups.has(node.type)) groups.set(node.type, []);
      groups.get(node.type).push(node.id);
    }
    for (const ids of groups.values()) {
      ids.sort((left, right) => {
        const a = byId.get(left);
        const b = byId.get(right);
        return (b?.degree ?? 0) - (a?.degree ?? 0) || String(a?.label).localeCompare(String(b?.label));
      });
    }

    const graph = {
      nodes,
      edges: filteredEdges,
      byId,
      adjacency,
      outgoing,
      incoming,
      groups,
      auditIssues: [],
      auditByKey: new Map(),
    };
    graph.auditIssues = buildAuditIssues(graph);
    graph.auditByKey = new Map(graph.auditIssues.map((issue) => [issue.key, issue]));
    for (const issue of graph.auditIssues) {
      for (const id of issue.nodeIds) byId.get(id)?.auditIssues.push(issue.key);
    }
    return graph;
  }
}

function sceneNode(node, x, y, options = {}) {
  return {
    id: node.id,
    path: node.path,
    label: node.label,
    type: options.type ?? node.type,
    kind: options.kind ?? "note",
    degree: options.degree ?? node.degree ?? 0,
    x,
    y,
    size: options.size ?? clamp(4.8 + Math.log2((node.degree ?? 0) + 1) * 1.45, 4.8, 15),
    color: options.color ?? TYPE_COLORS[options.type ?? node.type] ?? TYPE_COLORS.Other,
    alwaysLabel: options.alwaysLabel ?? false,
    labelPriority: options.labelPriority ?? node.degree ?? 0,
    statuses: node.statuses,
    overallStatus: node.overallStatus,
    auditIssues: node.auditIssues ?? [],
  };
}

function areaNode(type, count, x, y, context = "nodes") {
  return {
    id: `area:${type}`,
    path: null,
    label: `${type}\n${count} ${context}`,
    type,
    kind: "area",
    degree: count,
    x,
    y,
    size: clamp(20 + Math.log2(count + 1) * 2.8, 22, 42),
    color: TYPE_COLORS[type] ?? TYPE_COLORS.Other,
    alwaysLabel: true,
    labelPriority: 500000 + count,
  };
}

function edgeScore(graph, edge) {
  const source = graph.byId.get(edge.source);
  const target = graph.byId.get(edge.target);
  if (!source || !target) return -Infinity;
  const cross = source.type !== target.type ? 4 : 0;
  const map = source.type === "Maps" || target.type === "Maps" ? 5 : 0;
  const typed = edge.relation !== "links" ? 10 : 0;
  return Math.max(1, edge.weight) * 8 + Math.log2(source.degree + 2) + Math.log2(target.degree + 2) + cross + map + typed;
}

function buildFullScene(graph, settings) {
  const present = TYPE_ORDER.filter((type) => (graph.groups.get(type)?.length ?? 0) > 0);
  const centerType = present.includes("Maps") ? "Maps" : present[0];
  const outer = present.filter((type) => type !== centerType);
  const centers = new Map([[centerType, { x: 0, y: 0 }]]);
  outer.forEach((type, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, outer.length)) * Math.PI * 2;
    centers.set(type, { x: Math.cos(angle) * 1180, y: Math.sin(angle) * 790 });
  });

  const nodes = [];
  for (const type of present) {
    const ids = graph.groups.get(type) ?? [];
    const center = centers.get(type);
    nodes.push(areaNode(type, ids.length, center.x, center.y));
    ids.forEach((id, index) => {
      const node = graph.byId.get(id);
      const angle = index * 2.399963229728653 + (hashString(id) % 1000) * 0.0007;
      const radius = 52 + Math.sqrt(index + 1) * 25;
      const jitter = ((hashString(`${id}:r`) % 1000) / 1000 - 0.5) * 20;
      nodes.push(sceneNode(node,
        center.x + Math.cos(angle) * (radius + jitter),
        center.y + Math.sin(angle) * (radius + jitter) * 0.84,
        { alwaysLabel: index < 3, labelPriority: index < 3 ? 180000 - index : node.degree },
      ));
    });
  }

  const edges = [...graph.edges]
    .sort((a, b) => edgeScore(graph, b) - edgeScore(graph, a))
    .slice(0, settings.fullEdgeBudget);

  return {
    key: "full",
    mode: "full",
    title: "Full graph",
    nodes,
    edges,
    sourceNodeCount: graph.nodes.length,
    sourceEdgeCount: graph.edges.length,
  };
}

function buildCategoryScene(graph, type, settings) {
  const ids = (graph.groups.get(type) ?? []).slice(0, settings.maxCategoryNodes);
  const nodes = [areaNode(type, ids.length, 0, 0)];
  ids.forEach((id, index) => {
    const node = graph.byId.get(id);
    const angle = index * 2.399963229728653;
    const radius = 70 + Math.sqrt(index + 1) * 34;
    nodes.push(sceneNode(node, Math.cos(angle) * radius, Math.sin(angle) * radius * 0.82, {
      alwaysLabel: index < 12,
      labelPriority: index < 12 ? 220000 - index : node.degree,
    }));
  });

  const selected = new Set(ids);
  const internalEdges = graph.edges
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((a, b) => edgeScore(graph, b) - edgeScore(graph, a))
    .slice(0, Math.min(1100, ids.length * 6));

  const crossCounts = new Map();
  for (const edge of graph.edges) {
    const sourceSelected = selected.has(edge.source);
    const targetSelected = selected.has(edge.target);
    if (sourceSelected === targetSelected) continue;
    const outside = graph.byId.get(sourceSelected ? edge.target : edge.source);
    if (!outside) continue;
    crossCounts.set(outside.type, (crossCounts.get(outside.type) ?? 0) + edge.weight);
  }

  const external = [...crossCounts.entries()]
    .filter(([other]) => other !== type)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  external.forEach(([other, count], index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, external.length)) * Math.PI * 2;
    const node = areaNode(other, count, Math.cos(angle) * 1180, Math.sin(angle) * 820, "links");
    node.id = `category-link:${type}:${other}`;
    node.kind = "area-link";
    nodes.push(node);
  });

  return {
    key: `category:${type}`,
    mode: "category",
    title: type,
    type,
    nodes,
    edges: internalEdges,
    sourceNodeCount: ids.length,
    sourceEdgeCount: internalEdges.length,
  };
}

function buildConnectionScene(graph, centerId, settings) {
  const center = graph.byId.get(centerId);
  if (!center) return null;
  const neighbors = [...(graph.adjacency.get(centerId) ?? [])]
    .map((id) => graph.byId.get(id))
    .filter(Boolean)
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    .slice(0, settings.maxConnectionNodes);

  const grouped = new Map(TYPE_ORDER.map((type) => [type, []]));
  for (const node of neighbors) grouped.get(node.type)?.push(node);
  const present = TYPE_ORDER.filter((type) => grouped.get(type)?.length);
  const nodes = [sceneNode(center, 0, 0, { size: 28, alwaysLabel: true, labelPriority: 600000 })];

  present.forEach((type, typeIndex) => {
    const list = grouped.get(type);
    const anchorAngle = -Math.PI / 2 + (typeIndex / Math.max(1, present.length)) * Math.PI * 2;
    const anchorX = Math.cos(anchorAngle) * 570;
    const anchorY = Math.sin(anchorAngle) * 430;
    const area = areaNode(type, list.length, anchorX, anchorY, "connected");
    area.id = `connection-area:${centerId}:${type}`;
    nodes.push(area);
    list.forEach((node, index) => {
      const angle = index * 2.399963229728653 + typeIndex * 0.17;
      const radius = 62 + Math.sqrt(index + 1) * 29;
      nodes.push(sceneNode(node,
        anchorX + Math.cos(angle) * radius,
        anchorY + Math.sin(angle) * radius * 0.82,
        { alwaysLabel: index < 6, labelPriority: index < 6 ? 260000 - index : node.degree },
      ));
    });
  });

  const selected = new Set([centerId, ...neighbors.map((node) => node.id)]);
  const edges = graph.edges
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((a, b) => edgeScore(graph, b) - edgeScore(graph, a))
    .slice(0, 850);

  return {
    key: `connections:${centerId}`,
    mode: "connections",
    title: center.label,
    focusId: centerId,
    nodes,
    edges,
    sourceNodeCount: selected.size,
    sourceEdgeCount: edges.length,
  };
}

function buildAuditScene(graph, settings, issueKey = null) {
  const issues = issueKey
    ? [graph.auditByKey.get(issueKey)].filter(Boolean)
    : graph.auditIssues;
  const nodes = [];
  const selectedIds = new Set();

  issues.forEach((issue, issueIndex) => {
    const angle = -Math.PI / 2 + (issueIndex / Math.max(1, issues.length)) * Math.PI * 2;
    const anchorX = issueKey ? 0 : Math.cos(angle) * 760;
    const anchorY = issueKey ? 0 : Math.sin(angle) * 540;
    const hub = {
      id: `audit:${issue.key}`,
      path: null,
      label: `${issue.label}\n${issue.nodeIds.length} findings`,
      type: "Audit",
      kind: "audit-area",
      auditKey: issue.key,
      degree: issue.nodeIds.length,
      x: anchorX,
      y: anchorY,
      size: clamp(24 + Math.log2(issue.nodeIds.length + 1) * 3, 26, 46),
      color: AUDIT_COLORS[issue.severity] ?? AUDIT_COLORS.low,
      alwaysLabel: true,
      labelPriority: 700000 + issue.nodeIds.length,
    };
    nodes.push(hub);

    const ids = issue.nodeIds
      .map((id) => graph.byId.get(id))
      .filter(Boolean)
      .sort((a, b) => b.degree - a.degree)
      .slice(0, issueKey ? settings.maxCategoryNodes : 24);
    ids.forEach((node, index) => {
      selectedIds.add(node.id);
      const localAngle = index * 2.399963229728653;
      const radius = 72 + Math.sqrt(index + 1) * 31;
      nodes.push(sceneNode(node,
        anchorX + Math.cos(localAngle) * radius,
        anchorY + Math.sin(localAngle) * radius * 0.82,
        { alwaysLabel: issueKey ? index < 14 : index < 4, labelPriority: 300000 - index },
      ));
    });
  });

  const edges = graph.edges
    .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .sort((a, b) => edgeScore(graph, b) - edgeScore(graph, a))
    .slice(0, 900);

  const total = issues.reduce((sum, issue) => sum + issue.nodeIds.length, 0);
  return {
    key: issueKey ? `audit:${issueKey}` : "audit",
    mode: "audit",
    title: issueKey ? issues[0]?.label ?? "Audit" : "Research audit",
    auditKey: issueKey,
    nodes,
    edges,
    sourceNodeCount: total,
    sourceEdgeCount: edges.length,
    issueCount: issues.length,
  };
}

function buildSearchScene(graph, query, settings) {
  const normalized = query.trim().toLowerCase();
  const matches = graph.nodes
    .filter((node) => {
      const metadata = [
        node.label,
        node.path,
        node.type,
        node.overallStatus,
        ...Object.values(node.statuses ?? {}),
        ...(node.auditIssues ?? []),
      ].join(" ").toLowerCase();
      return metadata.includes(normalized);
    })
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 40);
  const selected = new Set(matches.map((node) => node.id));
  for (const match of matches) {
    for (const id of [...(graph.adjacency.get(match.id) ?? [])].sort((a, b) => (graph.byId.get(b)?.degree ?? 0) - (graph.byId.get(a)?.degree ?? 0))) {
      if (selected.size >= 210) break;
      selected.add(id);
    }
    if (selected.size >= 210) break;
  }
  const grouped = new Map(TYPE_ORDER.map((type) => [type, []]));
  for (const id of selected) {
    const node = graph.byId.get(id);
    if (node) grouped.get(node.type)?.push(node);
  }
  const present = TYPE_ORDER.filter((type) => grouped.get(type)?.length);
  const nodes = [];
  present.forEach((type, index) => {
    const list = grouped.get(type);
    const angle = -Math.PI / 2 + (index / Math.max(1, present.length)) * Math.PI * 2;
    const anchorX = Math.cos(angle) * 630;
    const anchorY = Math.sin(angle) * 450;
    list.forEach((node, localIndex) => {
      const localAngle = localIndex * 2.399963229728653;
      const radius = 30 + Math.sqrt(localIndex + 1) * 27;
      const direct = matches.some((match) => match.id === node.id);
      nodes.push(sceneNode(node,
        anchorX + Math.cos(localAngle) * radius,
        anchorY + Math.sin(localAngle) * radius * 0.82,
        {
          size: direct ? clamp(13 + Math.log2(node.degree + 1) * 1.5, 14, 24) : undefined,
          alwaysLabel: direct || localIndex < 3,
          labelPriority: direct ? 400000 + node.degree : node.degree,
        },
      ));
    });
  });
  const edges = graph.edges
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((a, b) => edgeScore(graph, b) - edgeScore(graph, a))
    .slice(0, 850);
  return {
    key: `search:${normalized}`,
    mode: "search",
    title: `Search: ${query}`,
    query,
    nodes,
    edges,
    sourceNodeCount: matches.length,
    sourceEdgeCount: edges.length,
    noMatches: matches.length === 0,
  };
}

module.exports = {
  VIEW_TYPE,
  VIEW_NAME,
  DEFAULT_SETTINGS,
  TYPE_ORDER,
  TYPE_COLORS,
  RELATION_COLORS,
  STATUS_COLORS,
  AUDIT_COLORS,
  clamp,
  debounce,
  hashString,
  basename,
  classifyPath,
  GraphIndex,
  buildFullScene,
  buildCategoryScene,
  buildConnectionScene,
  buildAuditScene,
  buildSearchScene,
  summaryForType,
  compactText,
};