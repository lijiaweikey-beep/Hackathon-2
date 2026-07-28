import assert from "node:assert/strict";
import test from "node:test";
import { createDebtRules } from "../../src/levels/debt-smasher/rules.js";

test("路人必须先被打晕才能推入前方", () => {
  const rules = createDebtRules({ pushDistance: 2 });
  const npc = { x: 0, z: 0 };

  assert.equal(rules.push(npc, { x: 1, z: 0 }), false);
  assert.equal(rules.hit(npc), true);
  assert.equal(rules.push(npc, { x: 1, z: 0 }), true);
  assert.deepEqual({ x: npc.x, z: npc.z }, { x: 2, z: 0 });
});

test("粉碎路人每次爆出二十金币且同一人不能重复计分", () => {
  const rules = createDebtRules({ coinGoal: 100, coinPerNpc: 20 });
  const npc = { x: 1, z: 1 };
  rules.hit(npc);

  assert.equal(rules.smash({ x: 0, z: 0, radius: 2 }, [npc]).coinsGained, 20);
  assert.equal(rules.smash({ x: 0, z: 0, radius: 2 }, [npc]).coinsGained, 0);
  assert.equal(rules.snapshot().coins, 20);
});

test("累计一百金币立即通关", () => {
  const rules = createDebtRules({ coinGoal: 100, coinPerNpc: 20 });
  const npcs = Array.from({ length: 5 }, (_, index) => ({ x: index, z: 0 }));

  npcs.forEach((npc) => rules.hit(npc));
  rules.smash({ x: 2, z: 0, radius: 3 }, npcs);

  assert.equal(rules.snapshot().coins, 100);
  assert.equal(rules.snapshot().won, true);
});

test("玩家进入粉碎区立即失败", () => {
  const rules = createDebtRules();

  const result = rules.smash(
    { x: 0, z: 0, radius: 1 },
    [],
    { x: 0.5, z: 0 },
  );

  assert.equal(result.playerHit, true);
  assert.equal(rules.snapshot().failed, true);
});
