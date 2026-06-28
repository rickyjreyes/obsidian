"use strict";

const base = require("./graph-inspector-v071");

function addMetric(container, label, value, detail = "") {
  const card = container.createDiv({ cls: "wct-priority-metric-card wct-browser-filter-item" });
  card.createEl("span", { text: label });
  card.createEl("strong", { text: String(value ?? "—") });
  if (detail) card.createEl("small", { text: detail });
}

class InspectorV010 {
  async renderPriorityTab(node, preview, container) {
    await base.renderPriorityTab.call(this, node, preview, container);

    const profile = node.priorityProfile ?? {};
    const scoring = this.inspectorSection(container, "Priority integrity", `Model ${profile.modelVersion ?? "3.0"}`);
    const metrics = scoring.createDiv({ cls: "wct-priority-metric-grid" });
    addMetric(metrics, "Final priority", profile.score, profile.priorityOverride == null ? "Calculated" : "Manual override");
    addMetric(metrics, "Calculated", profile.calculatedScore);
    addMetric(metrics, "Importance", profile.importance);
    addMetric(metrics, "Urgency", profile.urgency);
    addMetric(metrics, "Confidence", profile.confidence);
    addMetric(metrics, "Dependency impact", profile.dependencyImpact);

    const integrity = this.inspectorSection(container, "Canonical-object state");
    const integrityCard = integrity.createDiv({ cls: "wct-integrity-card wct-browser-filter-item" });
    integrityCard.createEl("strong", { text: node.objectState ?? "unknown" });
    integrityCard.createEl("p", { text: node.priorityIncluded === false
      ? `Excluded from canonical scientific priority: ${node.priorityExclusionReason ?? "unspecified reason"}.`
      : "Included in canonical scientific priority." });
    if (node.canonicalId) integrityCard.createEl("small", { text: `Canonical ID: ${node.canonicalId}` });
    if (node.duplicateOf) {
      const duplicate = this.graph.byId.get(node.duplicateOf);
      if (duplicate) {
        const row = integrityCard.createDiv();
        row.createSpan({ text: "Canonical object: " });
        this.createNodeButton(row, duplicate);
      }
    }
    if (node.experimentParent) integrityCard.createEl("small", { text: `Experiment component of: ${node.experimentParent}` });

    const dependency = this.inspectorSection(container, "Dependency-aware work order", node.workPhase ?? "Unassigned phase");
    const dependencyCard = dependency.createDiv({ cls: "wct-dependency-card wct-browser-filter-item" });
    dependencyCard.createEl("p", { text: node.whyItMatters ?? "No dependency explanation recorded." });
    dependencyCard.createEl("p", { text: `Dependency status: ${node.dependencyStatus ?? "unknown"} · depth ${node.dependencyDepth ?? 0} · downstream ${node.downstreamCount ?? 0}` });
    for (const [label, ids] of [["Blocked by", node.blockedBy], ["Blocks", node.blocks]]) {
      const row = dependencyCard.createDiv({ cls: "wct-dependency-links" });
      row.createEl("strong", { text: label });
      if (!ids?.length) row.createSpan({ text: "None" });
      for (const id of ids ?? []) {
        const linked = this.graph.byId.get(id);
        if (linked) this.createNodeButton(row, linked);
      }
    }
    dependencyCard.createEl("p", { text: `Definition of done: ${node.definitionOfDone ?? "Not recorded"}` });

    const evidence = node.validationEvidence;
    if (evidence) {
      const validation = this.inspectorSection(container, "Synchronized validation evidence", evidence.registryId ?? "canonical registry");
      const card = validation.createDiv({ cls: "wct-validation-evidence-card wct-browser-filter-item" });
      card.createEl("p", { text: `Symbolic: ${node.statuses?.symbolic ?? "unreviewed"} · Formal: ${node.statuses?.formal ?? "unreviewed"} · Physical: ${node.statuses?.physical ?? "unreviewed"} · Experimental: ${node.statuses?.experimental ?? "unreviewed"}` });
      card.createEl("small", { text: `SymPy source: ${evidence.symbolicSource ?? "not mapped"}` });
      card.createEl("small", { text: `Lean source: ${evidence.formalSource ?? "not mapped"}` });
      if (evidence.symbolicChecker?.length) card.createEl("small", { text: `Checker: ${evidence.symbolicChecker.join(", ")}` });
      if (evidence.formalDeclarations?.length) card.createEl("small", { text: `Declarations: ${evidence.formalDeclarations.join(", ")}` });
      card.createEl("p", { text: "Symbolic or formal status does not imply physical correctness or experimental validation." });
    }
  }
}

const methods = {};
for (const name of Object.getOwnPropertyNames(InspectorV010.prototype)) {
  if (name !== "constructor") Object.defineProperty(methods, name, Object.getOwnPropertyDescriptor(InspectorV010.prototype, name));
}

module.exports = methods;
