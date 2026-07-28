import * as THREE from "three";
import {
  DEFAULT_NPC_COUNT,
  NPC_SPEED,
  ROUND_SECONDS,
  ATTEMPTS,
  ACTION_INTERVAL_MS,
  REVERSE_INPUT_LOCK_MS,
  REVERSE_INPUT_DOT_THRESHOLD,
} from "./config/constants.js";
import { LEVELS, levelRegistry } from "./config/levels.js";
import { canvas, ui } from "./ui/dom.js";
import { createLevelCardModel } from "./ui/levelCardModel.js";
import { renderTargetPreview } from "./ui/targetPreview.js";
import { renderTaskModal } from "./ui/taskModal.js";
import { createLevelViewHost } from "./ui/createLevelViewHost.js";
import {
  createPlayer as createPlayerEntity,
  createNpc as createNpcEntity,
} from "./entities/actors.js";
import { setBlackEye, setLipstick } from "./entities/marks.js";
import {
  clampNpcCount,
  loadMatchNpcCount,
  saveMatchNpcCount,
  saveBestScore,
  parseNpcCountRaw,
} from "./utils/storage.js";
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
let matchNpcCount = DEFAULT_NPC_COUNT;
let fx;
let worldBuilder;
let levelViewHost;
let actorSystem;
let combatSystem;

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

/* ---- NPC 人数设置 ---- */
function getMatchNpcCount() {
  return matchNpcCount;
}

function syncNpcCountInput() {
  ui.npcCountInput.value = String(matchNpcCount);
}

function getNpcCountPreview() {
  const parsed = parseNpcCountRaw(ui.npcCountInput.value);
  if (parsed == null) return matchNpcCount;
  return clampNpcCount(parsed);
}

function getNpcCountForDisplay() {
  if (document.activeElement === ui.npcCountInput) {
    return getNpcCountPreview();
  }
  return matchNpcCount;
}

function onNpcCountInput() {
  buildLevelCards();
}

function commitNpcCountInput() {
  const parsed = parseNpcCountRaw(ui.npcCountInput.value);
  if (parsed == null) {
    syncNpcCountInput();
    buildLevelCards();
    return;
  }
  const next = clampNpcCount(parsed);
  if (next === matchNpcCount) {
    syncNpcCountInput();
    buildLevelCards();
    return;
  }
  matchNpcCount = next;
  syncNpcCountInput();
  saveMatchNpcCount(matchNpcCount);
  buildLevelCards();
}

function bindNpcCountInput() {
  const input = ui.npcCountInput;
  input.addEventListener("input", onNpcCountInput);
  input.addEventListener("change", commitNpcCountInput);
  input.addEventListener("blur", commitNpcCountInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
      return;
    }
    if (["e", "E", "+", "-", "."].includes(event.key)) {
      event.preventDefault();
    }
  });
  input.addEventListener("wheel", (event) => {
    if (document.activeElement === input) event.preventDefault();
  }, { passive: false });

  // 箭头按钮事件
  if (ui.npcCountUp) {
    ui.npcCountUp.addEventListener("click", () => {
      const next = clampNpcCount(matchNpcCount + 1);
      if (next !== matchNpcCount) {
        matchNpcCount = next;
        syncNpcCountInput();
        saveMatchNpcCount(matchNpcCount);
        buildLevelCards();
      }
    });
  }

  if (ui.npcCountDown) {
    ui.npcCountDown.addEventListener("click", () => {
      const next = clampNpcCount(matchNpcCount - 1);
      if (next !== matchNpcCount) {
        matchNpcCount = next;
        syncNpcCountInput();
        saveMatchNpcCount(matchNpcCount);
        buildLevelCards();
      }
    });
  }
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
  levelViewHost?.showOverlay(kind, options);
}

function hideOverlay(kind) {
  levelViewHost?.hideOverlay(kind);
}

