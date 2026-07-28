import test from "node:test";
import assert from "node:assert/strict";
import gamingDefinition from "../../src/levels/gaming/definition.js";

test("凌晨三点关卡使用插件生命周期", () => {
  assert.equal(gamingDefinition.legacy, false);
  assert.equal(typeof gamingDefinition.createLevel, "function");
});
