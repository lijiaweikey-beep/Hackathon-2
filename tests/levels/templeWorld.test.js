import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWorld } from "../../src/levels/temple/world.js";

test("承天寺场景独立创建月光中庭与竹柏影线索", () => {
  const scene = new THREE.Scene();
  const obstacles = [];
  const world = {
    THREE,
    scene,
    addWall() {},
    registerObstacle: (...args) => obstacles.push(args),
    randomRange: (min) => min,
    textures: {
      getWallTexture: () => null,
    },
  };

  const resources = createWorld(world);

  assert.ok(resources.moonPoint);
  assert.ok(resources.shadowCue);
  assert.ok(scene.children.length > 20);
  assert.ok(obstacles.length > 5);
});
