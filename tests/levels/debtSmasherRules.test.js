import assert from "node:assert/strict";
import test from "node:test";
import { createDebtRules } from "../../src/levels/debt-smasher/rules.js";

test("账单怪可以沿玩家指向被推入前方", () => {
  const rules = createDebtRules({ pushDistance: 2 });
  const npc = { x: 0, z: 0, debtType: "mortgage" };

  assert.equal(rules.push(npc, { x: 1, z: 0 }), true);
  assert.deepEqual({ x: npc.x, z: npc.z }, { x: 2, z: 0 });
  assert.equal(npc.pushedByPlayer, true);
});

test("压碎玩家推入的账单怪随机爆出一至五金币且同一目标不能重复计分", () => {
  const rolls = [1, 5];
  const rules = createDebtRules({
    coinGoal: 100,
    randomRange: (min, max) => rolls.shift() ?? max,
  });
  const npc = { x: 1, z: 1, debtType: "car-loan", pushedByPlayer: true };

  assert.equal(rules.smash({ x: 0, z: 0, radius: 2 }, [npc]).coinsGained, 1);
  assert.equal(rules.smash({ x: 0, z: 0, radius: 2 }, [npc]).coinsGained, 0);
  assert.equal(rules.snapshot().coins, 1);
});

test("未被玩家推入的账单怪不会被陷阱自动计分", () => {
  const rules = createDebtRules({ randomRange: () => 5 });
  const npc = { x: 0.2, z: 0.2, debtType: "interest" };

  const result = rules.smash({ x: 0, z: 0, radius: 2 }, [npc]);

  assert.equal(result.coinsGained, 0);
  assert.equal(result.crushed.length, 0);
  assert.equal(rules.snapshot().coins, 0);
});

test("累计一百金币立即通关", () => {
  const rules = createDebtRules({ coinGoal: 100, randomRange: () => 5 });
  const npcs = Array.from({ length: 20 }, (_, index) => ({ x: index, z: 0, pushedByPlayer: true }));

  rules.smash({ x: 9, z: 0, radius: 12 }, npcs);

  assert.equal(rules.snapshot().coins, 100);
  assert.equal(rules.snapshot().won, true);
});

test("玩家进入债务机关区立即失败", () => {
  const rules = createDebtRules();

  const result = rules.smash(
    { x: 0, z: 0, radius: 1 },
    [],
    { x: 0.5, z: 0 },
  );

  assert.equal(result.playerHit, true);
  assert.equal(rules.snapshot().failed, true);
});
