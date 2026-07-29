import assert from "node:assert/strict";
import test from "node:test";
import { createClassicExperience } from "../../src/runtime/createClassicExperience.js";
import { createClassicGameExperience } from "../../src/runtime/createClassicGameExperience.js";

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
    updateEffects: () => calls.push("effects"),
    updateShake: () => calls.push("shake"),
    render: () => {},
  });

  experience.update(0.016);

  assert.deepEqual(calls, ["shake"]);
});

test("经典体验适配器把输入和规则动作转发给现有系统", () => {
  const calls = [];
  const experience = createClassicGameExperience({
    session: { result: { won: true }, levelState: { level: { timeLimit: null } } },
    levelRunner: {
      handleAction: (action) => {
        calls.push(action.type);
        return { attemptsLeft: 2 };
      },
      update: () => undefined,
    },
    actorSystem: {
      updatePlayer() {},
      updateNpcs() {},
      animateCheer() {},
    },
    combatSystem: { triggerAttack: () => calls.push("attack") },
    fx: {
      consumeHitstop: () => false,
      updateParticles() {},
      damageFlashTimer: 0,
    },
    uiController: { updateHud() {} },
    rendering: { render() {} },
    getScene: () => ({}),
    getPlayer: () => ({ hitInvuln: 0, group: { userData: {} } }),
    settlement: { finish() {} },
    updateShake() {},
    dispose() {},
  });

  experience.start();
  experience.handleInput({ type: "primary" });
  const stats = experience.getResultStats();

  assert.deepEqual(calls, ["beginPlay", "attack", "getResultStats"]);
  assert.equal(stats.attemptsLeft, 2);
});
