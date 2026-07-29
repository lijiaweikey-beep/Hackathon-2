import {
  ATTEMPTS,
  ROUND_SECONDS,
} from "../config/constants.js";
import { createLevelCardModel } from "./levelCardModel.js";

const CN_ORDINALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export function getTaskEntryTitle(level, mainlineIndex = -1) {
  const name = level.entryTitle ?? level.sceneName ?? "";
  if (mainlineIndex == null || mainlineIndex < 0) return `番外：${name}`;
  const ordinal = CN_ORDINALS[mainlineIndex] ?? String(mainlineIndex + 1);
  return `关卡${ordinal}：${name}`;
}

export function getTaskTraits(level) {
  if (Array.isArray(level.traits) && level.traits.length > 0) return level.traits;
  const clue = level.clue ?? "";
  return clue ? [clue.replace(/^目标特征：/, "")] : [];
}

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

function renderTaskTraits(ui, level) {
  if (!ui.taskTraits) return;
  ui.taskTraits.innerHTML = "";
  getTaskTraits(level).forEach((trait) => {
    const chip = document.createElement("strong");
    chip.className = "task-trait-chip";
    chip.textContent = trait;
    ui.taskTraits.appendChild(chip);
  });
}

export function renderTaskModal(ui, {
  level,
  npcCount,
  npcCountText,
  mainlineIndex = -1,
}) {
  const model = createTaskModalModel({ level, npcCount, npcCountText });
  // 标题直接用目标 NPC 名，和预览图保持同一目标。
  ui.taskTitle.textContent = model.targetLabel || getTaskEntryTitle(level, mainlineIndex);
  renderTaskTraits(ui, level);
  if (ui.taskDifficulty) {
    const { difficulty } = createLevelCardModel(level, { npcCount });
    ui.taskDifficulty.textContent = `⚡ 难度 · ${difficulty.label || "新手"}`;
  }
  if (ui.taskNpcCount) ui.taskNpcCount.textContent = model.npcCount;
  ui.taskTime.textContent = model.timeText;
  updateTaskAttemptsChip(ui, model.resourceHtml);
  if (ui.taskActionIcon) ui.taskActionIcon.textContent = model.actionIcon;
  if (ui.taskActionGuide) ui.taskActionGuide.textContent = model.actionGuide;
  ui.levelSelectModal?.classList.remove("visible");
  ui.historyTimelineModal?.classList.remove("visible");
  ui.taskModal.classList.add("visible");
  ui.resultModal.classList.remove("visible");
  ui.retryButton.disabled = false;
  ui.retryButton.textContent = "再来一局";
}
