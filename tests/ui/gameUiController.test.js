import assert from "node:assert/strict";
import test from "node:test";
import { createGameUiController } from "../../src/ui/createGameUiController.js";

function createClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    toggle(value, force) {
      if (force) values.add(value);
      else values.delete(value);
    },
    contains: (value) => values.has(value),
  };
}

test("界面控制器独立切换选关界面并刷新抬头信息", () => {
  const ui = {
    levelSelectModal: { classList: createClassList() },
    taskModal: { classList: createClassList() },
    resultModal: { classList: createClassList() },
    missionText: { textContent: "" },
    timerText: { textContent: "" },
  };
  const controller = createGameUiController({
    ui,
    session: { levelState: { level: {}, remaining: 10, attempts: 3 } },
    levelViewHost: { clear() {}, setTheme() {} },
  });

  controller.showLevelSelect();
  controller.updateHud({ mission: "测试任务", timerText: "10" });

  assert.equal(ui.levelSelectModal.classList.contains("visible"), true);
  assert.equal(ui.missionText.textContent, "测试任务");
  assert.equal(ui.timerText.textContent, "10");
});
