import * as THREE from "three";
import { NPC_SPEED, ROUND_SECONDS, ATTEMPTS } from "../config/constants.js";
import { LEVELS, levelRegistry } from "../config/levels.js";
import { canvas, ui } from "../ui/dom.js";
import { createLevelViewHost } from "../ui/createLevelViewHost.js";
import { createGameUiController } from "../ui/createGameUiController.js";
import {
  createPlayer as createPlayerEntity,
  createNpc as createNpcEntity,
} from "../entities/actors.js";
import * as marks from "../entities/marks.js";
import { saveBestScore } from "../utils/storage.js";
import { calcRating } from "../utils/format.js";
import { createFxSystem } from "../systems/FxSystem.js";
import { isCachedTexture } from "../world/textures.js";
import { GAME_PHASES } from "../core/gamePhase.js";
import { createClassicLevelRunner } from "./createClassicLevelRunner.js";
import { createGameSession } from "./createGameSession.js";
import { createGameLoop } from "./createGameLoop.js";
import { createClassicGameExperience } from "./createClassicGameExperience.js";
import { createStandaloneExperienceHost } from "./createExperienceHost.js";
import { createExperienceManager } from "./createExperienceManager.js";
import { createRenderingSystem } from "./createRenderingSystem.js";
import { createRoundSettlement } from "./createRoundSettlement.js";
import { createWorldRuntime } from "./createWorldRuntime.js";
import { createActorSystem } from "../systems/createActorSystem.js";
import { createCombatSystem } from "../systems/createCombatSystem.js";
import { createInputController } from "../systems/createInputController.js";
import { createStoryProgress } from "../progression/createStoryProgress.js";
import { randomRange } from "../utils/math.js";
import { createOrientationController } from "./createOrientationController.js";
import { createHistoryTimelineFlow } from "./createHistoryTimelineFlow.js";
import { createPlayerFeedback } from "./createPlayerFeedback.js";
let scene, player, fx, levelViewHost;
let actorSystem, combatSystem, inputController, worldRuntime;
let uiController, gameLoop, rendering, settlement, experienceManager;
let storyProgress, historyTimelineFlow, totalTime = 0;
const session = createGameSession();
const playerFeedback = createPlayerFeedback();
const { audio, storyBgm } = playerFeedback;
const levelRunner = createClassicLevelRunner({
  session,
  getServices: () => ({
    actorSystem,
    combatSystem,
    worldRuntime,
    uiController,
    inputController,
  }),
  getTotalTime: () => totalTime,
  getMatchNpcCount,
  getPlayer: () => player,
  createNpc,
  triggerShake,
  triggerHitstop,
  settleRound,
  playSound: audio.play,
  randomRange,
  npcSpeed: NPC_SPEED,
  marks,
  onError(error, definition) {
    console.error(`关卡运行失败：${definition.id}`, error);
  },
});
function getMatchNpcCount() { return uiController.getMatchNpcCount(); }
function createPlayer() {
  return session.levelState?.level.extensions?.createPlayer?.()
    ?? createPlayerEntity();
}

function createNpc(id, flags) {
  return session.levelState?.level.extensions?.createNpc?.(id, flags, randomRange)
    ?? createNpcEntity(id, flags, {}, randomRange);
}

function triggerHitstop(duration) { fx.triggerHitstop(duration); }
function triggerShake(intensity, duration) { fx.triggerShake(intensity, duration); }

function updateShake(dt) { fx.updateShake(dt, rendering.camera); }

function settleRound(won, failMessage, delayMs = won ? 500 : 400) { settlement.settle(won, failMessage, delayMs); }

function leaveLevel() {
  settlement.clearPending();
  experienceManager?.dispose();
  session.reset();
  storyBgm.playIntro();
}

function selectLevelById(id) {
  const definition = levelRegistry.getById(id);
  if (definition?.track === "mainline" && !storyProgress?.isUnlocked(id)) return;
  const index = levelRegistry.getIndexById(id);
  if (index >= 0) resetLevel(index);
}

