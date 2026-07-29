import assert from "node:assert/strict";
import test from "node:test";
import { createGameAudio } from "../../src/runtime/createGameAudio.js";

test("体验音频按名称播放并支持延迟", () => {
  const calls = [];
  const audio = createGameAudio({
    sounds: {
      hit: () => calls.push("hit"),
      win: () => calls.push("win"),
    },
    schedule(play, delayMs) {
      calls.push(delayMs);
      play();
    },
  });

  audio.play("hit", 80);
  audio.play("unknown");
  audio.win();

  assert.deepEqual(calls, [80, "hit", "win"]);
});

test("体验音频提供运行时依赖适配对象", () => {
  const calls = [];
  const audio = createGameAudio({
    sounds: {
      hit: () => calls.push("hit"),
      miss: () => calls.push("miss"),
      punch: () => calls.push("punch"),
      resume: () => calls.push("resume"),
      win: () => calls.push("win"),
      lose: () => calls.push("lose"),
    },
  });

  audio.experience.playSound("hit");
  audio.experience.resume();
  audio.combat.playPunch();
  audio.combat.playHit();
  audio.combat.playMiss();
  audio.settlement.playWin();
  audio.settlement.playLose();

  assert.deepEqual(calls, ["hit", "resume", "punch", "hit", "miss", "win", "lose"]);
});
