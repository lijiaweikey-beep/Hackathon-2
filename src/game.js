import * as THREE from "three";
import {
  DEFAULT_NPC_COUNT,
  WORLD_LIMIT,
  PLAY_Z_MIN,
  HIT_RANGE,
  HIT_PAIR_RANGE,
  HIT_FACING_DOT,
  PLAYER_SPEED,
  NPC_SPEED,
  ROUND_SECONDS,
  ATTEMPTS,
  DUEL_NPC_COUNT,
  DUEL_PLAYER_HP,
  DUEL_NPC_HP,
  PUNCH_SWING,
  NPC_PUNCH_INTERVAL,
  NPC_PUNCH_RANGE,
  NPC_PUNCH_SWING,
  NPC_PUNCH_DAMAGE,
  HIT_INVULN,
  PLAYER_LERP,
  ACTION_INTERVAL_MS,
  REVERSE_INPUT_LOCK_MS,
  REVERSE_INPUT_DOT_THRESHOLD,
  TEMPLE_MOON_RADIUS,
  TEMPLE_SHADOW_FADE,
  TEMPLE_DECOY_SHADOW_STYLES,
  TEMPLE_TRUE_SHADOW_MAX,
  TEMPLE_TRUE_REVEAL_AT,
  TEMPLE_TRUE_INITIAL_MOON_DELAY,
  SU_SHI_SHADOW_PATTERN,
  REMOTE_POS_LERP,
  REMOTE_SNAP_DIST,
  REMOTE_STALE_MS,
  DUEL_SPAWN_MIN_DIST,
  DUEL_GATHER_INTERVAL,
  DUEL_GATHER_PREVIEW,
  DUEL_GATHER_WINDOW,
  DUEL_GATHER_RADIUS,
  DUEL_HERD_INTERVAL,
  DUEL_HERD_DURATION,
  GATHER_COLOR_PREVIEW,
  GATHER_COLOR_URGENT,
  GATHER_COLOR_SUCCESS,
  ACTOR_COLLISION_RADIUS,
  PVP_HIT_RANGE,
  PROXIMITY_MIN_DIST,
  PROXIMITY_MAX_DIST,
  BLOODMOON_SANITY_MAX,
  BLOODMOON_WOLF_COOLDOWN,
  BLOODMOON_NPC_HIT_RANGE,
  BLOODMOON_NPC_HIT_DAMAGE,
  BLOODMOON_LIGHTNING_INTERVAL,
  BLOODMOON_CLUE_SECONDS,
  BLOODMOON_DECOY_CUES,
  BLOODMOON_HUNT_SECONDS,
  BLOODMOON_PHASE2_HP_MAX,
  BLOODMOON_SUMMON_COUNT,
  BLOODMOON_SAFE_ZONE_COUNT,
  BLOODMOON_GUARD_SPEED,
  BLOODMOON_GUARD_DAMAGE,
  BLOODMOON_HUNT_INTRO_SECONDS,
  PUNCH_COOLDOWNS,
  PUNCH_RESET_DELAY,
  GRID_CELL,
  CAMERA_BASE_POS,
} from "./config/constants.js";
import {
  LEVELS,
  getDuelLevelIndex,
  isDuelLevel as checkDuelLevel,
} from "./config/levels.js";
import { canvas, ui } from "./ui/dom.js";
import { clampToWorld, lerpAngle, gridKey, getFacingVector } from "./utils/math.js";
import {
  LOW_POLY_PLAYER_PALETTE,
  LOW_POLY_NPC_PALETTES,
  LOW_POLY_REMOTE_PALETTE,
} from "./entities/palettes.js";
import { createLowPolyPerson } from "./entities/lowPolyPerson.js";
import { createTemplePerson } from "./entities/templePerson.js";
import {
  createSuShiShadowCue,
  setShadowCueIntensity,
  positionShadowCue,
  setTempleLocalShadow,
  renderSuShiShadowMarkHtml,
} from "./entities/templeShadows.js";
import {
  createBloodmoonClawCue,
  setBloodmoonClawIntensity,
  positionBloodmoonCue,
} from "./entities/bloodmoonCues.js";
import {
  createPlayer as createPlayerEntity,
  createRemotePlayer,
  createNpc as createNpcEntity,
} from "./entities/actors.js";
import { setBlackEye, setLipstick } from "./entities/marks.js";
import { createSeededRng } from "./utils/rng.js";
import {
  clampNpcCount,
  loadMatchNpcCount,
  saveMatchNpcCount,
  getBestScore,
  saveBestScore,
  parseNpcCountRaw,
} from "./utils/storage.js";
import { formatHearts, calcRating } from "./utils/format.js";
import {
  sfxPunch,
  sfxPunchHeavy,
  sfxHurt,
  sfxHit,
  sfxWolfPunch,
  sfxWolfHowl,
  sfxThunder,
  sfxMiss,
  sfxNpcHit,
  sfxWin,
  sfxLose,
  resumeAudioOnInteraction,
} from "./systems/AudioSystem.js";
import {
  initMultiplayer,
  syncPosition,
  syncPunch,
  syncHp,
  syncGameState,
  syncGuestReady,
  clearGuestReady,
  clearRoundSignals,
  getShareLink,
  getIsHost,
  isConnected,
  leaveRoom as mpLeaveRoom,
  clearStoredHostRoom,
} from "./multiplayer.js";
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
import {
  buildDuelPuncherSet,
  validatePvpHit,
  collectDuelSnapshot as collectDuelSnapshotFromState,
  buildGameStatePayload as buildGameStatePayloadFromState,
} from "./multiplayer/duelSync.js";

let renderer;
let scene;
let camera;
let clock;
let player;
let remotePlayer = null; // 对手角色
let mpStatus = "none"; // "none" | "waiting" | "connected"
let guestReady = false;
let guestConfirmed = false;
let stateRevision = 0;
let lastRemoteStateRevision = -1;
let duelRoundId = 0;
let localEventSeq = 0;
let lastRemotePunchId = null;
let lastRemoteWinId = null;
let settleTimer = null;
let duelRng = null;
let duelSeparateTick = 0;
let duelHerdIndex = -1;
const duelHerdDir = new THREE.Vector2(0, 1);
let duelHerdActive = false;
let duelGatherSpotIndex = -1;
let duelGatherCheckedIndex = -1;
let duelGatherMetWindow = false;
let duelGatherMarker = null;
let lastGuestSnapshotAt = 0;
const duelGatherSpot = { x: 0, z: 0, radius: DUEL_GATHER_RADIUS };
let gameMode = "solo";
let matchNpcCount = DEFAULT_NPC_COUNT;
let currentLevelIndex = 0;
let levelState;
let fx;
let worldBuilder;

function isDuelLevel(level = levelState?.level) {
  return checkDuelLevel(level);
}

let npcs = [];
let particles = [];
let gameStatus = "briefing";
let punchCooldown = 0;
let punchCooldownMax = 0; // 当前冷却的最大值（用于计算进度）
let punchTier = 0; // 0=第1拳(1s), 1+=后续(2s)
let punchResetTimer = 0; // 停止出拳后重置计时
let totalTime = 0;

/* ---- 3D 目标预览渲染器 ---- */
let previewRenderer = null;
let previewScene = null;
let previewCamera = null;

function initPreviewRenderer() {
  if (previewRenderer) return;
  previewRenderer = new THREE.WebGLRenderer({
    canvas: ui.targetPreviewCanvas,
    antialias: true,
    alpha: true,
  });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace;

  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(28, 200 / 220, 0.1, 50);
  previewCamera.position.set(0, 2.2, 3.6);
  previewCamera.lookAt(0, 0.9, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  previewScene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2, 4, 3);
  previewScene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
  fill.position.set(-2, 2, -1);
  previewScene.add(fill);
}

function renderTargetPreview(level) {
  initPreviewRenderer();
  // 清除旧模型
  while (previewScene.children.length > 3) {
    previewScene.remove(previewScene.children[3]);
  }

  const bg = level.id === "bloodmoon" ? 0x21060b : level.lighting === "night" ? 0x0c1424 : 0xd0dce8;
  previewScene.background = new THREE.Color(bg);

  if (level.id === "gaming") {
    const npc = createNpc(0, { gamingTarget: true });
    setBlackEye(npc, 1);
    previewScene.add(npc.group);
  } else if (level.duelMode) {
    const local = createLowPolyPerson(LOW_POLY_PLAYER_PALETTE);
    const remote = createLowPolyPerson(LOW_POLY_REMOTE_PALETTE);
    local.group.position.set(-0.5, 0, 0);
    remote.group.position.set(0.5, 0, 0);
    local.group.rotation.y = 0.4;
    remote.group.rotation.y = -0.4;
    previewScene.add(local.group, remote.group);
  } else if (level.id === "library") {
    // 情侣：两个人面对面
    const a = createLowPolyPerson(LOW_POLY_NPC_PALETTES[0]);
    const b = createLowPolyPerson(LOW_POLY_NPC_PALETTES[1]);
    a.group.position.set(-0.32, 0, 0);
    b.group.position.set(0.32, 0, 0);
    a.group.rotation.y = 0.5;
    b.group.rotation.y = -0.5;
    // 渲染口红印效果
    [a, b].forEach((npc) => {
      npc.group.userData.lipMarks.forEach((m) => {
        m.material = m.material.clone();
        m.material.opacity = 0.9;
        m.scale.set(3.8, 2.8, 1);
      });
    });
    previewScene.add(a.group, b.group);
  } else if (level.id === "bloodmoon") {
    const cue = createBloodmoonClawCue(1);
    cue.position.set(0, 0.045, 0.16);
    previewScene.add(cue);

    const npc = createLowPolyPerson(LOW_POLY_NPC_PALETTES[2]);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  } else if (level.id === "temple") {
    const cue = createSuShiShadowCue(1);
    cue.position.set(0, 0.045, 0.08);
    previewScene.add(cue);

    const npc = createTemplePerson("bamboo", 0);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  } else {
    const npc = createLowPolyPerson(LOW_POLY_NPC_PALETTES[0]);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  }

  previewRenderer.render(previewScene, previewCamera);
}

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

function formatLevelCardDesc(level) {
  const n = getNpcCountForDisplay();
  if (level.id === "gaming") return `在 ${n} 人中找到凌晨三点还在打游戏的人`;
  if (level.id === "library") return `在 ${n} 人中找到图书馆里亲嘴的情侣`;
  if (level.id === "temple") return `在 ${n} 个苏轼影分身里找出真正吵醒怀民的苏轼`;
  if (level.id === "bloodmoon") return `在 ${n} 人中找出血月引路人`;
  return level.cardDesc;
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
}

/* ---- 决斗 / 联机 ---- */
function isDuelActive() {
  if (!isDuelLevel()) return false;
  if (!isConnected()) return true;
  return ["briefing", "playing", "paused", "settling"].includes(gameStatus);
}

function isDuelRematchContext() {
  return isDuelLevel(LEVELS[currentLevelIndex]) || (levelState && isDuelLevel(levelState.level));
}

function getWorldContext() {
  return {
    getScene: () => scene,
    getLevelState: () => levelState,
    randomRange,
    getMatchNpcCount,
    collidesWithObstacle: (pos, radius) => collidesWithObstacleInLevel(levelState, pos, radius),
    registerObstacle: (x, z, halfW, halfD) => registerObstacleInLevel(levelState, x, z, halfW, halfD),
    createBloodmoonClawCue,
    createSuShiShadowCue,
    createLightningBolt: (x, z, width, height, tilt) => createLightningBolt(x, z, width, height, tilt, randomRange),
  };
}

function createPlayer() {
  return createPlayerEntity(levelState?.level?.id);
}

