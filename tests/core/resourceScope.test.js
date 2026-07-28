import test from "node:test";
import assert from "node:assert/strict";
import { createResourceScope } from "../../src/core/resourceScope.js";

test("资源域按后进先出顺序清理且只清理一次", () => {
  const calls = [];
  const scope = createResourceScope();
  scope.add(() => calls.push("first"));
  scope.add(() => calls.push("second"));

  scope.dispose();
  scope.dispose();

  assert.deepEqual(calls, ["second", "first"]);
  assert.equal(scope.disposed, true);
});

test("资源域销毁后登记的资源立即清理", () => {
  let cleaned = false;
  const scope = createResourceScope();
  scope.dispose();
  scope.add(() => { cleaned = true; });
  assert.equal(cleaned, true);
});

test("资源域拒绝非函数清理项", () => {
  const scope = createResourceScope();
  assert.throws(() => scope.add(null), TypeError);
});
