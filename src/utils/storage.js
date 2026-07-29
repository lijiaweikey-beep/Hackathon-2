import {
  DEFAULT_NPC_COUNT,
  MIN_NPC_COUNT,
  MAX_NPC_COUNT,
  NPC_COUNT_STORAGE_KEY,
  DIFFICULTY_STORAGE_KEY,
  BEST_SCORE_STORAGE_KEY,
} from "../config/constants.js";
import {
  DEFAULT_DIFFICULTY,
  normalizeDifficulty,
} from "../core/difficulty.js";

export function clampNpcCount(value) {
  return Math.min(MAX_NPC_COUNT, Math.max(MIN_NPC_COUNT, Math.round(value)));
}

export function loadMatchNpcCount() {
  try {
    const saved = Number(localStorage.getItem(NPC_COUNT_STORAGE_KEY));
    if (Number.isFinite(saved)) return clampNpcCount(saved);
  } catch { /* ignore */ }
  return DEFAULT_NPC_COUNT;
}

export function saveMatchNpcCount(count) {
  try {
    localStorage.setItem(NPC_COUNT_STORAGE_KEY, String(count));
  } catch { /* ignore */ }
}

export function loadDifficultySetting() {
  try {
    return normalizeDifficulty(localStorage.getItem(DIFFICULTY_STORAGE_KEY));
  } catch { /* ignore */ }
  return DEFAULT_DIFFICULTY;
}

export function saveDifficultySetting(difficulty) {
  try {
    localStorage.setItem(
      DIFFICULTY_STORAGE_KEY,
      normalizeDifficulty(difficulty),
    );
  } catch { /* ignore */ }
}

export function getBestScore(levelId) {
  try {
    const data = JSON.parse(localStorage.getItem(BEST_SCORE_STORAGE_KEY) || "{}");
    return data[levelId] || null;
  } catch { return null; }
}

// 旧存档没有 won 字段，默认视为通关记录。
function isWonRecord(record) {
  return record.won !== false;
}

// 胜利记录永远优先于失败记录；失败之间保留最近一次结算；
// 胜利之间评级更好（rating 更小）或用时更短才替换。
function shouldReplaceBestScore(prev, next) {
  if (!prev) return true;
  if (isWonRecord(prev) !== isWonRecord(next)) return isWonRecord(next);
  if (!isWonRecord(next)) return true;
  return next.rating < prev.rating
    || (next.rating === prev.rating && next.time < prev.time);
}

export function saveBestScore(levelId, score) {
  try {
    const data = JSON.parse(localStorage.getItem(BEST_SCORE_STORAGE_KEY) || "{}");
    if (shouldReplaceBestScore(data[levelId], score)) {
      data[levelId] = score;
      localStorage.setItem(BEST_SCORE_STORAGE_KEY, JSON.stringify(data));
    }
  } catch { /* ignore */ }
}

export function parseNpcCountRaw(raw) {
  const text = String(raw).trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