function createNpc(id, flags) {
  return createNpcEntity(id, flags, levelState?.level?.id, randomRange);
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

function triggerDamageFx() {
  fx.triggerDamageFx();
}

function updateShake(dt) {
  fx.updateShake(dt, camera);
}

function collectDuelSnapshot() {
  return collectDuelSnapshotFromState({
    isDuelLevel,
    levelState,
    totalTime,
    getIsHost,
    player,
    remotePlayer,
    npcs,
  });
}

function buildGameStatePayload(extra = {}) {
  return buildGameStatePayloadFromState({
    stateRevision,
    gameMode,
    gameStatus,
    currentLevelIndex,
    isDuelActive,
    matchNpcCount,
    duelRoundId,
    levelState,
    isDuelLevel,
    collectSnapshot: collectDuelSnapshot,
  }, extra);
}

function duelRandom() {
  return duelRng ? duelRng() : Math.random();
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


function nextDuelRoundId() {
  duelRoundId += 1;
  lastRemotePunchId = null;
  lastRemoteWinId = null;
  if (isConnected()) clearRoundSignals();
  return duelRoundId;
}

function nextLocalEventId(type) {
  localEventSeq += 1;
  return `${type}-${duelRoundId}-${localEventSeq}`;
}

function hasRoomInUrl() {
  return Boolean(new URLSearchParams(window.location.search).get("room"));
}

/** 联机完成前，根据 URL / localStorage 判断是否为选手端 */
function isMpGuestSession() {
  if (isConnected()) return !getIsHost();
  if (gameMode !== "duel" || !hasRoomInUrl()) return false;
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  if (params.get("role") === "host") return false;
  try {
    if (localStorage.getItem(HOST_ROOM_KEY) === room) return false;
  } catch { /* ignore */ }
  return true;
}

function clearRoomFromUrl() {
  const url = new URL(window.location);
  url.searchParams.delete("room");
  url.searchParams.delete("role");
  window.history.replaceState({}, "", url);
}

function leaveDuelLobby() {
  mpLeaveRoom();
  clearStoredHostRoom();
  clearRoomFromUrl();
  duelRng = null;
  if (settleTimer) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
  gameMode = "solo";
  mpStatus = "none";
  guestReady = false;
  guestConfirmed = false;
  duelRoundId = 0;
  lastRemotePunchId = null;
  lastRemoteWinId = null;
  remotePlayer = null;
  showLevelSelect();
}

function isInDuelLobby() {
  return gameMode === "duel" && gameStatus === "levelSelect" && (isConnected() || hasRoomInUrl());
}

function canHostPickLevel() {
  return !isConnected() || (getIsHost() && mpStatus === "connected");
}

function updateDuelLobbyUI() {
  const inDuelLobby = isInDuelLobby();
  const isGuest = isMpGuestSession();

  if (ui.levelSelectPanel) {
    ui.levelSelectPanel.classList.toggle("is-duel-lobby", inDuelLobby);
  }
  if (ui.duelLobbyPanel) ui.duelLobbyPanel.hidden = !inDuelLobby;
  if (ui.soloModeStack) ui.soloModeStack.hidden = inDuelLobby;
  if (ui.gameLogo) {
    ui.gameLogo.textContent = inDuelLobby ? "⚔️ 图书馆决斗 ⚔️" : "🔥 别让我逮到你 🔥";
  }

  if (!inDuelLobby) return;

  if (isGuest) {
    if (ui.duelLobbyHint) ui.duelLobbyHint.hidden = true;
    if (ui.mpShareBox) ui.mpShareBox.hidden = true;
    if (ui.duelGuestWaiting) ui.duelGuestWaiting.hidden = false;
  } else {
    if (ui.duelLobbyHint) ui.duelLobbyHint.hidden = false;
    if (ui.mpShareBox) ui.mpShareBox.hidden = false;
    if (ui.duelGuestWaiting) ui.duelGuestWaiting.hidden = true;
  }
}

function buildLevelCards() {
  ui.levelCards.innerHTML = "";
  const mpGuest = isMpGuestSession();
  const mpHostWaiting = isConnected() && getIsHost() && mpStatus !== "connected";

  LEVELS.forEach((level, i) => {
    if (level.duelMode) return;

    const best = getBestScore(level.id);
    const starsHtml = Array.from({ length: 3 }, (_, si) =>
      `<span class="level-star${si < level.difficulty ? " is-on" : ""}">★</span>`,
    ).join("");
    const bestText = best ? `${best.grade} · ${best.time}s` : "--";
    const disabled = mpGuest || mpHostWaiting;

    const card = document.createElement("button");
    card.className = `level-card level-card--${level.id}${disabled ? " disabled" : ""}`;
    card.type = "button";
    card.disabled = disabled;
    card.dataset.level = level.id;
    card.innerHTML = `
      <div class="level-card-accent" aria-hidden="true"></div>
      <div class="level-card-icon">${level.emoji}</div>
      <div class="level-card-body">
        <div class="level-card-name">${level.sceneName}</div>
        <div class="level-card-desc">${formatLevelCardDesc(level)}</div>
        <div class="level-card-meta">
          <span class="level-card-stars" aria-label="难度 ${level.difficulty}">${starsHtml}</span>
          <span class="level-card-best">最佳 <strong>${bestText}</strong></span>
        </div>
      </div>
      <div class="level-card-go" aria-hidden="true"><span>👊</span></div>
    `;
    if (!disabled) {
      card.addEventListener("click", () => selectLevel(i));
    }
    ui.levelCards.appendChild(card);
  });

  if (mpGuest) {
    ui.npcCountInput.disabled = true;
  } else {
    ui.npcCountInput.disabled = false;
  }
}

function showLevelSelect() {
  clearPendingRoundEndTimers();
  disposeScene();
  scene = null;
  gameStatus = "levelSelect";
  guestReady = false;
  guestConfirmed = false;
  if (!isConnected() && !hasRoomInUrl()) gameMode = "solo";
  if (isConnected() && getIsHost()) {
    clearGuestReady();
    pushGameState({ phase: "lobby", levelIndex: null, started: false, mode: gameMode });
  }
  syncNpcCountInput();
  updateDuelLobbyUI();
  if (!isInDuelLobby()) buildLevelCards();
  updateMpUI();
  if (ui.hud) ui.hud.classList.remove("is-duel-play", "gather-active", "bloodmoon-mode", "bloodmoon-hit", "bloodmoon-lightning");
  if (ui.gatherBanner) ui.gatherBanner.classList.add("hidden");
  ui.huntIntro?.classList.remove("visible");
  ui.huntCard?.classList.remove("visible");
  ui.attackButton?.classList.remove("bloodmoon");
  ui.sceneName?.classList.remove("bloodmoon-text");
  ui.clueBar?.classList.remove("bloodmoon");
  ui.attemptChip?.classList.remove("bloodmoon");
  ui.levelSelectModal.classList.add("visible");
  ui.taskModal.classList.remove("visible");
  ui.resultModal.classList.remove("visible");
}

function updateMpUI() {
  if (gameMode === "duel") {
    ui.mpCreateBtn.style.display = "none";
    const isGuest = isMpGuestSession();

    if (isGuest) {
      const guestText = mpStatus === "connected"
        ? "✅ 已加入房间，等待队长开始..."
        : "🔗 正在加入房间...";
      if (ui.duelGuestStatus) ui.duelGuestStatus.textContent = guestText;
    } else if (isConnected() || hasRoomInUrl()) {
      if (isConnected()) ui.mpLinkInput.value = getShareLink();
      if (mpStatus === "connected") {
        ui.mpStatusText.textContent = "✅ 选手已加入，等待确认就绪";
        ui.mpStatusText.style.color = "#4ade80";
        if (ui.duelLobbyHint) {
          ui.duelLobbyHint.textContent = "选手已加入，确认就绪后即可开始游戏";
        }
      } else {
        ui.mpStatusText.textContent = isConnected() ? "🔗 等待选手加入" : "🔗 正在创建房间...";
        ui.mpStatusText.style.color = "";
        if (ui.duelLobbyHint) {
          ui.duelLobbyHint.textContent = "把下方链接发给选手，选手打开即可加入";
        }
      }
    }
  } else if (isConnected()) {
    ui.mpCreateBtn.style.display = "none";
    ui.mpShareBox.hidden = false;
    ui.mpLinkInput.value = getShareLink();
    if (getIsHost()) {
      ui.mpStatusText.textContent = mpStatus === "connected"
        ? "✅ 选手已加入！请选择关卡"
        : "🔗 等待选手加入...";
    }
  } else {
    ui.mpCreateBtn.style.display = "";
  }

  updateDuelLobbyUI();
}

function pushGameState(extra = {}) {
  if (!isConnected() || !getIsHost()) return;
  stateRevision += 1;
  syncGameState(buildGameStatePayload(extra));
}

function applyDuelSnapshot(snapshot, options = {}) {
  if (!snapshot?.duelNpcs?.length) return;
  levelState.worldSeed = snapshot.worldSeed ?? levelState.worldSeed;
  duelRng = createSeededRng(levelState.worldSeed);
  if (!levelState.duelPunchers) {
    levelState.duelPunchers = buildDuelPuncherSet(levelState.worldSeed);
  }

  if (options.respawnNpcs) {
    npcs.forEach((n) => scene.remove(n.group));
    npcs = [];
    spawnDuelNpcsFromSnapshot(snapshot);
  } else {
    snapshot.duelNpcs.forEach((data, i) => {
      const npc = npcs[i];
      if (!npc) return;
      npc.group.position.set(data.x, 0, data.z);
      clampToWorld(npc.group.position);
      npc.hp = data.hp ?? DUEL_NPC_HP;
      npc.alive = data.alive !== false;
      npc.punchDelay = data.punchDelay ?? NPC_PUNCH_INTERVAL;
      npc.punchTimer = data.punchTimer ?? 0;
      npc.group.visible = npc.alive;
    });
  }

  if (options.resyncTime && snapshot.elapsed != null && levelState.startTime != null) {
    totalTime = levelState.startTime + snapshot.elapsed;
  }

  const myHp = getIsHost() ? snapshot.hostHp : snapshot.guestHp;
  if (myHp != null && player) {
    player.hp = myHp;
    levelState.playerHp = myHp;
    levelState.attempts = myHp;
  }
  const remoteHp = getIsHost() ? snapshot.guestHp : snapshot.hostHp;
  if (remoteHp != null && remotePlayer) {
    remotePlayer.hp = remoteHp;
  }
  updateHud();
}

function applyRemoteGameState(state) {
  if (!state || getIsHost()) return;

  if (state.revision != null && state.revision <= lastRemoteStateRevision) return;
  if (state.revision != null) lastRemoteStateRevision = state.revision;

  if (state.mode) gameMode = state.mode;

  if (state.phase === "lobby" || state.levelIndex == null) {
    if (gameStatus !== "levelSelect") showLevelSelect();
    return;
  }

  const guestOnResult = gameStatus === "won" || gameStatus === "lost" || gameStatus === "settling";
  if (
    state.phase === "briefing" &&
    !state.started &&
    guestOnResult &&
    state.levelIndex != null
  ) {
    const remoteRoundId = state.roundId ?? 0;
    if (remoteRoundId !== duelRoundId) {
      duelRoundId = remoteRoundId;
      lastRemotePunchId = null;
      lastRemoteWinId = null;
    }
    guestConfirmed = false;
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }
    resetLevel(state.levelIndex, {
      worldSeed: state.worldSeed,
      duelSpawns: state.duelSpawns,
      duelNpcs: state.duelNpcs,
      elapsed: 0,
      playerHp: state.guestHp ?? DUEL_PLAYER_HP,
      skipBriefing: false,
    });
    updateMpUI();
    updateTaskMpUI();
    return;
  }

  if (state.npcCount != null && state.mode !== "duel") {
    matchNpcCount = clampNpcCount(state.npcCount);
    syncNpcCountInput();
    saveMatchNpcCount(matchNpcCount);
  }

  const remoteRoundId = state.roundId ?? 0;
  const roundChanged = remoteRoundId !== duelRoundId;
  const levelChanged = state.levelIndex !== currentLevelIndex;
  const midGameReconnect = state.started && scene && !levelChanged && !roundChanged;

  if (state.mode === "duel" && roundChanged) {
    duelRoundId = remoteRoundId;
    lastRemotePunchId = null;
    lastRemoteWinId = null;
  }

  if (levelChanged || (state.mode === "duel" && roundChanged)) {
    guestConfirmed = false;
    resetLevel(state.levelIndex, {
      worldSeed: state.worldSeed,
      duelSpawns: state.duelSpawns,
      duelNpcs: state.duelNpcs,
      elapsed: state.started ? state.elapsed : 0,
      playerHp: state.guestHp,
      skipBriefing: state.started,
    });
    updateMpUI();
    updateTaskMpUI();
  } else if (midGameReconnect && state.duelNpcs && state.syncSnapshot) {
    applyDuelSnapshot(state, { respawnNpcs: false, resyncTime: true });
  }

  if (state.phase === "paused" && gameStatus === "playing") {
    gameStatus = "paused";
    ui.pauseModal.classList.add("visible");
  } else if (state.phase === "playing" && gameStatus === "paused") {
    gameStatus = "playing";
    ui.pauseModal.classList.remove("visible");
  }

  if (state.started && gameStatus === "briefing") {
    gameStatus = "playing";
    levelState.startTime = totalTime - (state.elapsed ?? 0);
    ui.taskModal.classList.remove("visible");
    updateMpUI();
  }
}

function updateTaskMpUI() {
  if (!isConnected() || gameStatus !== "briefing") {
    ui.taskMpHint.hidden = true;
    ui.startButton.disabled = false;
    ui.startButton.textContent = "开始行动";
    return;
  }

  ui.taskMpHint.hidden = false;

  if (getIsHost()) {
    ui.startButton.textContent = isDuelActive() ? "开始游戏" : "开始行动";
    ui.startButton.disabled = !guestReady;
    ui.taskMpHint.textContent = guestReady
      ? "✅ 选手已确认，点击「开始游戏」"
      : "⏳ 等待选手阅读规则并点击「确认就绪」";
  } else {
    ui.startButton.textContent = guestConfirmed ? "已确认" : "确认就绪";
    ui.startButton.disabled = guestConfirmed;
    ui.taskMpHint.textContent = guestConfirmed
      ? "✅ 已确认，等待队长开始..."
      : "请阅读任务后点击「确认就绪」";
  }
}

function createMpCallbacks() {
  return {
    onRemoteUpdate(data) {
      if (remotePlayer) {
        const tx = data.x ?? remotePlayer.targetX ?? remotePlayer.group.position.x;
        const tz = data.z ?? remotePlayer.targetZ ?? remotePlayer.group.position.z;
        const tr = data.rotation ?? remotePlayer.targetRot ?? remotePlayer.group.rotation.y;
        remotePlayer.targetX = tx;
        remotePlayer.targetZ = tz;
        remotePlayer.targetRot = tr;
        remotePlayer.netTime = performance.now();

        if (!remotePlayer._netInit) {
          remotePlayer.group.position.set(tx, 0, tz);
          remotePlayer.group.rotation.y = tr;
          remotePlayer._prevX = tx;
          remotePlayer._prevZ = tz;
          remotePlayer._netInit = true;
        }
        if (data.hp != null) {
          remotePlayer.hp = data.hp;
          if (isDuelActive() && data.hp <= 0 && gameStatus === "playing") {
            dissolveActor(remotePlayer);
            settleRound(true);
          }
        }
      }
    },
    onRemotePunch(data) {
      if (!data) return;
      if (isDuelActive() && data.roundId !== duelRoundId) return;
      if (data.punchId && data.punchId === lastRemotePunchId) return;
      if (data.punchId) lastRemotePunchId = data.punchId;
      if (remotePlayer) remotePlayer.punchTimer = PUNCH_SWING;
      // 联机 PvP：以被打方本地位置为准校验，不依赖攻击方的 attempt 标记
      if (isDuelActive() && isConnected()) {
        if (validatePvpHit(data, player)) {
          applyPlayerDamage(1, "对手出拳");
        }
      }
    },
    onRemoteWin(data) {
      if (isDuelActive()) return;
      if (data?.winId && data.winId === lastRemoteWinId) return;
      if (data?.winId) lastRemoteWinId = data.winId;
      if (gameStatus === "playing") {
        settleRound(false, "对手先命中目标！");
      }
    },
    onGuestJoined() {
      mpStatus = "connected";
      updateDuelLobbyUI();
      updateMpUI();
      if (gameMode === "duel" && getIsHost() && gameStatus === "levelSelect") {
        startDuelBriefing();
      } else if (gameStatus !== "levelSelect") {
        const now = performance.now();
        if (gameStatus === "playing" && now - lastGuestSnapshotAt < 12000) return;
        lastGuestSnapshotAt = now;
        pushGameState({ includeSnapshot: true, syncSnapshot: true });
      }
    },
    onRoomReady() {
      mpStatus = "connected";
      updateDuelLobbyUI();
      updateMpUI();
    },
    onGuestReady() {
      guestReady = true;
      if (gameStatus === "briefing") updateTaskMpUI();
    },
    onGameState(state) {
      applyRemoteGameState(state);
    },
    onRemoteLeft(who) {
      mpStatus = "none";
      const msg = who === "host" ? "房主已离开，房间已关闭" : "对手已离开";
      if (ui.duelGuestStatus) ui.duelGuestStatus.textContent = `⚠️ ${msg}`;
      if (ui.mpStatusText) ui.mpStatusText.textContent = `⚠️ ${msg}`;
      if (gameStatus === "playing" || gameStatus === "paused" || gameStatus === "briefing") {
        settleRound(false, msg);
      } else {
        showLevelSelect();
      }
    },
    onJoinFailed(reason) {
      mpStatus = "none";
      const msg = reason === "room_full"
        ? "房间已满，请向房主索取新链接"
        : reason === "room_not_found"
          ? "房间不存在或已关闭"
          : "加入房间失败，请刷新重试";
      if (ui.duelGuestStatus) ui.duelGuestStatus.textContent = `❌ ${msg}`;
      leaveDuelLobby();
      if (ui.mpStatusText) ui.mpStatusText.textContent = `❌ ${msg}`;
    },
  };
}

function selectLevel(index) {
  if (isConnected() && gameMode === "duel" && !isDuelLevel(LEVELS[index])) return;
  if (isConnected() && !canHostPickLevel()) return;
  if (getIsHost() || !isConnected()) {
    commitNpcCountInput();
  }
  guestReady = false;
  guestConfirmed = false;
  if (isConnected() && getIsHost()) clearGuestReady();
  if (isConnected() && getIsHost() && isDuelLevel(LEVELS[index])) nextDuelRoundId();
  ui.levelSelectModal.classList.remove("visible");
  resetLevel(index);
  if (isConnected() && getIsHost() && isDuelLevel(LEVELS[index])) {
    pushGameState({
      mode: gameMode,
      phase: "briefing",
      levelIndex: index,
      npcCount: DUEL_NPC_COUNT,
      roundId: duelRoundId,
      started: false,
      worldSeed: levelState.worldSeed,
      duelSpawns: levelState.duelSpawns,
    });
  } else {
    pushGameState({
      mode: gameMode,
      phase: "briefing",
      levelIndex: index,
      npcCount: isDuelLevel(LEVELS[index]) ? DUEL_NPC_COUNT : matchNpcCount,
      roundId: duelRoundId,
      started: false,
    });
  }
}

function startDuelBriefing() {
  if (gameMode !== "duel" || !canHostPickLevel()) return;
  selectLevel(getDuelLevelIndex());
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
  window.addEventListener("beforeunload", mpLeaveRoom);

  if (hasRoomInUrl()) {
    gameMode = "duel";
    mpStatus = "waiting";
    void initMultiplayer(createMpCallbacks());
  }

  // 初始显示关卡选择，不直接加载关卡
  showLevelSelect();
  renderer.setAnimationLoop(tick);
}

function setupUi() {
  ui.huntIntro = document.createElement("div");
  ui.huntIntro.className = "hunt-intro";
  ui.huntIntro.setAttribute("aria-live", "assertive");
  ui.hud.appendChild(ui.huntIntro);

  ui.huntCard = document.createElement("div");
  ui.huntCard.className = "hunt-card";
  ui.huntCard.setAttribute("aria-live", "polite");
  ui.hud.appendChild(ui.huntCard);

  matchNpcCount = loadMatchNpcCount();
  syncNpcCountInput();
  bindNpcCountInput();

  ui.startButton.addEventListener("click", () => {
    if (gameStatus !== "briefing") return;

    if (isConnected() && !getIsHost()) {
      if (guestConfirmed) return;
      guestConfirmed = true;
      syncGuestReady(true);
      updateTaskMpUI();
      return;
    }

    if (isConnected() && getIsHost() && !guestReady) return;

    gameStatus = "playing";
    levelState.startTime = totalTime;
    ui.taskModal.classList.remove("visible");
    updateHud();
    if (isDuelActive()) syncHp(player.hp);
    pushGameState({
      phase: "playing",
      started: true,
      roundId: duelRoundId,
      duelSpawns: levelState.duelSpawns,
    });
    if (levelState.level.id === "bloodmoon") sfxWolfHowl();
  });

  ui.backFromTaskButton.addEventListener("click", () => {
    if (gameStatus !== "briefing") return;
    showLevelSelect();
  });

  ui.pauseButton.addEventListener("click", () => {
    if (gameStatus !== "playing") return;
    gameStatus = "paused";
    ui.pauseModal.classList.add("visible");
    if (isConnected() && getIsHost()) pushGameState({ phase: "paused" });
  });

  ui.resumeButton.addEventListener("click", () => {
    if (gameStatus !== "paused") return;
    gameStatus = "playing";
    ui.pauseModal.classList.remove("visible");
    if (isConnected() && getIsHost()) pushGameState({ phase: "playing", started: true });
  });

  ui.backFromPauseButton.addEventListener("click", () => {
    if (gameStatus !== "paused") return;
    ui.pauseModal.classList.remove("visible");
    if (isConnected() && getIsHost()) {
      pushGameState({ phase: "lobby", levelIndex: null, started: false });
    }
    showLevelSelect();
  });

  ui.retryButton.addEventListener("click", () => {
    if (isConnected() && !getIsHost()) return;
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }
    if (isConnected() && getIsHost() && isDuelRematchContext()) {
      nextDuelRoundId();
    }
    resetLevel(currentLevelIndex);
    if (isConnected() && getIsHost()) {
      guestReady = false;
      clearGuestReady();
      pushGameState({
        phase: "briefing",
        started: false,
        roundId: duelRoundId,
        worldSeed: levelState.worldSeed,
        duelSpawns: levelState.duelSpawns,
      });
    }
  });
  ui.backToSelectButton.addEventListener("click", () => showLevelSelect());
  ui.huntCard.addEventListener("pointerdown", (event) => {
    const button = event.target.closest?.("[data-hunt-start]");
    if (!button) return;
    event.preventDefault();
    beginBloodmoonHuntCountdown();
  });
  ui.attackButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    triggerAttack();
  });

  // 多人联机按钮（创建房间 = 双人决斗模式）
  ui.mpCreateBtn.addEventListener("click", () => {
    if (isConnected()) return;
    gameMode = "duel";
    void initMultiplayer(createMpCallbacks());
    mpStatus = "waiting";
    ui.mpLinkInput.value = getShareLink();
    updateDuelLobbyUI();
    updateMpUI();
  });

  ui.mpCopyBtn.addEventListener("click", () => {
    const link = getShareLink();
    navigator.clipboard.writeText(link).then(() => {
      ui.mpCopyBtn.textContent = "已复制!";
      setTimeout(() => { ui.mpCopyBtn.textContent = "复制链接"; }, 1500);
    });
  });

  ui.duelBackBtn?.addEventListener("click", () => leaveDuelLobby());
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
  if (!scene) return;
  removeGatherMarker();
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

  const duel = isDuelLevel(level);
  const worldSeed = duel ? (options.worldSeed ?? Math.floor(Math.random() * 2147483647)) : null;
  duelRng = duel ? createSeededRng(worldSeed) : null;

  levelState = {
    level,
    remaining: duel || level.id === "bloodmoon" ? 9999 : ROUND_SECONDS,
    attempts: duel ? DUEL_PLAYER_HP : ATTEMPTS,
    computers: [],
    pair: null,
    startTime: 0,
    obstacles: [],
    playerHp: options.playerHp ?? DUEL_PLAYER_HP,
    hitInvuln: 0,
    worldSeed,
    duelSpawns: null,
    duelPunchers: duel ? buildDuelPuncherSet(worldSeed) : null,
    sanity: BLOODMOON_SANITY_MAX,
    playerInvuln: 0,
    hostility: 1,
    bloodmoon: null,
    flashlight: null,
  };

  buildWorld(level);

  if (duel) {
    levelState.duelSpawns = options.duelSpawns ?? generateDuelSpawnPair(worldSeed);
  }

  duelSeparateTick = 0;
  duelHerdIndex = -1;
  duelHerdActive = false;
  duelHerdDir.set(0, 1);
  duelGatherSpotIndex = -1;
  duelGatherCheckedIndex = -1;
  duelGatherMetWindow = false;
  removeGatherMarker();

  player = createPlayer();
  player.hp = duel ? (options.playerHp ?? DUEL_PLAYER_HP) : ATTEMPTS;
  player.hitInvuln = 0;
  player.group.position.copy(duel ? duelActorSpawn(true) : randomOpenPosition());
  scene.add(player.group);
  if (duel && isConnected()) syncHp(player.hp);

  remotePlayer = null;
  if (isConnected()) {
    remotePlayer = createRemotePlayer();
    remotePlayer.hp = DUEL_PLAYER_HP;
    const remoteSpawn = duel
      ? duelActorSpawn(false)
      : new THREE.Vector3(randomRange(-8.8, 8.8), 0, randomRange(PLAY_Z_MIN + 0.8, 7.8));
    remotePlayer.group.position.copy(remoteSpawn);
    remotePlayer.targetX = remoteSpawn.x;
    remotePlayer.targetZ = remoteSpawn.z;
    remotePlayer.targetRot = 0;
    remotePlayer._netInit = false;
    remotePlayer.netTime = performance.now();
    scene.add(remotePlayer.group);
  }

  if (duel && options.duelNpcs?.length) {
    spawnDuelNpcsFromSnapshot({ worldSeed: levelState.worldSeed, duelNpcs: options.duelNpcs });
  } else {
    spawnNpcs(level);
  }

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

