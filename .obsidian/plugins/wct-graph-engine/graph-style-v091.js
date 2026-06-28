"use strict";

const STYLE_ID = "wct-graph-engine-v091-styles";

const CSS = `
.wct-priority-controls {
  grid-template-columns: minmax(300px, 1fr) repeat(4, auto);
}

.wct-priority-export-button {
  height: 31px;
  min-width: 92px;
  margin: 0;
  padding: 0 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-muted);
  font-size: 9px;
  white-space: nowrap;
}

.wct-priority-export-button:hover {
  border-color: var(--interactive-accent);
  color: var(--text-normal);
}

.wct-priority-table {
  min-width: 1510px;
}

.wct-priority-table th:nth-child(1) { width: 70px; }
.wct-priority-table th:nth-child(2) { width: 250px; }
.wct-priority-table th:nth-child(3) { width: 100px; }
.wct-priority-table th:nth-child(4) { width: 68px; }
.wct-priority-table th:nth-child(5) { width: 78px; }
.wct-priority-table th:nth-child(6) { width: 68px; }
.wct-priority-table th:nth-child(7) { width: 72px; }
.wct-priority-table th:nth-child(8) { width: 72px; }
.wct-priority-table th:nth-child(9) { width: 280px; }
.wct-priority-table th:nth-child(10) { width: 300px; }

.wct-priority-number.is-importance {
  color: #78a9ff;
  font-weight: 750;
}

.wct-priority-number.is-urgency {
  color: #f4ad4d;
  font-weight: 750;
}

@media (max-width: 1180px) {
  .wct-priority-controls {
    grid-template-columns: minmax(240px, 1fr) repeat(3, auto);
  }
}

@media (max-width: 800px) {
  .wct-priority-controls {
    grid-template-columns: 1fr 1fr;
  }
  .wct-priority-filter {
    grid-column: 1 / -1;
  }
  .wct-priority-export-button {
    width: 100%;
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
