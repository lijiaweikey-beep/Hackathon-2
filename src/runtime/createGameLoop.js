import { GAME_PHASES } from "../core/gamePhase.js";

export function createGameLoop(dependencies) {
  function finishFrame(deltaSeconds) {
    dependencies.updateEffects?.(deltaSeconds);
    dependencies.updateShake?.(deltaSeconds);
    dependencies.render();
  }

  function tick(rawDeltaSeconds) {
    const deltaSeconds = Math.min(rawDeltaSeconds, 0.033);
    if (
      !dependencies.hasScene()
      || dependencies.session.phase === GAME_PHASES.LEVEL_SELECT
    ) return;

    if (dependencies.session.phase === GAME_PHASES.PAUSED) {
      dependencies.render();
      return;
    }

    if (dependencies.consumeHitstop?.(deltaSeconds)) {
      dependencies.updateShake?.(deltaSeconds);
      dependencies.render();
      return;
    }

    dependencies.advanceTime?.(deltaSeconds);
    if (dependencies.session.phase === GAME_PHASES.PLAYING) {
      const frame = dependencies.updateLevel?.(deltaSeconds);
      if (frame?.pauseWorld) {
        dependencies.updateUi?.();
        finishFrame(deltaSeconds);
        return;
      }
      dependencies.updateTimer?.(deltaSeconds);
      dependencies.updatePlayerEffects?.(deltaSeconds);
      dependencies.updateActors?.(deltaSeconds);
      dependencies.updateUi?.();
    } else if (
      dependencies.session.phase === GAME_PHASES.RESULT
      && dependencies.session.result?.won
    ) {
      dependencies.updateResultActors?.(deltaSeconds);
    }
    finishFrame(deltaSeconds);
  }

  return Object.freeze({ tick });
}
