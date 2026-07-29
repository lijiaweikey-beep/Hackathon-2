import test from "node:test";
import assert from "node:assert/strict";
import { createGamingLevel } from "../../src/levels/gaming/createLevel.js";

function createPosition(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
    set(nextX, nextY, nextZ) {
      this.x = nextX;
      this.y = nextY;
      this.z = nextZ;
      return this;
    },
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
    distanceTo(other) {
      return Math.hypot(this.x - other.x, this.z - other.z);
    },
  };
}

function createFakeContext({ npcCount }) {
  const records = {
    created: [],
    target: null,
    environmentUpdates: 0,
    moveCalls: 0,
  };
  const context = {
    definition: {
      tutorialSteps: {
        moveTargetPos: { x: 0.4, z: 6.6 },
        moveRadius: 1.0,
        attackTargetId: "noisy_roommate",
      },
      npcCount,
    },
    sceneData: {
      computers: [
        createPosition(-2, 0, 1),
        createPosition(0, 0, 1),
        createPosition(2, 0, 1),
      ],
      waypointGroup: {
        position: createPosition(),
        visible: false,
      },
      updateEnvironment() {
        records.environmentUpdates += 1;
      },
    },
    actors: {
      npcCount,
      npcSpeed: 3,
      createNpc(id, flags) {
        const npc = {
          id,
          alive: true,
          group: { position: createPosition() },
          markIntensity: 0,
        };
        records.created.push({ id, flags, npc });
        return npc;
      },
      addNpc(npc) {
        records.target ??= npc;
      },
      addWanderNpc(id) {
        context.actors.createNpc(id, {});
      },
      getPlayer() {
        return { group: { position: createPosition(0, 0, 1) } };
      },
    },
    movement: {
      faceNpcToward() {},
      randomOpenPosition() {
        return createPosition(4, 0, 4);
      },
      moveNpcToward() {
        records.moveCalls += 1;
        return false;
      },
    },
    ui: {
      setBlackEye(npc, intensity) {
        npc.markIntensity = intensity;
      },
      showOverlay() {},
      hideOverlay() {},
      refreshHud() {},
    },
    random: {
      range(min) {
        return min;
      },
    },
  };
  return { context, records };
}

test("凌晨三点插件生成目标和剩余路人", () => {
  const { context, records } = createFakeContext({ npcCount: 4 });
  const level = createGamingLevel(context);
  level.start();

  assert.deepEqual(records.created.map(({ id }) => id), [0, 1, 2, 3]);
  assert.equal(records.created[0].flags.gamingTarget, true);
  assert.equal(records.target.levelManaged, true);
  assert.equal(records.target.script, undefined);
  assert.equal(records.target.markIntensity, 0.7);
  assert.equal(records.target.group.position.x, 0.4);
  assert.equal(records.target.group.position.z, 8.2);
});

test("凌晨三点目标固定在可见电脑位不参与通用游走", () => {
  const { context, records } = createFakeContext({ npcCount: 2 });
  const level = createGamingLevel(context);
  level.start();
  level.update(3);

  assert.equal(records.target.script, undefined);
  assert.equal(records.target.levelManaged, true);
  assert.equal(records.moveCalls, 0);
  assert.equal(records.target.markIntensity, 0.7);
  assert.equal(records.environmentUpdates, 1);
});
