"use strict";

const {
  buildTimelineScene,
  timelineBounds,
  clamp,
} = require("./graph-core");

function formatDate(timestamp) {
  if (!Number.isFinite(timestamp)) return "Unknown date";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

class GraphTimelineViewMethods {
  buildTimelineControls(root) {
    this.timelineControls = root.createDiv({ cls: "wct-graph-timeline-controls is-hidden" });
    const transport = this.timelineControls.createDiv({ cls: "wct-graph-timeline-transport" });
    this.timelinePlayButton = transport.createEl("button", { text: "Play", attr: { type: "button" } });
    this.timelineRestartButton = transport.createEl("button", { text: "Restart", attr: { type: "button" } });
    this.timelineDateLabel = transport.createSpan({ cls: "wct-graph-timeline-date", text: "—" });
    this.timelineCountLabel = transport.createSpan({ cls: "wct-graph-timeline-count", text: "0 ideas" });
    this.timelineRange = transport.createEl("input", {
      cls: "wct-graph-timeline-range",
      attr: { type: "range", min: "0", max: "1000", step: "1", value: "0", "aria-label": "Timeline date" },
    });

    const speedLabel = transport.createEl("label", { cls: "wct-graph-force-control" });
    speedLabel.createSpan({ text: "Duration" });
    this.timelineDurationSelect = speedLabel.createEl("select", { attr: { "aria-label": "Timelapse duration" } });
    for (const seconds of [8, 18, 30, 60]) {
      this.timelineDurationSelect.createEl("option", { text: `${seconds}s`, value: String(seconds) });
    }
    this.timelineDurationSelect.value = String(this.settings.timelineDurationSeconds ?? 18);

    const forcePanel = this.timelineControls.createDiv({ cls: "wct-graph-force-controls" });
    const createForceSlider = (label, key, min, max, step) => {
      const wrapper = forcePanel.createEl("label", { cls: "wct-graph-force-control" });
      wrapper.createSpan({ text: label });
      const input = wrapper.createEl("input", {
        attr: {
          type: "range",
          min: String(min),
          max: String(max),
          step: String(step),
          value: String(this.settings[key]),
          "aria-label": label,
        },
      });
      const value = wrapper.createSpan({ cls: "wct-graph-force-value", text: String(this.settings[key]) });
      input.addEventListener("input", () => {
        this.settings[key] = Number(input.value);
        value.setText(input.value);
        this.wakeTimelineForce?.(5000);
      });
      input.addEventListener("change", () => this.plugin.saveSettings());
      return input;
    };

    this.forceCenterInput = createForceSlider("Center", "forceCenter", 0, 100, 1);
    this.forceRepelInput = createForceSlider("Repel", "forceRepel", 0, 1200, 10);
    this.forceLinkInput = createForceSlider("Link distance", "forceLinkDistance", 30, 300, 5);

    this.timelinePlayButton.addEventListener("click", () => {
      if (this.timelinePlaying) this.pauseTimeline();
      else this.playTimeline();
    });
    this.timelineRestartButton.addEventListener("click", () => {
      this.pauseTimeline();
      this.setTimelineProgress(0, false, true);
    });
    this.timelineRange.addEventListener("input", () => {
      this.pauseTimeline();
      this.setTimelineProgress(Number(this.timelineRange.value), false, false);
    });
    this.timelineDurationSelect.addEventListener("change", async () => {
      this.settings.timelineDurationSeconds = Number(this.timelineDurationSelect.value) || 18;
      await this.plugin.saveSettings();
    });
  }

  showTimeline() {
    if (!this.graph) return;
    this.pauseTimeline();
    this.timelineBounds = timelineBounds(this.graph);
    this.timelineProgress = 0;
    this.timelineRange.value = "0";
    this.searchInput.value = "";
    const rootScene = this.stack[0]?.scene?.mode === "full"
      ? this.stack[0].scene
      : this.plugin.graphCore.buildFullScene(this.graph, this.settings);
    this.stack = [{ label: "Full graph", scene: rootScene }];
    const scene = buildTimelineScene(this.plugin.graphCore, this.graph, this.settings, this.timelineBounds.min);
    this.navigate(scene, "Idea timeline", { origin: null });
    this.setTimelineProgress(0, false, true);
  }

  showTimelineControls() {
    this.timelineControls?.removeClass("is-hidden");
  }

  hideTimelineControls() {
    this.timelineControls?.addClass("is-hidden");
    this.pauseTimeline();
  }

  cutoffForProgress(progress) {
    const bounds = this.timelineBounds ?? timelineBounds(this.graph);
    const normalized = clamp(Number(progress) / 1000, 0, 1);
    return bounds.min + (bounds.max - bounds.min) * normalized;
  }

  setTimelineProgress(progress, fromPlayback = false, fit = false) {
    if (!this.graph) return;
    this.timelineBounds = this.timelineBounds ?? timelineBounds(this.graph);
    this.timelineProgress = clamp(Number(progress), 0, 1000);
    this.timelineRange.value = String(Math.round(this.timelineProgress));
    const cutoff = this.cutoffForProgress(this.timelineProgress);
    const previous = this.scene;
    const scene = buildTimelineScene(this.plugin.graphCore, this.graph, this.settings, cutoff);
    this.scene = scene;

    if (this.stack.length && this.stack[this.stack.length - 1].label === "Idea timeline") {
      this.stack[this.stack.length - 1].scene = scene;
    }

    this.animation = null;
    const visibleIds = new Set(scene.nodes.map((node) => node.id));
    this.displayPositions = new Map(
      [...this.displayPositions.entries()].filter(([id]) => visibleIds.has(id)),
    );
    this.initializeTimelineForce?.(scene, true);
    this.timelineDateLabel.setText(formatDate(cutoff));
    this.timelineCountLabel.setText(`${scene.sourceNodeCount.toLocaleString()} ideas`);
    this.updateStatus();
    if (fit || !previous || previous.mode !== "timeline") this.fitScene(this.settings.motionMode !== "off");
    if (!fromPlayback) this.wakeTimelineForce?.(5000);
    this.needsRender = true;
  }

  playTimeline() {
    if (this.scene?.mode !== "timeline") this.showTimeline();
    if (this.timelineProgress >= 999.5) this.setTimelineProgress(0, false, true);
    this.timelinePlaying = true;
    this.timelinePlayButton.setText("Pause");
    this.timelineLastPlaybackTime = performance.now();
    this.timelineLastSceneUpdate = 0;
    this.wakeTimelineForce?.(Number(this.settings.timelineDurationSeconds ?? 18) * 1000 + 2000);
  }

  pauseTimeline() {
    this.timelinePlaying = false;
    this.timelinePlayButton?.setText("Play");
  }

  tickTimeline(time) {
    if (!this.timelinePlaying || this.scene?.mode !== "timeline") return;
    const last = this.timelineLastPlaybackTime ?? time;
    const delta = Math.max(0, time - last);
    this.timelineLastPlaybackTime = time;
    const duration = Math.max(4, Number(this.settings.timelineDurationSeconds) || 18) * 1000;
    const next = this.timelineProgress + (delta / duration) * 1000;
    if (time - (this.timelineLastSceneUpdate ?? 0) >= 90 || next >= 1000) {
      this.timelineLastSceneUpdate = time;
      this.setTimelineProgress(Math.min(1000, next), true, false);
    } else {
      this.timelineProgress = Math.min(1000, next);
      this.timelineRange.value = String(Math.round(this.timelineProgress));
      this.timelineDateLabel.setText(formatDate(this.cutoffForProgress(this.timelineProgress)));
    }
    if (next >= 1000) this.pauseTimeline();
  }
}

module.exports = GraphTimelineViewMethods.prototype;