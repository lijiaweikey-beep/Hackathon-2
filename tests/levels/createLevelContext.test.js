import assert from "node:assert/strict";
import test from "node:test";
import { createLevelContext } from "../../src/levels/createLevelContext.js";

test("关卡上下文是只读能力快照", () => {
  const createNpc = () => {};
  const source = {
    definition: { id: "sample" },
    sceneData: {},
    actors: {
      npcCount: 12,
      createNpc,
    },
  };
  const context = createLevelContext(source);

  source.actors.npcCount = 20;
  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.actors), true);
  assert.equal(context.createNpc, undefined);
  assert.equal(context.actors.npcCount, 12);
  assert.equal(context.actors.createNpc, createNpc);
  assert.throws(() => {
    context.actors.npcCount = 8;
  }, TypeError);
});
