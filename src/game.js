import * as THREE from "three";
import {
  DEFAULT_NPC_COUNT,
  WORLD_LIMIT,
  PLAY_Z_MIN,
  HIT_RANGE,
  HIT_FACING_DOT,
  PLAYER_SPEED,
  NPC_SPEED,
  ROUND_SECONDS,
  ATTEMPTS,
  PUNCH_SWING,
  PLAYER_LERP,
  ACTION_INTERVAL_MS,
  REVERSE_INPUT_LOCK_MS,
  REVERSE_INPUT_DOT_THRESHOLD,
  ACTOR_COLLISION_RADIUS,
  PUNCH_COOLDOWNS,
  PUNCH_RESET_DELAY,
  GRID_CELL,
  CAMERA_BASE_POS,
} from "./config/constants.js";
import { LEVELS, levelRegistry } from "./config/levels.js";
import { canvas, ui } from "./ui/dom.js";
import { createLevelCardModel } from "./ui/levelCardModel.js";
import { renderTargetPreview } from "./ui/targetPreview.js";
import { renderTaskModal } from "./ui/taskModal.js";
import { createLevelViewHost } from "./ui/createLevelViewHost.js";
import { clampToWorld, lerpAngle, gridKey, getFacingVector } from "./utils/math.js";
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

let renderer;
let scene;
let camera;
let clock;
let player;
let settleTimer = null;
let matchNpcCount = DEFAULT_NPC_COUNT;
let currentLevelIndex = 0;
let levelState;
let fx;
let worldBuilder;
let levelViewHost;

let npcs = [];
let particles = [];
let gameStatus = "briefing";
let punchCooldown = 0;
let punchCooldownMax = 0; // 当前冷却的最大值（用于计算进度）
let punchTier = 0; // 0=第1拳(1s), 1+=后续(2s)
let punchResetTimer = 0; // 停止出拳后重置计时
let totalTime = 0;

const levelRunner = createLevelRunner({
  createContext: ({ definition, scope }) => createLevelContext({
    definition,
    scope,
    sceneData: levelState.sceneData,
    npcCount: getMatchNpcCount(),
    npcSpeed: NPC_SPEED,
    createNpc,
    addNpc(npc) {
      npcs.push(npc);
      scene.add(npc.group);
    },
    addWanderNpc,
    randomRange,
    randomOpenPosition,
    faceNpcToward,
    moveNpcToward,
    setBlackEye,
    setLipstick,
    collidesWithObstacle,
    isFacingTarget,
    getActors: () => [player, ...npcs].filter(Boolean),
    getNpcs: () => npcs,
    getPlayer: () => player,
    getGameStatus: () => gameStatus,
    getTotalTime: () => totalTime,
    dissolveNpc,
    compactDeadNpcs,
    randomizeActorPosition,
    setActorPartsVisible,
    showOverlay,
    hideOverlay,
    flashHud,
    playLevelSound,
    triggerShake,
    triggerHitstop,
    finishLevel: settleRound,
    refreshHud: updateHud,
    resetPlayerInput,
    isActorFacingTarget,
    updateEnvironment: updateFlashlight,
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
    getLevelState: () => levelState,
    randomRange,
    getMatchNpcCount,
    collidesWithObstacle: (pos, radius) => collidesWithObstacleInLevel(levelState, pos, radius),
    registerObstacle: (x, z, halfW, halfD) => registerObstacleInLevel(levelState, x, z, halfW, halfD),
    createLightningBolt: (x, z, width, height, tilt) => createLightningBolt(x, z, width, height, tilt, randomRange),
  };
}

function createPlayer() {
  return levelState?.level.extensions?.createPlayer?.()
    ?? createPlayerEntity();
}

function createNpc(id, flags) {
  return levelState?.level.extensions?.createNpc?.(id, flags, randomRange)
    ?? createNpcEntity(id, flags, {}, randomRange);
}

function registerObstacle(x, z, halfW, halfD) {
  registerObstacleInLevel(levelState, x, z, halfW, halfD);
}

function collidesWithObstacle(pos, radius) {
  return collidesWithObstacleInLevel(levelState, pos, radius);
}

function resolveObstacleCollisions(position, radius, velocity) {
  return resolveObstacleCollisionsInLevel(levelState, position, radius, velocity);
}

function clampActorPosition(position, velocity) {
  clampActorPositionInLevel(levelState, position, velocity);
}

function buildWorld(level) {
  if (!worldBuilder) worldBuilder = createWorldBuilder(getWorldContext());
  worldBuilder.buildWorld(level);
}

function updateFlashlight(dt) {
  worldBuilder?.updateFlashlight(dt);
}

function triggerHitstop(duration) {
  fx.triggerHitstop(duration);
}

function triggerShake(intensity, duration) {
  fx.triggerShake(intensity, duration);
}

function setActorPartsVisible(actor, partKey, visible) {
  actor?.group?.userData?.[partKey]?.forEach((part) => {
    part.visible = visible;
  });
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
  if (gameStatus === "won" || gameStatus === "lost" || gameStatus === "settling") return;
  gameStatus = "settling";
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
  gameStatus = "levelSelect";
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

const scratchVec2 = new THREE.Vector2();
const scratchVec3 = new THREE.Vector3();
const scratchFacing = new THREE.Vector2();
const scratchToPlayer = new THREE.Vector2();
const scratchWaypoint = new THREE.Vector3();
const nearbyScratch = [];
const pixelGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);

/* ---- 粒子材质缓存（按颜色共享） ---- */
const pixelMaterialCache = new Map();

function getPixelMaterial(color) {
  let mat = pixelMaterialCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, transparent: true, opacity: 1 });
    pixelMaterialCache.set(color, mat);
  }
  return mat;
}

