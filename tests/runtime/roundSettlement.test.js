import assert from "node:assert/strict";
import test from "node:test";
import { GAME_PHASES } from "../../src/core/gamePhase.js";
import { createRoundSettlement } from "../../src/runtime/createRoundSettlement.js";

test("回合结算统一生成结果并通知界面", () => {
  const resultCalls = [];
  const session = {
    phase: GAME_PHASES.PLAYING,
    levelState: {
      level: { id: "sample" },
      startTime: 3,
      attempts: 2,
    },
    transition(next) {
      this.phase = next;
    },
    setResult(result) {
      this.result = result;
    },
  };
  const player = {
    group: {
      userData: {
        visual: { position: {} },
        leftArm: { rotation: {} },
        rightArm: { rotation: {} },
      },
    },
  };
  const settlement = createRoundSettlement({
    session,
    getPlayer: () => player,
    hasScene: () => true,
    getTotalTime: () => 8,
    getResultStats: () => ({ attemptsLeft: 1 }),
    calculateRating: () => ({ grade: "A", rating: 90 }),
    showResult: (result) => resultCalls.push(result),
    saveBestScore: () => {},
    playWin: () => {},
    playLose: () => {},
  });

  settlement.finish(true);

  assert.equal(session.phase, GAME_PHASES.RESULT);
  assert.equal(session.result.timeUsed, 5);
  assert.equal(session.result.attemptsLeft, 1);
  assert.equal(resultCalls.length, 1);
});

test("独立玩法没有经典玩家对象也可以失败结算", () => {
  const session = {
    phase: GAME_PHASES.PLAYING,
    levelState: {
      level: { id: "standalone" },
      startTime: 0,
      attempts: 0,
    },
    transition(next) {
      this.phase = next;
    },
    setResult(result) {
      this.result = result;
    },
  };
  const settlement = createRoundSettlement({
    session,
    getPlayer: () => null,
    hasScene: () => true,
    getTotalTime: () => 3,
    getResultStats: () => ({ attemptsLeft: 0 }),
    calculateRating: () => ({ grade: "C", rating: 0 }),
    showResult: () => {},
    saveBestScore: () => {},
    playWin: () => {},
    playLose: () => {},
  });

  settlement.finish(false, "失败", { attemptsLeft: 7 });

  assert.equal(session.phase, GAME_PHASES.RESULT);
  assert.equal(session.result.failMessage, "失败");
  assert.equal(session.result.attemptsLeft, 7);
});

test("成功结算推进主线，失败结算不改变进度", () => {
  const completed = [];
  const saved = [];
  const session = {
    phase: GAME_PHASES.PLAYING,
    levelState: {
      level: { id: "age-19" },
      startTime: 0,
      attempts: 3,
    },
    transition(next) {
      this.phase = next;
    },
    setResult() {},
  };
  const settlement = createRoundSettlement({
    session,
    getPlayer: () => null,
    hasScene: () => true,
    getTotalTime: () => 1,
    getResultStats: () => ({ attemptsLeft: 3 }),
    calculateRating: () => ({ grade: "S", rating: 100 }),
    showResult() {},
    saveBestScore: (levelId, score) => saved.push({ levelId, won: score.won }),
    onLevelCompleted: (level) => completed.push(level.id),
    playWin() {},
    playLose() {},
  });

  settlement.finish(true);
  session.phase = GAME_PHASES.PLAYING;
  settlement.finish(false);

  assert.deepEqual(completed, ["age-19"]);
  // 胜负都要留下结算记录，失败记录带 won:false。
  assert.deepEqual(saved, [
    { levelId: "age-19", won: true },
    { levelId: "age-19", won: false },
  ]);
});
