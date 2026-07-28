import { GAME_PHASES, transitionPhase } from "../core/gamePhase.js";

export function createGameSession() {
  let phase = GAME_PHASES.LEVEL_SELECT;
  let currentLevelIndex = 0;
  let levelState = null;
  let result = null;

  return Object.freeze({
    get phase() {
      return phase;
    },
    get currentLevelIndex() {
      return currentLevelIndex;
    },
    get levelState() {
      return levelState;
    },
    get result() {
      return result;
    },
    transition(nextPhase) {
      phase = transitionPhase(phase, nextPhase);
    },
    loadLevel({ index, state }) {
      currentLevelIndex = index;
      levelState = state;
      result = null;
    },
    setResult(value) {
      result = value == null ? null : Object.freeze({ ...value });
    },
    reset() {
      phase = GAME_PHASES.LEVEL_SELECT;
      currentLevelIndex = 0;
      levelState = null;
      result = null;
    },
  });
}
