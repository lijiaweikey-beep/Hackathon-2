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

function createButton(difficulty) {
  const listeners = {};
  return {
    dataset: { difficulty },
    classList: createClassList(),
    attributes: {},
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    click() {
      listeners.click?.();
    },
  };
}

test("界面控制器回到首页时交给人生事件轴并刷新抬头信息", () => {
  let homeShown = false;
  const ui = {
    taskModal: { classList: createClassList() },
    resultModal: { classList: createClassList() },
    shareModal: { classList: createClassList() },
    missionText: { textContent: "" },
    timerText: { textContent: "" },
  };
  const controller = createGameUiController({
    ui,
    session: { levelState: { level: {}, remaining: 10, attempts: 3 } },
    levelViewHost: { clear() {}, setTheme() {} },
    onHomeShown: () => { homeShown = true; },
  });

  controller.showHome();
  controller.updateHud({ mission: "测试任务", timerText: "10" });

  assert.equal(homeShown, true);
  assert.equal(ui.missionText.textContent, "测试任务");
  assert.equal(ui.timerText.textContent, "10");
});

test("预启动按钮关闭启动页并通知外部，不自动进入关卡流程", () => {
  let dismissed = false;
  let started = false;
  const prelaunchScreen = { classList: createClassList() };
  const prelaunchStartButton = createButton();
  const controller = createGameUiController({
    ui: {
      prelaunchScreen,
      prelaunchStartButton,
      taskModal: { classList: createClassList() },
      resultModal: { classList: createClassList() },
      shareModal: { classList: createClassList() },
    },
    session: { levelState: { level: {}, remaining: 10, attempts: 3 } },
    levelViewHost: { clear() {}, setTheme() {} },
    onPrelaunchDismissed: () => { dismissed = true; },
    onStart: () => { started = true; },
  });

  controller.bind();
  prelaunchStartButton.click();

  assert.equal(prelaunchScreen.classList.contains("is-away"), true);
  assert.equal(dismissed, true);
  assert.equal(started, false);
});

test("难度按钮只更新当前关卡人数和选中状态", () => {
  const buttons = ["easy", "medium", "hard"].map(createButton);
  const ui = {
    taskModal: { classList: createClassList() },
    resultModal: { classList: createClassList() },
    shareModal: { classList: createClassList() },
    difficultyButtons: buttons,
    missionText: { textContent: "" },
    timerText: { textContent: "" },
    taskEmoji: { textContent: "" },
    taskTitle: { textContent: "" },
    taskCopy: { textContent: "" },
    taskClue: { textContent: "" },
    taskNpcCount: { textContent: "" },
    taskTime: { textContent: "" },
    targetLabel: { textContent: "" },
    retryButton: { disabled: true, textContent: "", addEventListener() {} },
  };
  const level = {
    id: "debt-smasher",
    emoji: "🪙",
    sceneName: "爆金币",
    clue: "金币有限",
    targetDesc: "房贷",
    mission: "尽量打金币。",
  };
  const controller = createGameUiController({
    ui,
    session: { levelState: { level, remaining: 10, attempts: 3 } },
    levelViewHost: { clear() {}, setTheme() {} },
  });

  controller.bind();
  buttons[2].click();
  controller.showTask(level);

  assert.equal(controller.getMatchNpcCount(), 26);
  assert.equal(buttons[2].attributes["aria-pressed"], "true");
});

test("结算页使用关卡等级贴图和节点文案", () => {
  const background = {};
  const ui = {
    resultTitle: { textContent: "" },
    resultCopy: { textContent: "" },
    resultLevelTag: { textContent: "" },
    resultAgeTag: { textContent: "" },
    resultNodeTitle: { textContent: "" },
    resultUnlock: { textContent: "" },
    resultArt: {
      style: { set backgroundImage(value) { background.image = value; } },
      classList: createClassList(),
    },
    resultRating: { textContent: "", className: "" },
    statTime: { textContent: "" },
    statAttempts: { textContent: "", classList: createClassList() },
    statAttemptsLabel: { textContent: "" },
    retryButton: { disabled: true, textContent: "" },
    resultModal: { classList: createClassList() },
    taskModal: { classList: createClassList() },
  };
  const level = {
    id: "gaming",
    age: 19,
    sceneName: "凌晨三点",
    success: "成功",
    failure: "失败",
    art: { cover: "cover.jpg", grades: { S: "grade-s.jpg" } },
    nodes: { S: { title: "作息纠察队长", verdict: "宿舍安静了。" } },
  };
  const controller = createGameUiController({
    ui,
    session: { levelState: { level } },
    levelRegistry: { mainline: [level] },
    levelViewHost: { clear() {}, setTheme() {} },
  });

  controller.showResult({
    won: true,
    timeUsed: 12,
    attemptsLeft: 2,
    rating: { grade: "S" },
    level,
  });

  assert.equal(ui.resultLevelTag.textContent, "LV.01");
  assert.equal(ui.resultAgeTag.textContent, "19岁");
  assert.equal(ui.resultNodeTitle.textContent, "「作息纠察队长」");
  assert.equal(ui.resultCopy.textContent, "宿舍安静了。");
  assert.equal(background.image, 'url("grade-s.jpg")');
});

test("置顶提示直接显示在上方且不播放中间浮动动画", () => {
  const clueBar = {
    textContent: "",
    classList: createClassList(),
    offsetWidth: 0,
  };
  const controller = createGameUiController({
    ui: {
      clueBar,
      taskModal: { classList: createClassList() },
      resultModal: { classList: createClassList() },
      shareModal: { classList: createClassList() },
    },
    session: { levelState: { level: {}, remaining: 10, attempts: 3 } },
    levelViewHost: { clear() {}, setTheme() {} },
  });

  controller.updateHud({
    clue: "打我鹅腿阿姨干嘛",
    cluePlacement: "top",
  });

  assert.equal(clueBar.textContent, "打我鹅腿阿姨干嘛");
  assert.equal(clueBar.classList.contains("floated"), true);
  assert.equal(clueBar.classList.contains("char-pop"), false);
});
