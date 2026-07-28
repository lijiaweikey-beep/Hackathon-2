import assert from "node:assert/strict";
import test from "node:test";
import { createLevelContext } from "../../src/levels/createLevelContext.js";

test("关卡上下文是只读能力快照", () => {
  const source = { npcCount: 12 };
  const context = createLevelContext(source);

  source.npcCount = 20;
  assert.equal(context.npcCount, 12);
  assert.equal(Object.isFrozen(context), true);
  assert.throws(() => {
    context.npcCount = 8;
  }, TypeError);
});