function isCachedPixelMaterial(mat) {
  for (const cached of pixelMaterialCache.values()) {
    if (cached === mat) return true;
  }
  return false;
}

function clearPendingRoundEndTimers() {
  if (settleTimer) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
}


export function boot() {
  fx = createFxSystem({ ui, getPlayer: () => player });

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
    if (gameStatus !== "briefing") return;

    gameStatus = "playing";
    levelState.startTime = totalTime;
    ui.taskModal.classList.remove("visible");
    updateHud();
    levelRunner.handleAction({ type: "beginPlay" });
  });

  ui.backFromTaskButton.addEventListener("click", () => {
    if (gameStatus !== "briefing") return;
    showLevelSelect();
  });

  ui.pauseButton.addEventListener("click", () => {
    if (gameStatus !== "playing") return;
    gameStatus = "paused";
    ui.pauseModal.classList.add("visible");
  });

  ui.resumeButton.addEventListener("click", () => {
    if (gameStatus !== "paused") return;
    gameStatus = "playing";
    ui.pauseModal.classList.remove("visible");
  });

  ui.backFromPauseButton.addEventListener("click", () => {
    if (gameStatus !== "paused") return;
    ui.pauseModal.classList.remove("visible");
    showLevelSelect();
  });

  ui.retryButton.addEventListener("click", () => {
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }
    resetLevel(currentLevelIndex);
  });
  ui.backToSelectButton.addEventListener("click", () => showLevelSelect());
  ui.attackButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    triggerAttack();
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
    if (event.code === "Space" || event.code === "KeyJ") triggerAttack();
  });

  window.addEventListener("keyup", (event) => {
    if ((event.code === "KeyW" || event.code === "ArrowUp") && input.keys.y > 0) input.keys.y = 0;
    if ((event.code === "KeyS" || event.code === "ArrowDown") && input.keys.y < 0) input.keys.y = 0;
    if ((event.code === "KeyA" || event.code === "ArrowLeft") && input.keys.x < 0) input.keys.x = 0;
    if ((event.code === "KeyD" || event.code === "ArrowRight") && input.keys.x > 0) input.keys.x = 0;
  });
}

function shouldApplyActionLock() {
  return gameStatus === "playing";
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
  // 清理粒子（材质是共享缓存的，不 dispose）
  particles.forEach((p) => {
    scene.remove(p.mesh);
  });

  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        // 不 dispose 缓存中的纹理（floor/wall texture cache 管理）
        if (mat.map && !isCachedTexture(mat.map)) mat.map.dispose();
        if (!isCachedPixelMaterial(mat)) mat.dispose();
      });
    }
  });
}


