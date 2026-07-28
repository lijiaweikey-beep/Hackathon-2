import * as THREE from "three";
import {
  BLOODMOON_CLUE_SECONDS,
  BLOODMOON_DECOY_CUES,
  BLOODMOON_GUARD_DAMAGE,
  BLOODMOON_GUARD_SPEED,
  BLOODMOON_HUNT_INTRO_SECONDS,
  BLOODMOON_HUNT_SECONDS,
  BLOODMOON_LIGHTNING_INTERVAL,
  BLOODMOON_NPC_HIT_DAMAGE,
  BLOODMOON_NPC_HIT_RANGE,
  BLOODMOON_PHASE2_HP_MAX,
  BLOODMOON_SAFE_ZONE_COUNT,
  BLOODMOON_SANITY_MAX,
  BLOODMOON_SUMMON_COUNT,
  BLOODMOON_WOLF_COOLDOWN,
} from "../../config/constants.js";
import {
  positionBloodmoonCue,
  setBloodmoonClawIntensity,
} from "../../entities/bloodmoonCues.js";
import { getBossHitTransition, isInsideSafeZone } from "./rules.js";
import { createBloodmoonViewModel } from "./viewModel.js";

const HUNT_INTRO_HTML = `
    <div class="hunt-intro-moon"></div>
    <div class="hunt-intro-title">猎杀时刻</div>
    <div class="hunt-intro-quote">“认不出自己的人，都会留在月光外。”</div>
  `;

const HUNT_CARD_HTML = `
    <div class="hunt-card-title">血月引路人</div>
    <div class="hunt-card-quote">“认不出自己的人，都会留在月光外。”</div>
    <div class="hunt-card-rule">机制 1：关闭这张卡片后，玩家和所有 NPC 会立刻随机散落到地图任意位置。</div>
    <div class="hunt-card-rule">机制 2：你的狼人耳朵、狼爪和披风会暂时消失，NPC 也会暂停攻击。</div>
    <div class="hunt-card-rule">机制 3：你有 20 秒找到自己，并进入任意一个绿色安全区域。</div>
    <div class="hunt-card-rule">处决：倒计时结束时，绿色区域外的所有生物都会被血月秒杀。</div>
    <button class="hunt-card-button" type="button" data-hunt-start>关闭卡片，开始倒计时</button>
  `;

const PAUSED_MODES = new Set(["huntIntro", "huntBriefing"]);
const ATTACK_BLOCKED_MODES = new Set([...PAUSED_MODES, "hunt"]);

