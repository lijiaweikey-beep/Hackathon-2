import assert from "node:assert/strict";
import test from "node:test";
import { createWorldRuntime } from "../../src/runtime/createWorldRuntime.js";

test("世界运行时统一登记并查询关卡障碍", () => {
  const levelState = { obstacles: [] };
  const world = createWorldRuntime({
    getScene: () => ({}),
    getLevelState: () => levelState,
    getMatchNpcCount: () => 10,
    randomRange: (min) => min,
  });

  world.registerObstacle(1, 2, 3, 4);

  assert.equal(levelState.obstacles.length, 1);
  assert.equal(world.collidesWithObstacle({ x: 1, z: 2 }, 0.1), true);
});
