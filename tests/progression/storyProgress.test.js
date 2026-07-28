import assert from "node:assert/strict";
import test from "node:test";
import { createStoryProgress } from "../../src/progression/createStoryProgress.js";

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const levels = [
  { id: "age-19" },
  { id: "age-21" },
  { id: "age-23" },
];

test("人生进度默认只解锁首关并在通关后开放下一关", () => {
  const storage = createMemoryStorage();
  const progress = createStoryProgress({ levels, storage, key: "story" });

  assert.equal(progress.isUnlocked("age-19"), true);
  assert.equal(progress.isUnlocked("age-21"), false);
  assert.equal(progress.complete("age-19"), true);
  assert.equal(progress.isCompleted("age-19"), true);
  assert.equal(progress.isUnlocked("age-21"), true);
  assert.equal(progress.isUnlocked("age-23"), false);
});

test("人生进度清洗损坏存档和已经移除的关卡", () => {
  const broken = createMemoryStorage({ story: "not-json" });
  const brokenProgress = createStoryProgress({ levels, storage: broken, key: "story" });
  assert.deepEqual(brokenProgress.getCompletedIds(), []);

  const stale = createMemoryStorage({
    story: JSON.stringify(["age-19", "removed", 42]),
  });
  const staleProgress = createStoryProgress({ levels, storage: stale, key: "story" });
  assert.deepEqual(staleProgress.getCompletedIds(), ["age-19"]);
  assert.equal(staleProgress.isUnlocked("age-21"), true);
  assert.equal(staleProgress.isUnlocked("missing"), false);
});

test("全部主线完成后人生进度进入完整通关状态", () => {
  const progress = createStoryProgress({
    levels,
    storage: createMemoryStorage(),
    key: "story",
  });

  assert.equal(progress.isComplete(), false);
  levels.forEach(({ id }) => progress.complete(id));
  assert.equal(progress.isComplete(), true);
});
