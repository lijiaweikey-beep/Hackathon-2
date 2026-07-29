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

test("图书馆侧边书架摆放可见书籍", () => {
  const scene = new THREE.Scene();
  const world = {
    THREE,
    scene,
    addWall() {},
    registerObstacle() {},
    textures: {
      getWallTexture: () => null,
    },
  };
  const bookColors = new Set([0xb91c1c, 0x1d4ed8, 0x047857, 0xf59e0b, 0x7c3aed]);

  createWorld(world);

  const sideBooks = scene.children.filter((child) => (
    child.isMesh
    && bookColors.has(child.material.color.getHex())
    && Math.abs(child.position.x) > 9.6
    && child.position.z > -7
  ));
  assert.ok(sideBooks.length >= 40);
});
