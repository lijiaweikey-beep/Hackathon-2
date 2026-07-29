import {
  DEFAULT_DIFFICULTY,
  getDifficultyNpcCount,
  normalizeDifficulty,
} from "../core/difficulty.js";
import { GAME_PHASES } from "../core/gamePhase.js";
import {
  loadDifficultySetting,
  saveDifficultySetting,
} from "../utils/storage.js";
import { renderShareCard } from "./shareCard.js";
import { createStoryIntroPlayer } from "./storyIntro.js";
import { renderTargetPreview } from "./targetPreview.js";
import { renderTaskModal } from "./taskModal.js";

export function createGameUiController(dependencies) {
  const {
    ui,
    session,
    levelViewHost = { clear() {}, setTheme() {} },
  } = dependencies;
  const storyIntro = createStoryIntroPlayer({ ui });
  let difficulty = DEFAULT_DIFFICULTY;
  let lastResult = null;

  function getStoryStats() {
    const mainline = dependencies.levelRegistry?.mainline ?? [];
    return {
      total: mainline.length,
      unlocked: mainline.filter(
        ({ id }) => dependencies.storyProgress?.isCompleted(id) ?? false,
      ).length,
    };
  }

  function getCurrentLevel() {
    return session.levelState?.level ?? null;
  }

  function getActiveNpcCount(level = getCurrentLevel()) {
    return getDifficultyNpcCount(level, difficulty);
  }

  function syncDifficultyUi() {
    const normalized = normalizeDifficulty(difficulty);
    ui.difficultyButtons?.forEach((button) => {
      const active = button.dataset.difficulty === normalized;
      button.classList?.toggle("active", active);
      button.setAttribute?.("aria-pressed", String(active));
    });
  }

  function selectDifficulty(nextDifficulty) {
    difficulty = normalizeDifficulty(nextDifficulty);
    saveDifficultySetting(difficulty);
    syncDifficultyUi();
    dependencies.onDifficultyChanged?.();
  }

  function showHome({ leaveLevel = true } = {}) {
    if (leaveLevel) dependencies.onLeaveLevel?.();
    syncDifficultyUi();
    levelViewHost.clear();
    ui.taskModal?.classList.remove("visible");
    ui.resultModal?.classList.remove("visible");
    ui.shareModal?.classList.remove("visible");
    dependencies.onHomeShown?.();
  }

  function showTask(level = session.levelState.level) {
    const mainline = dependencies.levelRegistry?.mainline ?? [];
    const mainlineIndex = mainline.findIndex(({ id }) => id === level.id);
    renderTaskModal(ui, {
      level,
      npcCount: getActiveNpcCount(level),
      mainlineIndex,
    });
    syncDifficultyUi();
    renderTargetPreview(ui.targetPreviewCanvas, level);
    updateHud();
  }

  function getLevelSlug(level) {
    const mainline = dependencies.levelRegistry?.mainline ?? [];
    const index = mainline.findIndex(({ id }) => id === level.id);
    if (index < 0) {
      return { levelTag: "番外", ageTag: level.axisLabel ?? level.sceneName ?? "" };
    }
    return {
      levelTag: `LV.${String(index + 1).padStart(2, "0")}`,
      ageTag: level.age != null ? `${level.age}岁` : "",
    };
  }

  function showResult({
    won,
    failMessage,
    resultResource,
    timeUsed,
    attemptsLeft,
    rating,
    level = session.levelState.level,
  }) {
    lastResult = { won, timeUsed, rating, level };
    const node = level.nodes?.[rating.grade];
    const { levelTag, ageTag } = getLevelSlug(level);
    // 失败原因放在结果行，判词位统一交给等级文案。
    ui.resultTitle.textContent = won ? "任务成功" : (failMessage || "任务失败");
    ui.resultCopy.textContent = node?.verdict
      ?? (won ? (level.transition?.success || level.success) : level.failure);
    if (ui.resultLevelTag) ui.resultLevelTag.textContent = levelTag;
    if (ui.resultAgeTag) ui.resultAgeTag.textContent = ageTag;
    if (ui.resultNodeTitle) {
      ui.resultNodeTitle.textContent = node?.title ? `「${node.title}」` : "";
    }
    if (ui.resultUnlock) {
      const nodeName = level.axisLabel ?? level.sceneName ?? "";
      ui.resultUnlock.textContent = won && nodeName
        ? `新解锁：【${rating.grade} 级 · ${nodeName}】`
        : "";
    }
    if (ui.resultArt) {
      const artUrl = level.art?.grades?.[rating.grade] ?? level.art?.cover ?? "";
      ui.resultArt.style.backgroundImage = artUrl ? `url("${artUrl}")` : "";
      ui.resultArt.classList.toggle("is-empty", !artUrl);
    }
    ui.resultRating.textContent = rating.grade;
    ui.resultRating.className = `result-rating rating-${rating.grade.toLowerCase()}`;
    ui.statTime.textContent = `${timeUsed} 秒`;
    if (ui.statAttemptsLabel) {
      ui.statAttemptsLabel.textContent = resultResource?.label ?? "🥊 剩余出拳";
    }
    ui.statAttempts.textContent = resultResource?.value ?? `${attemptsLeft} 次`;
    ui.statAttempts.classList.remove("hearts-display");
    ui.retryButton.disabled = false;
    ui.retryButton.textContent = "再来一局";
    ui.resultModal.classList.add("visible");
    ui.taskModal.classList.remove("visible");
    levelViewHost.clear();
  }

  function updateCooldown() {
    if (!ui.cooldownOverlay || !ui.attackButton) return;
    const { cooldown = 0, cooldownMax = 0 } = dependencies.getCooldown?.() ?? {};
    if (cooldown > 0 && cooldownMax > 0) {
      ui.cooldownOverlay.style.setProperty(
        "--cd-progress",
        `${(cooldown / cooldownMax) * 100}%`,
      );
      ui.cooldownOverlay.classList.add("active");
      ui.attackButton.classList.add("cooling");
    } else {
      ui.cooldownOverlay.classList.remove("active");
      ui.attackButton.classList.remove("cooling");
    }
  }

  function updateHud(viewModel = dependencies.getHudState?.()) {
    const levelState = session.levelState;
    const level = levelState?.level ?? {};
    const mechanicHintHtml = level.mechanicHintHtml ?? "";
    const mechanicVisible = Boolean(viewModel?.mechanicVisible);
    levelViewHost.setTheme(viewModel?.theme);
    if (ui.sceneName) ui.sceneName.textContent = level.sceneName ?? "";
    if (ui.missionText) {
      ui.missionText.textContent = viewModel?.mission
        || level.hudMission
        || level.mission
        || "";
    }
    if (ui.timerText) {
      ui.timerText.textContent = viewModel?.timerText
        ?? Math.ceil(levelState?.remaining ?? 0).toString();
    }
    if (ui.attemptLabel) ui.attemptLabel.textContent = viewModel?.resourceLabel ?? "出拳";
    if (ui.attemptText) {
      ui.attemptText.textContent = viewModel?.resourceText
        ?? (levelState?.attempts ?? 0).toString();
      ui.attemptText.classList?.remove("hearts-display");
    }
    if (ui.clueBar) {
      ui.clueBar.textContent = viewModel?.clue
        ?? `🔍 ${level.hudClue || level.clue || ""}`;
      ui.clueBar.classList?.toggle(
        "hidden",
        Boolean(mechanicHintHtml) && !mechanicVisible,
      );
    }
    if (ui.attackIcon) ui.attackIcon.textContent = viewModel?.attackIcon ?? "拳";
    if (ui.mechanicHint) {
      ui.mechanicHint.classList.toggle(
        "visible",
        Boolean(mechanicHintHtml) || mechanicVisible,
      );
      ui.mechanicHint.innerHTML = viewModel?.mechanicHtml || mechanicHintHtml;
    }
    updateCooldown();
  }

  function bindDifficultyButtons() {
    ui.difficultyButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        selectDifficulty(button.dataset.difficulty);
      });
    });
  }

  function bindPrelaunch() {
    if (!ui.prelaunchScreen) return;
    ui.prelaunchStartButton?.addEventListener("click", () => {
      ui.prelaunchScreen.classList.add("is-away");
    });
  }

  function loadArtImage(src) {
    return new Promise((resolve) => {
      if (!src || typeof Image !== "function") {
        resolve(null);
        return;
      }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  async function openShareCard() {
    if (!ui.shareCanvas || !lastResult) return;
    const snapshot = lastResult;
    const { level, won, timeUsed, rating } = snapshot;
    const payload = {
      level,
      result: { won, timeUsed, rating },
      progress: getStoryStats(),
    };
    // 先出手绘版卡面，避开等图片的空白；贴图到位后再重绘一次。
    renderShareCard(ui.shareCanvas, payload);
    ui.shareModal?.classList.add("visible");
    const art = await loadArtImage(level.art?.grades?.[rating.grade]);
    if (art && lastResult === snapshot) {
      renderShareCard(ui.shareCanvas, { ...payload, art });
    }
  }

  function saveShareCard() {
    if (!ui.shareCanvas?.toDataURL) return;
    const link = document.createElement("a");
    link.href = ui.shareCanvas.toDataURL("image/png");
    link.download = `梗哥的半生-${lastResult?.rating?.grade ?? "C"}.png`;
    link.click();
  }

  function bindShareCard() {
    ui.shareButton?.addEventListener("click", openShareCard);
    ui.saveShareButton?.addEventListener("click", saveShareCard);
    ui.closeShareButton?.addEventListener("click", () => {
      ui.shareModal?.classList.remove("visible");
    });
  }

  function bind() {
    difficulty = loadDifficultySetting();
    syncDifficultyUi();
    bindDifficultyButtons();
    bindPrelaunch();
    bindShareCard();
    storyIntro.bind();
    ui.startButton?.addEventListener("click", () => {
      if (session.phase !== GAME_PHASES.BRIEFING) return;
      ui.taskModal.classList.remove("visible");
      // 打字机剧情播完、玩家点击任意处后才真正开局。
      storyIntro.play(session.levelState?.level, () => {
        if (session.phase !== GAME_PHASES.BRIEFING) return;
        dependencies.onStart?.();
      });
    });
    ui.backFromTaskButton?.addEventListener("click", () => {
      if (session.phase === GAME_PHASES.BRIEFING) showHome();
    });
    ui.pauseButton?.addEventListener("click", () => {
      if (session.phase !== GAME_PHASES.PLAYING) return;
      dependencies.onPause?.();
      ui.pauseModal.classList.add("visible");
    });
    ui.resumeButton?.addEventListener("click", () => {
      if (session.phase !== GAME_PHASES.PAUSED) return;
      dependencies.onResume?.();
      ui.pauseModal.classList.remove("visible");
    });
    ui.backFromPauseButton?.addEventListener("click", () => {
      if (session.phase !== GAME_PHASES.PAUSED) return;
      ui.pauseModal.classList.remove("visible");
      showHome();
    });
    ui.retryButton?.addEventListener("click", () => dependencies.onRetry?.());
    ui.backToSelectButton?.addEventListener("click", () => {
      ui.shareModal?.classList.remove("visible");
      showHome();
    });
    ui.attackButton?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      dependencies.onAttack?.();
    });
  }

  function flashHud(className, durationMs) {
    if (!className || !ui.hud) return;
    ui.hud.classList.remove(className);
    void ui.hud.offsetWidth;
    ui.hud.classList.add(className);
    window.setTimeout(() => ui.hud.classList.remove(className), durationMs);
  }

  return Object.freeze({
    bind,
    showHome,
    showTask,
    showResult,
    updateHud,
    getMatchNpcCount: (level) => getActiveNpcCount(level),
    flashHud,
    showOverlay: (...args) => levelViewHost.showOverlay?.(...args),
    hideOverlay: (...args) => levelViewHost.hideOverlay?.(...args),
    disposeLevelView: () => levelViewHost.clear(),
  });
}
