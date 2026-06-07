import { ACTOR_COLLISION_RADIUS } from "../config/constants.js";
import { clampToWorld } from "../utils/math.js";

export function registerObstacle(levelState, x, z, halfW, halfD) {
  levelState.obstacles.push({ x, z, halfW, halfD });
}

export function collidesWithObstacle(levelState, pos, radius = ACTOR_COLLISION_RADIUS) {
  if (!levelState?.obstacles?.length) return false;
  for (const obs of levelState.obstacles) {
    if (
      Math.abs(pos.x - obs.x) < obs.halfW + radius &&
      Math.abs(pos.z - obs.z) < obs.halfD + radius
    ) {
      return true;
    }
  }
  return false;
}

export function resolveObstacleCollisions(levelState, position, radius = ACTOR_COLLISION_RADIUS, velocity = null) {
  if (!levelState?.obstacles?.length) return false;
  let hit = false;
  for (let pass = 0; pass < 4; pass += 1) {
    let resolved = false;
    for (const obs of levelState.obstacles) {
      const dx = position.x - obs.x;
      const dz = position.z - obs.z;
      const overlapX = obs.halfW + radius - Math.abs(dx);
      const overlapZ = obs.halfD + radius - Math.abs(dz);
      if (overlapX <= 0 || overlapZ <= 0) continue;
      if (overlapX < overlapZ) {
        position.x += dx >= 0 ? overlapX : -overlapX;
        if (velocity) velocity.x *= -0.25;
      } else {
        position.z += dz >= 0 ? overlapZ : -overlapZ;
        if (velocity) velocity.y *= -0.25;
      }
      resolved = true;
      hit = true;
    }
    if (!resolved) break;
  }
  return hit;
}

export function clampActorPosition(levelState, position, velocity = null) {
  clampToWorld(position);
  resolveObstacleCollisions(levelState, position, ACTOR_COLLISION_RADIUS, velocity);
}
