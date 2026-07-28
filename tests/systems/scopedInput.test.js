import assert from "node:assert/strict";
import test from "node:test";
import { createResourceScope } from "../../src/core/resourceScope.js";
import { createScopedInput } from "../../src/systems/createScopedInput.js";

test("关卡输入监听随资源域自动移除", () => {
  const scope = createResourceScope();
  const target = new EventTarget();
  const inputs = [];
  const input = createScopedInput({
    scope,
    windowTarget: target,
    canvas: target,
    emit: (action) => inputs.push(action),
  });
  input.listen(target, "keydown", () => input.emit({ type: "jump" }));

  target.dispatchEvent(new Event("keydown"));
  scope.dispose();
  target.dispatchEvent(new Event("keydown"));

  assert.deepEqual(inputs, [{ type: "jump" }]);
});
