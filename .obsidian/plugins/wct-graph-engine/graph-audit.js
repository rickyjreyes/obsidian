"use strict";

function noteSceneNode(node, x, y, options = {}) {
  return {
    id: node.id,
    path: node.path,
    label: node.label,
    type: node.type,
    kind: "note",
    degree: node.degree ?? 0,
    x,
    y,
    size: options.size ?? Math.max(5, Math.min(16, 5 + Math.log2((node.degree ?? 0) + 1) * 1.5)),
    color: options.color ?? "#7598bf",
    alwaysLabel: options.alwaysLabel ?? false,
    labelPriority: options.labelPriority ?? node.degree ?? 0,
    statuses: node.statuses,
    overallStatus: node.overallStatus,
    auditIssues: node.auditIssues ?? [],
  };
}

function buildAuditScene(graph, settings, issueKey = null) {
  const issues = issueKey
    ? [graph.auditByKey.get(issueKey)].filter(Boolean)
    : graph.auditIssues;

  if (!issueKey) {
    const nodes = issues.map((issue, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, issues.length)) * Math.PI * 2;
      const radiusX = issues.length <= 4 ? 480 : 690;
      const radiusY = issues.length <= 4 ? 340 : 500;
      const severityColor = issue.severity === "high"
        ? "#e05252"
        : issue.severity === "medium"
          ? "#f09a34"
          : "#8993a2";
      return {
        id: `audit:${issue.key}`,
        path: null,
        label: `${issue.label}\n${issue.nodeIds.length} findings`,
        type: "Audit",
        kind: "audit-area",
        auditKey: issue.key,
        degree: issue.nodeIds.length,
        x: Math.cos(angle) * radiusX,
        y: Math.sin(angle) * radiusY,
        size: Math.max(27, Math.min(48, 26 + Math.log2(issue.nodeIds.length + 1) * 3)),
        color: severityColor,
        alwaysLabel: true,
        labelPriority: 700000 + issue.nodeIds.length,
      };
    });

    return {
      key: "audit",
      mode: "audit",
      title: "Research audit",
      auditKey: null,
      nodes,
      edges: [],
      sourceNodeCount: issues.reduce((sum, issue) => sum + issue.nodeIds.length, 0),
      sourceEdgeCount: 0,
      issueCount: issues.length,
    };
  }

  const issue = issues[0];
  if (!issue) {
    return {
      key: `audit:${issueKey}`,
      mode: "audit",
      title: "Research audit",
      auditKey: issueKey,
      nodes: [],
      edges: [],
      sourceNodeCount: 0,
      sourceEdgeCount: 0,
      issueCount: 0,
    };
  }

  const severityColor = issue.severity === "high"
    ? "#e05252"
    : issue.severity === "medium"
      ? "#f09a34"
      : "#8993a2";
  const nodes = [{
    id: `audit:${issue.key}`,
    path: null,
    label: `${issue.label}\n${issue.nodeIds.length} findings`,
    type: "Audit",
    kind: "audit-area",
    auditKey: issue.key,
    degree: issue.nodeIds.length,
    x: 0,
    y: 0,
    size: Math.max(30, Math.min(50, 28 + Math.log2(issue.nodeIds.length + 1) * 3)),
    color: severityColor,
    alwaysLabel: true,
    labelPriority: 800000,
  }];

  const selectedIds = new Set();
  const selected = issue.nodeIds
    .map((id) => graph.byId.get(id))
    .filter(Boolean)
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    .slice(0, settings.maxCategoryNodes ?? 320);

  selected.forEach((node, index) => {
    selectedIds.add(node.id);
    const angle = index * 2.399963229728653;
    const radius = 86 + Math.sqrt(index + 1) * 35;
    nodes.push(noteSceneNode(node,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.82,
      {
        color: {
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
        }[node.type] ?? "#7598bf",
        alwaysLabel: index < 16,
        labelPriority: 350000 - index,
      },
    ));
  });

  const edges = graph.edges
    .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
    .slice(0, 900);

  return {
    key: `audit:${issue.key}`,
    mode: "audit",
    title: issue.label,
    auditKey: issue.key,
    nodes,
    edges,
    sourceNodeCount: selected.length,
    sourceEdgeCount: edges.length,
    issueCount: 1,
  };
}

module.exports = { buildAuditScene };