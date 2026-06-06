import * as THREE from "three";
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

const DEFAULT_NPC_COUNT = 20;
const MIN_NPC_COUNT = 10;
const MAX_NPC_COUNT = 100;
const NPC_COUNT_STORAGE_KEY = "nightAction_npcCount";
const HOST_ROOM_KEY = "nightAction_hostRoom";
const WORLD_LIMIT = 10.8;
const HIT_RANGE = 1.85;
const HIT_PAIR_RANGE = 2.15;
const HIT_FACING_DOT = 0.12;
const PLAYER_SPEED = 3;
const NPC_SPEED = 3;
const ROUND_SECONDS = 90;
const ATTEMPTS = 3;
const DUEL_NPC_COUNT = 40;
const DUEL_HP = 3;
const PUNCH_SWING = 0.32;
const NPC_PUNCH_MIN = 5;
const NPC_PUNCH_MAX = 10;
const NPC_PUNCH_RANGE = 1.65;
const NPC_PUNCH_SWING = 0.42;
const HIT_INVULN = 0.55;
const PLAYER_LERP = 0.88; // 玩家移动响应插值（1=即时，越小越延迟）
const REMOTE_POS_LERP = 14; // 对手位置插值速度（越大越跟手）
const REMOTE_SNAP_DIST = 2.2; // 偏差过大时直接瞬移，避免长时间拉扯
const REMOTE_STALE_MS = 350; // 超过此时间未收到更新则允许瞬移对齐
const DUEL_SPAWN_MIN_DIST = 4.2;
const DUEL_HERD_INTERVAL = 15;
const DUEL_HERD_DURATION = 2.8;
const ACTOR_COLLISION_RADIUS = 0.38;

const LEVELS = [
  {
    id: "gaming",
    sceneName: "凌晨三点",
    emoji: "🌙",
    cardDesc: "在人群中找到凌晨三点还在打游戏的人",
    mission: "有人凌晨三点还在打游戏，吵得全宿舍睡不着！",
    clue: "目标特征：有明显黑眼圈",
    targetDesc: "打游戏的人",
    difficulty: 2,
    success: "精准命中，宿舍终于安静了。",
    failure: "这个人游戏打爽了，大家都被吵醒了",
    lighting: "night",
  },
  {
    id: "library",
    sceneName: "图书馆",
    emoji: "📚",
    cardDesc: "在人群中找到图书馆里亲嘴的情侣",
    mission: "图书馆里有一对情侣在亲嘴，太辣眼睛了！",
    clue: "目标特征：两个人贴在一起，嘴上有口红印",
    targetDesc: "亲嘴的情侣",
    difficulty: 3,
    success: "精准命中，图书馆恢复了该有的安静。",
    failure: "这对情侣亲爽了",
    lighting: "library",
  },
  {
    id: "library_duel",
    mapId: "library",
    sceneName: "图书馆决斗",
    emoji: "⚔️",
    cardDesc: "在出拳人群中击败对手",
    mission: "图书馆里挤满了出拳的读者，击败你的对手！",
    hudMission: "击败对手，同时躲避 NPC 的拳头",
    clue: "NPC 每 5–10 秒随机挥拳一次，靠近会很危险；所有人都有 3 滴血",
    hudClue: "NPC 随机挥拳 · 所有人 3 滴血 · 击败对手获胜",
    targetDesc: "对手",
    difficulty: 3,
    success: "你击败了对手，图书馆归于“平静”。",
    failure: "你被击败了",
    lighting: "library",
    duelMode: true,
  },
  {
    id: "temple",
    sceneName: "承天寺夜游",
    emoji: "🌕",
    cardDesc: "在苏轼影分身里找出真正吵醒怀民的苏轼",
    mission: "苏轼夜半叫醒张怀民，又把中庭所有人都变成苏轼的样子。先找到自己，再找出真正的苏轼。",
    hudMission: "观察月下显形线索，找出真正的苏轼。",
    clue: "目标特征：会在月色最亮的中庭停留，随后衣襟泛月白光，身上有竹柏影纹，手里拿着诗卷",
    hudClue: "目标特征：会在月光中庭停留，随后显现月白衣襟、竹柏影纹和诗卷",
    targetDesc: "真正的苏轼",
    difficulty: 3,
    success: "精准命中，怀民终于能回去睡觉了。",
    failure: "苏轼月下散步爽了，怀民彻底睡不着了",
    lighting: "night",
  },
];

const canvas = document.querySelector("#gameCanvas");
const ui = {
  sceneName: document.querySelector("#sceneName"),
  missionText: document.querySelector("#missionText"),
  timerText: document.querySelector("#timerText"),
  attemptText: document.querySelector("#attemptText"),
  clueBar: document.querySelector("#clueBar"),
  levelSelectModal: document.querySelector("#levelSelectModal"),
  levelSelectPanel: document.querySelector("#levelSelectPanel"),
  levelCards: document.querySelector("#levelCards"),
  taskModal: document.querySelector("#taskModal"),
  taskEmoji: document.querySelector("#taskEmoji"),
  taskTitle: document.querySelector("#taskTitle"),
  taskCopy: document.querySelector("#taskCopy"),
  taskClue: document.querySelector("#taskClue"),
  taskTime: document.querySelector("#taskTime"),
  taskAttempts: document.querySelector("#taskAttempts"),
  taskNpcCount: document.querySelector("#taskNpcCount"),
  npcCountInput: document.querySelector("#npcCountInput"),
  targetPreviewCanvas: document.querySelector("#targetPreviewCanvas"),
  targetLabel: document.querySelector("#targetLabel"),
  startButton: document.querySelector("#startButton"),
  taskMpHint: document.querySelector("#taskMpHint"),
  resultModal: document.querySelector("#resultModal"),
  resultRating: document.querySelector("#resultRating"),
  resultTitle: document.querySelector("#resultTitle"),
  resultCopy: document.querySelector("#resultCopy"),
  statTime: document.querySelector("#statTime"),
  statAttempts: document.querySelector("#statAttempts"),
  statAttemptsLabel: document.querySelector("#statAttemptsLabel"),
  damageFlash: document.querySelector("#damageFlash"),
  retryButton: document.querySelector("#retryButton"),
  backToSelectButton: document.querySelector("#backToSelectButton"),
  pauseButton: document.querySelector("#pauseButton"),
  pauseModal: document.querySelector("#pauseModal"),
  resumeButton: document.querySelector("#resumeButton"),
  backFromPauseButton: document.querySelector("#backFromPauseButton"),
  backFromTaskButton: document.querySelector("#backFromTaskButton"),
  mpCreateBtn: document.querySelector("#mpCreateBtn"),
  mpShareBox: document.querySelector("#mpShareBox"),
  mpStatusText: document.querySelector("#mpStatusText"),
  mpLinkInput: document.querySelector("#mpLinkInput"),
  mpCopyBtn: document.querySelector("#mpCopyBtn"),
  gameLogo: document.querySelector("#gameLogo"),
  duelLobbyPanel: document.querySelector("#duelLobbyPanel"),
  duelLobbyHint: document.querySelector("#duelLobbyHint"),
  duelGuestWaiting: document.querySelector("#duelGuestWaiting"),
  duelGuestStatus: document.querySelector("#duelGuestStatus"),
  duelBackBtn: document.querySelector("#duelBackBtn"),
  soloModeStack: document.querySelector("#soloModeStack"),
  attemptLabel: document.querySelector("#attemptLabel"),
  joystick: document.querySelector("#joystick"),
  joystickKnob: document.querySelector("#joystickKnob"),
  attackButton: document.querySelector("#attackButton"),
  cooldownOverlay: document.querySelector("#cooldownOverlay"),
};

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
const duelHerdTarget = new THREE.Vector3();
let duelHerdActive = false;
let gameMode = "solo";
let matchNpcCount = DEFAULT_NPC_COUNT;
let currentLevelIndex = 0;
let levelState;
let npcs = [];
let particles = [];
let gameStatus = "briefing";
let punchCooldown = 0;
let punchCooldownMax = 0; // 当前冷却的最大值（用于计算进度）
let punchTier = 0; // 0=第1拳(1s), 1+=后续(2s)
let punchResetTimer = 0; // 停止出拳后重置计时
const PUNCH_COOLDOWNS = [2.0, 4.0, 6.0]; // 第1拳2秒，第2拳4秒，第3拳6秒
const PUNCH_RESET_DELAY = 2.0; // 停止出拳多久后重置回第1档
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

  const bg = level.lighting === "night" ? 0x0c1424 : 0xd0dce8;
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
  } else {
    const npc = createLowPolyPerson(LOW_POLY_TEMPLE_PALETTE, { temple: true });
    npc.group.rotation.y = -0.35;
    setSuShiClues(npc, 1);
    previewScene.add(npc.group);
  }

  previewRenderer.render(previewScene, previewCamera);
}

