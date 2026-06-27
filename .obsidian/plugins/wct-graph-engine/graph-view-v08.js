"use strict";

const { WCTGraphView } = require("./graph-view-v07");

const installControls = WCTGraphView.prototype.installV07Controls;

WCTGraphView.prototype.installV07Controls = function installV08Controls() {
  installControls.call(this);
  if (this.pdfDerivationsButton) return;
  this.pdfDerivationsButton = this.toolbar.createEl("button", {
    text: "PDF derivations",
    attr: {
      type: "button",
      title: "Import page-provenance derivations from literature-note PDF URLs",
    },
  });
  this.toolbar.insertBefore(this.pdfDerivationsButton, this.breadcrumbs);
  this.pdfDerivationsButton.addEventListener("click", () => {
    this.plugin.pdfImporter?.runPdfImporter?.(this.plugin);
  });
};

module.exports = { WCTGraphView };