import test from "node:test";
import assert from "node:assert/strict";
import { createNpc, createPlayer } from "../../src/entities/actors.js";

test("角色工厂使用声明式目标和玩家外观", () => {
  const npc = createNpc(
    1,
    { levelTarget: true },
    { playerVariant: "default" },
    () => 0.5,
  );
  assert.equal(npc.isLevelTarget, true);

  const player = createPlayer({ playerVariant: "werewolf" });
  assert.ok(player.group.userData.wolfParts.length > 0);
});
