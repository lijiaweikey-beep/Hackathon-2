import {
  ATTEMPTS,
  BLOODMOON_SANITY_MAX,
  DUEL_NPC_COUNT,
  DUEL_PLAYER_HP,
  ROUND_SECONDS,
} from "../config/constants.js";
import { formatHearts } from "../utils/format.js";

function updateTaskAttemptsChip(ui, duel, level) {
  const chip = document.querySelector("#taskAttemptsChip");
  if (!chip) return;

  if (duel) {
    chip.innerHTML = `生命 <span id="taskAttempts" class="hearts-display">${formatHearts(DUEL_PLAYER_HP)}</span>`;
  } else if (level?.id === "bloodmoon") {
    chip.innerHTML = `理智 <span id="taskAttempts">${BLOODMOON_SANITY_MAX}</span>`;
  } else {
    chip.innerHTML = `🥊 <span id="taskAttempts">${ATTEMPTS}</span> 次机会`;
  }
  ui.taskAttempts = document.querySelector("#taskAttempts");
}

export function renderTaskModal(ui, { level, duel, npcCount }) {
  ui.taskEmoji.textContent = level.emoji;
  ui.taskTitle.textContent = level.sceneName;
  ui.taskCopy.textContent = level.mission;
  ui.taskClue.textContent = "🔍 " + level.clue;
  ui.taskNpcCount.textContent = duel ? DUEL_NPC_COUNT : npcCount;
  ui.taskTime.textContent = duel || level.id === "bloodmoon" ? "∞" : ROUND_SECONDS;
  updateTaskAttemptsChip(ui, duel, level);
  ui.targetLabel.textContent = duel ? "对手" : level.targetDesc;
  ui.levelSelectModal.classList.remove("visible");
  ui.taskModal.classList.add("visible");
  ui.resultModal.classList.remove("visible");
  ui.retryButton.disabled = false;
  ui.retryButton.textContent = "再来一局";
}
