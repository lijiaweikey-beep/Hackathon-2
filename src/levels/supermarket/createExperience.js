import { createPhotoEvidenceRules } from "./rules.js";
import { createSupermarketWorld } from "./world.js";

const ROUND_SECONDS = 90;

export function createSupermarketExperience(host) {
  const direction = { x: 0, z: 0 };
  const keys = new Set();
  let world;
  let active = false;
  let completed = false;
  let elapsed = 0;
  let interactionTimer = 0;
  let nextInteraction = 2.5;
  let alert = 0;
  let rules;
  let joystickPointer = null;

  function lineBlocked(from, to) {
    const steps = 12;
    for (let step = 1; step < steps; step += 1) {
      const ratio = step / steps;
      const x = from.x + (to.x - from.x) * ratio;
      const z = from.z + (to.z - from.z) * ratio;
      if (world.shelves.some(([sx, sz, hx, hz]) =>
        Math.abs(x - sx) < hx && Math.abs(z - sz) < hz)) return true;
    }
    return false;
  }

  function collides(x, z) {
    return world.shelves.some(([sx, sz, hx, hz]) =>
      Math.abs(x - sx) < hx + 0.38 && Math.abs(z - sz) < hz + 0.38);
  }

  function updateDirectionFromKeys() {
    direction.x = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0)
      - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    direction.z = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0)
      - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  }

  function updateJoystick(event, target) {
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.34);
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height * 0.34);
    const length = Math.max(1, Math.hypot(x, y));
    direction.x = x / length;
    direction.z = y / length;
    const knob = host.surface.root.querySelector("[data-knob]");
    if (knob) knob.style.transform = `translate(${direction.x * 28}px, ${direction.z * 28}px)`;
  }

  function releaseJoystick() {
    joystickPointer = null;
    direction.x = 0;
    direction.z = 0;
    updateDirectionFromKeys();
    const knob = host.surface.root.querySelector("[data-knob]");
    if (knob) knob.style.transform = "translate(0, 0)";
  }

  function updateHud() {
    const state = rules.snapshot();
    const photos = host.surface.root.querySelector("[data-photos]");
    const alertBar = host.surface.root.querySelector("[data-alert]");
    const timer = host.surface.root.querySelector("[data-time]");
    const photo = host.surface.root.querySelector("[data-photo]");
    const exitText = host.surface.root.querySelector("[data-exit]");
    if (photos) photos.textContent = `${"▣".repeat(state.photos)}${"□".repeat(4 - state.photos)} ${state.photos}/4`;
    if (alertBar) alertBar.style.width = `${alert}%`;
    if (timer) timer.textContent = String(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)));
    photo?.classList.toggle("ready", rules.canCapture());
    if (exitText) exitText.textContent = state.exitOpen ? "出口已开启，前往绿色收银区" : "收银区封锁中";
    world.setExitOpen(state.exitOpen);
  }

  function finish(won, failMessage) {
    if (completed) return;
    completed = true;
    active = false;
    host.flow.finish({
      won,
      failMessage,
      stats: {
        label: "取证进度",
        value: `${rules.snapshot().photos} / 4`,
        attemptsLeft: rules.snapshot().photos,
      },
    });
  }

  function takePhoto() {
    if (!active || completed) return;
    const result = rules.capture();
    if (!result.ok) return;
    interactionTimer = 0;
    nextInteraction = 3.5;
    const flash = host.surface.root.querySelector("[data-flash]");
    flash?.classList.remove("active");
    if (flash) void flash.offsetWidth;
    flash?.classList.add("active");
    updateHud();
  }

  function bindInput() {
    const root = host.surface.root;
    host.input.listen(root, "click", (event) => {
      if (event.target?.closest?.("[data-start]")) host.flow.start();
      if (event.target?.closest?.("[data-photo]")) takePhoto();
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
    ["pointerup", "pointercancel"].forEach((type) => {
      host.input.listen(host.input.windowTarget, type, releaseJoystick);
    });
    host.input.listen(host.input.windowTarget, "keydown", (event) => {
      keys.add(event.code);
      updateDirectionFromKeys();
      if (event.code === "Space" || event.code === "KeyJ") takePhoto();
    });
    host.input.listen(host.input.windowTarget, "keyup", (event) => {
      keys.delete(event.code);
      updateDirectionFromKeys();
    });
  }

  return {
    presentation: "standalone",
    mount() {
      const opportunities = Math.floor(host.random.range(5, 7));
      rules = createPhotoEvidenceRules({ requiredPhotos: 4, opportunities });
      host.surface.setContent(`
        <main class="supermarket-game">
          <header class="supermarket-hud">
            <div class="hud-block"><span>取证进度</span><strong data-photos>□□□□ 0/4</strong></div>
            <div class="hud-block time"><span>剩余时间</span><strong><b data-time>90</b> 秒</strong></div>
          </header>
          <div class="alert-panel"><span>警戒</span><div class="alert-track"><i data-alert></i></div></div>
          <p class="exit-hint" data-exit>收银区封锁中</p>
          <div class="flash" data-flash></div>
          <div class="standalone-controls">
            <div class="standalone-joystick" data-joystick aria-label="移动"><i data-knob></i></div>
            <button type="button" class="photo-button" data-photo aria-label="拍照"><span>📸</span></button>
          </div>
          <section class="briefing">
            <small>人生阶段 · 25 岁</small>
            <h1>25 岁 · 超市取证</h1>
            <p>抓拍四次亲密互动，再从收银通道撤离。靠太近会提高警戒值。</p>
            <button type="button" data-start>开始跟踪</button>
          </section>
        </main>
      `);
      world = createSupermarketWorld(host);
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
      const nextX = world.player.position.x + (direction.x / length) * 5.4 * deltaSeconds;
      const nextZ = world.player.position.z + (direction.z / length) * 5.4 * deltaSeconds;
      if (!collides(nextX, world.player.position.z)) world.player.position.x = Math.max(-11, Math.min(11, nextX));
      if (!collides(world.player.position.x, nextZ)) world.player.position.z = Math.max(-7, Math.min(7, nextZ));

      if (interactionTimer > 0) {
        interactionTimer -= deltaSeconds;
        world.couple[0].position.x = -0.25;
        world.couple[1].position.x = 0.25;
        world.couple[0].position.z = world.couple[1].position.z = -0.2;
        if (interactionTimer <= 0) {
          rules.missOpportunity();
          nextInteraction = 3.2;
        }
      } else {
        nextInteraction -= deltaSeconds;
        const orbit = elapsed * 0.45;
        world.couple[0].position.set(Math.sin(orbit) * 7, 0, Math.cos(orbit) * 4.8);
        world.couple[1].position.set(Math.sin(orbit + 0.45) * 7, 0, Math.cos(orbit + 0.45) * 4.8);
        if (nextInteraction <= 0 && rules.snapshot().opportunitiesRemaining > 0) {
          interactionTimer = 2.8;
        }
      }

      const target = world.couple[0].position;
      const distance = Math.hypot(
        world.player.position.x - target.x,
        world.player.position.z - target.z,
      );
      const obstructed = lineBlocked(world.player.position, target);
      rules.setScene({
        interacting: interactionTimer > 0,
        obstructed,
        distance,
      });
      alert = distance < 3.4 && !obstructed && interactionTimer <= 0
        ? Math.min(100, alert + deltaSeconds * 34)
        : Math.max(0, alert - deltaSeconds * 18);
      if (alert >= 100) finish(false, "你被发现了，目标从超市另一侧离开。");
      if (rules.snapshot().failed) finish(false, "抓拍机会已经不足，证据链无法完成。");
      if (rules.snapshot().exitOpen && world.player.position.z > 6.6 && rules.reachExit()) finish(true);
      if (elapsed >= ROUND_SECONDS) finish(false, "超市即将打烊，取证没有完成。");
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
      if (action?.type === "photo" || action?.type === "primary") takePhoto();
    },
    render() {
      if (world) host.rendering.render(world.scene, world.camera);
    },
    getResultStats() {
      return {
        label: "取证进度",
        value: `${rules?.snapshot().photos ?? 0} / 4`,
        attemptsLeft: rules?.snapshot().photos ?? 0,
      };
    },
    showResult({ won }) {
      host.surface.setContent(`
        <main class="supermarket-game result-screen">
          <section><h1>${won ? "证据到手" : "跟踪失败"}</h1>
          <p>${won ? "收银通道亮起绿灯，你带着四张照片离开。" : "调整路线，再找一次机会。"}</p>
          <button type="button" data-leave>返回人生时间线</button></section>
        </main>
      `);
      bindInput();
    },
    dispose() {
      active = false;
      keys.clear();
      if (world) host.rendering.disposeScene(world.scene);
      world = null;
      host.surface.clear();
    },
  };
}
