import assert from "node:assert/strict";
import test from "node:test";
import { createClassicLevelRunner } from "../../src/runtime/createClassicLevelRunner.js";

test("经典关卡运行器只通过延迟服务访问共享系统", () => {
  let capturedContext;
  const services = {
    actorSystem: {
      addNpc() {},
      addWanderNpc() {},
      getAll: () => [],
      getNpcs: () => [],
      compactDead() {},
      randomizePosition() {},
      setPartsVisible() {},
      randomOpenPosition() {},
      faceNpcToward() {},
      moveNpcToward() {},
      isActorFacingTarget() {},
    },
    combatSystem: {
      dissolveNpc() {},
      isFacingTarget() {},
    },
    worldRuntime: {
      collidesWithObstacle() {},
    },
    uiController: {
      showOverlay() {},
      hideOverlay() {},
      flashHud() {},
      updateHud() {},
    },
    inputController: {
      reset() {},
    },
  };
  const session = { levelState: { sceneData: { marker: true } } };
  const runner = createClassicLevelRunner({
    session,
    getServices: () => services,
    getTotalTime: () => 3,
    getMatchNpcCount: () => 2,
    getPlayer: () => ({ id: "player" }),
    createNpc: () => ({ id: "npc" }),
    triggerShake() {},
    triggerHitstop() {},
    settleRound() {},
    playSound() {},
    randomRange: (min) => min,
    createRunner({ createContext }) {
      capturedContext = createContext({
        definition: { id: "classic" },
        scope: {},
      });
      return { ready: true };
    },
  });

  assert.equal(runner.ready, true);
  assert.equal(capturedContext.sceneData.marker, true);
  assert.equal(capturedContext.time.getTotal(), 3);
  assert.equal(capturedContext.actors.npcCount, 2);
  assert.equal(capturedContext.actors.getPlayer().id, "player");
});
