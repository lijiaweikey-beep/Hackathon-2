import * as THREE from "three";
import {
  HIT_FACING_DOT,
  HIT_RANGE,
  PUNCH_COOLDOWNS,
  PUNCH_RESET_DELAY,
  PUNCH_SWING,
} from "../config/constants.js";
import { GAME_PHASES } from "../core/gamePhase.js";
import { getFacingVector } from "../utils/math.js";

export function createCombatSystem(dependencies) {
  const facing = new THREE.Vector2();
  const toNpc = new THREE.Vector2();
  let cooldown = 0;
  let cooldownMax = 0;
  let punchTier = 0;
  let resetTimer = 0;

  function reset() {
    cooldown = 0;
    cooldownMax = 0;
    punchTier = 0;
    resetTimer = 0;
  }

  function isFacingTarget(direction, toTarget) {
    if (toTarget.lengthSq() < 0.08) return true;
    return direction.dot(toTarget.normalize()) >= HIT_FACING_DOT;
  }

  function findHitTarget() {
    const player = dependencies.getPlayer();
    const playerPosition = player.group.position;
    getFacingVector(player.group.rotation.y, facing);
    const customHit = dependencies.dispatch({
      type: "findHitTarget",
      playerPos: playerPosition,
      facing,
    });
    if (customHit) return customHit;

    let best = null;
    let bestDistance = Infinity;
    dependencies.getNpcs().forEach((npc) => {
      if (!npc.alive) return;
      toNpc.set(
        npc.group.position.x - playerPosition.x,
        npc.group.position.z - playerPosition.z,
      );
      const distance = toNpc.length();
      if (distance > HIT_RANGE || !isFacingTarget(facing, toNpc)) return;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = npc;
      }
    });
    return best ? { npc: best, correct: best.isLevelTarget } : null;
  }

  function dissolveNpc(npc) {
    if (!npc?.alive || !npc.group || npc.group.visible === false) return;
    npc.alive = false;
    npc.group.visible = false;
    dependencies.dispatch({ type: "actorDissolved", actor: npc });
    dependencies.dissolveActor(npc);
  }

  function resolveHit(hit) {
    if (!hit) return;
    const levelHit = dependencies.dispatch({ type: "hitTarget", hit });
    if (levelHit?.handled) {
      if (
        typeof levelHit.cooldown === "number"
        && Number.isFinite(levelHit.cooldown)
        && levelHit.cooldown >= 0
      ) {
        cooldownMax = levelHit.cooldown;
        cooldown = cooldownMax;
      }
      return;
    }

    if (hit.correct) {
      if (hit.npcs) hit.npcs.forEach(dissolveNpc);
      else dissolveNpc(hit.npc);
      dependencies.triggerHitstop(0.08);
      dependencies.triggerShake(0.35, 0.2);
      dependencies.playHit();
      dependencies.settleRound(true, null, 760);
      return;
    }

    dissolveNpc(hit.npc);
    dependencies.triggerShake(0.12, 0.1);
    dependencies.playMiss();
    const levelState = dependencies.session.levelState;
    levelState.attempts = Math.max(0, levelState.attempts - 1);
    dependencies.refreshHud();
    if (levelState.attempts <= 0) {
      dependencies.settleRound(false, null, 680);
    }
  }

  function triggerAttack() {
    if (
      dependencies.session.phase !== GAME_PHASES.PLAYING
      || cooldown > 0
    ) return;
    const attack = dependencies.dispatch({ type: "beforeAttack" }) ?? {};
    if (attack.blocked || !dependencies.consumeActionInterval()) return;

    cooldownMax = attack.cooldown
      ?? PUNCH_COOLDOWNS[Math.min(punchTier, PUNCH_COOLDOWNS.length - 1)];
    cooldown = cooldownMax;
    if (attack.resetCombo !== false) {
      punchTier += 1;
      resetTimer = PUNCH_RESET_DELAY;
    }

    const player = dependencies.getPlayer();
    player.punchDuration = attack.animationSeconds ?? PUNCH_SWING;
    player.punchTimer = player.punchDuration;
    if (attack.sound) dependencies.playSound(attack.sound);
    else dependencies.playPunch();
    resolveHit(findHitTarget());
  }

  function updateCooldown(deltaSeconds) {
    const player = dependencies.getPlayer();
    if (cooldown > 0) cooldown = Math.max(0, cooldown - deltaSeconds);
    if (player?.punchTimer > 0) {
      player.punchTimer = Math.max(0, player.punchTimer - deltaSeconds);
    }
    if (
      dependencies.session.levelState?.level?.attackComboExpires !== false
      && resetTimer > 0
    ) {
      resetTimer -= deltaSeconds;
      if (resetTimer <= 0) punchTier = 0;
    }
  }

  return Object.freeze({
    get cooldown() {
      return cooldown;
    },
    get cooldownMax() {
      return cooldownMax;
    },
    reset,
    triggerAttack,
    updateCooldown,
    findHitTarget,
    dissolveNpc,
    isFacingTarget,
  });
}
