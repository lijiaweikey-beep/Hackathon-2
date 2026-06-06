import * as THREE from "three";

const NPC_COUNT = 20;
const WORLD_LIMIT = 10.8;
const HIT_RANGE = 1.85;
const HIT_PAIR_RANGE = 2.15;
const HIT_FACING_DOT = 0.12;
const PLAYER_SPEED = 3;
const NPC_SPEED = 3;
const ROUND_SECONDS = 90;
const ATTEMPTS = 3;
const PLAYER_LERP = 0.88; // 玩家移动响应插值（1=即时，越小越延迟）
const ACTOR_COLLISION_RADIUS = 0.38;
const TEMPLE_MOON_RADIUS = 4.55;
const TEMPLE_SHADOW_FADE = 0.55;
const TEMPLE_DECOY_SHADOW_STYLES = ["fan", "moon", "window", "stone", "leaf", "willow"];
const TEMPLE_TRUE_SHADOW_MAX = 0.68;
const TEMPLE_TRUE_REVEAL_AT = 0.75;
const TEMPLE_TRUE_INITIAL_MOON_DELAY = [12, 16];
const SU_SHI_SHADOW_PATTERN = [
  { x: -0.58, z: -0.08, length: 1.9, width: 0.12, rz: -0.72, opacity: 0.38, accent: false },
  { x: -0.34, z: 0.22, length: 1.55, width: 0.1, rz: -0.28, opacity: 0.33, accent: false },
  { x: 0.18, z: -0.16, length: 1.7, width: 0.1, rz: 0.42, opacity: 0.36, accent: false },
  { x: 0.48, z: 0.18, length: 1.35, width: 0.09, rz: 0.88, opacity: 0.31, accent: false },
  { x: -0.1, z: 0.0, length: 1.25, width: 0.08, rz: 1.36, opacity: 0.28, accent: false },
  { x: 0.05, z: 0.32, length: 0.92, width: 0.075, rz: -1.25, opacity: 0.27, accent: false },
  { x: -0.44, z: -0.32, length: 0.98, width: 0.075, rz: 1.08, opacity: 0.27, accent: false },
  { x: -0.02, z: 0.02, length: 1.05, width: 0.055, rz: -0.72, opacity: 0.28, accent: true },
  { x: 0.04, z: 0.0, length: 0.92, width: 0.055, rz: 0.74, opacity: 0.24, accent: true },
];
const BLOODMOON_SANITY_MAX = 100;
const BLOODMOON_WOLF_COOLDOWN = 0.28;
const BLOODMOON_NPC_HIT_RANGE = 1.45;
const BLOODMOON_NPC_HIT_DAMAGE = 18;
const BLOODMOON_LIGHTNING_INTERVAL = [2.6, 4.2];
const BLOODMOON_CLUE_SECONDS = 1.35;
const BLOODMOON_DECOY_CUES = 3;
const BLOODMOON_HUNT_SECONDS = 20;
const BLOODMOON_PHASE2_HP_MAX = 3;
const BLOODMOON_SUMMON_COUNT = 10;
const BLOODMOON_SAFE_ZONE_COUNT = 3;
const BLOODMOON_GUARD_SPEED = 2.0;
const BLOODMOON_GUARD_DAMAGE = 24;
const BLOODMOON_HUNT_INTRO_SECONDS = 2.8;

const LEVELS = [
  {
    id: "gaming",
    sceneName: "凌晨三点",
    emoji: "🌙",
    cardDesc: "在 20 人中找到凌晨三点还在打游戏的人",
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
    cardDesc: "在 20 人中找到图书馆里亲嘴的情侣",
    mission: "图书馆里有一对情侣在亲嘴，太辣眼睛了！",
    clue: "目标特征：两个人贴在一起，嘴上有口红印",
    targetDesc: "亲嘴的情侣",
    difficulty: 3,
    success: "精准命中，图书馆恢复了该有的安静。",
    failure: "这对情侣亲爽了",
    lighting: "library",
  },
  {
    id: "temple",
    sceneName: "承天寺夜游",
    emoji: "🌕",
    cardDesc: "在 20 个苏轼影分身里找出真正吵醒怀民的苏轼",
    mission: "苏轼夜半叫醒张怀民，又把中庭所有人都变成苏轼的样子。先找到自己，再找出真正的苏轼。",
    hudMission: "观察月下显形线索，找出真正的苏轼。",
    clue: "目标特征：会在月色最亮的中庭停留，脚下竹柏影会像藻荇一样交横聚拢",
    hudClue: "目标特征：月光中庭停留时，脚下会聚起交横竹柏影",
    targetDesc: "真正的苏轼",
    difficulty: 3,
    success: "精准命中，怀民终于能回去睡觉了。",
    failure: "苏轼月下散步爽了，怀民彻底睡不着了",
    lighting: "night",
  },
  {
    id: "bloodmoon",
    sceneName: "血月街区",
    emoji: "🌕",
    cardDesc: "为了你变成狼人，在雷暴里找出血月引路人",
    mission: "血月升起，你收到一句求救：“别让我在血月里认不出你。”为了赶到对方身边，你主动踏进血月，变成狼人模样。找出伪装在人群里的血月引路人，击倒他，解除狼化。",
    hudMission: "为了你，我变成狼人模样。找出血月引路人。",
    clue: "电光照亮时，真正的血月引路人脚下会露出狼爪影",
    hudClue: "电光照亮时，真正的血月引路人脚下会露出狼爪影。",
    targetDesc: "血月引路人",
    difficulty: 3,
    success: "血月退潮，你终于把自己的影子从狼形里拽了回来。",
    failure: "雷声盖过了那句求救，整条街都开始长出狼影。",
    lighting: "bloodmoon",
  },
];

const canvas = document.querySelector("#gameCanvas");
const ui = {
  hud: document.querySelector("#hud"),
  missionStrip: document.querySelector(".mission-strip"),
  sceneName: document.querySelector("#sceneName"),
  missionText: document.querySelector("#missionText"),
  missionToggleButton: document.querySelector("#missionToggleButton"),
  timerText: document.querySelector("#timerText"),
  attemptText: document.querySelector("#attemptText"),
  attemptLabel: document.querySelector(".status-chip.danger .status-label"),
  attemptChip: document.querySelector(".status-chip.danger"),
  clueBar: document.querySelector("#clueBar"),
  mechanicHint: document.querySelector("#mechanicHint"),
  levelSelectModal: document.querySelector("#levelSelectModal"),
  levelCards: document.querySelector("#levelCards"),
  taskModal: document.querySelector("#taskModal"),
  taskEmoji: document.querySelector("#taskEmoji"),
  taskTitle: document.querySelector("#taskTitle"),
  taskCopy: document.querySelector("#taskCopy"),
  taskClue: document.querySelector("#taskClue"),
  taskTime: document.querySelector("#taskTime"),
  taskAttempts: document.querySelector("#taskAttempts"),
  taskAttemptsChip: document.querySelector("#taskAttempts").parentElement,
  targetPreviewCanvas: document.querySelector("#targetPreviewCanvas"),
  targetLabel: document.querySelector("#targetLabel"),
  startButton: document.querySelector("#startButton"),
  resultModal: document.querySelector("#resultModal"),
  resultRating: document.querySelector("#resultRating"),
  resultTitle: document.querySelector("#resultTitle"),
  resultCopy: document.querySelector("#resultCopy"),
  statTime: document.querySelector("#statTime"),
  statAttempts: document.querySelector("#statAttempts"),
  retryButton: document.querySelector("#retryButton"),
  backToSelectButton: document.querySelector("#backToSelectButton"),
  pauseButton: document.querySelector("#pauseButton"),
  pauseModal: document.querySelector("#pauseModal"),
  resumeButton: document.querySelector("#resumeButton"),
  backFromPauseButton: document.querySelector("#backFromPauseButton"),
  backFromTaskButton: document.querySelector("#backFromTaskButton"),
  joystick: document.querySelector("#joystick"),
  joystickKnob: document.querySelector("#joystickKnob"),
  attackButton: document.querySelector("#attackButton"),
  attackIcon: document.querySelector("#attackButton span"),
  cooldownOverlay: document.querySelector("#cooldownOverlay"),
  huntIntro: null,
  huntCard: null,
};

