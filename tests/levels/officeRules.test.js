import assert from "node:assert/strict";
import test from "node:test";
import { createWokRules } from "../../src/levels/office/rules.js";

test("黑锅红圈预警半秒后才进入坠落阶段", () => {
  const rules = createWokRules({ warningSeconds: 0.5 });
  rules.warn({ x: 2, z: 3 });

  assert.equal(rules.update(0.49).ready.length, 0);
  const ready = rules.update(0.01).ready;
  assert.equal(ready.length, 1);
  assert.deepEqual(ready[0].position, { x: 2, z: 3 });
});

test("黑锅命中扣生命并启用无敌时间，老板不受影响", () => {
  const rules = createWokRules({ hp: 3, hitRadius: 1.2, invulnerableSeconds: 0.8 });

  assert.equal(rules.land({
    position: { x: 0, z: 0 },
    playerPosition: { x: 0.5, z: 0 },
    bossPosition: { x: 0, z: 0 },
  }).playerHit, true);
  assert.equal(rules.snapshot().hp, 2);
  assert.equal(rules.land({
    position: { x: 0, z: 0 },
    playerPosition: { x: 0, z: 0 },
    bossPosition: { x: 0, z: 0 },
  }).playerHit, false);
  assert.equal(rules.snapshot().hp, 2);
  assert.equal(rules.snapshot().bossHit, false);
});

test("玩家一拳命中老板立即通关", () => {
  const rules = createWokRules();

  assert.equal(rules.punch({ isBoss: false }), false);
  assert.equal(rules.punch({ isBoss: true }), true);
  assert.equal(rules.snapshot().won, true);
});