export function createBloodmoonLevel(context) {
  const effects = context.effects ?? {
    positionBloodmoonCue,
    setBloodmoonClawIntensity,
  };
  const resources = context.sceneData;
  const state = {
    mode: "phase1",
    lightningTimer: resources.lightningTimer,
    lightningFlash: 0,
    clueTimer: 0,
    revealCount: 0,
    huntTimer: 0,
    cutsceneTimer: 0,
    bossHp: BLOODMOON_PHASE2_HP_MAX,
    sanity: BLOODMOON_SANITY_MAX,
    playerInvuln: 0,
    hostility: 1,
    summonWave: 0,
    nextNpcId: context.npcCount,
    safeZones: [],
    huntBoss: null,
  };
  let target = null;

  function initializeNpc(npc, isTarget = false) {
    npc.alertTimer = context.randomRange(0.4, 2.6);
    npc.attackTimer = 0;
    npc.attackResolveTimer = 0;
    npc.attackCooldown = context.randomRange(0.7, 1.7);
    npc.hostility = isTarget
      ? 1.15
      : context.randomRange(0.82, 1.12);
  }

  function initializeTargetScript(npc) {
    npc.script = {
      state: "wander",
      timer: context.randomRange(2.2, 4.4),
      waypoint: context.randomOpenPosition(),
      cluePause: 0,
    };
  }

  function start() {
    target = context.createNpc(0, {
      levelTarget: true,
    });
    target.levelManaged = true;
    target.group.position.copy(context.randomOpenPosition());
    initializeTargetScript(target);
    initializeNpc(target, true);
    context.addNpc(target);

    for (let id = 1; id < context.npcCount; id += 1) {
      const npc = context.addWanderNpc(id);
      initializeNpc(npc);
    }
  }

  function shuffleActors(actors) {
    for (let index = actors.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(context.randomRange(0, index + 1));
      [actors[index], actors[swapIndex]] = [actors[swapIndex], actors[index]];
    }
  }

  function assignDecoyCues() {
    if (!resources.decoyCues?.length) return;
    const candidates = context.getNpcs().filter(
      (npc) => npc.alive && npc !== target,
    );
    shuffleActors(candidates);

    resources.decoyCues.forEach((cue, index) => {
      const npc = candidates[index];
      cue.userData.decoyNpc = npc ?? null;
      cue.userData.seed = context.randomRange(0, 100);
      cue.userData.missingToe = Math.floor(context.randomRange(0, 4));
      cue.userData.decoyCompleteness = context.randomRange(0.38, 0.72);
      if (!npc) effects.setBloodmoonClawIntensity(cue, 0);
    });
  }

  function updateStorm(deltaSeconds) {
    if (state.mode === "hunt") {
      state.lightningFlash = Math.max(0, state.lightningFlash - deltaSeconds * 3.5);
      if (resources.lightningLight) {
        resources.lightningLight.intensity = state.lightningFlash * 5.5;
      }
      return;
    }

    state.lightningTimer -= deltaSeconds;
    state.lightningFlash = Math.max(0, state.lightningFlash - deltaSeconds * 4.8);
    state.clueTimer = Math.max(0, state.clueTimer - deltaSeconds);

    if (state.lightningTimer <= 0) {
      state.lightningTimer = context.randomRange(
        BLOODMOON_LIGHTNING_INTERVAL[0],
        BLOODMOON_LIGHTNING_INTERVAL[1],
      );
      state.lightningFlash = 1;
      state.clueTimer = BLOODMOON_CLUE_SECONDS;
      state.revealCount = Math.min(3, state.revealCount + 1);
      context.triggerShake(0.42, 0.32);
      context.flashHud("bloodmoon-lightning", 360);
      context.playLevelSound("thunder", context.randomRange(180, 420));

      if (target?.script) {
        target.script.cluePause = BLOODMOON_CLUE_SECONDS;
        target.script.timer = Math.max(target.script.timer, BLOODMOON_CLUE_SECONDS);
      }
      assignDecoyCues();
    }

    const totalTime = context.getTotalTime();
    const flash = state.lightningFlash;
    const strobe = flash > 0
      ? flash * (0.75 + Math.abs(Math.sin(totalTime * 44)) * 0.65)
      : 0;
    if (resources.lightningLight) resources.lightningLight.intensity = strobe * 9.5;
    if (resources.baseLight) {
      resources.baseLight.color.set(strobe > 0.08 ? 0xf8fbff : 0xff6b6b);
      resources.baseLight.intensity = 1.55 + strobe * 4.8;
    }
    if (resources.moonMaterial) {
      resources.moonMaterial.opacity = 0.78 + Math.sin(totalTime * 1.7) * 0.08 + strobe * 0.2;
    }
    resources.lightningBolts?.forEach((bolt, index) => {
      const visible = strobe > 0.08
        && (index === 0 || Math.sin(totalTime * 37 + index) > -0.25);
      bolt.visible = visible;
      bolt.userData.segments?.forEach((segment) => {
        const opacity = segment.geometry.parameters.width < 0.1 ? 0.92 : 0.26;
        segment.material.opacity = visible ? Math.min(1, opacity * strobe) : 0;
      });
    });
  }

  function hideSafeZones() {
    resources.safeZoneVisuals?.forEach((visual) => {
      visual.mesh.visible = false;
      visual.ring.visible = false;
    });
  }

  function startHunt(boss) {
    state.mode = "huntIntro";
    state.huntTimer = BLOODMOON_HUNT_SECONDS;
    state.cutsceneTimer = BLOODMOON_HUNT_INTRO_SECONDS;
    state.clueTimer = 0;
    state.revealCount = 0;
    state.huntBoss = boss;

    if (boss) {
      boss.preserveWhenDead = true;
      boss.group.visible = false;
      boss.alive = false;
    }
    effects.setBloodmoonClawIntensity(resources.targetCue, 0);
    resources.decoyCues?.forEach((cue) => {
      effects.setBloodmoonClawIntensity(cue, 0);
    });
    hideSafeZones();
    context.hideOverlay("huntCard");
    context.showOverlay("huntIntro", HUNT_INTRO_HTML);
    context.flashHud("bloodmoon-lightning", 520);
    context.triggerShake(0.5, 0.34);
  }

  function handleBossHit(boss) {
    if (state.mode === "hunt") return;
    context.triggerHitstop(0.08);
    context.triggerShake(0.42, 0.22);
    context.playLevelSound("hit");

    const transition = getBossHitTransition(state.mode, state.bossHp);
    state.bossHp = transition.nextBossHp;
    if (transition.defeated) {
      context.dissolveNpc(boss);
      context.finishLevel(true, null, 760);
      return;
    }
    startHunt(boss);
  }

  function updateHuntIntro(deltaSeconds) {
    if (state.mode !== "huntIntro") return;
    state.cutsceneTimer = Math.max(0, state.cutsceneTimer - deltaSeconds);
    if (state.cutsceneTimer > 0) return;
    state.mode = "huntBriefing";
    context.hideOverlay("huntIntro");
    context.showOverlay("huntCard", HUNT_CARD_HTML);
  }

  function safeZoneSpacing() {
    return resources.safeZoneRadius * 2.35;
  }

  function pickSafeZones() {
    const zones = [];
    for (let index = 0; index < BLOODMOON_SAFE_ZONE_COUNT; index += 1) {
      let position = null;
      for (let attempts = 0; attempts < 50; attempts += 1) {
        const candidate = context.randomOpenPosition();
        if (zones.every((zone) => candidate.distanceTo(zone) > safeZoneSpacing())) {
          position = candidate;
          break;
        }
      }
      zones.push(position ?? context.randomOpenPosition());
    }
    return zones;
  }

  function showSafeZones() {
    resources.safeZoneVisuals.forEach((visual, index) => {
      const position = state.safeZones[index];
      if (!position) {
        visual.mesh.visible = false;
        visual.ring.visible = false;
        return;
      }
      visual.mesh.position.set(position.x, 0.105, position.z);
      visual.ring.position.set(position.x, 0.112, position.z);
      visual.mesh.visible = true;
      visual.ring.visible = true;
      visual.mesh.material.opacity = 0.34;
      visual.ring.material.opacity = 0.88;
    });
  }

  function beginHuntCountdown() {
    if (state.mode !== "huntBriefing") return;
    state.mode = "hunt";
    state.huntTimer = BLOODMOON_HUNT_SECONDS;
    context.hideOverlay("huntCard");
    context.setActorPartsVisible(context.getPlayer(), "wolfParts", false);

    state.safeZones = pickSafeZones();
    showSafeZones();
    context.randomizeActorPosition(context.getPlayer());
    context.resetPlayerInput();
    context.getNpcs().forEach((npc) => {
      if ((!npc.alive && npc !== state.huntBoss) || npc === state.huntBoss) return;
      context.randomizeActorPosition(npc);
      npc.attackTimer = 0;
      npc.attackCooldown = BLOODMOON_HUNT_SECONDS + 2;
    });
    context.triggerShake(0.5, 0.34);
  }

  function updateSafeZoneVisuals() {
    const totalTime = context.getTotalTime();
    const pulse = 0.65 + Math.abs(Math.sin(totalTime * 5.5)) * 0.35;
    resources.safeZoneVisuals?.forEach((visual, index) => {
      if (!visual.mesh.visible) return;
      visual.mesh.material.opacity = 0.22 + pulse * 0.18;
      visual.ring.material.opacity = 0.64 + pulse * 0.28;
      visual.ring.scale.setScalar(1 + Math.sin(totalTime * 6 + index) * 0.035);
    });
  }

  function restoreNpcAttacks() {
    context.getNpcs().forEach((npc) => {
      if (!npc.alive) return;
      npc.attackTimer = 0;
      npc.attackResolveTimer = 0;
      npc.alertTimer = context.randomRange(0.2, 0.9);
      npc.attackCooldown = npc.isWolfGuard
        ? 0.35
        : context.randomRange(0.45, 1.15);
      npc.hostility = npc.isWolfGuard
        ? 2.2
        : Math.max(npc.hostility ?? 1, 1.05);
    });
  }

  function respawnBoss() {
    let boss = state.huntBoss;
    if (!boss) {
      boss = context.createNpc(state.nextNpcId, {
        levelTarget: true,
      });
      state.nextNpcId += 1;
      context.addNpc(boss);
    }
    boss.alive = true;
    boss.preserveWhenDead = false;
    boss.group.visible = true;
    boss.group.position.copy(context.randomOpenPosition());
    initializeTargetScript(boss);
    initializeNpc(boss, true);
    target = boss;
    state.huntBoss = null;
  }

  function randomGuardPosition() {
    let fallback = null;
    for (let attempts = 0; attempts < 60; attempts += 1) {
      const position = context.randomOpenPosition();
      fallback ??= position;
      const farFromPlayer = position.distanceTo(
        context.getPlayer().group.position,
      ) >= 5.2;
      const farFromBoss = !target?.alive
        || position.distanceTo(target.group.position) >= 3.4;
      if (farFromPlayer && farFromBoss) return position;
    }
    return fallback ?? context.randomOpenPosition();
  }

  function summonWave() {
    state.summonWave += 1;
    for (let index = 0; index < BLOODMOON_SUMMON_COUNT; index += 1) {
      const npc = context.createNpc(state.nextNpcId, {});
      state.nextNpcId += 1;
      npc.group.position.copy(context.randomOpenPosition());
      npc.wanderTimer = context.randomRange(0.4, 1.7);
      npc.pauseTimer = context.randomRange(0.1, 0.8);
      initializeNpc(npc);
      context.addNpc(npc);
    }

    const guard = context.createNpc(state.nextNpcId, { wolfGuard: true });
    state.nextNpcId += 1;
    guard.levelManaged = true;
    guard.group.position.copy(randomGuardPosition());
    guard.speed = BLOODMOON_GUARD_SPEED;
    guard.attackCooldown = 0.8;
    guard.hostility = 1.8;
    initializeNpc(guard);
    context.addNpc(guard);
  }

  function resolveHunt() {
    if (state.mode !== "hunt" || context.getGameStatus() !== "playing") return;
    const player = context.getPlayer();
    const playerSafe = isInsideSafeZone(
      player.group.position,
      state.safeZones,
      resources.safeZoneRadius,
    );

    if (!playerSafe) {
      state.sanity = 0;
      hideSafeZones();
      context.setActorPartsVisible(player, "wolfParts", true);
      context.triggerShake(0.55, 0.35);
      context.finishLevel(false, null, 700);
      return;
    }

    context.getNpcs().forEach((npc) => {
      if (!npc.alive) return;
      const safe = isInsideSafeZone(
        npc.group.position,
        state.safeZones,
        resources.safeZoneRadius,
      );
      if (!safe && npc !== target) context.dissolveNpc(npc);
    });
    hideSafeZones();
    context.setActorPartsVisible(player, "wolfParts", true);
    context.compactDeadNpcs();
    respawnBoss();
    summonWave();
    restoreNpcAttacks();
    state.mode = "phase2";
    state.huntTimer = 0;
    context.triggerShake(0.36, 0.22);
  }

  function updateHunt(deltaSeconds) {
    if (state.mode !== "hunt") return;
    state.huntTimer = Math.max(0, state.huntTimer - deltaSeconds);
    updateSafeZoneVisuals();
    if (state.huntTimer <= 0) resolveHunt();
  }

  function updateTarget(deltaSeconds) {
    if (!target?.alive || !target.script) return;
    const script = target.script;
    if (script.cluePause > 0) {
      script.cluePause -= deltaSeconds;
      target.walking = false;
      context.faceNpcToward(target, new THREE.Vector3(7.2, 0, -10.8));
      return;
    }

    target.walking = true;
    const reached = context.moveNpcToward(
      target,
      script.waypoint,
      context.npcSpeed * 1.06,
      deltaSeconds,
    );
    script.timer -= deltaSeconds;
    if (reached || script.timer <= 0) {
      script.timer = context.randomRange(2.2, 4.4);
      script.waypoint = context.randomOpenPosition();
    }
  }

  function resolveNpcHit(npc) {
    if (
      state.playerInvuln > 0
      || context.getGameStatus() !== "playing"
      || !context.isActorFacingTarget(
        npc,
        context.getPlayer(),
        BLOODMOON_NPC_HIT_RANGE,
      )
    ) return;

    state.sanity = Math.max(
      0,
      state.sanity - (
        npc.isWolfGuard ? BLOODMOON_GUARD_DAMAGE : BLOODMOON_NPC_HIT_DAMAGE
      ),
    );
    state.playerInvuln = 0.72;
    context.triggerShake(0.28, 0.2);
    context.playLevelSound("npcHit");
    context.flashHud("bloodmoon-hit", 180);
    context.refreshHud();
    if (state.sanity <= 0) context.finishLevel(false, null, 620);
  }

  function updateNpcThreat(npc, deltaSeconds) {
    if (!npc.alive) return;
    const previousResolveTimer = npc.attackResolveTimer ?? 0;
    npc.attackCooldown = Math.max(0, (npc.attackCooldown ?? 0) - deltaSeconds);
    npc.attackTimer = Math.max(0, (npc.attackTimer ?? 0) - deltaSeconds);
    npc.attackResolveTimer = Math.max(
      0,
      (npc.attackResolveTimer ?? 0) - deltaSeconds,
    );
    npc.alertTimer = Math.max(0, (npc.alertTimer ?? 0) - deltaSeconds);
    if (previousResolveTimer > 0 && npc.attackResolveTimer <= 0) {
      resolveNpcHit(npc);
    }
    if (
      npc.attackCooldown > 0
      || !context.isActorFacingTarget(
        npc,
        context.getPlayer(),
        BLOODMOON_NPC_HIT_RANGE,
      )
    ) return;

    const pressure = state.hostility * npc.hostility;
    if (
      npc.alertTimer <= 0
      && context.randomRange(0, 1) < deltaSeconds * 1.8 * pressure
    ) {
      npc.attackTimer = 0.26;
      npc.attackResolveTimer = 0.12;
      npc.attackCooldown = context.randomRange(1, 1.7) / pressure;
      context.faceNpcToward(npc, context.getPlayer().group.position);
    }
  }

  function updateWolfGuard(npc, deltaSeconds) {
    const player = context.getPlayer();
    const reached = context.moveNpcToward(
      npc,
      player.group.position,
      npc.speed ?? BLOODMOON_GUARD_SPEED,
      deltaSeconds,
    );
    npc.walking = !reached;
    if (npc.group.position.distanceTo(player.group.position) < BLOODMOON_NPC_HIT_RANGE + 0.18) {
      npc.alertTimer = 0;
      npc.hostility = 2.2;
      npc.attackCooldown = Math.min(npc.attackCooldown ?? 0.6, 0.18);
      context.faceNpcToward(npc, player.group.position);
    }
  }

  function updateTargetCue() {
    const intensity = state.clueTimer > 0
      ? THREE.MathUtils.clamp(state.clueTimer / BLOODMOON_CLUE_SECONDS, 0, 1)
      : 0;
    if (resources.targetCue && target?.alive) {
      const revealStage = Math.max(1, state.revealCount);
      const completeness = revealStage === 1 ? 0.3 : revealStage === 2 ? 0.64 : 1;
      effects.positionBloodmoonCue(resources.targetCue, target);
      effects.setBloodmoonClawIntensity(
        resources.targetCue,
        intensity,
        0.9 + Math.abs(Math.sin(context.getTotalTime() * 15)) * 0.28,
        completeness,
      );
    }

    resources.decoyCues?.forEach((cue) => {
      const npc = cue.userData.decoyNpc;
      if (!npc?.alive) {
        effects.setBloodmoonClawIntensity(cue, 0);
        return;
      }
      effects.positionBloodmoonCue(cue, npc);
      const totalTime = context.getTotalTime();
      const flicker = 0.56
        + Math.abs(Math.sin(totalTime * 20 + cue.userData.seed)) * 0.34;
      effects.setBloodmoonClawIntensity(
        cue,
        intensity * 0.82,
        flicker,
        cue.userData.decoyCompleteness,
        totalTime,
      );
    });
  }

  function update(deltaSeconds) {
    updateHuntIntro(deltaSeconds);
    if (PAUSED_MODES.has(state.mode)) return { pauseWorld: true };

    updateStorm(deltaSeconds);
    state.playerInvuln = Math.max(0, state.playerInvuln - deltaSeconds);
    updateHunt(deltaSeconds);
    if (state.mode !== "hunt") {
      updateTarget(deltaSeconds);
      context.getNpcs().forEach((npc) => {
        if (npc.isWolfGuard && npc.alive) updateWolfGuard(npc, deltaSeconds);
      });
    }
    return undefined;
  }

  function handleHitTarget(hit) {
    if (!hit) return { handled: false };
    if (hit.correct && hit.npc === target) {
      handleBossHit(hit.npc);
      return { handled: true };
    }

    if (hit.npc) {
      context.dissolveNpc(hit.npc);
      context.compactDeadNpcs();
      context.triggerHitstop(0.06);
      context.triggerShake(0.14, 0.1);
      context.playLevelSound("miss");
      state.revealCount = Math.max(0, state.revealCount - 1);
      state.hostility = Math.min(2.35, state.hostility + 0.12);
    }
    return { handled: true };
  }

  function handleAction(action) {
    if (action.type === "beforeAttack") {
      return {
        blocked: ATTACK_BLOCKED_MODES.has(state.mode),
        cooldown: BLOODMOON_WOLF_COOLDOWN,
        animationSeconds: 0.26,
        sound: "wolfPunch",
        resetCombo: false,
      };
    }
    if (action.type === "hitTarget") return handleHitTarget(action.hit);
    if (action.type === "afterNpcUpdate") {
      if (state.mode !== "hunt") {
        context.getNpcs().forEach((npc) => updateNpcThreat(npc, action.deltaSeconds));
      }
      updateTargetCue();
      context.compactDeadNpcs();
      return undefined;
    }
    if (action.type === "actorDissolved" && action.actor === target) {
      effects.setBloodmoonClawIntensity(resources.targetCue, 0);
      return undefined;
    }
    if (action.type === "beginSpecialPhase") {
      beginHuntCountdown();
      return { handled: true };
    }
    if (action.type === "getHudState") {
      return createBloodmoonViewModel(state);
    }
    if (action.type === "getResultStats") {
      return createBloodmoonViewModel(state).resultResource;
    }
    return undefined;
  }

  return {
    start,
    update,
    handleAction,
    dispose() {
      hideSafeZones();
      context.hideOverlay("huntIntro");
      context.hideOverlay("huntCard");
      target = null;
    },
  };
}
