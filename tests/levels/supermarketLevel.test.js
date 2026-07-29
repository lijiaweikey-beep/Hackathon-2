import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import definition from "../../src/levels/supermarket/definition.js";

test("超市取证属于二十五岁独立主线关卡", () => {
  assert.equal(definition.track, "mainline");
  assert.equal(definition.age, 25);
  assert.equal(definition.createLevel, undefined);
  assert.equal(typeof definition.extensions.createExperience, "function");
});

test("超市体验完成挂载、暂停、恢复和释放生命周期", () => {
  const calls = [];
  const root = {
    querySelector() {
      return {
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        setPointerCapture() {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        textContent: "",
      };
    },
  };
  const scene = new THREE.Scene();
  const host = {
    surface: {
      root,
      setContent: (html) => calls.push(["content", html]),
      clear: () => calls.push(["clear"]),
    },
    input: {
      windowTarget: new EventTarget(),
      listen: () => {},
    },
    rendering: {
      THREE,
      canvas: {},
      createScene: () => scene,
      createCamera: () => new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100),
      render: () => calls.push(["render"]),
      disposeScene: () => calls.push(["dispose-scene"]),
    },
    flow: {
      start: () => calls.push(["start"]),
      finish: (result) => calls.push(["finish", result]),
      leave: () => calls.push(["leave"]),
    },
    random: { range: (min) => min },
  };
  const experience = definition.extensions.createExperience(host);

  experience.mount();
  experience.start();
  experience.update(0.1);
  experience.pause();
  experience.resume();
  experience.render();
  experience.dispose();

  assert.equal(experience.presentation, "standalone");
  const mountedContent = calls.find(([name]) => name === "content")[1];
  assert.match(mountedContent, /取证进度/);
  assert.match(mountedContent, /警戒/);
  assert.equal(calls.some(([name]) => name === "render"), true);
  assert.deepEqual(calls.slice(-2).map(([name]) => name), ["dispose-scene", "clear"]);
});