/* ---- 最佳成绩 (localStorage) ---- */
function getBestScore(levelId) {
  try {
    const data = JSON.parse(localStorage.getItem("nightAction_best") || "{}");
    return data[levelId] || null;
  } catch { return null; }
}

function saveBestScore(levelId, score) {
  try {
    const data = JSON.parse(localStorage.getItem("nightAction_best") || "{}");
    const prev = data[levelId];
    // 评价更好，或评价相同但用时更短
    if (!prev || score.rating < prev.rating || (score.rating === prev.rating && score.time < prev.time)) {
      data[levelId] = score;
      localStorage.setItem("nightAction_best", JSON.stringify(data));
    }
  } catch { /* ignore */ }
}

function calcRating(won, timeUsed, attemptsLeft) {
  if (!won) return { grade: "C", rating: 4 };
  if (timeUsed <= 30 && attemptsLeft >= 3) return { grade: "S", rating: 1 };
  if (timeUsed <= 50 && attemptsLeft >= 2) return { grade: "A", rating: 2 };
  if (timeUsed <= 70) return { grade: "B", rating: 3 };
  return { grade: "C", rating: 4 };
}

function clampNpcCount(value) {
  return THREE.MathUtils.clamp(Math.round(value), MIN_NPC_COUNT, MAX_NPC_COUNT);
}

function loadMatchNpcCount() {
  try {
    const saved = Number(localStorage.getItem(NPC_COUNT_STORAGE_KEY));
    if (Number.isFinite(saved)) return clampNpcCount(saved);
  } catch { /* ignore */ }
  return DEFAULT_NPC_COUNT;
}

function saveMatchNpcCount() {
  try {
    localStorage.setItem(NPC_COUNT_STORAGE_KEY, String(matchNpcCount));
  } catch { /* ignore */ }
}

function getMatchNpcCount() {
  return matchNpcCount;
}

function syncNpcCountInput() {
  ui.npcCountInput.value = String(matchNpcCount);
}

function parseNpcCountRaw(raw) {
  const text = String(raw).trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
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
  saveMatchNpcCount();
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

/* ---- 关卡选择 ---- */
function getDuelLevelIndex() {
  return LEVELS.findIndex((level) => level.duelMode);
}

function isDuelLevel(level = levelState?.level) {
  return Boolean(level?.duelMode);
}

function isDuelActive() {
  if (!isDuelLevel()) return false;
  if (!isConnected()) return true;
  return ["briefing", "playing", "paused", "settling"].includes(gameStatus);
}

function formatHearts(hp, max = DUEL_HP) {
  const n = Math.max(0, Math.min(max, Math.ceil(hp ?? 0)));
  return "❤️".repeat(n) + "🖤".repeat(max - n);
}

function isDuelRematchContext() {
  return isDuelLevel(LEVELS[currentLevelIndex]) || (levelState && isDuelLevel(levelState.level));
}

function createSeededRng(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
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

function validatePvpHit(punchData, targetActor) {
  if (!targetActor?.group || targetActor.hp <= 0) return false;
  const playerPos = targetActor.group.position;
  const toTarget = new THREE.Vector2(
    playerPos.x - punchData.x,
    playerPos.z - punchData.z,
  );
  const facing = getFacingVector(punchData.rotation ?? 0);
  return toTarget.length() <= HIT_RANGE && isFacingTarget(facing, toTarget);
}

function collectDuelSnapshot() {
  if (!isDuelLevel() || !levelState) return null;
  return {
    worldSeed: levelState.worldSeed,
    elapsed: Math.max(0, totalTime - (levelState.startTime || 0)),
    hostHp: getIsHost() ? player.hp : remotePlayer?.hp,
    guestHp: getIsHost() ? remotePlayer?.hp : player.hp,
    duelNpcs: npcs.map((n) => ({
      x: n.group.position.x,
      z: n.group.position.z,
      hp: n.hp ?? DUEL_HP,
      alive: n.alive,
      punchDelay: n.punchDelay ?? NPC_PUNCH_MIN,
      punchTimer: n.punchTimer ?? 0,
    })),
  };
}

function buildGameStatePayload(extra = {}) {
  const payload = {
    revision: stateRevision,
    mode: gameMode,
    phase: gameStatus === "levelSelect"
      ? "lobby"
      : gameStatus === "paused"
        ? "paused"
        : gameStatus === "playing"
          ? "playing"
          : "briefing",
    levelIndex: gameStatus === "levelSelect" ? null : currentLevelIndex,
    npcCount: isDuelActive() ? DUEL_NPC_COUNT : matchNpcCount,
    roundId: duelRoundId,
    started: gameStatus === "playing",
    ...extra,
  };
  if (levelState?.duelSpawns) {
    payload.duelSpawns = levelState.duelSpawns;
  }
  if (extra.includeSnapshot) {
    const snap = collectDuelSnapshot();
    if (snap) {
      payload.worldSeed = snap.worldSeed;
      payload.duelNpcs = snap.duelNpcs;
      payload.elapsed = snap.elapsed;
      payload.hostHp = snap.hostHp;
      payload.guestHp = snap.guestHp;
    }
  }
  return payload;
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
  if (!isInDuelLobby()) buildLevelCards();
  updateDuelLobbyUI();
  updateMpUI();
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

  if (options.respawnNpcs) {
    npcs.forEach((n) => scene.remove(n.group));
    npcs = [];
    spawnDuelNpcsFromSnapshot(snapshot);
  } else {
    snapshot.duelNpcs.forEach((data, i) => {
      const npc = npcs[i];
      if (!npc) return;
      npc.group.position.set(data.x, 0, data.z);
      npc.hp = data.hp ?? DUEL_HP;
      npc.alive = data.alive !== false;
      npc.punchDelay = data.punchDelay ?? NPC_PUNCH_MIN;
      npc.punchTimer = data.punchTimer ?? 0;
      npc.group.visible = npc.alive;
    });
  }

  if (snapshot.elapsed != null && levelState.startTime != null) {
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
      playerHp: state.guestHp ?? DUEL_HP,
      skipBriefing: false,
    });
    updateMpUI();
    updateTaskMpUI();
    return;
  }

  if (state.npcCount != null && state.mode !== "duel") {
    matchNpcCount = clampNpcCount(state.npcCount);
    syncNpcCountInput();
    saveMatchNpcCount();
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
  } else if (midGameReconnect && state.duelNpcs) {
    applyDuelSnapshot(state, { respawnNpcs: false });
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
      if (isDuelActive() && (data.attempt || data.hit)) {
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
        pushGameState({ includeSnapshot: gameStatus === "playing" });
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
      clearRoomFromUrl();
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

const scratchVec2 = new THREE.Vector2();
const scratchVec3 = new THREE.Vector3();
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

/* ---- 纹理缓存 ---- */
const textureCache = { floor: {}, wall: {} };

/* ---- 音效系统 (Web Audio API) ---- */
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playTone(freq, duration, type, volume, detune) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (detune) osc.detune.setValueAtTime(detune, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume || 0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, volume) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume || 0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
  src.stop(audioCtx.currentTime + duration);
}

function sfxPunch() {
  ensureAudio();
  playNoise(0.07, 0.22);
  playTone(150, 0.1, "sawtooth", 0.28);
  playTone(80, 0.14, "sine", 0.16, -180);
}

function sfxPunchHeavy() {
  ensureAudio();
  playNoise(0.11, 0.38);
  playTone(110, 0.16, "square", 0.34);
  playTone(55, 0.22, "sawtooth", 0.22);
  setTimeout(() => playTone(200, 0.08, "sine", 0.12), 40);
}

function sfxHurt() {
  ensureAudio();
  playTone(180, 0.18, "sawtooth", 0.28);
  playNoise(0.14, 0.28);
  setTimeout(() => playTone(90, 0.2, "sine", 0.2), 70);
}

function sfxHit() {
  ensureAudio();
  playTone(260, 0.15, "square", 0.25);
  playTone(520, 0.12, "sine", 0.18);
  playNoise(0.12, 0.2);
  setTimeout(() => playTone(380, 0.1, "sine", 0.15), 60);
}

function sfxMiss() {
  ensureAudio();
  playTone(120, 0.22, "sawtooth", 0.15);
  playTone(80, 0.3, "sine", 0.1);
}

function sfxWin() {
  ensureAudio();
  [0, 100, 200, 350].forEach((delay, i) => {
    setTimeout(() => playTone([523, 659, 784, 1047][i], 0.25, "sine", 0.2), delay);
  });
}

function sfxLose() {
  ensureAudio();
  [0, 150, 300].forEach((delay, i) => {
    setTimeout(() => playTone([330, 262, 196][i], 0.35, "sine", 0.18), delay);
  });
}

/* ---- 打击反馈：hitstop + 屏幕震动 ---- */
let hitstopTimer = 0;
let shakeTimer = 0;
let shakeIntensity = 0;
let damageFlashTimer = 0;
const cameraBasePos = new THREE.Vector3(0, 19.5, 17.2);

function triggerHitstop(duration) {
  hitstopTimer = Math.max(hitstopTimer, duration);
}

function triggerShake(intensity, duration) {
  shakeIntensity = intensity;
  shakeTimer = duration;
}

function triggerDamageFx() {
  damageFlashTimer = 0.38;
  if (ui.damageFlash) {
    ui.damageFlash.classList.remove("active");
    void ui.damageFlash.offsetWidth;
    ui.damageFlash.classList.add("active");
  }
  if (player?.group?.userData?.visual) {
    player.group.userData.damageFlash = 0.32;
  }
}

boot();

function boot() {
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
    if (isDuelActive()) syncHp(player.hp);
    pushGameState({
      phase: "playing",
      started: true,
      roundId: duelRoundId,
      duelSpawns: levelState.duelSpawns,
    });
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
    if (event.code === "KeyW" || event.code === "ArrowUp") input.keys.y = 1;
    if (event.code === "KeyS" || event.code === "ArrowDown") input.keys.y = -1;
    if (event.code === "KeyA" || event.code === "ArrowLeft") input.keys.x = -1;
    if (event.code === "KeyD" || event.code === "ArrowRight") input.keys.x = 1;
    if (event.code === "Space" || event.code === "KeyJ") triggerAttack();
  });

  window.addEventListener("keyup", (event) => {
    if ((event.code === "KeyW" || event.code === "ArrowUp") && input.keys.y > 0) input.keys.y = 0;
    if ((event.code === "KeyS" || event.code === "ArrowDown") && input.keys.y < 0) input.keys.y = 0;
    if ((event.code === "KeyA" || event.code === "ArrowLeft") && input.keys.x < 0) input.keys.x = 0;
    if ((event.code === "KeyD" || event.code === "ArrowRight") && input.keys.x > 0) input.keys.x = 0;
  });
}

