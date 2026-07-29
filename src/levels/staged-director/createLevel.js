import * as THREE from "three";
import { HIT_RANGE } from "../../config/constants.js";

const CAST_SIZE = 13;
const PHASES = [
  ["prepare", 2],
  ["cue", 1],
  ["perform", 3],
  ["reveal", 3],
  ["reset", 2],
];
const PUNCH_COOLDOWN = 2;

function clonePoint(point, fallbackX, fallbackZ) {
  if (point?.clone) return point.clone();
  return new THREE.Vector3(fallbackX, 0, fallbackZ);
}

function fallbackStagePoints() {
  return {
    player: new THREE.Vector3(0, 0, 5.8),
    blindStart: new THREE.Vector3(-3.4, 0, 0),
    riderStart: new THREE.Vector3(3.4, 0, -0.72),
    collision: new THREE.Vector3(0, 0, -0.08),
    camera: new THREE.Vector3(0, 0, 2.75),
    directorSpots: [
      new THREE.Vector3(-2.7, 0, 3.25),
      new THREE.Vector3(0.9, 0, 3.6),
      new THREE.Vector3(2.8, 0, 2.7),
    ],
    crowdSpots: [
      new THREE.Vector3(-7.2, 0, 4.5),
      new THREE.Vector3(-6.2, 0, -3.8),
      new THREE.Vector3(-3.6, 0, 4.2),
      new THREE.Vector3(-1.2, 0, -4.4),
      new THREE.Vector3(2.3, 0, 4.6),
      new THREE.Vector3(5.6, 0, -3.9),
      new THREE.Vector3(7.2, 0, 4.1),
    ],
  };
}

