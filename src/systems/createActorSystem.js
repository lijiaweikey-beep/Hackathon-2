import * as THREE from "three";
import {
  PLAY_Z_MIN,
  PLAYER_LERP,
} from "../config/constants.js";
import { lerpAngle } from "../utils/math.js";
import { createActorAnimator } from "./createActorAnimator.js";
import { createActorNavigation } from "./createActorNavigation.js";
import { createActorSeparationSystem } from "./createActorSeparationSystem.js";
import { createNpcBehavior } from "./createNpcBehavior.js";
import { createPlayerAntiJitter } from "./createPlayerAntiJitter.js";

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
    getCamera: () => dependencies.getCamera?.() ?? null,
  });
  const behavior = createNpcBehavior({
    randomRange,
    getCamera: dependencies.getCamera,
    clampActorPosition: dependencies.clampActorPosition,
    resolveObstacleCollisions: dependencies.resolveObstacleCollisions,
    dispatch: dependencies.dispatch,
  });
  const antiJitter = createPlayerAntiJitter();

  function reset() {
    npcs = [];
    separation.reset();
    antiJitter.reset();
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

  function spawnNpcs(level) {
    if (!level.legacy) dependencies.startLevel(level);
    const candidates = npcs.filter(
      (npc) => !npc.levelManaged && !npc.isLevelTarget && npc.alive,
    );
    shuffle(candidates);
    const decoyCount = Math.min(level.decoyCount ?? 3, candidates.length);
    for (let index = 0; index < decoyCount; index += 1) {
      behavior.initializeDecoy(candidates[index]);
      dependencies.dispatch({
        type: "configureDecoy",
        npc: candidates[index],
        index,
      });
    }
  }

  function updatePlayer(deltaSeconds) {
    const player = dependencies.getPlayer();
    const velocity = dependencies.getPlayerVelocity();

    if (antiJitter.isLocked()) {
      antiJitter.tickLock(velocity, deltaSeconds);
      dependencies.updatePlayerTimers(deltaSeconds);
      animator.animate(player, deltaSeconds, false);
      animator.animatePlayerAttack(player);
      return;
    }

    dependencies.readPlayerInput(scratch2);
    if (scratch2.lengthSq() > 1) scratch2.normalize();
    dependencies.applyInputLock(scratch2);
    velocity.lerp(
      scratch2,
      1 - Math.pow(1 - PLAYER_LERP, deltaSeconds * 60),
    );

    const moving = velocity.lengthSq() > 0.0004;
    if (moving) {
      player.group.position.x += velocity.x * player.speed * deltaSeconds;
      player.group.position.z -= velocity.y * player.speed * deltaSeconds;
      // 玩家速度 y 与世界 z 反向，贴边时需按 invertZ 清零朝外分量。
      dependencies.clampActorPosition(player.group.position, velocity, { invertZ: true });
    }

    // 反向检测放在移动/夹紧后：贴边振荡产生的速度翻转会被计入。
    const anti = antiJitter.observe(player, velocity, deltaSeconds);
    if (!anti.locked && moving) {
      const rotation = Math.atan2(velocity.x, -velocity.y);
      player.group.rotation.y = lerpAngle(player.group.rotation.y, rotation, 0.24);
    }

    dependencies.updatePlayerTimers(deltaSeconds);
    animator.animate(player, deltaSeconds, !anti.locked && moving);
    animator.animatePlayerAttack(player);
  }

  function updateNpcs(deltaSeconds) {
    if (dependencies.getLevel().legacy) return;
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      if (!npc.levelManaged) {
        if (npc.isDecoy) behavior.updateDecoy(npc, deltaSeconds);
        else behavior.updateWander(npc, deltaSeconds);
      }
      animator.animate(npc, deltaSeconds, npc.walking);
      if (npc.attackResolveTimer != null) animator.animateNpcAttack(npc);
    });
    separation.separate();
    // 分离推挤后可能再次贴边，再扫一遍屏幕边缘驱离。
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      if (npc.velocity) behavior.steerNpcOffScreenEdge(npc, npc.velocity);
      if (npc.decoyDir) behavior.steerNpcOffScreenEdge(npc, npc.decoyDir, { keepSpeed: 1 });
    });
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
