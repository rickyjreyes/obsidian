"use strict";

const STYLE_ID = "wct-graph-engine-v06-styles";

const CSS = `
.wct-graph-inspector {
  width: min(690px, 58vw);
}

.wct-graph-inspector-body {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.wct-browser-header {
  flex: 0 0 auto;
  padding: 10px 12px 7px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
}

.wct-browser-search {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 7px;
  background: var(--background-secondary);
  color: var(--text-normal);
  font-size: 11px;
}

.wct-browser-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  padding: 7px 10px;
  overflow-x: auto;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
  scrollbar-width: thin;
}

.wct-browser-tabs button {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
}

.wct-browser-tabs button:hover {
  color: var(--text-normal);
  background: var(--background-modifier-hover);
}

.wct-browser-tabs button.is-active {
  border-color: color-mix(in srgb, var(--interactive-accent) 55%, var(--background-modifier-border));
  background: color-mix(in srgb, var(--interactive-accent) 13%, var(--background-primary));
  color: var(--text-accent);
  font-weight: 650;
}

.wct-browser-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 26px;
}

.wct-browser-section {
  margin-bottom: 18px;
}

.wct-browser-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.wct-browser-section-heading h3 {
  margin: 0;
  color: var(--text-normal);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .055em;
  text-transform: uppercase;
}

.wct-browser-section-heading span {
  color: var(--text-faint);
  font-size: 9px;
  text-align: right;
}

.wct-browser-markdown {
  font-size: 12px;
  line-height: 1.58;
}

.wct-browser-markdown > :first-child {
  margin-top: 0;
}

.wct-browser-markdown > :last-child {
  margin-bottom: 0;
}

.wct-browser-definition {
  padding: 12px 14px;
  border-left: 3px solid var(--interactive-accent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--interactive-accent) 6%, var(--background-secondary));
  font-size: 13px;
}

.wct-browser-math .math-block,
.wct-browser-math mjx-container[display="true"],
.wct-browser-equation-card .math-block,
.wct-browser-equation-card mjx-container[display="true"] {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 7px 3px;
  font-size: 1.04em;
}

.wct-browser-equation-card {
  position: relative;
  margin-bottom: 9px;
  padding: 14px 12px 9px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--background-secondary) 95%, var(--interactive-accent) 5%);
}

.wct-browser-card-index {
  position: absolute;
  top: 4px;
  right: 7px;
  color: var(--text-faint);
  font-family: var(--font-monospace);
  font-size: 8px;
}

.wct-browser-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.wct-browser-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 9px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 7px;
  background: var(--background-secondary);
}

.wct-browser-stat strong {
  color: var(--text-accent);
  font-size: 17px;
  line-height: 1;
}

.wct-browser-stat span {
  color: var(--text-muted);
  font-size: 9px;
}

.wct-browser-button-list,
.wct-browser-chip-list,
.wct-browser-declarations {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.wct-browser-node-button {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
}

.wct-browser-relation-row {
  display: grid;
  grid-template-columns: minmax(90px, auto) 18px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.wct-browser-relation-type {
  overflow: hidden;
  color: var(--text-accent);
  font-size: 9px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wct-browser-relation-arrow {
  color: var(--text-faint);
  text-align: center;
}

.wct-browser-link-row {
  display: grid;
  grid-template-columns: minmax(56px, auto) minmax(120px, .85fr) minmax(130px, 1.15fr);
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
  padding: 5px 7px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
}

.wct-browser-link-kind {
  color: var(--text-accent);
  font-family: var(--font-monospace);
  font-size: 8px;
  font-weight: 700;
}

.wct-browser-link-row button {
  min-width: 0;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
}

.wct-browser-link-path {
  min-width: 0;
  overflow: hidden;
  color: var(--text-faint);
  font-family: var(--font-monospace);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wct-browser-properties {
  display: grid;
  gap: 4px;
}

.wct-browser-property-row {
  display: grid;
  grid-template-columns: minmax(130px, .7fr) minmax(0, 1.3fr);
  gap: 10px;
  align-items: start;
  padding: 7px 9px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
}

.wct-browser-property-key {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 650;
}

.wct-browser-property-value {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-normal);
  font-family: var(--font-monospace);
  font-size: 9px;
  line-height: 1.45;
}

.wct-browser-property-value p {
  margin: 0;
}

.wct-browser-repository-card {
  margin-bottom: 7px;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 35%, var(--background-modifier-border));
  border-radius: 7px;
  background: color-mix(in srgb, var(--interactive-accent) 5%, var(--background-secondary));
}

.wct-browser-repository-card strong {
  color: var(--text-accent);
  font-family: var(--font-monospace);
  font-size: 11px;
}

.wct-browser-repository-card p {
  margin: 5px 0 8px;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.45;
}

.wct-browser-repository-card button {
  font-size: 9px;
}

.wct-browser-chip-list code,
.wct-browser-declarations code {
  padding: 4px 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 5px;
  background: var(--background-secondary);
  color: var(--text-accent);
  font-size: 9px;
}

.wct-browser-source {
  font-size: 11px;
}

.wct-browser-filter-item.is-filtered-out {
  display: none !important;
}

.wct-graph-identity-row.tone-info {
  border-color: var(--background-modifier-border);
  background: var(--background-secondary);
}

.wct-graph-identity-row.tone-info .wct-graph-identity-value {
  color: var(--text-muted);
}

@media (max-width: 1000px) {
  .wct-graph-inspector {
    width: min(620px, 70vw);
  }

  .wct-browser-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .wct-graph-inspector {
    width: 100%;
  }

  .wct-browser-link-row,
  .wct-browser-property-row {
    grid-template-columns: 1fr;
  }

  .wct-browser-link-path {
    white-space: normal;
  }
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