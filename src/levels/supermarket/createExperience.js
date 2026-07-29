import { createActorSystem } from "../../systems/createActorSystem.js";
import {
  createPhotoEvidenceRules,
  evaluatePhotoScene,
} from "./rules.js";
import { createSupermarketTargetSequence } from "./targetSequence.js";
import { createSupermarketWorld } from "./world.js";

const ROUND_SECONDS = 90;

export function createSupermarketExperience(host) {
  let world;
  let actors;
  let targetSequence;
  let rules;
  let active = false;
  let completed = false;
  let elapsed = 0;
  let photoPoseTimer = 0;
  let messageTimer = 0;
  let messageText = "";

  function query(selector) {
    return host.surface.root.querySelector(selector);
  }

  function showMessage(text, duration = 1.8) {
    messageText = text;
    messageTimer = duration;
  }

  function contextualMessage(encounter) {
    if (encounter.introMarkerVisible) {
      return "记住标记的两名目标，移动寻找自己";
    }
    if (encounter.interacting) {
      return rules.canCapture()
        ? "目标已入镜，立即拍照"
        : "让两名目标同时进入取景框";
    }
    return "跟随刚才标记的情侣";
  }

  function updateHud() {
    const state = rules.snapshot();
    const encounter = targetSequence.snapshot();
    const ready = rules.canCapture();
    query("[data-focus]")?.classList.toggle("ready", ready);
    world.couple.forEach(({ group }) => {
      group.userData.pairMarker.visible = encounter.introMarkerVisible;
    });
    host.ui.updateHud?.({
      mission: "记住目标情侣，拍下四张有效照片",
      timerText: String(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed))),
      resourceLabel: "照片",
      resourceText: `${state.photos} / 4`,
      clue: messageTimer > 0 ? messageText : contextualMessage(encounter),
      attackIcon: "📸",
    });
  }

  function finish(won, failMessage) {
    if (completed) return;
    completed = true;
    active = false;
    const state = rules.snapshot();
    host.surface.clear();
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
    if (host.controls.consumeAction && !host.controls.consumeAction()) return;
    const result = rules.capture();
    if (!result.ok) {
      showMessage(result.reason);
      updateHud();
      return;
    }
    targetSequence.resolveCapture();
    playCaptureAnimation(result.photos);
    showMessage(`拍摄成功，目标确认 ${result.photos}/4`, 2.2);
    updateHud();
  }

  function bindInput() {
    host.input.listen(host.input.windowTarget, "resize", () => {
      world.resizeCamera(
        host.rendering.canvas?.clientWidth,
        host.rendering.canvas?.clientHeight,
      );
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
      readPlayerInput: host.controls.readDirection,
      applyInputLock: host.controls.applyReverseLock,
      getPlayerVelocity: host.controls.getPlayerVelocity,
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
    presentation: "shared",
    mount() {
      const opportunities = Math.floor(host.random.range(5, 7));
      rules = createPhotoEvidenceRules({ requiredPhotos: 4, opportunities });
      host.surface.setContent(`
        <main class="supermarket-game">
          <div class="photo-focus" data-focus><i></i><i></i><i></i><i></i></div>
          <div class="flash" data-flash></div>
          <aside class="evidence-card" data-evidence>
            <span>取证成功</span>
            <strong data-evidence-count>目标确认</strong>
          </aside>
        </main>
      `);
      world = createSupermarketWorld(host);
      createActors();
      bindInput();
      updateHud();
    },
    start() {
      active = true;
      showMessage("记住标记的两名目标，移动寻找自己", 3);
      updateHud();
    },
    update(deltaSeconds) {
      if (!active || completed) return;
      elapsed += deltaSeconds;
      messageTimer = Math.max(0, messageTimer - deltaSeconds);
      photoPoseTimer = Math.max(0, photoPoseTimer - deltaSeconds);
      if (rules.snapshot().won) {
        if (photoPoseTimer <= 0) finish(true);
        else updateHud();
        return;
      }

      actors.updatePlayer(deltaSeconds);
      const sequenceResult = targetSequence.update(deltaSeconds);
      actors.updateNpcs(deltaSeconds);
      targetSequence.stabilizePair();
      if (photoPoseTimer > 0) {
        const { leftArm, rightArm } = world.player.group.userData;
        leftArm.rotation.x = -1.35;
        rightArm.rotation.x = -1.35;
      }

      const encounter = targetSequence.snapshot();
      rules.setScene({
        ...evaluatePhotoScene({
          player: world.player,
          couple: world.couple,
          isLineBlocked: world.isLineBlocked,
        }),
        ...encounter,
      });
      if (sequenceResult?.missedEventId != null && !rules.snapshot().won) {
        rules.missOpportunity();
        showMessage("本次互动已结束，继续跟随目标");
      }

      if (rules.snapshot().failed) {
        finish(false, "抓拍机会已经不足，证据链无法完成。");
        return;
      }
      if (elapsed >= ROUND_SECONDS) {
        finish(false, "超市即将打烊，取证没有完成。");
        return;
      }
      updateHud();
    },
    pause() {
      active = false;
      host.controls.reset?.();
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
    dispose() {
      active = false;
      actors?.reset();
      if (world) host.rendering.disposeScene(world.scene);
      actors = null;
      targetSequence = null;
      world = null;
      host.surface.clear();
    },
  };
}
