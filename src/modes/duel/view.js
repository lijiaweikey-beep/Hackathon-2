import { DUEL_PLAYER_HP } from "./constants.js";

export function formatHearts(hp, max = DUEL_PLAYER_HP) {
  const safe = Math.max(0, Math.min(max, Number(hp) || 0));
  let output = "";
  for (let index = 0; index < max; index += 1) {
    const remaining = safe - index;
    if (remaining >= 1) output += "❤️";
    else if (remaining >= 0.5) output += "💗";
    else output += "🖤";
  }
  return output;
}