function updateJoystick(event) {
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

  ui.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  input.joystick.set(knobX / max, -knobY / max);
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
        mat.dispose();
      });
    }
  });
}

function isCachedTexture(tex) {
  for (const key in textureCache.floor) if (textureCache.floor[key] === tex) return true;
  for (const key in textureCache.wall) if (textureCache.wall[key] === tex) return true;
  return false;
}

function getCachedTexture(cache, key, factory) {
  if (cache[key]) return cache[key];
  cache[key] = factory();
  return cache[key];
}

function resetLevel(index, options = {}) {
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
  hitstopTimer = 0;
  shakeTimer = 0;
  playerInputVel.set(0, 0);
  gameStatus = options.skipBriefing ? "playing" : "briefing";

  const duel = isDuelLevel(level);
  const worldSeed = duel ? (options.worldSeed ?? Math.floor(Math.random() * 2147483647)) : null;
  duelRng = duel ? createSeededRng(worldSeed) : null;

  levelState = {
    level,
    remaining: duel ? 9999 : ROUND_SECONDS,
    attempts: duel ? DUEL_HP : ATTEMPTS,
    computers: [],
    pair: null,
    startTime: 0,
    obstacles: [],
    playerHp: options.playerHp ?? DUEL_HP,
    hitInvuln: 0,
    worldSeed,
    duelSpawns: null,
  };

  buildWorld(level);

  if (duel) {
    levelState.duelSpawns = options.duelSpawns ?? generateDuelSpawnPair(worldSeed);
  }

  duelSeparateTick = 0;
  duelHerdIndex = -1;
  duelHerdActive = false;
  duelHerdTarget.set(0, 0, 0);

  player = createPlayer();
  player.hp = duel ? (options.playerHp ?? DUEL_HP) : ATTEMPTS;
  player.hitInvuln = 0;
  player.group.position.copy(duel ? duelActorSpawn(true) : randomOpenPosition());
  scene.add(player.group);
  if (duel && isConnected()) syncHp(player.hp);

  remotePlayer = null;
  if (isConnected()) {
    remotePlayer = createRemotePlayer();
    remotePlayer.hp = DUEL_HP;
    const remoteSpawn = duel
      ? duelActorSpawn(false)
      : new THREE.Vector3(randomRange(-8.8, 8.8), 0, randomRange(-7.8, 7.8));
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
  if (duel) {
    chip.innerHTML = `生命 <span id="taskAttempts" class="hearts-display">${formatHearts(DUEL_HP)}</span>`;
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
  ui.taskTime.textContent = duel ? "∞" : ROUND_SECONDS;
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
}

function buildWorld(level) {
  const isNight = level.lighting === "night";
  scene.background = new THREE.Color(isNight ? 0x0c1320 : 0xb9d6e7);
  scene.fog = new THREE.Fog(isNight ? 0x0c1320 : 0xc8e3f0, 18, 35);

  const hemi = new THREE.HemisphereLight(
    isNight ? 0x3a4d6b : 0xffffff,
    isNight ? 0x0a0e16 : 0xa98f6b,
    isNight ? 1.2 : 1.42,
  );
  scene.add(hemi);

  // 夜间场景补一盏环境光，让角色轮廓更清晰
  if (isNight) {
    const ambient = new THREE.AmbientLight(0x4466aa, 0.35);
    scene.add(ambient);
  }

  const sun = new THREE.DirectionalLight(isNight ? 0x9fc4ff : 0xfff7d6, isNight ? 1.3 : 1.65);
  sun.position.set(-5, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  scene.add(sun);

  const mapId = level.mapId || level.id;
  const floorTex = getCachedTexture(textureCache.floor, mapId, () => makeFloorTexture(mapId));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.78,
      metalness: 0.02,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  if (level.id === "gaming") {
    buildGamingRoom();
  } else if (level.id === "library" || level.mapId === "library") {
    buildLibrary();
  } else {
    buildTempleCourtyard();
  }
}

function makeFloorTexture(kind) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 1024;
  canvasTexture.height = 1024;
  const ctx = canvasTexture.getContext("2d");

  if (kind === "gaming") {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
    for (let y = 0; y < 1024; y += 64) {
      for (let x = 0; x < 1024; x += 64) {
        ctx.fillStyle = (x + y) % 128 === 0 ? "#141f31" : "#0d1522";
        ctx.fillRect(x, y, 64, 64);
      }
    }
    ctx.fillStyle = "rgba(66, 153, 225, 0.12)";
    for (let i = 0; i < 10; i += 1) {
      ctx.fillRect(90 + i * 92, 128, 46, 150);
      ctx.fillRect(90 + i * 92, 694, 46, 150);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 1024; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();
    }
  } else if (kind === "library") {
    ctx.fillStyle = "#d9caa5";
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
    for (let y = 0; y < 1024; y += 72) {
      ctx.fillStyle = y % 144 === 0 ? "#cdbb90" : "#e2d5b8";
      ctx.fillRect(0, y, 1024, 72);
    }
    ctx.strokeStyle = "rgba(92, 58, 35, 0.18)";
    ctx.lineWidth = 3;
    for (let x = 0; x < 1024; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(60, 96, 120, 0.16)";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(90 + i * 128, 96, 70, 730);
    }
  } else {
    const gradient = ctx.createRadialGradient(512, 500, 90, 512, 500, 690);
    gradient.addColorStop(0, "#dbeafe");
    gradient.addColorStop(0.32, "#9db8c8");
    gradient.addColorStop(1, "#233447");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);

    ctx.fillStyle = "rgba(225, 238, 248, 0.24)";
    for (let y = 0; y < 1024; y += 96) {
      ctx.fillRect(0, y + 28, 1024, 18);
    }

    ctx.strokeStyle = "rgba(19, 41, 55, 0.34)";
    ctx.lineWidth = 7;
    for (let x = -120; x < 1120; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 320, 1024);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(22, 101, 52, 0.22)";
    ctx.lineWidth = 12;
    for (let i = 0; i < 14; i += 1) {
      const x = 70 + i * 74;
      ctx.beginPath();
      ctx.moveTo(x, 180 + Math.sin(i) * 50);
      ctx.bezierCurveTo(x + 34, 360, x - 64, 560, x + 20, 830);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;
  return texture;
}

function buildGamingRoom() {
  const wallTex = getCachedTexture(textureCache.wall, "gaming", () => makeWallTexture("gaming"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x2d374f,
    roughness: 0.72,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x2f2b26, roughness: 0.7 });
  const monitorMat = new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.46 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x8ee7ff,
    emissive: 0x1d8cff,
    emissiveIntensity: 2.2,
    roughness: 0.25,
  });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x283348, roughness: 0.82 });
  const spots = [
    [-7.2, -6.7],
    [-3.6, -7.0],
    [0, -6.8],
    [3.7, -7.0],
    [7.3, -6.7],
    [-7.0, 7.0],
    [-3.4, 7.2],
    [0.4, 7.0],
    [3.8, 7.2],
    [7.1, 7.0],
  ];

  spots.forEach(([x, z], index) => {
    const flip = z > 0 ? Math.PI : 0;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.42, 0.88), deskMat);
    desk.position.set(x, 0.32, z);
    desk.rotation.y = flip;
    desk.castShadow = true;
    desk.receiveShadow = true;
    scene.add(desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.5, 0.12), monitorMat);
    monitor.position.set(x, 0.92, z + (z > 0 ? -0.25 : 0.25));
    monitor.rotation.y = flip;
    monitor.castShadow = true;
    scene.add(monitor);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), screenMat.clone());
    screen.position.set(x, 0.93, z + (z > 0 ? -0.32 : 0.32));
    screen.rotation.y = z > 0 ? 0 : Math.PI;
    scene.add(screen);

    const glow = new THREE.PointLight(0x33aaff, 0.65, 4.4);
    glow.position.set(x, 1.2, z + (z > 0 ? -0.6 : 0.6));
    scene.add(glow);

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.64), chairMat);
    chair.position.set(x + ((index % 2) * 0.28 - 0.14), 0.24, z + (z > 0 ? 0.95 : -0.95));
    chair.castShadow = true;
    chair.receiveShadow = true;
    scene.add(chair);

    levelState.computers.push(new THREE.Vector3(x, 0, z + (z > 0 ? 1.2 : -1.2)));
  });

  const bedMat = new THREE.MeshStandardMaterial({ color: 0x243448, roughness: 0.86 });
  const quiltMat = new THREE.MeshStandardMaterial({ color: 0x445a78, roughness: 0.92 });
  [-10.2, 10.2].forEach((x) => {
    [-5.2, 0.6, 6.3].forEach((z) => {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.38, 2.45), bedMat);
      bed.position.set(x, 0.22, z);
      bed.castShadow = true;
      bed.receiveShadow = true;
      scene.add(bed);

      const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.18, 1.55), quiltMat);
      quilt.position.set(x, 0.52, z + 0.18);
      quilt.castShadow = true;
      scene.add(quilt);
    });
  });
}

