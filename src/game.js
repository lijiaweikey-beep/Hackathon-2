import * as THREE from "three";
import {
  NPC_SPEED,
  ROUND_SECONDS,
  ATTEMPTS,
  ACTION_INTERVAL_MS,
  REVERSE_INPUT_LOCK_MS,
  REVERSE_INPUT_DOT_THRESHOLD,
} from "./config/constants.js";
import { LEVELS, levelRegistry } from "./config/levels.js";
import { canvas, ui } from "./ui/dom.js";
import { createLevelViewHost } from "./ui/createLevelViewHost.js";
import { createGameUiController } from "./ui/createGameUiController.js";
import {
  createPlayer as createPlayerEntity,
  createNpc as createNpcEntity,
} from "./entities/actors.js";
import { setBlackEye, setLipstick } from "./entities/marks.js";
import { saveBestScore } from "./utils/storage.js";
import { calcRating } from "./utils/format.js";
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
} from "./systems/AudioSystem.js";
import { createWorldBuilder } from "./world/createWorldBuilder.js";
import { createFxSystem } from "./systems/FxSystem.js";
import { createLightningBolt } from "./world/lightning.js";
import { isCachedTexture } from "./world/textures.js";
import {
  registerObstacle as registerObstacleInLevel,
  collidesWithObstacle as collidesWithObstacleInLevel,
  resolveObstacleCollisions as resolveObstacleCollisionsInLevel,
  clampActorPosition as clampActorPositionInLevel,
} from "./world/obstacles.js";
import { createLevelRunner } from "./levels/levelRunner.js";
import { createLevelContext } from "./levels/createLevelContext.js";
import { GAME_PHASES } from "./core/gamePhase.js";
import { createGameSession } from "./runtime/createGameSession.js";
import { createActorSystem } from "./systems/createActorSystem.js";
import { createCombatSystem } from "./systems/createCombatSystem.js";

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
  playerInputVel.set(0, 0);
  resetActionIntervalLock();
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

const input = {
  joystick: new THREE.Vector2(),
  keys: new THREE.Vector2(),
  pointerId: null,
};

const playerInputVel = new THREE.Vector2(); // 玩家实际生效的移动方向（lerp 延迟）
const acceptedInputDir = new THREE.Vector2();
let acceptedInputAtMs = -Infinity;
let lastActionAt = -Infinity;


function clearPendingRoundEndTimers() {
  if (settleTimer) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
}


export function boot() {
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
    readPlayerInput(target) {
      target.copy(input.joystick).add(input.keys);
    },
    applyInputLock: applyReverseInputLock,
    getPlayerVelocity: () => playerInputVel,
    updatePlayerTimers: (deltaSeconds) => combatSystem.updateCooldown(deltaSeconds),
  });
  combatSystem = createCombatSystem({
    session,
    getPlayer: () => player,
    getNpcs: () => actorSystem.getNpcs(),
    dispatch: (action) => levelRunner.handleAction(action),
    consumeActionInterval,
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

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  clock = new THREE.Clock();
  camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  camera.position.set(0, 19.5, 17.2);
  camera.lookAt(0, 0, 0);

  setupInput();
  uiController.bind();
  resize();
  window.addEventListener("resize", resize);

  // 初始显示关卡选择，不直接加载关卡
  showLevelSelect();
  renderer.setAnimationLoop(tick);
}

function setupInput() {
  const primeAudio = () => resumeAudioOnInteraction();
  ui.joystick.addEventListener("pointerdown", primeAudio, { once: true });
  window.addEventListener("keydown", primeAudio, { once: true });

  ui.joystick.addEventListener("pointerdown", (event) => {
    input.pointerId = event.pointerId;
    ui.joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  ui.joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== input.pointerId) return;
    updateJoystick(event);
  });

  ui.joystick.addEventListener("pointerup", releaseJoystick);
  ui.joystick.addEventListener("pointercancel", releaseJoystick);
  ui.joystick.addEventListener("lostpointercapture", releaseJoystick);
  window.addEventListener("pointerup", releaseJoystick);
  window.addEventListener("pointercancel", releaseJoystick);

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyW" || event.code === "ArrowUp") setKeyAxis("y", 1);
    if (event.code === "KeyS" || event.code === "ArrowDown") setKeyAxis("y", -1);
    if (event.code === "KeyA" || event.code === "ArrowLeft") setKeyAxis("x", -1);
    if (event.code === "KeyD" || event.code === "ArrowRight") setKeyAxis("x", 1);
    if (event.code === "Space" || event.code === "KeyJ") combatSystem.triggerAttack();
  });

  window.addEventListener("keyup", (event) => {
    if ((event.code === "KeyW" || event.code === "ArrowUp") && input.keys.y > 0) input.keys.y = 0;
    if ((event.code === "KeyS" || event.code === "ArrowDown") && input.keys.y < 0) input.keys.y = 0;
    if ((event.code === "KeyA" || event.code === "ArrowLeft") && input.keys.x < 0) input.keys.x = 0;
    if ((event.code === "KeyD" || event.code === "ArrowRight") && input.keys.x > 0) input.keys.x = 0;
  });
}

