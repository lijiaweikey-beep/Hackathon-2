import assert from "node:assert/strict";
import test from "node:test";
import { createHistoryTimelineController } from "../../src/ui/createHistoryTimelineController.js";

function createClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
    toggle: (value, force) => {
      if (force ?? !values.has(value)) values.add(value);
      else values.delete(value);
      return values.has(value);
    },
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

test("人生事件轴在主线未全通时渲染并锁住番外关卡", () => {
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
  assert.equal(cards.length, 3);
  assert.match(cards[2].className, /fog/);
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

test("全部主线完成且集齐全 A 后事件轴半生通关入口可打开人生线报告", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement };
  const historyTrack = createTrack();
  let opened = 0;

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
        isCompleted: () => true,
      },
      revealProgress: { isRevealed: () => true, reveal: () => true },
      timerHost: {},
      isLifeReportReady: () => true,
      onOpenLifeReport: () => { opened += 1; },
    });
    controller.showBrowse();
  } finally {
    globalThis.document = previousDocument;
  }

  const divider = historyTrack.querySelectorAll(".history-track-divider")[0];
  assert.equal(divider.tagName, "button");
  assert.equal(divider.textContent, "半生通关");
  assert.match(divider.className, /unlocked/);
  divider.dispatchEvent({ type: "click", stopPropagation() {} });
  assert.equal(opened, 1);
});

test("未集齐全 A 时半生通关入口呈锁定态", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement };
  const historyTrack = createTrack();
  const historyStatusText = { textContent: "" };
  let opened = 0;

  try {
    const controller = createHistoryTimelineController({
      ui: {
        historyTimelineModal: { classList: createClassList(), addEventListener() {} },
        historyTrack,
        historyViewport: { addEventListener() {}, scrollTo() {}, clientWidth: 600 },
        historyStatusText,
        historyNodeDetail: { innerHTML: "" },
      },
      levels: [level("age-19", 19), level("extra", null, "extra")],
      storyProgress: {
        isComplete: () => true,
        isUnlocked: () => true,
        isCompleted: () => true,
      },
      revealProgress: { isRevealed: () => true, reveal: () => true },
      timerHost: {},
      isLifeReportReady: () => false,
      onOpenLifeReport: () => { opened += 1; },
    });
    controller.showBrowse();
    const divider = historyTrack.querySelectorAll(".history-track-divider")[0];
    assert.equal(divider.textContent, "半生通关");
    assert.doesNotMatch(divider.className, /unlocked/);
    assert.match(divider.className, /locked/);
    divider.dispatchEvent({ type: "click", stopPropagation() {} });
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(opened, 0);
  assert.match(historyStatusText.textContent, /A 级/);
});
