"use strict";

const { buildAuditIssues } = require("./graph-research");

const GENERIC_LABELS = new Set([
  "a", "an", "the", "authors", "author", "aliases", "alias", "comment", "comments",
  "family", "introduction", "overview", "figure", "figures", "table", "tables",
  "appendix", "body", "sources", "source", "metadata", "research notes", "research note",
  "claim", "claims", "definition", "definitions", "equation", "equations", "note", "notes",
  "title", "abstract", "keywords", "status", "confidence", "tags", "id", "type", "section",
  "chapter", "discussion", "conclusion", "conclusions", "results", "methods", "method",
  "purpose", "summary", "description", "background", "references", "reference",
]);

const TYPE_MAP = {
  reference: "References",
  citation: "References",
  bibliography: "References",
  definition: "Glossary",
  concept: "Glossary",
  term: "Glossary",
  equation: "Equations",
  formula: "Equations",
  identity: "Equations",
  claim: "Claims",
  hypothesis: "Claims",
  theorem: "Theorems",
  lemma: "Theorems",
  proposition: "Theorems",
  proof: "Derivations",
  derivation: "Derivations",
  prediction: "Predictions",
  experiment: "Experiments",
  protocol: "Experiments",
  evidence: "Evidence",
  result: "Evidence",
  contradiction: "Contradictions",
  counterexample: "Contradictions",
  artifact: "Artifacts",
  paper: "Papers",
  publication: "Papers",
};

const PREFIX_MAP = {
  References: "REF",
  Glossary: "DEF",
  Equations: "EQ",
  Claims: "CLA",
  Theorems: "THM",
  Derivations: "DRV",
  Predictions: "PRD",
  Experiments: "EXP",
  Evidence: "EVD",
  Contradictions: "CTR",
  Artifacts: "ART",
  Papers: "PAP",
  Projects: "PRJ",
  Maps: "MAP",
  Other: "OBJ",
};

function normalizeType(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "-");
}

