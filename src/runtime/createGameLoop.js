import { GAME_PHASES } from "../core/gamePhase.js";

export function createGameLoop(dependencies) {
  function tick(rawDeltaSeconds) {
    const experience = dependencies.getExperience();
    if (!experience || dependencies.session.phase === GAME_PHASES.LEVEL_SELECT) {
      return;
    }
    const deltaSeconds = Math.min(rawDeltaSeconds, 0.033);
    if (dependencies.session.phase === GAME_PHASES.PAUSED) {
      experience.render?.();
      return;
    }

    dependencies.advanceTime?.(deltaSeconds);
    if (dependencies.session.phase === GAME_PHASES.PLAYING) {
      experience.update(deltaSeconds);
    } else if (dependencies.session.phase === GAME_PHASES.RESULT) {
      experience.updateResult?.(deltaSeconds);
    } else {
      experience.updateIdle?.(deltaSeconds);
    }
    experience.render?.();
  }

  return Object.freeze({ tick });
}
