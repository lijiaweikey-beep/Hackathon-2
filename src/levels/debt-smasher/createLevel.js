import * as THREE from "three";
import { createDebtRules } from "./rules.js";

const HIT_PUSH_DISTANCE = 2.4;
const ROUND_SECONDS = 100;
const DEBT_TYPES = ["mortgage", "car-loan", "interest", "collection"];

export function createDebtSmasherLevel(context) {
  const rules = createDebtRules({
    pushDistance: HIT_PUSH_DISTANCE,
    randomRange: context.random.range,
  });
  let elapsed = 0;
  let completed = false;
  let nextNpcId = 0;

  function spawnDebtNpc() {
    const id = nextNpcId;
    nextNpcId += 1;
    const npc = context.actors.createNpc(id, {
      debtType: DEBT_TYPES[id % DEBT_TYPES.length],
      levelTarget: true,
    });
    npc.group.position.copy(context.movement.randomOpenPosition());
    npc.isDebtTarget = true;
    context.actors.addNpc(npc);
    return npc;
  }

  function refillDebtNpcs() {
    const activeCount = context.actors.getNpcs()
      .filter((npc) => npc.alive && npc.isDebtTarget).length;
    for (let index = activeCount; index < context.actors.npcCount; index += 1) {
      spawnDebtNpc();
    }
  }

  function start() {
    refillDebtNpcs();
  }

  function findHitTarget({ playerPos, facing }) {
    let best = null;
    let bestDistance = Infinity;
    context.actors.getNpcs().forEach((npc) => {
      if (!npc.alive || !npc.isDebtTarget) return;
      const dx = npc.group.position.x - playerPos.x;
      const dz = npc.group.position.z - playerPos.z;
      const distance = Math.hypot(dx, dz);
      const direction = new THREE.Vector2(dx, dz);
      if (
        distance <= 2.1
        && context.combat.isFacingTarget(facing, direction)
        && distance < bestDistance
      ) {
        best = npc;
        bestDistance = distance;
      }
    });
    return best ? { npc: best, correct: true } : null;
  }

  function pushNpc(npc, facing) {
    const position = npc.group.position;
    const source = { x: position.x, z: position.z, flattened: !npc.alive };
    if (!rules.push(source, { x: facing.x, z: facing.y })) return false;
    position.x = Math.max(-10.8, Math.min(10.8, source.x));
    position.z = Math.max(-10.8, Math.min(10.8, source.z));
    npc.pushedByPlayer = true;
    npc.walking = false;
    return true;
  }

  function hitTarget({ hit }) {
    const npc = hit?.npc;
    if (!npc?.alive || completed) return { handled: true };
    const player = context.actors.getPlayer();
    const facing = new THREE.Vector2(Math.sin(player.group.rotation.y), Math.cos(player.group.rotation.y));

    if (pushNpc(npc, facing)) {
      npc.group.rotation.z = -0.35;
      npc.group.scale.set(1.08, 0.92, 1.08);
      context.combat.triggerShake(0.16, 0.12);
      context.audio.playSound?.("hit");
      return { handled: true, cooldown: 0.22 };
    }
    return { handled: true };
  }

  function crush(npc) {
    npc.alive = false;
    npc.group.visible = false;
    npc.flattened = true;
  }

  function smash(machine) {
    const npcs = context.actors.getNpcs().map((npc) => ({
      x: npc.group.position.x,
      z: npc.group.position.z,
      flattened: !npc.alive || npc.flattened,
      pushedByPlayer: npc.pushedByPlayer,
      source: npc,
    }));
    const result = rules.smash(machine, npcs, context.actors.getPlayer().group.position);
    result.crushed.forEach((entry) => crush(entry.source));
    if (result.crushed.length > 0) {
      context.combat.triggerShake(0.32, 0.18);
      context.ui.refreshHud();
      refillDebtNpcs();
    }
    if (result.playerHit) {
      completed = true;
      context.combat.finishLevel(false, "你被债务压车砸中了，账单还在流水线上。");
    }
    if (rules.snapshot().won && !completed) {
      completed = true;
      context.combat.finishLevel(true);
    }
  }

  function updateMachines(deltaSeconds) {
    context.sceneData.machines.forEach((machine) => {
      machine.timer -= deltaSeconds;
      if (machine.timer > 0) return;
      if (machine.phase === "idle") {
        machine.phase = "warning";
        machine.timer = 0.78;
      } else if (machine.phase === "warning") {
        machine.phase = "smash";
        machine.timer = 0.36;
        smash(machine);
      } else if (machine.phase === "smash") {
        machine.phase = "recovery";
        machine.timer = 1.05;
      } else {
        machine.phase = "idle";
        machine.timer = 2.35;
      }
    });
  }

  function update(deltaSeconds) {
    if (completed) return;
    elapsed += deltaSeconds;
    rules.update(deltaSeconds, context.actors.getNpcs());
    context.actors.getNpcs().forEach((npc) => {
      if (!npc.alive) return;
      if (!npc.pushedByPlayer) {
        npc.group.rotation.z = 0;
        npc.group.scale.set(1, 1, 1);
      }
    });
    updateMachines(deltaSeconds);
    context.sceneData.updateEnvironment(deltaSeconds);
    if (elapsed >= ROUND_SECONDS) {
      completed = true;
      context.combat.finishLevel(false, "时间耗尽，账单怪还在流水线上。");
    }
  }

  function keepUnpushedNpcsOutOfTraps() {
    context.actors.getNpcs().forEach((npc) => {
      if (!npc.alive || npc.pushedByPlayer) return;
      const position = npc.group.position;
      context.sceneData.machines.forEach((machine) => {
        const dx = position.x - machine.x;
        const dz = position.z - machine.z;
        const distance = Math.hypot(dx, dz);
        const safeRadius = machine.radius + 0.55;
        if (distance >= safeRadius) return;
        const length = distance || 1;
        position.x = machine.x + (dx / length) * safeRadius;
        position.z = machine.z + (dz / length) * safeRadius;
        npc.velocity?.set?.(dx / length, dz / length);
      });
    });
  }

  function getHudState() {
    return {
      mission: "按当前朝向推送账单怪，把它们送进房贷车贷机关。",
      clue: "红色区域即将压落；每只账单怪随机爆出一至五金币",
      resourceLabel: "金币",
      resourceText: `${rules.snapshot().coins}/100`,
      timerText: String(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed))),
      attackIcon: "推",
    };
  }

  function getResultStats() {
    return {
      label: "爆出金币",
      value: `${rules.snapshot().coins} / 100`,
      attemptsLeft: rules.snapshot().coins,
      elapsed,
    };
  }

  return {
    start,
    update,
    handleAction(action) {
      if (action.type === "findHitTarget") return findHitTarget(action);
      if (action.type === "hitTarget") return hitTarget(action);
      if (action.type === "getHudState") return getHudState();
      if (action.type === "getResultStats") return getResultStats();
      if (action.type === "afterNpcUpdate") return keepUnpushedNpcsOutOfTraps();
      return undefined;
    },
    dispose() {
      completed = true;
    },
  };
}
