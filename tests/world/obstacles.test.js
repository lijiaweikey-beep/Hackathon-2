import assert from "node:assert/strict";
import test from "node:test";
import { PLAY_Z_MIN, WORLD_LIMIT } from "../../src/config/constants.js";
import {
  clampActorPosition,
  containVelocityAtWorldBounds,
} from "../../src/world/obstacles.js";

test("贴上下边界障碍时先解碰撞再钳制，避免逐帧抖动", () => {
  const levelState = {
    obstacles: [
      { x: 0, z: PLAY_Z_MIN + 0.2, halfW: 1.2, halfD: 0.6 },
    ],
  };
  const position = { x: 0, z: PLAY_Z_MIN };
  const velocity = { x: 0, y: -1 };
  const zs = [];

  for (let i = 0; i < 8; i += 1) {
    position.z = PLAY_Z_MIN - 0.01;
    clampActorPosition(levelState, position, velocity);
    zs.push(Number(position.z.toFixed(4)));
  }

  assert.ok(zs.every((z) => z >= PLAY_Z_MIN - 1e-6));
  assert.equal(new Set(zs).size, 1);
});

test("左右边界清零朝外速度，避免持续顶墙抖动", () => {
  const velocity = { x: 1, y: 0 };
  const position = { x: WORLD_LIMIT, z: 0 };
  containVelocityAtWorldBounds(position, velocity);
  assert.equal(velocity.x, 0);

  velocity.x = -1;
  position.x = -WORLD_LIMIT;
  containVelocityAtWorldBounds(position, velocity);
  assert.equal(velocity.x, 0);
});

test("玩家 invertZ 约定下贴左右墙障碍会停住朝外输入速度", () => {
  const levelState = {
    obstacles: [
      { x: WORLD_LIMIT + 0.1, z: 0, halfW: 0.35, halfD: 10.6 },
    ],
  };
  const position = { x: WORLD_LIMIT, z: 0 };
  const velocity = { x: 1, y: 0 };
  const xs = [];

  for (let i = 0; i < 8; i += 1) {
    position.x = WORLD_LIMIT + 0.05;
    velocity.x = 1;
    clampActorPosition(levelState, position, velocity, { invertZ: true });
    xs.push(Number(position.x.toFixed(4)));
  }

  assert.ok(xs.every((x) => x <= WORLD_LIMIT + 1e-6));
  assert.equal(new Set(xs).size, 1);
  assert.equal(velocity.x, 0);
});
