import assert from "node:assert/strict";
import test from "node:test";
import definition from "../../src/levels/goose-market/definition.js";
import { createGooseMarketLevel } from "../../src/levels/goose-market/createLevel.js";

function position(x = 0, z = 0) {
  return {
    x,
    y: 0,
    z,
    copy(other) {
      this.x = other.x;
      this.z = other.z;
      return this;
    },
  };
}

test("鹅腿夜市属于二十三岁主线", () => {
  assert.equal(definition.track, "mainline");
  assert.equal(definition.age, 23);
  assert.equal(typeof definition.createLevel, "function");
});

test("鹅腿目标不发光而灯下鸭腿出现绿色线索", () => {
  const created = [];
  const context = {
    sceneData: {
      updateEnvironment() {},
      getLegGlow(actorPosition, isGoose) {
        return isGoose ? 0 : (actorPosition.x === 1 ? 0.8 : 0);
      },
    },
    actors: {
      npcCount: 3,
      createNpc(id, flags) {
        const npc = {
          id,
          isGoose: Boolean(flags.gooseVendor),
          alive: true,
          group: { position: position(id, 0) },
          setLegGlow(value) {
            this.legGlow = value;
          },
        };
        created.push({ flags, npc });
        return npc;
      },
      randomOpenPosition: undefined,
      addNpc() {},
    },
    movement: {
      randomOpenPosition: () => position(0, 0),
    },
  };
  const level = createGooseMarketLevel(context);

  level.start();
  created[0].npc.group.position.x = 1;
  created[1].npc.group.position.x = 1;
  level.update(0.1);

  assert.equal(created.length, 3);
  assert.equal(created[0].flags.gooseVendor, true);
  assert.equal(created[0].flags.levelTarget, true);
  assert.equal(created[0].npc.legGlow, 0);
  assert.equal(created[1].npc.legGlow, 0.8);
});
