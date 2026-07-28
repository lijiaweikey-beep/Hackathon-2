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

test("选关卡片只用通用类名和关卡数据配色", () => {
  const previousDocument = globalThis.document;
  const properties = new Map();
  const cards = [];
  globalThis.document = {
    createElement() {
      return {
        className: "",
        dataset: {},
        style: {
          setProperty(name, value) {
            properties.set(name, value);
          },
        },
        addEventListener() {},
      };
    },
  };
  const ui = {
    levelCards: {
      innerHTML: "",
      appendChild(card) {
        cards.push(card);
      },
    },
    levelSelectModal: { classList: createClassList() },
    taskModal: { classList: createClassList() },
    resultModal: { classList: createClassList() },
  };
  const level = {
    id: "custom",
    sceneName: "自定义",
    emoji: "🎮",
    difficulty: 1,
    cardDesc: "不同玩法",
    cardStyle: { accent: "#123456", glow: "rgba(1, 2, 3, .4)" },
  };

  try {
    const controller = createGameUiController({
      ui,
      session: { levelState: { level: {} } },
      levelRegistry: { visible: [level] },
    });
    controller.showLevelSelect({ leaveLevel: false });
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(cards[0].className, "level-card");
  assert.equal(properties.get("--card-accent"), "#123456");
  assert.equal(properties.get("--card-glow"), "rgba(1, 2, 3, .4)");
});