function resetLevel(index, options = {}) {
  clearPendingRoundEndTimers();
  // 先清理旧场景资源
  disposeScene();

  currentLevelIndex = index;
  const level = LEVELS[index];

  scene = new THREE.Scene();
  scene.userData.cleanups = [];
  npcs = [];
  particles = [];
  punchCooldown = 0;
  punchTier = 0;
  punchResetTimer = 0;
  totalTime = options.elapsed ?? 0;
  fx?.reset();
  playerInputVel.set(0, 0);
  resetActionIntervalLock();
  gameStatus = options.skipBriefing ? "playing" : "briefing";

  levelState = {
    level,
    remaining: level.timeLimit === null
      ? 9999
      : (level.timeLimit ?? ROUND_SECONDS),
    attempts: ATTEMPTS,
    startTime: 0,
    obstacles: [],
    flashlight: null,
  };

  buildWorld(level);

  player = createPlayer();
  player.group.position.copy(randomOpenPosition());
  scene.add(player.group);

  spawnNpcs(level);

  if (options.skipBriefing) {
    levelState.startTime = totalTime - (options.elapsed ?? 0);
    ui.levelSelectModal.classList.remove("visible");
    ui.taskModal.classList.remove("visible");
  } else {
    showTask();
    return;
  }
  updateHud();
}

function showTask() {
  const level = levelState.level;
  renderTaskModal(ui, {
    level,
    npcCount: getMatchNpcCount(),
  });

  renderTargetPreview(ui.targetPreviewCanvas, level);
  updateHud();
}


function spawnNpcs(level) {
  if (!level.legacy) {
    levelRunner.load(level);
    levelRunner.start();
  }

  const decoyCount = level.decoyCount ?? 3;
  const wanderNpcs = npcs.filter(
    (npc) => !npc.levelManaged
      && !npc.isLevelTarget
      && npc.alive,
  );
  shuffleArray(wanderNpcs);
  for (let i = 0; i < Math.min(decoyCount, wanderNpcs.length); i += 1) {
    const npc = wanderNpcs[i];
    initDecoy(npc);
    levelRunner.handleAction({ type: "configureDecoy", npc, index: i });
  }

}

function addWanderNpc(id) {
  const npc = createNpc(id, {});
  const pos = randomOpenPosition();
  npc.group.position.set(pos.x, 0, pos.z);
  nudgeActorFromObstacles(npc);
  npc.wanderTimer = randomRange(0.6, 2.2);
  npc.pauseTimer = randomRange(0.2, 1.3);
  npc.walking = false;
  npcs.push(npc);
  scene.add(npc.group);
  return npc;
}

function animateNpcPunchPose(npc) {
  const ud = npc.group.userData;
  if (!ud?.rightArm) return;
  if (npc.punchTimer > 0) {
    const t = 1 - npc.punchTimer / (npc.punchDuration ?? PUNCH_SWING);
    const swing = Math.sin(t * Math.PI);
    ud.rightArm.rotation.x = -1.5 * swing;
    ud.rightArm.rotation.z = ud.baseArmRotations.rightZ - 0.72 * swing;
    ud.leftArm.rotation.z = ud.baseArmRotations.leftZ + 0.22 * swing;
    return;
  }
  if (npc.attackTimer > 0) {
    const t = Math.sin((npc.attackTimer / 0.26) * Math.PI);
    ud.rightArm.rotation.x = -1.15 * t;
    ud.rightArm.rotation.z = ud.baseArmRotations.rightZ - 0.48 * t;
  }
}

/* ---- 替身 NPC 系统 ---- */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function initDecoy(npc) {
  npc.isDecoy = true;
  npc.deoyState = "wander"; // "wander" | "confuse" | "moonApproach" | "moonPause"
  npc.decoyTimer = randomRange(1.5, 3.5); // 当前状态剩余时间
  npc.decoyDir = new THREE.Vector2(); // 替身移动方向
  pickDecoyDir(npc);
}

function pickDecoyDir(npc) {
  const angle = Math.random() * Math.PI * 2;
  npc.decoyDir.set(Math.sin(angle), Math.cos(angle));
}

