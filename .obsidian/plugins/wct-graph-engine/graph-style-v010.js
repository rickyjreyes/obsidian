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
.wct-priority-mode-toggle { display: inline-flex; gap: 4px; }
.wct-priority-mode-toggle button.is-active { background: var(--interactive-accent); color: var(--text-on-accent); }
.wct-priority-blockers { display: grid; gap: 3px; }
.wct-priority-blockers span { color: var(--text-muted); }
.wct-priority-exclusion { display: inline-block; margin-top: 3px; padding: 2px 5px; border-radius: 999px; background: rgba(240,154,52,.12); color: #f4ad4d; }
@media (max-width: 1100px) {
  .wct-priority-controls { grid-template-columns: minmax(220px,1fr) repeat(3,auto); }
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
