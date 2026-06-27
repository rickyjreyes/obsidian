"use strict";

const HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  minus: "−",
  times: "×",
  le: "≤",
  ge: "≥",
  ne: "≠",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  Delta: "Δ",
  theta: "θ",
  Theta: "Θ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  psi: "ψ",
  omega: "ω",
  Omega: "Ω",
  hbar: "ℏ",
  nabla: "∇",
  part: "∂",
  infin: "∞",
};

const MOJIBAKE = new Map([
  ["â€™", "’"], ["â€˜", "‘"], ["â€œ", "“"], ["â€", "”"],
  ["â€“", "–"], ["â€”", "—"], ["âˆ’", "−"], ["â‰¤", "≤"],
  ["â‰¥", "≥"], ["â‰ˆ", "≈"], ["â†’", "→"], ["â†", "←"],
  ["â„", "ℏ"], ["Âµ", "μ"], ["Â±", "±"], ["Â·", "·"],
  ["Î±", "α"], ["Î²", "β"], ["Î³", "γ"], ["Î´", "δ"],
  ["Î¸", "θ"], ["Î»", "λ"], ["Î¼", "μ"], ["Ï€", "π"],
  ["Ï", "ρ"], ["Ïƒ", "σ"], ["Ï„", "τ"], ["Ï†", "φ"],
  ["Ïˆ", "ψ"], ["Ï‰", "ω"], ["Î”", "Δ"], ["Î˜", "Θ"],
  ["Î©", "Ω"], ["âˆ‡", "∇"], ["âˆ‚", "∂"], ["âˆž", "∞"],
]);

const LATEX_PLAIN = [
  [/\\hbar\b/g, "ℏ"], [/\\nabla\b/g, "∇"], [/\\partial\b/g, "∂"],
  [/\\Theta\b/g, "Θ"], [/\\theta\b/g, "θ"], [/\\Delta\b/g, "Δ"],
  [/\\delta\b/g, "δ"], [/\\alpha\b/g, "α"], [/\\beta\b/g, "β"],
  [/\\gamma\b/g, "γ"], [/\\kappa\b/g, "κ"], [/\\lambda\b/g, "λ"],
  [/\\mu\b/g, "μ"], [/\\nu\b/g, "ν"], [/\\pi\b/g, "π"],
  [/\\rho\b/g, "ρ"], [/\\sigma\b/g, "σ"], [/\\tau\b/g, "τ"],
  [/\\phi\b/g, "φ"], [/\\psi\b/g, "ψ"], [/\\omega\b/g, "ω"],
  [/\\Omega\b/g, "Ω"], [/\\infty\b/g, "∞"], [/\\leq?\b/g, "≤"],
  [/\\geq?\b/g, "≥"], [/\\neq\b/g, "≠"], [/\\approx\b/g, "≈"],
  [/\\times\b/g, "×"], [/\\cdot\b/g, "·"], [/\\to\b/g, "→"],
  [/\\in\b/g, "∈"], [/\\pm\b/g, "±"],
];

function decodeEntities(value) {
  return String(value ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, entity) ? HTML_ENTITIES[entity] : match;
  });
}

function decodeEscapedUnicode(value) {
  return String(value ?? "")
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function repairMojibake(value) {
  let text = String(value ?? "");
  for (const [broken, repaired] of MOJIBAKE) text = text.split(broken).join(repaired);
  return text;
}

function normalizeScientificText(value, options = {}) {
  let text = repairMojibake(decodeEscapedUnicode(decodeEntities(value))).normalize("NFC");
  for (const [pattern, replacement] of LATEX_PLAIN) text = text.replace(pattern, replacement);
  text = text
    .replace(/\bDescription(?=[A-Z])/g, "Description: ")
    .replace(/\bKeywords(?=[A-Z])/g, "Keywords: ")
    .replace(/\bAbstract(?=[A-Z])/g, "Abstract: ")
    .replace(/\bOverview(?=[A-Z])/g, "Overview: ")
    .replace(/\bResults(?=[A-Z])/g, "Results: ")
    .replace(/([.!?])(?=[A-Z][a-z])/g, "$1 ")
    .replace(/[\t\u00A0]+/g, " ")
    .replace(/ {2,}/g, " ");
  if (options.singleLine) text = text.replace(/\s+/g, " ").trim();
  return text.trim();
}

function plainScientificText(value) {
  return normalizeScientificText(value, { singleLine: true })
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, label) => label || path.split("/").pop())
    .replace(/[*_`>#]/g, "")
    .replace(/\$+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearch(value) {
  return plainScientificText(value)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMeaningfulLetter(value) {
  const normalized = plainScientificText(value).trim();
  const match = normalized.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase("en-US") : "#";
}

function equationIdentity(value) {
  const text = plainScientificText(value).toUpperCase();
  const match = text.match(/\b(M\d+[A-Z]?|E\d+[A-Z]?|CLE\d+|CM\d+|TOP\d+|CORR\d+|G1|EX|EY|EZ|FA)\b/);
  if (!match) return { family: "Other", prefix: "ZZZ", number: Number.MAX_SAFE_INTEGER, suffix: "", id: "" };
  const id = match[1];
  const family = id.startsWith("CLE") ? "CLE"
    : id.startsWith("CM") ? "CM"
      : id.startsWith("TOP") ? "TOP"
        : id.startsWith("CORR") ? "CORR"
          : id.startsWith("M") ? "Master"
            : id.startsWith("E") ? "Canonical"
              : "Auxiliary";
  const parts = id.match(/^([A-Z]+)(\d+)?([A-Z]?)$/) ?? [];
  return {
    family,
    prefix: parts[1] ?? id,
    number: parts[2] ? Number(parts[2]) : Number.MAX_SAFE_INTEGER,
    suffix: parts[3] ?? "",
    id,
  };
}

function scientificCompare(left, right) {
  return plainScientificText(left).localeCompare(plainScientificText(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function equationCompare(left, right) {
  const a = equationIdentity(left);
  const b = equationIdentity(right);
  const familyOrder = ["Master", "Canonical", "CLE", "CM", "TOP", "CORR", "Auxiliary", "Other"];
  const familyDelta = familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family);
  if (familyDelta) return familyDelta;
  return a.prefix.localeCompare(b.prefix)
    || a.number - b.number
    || a.suffix.localeCompare(b.suffix)
    || scientificCompare(left, right);
}

function compactScientificText(value, max = 520) {
  const text = plainScientificText(value);
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…` : text;
}

module.exports = {
  decodeEntities,
  repairMojibake,
  normalizeScientificText,
  plainScientificText,
  normalizeSearch,
  firstMeaningfulLetter,
  equationIdentity,
  scientificCompare,
  equationCompare,
  compactScientificText,
};