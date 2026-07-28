import * as THREE from "three";
import {
  NPC_SPEED,
  ROUND_SECONDS,
  ATTEMPTS,
} from "../config/constants.js";
import { LEVELS, levelRegistry } from "../config/levels.js";
import { canvas, ui } from "../ui/dom.js";
import { createLevelViewHost } from "../ui/createLevelViewHost.js";
import { createGameUiController } from "../ui/createGameUiController.js";
import {
  createPlayer as createPlayerEntity,
  createNpc as createNpcEntity,
} from "../entities/actors.js";
import { setBlackEye, setLipstick } from "../entities/marks.js";
import { saveBestScore } from "../utils/storage.js";
import { calcRating } from "../utils/format.js";
import {
  sfxPunch,
  sfxHit,
  sfxWolfPunch,
  sfxThunder,
  sfxMiss,
  sfxNpcHit,
  sfxWin,
  sfxLose,
  resumeAudioOnInteraction,
} from "../systems/AudioSystem.js";
import { createWorldBuilder } from "../world/createWorldBuilder.js";
import { createFxSystem } from "../systems/FxSystem.js";
import { createLightningBolt } from "../world/lightning.js";
import { isCachedTexture } from "../world/textures.js";
import {
  registerObstacle as registerObstacleInLevel,
  collidesWithObstacle as collidesWithObstacleInLevel,
  resolveObstacleCollisions as resolveObstacleCollisionsInLevel,
  clampActorPosition as clampActorPositionInLevel,
} from "../world/obstacles.js";
import { createLevelRunner } from "../levels/levelRunner.js";
import { createLevelContext } from "../levels/createLevelContext.js";
import { GAME_PHASES } from "../core/gamePhase.js";
import { createGameSession } from "./createGameSession.js";
import { createGameLoop } from "./createGameLoop.js";
import { createActorSystem } from "../systems/createActorSystem.js";
import { createCombatSystem } from "../systems/createCombatSystem.js";
import { createInputController } from "../systems/createInputController.js";

let renderer;
let scene;
let camera;
let clock;
let player;
let settleTimer = null;
let fx;
let worldBuilder;
let levelViewHost;
let actorSystem;
let combatSystem;
let uiController;
let gameLoop;
let inputController;

let totalTime = 0;
const session = createGameSession();

const levelRunner = createLevelRunner({
  createContext: ({ definition, scope }) => createLevelContext({
    definition,
    scope,
    sceneData: session.levelState.sceneData,
    time: {
      getStatus: () => session.phase,
      getTotal: () => totalTime,
    },
    actors: {
      npcCount: getMatchNpcCount(),
      npcSpeed: NPC_SPEED,
      createNpc,
      addNpc: (npc) => actorSystem.addNpc(npc),
      addWanderNpc: (id) => actorSystem.addWanderNpc(id),
      getAll: () => actorSystem.getAll(),
      getNpcs: () => actorSystem.getNpcs(),
      getPlayer: () => player,
      dissolve: (npc) => combatSystem.dissolveNpc(npc),
      compactDead: () => actorSystem.compactDead(),
      randomizePosition: (actor) => actorSystem.randomizePosition(actor),
      setPartsVisible: (actor, partKey, visible) => {
        actorSystem.setPartsVisible(actor, partKey, visible);
      },
    },
    movement: {
      randomOpenPosition: () => actorSystem.randomOpenPosition(),
      faceNpcToward: (...args) => actorSystem.faceNpcToward(...args),
      moveNpcToward: (...args) => actorSystem.moveNpcToward(...args),
      collidesWithObstacle,
      isActorFacingTarget: (...args) => actorSystem.isActorFacingTarget(...args),
    },
    combat: {
      isFacingTarget: (...args) => combatSystem.isFacingTarget(...args),
      triggerShake,
      triggerHitstop,
      finishLevel: settleRound,
    },
    world: {},
    ui: {
      setBlackEye,
      setLipstick,
      showOverlay,
      hideOverlay,
      flashHud,
      refreshHud: updateHud,
      resetPlayerInput,
    },
    audio: {
      playSound: playLevelSound,
    },
    random: {
      range: randomRange,
    },
  }),
  onError(error, definition) {
    console.error(`关卡运行失败：${definition.id}`, error);
  },
});