function shouldApplyActionLock() {
  return session.phase === GAME_PHASES.PLAYING;
}

function consumeActionInterval() {
  if (!shouldApplyActionLock()) return true;
  const now = performance.now();
  if (now - lastActionAt < ACTION_INTERVAL_MS) return false;
  lastActionAt = now;
  return true;
}

function resetActionIntervalLock() {
  lastActionAt = -Infinity;
  acceptedInputDir.set(0, 0);
  acceptedInputAtMs = -Infinity;
}

function setKeyAxis(axis, value) {
  if (input.keys[axis] === value) return;
  if (!consumeActionInterval()) return;
  input.keys[axis] = value;
}

function updateJoystick(event) {
  if (!consumeActionInterval()) return;

  const rect = ui.joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const max = rect.width * 0.34;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const length = Math.hypot(dx, dy);
  const scale = length > max ? max / length : 1;
  const knobX = dx * scale;
  const knobY = dy * scale;
  const nextX = knobX / max;
  const nextY = -knobY / max;

  ui.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  input.joystick.set(nextX, nextY);
}

function releaseJoystick(event) {
  if (event.pointerId !== input.pointerId) return;
  input.pointerId = null;
  input.joystick.set(0, 0);
  ui.joystickKnob.style.transform = "translate(0, 0)";
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
  playerInputVel.set(0, 0);
  resetActionIntervalLock();
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


function tick() {
  const rawDt = clock.getDelta();
  const clampedDt = Math.min(rawDt, 0.033);

  // 关卡选择状态或无场景时不渲染
  if (!scene || session.phase === GAME_PHASES.LEVEL_SELECT) return;

  // 暂停状态：只渲染，不更新逻辑
  if (session.phase === GAME_PHASES.PAUSED) {
    renderer.render(scene, camera);
    return;
  }

  // hitstop：命中时冻结游戏几帧
  if (fx.consumeHitstop(clampedDt)) {
    updateShake(clampedDt);
    renderer.render(scene, camera);
    return;
  }

  const dt = clampedDt;
  totalTime += dt;

  if (session.phase === GAME_PHASES.PLAYING) {
    const frameResult = levelRunner.update(dt);
    if (frameResult?.pauseWorld) {
      updateHud();
      fx.updateParticles(dt);
      updateShake(dt);
      renderer.render(scene, camera);
      return;
    }
    if (session.levelState.level.timeLimit !== null) {
      session.levelState.remaining = Math.max(0, session.levelState.remaining - dt);
      if (session.levelState.remaining <= 0) {
        finishRound(false);
      }
    }
    if (player.hitInvuln > 0) player.hitInvuln = Math.max(0, player.hitInvuln - dt);
    if (player.group?.userData?.damageFlash > 0) {
      player.group.userData.damageFlash = Math.max(0, player.group.userData.damageFlash - dt);
    }
    if (fx.damageFlashTimer > 0) fx.damageFlashTimer = Math.max(0, fx.damageFlashTimer - dt);
    actorSystem.updatePlayer(dt);
    actorSystem.updateNpcs(dt);
    updateHud();
  } else if (session.phase === GAME_PHASES.RESULT && session.result?.won) {
    actorSystem.animateCheer(dt);
  }

  fx.updateParticles(dt);
  updateShake(dt);
  renderer.render(scene, camera);
}

function applyReverseInputLock(nextInput) {
  if (!shouldApplyActionLock()) return;

  const nextLen = nextInput.length();
  if (nextLen < 0.0001) return;

  const now = performance.now();
  if (acceptedInputDir.lengthSq() > 0.0001) {
    const dot = acceptedInputDir.dot(nextInput) / nextLen;
    const withinLockWindow = now - acceptedInputAtMs < REVERSE_INPUT_LOCK_MS;
    if (dot < REVERSE_INPUT_DOT_THRESHOLD && withinLockWindow) {
      nextInput.copy(acceptedInputDir).multiplyScalar(nextLen);
      return;
    }
  }

  acceptedInputDir.copy(nextInput).normalize();
  acceptedInputAtMs = now;
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
