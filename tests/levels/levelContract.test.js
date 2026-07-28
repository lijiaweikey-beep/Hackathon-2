import test from "node:test";
import assert from "node:assert/strict";
import { validateLevelDefinition } from "../../src/levels/levelContract.js";
import { isLevelAction } from "../../src/levels/actions.js";

test("关卡动作契约支持进入正式游戏", () => {
  assert.equal(isLevelAction("beginPlay"), true);
});

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

test("独立玩法关卡可以只提供体验创建函数", () => {
  const definition = {
    id: "standalone",
    sceneName: "独立玩法",
    order: 100,
    extensions: { createExperience() {} },
  };

  assert.equal(validateLevelDefinition(definition, "standalone"), definition);
});

test("兼容关卡可以暂时不提供创建函数", () => {
  const definition = { id: "legacy", sceneName: "旧关卡", order: 1, legacy: true };
  assert.equal(validateLevelDefinition(definition, "legacy"), definition);
});

test("关卡只能声明受支持的动作和扩展函数", () => {
  const createWorld = () => {};
  const definition = {
    id: "custom",
    sceneName: "自定义",
    order: 1,
    createLevel() {},
    actions: ["getHudState"],
    extensions: { createWorld },
  };

  assert.equal(validateLevelDefinition(definition, "custom"), definition);
  assert.throws(
    () => validateLevelDefinition({ ...definition, actions: ["getHudSate"] }, "custom"),
    /未知动作/,
  );
  assert.throws(
    () => validateLevelDefinition({ ...definition, extensions: { createWorld: true } }, "custom"),
    /扩展必须是函数/,
  );
  assert.throws(
    () => validateLevelDefinition({ ...definition, extensions: { createWrold() {} } }, "custom"),
    /未知扩展/,
  );
});

test("人生主线必须声明有效年龄，番外不能占用年龄节点", () => {
  const base = {
    id: "story",
    sceneName: "人生关卡",
    order: 1,
    createLevel() {},
  };

  assert.throws(
    () => validateLevelDefinition({ ...base, track: "mainline" }, "story"),
    /年龄/,
  );
  assert.throws(
    () => validateLevelDefinition({ ...base, track: "mainline", age: 0 }, "story"),
    /年龄/,
  );
  assert.throws(
    () => validateLevelDefinition({ ...base, track: "extra", age: 20 }, "story"),
    /番外/,
  );
  assert.throws(
    () => validateLevelDefinition({ ...base, track: "unknown" }, "story"),
    /分组/,
  );
  assert.equal(
    validateLevelDefinition({ ...base, track: "mainline", age: 19 }, "story").age,
    19,
  );
});
