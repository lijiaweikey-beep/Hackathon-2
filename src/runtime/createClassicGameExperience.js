import { createClassicExperience } from "./createClassicExperience.js";

export function createClassicGameExperience(dependencies) {
  const {
    session,
    levelRunner,
    actorSystem,
    combatSystem,
    fx,
    uiController,
    rendering,
  } = dependencies;

  return createClassicExperience({
    mount: dependencies.mount,
    start() {
      uiController.updateHud();
      levelRunner.handleAction({ type: "beginPlay" });
    },
    consumeHitstop: (deltaSeconds) => fx.consumeHitstop(deltaSeconds),
    updateLevel: (deltaSeconds) => levelRunner.update(deltaSeconds),
    updateTimer(deltaSeconds) {
      if (session.levelState.level.timeLimit === null) return;
      session.levelState.remaining = Math.max(
        0,
        session.levelState.remaining - deltaSeconds,
      );
      if (session.levelState.remaining <= 0) dependencies.settlement.finish(false);
    },
    updatePlayerEffects(deltaSeconds) {
      const player = dependencies.getPlayer();
      if (player.hitInvuln > 0) {
        player.hitInvuln = Math.max(0, player.hitInvuln - deltaSeconds);
      }
      const userData = player.group?.userData;
      if (userData?.damageFlash > 0) {
        userData.damageFlash = Math.max(0, userData.damageFlash - deltaSeconds);
      }
      if (fx.damageFlashTimer > 0) {
        fx.damageFlashTimer = Math.max(0, fx.damageFlashTimer - deltaSeconds);
      }
    },
    updateActors(deltaSeconds) {
      actorSystem.updatePlayer(deltaSeconds);
      actorSystem.updateNpcs(deltaSeconds);
    },
    updateResultActors: (deltaSeconds) => actorSystem.animateCheer(deltaSeconds),
    isResultWon: () => session.result?.won,
    updateUi: () => uiController.updateHud(),
    updateEffects: (deltaSeconds) => fx.updateParticles(deltaSeconds),
    updateShake: dependencies.updateShake,
    handleInput(input) {
      if (input?.type === "primary") combatSystem.triggerAttack();
    },
    getResultStats: () =>
      levelRunner.handleAction({ type: "getResultStats" }),
    render: () => rendering.render(dependencies.getScene()),
    dispose: dependencies.dispose,
  });
}
