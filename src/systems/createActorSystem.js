import * as THREE from "three";
import {
  ACTOR_COLLISION_RADIUS,
  GRID_CELL,
  HIT_FACING_DOT,
  NPC_SPEED,
  PLAY_Z_MIN,
  PLAYER_LERP,
  PUNCH_SWING,
  WORLD_LIMIT,
} from "../config/constants.js";
import {
  clampToWorld,
  getFacingVector,
  gridKey,
  lerpAngle,
} from "../utils/math.js";

const GRID_COLS = Math.ceil((WORLD_LIMIT * 2) / GRID_CELL) + 1;

export function createActorSystem(dependencies) {
  const scratch2 = new THREE.Vector2();
  const facingScratch = new THREE.Vector2();
  const scratch3 = new THREE.Vector3();
  const nearby = [];
  const spatialGrid = new Map();
  let npcs = [];

  const randomRange = dependencies.randomRange;

  function reset() {
    npcs = [];
    spatialGrid.clear();
    nearby.length = 0;
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

  function animateActor(actor, deltaSeconds, moving) {
    const userData = actor.group.userData;
    actor.walkCycle = (actor.walkCycle ?? 0) + deltaSeconds * (moving ? 8.5 : 2);
    const walk = moving ? Math.sin(actor.walkCycle) : 0;
    userData.visual.position.y = moving
      ? Math.abs(walk) * 0.06
      : Math.sin(dependencies.getTotalTime() * 1.7 + (actor.id ?? 0)) * 0.012;
    userData.leftLeg.rotation.x = walk * 0.55;
    userData.rightLeg.rotation.x = -walk * 0.55;

    const player = dependencies.getPlayer();
    if (actor !== player || player.punchTimer <= 0) {
      userData.leftArm.rotation.x = -walk * 0.28;
      userData.rightArm.rotation.x = walk * 0.28;
      userData.leftArm.rotation.z = userData.baseArmRotations.leftZ
        + (moving ? -Math.abs(walk) * 0.08 : 0);
      userData.rightArm.rotation.z = userData.baseArmRotations.rightZ
        + (moving ? Math.abs(walk) * 0.08 : 0);
    }
    actor.animations?.update?.(actor, {
      deltaSeconds,
      moving,
      totalTime: dependencies.getTotalTime(),
    });
  }

  function animateNpcAttack(npc) {
    const userData = npc.group.userData;
    if (!userData?.rightArm) return;
    if (npc.punchTimer > 0) {
      const progress = 1 - npc.punchTimer / (npc.punchDuration ?? PUNCH_SWING);
      const swing = Math.sin(progress * Math.PI);
      userData.rightArm.rotation.x = -1.5 * swing;
      userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 0.72 * swing;
      userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + 0.22 * swing;
      return;
    }
    if (npc.attackTimer > 0) {
      const progress = Math.sin((npc.attackTimer / 0.26) * Math.PI);
      userData.rightArm.rotation.x = -1.15 * progress;
      userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 0.48 * progress;
    }
  }

  function animatePlayerAttack(player) {
    const userData = player.group.userData;
    const progress = player.punchTimer > 0
      ? Math.sin((player.punchTimer / (player.punchDuration ?? PUNCH_SWING)) * Math.PI)
      : 0;
    if (player.animations?.attack?.(player, {
      progress,
      totalTime: dependencies.getTotalTime(),
    }) === true) return;

    userData.rightArm.rotation.x = -2.15 * progress;
    userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 1.05 * progress;
    userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + 0.42 * progress;
    const directionX = Math.sin(player.group.rotation.y);
    const directionZ = Math.cos(player.group.rotation.y);
    userData.visual.position.x = directionX * 0.18 * progress;
    userData.visual.position.z = directionZ * 0.18 * progress;
    if (progress <= 0) {
      userData.visual.position.x = 0;
      userData.visual.position.z = 0;
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
    animateActor(player, deltaSeconds, moving);
    animatePlayerAttack(player);
  }

  function buildSpatialGrid() {
    spatialGrid.clear();
    npcs.forEach((npc) => {
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

  function pushApart(a, b, minDistance, strength) {
    const deltaX = a.x - b.x;
    const deltaZ = a.z - b.z;
    const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
    if (distanceSquared <= 0.0001 || distanceSquared >= minDistance * minDistance) return;
    const distance = Math.sqrt(distanceSquared);
    const push = (minDistance - distance) * strength;
    a.x += (deltaX / distance) * push;
    a.z += (deltaZ / distance) * push;
    b.x -= (deltaX / distance) * push;
    b.z -= (deltaZ / distance) * push;
    dependencies.clampActorPosition(a);
    dependencies.clampActorPosition(b);
  }

  function separateActors() {
    buildSpatialGrid();
    const player = dependencies.getPlayer();
    npcs.forEach((actor) => {
      if (!actor.alive) return;
      getNearbyNpcs(actor.group.position).forEach((other) => {
        if (other === actor || !other.alive) return;
        if (actor.separationGroup && actor.separationGroup === other.separationGroup) return;
        pushApart(actor.group.position, other.group.position, 0.62, 0.018);
      });
      pushApart(actor.group.position, player.group.position, 0.72, 0.012);
    });
  }

  function updateNpcs(deltaSeconds) {
    if (dependencies.getLevel().legacy) return;
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      if (!npc.levelManaged) {
        if (npc.isDecoy) updateDecoy(npc, deltaSeconds);
        else updateWander(npc, deltaSeconds);
      }
      animateActor(npc, deltaSeconds, npc.walking);
      if (npc.attackResolveTimer != null) animateNpcAttack(npc);
    });
    separateActors();
    dependencies.dispatch({ type: "afterNpcUpdate", deltaSeconds });
  }

  function moveNpcToward(npc, waypoint, speed, deltaSeconds) {
    scratch3.copy(waypoint).sub(npc.group.position);
    scratch3.y = 0;
    if (scratch3.length() < 0.14) {
      npc.walking = false;
      return true;
    }
    scratch3.normalize();
    const previousX = npc.group.position.x;
    const previousZ = npc.group.position.z;
    scratch2.set(scratch3.x, scratch3.z);
    npc.group.position.x += scratch3.x * speed * deltaSeconds;
    npc.group.position.z += scratch3.z * speed * deltaSeconds;
    const hitObstacle = dependencies.resolveObstacleCollisions(
      npc.group.position,
      ACTOR_COLLISION_RADIUS,
      scratch2,
    );
    clampToWorld(npc.group.position);
    const moved = Math.hypot(
      npc.group.position.x - previousX,
      npc.group.position.z - previousZ,
    );
    if (hitObstacle && moved < speed * deltaSeconds * 0.2 && waypoint) {
      waypoint.x += randomRange(-1.2, 1.2);
      waypoint.z += randomRange(-1.2, 1.2);
      clampToWorld(waypoint);
    }
    const rotation = Math.atan2(scratch3.x, scratch3.z);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, rotation, 0.12);
    npc.walking = true;
    return false;
  }

  function faceNpcToward(npc, targetPosition) {
    scratch3.copy(targetPosition).sub(npc.group.position);
    scratch3.y = 0;
    if (scratch3.lengthSq() < 0.0001) return;
    const rotation = Math.atan2(scratch3.x, scratch3.z);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, rotation, 0.18);
  }

  function isActorFacingTarget(actor, target, maxDistance) {
    scratch2.set(
      target.group.position.x - actor.group.position.x,
      target.group.position.z - actor.group.position.z,
    );
    if (scratch2.length() > maxDistance) return false;
    getFacingVector(actor.group.rotation.y, facingScratch);
    return facingScratch.dot(scratch2.normalize()) >= HIT_FACING_DOT;
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

  function animateCheer(deltaSeconds) {
    const player = dependencies.getPlayer();
    const userData = player.group.userData;
    userData.visual.position.y = Math.abs(
      Math.sin(dependencies.getTotalTime() * 7.5),
    ) * 0.45;
    userData.leftArm.rotation.z = 2.45;
    userData.rightArm.rotation.z = -2.45;
    player.group.rotation.y += deltaSeconds * 1.8;
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
    moveNpcToward,
    faceNpcToward,
    randomOpenPosition,
    randomizePosition,
    isActorFacingTarget,
    setPartsVisible,
    compactDead,
    animateCheer,
    gridColumns: GRID_COLS,
  });
}