function buildLibrary() {
  const wallTex = getCachedTexture(textureCache.wall, "library", () => makeWallTexture("library"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0xf0dfbf,
    roughness: 0.62,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x785a3a, roughness: 0.7 });
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x926c44, roughness: 0.68 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x3f6f7d, roughness: 0.78 });
  const bookColors = [0xb91c1c, 0x1d4ed8, 0x047857, 0xf59e0b, 0x7c3aed];

  [-9.5, -6.2, -2.9, 2.9, 6.2, 9.5].forEach((x) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.45, 0.65), shelfMat);
    shelf.position.set(x, 0.74, -9.2);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    scene.add(shelf);
    for (let i = 0; i < 8; i += 1) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.44 + Math.random() * 0.22, 0.08),
        new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length], roughness: 0.82 }),
      );
      book.position.set(x - 0.84 + i * 0.24, 1.02, -8.82);
      scene.add(book);
    }
  });

  [-10.2, 10.2].forEach((x) => {
    [-5.8, -2.5, 0.8, 4.1, 7.4].forEach((z) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.35, 2.2), shelfMat);
      shelf.position.set(x, 0.68, z);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      scene.add(shelf);
      registerObstacle(x, z, 0.37, 1.1);
    });
  });

  [-9.5, -6.2, -2.9, 2.9, 6.2, 9.5].forEach((x) => {
    registerObstacle(x, -9.2, 1.1, 0.33);
  });

  // 两侧与后侧墙体碰撞（内缘与可视墙对齐）
  registerObstacle(-10.9, 0, 0.35, 10.6);
  registerObstacle(10.9, 0, 0.35, 10.6);
  registerObstacle(0, -10.9, 10.6, 0.35);

  const libraryTables = [
    [-3.4, -1.4],
    [3.4, -1.4],
    [-3.4, 2.4],
    [3.4, 2.4],
  ];
  libraryTables.forEach(([x, z]) => {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 1.35), tableMat);
    table.position.set(x, 0.38, z);
    table.castShadow = true;
    table.receiveShadow = true;
    scene.add(table);
    registerObstacle(x, z, 1.35, 0.675);

    const lamp = new THREE.PointLight(0xffe0a8, 0.48, 5.2);
    lamp.position.set(x, 1.6, z);
    scene.add(lamp);

    [-1, 1].forEach((side) => {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.58), chairMat);
      chair.position.set(x + side * 1.15, 0.26, z);
      chair.castShadow = true;
      chair.receiveShadow = true;
      scene.add(chair);
    });
  });
}

function buildTempleCourtyard() {
  levelState.temple = {
    moonPoint: new THREE.Vector3(0, 0, 0.15),
  };

  const wallTex = getCachedTexture(textureCache.wall, "temple", () => makeWallTexture("temple"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x92a3b4,
    roughness: 0.68,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(0, 11.8, Math.PI, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const moonLight = new THREE.PointLight(0xdbeafe, 1.15, 12.5);
  moonLight.position.set(0, 5.2, 0.1);
  scene.add(moonLight);

  const moonDisk = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 36),
    new THREE.MeshBasicMaterial({ color: 0xf6f0c7, transparent: true, opacity: 0.92 }),
  );
  moonDisk.position.set(7.1, 5.0, -11.76);
  scene.add(moonDisk);

  const moonPool = new THREE.Mesh(
    new THREE.CircleGeometry(4.55, 64),
    new THREE.MeshStandardMaterial({
      color: 0xdcefff,
      emissive: 0x8bbcff,
      emissiveIntensity: 0.25,
      roughness: 0.28,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  moonPool.rotation.x = -Math.PI / 2;
  moonPool.position.set(0, 0.026, 0.15);
  scene.add(moonPool);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.45, 4.62, 64),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.033, 0.15);
  scene.add(ring);

  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x12352f,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  for (let i = 0; i < 11; i += 1) {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(randomRange(0.18, 0.34), randomRange(5.8, 8.4)), shadowMat.clone());
    shadow.rotation.x = -Math.PI / 2;
    shadow.rotation.z = -0.62 + i * 0.075;
    shadow.position.set(-4.8 + i * 0.92, 0.041, -0.7 + Math.sin(i * 0.8) * 1.5);
    scene.add(shadow);
  }

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f8190, roughness: 0.84 });
  [-8.8, -4.4, 4.4, 8.8].forEach((x) => {
    [-8.6, 8.7].forEach((z) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.92), stoneMat);
      slab.position.set(x, 0.06, z);
      slab.receiveShadow = true;
      scene.add(slab);
    });
  });

  const lanternMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
  const lanternLightMat = new THREE.MeshStandardMaterial({
    color: 0xfff4c0,
    emissive: 0xffd580,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  [
    [-6.2, -6.2],
    [6.2, -6.2],
    [-6.2, 6.3],
    [6.2, 6.3],
  ].forEach(([x, z]) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.42), lanternMat);
    base.position.set(x, 0.14, z);
    base.castShadow = true;
    scene.add(base);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.34), lanternLightMat);
    lamp.position.set(x, 0.46, z);
    lamp.castShadow = true;
    scene.add(lamp);
    registerObstacle(x, z, 0.24, 0.24);
  });

  addBambooCluster(-10.0, -4.8);
  addBambooCluster(-10.4, 4.9);
  addBambooCluster(10.1, -4.6);
  addBambooCluster(10.4, 5.2);
  addCypress(-8.7, 0.4, 1.05);
  addCypress(8.6, 0.2, 1.0);
}

