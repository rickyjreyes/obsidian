"use strict";

const { extractStatuses, overallStatus } = require("./graph-research");
const {
  normalizeScientificText,
  normalizeSearch,
  compactScientificText,
} = require("./graph-text-v09");

const OBJECT_TYPES = {
  Claims: { prefix: "CLA-TXT", relation: "states", singular: "claim" },
  Theorems: { prefix: "THM-TXT", relation: "contains", singular: "theorem" },
  Derivations: { prefix: "DRV-TXT", relation: "contains", singular: "derivation" },
  Contradictions: { prefix: "CTR-TXT", relation: "contains", singular: "contradiction" },
};

const CLAIM_HEADING_RE = /^(?:key\s+results?|main\s+claims?|core\s+claims?|claims?|principal\s+results?|findings?|contributions?|significance|predictions?)$/i;
const THEOREM_HEADING_RE = /\b(?:theorems?|lemmas?|propositions?|corollaries?|formal\s+results?|proof\s+results?)\b/i;
const DERIVATION_HEADING_RE = /\b(?:derivations?|proofs?|mathematical\s+development|analytical\s+development|governing\s+equations?|calculation|reduction|construction)\b/i;
const CONTRADICTION_HEADING_RE = /\b(?:contradictions?|counterexamples?|limitations?|failure\s+modes?|falsifiers?|rejection\s+criteria|conflicts?|inconsistencies?)\b/i;
const THEOREM_LINE_RE = /\b(?:theorem|lemma|proposition|corollary|no-go result|upper bound|lower bound)\b/i;
const CONTRADICTION_LINE_RE = /\b(?:contradict|counterexample|falsif|refut|inconsistent|fails? when|cannot hold|not compatible|limitation)\b/i;
const DERIVATION_CUE_RE = /\b(?:derive|derived|derivation|substitut|therefore|hence|thus|yields?|follows from|solving|integrating|differentiating|variation|Euler[- ]Lagrange|saturat|combining)\b/i;
const EQUATION_SIGNAL_RE = /(?:\$\$|\$[^$\n]+\$|=|≈|≃|≤|≥|∂|∇|∫|Σ|Π|√|\b(?:E\d+[A-Z]?|M\d+[A-Z]?|CLE\d+|CM\d+|TOP\d+|CORR\d+)\b)/i;

function stripFrontmatter(content) {
  return String(content ?? "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function splitSections(content) {
  const text = stripFrontmatter(content);
  const matches = [...text.matchAll(/^(#{1,5})\s+(.+?)\s*$/gm)];
  const sections = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    sections.push({
      heading: normalizeScientificText(match[2], { singleLine: true }),
      body: normalizeScientificText(text.slice(start, end)).trim(),
    });
  }
  if (!sections.length && text.trim()) sections.push({ heading: "Document", body: normalizeScientificText(text) });
  return sections;
}

function listItems(body) {
  const items = [];
  let current = "";
  const flush = () => {
    const value = normalizeScientificText(current, { singleLine: true }).replace(/^[-•*\d.)\s]+/, "").trim();
    if (value.length >= 12) items.push(value);
    current = "";
  };
  for (const raw of String(body ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (/^(?:[-*•]|\d+[.)])\s+/.test(line)) {
      flush();
      current = line.replace(/^(?:[-*•]|\d+[.)])\s+/, "");
    } else if (current && line && !/^#{1,5}\s+/.test(line)) {
      current += ` ${line}`;
    } else if (!line) {
      flush();
    }
  }
  flush();
  return items;
}

function sentenceItems(body) {
  return normalizeScientificText(body, { singleLine: true })
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ΘΔΨΩ])/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 24 && item.length <= 900);
}

