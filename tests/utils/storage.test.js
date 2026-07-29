import test from "node:test";
import assert from "node:assert/strict";
import { getBestScore, saveBestScore } from "../../src/utils/storage.js";

function installFakeLocalStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test("失败结算记录可以落库但永远不覆盖胜利记录", () => {
  installFakeLocalStorage();

  // 第一次失败也要留下结算记录。
  saveBestScore("debt-smasher", { won: false, grade: "C", rating: 4, time: 88 });
  assert.equal(getBestScore("debt-smasher").won, false);

  // 再次失败保留最近一次结算。
  saveBestScore("debt-smasher", { won: false, grade: "C", rating: 4, time: 95 });
  assert.equal(getBestScore("debt-smasher").time, 95);

  // 通关后胜利记录顶掉失败记录。
  saveBestScore("debt-smasher", { won: true, grade: "B", rating: 3, time: 60 });
  assert.equal(getBestScore("debt-smasher").won, true);
  assert.equal(getBestScore("debt-smasher").grade, "B");

  // 之后再失败，不允许覆盖胜利记录。
  saveBestScore("debt-smasher", { won: false, grade: "C", rating: 4, time: 30 });
  assert.equal(getBestScore("debt-smasher").won, true);
  assert.equal(getBestScore("debt-smasher").grade, "B");

  // 更好的胜利成绩正常刷新。
  saveBestScore("debt-smasher", { won: true, grade: "S", rating: 1, time: 25 });
  assert.equal(getBestScore("debt-smasher").grade, "S");
});

test("旧存档没有 won 字段时视为胜利记录", () => {
  installFakeLocalStorage();

  saveBestScore("gaming", { grade: "S", rating: 1, time: 20 });
  saveBestScore("gaming", { won: false, grade: "C", rating: 4, time: 10 });
  assert.equal(getBestScore("gaming").grade, "S");
});
