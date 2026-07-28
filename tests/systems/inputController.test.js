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

test("游戏进行中连续反向按键沿用动作间隔限制", () => {
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
