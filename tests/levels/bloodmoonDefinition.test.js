import test from "node:test";
import assert from "node:assert/strict";
import definition from "../../src/levels/bloodmoon/definition.js";

test("血月关卡使用插件生命周期并声明玩法资源", () => {
  assert.equal(definition.legacy, false);
  assert.equal(typeof definition.createLevel, "function");
  assert.equal(definition.timeLimit, null);
  assert.equal(definition.resourceLabel, "理智");
  assert.equal(definition.resourceInitial, 100);
  assert.equal(typeof definition.extensions.createWorld, "function");
  assert.equal(typeof definition.extensions.createPlayer, "function");
  assert.equal(definition.startSound, "wolfHowl");
  assert.equal(definition.attackComboExpires, false);
});