function addBambooCluster(x, z) {
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3f, roughness: 0.66 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8b54, roughness: 0.74 });
  for (let i = 0; i < 5; i += 1) {
    const offsetX = (i - 2) * 0.16;
    const offsetZ = Math.sin(i * 1.4) * 0.2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.8 + i * 0.12, 6), bambooMat);
    stem.position.set(x + offsetX, 1.4 + i * 0.04, z + offsetZ);
    stem.rotation.z = randomRange(-0.08, 0.08);
    stem.castShadow = true;
    scene.add(stem);

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.055, 0.16), leafMat);
    leaf.position.set(x + offsetX * 1.4, 2.75 + i * 0.05, z + offsetZ);
    leaf.rotation.y = randomRange(-0.9, 0.9);
    leaf.rotation.z = randomRange(-0.2, 0.2);
    leaf.castShadow = true;
    scene.add(leaf);
  }
  registerObstacle(x, z, 0.45, 0.48);
}

function addCypress(x, z, scale) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x513b2c, roughness: 0.78 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f4d40, roughness: 0.7 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.17 * scale, 2.0 * scale, 8), trunkMat);
  trunk.position.set(x, 1.0 * scale, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.78 * scale, 2.15 * scale, 12), leafMat);
  crown.position.set(x, 2.35 * scale, z);
  crown.castShadow = true;
  scene.add(crown);
  registerObstacle(x, z, 0.55 * scale, 0.55 * scale);
}

function makeWallTexture(kind) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 1024;
  canvasTexture.height = 512;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = kind === "gaming" ? "#121b2d" : kind === "library" ? "#ead7b5" : "#7f90a2";
  ctx.fillRect(0, 0, 1024, 512);

  if (kind === "gaming") {
    ctx.fillStyle = "#1f2a44";
    for (let x = 60; x < 960; x += 180) {
      ctx.fillRect(x, 72, 110, 170);
      ctx.fillStyle = "rgba(80, 200, 255, 0.16)";
      ctx.fillRect(x + 8, 84, 94, 68);
      ctx.fillStyle = "#1f2a44";
    }
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 318, 1024, 8);
  } else if (kind === "library") {
    ctx.fillStyle = "#b58a54";
    for (let x = 36; x < 980; x += 150) {
      ctx.fillRect(x, 60, 110, 300);
      for (let y = 88; y < 330; y += 54) {
        ctx.fillStyle = y % 108 === 0 ? "#7f5132" : "#315b69";
        ctx.fillRect(x + 12, y, 86, 24);
      }
      ctx.fillStyle = "#b58a54";
    }
    ctx.fillStyle = "rgba(120, 90, 58, 0.22)";
    ctx.fillRect(0, 382, 1024, 10);
  } else {
    ctx.fillStyle = "#5d7184";
    ctx.fillRect(0, 340, 1024, 24);
    ctx.fillStyle = "#273548";
    for (let x = 48; x < 1024; x += 124) {
      ctx.fillRect(x, 86, 72, 224);
      ctx.fillStyle = "rgba(219, 234, 254, 0.2)";
      ctx.fillRect(x + 10, 106, 52, 56);
      ctx.fillStyle = "#273548";
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 5;
    for (let y = 58; y < 330; y += 76) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y + 16);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(18, 53, 47, 0.24)";
    for (let x = 0; x < 1024; x += 88) {
      ctx.fillRect(x, 372 + Math.sin(x) * 8, 42, 118);
    }
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addWall(x, z, rotationY, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 6.8), material);
  wall.position.set(x, 3.4, z);
  wall.rotation.y = rotationY;
  wall.receiveShadow = true;
  scene.add(wall);
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
  } else {
    const target = createNpc(0, { suShiTarget: true, templeClone: true });
    const start = randomOpenPosition();
    target.group.position.set(start.x, 0, start.z);
    target.script = {
      state: "seekMoon",
      timer: 0,
      waypoint: levelState.temple.moonPoint.clone(),
      moonPoint: levelState.temple.moonPoint.clone(),
      revealProgress: 0,
      exposed: false,
    };
    npcs.push(target);
    scene.add(target.group);

    for (let i = 1; i < getMatchNpcCount(); i += 1) {
      addWanderNpc(i);
    }
  }

  // 从普通漫游 NPC 中随机选几个作为替身
  const decoyCount = level.id === "temple" ? 5 : level.id === "library" ? 4 : 3;
  const wanderNpcs = npcs.filter((n) => !n.isGamingTarget && !n.isLover && !n.isSuShiTarget && n.alive);
  shuffleArray(wanderNpcs);
  for (let i = 0; i < Math.min(decoyCount, wanderNpcs.length); i += 1) {
    initDecoy(wanderNpcs[i]);
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
  for (let i = 0; i < DUEL_NPC_COUNT; i += 1) {
    const npc = createNpc(i, { duelPunch: true });
    const pos = randomOpenPosition();
    npc.group.position.set(pos.x, 0, pos.z);
    nudgeActorFromObstacles(npc);
    npc.wanderTimer = randomRange(0.6, 2.2);
    npc.pauseTimer = randomRange(0.2, 1.3);
    npc.walking = false;
    npc.hp = DUEL_HP;
    npc.punchDelay = randomRange(NPC_PUNCH_MIN, NPC_PUNCH_MAX);
    npc.punchTimer = 0;
    npc.punchHitDone = false;
    npcs.push(npc);
    scene.add(npc.group);
  }
}