function updateTaskAttemptsChip(duel) {
  const chip = document.querySelector("#taskAttemptsChip");
  if (!chip) return;
  const level = levelState?.level;
  if (duel) {
    chip.innerHTML = `生命 <span id="taskAttempts" class="hearts-display">${formatHearts(DUEL_PLAYER_HP)}</span>`;
  } else if (level?.id === "bloodmoon") {
    chip.innerHTML = `理智 <span id="taskAttempts">${BLOODMOON_SANITY_MAX}</span>`;
  } else {
    chip.innerHTML = `🥊 <span id="taskAttempts">${ATTEMPTS}</span> 次机会`;
  }
  ui.taskAttempts = document.querySelector("#taskAttempts");
}

function spawnPunchSwish(actor) {
  if (!scene || !actor?.group) return;
  const pos = actor.group.position;
  const rot = actor.group.rotation.y;
  const fx = Math.sin(rot);
  const fz = Math.cos(rot);
  for (let i = 0; i < 10; i += 1) {
    const mat = getPixelMaterial(0xffe066);
    const cube = new THREE.Mesh(pixelGeo, mat);
    cube.position.set(
      pos.x + fx * 0.62 + randomRange(-0.12, 0.12),
      randomRange(0.75, 1.25),
      pos.z + fz * 0.62 + randomRange(-0.12, 0.12),
    );
    scene.add(cube);
    particles.push({
      mesh: cube,
      velocity: new THREE.Vector3(
        fx * 3.2 + randomRange(-0.6, 0.6),
        randomRange(0.1, 0.9),
        fz * 3.2 + randomRange(-0.6, 0.6),
      ),
      spin: new THREE.Vector3(randomRange(-10, 10), randomRange(-10, 10), randomRange(-10, 10)),
      life: 0.22,
      maxLife: 0.22,
    });
  }
}

function showTask() {
  const level = levelState.level;
  const duel = isDuelLevel(level);
  ui.taskEmoji.textContent = level.emoji;
  ui.taskTitle.textContent = level.sceneName;
  ui.taskCopy.textContent = level.mission;
  ui.taskClue.textContent = "🔍 " + level.clue;
  ui.taskNpcCount.textContent = duel ? DUEL_NPC_COUNT : getMatchNpcCount();
  ui.taskTime.textContent = duel || level.id === "bloodmoon" ? "∞" : ROUND_SECONDS;
  updateTaskAttemptsChip(duel);
  ui.targetLabel.textContent = duel ? "对手" : level.targetDesc;
  ui.levelSelectModal.classList.remove("visible");
  ui.taskModal.classList.add("visible");
  ui.resultModal.classList.remove("visible");
  ui.retryButton.disabled = false;
  ui.retryButton.textContent = "再来一局";

  // 渲染 3D 目标预览
  renderTargetPreview(level);
  updateTaskMpUI();
  updateHud();
}


