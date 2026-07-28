import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWorld } from "../../src/levels/goose-market/world.js";

test("鹅腿夜市创建移动路灯且只有鸭腿会显绿色", () => {
  const scene = new THREE.Scene();
  const obstacles = [];
  const resources = createWorld({
    THREE,
    scene,
    addWall() {},
    registerObstacle: (...args) => obstacles.push(args),
  });
  const underLight = resources.lightPositions[0].clone();

  assert.equal(resources.getLegGlow(underLight, true), 0);
  assert.ok(resources.getLegGlow(underLight, false) > 0.9);
  const before = resources.lightPositions[0].x;
  resources.updateEnvironment(1);
  assert.notEqual(resources.lightPositions[0].x, before);
  assert.ok(scene.children.length > 10);
  assert.ok(obstacles.length > 0);
});
