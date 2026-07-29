import { createLevelContext } from "../levels/createLevelContext.js";
import { createLevelRunner } from "../levels/levelRunner.js";

export function createClassicLevelRunner(dependencies) {
  const {
    session,
    getServices,
    getTotalTime,
    getMatchNpcCount,
    getPlayer,
    createNpc,
    triggerShake,
    triggerHitstop,
    settleRound,
    playSound,
    randomRange,
    npcSpeed,
    createRunner = createLevelRunner,
  } = dependencies;
  const marks = dependencies.marks ?? dependencies;

  return createRunner({
    createContext({ definition, scope }) {
      const {
        actorSystem,
        combatSystem,
        worldRuntime,
        uiController,
        inputController,
      } = getServices();
      return createLevelContext({
        definition,
        scope,
        sceneData: session.levelState.sceneData,
        time: {
          getStatus: () => session.phase,
          getTotal: getTotalTime,
        },
        actors: {
          npcCount: getMatchNpcCount(),
          npcSpeed,
          createNpc,
          addNpc: (npc) => actorSystem.addNpc(npc),
          addWanderNpc: (id) => actorSystem.addWanderNpc(id),
          getAll: () => actorSystem.getAll(),
          getNpcs: () => actorSystem.getNpcs(),
          getPlayer,
          dissolve: (npc) => combatSystem.dissolveNpc(npc),
          compactDead: () => actorSystem.compactDead(),
          randomizePosition: (actor) => actorSystem.randomizePosition(actor),
          setPartsVisible: (actor, partKey, visible) =>
            actorSystem.setPartsVisible(actor, partKey, visible),
        },
        movement: {
          randomOpenPosition: () => actorSystem.randomOpenPosition(),
          faceNpcToward: (...args) => actorSystem.faceNpcToward(...args),
          moveNpcToward: (...args) => actorSystem.moveNpcToward(...args),
          collidesWithObstacle: (...args) =>
            worldRuntime.collidesWithObstacle(...args),
          isActorFacingTarget: (...args) =>
            actorSystem.isActorFacingTarget(...args),
        },
        combat: {
          isFacingTarget: (...args) => combatSystem.isFacingTarget(...args),
          triggerShake,
          triggerHitstop,
          finishLevel: settleRound,
        },
        world: {},
        ui: {
          setBlackEye: marks.setBlackEye,
          setLipstick: marks.setLipstick,
          setRedTie: marks.setRedTie,
          showOverlay: (...args) => uiController.showOverlay(...args),
          hideOverlay: (...args) => uiController.hideOverlay(...args),
          flashHud: (...args) => uiController.flashHud(...args),
          refreshHud: () => uiController.updateHud(),
          resetPlayerInput: () => inputController.reset(),
        },
        audio: { playSound },
        random: { range: randomRange },
      });
    },
    onError(error, definition) {
      dependencies.onError?.(error, definition);
    },
  });
}
