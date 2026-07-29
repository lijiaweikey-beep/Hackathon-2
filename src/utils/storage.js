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

export function saveBestScore(levelId, score) {
  try {
    const data = JSON.parse(localStorage.getItem(BEST_SCORE_STORAGE_KEY) || "{}");
    const prev = data[levelId];
    if (!prev || score.rating < prev.rating || (score.rating === prev.rating && score.time < prev.time)) {
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
