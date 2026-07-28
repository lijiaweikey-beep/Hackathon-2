import test from "node:test";
import assert from "node:assert/strict";
import { createTaskModalModel } from "../../src/ui/taskModal.js";

test("关卡可以声明无限时间和自定义资源", () => {
  assert.deepEqual(
    createTaskModalModel({
      level: {
        timeLimit: null,
        resourceLabel: "理智",
        resourceInitial: 100,
        targetDesc: "血月引路人",
      },
      npcCount: 36,
    }),
    {
      npcCount: 36,
      timeText: "∞",
      resourceHtml: '理智 <span id="taskAttempts">100</span>',
      targetLabel: "血月引路人",
      briefingText: "",
    },
  );
});

test("主线任务简报先讲年龄衔接再说明玩法", () => {
  const model = createTaskModalModel({
    level: {
      mission: "找到老板并一拳通关。",
      transition: { intro: "二十七岁，职场的锅从天而降。" },
      targetDesc: "老板",
    },
    npcCount: 20,
  });

  assert.equal(
    model.briefingText,
    "二十七岁，职场的锅从天而降。\n\n找到老板并一拳通关。",
  );
});
