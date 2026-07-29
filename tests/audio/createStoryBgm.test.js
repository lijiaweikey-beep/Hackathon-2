import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStoryBgm, AGE_TRACKS, INTRO_SRC } from "../../src/audio/createStoryBgm.js";

function createFakeAudio() {
  const instances = [];
  function AudioCtor(src) {
    const audio = {
      src,
      loop: false,
      volume: 1,
      preload: "auto",
      paused: true,
      currentTime: 0,
      play() {
        this.paused = false;
        return Promise.resolve();
      },
      pause() {
        this.paused = true;
      },
    };
    instances.push(audio);
    return audio;
  }
  return { AudioCtor, instances };
}

describe("createStoryBgm", () => {
  it("maps mainline ages to level tracks", () => {
    assert.match(AGE_TRACKS[19], /audio\/level-1\.mp3$/);
    assert.match(AGE_TRACKS[21], /audio\/level-2\.mp3$/);
    assert.match(AGE_TRACKS[23], /audio\/level-3\.mp3$/);
    assert.match(AGE_TRACKS[27], /audio\/level-4\.mp3$/);
    assert.match(AGE_TRACKS[30], /audio\/level-5\.mp3$/);
    assert.match(INTRO_SRC, /audio\/intro\.mp3$/);
  });

  it("loops intro until stopped", async () => {
    const { AudioCtor, instances } = createFakeAudio();
    const bgm = createStoryBgm({ AudioCtor, documentTarget: null });
    bgm.playIntro();
    assert.equal(instances.length, 1);
    assert.match(instances[0].src, /audio\/intro\.mp3$/);
    assert.equal(instances[0].loop, true);
    assert.equal(instances[0].paused, false);
    bgm.stop();
    assert.equal(instances[0].paused, true);
    assert.equal(bgm.isPlaying, false);
  });

  it("plays mapped age track and ignores unmapped ages", () => {
    const { AudioCtor, instances } = createFakeAudio();
    const bgm = createStoryBgm({ AudioCtor, documentTarget: null });
    assert.equal(bgm.playForLevel({ age: 27 }), true);
    assert.match(instances.at(-1).src, /audio\/level-4\.mp3$/);
    assert.equal(bgm.playForLevel({ age: 99 }), false);
    assert.equal(bgm.isPlaying, false);
  });

  it("stops current track when switching", () => {
    const { AudioCtor, instances } = createFakeAudio();
    const bgm = createStoryBgm({ AudioCtor, documentTarget: null });
    bgm.playIntro();
    bgm.playForAge(19);
    assert.equal(instances[0].paused, true);
    assert.match(instances[1].src, /audio\/level-1\.mp3$/);
    assert.equal(instances[1].paused, false);
  });

  it("respects global music toggle without losing desired track", () => {
    const { AudioCtor, instances } = createFakeAudio();
    let enabled = true;
    const bgm = createStoryBgm({
      AudioCtor,
      documentTarget: null,
      isEnabled: () => enabled,
    });
    bgm.playForAge(27);
    assert.equal(instances.at(-1).paused, false);
    enabled = false;
    bgm.syncEnabled();
    assert.equal(instances.at(-1).paused, true);
    enabled = true;
    bgm.syncEnabled();
    assert.equal(instances.at(-1).paused, false);
  });
});
