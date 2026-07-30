import assert from "node:assert/strict";
import test from "node:test";
import definition from "../../src/levels/debt-smasher/definition.js";

test("爆金币属于三十岁经典主线终局关卡", () => {
  assert.equal(definition.track, "mainline");
  assert.equal(definition.age, 30);
  assert.equal(definition.timeLimit, 100);
  assert.equal(definition.actionIcon, "🦵");
  assert.equal(definition.actionGuide, "踢按钮/空格 按当前朝向踢送");
  assert.equal(definition.targetDesc, "房贷车贷账单");
  assert.equal(definition.targetCallout, "全场账单怪都是目标！！");
  assert.equal(definition.legacy, false);
  assert.equal(typeof definition.createLevel, "function");
  assert.equal(definition.extensions.createExperience, undefined);
  assert.equal(typeof definition.extensions.createPlayer, "function");
  assert.equal(typeof definition.extensions.createNpc, "function");
  assert.equal(typeof definition.extensions.createPreviewModel, "function");
  assert.match(definition.mission, /账单怪/);
  assert.match(definition.mission, /踢/);
  assert.doesNotMatch(definition.mission, /路人/);
});
