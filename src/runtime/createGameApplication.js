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
import { createFxSystem } from "../systems/FxSystem.js";
import { isCachedTexture } from "../world/textures.js";
import { createLevelRunner } from "../levels/levelRunner.js";
import { createLevelContext } from "../levels/createLevelContext.js";
import { GAME_PHASES } from "../core/gamePhase.js";
import { createGameSession } from "./createGameSession.js";
import { createGameLoop } from "./createGameLoop.js";
import { createRenderingSystem } from "./createRenderingSystem.js";
import { createRoundSettlement } from "./createRoundSettlement.js";
import { createWorldRuntime } from "./createWorldRuntime.js";
import { createActorSystem } from "../systems/createActorSystem.js";
import { createCombatSystem } from "../systems/createCombatSystem.js";
import { createInputController } from "../systems/createInputController.js";

let scene;
let player;
let fx;
let levelViewHost;
let actorSystem;
let combatSystem;
let uiController;
let gameLoop;
let inputController;
let rendering;
let settlement;
let worldRuntime;

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
      collidesWithObstacle: (...args) => worldRuntime.collidesWithObstacle(...args),
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
      showOverlay: (...args) => uiController.showOverlay(...args),
      hideOverlay: (...args) => uiController.hideOverlay(...args),
      flashHud: (...args) => uiController.flashHud(...args),
      refreshHud: () => uiController.updateHud(),
      resetPlayerInput: () => inputController.reset(),
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

function createPlayer() {
  return session.levelState?.level.extensions?.createPlayer?.()
    ?? createPlayerEntity();
}

function createNpc(id, flags) {
  return session.levelState?.level.extensions?.createNpc?.(id, flags, randomRange)
    ?? createNpcEntity(id, flags, {}, randomRange);
}

function triggerHitstop(duration) {
  fx.triggerHitstop(duration);
}

function triggerShake(intensity, duration) {
  fx.triggerShake(intensity, duration);
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

function updateShake(dt) {
  fx.updateShake(dt, rendering.camera);
}

function settleRound(won, failMessage, delayMs = won ? 500 : 400) {
  settlement.settle(won, failMessage, delayMs);
}

function leaveLevel() {
  settlement.clearPending();
  disposeScene();
  scene = null;
  session.reset();
}

function selectLevelById(id) {
  const index = levelRegistry.getIndexById(id);
  if (index >= 0) resetLevel(index);
}

export function boot() {
  rendering = createRenderingSystem({
    THREE,
    canvas,
    isCachedTexture,
  });
  worldRuntime = createWorldRuntime({
    getScene: () => scene,
    getLevelState: () => session.levelState,
    getMatchNpcCount,
    randomRange,
  });
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
    collidesWithObstacle: (...args) => worldRuntime.collidesWithObstacle(...args),
    clampActorPosition: (...args) => worldRuntime.clampActorPosition(...args),
    resolveObstacleCollisions: (...args) => worldRuntime.resolveObstacleCollisions(...args),
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
    refreshHud: () => uiController.updateHud(),
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
      uiController.updateHud();
      levelRunner.handleAction({ type: "beginPlay" });
    },
    onPause: () => session.transition(GAME_PHASES.PAUSED),
    onResume: () => session.transition(GAME_PHASES.PLAYING),
    onRetry() {
      settlement.clearPending();
      resetLevel(session.currentLevelIndex);
    },
    onAttack: () => combatSystem.triggerAttack(),
  });
  settlement = createRoundSettlement({
    session,
    getPlayer: () => player,
    hasScene: () => Boolean(scene),
    getTotalTime: () => totalTime,
    getResultStats: () => levelRunner.handleAction({ type: "getResultStats" }),
    calculateRating: calcRating,
    showResult: (result) => uiController.showResult(result),
    saveBestScore,
    playWin: sfxWin,
    playLose: sfxLose,
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
      if (session.levelState.remaining <= 0) settlement.finish(false);
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
    updateUi: () => uiController.updateHud(),
    updateEffects: (deltaSeconds) => fx.updateParticles(deltaSeconds),
    updateShake,
    render: () => rendering.render(scene),
  });

  inputController.bind();
  uiController.bind();
  uiController.showLevelSelect();
  rendering.start((deltaSeconds) => gameLoop.tick(deltaSeconds));
}

function disposeScene() {
  levelRunner.dispose();
  rendering?.disposeScene(scene, fx);
}


function resetLevel(index, options = {}) {
  settlement.clearPending();
  // 先清理旧场景资源
  disposeScene();

  const level = LEVELS[index];

  scene = rendering.createScene();
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

  worldRuntime.buildWorld(level);

  player = createPlayer();
  player.group.position.copy(actorSystem.randomOpenPosition());
  scene.add(player.group);

  actorSystem.spawnNpcs(level);

  if (options.skipBriefing) {
    session.levelState.startTime = totalTime - (options.elapsed ?? 0);
    ui.levelSelectModal.classList.remove("visible");
    ui.taskModal.classList.remove("visible");
  } else {
    uiController.showTask();
    return;
  }
  uiController.updateHud();
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