function flashHud(className, durationMs) {
  ui.hud.classList.remove(className);
  void ui.hud.offsetWidth;
  ui.hud.classList.add(className);
  window.setTimeout(() => ui.hud.classList.remove(className), durationMs);
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

function buildLevelCards() {
  ui.levelCards.innerHTML = "";

  levelRegistry.visible.forEach((level) => {
    const model = createLevelCardModel(level, {
      npcCount: getNpcCountForDisplay(),
    });
    const starsHtml = Array.from({ length: 3 }, (_, si) =>
      `<span class="level-star${si < level.difficulty ? " is-on" : ""}">★</span>`,
    ).join("");
    const card = document.createElement("button");
    card.className = `level-card level-card--${level.id}`;
    card.type = "button";
    card.dataset.level = level.id;
    card.innerHTML = `
      <div class="level-card-accent" aria-hidden="true"></div>
      <div class="level-card-icon">${level.emoji}</div>
      <div class="level-card-body">
        <div class="level-card-name">${level.sceneName} <span class="level-card-difficulty ${model.difficulty.className}">${model.difficulty.label}</span></div>
        <div class="level-card-desc">${model.description}</div>
        <div class="level-card-meta">
          <span class="level-card-stars" aria-label="难度 ${level.difficulty}">${starsHtml}</span>
        </div>
      </div>
      <div class="level-card-go" aria-hidden="true"><span>›</span></div>
    `;
    card.addEventListener("click", () => selectLevelById(level.id));
    ui.levelCards.appendChild(card);
  });
  ui.npcCountInput.disabled = false;
}

function showLevelSelect() {
  clearPendingRoundEndTimers();
  disposeScene();
  scene = null;
  session.reset();
  syncNpcCountInput();
  buildLevelCards();
  levelViewHost?.clear();
  ui.levelSelectModal.classList.add("visible");
  ui.taskModal.classList.remove("visible");
  ui.resultModal.classList.remove("visible");
}

function selectLevelById(id) {
  const index = levelRegistry.getIndexById(id);
  if (index >= 0) selectLevel(index);
}

function selectLevel(index) {
  commitNpcCountInput();
  ui.levelSelectModal.classList.remove("visible");
  resetLevel(index);
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
  setupUi();
  resize();
  window.addEventListener("resize", resize);

  // 初始显示关卡选择，不直接加载关卡
  showLevelSelect();
  renderer.setAnimationLoop(tick);
}

function setupUi() {
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

  matchNpcCount = loadMatchNpcCount();
  syncNpcCountInput();
  bindNpcCountInput();

  ui.startButton.addEventListener("click", () => {
    if (session.phase !== GAME_PHASES.BRIEFING) return;

    session.transition(GAME_PHASES.PLAYING);
    session.levelState.startTime = totalTime;
    ui.taskModal.classList.remove("visible");
    updateHud();
    levelRunner.handleAction({ type: "beginPlay" });
  });

  ui.backFromTaskButton.addEventListener("click", () => {
    if (session.phase !== GAME_PHASES.BRIEFING) return;
    showLevelSelect();
  });

  ui.pauseButton.addEventListener("click", () => {
    if (session.phase !== GAME_PHASES.PLAYING) return;
    session.transition(GAME_PHASES.PAUSED);
    ui.pauseModal.classList.add("visible");
  });

  ui.resumeButton.addEventListener("click", () => {
    if (session.phase !== GAME_PHASES.PAUSED) return;
    session.transition(GAME_PHASES.PLAYING);
    ui.pauseModal.classList.remove("visible");
  });

  ui.backFromPauseButton.addEventListener("click", () => {
    if (session.phase !== GAME_PHASES.PAUSED) return;
    ui.pauseModal.classList.remove("visible");
    showLevelSelect();
  });

  ui.retryButton.addEventListener("click", () => {
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }
    resetLevel(session.currentLevelIndex);
  });
  ui.backToSelectButton.addEventListener("click", () => showLevelSelect());
  ui.attackButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    combatSystem.triggerAttack();
  });
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
  const level = session.levelState.level;
  renderTaskModal(ui, {
    level,
    npcCount: getMatchNpcCount(),
  });

  renderTargetPreview(ui.targetPreviewCanvas, level);
  updateHud();
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

  ui.resultTitle.textContent = won ? "任务成功" : "任务失败";
  ui.resultCopy.textContent = won
    ? session.levelState.level.success
    : (failMessage || session.levelState.level.failure);
  ui.resultRating.textContent = rating.grade;
  ui.resultRating.className = "result-rating rating-" + rating.grade.toLowerCase();
  ui.statTime.textContent = timeUsed + " 秒";
  if (ui.statAttemptsLabel) {
    ui.statAttemptsLabel.textContent = resultResource?.label ?? "🥊 剩余出拳";
  }
  ui.statAttempts.textContent = resultResource?.value ?? `${attemptsLeft} 次`;
  ui.statAttempts.classList.remove("hearts-display");
  ui.retryButton.disabled = false;
  ui.retryButton.textContent = "再来一局";

  ui.resultModal.classList.add("visible");
  ui.taskModal.classList.remove("visible");
  levelViewHost?.clear();

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
  const levelHud = levelRunner.handleAction({ type: "getHudState" });
  const mechanicHintHtml = session.levelState.level.mechanicHintHtml ?? "";
  const levelMechanicVisible = Boolean(levelHud?.mechanicVisible);
  levelViewHost?.setTheme(levelHud?.theme);
  ui.sceneName.textContent = session.levelState.level.sceneName;
  ui.missionText.textContent = levelHud?.mission
    || session.levelState.level.hudMission
    || session.levelState.level.mission;
  ui.timerText.textContent = levelHud?.timerText
    ?? Math.ceil(session.levelState.remaining).toString();
  ui.attemptLabel.textContent = levelHud?.resourceLabel ?? "出拳";
  ui.attemptText.textContent = levelHud?.resourceText
    ?? session.levelState.attempts.toString();
  ui.attemptText.classList.remove("hearts-display");
  ui.clueBar.textContent = levelHud?.clue
    ?? ("🔍 " + (
      session.levelState.level.hudClue
      || session.levelState.level.clue
    ));
  ui.clueBar?.classList.toggle(
    "hidden",
    Boolean(mechanicHintHtml) && !levelMechanicVisible,
  );

  if (ui.attackIcon) ui.attackIcon.textContent = levelHud?.attackIcon ?? "拳";
  if (ui.mechanicHint) {
    ui.mechanicHint.classList.toggle(
      "visible",
      Boolean(mechanicHintHtml) || levelMechanicVisible,
    );
    ui.mechanicHint.innerHTML = levelHud?.mechanicHtml || mechanicHintHtml;
  }

  // 出拳冷却动画
  if (combatSystem.cooldown > 0 && combatSystem.cooldownMax > 0) {
    const progress = (combatSystem.cooldown / combatSystem.cooldownMax) * 100;
    ui.cooldownOverlay.style.setProperty("--cd-progress", progress + "%");
    ui.cooldownOverlay.classList.add("active");
    ui.attackButton.classList.add("cooling");
  } else {
    ui.cooldownOverlay.classList.remove("active");
    ui.attackButton.classList.remove("cooling");
  }
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