function updateDecoy(npc, dt) {
  if (levelRunner.handleAction({ type: "updateDecoy", npc, deltaSeconds: dt })) return;

  npc.decoyTimer -= dt;

  if (npc.deoyState === "wander") {
    // 普通漫游模式
    updateWander(npc, dt);
    if (npc.decoyTimer <= 0) {
      // 切换到混淆模式
      npc.deoyState = "confuse";
      npc.decoyTimer = randomRange(2.0, 4.0);
      pickDecoyDir(npc);
      npc.walking = true;
    }
  } else {
    // 混淆模式：流畅移动，像被操控一样
    npc.walking = true;
    const prevX = npc.group.position.x;
    const prevZ = npc.group.position.z;
    npc.group.position.x += npc.decoyDir.x * NPC_SPEED * dt;
    npc.group.position.z += npc.decoyDir.y * NPC_SPEED * dt;
    const hitObstacle = resolveObstacleCollisions(npc.group.position, ACTOR_COLLISION_RADIUS, npc.decoyDir);
    clampToWorld(npc.group.position);

    const moved = Math.hypot(npc.group.position.x - prevX, npc.group.position.z - prevZ);
    if (hitObstacle || moved < NPC_SPEED * dt * 0.12) {
      npc.stuckTimer = (npc.stuckTimer ?? 0) + dt;
      if (npc.stuckTimer > 0.3) {
        pickDecoyDir(npc);
        npc.stuckTimer = 0;
      }
    } else {
      npc.stuckTimer = 0;
    }

    // 碰到边界就转向
    if (Math.abs(npc.group.position.x) >= WORLD_LIMIT - 0.3) npc.decoyDir.x *= -1;
    if (npc.group.position.z <= PLAY_Z_MIN + 0.3 || npc.group.position.z >= WORLD_LIMIT - 0.3) {
      npc.decoyDir.y *= -1;
    }

    const targetRotation = Math.atan2(npc.decoyDir.x, npc.decoyDir.y);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetRotation, 0.14);

    // 混淆模式中偶尔微调方向，不像机器人走直线
    if (Math.random() < dt * 0.6) {
      const drift = (Math.random() - 0.5) * 0.8;
      const currentAngle = Math.atan2(npc.decoyDir.x, npc.decoyDir.y);
      npc.decoyDir.set(Math.sin(currentAngle + drift), Math.cos(currentAngle + drift));
    }

    if (npc.decoyTimer <= 0) {
      // 切换回漫游模式
      npc.deoyState = "wander";
      npc.decoyTimer = randomRange(1.0, 2.5);
      npc.wanderTimer = randomRange(0.5, 1.5);
      npc.pauseTimer = randomRange(0.2, 0.8);
    }
  }
}


function pickWanderDirection(npc) {
  const angle = Math.random() * Math.PI * 2;
  const scale = randomRange(0.55, 1.15);
  npc.velocity.set(Math.sin(angle), Math.cos(angle)).multiplyScalar(scale);
  npc.wanderTimer = randomRange(1.0, 3.0);
  npc.stuckTimer = 0;
}

function nudgeActorFromObstacles(npc) {
  const pos = npc.group.position;
  for (let i = 0; i < 12; i += 1) {
    if (!collidesWithObstacle(pos)) return;
    const angle = Math.random() * Math.PI * 2;
    pos.x += Math.sin(angle) * 0.22;
    pos.z += Math.cos(angle) * 0.22;
    clampActorPosition(pos);
  }
}

function randomOpenPosition() {
  let pos;
  let tries = 0;
  const playerPos = player?.group?.position ?? new THREE.Vector3();
  do {
    pos = new THREE.Vector3(randomRange(-8.8, 8.8), 0, randomRange(PLAY_Z_MIN + 0.8, 7.8));
    tries += 1;
  } while (tries < 40 && (pos.distanceTo(playerPos) < 2.2 || collidesWithObstacle(pos)));
  return pos;
}

function randomizeActorPosition(actor) {
  const position = randomOpenPosition();
  actor.group.position.set(position.x, 0, position.z);
  actor.velocity?.set?.(0, 0);
  actor.walking = false;
}

