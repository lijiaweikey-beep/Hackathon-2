import test from "node:test";
import assert from "node:assert/strict";
import { validateLevelDefinition } from "../../src/levels/levelContract.js";

test("关卡描述必须包含唯一标识、标题和顺序", () => {
  assert.throws(
    () => validateLevelDefinition({ id: "demo" }, "demo"),
    /缺少字段/,
  );
});

test("非兼容关卡必须提供创建函数", () => {
  assert.throws(
    () => validateLevelDefinition({ id: "demo", sceneName: "演示", order: 1 }, "demo"),
    /createLevel/,
  );
});

test("兼容关卡可以暂时不提供创建函数", () => {
  const definition = { id: "legacy", sceneName: "旧关卡", order: 1, legacy: true };
  assert.equal(validateLevelDefinition(definition, "legacy"), definition);
});
