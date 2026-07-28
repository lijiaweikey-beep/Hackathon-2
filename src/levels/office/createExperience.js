import { createWokRules } from "./rules.js";

const ROUND_SECONDS = 90;

export function createOfficeExperience(host) {
  const THREE = host.rendering.THREE;
  const direction = { x: 0, z: 0 };
  const facing = { x: 0, z: -1 };
  const keys = new Set();
  let scene;
  let camera;
  let player;
  let boss;
  let workers = [];
  let desks = [];
  let fallingWoks = [];
  let rules;
  let active = false;
  let completed = false;
  let elapsed = 0;
  let spawnTimer = 1.2;
  let joystickPointer = null;

  function addBox(size, color, position) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color, roughness: 0.76 }),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function createPerson(color, x, z, isBoss = false) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 0.74, 3, 7),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    );
    body.position.y = 0.72;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf0b88c, roughness: 0.8 }),
    );
    head.position.y = 1.48;
    group.add(body, head);
    if (isBoss) {
      const tie = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.42, 4),
        new THREE.MeshStandardMaterial({ color: 0xdc2626 }),
      );
      tie.position.set(0, 0.92, 0.3);
      tie.rotation.z = Math.PI;
      group.add(tie);
    }
    group.position.set(x, 0, z);
    group.userData.isBoss = isBoss;
    scene.add(group);
    return group;
  }

  function buildWorld() {
    scene = host.rendering.createScene();
    scene.background = new THREE.Color(0x9aa7b8);
    camera = host.rendering.createCamera({
      left: -12,
      right: 12,
      top: 7.5,
      bottom: -7.5,
      position: [0, 19, 14],
      lookAt: [0, 0, 0],
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 16),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.92 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor, new THREE.HemisphereLight(0xffffff, 0x334155, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.position.set(-5, 12, 8);
    scene.add(light);
    desks = [
      [-7.5, -3.5], [-2.5, -3.5], [2.5, -3.5], [7.5, -3.5],
      [-7.5, 2], [-2.5, 2], [2.5, 2], [7.5, 2],
    ];
    desks.forEach(([x, z]) => addBox([3.2, 0.7, 1.25], 0x7c5a42, [x, 0.38, z]));
    for (let index = 0; index < 15; index += 1) {
      workers.push(createPerson(0x64748b + index * 900, -9 + (index % 6) * 3.6, -6 + Math.floor(index / 6) * 5.5));
    }
    player = createPerson(0xf59e0b, 0, 6);
    boss = createPerson(0x111827, 8, 5.2, true);
  }

  function collides(x, z) {
    return desks.some(([dx, dz]) =>
      Math.abs(x - dx) < 2 && Math.abs(z - dz) < 1.05);
  }

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
    if (knob) knob.style.transform = `translate(${direction.x * 28}px, ${direction.z * 28}px)`;
  }

  function releaseJoystick() {
    joystickPointer = null;
    direction.x = 0;
    direction.z = 0;
    updateKeys();
    const knob = host.surface.root.querySelector("[data-knob]");
    if (knob) knob.style.transform = "translate(0,0)";
  }

  function spawnWarning() {
    let position;
    do {
      position = {
        x: host.random.range(-10, 10),
        z: host.random.range(-6.5, 6.5),
      };
    } while (Math.hypot(position.x - boss.position.x, position.z - boss.position.z) < 2.2);
    const warning = rules.warn(position);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 1.2, 28),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.78, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, 0.03, position.z);
    scene.add(ring);
    warning.visual = ring;
  }

  function createWok(warning) {
    scene.remove(warning.visual);
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x070707, metalness: 0.45, roughness: 0.5 });
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.58, 0.2, 18), material);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.22), material);
    handle.position.x = 0.95;
    group.add(pan, handle);
    group.position.set(warning.position.x, 9, warning.position.z);
    scene.add(group);
    fallingWoks.push({ group, position: warning.position, progress: 0 });
  }

  function finish(won, failMessage) {
    if (completed) return;
    completed = true;
    active = false;
    host.flow.finish({
      won,
      failMessage,
      stats: {
        label: "剩余生命",
        value: `${rules.snapshot().hp} 点`,
        attemptsLeft: rules.snapshot().hp,
        elapsed,
      },
    });
  }

  function punch() {
    if (!active || completed) return;
    const dx = boss.position.x - player.position.x;
    const dz = boss.position.z - player.position.z;
    const distance = Math.hypot(dx, dz);
    const dot = distance > 0 ? (facing.x * dx + facing.z * dz) / distance : 1;
    if (distance <= 1.8 && dot > 0.62 && rules.punch({ isBoss: true })) {
      boss.scale.set(1.5, 0.08, 1.5);
      finish(true);
    }
  }

  function bindInput() {
    const root = host.surface.root;
    host.input.listen(root, "click", (event) => {
      if (event.target?.closest?.("[data-start]")) host.flow.start();
      if (event.target?.closest?.("[data-punch]")) punch();
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
      if (event.code === "Space" || event.code === "KeyJ") punch();
    });
    host.input.listen(host.input.windowTarget, "keyup", (event) => {
      keys.delete(event.code);
      updateKeys();
    });
  }

  function updateHud() {
    const hp = host.surface.root.querySelector("[data-hp]");
    const timer = host.surface.root.querySelector("[data-time]");
    if (hp) hp.textContent = "❤️".repeat(Math.max(0, rules.snapshot().hp));
    if (timer) timer.textContent = String(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)));
  }

  return {
    presentation: "standalone",
    mount() {
      rules = createWokRules({ hp: 3, warningSeconds: 0.5 });
      host.surface.setContent(`
        <main class="office-game">
          <header><strong>🍳 躲黑锅</strong><span data-hp>❤️❤️❤️</span><span>⏱ <b data-time>90</b></span></header>
          <div class="office-controls"><div class="office-joystick" data-joystick><i data-knob></i></div><button data-punch>👊</button></div>
          <section class="briefing"><h1>27 岁 · 躲老板黑锅</h1><p>红圈出现后立刻离开。找到戴红领带的老板，一拳结束。</p><button data-start>开始上班</button></section>
        </main>
      `);
      workers = [];
      buildWorld();
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
      const moveX = (direction.x / length) * 5.5 * deltaSeconds;
      const moveZ = (direction.z / length) * 5.5 * deltaSeconds;
      if (!collides(player.position.x + moveX, player.position.z)) player.position.x = Math.max(-11, Math.min(11, player.position.x + moveX));
      if (!collides(player.position.x, player.position.z + moveZ)) player.position.z = Math.max(-7, Math.min(7, player.position.z + moveZ));
      if (Math.hypot(moveX, moveZ) > 0.001) {
        facing.x = moveX / Math.hypot(moveX, moveZ);
        facing.z = moveZ / Math.hypot(moveX, moveZ);
        player.rotation.y = Math.atan2(facing.x, facing.z);
      }
      boss.position.x = Math.sin(elapsed * 0.42) * 9;
      boss.position.z = Math.cos(elapsed * 0.31) * 5.5;
      workers.forEach((worker, index) => {
        worker.position.x += Math.sin(elapsed + index) * deltaSeconds * 0.28;
        worker.position.z += Math.cos(elapsed * 0.8 + index) * deltaSeconds * 0.22;
      });

      spawnTimer -= deltaSeconds;
      const interval = elapsed < 30 ? 2.4 : elapsed < 60 ? 1.8 : 1.3;
      if (spawnTimer <= 0 && fallingWoks.length < 5) {
        spawnWarning();
        spawnTimer = interval;
      }
      rules.update(deltaSeconds).ready.forEach(createWok);
      fallingWoks = fallingWoks.filter((wok) => {
        wok.progress += deltaSeconds / 0.58;
        wok.group.position.y = 9 - Math.min(1, wok.progress) * 8.85;
        wok.group.rotation.x += deltaSeconds * 9;
        if (wok.progress < 1) return true;
        const result = rules.land({
          position: wok.position,
          playerPosition: player.position,
          bossPosition: boss.position,
        });
        scene.remove(wok.group);
        if (result.playerHit) host.surface.root.querySelector(".office-game")?.classList.add("hit");
        return false;
      });
      if (rules.snapshot().failed) finish(false, "连续接锅，生命归零。");
      if (elapsed >= ROUND_SECONDS) finish(false, "下班时间到了，老板仍在人群里甩锅。");
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
      if (action?.type === "primary") punch();
    },
    render() {
      if (scene && camera) host.rendering.render(scene, camera);
    },
    getResultStats() {
      return {
        label: "剩余生命",
        value: `${rules?.snapshot().hp ?? 0} 点`,
        attemptsLeft: rules?.snapshot().hp ?? 0,
        elapsed,
      };
    },
    showResult({ won }) {
      host.surface.setContent(`<main class="office-game result"><section><h1>${won ? "老板被一拳打爆" : "这锅背下了"}</h1><p>${won ? "黑锅雨停了。" : "再观察红圈和红领带。"}</p><button data-leave>返回人生时间线</button></section></main>`);
      bindInput();
    },
    dispose() {
      active = false;
      keys.clear();
      if (scene) host.rendering.disposeScene(scene);
      scene = null;
      host.surface.clear();
    },
  };
}
