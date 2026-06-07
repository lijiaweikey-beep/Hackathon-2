import { DUEL_PLAYER_HP } from "../config/constants.js";

export function formatHearts(hp, max = DUEL_PLAYER_HP) {
  const safe = Math.max(0, Math.min(max, Number(hp) || 0));
  let out = "";
  for (let i = 0; i < max; i += 1) {
    const rem = safe - i;
    if (rem >= 1) out += "❤️";
    else if (rem >= 0.5) out += "💗";
    else out += "🖤";
  }
  return out;
}

export function calcRating(won, timeUsed, attemptsLeft) {
  if (!won) return { grade: "C", rating: 4 };
  if (timeUsed <= 30 && attemptsLeft >= 3) return { grade: "S", rating: 1 };
  if (timeUsed <= 50 && attemptsLeft >= 2) return { grade: "A", rating: 2 };
  if (timeUsed <= 70) return { grade: "B", rating: 3 };
  return { grade: "C", rating: 4 };
}
