import * as THREE from "three";
import { WORLD_LIMIT, PLAY_Z_MIN } from "../config/constants.js";

export function clampToWorld(position) {
  position.x = THREE.MathUtils.clamp(position.x, -WORLD_LIMIT, WORLD_LIMIT);
  position.z = THREE.MathUtils.clamp(position.z, PLAY_Z_MIN, WORLD_LIMIT);
}

export function lerpAngle(a, b, t) {
  const delta = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + delta * t;
}

export function gridKey(cx, cz) {
  return cx * 1000 + cz;
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

const scratchFacing = new THREE.Vector2();

export function getFacingVector(rotationY, out = scratchFacing) {
  return out.set(Math.sin(rotationY), Math.cos(rotationY));
}
