import assert from "node:assert/strict";
import test from "node:test";
import { createOrientationController } from "../../src/runtime/createOrientationController.js";

test("竖屏暂停并清空输入，恢复横屏后继续原关卡", () => {
  const windowTarget = new EventTarget();
  windowTarget.innerWidth = 390;
  windowTarget.innerHeight = 844;
  const documentTarget = new EventTarget();
  documentTarget.hidden = false;
  const overlay = { hidden: true };
  let phase = "playing";
  let pauses = 0;
  let resumes = 0;
  let resets = 0;
  const controller = createOrientationController({
    windowTarget,
    documentTarget,
    overlay,
    isPlaying: () => phase === "playing",
    isPaused: () => phase === "paused",
    pause() {
      pauses += 1;
      phase = "paused";
    },
    resume() {
      resumes += 1;
      phase = "playing";
    },
    resetInput: () => { resets += 1; },
  });

  controller.bind();
  controller.sync();
  assert.equal(overlay.hidden, false);
  assert.equal(pauses, 1);
  assert.equal(resets >= 1, true);

  windowTarget.innerWidth = 844;
  windowTarget.innerHeight = 390;
  windowTarget.dispatchEvent(new Event("resize"));
  assert.equal(overlay.hidden, true);
  assert.equal(resumes, 1);

  controller.dispose();
});

test("方向控制器不会恢复玩家主动暂停的关卡", () => {
  const windowTarget = new EventTarget();
  windowTarget.innerWidth = 844;
  windowTarget.innerHeight = 390;
  const documentTarget = new EventTarget();
  documentTarget.hidden = false;
  let resumes = 0;
  const controller = createOrientationController({
    windowTarget,
    documentTarget,
    overlay: { hidden: true },
    isPlaying: () => false,
    isPaused: () => true,
    pause() {},
    resume: () => { resumes += 1; },
    resetInput() {},
  });

  controller.bind();

  assert.equal(resumes, 0);
  controller.dispose();
});