let renderer;
let scene;
let camera;
let clock;
let player;
let currentLevelIndex = 0;
let levelState;
let npcs = [];
let particles = [];
let gameStatus = "briefing";
let missionCardCollapsed = false;
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

  const bg = level.id === "bloodmoon" ? 0x21060b : level.lighting === "night" ? 0x0c1424 : 0xd0dce8;
  previewScene.background = new THREE.Color(bg);

  if (level.id === "gaming") {
    const npc = createNpc(0, { gamingTarget: true });
    setBlackEye(npc, 1);
    previewScene.add(npc.group);
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
  } else if (level.id === "temple") {
    const cue = createSuShiShadowCue(1);
    cue.position.set(0, 0.045, 0.08);
    previewScene.add(cue);

    const npc = createTemplePerson("bamboo", 0);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  } else {
    const cue = createBloodmoonClawCue(1);
    cue.position.set(0, 0.045, 0.16);
    previewScene.add(cue);

    const npc = createLowPolyPerson(LOW_POLY_NPC_PALETTES[2]);
    npc.group.rotation.y = -0.35;
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

/* ---- 关卡选择 ---- */
function buildLevelCards() {
  ui.levelCards.innerHTML = "";
  LEVELS.forEach((level, i) => {
    const best = getBestScore(level.id);
    const stars = "★".repeat(level.difficulty) + "☆".repeat(3 - level.difficulty);
    const bestText = best ? `${best.grade} · ${best.time}s` : "--";

    const card = document.createElement("button");
    card.className = "level-card";
    card.type = "button";
    card.innerHTML = `
      <div class="level-card-icon">${level.emoji}</div>
      <div class="level-card-body">
        <div class="level-card-name">${level.sceneName}</div>
        <div class="level-card-desc">${level.cardDesc}</div>
        <div class="level-card-meta">
          <span>难度 ${stars}</span>
          <span>最佳 <span class="best">${bestText}</span></span>
        </div>
      </div>
      <div class="level-card-arrow">›</div>
    `;
    card.addEventListener("click", () => selectLevel(i));
    ui.levelCards.appendChild(card);
  });
}

function showLevelSelect() {
  disposeScene();
  scene = null;
  gameStatus = "levelSelect";
  ui.hud.classList.remove("bloodmoon-mode", "bloodmoon-hit");
  ui.hud.classList.remove("bloodmoon-lightning");
  ui.huntIntro?.classList.remove("visible");
  ui.huntCard?.classList.remove("visible");
  ui.attackButton.classList.remove("bloodmoon");
  ui.sceneName.classList.remove("bloodmoon-text");
  ui.clueBar.classList.remove("bloodmoon");
  ui.attemptChip.classList.remove("bloodmoon");
  buildLevelCards();
  ui.levelSelectModal.classList.add("visible");
  ui.taskModal.classList.remove("visible");
  ui.resultModal.classList.remove("visible");
}

function selectLevel(index) {
  ui.levelSelectModal.classList.remove("visible");
  resetLevel(index);
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
  playNoise(0.08, 0.25);
  playTone(180, 0.1, "sawtooth", 0.2);
}

function sfxWolfPunch() {
  ensureAudio();
  playNoise(0.06, 0.2);
  playTone(120, 0.08, "sawtooth", 0.18, -120);
  playTone(420, 0.05, "square", 0.12);
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

function sfxNpcHit() {
  ensureAudio();
  playTone(90, 0.18, "square", 0.18);
  playTone(760, 0.08, "sine", 0.08);
  playNoise(0.1, 0.18);
}

function sfxWolfHowl() {
  ensureAudio();
  playTone(96, 0.5, "sawtooth", 0.14, -80);
  setTimeout(() => playTone(144, 0.42, "sine", 0.12, -40), 120);
}

function sfxThunder() {
  ensureAudio();
  playTone(42, 0.55, "sawtooth", 0.22);
  playNoise(0.52, 0.28);
  setTimeout(() => playTone(58, 0.36, "triangle", 0.15), 90);
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
const cameraBasePos = new THREE.Vector3(0, 19.5, 17.2);

function triggerHitstop(duration) {
  hitstopTimer = Math.max(hitstopTimer, duration);
}

function triggerShake(intensity, duration) {
  shakeIntensity = intensity;
  shakeTimer = duration;
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

  ui.startButton.addEventListener("click", () => {
    if (gameStatus !== "briefing") return;
    gameStatus = "playing";
    levelState.startTime = totalTime;
    ui.taskModal.classList.remove("visible");
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

  ui.missionToggleButton.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  ui.missionToggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    missionCardCollapsed = !missionCardCollapsed;
    updateMissionCardCollapse();
  });

  ui.retryButton.addEventListener("click", () => resetLevel(currentLevelIndex));
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
}

function updateMissionCardCollapse() {
  ui.missionStrip.classList.toggle("collapsed", missionCardCollapsed);
  ui.missionToggleButton.textContent = missionCardCollapsed ? "⌄" : "⌃";
  ui.missionToggleButton.setAttribute("aria-expanded", missionCardCollapsed ? "false" : "true");
  ui.missionToggleButton.setAttribute("aria-label", missionCardCollapsed ? "展开任务卡片" : "收起任务卡片");
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
    if (event.code === "KeyW" || event.code === "ArrowUp") input.keys.y = -1;
    if (event.code === "KeyS" || event.code === "ArrowDown") input.keys.y = 1;
    if (event.code === "KeyA" || event.code === "ArrowLeft") input.keys.x = -1;
    if (event.code === "KeyD" || event.code === "ArrowRight") input.keys.x = 1;
    if (event.code === "Space" || event.code === "KeyJ") triggerAttack();
  });

  window.addEventListener("keyup", (event) => {
    if ((event.code === "KeyW" || event.code === "ArrowUp") && input.keys.y < 0) input.keys.y = 0;
    if ((event.code === "KeyS" || event.code === "ArrowDown") && input.keys.y > 0) input.keys.y = 0;
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
  input.joystick.set(knobX / max, knobY / max);
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

function resetLevel(index) {
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
  totalTime = 0;
  hitstopTimer = 0;
  shakeTimer = 0;
  playerInputVel.set(0, 0);
  missionCardCollapsed = false;
  updateMissionCardCollapse();
  gameStatus = "briefing";

  levelState = {
    level,
    remaining: ROUND_SECONDS,
    attempts: ATTEMPTS,
    sanity: BLOODMOON_SANITY_MAX,
    playerInvuln: 0,
    hostility: 1,
    computers: [],
    pair: null,
    startTime: 0,
    obstacles: [],
    bloodmoon: null,
  };

  buildWorld(level);
  player = createPlayer();
  player.group.position.copy(randomOpenPosition());
  scene.add(player.group);
  spawnNpcs(level);
  updateHud();
  showTask();
}

function showTask() {
  const level = levelState.level;
  ui.taskEmoji.textContent = level.emoji;
  ui.taskTitle.textContent = level.sceneName;
  ui.taskCopy.textContent = level.mission;
  ui.taskClue.textContent = "🔍 " + level.clue;
  ui.taskTime.textContent = ROUND_SECONDS;
  ui.taskAttemptsChip.textContent = level.id === "bloodmoon" ? `理智 ${BLOODMOON_SANITY_MAX}` : `🥊 ${ATTEMPTS} 次机会`;
  ui.targetLabel.textContent = level.targetDesc;
  ui.levelSelectModal.classList.remove("visible");
  ui.taskModal.classList.add("visible");
  ui.resultModal.classList.remove("visible");

  // 渲染 3D 目标预览
  renderTargetPreview(level);
}

function buildWorld(level) {
  const isBloodmoon = level.id === "bloodmoon";
  const isNight = level.lighting === "night" || isBloodmoon;
  scene.background = new THREE.Color(isBloodmoon ? 0x21060b : isNight ? 0x0c1320 : 0xb9d6e7);
  scene.fog = new THREE.Fog(isBloodmoon ? 0x3b0710 : isNight ? 0x0c1320 : 0xc8e3f0, 16, isBloodmoon ? 30 : 35);

  const hemi = new THREE.HemisphereLight(
    isBloodmoon ? 0x6d1a25 : isNight ? 0x3a4d6b : 0xffffff,
    isBloodmoon ? 0x120406 : isNight ? 0x0a0e16 : 0xa98f6b,
    isBloodmoon ? 0.95 : isNight ? 1.2 : 1.42,
  );
  scene.add(hemi);

  // 夜间场景补一盏环境光，让角色轮廓更清晰
  if (isNight) {
    const ambient = new THREE.AmbientLight(isBloodmoon ? 0x6f1720 : 0x4466aa, isBloodmoon ? 0.52 : 0.35);
    scene.add(ambient);
  }

  const sun = new THREE.DirectionalLight(isBloodmoon ? 0xff6b6b : isNight ? 0x9fc4ff : 0xfff7d6, isBloodmoon ? 1.55 : isNight ? 1.3 : 1.65);
  sun.position.set(-5, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  scene.add(sun);

  const floorTex = getCachedTexture(textureCache.floor, level.id, () => makeFloorTexture(level.id));
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
  } else if (level.id === "library") {
    buildLibrary();
  } else if (level.id === "bloodmoon") {
    buildBloodmoonStreet(sun);
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
  } else if (kind === "bloodmoon") {
    const gradient = ctx.createRadialGradient(512, 500, 80, 512, 500, 720);
    gradient.addColorStop(0, "#3f0b12");
    gradient.addColorStop(0.52, "#1f1218");
    gradient.addColorStop(1, "#09080d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);

    ctx.fillStyle = "rgba(248, 113, 113, 0.12)";
    for (let y = 0; y < 1024; y += 92) {
      ctx.fillRect(0, y + 34, 1024, 10);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 5;
    for (let x = -120; x < 1120; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 260, 1024);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(185, 28, 28, 0.24)";
    for (let i = 0; i < 12; i += 1) {
      const x = 70 + i * 82;
      const y = 120 + Math.sin(i * 1.7) * 90 + (i % 3) * 190;
      ctx.beginPath();
      ctx.ellipse(x, y, 42 + (i % 4) * 16, 16 + (i % 3) * 10, Math.sin(i) * 0.7, 0, Math.PI * 2);
      ctx.fill();
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

  levelState.temple.shadowCue = createSuShiShadowCue(0);
  scene.add(levelState.temple.shadowCue);
}

function buildBloodmoonStreet(baseLight) {
  levelState.bloodmoon = {
    lightningTimer: randomRange(BLOODMOON_LIGHTNING_INTERVAL[0], BLOODMOON_LIGHTNING_INTERVAL[1]),
    lightningFlash: 0,
    clueTimer: 0,
    revealCount: 0,
    targetCue: createBloodmoonClawCue(0),
    decoyCues: [],
    mode: "phase1",
    huntTimer: 0,
    safeZones: [],
    safeZoneVisuals: [],
    safeZoneRadius: 2.35,
    cutsceneTimer: 0,
    huntBriefingShown: false,
    bossHp: BLOODMOON_PHASE2_HP_MAX,
    summonWave: 0,
    nextNpcId: NPC_COUNT,
    baseLight,
    lightningLight: null,
    lightningBolts: [],
    moonMaterial: null,
  };

  const wallTex = getCachedTexture(textureCache.wall, "bloodmoon", () => makeWallTexture("bloodmoon"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x5f111b,
    roughness: 0.76,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(0, 11.8, Math.PI, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const lightningLight = new THREE.PointLight(0xdbeafe, 0, 28);
  lightningLight.position.set(-3, 9.4, -2);
  scene.add(lightningLight);
  levelState.bloodmoon.lightningLight = lightningLight;

  levelState.bloodmoon.lightningBolts = [
    createLightningBolt(-5.4, -11.72, 1.25, 4.9, 0.22),
    createLightningBolt(1.4, -11.73, 1.6, 5.5, -0.12),
    createLightningBolt(5.4, -11.74, 1.1, 4.2, 0.34),
  ];
  levelState.bloodmoon.lightningBolts.forEach((bolt) => {
    bolt.visible = false;
    scene.add(bolt);
  });

  for (let i = 0; i < BLOODMOON_DECOY_CUES; i += 1) {
    const cue = createBloodmoonClawCue(0);
    cue.userData.isDecoyCue = true;
    cue.userData.decoyNpc = null;
    cue.userData.decoyCompleteness = 0.45;
    levelState.bloodmoon.decoyCues.push(cue);
    scene.add(cue);
  }

  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xd41f2f, transparent: true, opacity: 0.88 });
  const moonDisk = new THREE.Mesh(new THREE.CircleGeometry(1.35, 48), moonMaterial);
  moonDisk.position.set(7.2, 5.25, -11.75);
  scene.add(moonDisk);
  levelState.bloodmoon.moonMaterial = moonMaterial;

  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 48),
    new THREE.MeshBasicMaterial({ color: 0x7f1018, transparent: true, opacity: 0.26, depthWrite: false }),
  );
  moonHalo.position.set(7.2, 5.25, -11.77);
  scene.add(moonHalo);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.34, metalness: 0.1 });
  const road = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.045, 24), roadMat);
  road.position.set(0, 0.025, 0);
  road.receiveShadow = true;
  scene.add(road);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffc9c9, transparent: true, opacity: 0.18 });
  for (let z = -8.8; z <= 8.8; z += 3.2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 1.45), lineMat);
    line.position.set(0, 0.066, z);
    scene.add(line);
  }

  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x171018, roughness: 0.86 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x4f0b14,
    emissive: 0x7f1018,
    emissiveIntensity: 0.42,
    roughness: 0.42,
  });
  [
    [-8.5, -6.8, 2.3, 3.7, 3.2],
    [-8.8, -1.2, 2.0, 3.1, 2.8],
    [-8.1, 4.7, 2.7, 4.0, 3.6],
    [8.4, -5.8, 2.6, 3.4, 3.4],
    [8.8, 0.0, 2.1, 3.9, 3.0],
    [8.0, 6.0, 2.8, 3.2, 3.8],
  ].forEach(([x, z, w, d, h], index) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
    block.position.set(x, h / 2, z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    registerObstacle(x, z, w / 2, d / 2);

    for (let i = 0; i < 3; i += 1) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.035), windowMat.clone());
      window.position.set(x + (x < 0 ? w / 2 + 0.02 : -w / 2 - 0.02), 0.85 + i * 0.72, z - d * 0.24 + (index % 2) * 0.42);
      window.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(window);
    }
  });

  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x5e1018,
    emissive: 0x33040a,
    emissiveIntensity: 0.24,
    roughness: 0.16,
    metalness: 0.28,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });
  [
    [-3.9, -6.4, 1.2, 0.44, 0.24],
    [3.6, -2.6, 1.4, 0.52, -0.38],
    [-3.4, 2.8, 1.0, 0.38, 0.7],
    [3.9, 6.3, 1.45, 0.5, -0.2],
  ].forEach(([x, z, sx, sz, rz]) => {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), puddleMat.clone());
    puddle.rotation.x = -Math.PI / 2;
    puddle.rotation.z = rz;
    puddle.scale.set(sx, sz, 1);
    puddle.position.set(x, 0.071, z);
    scene.add(puddle);
  });

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x23212a, roughness: 0.7 });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd3d3,
    emissive: 0xff2a3d,
    emissiveIntensity: 1.1,
    roughness: 0.35,
  });
  [
    [-5.1, -8.0],
    [5.1, -4.1],
    [-5.1, 1.2],
    [5.1, 5.9],
  ].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.1, 8), lampMat);
    pole.position.set(x, 1.05, z);
    pole.castShadow = true;
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.34), lampGlowMat.clone());
    head.position.set(x, 2.18, z);
    scene.add(head);
    const glow = new THREE.PointLight(0xff3347, 0.65, 5);
    glow.position.set(x, 2.2, z);
    scene.add(glow);
    registerObstacle(x, z, 0.18, 0.18);
  });

  scene.add(levelState.bloodmoon.targetCue);

  for (let i = 0; i < BLOODMOON_SAFE_ZONE_COUNT; i += 1) {
    const safeZoneMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const safeZoneMesh = new THREE.Mesh(new THREE.CircleGeometry(2.35, 48), safeZoneMat);
    safeZoneMesh.rotation.x = -Math.PI / 2;
    safeZoneMesh.position.y = 0.105;
    safeZoneMesh.renderOrder = 14;
    safeZoneMesh.visible = false;
    scene.add(safeZoneMesh);

    const safeZoneRing = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.45, 48),
      new THREE.MeshBasicMaterial({ color: 0xbbf7d0, transparent: true, opacity: 0, depthWrite: false }),
    );
    safeZoneRing.rotation.x = -Math.PI / 2;
    safeZoneRing.position.y = 0.112;
    safeZoneRing.renderOrder = 15;
    safeZoneRing.visible = false;
    scene.add(safeZoneRing);
    levelState.bloodmoon.safeZoneVisuals.push({ mesh: safeZoneMesh, ring: safeZoneRing });
  }
}

