import test from "node:test";
import assert from "node:assert/strict";
import { createLevelCardModel } from "../../src/ui/levelCardModel.js";

test("关卡卡片模型组合动态人数文案和难度", () => {
  const model = createLevelCardModel({
    cardDesc: ({ npcCount }) => `在 ${npcCount} 人中找到目标`,
    difficulty: 2,
  }, {
    npcCount: 36,
  });

  assert.equal(model.description, "在 36 人中找到目标");
  assert.deepEqual(model.difficulty, { label: "经典", className: "classic" });
});

test("静态文案无需感知关卡类型", () => {
  const model = createLevelCardModel({
    cardDesc: "由关卡自己声明",
    difficulty: 5,
  }, {
    npcCount: 20,
  });

  assert.equal(model.description, "由关卡自己声明");
  assert.deepEqual(model.difficulty, { label: "困难", className: "hard" });
});
