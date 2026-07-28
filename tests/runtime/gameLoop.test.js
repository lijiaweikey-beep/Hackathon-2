import assert from "node:assert/strict";
import test from "node:test";
import { GAME_PHASES } from "../../src/core/gamePhase.js";
import { createGameLoop } from "../../src/runtime/createGameLoop.js";

test("主循环按关卡、角色、界面、特效和渲染顺序更新", () => {
  const calls = [];
  const loop = createGameLoop({
    session: {
      phase: GAME_PHASES.PLAYING,
      levelState: { level: { timeLimit: null } },
    },
    hasScene: () => true,
    consumeHitstop: () => false,
    advanceTime: () => calls.push("time"),
    updateLevel: () => calls.push("level"),
    updateActors: () => calls.push("actors"),
    updateUi: () => calls.push("ui"),
    updateEffects: () => calls.push("effects"),
    updateShake: () => calls.push("shake"),
    render: () => calls.push("render"),
  });

  loop.tick(0.016);

  assert.deepEqual(calls, [
    "time",
    "level",
    "actors",
    "ui",
    "effects",
    "shake",
    "render",
  ]);
});