function spawnNpcs(level) {
  if (level.duelMode) {
    spawnDuelNpcs();
    return;
  }

  if (level.id === "gaming") {
    const target = createNpc(0, { gamingTarget: true });
    const computer = levelState.computers[2];
    target.group.position.copy(computer);
    target.group.position.x += 0.2;
    target.script = {
      state: "play",
      timer: 2.6,
      playDuration: 2.6,
      computerIndex: 2,
      waypoint: null,
    };
    faceNpcToward(target, levelState.computers[2].clone().setZ(levelState.computers[2].z - 1.2));
    setBlackEye(target, 0.62);
    npcs.push(target);
    scene.add(target.group);

    for (let i = 1; i < getMatchNpcCount(); i += 1) {
      addWanderNpc(i);
    }
  } else if (level.id === "library") {
    const a = createNpc(0, { lover: true });
    const b = createNpc(1, { lover: true });
    a.group.position.set(-0.38, 0, -0.2);
    b.group.position.set(0.38, 0, -0.2);
    a.loverIndex = 0;
    b.loverIndex = 1;
    npcs.push(a, b);
    scene.add(a.group, b.group);
    levelState.pair = {
      members: [a, b],
      state: "kiss",
      timer: 2.2,
      kissCount: 0,
      meetingPoint: new THREE.Vector3(0, 0, -0.2),
      scatterPoints: [new THREE.Vector3(-3, 0, 2.5), new THREE.Vector3(3, 0, 1.6)],
    };

    for (let i = 2; i < getMatchNpcCount(); i += 1) {
      addWanderNpc(i);
    }
  } else if (level.id === "bloodmoon") {
    const target = createNpc(0, { bloodmoonTarget: true });
    const start = randomOpenPosition();
    target.group.position.set(start.x, 0, start.z);
    target.script = {
      state: "wander",
      timer: randomRange(2.2, 4.4),
      waypoint: randomOpenPosition(),
      cluePause: 0,
    };
    npcs.push(target);
    scene.add(target.group);

    for (let i = 1; i < getMatchNpcCount(); i += 1) {
      addWanderNpc(i);
    }
  } else {
    const target = createNpc(0, { suShiTarget: true, templeClone: true });
    const start = randomOpenPositionAwayFromTempleCenter();
    target.group.position.set(start.x, 0, start.z);
    target.script = {
      state: "wander",
      timer: randomRange(2.4, 4.2),
      waypoint: randomOpenPositionOutsideTempleMoon(start),
      moonPoint: levelState.temple.moonPoint.clone(),
      revealProgress: 0,
      exposed: false,
      wanderRouteLeft: 2,
      nextMoonDelay: randomRange(TEMPLE_TRUE_INITIAL_MOON_DELAY[0], TEMPLE_TRUE_INITIAL_MOON_DELAY[1]),
    };
    npcs.push(target);
    scene.add(target.group);

    for (let i = 1; i < getMatchNpcCount(); i += 1) {
      addWanderNpc(i);
    }
  }

  const decoyCount = level.id === "temple" ? 5 : level.id === "library" ? 4 : level.id === "bloodmoon" ? 6 : 3;
  const wanderNpcs = npcs.filter((n) => !n.isGamingTarget && !n.isLover && !n.isSuShiTarget && !n.isBloodmoonTarget && n.alive);
  shuffleArray(wanderNpcs);
  for (let i = 0; i < Math.min(decoyCount, wanderNpcs.length); i += 1) {
    initDecoy(wanderNpcs[i], level.id === "temple" && i < 3);
  }

  if (level.id === "bloodmoon") {
    npcs.forEach((npc) => initBloodmoonNpc(npc));
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
}

function spawnDuelNpcs() {
  const punchers = levelState.duelPunchers ?? buildDuelPuncherSet(levelState.worldSeed);
  for (let i = 0; i < DUEL_NPC_COUNT; i += 1) {
    const npc = createNpc(i, { duelPunch: true });
    const pos = randomOpenPosition();
    npc.group.position.set(pos.x, 0, pos.z);
    nudgeActorFromObstacles(npc);
    npc.wanderTimer = randomRange(0.6, 2.2);
    npc.pauseTimer = randomRange(0.2, 1.3);
    npc.walking = false;
    npc.hp = DUEL_NPC_HP;
    npc.canPunch = punchers.has(i);
    npc.punchDelay = NPC_PUNCH_INTERVAL * ((i % 12) / 12);
    npc.punchTimer = 0;
    npc.punchHitDone = false;
    npcs.push(npc);
    scene.add(npc.group);
  }
}

function spawnDuelNpcsFromSnapshot(snapshot) {
  duelRng = createSeededRng(snapshot.worldSeed ?? levelState.worldSeed);
  const punchers = levelState.duelPunchers
    ?? buildDuelPuncherSet(snapshot.worldSeed ?? levelState.worldSeed);
  snapshot.duelNpcs.forEach((data, i) => {
    const npc = createNpc(i, { duelPunch: true });
    npc.group.position.set(data.x, 0, data.z);
    npc.hp = data.hp ?? DUEL_NPC_HP;
    npc.alive = data.alive !== false;
    npc.canPunch = punchers.has(i);
    npc.punchDelay = data.punchDelay ?? NPC_PUNCH_INTERVAL;
    npc.punchTimer = data.punchTimer ?? 0;
    npc.punchHitDone = false;
    npc.wanderTimer = randomRange(0.6, 2.2);
    npc.pauseTimer = randomRange(0.2, 1.3);
    npc.walking = false;
    if (!npc.alive) npc.group.visible = false;
    npcs.push(npc);
    scene.add(npc.group);
  });
}

function generateDuelGatherSpot(cycleIndex, worldSeed) {
  const rng = createSeededRng((worldSeed >>> 0) ^ Math.imul(cycleIndex + 1, 1597334677));
  const probe = { group: { position: new THREE.Vector3() } };
  for (let attempt = 0; attempt < 40; attempt += 1) {
    probe.group.position.set(
      rng() * 14 - 7,
      0,
      rng() * (7.2 - (PLAY_Z_MIN + 1.0)) + PLAY_Z_MIN + 1.0,
    );
    nudgeActorFromObstacles(probe);
    if (!collidesWithObstacle(probe.group.position)) {
      return {
        x: probe.group.position.x,
        z: probe.group.position.z,
        radius: DUEL_GATHER_RADIUS,
      };
    }
  }
  return { x: 0, z: 2, radius: DUEL_GATHER_RADIUS };
}

function isPlayerInGatherCircle() {
  if (!player?.group) return false;
  const dx = player.group.position.x - duelGatherSpot.x;
  const dz = player.group.position.z - duelGatherSpot.z;
  return dx * dx + dz * dz <= duelGatherSpot.radius * duelGatherSpot.radius;
}

function ensureGatherMarker() {
  if (duelGatherMarker || !scene) return;
  const ringGeo = new THREE.RingGeometry(DUEL_GATHER_RADIUS * 0.82, DUEL_GATHER_RADIUS, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: GATHER_COLOR_PREVIEW,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  duelGatherMarker = new THREE.Mesh(ringGeo, ringMat);
  duelGatherMarker.rotation.x = -Math.PI / 2;
  duelGatherMarker.position.y = 0.04;

  const fillGeo = new THREE.CircleGeometry(DUEL_GATHER_RADIUS * 0.8, 48);
  const fillMat = new THREE.MeshBasicMaterial({
    color: GATHER_COLOR_PREVIEW,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = -0.005;
  duelGatherMarker.add(fill);
  duelGatherMarker.userData.fill = fill;
  scene.add(duelGatherMarker);
}

function removeGatherMarker() {
  if (!duelGatherMarker) return;
  if (scene) scene.remove(duelGatherMarker);
  duelGatherMarker.geometry?.dispose();
  duelGatherMarker.material?.dispose();
  duelGatherMarker.userData.fill?.geometry?.dispose();
  duelGatherMarker.userData.fill?.material?.dispose();
  duelGatherMarker = null;
}

function formatGatherCountdown(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (minutes > 0) return `${minutes}:${String(remainder).padStart(2, "0")}`;
  return `${total}s`;
}

function getDuelGatherUiState() {
  if (gameStatus !== "playing" || !isDuelLevel() || levelState?.startTime == null) return null;

  const elapsed = Math.max(0, totalTime - levelState.startTime);
  const gatherIndex = Math.floor(elapsed / DUEL_GATHER_INTERVAL);
  const phaseInCycle = elapsed - gatherIndex * DUEL_GATHER_INTERVAL;
  const timeToDeadline = DUEL_GATHER_INTERVAL - phaseInCycle;
  const timeToPreview = Math.max(0, timeToDeadline - DUEL_GATHER_PREVIEW);
  const inCircle = isPlayerInGatherCircle();

  if (timeToDeadline > DUEL_GATHER_PREVIEW) {
    if (timeToPreview <= 12) {
      return {
        bannerVisible: true,
        phase: "upcoming",
        seconds: timeToPreview,
        title: "即将集合报到",
        hint: "绿圈马上出现 · 站进去报到 · 最后 5 秒必须在圈内 · 否则扣 1 ❤️",
      };
    }
    return {
      bannerVisible: false,
      clueHint: `⏳ ${formatGatherCountdown(timeToPreview)} 后出现集合圈 · 未报到扣 1 ❤️`,
    };
  }

  if (timeToDeadline <= 0) return null;

  const seconds = timeToDeadline;
  if (timeToDeadline <= DUEL_GATHER_WINDOW) {
    if (inCircle) {
      return {
        bannerVisible: true,
        phase: "success",
        seconds,
        title: "已在集合圈内",
        hint: `保持站立 · 剩余 ${formatGatherCountdown(seconds)} · 离开会扣 1 ❤️`,
      };
    }
    return {
      bannerVisible: true,
      phase: "urgent",
      seconds,
      title: "立刻进入集合圈！",
      hint: `地面红圈内站好 · 剩余 ${formatGatherCountdown(seconds)} · 未进圈扣 1 ❤️`,
    };
  }

  return {
    bannerVisible: true,
    phase: "preview",
    seconds,
    title: "集合报到",
    hint: `走到地面绿圈内 · 截止 ${formatGatherCountdown(seconds)} · 最后 5 秒必须在圈里 · 否则扣 1 ❤️`,
  };
}

function getDuelGatherHudHint() {
  const state = getDuelGatherUiState();
  if (!state) return "";
  if (state.bannerVisible) {
    if (state.phase === "urgent") return `🔴 ${state.title} ${formatGatherCountdown(state.seconds)}`;
    if (state.phase === "success") return `✅ ${state.title} ${formatGatherCountdown(state.seconds)}`;
    if (state.phase === "upcoming") return `⏳ ${formatGatherCountdown(state.seconds)} 后出圈`;
    return `📍 ${state.title} · ${formatGatherCountdown(state.seconds)}`;
  }
  return state.clueHint || "";
}

function updateGatherBanner() {
  if (!ui.gatherBanner) return;
  const state = getDuelGatherUiState();
  if (!state?.bannerVisible) {
    ui.gatherBanner.classList.add("hidden");
    ui.gatherBanner.classList.remove("preview", "urgent", "success", "upcoming");
    if (ui.hud) ui.hud.classList.remove("gather-active");
    return;
  }

  ui.gatherBanner.classList.remove("hidden", "preview", "urgent", "success", "upcoming");
  ui.gatherBanner.classList.add(state.phase);
  ui.gatherBannerTitle.textContent = state.title;
  ui.gatherBannerCountdown.textContent = formatGatherCountdown(state.seconds);
  ui.gatherBannerHint.textContent = state.hint;
  if (ui.hud) ui.hud.classList.add("gather-active");
}

function getDuelProximityState() {
  if (
    gameStatus !== "playing"
    || !isDuelActive()
    || !player?.group
    || !remotePlayer?.group
    || remotePlayer.hp <= 0
    || remotePlayer.group.visible === false
  ) {
    return { active: false };
  }

  const dx = player.group.position.x - remotePlayer.group.position.x;
  const dz = player.group.position.z - remotePlayer.group.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist < PROXIMITY_MIN_DIST || dist > PROXIMITY_MAX_DIST) {
    return { active: false, dist };
  }

  const t = 1 - (dist - PROXIMITY_MIN_DIST) / (PROXIMITY_MAX_DIST - PROXIMITY_MIN_DIST);
  const strength = 0.35 + t * 0.65;

  return { active: true, dist, strength };
}

function updateProximityHint() {
  if (!ui.proximityPulse) return;
  const state = getDuelProximityState();
  if (!state.active) {
    ui.proximityPulse.classList.add("hidden");
    ui.proximityPulse.classList.remove("beating");
    return;
  }

  ui.proximityPulse.classList.remove("hidden");
  ui.proximityPulse.classList.add("beating");
  const edgeGlow = 0.12 + state.strength * 0.38;
  const beatDuration = 1.05 - state.strength * 0.42;
  ui.proximityPulse.style.setProperty("--proximity-glow", edgeGlow.toFixed(3));
  ui.proximityPulse.style.setProperty("--beat-duration", `${beatDuration.toFixed(2)}s`);
}

function updateDuelGather() {
  if (gameStatus !== "playing" || !isDuelLevel() || levelState?.startTime == null) {
    removeGatherMarker();
    return;
  }

  const elapsed = Math.max(0, totalTime - levelState.startTime);
  const gatherIndex = Math.floor(elapsed / DUEL_GATHER_INTERVAL);
  const phaseInCycle = elapsed - gatherIndex * DUEL_GATHER_INTERVAL;
  const timeToDeadline = DUEL_GATHER_INTERVAL - phaseInCycle;

  if (gatherIndex !== duelGatherSpotIndex) {
    if (duelGatherSpotIndex >= 0 && duelGatherCheckedIndex !== duelGatherSpotIndex) {
      duelGatherCheckedIndex = duelGatherSpotIndex;
      if (!duelGatherMetWindow && player.hp > 0) {
        applyPlayerDamage(1, "未及时集合");
      }
    }
    duelGatherSpotIndex = gatherIndex;
    duelGatherMetWindow = false;
    Object.assign(duelGatherSpot, generateDuelGatherSpot(gatherIndex, levelState.worldSeed));
  }

  const showMarker = timeToDeadline <= DUEL_GATHER_PREVIEW && timeToDeadline > 0;
  const activeWindow = timeToDeadline <= DUEL_GATHER_WINDOW && timeToDeadline > 0;

  if (showMarker) {
    ensureGatherMarker();
    duelGatherMarker.position.set(duelGatherSpot.x, 0.04, duelGatherSpot.z);
    const urgent = activeWindow;
    const inCircle = isPlayerInGatherCircle();
    const ringColor = urgent
      ? (inCircle ? GATHER_COLOR_SUCCESS : GATHER_COLOR_URGENT)
      : GATHER_COLOR_PREVIEW;
    duelGatherMarker.material.color.setHex(ringColor);
    duelGatherMarker.userData.fill.material.color.setHex(ringColor);
    const pulse = 0.68 + Math.sin(totalTime * (urgent ? 9 : 4)) * 0.12 + (urgent ? 0.14 : 0);
    duelGatherMarker.material.opacity = pulse;
    duelGatherMarker.userData.fill.material.opacity = urgent ? 0.42 : 0.36;
    duelGatherMarker.visible = true;
  } else if (duelGatherMarker) {
    duelGatherMarker.visible = false;
  }

  if (activeWindow && isPlayerInGatherCircle()) {
    duelGatherMetWindow = true;
  }
}

function generateDuelHerdDirection(cycleIndex, worldSeed) {
  const rng = createSeededRng((worldSeed >>> 0) ^ Math.imul(cycleIndex + 1, 2654435761));
  const angle = rng() * Math.PI * 2;
  return new THREE.Vector2(Math.sin(angle), Math.cos(angle)).normalize();
}

function updateDuelHerdState() {
  if (gameStatus !== "playing" || !isDuelLevel() || levelState?.startTime == null) {
    duelHerdActive = false;
    return;
  }

  const elapsed = Math.max(0, totalTime - levelState.startTime);
  if (elapsed < DUEL_HERD_INTERVAL) {
    duelHerdActive = false;
    return;
  }

  const cycleIndex = Math.floor(elapsed / DUEL_HERD_INTERVAL);
  const phase = elapsed - cycleIndex * DUEL_HERD_INTERVAL;
  duelHerdActive = phase < DUEL_HERD_DURATION;

  if (cycleIndex !== duelHerdIndex) {
    duelHerdIndex = cycleIndex;
    duelHerdDir.copy(generateDuelHerdDirection(cycleIndex, levelState.worldSeed));
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      npc.pauseTimer = 0;
      npc.wanderTimer = 1;
      npc.velocity.set(0, 0);
    });
  }
}

function updateDuelNpcMovement(npc, dt) {
  if (duelHerdActive) {
    npc.walking = true;
    const speed = NPC_SPEED * 1.45;
    npc.group.position.x += duelHerdDir.x * speed * dt;
    npc.group.position.z += duelHerdDir.y * speed * dt;
    clampActorPosition(npc.group.position, duelHerdDir);
    const targetRotation = Math.atan2(duelHerdDir.x, duelHerdDir.y);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetRotation, 0.12);
    return;
  }
  updateWander(npc, dt);
}

function generateDuelSpawnPair(seed) {
  const rng = createSeededRng((seed >>> 0) ^ 0x9e3779b9);
  let host = new THREE.Vector3();
  let guest = new THREE.Vector3();

  for (let attempt = 0; attempt < 80; attempt += 1) {
    host.set(rng() * 17.6 - 8.8, 0, rng() * (7.8 - (PLAY_Z_MIN + 0.8)) + PLAY_Z_MIN + 0.8);
    guest.set(rng() * 17.6 - 8.8, 0, rng() * (7.8 - (PLAY_Z_MIN + 0.8)) + PLAY_Z_MIN + 0.8);
    nudgeActorFromObstacles({ group: { position: host } });
    nudgeActorFromObstacles({ group: { position: guest } });
    if (host.distanceTo(guest) >= DUEL_SPAWN_MIN_DIST) {
      return {
        host: { x: host.x, z: host.z },
        guest: { x: guest.x, z: guest.z },
      };
    }
  }

  host.set(-4.2, 0, randomRange(-3, 3));
  guest.set(4.2, 0, randomRange(-3, 3));
  nudgeActorFromObstacles({ group: { position: host } });
  nudgeActorFromObstacles({ group: { position: guest } });
  return {
    host: { x: host.x, z: host.z },
    guest: { x: guest.x, z: guest.z },
  };
}

function duelActorSpawn(isLocalPlayer) {
  const spawns = levelState?.duelSpawns;
  if (!spawns) {
    const side = isLocalPlayer ? -4.2 : 4.2;
    const pos = new THREE.Vector3(side, 0, 0);
    nudgeActorFromObstacles({ group: { position: pos } });
    return pos;
  }
  const slot = isLocalPlayer
    ? (getIsHost() ? spawns.host : spawns.guest)
    : (getIsHost() ? spawns.guest : spawns.host);
  return new THREE.Vector3(slot.x, 0, slot.z);
}

