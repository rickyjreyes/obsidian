"use strict";

const DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/rickyjreyes/wct-sympy/main/compiled-registry.json";

const STATUS_MAP = {
  PASS: "pass",
  CONDITIONAL: "conditional",
  DEFINITION: "definition",
  OPEN: "open",
  FAIL: "fail",
  EMPIRICAL: "empirical",
  UNREVIEWED: "unreviewed",
  NOT_APPLICABLE: "not-applicable",
  NOT_TESTED: "untested",
  NONE: "untested",
};

const STATUS_WEIGHTS = {
  pass: 1,
  empirical: 0.85,
  conditional: 0.6,
  definition: 0.35,
  open: 0.15,
  untested: 0.1,
  "not-applicable": null,
  unreviewed: 0,
  fail: 1,
  contradicted: 1,
};

function normalizeStatus(value, fallback = "unreviewed") {
  const raw = String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const normalized = STATUS_MAP[raw] ?? String(value ?? fallback).trim().toLowerCase().replace(/[\s_]+/g, "-");
  return normalized || fallback;
}

function registryEquationId(value) {
  const text = String(value ?? "").toUpperCase();
  const match = text.match(/\b(ME?[1-8](?:A|B)?|E\d+(?:A|B)?|CLE\d+|CM\d+|TOP\d+|CORR\d+|C[1-5]|G1|EX|EY|EZ|FA)\b/);
  if (!match) return null;
  return match[1].replace(/^ME/, "M");
}

function nodeEquationId(node) {
  for (const value of [node.frontmatter?.canonical_id, node.frontmatter?.equation_id, node.stableId, node.label, node.path]) {
    const id = registryEquationId(value);
    if (id) return id;
  }
  return null;
}

function validationProfile(statuses) {
  const entries = Object.entries(statuses ?? {});
  const applicable = entries.filter(([, status]) => status !== "not-applicable");
  const assessed = applicable.filter(([, status]) => status !== "unreviewed");
  const weighted = applicable.reduce((sum, [, status]) => sum + (STATUS_WEIGHTS[status] ?? 0), 0);
  const positive = applicable.filter(([, status]) => ["pass", "empirical"].includes(status)).length;
  const resolved = applicable.filter(([, status]) => ["pass", "empirical", "fail", "contradicted"].includes(status)).length;
  return {
    completion: Math.round((weighted / Math.max(1, applicable.length)) * 100),
    coverage: Math.round((assessed.length / Math.max(1, applicable.length)) * 100),
    resolved: Math.round((resolved / Math.max(1, applicable.length)) * 100),
    positivelyValidated: Math.round((positive / Math.max(1, applicable.length)) * 100),
    applicableDimensions: applicable.length,
    entries: entries.map(([dimension, status]) => ({ dimension, status, weight: STATUS_WEIGHTS[status] ?? 0 })),
    note: "Validation completion summarizes recorded dimensions; it is not a probability that the scientific claim is true.",
  };
}

function overallStatus(statuses) {
  const values = Object.values(statuses ?? {});
  for (const status of ["fail", "contradicted", "open", "conditional", "untested", "definition", "empirical", "pass", "unreviewed"]) {
    if (values.includes(status)) return status;
  }
  return "unreviewed";
}

function markChecklist(node, key, complete) {
  const check = node.completenessProfile?.checks?.find((item) => item.key === key);
  if (!check || !complete) return;
  check.complete = true;
  const checks = node.completenessProfile.checks;
  const total = checks.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const done = checks.reduce((sum, item) => sum + (item.complete ? Number(item.weight) || 0 : 0), 0);
  node.completenessProfile.totalWeight = total;
  node.completenessProfile.completeWeight = done;
  node.completenessProfile.percent = Math.round((done / Math.max(1, total)) * 100);
  node.completenessProfile.missing = checks.filter((item) => !item.complete);
}

