import * as THREE from "three";
import {
  ACTION_INTERVAL_MS,
  REVERSE_INPUT_DOT_THRESHOLD,
  REVERSE_INPUT_LOCK_MS,
} from "../config/constants.js";

export function createInputController(dependencies) {
  const joystickDirection = new THREE.Vector2();
  const keyDirection = new THREE.Vector2();
  const playerVelocity = new THREE.Vector2();
  const acceptedDirection = new THREE.Vector2();
  const now = dependencies.now ?? (() => performance.now());
  let pointerId = null;
  let acceptedAt = -Infinity;
  let lastActionAt = -Infinity;

  function isActive() {
    return dependencies.isActive?.() ?? true;
  }

  function readDirection(target) {
    target.copy(joystickDirection).add(keyDirection);
  }

  function applyReverseLock(nextDirection) {
    if (!isActive()) return;
    const length = nextDirection.length();
    if (length < 0.0001) return;
    const timestamp = now();
    if (acceptedDirection.lengthSq() > 0.0001) {
      const dot = acceptedDirection.dot(nextDirection) / length;
      if (
        dot < REVERSE_INPUT_DOT_THRESHOLD
        && timestamp - acceptedAt < REVERSE_INPUT_LOCK_MS
      ) {
        nextDirection.copy(acceptedDirection).multiplyScalar(length);
        return;
      }
    }
    acceptedDirection.copy(nextDirection).normalize();
    acceptedAt = timestamp;
  }

  function consumeAction() {
    if (!isActive()) return true;
    const timestamp = now();
    if (timestamp - lastActionAt < ACTION_INTERVAL_MS) return false;
    lastActionAt = timestamp;
    return true;
  }

  function reset() {
    joystickDirection.set(0, 0);
    keyDirection.set(0, 0);
    playerVelocity.set(0, 0);
    acceptedDirection.set(0, 0);
    acceptedAt = -Infinity;
    lastActionAt = -Infinity;
  }

  function setKeyAxis(axis, value) {
    if (keyDirection[axis] === value) return;
    if (!consumeAction()) return;
    keyDirection[axis] = value;
  }

  function updateJoystick(event, joystick) {
    if (!isActive()) return;
    if (!consumeAction()) return;
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const radius = rect.width * 0.34;
    const distance = Math.hypot(deltaX, deltaY);
    const scale = distance > radius ? radius / distance : 1;
    const x = deltaX * scale;
    const y = deltaY * scale;
    dependencies.joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
    joystickDirection.set(x / radius, -y / radius);
    if (joystickDirection.lengthSq() > 1) joystickDirection.normalize();
  }

  function releaseJoystick(event) {
    if (event?.pointerId != null && event.pointerId !== pointerId) return;
    pointerId = null;
    joystickDirection.set(0, 0);
    dependencies.joystickKnob.style.transform = "translate(0px, 0px)";
  }

  function bind() {
    const joystick = dependencies.joystick;
    const windowTarget = dependencies.windowTarget ?? window;
    const primeAudio = dependencies.primeAudio ?? (() => {});
    joystick.addEventListener("pointerdown", primeAudio, { once: true });
    windowTarget.addEventListener("keydown", primeAudio, { once: true });
    joystick.addEventListener("pointerdown", (event) => {
      if (!isActive()) return;
      pointerId = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      updateJoystick(event, joystick);
    });
    joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId === pointerId) updateJoystick(event, joystick);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      joystick.addEventListener(type, releaseJoystick);
    });
    windowTarget.addEventListener("pointerup", releaseJoystick);
    windowTarget.addEventListener("pointercancel", releaseJoystick);
    windowTarget.addEventListener("keydown", (event) => {
      if (!isActive()) return;
      if (event.code === "KeyW" || event.code === "ArrowUp") setKeyAxis("y", 1);
      if (event.code === "KeyS" || event.code === "ArrowDown") setKeyAxis("y", -1);
      if (event.code === "KeyA" || event.code === "ArrowLeft") setKeyAxis("x", -1);
      if (event.code === "KeyD" || event.code === "ArrowRight") setKeyAxis("x", 1);
      if (event.code === "Space" || event.code === "KeyJ") dependencies.onAttack?.();
    });
    windowTarget.addEventListener("keyup", (event) => {
      if ((event.code === "KeyW" || event.code === "ArrowUp") && keyDirection.y > 0) keyDirection.y = 0;
      if ((event.code === "KeyS" || event.code === "ArrowDown") && keyDirection.y < 0) keyDirection.y = 0;
      if ((event.code === "KeyA" || event.code === "ArrowLeft") && keyDirection.x < 0) keyDirection.x = 0;
      if ((event.code === "KeyD" || event.code === "ArrowRight") && keyDirection.x > 0) keyDirection.x = 0;
    });
  }

  return Object.freeze({
    getPlayerVelocity: () => playerVelocity,
    readDirection,
    applyReverseLock,
    consumeAction,
    reset,
    bind,
  });
}
