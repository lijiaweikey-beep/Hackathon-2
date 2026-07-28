import {
  GRID_CELL,
  WORLD_LIMIT,
} from "../config/constants.js";
import { gridKey } from "../utils/math.js";

export function createActorSeparationSystem(dependencies) {
  const nearby = [];
  const spatialGrid = new Map();

  function buildSpatialGrid() {
    spatialGrid.clear();
    dependencies.getNpcs().forEach((npc) => {
      if (!npc.alive) return;
      const column = Math.floor((npc.group.position.x + WORLD_LIMIT) / GRID_CELL);
      const row = Math.floor((npc.group.position.z + WORLD_LIMIT) / GRID_CELL);
      const key = gridKey(column, row);
      if (!spatialGrid.has(key)) spatialGrid.set(key, []);
      spatialGrid.get(key).push(npc);
    });
  }

  function getNearbyNpcs(position) {
    const column = Math.floor((position.x + WORLD_LIMIT) / GRID_CELL);
    const row = Math.floor((position.z + WORLD_LIMIT) / GRID_CELL);
    nearby.length = 0;
    for (let x = -1; x <= 1; x += 1) {
      for (let z = -1; z <= 1; z += 1) {
        const cell = spatialGrid.get(gridKey(column + x, row + z));
        if (cell) nearby.push(...cell);
      }
    }
    return nearby;
  }

  function pushApart(first, second, minDistance, strength) {
    const deltaX = first.x - second.x;
    const deltaZ = first.z - second.z;
    const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
    if (distanceSquared <= 0.0001 || distanceSquared >= minDistance * minDistance) return;
    const distance = Math.sqrt(distanceSquared);
    const push = (minDistance - distance) * strength;
    first.x += (deltaX / distance) * push;
    first.z += (deltaZ / distance) * push;
    second.x -= (deltaX / distance) * push;
    second.z -= (deltaZ / distance) * push;
    dependencies.clampActorPosition(first);
    dependencies.clampActorPosition(second);
  }

  function separate() {
    buildSpatialGrid();
    const player = dependencies.getPlayer();
    dependencies.getNpcs().forEach((actor) => {
      if (!actor.alive) return;
      getNearbyNpcs(actor.group.position).forEach((other) => {
        if (other === actor || !other.alive) return;
        if (actor.separationGroup && actor.separationGroup === other.separationGroup) return;
        pushApart(actor.group.position, other.group.position, 0.62, 0.018);
      });
      pushApart(actor.group.position, player.group.position, 0.72, 0.012);
    });
  }

  function reset() {
    spatialGrid.clear();
    nearby.length = 0;
  }

  return Object.freeze({ separate, reset });
}
