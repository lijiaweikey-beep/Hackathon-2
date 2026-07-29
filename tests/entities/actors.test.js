import test from "node:test";
import assert from "node:assert/strict";
import { createNpc, createPlayer } from "../../src/entities/actors.js";

test("角色工厂只初始化关卡提供的人物原型和特征", () => {
  let npcBodyCreated = false;
  const npcBody = { marker: "npc" };
  const npc = createNpc(1, {
    createBody: () => {
      npcBodyCreated = true;
      return npcBody;
    },
    traits: { isLevelTarget: true },
  }, () => 0.5);
  assert.equal(npcBodyCreated, true);
  assert.equal(npc.marker, "npc");
  assert.equal(npc.isLevelTarget, true);

  let playerBodyCreated = false;
  const playerBody = { marker: "player" };
  const player = createPlayer({
    createBody: () => {
      playerBodyCreated = true;
      return playerBody;
    },
    decorate: (actor) => Object.assign(actor, { decorated: true }),
  });
  assert.equal(playerBodyCreated, true);
  assert.equal(player.marker, "player");
  assert.equal(player.decorated, true);
});

test("默认玩家人物外观按随机数选择不同配色", () => {
  const first = createPlayer({ randomRange: () => 0 });
  const last = createPlayer({ randomRange: () => 3.99 });

  assert.notEqual(first.group.userData.colors[0], last.group.userData.colors[0]);
});
