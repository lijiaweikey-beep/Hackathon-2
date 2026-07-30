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
      targetCallout: "认准这个目标！！",
      briefingText: "",
      actionIcon: "👊",
      actionGuide: "拳按钮/空格 攻击",
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

test("关卡可以复用任务弹窗并声明自己的操作说明", () => {
  const model = createTaskModalModel({
    level: {
      resourceLabel: "照片",
      resourceInitial: "0 / 4",
      actionIcon: "📸",
      actionGuide: "相机按钮/空格 拍照",
      targetDesc: "出轨情侣",
    },
    npcCount: 20,
  });

  assert.equal(
    model.resourceHtml,
    '照片 <span id="taskAttempts">0 / 4</span>',
  );
  assert.equal(model.actionIcon, "📸");
  assert.equal(model.actionGuide, "相机按钮/空格 拍照");
});

test("关卡可以覆盖目标预览下方大字提示", () => {
  const model = createTaskModalModel({
    level: {
      targetDesc: "房贷车贷账单",
      targetCallout: "全场账单怪都是目标！！",
    },
    npcCount: 20,
  });

  assert.equal(model.targetLabel, "房贷车贷账单");
  assert.equal(model.targetCallout, "全场账单怪都是目标！！");
});

test("关卡可以覆盖简报中的场上人数", () => {
  const model = createTaskModalModel({
    level: {
      npcCountText: "4–6",
      targetDesc: "卖鸭腿的阿姨",
    },
    npcCount: 20,
  });

  assert.equal(model.npcCount, "4–6");
});
