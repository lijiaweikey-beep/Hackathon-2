import test from "node:test";
import assert from "node:assert/strict";
import templeDefinition from "../../src/levels/temple/definition.js";

test("承天寺关卡使用插件生命周期并声明假影数量", () => {
  assert.equal(templeDefinition.legacy, false);
  assert.equal(typeof templeDefinition.createLevel, "function");
  assert.equal(templeDefinition.decoyCount, 5);
  assert.equal(templeDefinition.moonDecoyCount, 3);
  assert.match(templeDefinition.mechanicHintHtml, /月光中庭/);
});