function updateDuelNpcPunch(npc, dt) {
  if (!npc.canPunch) return;

  if (npc.punchTimer > 0) {
    npc.punchTimer = Math.max(0, npc.punchTimer - dt);
    const punchT = 1 - npc.punchTimer / NPC_PUNCH_SWING;
    if (!npc.punchHitDone && punchT > 0.42 && punchT < 0.72) {
      npc.punchHitDone = true;
      tryNpcPunchHit(npc);
    }
    if (npc.punchTimer <= 0) {
      npc.punchDelay = NPC_PUNCH_INTERVAL;
      npc.punchHitDone = false;
    }
    return;
  }

  npc.punchDelay -= dt;
  if (npc.punchDelay <= 0) {
    npc.punchTimer = NPC_PUNCH_SWING;
    npc.punchHitDone = false;
    npc.walking = false;
    npc.pauseTimer = NPC_PUNCH_SWING;
  }
}

function animateNpcPunchPose(npc) {
  const ud = npc.group.userData;
  if (!ud?.rightArm) return;
  if (npc.punchTimer > 0) {
    const t = 1 - npc.punchTimer / NPC_PUNCH_SWING;
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

function tryNpcPunchHit(npc) {
  const npcPos = npc.group.position;
  const facing = getFacingVector(npc.group.rotation.y);
  const targets = [player];
  if (remotePlayer) targets.push(remotePlayer);

  targets.forEach((actor) => {
    if (!actor?.group || actor.hp <= 0) return;
    const toTarget = new THREE.Vector2(
      actor.group.position.x - npcPos.x,
      actor.group.position.z - npcPos.z,
    );
    if (toTarget.length() > NPC_PUNCH_RANGE || !isFacingTarget(facing, toTarget)) return;
    if (actor === player) {
      applyPlayerDamage(NPC_PUNCH_DAMAGE, "NPC 出拳");
    }
  });
}

function applyPlayerDamage(amount, reason) {
  if (gameStatus !== "playing" || !isDuelActive()) return;
  if (player.hitInvuln > 0 || player.hp <= 0) return;

  player.hitInvuln = HIT_INVULN;
  player.hp = Math.max(0, player.hp - amount);
  levelState.playerHp = player.hp;
  levelState.attempts = player.hp;
  updateHud();
  triggerDamageFx();
  triggerShake(0.28, 0.16);
  sfxHurt();
  syncHp(player.hp);

  if (player.hp <= 0) {
    dissolveActor(player);
    settleRound(false, reason || "你被击败了");
  }
}

function getActorDistance2D(a, b) {
  if (!a?.group || !b?.group) return Infinity;
  const dx = b.group.position.x - a.group.position.x;
  const dz = b.group.position.z - a.group.position.z;
  return Math.hypot(dx, dz);
}

function isRemoteInPunchRange(range = HIT_RANGE) {
  if (!remotePlayer?.group || remotePlayer.hp <= 0 || remotePlayer.group.visible === false) {
    return false;
  }
  return getActorDistance2D(player, remotePlayer) <= range;
}

function findDuelPunchTarget() {
  const playerPos = player.group.position;
  getFacingVector(player.group.rotation.y, scratchFacing);
  let best = null;
  let bestDistance = Infinity;

  function testTarget(type, actor) {
    if (!actor?.group || actor.group.visible === false) return;
    if (type === "remote" && (actor.hp ?? 0) <= 0) return;
    if (type === "npc" && !actor.alive) return;
    scratchToPlayer.set(
      actor.group.position.x - playerPos.x,
      actor.group.position.z - playerPos.z,
    );
    const distance = scratchToPlayer.length();
    if (distance > HIT_RANGE || !isFacingTarget(scratchFacing, scratchToPlayer)) return;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { type, actor };
    }
  }

  testTarget("remote", remotePlayer);
  npcs.forEach((npc) => testTarget("npc", npc));

  return best;
}

function damageRemotePlayer() {
  if (!remotePlayer?.group || remotePlayer.hp <= 0) return false;
  if (isConnected()) return true;
  remotePlayer.hp = Math.max(0, (remotePlayer.hp ?? DUEL_PLAYER_HP) - 1);

  if (remotePlayer.hp <= 0) {
    dissolveActor(remotePlayer);
    settleRound(true);
  }
  return true;
}

function damageDuelNpc(npc) {
  if (!npc?.alive) return false;
  dissolveNpc(npc);
  compactDeadNpcs();
  return true;
}

/* ---- 替身 NPC 系统 ---- */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function initDecoy(npc, moonDisturber = false) {
  npc.isDecoy = true;
  npc.deoyState = "wander"; // "wander" | "confuse" | "moonApproach" | "moonPause"
  npc.decoyTimer = randomRange(1.5, 3.5); // 当前状态剩余时间
  npc.decoyDir = new THREE.Vector2(); // 替身移动方向
  npc.isMoonDisturber = moonDisturber;
  npc.moonDisturbTimer = moonDisturber ? randomRange(12, 18) : 0;
  npc.moonDisturbWaypoint = null;
  pickDecoyDir(npc);
}

function pickDecoyDir(npc) {
  const angle = Math.random() * Math.PI * 2;
  npc.decoyDir.set(Math.sin(angle), Math.cos(angle));
}

function updateDecoy(npc, dt) {
  if (npc.isMoonDisturber && levelState?.level?.id === "temple") {
    if (npc.deoyState !== "moonApproach" && npc.deoyState !== "moonPause") {
      npc.moonDisturbTimer -= dt;
      if (npc.moonDisturbTimer <= 0) {
        if (Math.random() < 0.65) {
          npc.deoyState = "moonApproach";
          npc.decoyTimer = randomRange(4.0, 6.0);
          npc.moonDisturbWaypoint = randomTempleDisturbPoint();
        } else {
          npc.moonDisturbTimer = randomRange(12, 18);
        }
      }
    }

    if (npc.deoyState === "moonApproach") {
      npc.walking = true;
      const reached = moveNpcToward(npc, npc.moonDisturbWaypoint, NPC_SPEED * 0.92, dt);
      npc.decoyTimer -= dt;
      if (reached || npc.decoyTimer <= 0) {
        npc.deoyState = "moonPause";
        npc.decoyTimer = randomRange(0.8, 1.4);
      }
      return;
    }

    if (npc.deoyState === "moonPause") {
      npc.walking = false;
      npc.decoyTimer -= dt;
      faceNpcToward(npc, new THREE.Vector3(7.1, 0, -10.4));
      if (npc.decoyTimer <= 0) {
        npc.deoyState = "wander";
        npc.decoyTimer = randomRange(1.0, 2.5);
        npc.moonDisturbTimer = randomRange(12, 18);
        npc.moonDisturbWaypoint = null;
        npc.wanderTimer = randomRange(0.5, 1.5);
        npc.pauseTimer = randomRange(0.2, 0.8);
      }
      return;
    }
  }

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
  const rng = isDuelLevel() && duelRng ? duelRng : Math.random;
  const angle = rng() * Math.PI * 2;
  const scale = isDuelLevel() && duelRng ? rng() * 0.6 + 0.55 : randomRange(0.55, 1.15);
  npc.velocity.set(Math.sin(angle), Math.cos(angle)).multiplyScalar(scale);
  npc.wanderTimer = isDuelLevel() && duelRng ? rng() * 2 + 1 : randomRange(1.0, 3.0);
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

function randomOpenPositionAwayFromTempleCenter() {
  const moonPoint = levelState?.temple?.moonPoint ?? new THREE.Vector3();
  const minDistance = TEMPLE_MOON_RADIUS + 1.2;
  let fallback = null;

  for (let tries = 0; tries < 60; tries += 1) {
    const pos = randomOpenPosition();
    const distance = Math.hypot(pos.x - moonPoint.x, pos.z - moonPoint.z);
    if (!fallback || distance > Math.hypot(fallback.x - moonPoint.x, fallback.z - moonPoint.z)) {
      fallback = pos;
    }
    if (distance >= minDistance) return pos;
  }

  return fallback ?? randomOpenPosition();
}

function randomOpenPositionOutsideTempleMoon(fromPosition = null) {
  const moonPoint = levelState?.temple?.moonPoint ?? new THREE.Vector3();
  const minDistance = TEMPLE_MOON_RADIUS + 0.8;
  let fallback = null;

  for (let tries = 0; tries < 60; tries += 1) {
    const pos = randomOpenPosition();
    const distance = Math.hypot(pos.x - moonPoint.x, pos.z - moonPoint.z);
    if (!fallback || distance > Math.hypot(fallback.x - moonPoint.x, fallback.z - moonPoint.z)) {
      fallback = pos;
    }
    if (distance < minDistance) continue;
    if (fromPosition && segmentPassesTempleMoon(fromPosition, pos, TEMPLE_MOON_RADIUS * 0.82)) continue;
    return pos;
  }

  return fallback ?? randomOpenPositionAwayFromTempleCenter();
}

function segmentPassesTempleMoon(fromPosition, toPosition, radius) {
  const moonPoint = levelState?.temple?.moonPoint;
  if (!moonPoint) return false;
  const ax = fromPosition.x;
  const az = fromPosition.z;
  const bx = toPosition.x;
  const bz = toPosition.z;
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq <= 0.0001) return Math.hypot(ax - moonPoint.x, az - moonPoint.z) < radius;
  const t = THREE.MathUtils.clamp(((moonPoint.x - ax) * dx + (moonPoint.z - az) * dz) / lengthSq, 0, 1);
  const closestX = ax + dx * t;
  const closestZ = az + dz * t;
  return Math.hypot(closestX - moonPoint.x, closestZ - moonPoint.z) < radius;
}

function randomTempleDisturbPoint() {
  const moonPoint = levelState?.temple?.moonPoint ?? new THREE.Vector3();
  for (let tries = 0; tries < 24; tries += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomRange(TEMPLE_MOON_RADIUS * 0.48, TEMPLE_MOON_RADIUS * 0.86);
    const pos = new THREE.Vector3(
      moonPoint.x + Math.sin(angle) * radius,
      0,
      moonPoint.z + Math.cos(angle) * radius,
    );
    if (!collidesWithObstacle(pos)) return pos;
  }
  return moonPoint.clone().add(new THREE.Vector3(randomRange(-2.8, 2.8), 0, randomRange(-2.8, 2.8)));
}



/* ---- bloodmoon mode (from zjy) ---- */


function getTempleMoonInfluence(position) {
  const moonPoint = levelState?.temple?.moonPoint;
  if (!moonPoint) return 0;
  const distance = Math.hypot(position.x - moonPoint.x, position.z - moonPoint.z);
  return THREE.MathUtils.clamp((TEMPLE_MOON_RADIUS - distance) / TEMPLE_SHADOW_FADE, 0, 1);
}


function updateTempleShadows() {
  if (levelState?.level?.id !== "temple") return;
  const actors = [player, ...npcs].filter(Boolean);

  actors.forEach((actor) => {
    const influence = getTempleMoonInfluence(actor.group.position);
    const pulse = 0.9 + Math.sin(totalTime * 2.4 + (actor.id ?? 0)) * 0.08;
    const strength = actor.isSuShiTarget ? 0.86 : actor.isDecoy ? 0.84 : 0.8;
    setTempleLocalShadow(actor, influence, strength, pulse);
  });

  const target = npcs.find((npc) => npc.isSuShiTarget);
  if (target?.marked) {
    pulseSuShiClues(target);
  } else if (levelState?.temple?.shadowCue) {
    setShadowCueIntensity(levelState.temple.shadowCue, 0);
  }
}




function initBloodmoonNpc(npc) {
  npc.alertTimer = randomRange(0.4, 2.6);
  npc.attackTimer = 0;
  npc.attackResolveTimer = 0;
  npc.attackCooldown = randomRange(0.7, 1.7);
  npc.hostility = npc.isBloodmoonTarget ? 1.15 : randomRange(0.82, 1.12);
}



function updateBloodmoonStorm(dt) {
  const state = levelState.bloodmoon;
  if (!state) return;
  if (state.mode === "hunt") {
    state.lightningFlash = Math.max(0, state.lightningFlash - dt * 3.5);
    if (state.lightningLight) state.lightningLight.intensity = state.lightningFlash * 5.5;
    return;
  }

  state.lightningTimer -= dt;
  state.lightningFlash = Math.max(0, state.lightningFlash - dt * 4.8);
  state.clueTimer = Math.max(0, state.clueTimer - dt);

  if (state.lightningTimer <= 0) {
    state.lightningTimer = randomRange(BLOODMOON_LIGHTNING_INTERVAL[0], BLOODMOON_LIGHTNING_INTERVAL[1]);
    state.lightningFlash = 1;
    state.clueTimer = BLOODMOON_CLUE_SECONDS;
    state.revealCount = Math.min(3, (state.revealCount ?? 0) + 1);
    triggerShake(0.42, 0.32);
    ui.hud.classList.remove("bloodmoon-lightning");
    void ui.hud.offsetWidth;
    ui.hud.classList.add("bloodmoon-lightning");
    window.setTimeout(() => ui.hud.classList.remove("bloodmoon-lightning"), 360);
    window.setTimeout(() => sfxThunder(), randomRange(180, 420));

    const target = npcs.find((npc) => npc.isBloodmoonTarget && npc.alive);
    if (target?.script) {
      target.script.cluePause = BLOODMOON_CLUE_SECONDS;
      target.script.timer = Math.max(target.script.timer, BLOODMOON_CLUE_SECONDS);
    }
    assignBloodmoonDecoyCues();
  }

  const flash = state.lightningFlash;
  const strobe = flash > 0 ? flash * (0.75 + Math.abs(Math.sin(totalTime * 44)) * 0.65) : 0;
  if (state.lightningLight) state.lightningLight.intensity = strobe * 9.5;
  if (state.baseLight) {
    state.baseLight.color.set(strobe > 0.08 ? 0xf8fbff : 0xff6b6b);
    state.baseLight.intensity = 1.55 + strobe * 4.8;
  }
  if (state.moonMaterial) {
    state.moonMaterial.opacity = 0.78 + Math.sin(totalTime * 1.7) * 0.08 + strobe * 0.2;
  }
  state.lightningBolts?.forEach((bolt, index) => {
    const visible = strobe > 0.08 && (index === 0 || Math.sin(totalTime * 37 + index) > -0.25);
    bolt.visible = visible;
    bolt.userData.segments?.forEach((seg) => {
      seg.material.opacity = visible ? Math.min(1, (seg.geometry.parameters.width < 0.1 ? 0.92 : 0.26) * strobe) : 0;
    });
  });
}

function handleBloodmoonBossHit(boss) {
  const state = levelState.bloodmoon;
  if (!state || state.mode === "hunt") return;
  triggerHitstop(0.08);
  triggerShake(0.42, 0.22);
  sfxHit();

  if (state.mode === "phase1") {
    state.mode = "phase2";
    startBloodmoonHunt(boss);
    return;
  }

  state.bossHp = Math.max(0, state.bossHp - 1);
  if (state.bossHp <= 0) {
    dissolveNpc(boss);
    settleRound(true, null, 760);
    return;
  }
  startBloodmoonHunt(boss);
}

function startBloodmoonHunt(boss) {
  const state = levelState.bloodmoon;
  if (!state) return;
  state.mode = "huntIntro";
  state.huntTimer = BLOODMOON_HUNT_SECONDS;
  state.cutsceneTimer = BLOODMOON_HUNT_INTRO_SECONDS;
  state.huntBriefingShown = false;
  state.clueTimer = 0;
  state.revealCount = 0;
  state.huntBoss = boss;

  if (boss) {
    boss.group.visible = false;
    boss.alive = false;
  }
  setBloodmoonClawIntensity(state.targetCue, 0);
  state.decoyCues?.forEach((cue) => setBloodmoonClawIntensity(cue, 0));
  hideBloodmoonSafeZones();
  ui.huntCard?.classList.remove("visible");
  showBloodmoonHuntIntro();
  triggerShake(0.5, 0.34);
}

function showBloodmoonHuntIntro() {
  if (!ui.huntIntro) return;
  ui.huntIntro.innerHTML = `
    <div class="hunt-intro-moon"></div>
    <div class="hunt-intro-title">猎杀时刻</div>
    <div class="hunt-intro-quote">“认不出自己的人，都会留在月光外。”</div>
  `;
  ui.huntIntro.classList.remove("visible");
  void ui.huntIntro.offsetWidth;
  ui.huntIntro.classList.add("visible");
  ui.hud.classList.remove("bloodmoon-lightning");
  void ui.hud.offsetWidth;
  ui.hud.classList.add("bloodmoon-lightning");
  window.setTimeout(() => ui.hud.classList.remove("bloodmoon-lightning"), 520);
}

function updateBloodmoonHuntIntro(dt) {
  const state = levelState.bloodmoon;
  if (!state || state.mode !== "huntIntro") return;
  state.cutsceneTimer = Math.max(0, state.cutsceneTimer - dt);
  if (state.cutsceneTimer > 0) return;
  state.mode = "huntBriefing";
  ui.huntIntro?.classList.remove("visible");
  showBloodmoonHuntCard();
}

function beginBloodmoonHuntCountdown() {
  const state = levelState.bloodmoon;
  if (!state || state.mode !== "huntBriefing") return;
  state.mode = "hunt";
  state.huntTimer = BLOODMOON_HUNT_SECONDS;
  state.huntBriefingShown = true;
  ui.huntCard?.classList.remove("visible");
  setPlayerWolfIdentity(false);

  state.safeZones = pickBloodmoonSafeZones();
  state.safeZoneVisuals.forEach((visual, index) => {
    const safePos = state.safeZones[index];
    if (!safePos) {
      visual.mesh.visible = false;
      visual.ring.visible = false;
      return;
    }
    visual.mesh.position.set(safePos.x, 0.105, safePos.z);
    visual.ring.position.set(safePos.x, 0.112, safePos.z);
    visual.mesh.visible = true;
    visual.ring.visible = true;
    visual.mesh.material.opacity = 0.34;
    visual.ring.material.opacity = 0.88;
  });

  randomizeActorPosition(player);
  playerInputVel.set(0, 0);
  resetActionIntervalLock();
  npcs.forEach((npc) => {
    if (!npc.alive && npc !== state.huntBoss) return;
    if (npc === state.huntBoss) return;
    randomizeActorPosition(npc);
    npc.attackTimer = 0;
    npc.attackCooldown = BLOODMOON_HUNT_SECONDS + 2;
  });
  triggerShake(0.5, 0.34);
}

function showBloodmoonHuntCard() {
  if (!ui.huntCard) return;
  ui.huntCard.innerHTML = `
    <div class="hunt-card-title">血月引路人</div>
    <div class="hunt-card-quote">“认不出自己的人，都会留在月光外。”</div>
    <div class="hunt-card-rule">机制 1：关闭这张卡片后，玩家和所有 NPC 会立刻随机散落到地图任意位置。</div>
    <div class="hunt-card-rule">机制 2：你的狼人耳朵、狼爪和披风会暂时消失，NPC 也会暂停攻击。</div>
    <div class="hunt-card-rule">机制 3：你有 20 秒找到自己，并进入任意一个绿色安全区域。</div>
    <div class="hunt-card-rule">处决：倒计时结束时，绿色区域外的所有生物都会被血月秒杀。</div>
    <button class="hunt-card-button" type="button" data-hunt-start>关闭卡片，开始倒计时</button>
  `;
  ui.huntCard.classList.remove("visible");
  void ui.huntCard.offsetWidth;
  ui.huntCard.classList.add("visible");
}

function pickBloodmoonSafeZones() {
  const zones = [];
  for (let i = 0; i < BLOODMOON_SAFE_ZONE_COUNT; i += 1) {
    let pos = null;
    for (let tries = 0; tries < 50; tries += 1) {
      const candidate = randomOpenPosition();
      const farEnough = zones.every((zone) => candidate.distanceTo(zone) > stateSafeZoneSpacing());
      if (farEnough) {
        pos = candidate;
        break;
      }
    }
    zones.push(pos ?? randomOpenPosition());
  }
  return zones;
}

function stateSafeZoneSpacing() {
  return levelState?.bloodmoon?.safeZoneRadius ? levelState.bloodmoon.safeZoneRadius * 2.35 : 5.5;
}

function randomizeActorPosition(actor) {
  const pos = randomOpenPosition();
  actor.group.position.set(pos.x, 0, pos.z);
  actor.velocity?.set?.(0, 0);
  actor.walking = false;
}

function updateBloodmoonHunt(dt) {
  const state = levelState.bloodmoon;
  if (!state || state.mode !== "hunt") return;
  state.huntTimer = Math.max(0, state.huntTimer - dt);
  state.cutsceneTimer = Math.max(0, (state.cutsceneTimer ?? 0) - dt);
  const pulse = 0.65 + Math.abs(Math.sin(totalTime * 5.5)) * 0.35;
  state.safeZoneVisuals?.forEach((visual, index) => {
    if (!visual.mesh.visible) return;
    visual.mesh.material.opacity = 0.22 + pulse * 0.18;
    visual.ring.material.opacity = 0.64 + pulse * 0.28;
    visual.ring.scale.setScalar(1 + Math.sin(totalTime * 6 + index) * 0.035);
  });
  if (state.huntTimer <= 0) resolveBloodmoonHunt();
}

function resolveBloodmoonHunt() {
  const state = levelState.bloodmoon;
  if (!state || state.mode !== "hunt" || gameStatus !== "playing") return;
  const radius = state.safeZoneRadius;
  const playerSafe = isInsideAnyBloodmoonSafeZone(player.group.position, radius);

  if (!playerSafe) {
    levelState.sanity = 0;
    hideBloodmoonSafeZones();
    setPlayerWolfIdentity(true);
    triggerShake(0.55, 0.35);
    sfxLose();
    settleRound(false, null, 700);
    return;
  }

  npcs.forEach((npc) => {
    if (!npc.alive) return;
    const inside = isInsideAnyBloodmoonSafeZone(npc.group.position, radius);
    if (!inside && !npc.isBloodmoonTarget) dissolveNpc(npc);
  });

  hideBloodmoonSafeZones();
  setPlayerWolfIdentity(true);
  compactDeadNpcs();
  respawnBloodmoonBoss();
  summonBloodmoonWave();
  restoreBloodmoonNpcAttacks();
  state.mode = "phase2";
  state.huntTimer = 0;
  triggerShake(0.36, 0.22);
}

function isInsideAnyBloodmoonSafeZone(position, radius = levelState.bloodmoon?.safeZoneRadius ?? 2.35) {
  return Boolean(levelState.bloodmoon?.safeZones?.some((safe) => (
    safe && Math.hypot(position.x - safe.x, position.z - safe.z) <= radius
  )));
}

function hideBloodmoonSafeZones() {
  const state = levelState.bloodmoon;
  state?.safeZoneVisuals?.forEach((visual) => {
    visual.mesh.visible = false;
    visual.ring.visible = false;
  });
}

function respawnBloodmoonBoss() {
  const state = levelState.bloodmoon;
  let boss = state.huntBoss;
  if (!boss) {
    boss = createNpc(state.nextNpcId++, { bloodmoonTarget: true });
    npcs.push(boss);
    scene.add(boss.group);
  }
  boss.alive = true;
  boss.group.visible = true;
  boss.group.position.copy(randomOpenPosition());
  boss.script = {
    state: "wander",
    timer: randomRange(2.0, 3.4),
    waypoint: randomOpenPosition(),
    cluePause: 0,
  };
  initBloodmoonNpc(boss);
  state.huntBoss = null;
}

function summonBloodmoonWave() {
  const state = levelState.bloodmoon;
  state.summonWave += 1;
  for (let i = 0; i < BLOODMOON_SUMMON_COUNT; i += 1) {
    const npc = createNpc(state.nextNpcId++, {});
    const pos = randomOpenPosition();
    npc.group.position.set(pos.x, 0, pos.z);
    npc.wanderTimer = randomRange(0.4, 1.7);
    npc.pauseTimer = randomRange(0.1, 0.8);
    initBloodmoonNpc(npc);
    npcs.push(npc);
    scene.add(npc.group);
  }

  const guard = createNpc(state.nextNpcId++, { wolfGuard: true });
  const pos = randomBloodmoonGuardSpawnPosition();
  guard.group.position.set(pos.x, 0, pos.z);
  guard.speed = BLOODMOON_GUARD_SPEED;
  guard.attackCooldown = 0.8;
  guard.hostility = 1.8;
  npcs.push(guard);
  scene.add(guard.group);
}

function randomBloodmoonGuardSpawnPosition() {
  const boss = npcs.find((npc) => npc.isBloodmoonTarget && npc.alive);
  let fallback = null;
  for (let tries = 0; tries < 60; tries += 1) {
    const pos = randomOpenPosition();
    fallback = fallback ?? pos;
    const farFromPlayer = !player || pos.distanceTo(player.group.position) >= 5.2;
    const farFromBoss = !boss || pos.distanceTo(boss.group.position) >= 3.4;
    if (farFromPlayer && farFromBoss) return pos;
  }
  return fallback ?? randomOpenPosition();
}

function restoreBloodmoonNpcAttacks() {
  npcs.forEach((npc) => {
    if (!npc.alive) return;
    npc.attackTimer = 0;
    npc.attackResolveTimer = 0;
    npc.alertTimer = randomRange(0.2, 0.9);
    npc.attackCooldown = npc.isWolfGuard ? 0.35 : randomRange(0.45, 1.15);
    npc.hostility = npc.isWolfGuard ? 2.2 : Math.max(npc.hostility ?? 1, 1.05);
  });
}

function setPlayerWolfIdentity(visible) {
  player?.group?.userData?.wolfParts?.forEach((part) => {
    part.visible = visible;
  });
}

function assignBloodmoonDecoyCues() {
  const state = levelState.bloodmoon;
  if (!state?.decoyCues?.length) return;
  const candidates = npcs.filter((npc) => npc.alive && !npc.isBloodmoonTarget);
  shuffleArray(candidates);

  state.decoyCues.forEach((cue, index) => {
    const npc = candidates[index];
    cue.userData.decoyNpc = npc ?? null;
    cue.userData.seed = Math.random() * 100;
    cue.userData.missingToe = Math.floor(Math.random() * 4);
    cue.userData.decoyCompleteness = randomRange(0.38, 0.72);
    if (!npc) setBloodmoonClawIntensity(cue, 0);
  });
}

function updateBloodmoonTarget(dt) {
  const target = npcs.find((npc) => npc.isBloodmoonTarget);
  if (!target || !target.alive || !target.script) return;
  const script = target.script;

  if (script.cluePause > 0) {
    script.cluePause -= dt;
    target.walking = false;
    faceNpcToward(target, new THREE.Vector3(7.2, 0, -10.8));
    return;
  }

  target.walking = true;
  const reached = moveNpcToward(target, script.waypoint, NPC_SPEED * 1.06, dt);
  script.timer -= dt;
  if (reached || script.timer <= 0) {
    script.timer = randomRange(2.2, 4.4);
    script.waypoint = randomOpenPosition();
  }
}

function updateBloodmoonNpcThreat(npc, dt) {
  if (!player || !npc.alive) return;
  const prevResolveTimer = npc.attackResolveTimer ?? 0;
  npc.attackCooldown = Math.max(0, (npc.attackCooldown ?? 0) - dt);
  npc.attackTimer = Math.max(0, (npc.attackTimer ?? 0) - dt);
  npc.attackResolveTimer = Math.max(0, (npc.attackResolveTimer ?? 0) - dt);
  npc.alertTimer = Math.max(0, (npc.alertTimer ?? 0) - dt);

  scratchToPlayer.set(
    player.group.position.x - npc.group.position.x,
    player.group.position.z - npc.group.position.z,
  );
  const distance = scratchToPlayer.length();
  if (prevResolveTimer > 0 && npc.attackResolveTimer <= 0) {
    resolveBloodmoonNpcHit(npc);
  }
  if (distance > BLOODMOON_NPC_HIT_RANGE || npc.attackCooldown > 0) return;

  getFacingVector(npc.group.rotation.y, scratchFacing);
  const pressure = levelState.hostility * npc.hostility;
  if (isFacingTarget(scratchFacing, scratchToPlayer) && npc.alertTimer <= 0 && Math.random() < dt * 1.8 * pressure) {
    npc.attackTimer = 0.26;
    npc.attackResolveTimer = 0.12;
    npc.attackCooldown = randomRange(1.0, 1.7) / pressure;
    faceNpcToward(npc, player.group.position);
  }

}

function updateWolfGuard(npc, dt) {
  if (!player || !npc.alive) return;
  scratchWaypoint.copy(player.group.position);
  const reached = moveNpcToward(npc, scratchWaypoint, npc.speed ?? BLOODMOON_GUARD_SPEED, dt);
  npc.walking = !reached;
  if (npc.group.position.distanceTo(player.group.position) < BLOODMOON_NPC_HIT_RANGE + 0.18) {
    npc.alertTimer = 0;
    npc.hostility = 2.2;
    npc.attackCooldown = Math.min(npc.attackCooldown ?? 0.6, 0.18);
    faceNpcToward(npc, player.group.position);
  }
}

function resolveBloodmoonNpcHit(npc) {
  if (levelState.level.id !== "bloodmoon" || levelState.playerInvuln > 0 || gameStatus !== "playing") return;
  scratchToPlayer.set(
    player.group.position.x - npc.group.position.x,
    player.group.position.z - npc.group.position.z,
  );
  if (scratchToPlayer.length() > BLOODMOON_NPC_HIT_RANGE) return;
  getFacingVector(npc.group.rotation.y, scratchFacing);
  if (!isFacingTarget(scratchFacing, scratchToPlayer)) return;

  levelState.sanity = Math.max(0, levelState.sanity - (npc.isWolfGuard ? BLOODMOON_GUARD_DAMAGE : BLOODMOON_NPC_HIT_DAMAGE));
  levelState.playerInvuln = 0.72;
  triggerShake(0.28, 0.2);
  sfxNpcHit();
  ui.hud.classList.add("bloodmoon-hit");
  window.setTimeout(() => ui.hud.classList.remove("bloodmoon-hit"), 180);
  updateHud();
  if (levelState.sanity <= 0) {
    settleRound(false, null, 620);
  }
}

function updateBloodmoonTargetCue() {
  const state = levelState.bloodmoon;
  const target = npcs.find((npc) => npc.isBloodmoonTarget && npc.alive);
  const intensity = state?.clueTimer > 0 ? THREE.MathUtils.clamp(state.clueTimer / BLOODMOON_CLUE_SECONDS, 0, 1) : 0;
  if (state?.targetCue && target) {
    const revealStage = Math.max(1, state.revealCount ?? 1);
    const completeness = revealStage === 1 ? 0.3 : revealStage === 2 ? 0.64 : 1;
    positionBloodmoonCue(state.targetCue, target);
    setBloodmoonClawIntensity(state.targetCue, intensity, 0.9 + Math.abs(Math.sin(totalTime * 15)) * 0.28, completeness);
  }

  state?.decoyCues?.forEach((cue) => {
    const npc = cue.userData.decoyNpc;
    if (!npc?.alive) {
      setBloodmoonClawIntensity(cue, 0);
      return;
    }
    positionBloodmoonCue(cue, npc);
    const flicker = 0.56 + Math.abs(Math.sin(totalTime * 20 + cue.userData.seed)) * 0.34;
    setBloodmoonClawIntensity(cue, intensity * 0.82, flicker, cue.userData.decoyCompleteness, totalTime);
  });
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
    if (levelState.level.id === "bloodmoon" && !isDuelActive()) {
      updateBloodmoonHuntIntro(dt);
      if (levelState.bloodmoon?.mode === "huntIntro" || levelState.bloodmoon?.mode === "huntBriefing") {
        updateHud();
        updateParticles(dt);
        if (levelState?.level?.id === "gaming") updateFlashlight(dt);
        updateShake(dt);
        renderer.render(scene, camera);
        return;
      }
      updateBloodmoonStorm(dt);
      levelState.playerInvuln = Math.max(0, levelState.playerInvuln - dt);
      updateBloodmoonHunt(dt);
    }
    if (!isDuelActive()) {
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
    updateProximityHint();
    updateHud();

    // 同步本地玩家位置到 Firebase
    if (isConnected()) {
      syncPosition(player.group.position.x, player.group.position.z, player.group.rotation.y);
    }
  } else if (gameStatus === "won") {
    animateCheer(dt);
  }

  // 更新对手角色动画
  if (remotePlayer) {
    updateRemotePlayerAnim(dt);
  }

  if (levelState?.level?.id === "gaming") updateFlashlight(dt);
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

  // 玩家移动方向加入 lerp 延迟，不立即响应
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
  if (levelState.level.id !== "bloodmoon" && punchResetTimer > 0) {
    punchResetTimer -= dt;
    if (punchResetTimer <= 0) punchTier = 0;
  }
  animateActor(player, dt, moving);
  animatePunchPose();
}

function animatePunchPose() {
  const userData = player.group.userData;
  const t = player.punchTimer > 0 ? Math.sin((player.punchTimer / (levelState.level.id === "bloodmoon" ? 0.26 : PUNCH_SWING)) * Math.PI) : 0;
  const wolfBoost = player.isWerewolf ? 1.3 : 1;
  userData.rightArm.rotation.x = -2.15 * t * wolfBoost;
  userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 1.05 * t * wolfBoost;
  userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + 0.42 * t;
  const fx = Math.sin(player.group.rotation.y);
  const fz = Math.cos(player.group.rotation.y);
  userData.visual.position.x = fx * 0.18 * t;
  userData.visual.position.z = fz * 0.18 * t;
  if (t <= 0) {
    userData.visual.position.x = 0;
    userData.visual.position.z = 0;
  }
  if (userData.wolfCape) {
    userData.wolfCape.material.opacity = 0.24 + Math.abs(Math.sin(totalTime * 8)) * 0.16 + t * 0.22;
    userData.wolfCape.rotation.z = Math.sin(totalTime * 5.2) * 0.08;
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

function updateRemotePlayerAnim(dt) {
  if (!remotePlayer || !remotePlayer.group.userData) return;
  const ud = remotePlayer.group.userData;

  if (remotePlayer.targetX != null) {
    const pos = remotePlayer.group.position;
    const dx = remotePlayer.targetX - pos.x;
    const dz = remotePlayer.targetZ - pos.z;
    const distSq = dx * dx + dz * dz;
    const stale = performance.now() - (remotePlayer.netTime ?? 0) > REMOTE_STALE_MS;
    const snap = stale || distSq > REMOTE_SNAP_DIST * REMOTE_SNAP_DIST;
    if (snap) {
      pos.x = remotePlayer.targetX;
      pos.z = remotePlayer.targetZ;
      remotePlayer.group.rotation.y = remotePlayer.targetRot;
    } else {
      const t = Math.min(1, dt * REMOTE_POS_LERP);
      pos.x += dx * t;
      pos.z += dz * t;
      remotePlayer.group.rotation.y = lerpAngle(
        remotePlayer.group.rotation.y,
        remotePlayer.targetRot,
        t,
      );
    }
  }

  // 检测对手是否在移动（对比上一帧位置）
  const pos = remotePlayer.group.position;
  const prevX = remotePlayer._prevX ?? pos.x;
  const prevZ = remotePlayer._prevZ ?? pos.z;
  const dx = pos.x - prevX;
  const dz = pos.z - prevZ;
  const moving = (dx * dx + dz * dz) > 0.0001;
  remotePlayer._prevX = pos.x;
  remotePlayer._prevZ = pos.z;

  // 走路动画
  remotePlayer.walkCycle = (remotePlayer.walkCycle ?? 0) + dt * (moving ? 8.5 : 2);
  const walk = moving ? Math.sin(remotePlayer.walkCycle) : 0;
  if (ud.visual) ud.visual.position.y = moving ? Math.abs(walk) * 0.06 : 0;
  if (ud.leftLeg) ud.leftLeg.rotation.x = walk * 0.55;
  if (ud.rightLeg) ud.rightLeg.rotation.x = -walk * 0.55;

  // 出拳动画
  if (remotePlayer.punchTimer > 0) {
    remotePlayer.punchTimer = Math.max(0, remotePlayer.punchTimer - dt);
    const t = Math.sin((remotePlayer.punchTimer / PUNCH_SWING) * Math.PI);
    if (ud.rightArm) {
      ud.rightArm.rotation.x = -2.15 * t;
      ud.rightArm.rotation.z = (ud.baseArmRotations?.rightZ ?? -0.38) - 1.05 * t;
    }
    if (ud.leftArm) {
      ud.leftArm.rotation.z = (ud.baseArmRotations?.leftZ ?? 0.38) + 0.42 * t;
    }
  } else if (ud.leftArm && ud.rightArm && ud.baseArmRotations) {
    ud.leftArm.rotation.x = -walk * 0.28;
    ud.rightArm.rotation.x = walk * 0.28;
    ud.leftArm.rotation.z = ud.baseArmRotations.leftZ + (moving ? -Math.abs(walk) * 0.08 : 0);
    ud.rightArm.rotation.z = ud.baseArmRotations.rightZ + (moving ? Math.abs(walk) * 0.08 : 0);
  }
}

function updateNpcs(dt) {
  if (levelState.level.id === "bloodmoon" && !isDuelLevel()) {
    const inHunt = levelState.bloodmoon?.mode === "hunt";
    if (!inHunt) updateBloodmoonTarget(dt);
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      if (!npc.isBloodmoonTarget) {
        if (npc.isWolfGuard && !inHunt) {
          updateWolfGuard(npc, dt);
        } else if (npc.isDecoy) {
          updateDecoy(npc, dt);
        } else {
          updateWander(npc, dt);
        }
      }
      if (!inHunt) updateBloodmoonNpcThreat(npc, dt);
      animateActor(npc, dt, npc.walking);
      animateNpcPunchPose(npc);
    });
    separateActors();
    updateBloodmoonTargetCue();
    compactDeadNpcs();
    return;
  }

  if (isDuelLevel()) {
    updateDuelGather();
    updateDuelHerdState();
    npcs.forEach((npc) => {
      if (!npc.alive) return;
      updateDuelNpcMovement(npc, dt);
      updateDuelNpcPunch(npc, dt);
      animateActor(npc, dt, npc.walking);
      animateNpcPunchPose(npc);
    });
    duelSeparateTick += 1;
    if (duelSeparateTick % 2 === 0) separateDuelActors();
    return;
  }

  if (levelState.level.id === "gaming") {
    updateGamingTarget(dt);
  } else if (levelState.level.id === "library") {
    updateLovers(dt);
  } else {
    updateTempleTarget(dt);
  }

  npcs.forEach((npc) => {
    if (!npc.alive) return;
    if (npc.isGamingTarget) {
      animateActor(npc, dt, npc.walking);
      return;
    }
    if (npc.isLover || npc.isSuShiTarget) return;
    if (npc.isDecoy) {
      updateDecoy(npc, dt);
    } else {
      updateWander(npc, dt);
    }
    animateActor(npc, dt, npc.walking);
  });

  separateActors();
  updateTempleShadows();
}

function updateGamingTarget(dt) {
  const target = npcs.find((npc) => npc.isGamingTarget);
  if (!target || !target.alive) return;
  const script = target.script;

  if (script.state === "play") {
    target.walking = false;
    script.timer -= dt;
    const computer = levelState.computers[script.computerIndex];
    faceNpcToward(target, new THREE.Vector3(computer.x, 0, computer.z > 0 ? computer.z - 1.1 : computer.z + 1.1));
    const playProgress = 1 - script.timer / (script.playDuration || script.timer || 1);
    setBlackEye(target, 0.62 + playProgress * 0.28);
    if (script.timer <= 0) {
      setBlackEye(target, 1);
      script.state = "leave";
      script.timer = randomRange(5, 7);
      script.waypoint = randomOpenPosition();
    }
    return;
  }

  if (script.state === "leave") {
    target.walking = true;
    const reached = moveNpcToward(target, script.waypoint, NPC_SPEED * 1.08, dt);
    script.timer -= dt;
    if (reached || script.timer <= 0) {
      const nextIndex = Math.floor(Math.random() * levelState.computers.length);
      script.computerIndex = nextIndex;
      script.waypoint = levelState.computers[nextIndex].clone();
      script.state = "seek";
    }
    return;
  }

  if (script.state === "seek") {
    target.walking = true;
    const reached = moveNpcToward(target, script.waypoint, NPC_SPEED * 1.12, dt);
    if (reached) {
      script.state = "play";
      script.timer = randomRange(2.2, 3.4);
      script.playDuration = script.timer;
      setBlackEye(target, 0.62);
    }
  }
}

function updateLovers(dt) {
  const pair = levelState.pair;
  if (!pair) return;
  const [a, b] = pair.members;
  if (!a.alive || !b.alive) return;

  if (pair.state === "kiss") {
    a.walking = false;
    b.walking = false;
    pair.timer -= dt;
    faceNpcToward(a, b.group.position);
    faceNpcToward(b, a.group.position);
    const intensity = Math.min(1, a.markIntensity + dt * 0.32);
    setLipstick(a, intensity);
    setLipstick(b, intensity);
    if (pair.timer <= 0) {
      pair.kissCount += 1;
      pair.state = "scatter";
      pair.timer = randomRange(3.4, 4.8);
      const angle = Math.random() * Math.PI * 2;
      pair.scatterPoints = [
        new THREE.Vector3(Math.cos(angle) * randomRange(3.2, 5.6), 0, Math.sin(angle) * randomRange(2.8, 5.4)),
        new THREE.Vector3(Math.cos(angle + Math.PI) * randomRange(3.2, 5.6), 0, Math.sin(angle + Math.PI) * randomRange(2.8, 5.4)),
      ];
    }
    animateActor(a, dt, false);
    animateActor(b, dt, false);
    return;
  }

  if (pair.state === "scatter") {
    a.walking = true;
    b.walking = true;
    const aDone = moveNpcToward(a, pair.scatterPoints[0], NPC_SPEED * 1.15, dt);
    const bDone = moveNpcToward(b, pair.scatterPoints[1], NPC_SPEED * 1.15, dt);
    pair.timer -= dt;
    if ((aDone && bDone) || pair.timer <= 0) {
      pair.meetingPoint = randomMeetingPoint();
      pair.state = "approach";
    }
    animateActor(a, dt, true);
    animateActor(b, dt, true);
    return;
  }

  if (pair.state === "approach") {
    const offset = new THREE.Vector3(0.32, 0, 0);
    a.walking = true;
    b.walking = true;
    const aDone = moveNpcToward(a, pair.meetingPoint.clone().sub(offset), NPC_SPEED * 1.05, dt);
    const bDone = moveNpcToward(b, pair.meetingPoint.clone().add(offset), NPC_SPEED * 1.05, dt);
    if (aDone && bDone) {
      pair.state = "kiss";
      pair.timer = randomRange(1.7, 2.6);
    }
    animateActor(a, dt, true);
    animateActor(b, dt, true);
  }
}

function updateTempleTarget(dt) {
  const target = npcs.find((npc) => npc.isSuShiTarget);
  if (!target || !target.alive || !target.script) return;
  const script = target.script;

  if (target.marked) pulseSuShiClues(target);

  if (script.state === "seekMoon") {
    target.walking = true;
    const reached = moveNpcToward(target, script.moonPoint, NPC_SPEED * 0.96, dt);
    if (reached) {
      script.state = "moonPause";
      script.timer = randomRange(1.6, 2.1);
      script.revealProgress = 0;
      script.exposed = false;
    }
    animateActor(target, dt, target.walking);
    return;
  }

  if (script.state === "moonPause") {
    target.walking = false;
    script.timer -= dt;
    faceNpcToward(target, new THREE.Vector3(7.1, 0, -10.4));

    if (script.timer <= TEMPLE_TRUE_REVEAL_AT || script.exposed) {
      script.exposed = true;
      script.revealProgress = Math.min(1, script.revealProgress + dt * 0.65);
      setSuShiClues(target, script.revealProgress);
    }

    if (script.timer <= 0) {
      script.state = "wander";
      script.timer = randomRange(2.4, 4.2);
      script.waypoint = randomOpenPositionOutsideTempleMoon(target.group.position);
      script.wanderRouteLeft = Math.random() < 0.5 ? 1 : 2;
      script.nextMoonDelay = randomRange(10, 15);
      script.revealProgress = 0;
      script.exposed = false;
      target.marked = false;
      target.markIntensity = 0;
      if (levelState?.temple?.shadowCue) {
        setShadowCueIntensity(levelState.temple.shadowCue, 0);
      }
    }
    animateActor(target, dt, false);
    return;
  }

  if (script.state === "wander") {
    target.walking = true;
    const reached = moveNpcToward(target, script.waypoint, NPC_SPEED * 1.02, dt);
    script.timer -= dt;
    script.nextMoonDelay = Math.max(0, script.nextMoonDelay - dt);
    if (reached || script.timer <= 0) {
      if (script.wanderRouteLeft > 0 || script.nextMoonDelay > 0) {
        if (reached) script.wanderRouteLeft = Math.max(0, script.wanderRouteLeft - 1);
        script.timer = randomRange(2.4, 4.2);
        script.waypoint = script.nextMoonDelay > 0
          ? randomOpenPositionOutsideTempleMoon(target.group.position)
          : randomOpenPosition();
      } else {
        script.state = "seekMoon";
        script.waypoint = script.moonPoint.clone();
      }
    }
    animateActor(target, dt, true);
  }
}

function randomMeetingPoint() {
  let point;
  let tries = 0;
  do {
    point = new THREE.Vector3(randomRange(-5.5, 5.5), 0, randomRange(-4.5, 5.8));
    tries += 1;
  } while (tries < 30 && collidesWithObstacle(point));
  return point;
}


function setSuShiClues(npc, intensity) {
  const clueIntensity = npc.isSuShiTarget ? Math.min(intensity, TEMPLE_TRUE_SHADOW_MAX) : intensity;
  npc.marked = true;
  npc.markIntensity = npc.isSuShiTarget ? clueIntensity : Math.max(npc.markIntensity, clueIntensity);
  const cue = levelState?.temple?.shadowCue;
  if (!cue) return;
  positionShadowCue(cue, npc);
  setShadowCueIntensity(cue, npc.markIntensity * getTempleMoonInfluence(npc.group.position));
}

function pulseSuShiClues(npc) {
  if (!npc.marked) return;
  const cue = levelState?.temple?.shadowCue;
  if (!cue) return;
  const pulse = 0.5 + Math.sin(totalTime * 3.2) * 0.5;
  positionShadowCue(cue, npc);
  const courtyardInfluence = getTempleMoonInfluence(npc.group.position);
  setShadowCueIntensity(cue, npc.markIntensity * courtyardInfluence, 0.78 + pulse * 0.12);
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
      if (levelState.pair?.members.includes(a) && levelState.pair?.members.includes(b) && levelState.pair.state === "kiss") continue;
      pushApart(a.group.position, b.group.position, 0.62, 0.018);
    }
    pushApart(a.group.position, player.group.position, 0.72, 0.012);
  }
}

