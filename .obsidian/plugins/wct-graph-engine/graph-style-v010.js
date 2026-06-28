"use strict";

const STYLE_ID = "wct-graph-engine-v010-styles";

const CSS = `
.wct-priority-panel { width: min(1540px, calc(100% - 18px)); }
.wct-priority-controls { grid-template-columns: minmax(280px, 1fr) repeat(5, auto); }
.wct-priority-table { min-width: 1900px; }
.wct-priority-table th,
.wct-priority-table td { font-size: 8.5px; }
.wct-priority-object-state,
.wct-priority-validation-status,
.wct-priority-phase { color: var(--text-muted); }
.wct-priority-object-state.is-excluded { color: #f09a34; }
.wct-priority-number.is-confidence { color: #55cf7d; font-weight: 750; }
.wct-priority-number.is-dependency { color: #c58af9; font-weight: 750; }
.wct-priority-validation-grid { display: grid; grid-template-columns: repeat(4, minmax(58px, auto)); gap: 3px; }
.wct-priority-validation-grid span { padding: 2px 4px; border-radius: 4px; background: var(--background-secondary); white-space: nowrap; }
.wct-priority-validation-grid .pass,
.wct-priority-validation-grid .empirical { color: #55cf7d; }
.wct-priority-validation-grid .conditional,
.wct-priority-validation-grid .definition { color: #e8bd37; }
.wct-priority-validation-grid .open,
.wct-priority-validation-grid .untested,
.wct-priority-validation-grid .unreviewed { color: #f09a34; }
.wct-priority-validation-grid .fail,
.wct-priority-validation-grid .contradicted { color: #e05252; }
.wct-priority-mode-toggle { display: flex; flex-wrap: wrap; gap: 4px; padding: 7px 9px; border-bottom: 1px solid var(--background-modifier-border); }
.wct-priority-mode-toggle button.is-active { background: var(--interactive-accent); color: var(--text-on-accent); }
.wct-priority-blockers { display: grid; gap: 3px; }
.wct-priority-blockers span { color: var(--text-muted); }
.wct-priority-exclusion { display: inline-block; margin-top: 3px; padding: 2px 5px; border-radius: 999px; background: rgba(240,154,52,.12); color: #f4ad4d; }

.wct-priority-metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.wct-priority-metric-card { padding: 9px 10px; border: 1px solid var(--background-modifier-border); border-top: 3px solid var(--interactive-accent); border-radius: 7px; background: var(--background-secondary); }
.wct-priority-metric-card span,
.wct-priority-metric-card small { display: block; color: var(--text-muted); }
.wct-priority-metric-card strong { display: block; margin: 3px 0; font-family: var(--font-monospace); font-size: 1.35em; }
.wct-integrity-card,
.wct-dependency-card,
.wct-validation-evidence-card { padding: 10px 11px; border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent); border-radius: 7px; background: var(--background-secondary); }
.wct-integrity-card > strong { text-transform: uppercase; letter-spacing: .05em; }
.wct-integrity-card p,
.wct-dependency-card p,
.wct-validation-evidence-card p { color: var(--text-muted); line-height: 1.45; }
.wct-validation-evidence-card small { display: block; margin-top: 4px; color: var(--text-faint); overflow-wrap: anywhere; }
.wct-dependency-links { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin: 6px 0; }
.wct-dependency-links > strong { min-width: 76px; color: var(--text-muted); }

@media (max-width: 1100px) {
  .wct-priority-controls { grid-template-columns: minmax(220px,1fr) repeat(3,auto); }
}
@media (max-width: 760px) {
  .wct-priority-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;

function installStyles(plugin) {
  document.getElementById(STYLE_ID)?.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  plugin.register(() => style.remove());
}

module.exports = { installStyles };
