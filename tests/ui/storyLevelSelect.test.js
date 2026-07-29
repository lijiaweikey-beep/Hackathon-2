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
  const listeners = new Map();
  return {
    tagName,
    className: "",
    dataset: {},
    disabled: false,
    innerHTML: "",
    textContent: "",
    style: { setProperty() {} },
    classList: createClassList(),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatchEvent(event) {
      listeners.get(event.type)?.(event);
    },
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
      : selector === ".history-track-divider"
        ? track.children.filter((child) => String(child.className).includes("history-track-divider"))
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

test("人生事件轴在主线未全通时折叠番外关卡", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement };
  const historyTrack = createTrack();
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
        isComplete: () => false,
      },
      revealProgress: { isRevealed: () => false, reveal: () => true },
      timerHost: {},
    });
    controller.showBrowse();
  } finally {
    globalThis.document = previousDocument;
  }

  const cards = historyTrack.querySelectorAll(".history-node-card");
  assert.match(cards[0].className, /open/);
  assert.match(cards[1].className, /fog/);
  assert.equal(cards.length, 2);
  assert.match(historyTrack.querySelectorAll(".history-track-divider")[0].className, /locked/);
});

test("人生事件轴在主线全通后展开番外并允许进入", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement };
  const historyTrack = createTrack();
  const entered = [];

  try {
    const controller = createHistoryTimelineController({
      ui: {
        historyTimelineModal: { classList: createClassList(), addEventListener() {} },
        historyTrack,
        historyViewport: { addEventListener() {}, scrollTo() {}, clientWidth: 600 },
        historyStatusText: { textContent: "" },
        historyNodeDetail: { innerHTML: "" },
      },
      levels: [level("age-19", 19), level("extra", null, "extra")],
      storyProgress: {
        isComplete: () => true,
        isUnlocked: () => true,
        isCompleted: (id) => id === "age-19",
      },
      revealProgress: { isRevealed: () => true, reveal: () => true },
      onEnterLevel: (id) => entered.push(id),
      timerHost: {},
    });
    controller.showBrowse();
  } finally {
    globalThis.document = previousDocument;
  }

  const cards = historyTrack.querySelectorAll(".history-node-card");
  assert.equal(cards.length, 2);
  assert.match(cards[1].className, /open/);
  assert.match(historyTrack.querySelectorAll(".history-track-divider")[0].className, /unlocked/);
  cards[1].dispatchEvent({ type: "click", stopPropagation() {} });
  assert.deepEqual(entered, ["extra"]);
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