function tick() {
  const rawDt = clock.getDelta();
  const clampedDt = Math.min(rawDt, 0.033);

  // 关卡选择状态或无场景时不渲染
  if (!scene || gameStatus === "levelSelect") return;

  // 暂停状态：只渲染，不更新逻辑
  if (gameStatus === "paused") {
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

  if (gameStatus === "playing") {
    const frameResult = levelRunner.update(dt);
    if (frameResult?.pauseWorld) {
      updateHud();
      updateParticles(dt);
      updateShake(dt);
      renderer.render(scene, camera);
      return;
    }
    if (levelState.level.timeLimit !== null) {
      levelState.remaining = Math.max(0, levelState.remaining - dt);
      if (levelState.remaining <= 0) {
        finishRound(false);
      }
    }
    if (player.hitInvuln > 0) player.hitInvuln = Math.max(0, player.hitInvuln - dt);
    if (player.group?.userData?.damageFlash > 0) {
      player.group.userData.damageFlash = Math.max(0, player.group.userData.damageFlash - dt);
    }
    if (fx.damageFlashTimer > 0) fx.damageFlashTimer = Math.max(0, fx.damageFlashTimer - dt);
    updatePlayer(dt);
    updateNpcs(dt);
    updateHud();
  } else if (gameStatus === "won") {
    animateCheer(dt);
  }

  updateParticles(dt);
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

function updatePlayer(dt) {
  scratchVec2.copy(input.joystick).add(input.keys);
  if (scratchVec2.lengthSq() > 1) scratchVec2.normalize();
  applyReverseInputLock(scratchVec2);

  playerInputVel.lerp(scratchVec2, 1 - Math.pow(1 - PLAYER_LERP, dt * 60));

  const moving = playerInputVel.lengthSq() > 0.0004;
  if (moving) {
    player.group.position.x += playerInputVel.x * player.speed * dt;
    player.group.position.z -= playerInputVel.y * player.speed * dt;
    clampActorPosition(player.group.position, playerInputVel);
    const targetRotation = Math.atan2(playerInputVel.x, -playerInputVel.y);
    player.group.rotation.y = lerpAngle(player.group.rotation.y, targetRotation, 0.24);
  }

  if (punchCooldown > 0) punchCooldown = Math.max(0, punchCooldown - dt);
  if (player.punchTimer > 0) player.punchTimer = Math.max(0, player.punchTimer - dt);
  if (levelState.level.attackComboExpires !== false && punchResetTimer > 0) {
    punchResetTimer -= dt;
    if (punchResetTimer <= 0) punchTier = 0;
  }
  animateActor(player, dt, moving);
  animatePunchPose();
}

function animatePunchPose() {
  const userData = player.group.userData;
  const t = player.punchTimer > 0
    ? Math.sin((player.punchTimer / (player.punchDuration ?? PUNCH_SWING)) * Math.PI)
    : 0;
  const handled = player.animations?.attack?.(player, {
    progress: t,
    totalTime,
  }) === true;
  if (handled) return;

  userData.rightArm.rotation.x = -2.15 * t;
  userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 1.05 * t;
  userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + 0.42 * t;
  const fx = Math.sin(player.group.rotation.y);
  const fz = Math.cos(player.group.rotation.y);
  userData.visual.position.x = fx * 0.18 * t;
  userData.visual.position.z = fz * 0.18 * t;
  if (t <= 0) {
    userData.visual.position.x = 0;
    userData.visual.position.z = 0;
  }
}

function animateCheer(dt) {
  const userData = player.group.userData;
  const jump = Math.abs(Math.sin(totalTime * 7.5));
  userData.visual.position.y = jump * 0.45;
  userData.leftArm.rotation.z = 2.45;
  userData.rightArm.rotation.z = -2.45;
  player.group.rotation.y += dt * 1.8;
}

function updateNpcs(dt) {
  if (!levelState.level.legacy) {
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      if (!npc.levelManaged) {
        if (npc.isDecoy) {
          updateDecoy(npc, dt);
        } else {
          updateWander(npc, dt);
        }
      }
      animateActor(npc, dt, npc.walking);
      if (npc.attackResolveTimer != null) animateNpcPunchPose(npc);
    });
    separateActors();
    levelRunner.handleAction({ type: "afterNpcUpdate", deltaSeconds: dt });
    return;
  }
}

function updateWander(npc, dt) {
  if (npc.pauseTimer > 0) {
    npc.pauseTimer -= dt;
    npc.walking = false;
    if (npc.pauseTimer <= 0) {
      pickWanderDirection(npc);
    }
    return;
  }

  npc.wanderTimer -= dt;
  npc.walking = true;
  const prevX = npc.group.position.x;
  const prevZ = npc.group.position.z;
  npc.group.position.x += npc.velocity.x * NPC_SPEED * dt;
  npc.group.position.z += npc.velocity.y * NPC_SPEED * dt;
  clampActorPosition(npc.group.position, npc.velocity);

  const moved = Math.hypot(npc.group.position.x - prevX, npc.group.position.z - prevZ);
  if (moved < NPC_SPEED * dt * 0.12) {
    npc.stuckTimer = (npc.stuckTimer ?? 0) + dt;
    if (npc.stuckTimer > 0.35) {
      pickWanderDirection(npc);
    }
  } else {
    npc.stuckTimer = 0;
  }

  if (Math.abs(npc.group.position.x) >= WORLD_LIMIT - 0.2) npc.velocity.x *= -1;
  if (npc.group.position.z <= PLAY_Z_MIN + 0.2 || npc.group.position.z >= WORLD_LIMIT - 0.2) {
    npc.velocity.y *= -1;
  }

  const targetRotation = Math.atan2(npc.velocity.x, npc.velocity.y);
  npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetRotation, 0.08);

  if (npc.wanderTimer <= 0) {
    npc.pauseTimer = randomRange(0.35, 1.9);
    npc.velocity.set(0, 0);
  }
}

