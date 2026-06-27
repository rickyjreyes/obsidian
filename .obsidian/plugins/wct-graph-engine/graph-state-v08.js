"use strict";

const {
  decorateGraph,
  priorityProfile,
} = require("./graph-knowledge");

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function connectedByType(graph, node, type) {
  return [...(graph.adjacency.get(node.id) ?? [])]
    .map((id) => graph.byId.get(id))
    .filter((candidate) => candidate?.type === type);
}

function truthy(value) {
  if (value === true || value === 1) return true;
  return ["true", "yes", "verified", "complete", "done", "pass"].includes(String(value ?? "").trim().toLowerCase());
}

function recomputeCompleteness(profile) {
  const checks = profile.checks ?? [];
  const totalWeight = checks.reduce((sum, check) => sum + (Number(check.weight) || 0), 0);
  const completeWeight = checks.reduce((sum, check) => sum + (check.complete ? Number(check.weight) || 0 : 0), 0);
  profile.totalWeight = totalWeight;
  profile.completeWeight = completeWeight;
  profile.percent = Math.round((completeWeight / Math.max(1, totalWeight)) * 100);
  profile.missing = checks.filter((check) => !check.complete);
  return profile;
}

function addCheck(profile, check) {
  if ((profile.checks ?? []).some((existing) => existing.key === check.key)) return;
  profile.checks.push(check);
  recomputeCompleteness(profile);
}

function applyPdfChecks(graph, node) {
  const profile = node.completenessProfile;
  if (!profile) return;

  if (node.type === "Papers" && node.frontmatter?.pdf_url) {
    const derivations = connectedByType(graph, node, "Derivations");
    addCheck(profile, {
      key: "pdf-derivations",
      label: "PDF derivations imported",
      complete: derivations.length > 0,
      weight: 2.5,
      reason: "Run WCT Graph Engine: Import PDF Derivations, then review the generated page-provenance objects.",
    });
  }

  if (node.type === "Derivations" && String(node.frontmatter?.source_kind ?? "").toLowerCase() === "pdf") {
    addCheck(profile, {
      key: "pdf-pages",
      label: "PDF page provenance",
      complete: Boolean(node.frontmatter?.source_pages || node.frontmatter?.source_page_start),
      weight: 1.5,
      reason: "Record the exact source page range for this derivation.",
    });
    addCheck(profile, {
      key: "human-verification",
      label: "Human verification",
      complete: truthy(node.frontmatter?.human_verified),
      weight: 2,
      reason: "Compare the extracted derivation with the rendered PDF and mark human_verified: true.",
    });
    addCheck(profile, {
      key: "canonical-latex",
      label: "Canonical LaTeX",
      complete: truthy(node.frontmatter?.canonical_latex_verified),
      weight: 1.5,
      reason: "Replace extraction-only equation text with the canonical rendered LaTeX equation object.",
    });
  }
}

function decorateGraphState(graph) {
  decorateGraph(graph);
  for (const node of graph.nodes) applyPdfChecks(graph, node);
  for (const node of graph.nodes) node.priorityProfile = priorityProfile(graph, node);
  graph.priorityNodes = [...graph.nodes]
    .sort((a, b) => (b.priorityProfile?.score ?? 0) - (a.priorityProfile?.score ?? 0)
      || (b.degree ?? 0) - (a.degree ?? 0)
      || a.label.localeCompare(b.label));
  graph.validationSummary.averageResearchCompleteness = Math.round(
    graph.nodes.reduce((sum, node) => sum + (node.completenessProfile?.percent ?? 0), 0)
      / Math.max(1, graph.nodes.length),
  );
  return graph;
}

function validationState(node) {
  const statuses = node.statuses ?? {};
  const entries = Object.entries(statuses);
  const assessed = entries.filter(([, status]) => status !== "unreviewed").length;
  const passed = entries.filter(([, status]) => ["pass", "empirical"].includes(status)).length;
  const unresolved = entries.filter(([, status]) => ["open", "conditional", "untested", "unreviewed"].includes(status)).length;
  const failed = entries.filter(([, status]) => ["fail", "contradicted"].includes(status)).length;
  return { entries, assessed, passed, unresolved, failed };
}

function currentState(graph, node) {
  const validation = validationState(node);
  const missing = node.completenessProfile?.missing ?? [];
  const pdfUrl = node.frontmatter?.pdf_url;
  const pdfDerivations = connectedByType(graph, node, "Derivations")
    .filter((candidate) => String(candidate.frontmatter?.source_kind ?? "").toLowerCase() === "pdf");

  let label = titleCase(node.overallStatus ?? "unreviewed");
  let summary = `${validation.assessed}/4 validation dimensions assessed; ${missing.length} required completion items missing.`;
  let tone = "open";

  if (validation.failed > 0) {
    label = "Failed or contradicted";
    summary = `${validation.failed} validation dimension${validation.failed === 1 ? "" : "s"} failed or contradicted and requires resolution.`;
    tone = "blocked";
  } else if (pdfUrl && pdfDerivations.length === 0) {
    label = "PDF derivations not imported";
    summary = "The full-text PDF is known, but no page-provenance derivation objects are connected to this paper yet.";
    tone = "missing";
  } else if (node.type === "Derivations" && String(node.frontmatter?.source_kind ?? "").toLowerCase() === "pdf" && !truthy(node.frontmatter?.human_verified)) {
    label = "PDF extraction awaiting review";
    summary = "Derivation text was extracted from the PDF, but it has not yet been checked against the rendered source pages.";
    tone = "conditional";
  } else if (validation.assessed === 0) {
    label = "Not assessed";
    summary = `No validation dimension has a recorded state; ${missing.length} completion items are still missing.`;
    tone = "unreviewed";
  } else if (missing.length === 0 && validation.unresolved === 0) {
    label = "Complete and resolved";
    summary = `${validation.passed}/4 validation dimensions are positive and no required workflow fields are missing.`;
    tone = "complete";
  } else if (missing.length === 0) {
    label = "Structurally complete; validation open";
    summary = `Required links and fields are present, but ${validation.unresolved} validation dimension${validation.unresolved === 1 ? " remains" : "s remain"} unresolved.`;
    tone = "conditional";
  }

  return {
    label,
    summary,
    tone,
    assessed: validation.assessed,
    passed: validation.passed,
    unresolved: validation.unresolved,
    failed: validation.failed,
    missing,
    missingLabels: missing.map((check) => check.label),
    pdfAvailable: Boolean(pdfUrl),
    pdfDerivationCount: pdfDerivations.length,
  };
}

function decorateCurrentStates(graph) {
  for (const node of graph.nodes) node.currentState = currentState(graph, node);
  return graph;
}

module.exports = {
  decorateGraphState,
  decorateCurrentStates,
  currentState,
  connectedByType,
};