export function createStagedDirectorLevel(context) {
  const stagePoints = context.sceneData?.stagePoints ?? fallbackStagePoints();
  let cast = [];
  let phaseIndex = 0;
  let phaseElapsed = 0;
  let attemptsLeft = context.definition?.attempts ?? 3;
  let hintTimer = 0;

  function getPhase() {
    return PHASES[phaseIndex][0];
  }

  function setPosition(actor, point) {
    actor.group.position.copy(point);
    actor.walking = false;
  }

  function getRole(role) {
    return cast.find((actor) => actor.role === role && actor.alive);
  }

  function getDirectors() {
    return cast.filter((actor) => actor.directorSuspect && actor.alive);
  }

  function getDirectorTarget() {
    return cast.find((actor) => actor.directorTarget && actor.alive);
  }

  function resetActorVisuals() {
    cast.forEach((actor) => {
      actor.group.userData.visual?.setDirecting?.(false);
      actor.group.userData.visual?.setCameraRaised?.(false);
    });
  }

  function resetPerformance() {
    const blind = getRole("blind");
    const rider = getRole("rider");
    const camera = getRole("camera");
    if (blind) setPosition(blind, clonePoint(stagePoints.blindStart, -3.4, 0));
    if (rider) setPosition(rider, clonePoint(stagePoints.riderStart, 3.4, -0.72));
    if (camera) setPosition(camera, clonePoint(stagePoints.camera, 0, 2.75));
    getDirectors().forEach((director, index) => {
      const point = stagePoints.directorSpots[index % stagePoints.directorSpots.length];
      setPosition(director, clonePoint(point, -2 + index * 2, 3));
    });
    resetActorVisuals();
  }

  function enterPhase(index) {
    phaseIndex = index % PHASES.length;
    context.sceneData?.setPerformancePhase?.(getPhase());
    if (getPhase() === "prepare") resetPerformance();
  }

  function setPhase(index) {
    phaseElapsed = 0;
    enterPhase(index);
  }

  function addActor(id, flags, point) {
    const actor = context.actors.createNpc(id, flags);
    actor.role ??= flags.role ?? "crowd";
    actor.levelManaged ??= actor.role !== "crowd";
    actor.directorSuspect ??= actor.role === "director";
    actor.directorTarget ??= Boolean(flags.directorTarget);
    actor.isProtectedActor ??= Boolean(flags.protectedActor);
    actor.isLevelTarget ??= Boolean(flags.levelTarget);
    setPosition(actor, point);
    context.actors.addNpc(actor);
    cast.push(actor);
    return actor;
  }

  function start() {
    cast = [];
    attemptsLeft = context.definition?.attempts ?? 3;
    hintTimer = 0;
    context.actors.getPlayer?.()?.group?.position?.copy?.(
      clonePoint(stagePoints.player, 0, 5.8),
    );
    addActor(0, {
      role: "director",
      directorTarget: true,
      levelTarget: true,
    }, clonePoint(stagePoints.directorSpots[0], -2.7, 3.25));
    addActor(1, { role: "director" }, clonePoint(stagePoints.directorSpots[1], 0.9, 3.6));
    addActor(2, { role: "director" }, clonePoint(stagePoints.directorSpots[2], 2.8, 2.7));
    addActor(3, { role: "blind", protectedActor: true }, clonePoint(stagePoints.blindStart, -3.4, 0));
    addActor(4, { role: "rider" }, clonePoint(stagePoints.riderStart, 3.4, -0.72));
    addActor(5, { role: "camera" }, clonePoint(stagePoints.camera, 0, 2.75));
    for (let id = 6; id < CAST_SIZE; id += 1) {
      addActor(id, { role: "crowd" }, clonePoint(
        stagePoints.crowdSpots[(id - 6) % stagePoints.crowdSpots.length],
        -6 + (id - 6) * 2,
        id % 2 === 0 ? 4 : -4,
      ));
    }
    setPhase(0);
  }

  function updateCue() {
    const director = getDirectorTarget();
    const rider = getRole("rider");
    const camera = getRole("camera");
    director?.group.userData.visual?.setDirecting?.(true);
    camera?.group.userData.visual?.setCameraRaised?.(true);
    if (rider && director) context.movement.faceNpcToward(rider, director.group.position);
    if (camera && director) context.movement.faceNpcToward(camera, director.group.position);
  }

  function updatePerform(deltaSeconds) {
    const blind = getRole("blind");
    const rider = getRole("rider");
    const camera = getRole("camera");
    const collision = clonePoint(stagePoints.collision, 0, -0.08);
    if (blind) {
      blind.walking = true;
      context.movement.moveNpcToward(blind, collision, context.actors.npcSpeed * 0.48, deltaSeconds);
    }
    if (rider) {
      rider.walking = true;
      context.movement.moveNpcToward(rider, collision, context.actors.npcSpeed * 0.72, deltaSeconds);
    }
    if (camera) {
      camera.walking = false;
      camera.group.userData.visual?.setCameraRaised?.(true);
      context.movement.faceNpcToward(camera, collision);
    }
  }

  function updateReveal() {
    const director = getDirectorTarget();
    if (!director) return;
    ["blind", "rider", "camera"].forEach((role) => {
      const actor = getRole(role);
      if (!actor) return;
      actor.walking = false;
      context.movement.faceNpcToward(actor, director.group.position);
    });
    director.walking = false;
  }

  function updateReset(deltaSeconds) {
    resetActorVisuals();
    const blind = getRole("blind");
    const rider = getRole("rider");
    if (blind) context.movement.moveNpcToward(blind, clonePoint(stagePoints.blindStart, -3.4, 0), context.actors.npcSpeed * 0.65, deltaSeconds);
    if (rider) context.movement.moveNpcToward(rider, clonePoint(stagePoints.riderStart, 3.4, -0.72), context.actors.npcSpeed * 0.76, deltaSeconds);
  }

  function update(deltaSeconds) {
    hintTimer = Math.max(0, hintTimer - deltaSeconds);
    phaseElapsed += deltaSeconds;
    while (phaseElapsed >= PHASES[phaseIndex][1]) {
      phaseElapsed -= PHASES[phaseIndex][1];
      enterPhase(phaseIndex + 1);
    }
    const phase = getPhase();
    if (phase === "cue") updateCue();
    if (phase === "perform") updatePerform(deltaSeconds);
    if (phase === "reveal") updateReveal();
    if (phase === "reset") updateReset(deltaSeconds);
  }

  function findHitTarget({ playerPos, facing }) {
    let best = null;
    let bestDistance = Infinity;
    context.actors.getNpcs().forEach((npc) => {
      if (!npc.alive) return;
      if (npc.isProtectedActor) return;
      const dx = npc.group.position.x - playerPos.x;
      const dz = npc.group.position.z - playerPos.z;
      const distance = Math.hypot(dx, dz);
      if (distance > HIT_RANGE) return;
      const toTarget = new THREE.Vector2(dx, dz);
      if (!context.combat.isFacingTarget(facing, toTarget)) return;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = npc;
      }
    });
    if (!best) return null;
    return {
      npc: best,
      correct: Boolean(best.directorTarget),
      protected: Boolean(best.isProtectedActor),
    };
  }

  function handleProtectedHit() {
    hintTimer = 1.3;
    context.combat.triggerShake?.(0.08, 0.08);
    context.audio.playSound?.("miss");
    context.ui.flashHud?.("staged-director-warning", 180);
    context.ui.refreshHud?.();
    return { handled: true, cooldown: 0.35 };
  }

  function handleCorrectHit(npc) {
    context.actors.dissolve?.(npc);
    context.combat.triggerHitstop?.(0.08);
    context.combat.triggerShake?.(0.35, 0.2);
    context.audio.playSound?.("hit");
    context.combat.finishLevel?.(true, null, 760);
    return { handled: true };
  }

  function handleWrongHit(npc) {
    attemptsLeft = Math.max(0, attemptsLeft - 1);
    context.combat.triggerShake?.(0.12, 0.1);
    context.audio.playSound?.("miss");
    hintTimer = 1.5;
    setPhase(0);
    context.ui.refreshHud?.();
    if (attemptsLeft <= 0) {
      context.combat.finishLevel?.(false, null, 680);
    }
    return { handled: true };
  }

  function createViewModel() {
    const phase = getPhase();
    const phaseClues = {
      prepare: "先移动找到自己，等摆拍开始",
      cue: "有人发令了，演员开始响应",
      perform: "观察表演结束后演员会看向谁",
      reveal: "现在看三名演员共同面向的人",
      reset: "没看清就等下一轮，导演会重新混入",
    };
    return {
      mission: "观察摆拍结束后的回看方向，找出真正导演。",
      clue: hintTimer > 0
        ? "别打表演者，目标是发号施令的幕后导演"
        : phaseClues[phase],
      resourceLabel: "出拳",
      resourceText: String(attemptsLeft),
      resultResource: {
        label: "剩余出拳",
        value: `${attemptsLeft} 次`,
        attemptsLeft,
      },
    };
  }

  function handleAction(action) {
    if (action.type === "beforeAttack") {
      return { blocked: false, cooldown: PUNCH_COOLDOWN, resetCombo: false };
    }
    if (action.type === "findHitTarget") return findHitTarget(action);
    if (action.type === "hitTarget") {
      const hit = action.hit;
      if (!hit?.npc) return { handled: false };
      if (hit.protected || hit.npc.isProtectedActor) return handleProtectedHit();
      if (hit.correct || hit.npc.directorTarget) return handleCorrectHit(hit.npc);
      return handleWrongHit(hit.npc);
    }
    if (action.type === "actorDissolved") return undefined;
    if (action.type === "getHudState") return createViewModel();
    if (action.type === "getResultStats") return createViewModel().resultResource;
    return undefined;
  }

  return {
    start,
    update,
    handleAction,
    dispose() {
      cast = [];
    },
  };
}
