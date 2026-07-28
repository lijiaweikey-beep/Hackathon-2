export const GAME_PHASES = Object.freeze({
  LEVEL_SELECT: "levelSelect",
  BRIEFING: "briefing",
  PLAYING: "playing",
  PAUSED: "paused",
  SETTLING: "settling",
  RESULT: "result",
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [GAME_PHASES.LEVEL_SELECT]: new Set([GAME_PHASES.BRIEFING]),
  [GAME_PHASES.BRIEFING]: new Set([GAME_PHASES.PLAYING, GAME_PHASES.LEVEL_SELECT]),
  [GAME_PHASES.PLAYING]: new Set([GAME_PHASES.PAUSED, GAME_PHASES.SETTLING]),
  [GAME_PHASES.PAUSED]: new Set([GAME_PHASES.PLAYING, GAME_PHASES.LEVEL_SELECT]),
  [GAME_PHASES.SETTLING]: new Set([GAME_PHASES.RESULT]),
  [GAME_PHASES.RESULT]: new Set([GAME_PHASES.BRIEFING, GAME_PHASES.LEVEL_SELECT]),
});

export function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
}

export function transitionPhase(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`非法游戏状态跳转：${from} → ${to}`);
  }
  return to;
}