function cleanWikiText(value) {
  return String(value ?? "")
    .replace(/^#+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^\[\[([^\]|#]+)(?:#[^\]|]+)?\|([^\]]+)\]\]$/, "$2")
    .replace(/^\[\[([^\]]+)\]\]$/, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, label) => label || path)
    .replace(/^\s*(definition|concept|equation|formula|claim|theorem|lemma|proof|derivation|prediction|experiment|reference|citation|contradiction|counterexample)\s*[-–—:]\s*/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function primaryLabel(app, node) {
  const cache = app.metadataCache.getFileCache(node.file) ?? {};
  const frontmatter = cache.frontmatter ?? {};
  const firstLink = cache.links?.[0];
  const firstHeading = cache.headings?.[0]?.heading;
  const explicit = frontmatter.title ?? frontmatter.name ?? frontmatter.label;
  let candidate = explicit || firstHeading || node.label;

  if (normalizeType(frontmatter.type) === "reference" && firstLink?.displayText) {
    candidate = firstLink.displayText;
  }

  const cleaned = cleanWikiText(candidate);
  return cleaned || node.label;
}

function citationLike(label) {
  const value = String(label ?? "");
  const hasYear = /\b(?:18|19|20)\d{2}\b/.test(value);
  const hasPublication = /\b(?:journal|review|physics|physical|proceedings|letters|nature|science|press|doi|arxiv|volume|vol\.|university)\b/i.test(value);
  const commaCount = (value.match(/,/g) ?? []).length;
  return hasYear && (hasPublication || commaCount >= 2);
}

function semanticType(path, frontmatter, label, fallbackType) {
  const declared = normalizeType(frontmatter?.type);
  if (path.includes("/Artifacts/")) return "Artifacts";
  if (citationLike(label)) return "References";
  if (TYPE_MAP[declared]) return TYPE_MAP[declared];
  return fallbackType;
}

function semanticObjectAllowed(path, frontmatter, label, semanticNodeType) {
  if (!path.startsWith("WaveLock Research/Objects/")) return true;
  const normalized = cleanWikiText(label).toLowerCase().replace(/[.:;,]+$/g, "").trim();
  const declared = normalizeType(frontmatter?.type);

  if (!normalized || normalized.length < 2 || GENERIC_LABELS.has(normalized)) return false;
  if (/^[a-z]$/i.test(normalized)) return false;
  if (/^(figure|table|section|chapter|appendix)\s*\d*$/i.test(normalized)) return false;

  if (["References", "Equations", "Theorems", "Derivations", "Predictions", "Experiments", "Evidence", "Contradictions"].includes(semanticNodeType)) {
    return true;
  }

  if (semanticNodeType === "Claims") {
    return normalized.length >= 12 && !/^(claim|research notes?)$/i.test(normalized);
  }

  if (semanticNodeType === "Glossary") {
    if (citationLike(normalized)) return true;
    const words = normalized.split(/\s+/).filter(Boolean);
    const scientificSignal = /\b(field|operator|functional|curvature|entropy|phase|flux|wave|resonance|mass|energy|mode|stability|lyapunov|topology|soliton|spectrum|spectral|harmonic|quantum|geometry|confinement|density|frequency|symmetry|feedback|coherence|spacetime|dimension|potential|lagrangian|equilibrium|instability|shell|manifold|tensor|scalar|vector)\b/i.test(normalized);
    return normalized.length >= 5 && (words.length >= 2 || scientificSignal);
  }

  if (["reference", "equation", "theorem", "lemma", "proof", "derivation", "prediction", "experiment", "contradiction", "counterexample"].includes(declared)) {
    return true;
  }

  return Number(frontmatter?.confidence ?? 0) >= 0.7 && normalized.length >= 10;
}

function parseDateValue(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
  if (typeof value === "number") {
    const milliseconds = value < 100000000000 ? value * 1000 : value;
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return Date.UTC(Number(text), 0, 1);
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function creationMetadata(file, frontmatter) {
  const candidates = [
    ["idea-date", frontmatter?.idea_date ?? frontmatter?.ideaDate],
    ["created", frontmatter?.created],
    ["created-at", frontmatter?.created_at ?? frontmatter?.createdAt],
    ["creation-date", frontmatter?.creation_date ?? frontmatter?.date_created],
    ["date", frontmatter?.date],
  ];
  for (const [source, value] of candidates) {
    const parsed = parseDateValue(value);
    if (parsed != null) return { createdAt: parsed, dateSource: source };
  }
  const createdAt = Number(file?.stat?.ctime) || Number(file?.stat?.mtime) || Date.now();
  return { createdAt, dateSource: file?.stat?.ctime ? "file-created" : "file-modified" };
}

function typePrefix(type) {
  return PREFIX_MAP[type] ?? "OBJ";
}

function stableMetadata(core, path, frontmatter, type) {
  const explicit = String(frontmatter?.id ?? frontmatter?.uuid ?? frontmatter?.object_id ?? "").trim();
  if (explicit) return { stableId: explicit, stableIdSource: "frontmatter" };
  const digest = core.hashString(path).toString(16).padStart(8, "0").toUpperCase();
  return {
    stableId: `${typePrefix(type)}-${digest}`,
    stableIdSource: "derived-path",
  };
}

function stripSubpath(link) {
  return String(link ?? "").split("#")[0].trim();
}

function rebuildGraph(core, graph, nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const allowed = new Set(byId.keys());
  const filteredEdges = edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target) && edge.source !== edge.target);
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const incoming = new Map(nodes.map((node) => [node.id, []]));

  for (const edge of filteredEdges) {
    const weight = Math.max(1, Number(edge.weight) || 1);
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + weight);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + weight);
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    if (edge.directed) {
      outgoing.get(edge.source)?.push(edge);
      incoming.get(edge.target)?.push(edge);
    }
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;

  const groups = new Map(core.TYPE_ORDER.map((type) => [type, []]));
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

  const rebuilt = {
    ...graph,
    nodes,
    edges: filteredEdges,
    byId,
    adjacency,
    outgoing,
    incoming,
    groups,
    byStableId: new Map(nodes.map((node) => [node.stableId, node.id])),
  };

  rebuilt.auditIssues = buildAuditIssues(rebuilt);
  const generatedObjectsMissingIds = nodes
    .filter((node) => node.path.startsWith("WaveLock Research/Objects/") && node.stableIdSource !== "frontmatter")
    .map((node) => node.id);
  if (generatedObjectsMissingIds.length) {
    rebuilt.auditIssues.push({
      key: "missing-stable-id",
      label: "Objects missing stable IDs",
      description: "Generated research objects that still depend on a filename-derived identifier.",
      severity: "high",
      nodeIds: generatedObjectsMissingIds,
    });
  }
  rebuilt.auditByKey = new Map(rebuilt.auditIssues.map((issue) => [issue.key, issue]));
  for (const node of nodes) node.auditIssues = [];
  for (const issue of rebuilt.auditIssues) {
    for (const id of issue.nodeIds) byId.get(id)?.auditIssues.push(issue.key);
  }
  return rebuilt;
}