function createLightningBolt(x, z, width, height, tilt) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = tilt;
  group.userData.segments = [];

  const material = new THREE.MeshBasicMaterial({
    color: 0xeef6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });

  let px = 0;
  let py = height;
  const points = [[px, py]];
  for (let i = 1; i <= 7; i += 1) {
    px += randomRange(-width, width) * 0.42;
    py = height - (height / 7) * i;
    points.push([px, py]);
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dx, dy);
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.08, length), material.clone());
    seg.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    seg.rotation.z = -angle;
    seg.renderOrder = 20;
    group.add(seg);
    group.userData.segments.push(seg);

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, length), glowMaterial.clone());
    glow.position.copy(seg.position);
    glow.rotation.copy(seg.rotation);
    glow.renderOrder = 19;
    group.add(glow);
    group.userData.segments.push(glow);
  }

  return group;
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

function createSuShiShadowCue(intensity = 0) {
  const group = new THREE.Group();
  group.visible = intensity > 0;
  group.userData.shadowMeshes = [];

  SU_SHI_SHADOW_PATTERN.forEach(({ x, z, length, width, rz, opacity, accent }) => {
    const material = new THREE.MeshBasicMaterial({
      color: accent ? 0x5eead4 : 0x12352f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rz;
    mesh.position.set(x, accent ? 0.006 : 0, z);
    mesh.renderOrder = accent ? 7 : 4;
    mesh.userData.baseOpacity = opacity;
    group.add(mesh);
    group.userData.shadowMeshes.push(mesh);
  });

  const poolMaterial = new THREE.MeshBasicMaterial({
    color: 0x0f2f2a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.64, 24), poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -0.002;
  pool.scale.set(1.35, 0.58, 1);
  pool.renderOrder = 3;
  pool.userData.baseOpacity = 0.15;
  group.add(pool);
  group.userData.shadowMeshes.push(pool);

  setShadowCueIntensity(group, intensity);
  return group;
}

function createBloodmoonClawCue(intensity = 0) {
  const group = new THREE.Group();
  group.visible = intensity > 0;
  group.userData.shadowMeshes = [];

  const material = new THREE.MeshBasicMaterial({
    color: 0x040204,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const bloodGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff3145,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });

  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.82, 32), bloodGlowMat.clone());
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(0, 0.008, 0.06);
  halo.scale.set(1.12, 0.78, 1);
  halo.renderOrder = 9;
  halo.userData.baseOpacity = 0.34;
  halo.userData.part = "halo";
  group.add(halo);
  group.userData.shadowMeshes.push(halo);

  const palm = new THREE.Mesh(new THREE.CircleGeometry(0.52, 24), material.clone());
  palm.rotation.x = -Math.PI / 2;
  palm.scale.set(1.0, 0.74, 1);
  palm.position.set(0, 0.01, 0.08);
  palm.renderOrder = 10;
  palm.userData.baseOpacity = 0.68;
  palm.userData.part = "palm";
  group.add(palm);
  group.userData.shadowMeshes.push(palm);

  [-0.3, -0.1, 0.1, 0.3].forEach((x, i) => {
    const toe = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.58 + i * 0.03, 3), material.clone());
    toe.rotation.x = -Math.PI / 2;
    toe.rotation.z = (x * -0.8);
    toe.position.set(x, 0.012, -0.46 - Math.abs(x) * 0.1);
    toe.scale.set(0.72, 1, 0.8);
    toe.renderOrder = 11;
    toe.userData.baseOpacity = 0.78;
    toe.userData.part = "toe";
    toe.userData.partIndex = i;
    group.add(toe);
    group.userData.shadowMeshes.push(toe);
  });

  const slashMat = new THREE.MeshBasicMaterial({
    color: 0xffedf0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  [-0.26, 0, 0.26].forEach((x, i) => {
    const slash = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.04), slashMat.clone());
    slash.rotation.x = -Math.PI / 2;
    slash.rotation.z = -0.36 + i * 0.36;
    slash.position.set(x, 0.018, -0.02);
    slash.renderOrder = 12;
    slash.userData.baseOpacity = 0.56;
    slash.userData.part = "slash";
    slash.userData.partIndex = i;
    group.add(slash);
    group.userData.shadowMeshes.push(slash);
  });

  setBloodmoonClawIntensity(group, intensity);
  return group;
}