function moveNpcToward(npc, waypoint, speed, dt) {
  scratchVec3.copy(waypoint).sub(npc.group.position);
  scratchVec3.y = 0;
  const distance = scratchVec3.length();
  if (distance < 0.14) {
    npc.walking = false;
    return true;
  }

  scratchVec3.normalize();
  const prevX = npc.group.position.x;
  const prevZ = npc.group.position.z;
  scratchVec2.set(scratchVec3.x, scratchVec3.z);
  npc.group.position.x += scratchVec3.x * speed * dt;
  npc.group.position.z += scratchVec3.z * speed * dt;
  const hitObstacle = resolveObstacleCollisions(npc.group.position, ACTOR_COLLISION_RADIUS, scratchVec2);
  clampToWorld(npc.group.position);

  const moved = Math.hypot(npc.group.position.x - prevX, npc.group.position.z - prevZ);
  if (hitObstacle && moved < speed * dt * 0.2 && waypoint) {
    waypoint.x += randomRange(-1.2, 1.2);
    waypoint.z += randomRange(-1.2, 1.2);
    clampToWorld(waypoint);
  }

  const targetRotation = Math.atan2(scratchVec3.x, scratchVec3.z);
  npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetRotation, 0.12);
  npc.walking = true;
  return false;
}

function faceNpcToward(npc, targetPosition) {
  scratchVec3.copy(targetPosition).sub(npc.group.position);
  scratchVec3.y = 0;
  if (scratchVec3.lengthSq() < 0.0001) return;
  const targetRotation = Math.atan2(scratchVec3.x, scratchVec3.z);
  npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetRotation, 0.18);
}

function animateActor(actor, dt, moving) {
  const userData = actor.group.userData;
  actor.walkCycle = (actor.walkCycle ?? 0) + dt * (moving ? 8.5 : 2);
  const walk = moving ? Math.sin(actor.walkCycle) : 0;
  userData.visual.position.y = moving ? Math.abs(walk) * 0.06 : Math.sin(totalTime * 1.7 + (actor.id ?? 0)) * 0.012;
  userData.leftLeg.rotation.x = walk * 0.55;
  userData.rightLeg.rotation.x = -walk * 0.55;

  if (actor !== player || player.punchTimer <= 0) {
    userData.leftArm.rotation.x = -walk * 0.28;
    userData.rightArm.rotation.x = walk * 0.28;
    userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + (moving ? -Math.abs(walk) * 0.08 : 0);
    userData.rightArm.rotation.z = userData.baseArmRotations.rightZ + (moving ? Math.abs(walk) * 0.08 : 0);
  }
}

/* ---- 空间网格（优化碰撞检测） ---- */
const GRID_COLS = Math.ceil((WORLD_LIMIT * 2) / GRID_CELL) + 1;
let spatialGrid = new Map();

function buildSpatialGrid() {
  spatialGrid.clear();
  npcs.forEach((npc) => {
    if (!npc.alive) return;
    const cx = Math.floor((npc.group.position.x + WORLD_LIMIT) / GRID_CELL);
    const cz = Math.floor((npc.group.position.z + WORLD_LIMIT) / GRID_CELL);
    const key = gridKey(cx, cz);
    if (!spatialGrid.has(key)) spatialGrid.set(key, []);
    spatialGrid.get(key).push(npc);
  });
}