function spawnDuelNpcsFromSnapshot(snapshot) {
  duelRng = createSeededRng(snapshot.worldSeed ?? levelState.worldSeed);
  snapshot.duelNpcs.forEach((data, i) => {
    const npc = createNpc(i, { duelPunch: true });
    npc.group.position.set(data.x, 0, data.z);
    npc.hp = data.hp ?? DUEL_HP;
    npc.alive = data.alive !== false;
    npc.punchDelay = data.punchDelay ?? randomRange(NPC_PUNCH_MIN, NPC_PUNCH_MAX);
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

function generateDuelHerdTarget(cycleIndex, worldSeed) {
  const rng = createSeededRng((worldSeed >>> 0) ^ Math.imul(cycleIndex + 1, 2654435761));
  const pos = new THREE.Vector3(
    rng() * 14 - 7,
    0,
    rng() * 12 - 6,
  );
  nudgeActorFromObstacles({ group: { position: pos } });
  return pos;
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
    duelHerdTarget.copy(generateDuelHerdTarget(cycleIndex, levelState.worldSeed));
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
    moveNpcToward(npc, duelHerdTarget, NPC_SPEED * 1.45, dt);
    return;
  }
  updateWander(npc, dt);
}

function generateDuelSpawnPair(seed) {
  const rng = createSeededRng((seed >>> 0) ^ 0x9e3779b9);
  let host = new THREE.Vector3();
  let guest = new THREE.Vector3();

  for (let attempt = 0; attempt < 80; attempt += 1) {
    host.set(rng() * 17.6 - 8.8, 0, rng() * 15.6 - 7.8);
    guest.set(rng() * 17.6 - 8.8, 0, rng() * 15.6 - 7.8);
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
  if (npc.punchTimer > 0) {
    npc.punchTimer = Math.max(0, npc.punchTimer - dt);
    const punchT = 1 - npc.punchTimer / NPC_PUNCH_SWING;
    if (!npc.punchHitDone && punchT > 0.42 && punchT < 0.72) {
      npc.punchHitDone = true;
      tryNpcPunchHit(npc);
    }
    if (npc.punchTimer <= 0) {
      npc.punchDelay = randomRange(NPC_PUNCH_MIN, NPC_PUNCH_MAX);
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
      applyPlayerDamage(1, "NPC 出拳");
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

function findDuelPunchTarget() {
  const playerPos = player.group.position;
  const facing = getFacingVector(player.group.rotation.y);
  let best = null;
  let bestDistance = Infinity;

  function testTarget(type, actor) {
    if (!actor?.group || actor.group.visible === false || actor.hp <= 0) return;
    const toTarget = new THREE.Vector2(
      actor.group.position.x - playerPos.x,
      actor.group.position.z - playerPos.z,
    );
    const distance = toTarget.length();
    if (distance > HIT_RANGE || !isFacingTarget(facing, toTarget)) return;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { type, actor };
    }
  }

  testTarget("remote", remotePlayer);
  npcs.forEach((npc) => {
    if (npc.alive) testTarget("npc", npc);
  });

  return best;
}

function damageRemotePlayer() {
  if (!remotePlayer?.group || remotePlayer.hp <= 0) return false;
  if (isConnected()) return true;
  remotePlayer.hp = Math.max(0, (remotePlayer.hp ?? DUEL_HP) - 1);

  if (remotePlayer.hp <= 0) {
    dissolveActor(remotePlayer);
    settleRound(true);
  }
  return true;
}

function damageDuelNpc(npc) {
  if (!npc?.alive || npc.hp <= 0) return false;
  npc.hp = Math.max(0, (npc.hp ?? DUEL_HP) - 1);
  if (npc.hp <= 0) {
    dissolveNpc(npc);
  }
  return true;
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
  npc.deoyState = "wander"; // "wander" | "confuse"
  npc.decoyTimer = randomRange(1.5, 3.5); // 当前状态剩余时间
  npc.decoyDir = new THREE.Vector2(); // 替身移动方向
  pickDecoyDir(npc);
}

function pickDecoyDir(npc) {
  const angle = Math.random() * Math.PI * 2;
  npc.decoyDir.set(Math.sin(angle), Math.cos(angle));
}

function updateDecoy(npc, dt) {
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
    if (Math.abs(npc.group.position.z) >= WORLD_LIMIT - 0.3) npc.decoyDir.y *= -1;

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

function registerObstacle(x, z, halfW, halfD) {
  levelState.obstacles.push({ x, z, halfW, halfD });
}

function collidesWithObstacle(pos, radius = ACTOR_COLLISION_RADIUS) {
  if (!levelState?.obstacles?.length) return false;
  for (const obs of levelState.obstacles) {
    if (
      Math.abs(pos.x - obs.x) < obs.halfW + radius &&
      Math.abs(pos.z - obs.z) < obs.halfD + radius
    ) {
      return true;
    }
  }
  return false;
}

function resolveObstacleCollisions(position, radius = ACTOR_COLLISION_RADIUS, velocity = null) {
  if (!levelState?.obstacles?.length) return false;
  let hit = false;
  for (let pass = 0; pass < 4; pass += 1) {
    let resolved = false;
    for (const obs of levelState.obstacles) {
      const dx = position.x - obs.x;
      const dz = position.z - obs.z;
      const overlapX = obs.halfW + radius - Math.abs(dx);
      const overlapZ = obs.halfD + radius - Math.abs(dz);
      if (overlapX <= 0 || overlapZ <= 0) continue;
      if (overlapX < overlapZ) {
        position.x += dx >= 0 ? overlapX : -overlapX;
        if (velocity) velocity.x *= -0.25;
      } else {
        position.z += dz >= 0 ? overlapZ : -overlapZ;
        if (velocity) velocity.y *= -0.25;
      }
      resolved = true;
      hit = true;
    }
    if (!resolved) break;
  }
  return hit;
}

function clampActorPosition(position, velocity = null) {
  clampToWorld(position);
  resolveObstacleCollisions(position, ACTOR_COLLISION_RADIUS, velocity);
}

function pickWanderDirection(npc) {
  const angle = Math.random() * Math.PI * 2;
  npc.velocity.set(Math.sin(angle), Math.cos(angle)).multiplyScalar(randomRange(0.55, 1.15));
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
    pos = new THREE.Vector3(randomRange(-8.8, 8.8), 0, randomRange(-7.8, 7.8));
    tries += 1;
  } while (tries < 40 && (pos.distanceTo(playerPos) < 2.2 || collidesWithObstacle(pos)));
  return pos;
}

const LOW_POLY_PLAYER_PALETTE = {
  jacket: 0x3ddc68,
  jacketDark: 0x2ab84f,
  shorts: 0xa16207,
  shortsDark: 0x854d0e,
  cap: 0x3b82f6,
  capAccent: 0xf97316,
  sock: 0x7dd3fc,
};

const LOW_POLY_NPC_PALETTES = [
  { jacket: 0x60a5fa, jacketDark: 0x2563eb, shorts: 0x57534e, shortsDark: 0x44403c, cap: 0xef4444, capAccent: 0xfbbf24, sock: 0xf9a8d4 },
  { jacket: 0xf472b6, jacketDark: 0xdb2777, shorts: 0x78350f, shortsDark: 0x57230a, cap: 0x8b5cf6, capAccent: 0x22d3ee, sock: 0xa5f3fc },
  { jacket: 0xfbbf24, jacketDark: 0xf59e0b, shorts: 0x1e40af, shortsDark: 0x1e3a8a, cap: 0x10b981, capAccent: 0xf43f5e, sock: 0xe2e8f0 },
  { jacket: 0xa78bfa, jacketDark: 0x7c3aed, shorts: 0x166534, shortsDark: 0x14532d, cap: 0x0ea5e9, capAccent: 0xfcd34d, sock: 0xbae6fd },
];

const LOW_POLY_REMOTE_PALETTE = {
  jacket: 0xef4444,
  jacketDark: 0xdc2626,
  shorts: 0x1e3a5f,
  shortsDark: 0x172e4a,
  cap: 0xfbbf24,
  capAccent: 0xef4444,
  sock: 0xfca5a5,
};

const LOW_POLY_TEMPLE_PALETTE = {
  jacket: 0xc8d4dc,
  jacketDark: 0x8796a4,
  shorts: 0x57666f,
  shortsDark: 0x3f4b54,
  cap: 0x111827,
  capAccent: 0xf7e9bc,
  sock: 0xdbeafe,
};

function makeLowPolyMat(color, roughness = 0.62) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.04,
    flatShading: true,
  });
}

function addFacetedBox(parent, w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function createLowPolyPerson(palette = LOW_POLY_PLAYER_PALETTE, options = {}) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.add(visual);

  const isTempleStyle = options.temple === true;
  const skin = makeLowPolyMat(0xf0b88c);
  const jacket = makeLowPolyMat(palette.jacket);
  const jacketDark = makeLowPolyMat(palette.jacketDark);
  const shirt = makeLowPolyMat(0xf8fafc, 0.55);
  const shorts = makeLowPolyMat(palette.shorts);
  const shortsDark = makeLowPolyMat(palette.shortsDark);
  const boot = makeLowPolyMat(0x7c4a1e);
  const sock = makeLowPolyMat(palette.sock);
  const cap = makeLowPolyMat(palette.cap);
  const capAccent = makeLowPolyMat(palette.capAccent);
  const eye = makeLowPolyMat(0x111111, 0.4);
  const mouth = makeLowPolyMat(0x1a1a1a, 0.5);
  const blackEyeMat = new THREE.MeshBasicMaterial({
    color: 0x2a1450,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });
  const lipMat = new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0 });
  const moonShadowMat = new THREE.MeshBasicMaterial({ color: 0x12352f, transparent: true, opacity: 0, depthWrite: false });

  if (isTempleStyle) {
    jacket.emissive = new THREE.Color(0xb8dcff);
    jacket.emissiveIntensity = 0;
    jacketDark.emissive = new THREE.Color(0xb8dcff);
    jacketDark.emissiveIntensity = 0;
  }

  addFacetedBox(visual, 0.54, 0.5, 0.48, skin, 0, 1.44, 0);
  addFacetedBox(visual, 0.58, 0.07, 0.34, cap, 0, 1.7, 0.1);
  addFacetedBox(visual, 0.5, 0.16, 0.46, cap, 0, 1.78, -0.03);
  addFacetedBox(visual, 0.5, 0.16, 0.1, capAccent, 0, 1.78, 0.24);
  if (isTempleStyle) {
    addFacetedBox(visual, 0.2, 0.18, 0.2, cap, 0, 1.96, -0.02);
    addFacetedBox(visual, 0.38, 0.05, 0.04, cap, 0, 1.86, 0.15);
  }
  addFacetedBox(visual, 0.11, 0.13, 0.05, eye, -0.13, 1.46, 0.26);
  addFacetedBox(visual, 0.11, 0.13, 0.05, eye, 0.13, 1.46, 0.26);
  addFacetedBox(visual, 0.2, 0.06, 0.04, mouth, 0, 1.3, 0.26);
  if (isTempleStyle) {
    addFacetedBox(visual, 0.25, 0.03, 0.04, cap, 0, 1.36, 0.285);
    addFacetedBox(visual, 0.1, 0.18, 0.04, cap, 0, 1.23, 0.285);
  }
  const blackLeft = addFacetedBox(visual, 0.17, 0.14, 0.04, blackEyeMat, -0.13, 1.4, 0.27);
  const blackRight = addFacetedBox(visual, 0.17, 0.14, 0.04, blackEyeMat.clone(), 0.13, 1.4, 0.27);
  const blackTopLeft = addFacetedBox(visual, 0.16, 0.05, 0.16, blackEyeMat.clone(), -0.13, 1.67, -0.02);
  const blackTopRight = addFacetedBox(visual, 0.16, 0.05, 0.16, blackEyeMat.clone(), 0.13, 1.67, -0.02);
  blackTopLeft.userData.isTopView = true;
  blackTopRight.userData.isTopView = true;
  const lipMark = addFacetedBox(visual, 0.16, 0.08, 0.03, lipMat, 0, 1.28, 0.27);
  addFacetedBox(visual, 0.56, 0.4, 0.22, jacketDark, 0, 1.52, -0.3, 0.18, 0, 0);

  const torso = addFacetedBox(visual, 0.46, 0.44, 0.34, jacket, 0, 1.04, 0);
  addFacetedBox(visual, 0.2, 0.3, 0.05, shirt, 0, 1.06, 0.18);
  addFacetedBox(visual, 0.13, 0.34, 0.12, jacketDark, -0.15, 1.06, 0.1, 0, 0.22, 0);
  addFacetedBox(visual, 0.13, 0.34, 0.12, jacketDark, 0.15, 1.06, 0.1, 0, -0.22, 0);
  const moonMarks = [];
  let moonGlow = null;
  let scroll = null;
  if (isTempleStyle) {
    [-0.14, 0.02, 0.16].forEach((x, i) => {
      const mark = addFacetedBox(visual, 0.055, 0.46, 0.025, moonShadowMat.clone(), x, 1.0 + i * 0.03, 0.205, 0, 0, -0.22 + i * 0.2);
      moonMarks.push(mark);
    });
    moonGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.018, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0, depthWrite: false }),
    );
    moonGlow.rotation.x = Math.PI / 2;
    moonGlow.position.set(0, 0.96, 0);
    visual.add(moonGlow);
  }
  addFacetedBox(visual, 0.44, 0.24, 0.36, shorts, 0, 0.74, 0);
  addFacetedBox(visual, 0.46, 0.08, 0.38, shortsDark, 0, 0.62, 0);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.3, 1.1, 0);
  rightArm.position.set(0.3, 1.1, 0);
  addFacetedBox(leftArm, 0.13, 0.38, 0.13, jacket, 0, -0.2, 0);
  addFacetedBox(rightArm, 0.13, 0.38, 0.13, jacket, 0, -0.2, 0);
  addFacetedBox(leftArm, 0.11, 0.11, 0.11, skin, 0, -0.42, 0);
  addFacetedBox(rightArm, 0.11, 0.11, 0.11, skin, 0, -0.42, 0);
  if (isTempleStyle) {
    addFacetedBox(leftArm, 0.21, 0.28, 0.18, jacketDark, 0, -0.22, 0);
    addFacetedBox(rightArm, 0.21, 0.28, 0.18, jacketDark, 0, -0.22, 0);
    scroll = new THREE.Group();
    const paperMat = makeLowPolyMat(0xf7e9bc, 0.68);
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x3b2f2f, transparent: true, opacity: 0.62 });
    const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.46, 12), paperMat);
    scrollRoll.rotation.z = Math.PI / 2;
    scrollRoll.castShadow = true;
    scroll.add(scrollRoll);
    addFacetedBox(scroll, 0.3, 0.01, 0.012, inkMat, 0, 0.052, 0);
    scroll.position.set(0.5, 0.95, 0.26);
    scroll.rotation.set(0.18, 0.18, -0.38);
    scroll.visible = false;
    visual.add(scroll);
  }
  leftArm.rotation.z = 0.35;
  rightArm.rotation.z = -0.35;
  visual.add(leftArm, rightArm);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.12, 0.6, 0);
  rightLeg.position.set(0.12, 0.6, 0);
  addFacetedBox(leftLeg, 0.15, 0.18, 0.15, shorts, 0, -0.09, 0);
  addFacetedBox(rightLeg, 0.15, 0.18, 0.15, shorts, 0, -0.09, 0);
  addFacetedBox(leftLeg, 0.14, 0.26, 0.14, skin, 0, -0.31, 0);
  addFacetedBox(rightLeg, 0.14, 0.26, 0.14, skin, 0, -0.31, 0);
  addFacetedBox(leftLeg, 0.15, 0.1, 0.15, sock, 0, -0.48, 0);
  addFacetedBox(rightLeg, 0.15, 0.1, 0.15, sock, 0, -0.48, 0);
  addFacetedBox(leftLeg, 0.17, 0.13, 0.22, boot, 0, -0.58, 0.04);
  addFacetedBox(rightLeg, 0.17, 0.13, 0.22, boot, 0, -0.58, 0.04);
  visual.add(leftLeg, rightLeg);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.userData = {
    visual,
    body: torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    blackMarks: [blackLeft, blackRight, blackTopLeft, blackTopRight],
    lipMarks: [lipMark],
    moonMarks,
    moonGlow,
    scroll,
    robeMaterials: isTempleStyle ? [jacket, jacketDark] : [],
    baseArmRotations: {
      leftZ: leftArm.rotation.z,
      rightZ: rightArm.rotation.z,
    },
    colors: isTempleStyle
      ? [palette.jacket, palette.shorts, 0xf0b88c, palette.cap, palette.capAccent, 0xf7e9bc, 0x12352f]
      : [palette.jacket, palette.shorts, 0xf0b88c, palette.cap, palette.capAccent, 0xf8fafc],
  };

  return { group };
}

