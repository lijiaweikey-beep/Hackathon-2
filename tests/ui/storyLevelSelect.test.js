import assert from "node:assert/strict";
import test from "node:test";
import { createGameUiController } from "../../src/ui/createGameUiController.js";

function createClassList() {
  return {
    add() {},
    remove() {},
    toggle() {},
  };
}

function createContainer(cards) {
  return {
    innerHTML: "",
    appendChild(card) {
      cards.push(card);
    },
  };
}

test("人生时间线锁定未开放关卡且番外始终可进入", () => {
  const previousDocument = globalThis.document;
  const mainlineCards = [];
  const extraCards = [];
  globalThis.document = {
    createElement() {
      return {
        className: "",
        dataset: {},
        style: { setProperty() {} },
        addEventListener() {},
      };
    },
  };
  const level = (id, age) => ({
    id,
    age,
    sceneName: id,
    emoji: "🎮",
    difficulty: 1,
    cardDesc: id,
  });
  const storyProgress = {
    isUnlocked: (id) => id === "age-19",
    isCompleted: () => false,
  };
  const ui = {
    levelCards: createContainer(mainlineCards),
    extraLevelCards: createContainer(extraCards),
    levelSelectModal: { classList: createClassList() },
    taskModal: { classList: createClassList() },
    resultModal: { classList: createClassList() },
  };

  try {
    const controller = createGameUiController({
      ui,
      session: { levelState: { level: {} } },
      levelRegistry: {
        visible: [],
        mainline: [level("age-19", 19), level("age-21", 21)],
        extra: [level("extra")],
      },
      storyProgress,
    });
    controller.showLevelSelect({ leaveLevel: false });
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(mainlineCards.length, 2);
  assert.equal(mainlineCards[0].disabled, false);
  assert.equal(mainlineCards[1].disabled, true);
  assert.match(mainlineCards[0].innerHTML, /19 岁/);
  assert.match(mainlineCards[1].innerHTML, /尚未解锁/);
  assert.equal(extraCards.length, 1);
  assert.equal(extraCards[0].disabled, false);
});
