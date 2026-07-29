import {
  ATTEMPTS,
  ROUND_SECONDS,
} from "../config/constants.js";

export function createTaskModalModel({ level, npcCount, npcCountText }) {
  return {
    npcCount: npcCountText ?? level.npcCountText ?? npcCount,
    timeText: level.timeLimit === null
      ? "∞"
      : String(level.timeLimit ?? ROUND_SECONDS),
    resourceHtml: level.resourceLabel
      ? `${level.resourceLabel} <span id="taskAttempts">${level.resourceInitial}</span>`
      : `🥊 <span id="taskAttempts">${ATTEMPTS}</span> 次机会`,
    targetLabel: level.targetDesc,
    briefingText: [
      level.transition?.intro,
      level.mission,
    ].filter(Boolean).join("\n\n"),
    actionIcon: level.actionIcon ?? "👊",
    actionGuide: level.actionGuide ?? "拳按钮/空格 攻击",
  };
}

function updateTaskAttemptsChip(ui, resourceHtml) {
  if (typeof document === "undefined") return;
  const chip = document.querySelector("#taskAttemptsChip");
  if (!chip) return;

  chip.innerHTML = resourceHtml;
  ui.taskAttempts = document.querySelector("#taskAttempts");
}

export function renderTaskModal(ui, {
  level,
  npcCount,
  difficultyLabel = "易",
  npcCountText,
}) {
  const model = createTaskModalModel({ level, npcCount, npcCountText });
  ui.taskEmoji.textContent = level.emoji;
  ui.taskTitle.textContent = level.sceneName;
  ui.taskCopy.textContent = model.briefingText;
  ui.taskClue.textContent = "🔍 " + level.clue;
  if (ui.taskNpcCount) ui.taskNpcCount.textContent = model.npcCount;
  if (ui.npcCountInput) ui.npcCountInput.value = String(model.npcCount);
  if (ui.taskDifficultyText) {
    ui.taskDifficultyText.textContent = `${difficultyLabel} · ${model.npcCount}`;
  }
  ui.taskTime.textContent = model.timeText;
  updateTaskAttemptsChip(ui, model.resourceHtml);
  if (ui.taskActionIcon) ui.taskActionIcon.textContent = model.actionIcon;
  if (ui.taskActionGuide) ui.taskActionGuide.textContent = model.actionGuide;
  ui.targetLabel.textContent = model.targetLabel;
  ui.levelSelectModal?.classList.remove("visible");
  ui.historyTimelineModal?.classList.remove("visible");
  ui.taskModal.classList.add("visible");
  ui.resultModal.classList.remove("visible");
  ui.retryButton.disabled = false;
  ui.retryButton.textContent = "再来一局";
}
