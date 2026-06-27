"use strict";

const STYLE_ID = "wct-graph-engine-v07-styles";

const CSS = `
.wct-graph-root {
  --wct-browser-font-scale: 1;
  --wct-inspector-width: 690px;
  --wct-hover-scale: 1;
}

.wct-graph-inspector {
  width: min(var(--wct-inspector-width), 78vw);
  border-left: 2px solid color-mix(in srgb, var(--wct-object-color, var(--interactive-accent)) 55%, var(--background-modifier-border));
}

.wct-graph-inspector-title h2 {
  color: color-mix(in srgb, var(--wct-object-color, var(--text-normal)) 72%, var(--text-normal));
  font-size: calc(19px * var(--wct-browser-font-scale));
}

.wct-graph-inspector-title small,
.wct-browser-pane,
.wct-browser-search,
.wct-browser-tabs button,
.wct-graph-inspector-actions button {
  font-size: calc(1em * var(--wct-browser-font-scale));
}

.wct-browser-pane {
  line-height: 1.58;
}

.wct-browser-markdown {
  font-size: calc(12px * var(--wct-browser-font-scale));
  line-height: 1.68;
}

.wct-browser-definition {
  font-size: calc(13px * var(--wct-browser-font-scale));
}

.wct-inspector-reading-controls {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  margin-left: auto;
}

.wct-inspector-reading-controls button {
  min-width: 31px;
  height: 29px;
  padding: 0 7px;
  font-size: 10px;
}

.wct-graph-tooltip {
  width: min(calc(430px * var(--wct-hover-scale)), 52vw);
  max-height: min(calc(330px * var(--wct-hover-scale)), 48vh);
  padding: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--wct-hover-color, var(--interactive-accent)) 65%, var(--background-modifier-border));
  border-top-width: 4px;
  background: color-mix(in srgb, var(--background-primary) 96%, var(--wct-hover-color, transparent) 4%);
  font-size: calc(11px * var(--wct-hover-scale));
  white-space: normal;
}

.wct-hover-header {
  padding: 10px 12px 8px;
  background: color-mix(in srgb, var(--wct-hover-color, var(--interactive-accent)) 11%, var(--background-secondary));
}

.wct-hover-type {
  display: inline-block;
  margin-bottom: 5px;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--wct-hover-color) 65%, transparent);
  border-radius: 999px;
  color: var(--wct-hover-color);
  font-size: .78em;
  font-weight: 750;
  letter-spacing: .055em;
  text-transform: uppercase;
}

.wct-hover-header > strong {
  display: block;
  color: var(--text-normal);
  font-size: 1.25em;
  line-height: 1.24;
}

.wct-hover-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

.wct-hover-metrics span {
  padding: 2px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--background-primary) 78%, transparent);
  color: var(--text-muted);
  font-size: .8em;
}

.wct-hover-facets {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px 12px 3px;
}

.wct-hover-facets span {
  padding: 3px 7px;
  border-radius: 999px;
  font-size: .79em;
  font-weight: 650;
}

.wct-hover-facets [data-facet="definition"] { color: #55cf7d; background: rgba(67,182,111,.14); }
.wct-hover-facets [data-facet="equation"] { color: #f4ad4d; background: rgba(240,154,52,.14); }
.wct-hover-facets [data-facet="derivation"] { color: #ee756e; background: rgba(226,90,82,.14); }
.wct-hover-facets [data-facet="reference"] { color: #aeb8c8; background: rgba(137,147,162,.14); }
.wct-hover-facets [data-facet="link"] { color: #72a2f0; background: rgba(79,134,232,.14); }

.wct-hover-summary {
  padding: 8px 12px 10px;
  color: var(--text-normal);
  font-size: .95em;
  line-height: 1.5;
}

.wct-hover-priority {
  padding: 7px 12px 9px;
  border-top: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  font-size: .82em;
}

.wct-progress-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.wct-progress-card {
  padding: 9px 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  background: var(--background-secondary);
}

.wct-progress-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.wct-progress-heading span {
  color: var(--text-muted);
  font-size: .82em;
}

.wct-progress-heading strong {
  color: var(--wct-progress-color);
  font-size: 1.2em;
}

.wct-progress-track,
.wct-inline-meter {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--background-modifier-border);
}

.wct-progress-fill,
.wct-inline-meter-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--wct-progress-color, var(--interactive-accent));
}

.wct-progress-detail {
  margin-top: 6px;
  color: var(--text-faint);
  font-size: .72em;
  line-height: 1.35;
}

.wct-definition-link-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.wct-definition-link-card {
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--wct-related-color) 35%, var(--background-modifier-border));
  border-left: 3px solid var(--wct-related-color);
  border-radius: 7px;
  background: var(--background-secondary);
}

.wct-definition-link-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.wct-definition-link-heading button {
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--text-accent);
  font-size: 1em;
  font-weight: 700;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wct-definition-link-heading span {
  flex: 0 0 auto;
  color: var(--text-faint);
  font-size: .7em;
  text-transform: uppercase;
}

.wct-definition-link-excerpt {
  color: var(--text-muted);
  font-size: .82em;
  line-height: 1.42;
}

.wct-derivation-link-list {
  display: grid;
  gap: 5px;
}

.wct-derivation-link-row {
  display: grid;
  grid-template-columns: minmax(82px, auto) minmax(0, 1fr) 42px;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-left: 3px solid #e25a52;
  border-radius: 5px;
  background: var(--background-secondary);
}

.wct-derivation-relation {
  color: #ee756e;
  font-size: .72em;
  font-weight: 700;
  text-transform: uppercase;
}

.wct-derivation-completion {
  color: var(--text-muted);
  font-family: var(--font-monospace);
  font-size: .75em;
  text-align: right;
}

.wct-derivation-card {
  margin-bottom: 8px;
  padding: 9px 10px;
  border: 1px solid var(--background-modifier-border);
  border-left: 3px solid #e25a52;
  border-radius: 7px;
  background: var(--background-secondary);
}

.wct-derivation-card-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.wct-derivation-card-heading span {
  color: #ee756e;
  font-size: .72em;
  font-weight: 700;
  text-transform: uppercase;
}

.wct-derivation-card-heading button {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wct-derivation-card-summary {
  margin-bottom: 7px;
  color: var(--text-muted);
  font-size: .83em;
  line-height: 1.44;
}

.wct-inline-meter-fill {
  background: #e25a52;
}

.wct-priority-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 24;
  width: min(390px, 36vw);
  max-height: calc(100% - 24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--background-modifier-border);
  border-radius: 9px;
  background: color-mix(in srgb, var(--background-primary) 96%, transparent);
  box-shadow: var(--shadow-s);
  backdrop-filter: blur(12px);
}

.wct-priority-panel.is-hidden { display: none; }
.wct-priority-panel.is-collapsed { width: 230px; }
.wct-priority-panel.is-collapsed .wct-priority-filter,
.wct-priority-panel.is-collapsed .wct-priority-list,
.wct-priority-panel.is-collapsed small { display: none; }

.wct-priority-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 11px 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

.wct-priority-header > div { flex: 1; min-width: 0; }
.wct-priority-header strong { display: block; color: var(--text-normal); font-size: 12px; }
.wct-priority-header small { display: block; margin-top: 3px; color: var(--text-faint); font-size: 8px; line-height: 1.35; }
.wct-priority-header button { width: 27px; height: 27px; padding: 0; }

.wct-priority-filter {
  margin: 8px 9px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-normal);
  font-size: 10px;
}

.wct-priority-list {
  min-height: 0;
  overflow: auto;
  padding: 0 8px 9px;
}

.wct-priority-item {
  width: 100%;
  display: grid;
  grid-template-columns: 25px minmax(0, 1fr);
  gap: 7px;
  margin-bottom: 5px;
  padding: 7px 8px;
  border: 1px solid var(--background-modifier-border);
  border-left: 3px solid var(--wct-priority-color);
  border-radius: 6px;
  background: var(--background-secondary);
  text-align: left;
}

.wct-priority-item:hover {
  border-color: color-mix(in srgb, var(--wct-priority-color) 60%, var(--background-modifier-border));
  background: color-mix(in srgb, var(--wct-priority-color) 7%, var(--background-secondary));
}

.wct-priority-rank {
  color: var(--text-faint);
  font-family: var(--font-monospace);
  font-size: 10px;
  text-align: center;
}

.wct-priority-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.wct-priority-title span {
  min-width: 0;
  overflow: hidden;
  color: var(--text-normal);
  font-size: 10px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wct-priority-title em {
  color: #ee756e;
  font-family: var(--font-monospace);
  font-size: 9px;
  font-style: normal;
}

.wct-priority-meters {
  display: flex;
  gap: 8px;
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 8px;
}

.wct-priority-reason {
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-faint);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wct-priority-hero {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 15px;
  border: 1px solid rgba(226,90,82,.45);
  border-radius: 9px;
  background: rgba(226,90,82,.08);
}

.wct-priority-hero > strong {
  color: #ee756e;
  font-size: 34px;
  line-height: 1;
}

.wct-priority-hero > div { display: flex; flex-direction: column; gap: 3px; }
.wct-priority-hero span { color: var(--text-normal); font-weight: 700; }
.wct-priority-hero small { color: var(--text-muted); font-size: .78em; }

.wct-priority-reasons {
  margin: 0;
  padding-left: 22px;
}

.wct-priority-reasons li {
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: .88em;
}

.wct-check-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 7px;
  align-items: start;
  margin-bottom: 5px;
  padding: 7px 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
}

.wct-check-row.is-complete { border-left: 3px solid #35c46a; }
.wct-check-row.is-missing { border-left: 3px solid #f09a34; }
.wct-check-symbol { color: var(--text-accent); font-weight: 800; }
.wct-check-row strong { display: block; font-size: .88em; }
.wct-check-row small { display: block; margin-top: 3px; color: var(--text-muted); font-size: .76em; line-height: 1.35; }

.wct-validation-dimension {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(90px, auto) 44px;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.wct-validation-dimension span { color: var(--text-muted); }
.wct-validation-dimension strong { color: var(--text-normal); text-align: right; }
.wct-validation-dimension em { color: var(--text-faint); font-family: var(--font-monospace); font-style: normal; text-align: right; }

.wct-browser-tabs button[data-tab="definition"].is-active { color: #55cf7d; border-color: rgba(67,182,111,.55); background: rgba(67,182,111,.1); }
.wct-browser-tabs button[data-tab="equations"].is-active { color: #f4ad4d; border-color: rgba(240,154,52,.55); background: rgba(240,154,52,.1); }
.wct-browser-tabs button[data-tab="derivations"].is-active { color: #ee756e; border-color: rgba(226,90,82,.55); background: rgba(226,90,82,.1); }
.wct-browser-tabs button[data-tab="papers"].is-active { color: #b87ae3; border-color: rgba(155,89,208,.55); background: rgba(155,89,208,.1); }
.wct-browser-tabs button[data-tab="links"].is-active,
.wct-browser-tabs button[data-tab="backlinks"].is-active { color: #72a2f0; border-color: rgba(79,134,232,.55); background: rgba(79,134,232,.1); }
.wct-browser-tabs button[data-tab="repositories"].is-active { color: #e778aa; border-color: rgba(225,95,148,.55); background: rgba(225,95,148,.1); }
.wct-browser-tabs button[data-tab="priority"].is-active { color: #ee756e; border-color: rgba(226,90,82,.55); background: rgba(226,90,82,.1); }

@media (max-width: 960px) {
  .wct-progress-grid,
  .wct-definition-link-list { grid-template-columns: 1fr; }
  .wct-priority-panel { width: min(350px, 46vw); }
}

@media (max-width: 720px) {
  .wct-graph-inspector { width: 100%; }
  .wct-priority-panel { width: calc(100% - 24px); max-height: 45%; }
  .wct-inspector-reading-controls button:last-child { display: none; }
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