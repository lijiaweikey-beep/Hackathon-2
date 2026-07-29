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
  const hudStates = [];
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
      listen: () => calls.push(["listen"]),
    },
    controls: {
      readDirection: (target) => target.set(0, 0),
      applyReverseLock() {},
      getPlayerVelocity: () => new THREE.Vector2(),
      consumeAction: () => true,
      reset() {},
    },
    ui: {
      updateHud: (state) => hudStates.push(state),
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
  const listenerCount = calls.filter(([name]) => name === "listen").length;
  assert.equal(experience.showResult, undefined);
  assert.equal(
    calls.filter(([name]) => name === "listen").length,
    listenerCount,
  );
  experience.dispose();

  assert.equal(experience.presentation, "shared");
  const mountedContent = calls.find(([name]) => name === "content")[1];
  assert.doesNotMatch(mountedContent, /supermarket-hud/);
  assert.doesNotMatch(mountedContent, /警戒/);
  assert.doesNotMatch(mountedContent, /出口/);
  assert.doesNotMatch(mountedContent, /standalone-controls/);
  assert.match(mountedContent, /data-focus/);
  assert.match(mountedContent, /data-evidence/);
  assert.equal(hudStates.at(-1).attackIcon, "📸");
  assert.equal(hudStates.at(-1).resourceLabel, "照片");
  assert.equal(calls.some(([name]) => name === "render"), true);
  assert.deepEqual(calls.slice(-2).map(([name]) => name), ["dispose-scene", "clear"]);
});

test("有效拍照同时触发快门动画、证据卡和进度更新", () => {
  const nodes = new Map();
  function createNode() {
    const classes = new Set();
    return {
      style: {},
      textContent: "",
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle(name, force) {
          if (force) classes.add(name);
          else classes.delete(name);
        },
        contains: (name) => classes.has(name),
      },
      setPointerCapture() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    };
  }
  const root = {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, createNode());
      return nodes.get(selector);
    },
  };
  const scene = new THREE.Scene();
  const hudStates = [];
  const finishes = [];
  const velocity = new THREE.Vector2();
  const experience = definition.extensions.createExperience({
    surface: { root, setContent() {}, clear() {} },
    input: {
      windowTarget: new EventTarget(),
      listen() {},
    },
    controls: {
      readDirection: (target) => target.set(0, 0),
      applyReverseLock() {},
      getPlayerVelocity: () => velocity,
      consumeAction: () => true,
      reset: () => velocity.set(0, 0),
    },
    ui: { updateHud: (state) => hudStates.push(state) },
    rendering: {
      THREE,
      canvas: {},
      createScene: () => scene,
      createCamera: () => new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100),
      render() {},
      disposeScene() {},
    },
    flow: { start() {}, finish: (result) => finishes.push(result), leave() {} },
    random: { range: (min) => min },
  });

  experience.mount();
  experience.start();
  for (let frame = 0; frame < 120; frame += 1) {
    experience.update(0.05);
    if (hudStates.at(-1)?.clue?.includes("两人")) break;
  }

  const player = scene.children.find(({ userData }) => userData.role === "player");
  const targets = scene.children.filter(({ userData }) => userData.role === "target");
  const centerX = (targets[0].position.x + targets[1].position.x) / 2;
  player.position.set(centerX, 0, targets[0].position.z + 1);
  player.rotation.y = Math.PI;
  experience.update(0);
  experience.handleInput({ type: "photo" });

  assert.equal(nodes.get(".supermarket-game").classList.contains("capturing"), true);
  assert.equal(nodes.get("[data-evidence]").classList.contains("visible"), true);
  assert.equal(nodes.get("[data-evidence-count]").textContent, "目标确认 · 证据 1/4");
  assert.equal(hudStates.at(-1).resourceText, "1 / 4");

  for (let photo = 2; photo <= 4; photo += 1) {
    for (let frame = 0; frame < 70; frame += 1) experience.update(0.05);
    const nextTargets = scene.children.filter(({ userData }) => userData.role === "target");
    const nextCenterX = (nextTargets[0].position.x + nextTargets[1].position.x) / 2;
    player.position.set(nextCenterX, 0, nextTargets[0].position.z + 1);
    player.rotation.y = Math.PI;
    experience.update(0);
    experience.handleInput({ type: "photo" });
    assert.equal(hudStates.at(-1).resourceText, `${photo} / 4`);
  }

  assert.equal(finishes.length, 0);
  experience.update(0.6);
  assert.equal(finishes.length, 1);
  assert.equal(finishes[0].won, true);
  experience.dispose();
});
