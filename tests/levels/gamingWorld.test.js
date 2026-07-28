import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWorld } from "../../src/levels/gaming/world.js";

test("宿舍场景独立创建电脑和环境更新能力", () => {
  const scene = new THREE.Scene();
  const obstacles = [];
  const world = {
    THREE,
    scene,
    addWall() {},
    registerObstacle: (...args) => obstacles.push(args),
    collidesWithObstacle: () => false,
    randomRange: (min) => min,
    textures: {
      getWallTexture: () => null,
    },
  };
  const resources = createWorld(world);

  assert.equal(resources.computers.length, 10);
  assert.equal(typeof resources.updateEnvironment, "function");
  assert.ok(scene.children.length > 20);
});