function separateDuelActors() {
  buildSpatialGrid();

  for (let i = 0; i < npcs.length; i += 1) {
    const a = npcs[i];
    if (!a.alive) continue;
    const nearby = getNearbyNpcs(a.group.position);
    for (let j = 0; j < nearby.length; j += 1) {
      const b = nearby[j];
      if (b === a || !b.alive) continue;
      pushApart(a.group.position, b.group.position, 0.62, 0.018);
    }
    pushApart(a.group.position, player.group.position, 0.72, 0.012);
    if (remotePlayer?.group) {
      pushApart(a.group.position, remotePlayer.group.position, 0.72, 0.012);
    }
  }
  if (remotePlayer?.group) {
    pushApart(player.group.position, remotePlayer.group.position, 0.72, 0.012);
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
  if (!consumeActionInterval()) return;
  const isBloodmoon = levelState.level.id === "bloodmoon" && !isDuelActive();
  if (isBloodmoon && ["huntIntro", "huntBriefing", "hunt"].includes(levelState.bloodmoon?.mode)) return;
  punchCooldownMax = isBloodmoon
    ? BLOODMOON_WOLF_COOLDOWN
    : PUNCH_COOLDOWNS[Math.min(punchTier, PUNCH_COOLDOWNS.length - 1)];
  punchCooldown = punchCooldownMax;
  if (!isBloodmoon) {
    punchTier += 1;
    punchResetTimer = PUNCH_RESET_DELAY;
  }
  player.punchTimer = isBloodmoon ? 0.26 : PUNCH_SWING;
  if (isDuelActive()) {
    sfxPunchHeavy();
    spawnPunchSwish(player);
    ui.attackButton.classList.add("punching");
    window.setTimeout(() => ui.attackButton.classList.remove("punching"), 180);
  } else if (isBloodmoon) {
    sfxWolfPunch();
  } else {
    sfxPunch();
  }

  if (isDuelActive()) {
    const punchTarget = findDuelPunchTarget();
    let remoteHit = false;
    let npcHit = false;

    if (punchTarget?.type === "remote") {
      remoteHit = !isConnected() ? damageRemotePlayer() : true;
    } else if (punchTarget?.type === "npc") {
      npcHit = damageDuelNpc(punchTarget.actor);
    }

    if (isConnected()) {
      syncPunch(
        player.group.position.x,
        player.group.position.z,
        player.group.rotation.y,
        {
          roundId: duelRoundId,
          punchId: nextLocalEventId("punch"),
        },
      );
    }

    if (remoteHit || npcHit) {
      triggerHitstop(npcHit ? 0.08 : 0.06);
      triggerShake(npcHit ? 0.28 : 0.22, npcHit ? 0.16 : 0.14);
      sfxHit();
    }
    return;
  }

  // 同步出拳事件给对手
  if (isConnected()) {
    syncPunch(player.group.position.x, player.group.position.z, player.group.rotation.y);
  }

  const hit = findHitTarget();
  if (!hit) return;

  if (hit.correct) {
    if (isBloodmoon && hit.npc?.isBloodmoonTarget) {
      handleBloodmoonBossHit(hit.npc);
      return;
    }
    if (hit.npcs) {
      hit.npcs.forEach((npc) => dissolveNpc(npc));
    } else {
      dissolveNpc(hit.npc);
    }
    triggerHitstop(0.08);
    triggerShake(0.35, 0.2);
    sfxHit();
    if (isConnected()) {
      syncWin({
        time: Math.round(totalTime - levelState.startTime),
        roundId: duelRoundId,
        winId: nextLocalEventId("win"),
      });
    }
    settleRound(true, null, 760);
    return;
  }

  if (isBloodmoon) {
    dissolveNpc(hit.npc);
    compactDeadNpcs();
    triggerHitstop(0.06);
    triggerShake(0.14, 0.1);
    sfxMiss();
    if (levelState.bloodmoon) {
      levelState.bloodmoon.revealCount = Math.max(0, (levelState.bloodmoon.revealCount ?? 0) - 1);
    }
    levelState.hostility = Math.min(2.35, levelState.hostility + 0.12);
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

  if (levelState.level.id === "library" && levelState.pair) {
    const [a, b] = levelState.pair.members;
    if (a.alive && b.alive) {
      // 检测任一情侣在范围内即判定命中（强制双人判定）
      const toA = new THREE.Vector2(a.group.position.x - playerPos.x, a.group.position.z - playerPos.z);
      const toB = new THREE.Vector2(b.group.position.x - playerPos.x, b.group.position.z - playerPos.z);
      const distA = toA.length();
      const distB = toB.length();
      const aInRange = distA <= HIT_PAIR_RANGE && isFacingTarget(facing, toA);
      const bInRange = distB <= HIT_PAIR_RANGE && isFacingTarget(facing, toB);
      if (aInRange || bInRange) {
        return { correct: true, npcs: [a, b] };
      }
    }
  }

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
    correct: best.isGamingTarget || best.isLover || best.isSuShiTarget || best.isBloodmoonTarget,
  };
}

function isFacingTarget(facing, toTarget) {
  if (toTarget.lengthSq() < 0.08) return true;
  toTarget.normalize();
  return facing.dot(toTarget) >= HIT_FACING_DOT;
}


function compactDeadNpcs() {
  const huntBoss = levelState.bloodmoon?.huntBoss;
  for (let i = npcs.length - 1; i >= 0; i -= 1) {
    const npc = npcs[i];
    if (npc.alive || npc === huntBoss) continue;
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
  if (actor.isSuShiTarget && levelState?.temple?.shadowCue) {
    setShadowCueIntensity(levelState.temple.shadowCue, 0);
  }
  if (actor.isBloodmoonTarget && levelState?.bloodmoon?.targetCue) {
    setBloodmoonClawIntensity(levelState.bloodmoon.targetCue, 0);
  }
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

  const duel = isDuelLevel(levelState.level);
  const isBloodmoon = !duel && levelState.level.id === "bloodmoon";
  const timeUsed = Math.round(totalTime - levelState.startTime);
  const attemptsLeft = duel ? player.hp : isBloodmoon ? Math.ceil(levelState.sanity) : levelState.attempts;
  const rating = duel
    ? { grade: won ? "S" : "F", rating: won ? 100 : 0 }
    : calcRating(won, timeUsed, attemptsLeft);

  ui.resultTitle.textContent = duel
    ? (won ? "决斗胜利" : "决斗失败")
    : (won ? "任务成功" : "任务失败");
  ui.resultCopy.textContent = won
    ? levelState.level.success
    : (failMessage || levelState.level.failure);
  ui.resultRating.textContent = rating.grade;
  ui.resultRating.className = "result-rating rating-" + rating.grade.toLowerCase();
  ui.statTime.textContent = timeUsed + " 秒";
  if (ui.statAttemptsLabel) {
    ui.statAttemptsLabel.textContent = duel ? "❤️ 剩余生命" : isBloodmoon ? "理智" : "🥊 剩余出拳";
  }
  ui.statAttempts.textContent = duel
    ? (won ? "对手生命归零" : formatHearts(attemptsLeft))
    : isBloodmoon ? `${attemptsLeft} 点` : `${attemptsLeft} 次`;
  ui.statAttempts.classList.toggle("hearts-display", duel);

  const guestWaitingForRetry = duel && isConnected() && !getIsHost();
  ui.retryButton.disabled = guestWaitingForRetry;
  ui.retryButton.textContent = guestWaitingForRetry ? "等待房主再来" : "再来一局";

  ui.resultModal.classList.add("visible");
  ui.taskModal.classList.remove("visible");
  ui.huntIntro?.classList.remove("visible");
  ui.huntCard?.classList.remove("visible");

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
  const duel = isDuelLevel();
  const isBloodmoon = !duel && levelState.level.id === "bloodmoon";
  const isTemple = !duel && levelState.level.id === "temple";
  const bloodmoonState = levelState.bloodmoon;
  const duelPlaying = duel && (gameStatus === "playing" || gameStatus === "paused");
  if (ui.hud) ui.hud.classList.toggle("is-duel-play", duelPlaying);

  ui.sceneName.textContent = levelState.level.sceneName;
  if (duel) {
    ui.missionText.textContent = levelState.level.hudMission || levelState.level.mission;
  } else if (isBloodmoon && bloodmoonState?.mode === "huntIntro") {
    ui.missionText.textContent = "血月引路人正在发动猎杀时刻...";
  } else if (isBloodmoon && bloodmoonState?.mode === "huntBriefing") {
    ui.missionText.textContent = "阅读猎杀时刻机制，点击卡片按钮后开始倒计时。";
  } else if (isBloodmoon && bloodmoonState?.mode === "hunt") {
    ui.missionText.textContent = `猎杀时刻：${Math.ceil(bloodmoonState.huntTimer)} 秒内找到自己，进入任意绿色区域`;
  } else if (isBloodmoon && bloodmoonState?.mode === "phase2") {
    ui.missionText.textContent = `二阶段：boss 剩余 ${bloodmoonState.bossHp}/${BLOODMOON_PHASE2_HP_MAX} 格血`;
  } else {
    ui.missionText.textContent = levelState.level.hudMission || levelState.level.mission;
  }

  ui.timerText.textContent = duel || isBloodmoon ? "∞" : Math.ceil(levelState.remaining).toString();
  ui.attemptLabel.textContent = duel ? "生命" : isBloodmoon ? "理智" : "出拳";
  if (duel) {
    ui.attemptText.textContent = formatHearts(player.hp ?? levelState.playerHp);
    ui.attemptText.classList.add("hearts-display");
  } else if (isBloodmoon) {
    ui.attemptText.textContent = Math.ceil(levelState.sanity).toString();
    ui.attemptText.classList.remove("hearts-display");
  } else {
    ui.attemptText.textContent = levelState.attempts.toString();
    ui.attemptText.classList.remove("hearts-display");
  }

  if (duel) {
    ui.clueBar.textContent = (() => {
      const gatherHint = getDuelGatherHudHint();
      const base = `生命 ${formatHearts(player.hp)} · 对手 ${formatHearts(remotePlayer?.hp ?? DUEL_PLAYER_HP)}`;
      return gatherHint ? `${gatherHint} · ${base}` : `⚔️ ${base} · 每 1.5 分钟需到集合圈报到`;
    })();
  } else if (isBloodmoon && (bloodmoonState?.mode === "hunt" || bloodmoonState?.mode === "huntBriefing")) {
    ui.clueBar.textContent = "🟢 机制：玩家和 NPC 已随机散开，NPC 暂停攻击。绿区外会被血月秒杀。";
  } else {
    ui.clueBar.textContent = "🔍 " + (levelState.level.hudClue || levelState.level.clue);
  }
  ui.clueBar?.classList.toggle("hidden", isTemple);

  if (ui.attackIcon) ui.attackIcon.textContent = isBloodmoon ? "爪" : "拳";
  ui.hud?.classList.toggle("bloodmoon-mode", isBloodmoon);
  ui.attackButton?.classList.toggle("bloodmoon", isBloodmoon);
  ui.sceneName?.classList.toggle("bloodmoon-text", isBloodmoon);
  ui.clueBar?.classList.toggle("bloodmoon", isBloodmoon);
  ui.attemptChip?.classList.toggle("bloodmoon", isBloodmoon);
  if (ui.mechanicHint) {
    ui.mechanicHint.classList.toggle(
      "visible",
      isTemple || (isBloodmoon && (bloodmoonState?.mode === "hunt" || bloodmoonState?.mode === "huntBriefing")),
    );
    ui.mechanicHint.innerHTML = isTemple
      ? `
      <div class="mechanic-hint-row"><span class="mechanic-hint-label">任务</span><span class="mechanic-hint-text">找出真正吵醒怀民的苏轼。</span></div>
      <div class="mechanic-hint-row"><span class="mechanic-hint-label">机制</span><span class="mechanic-hint-text">苏轼只在月光中庭显影，假影也会短暂干扰。</span></div>
      <div class="mechanic-hint-row"><span class="mechanic-hint-label">特征</span>${renderSuShiShadowMarkHtml()}<span class="mechanic-hint-text">真苏轼脚下是这组交错竹柏影。</span></div>
    `
      : isBloodmoon && (bloodmoonState?.mode === "hunt" || bloodmoonState?.mode === "huntBriefing")
        ? `
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">台词</span><span class="mechanic-hint-text">认不出自己的人，都会留在月光外。</span></div>
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">机制</span><span class="mechanic-hint-text">找到自己，进入任意绿色区域。</span></div>
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">处决</span><span class="mechanic-hint-text">倒计时结束时，绿区外全部秒杀。</span></div>
      `
        : "";
  }

  updateGatherBanner();

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
  const r = duelRng && isDuelLevel() ? duelRng() : Math.random();
  return min + r * (max - min);
}
