import assert from "node:assert/strict";
import test from "node:test";
import definition from "../../src/levels/office/definition.js";

test("办公室躲黑锅属于二十七岁经典主线关卡", () => {
  assert.equal(definition.track, "mainline");
  assert.equal(definition.age, 27);
  assert.equal(definition.legacy, false);
  assert.equal(typeof definition.createLevel, "function");
  assert.equal(definition.extensions.createExperience, undefined);
  assert.equal(typeof definition.extensions.createWorld, "function");
  assert.equal(typeof definition.extensions.createPlayer, "function");
  assert.equal(typeof definition.extensions.createNpc, "function");
  assert.deepEqual(definition.actions, [
    "beforeAttack",
    "hitTarget",
    "getHudState",
    "getResultStats",
  ]);
});
