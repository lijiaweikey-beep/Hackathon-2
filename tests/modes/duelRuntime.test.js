import assert from "node:assert/strict";
import test from "node:test";

import {
  createDuelMovementResponse,
  duelDefinition,
} from "../../src/modes/duel/runtime.js";

test("双人运行时保留即时移动和转向手感", () => {
  const result = createDuelMovementResponse({ x: 1, y: 0 });
  assert.deepEqual(result.velocity, { x: 1, y: 0 });
  assert.equal(result.rotation, Math.PI / 2);
});

test("双人描述明确声明为休眠模式", () => {
  assert.equal(duelDefinition.id, "library_duel");
  assert.equal(duelDefinition.active, false);
});