function getMatchNpcCount() {
  return uiController.getMatchNpcCount();
}

function getWorldContext() {
  return {
    getScene: () => scene,
    getLevelState: () => session.levelState,
    randomRange,
    getMatchNpcCount,
    collidesWithObstacle: (pos, radius) => collidesWithObstacleInLevel(session.levelState, pos, radius),
    registerObstacle: (x, z, halfW, halfD) => registerObstacleInLevel(session.levelState, x, z, halfW, halfD),
    createLightningBolt: (x, z, width, height, tilt) => createLightningBolt(x, z, width, height, tilt, randomRange),
  };
}

function createPlayer() {
  return session.levelState?.level.extensions?.createPlayer?.()
    ?? createPlayerEntity();
}

function createNpc(id, flags) {
  return session.levelState?.level.extensions?.createNpc?.(id, flags, randomRange)
    ?? createNpcEntity(id, flags, {}, randomRange);
}

function registerObstacle(x, z, halfW, halfD) {
  registerObstacleInLevel(session.levelState, x, z, halfW, halfD);
}

function collidesWithObstacle(pos, radius) {
  return collidesWithObstacleInLevel(session.levelState, pos, radius);
}

function resolveObstacleCollisions(position, radius, velocity) {
  return resolveObstacleCollisionsInLevel(session.levelState, position, radius, velocity);
}

function clampActorPosition(position, velocity) {
  clampActorPositionInLevel(session.levelState, position, velocity);
}

function buildWorld(level) {
  if (!worldBuilder) worldBuilder = createWorldBuilder(getWorldContext());
  worldBuilder.buildWorld(level);
}

function triggerHitstop(duration) {
  fx.triggerHitstop(duration);
}

function triggerShake(intensity, duration) {
  fx.triggerShake(intensity, duration);
}

function showOverlay(kind, options) {
  uiController.showOverlay(kind, options);
}

function hideOverlay(kind) {
  uiController.hideOverlay(kind);
}

function flashHud(className, durationMs) {
  uiController.flashHud(className, durationMs);
}

function playLevelSound(name, delayMs = 0) {
  const sounds = {
    thunder: sfxThunder,
    hit: sfxHit,
    miss: sfxMiss,
    npcHit: sfxNpcHit,
    wolfPunch: sfxWolfPunch,
  };
  const play = sounds[name];
  if (!play) return;
  if (delayMs > 0) {
    window.setTimeout(play, delayMs);
  } else {
    play();
  }
}

function resetPlayerInput() {
  inputController.reset();
}

function updateShake(dt) {
  fx.updateShake(dt, camera);
}

function settleRound(won, failMessage, delayMs = won ? 500 : 400) {
  if (session.phase !== GAME_PHASES.PLAYING) return;
  session.transition(GAME_PHASES.SETTLING);
  if (settleTimer) window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    settleTimer = null;
    finishRound(won, failMessage);
  }, delayMs);
}

function showLevelSelect() {
  uiController.showLevelSelect();
}

function leaveLevel() {
  clearPendingRoundEndTimers();
  disposeScene();
  scene = null;
  session.reset();
}

function selectLevelById(id) {
  const index = levelRegistry.getIndexById(id);
  if (index >= 0) resetLevel(index);
}

function clearPendingRoundEndTimers() {
  if (settleTimer) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
}


