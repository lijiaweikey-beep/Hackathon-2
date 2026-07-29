export const DEFAULT_DIFFICULTY = "medium";

export const DIFFICULTIES = Object.freeze([
  { id: "easy", label: "易" },
  { id: "medium", label: "中" },
  { id: "hard", label: "难" },
]);

const DEFAULT_COUNTS = Object.freeze({
  easy: 20,
  medium: 32,
  hard: 45,
});

const LEVEL_COUNTS = Object.freeze({
  office: { easy: 20, medium: 28, hard: 36 },
  "debt-smasher": { easy: 50, medium: 40, hard: 35 },
  "goose-market": { easy: 14, medium: 17, hard: 20 },
});

const LEVEL_TEXT = Object.freeze({
  "goose-market": {
    easy: "13–15 人",
    medium: "15–18 人",
    hard: "18–22 人",
  },
  "staged-director": {
    easy: "14人",
    medium: "14人",
    hard: "14人",
  },
  supermarket: {
    easy: "固定阵容",
    medium: "固定阵容",
    hard: "固定阵容",
  },
});

export function normalizeDifficulty(value) {
  return DIFFICULTIES.some(({ id }) => id === value) ? value : DEFAULT_DIFFICULTY;
}

export function getDifficultyLabel(value) {
  const normalized = normalizeDifficulty(value);
  return DIFFICULTIES.find(({ id }) => id === normalized)?.label ?? "易";
}

export function getDifficultyNpcCount(level, value) {
  const normalized = normalizeDifficulty(value);
  const counts = LEVEL_COUNTS[level?.id] ?? DEFAULT_COUNTS;
  return counts[normalized] ?? DEFAULT_COUNTS[normalized];
}

export function getDifficultyNpcText(level, value) {
  const normalized = normalizeDifficulty(value);
  const levelText = LEVEL_TEXT[level?.id]?.[normalized];
  if (levelText) return levelText;
  if (level?.npcCountText) return level.npcCountText;
  return `${getDifficultyNpcCount(level, normalized)} 人`;
}
