import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createPlayerAntiJitter } from "../../src/systems/createPlayerAntiJitter.js";

test("方向连续反转达到 5 次时强制转 90° 并锁定 1 秒", () => {
  const anti = createPlayerAntiJitter();
  const player = { group: { rotation: { y: 0 } } };
  const velocity = new THREE.Vector2(1, 0);

  anti.observe(player, velocity, 0.01); // 建立初始方向
  for (let i = 0; i < 4; i += 1) {
    velocity.set(i % 2 === 0 ? -1 : 1, 0);
    const result = anti.observe(player, velocity, 0.01);
    assert.equal(result.locked, false);
  }

  velocity.set(-1, 0); // 第 5 次反向
  const locked = anti.observe(player, velocity, 0.01);
  assert.equal(locked.locked, true);
  assert.ok(Math.abs(player.group.rotation.y - Math.PI / 2) < 1e-6);
  assert.equal(velocity.lengthSq(), 0);
  assert.equal(anti.isLocked(), true);

  anti.tickLock(velocity, 0.5);
  assert.equal(anti.isLocked(), true);
  anti.tickLock(velocity, 0.6);
  assert.equal(anti.isLocked(), false);
});

test("超过时间窗未再反转时计数清零", () => {
  const anti = createPlayerAntiJitter({ reverseWindowSeconds: 0.2 });
  const player = { group: { rotation: { y: 0 } } };
  const velocity = new THREE.Vector2(1, 0);

  anti.observe(player, velocity, 0.01);
  velocity.set(-1, 0);
  anti.observe(player, velocity, 0.01);
  assert.equal(anti.reverseCount, 1);

  // 同向移动并耗尽时间窗，旧反向计数应清零
  velocity.set(-1, 0);
  anti.observe(player, velocity, 0.25);
  assert.equal(anti.reverseCount, 0);
});