export function boot() {
  inputController = createInputController({
    isActive: () => session.phase === GAME_PHASES.PLAYING,
    joystick: ui.joystick,
    joystickKnob: ui.joystickKnob,
    primeAudio: resumeAudioOnInteraction,
    onAttack: () => combatSystem.triggerAttack(),
  });
  fx = createFxSystem({
    ui,
    getPlayer: () => player,
    getScene: () => scene,
    randomRange,
  });
  actorSystem = createActorSystem({
    getScene: () => scene,
    getPlayer: () => player,
    getLevel: () => session.levelState.level,
    createNpc,
    collidesWithObstacle,
    clampActorPosition,
    resolveObstacleCollisions,
    dispatch: (action) => levelRunner.handleAction(action),
    startLevel(level) {
      levelRunner.load(level);
      levelRunner.start();
    },
    getTotalTime: () => totalTime,
    randomRange,
    readPlayerInput: (target) => inputController.readDirection(target),
    applyInputLock: (direction) => inputController.applyReverseLock(direction),
    getPlayerVelocity: () => inputController.getPlayerVelocity(),
    updatePlayerTimers: (deltaSeconds) => combatSystem.updateCooldown(deltaSeconds),
  });
  combatSystem = createCombatSystem({
    session,
    getPlayer: () => player,
    getNpcs: () => actorSystem.getNpcs(),
    dispatch: (action) => levelRunner.handleAction(action),
    consumeActionInterval: () => inputController.consumeAction(),
    playSound: playLevelSound,
    playPunch: sfxPunch,
    playHit: sfxHit,
    playMiss: sfxMiss,
    triggerHitstop,
    triggerShake,
    settleRound,
    refreshHud: updateHud,
    dissolveActor: (actor) => fx.createPixelBurst(actor),
  });
  levelViewHost = createLevelViewHost({
    root: ui.hud,
    themedElements: [
      ui.hud,
      ui.attackButton,
      ui.sceneName,
      ui.clueBar,
      ui.attemptChip,
    ],
    onAction: (action) => levelRunner.handleAction(action),
  });
  uiController = createGameUiController({
    ui,
    session,
    levelRegistry,
    levelViewHost,
    getHudState: () => levelRunner.handleAction({ type: "getHudState" }),
    getCooldown: () => ({
      cooldown: combatSystem.cooldown,
      cooldownMax: combatSystem.cooldownMax,
    }),
    onSelectLevel: selectLevelById,
    onLeaveLevel: leaveLevel,
    onStart() {
      session.transition(GAME_PHASES.PLAYING);
      session.levelState.startTime = totalTime;
      updateHud();
      levelRunner.handleAction({ type: "beginPlay" });
    },
    onPause: () => session.transition(GAME_PHASES.PAUSED),
    onResume: () => session.transition(GAME_PHASES.PLAYING),
    onRetry() {
      clearPendingRoundEndTimers();
      resetLevel(session.currentLevelIndex);
    },
    onAttack: () => combatSystem.triggerAttack(),
  });
  gameLoop = createGameLoop({
    session,
    hasScene: () => Boolean(scene),
    consumeHitstop: (deltaSeconds) => fx.consumeHitstop(deltaSeconds),
    advanceTime: (deltaSeconds) => {
      totalTime += deltaSeconds;
    },
    updateLevel: (deltaSeconds) => levelRunner.update(deltaSeconds),
    updateTimer(deltaSeconds) {
      if (session.levelState.level.timeLimit === null) return;
      session.levelState.remaining = Math.max(
        0,
        session.levelState.remaining - deltaSeconds,
      );
      if (session.levelState.remaining <= 0) finishRound(false);
    },
    updatePlayerEffects(deltaSeconds) {
      if (player.hitInvuln > 0) {
        player.hitInvuln = Math.max(0, player.hitInvuln - deltaSeconds);
      }
      const userData = player.group?.userData;
      if (userData?.damageFlash > 0) {
        userData.damageFlash = Math.max(0, userData.damageFlash - deltaSeconds);
      }
      if (fx.damageFlashTimer > 0) {
        fx.damageFlashTimer = Math.max(0, fx.damageFlashTimer - deltaSeconds);
      }
    },
    updateActors(deltaSeconds) {
      actorSystem.updatePlayer(deltaSeconds);
      actorSystem.updateNpcs(deltaSeconds);
    },
    updateResultActors: (deltaSeconds) => actorSystem.animateCheer(deltaSeconds),
    updateUi: updateHud,
    updateEffects: (deltaSeconds) => fx.updateParticles(deltaSeconds),
    updateShake,
    render: () => renderer.render(scene, camera),
  });

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  clock = new THREE.Clock();
  camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  camera.position.set(0, 19.5, 17.2);
  camera.lookAt(0, 0, 0);

  inputController.bind();
  uiController.bind();
  resize();
  window.addEventListener("resize", resize);

  // 初始显示关卡选择，不直接加载关卡
  showLevelSelect();
  renderer.setAnimationLoop(() => gameLoop.tick(clock.getDelta()));
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  const viewHeight = height < 620 ? 14 : 15.5;

  camera.left = (-viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function disposeScene() {
  levelRunner.dispose();
  if (!scene) return;
  fx?.clearParticles();

  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        // 不 dispose 缓存中的纹理（floor/wall texture cache 管理）
        if (mat.map && !isCachedTexture(mat.map)) mat.map.dispose();
        if (!fx?.isCachedPixelMaterial(mat)) mat.dispose();
      });
    }
  });
}


