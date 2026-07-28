import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDuelGatherCountdown,
  generateDuelHerdDirection,
  getDuelGatherHudHint,
  getDuelGatherUiState,
} from "../../src/modes/duel/rules.js";

test("集合倒计时按秒和分钟显示", () => {
  assert.equal(formatDuelGatherCountdown(4.1), "5s");
  assert.equal(formatDuelGatherCountdown(61), "1:01");
});

test("集合倒计时在预告、紧急和成功阶段返回稳定状态", () => {
  assert.equal(getDuelGatherUiState({ elapsed: 50, inCircle: false }).phase, "upcoming");
  assert.equal(getDuelGatherUiState({ elapsed: 86, inCircle: false }).phase, "urgent");
  assert.equal(getDuelGatherUiState({ elapsed: 86, inCircle: true }).phase, "success");
});

test("集合状态可转换为简短抬头提示", () => {
  const state = getDuelGatherUiState({ elapsed: 86, inCircle: false });
  assert.equal(getDuelGatherHudHint(state), "🔴 立刻进入集合圈！ 4s");
});

test("相同种子生成相同且归一化的驱赶方向", () => {
  const first = generateDuelHerdDirection(2, 42);
  const second = generateDuelHerdDirection(2, 42);
  assert.deepEqual(first.toArray(), second.toArray());
  assert.ok(Math.abs(first.length() - 1) < 1e-9);
});
