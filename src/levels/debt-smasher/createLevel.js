import * as THREE from "three";
import { createDebtRules } from "./rules.js";

const HIT_PUSH_DISTANCE = 2.4;
const HIT_MAX_TARGETS = 3;
const PUSH_HOLD_SECONDS = 2;
const ROUND_SECONDS = 100;
const DEBT_TYPES = ["mortgage", "car-loan"];
const DEFAULT_PLAY_BOUNDS = { minX: -9.2, maxX: 9.2, minZ: -7.4, maxZ: 7.4 };

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

  function clampToDebtFactory(position, velocity) {
    const bounds = context.sceneData.playBounds ?? DEFAULT_PLAY_BOUNDS;
    if (position.x < bounds.minX) {
      position.x = bounds.minX;
      if (velocity) velocity.x = Math.abs(velocity.x);
    } else if (position.x > bounds.maxX) {
      position.x = bounds.maxX;
      if (velocity) velocity.x = -Math.abs(velocity.x);
    }
    if (position.z < bounds.minZ) {
      position.z = bounds.minZ;
      if (velocity) velocity.y = Math.abs(velocity.y);
    } else if (position.z > bounds.maxZ) {
      position.z = bounds.maxZ;
      if (velocity) velocity.y = -Math.abs(velocity.y);
    }
  }

  function isInsideMachine(position) {
    return context.sceneData.machines.some((machine) =>
      Math.hypot(position.x - machine.x, position.z - machine.z) <= machine.radius);
  }

  function holdNpc(npc) {
    npc.levelManaged = true;
    npc.walking = false;
    npc.velocity?.set?.(0, 0);
    npc.pushedHoldRemaining = PUSH_HOLD_SECONDS;
    npc.holdPosition = npc.group.position.clone();
    if (isInsideMachine(npc.group.position)) {
      npc.trapHoldPosition = npc.group.position.clone();
    }
  }

  function findHitTarget({ playerPos, facing }) {
    const candidates = [];
    context.actors.getNpcs().forEach((npc) => {
      if (!npc.alive || !npc.isDebtTarget) return;
      const dx = npc.group.position.x - playerPos.x;
      const dz = npc.group.position.z - playerPos.z;
      const distance = Math.hypot(dx, dz);
      const direction = new THREE.Vector2(dx, dz);
      if (
        distance <= 2.1
        && context.combat.isFacingTarget(facing, direction)
      ) {
        candidates.push({ npc, distance });
      }
    });
    candidates.sort((a, b) => a.distance - b.distance);
    const npcs = candidates.slice(0, HIT_MAX_TARGETS).map((entry) => entry.npc);
    return npcs.length ? { npc: npcs[0], npcs, correct: true } : null;
  }

  function pushNpc(npc, facing) {
    const position = npc.group.position;
    delete npc.holdPosition;
    delete npc.trapHoldPosition;
    const source = { x: position.x, z: position.z, flattened: !npc.alive };
    if (!rules.push(source, { x: facing.x, z: facing.y })) return false;
    position.x = source.x;
    position.z = source.z;
    clampToDebtFactory(position, npc.velocity);
    npc.pushedByPlayer = true;
    npc.walking = false;
    holdNpc(npc);
    return true;
  }

  function hitTarget({ hit }) {
    const targets = (hit?.npcs?.length ? hit.npcs : [hit?.npc]).filter((target) => target?.alive);
    if (targets.length === 0 || completed) return { handled: true };
    const player = context.actors.getPlayer();
    const facing = new THREE.Vector2(Math.sin(player.group.rotation.y), Math.cos(player.group.rotation.y));

    const pushed = targets.filter((target) => pushNpc(target, facing));
    if (pushed.length > 0) {
      pushed.forEach((target) => {
        target.group.rotation.z = -0.35;
        target.group.scale.set(1.08, 0.92, 1.08);
      });
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
    result.crushed.forEach((entry) => {
      crush(entry.source);
      context.sceneData.createCoinBurst?.({
        position: entry.source.group.position.clone(),
        debtType: entry.source.debtType,
        coins: entry.coinsDropped ?? 0,
      });
    });
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
      if (npc.pushedHoldRemaining > 0) {
        npc.pushedHoldRemaining = Math.max(0, npc.pushedHoldRemaining - deltaSeconds);
        if (npc.pushedHoldRemaining <= 0 && !npc.trapHoldPosition) {
          npc.levelManaged = false;
          delete npc.holdPosition;
        }
      }
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
    clampToDebtFactory(context.actors.getPlayer().group.position);
    context.actors.getNpcs().forEach((npc) => {
      if (!npc.alive) return;
      if (npc.trapHoldPosition) {
        npc.group.position.copy(npc.trapHoldPosition);
        npc.levelManaged = true;
        npc.walking = false;
        npc.velocity?.set?.(0, 0);
        return;
      }
      if (npc.holdPosition && npc.pushedHoldRemaining > 0) {
        npc.group.position.copy(npc.holdPosition);
        npc.levelManaged = true;
        npc.walking = false;
        npc.velocity?.set?.(0, 0);
        return;
      }
      clampToDebtFactory(npc.group.position, npc.velocity);
      if (npc.pushedByPlayer && isInsideMachine(npc.group.position)) {
        holdNpc(npc);
        return;
      }
      if (npc.pushedByPlayer) return;
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
      clue: "房贷车贷化身成账单怪，在工厂里满街乱窜。你必须把它们推进压榨机关，爆出金币还清债务！",
      resourceLabel: "金币",
      resourceText: `${rules.snapshot().coins}/100`,
      timerText: String(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed))),
      attackIcon: "踢",
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
