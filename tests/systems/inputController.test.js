import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createInputController } from "../../src/systems/createInputController.js";

test("输入控制器统一提供方向快照和动作节流", () => {
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
  });
  const direction = new THREE.Vector2();

  input.readDirection(direction);

  assert.deepEqual(direction.toArray(), [0, 0]);
  assert.equal(input.consumeAction(), true);
  assert.equal(input.consumeAction(), false);
});

test("体验进行中连续反向按键沿用动作间隔限制", () => {
  const windowTarget = new EventTarget();
  const joystick = new EventTarget();
  joystick.setPointerCapture = () => {};
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
    windowTarget,
    joystick,
    joystickKnob: { style: {} },
  });
  const direction = new THREE.Vector2();
  input.bind();

  const forward = new Event("keydown");
  Object.defineProperty(forward, "code", { value: "KeyW" });
  windowTarget.dispatchEvent(forward);
  const reverse = new Event("keydown");
  Object.defineProperty(reverse, "code", { value: "KeyS" });
  windowTarget.dispatchEvent(reverse);
  input.readDirection(direction);

  assert.deepEqual(direction.toArray(), [0, 1]);
});

test("经典输入停用时不响应移动和攻击键", () => {
  const windowTarget = new EventTarget();
  const joystick = new EventTarget();
  let captures = 0;
  joystick.setPointerCapture = () => {
    captures += 1;
  };
  let attacks = 0;
  const input = createInputController({
    isActive: () => false,
    windowTarget,
    joystick,
    joystickKnob: { style: {} },
    onAttack: () => {
      attacks += 1;
    },
  });
  const direction = new THREE.Vector2();
  input.bind();

  for (const code of ["KeyW", "Space"]) {
    const event = new Event("keydown");
    Object.defineProperty(event, "code", { value: code });
    windowTarget.dispatchEvent(event);
  }
  const pointer = new Event("pointerdown");
  Object.defineProperty(pointer, "pointerId", { value: 1 });
  joystick.dispatchEvent(pointer);
  input.readDirection(direction);

  assert.deepEqual(direction.toArray(), [0, 0]);
  assert.equal(attacks, 0);
  assert.equal(captures, 0);
});

test("重置输入会释放摇杆指针并阻止旧手指继续移动", () => {
  const windowTarget = new EventTarget();
  const joystick = new EventTarget();
  joystick.setPointerCapture = () => {};
  joystick.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
    windowTarget,
    joystick,
    joystickKnob: { style: {} },
  });
  const direction = new THREE.Vector2();
  input.bind();

  const pointerDown = new Event("pointerdown");
  Object.defineProperties(pointerDown, {
    pointerId: { value: 7 },
    clientX: { value: 80 },
    clientY: { value: 50 },
  });
  joystick.dispatchEvent(pointerDown);
  input.reset();

  const staleMove = new Event("pointermove");
  Object.defineProperties(staleMove, {
    pointerId: { value: 7 },
    clientX: { value: 90 },
    clientY: { value: 50 },
  });
  joystick.dispatchEvent(staleMove);
  input.readDirection(direction);

  assert.deepEqual(direction.toArray(), [0, 0]);
});

test("摇杆拖动方向不受动作节流影响", () => {
  const windowTarget = new EventTarget();
  const joystick = new EventTarget();
  joystick.setPointerCapture = () => {};
  joystick.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
    windowTarget,
    joystick,
    joystickKnob: { style: {} },
  });
  const direction = new THREE.Vector2();
  input.bind();

  const pointerDown = new Event("pointerdown");
  Object.defineProperties(pointerDown, {
    pointerId: { value: 7 },
    clientX: { value: 50 },
    clientY: { value: 80 },
  });
  joystick.dispatchEvent(pointerDown);
  const pointerMove = new Event("pointermove");
  Object.defineProperties(pointerMove, {
    pointerId: { value: 7 },
    clientX: { value: 50 },
    clientY: { value: 20 },
  });
  joystick.dispatchEvent(pointerMove);
  input.readDirection(direction);

  assert.equal(direction.y > 0.8, true);
});

test("摇杆以触摸起点作为本次拖动中心", () => {
  const windowTarget = new EventTarget();
  const joystick = new EventTarget();
  const joystickKnob = { style: {} };
  joystick.setPointerCapture = () => {};
  joystick.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
    windowTarget,
    joystick,
    joystickKnob,
  });
  const direction = new THREE.Vector2();
  input.bind();

  const pointerDown = new Event("pointerdown");
  Object.defineProperties(pointerDown, {
    pointerId: { value: 7 },
    clientX: { value: 80 },
    clientY: { value: 50 },
  });
  joystick.dispatchEvent(pointerDown);
  const pointerMove = new Event("pointermove");
  Object.defineProperties(pointerMove, {
    pointerId: { value: 7 },
    clientX: { value: 90 },
    clientY: { value: 50 },
  });
  joystick.dispatchEvent(pointerMove);
  input.readDirection(direction);

  assert.equal(direction.x > 0.2 && direction.x < 0.4, true);
  assert.equal(Math.abs(direction.y) < Number.EPSILON, true);
  assert.equal(
    joystickKnob.style.transform,
    "translate(-50%, -50%) translate(10px, 0px)",
  );
});

test("手指拖出摇杆热区后仍按窗口移动事件更新方向", () => {
  const windowTarget = new EventTarget();
  const joystick = new EventTarget();
  joystick.setPointerCapture = () => {};
  joystick.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
    windowTarget,
    joystick,
    joystickKnob: { style: {} },
  });
  const direction = new THREE.Vector2();
  input.bind();

  const pointerDown = new Event("pointerdown");
  Object.defineProperties(pointerDown, {
    pointerId: { value: 7 },
    clientX: { value: 50 },
    clientY: { value: 50 },
  });
  joystick.dispatchEvent(pointerDown);
  const pointerMove = new Event("pointermove");
  Object.defineProperties(pointerMove, {
    pointerId: { value: 7 },
    clientX: { value: 150 },
    clientY: { value: 50 },
  });
  windowTarget.dispatchEvent(pointerMove);
  input.readDirection(direction);

  assert.equal(direction.x > 0.95, true);
  assert.equal(Math.abs(direction.y) < Number.EPSILON, true);
});

test("摇杆快速反向不会沿用旧方向锁", () => {
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
  });
  const direction = new THREE.Vector2(0, -1);
  input.applyReverseLock(direction);

  direction.set(0, 1);
  input.applyReverseLock(direction);

  assert.deepEqual(direction.toArray(), [0, 1]);
});

test("摇杆黄点重置后保持视觉居中", () => {
  const joystickKnob = { style: {} };
  const input = createInputController({
    isActive: () => true,
    now: () => 1000,
    joystickKnob,
  });

  input.reset();

  assert.equal(
    joystickKnob.style.transform,
    "translate(-50%, -50%) translate(0px, 0px)",
  );
});