function installSemanticGraph(core) {
  if (core.__semanticInstalled) return;
  core.__semanticInstalled = true;

  for (const type of ["Claims", "Theorems", "Contradictions", "Artifacts"]) {
    if (!core.TYPE_ORDER.includes(type)) core.TYPE_ORDER.splice(Math.max(1, core.TYPE_ORDER.length - 2), 0, type);
  }
  Object.assign(core.TYPE_COLORS, {
    Claims: "#d58c36",
    Theorems: "#6f7fe8",
    Contradictions: "#df5555",
    Artifacts: "#64748b",
  });
  Object.assign(core.DEFAULT_SETTINGS, {
    includeFolders: ["Research", "WaveLock Research"],
    includeGeneratedObjects: true,
    semanticObjectsOnly: true,
    timelineMaxNodes: 2200,
    timelineDurationSeconds: 18,
    forceCenter: 18,
    forceRepel: 180,
    forceLinkDistance: 105,
  });

  const OriginalGraphIndex = core.GraphIndex;
  class SemanticGraphIndex {
    static build(app, settings) {
      const includeFolders = [...new Set([
        ...(settings.includeFolders ?? []),
        ...(settings.includeGeneratedObjects === false ? [] : ["WaveLock Research"]),
      ])];
      const base = OriginalGraphIndex.build(app, { ...settings, includeFolders });
      const allMarkdown = app.vault.getMarkdownFiles();
      const idToPath = new Map();
      const basenameToPath = new Map();

      for (const file of allMarkdown) {
        const cache = app.metadataCache.getFileCache(file) ?? {};
        const stableId = String(cache.frontmatter?.id ?? cache.frontmatter?.uuid ?? "").trim();
        if (stableId) idToPath.set(stableId, file.path);
        const baseName = file.basename.toLowerCase();
        if (!basenameToPath.has(baseName)) basenameToPath.set(baseName, file.path);
      }

      let nodes = base.nodes.map((node) => {
        const cache = app.metadataCache.getFileCache(node.file) ?? {};
        const frontmatter = cache.frontmatter ?? {};
        const label = primaryLabel(app, node);
        const type = semanticType(node.path, frontmatter, label, node.type);
        const creation = creationMetadata(node.file, frontmatter);
        const stable = stableMetadata(core, node.path, frontmatter, type);
        return {
          ...node,
          label,
          type,
          frontmatter,
          headings: new Set((cache.headings ?? []).map((heading) => String(heading.heading ?? "").trim().toLowerCase())),
          ...creation,
          ...stable,
          semanticAccepted: semanticObjectAllowed(node.path, frontmatter, label, type),
        };
      });

      if (settings.semanticObjectsOnly !== false) {
        nodes = nodes.filter((node) => node.semanticAccepted);
      }

      const allowedPaths = new Set(nodes.map((node) => node.id));
      const edgeMap = new Map();
      const edgeKey = (edge) => edge.directed
        ? `${edge.source}\u0000${edge.target}\u0000${edge.relation ?? "links"}\u00001`
        : [edge.source, edge.target].sort().join("\u0000") + `\u0000${edge.relation ?? "links"}\u00000`;
      const add = (edge) => {
        if (!allowedPaths.has(edge.source) || !allowedPaths.has(edge.target) || edge.source === edge.target) return;
        const normalized = {
          source: edge.source,
          target: edge.target,
          relation: edge.relation ?? "links",
          directed: Boolean(edge.directed),
          weight: Math.max(1, Number(edge.weight) || 1),
        };
        const key = edgeKey(normalized);
        const existing = edgeMap.get(key);
        if (existing) existing.weight += normalized.weight;
        else edgeMap.set(key, normalized);
      };
      for (const edge of base.edges) add(edge);

      for (const node of nodes) {
        const cache = app.metadataCache.getFileCache(node.file) ?? {};
        for (const link of cache.links ?? []) {
          const rawTarget = stripSubpath(link.link);
          if (!rawTarget) continue;
          let targetPath = idToPath.get(rawTarget);
          if (!targetPath) targetPath = app.metadataCache.getFirstLinkpathDest?.(rawTarget, node.path)?.path;
          if (!targetPath) targetPath = basenameToPath.get(rawTarget.toLowerCase());
          if (!targetPath || !allowedPaths.has(targetPath)) continue;

          if (node.type === "References") {
            const relation = /^art_[a-z0-9]+$/i.test(rawTarget) ? "derived-from" : "cites";
            add({ source: node.id, target: targetPath, relation, directed: true, weight: 2 });
          } else {
            add({ source: node.id, target: targetPath, relation: "links", directed: false, weight: 1 });
          }
        }
      }

      const rebuilt = rebuildGraph(core, base, nodes, [...edgeMap.values()]);
      rebuilt.idToPath = idToPath;
      rebuilt.semanticRejectedCount = base.nodes.length - nodes.length;
      return rebuilt;
    }
  }

  core.GraphIndex = SemanticGraphIndex;
}

module.exports = {
  installSemanticGraph,
  semanticType,
  semanticObjectAllowed,
  creationMetadata,
  stableMetadata,
};