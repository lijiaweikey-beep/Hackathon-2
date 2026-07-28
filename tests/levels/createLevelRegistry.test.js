import test from "node:test";
import assert from "node:assert/strict";
import { createLevelRegistry } from "../../src/levels/createLevelRegistry.js";

const legacy = (id, order, hidden = false) => ({
  id,
  sceneName: id,
  order,
  hidden,
  legacy: true,
});

test("注册中心按顺序排列并排除隐藏关卡", () => {
  const registry = createLevelRegistry([
    ["b", legacy("b", 2, true)],
    ["a", legacy("a", 1)],
  ]);
  assert.deepEqual(registry.all.map((item) => item.id), ["a", "b"]);
  assert.deepEqual(registry.visible.map((item) => item.id), ["a"]);
});

test("注册中心拒绝重复关卡标识", () => {
  assert.throws(
    () => createLevelRegistry([
      ["first", legacy("same", 1)],
      ["second", legacy("same", 2)],
    ]),
    /重复关卡标识/,
  );
});

test("注册中心可以按标识获取关卡", () => {
  const registry = createLevelRegistry([["a", legacy("a", 1)]]);
  assert.equal(registry.getById("a")?.id, "a");
  assert.equal(registry.getById("missing"), null);
});

test("注册中心按排序后的稳定下标解析关卡标识", () => {
  const registry = createLevelRegistry([
    ["b", legacy("b", 20)],
    ["a", legacy("a", 10)],
  ]);
  assert.equal(registry.getIndexById("a"), 0);
  assert.equal(registry.getIndexById("b"), 1);
  assert.equal(registry.getIndexById("missing"), -1);
});