function getNearbyNpcs(pos) {
  const cx = Math.floor((pos.x + WORLD_LIMIT) / GRID_CELL);
  const cz = Math.floor((pos.z + WORLD_LIMIT) / GRID_CELL);
  nearbyScratch.length = 0;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const cell = spatialGrid.get(gridKey(cx + dx, cz + dz));
      if (!cell) continue;
      for (let i = 0; i < cell.length; i += 1) nearbyScratch.push(cell[i]);
    }
  }
  return nearbyScratch;
}

function separateActors() {
  buildSpatialGrid();

  for (let i = 0; i < npcs.length; i += 1) {
    const a = npcs[i];
    if (!a.alive) continue;
    const nearby = getNearbyNpcs(a.group.position);
    for (let j = 0; j < nearby.length; j += 1) {
      const b = nearby[j];
      if (b === a || !b.alive) continue;
      if (a.separationGroup && a.separationGroup === b.separationGroup) continue;
      pushApart(a.group.position, b.group.position, 0.62, 0.018);
    }
    pushApart(a.group.position, player.group.position, 0.72, 0.012);
  }
}

function pushApart(a, b, minDistance, strength) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  const distSq = dx * dx + dz * dz;
  if (distSq <= 0.0001 || distSq >= minDistance * minDistance) return;
  const dist = Math.sqrt(distSq);
  const push = (minDistance - dist) * strength;
  const nx = dx / dist;
  const nz = dz / dist;
  a.x += nx * push;
  a.z += nz * push;
  b.x -= nx * push;
  b.z -= nz * push;
  clampActorPosition(a);
  clampActorPosition(b);
}

function triggerAttack() {
  if (gameStatus !== "playing" || punchCooldown > 0) return;
  const attack = levelRunner.handleAction({ type: "beforeAttack" }) ?? {};
  if (attack.blocked) return;
  if (!consumeActionInterval()) return;
  punchCooldownMax = attack.cooldown
    ?? PUNCH_COOLDOWNS[Math.min(punchTier, PUNCH_COOLDOWNS.length - 1)];
  punchCooldown = punchCooldownMax;
  if (attack.resetCombo !== false) {
    punchTier += 1;
    punchResetTimer = PUNCH_RESET_DELAY;
  }
  player.punchDuration = attack.animationSeconds ?? PUNCH_SWING;
  player.punchTimer = player.punchDuration;
  if (attack.sound) {
    playLevelSound(attack.sound);
  } else {
    sfxPunch();
  }

  const hit = findHitTarget();
  if (!hit) return;
  const levelHit = levelRunner.handleAction({ type: "hitTarget", hit });
  if (levelHit?.handled) return;

  if (hit.correct) {
    if (hit.npcs) {
      hit.npcs.forEach((npc) => dissolveNpc(npc));
    } else {
      dissolveNpc(hit.npc);
    }
    triggerHitstop(0.08);
    triggerShake(0.35, 0.2);
    sfxHit();
    settleRound(true, null, 760);
    return;
  }

  dissolveNpc(hit.npc);
  triggerShake(0.12, 0.1);
  sfxMiss();
  levelState.attempts = Math.max(0, levelState.attempts - 1);
  updateHud();
  if (levelState.attempts <= 0) {
    settleRound(false, null, 680);
  }
}

function findHitTarget() {
  const playerPos = player.group.position;
  getFacingVector(player.group.rotation.y, scratchFacing);
  const facing = scratchFacing;

  const customHit = levelRunner.handleAction({
    type: "findHitTarget",
    playerPos,
    facing,
  });
  if (customHit) return customHit;

  let best = null;
  let bestDistance = Infinity;
  npcs.forEach((npc) => {
    if (!npc.alive) return;
    const toNpc = new THREE.Vector2(npc.group.position.x - playerPos.x, npc.group.position.z - playerPos.z);
    const distance = toNpc.length();
    if (distance > HIT_RANGE || !isFacingTarget(facing, toNpc)) return;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = npc;
    }
  });

  if (!best) return null;
  return {
    npc: best,
    correct: best.isLevelTarget,
  };
}

function isFacingTarget(facing, toTarget) {
  if (toTarget.lengthSq() < 0.08) return true;
  toTarget.normalize();
  return facing.dot(toTarget) >= HIT_FACING_DOT;
}

function isActorFacingTarget(actor, targetActor, maxDistance) {
  scratchToPlayer.set(
    targetActor.group.position.x - actor.group.position.x,
    targetActor.group.position.z - actor.group.position.z,
  );
  if (scratchToPlayer.length() > maxDistance) return false;
  getFacingVector(actor.group.rotation.y, scratchFacing);
  return isFacingTarget(scratchFacing, scratchToPlayer);
}