function startExperience() {
  if (session.phase !== GAME_PHASES.BRIEFING) return;
  session.transition(GAME_PHASES.PLAYING);
  session.levelState.startTime = totalTime;
  experienceManager.start();
}

function pauseExperience() {
  if (session.phase !== GAME_PHASES.PLAYING) return;
  session.transition(GAME_PHASES.PAUSED);
  experienceManager.pause();
}

function resumeExperience() {
  if (session.phase !== GAME_PHASES.PAUSED) return;
  session.transition(GAME_PHASES.PLAYING);
  experienceManager.resume();
}

function createStandaloneHost({ definition, scope }) {
  return createStandaloneExperienceHost({
    definition,
    scope,
    documentTarget: document,
    parent: ui.hud,
    windowTarget: window,
    canvas,
    onInput: (action) => experienceManager.handleInput(action),
    time: {
      getPhase: () => session.phase,
      getTotal: () => totalTime,
    },
    rendering: {
      THREE,
      canvas,
      renderer: rendering.renderer,
      createScene: rendering.createScene,
      createCamera: rendering.createCamera,
      render: rendering.render,
      disposeScene: (targetScene) => rendering.disposeScene(targetScene),
    },
    audio: audio.experience,
    flow: {
      start: startExperience,
      pause: pauseExperience,
      resume: resumeExperience,
      finish: ({ won, failMessage, stats } = {}) =>
        settlement.finish(Boolean(won), failMessage, stats),
      leave: () => uiController.showHome(),
    },
    controls: inputController,
    ui: uiController,
    storageBackend: window.localStorage,
    randomRange,
  });
}

function createClassicRuntime(definition) {
  return createClassicGameExperience({
    session,
    levelRunner,
    actorSystem,
    combatSystem,
    fx,
    uiController,
    rendering,
    getScene: () => scene,
    getPlayer: () => player,
    settlement,
    updateShake,
    mount: () => levelViewHost.setStyles(definition.styleText ?? ""),
    dispose: disposeClassicScene,
  });
}