function createPlayer() {
  const isTemple = levelState?.level?.id === "temple";
  const actor = createLowPolyPerson(isTemple ? LOW_POLY_TEMPLE_PALETTE : LOW_POLY_PLAYER_PALETTE, { temple: isTemple });
  actor.speed = PLAYER_SPEED;
  actor.punchTimer = 0;
  actor.cheer = false;
  return actor;
}

function createRemotePlayer() {
  const actor = createLowPolyPerson(LOW_POLY_REMOTE_PALETTE);
  actor.speed = PLAYER_SPEED;
  actor.punchTimer = 0;
  actor.cheer = false;
  return actor;
}

function createNpc(id, flags) {
  const isTemple = flags.templeClone || flags.suShiTarget || levelState?.level?.id === "temple";
  const actor = createLowPolyPerson(
    isTemple ? LOW_POLY_TEMPLE_PALETTE : LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length],
    { temple: isTemple },
  );
  actor.id = id;
  actor.isGamingTarget = Boolean(flags.gamingTarget);
  actor.isLover = Boolean(flags.lover);
  actor.isSuShiTarget = Boolean(flags.suShiTarget);
  actor.alive = true;
  actor.marked = false;
  actor.markIntensity = 0;
  actor.velocity = new THREE.Vector2();
  actor.wanderTimer = randomRange(0.8, 2.8);
  actor.pauseTimer = randomRange(0.4, 1.8);
  actor.walking = false;
  actor.walkCycle = Math.random() * 10;
  return actor;
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
  if (hitstopTimer > 0) {
    hitstopTimer -= clampedDt;
    updateShake(clampedDt);
    renderer.render(scene, camera);
    return;
  }

  const dt = clampedDt;
  totalTime += dt;

  if (gameStatus === "playing") {
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
    if (damageFlashTimer > 0) damageFlashTimer = Math.max(0, damageFlashTimer - dt);
    updatePlayer(dt);
    updateNpcs(dt);
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

  updateParticles(dt);
  updateShake(dt);
  renderer.render(scene, camera);
}

function updateShake(dt) {
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    const decay = Math.max(0, shakeTimer / 0.2);
    const offsetX = (Math.random() - 0.5) * 2 * shakeIntensity * decay;
    const offsetY = (Math.random() - 0.5) * 2 * shakeIntensity * decay * 0.5;
    camera.position.set(cameraBasePos.x + offsetX, cameraBasePos.y + offsetY, cameraBasePos.z);
  } else {
    camera.position.copy(cameraBasePos);
  }
}

function updatePlayer(dt) {
  scratchVec2.copy(input.joystick).add(input.keys);
  if (scratchVec2.lengthSq() > 1) scratchVec2.normalize();

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
  if (punchResetTimer > 0) {
    punchResetTimer -= dt;
    if (punchResetTimer <= 0) punchTier = 0;
  }
  animateActor(player, dt, moving);
  animatePunchPose();
}

