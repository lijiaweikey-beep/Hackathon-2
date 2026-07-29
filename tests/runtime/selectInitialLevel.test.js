import assert from "node:assert/strict";
import test from "node:test";

import { selectInitialLevelId } from "../../src/runtime/selectInitialLevel.js";

test("预启动入口优先进入第一个已解锁主线关卡", () => {
  const levels = [{ id: "first" }, { id: "second" }];
  const storyProgress = { isUnlocked: (id) => id === "second" };

  assert.equal(selectInitialLevelId(levels, storyProgress), "second");
});

test("预启动入口没有解锁信息时回退到首个主线关卡", () => {
  assert.equal(selectInitialLevelId([{ id: "first" }], null), "first");
  assert.equal(selectInitialLevelId([], null), null);
});
