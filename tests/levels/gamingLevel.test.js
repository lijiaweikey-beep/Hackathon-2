import test from "node:test";
import assert from "node:assert/strict";
import { createGamingLevel } from "../../src/levels/gaming/createLevel.js";

function createPosition(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
    copy(other) {
      this.x = other.x;
      this.y = other.y;
      this.z = other.z;
      return this;
    },
    clone() {
      return createPosition(this.x, this.y, this.z);
    },
    setZ(value) {
      this.z = value;
      return this;
    },
  };
}

function createFakeContext({ npcCount }) {
  const context = {
    npcCount,
    npcSpeed: 3,
    sceneData: {
      computers: [
        createPosition(-2, 0, 1),
        createPosition(0, 0, 1),
        createPosition(2, 0, 1),
      ],
      updateEnvironment() {
        context.environmentUpdates += 1;
      },
    },
    created: [],
    target: null,
    environmentUpdates: 0,
    createNpc(id, flags) {
      const npc = {
        id,
        alive: true,
        group: { position: createPosition() },
        markIntensity: 0,
      };
      context.created.push({ id, flags, npc });
      return npc;
    },
    addNpc(npc) {
      context.target ??= npc;
    },
    addWanderNpc(id) {
      context.createNpc(id, {});
    },
    faceNpcToward() {},
    setBlackEye(npc, intensity) {
      npc.markIntensity = intensity;
    },
    randomRange(min) {
      return min;
    },
    randomOpenPosition() {
      return createPosition(4, 0, 4);
    },
    moveNpcToward() {
      return false;
    },
  };
  return context;
}

test("凌晨三点插件生成目标和剩余路人", () => {
  const context = createFakeContext({ npcCount: 4 });
  const level = createGamingLevel(context);
  level.start();

  assert.deepEqual(context.created.map(({ id }) => id), [0, 1, 2, 3]);
  assert.equal(context.created[0].flags.gamingTarget, true);
  assert.equal(context.target.levelManaged, true);
  assert.equal(context.target.markIntensity, 0.62);
  assert.equal(context.target.group.position.x, 2.2);
});

test("凌晨三点目标结束打游戏后离开电脑", () => {
  const context = createFakeContext({ npcCount: 2 });
  const level = createGamingLevel(context);
  level.start();
  level.update(3);

  assert.equal(context.target.script.state, "leave");
  assert.equal(context.target.markIntensity, 1);
  assert.equal(context.environmentUpdates, 1);
});
