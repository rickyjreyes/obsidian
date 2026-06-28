"use strict";

const STYLE_ID = "wct-graph-engine-v08-styles";

const CSS = `
.wct-graph-root { --wct-inspector-width: 940px; }
.wct-graph-inspector { width: min(var(--wct-inspector-width, 940px), calc(100% - 18px)); max-width: 940px; }

.wct-browser-tabs {
  display: grid !important;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  flex: 0 0 auto;
  width: 100%;
  overflow: visible !important;
  gap: 3px;
  padding: 5px 7px;
}
.wct-browser-tabs button {
  min-width: 0 !important;
  width: 100%;
  padding: 6px 4px;
  white-space: normal !important;
  overflow-wrap: anywhere;
  line-height: 1.15;
  font-size: calc(9px * var(--wct-browser-font-scale, 1));
}

.wct-priority-panel { width: min(1320px, calc(100% - 20px)); max-height: min(76%, 820px); }
.wct-priority-panel.is-collapsed { width: 270px; max-height: 48px; }
.wct-priority-panel.is-collapsed .wct-priority-controls,
.wct-priority-panel.is-collapsed .wct-priority-table-wrap,
.wct-priority-panel.is-collapsed .wct-priority-header small { display: none; }
.wct-priority-controls {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto auto auto auto;
  gap: 7px;
  align-items: center;
  padding: 8px 9px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-primary-alt);
}
.wct-priority-filter, .wct-priority-select {
  min-width: 0;
  height: 31px;
  margin: 0;
  padding: 0 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-normal);
  font-size: 10px;
}
.wct-priority-missing-toggle {
  height: 31px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-muted);
  font-size: 9px;
  white-space: nowrap;
}
.wct-priority-table-wrap { min-height: 0; overflow: auto; padding: 0; }
.wct-priority-table {
  width: 100%;
  min-width: 1240px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  color: var(--text-normal);
  font-size: 9px;
}
.wct-priority-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 7px 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary-alt);
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 750;
  letter-spacing: .04em;
  text-align: left;
  text-transform: uppercase;
}
.wct-priority-table th:nth-child(1) { width: 70px; }
.wct-priority-table th:nth-child(2) { width: 250px; }
.wct-priority-table th:nth-child(3) { width: 100px; }
.wct-priority-table th:nth-child(4) { width: 60px; }
.wct-priority-table th:nth-child(5) { width: 72px; }
.wct-priority-table th:nth-child(6) { width: 72px; }
.wct-priority-table th:nth-child(7) { width: 280px; }
.wct-priority-table th:nth-child(8) { width: 300px; }
.wct-priority-table tbody tr { cursor: pointer; outline: none; }
.wct-priority-table tbody tr:hover,
.wct-priority-table tbody tr:focus { background: color-mix(in srgb, var(--wct-priority-color, var(--interactive-accent)) 8%, var(--background-primary)); }
.wct-priority-table td {
  padding: 7px 8px;
  border-bottom: 1px solid var(--background-modifier-border-hover);
  vertical-align: top;
  overflow-wrap: anywhere;
}
.wct-priority-table td:first-child { border-left: 3px solid var(--wct-priority-color, var(--interactive-accent)); }
.wct-priority-object strong, .wct-priority-state strong { display: block; color: var(--text-normal); font-size: 9.5px; line-height: 1.28; }
.wct-priority-object small, .wct-priority-state small { display: block; margin-top: 3px; color: var(--text-faint); font-size: 7.5px; line-height: 1.32; }
.wct-priority-type { color: var(--wct-priority-color, var(--text-accent)); font-weight: 700; }
.wct-priority-number { color: var(--text-muted); font-family: var(--font-monospace); font-size: 10px; text-align: right; }
.wct-priority-number.is-priority { color: #ee756e; font-size: 12px; font-weight: 800; }
.wct-priority-rank strong, .wct-priority-rank small { display: block; text-align: right; }
.wct-priority-rank strong { color: #ee756e; font-family: var(--font-monospace); font-size: 11px; }
.wct-priority-rank small { color: var(--text-faint); font-size: 7.5px; }
.wct-priority-missing { display: flex; flex-wrap: wrap; gap: 4px; }
.wct-priority-missing span { display: inline-block; padding: 2px 5px; border-radius: 999px; background: rgba(240,154,52,.11); color: #f4ad4d; font-size: 7.5px; line-height: 1.25; }
.wct-priority-missing span.is-complete { background: rgba(53,196,106,.11); color: #55cf7d; }
.wct-priority-missing span.is-more { background: var(--background-modifier-border); color: var(--text-muted); }
.wct-priority-table tr.tone-blocked .wct-priority-state strong { color: #e05252; }
.wct-priority-table tr.tone-missing .wct-priority-state strong { color: #f09a34; }
.wct-priority-table tr.tone-conditional .wct-priority-state strong { color: #e8bd37; }
.wct-priority-table tr.tone-complete .wct-priority-state strong { color: #35c46a; }
.wct-priority-table tr.tone-unreviewed .wct-priority-state strong { color: #8993a2; }
.wct-priority-empty { padding: 22px !important; color: var(--text-muted); text-align: center; }

.wct-current-state-card, .wct-pdf-state-card {
  padding: 11px 12px;
  border: 1px solid var(--background-modifier-border);
  border-left: 4px solid var(--interactive-accent);
  border-radius: 8px;
  background: var(--background-secondary);
}
.wct-current-state-card > strong, .wct-pdf-state-card > strong { display: block; margin-bottom: 4px; font-size: 1.05em; }
.wct-current-state-card > p, .wct-pdf-state-card > p { margin: 0; color: var(--text-muted); line-height: 1.48; }
.wct-current-state-card.tone-blocked, .wct-pdf-state-card.tone-blocked { border-left-color: #e05252; }
.wct-current-state-card.tone-missing, .wct-pdf-state-card.tone-missing { border-left-color: #f09a34; }
.wct-current-state-card.tone-conditional, .wct-pdf-state-card.tone-conditional { border-left-color: #e8bd37; }
.wct-current-state-card.tone-complete, .wct-pdf-state-card.tone-complete { border-left-color: #35c46a; }
.wct-current-state-card.tone-unreviewed, .wct-pdf-state-card.tone-unreviewed { border-left-color: #8993a2; }
.wct-current-state-matrix { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 8px; }
.wct-current-state-dimension { padding: 7px 8px; border: 1px solid color-mix(in srgb, var(--wct-state-color) 35%, var(--background-modifier-border)); border-top: 3px solid var(--wct-state-color); border-radius: 6px; background: var(--background-secondary); }
.wct-current-state-dimension span { display: block; color: var(--text-faint); font-size: .72em; text-transform: uppercase; }
.wct-current-state-dimension strong { display: block; margin-top: 3px; color: var(--wct-state-color); font-size: .9em; }
.wct-missing-detail { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 7px; margin-bottom: 6px; padding: 8px 9px; border: 1px solid rgba(240,154,52,.28); border-left: 3px solid #f09a34; border-radius: 6px; background: rgba(240,154,52,.05); }
.wct-missing-marker { color: #f09a34; font-size: 18px; line-height: 1; }
.wct-missing-detail strong { display: block; color: var(--text-normal); }
.wct-missing-detail p { margin: 3px 0 0; color: var(--text-muted); font-size: .8em; line-height: 1.4; }
.wct-missing-none { padding: 9px 10px; border-left: 3px solid #35c46a; border-radius: 6px; background: rgba(53,196,106,.07); color: var(--text-muted); }
.wct-pdf-state-facts { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.wct-pdf-state-facts span { padding: 3px 6px; border-radius: 999px; background: var(--background-primary); color: var(--text-muted); font-size: .75em; }
.wct-pdf-state-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.wct-pdf-state-actions button { font-size: .8em; }

.wct-graph-tooltip {
  width: min(calc(620px * var(--wct-hover-scale, 1)), calc(100% - 20px));
  max-width: 760px;
  max-height: min(72vh, 720px);
  overflow: auto;
  padding: 12px;
  white-space: normal;
}
.wct-hover-detail { display: grid; gap: 8px; margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--background-modifier-border); }
.wct-hover-definition-detail, .wct-hover-equation-detail, .wct-hover-concept-definitions {
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--wct-hover-color, var(--interactive-accent)) 34%, var(--background-modifier-border));
  border-left: 4px solid var(--wct-hover-color, var(--interactive-accent));
  border-radius: 7px;
  background: rgba(7,10,15,.84);
}
.wct-hover-definition-detail > strong, .wct-hover-equation-detail > strong, .wct-hover-concept-definitions > strong { display: block; margin-bottom: 5px; color: var(--text-normal); font-size: 11px; }
.wct-hover-definition-detail p, .wct-hover-equation-detail p { margin: 4px 0; color: var(--text-muted); font-size: 10.5px; line-height: 1.5; }
.wct-hover-equation-detail .wct-browser-math { margin: 5px 0; padding: 8px; overflow-x: auto; border-radius: 6px; background: var(--background-primary); font-size: 13px; }
.wct-hover-equation-detail .katex-display, .wct-hover-equation-detail mjx-container[display="true"] { min-width: max-content; margin: .35em 0 !important; overflow: visible; }
.wct-hover-equation-relations { display: grid; gap: 4px; margin-top: 7px; }
.wct-hover-equation-relations span { padding: 4px 6px; border-radius: 5px; background: var(--background-secondary); color: var(--text-muted); font-size: 9px; line-height: 1.35; }
.wct-hover-concept-definitions > div { display: grid; grid-template-columns: minmax(110px,.38fr) minmax(0,1fr); gap: 8px; padding: 5px 0; border-top: 1px solid var(--background-modifier-border-hover); }
.wct-hover-concept-definitions b { color: #55cf7d; font-size: 9px; }
.wct-hover-concept-definitions span { color: var(--text-muted); font-size: 9px; line-height: 1.4; }

.wct-reference-definition-card { margin-bottom: 7px; padding: 9px 10px; border: 1px solid rgba(67,182,111,.28); border-left: 4px solid #43b66f; border-radius: 7px; background: rgba(67,182,111,.05); }
.wct-reference-definition-card button { color: #55cf7d; font-weight: 750; }
.wct-reference-definition-card p { margin: 5px 0 0; color: var(--text-muted); line-height: 1.5; }

.wct-equation-relation-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: calc(10px * var(--wct-browser-font-scale,1)); }
.wct-equation-relation-table th, .wct-equation-relation-table td { padding: 6px 7px; border-bottom: 1px solid var(--background-modifier-border-hover); text-align: left; vertical-align: top; overflow-wrap: anywhere; }
.wct-equation-relation-table th { position: sticky; top: 0; z-index: 1; background: var(--background-secondary-alt); color: var(--text-muted); font-size: .78em; text-transform: uppercase; }
.wct-equation-relation-table th:nth-child(1) { width: 58px; }
.wct-equation-relation-table th:nth-child(2) { width: 112px; }
.wct-equation-relation-table th:nth-child(3) { width: 98px; }
.wct-equation-relation-table th:nth-child(5) { width: 92px; }
.wct-equation-relation-table .wct-browser-node-button { width: 100%; text-align: left; white-space: normal; }

.wct-paper-object-card { margin-bottom: 8px; padding: 10px 11px; border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent); border-radius: 7px; background: var(--background-secondary); }
.wct-paper-object-card.type-claims { border-left-color: #d58c36; }
.wct-paper-object-card.type-theorems { border-left-color: #6f7fe8; }
.wct-paper-object-card.type-derivations { border-left-color: #e25a52; }
.wct-paper-object-card.type-contradictions { border-left-color: #df5555; }
.wct-paper-object-card > div:first-child { display: flex; align-items: center; gap: 8px; }
.wct-paper-object-card > div:first-child > span { flex: 0 0 auto; color: var(--text-faint); font-size: .72em; text-transform: uppercase; }
.wct-paper-object-card p { margin: 6px 0 0; color: var(--text-muted); line-height: 1.48; }

.wct-priority-rank-card { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 12px; align-items: center; padding: 11px 13px; border: 1px solid rgba(226,90,82,.32); border-left: 5px solid #e25a52; border-radius: 8px; background: rgba(226,90,82,.06); }
.wct-priority-rank-card > strong { color: #ee756e; font-family: var(--font-monospace); font-size: 27px; }
.wct-priority-rank-card div span, .wct-priority-rank-card div small { display: block; }
.wct-priority-rank-card div span { color: var(--text-normal); font-weight: 700; }
.wct-priority-rank-card div small { margin-top: 3px; color: var(--text-muted); }
.wct-browser-inference-note { margin: 0 0 8px; color: var(--text-faint); font-size: .8em; }
.wct-definition-link-card.is-inferred { border-style: dashed; opacity: .92; }

@media (max-width: 1100px) {
  .wct-priority-controls { grid-template-columns: minmax(220px,1fr) repeat(2,auto); }
  .wct-priority-missing-toggle, .wct-priority-controls select:last-of-type { grid-row: 2; }
  .wct-browser-tabs { grid-template-columns: repeat(5,minmax(0,1fr)); }
}
@media (max-width: 760px) {
  .wct-priority-panel { width: calc(100% - 16px); left: 8px; top: 8px; max-height: 72%; }
  .wct-priority-controls { grid-template-columns: 1fr 1fr; }
  .wct-priority-filter { grid-column: 1/-1; }
  .wct-current-state-matrix { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .wct-browser-tabs { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .wct-graph-tooltip { width: calc(100% - 16px); max-height: 65vh; }
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