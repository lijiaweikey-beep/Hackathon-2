const DIFFICULTY_BADGES = {
  1: { label: "简单", className: "easy" },
  2: { label: "经典", className: "classic" },
  3: { label: "推荐", className: "recommended" },
};

export function createLevelCardModel(level, { npcCount }) {
  const description = typeof level.cardDesc === "function"
    ? level.cardDesc({ npcCount })
    : level.cardDesc;
  const difficulty = level.difficulty >= 4
    ? { label: "困难", className: "hard" }
    : DIFFICULTY_BADGES[level.difficulty] ?? { label: "", className: "" };

  return { description, difficulty };
}
