import {
  ATTEMPTS,
  DUEL_NPC_COUNT,
  DUEL_PLAYER_HP,
  ROUND_SECONDS,
} from "../config/constants.js";
import { formatHearts } from "../utils/format.js";

export function createTaskModalModel({ level, duel, npcCount }) {
  if (duel) {
    return {
      npcCount: DUEL_NPC_COUNT,
      timeText: "∞",
      resourceHtml: `生命 <span id="taskAttempts" class="hearts-display">${formatHearts(DUEL_PLAYER_HP)}</span>`,
      targetLabel: "对手",
    };
  }

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

export function renderTaskModal(ui, { level, duel, npcCount }) {
  const model = createTaskModalModel({ level, duel, npcCount });
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