function setBloodmoonClawIntensity(group, intensity, pulse = 1, completeness = 1) {
  const level = THREE.MathUtils.clamp(intensity, 0, 1);
  const complete = THREE.MathUtils.clamp(completeness, 0, 1);
  group.visible = level > 0.02;
  const jitter = group.userData.isDecoyCue ? Math.sin(totalTime * 18 + (group.userData.seed ?? 0)) * 0.07 : 0;
  group.scale.setScalar(1.18 + level * (0.3 + complete * 0.28) + jitter);
  group.userData.shadowMeshes?.forEach((mesh) => {
    let partFactor = 1;
    if (mesh.userData.part === "palm") partFactor = complete >= 0.34 ? 1 : 0.18;
    if (mesh.userData.part === "toe") partFactor = complete >= (0.42 + mesh.userData.partIndex * 0.12) ? 1 : 0;
    if (mesh.userData.part === "slash") partFactor = complete >= (0.74 + mesh.userData.partIndex * 0.08) ? 1 : 0;
    if (group.userData.isDecoyCue && mesh.userData.part === "toe" && mesh.userData.partIndex === group.userData.missingToe) partFactor = 0;
    mesh.material.opacity = mesh.userData.baseOpacity * level * pulse * partFactor;
  });
}

function positionBloodmoonCue(group, npc) {
  if (!group || !npc) return;
  const facing = getFacingVector(npc.group.rotation.y);
  group.position.set(npc.group.position.x - facing.x * 0.26, 0.092, npc.group.position.z - facing.y * 0.26);
  group.rotation.y = npc.group.rotation.y * 0.08;
}

function setShadowCueIntensity(group, intensity, pulse = 1) {
  const level = THREE.MathUtils.clamp(intensity, 0, 1);
  group.visible = level > 0.02;
  group.scale.setScalar(0.9 + level * 0.22);
  group.userData.shadowMeshes?.forEach((mesh) => {
    mesh.material.opacity = mesh.userData.baseOpacity * level * pulse;
  });
}