function animatePunchPose() {
  const userData = player.group.userData;
  const t = player.punchTimer > 0 ? Math.sin((player.punchTimer / PUNCH_SWING) * Math.PI) : 0;
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
  if (isDuelLevel()) {
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
      script.timer = randomRange(2.2, 3.0);
    }
    animateActor(target, dt, target.walking);
    return;
  }

  if (script.state === "moonPause") {
    target.walking = false;
    script.timer -= dt;
    faceNpcToward(target, new THREE.Vector3(7.1, 0, -10.4));

    if (script.timer <= 1.45 || script.exposed) {
      script.exposed = true;
      script.revealProgress = Math.min(1, script.revealProgress + dt * 0.9);
      setSuShiClues(target, script.revealProgress);
    }

    if (script.timer <= 0) {
      setSuShiClues(target, 1);
      script.state = "wander";
      script.timer = randomRange(4.2, 6.4);
      script.waypoint = randomOpenPosition();
    }
    animateActor(target, dt, false);
    return;
  }

  if (script.state === "wander") {
    target.walking = true;
    const reached = moveNpcToward(target, script.waypoint, NPC_SPEED * 1.02, dt);
    script.timer -= dt;
    if (reached || script.timer <= 0) {
      script.state = "seekMoon";
      script.waypoint = script.moonPoint.clone();
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

function setBlackEye(npc, intensity) {
  npc.marked = true;
  npc.markIntensity = Math.max(npc.markIntensity, intensity);
  const i = npc.markIntensity;
  npc.group.userData.blackMarks.forEach((mesh) => {
    mesh.material.opacity = 0.58 + i * 0.42;
    const base = mesh.userData.isTopView ? 1.05 : 0.9;
    mesh.scale.setScalar(base + i * 0.7);
  });
}

function setLipstick(npc, intensity) {
  npc.marked = true;
  npc.markIntensity = Math.max(npc.markIntensity, intensity);
  npc.group.userData.lipMarks.forEach((mesh) => {
    mesh.material.opacity = 0.25 + npc.markIntensity * 0.75;
    mesh.scale.set(1 + npc.markIntensity * 2.8, 1 + npc.markIntensity * 1.8, 1);
  });
}

function setSuShiClues(npc, intensity) {
  npc.marked = true;
  npc.markIntensity = Math.max(npc.markIntensity, intensity);
  const level = THREE.MathUtils.clamp(npc.markIntensity, 0, 1);
  const data = npc.group.userData;

  data.moonMarks?.forEach((mesh, index) => {
    mesh.material.opacity = level * (0.42 + index * 0.12);
    mesh.scale.set(1 + level * 0.18, 1 + level * 0.28, 1);
  });

  if (data.moonGlow) {
    data.moonGlow.material.opacity = 0.12 + level * 0.28;
    data.moonGlow.scale.setScalar(0.82 + level * 0.26);
  }

  if (data.scroll) {
    data.scroll.visible = level > 0.22;
    data.scroll.scale.setScalar(0.82 + level * 0.18);
  }

  data.robeMaterials?.forEach((material) => {
    material.emissiveIntensity = level * 0.22;
  });
}

function pulseSuShiClues(npc) {
  if (!npc.marked) return;
  const data = npc.group.userData;
  const pulse = 0.5 + Math.sin(totalTime * 3.2) * 0.5;

  if (data.moonGlow) {
    data.moonGlow.material.opacity = 0.22 + pulse * 0.15;
  }

  data.robeMaterials?.forEach((material) => {
    material.emissiveIntensity = 0.14 + pulse * 0.12;
  });
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
  if (Math.abs(npc.group.position.z) >= WORLD_LIMIT - 0.2) npc.velocity.y *= -1;

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
const GRID_CELL = 2.0;
const GRID_COLS = Math.ceil((WORLD_LIMIT * 2) / GRID_CELL) + 1;
let spatialGrid = new Map();

function gridKey(cx, cz) {
  return cx * 1000 + cz;
}

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
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const cell = spatialGrid.get(gridKey(cx + dx, cz + dz));
      if (cell) result.push(...cell);
    }
  }
  return result;
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
  punchCooldownMax = PUNCH_COOLDOWNS[Math.min(punchTier, PUNCH_COOLDOWNS.length - 1)];
  punchCooldown = punchCooldownMax;
  punchTier += 1;
  punchResetTimer = PUNCH_RESET_DELAY;
  player.punchTimer = PUNCH_SWING;
  if (isDuelActive()) {
    sfxPunchHeavy();
    spawnPunchSwish(player);
    ui.attackButton.classList.add("punching");
    window.setTimeout(() => ui.attackButton.classList.remove("punching"), 180);
  } else {
    sfxPunch();
  }

  if (isDuelActive()) {
    const hit = findDuelPunchTarget();
    const remoteAttempt = hit?.type === "remote";
    const remoteHit = remoteAttempt && !isConnected() ? damageRemotePlayer() : false;
    const npcHit = hit?.type === "npc" ? damageDuelNpc(hit.actor) : false;
    if (isConnected()) {
      syncPunch(
        player.group.position.x,
        player.group.position.z,
        player.group.rotation.y,
        {
          roundId: duelRoundId,
          punchId: nextLocalEventId("punch"),
          attempt: remoteAttempt,
        },
      );
    }
    if (remoteHit || npcHit || (remoteAttempt && isConnected())) {
      triggerHitstop(0.06);
      triggerShake(0.22, 0.14);
      if (remoteHit || npcHit) sfxHit();
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
    if (hit.npcs) {
      hit.npcs.forEach((npc) => dissolveNpc(npc));
    } else {
      dissolveNpc(hit.npc);
    }
    // 命中正确目标：强 hitstop + 强震动 + 命中音效
    triggerHitstop(0.08);
    triggerShake(0.35, 0.2);
    sfxHit();
    // 同步胜利给对手
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

  // 打错了：弱震动 + 失败音效
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
  const facing = getFacingVector(player.group.rotation.y);

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
    correct: best.isGamingTarget || best.isLover || best.isSuShiTarget,
  };
}

function isFacingTarget(facing, toTarget) {
  if (toTarget.lengthSq() < 0.08) return true;
  toTarget.normalize();
  return facing.dot(toTarget) >= HIT_FACING_DOT;
}

function getFacingVector(rotationY) {
  return new THREE.Vector2(Math.sin(rotationY), Math.cos(rotationY));
}

function dissolveNpc(npc) {
  if (!npc || !npc.alive) return;
  dissolveActor(npc);
}

function dissolveActor(actor) {
  if (!actor?.group || actor.group.visible === false) return;
  actor.alive = false;
  actor.group.visible = false;
  createPixelBurst(actor);
}

function createPixelBurst(npc) {
  const colors = npc.group.userData.colors;
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
  if (gameStatus === "won" || gameStatus === "lost") return;
  if (settleTimer) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
  gameStatus = won ? "won" : "lost";
  player.cheer = won;
  if (won) sfxWin(); else sfxLose();

  const duel = isDuelLevel(levelState.level);
  const timeUsed = Math.round(totalTime - levelState.startTime);
  const attemptsLeft = duel ? player.hp : levelState.attempts;
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
    ui.statAttemptsLabel.textContent = duel ? "❤️ 剩余生命" : "🥊 剩余出拳";
  }
  ui.statAttempts.textContent = duel
    ? (won ? "对手生命归零" : formatHearts(attemptsLeft))
    : `${attemptsLeft} 次`;
  ui.statAttempts.classList.toggle("hearts-display", duel);

  const guestWaitingForRetry = duel && isConnected() && !getIsHost();
  ui.retryButton.disabled = guestWaitingForRetry;
  ui.retryButton.textContent = guestWaitingForRetry ? "等待房主再来" : "再来一局";

  ui.resultModal.classList.add("visible");
  ui.taskModal.classList.remove("visible");

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
  ui.sceneName.textContent = levelState.level.sceneName;
  ui.missionText.textContent = levelState.level.hudMission || levelState.level.mission;
  ui.timerText.textContent = duel ? "∞" : Math.ceil(levelState.remaining).toString();
  ui.attemptLabel.textContent = duel ? "生命" : "出拳";
  if (duel) {
    ui.attemptText.textContent = formatHearts(player.hp ?? levelState.playerHp);
    ui.attemptText.classList.add("hearts-display");
  } else {
    ui.attemptText.textContent = levelState.attempts.toString();
    ui.attemptText.classList.remove("hearts-display");
  }
  ui.clueBar.textContent = duel
    ? `⚔️ 你的生命 ${formatHearts(player.hp)} · 对手 ${formatHearts(remotePlayer?.hp ?? DUEL_HP)} · 躲避 NPC 拳头`
    : "🔍 " + (levelState.level.hudClue || levelState.level.clue);

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

function clampToWorld(position) {
  position.x = THREE.MathUtils.clamp(position.x, -WORLD_LIMIT, WORLD_LIMIT);
  position.z = THREE.MathUtils.clamp(position.z, -WORLD_LIMIT, WORLD_LIMIT);
}

function lerpAngle(a, b, t) {
  const delta = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + delta * t;
}

function randomRange(min, max) {
  const r = duelRng && isDuelLevel() ? duelRng() : Math.random();
  return min + r * (max - min);
}
