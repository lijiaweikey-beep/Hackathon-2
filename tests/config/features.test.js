import test from "node:test";
import assert from "node:assert/strict";
import { FEATURES } from "../../src/config/features.js";

test("梗哥单人版本默认隐藏双人入口", () => {
  assert.equal(FEATURES.duelEntryEnabled, false);
  assert.equal(Object.isFrozen(FEATURES), true);
});