function renderSuShiShadowMarkHtml() {
  const scale = 22;
  return `<span class="shadow-mark" aria-hidden="true">${SU_SHI_SHADOW_PATTERN.map((line) => {
    const left = 34 + line.x * scale - (line.width * scale) / 2;
    const top = 26 + line.z * scale - (line.length * scale) / 2;
    const width = Math.max(3, line.width * scale);
    const height = line.length * scale;
    const className = line.accent ? "shadow-line accent" : "shadow-line";
    return `<i class="${className}" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${width.toFixed(1)}px;height:${height.toFixed(1)}px;transform:rotate(${line.rz.toFixed(3)}rad);opacity:${line.opacity.toFixed(2)}"></i>`;
  }).join("")}</span>`;
}

function positionShadowCue(group, npc) {
  if (!group || !npc) return;
  const facing = getFacingVector(npc.group.rotation.y);
  group.position.set(
    npc.group.position.x - facing.x * 0.18,
    0.062,
    npc.group.position.z - facing.y * 0.18,
  );
  group.rotation.y = npc.group.rotation.y * 0.08;
}

function getTempleMoonInfluence(position) {
  const moonPoint = levelState?.temple?.moonPoint;
  if (!moonPoint) return 0;
  const distance = Math.hypot(position.x - moonPoint.x, position.z - moonPoint.z);
  return THREE.MathUtils.clamp((TEMPLE_MOON_RADIUS - distance) / TEMPLE_SHADOW_FADE, 0, 1);
}

function makeShadowMaterial(opacity = 0) {
  return new THREE.MeshBasicMaterial({
    color: 0x12352f,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
  });
}

function addShadowMesh(group, geometry, x, z, rz, baseOpacity, scaleX = 1, scaleZ = 1) {
  const mesh = new THREE.Mesh(geometry, makeShadowMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rz;
  mesh.position.set(x, 0.026, z);
  mesh.scale.set(scaleX, scaleZ, 1);
  mesh.renderOrder = 3;
  mesh.userData.baseOpacity = baseOpacity;
  group.add(mesh);
  group.userData.shadowMeshes.push(mesh);
}

function createTempleLocalShadow(style = "bamboo", seed = 0) {
  const group = new THREE.Group();
  group.visible = false;
  group.userData.shadowMeshes = [];

  const sway = Math.sin(seed * 1.73) * 0.12;

  if (style === "bamboo") {
    SU_SHI_SHADOW_PATTERN.forEach(({ x, z, length, width, rz, opacity }) => {
      addShadowMesh(group, new THREE.PlaneGeometry(width, length), x, z, rz, opacity);
    });
  } else if (style === "fan") {
    addShadowMesh(group, new THREE.CircleGeometry(0.74, 24, 0.1, Math.PI * 0.86), -0.1, -0.12, -0.72 + sway, 0.3, 1.35, 0.72);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.38), -0.18, 0.02, -0.96, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.05, 1.18), 0.04, 0.03, -0.55, 0.16);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.92), 0.25, 0.04, -0.18, 0.14);
  } else if (style === "moon") {
    addShadowMesh(group, new THREE.RingGeometry(0.48, 0.68, 28, 2, -0.35, Math.PI * 1.35), 0, 0.02, 0.34 + sway, 0.32, 1.25, 0.72);
    addShadowMesh(group, new THREE.RingGeometry(0.3, 0.38, 20, 2, 0.2, Math.PI * 1.05), 0.26, -0.08, -0.45, 0.18, 1.2, 0.7);
  } else if (style === "window") {
    addShadowMesh(group, new THREE.RingGeometry(0.56, 0.64, 4), 0, 0.02, Math.PI / 4 + sway, 0.26, 1.25, 0.82);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.28), 0, 0.02, 0.05 + sway, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.28), 0, 0.02, Math.PI / 2 + sway, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.98), -0.24, 0.0, 0.05 + sway, 0.14);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.98), 0.24, 0.0, 0.05 + sway, 0.14);
  } else if (style === "stone") {
    addShadowMesh(group, new THREE.CircleGeometry(0.62, 18), -0.06, 0.02, 0.1 + sway, 0.24, 1.45, 0.72);
    addShadowMesh(group, new THREE.CircleGeometry(0.32, 12), 0.42, -0.12, -0.2, 0.18, 1.25, 0.7);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.82), -0.22, 0.08, 0.86, 0.13);
    addShadowMesh(group, new THREE.PlaneGeometry(0.04, 0.72), 0.16, -0.04, -0.62, 0.12);
  } else if (style === "leaf") {
    addShadowMesh(group, new THREE.CircleGeometry(0.56, 28), -0.08, 0.02, -0.28 + sway, 0.26, 0.82, 1.48);
    addShadowMesh(group, new THREE.PlaneGeometry(0.055, 1.28), -0.08, 0.02, -0.28 + sway, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.04, 0.62), 0.08, 0.2, 0.58, 0.12);
    addShadowMesh(group, new THREE.PlaneGeometry(0.04, 0.58), -0.26, -0.08, -1.04, 0.12);
  } else {
    addShadowMesh(group, new THREE.PlaneGeometry(0.08, 1.55), -0.34, 0.02, -0.12 + sway, 0.24);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.28), -0.08, 0.1, 0.08 + sway, 0.2);
    addShadowMesh(group, new THREE.PlaneGeometry(0.05, 1.06), 0.18, -0.02, 0.28 + sway, 0.17);
    addShadowMesh(group, new THREE.CircleGeometry(0.22, 12), 0.44, 0.18, 0.2, 0.12, 1.45, 0.52);
  }

  return group;
}

function setTempleLocalShadow(actor, influence, strength = 1, pulse = 1) {
  const data = actor?.group?.userData;
  if (!data?.groundShadow) return;
  const level = THREE.MathUtils.clamp(influence, 0, 1);
  const visible = level > 0.02;

  data.groundShadow.visible = visible;
  data.groundShadow.material.opacity = data.groundShadow.userData.baseOpacity * level * strength;

  if (data.localBambooShadow) {
    data.localBambooShadow.visible = visible;
    data.localBambooShadow.scale.setScalar(0.9 + level * 0.12);
  }

  data.localBambooShadow?.userData.shadowMeshes?.forEach((mesh) => {
    mesh.material.opacity = mesh.userData.baseOpacity * level * strength * pulse;
  });
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

function makeWallTexture(kind) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 1024;
  canvasTexture.height = 512;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = kind === "gaming" ? "#121b2d" : kind === "library" ? "#ead7b5" : kind === "bloodmoon" ? "#17070b" : "#7f90a2";
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
  } else if (kind === "bloodmoon") {
    ctx.fillStyle = "#241018";
    ctx.fillRect(0, 340, 1024, 28);
    ctx.fillStyle = "#12080d";
    for (let x = 30; x < 1024; x += 116) {
      const h = 190 + (x % 5) * 22;
      ctx.fillRect(x, 122 - (x % 3) * 14, 74, h);
      ctx.fillStyle = "rgba(248, 113, 113, 0.18)";
      for (let y = 152; y < 286; y += 48) {
        ctx.fillRect(x + 12, y, 18, 24);
        ctx.fillRect(x + 44, y + (x % 2) * 8, 18, 24);
      }
      ctx.fillStyle = "#12080d";
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(80 + i * 130, 30);
      ctx.lineTo(20 + i * 120, 330);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(127, 29, 29, 0.36)";
    for (let x = 0; x < 1024; x += 72) {
      ctx.fillRect(x, 376 + Math.sin(x) * 7, 36, 104);
    }
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

    for (let i = 1; i < NPC_COUNT; i += 1) {
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

    for (let i = 2; i < NPC_COUNT; i += 1) {
      addWanderNpc(i);
    }
  } else if (level.id === "temple") {
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

    for (let i = 1; i < NPC_COUNT; i += 1) {
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

    for (let i = 1; i < NPC_COUNT; i += 1) {
      addWanderNpc(i);
    }
  }

  // 从普通漫游 NPC 中随机选几个作为替身
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

/* ---- 替身 NPC 系统 ---- */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function initDecoy(npc, moonDisturber = false) {
  npc.isDecoy = true;
  npc.deoyState = "wander"; // "wander" | "confuse"
  npc.decoyTimer = randomRange(1.5, 3.5); // 当前状态剩余时间
  npc.decoyDir = new THREE.Vector2(); // 替身移动方向
  npc.isMoonDisturber = moonDisturber;
  npc.moonDisturbTimer = moonDisturber ? randomRange(12, 18) : 0;
  npc.moonDisturbWaypoint = null;
  pickDecoyDir(npc);
}

function initBloodmoonNpc(npc) {
  npc.alertTimer = randomRange(0.4, 2.6);
  npc.attackTimer = 0;
  npc.attackResolveTimer = 0;
  npc.attackCooldown = randomRange(0.7, 1.7);
  npc.hostility = npc.isBloodmoonTarget ? 1.15 : randomRange(0.82, 1.12);
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

const LOW_POLY_PLAYER_PALETTE = {
  jacket: 0x3ddc68,
  jacketDark: 0x2ab84f,
  shorts: 0xa16207,
  shortsDark: 0x854d0e,
  cap: 0x3b82f6,
  capAccent: 0xf97316,
  sock: 0x7dd3fc,
};

const LOW_POLY_WOLF_PALETTE = {
  jacket: 0x4b1418,
  jacketDark: 0x1f0a0d,
  shorts: 0x20202a,
  shortsDark: 0x111116,
  cap: 0x2b1014,
  capAccent: 0xef4444,
  sock: 0xfca5a5,
};

const LOW_POLY_NPC_PALETTES = [
  { jacket: 0x60a5fa, jacketDark: 0x2563eb, shorts: 0x57534e, shortsDark: 0x44403c, cap: 0xef4444, capAccent: 0xfbbf24, sock: 0xf9a8d4 },
  { jacket: 0xf472b6, jacketDark: 0xdb2777, shorts: 0x78350f, shortsDark: 0x57230a, cap: 0x8b5cf6, capAccent: 0x22d3ee, sock: 0xa5f3fc },
  { jacket: 0xfbbf24, jacketDark: 0xf59e0b, shorts: 0x1e40af, shortsDark: 0x1e3a8a, cap: 0x10b981, capAccent: 0xf43f5e, sock: 0xe2e8f0 },
  { jacket: 0xa78bfa, jacketDark: 0x7c3aed, shorts: 0x166534, shortsDark: 0x14532d, cap: 0x0ea5e9, capAccent: 0xfcd34d, sock: 0xbae6fd },
];

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

function decorateAsWerewolf(actor) {
  const data = actor.group.userData;
  const visual = data.visual;
  const furMat = makeLowPolyMat(0x1b0b0f, 0.78);
  const earInnerMat = makeLowPolyMat(0xef4444, 0.58);
  const clawMat = makeLowPolyMat(0xf8fafc, 0.42);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff3b4f, transparent: true, opacity: 0.32, depthWrite: false });

  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), furMat);
  leftEar.position.set(-0.2, 2.02, -0.02);
  leftEar.rotation.set(0.12, 0.26, -0.24);
  leftEar.castShadow = true;
  const rightEar = leftEar.clone();
  rightEar.material = furMat;
  rightEar.position.x = 0.2;
  rightEar.rotation.z = 0.24;
  visual.add(leftEar, rightEar);

  const wolfParts = [leftEar, rightEar];
  wolfParts.push(addFacetedBox(visual, 0.09, 0.16, 0.035, earInnerMat, -0.2, 1.99, 0.04, 0.1, 0.16, -0.2));
  wolfParts.push(addFacetedBox(visual, 0.09, 0.16, 0.035, earInnerMat, 0.2, 1.99, 0.04, 0.1, -0.16, 0.2));
  wolfParts.push(addFacetedBox(visual, 0.36, 0.12, 0.24, furMat, 0, 1.7, -0.14, 0.08, 0, 0));

  [-0.055, 0, 0.055].forEach((x, i) => {
    wolfParts.push(addFacetedBox(data.leftArm, 0.025, 0.18, 0.045, clawMat, x, -0.52, 0.09, -0.32, 0, -0.12 + i * 0.12));
    wolfParts.push(addFacetedBox(data.rightArm, 0.025, 0.18, 0.045, clawMat, x, -0.52, 0.09, -0.32, 0, -0.12 + i * 0.12));
  });

  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.35, 4, 1, true), glowMat);
  cape.position.set(0, 0.88, -0.52);
  cape.rotation.set(Math.PI * 0.5, Math.PI / 4, 0);
  cape.scale.set(0.72, 1.0, 0.28);
  visual.add(cape);
  wolfParts.push(cape);

  data.wolfCape = cape;
  data.wolfParts = wolfParts;
  data.colors = [0x4b1418, 0x20202a, 0xf0b88c, 0x1b0b0f, 0xef4444, 0xf8fafc];
  actor.isWerewolf = true;
  return actor;
}

function decorateAsWolfGuard(actor) {
  const data = actor.group.userData;
  const visual = data.visual;
  const armorMat = makeLowPolyMat(0x171717, 0.68);
  const furMat = makeLowPolyMat(0x2a0c12, 0.78);
  const redMat = makeLowPolyMat(0xdc2626, 0.5);
  const bladeMat = makeLowPolyMat(0xdbeafe, 0.34);
  const hiltMat = makeLowPolyMat(0x78350f, 0.64);

  const guardParts = [];
  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 4), furMat);
  leftEar.position.set(-0.22, 2.05, -0.02);
  leftEar.rotation.set(0.14, 0.26, -0.3);
  const rightEar = leftEar.clone();
  rightEar.material = furMat;
  rightEar.position.x = 0.22;
  rightEar.rotation.z = 0.3;
  visual.add(leftEar, rightEar);
  guardParts.push(leftEar, rightEar);

  guardParts.push(addFacetedBox(visual, 0.62, 0.18, 0.26, armorMat, 0, 1.22, 0.02));
  guardParts.push(addFacetedBox(visual, 0.28, 0.14, 0.1, redMat, 0, 1.28, 0.22));
  guardParts.push(addFacetedBox(visual, 0.44, 0.18, 0.26, furMat, 0, 1.72, -0.14, 0.08, 0, 0));

  const sword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 0.06), bladeMat);
  blade.position.y = 0.46;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), bladeMat);
  tip.position.y = 0.98;
  tip.rotation.z = Math.PI / 4;
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), hiltMat);
  hilt.position.y = 0.02;
  sword.add(blade, tip, hilt);
  sword.position.set(0.52, 0.86, 0.18);
  sword.rotation.set(-0.18, 0.18, -0.62);
  visual.add(sword);
  guardParts.push(sword);

  data.wolfParts = guardParts;
  data.wolfCape = null;
  data.colors = [0x171717, 0x2a0c12, 0xdc2626, 0xdbeafe, 0x78350f];
  actor.isWerewolf = false;
  return actor;
}

function createTemplePerson(shadowStyle = "fan", shadowSeed = 0) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.add(visual);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0b88c, roughness: 0.72 });
  const robeMat = new THREE.MeshStandardMaterial({ color: 0xc8d4dc, roughness: 0.76 });
  const robeDarkMat = new THREE.MeshStandardMaterial({ color: 0x8796a4, roughness: 0.82 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x57666f, roughness: 0.82 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.92 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xf7e9bc, roughness: 0.68 });
  const inkMat = new THREE.MeshBasicMaterial({ color: 0x3b2f2f, transparent: true, opacity: 0.62 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.62, 4, 12), robeMat);
  body.position.y = 0.86;
  body.castShadow = true;
  visual.add(body);

  const robeFront = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.035), robeDarkMat);
  robeFront.position.set(0, 0.74, 0.31);
  robeFront.castShadow = true;
  visual.add(robeFront);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.38), robeDarkMat);
  belt.position.set(0, 0.72, 0.03);
  belt.castShadow = true;
  visual.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 16), skinMat);
  head.position.y = 1.54;
  head.castShadow = true;
  visual.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 8), hairMat);
  hair.scale.set(1, 0.6, 1);
  hair.position.set(0, 1.68, -0.02);
  hair.castShadow = true;
  visual.add(hair);

  const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), hairMat);
  topknot.scale.set(0.85, 0.72, 0.85);
  topknot.position.set(0, 1.94, -0.02);
  topknot.castShadow = true;
  visual.add(topknot);

  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.04), hairMat);
  ribbon.position.set(0, 1.82, 0.1);
  ribbon.castShadow = true;
  visual.add(ribbon);

  const leftEye = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), eyeMat);
  leftEye.position.set(-0.115, 1.56, 0.314);
  const rightEye = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), eyeMat);
  rightEye.position.set(0.115, 1.56, 0.314);
  visual.add(leftEye, rightEye);

  const beardMat = new THREE.MeshBasicMaterial({ color: 0x221815, transparent: true, opacity: 0.92 });
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.014), beardMat);
  mustache.position.set(0, 1.45, 0.337);
  visual.add(mustache);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), beardMat.clone());
  beard.position.set(0, 1.33, 0.335);
  beard.rotation.x = Math.PI;
  visual.add(beard);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const armGeo = new THREE.CapsuleGeometry(0.07, 0.46, 3, 8);
  const armL = new THREE.Mesh(armGeo, skinMat);
  const armR = new THREE.Mesh(armGeo, skinMat);
  armL.position.y = -0.24;
  armR.position.y = -0.24;
  leftArm.add(armL);
  rightArm.add(armR);

  const sleeveGeo = new THREE.BoxGeometry(0.2, 0.34, 0.17);
  const sleeveL = new THREE.Mesh(sleeveGeo, robeDarkMat);
  const sleeveR = new THREE.Mesh(sleeveGeo, robeDarkMat);
  sleeveL.position.y = -0.22;
  sleeveR.position.y = -0.22;
  sleeveL.castShadow = true;
  sleeveR.castShadow = true;
  leftArm.add(sleeveL);
  rightArm.add(sleeveR);

  leftArm.position.set(-0.39, 1.06, 0.02);
  rightArm.position.set(0.39, 1.06, 0.02);
  leftArm.rotation.z = 0.38;
  rightArm.rotation.z = -0.38;
  visual.add(leftArm, rightArm);

  const scroll = new THREE.Group();
  const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.46, 12), paperMat);
  scrollRoll.rotation.z = Math.PI / 2;
  scrollRoll.castShadow = true;
  scroll.add(scrollRoll);
  const inkLine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.012), inkMat);
  inkLine.position.set(0, 0.052, 0);
  scroll.add(inkLine);
  scroll.position.set(0.5, 0.95, 0.26);
  scroll.rotation.set(0.18, 0.18, -0.38);
  visual.add(scroll);

  const legGeo = new THREE.CapsuleGeometry(0.08, 0.42, 3, 8);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14, 0.27, 0);
  rightLeg.position.set(0.14, 0.27, 0);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  visual.add(leftLeg, rightLeg);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshBasicMaterial({ color: 0x061814, transparent: true, opacity: 0, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.userData.baseOpacity = 0.16;
  group.add(shadow);

  const localBambooShadow = createTempleLocalShadow(shadowStyle, shadowSeed);
  group.add(localBambooShadow);

  visual.traverse((child) => {
    if (child.isMesh) child.castShadow = false;
  });

  group.userData = {
    visual,
    body,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    blackMarks: [],
    lipMarks: [],
    groundShadow: shadow,
    localBambooShadow,
    baseArmRotations: {
      leftZ: leftArm.rotation.z,
      rightZ: rightArm.rotation.z,
    },
    colors: [0xc8d4dc, 0x57666f, 0xf0b88c, 0x111827, 0xf7e9bc],
  };

  return { group };
}

function createPlayer() {
  const isTemple = levelState?.level?.id === "temple";
  const isBloodmoon = levelState?.level?.id === "bloodmoon";
  const actor = isTemple
    ? createTemplePerson("window", -1)
    : createLowPolyPerson(isBloodmoon ? LOW_POLY_WOLF_PALETTE : LOW_POLY_PLAYER_PALETTE);
  actor.speed = PLAYER_SPEED;
  actor.punchTimer = 0;
  actor.cheer = false;
  return isBloodmoon ? decorateAsWerewolf(actor) : actor;
}

function createNpc(id, flags) {
  const isTemple = flags.templeClone || flags.suShiTarget || levelState?.level?.id === "temple";
  const shadowStyle = flags.suShiTarget ? "bamboo" : TEMPLE_DECOY_SHADOW_STYLES[id % TEMPLE_DECOY_SHADOW_STYLES.length];
  let actor = isTemple ? createTemplePerson(shadowStyle, id) : createLowPolyPerson(flags.wolfGuard ? LOW_POLY_WOLF_PALETTE : LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length]);
  if (flags.wolfGuard) actor = decorateAsWolfGuard(actor);
  actor.id = id;
  actor.isGamingTarget = Boolean(flags.gamingTarget);
  actor.isLover = Boolean(flags.lover);
  actor.isSuShiTarget = Boolean(flags.suShiTarget);
  actor.isBloodmoonTarget = Boolean(flags.bloodmoonTarget);
  actor.isWolfGuard = Boolean(flags.wolfGuard);
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
    if (levelState.level.id === "bloodmoon") {
      updateBloodmoonHuntIntro(dt);
      if (levelState.bloodmoon?.mode === "huntIntro" || levelState.bloodmoon?.mode === "huntBriefing") {
        updateHud();
        updateParticles(dt);
        updateShake(dt);
        renderer.render(scene, camera);
        return;
      }
      updateBloodmoonStorm(dt);
      levelState.playerInvuln = Math.max(0, levelState.playerInvuln - dt);
      updateBloodmoonHunt(dt);
    }
    levelState.remaining = Math.max(0, levelState.remaining - dt);
    if (levelState.remaining <= 0) {
      finishRound(false);
    }
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
    player.group.position.z += playerInputVel.y * player.speed * dt;
    clampActorPosition(player.group.position, playerInputVel);
    const targetRotation = Math.atan2(playerInputVel.x, playerInputVel.y);
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
  const t = player.punchTimer > 0 ? Math.sin((player.punchTimer / 0.26) * Math.PI) : 0;
  const wolfBoost = player.isWerewolf ? 1.3 : 1;
  userData.rightArm.rotation.x = -1.4 * t * wolfBoost;
  userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 0.65 * t * wolfBoost;
  userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + 0.28 * t;
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

function updateNpcs(dt) {
  if (levelState.level.id === "bloodmoon") {
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
    gameStatus = "settling";
    window.setTimeout(() => finishRound(true), 760);
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
  if (!state || state.mode !== "hunt") return;
  const radius = state.safeZoneRadius;
  const playerSafe = isInsideAnyBloodmoonSafeZone(player.group.position, radius);

  if (!playerSafe) {
    levelState.sanity = 0;
    hideBloodmoonSafeZones();
    setPlayerWolfIdentity(true);
    triggerShake(0.55, 0.35);
    sfxLose();
    gameStatus = "settling";
    window.setTimeout(() => finishRound(false), 700);
    return;
  }

  npcs.forEach((npc) => {
    if (!npc.alive) return;
    const inside = isInsideAnyBloodmoonSafeZone(npc.group.position, radius);
    if (!inside && !npc.isBloodmoonTarget) dissolveNpc(npc);
  });

  hideBloodmoonSafeZones();
  setPlayerWolfIdentity(true);
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

  const toPlayer = new THREE.Vector2(player.group.position.x - npc.group.position.x, player.group.position.z - npc.group.position.z);
  const distance = toPlayer.length();
  if (prevResolveTimer > 0 && npc.attackResolveTimer <= 0) {
    resolveBloodmoonNpcHit(npc);
  }
  if (distance > BLOODMOON_NPC_HIT_RANGE || npc.attackCooldown > 0) return;

  const facing = getFacingVector(npc.group.rotation.y);
  const playerInFront = isFacingTarget(facing, toPlayer.clone());
  const pressure = levelState.hostility * npc.hostility;
  if (playerInFront && npc.alertTimer <= 0 && Math.random() < dt * 1.8 * pressure) {
    npc.attackTimer = 0.26;
    npc.attackResolveTimer = 0.12;
    npc.attackCooldown = randomRange(1.0, 1.7) / pressure;
    faceNpcToward(npc, player.group.position);
  }

}

function updateWolfGuard(npc, dt) {
  if (!player || !npc.alive) return;
  const waypoint = player.group.position.clone();
  const reached = moveNpcToward(npc, waypoint, npc.speed ?? BLOODMOON_GUARD_SPEED, dt);
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
  const toPlayer = new THREE.Vector2(player.group.position.x - npc.group.position.x, player.group.position.z - npc.group.position.z);
  if (toPlayer.length() > BLOODMOON_NPC_HIT_RANGE) return;
  if (!isFacingTarget(getFacingVector(npc.group.rotation.y), toPlayer)) return;

  levelState.sanity = Math.max(0, levelState.sanity - (npc.isWolfGuard ? BLOODMOON_GUARD_DAMAGE : BLOODMOON_NPC_HIT_DAMAGE));
  levelState.playerInvuln = 0.72;
  triggerShake(0.28, 0.2);
  sfxNpcHit();
  ui.hud.classList.add("bloodmoon-hit");
  window.setTimeout(() => ui.hud.classList.remove("bloodmoon-hit"), 180);
  updateHud();
  if (levelState.sanity <= 0) {
    gameStatus = "settling";
    window.setTimeout(() => finishRound(false), 620);
  }
}

function animateNpcPunchPose(npc) {
  const data = npc.group.userData;
  if (!data?.rightArm) return;
  const t = npc.attackTimer > 0 ? Math.sin((npc.attackTimer / 0.26) * Math.PI) : 0;
  if (t <= 0) return;
  data.rightArm.rotation.x = -1.15 * t;
  data.rightArm.rotation.z = data.baseArmRotations.rightZ - 0.48 * t;
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
    setBloodmoonClawIntensity(cue, intensity * 0.82, flicker, cue.userData.decoyCompleteness);
  });
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
  const isBloodmoon = levelState.level.id === "bloodmoon";
  if (isBloodmoon && ["huntIntro", "huntBriefing", "hunt"].includes(levelState.bloodmoon?.mode)) return;
  punchCooldownMax = isBloodmoon ? BLOODMOON_WOLF_COOLDOWN : PUNCH_COOLDOWNS[Math.min(punchTier, PUNCH_COOLDOWNS.length - 1)];
  punchCooldown = punchCooldownMax;
  if (!isBloodmoon) {
    punchTier += 1;
    punchResetTimer = PUNCH_RESET_DELAY;
  }
  player.punchTimer = 0.26;
  if (isBloodmoon) sfxWolfPunch(); else sfxPunch();

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
    // 命中正确目标：强 hitstop + 强震动 + 命中音效
    triggerHitstop(0.08);
    triggerShake(0.35, 0.2);
    sfxHit();
    gameStatus = "settling";
    window.setTimeout(() => finishRound(true), 760);
    return;
  }

  if (isBloodmoon) {
    triggerShake(0.14, 0.1);
    sfxMiss();
    if (levelState.bloodmoon) {
      levelState.bloodmoon.revealCount = Math.max(0, (levelState.bloodmoon.revealCount ?? 0) - 1);
    }
    if (hit.npc) {
      hit.npc.hostility = Math.min(2.6, (hit.npc.hostility ?? 1) + 0.55);
      hit.npc.alertTimer = 0;
      hit.npc.attackCooldown = Math.min(hit.npc.attackCooldown ?? 0.8, 0.24);
      faceNpcToward(hit.npc, player.group.position);
    }
    levelState.hostility = Math.min(2.35, levelState.hostility + 0.18);
    return;
  }

  // 打错了：弱震动 + 失败音效
  dissolveNpc(hit.npc);
  triggerShake(0.12, 0.1);
  sfxMiss();
  levelState.attempts = Math.max(0, levelState.attempts - 1);
  updateHud();
  if (levelState.attempts <= 0) {
    gameStatus = "settling";
    window.setTimeout(() => finishRound(false), 680);
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
    correct: best.isGamingTarget || best.isLover || best.isSuShiTarget || best.isBloodmoonTarget,
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
  npc.alive = false;
  npc.group.visible = false;
  if (npc.isSuShiTarget && levelState?.temple?.shadowCue) {
    setShadowCueIntensity(levelState.temple.shadowCue, 0);
  }
  if (npc.isBloodmoonTarget && levelState?.bloodmoon?.targetCue) {
    setBloodmoonClawIntensity(levelState.bloodmoon.targetCue, 0);
  }
  createPixelBurst(npc);
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

function finishRound(won) {
  if (gameStatus === "won" || gameStatus === "lost") return;
  gameStatus = won ? "won" : "lost";
  player.cheer = won;
  if (won) sfxWin(); else sfxLose();

  const timeUsed = Math.round(totalTime - levelState.startTime);
  const isBloodmoon = levelState.level.id === "bloodmoon";
  const attemptsLeft = isBloodmoon ? Math.ceil(levelState.sanity) : levelState.attempts;
  const rating = calcRating(won, timeUsed, attemptsLeft);

  ui.resultTitle.textContent = won ? "任务成功" : "任务失败";
  ui.resultCopy.textContent = won ? levelState.level.success : levelState.level.failure;
  ui.resultRating.textContent = rating.grade;
  ui.resultRating.className = "result-rating rating-" + rating.grade.toLowerCase();
  ui.statTime.textContent = timeUsed + " 秒";
  ui.statAttempts.previousElementSibling.textContent = isBloodmoon ? "理智" : "🥊 剩余出拳";
  ui.statAttempts.textContent = isBloodmoon ? attemptsLeft + " 点" : attemptsLeft + " 次";

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
  const isBloodmoon = levelState.level.id === "bloodmoon";
  const isTemple = levelState.level.id === "temple";
  const bloodmoonState = levelState.bloodmoon;
  ui.sceneName.textContent = levelState.level.sceneName;
  if (isBloodmoon && bloodmoonState?.mode === "huntIntro") {
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
  ui.timerText.textContent = Math.ceil(levelState.remaining).toString();
  ui.attemptLabel.textContent = isBloodmoon ? "理智" : "出拳";
  ui.attemptText.textContent = isBloodmoon ? Math.ceil(levelState.sanity).toString() : levelState.attempts.toString();
  ui.clueBar.textContent = isBloodmoon && (bloodmoonState?.mode === "hunt" || bloodmoonState?.mode === "huntBriefing")
    ? "🟢 机制：玩家和 NPC 已随机散开，NPC 暂停攻击。绿区外会被血月秒杀。"
    : "🔍 " + (levelState.level.hudClue || levelState.level.clue);
  ui.attackIcon.textContent = isBloodmoon ? "爪" : "拳";
  ui.hud.classList.toggle("bloodmoon-mode", isBloodmoon);
  ui.attackButton.classList.toggle("bloodmoon", isBloodmoon);
  ui.sceneName.classList.toggle("bloodmoon-text", isBloodmoon);
  ui.clueBar.classList.toggle("bloodmoon", isBloodmoon);
  ui.clueBar.classList.toggle("hidden", isTemple);
  ui.attemptChip.classList.toggle("bloodmoon", isBloodmoon);
  ui.mechanicHint.classList.toggle("visible", isTemple || (isBloodmoon && (bloodmoonState?.mode === "hunt" || bloodmoonState?.mode === "huntBriefing")));
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
  return min + Math.random() * (max - min);
}
