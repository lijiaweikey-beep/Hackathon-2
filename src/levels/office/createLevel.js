import {
  OFFICE_BOSS_SPEED,
  OFFICE_HP_MAX,
  OFFICE_INVULNERABLE_SECONDS,
  OFFICE_MAX_WOKS_CAP,
  OFFICE_RAMP_SECONDS,
  OFFICE_WOK_FALL_END,
  OFFICE_WOK_FALL_START,
  OFFICE_WOK_HIT_RADIUS,
  OFFICE_WOK_INCREMENT_SECONDS,
  OFFICE_WOK_WARNING_END,
  OFFICE_WOK_WARNING_START,
} from "./constants.js";

// PRD: 黑锅 = CylinderGeometry扁圆 + BoxGeometry把手
// 材质: color 0x0a0a0a, metalness 0.4, roughness 0.5
function createWokMesh(THREE) {
  const group = new THREE.Group();
  const wokMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    metalness: 0.4,
    roughness: 0.5,
    flatShading: true,
  });
  // 锅体（扁圆盘）
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.6, 0.18, 12),
    wokMat,
  );
  group.add(body);
  // 把手
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.4),
    wokMat,
  );
  handle.position.set(0, 0, -0.7);
  group.add(handle);
  group.castShadow = true;
  return group;
}

// PRD: 红圈预警用RingGeometry + 发光呼吸效果
function createWarningRing(THREE) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.1, 24),
    new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  return ring;
}

const WOK_START_HEIGHT = 12;

