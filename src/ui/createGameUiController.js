import {
  DEFAULT_NPC_COUNT,
} from "../config/constants.js";
import { GAME_PHASES } from "../core/gamePhase.js";
import {
  clampNpcCount,
  loadMatchNpcCount,
  parseNpcCountRaw,
  saveMatchNpcCount,
} from "../utils/storage.js";
import { createLevelCardModel } from "./levelCardModel.js";
import { renderTargetPreview } from "./targetPreview.js";
import { renderTaskModal } from "./taskModal.js";

export function createGameUiController(dependencies) {
  const {
    ui,
    session,
    levelViewHost = { clear() {}, setTheme() {} },
  } = dependencies;
  let npcCount = DEFAULT_NPC_COUNT;

  function syncNpcCountInput() {
    if (ui.npcCountInput) ui.npcCountInput.value = String(npcCount);
  }

  function getNpcCountPreview() {
    const parsed = parseNpcCountRaw(ui.npcCountInput?.value);
    return parsed == null ? npcCount : clampNpcCount(parsed);
  }

  function commitNpcCountInput() {
    npcCount = getNpcCountPreview();
    syncNpcCountInput();
    saveMatchNpcCount(npcCount);
  }

  function buildLevelCards() {
    if (!ui.levelCards || !dependencies.levelRegistry) return;
    ui.levelCards.innerHTML = "";
    dependencies.levelRegistry.visible.forEach((level) => {
      const model = createLevelCardModel(level, {
        npcCount: getNpcCountPreview(),
      });
      const stars = Array.from({ length: 3 }, (_, index) =>
        `<span class="level-star${index < level.difficulty ? " is-on" : ""}">★</span>`,
      ).join("");
      const card = document.createElement("button");
      card.className = "level-card";
      card.type = "button";
      card.dataset.level = level.id;
      for (const [name, value] of Object.entries(level.cardStyle ?? {})) {
        card.style.setProperty(`--card-${name}`, value);
      }
      card.innerHTML = `
        <div class="level-card-accent" aria-hidden="true"></div>
        <div class="level-card-icon">${level.emoji}</div>
        <div class="level-card-body">
          <div class="level-card-name">${level.sceneName} <span class="level-card-difficulty ${model.difficulty.className}">${model.difficulty.label}</span></div>
          <div class="level-card-desc">${model.description}</div>
          <div class="level-card-meta">
            <span class="level-card-stars" aria-label="难度 ${level.difficulty}">${stars}</span>
          </div>
        </div>
        <div class="level-card-go" aria-hidden="true"><span>›</span></div>
      `;
      card.addEventListener("click", () => {
        commitNpcCountInput();
        dependencies.onSelectLevel?.(level.id);
      });
      ui.levelCards.appendChild(card);
    });
    if (ui.npcCountInput) ui.npcCountInput.disabled = false;
  }

  function showLevelSelect({ leaveLevel = true } = {}) {
    if (leaveLevel) dependencies.onLeaveLevel?.();
    syncNpcCountInput();
    buildLevelCards();
    levelViewHost.clear();
    ui.levelSelectModal?.classList.add("visible");
    ui.taskModal?.classList.remove("visible");
    ui.resultModal?.classList.remove("visible");
  }

  function showTask(level = session.levelState.level) {
    renderTaskModal(ui, { level, npcCount });
    renderTargetPreview(ui.targetPreviewCanvas, level);
    updateHud();
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
    ui.resultTitle.textContent = won ? "任务成功" : "任务失败";
    ui.resultCopy.textContent = won
      ? level.success
      : (failMessage || level.failure);
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

  function bindNpcCountInput() {
    const input = ui.npcCountInput;
    if (!input) return;
    input.addEventListener("input", () => {
      const digits = input.value.replace(/\D/g, "");
      if (input.value !== digits) input.value = digits;
      buildLevelCards();
    });
    input.addEventListener("blur", () => {
      commitNpcCountInput();
      buildLevelCards();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      } else if (["e", "E", "+", "-", "."].includes(event.key)) {
        event.preventDefault();
      }
    });
    input.addEventListener("wheel", (event) => {
      if (document.activeElement === input) event.preventDefault();
    }, { passive: false });

    const adjust = (offset) => {
      const next = clampNpcCount(npcCount + offset);
      if (next === npcCount) return;
      npcCount = next;
      syncNpcCountInput();
      saveMatchNpcCount(npcCount);
      buildLevelCards();
    };
    ui.npcCountUp?.addEventListener("click", () => adjust(1));
    ui.npcCountDown?.addEventListener("click", () => adjust(-1));
  }

  function bind() {
    npcCount = loadMatchNpcCount();
    syncNpcCountInput();
    bindNpcCountInput();
    ui.startButton?.addEventListener("click", () => {
      if (session.phase !== GAME_PHASES.BRIEFING) return;
      dependencies.onStart?.();
      ui.taskModal.classList.remove("visible");
    });
    ui.backFromTaskButton?.addEventListener("click", () => {
      if (session.phase === GAME_PHASES.BRIEFING) showLevelSelect();
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
      showLevelSelect();
    });
    ui.retryButton?.addEventListener("click", () => dependencies.onRetry?.());
    ui.backToSelectButton?.addEventListener("click", () => showLevelSelect());
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
    showLevelSelect,
    showTask,
    showResult,
    updateHud,
    buildLevelCards,
    getMatchNpcCount: () => npcCount,
    getNpcCountPreview,
    flashHud,
    showOverlay: (...args) => levelViewHost.showOverlay?.(...args),
    hideOverlay: (...args) => levelViewHost.hideOverlay?.(...args),
    disposeLevelView: () => levelViewHost.clear(),
  });
}
