import assert from "node:assert/strict";
import test from "node:test";
import { createHistoryTimelineController } from "../../src/ui/createHistoryTimelineController.js";

function createClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
  };
}

function createElement(tagName) {
  return {
    tagName,
    className: "",
    dataset: {},
    disabled: false,
    innerHTML: "",
    textContent: "",
    style: { setProperty() {} },
    classList: createClassList(),
    addEventListener() {},
    setAttribute() {},
  };
}

function createTrack() {
  const track = createElement("div");
  track.children = [];
  track.appendChild = (child) => track.children.push(child);
  track.querySelectorAll = (selector) =>
    selector === ".history-node-card"
      ? track.children.filter((child) => String(child.className).includes("history-node-card"))
      : [];
  return track;
}

function level(id, age, track = "mainline") {
  return {
    id,
    age,
    track,
    sceneName: id,
    emoji: "🎮",
    difficulty: 1,
    cardDesc: id,
    success: `${id} success`,
  };
}

test("人生事件轴锁定未开放关卡且番外始终可进入", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement };
  const historyTrack = createTrack();
  const entered = [];
  const ui = {
    historyTimelineModal: { classList: createClassList(), addEventListener() {} },
    historyTrack,
    historyViewport: { addEventListener() {}, scrollTo() {}, clientWidth: 600 },
    historyStatusText: { textContent: "" },
    historyNodeDetail: { innerHTML: "" },
  };

  try {
    const controller = createHistoryTimelineController({
      ui,
      levels: [level("age-19", 19), level("age-21", 21), level("extra", null, "extra")],
      storyProgress: {
        isUnlocked: (id) => id !== "age-21",
        isCompleted: () => false,
      },
      revealProgress: { isRevealed: () => false, reveal: () => true },
      onEnterLevel: (id) => entered.push(id),
      timerHost: {},
    });
    controller.showBrowse();
  } finally {
    globalThis.document = previousDocument;
  }

  const cards = historyTrack.querySelectorAll(".history-node-card");
  assert.match(cards[0].className, /open/);
  assert.match(cards[1].className, /fog/);
  assert.match(cards[2].className, /open/);
  cards[2].dispatchEvent?.({ stopPropagation() {} });
  assert.deepEqual(entered, []);
});

test("全部主线完成后人生事件轴展示人生终章", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement };
  const storyEnding = { hidden: true };

  try {
    const controller = createHistoryTimelineController({
      ui: {
        historyTimelineModal: { classList: createClassList(), addEventListener() {} },
        historyTrack: createTrack(),
        historyViewport: { addEventListener() {}, scrollTo() {}, clientWidth: 600 },
        historyStatusText: { textContent: "" },
        historyNodeDetail: { innerHTML: "" },
        storyEnding,
      },
      levels: [level("age-19", 19)],
      storyProgress: {
        isComplete: () => true,
        isUnlocked: () => true,
        isCompleted: () => true,
      },
      revealProgress: { isRevealed: () => true, reveal: () => true },
      timerHost: {},
    });
    controller.showBrowse();
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(storyEnding.hidden, false);
});
