import { createDebtRules } from "./rules.js";
import { createDebtWorld } from "./world.js";

const ROUND_SECONDS = 90;

export function createDebtSmasherExperience(host) {
  const THREE = host.rendering.THREE;
  const direction = { x: 0, z: 0 };
  const facing = { x: 0, z: -1 };
  const keys = new Set();
  let world;
  let rules;
  let active = false;
  let completed = false;
  let elapsed = 0;
  let joystickPointer = null;

  function updateKeys() {
    direction.x = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0)
      - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    direction.z = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0)
      - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  }

  function updateJoystick(event, target) {
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.34);
    const z = (event.clientY - rect.top - rect.height / 2) / (rect.height * 0.34);
    const length = Math.max(1, Math.hypot(x, z));
    direction.x = x / length;
    direction.z = z / length;
    const knob = host.surface.root.querySelector("[data-knob]");
    if (knob) knob.style.transform = `translate(${direction.x * 28}px,${direction.z * 28}px)`;
  }

  function releaseJoystick() {
    joystickPointer = null;
    direction.x = 0;
    direction.z = 0;
    updateKeys();
    const knob = host.surface.root.querySelector("[data-knob]");
    if (knob) knob.style.transform = "translate(0,0)";
  }

  function nearestTarget() {
    let best = null;
    let bestDistance = Infinity;
    world.npcs.forEach((npc) => {
      if (npc.flattened) return;
      const dx = npc.x - world.player.position.x;
      const dz = npc.z - world.player.position.z;
      const distance = Math.hypot(dx, dz);
      const dot = distance ? (facing.x * dx + facing.z * dz) / distance : 1;
      if (distance <= 2 && dot > 0.35 && distance < bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    });
    return best;
  }

  function hit() {
    if (!active || completed) return;
    const target = nearestTarget();
    if (!rules.hit(target)) return;
    target.group.rotation.z = -0.35;
    target.group.scale.set(1.12, 0.82, 1.12);
  }

  function push() {
    if (!active || completed) return;
    const target = nearestTarget();
    if (!rules.push(target, facing)) return;
    target.x = Math.max(-10.8, Math.min(10.8, target.x));
    target.z = Math.max(-6.8, Math.min(6.8, target.z));
    target.group.position.set(target.x, 0, target.z);
  }

  function popCoins(npc) {
    for (let index = 0; index < 5; index += 1) {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.07, 12),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7 }),
      );
      coin.rotation.x = Math.PI / 2;
      coin.position.set(
        npc.x + Math.cos(index * 1.25) * 0.65,
        0.45 + (index % 2) * 0.32,
        npc.z + Math.sin(index * 1.25) * 0.65,
      );
      world.scene.add(coin);
    }
  }

  function finish(won, failMessage) {
    if (completed) return;
    completed = true;
    active = false;
    host.flow.finish({
      won,
      failMessage,
      stats: {
        label: "爆出金币",
        value: `${rules.snapshot().coins} / 100`,
        attemptsLeft: Math.floor(rules.snapshot().coins / 20),
        elapsed,
      },
    });
  }

  function smash(machine) {
    const result = rules.smash(machine, world.npcs, world.player.position);
    result.crushed.forEach((npc) => {
      npc.group.scale.set(1.8, 0.08, 1.8);
      popCoins(npc);
    });
    if (result.playerHit) finish(false, "你被粉碎机压扁了，债务没有被压扁。");
    if (rules.snapshot().won) finish(true);
  }

  function updateMachines(deltaSeconds) {
    world.machines.forEach((machine) => {
      machine.timer -= deltaSeconds;
      if (machine.timer > 0) return;
      if (machine.phase === "idle") {
        machine.phase = "warning";
        machine.timer = 0.8;
        machine.pad.material.color.set(0xef4444);
        machine.pad.material.emissive.set(0x5b0b0b);
      } else if (machine.phase === "warning") {
        machine.phase = "smash";
        machine.timer = 0.36;
        machine.press.position.y = 0.55;
        smash(machine);
      } else if (machine.phase === "smash") {
        machine.phase = "recovery";
        machine.timer = 1.05;
        machine.press.position.y = 4.6;
        machine.pad.material.color.set(0x374151);
        machine.pad.material.emissive.set(0x000000);
      } else {
        machine.phase = "idle";
        machine.timer = 2.4;
      }
    });
  }

  function bindInput() {
    const root = host.surface.root;
    host.input.listen(root, "click", (event) => {
      if (event.target?.closest?.("[data-start]")) host.flow.start();
      if (event.target?.closest?.("[data-hit]")) hit();
      if (event.target?.closest?.("[data-push]")) push();
      if (event.target?.closest?.("[data-leave]")) host.flow.leave();
    });
    const joystick = root.querySelector("[data-joystick]");
    if (joystick) {
      host.input.listen(joystick, "pointerdown", (event) => {
        joystickPointer = event.pointerId;
        joystick.setPointerCapture?.(event.pointerId);
        updateJoystick(event, joystick);
      });
      host.input.listen(joystick, "pointermove", (event) => {
        if (event.pointerId === joystickPointer) updateJoystick(event, joystick);
      });
    }
    ["pointerup", "pointercancel"].forEach((type) =>
      host.input.listen(host.input.windowTarget, type, releaseJoystick));
    host.input.listen(host.input.windowTarget, "keydown", (event) => {
      keys.add(event.code);
      updateKeys();
      if (event.code === "Space" || event.code === "KeyJ") hit();
      if (event.code === "KeyK") push();
    });
    host.input.listen(host.input.windowTarget, "keyup", (event) => {
      keys.delete(event.code);
      updateKeys();
    });
  }

  function updateHud() {
    const coins = host.surface.root.querySelector("[data-coins]");
    const timer = host.surface.root.querySelector("[data-time]");
    if (coins) coins.textContent = `${rules.snapshot().coins} / 100`;
    if (timer) timer.textContent = String(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)));
  }

  return {
    presentation: "standalone",
    mount() {
      rules = createDebtRules();
      host.surface.setContent(`
        <main class="debt-game">
          <header><strong>🪙 爆金币</strong><span>金币 <b data-coins>0 / 100</b></span><span>⏱ <b data-time>90</b></span></header>
          <div class="debt-controls"><div class="debt-joystick" data-joystick><i data-knob></i></div><div><button data-hit>👊<small>打晕</small></button><button data-push>🫷<small>推入</small></button></div></div>
          <section class="briefing"><h1>30 岁 · 爆金币</h1><p>先打晕路人，再推入红色预警区。每人爆 20 金币，凑够 100 通关；自己被压中立即失败。</p><button data-start>开始还债</button></section>
        </main>
      `);
      world = createDebtWorld(host);
      bindInput();
      updateHud();
    },
    start() {
      active = true;
      host.surface.root.querySelector(".briefing")?.classList.add("hidden");
    },
    update(deltaSeconds) {
      if (!active || completed) return;
      elapsed += deltaSeconds;
      const length = Math.hypot(direction.x, direction.z) || 1;
      const moveX = (direction.x / length) * 5.4 * deltaSeconds;
      const moveZ = (direction.z / length) * 5.4 * deltaSeconds;
      world.player.position.x = Math.max(-11, Math.min(11, world.player.position.x + moveX));
      world.player.position.z = Math.max(-7, Math.min(7, world.player.position.z + moveZ));
      if (Math.hypot(moveX, moveZ) > 0.001) {
        facing.x = moveX / Math.hypot(moveX, moveZ);
        facing.z = moveZ / Math.hypot(moveX, moveZ);
        world.player.rotation.y = Math.atan2(facing.x, facing.z);
      }
      rules.update(deltaSeconds, world.npcs);
      world.npcs.forEach((npc) => {
        if (npc.flattened) return;
        if (npc.stunRemaining <= 0) {
          npc.group.rotation.z = 0;
          npc.group.scale.set(1, 1, 1);
        }
      });
      updateMachines(deltaSeconds);
      if (elapsed >= ROUND_SECONDS) finish(false, "时间耗尽，金币还没攒够。");
      updateHud();
    },
    pause() {
      active = false;
      releaseJoystick();
    },
    resume() {
      if (!completed) active = true;
    },
    handleInput(action) {
      if (action?.type === "primary") hit();
      if (action?.type === "secondary") push();
    },
    render() {
      if (world) host.rendering.render(world.scene, world.camera);
    },
    getResultStats() {
      return {
        label: "爆出金币",
        value: `${rules?.snapshot().coins ?? 0} / 100`,
        attemptsLeft: Math.floor((rules?.snapshot().coins ?? 0) / 20),
        elapsed,
      };
    },
    showResult({ won }) {
      host.surface.setContent(`<main class="debt-game result"><section><h1>${won ? "债务粉碎完成" : "先被生活压扁"}</h1><p>${won ? "一百金币到手，人生主线完成。" : "先打晕再推入，注意红色预警。"}</p><button data-leave>返回人生时间线</button></section></main>`);
      bindInput();
    },
    dispose() {
      active = false;
      keys.clear();
      if (world?.scene) host.rendering.disposeScene(world.scene);
      world = null;
      host.surface.clear();
    },
  };
}