function uniqueItems(items, limit = 120) {
  const result = [];
  const seen = new Set();
  for (const item of items) {
    const text = normalizeScientificText(item, { singleLine: true }).trim();
    const key = normalizeSearch(text);
    if (!key || key.length < 10 || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function equationDensity(body) {
  return String(body ?? "").split(/\r?\n/).filter((line) => EQUATION_SIGNAL_RE.test(line)).length;
}

function extractPaperObjects(content) {
  const objects = [];
  const add = (type, heading, values, mode) => {
    for (const [index, value] of uniqueItems(values).entries()) {
      objects.push({ type, heading, text: value, mode, localIndex: index + 1 });
    }
  };

  for (const section of splitSections(content)) {
    const heading = section.heading.replace(/^\d+(?:\.\d+)*\s+/, "").trim();
    const bullets = listItems(section.body);
    const sentences = sentenceItems(section.body);

    if (CLAIM_HEADING_RE.test(heading)) add("Claims", heading, bullets.length ? bullets : sentences, "explicit-claim-section");

    if (THEOREM_HEADING_RE.test(heading)) {
      add("Theorems", heading, bullets.length ? bullets : sentences, "explicit-theorem-section");
    } else {
      add("Theorems", heading, [...bullets, ...sentences].filter((item) => THEOREM_LINE_RE.test(item)), "theorem-language");
    }

    if (DERIVATION_HEADING_RE.test(heading)) {
      if (section.body.length >= 40) add("Derivations", heading, [section.body], "explicit-derivation-section");
    } else if (equationDensity(section.body) >= 3 && DERIVATION_CUE_RE.test(section.body)) {
      add("Derivations", heading, [section.body], "equation-chain");
    }

    if (CONTRADICTION_HEADING_RE.test(heading)) {
      add("Contradictions", heading, bullets.length ? bullets : sentences, "explicit-contradiction-section");
    } else {
      add("Contradictions", heading, [...bullets, ...sentences].filter((item) => CONTRADICTION_LINE_RE.test(item)), "contradiction-language");
    }
  }

  const lines = normalizeScientificText(stripFrontmatter(content)).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  add("Theorems", "Detected theorem statements", lines.filter((line) => THEOREM_LINE_RE.test(line)), "theorem-line");
  add("Contradictions", "Detected contradictions", lines.filter((line) => CONTRADICTION_LINE_RE.test(line)), "contradiction-line");

  const deduped = [];
  const seen = new Set();
  for (const object of objects) {
    const key = `${object.type}\u0000${normalizeSearch(object.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(object);
  }
  return deduped;
}

function virtualNode(core, paper, object, ordinal) {
  const hash = core.hashString(`${paper.id}|${object.type}|${object.heading}|${object.text}`).toString(16).padStart(8, "0").toUpperCase();
  const stableId = `${OBJECT_TYPES[object.type]?.prefix ?? "OBJ-TXT"}-${hash}`;
  const statuses = extractStatuses({});
  return {
    id: `virtual:${stableId}`,
    path: paper.path,
    label: compactScientificText(object.text, 120) || `${object.type.slice(0, -1)} ${ordinal}`,
    type: object.type,
    degree: 0,
    file: paper.file,
    frontmatter: {
      id: stableId,
      type: OBJECT_TYPES[object.type]?.singular ?? object.type.toLowerCase(),
      source_paper: paper.path,
      source_heading: object.heading,
      source_index: ordinal,
      extraction_mode: object.mode,
      virtual_object: true,
    },
    headings: new Set([object.type.slice(0, -1).toLowerCase(), object.heading.toLowerCase()]),
    statuses,
    overallStatus: overallStatus(statuses),
    relations: [],
    auditIssues: [],
    stableId,
    stableIdSource: "frontmatter",
    createdAt: Number(paper.createdAt) + ordinal,
    dateSource: `paper:${paper.dateSource ?? "unknown"}`,
    semanticAccepted: true,
    virtual: true,
    virtualContent: object.text,
    sourcePaperId: paper.id,
    sourcePaperPath: paper.path,
    sourcePaperLabel: paper.label,
    sourceHeading: object.heading,
    sourceIndex: ordinal,
    extractionMode: object.mode,
    corpusMember: true,
  };
}

function extractVirtualPaperObjects(core, papers, contents) {
  const nodes = [];
  const edges = [];
  const counts = { Claims: 0, Theorems: 0, Derivations: 0, Contradictions: 0 };
  for (const paper of papers) {
    const objects = extractPaperObjects(contents.get(paper.id) ?? "");
    let ordinal = 0;
    for (const object of objects) {
      ordinal += 1;
      const node = virtualNode(core, paper, object, ordinal);
      nodes.push(node);
      counts[object.type] += 1;
      edges.push({
        source: paper.id,
        target: node.id,
        relation: OBJECT_TYPES[object.type]?.relation ?? "contains",
        directed: true,
        weight: 3,
        inferred: true,
      });
    }
  }
  return { nodes, edges, counts };
}

module.exports = {
  splitSections,
  extractPaperObjects,
  extractVirtualPaperObjects,
};