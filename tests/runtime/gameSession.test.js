import assert from "node:assert/strict";
import test from "node:test";
import { GAME_PHASES } from "../../src/core/gamePhase.js";
import { createGameSession } from "../../src/runtime/createGameSession.js";

test("游戏会话统一管理阶段、关卡和结算结果", () => {
  const session = createGameSession();
  const levelState = { level: { id: "sample" } };

  session.loadLevel({ index: 2, state: levelState });
  session.transition(GAME_PHASES.BRIEFING);
  session.transition(GAME_PHASES.PLAYING);
  session.setResult({ won: true });

  assert.equal(session.phase, GAME_PHASES.PLAYING);
  assert.equal(session.currentLevelIndex, 2);
  assert.equal(session.levelState, levelState);
  assert.deepEqual(session.result, { won: true });
  assert.throws(
    () => session.transition(GAME_PHASES.LEVEL_SELECT),
    /非法游戏状态跳转/,
  );
});

test("会话重置只清理本局数据并回到选关阶段", () => {
  const session = createGameSession();
  session.loadLevel({ index: 1, state: {} });
  session.transition(GAME_PHASES.BRIEFING);
  session.reset();

  assert.equal(session.phase, GAME_PHASES.LEVEL_SELECT);
  assert.equal(session.levelState, null);
  assert.equal(session.result, null);
});