function resetLevel(index, options = {}) {
  clearPendingRoundEndTimers();
  // 先清理旧场景资源
  disposeScene();

  const level = LEVELS[index];

  scene = new THREE.Scene();
  scene.userData.cleanups = [];
  actorSystem.reset();
  combatSystem.reset();
  totalTime = options.elapsed ?? 0;
  fx?.reset();
  inputController.reset();
  const nextLevelState = {
    level,
    remaining: level.timeLimit === null
      ? 9999
      : (level.timeLimit ?? ROUND_SECONDS),
    attempts: ATTEMPTS,
    startTime: 0,
    obstacles: [],
  };
  session.loadLevel({ index, state: nextLevelState });
  session.transition(GAME_PHASES.BRIEFING);
  if (options.skipBriefing) session.transition(GAME_PHASES.PLAYING);

  buildWorld(level);

  player = createPlayer();
  player.group.position.copy(actorSystem.randomOpenPosition());
  scene.add(player.group);

  actorSystem.spawnNpcs(level);

  if (options.skipBriefing) {
    session.levelState.startTime = totalTime - (options.elapsed ?? 0);
    ui.levelSelectModal.classList.remove("visible");
    ui.taskModal.classList.remove("visible");
  } else {
    showTask();
    return;
  }
  updateHud();
}

function showTask() {
  uiController.showTask();
}


function finishRound(won, failMessage) {
  if ([GAME_PHASES.RESULT, GAME_PHASES.LEVEL_SELECT].includes(session.phase)) return;
  if (!session.levelState?.level || !scene) return;
  clearPendingRoundEndTimers();
  if (session.phase === GAME_PHASES.PLAYING) {
    session.transition(GAME_PHASES.SETTLING);
  }
  if (session.phase !== GAME_PHASES.SETTLING) return;
  player.cheer = won;
  if (won) sfxWin(); else sfxLose();

  const resultResource = levelRunner.handleAction({ type: "getResultStats" });
  const timeUsed = Math.round(totalTime - session.levelState.startTime);
  const attemptsLeft = resultResource?.attemptsLeft ?? session.levelState.attempts;
  const rating = calcRating(won, timeUsed, attemptsLeft);
  session.setResult({ won, failMessage, timeUsed, attemptsLeft, rating });
  session.transition(GAME_PHASES.RESULT);

  uiController.showResult({
    won,
    failMessage,
    resultResource,
    timeUsed,
    attemptsLeft,
    rating,
  });

  // 保存最佳成绩
  if (won) {
    saveBestScore(session.levelState.level.id, {
      grade: rating.grade,
      rating: rating.rating,
      time: timeUsed,
    });
  }

  if (!won) {
    const data = player.group.userData;
    data.visual.position.y = 0;
    data.leftArm.rotation.z = 0.9;
    data.rightArm.rotation.z = -0.9;
  }
}

function updateHud() {
  uiController.updateHud();
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
