import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePlayerPreferences,
  normalizeToggle,
} from "../../src/core/playerPreferences.js";

test("玩家偏好默认全开并清洗非法值", () => {
  assert.deepEqual(normalizePlayerPreferences(), {
    sfx: true,
    music: true,
    vibration: true,
  });
  assert.equal(normalizeToggle("off"), false);
  assert.equal(normalizeToggle("on"), true);
  assert.deepEqual(
    normalizePlayerPreferences({ sfx: "off", music: 0, vibration: "true" }),
    { sfx: false, music: false, vibration: true },
  );
});