export function boot() {
  storyProgress = createStoryProgress({ levels: levelRegistry.mainline, storage: window.localStorage, unlockAll: import.meta.env.DEV });
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
    isActive: () => session.phase === GAME_PHASES.PLAYING
      && ["classic", "shared"].includes(experienceManager?.presentation),
    joystickHitArea: ui.joystickHitArea,
    joystick: ui.joystick,
    joystickKnob: ui.joystickKnob,
    primeAudio: audio.resume,
    onAttack: () => experienceManager?.handleInput({ type: "primary" }),
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
    getCamera: () => rendering.camera,
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
    ...audio.combat,
    vibrate: playerFeedback.vibrate,
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
    storyProgress,
    getHudState: () => levelRunner.handleAction({ type: "getHudState" }),
    getCooldown: () => ({ cooldown: combatSystem.cooldown, cooldownMax: combatSystem.cooldownMax }),
    onSelectLevel: selectLevelById,
    onLeaveLevel: leaveLevel,
    onStart: startExperience,
    onPause: pauseExperience,
    onResume: resumeExperience,
    onPrelaunchDismissed: () => storyBgm.playIntro(),
    onHomeShown: () => historyTimelineFlow?.showHome(),
    onDifficultyChanged: () => historyTimelineFlow?.showHome(),
    onPreferencesChanged: playerFeedback.setPreferences,
    onRetry() {
      settlement.clearPending();
      resetLevel(session.currentLevelIndex);
    },
    onAttack: () => experienceManager?.handleInput({ type: "primary" }),
  });
  experienceManager = createExperienceManager({
    createHost({ definition, scope }) {
      return definition.extensions?.createExperience
        ? createStandaloneHost({ definition, scope })
        : { definition, scope };
    },
    createClassicExperience: createClassicRuntime,
    onError(error, definition) {
      console.error(`关卡体验运行失败：${definition.id}`, error);
      uiController.showHome();
    },
  });
  historyTimelineFlow = createHistoryTimelineFlow({
    ui,
    levels: [...levelRegistry.mainline, ...levelRegistry.extra],
    storage: window.localStorage,
    storyProgress,
    onEnterLevel: selectLevelById,
    getNpcCount: (level) => uiController.getMatchNpcCount(level),
  });
  settlement = createRoundSettlement({
    session,
    getPlayer: () => player,
    hasScene: () => Boolean(experienceManager.active),
    getTotalTime: () => totalTime,
    getResultStats: () => experienceManager.getResultStats(),
    calculateRating: calcRating,
    saveBestScore,
    onLevelCompleted: (level) => historyTimelineFlow?.onLevelCompleted(level),
    onRoundSettled() {
      storyBgm.stop();
      uiController.showHome();
    },
    ...audio.settlement,
  });
  gameLoop = createGameLoop({
    session,
    getExperience: () =>
      experienceManager.active ? experienceManager : null,
    advanceTime: (deltaSeconds) => {
      totalTime += deltaSeconds;
    },
  });

  inputController.bind();
  uiController.bind();
  historyTimelineFlow.bind();
  createOrientationController({
    windowTarget: window,
    documentTarget: document,
    overlay: ui.orientationOverlay,
    isPlaying: () => session.phase === GAME_PHASES.PLAYING,
    isPaused: () => session.phase === GAME_PHASES.PAUSED,
    pause: pauseExperience,
    resume: resumeExperience,
    resetInput: inputController.reset,
    onResize: rendering.resize,
  }).bind();
  uiController.showHome();
  storyBgm.playIntro();
  rendering.start((deltaSeconds) => gameLoop.tick(deltaSeconds));
}
function disposeClassicScene() {
  levelRunner.dispose();
  rendering?.disposeScene(scene, fx);
  levelViewHost?.clear();
  scene = null;
  player = null;
}

function resetLevel(index, options = {}) {
  settlement.clearPending();
  experienceManager.dispose();

  const level = LEVELS[index];
  storyBgm.playForLevel(level);
  totalTime = options.elapsed ?? 0;
  inputController.reset();
  const nextLevelState = {
    level,
    remaining: level.timeLimit === null ? 9999 : (level.timeLimit ?? ROUND_SECONDS),
    attempts: ATTEMPTS,
    startTime: 0,
    obstacles: [],
  };
  session.loadLevel({ index, state: nextLevelState });
  session.transition(GAME_PHASES.BRIEFING);
  if (options.skipBriefing) session.transition(GAME_PHASES.PLAYING);

  if (level.extensions?.createExperience) {
    ui.historyTimelineModal?.classList.remove("visible");
    ui.taskModal.classList.remove("visible");
    experienceManager.load(level);
    experienceManager.mount();
    if (options.skipBriefing) {
      session.levelState.startTime = totalTime - (options.elapsed ?? 0);
      experienceManager.start();
    } else if (level.sharedLayout) uiController.showTask();
    return;
  }

  scene = rendering.createScene();
  actorSystem.reset();
  combatSystem.reset();
  fx?.reset();
  worldRuntime.buildWorld(level);

  player = createPlayer();
  player.group.position.copy(actorSystem.randomOpenPosition());
  scene.add(player.group);

  actorSystem.spawnNpcs(level);
  experienceManager.load(level);
  experienceManager.mount();

  if (options.skipBriefing) {
    session.levelState.startTime = totalTime - (options.elapsed ?? 0);
    ui.historyTimelineModal?.classList.remove("visible");
    ui.taskModal.classList.remove("visible");
    experienceManager.start();
  } else {
    uiController.showTask();
    return;
  }
  uiController.updateHud();
}