export function createOfficeLevel(context) {
  const state = {
    hp: OFFICE_HP_MAX,
    invulnerable: 0,
    won: false,
    failed: false,
    spawnTimer: 1.2,
    warnings: [],
    fallingWoks: [],
    elapsed: 0,
  };
  let boss = null;
  let sceneRef = null;
  let threeRef = null;

  // 难度进度：0 → 1，在 OFFICE_RAMP_SECONDS 时达到满难度
  function difficulty() {
    return Math.min(1, state.elapsed / OFFICE_RAMP_SECONDS);
  }

  // 在 start/end 之间按难度进度连续插值
  function ramp(start, end) {
    return start + (end - start) * difficulty();
  }

  // 生成间隔随并发数自动调整：间隔 = 生命周期 / 目标并发数，保证始终有N口锅在空中
  function spawnInterval() {
    const lifeCycle = warningSeconds() + fallDuration();
    return Math.max(0.12, lifeCycle / maxConcurrentWoks());
  }

  function warningSeconds() {
    return ramp(OFFICE_WOK_WARNING_START, OFFICE_WOK_WARNING_END);
  }

  function fallDuration() {
    return ramp(OFFICE_WOK_FALL_START, OFFICE_WOK_FALL_END);
  }

  // 同一时刻并存的锅数：1 口起步，每5秒+1，直到80%屏幕上限
  function maxConcurrentWoks() {
    return Math.min(
      OFFICE_MAX_WOKS_CAP,
      1 + Math.floor(state.elapsed / OFFICE_WOK_INCREMENT_SECONDS),
    );
  }

  function start() {
    sceneRef = context.sceneData.scene;
    threeRef = context.sceneData.THREE;

    boss = context.actors.createNpc(0, {
      isBoss: true,
      levelTarget: true,
    });
    boss.levelManaged = true;
    boss.group.position.set(8, 0, 5.2);
    context.ui.setRedTie(boss, 0.85);
    context.actors.addNpc(boss);

    for (let id = 1; id < context.actors.npcCount; id += 1) {
      context.actors.addWanderNpc(id);
    }
  }

  function spawnWarning() {
    let position;
    do {
      position = {
        x: context.random.range(-10, 10),
        z: context.random.range(-6.5, 6.5),
      };
    } while (
      boss
      && Math.hypot(position.x - boss.group.position.x, position.z - boss.group.position.z) < 2.2
    );

    const ring = createWarningRing(threeRef);
    ring.position.x = position.x;
    ring.position.z = position.z;
    sceneRef.add(ring);

    const total = warningSeconds();
    const warning = { position, remaining: total, total, visual: ring };
    state.warnings.push(warning);
  }

  function spawnFallingWok(position) {
    const wok = createWokMesh(threeRef);
    wok.position.set(position.x, WOK_START_HEIGHT, position.z);
    sceneRef.add(wok);
    // 每口锅记住自己的坠落时长，避免中途换段导致速度突变
    state.fallingWoks.push({
      position,
      progress: 0,
      duration: fallDuration(),
      mesh: wok,
    });
  }

  function landWok(wok) {
    const player = context.actors.getPlayer();
    const distance = Math.hypot(
      wok.position.x - player.group.position.x,
      wok.position.z - player.group.position.z,
    );
    if (
      distance <= OFFICE_WOK_HIT_RADIUS
      && state.invulnerable <= 0
      && !state.failed
    ) {
      state.hp -= 1;
      state.invulnerable = OFFICE_INVULNERABLE_SECONDS;
      context.combat.triggerShake(0.28, 0.2);
      context.audio.playSound("npcHit");
      context.ui.flashHud("office-hit", 180);
      context.ui.refreshHud();
      if (state.hp <= 0) {
        state.failed = true;
        context.combat.finishLevel(false, null, 620);
      }
    }
  }

  function updateWarnings(deltaSeconds) {
    for (let i = state.warnings.length - 1; i >= 0; i -= 1) {
      const w = state.warnings[i];
      w.remaining -= deltaSeconds;
      // 呼吸效果：越接近落地闪得越快、越红
      if (w.visual) {
        const urgency = 1 - Math.max(0, w.remaining) / (w.total || 1);
        const blink = Math.sin(w.remaining * (8 + urgency * 18));
        w.visual.material.opacity = 0.35 + urgency * 0.35 + blink * 0.2;
        const ringScale = 1 + urgency * 0.14;
        w.visual.scale.set(ringScale, ringScale, 1);
      }
      if (w.remaining <= 0) {
        if (w.visual) sceneRef.remove(w.visual);
        spawnFallingWok(w.position);
        state.warnings.splice(i, 1);
      }
    }
  }

  function updateFallingWoks(deltaSeconds) {
    state.fallingWoks = state.fallingWoks.filter((wok) => {
      wok.progress += deltaSeconds / (wok.duration || OFFICE_WOK_FALL_START);
      // PRD: 垂直下落 + 绕X轴自旋。用加速度曲线：起步慢、落地快
      const eased = wok.progress * wok.progress;
      wok.mesh.position.y = Math.max(0, WOK_START_HEIGHT * (1 - eased));
      wok.mesh.rotation.x += deltaSeconds * 8;
      if (wok.progress < 1) return true;
      // 落地
      landWok(wok);
      sceneRef.remove(wok.mesh);
      return false;
    });
  }

  // 老板AI：复用漫游逻辑，速度略快于普通NPC（PRD要求）
  const bossAI = {
    waypoint: null,
    pauseTimer: 0,
    wanderTimer: 0,
  };

  function updateBoss(deltaSeconds) {
    if (!boss?.alive) return;

    if (bossAI.pauseTimer > 0) {
      bossAI.pauseTimer -= deltaSeconds;
      boss.walking = false;
      return;
    }

    if (!bossAI.waypoint || bossAI.wanderTimer <= 0) {
      bossAI.waypoint = context.movement.randomOpenPosition();
      bossAI.wanderTimer = context.random.range(3, 6);
    }

    boss.walking = true;
    const reached = context.movement.moveNpcToward(
      boss,
      bossAI.waypoint,
      OFFICE_BOSS_SPEED,
      deltaSeconds,
    );
    bossAI.wanderTimer -= deltaSeconds;

    if (reached) {
      bossAI.pauseTimer = context.random.range(0.6, 1.5);
      bossAI.waypoint = null;
    }
  }

  function update(deltaSeconds) {
    if (state.failed || state.won) return undefined;

    state.elapsed += deltaSeconds;
    state.invulnerable = Math.max(0, state.invulnerable - deltaSeconds);
    updateBoss(deltaSeconds);

    // 预警圈 + 空中锅一起计入并存上限
    const pending = state.warnings.length + state.fallingWoks.length;
    const target = maxConcurrentWoks();
    if (pending < target) {
      state.spawnTimer -= deltaSeconds;
      // 每次触发补一口，间隔自适应以保证始终有 N 口锅在空中
      while (state.spawnTimer <= 0 && state.warnings.length + state.fallingWoks.length < target) {
        spawnWarning();
        state.spawnTimer += spawnInterval();
      }
      // 防止计时器负向累积过大
      if (state.spawnTimer < 0) state.spawnTimer = 0;
    }
    updateWarnings(deltaSeconds);
    updateFallingWoks(deltaSeconds);

    return undefined;
  }

  function handleBossHit(hit) {
    if (!hit || !hit.npc || hit.npc !== boss) return { handled: false };
    context.combat.triggerHitstop(0.08);
    context.combat.triggerShake(0.42, 0.22);
    context.audio.playSound("hit");
    context.actors.dissolve(boss);
    state.won = true;
    context.combat.finishLevel(true, null, 760);
    return { handled: true };
  }

  function handleAction(action) {
    if (action.type === "beforeAttack") {
      return {
        blocked: false,
        cooldown: 0.4,
        animationSeconds: 0.2,
        sound: "punch",
        resetCombo: false,
      };
    }
    if (action.type === "hitTarget") return handleBossHit(action.hit);
    if (action.type === "getHudState") {
      return {
        theme: "office",
        resourceText: String(state.hp),
        resourceMax: OFFICE_HP_MAX,
        resourceLabel: "生命",
        resourceIcon: "❤️",
      };
    }
    if (action.type === "getResultStats") {
      return {
        label: "剩余生命",
        value: `${state.hp} 点`,
        attemptsLeft: state.hp,
        elapsed: state.elapsed,
      };
    }
    return undefined;
  }

  return {
    start,
    update,
    handleAction,
    dispose() {
      state.warnings.forEach((w) => {
        if (w.visual && sceneRef) sceneRef.remove(w.visual);
      });
      state.fallingWoks.forEach((w) => {
        if (w.mesh && sceneRef) sceneRef.remove(w.mesh);
      });
      state.warnings.length = 0;
      state.fallingWoks.length = 0;
      boss = null;
      sceneRef = null;
      threeRef = null;
    },
  };
}
