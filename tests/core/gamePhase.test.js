import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_PHASES,
  canTransition,
  transitionPhase,
} from "../../src/core/gamePhase.js";

test("关卡流程允许从选关进入简报", () => {
  assert.equal(canTransition(GAME_PHASES.LEVEL_SELECT, GAME_PHASES.BRIEFING), true);
});

test("关卡流程拒绝从结算直接进入游戏", () => {
  assert.equal(canTransition(GAME_PHASES.RESULT, GAME_PHASES.PLAYING), false);
  assert.throws(
    () => transitionPhase(GAME_PHASES.RESULT, GAME_PHASES.PLAYING),
    /非法游戏状态跳转/,
  );
});
