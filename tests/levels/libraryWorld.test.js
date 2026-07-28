import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWorld } from "../../src/levels/library/world.js";

test("图书馆场景独立创建书架、桌椅与碰撞区", () => {
  const scene = new THREE.Scene();
  const obstacles = [];
  const world = {
    THREE,
    scene,
    addWall() {},
    registerObstacle: (...args) => obstacles.push(args),
    textures: {
      getWallTexture: () => null,
    },
  };

  createWorld(world);

  assert.ok(scene.children.length > 20);
  assert.ok(obstacles.length > 10);
});
