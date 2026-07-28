import assert from "node:assert/strict";
import test from "node:test";
import { createGameAudio } from "../../src/runtime/createGameAudio.js";

test("游戏音频按名称播放并支持延迟", () => {
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