function compactDeadNpcs() {
  for (let i = npcs.length - 1; i >= 0; i -= 1) {
    const npc = npcs[i];
    if (npc.alive || npc.preserveWhenDead) continue;
    if (npc.group) scene.remove(npc.group);
    npcs.splice(i, 1);
  }
}

function dissolveNpc(npc) {
  if (!npc || !npc.alive) return;
  dissolveActor(npc);
}

function dissolveActor(actor) {
  if (!actor?.group || actor.group.visible === false) return;
  actor.alive = false;
  actor.group.visible = false;
  levelRunner.handleAction({ type: "actorDissolved", actor });
  createPixelBurst(actor);
}

function createPixelBurst(npc) {
  const colors = npc.group.userData.colors ?? [0x4b5563, 0x9ca3af, 0xf0b88c, 0x1f2937, 0xe5e7eb];
  for (let i = 0; i < 58; i += 1) {
    const color = colors[i % colors.length];
    const material = getPixelMaterial(color);
    const cube = new THREE.Mesh(pixelGeo, material);
    cube.position.set(
      npc.group.position.x + randomRange(-0.28, 0.28),
      randomRange(0.24, 1.74),
      npc.group.position.z + randomRange(-0.28, 0.28),
    );
    cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    cube.castShadow = true;
    scene.add(cube);
    particles.push({
      mesh: cube,
      velocity: new THREE.Vector3(randomRange(-1.8, 1.8), randomRange(1.0, 2.8), randomRange(-1.8, 1.8)),
      spin: new THREE.Vector3(randomRange(-5, 5), randomRange(-5, 5), randomRange(-5, 5)),
      life: randomRange(0.8, 1.35),
      maxLife: 1.35,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    particle.velocity.y -= dt * 2.6;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.mesh.rotation.x += particle.spin.x * dt;
    particle.mesh.rotation.y += particle.spin.y * dt;
    particle.mesh.rotation.z += particle.spin.z * dt;
    particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife);
    particle.mesh.scale.setScalar(0.65 + Math.max(0, particle.life / particle.maxLife) * 0.6);

    if (particle.life <= 0) {
      scene.remove(particle.mesh);
      // 材质是共享缓存的，不 dispose
      particles.splice(i, 1);
    }
  }
}

function finishRound(won, failMessage) {
  if (gameStatus === "won" || gameStatus === "lost" || gameStatus === "levelSelect") return;
  if (!levelState?.level || !scene) return;
  clearPendingRoundEndTimers();
  gameStatus = won ? "won" : "lost";
  player.cheer = won;
  if (won) sfxWin(); else sfxLose();

  const resultResource = levelRunner.handleAction({ type: "getResultStats" });
  const timeUsed = Math.round(totalTime - levelState.startTime);
  const attemptsLeft = resultResource?.attemptsLeft ?? levelState.attempts;
  const rating = calcRating(won, timeUsed, attemptsLeft);

  ui.resultTitle.textContent = won ? "任务成功" : "任务失败";
  ui.resultCopy.textContent = won
    ? levelState.level.success
    : (failMessage || levelState.level.failure);
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
    saveBestScore(levelState.level.id, { grade: rating.grade, rating: rating.rating, time: timeUsed });
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
  const mechanicHintHtml = levelState.level.mechanicHintHtml ?? "";
  const levelMechanicVisible = Boolean(levelHud?.mechanicVisible);
  levelViewHost?.setTheme(levelHud?.theme);
  ui.sceneName.textContent = levelState.level.sceneName;
  ui.missionText.textContent = levelHud?.mission
    || levelState.level.hudMission
    || levelState.level.mission;
  ui.timerText.textContent = levelHud?.timerText ?? Math.ceil(levelState.remaining).toString();
  ui.attemptLabel.textContent = levelHud?.resourceLabel ?? "出拳";
  ui.attemptText.textContent = levelHud?.resourceText ?? levelState.attempts.toString();
  ui.attemptText.classList.remove("hearts-display");
  ui.clueBar.textContent = levelHud?.clue
    ?? ("🔍 " + (levelState.level.hudClue || levelState.level.clue));
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
  if (punchCooldown > 0 && punchCooldownMax > 0) {
    const progress = (punchCooldown / punchCooldownMax) * 100;
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
