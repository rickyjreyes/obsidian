"use strict";

const STYLE_ID = "wct-graph-engine-v05-styles";

const CSS = `
.wct-graph-timeline-controls {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(390px, 1fr);
  gap: 10px;
  align-items: center;
  padding: 7px 9px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: color-mix(in srgb, var(--background-secondary) 94%, var(--interactive-accent) 6%);
  flex: 0 0 auto;
}

.wct-graph-timeline-controls.is-hidden {
  display: none;
}

.wct-graph-timeline-transport {
  display: grid;
  grid-template-columns: auto auto auto auto minmax(150px, 1fr) auto;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.wct-graph-timeline-transport button {
  height: 29px;
  font-size: 11px;
}

.wct-graph-timeline-date {
  min-width: 92px;
  color: var(--text-normal);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.wct-graph-timeline-count {
  min-width: 72px;
  color: var(--text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.wct-graph-timeline-range {
  width: 100%;
  min-width: 130px;
  accent-color: var(--interactive-accent);
}

.wct-graph-force-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(110px, 1fr));
  align-items: center;
  gap: 8px;
}

.wct-graph-force-control {
  display: grid;
  grid-template-columns: auto minmax(64px, 1fr) auto;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 9px;
  white-space: nowrap;
}

.wct-graph-force-control input[type="range"] {
  width: 100%;
  min-width: 60px;
  accent-color: var(--interactive-accent);
}

.wct-graph-force-control select {
  height: 27px;
  min-width: 58px;
  font-size: 10px;
}

.wct-graph-force-value {
  min-width: 28px;
  color: var(--text-normal);
  font-family: var(--font-monospace);
  text-align: right;
}

.wct-graph-identity-grid {
  display: grid;
  gap: 5px;
}

.wct-graph-identity-row {
  display: grid;
  grid-template-columns: minmax(86px, .7fr) minmax(0, 1.3fr);
  gap: 8px;
  align-items: start;
  padding: 6px 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
  font-size: 10px;
}

.wct-graph-identity-row.is-warning {
  border-color: color-mix(in srgb, var(--text-warning) 55%, var(--background-modifier-border));
  background: color-mix(in srgb, var(--text-warning) 6%, var(--background-secondary));
}

.wct-graph-identity-label {
  color: var(--text-muted);
}

.wct-graph-identity-value {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-normal);
  font-family: var(--font-monospace);
}

@media (max-width: 1050px) {
  .wct-graph-timeline-controls {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .wct-graph-timeline-transport {
    grid-template-columns: auto auto 1fr auto;
  }

  .wct-graph-timeline-range {
    grid-column: 1 / -1;
  }

  .wct-graph-force-controls {
    grid-template-columns: 1fr;
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