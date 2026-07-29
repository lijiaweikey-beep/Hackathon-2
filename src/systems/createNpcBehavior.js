import * as THREE from "three";
import {
  ACTOR_COLLISION_RADIUS,
  NPC_SPEED,
  PLAY_Z_MIN,
  WORLD_LIMIT,
} from "../config/constants.js";
import { clampToWorld, lerpAngle } from "../utils/math.js";
import { steerAwayFromScreenEdge } from "../utils/screenEdge.js";

// NPC 漫游与诱饵行为：从 createActorSystem 拆出，控制单模块体积。
export function createNpcBehavior({
  randomRange,
  getCamera,
  clampActorPosition,
  resolveObstacleCollisions,
  dispatch,
}) {
  const edgeSteer = new THREE.Vector2();

  /** 屏幕边缘 2% 禁行：立刻朝屏幕中心转向离开，禁止沿边蹭走。 */
  function steerNpcOffScreenEdge(npc, direction, { keepSpeed = 1 } = {}) {
    const camera = getCamera?.();
    if (!camera || !direction) return false;
    if (!steerAwayFromScreenEdge(npc.group.position, camera, edgeSteer)) return false;

    const speed = Math.max(direction.length(), keepSpeed);
    direction.copy(edgeSteer).multiplyScalar(speed);
    npc.pauseTimer = 0;
    npc.walking = true;
    if (npc.wanderTimer != null) npc.wanderTimer = Math.max(npc.wanderTimer ?? 0, 0.9);
    npc.group.rotation.y = Math.atan2(direction.x, direction.y);
    npc.stuckTimer = 0;
    return true;
  }

  function pickWanderDirection(npc) {
    const angle = randomRange(0, Math.PI * 2);
    const scale = randomRange(0.55, 1.15);
    npc.velocity.set(Math.sin(angle), Math.cos(angle)).multiplyScalar(scale);
    npc.wanderTimer = randomRange(1, 3);
    npc.stuckTimer = 0;
  }

  function pickDecoyDirection(npc) {
    const angle = randomRange(0, Math.PI * 2);
    npc.decoyDir.set(Math.sin(angle), Math.cos(angle));
  }

  function initializeDecoy(npc) {
    npc.isDecoy = true;
    npc.deoyState = "wander";
    npc.decoyTimer = randomRange(1.5, 3.5);
    npc.decoyDir = new THREE.Vector2();
    pickDecoyDirection(npc);
  }

  function updateWander(npc, deltaSeconds) {
    // 停顿中若已在屏幕边缘，立刻取消停顿并离开。
    if (steerNpcOffScreenEdge(npc, npc.velocity)) {
      npc.pauseTimer = 0;
    }

    if (npc.pauseTimer > 0) {
      npc.pauseTimer -= deltaSeconds;
      npc.walking = false;
      if (npc.pauseTimer <= 0) pickWanderDirection(npc);
      return;
    }

    npc.wanderTimer -= deltaSeconds;
    npc.walking = true;
    const previousX = npc.group.position.x;
    const previousZ = npc.group.position.z;
    npc.group.position.x += npc.velocity.x * NPC_SPEED * deltaSeconds;
    npc.group.position.z += npc.velocity.y * NPC_SPEED * deltaSeconds;
    clampActorPosition(npc.group.position, npc.velocity);
    steerNpcOffScreenEdge(npc, npc.velocity);

    const moved = Math.hypot(
      npc.group.position.x - previousX,
      npc.group.position.z - previousZ,
    );
    if (moved < NPC_SPEED * deltaSeconds * 0.12) {
      npc.stuckTimer = (npc.stuckTimer ?? 0) + deltaSeconds;
      if (npc.stuckTimer > 0.35) pickWanderDirection(npc);
    } else {
      npc.stuckTimer = 0;
    }

    // 世界硬边：整向量朝内，避免单轴反转沿边蹭走。
    if (
      !steerNpcOffScreenEdge(npc, npc.velocity)
      && (
        Math.abs(npc.group.position.x) >= WORLD_LIMIT - 0.2
        || npc.group.position.z <= PLAY_Z_MIN + 0.2
        || npc.group.position.z >= WORLD_LIMIT - 0.2
      )
    ) {
      const inwardX = -Math.sign(npc.group.position.x) || npc.velocity.x;
      const inwardZ = npc.group.position.z <= PLAY_Z_MIN + 0.2
        ? 1
        : npc.group.position.z >= WORLD_LIMIT - 0.2
          ? -1
          : npc.velocity.y;
      const speed = Math.max(npc.velocity.length(), 1);
      npc.velocity.set(inwardX, inwardZ).normalize().multiplyScalar(speed);
      npc.group.rotation.y = Math.atan2(npc.velocity.x, npc.velocity.y);
    }

    const targetRotation = Math.atan2(npc.velocity.x, npc.velocity.y);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetRotation, 0.08);
    if (npc.wanderTimer <= 0) {
      // 仍在屏幕边缘时不允许停步沿边徘徊，继续离开。
      if (!steerNpcOffScreenEdge(npc, npc.velocity)) {
        npc.pauseTimer = randomRange(0.35, 1.9);
        npc.velocity.set(0, 0);
      }
    }
  }

  function updateDecoy(npc, deltaSeconds) {
    if (dispatch({
      type: "updateDecoy",
      npc,
      deltaSeconds,
    })) return;

    npc.decoyTimer -= deltaSeconds;
    if (npc.deoyState === "wander") {
      updateWander(npc, deltaSeconds);
      if (npc.decoyTimer <= 0) {
        npc.deoyState = "confuse";
        npc.decoyTimer = randomRange(2, 4);
        pickDecoyDirection(npc);
        npc.walking = true;
      }
      return;
    }

    npc.walking = true;
    const previousX = npc.group.position.x;
    const previousZ = npc.group.position.z;
    npc.group.position.x += npc.decoyDir.x * NPC_SPEED * deltaSeconds;
    npc.group.position.z += npc.decoyDir.y * NPC_SPEED * deltaSeconds;
    const hitObstacle = resolveObstacleCollisions(
      npc.group.position,
      ACTOR_COLLISION_RADIUS,
      npc.decoyDir,
    );
    clampToWorld(npc.group.position);

    const moved = Math.hypot(
      npc.group.position.x - previousX,
      npc.group.position.z - previousZ,
    );
    if (hitObstacle || moved < NPC_SPEED * deltaSeconds * 0.12) {
      npc.stuckTimer = (npc.stuckTimer ?? 0) + deltaSeconds;
      if (npc.stuckTimer > 0.3) {
        pickDecoyDirection(npc);
        npc.stuckTimer = 0;
      }
    } else {
      npc.stuckTimer = 0;
    }

    if (!steerNpcOffScreenEdge(npc, npc.decoyDir, { keepSpeed: 1 })) {
      if (
        Math.abs(npc.group.position.x) >= WORLD_LIMIT - 0.3
        || npc.group.position.z <= PLAY_Z_MIN + 0.3
        || npc.group.position.z >= WORLD_LIMIT - 0.3
      ) {
        const inwardX = -Math.sign(npc.group.position.x) || npc.decoyDir.x;
        const inwardZ = npc.group.position.z <= PLAY_Z_MIN + 0.3
          ? 1
          : npc.group.position.z >= WORLD_LIMIT - 0.3
            ? -1
            : npc.decoyDir.y;
        npc.decoyDir.set(inwardX, inwardZ).normalize();
        npc.group.rotation.y = Math.atan2(npc.decoyDir.x, npc.decoyDir.y);
      }
    }
    const rotation = Math.atan2(npc.decoyDir.x, npc.decoyDir.y);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, rotation, 0.14);
    if (randomRange(0, 1) < deltaSeconds * 0.6) {
      const drift = randomRange(-0.4, 0.4);
      const angle = Math.atan2(npc.decoyDir.x, npc.decoyDir.y);
      npc.decoyDir.set(Math.sin(angle + drift), Math.cos(angle + drift));
    }
    if (npc.decoyTimer <= 0) {
      npc.deoyState = "wander";
      npc.decoyTimer = randomRange(1, 2.5);
      npc.wanderTimer = randomRange(0.5, 1.5);
      npc.pauseTimer = randomRange(0.2, 0.8);
    }
  }

  return Object.freeze({
    steerNpcOffScreenEdge,
    initializeDecoy,
    updateWander,
    updateDecoy,
  });
}
