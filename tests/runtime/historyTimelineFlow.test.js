import assert from "node:assert/strict";
import test from "node:test";
import { createHistoryTimelineFlow } from "../../src/runtime/createHistoryTimelineFlow.js";

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

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

test("通关后当前关静默记录并给下一关播放解锁动画", () => {
  const previousDocument = globalThis.document;
  const previousStorage = globalThis.localStorage;
  globalThis.document = { createElement };
  globalThis.localStorage = createMemoryStorage({ "gengge-best-score": "{}" });
  const completed = new Set();
  const historyTrack = createTrack();
  const timers = [];
  const levels = [
    { id: "age-19", age: 19, track: "mainline", sceneName: "第一关" },
    { id: "age-21", age: 21, track: "mainline", sceneName: "第二关" },
  ];

  try {
    const flow = createHistoryTimelineFlow({
      ui: {
        historyTimelineModal: { classList: createClassList(), addEventListener() {} },
        historyTrack,
        historyViewport: { addEventListener() {}, scrollTo() {}, clientWidth: 600 },
        historyStatusText: { textContent: "" },
        historyNodeDetail: { innerHTML: "" },
      },
      levels,
      storage: createMemoryStorage(),
      storyProgress: {
        isComplete: () => levels.every((level) => completed.has(level.id)),
        isUnlocked: (id) => id === "age-19" || completed.has("age-19"),
        isCompleted: (id) => completed.has(id),
        complete: (id) => {
          completed.add(id);
          return true;
        },
      },
      timerHost: {
        setTimeout(callback, delay) {
          timers.push({ callback, delay });
          return timers.length;
        },
      },
    });

    flow.onLevelCompleted(levels[0]);

    assert.equal(flow.showPendingReveal(), true);
    timers.shift().callback();
    const cards = historyTrack.querySelectorAll(".history-node-card");
    assert.match(cards[0].className, /unlocked/);
    assert.match(cards[1].className, /open/);
    assert.equal(cards[0].classList.contains("revealing"), false);
    assert.equal(cards[0].classList.contains("unlocking"), false);
    assert.equal(cards[1].classList.contains("revealing"), true);
    assert.equal(cards[1].classList.contains("unlocking"), false);
    assert.match(cards[1].textContent, /history-chain chain-a/);
    assert.match(cards[1].textContent, /history-chain chain-b/);
  } finally {
    globalThis.document = previousDocument;
    globalThis.localStorage = previousStorage;
  }
});
