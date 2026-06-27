"use strict";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class GraphForceMethods {
  initializeTimelineForce(scene, preserve = true) {
    const previous = preserve ? this.timelineForceState : null;
    const positions = new Map();
    const velocities = new Map();

    for (const node of scene.nodes ?? []) {
      const oldPosition = previous?.positions?.get(node.id);
      const displayed = this.displayPositions.get(node.id);
      positions.set(node.id, oldPosition
        ? { ...oldPosition, timelineX: node.timelineX ?? node.x }
        : displayed
          ? { x: displayed.x, y: displayed.y, timelineX: node.timelineX ?? node.x }
          : { x: node.x, y: node.y, timelineX: node.timelineX ?? node.x });
      velocities.set(node.id, previous?.velocities?.get(node.id) ?? { x: 0, y: 0 });
    }

    this.timelineForceState = {
      positions,
      velocities,
      lastTime: performance.now(),
      activeUntil: performance.now() + 5000,
      edgePairs: (scene.edges ?? []).map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: Math.max(1, Number(edge.weight) || 1),
        typed: edge.relation && edge.relation !== "links",
      })),
    };

    for (const [id, position] of positions) {
      this.displayPositions.set(id, { x: position.x, y: position.y });
    }
    this.needsRender = true;
  }

  wakeTimelineForce(milliseconds = 3500) {
    if (!this.timelineForceState) return;
    this.timelineForceState.activeUntil = Math.max(
      this.timelineForceState.activeUntil ?? 0,
      performance.now() + milliseconds,
    );
  }

  stepTimelineForce(time) {
    if (this.scene?.mode !== "timeline" || !this.timelineForceState) return false;
    const state = this.timelineForceState;
    const shouldRun = this.timelinePlaying
      || time < (state.activeUntil ?? 0)
      || this.drag?.nodeId;
    if (!shouldRun) return false;

    const elapsed = clamp((time - (state.lastTime ?? time)) / 1000, 0.001, 0.035);
    state.lastTime = time;
    const positions = state.positions;
    const velocities = state.velocities;
    const ids = [...positions.keys()];
    const centerStrength = clamp(Number(this.settings.forceCenter) || 18, 0, 100) * 0.075;
    const repelStrength = clamp(Number(this.settings.forceRepel) || 180, 0, 2000);
    const linkDistance = clamp(Number(this.settings.forceLinkDistance) || 105, 20, 400);
    const springStrength = 1.15;

    for (const id of ids) {
      const position = positions.get(id);
      const velocity = velocities.get(id);
      const chronologicalTarget = position.timelineX ?? 0;
      velocity.x += (chronologicalTarget - position.x) * centerStrength * elapsed;
      velocity.y += -position.y * centerStrength * 0.32 * elapsed;
    }

    const cellSize = Math.max(48, linkDistance * 1.15);
    const grid = new Map();
    for (const id of ids) {
      const position = positions.get(id);
      const cellX = Math.floor(position.x / cellSize);
      const cellY = Math.floor(position.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(id);
    }

    const checked = new Set();
    for (const id of ids) {
      const a = positions.get(id);
      const ax = Math.floor(a.x / cellSize);
      const ay = Math.floor(a.y / cellSize);
      for (let gx = ax - 1; gx <= ax + 1; gx += 1) {
        for (let gy = ay - 1; gy <= ay + 1; gy += 1) {
          for (const otherId of grid.get(`${gx},${gy}`) ?? []) {
            if (id === otherId) continue;
            const pairKey = id < otherId ? `${id}\u0000${otherId}` : `${otherId}\u0000${id}`;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);
            const b = positions.get(otherId);
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distanceSquared = dx * dx + dy * dy;
            if (distanceSquared < 0.01) {
              const seed = (String(id).length * 31 + String(otherId).length * 17) % 360;
              dx = Math.cos(seed) * 0.1;
              dy = Math.sin(seed) * 0.1;
              distanceSquared = 0.02;
            }
            const distance = Math.sqrt(distanceSquared);
            const cutoff = cellSize * 1.7;
            if (distance > cutoff) continue;
            const force = (repelStrength * 90) / (distanceSquared + 70);
            const fx = (dx / distance) * force * elapsed;
            const fy = (dy / distance) * force * elapsed;
            velocities.get(id).x -= fx;
            velocities.get(id).y -= fy;
            velocities.get(otherId).x += fx;
            velocities.get(otherId).y += fy;
          }
        }
      }
    }

    for (const edge of state.edgePairs) {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const desired = linkDistance * (edge.typed ? 0.82 : 1);
      const displacement = distance - desired;
      const force = displacement * springStrength * Math.min(2.2, 0.65 + edge.weight * 0.18) * elapsed;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      velocities.get(edge.source).x += fx;
      velocities.get(edge.source).y += fy;
      velocities.get(edge.target).x -= fx;
      velocities.get(edge.target).y -= fy;
    }

    const damping = Math.pow(0.16, elapsed);
    for (const id of ids) {
      const position = positions.get(id);
      const velocity = velocities.get(id);
      velocity.x = clamp(velocity.x * damping, -520, 520);
      velocity.y = clamp(velocity.y * damping, -520, 520);
      position.x += velocity.x * elapsed;
      position.y += velocity.y * elapsed;
      this.displayPositions.set(id, { x: position.x, y: position.y });
    }

    this.needsRender = true;
    return true;
  }
}

module.exports = GraphForceMethods.prototype;