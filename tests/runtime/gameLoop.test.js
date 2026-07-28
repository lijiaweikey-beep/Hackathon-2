import assert from "node:assert/strict";
import test from "node:test";
import { GAME_PHASES } from "../../src/core/gamePhase.js";
import { createGameLoop } from "../../src/runtime/createGameLoop.js";

test("主循环只委托当前体验更新和渲染", () => {
  const calls = [];
  const experience = {
    update: (deltaSeconds) => calls.push(["update", deltaSeconds]),
    render: () => calls.push(["render"]),
  };
  const loop = createGameLoop({
    session: { phase: GAME_PHASES.PLAYING },
    getExperience: () => experience,
    advanceTime: () => calls.push(["time"]),
  });

  loop.tick(0.016);

  assert.deepEqual(calls.map(([name]) => name), ["time", "update", "render"]);
  assert.equal(calls[1][1], 0.016);
});

test("暂停阶段只渲染当前体验", () => {
  const calls = [];
  const loop = createGameLoop({
    session: { phase: GAME_PHASES.PAUSED },
    getExperience: () => ({
      update: () => calls.push("update"),
      render: () => calls.push("render"),
    }),
  });

  loop.tick(0.016);

  assert.deepEqual(calls, ["render"]);
});
