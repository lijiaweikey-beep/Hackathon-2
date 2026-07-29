import { ACTOR_COLLISION_RADIUS, PLAY_Z_MIN, WORLD_LIMIT } from "../config/constants.js";
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

function stopAxisIntoObstacle(velocity, axis, push, invert = false) {
  if (!velocity || !push) return;
  // 取消朝障碍内部顶的速度，避免与持续输入对撞形成反弹抖动。
  const movingInto = invert
    ? Math.sign(velocity[axis]) === Math.sign(push)
    : Math.sign(velocity[axis]) === -Math.sign(push);
  if (movingInto) velocity[axis] = 0;
}

export function resolveObstacleCollisions(
  levelState,
  position,
  radius = ACTOR_COLLISION_RADIUS,
  velocity = null,
  { invertZ = false } = {},
) {
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
        const push = dx >= 0 ? overlapX : -overlapX;
        position.x += push;
        stopAxisIntoObstacle(velocity, "x", push);
      } else {
        const push = dz >= 0 ? overlapZ : -overlapZ;
        position.z += push;
        stopAxisIntoObstacle(velocity, "y", push, invertZ);
      }
      resolved = true;
      hit = true;
    }
    if (!resolved) break;
  }
  return hit;
}

/**
 * 贴世界边界时清零朝外速度。
 * @param {{ invertZ?: boolean }} [options] invertZ=true 表示 velocity.y 与世界 z 反向（玩家）
 */
export function containVelocityAtWorldBounds(position, velocity, { invertZ = false } = {}) {
  if (!velocity || !position) return;
  if (position.x <= -WORLD_LIMIT && velocity.x < 0) velocity.x = 0;
  if (position.x >= WORLD_LIMIT && velocity.x > 0) velocity.x = 0;
  if (invertZ) {
    if (position.z <= PLAY_Z_MIN && velocity.y > 0) velocity.y = 0;
    if (position.z >= WORLD_LIMIT && velocity.y < 0) velocity.y = 0;
    return;
  }
  if (position.z <= PLAY_Z_MIN && velocity.y < 0) velocity.y = 0;
  if (position.z >= WORLD_LIMIT && velocity.y > 0) velocity.y = 0;
}

export function clampActorPosition(levelState, position, velocity = null, options = {}) {
  // 先推开障碍，再钳制世界边界，避免贴边障碍把角色推出界外后下一帧又拉回造成抖动。
  resolveObstacleCollisions(
    levelState,
    position,
    ACTOR_COLLISION_RADIUS,
    velocity,
    options,
  );
  clampToWorld(position);
  containVelocityAtWorldBounds(position, velocity, options);
}
