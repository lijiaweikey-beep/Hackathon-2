import assert from "node:assert/strict";
import test from "node:test";
import { GAME_PHASES } from "../../src/core/gamePhase.js";
import { createCombatSystem } from "../../src/systems/createCombatSystem.js";

test("战斗系统统一处理攻击契约与冷却", () => {
  const dispatched = [];
  const player = {
    group: {
      position: { x: 0, z: 0 },
      rotation: { y: 0 },
    },
  };
  const combat = createCombatSystem({
    session: {
      phase: GAME_PHASES.PLAYING,
      levelState: {
        level: {},
        attempts: 3,
      },
    },
    getPlayer: () => player,
    getNpcs: () => [],
    dispatch(action) {
      dispatched.push(action);
      if (action.type === "beforeAttack") return { cooldown: 0.4 };
      return undefined;
    },
    consumeActionInterval: () => true,
    playSound() {},
    playPunch() {},
    playHit() {},
    playMiss() {},
    triggerHitstop() {},
    triggerShake() {},
    settleRound() {},
    refreshHud() {},
    dissolveActor() {},
  });

  combat.triggerAttack();

  assert.equal(player.punchTimer > 0, true);
  assert.deepEqual(dispatched[0], { type: "beforeAttack" });
  assert.equal(combat.cooldown, 0.4);
});