async function loadValidationRegistry(plugin, options = {}) {
  if (!options.force && plugin.validationRegistry?.objects?.length) return plugin.validationRegistry;
  const api = globalThis.__WCT_OBSIDIAN_API__;
  if (!api?.requestUrl) return plugin.validationRegistry ?? null;
  const url = plugin.settings?.validationRegistryUrl || DEFAULT_REGISTRY_URL;
  try {
    const response = await api.requestUrl({ url, method: "GET", throw: false });
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    const registry = response.json ?? JSON.parse(response.text);
    if (!Array.isArray(registry?.objects)) throw new Error("Registry has no objects array");
    plugin.validationRegistry = registry;
    plugin.validationRegistryError = null;
    plugin.validationRegistrySyncedAt = new Date().toISOString();
    return registry;
  } catch (error) {
    plugin.validationRegistryError = String(error?.message ?? error);
    console.warn("WCT validation synchronization failed", error);
    return plugin.validationRegistry ?? null;
  }
}

function applyValidationRegistry(graph, registry) {
  const objects = new Map((registry?.objects ?? []).map((item) => [registryEquationId(item.canonical_id), item]).filter(([id]) => id));
  let matched = 0;
  for (const node of graph.nodes) {
    const equationId = nodeEquationId(node);
    const record = equationId ? objects.get(equationId) : null;
    if (!record) continue;
    matched += 1;
    node.registryId = equationId;
    node.validationEvidence = {
      registryId: registry.registry_id,
      schemaVersion: registry.schema_version,
      generatedAt: registry.generated_at,
      symbolicRepository: "rickyjreyes/wct-sympy",
      symbolicSource: record.status?.source_file ?? record.sources?.verification?.path ?? null,
      symbolicChecker: record.verification?.checker ?? [],
      symbolicKind: record.verification?.kind ?? null,
      symbolicLimitations: record.verification?.limitations ?? [],
      formalRepository: "rickyjreyes/wct-lean",
      formalSource: record.formalization?.source ?? null,
      formalDeclarations: record.formalization?.declarations ?? [],
      formalLimitations: record.formalization?.limitations ?? [],
      assumptions: record.assumptions ?? [],
      unresolvedObligations: record.unresolved_obligations ?? [],
    };
    const symbolic = normalizeStatus(record.status?.effective ?? record.verification?.outcome);
    const formal = normalizeStatus(record.formalization?.status);
    const experimental = normalizeStatus(record.empirical_validation?.status);
    const physical = normalizeStatus(node.frontmatter?.physical_status ?? node.statuses?.physical);
    node.statuses = { symbolic, formal, physical, experimental };
    node.overallStatus = overallStatus(node.statuses);
    node.validationProfile = validationProfile(node.statuses);
    node.frontmatter = {
      ...(node.frontmatter ?? {}),
      sympy_status: String(record.status?.effective ?? record.verification?.outcome ?? "UNREVIEWED").toUpperCase(),
      lean_status: String(record.formalization?.status ?? "UNREVIEWED").toUpperCase(),
      sympy_repository: "rickyjreyes/wct-sympy",
      lean_repository: "rickyjreyes/wct-lean",
      sympy_source: record.status?.source_file ?? null,
      lean_source: record.formalization?.source ?? null,
    };
    markChecklist(node, "implementation", Boolean(record.verification?.checker?.length || record.status?.source_file));
    markChecklist(node, "validation", node.validationProfile.coverage >= 50);
    markChecklist(node, "papers", Boolean(record.dependencies?.papers?.length));
  }
  graph.validationRegistrySummary = {
    matched,
    totalRegistryObjects: objects.size,
    counts: registry?.counts ?? {},
    generatedAt: registry?.generated_at ?? null,
    registryId: registry?.registry_id ?? null,
  };
  const applicable = graph.nodes.filter((node) => node.validationProfile);
  graph.validationSummary = {
    ...(graph.validationSummary ?? {}),
    averageCompletion: Math.round(applicable.reduce((sum, node) => sum + (node.validationProfile?.completion ?? 0), 0) / Math.max(1, applicable.length)),
    averageCoverage: Math.round(applicable.reduce((sum, node) => sum + (node.validationProfile?.coverage ?? 0), 0) / Math.max(1, applicable.length)),
    synchronizedObjects: matched,
  };
  return graph;
}

module.exports = {
  DEFAULT_REGISTRY_URL,
  normalizeStatus,
  registryEquationId,
  nodeEquationId,
  validationProfile,
  loadValidationRegistry,
  applyValidationRegistry,
};