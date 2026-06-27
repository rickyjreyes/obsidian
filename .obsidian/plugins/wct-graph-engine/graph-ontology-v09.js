"use strict";

const research = require("./graph-research");

const TYPE_SHAPES = {
  "WCT Research": "hexagon",
  Maps: "diamond",
  Papers: "document",
  Glossary: "circle",
  Equations: "square",
  Derivations: "triangle",
  Claims: "diamond",
  Theorems: "hexagon",
  Contradictions: "cross",
  Predictions: "star",
  Experiments: "flask",
  Evidence: "ring",
  Repositories: "folder",
  Projects: "rounded-square",
  References: "pill",
  Artifacts: "octagon",
  Other: "circle",
};

function insertAfter(list, value, after) {
  if (list.includes(value)) return;
  const index = list.indexOf(after);
  list.splice(index >= 0 ? index + 1 : list.length, 0, value);
}

function installOntology(core) {
  insertAfter(core.TYPE_ORDER, "Claims", "Derivations");
  insertAfter(core.TYPE_ORDER, "Theorems", "Claims");
  insertAfter(core.TYPE_ORDER, "Contradictions", "Theorems");
  insertAfter(core.TYPE_ORDER, "Repositories", "Experiments");
  insertAfter(core.TYPE_ORDER, "Artifacts", "References");

  Object.assign(core.TYPE_COLORS, {
    Claims: "#d58c36",
    Theorems: "#6f7fe8",
    Contradictions: "#df5555",
    Repositories: "#ef6aa8",
    Artifacts: "#64748b",
    "WCT Research": "#f0f4ff",
  });

  Object.assign(research.RELATION_ALIASES, {
    mentions: "mentions",
    mentioned_by: "mentioned-by",
    "mentioned-by": "mentioned-by",
    contains: "contains",
    contained_by: "contained-by",
    "contained-by": "contained-by",
    states: "states",
    stated_by: "stated-by",
    "stated-by": "stated-by",
    proves: "proves",
    proved_by: "proved-by",
    "proved-by": "proved-by",
    refutes: "refutes",
    refuted_by: "refuted-by",
    "refuted-by": "refuted-by",
    member_of: "member-of",
    "member-of": "member-of",
    has_member: "has-member",
    "has-member": "has-member",
  });

  Object.assign(research.RELATION_COLORS, {
    mentions: "#61a6d8",
    "mentioned-by": "#61a6d8",
    contains: "#9b59d0",
    "contained-by": "#9b59d0",
    states: "#d58c36",
    "stated-by": "#d58c36",
    proves: "#6f7fe8",
    "proved-by": "#6f7fe8",
    refutes: "#df5555",
    "refuted-by": "#df5555",
    "member-of": "#8993a2",
    "has-member": "#8993a2",
  });

  core.TYPE_SHAPES = TYPE_SHAPES;
  core.RELATION_COLORS = research.RELATION_COLORS;
  Object.assign(core.DEFAULT_SETTINGS, {
    retainUnseenNodes: true,
    inferGlossaryMentions: true,
    extractPaperObjects: true,
    glossaryMentionLimit: 80,
    fullPreviewPerType: 28,
    maxCategoryNodes: 1200,
    inspectorWidth: 940,
  });
}

function classifySpecialPath(path, currentType) {
  const lower = String(path ?? "").replace(/\\/g, "/").toLowerCase();
  if (lower.includes("/06 repositories/") || lower.includes("/repositories/")) return "Repositories";
  if (lower.includes("/06 experiments/") || lower.includes("/experiments/") || lower.includes("/protocols/")) return "Experiments";
  if (lower.includes("/04 derivations/") || lower.includes("/derivations/")) return "Derivations";
  if (lower.includes("/03 equations/") || lower.includes("/04 equations/") || lower.includes("/equations/")) return "Equations";
  return currentType;
}

module.exports = {
  TYPE_SHAPES,
  installOntology,
  classifySpecialPath,
};