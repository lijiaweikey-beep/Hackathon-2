import * as THREE from "three";
import { createActorSystem } from "../../systems/createActorSystem.js";
import {
  createPhotoEvidenceRules,
  evaluatePhotoScene,
  isPlayerObserved,
} from "./rules.js";
import { createSupermarketTargetSequence } from "./targetSequence.js";
import { createSupermarketWorld } from "./world.js";

const ROUND_SECONDS = 90;

export function createSupermarketExperience(host) {
  const direction = { x: 0, z: 0 };
  const keys = new Set();
  const playerVelocity = new THREE.Vector2();
  let world;
  let actors;
  let targetSequence;
  let rules;
  let active = false;
  let completed = false;
  let elapsed = 0;
  let alert = 0;
  let photoPoseTimer = 0;
  let messageTimer = 0;
  let joystickPointer = null;

  function query(selector) {
    return host.surface.root.querySelector(selector);
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
    const knob = query("[data-knob]");
    if (knob) {
      knob.style.transform = `translate(${direction.x * 28}px, ${direction.z * 28}px)`;
    }
  }

  function releaseJoystick() {
    joystickPointer = null;
    direction.x = 0;
    direction.z = 0;
    updateDirectionFromKeys();
    const knob = query("[data-knob]");
    if (knob) knob.style.transform = "translate(0, 0)";
  }

  function showMessage(text, warning = false, duration = 1.8) {
    const feedback = query("[data-feedback]");
    if (!feedback) return;
    feedback.textContent = text;
    feedback.classList.toggle("warning", warning);
    messageTimer = duration;
  }

  function contextualMessage(encounter) {
    if (rules.snapshot().exitOpen) return "证据链完整，前往中央绿色收银通道";
    if (encounter.interacting) {
      return rules.canCapture()
        ? "双目标已确认，立即拍照"
        : "目标正在互动，调整方向让两人同时入镜";
    }
    return encounter.state === "approach"
      ? "目标正在靠近，保持距离观察"
      : "目标正在分散，继续跟随";
  }

  function updateHud() {
    const state = rules.snapshot();
    const encounter = targetSequence.snapshot();
    const photos = query("[data-photos]");
    const alertBar = query("[data-alert]");
    const alertState = query("[data-alert-state]");
    const timer = query("[data-time]");
    const photo = query("[data-photo]");
    const focus = query("[data-focus]");
    const exitText = query("[data-exit]");
    const alertPanel = query(".alert-panel");
    const ready = rules.canCapture();

    if (photos) {
      photos.textContent = `${"▣".repeat(state.photos)}${"□".repeat(4 - state.photos)} ${state.photos}/4`;
    }
    if (alertBar) alertBar.style.width = `${alert}%`;
    if (timer) timer.textContent = String(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)));
    if (alertState) alertState.textContent = alert >= 70 ? "危险" : alert >= 30 ? "注意" : "安全";
    alertPanel?.classList.toggle("danger", alert >= 70);
    alertPanel?.classList.toggle("caution", alert >= 30 && alert < 70);
    photo?.classList.toggle("ready", ready);
    focus?.classList.toggle("ready", ready);
    if (exitText) {
      exitText.textContent = state.exitOpen ? "中央出口已开启" : "收银区封锁中";
    }
    if (messageTimer <= 0) showMessage(contextualMessage(encounter), false, 0);
    world.setExitOpen(state.exitOpen);
  }

  function finish(won, failMessage) {
    if (completed) return;
    completed = true;
    active = false;
    const state = rules.snapshot();
    host.flow.finish({
      won,
      failMessage,
      stats: {
        label: "取证进度",
        value: `${state.photos} / 4`,
        attemptsLeft: state.opportunitiesRemaining,
      },
    });
  }

  function playCaptureAnimation(photoCount) {
    photoPoseTimer = 0.55;
    const game = query(".supermarket-game");
    const evidence = query("[data-evidence]");
    const evidenceCount = query("[data-evidence-count]");
    game?.classList.remove("capturing");
    if (game) void game.offsetWidth;
    game?.classList.add("capturing");
    if (evidenceCount) evidenceCount.textContent = `目标确认 · 证据 ${photoCount}/4`;
    evidence?.classList.remove("visible");
    if (evidence) void evidence.offsetWidth;
    evidence?.classList.add("visible");
  }

  function takePhoto() {
    if (!active || completed) return;
    const result = rules.capture();
    if (!result.ok) {
      showMessage(result.reason, true);
      return;
    }
    targetSequence.resolveCapture();
    playCaptureAnimation(result.photos);
    showMessage(`拍摄成功，目标确认 ${result.photos}/4`, false, 2.2);
    updateHud();
  }

  function bindInput() {
    const root = host.surface.root;
    host.input.listen(root, "click", (event) => {
      if (event.target?.closest?.("[data-start]")) host.flow.start();
      if (event.target?.closest?.("[data-photo]")) takePhoto();
      if (event.target?.closest?.("[data-leave]")) host.flow.leave();
    });
    const joystick = query("[data-joystick]");
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
    host.input.listen(host.input.windowTarget, "resize", () => {
      world.resizeCamera(
        host.rendering.canvas?.clientWidth,
        host.rendering.canvas?.clientHeight,
      );
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

  function createActors() {
    const targetGroup = Symbol("supermarket-targets");
    world.couple.forEach((actor) => {
      actor.levelManaged = true;
      actor.separationGroup = targetGroup;
    });
    actors = createActorSystem({
      getScene: () => world.scene,
      getPlayer: () => world.player,
      getLevel: () => ({ legacy: false }),
      createNpc: () => null,
      collidesWithObstacle: world.collidesWithObstacle,
      clampActorPosition: world.clampActorPosition,
      resolveObstacleCollisions: world.resolveObstacleCollisions,
      dispatch: () => false,
      getTotalTime: () => elapsed,
      randomRange: (...args) => host.random.range(...args),
      readPlayerInput: (target) => target.set(direction.x, -direction.z),
      applyInputLock: () => {},
      getPlayerVelocity: () => playerVelocity,
      updatePlayerTimers: () => {},
    });
    [...world.couple, ...world.customers].forEach(actors.addNpc);
    targetSequence = createSupermarketTargetSequence({
      members: world.couple,
      interactionPoints: world.interactionPoints,
      moveToward: actors.moveNpcToward,
      faceToward: actors.faceNpcToward,
      randomRange: (...args) => host.random.range(...args),
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
          <div class="alert-panel">
            <div class="alert-heading"><span>警戒 · <b data-alert-state>安全</b></span><div class="alert-track"><i data-alert></i></div></div>
            <small>靠近并进入目标视线会上升 · 远离或借货架遮挡会下降 · 满值即失败</small>
          </div>
          <p class="exit-hint" data-exit>收银区封锁中</p>
          <p class="photo-feedback" data-feedback>跟随目标，等待两人互动</p>
          <div class="photo-focus" data-focus><i></i><i></i><i></i><i></i></div>
          <div class="flash" data-flash></div>
          <aside class="evidence-card" data-evidence><span>取证成功</span><strong data-evidence-count>目标确认</strong></aside>
          <div class="standalone-controls">
            <div class="standalone-joystick" data-joystick aria-label="移动"><i data-knob></i></div>
            <button type="button" class="photo-button" data-photo aria-label="拍照"><span>📸</span></button>
          </div>
          <section class="briefing">
            <small>人生阶段 · 25 岁</small>
            <h1>25 岁 · 超市取证</h1>
            <p>跟随目标并抓拍四次不同互动。让两人同时进入取景框且保持无遮挡，再从中央收银通道撤离。</p>
            <button type="button" data-start>开始跟踪</button>
          </section>
        </main>
      `);
      world = createSupermarketWorld(host);
      createActors();
      bindInput();
      updateHud();
    },
    start() {
      active = true;
      query(".briefing")?.classList.add("hidden");
      showMessage("跟随目标，等待两人靠近互动", false, 2.5);
    },
    update(deltaSeconds) {
      if (!active || completed) return;
      elapsed += deltaSeconds;
      messageTimer = Math.max(0, messageTimer - deltaSeconds);
      photoPoseTimer = Math.max(0, photoPoseTimer - deltaSeconds);

      actors.updatePlayer(deltaSeconds);
      const sequenceResult = targetSequence.update(deltaSeconds);
      actors.updateNpcs(deltaSeconds);
      if (photoPoseTimer > 0) {
        const { leftArm, rightArm } = world.player.group.userData;
        leftArm.rotation.x = -1.35;
        rightArm.rotation.x = -1.35;
      }

      const encounter = targetSequence.snapshot();
      const photoScene = evaluatePhotoScene({
        player: world.player,
        couple: world.couple,
        isLineBlocked: world.isLineBlocked,
      });
      rules.setScene({ ...photoScene, ...encounter });
      if (sequenceResult?.missedEventId != null && !rules.snapshot().exitOpen) {
        rules.missOpportunity();
        showMessage("本次互动已结束，继续寻找下一次机会", true);
      }

      const observed = isPlayerObserved({
        player: world.player,
        couple: world.couple,
        isLineBlocked: world.isLineBlocked,
      });
      alert = observed
        ? Math.min(100, alert + deltaSeconds * 34)
        : Math.max(0, alert - deltaSeconds * 18);

      if (alert >= 100) finish(false, "警戒已满，你被目标发现了。");
      if (rules.snapshot().failed) finish(false, "抓拍机会已经不足，证据链无法完成。");
      if (
        rules.snapshot().exitOpen
        && world.isInsideExit(world.player.group.position)
        && rules.reachExit()
      ) {
        finish(true);
      }
      if (elapsed >= ROUND_SECONDS) finish(false, "超市即将打烊，取证没有完成。");
      updateHud();
    },
    pause() {
      active = false;
      releaseJoystick();
      playerVelocity.set(0, 0);
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
      const state = rules?.snapshot();
      return {
        label: "取证进度",
        value: `${state?.photos ?? 0} / 4`,
        attemptsLeft: state?.opportunitiesRemaining ?? 0,
      };
    },
    showResult({ won }) {
      host.surface.setContent(`
        <main class="supermarket-game result-screen">
          <section><h1>${won ? "证据到手" : "跟踪失败"}</h1>
          <p>${won ? "四次有效互动已经确认，你从中央收银通道安全离开。" : "观察目标视线和取景提示，再找一次机会。"}</p>
          <button type="button" data-leave>返回人生时间线</button></section>
        </main>
      `);
    },
    dispose() {
      active = false;
      keys.clear();
      actors?.reset();
      if (world) host.rendering.disposeScene(world.scene);
      actors = null;
      targetSequence = null;
      world = null;
      host.surface.clear();
    },
  };
}
