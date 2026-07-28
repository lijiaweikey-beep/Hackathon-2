import assert from "node:assert/strict";
import test from "node:test";
import { createClassicExperience } from "../../src/runtime/createClassicExperience.js";

test("经典体验保留关卡、角色、界面和特效更新顺序", () => {
  const calls = [];
  const experience = createClassicExperience({
    consumeHitstop: () => false,
    updateLevel: () => calls.push("level"),
    updateTimer: () => calls.push("timer"),
    updatePlayerEffects: () => calls.push("player-effects"),
    updateActors: () => calls.push("actors"),
    updateUi: () => calls.push("ui"),
    updateEffects: () => calls.push("effects"),
    updateShake: () => calls.push("shake"),
    render: () => calls.push("render"),
    start: () => calls.push("start"),
    dispose: () => calls.push("dispose"),
  });

  experience.mount();
  experience.start();
  experience.update(0.016);
  experience.render();
  experience.dispose();

  assert.deepEqual(calls, [
    "start",
    "level",
    "timer",
    "player-effects",
    "actors",
    "ui",
    "effects",
    "shake",
    "render",
    "dispose",
  ]);
});

test("经典体验在顿帧期间只更新震动", () => {
  const calls = [];
  const experience = createClassicExperience({
    consumeHitstop: () => true,
    updateActors: () => calls.push("actors"),
    updateShake: () => calls.push("shake"),
    render: () => {},
  });

  experience.update(0.016);

  assert.deepEqual(calls, ["shake"]);
});
