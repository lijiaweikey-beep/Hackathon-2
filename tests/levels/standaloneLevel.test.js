import assert from "node:assert/strict";
import test from "node:test";
import definition from "../fixtures/standalone-level/definition.js";
import { validateLevelDefinition } from "../../src/levels/levelContract.js";
import { createInputController } from "../../src/systems/createInputController.js";

test("独立玩法样例只通过体验宿主完成完整生命周期", () => {
  const calls = [];
  let clickListener;
  let experience;
  const counter = { textContent: "" };
  const host = {
    surface: {
      root: {
        querySelector: () => counter,
      },
      setContent: (html) => calls.push(["content", html]),
      clear: () => calls.push(["clear"]),
    },
    input: {
      listen(target, type, listener) {
        calls.push(["listen", target, type]);
        if (type === "click") clickListener = listener;
      },
      windowTarget: {},
    },
    flow: {
      start() {
        calls.push(["start"]);
        experience.start();
      },
      finish: (result) => calls.push(["finish", result]),
      leave: () => calls.push(["leave"]),
    },
  };
  experience = definition.extensions.createExperience(host);

  experience.mount();
  clickListener({
    target: {
      closest: (selector) => selector === "[data-start]",
    },
  });
  experience.update(0.5);
  experience.pause();
  experience.resume();
  experience.handleInput({ type: "primary" });
  experience.handleInput({ type: "primary" });
  experience.handleInput({ type: "primary" });
  experience.showResult({ won: true });
  experience.dispose();

  assert.equal(validateLevelDefinition(definition), definition);
  assert.equal(definition.createLevel, undefined);
  assert.equal(experience.presentation, "standalone");
  assert.equal(calls.filter(([name]) => name === "start").length, 1);
  assert.equal(calls.filter(([name]) => name === "finish").length, 1);
  assert.equal(calls.at(-1)[0], "clear");
});

test("独立玩法键位不会与停用的经典输入重复触发", () => {
  const windowTarget = new EventTarget();
  const root = new EventTarget();
  root.querySelector = () => ({ textContent: "" });
  const host = {
    surface: {
      root,
      setContent() {},
      clear() {},
    },
    input: {
      windowTarget,
      listen(target, type, listener) {
        target.addEventListener(type, listener);
      },
    },
    flow: {
      finish() {},
      start() {},
    },
  };
  const experience = definition.extensions.createExperience(host);
  const joystick = new EventTarget();
  joystick.setPointerCapture = () => {};
  const classicInput = createInputController({
    isActive: () => false,
    windowTarget,
    joystick,
    joystickKnob: { style: {} },
    onAttack: () => experience.handleInput({ type: "primary" }),
  });
  experience.mount();
  experience.start();
  classicInput.bind();

  const event = new Event("keydown");
  Object.defineProperty(event, "code", { value: "Space" });
  windowTarget.dispatchEvent(event);

  assert.equal(experience.getResultStats().attemptsLeft, 1);
});
