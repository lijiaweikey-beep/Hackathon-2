import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import definition from "../../src/levels/office/definition.js";

test("办公室躲黑锅属于二十七岁独立主线关卡", () => {
  assert.equal(definition.track, "mainline");
  assert.equal(definition.age, 27);
  assert.equal(typeof definition.extensions.createExperience, "function");
});

test("办公室体验暂停时不推进时间并在离开时释放场景", () => {
  const calls = [];
  const root = {
    querySelector: () => ({
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setPointerCapture() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      textContent: "",
    }),
  };
  const host = {
    surface: {
      root,
      setContent: () => {},
      clear: () => calls.push("clear"),
    },
    input: { windowTarget: new EventTarget(), listen() {} },
    rendering: {
      THREE,
      createScene: () => new THREE.Scene(),
      createCamera: () => new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100),
      render() {},
      disposeScene: () => calls.push("dispose"),
    },
    flow: { start() {}, finish() {}, leave() {} },
    random: { range: (min) => min },
  };
  const experience = definition.extensions.createExperience(host);

  experience.mount();
  experience.start();
  experience.update(1);
  const beforePause = experience.getResultStats().elapsed;
  experience.pause();
  experience.update(1);
  experience.dispose();

  assert.equal(experience.getResultStats().elapsed, beforePause);
  assert.deepEqual(calls, ["dispose", "clear"]);
});
