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
