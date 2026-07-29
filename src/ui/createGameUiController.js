import {
  DEFAULT_DIFFICULTY,
  getDifficultyNpcCount,
  normalizeDifficulty,
} from "../core/difficulty.js";
import {
  DEFAULT_PLAYER_PREFERENCES,
  normalizePlayerPreferences,
  normalizeToggle,
} from "../core/playerPreferences.js";
import { GAME_PHASES } from "../core/gamePhase.js";
import {
  loadDifficultySetting,
  loadPlayerPreferences,
  saveDifficultySetting,
  savePlayerPreferences,
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
  let preferences = { ...DEFAULT_PLAYER_PREFERENCES };
  let lastResult = null;
  let clueTypeTarget = "";
  let clueTypeTimer = null;
  let clueFloatTimer = null;

  function typeClueCharByChar(text) {
    if (text === clueTypeTarget) return;
    clueTypeTarget = text;
    if (clueTypeTimer) clearInterval(clueTypeTimer);
    if (clueFloatTimer) clearTimeout(clueFloatTimer);
    if (!ui.clueBar) return;
    // 重置浮动状态
    ui.clueBar.classList.remove("floated");
    if (!text) {
      ui.clueBar.textContent = "";
      return;
    }
    ui.clueBar.textContent = "";
    let i = 0;
    clueTypeTimer = setInterval(() => {
      i += 1;
      ui.clueBar.textContent = text.slice(0, i);
      ui.clueBar.classList.remove("char-pop");
      void ui.clueBar.offsetWidth;
      ui.clueBar.classList.add("char-pop");
      if (i >= text.length) {
        clearInterval(clueTypeTimer);
        clueTypeTimer = null;
        // 打完字停留 3 秒后浮到上方
        clueFloatTimer = setTimeout(() => {
          ui.clueBar?.classList.add("floated");
        }, 3000);
      }
    }, 110);
  }

  function showClueAtTop(text) {
    clueTypeTarget = text;
    if (clueTypeTimer) clearInterval(clueTypeTimer);
    if (clueFloatTimer) clearTimeout(clueFloatTimer);
    clueTypeTimer = null;
    clueFloatTimer = null;
    if (!ui.clueBar) return;
    ui.clueBar.textContent = text || "";
    ui.clueBar.classList.remove("char-pop");
    ui.clueBar.classList.toggle("floated", Boolean(text));
  }

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

  function syncPreferenceUi() {
    ui.preferenceButtons?.forEach((button) => {
      const key = button.dataset.pref;
      if (!key || !(key in preferences)) return;
      const enabled = preferences[key];
      const active = button.dataset.value === (enabled ? "on" : "off");
      button.classList?.toggle("active", active);
      button.setAttribute?.("aria-pressed", String(active));
    });
  }

  function selectPreference(key, value) {
    if (!(key in preferences)) return;
    preferences = normalizePlayerPreferences({
      ...preferences,
      [key]: normalizeToggle(value, preferences[key]),
    });
    savePlayerPreferences(preferences);
    syncPreferenceUi();
    dependencies.onPreferencesChanged?.(preferences);
  }

  function showHome({ leaveLevel = true } = {}) {
    if (leaveLevel) dependencies.onLeaveLevel?.();
    syncDifficultyUi();
    levelViewHost.clear();
    // 清除 clue bar 残留文字和状态
    clueTypeTarget = "";
    if (clueTypeTimer) clearInterval(clueTypeTimer);
    if (clueFloatTimer) clearTimeout(clueFloatTimer);
    if (ui.clueBar) {
      ui.clueBar.textContent = "";
      ui.clueBar.classList.remove("floated", "char-pop", "hidden");
    }
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
      difficulty,
    });
    syncDifficultyUi();
    renderTargetPreview(ui.targetPreviewCanvas, level);
    // HUD 更新推迟到 startExperience() 之后，避免逐字动画被任务弹窗/剧情弹窗遮住
  }

  function getLevelSlug(level) {
    const mainline = dependencies.levelRegistry?.mainline ?? [];
    const index = mainline.findIndex(({ id }) => id === level.id);
    if (index < 0) {
      return { levelTag: "番外", ageTag: (level.axisLabel ?? level.sceneName ?? "").replace(/\n/g, "") };
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
      const nodeName = (level.axisLabel ?? level.sceneName ?? "").replace(/\n/g, "");
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
      const newClue = viewModel?.clue
        ?? (viewModel?.hideClue ? "" : `🔍 ${level.hudClue || level.clue || ""}`);
      if (viewModel?.cluePlacement === "top") showClueAtTop(newClue);
      else typeClueCharByChar(newClue);
      ui.clueBar.classList?.toggle(
        "hidden",
        viewModel?.hideClue || (Boolean(mechanicHintHtml) && !mechanicVisible),
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
    // 教学关：摇杆引导高亮
    if (ui.joystick) {
      ui.joystick.classList.toggle("tutorial-guide", viewModel?.joystickGuide ?? false);
    }
    // 教学关：攻击按钮状态
    if (ui.attackButton) {
      ui.attackButton.classList.toggle("tutorial-locked", viewModel?.attackLocked ?? false);
      ui.attackButton.classList.toggle("tutorial-pulse", viewModel?.attackPulse ?? false);
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

  function bindPreferenceButtons() {
    ui.preferenceButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        selectPreference(button.dataset.pref, button.dataset.value);
      });
    });
  }

  function isSettingsOpen() {
    return Boolean(ui.settingsPanel && !ui.settingsPanel.hidden);
  }

  function setSettingsOpen(open) {
    if (!ui.settingsPanel) return;
    ui.settingsPanel.hidden = !open;
    ui.settingsButton?.setAttribute("aria-expanded", String(open));
  }

  function bindSettingsPanel() {
    ui.settingsButton?.addEventListener("click", () => {
      setSettingsOpen(!isSettingsOpen());
    });
    ui.settingsPanelBackdrop?.addEventListener("click", () => setSettingsOpen(false));
    ui.settingsCloseButton?.addEventListener("click", () => setSettingsOpen(false));
  }

  // P0 漫画序章：每次点击揭开下一格，最后一格再点进入封面。
  function bindComicIntro() {
    if (!ui.comicIntroScreen) return;
    const frames = [...ui.comicIntroScreen.querySelectorAll(".comic-intro-frame")];
    let shownCount = frames.filter((frame) => frame.classList.contains("shown")).length;
    ui.comicIntroScreen.addEventListener("click", () => {
      if (shownCount < frames.length) {
        frames[shownCount].classList.add("shown");
        shownCount += 1;
        return;
      }
      ui.comicIntroScreen.classList.add("is-away");
    });
  }

  const PRELAUNCH_GUIDE = {
    storyIntro: [
      "接下来，打爆每个人生阶段的愤怒，一步一步解锁关卡吧！",
      "全A以上会解锁人生之外·番外篇哦",
    ],
  };

  function bindPrelaunch() {
    if (!ui.prelaunchScreen) return;
    ui.prelaunchStartButton?.addEventListener("click", () => {
      ui.prelaunchScreen.classList.add("is-away");
      dependencies.onPrelaunchDismissed?.();
      // 进入前先弹一段引导文字流，点击后落到事件轴。
      storyIntro.play(PRELAUNCH_GUIDE);
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
    preferences = loadPlayerPreferences();
    syncDifficultyUi();
    syncPreferenceUi();
    bindDifficultyButtons();
    bindPreferenceButtons();
    bindSettingsPanel();
    bindComicIntro();
    bindPrelaunch();
    bindShareCard();
    storyIntro.bind();
    dependencies.onPreferencesChanged?.(preferences);
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
