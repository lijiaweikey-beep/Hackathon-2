import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWorld } from "../../src/levels/debt-smasher/world.js";

test("债务工厂使用经典世界构建接口创建房贷车贷机关", () => {
  const scene = new THREE.Scene();
  const obstacles = [];
  const resources = createWorld({
    THREE,
    scene,
    addWall() {},
    registerObstacle: (...args) => obstacles.push(args),
    randomRange: (min) => min,
    textures: {
      getWallTexture: () => null,
    },
  });

  assert.equal(resources.machines.length, 4);
  assert.deepEqual(
    [...new Set(resources.machines.map((machine) => machine.debtKind))].sort(),
    ["car-loan", "mortgage"],
  );
  assert.equal(typeof resources.updateEnvironment, "function");
  assert.ok(obstacles.length >= 4);
});
