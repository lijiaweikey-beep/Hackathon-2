import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DIFFICULTY,
  getDifficultyNpcCount,
  getDifficultyNpcText,
  normalizeDifficulty,
} from "../../src/core/difficulty.js";

test("难度默认从中开始并清洗非法值", () => {
  assert.equal(DEFAULT_DIFFICULTY, "medium");
  assert.equal(normalizeDifficulty("hard"), "hard");
  assert.equal(normalizeDifficulty("unknown"), "medium");
});

test("找人关随难度增加人数", () => {
  assert.deepEqual(
    ["easy", "medium", "hard"].map((difficulty) =>
      getDifficultyNpcCount({ id: "gaming" }, difficulty)
    ),
    [14, 18, 24],
  );
});

test("爆金币最难人数最少且最易人数最多", () => {
  assert.deepEqual(
    ["easy", "medium", "hard"].map((difficulty) =>
      getDifficultyNpcCount({ id: "debt-smasher" }, difficulty)
    ),
    [26, 20, 16],
  );
});

test("机制关使用自己的难度人数文案", () => {
  assert.equal(getDifficultyNpcText({ id: "goose-market" }, "easy"), "13–15 人");
  assert.equal(getDifficultyNpcText({ id: "goose-market" }, "medium"), "16–19 人");
  assert.equal(getDifficultyNpcText({ id: "goose-market" }, "hard"), "19–23 人");
  assert.equal(getDifficultyNpcText({ id: "staged-director", npcCountText: "14人" }, "hard"), "14人");
  assert.equal(getDifficultyNpcText({ id: "supermarket" }, "hard"), "固定阵容");
});
