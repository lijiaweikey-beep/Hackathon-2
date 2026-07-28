import * as THREE from "three";
import {
  NPC_SPEED,
  PLAY_Z_MIN,
  PLAYER_LERP,
  WORLD_LIMIT,
} from "../config/constants.js";
import {
  clampToWorld,
  lerpAngle,
} from "../utils/math.js";
import { createActorAnimator } from "./createActorAnimator.js";
import { createActorNavigation } from "./createActorNavigation.js";
import { createActorSeparationSystem } from "./createActorSeparationSystem.js";

export function createActorSystem(dependencies) {
  const scratch2 = new THREE.Vector2();
  let npcs = [];

  const randomRange = dependencies.randomRange;
  const animator = createActorAnimator({
    getPlayer: dependencies.getPlayer,
    getTotalTime: dependencies.getTotalTime,
  });
  const separation = createActorSeparationSystem({
    getPlayer: dependencies.getPlayer,
    getNpcs: () => npcs,
    clampActorPosition: dependencies.clampActorPosition,
  });
  const navigation = createActorNavigation({
    randomRange,
    resolveObstacleCollisions: dependencies.resolveObstacleCollisions,
  });

  function reset() {
    npcs = [];
    separation.reset();
  }

  function getNpcs() {
    return npcs;
  }

  function getAll() {
    return [dependencies.getPlayer(), ...npcs].filter(Boolean);
  }

  function addNpc(npc) {
    npcs.push(npc);
    dependencies.getScene().add(npc.group);
    return npc;
  }

  function pickWanderDirection(npc) {
    const angle = randomRange(0, Math.PI * 2);
    const scale = randomRange(0.55, 1.15);
    npc.velocity.set(Math.sin(angle), Math.cos(angle)).multiplyScalar(scale);
    npc.wanderTimer = randomRange(1, 3);
    npc.stuckTimer = 0;
  }

  function nudgeFromObstacles(actor) {
    const position = actor.group.position;
    for (let index = 0; index < 12; index += 1) {
      if (!dependencies.collidesWithObstacle(position)) return;
      const angle = randomRange(0, Math.PI * 2);
      position.x += Math.sin(angle) * 0.22;
      position.z += Math.cos(angle) * 0.22;
      dependencies.clampActorPosition(position);
    }
  }

  function randomOpenPosition() {
    let position;
    let attempts = 0;
    const playerPosition = dependencies.getPlayer()?.group?.position ?? new THREE.Vector3();
    do {
      position = new THREE.Vector3(
        randomRange(-8.8, 8.8),
        0,
        randomRange(PLAY_Z_MIN + 0.8, 7.8),
      );
      attempts += 1;
    } while (
      attempts < 40
      && (
        position.distanceTo(playerPosition) < 2.2
        || dependencies.collidesWithObstacle(position)
      )
    );
    return position;
  }

  function randomizePosition(actor) {
    const position = randomOpenPosition();
    actor.group.position.set(position.x, 0, position.z);
    actor.velocity?.set?.(0, 0);
    actor.walking = false;
  }

  function addWanderNpc(id) {
    const npc = dependencies.createNpc(id, {});
    const position = randomOpenPosition();
    npc.group.position.set(position.x, 0, position.z);
    nudgeFromObstacles(npc);
    npc.wanderTimer = randomRange(0.6, 2.2);
    npc.pauseTimer = randomRange(0.2, 1.3);
    npc.walking = false;
    return addNpc(npc);
  }

  function shuffle(actors) {
    for (let index = actors.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(randomRange(0, index + 1));
      [actors[index], actors[swapIndex]] = [actors[swapIndex], actors[index]];
    }
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

  function spawnNpcs(level) {
    if (!level.legacy) dependencies.startLevel(level);
    const candidates = npcs.filter(
      (npc) => !npc.levelManaged && !npc.isLevelTarget && npc.alive,
    );
    shuffle(candidates);
    const decoyCount = Math.min(level.decoyCount ?? 3, candidates.length);
    for (let index = 0; index < decoyCount; index += 1) {
      initializeDecoy(candidates[index]);
      dependencies.dispatch({
        type: "configureDecoy",
        npc: candidates[index],
        index,
      });
    }
  }

  function updateWander(npc, deltaSeconds) {
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
    dependencies.clampActorPosition(npc.group.position, npc.velocity);

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

    if (Math.abs(npc.group.position.x) >= WORLD_LIMIT - 0.2) npc.velocity.x *= -1;
    if (
      npc.group.position.z <= PLAY_Z_MIN + 0.2
      || npc.group.position.z >= WORLD_LIMIT - 0.2
    ) {
      npc.velocity.y *= -1;
    }

    const targetRotation = Math.atan2(npc.velocity.x, npc.velocity.y);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetRotation, 0.08);
    if (npc.wanderTimer <= 0) {
      npc.pauseTimer = randomRange(0.35, 1.9);
      npc.velocity.set(0, 0);
    }
  }

  function updateDecoy(npc, deltaSeconds) {
    if (dependencies.dispatch({
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
    const hitObstacle = dependencies.resolveObstacleCollisions(
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

    if (Math.abs(npc.group.position.x) >= WORLD_LIMIT - 0.3) npc.decoyDir.x *= -1;
    if (
      npc.group.position.z <= PLAY_Z_MIN + 0.3
      || npc.group.position.z >= WORLD_LIMIT - 0.3
    ) {
      npc.decoyDir.y *= -1;
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

  function updatePlayer(deltaSeconds) {
    const player = dependencies.getPlayer();
    dependencies.readPlayerInput(scratch2);
    if (scratch2.lengthSq() > 1) scratch2.normalize();
    dependencies.applyInputLock(scratch2);
    dependencies.getPlayerVelocity().lerp(
      scratch2,
      1 - Math.pow(1 - PLAYER_LERP, deltaSeconds * 60),
    );
    const velocity = dependencies.getPlayerVelocity();
    const moving = velocity.lengthSq() > 0.0004;
    if (moving) {
      player.group.position.x += velocity.x * player.speed * deltaSeconds;
      player.group.position.z -= velocity.y * player.speed * deltaSeconds;
      dependencies.clampActorPosition(player.group.position, velocity);
      const rotation = Math.atan2(velocity.x, -velocity.y);
      player.group.rotation.y = lerpAngle(player.group.rotation.y, rotation, 0.24);
    }
    dependencies.updatePlayerTimers(deltaSeconds);
    animator.animate(player, deltaSeconds, moving);
    animator.animatePlayerAttack(player);
  }

  function updateNpcs(deltaSeconds) {
    if (dependencies.getLevel().legacy) return;
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      if (!npc.levelManaged) {
        if (npc.isDecoy) updateDecoy(npc, deltaSeconds);
        else updateWander(npc, deltaSeconds);
      }
      animator.animate(npc, deltaSeconds, npc.walking);
      if (npc.attackResolveTimer != null) animator.animateNpcAttack(npc);
    });
    separation.separate();
    dependencies.dispatch({ type: "afterNpcUpdate", deltaSeconds });
  }

  function setPartsVisible(actor, key, visible) {
    actor?.group?.userData?.[key]?.forEach((part) => {
      part.visible = visible;
    });
  }

  function compactDead() {
    npcs.forEach((npc) => {
      if (!npc.alive && !npc.preserveWhenDead && npc.group) {
        dependencies.getScene().remove(npc.group);
      }
    });
    npcs = npcs.filter((npc) => npc.alive || npc.preserveWhenDead);
  }

  return Object.freeze({
    reset,
    getNpcs,
    getAll,
    addNpc,
    addWanderNpc,
    spawnNpcs,
    updatePlayer,
    updateNpcs,
    moveNpcToward: (...args) => navigation.moveToward(...args),
    faceNpcToward: (...args) => navigation.faceToward(...args),
    randomOpenPosition,
    randomizePosition,
    isActorFacingTarget: (...args) => navigation.isFacingTarget(...args),
    setPartsVisible,
    compactDead,
    animateCheer: (deltaSeconds) => animator.animateCheer(deltaSeconds),
  });
}
