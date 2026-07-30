import {
  ATTEMPTS,
  ROUND_SECONDS,
} from "../config/constants.js";
import { getDifficultyLabel } from "../core/difficulty.js";
import { clearChildren } from "./domWrite.js";

const CN_ORDINALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const FIST_ICON = new URL("../assets/ui/icon-fist.png", import.meta.url).href;
const HEART_ICON = new URL("../assets/ui/icon-heart.png", import.meta.url).href;
const COIN_ICON = new URL("../assets/ui/icon-coin.png", import.meta.url).href;
const DEFAULT_TARGET_CALLOUT = "认准这个目标！！";

// 资源 chip 图标按资源类型区分：生命用红心章、金币用金币章，其余用拳头。
function getResourceIcon(resourceHtml) {
  if (resourceHtml.includes("生命")) return HEART_ICON;
  if (resourceHtml.includes("金币")) return COIN_ICON;
  return FIST_ICON;
}

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
    targetCallout: level.targetCallout ?? DEFAULT_TARGET_CALLOUT,
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

  // 图标走图片素材，文案里旧的拳头/爱心 emoji 去掉避免重复。
  const text = resourceHtml.replace(/^(🥊|❤️)\s*/, "");
  const attemptsMatch = text.match(/^(.*?)\s*<span id="taskAttempts">([^<]*)<\/span>(.*)$/);
  clearChildren(chip);

  const icon = document.createElement("img");
  icon.className = "task-info-icon";
  icon.src = getResourceIcon(resourceHtml);
  icon.alt = "";
  chip.appendChild(icon);

  if (attemptsMatch) {
    const [, prefix, attempts, suffix] = attemptsMatch;
    if (prefix) chip.appendChild(document.createTextNode(prefix.trimEnd() + " "));
    const attemptsNode = document.createElement("span");
    attemptsNode.id = "taskAttempts";
    attemptsNode.textContent = attempts;
    chip.appendChild(attemptsNode);
    if (suffix) chip.appendChild(document.createTextNode(suffix));
  } else {
    chip.appendChild(document.createTextNode(text));
  }
  ui.taskAttempts = document.querySelector("#taskAttempts");
}

function renderTaskTraits(ui, level) {
  if (!ui.taskTraits) return;
  // 特征标签：纯文字展示，不做标签组件。
  ui.taskTraits.textContent = getTaskTraits(level).join(" · ");
}

export function renderTaskModal(ui, {
  level,
  npcCount,
  npcCountText,
  mainlineIndex = -1,
  difficulty,
}) {
  const model = createTaskModalModel({ level, npcCount, npcCountText });
  // 标题直接用目标 NPC 名，和预览图保持同一目标。
  ui.taskTitle.textContent = model.targetLabel || getTaskEntryTitle(level, mainlineIndex);
  if (ui.targetCallout) ui.targetCallout.textContent = model.targetCallout;
  renderTaskTraits(ui, level);
  if (ui.taskDifficulty) {
    // 难度徽章跟随玩家在难度选择器里选中的档位（易/中/难）。
    ui.taskDifficulty.textContent = `难度 · ${getDifficultyLabel(difficulty)}`;
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
