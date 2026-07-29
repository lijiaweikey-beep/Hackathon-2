export function createClassicExperience(dependencies) {
  function finishEffects(deltaSeconds) {
    dependencies.updateEffects?.(deltaSeconds);
    dependencies.updateShake?.(deltaSeconds);
  }

  function update(deltaSeconds) {
    if (dependencies.consumeHitstop?.(deltaSeconds)) {
      finishEffects(deltaSeconds);
      return;
    }
    const frame = dependencies.updateLevel?.(deltaSeconds);
    if (frame?.pauseWorld) {
      dependencies.updateUi?.();
      finishEffects(deltaSeconds);
      return;
    }
    dependencies.updateTimer?.(deltaSeconds);
    dependencies.updatePlayerEffects?.(deltaSeconds);
    dependencies.updateActors?.(deltaSeconds);
    dependencies.updateUi?.();
    finishEffects(deltaSeconds);
  }

  function updateResult(deltaSeconds) {
    if (dependencies.isResultWon?.()) {
      dependencies.updateResultActors?.(deltaSeconds);
    }
    finishEffects(deltaSeconds);
  }

  return Object.freeze({
    presentation: "classic",
    mount: () => dependencies.mount?.(),
    start: () => dependencies.start?.(),
    update,
    updateResult,
    updateIdle: finishEffects,
    pause: () => dependencies.pause?.(),
    resume: () => dependencies.resume?.(),
    handleInput: (input) => dependencies.handleInput?.(input),
    render: () => dependencies.render?.(),
    getResultStats: () => dependencies.getResultStats?.(),
    dispose: () => dependencies.dispose?.(),
  });
}
