import {
  ATTEMPTS,
  ROUND_SECONDS,
} from "../config/constants.js";

export function createTaskModalModel({ level, npcCount }) {
  return {
    npcCount,
    timeText: level.timeLimit === null
      ? "∞"
      : String(level.timeLimit ?? ROUND_SECONDS),
    resourceHtml: level.resourceLabel
      ? `${level.resourceLabel} <span id="taskAttempts">${level.resourceInitial}</span>`
      : `🥊 <span id="taskAttempts">${ATTEMPTS}</span> 次机会`,
    targetLabel: level.targetDesc,
  };
}

function updateTaskAttemptsChip(ui, resourceHtml) {
  const chip = document.querySelector("#taskAttemptsChip");
  if (!chip) return;

  chip.innerHTML = resourceHtml;
  ui.taskAttempts = document.querySelector("#taskAttempts");
}

export function renderTaskModal(ui, { level, npcCount }) {
  const model = createTaskModalModel({ level, npcCount });
  ui.taskEmoji.textContent = level.emoji;
  ui.taskTitle.textContent = level.sceneName;
  ui.taskCopy.textContent = level.mission;
  ui.taskClue.textContent = "🔍 " + level.clue;
  ui.taskNpcCount.textContent = model.npcCount;
  ui.taskTime.textContent = model.timeText;
  updateTaskAttemptsChip(ui, model.resourceHtml);
  ui.targetLabel.textContent = model.targetLabel;
  ui.levelSelectModal.classList.remove("visible");
  ui.taskModal.classList.add("visible");
  ui.resultModal.classList.remove("visible");
  ui.retryButton.disabled = false;
  ui.retryButton.textContent = "再来一局";
}
