import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { HIT_FACING_DOT } from "../../src/config/constants.js";
import { createLibraryLevel } from "../../src/levels/library/createLevel.js";

function createFakeContext({ npcCount }) {
  const records = {
    created: [],
    members: [],
  };
  const context = {
    actors: {
      npcCount,
      npcSpeed: 3,
      createNpc(id, flags) {
        const npc = {
          id,
          alive: true,
          walking: false,
          markIntensity: 0,
          group: { position: new THREE.Vector3() },
        };
        records.created.push({ id, flags, npc });
        return npc;
      },
      addNpc(npc) {
        records.members.push(npc);
      },
      addWanderNpc(id) {
        context.actors.createNpc(id, {});
      },
    },
    movement: {
      faceNpcToward() {},
      moveNpcToward() {
        return false;
      },
      collidesWithObstacle() {
        return false;
      },
    },
    combat: {
      isFacingTarget(facing, toTarget) {
        if (toTarget.lengthSq() < 0.08) return true;
        return facing.dot(toTarget.normalize()) >= HIT_FACING_DOT;
      },
    },
    ui: {
      setLipstick(npc, intensity) {
        npc.markIntensity = intensity;
      },
    },
    random: {
      range(min) {
        return min;
      },
    },
  };
  return { context, records };
}

test("图书馆插件生成情侣和剩余路人", () => {
  const { context, records } = createFakeContext({ npcCount: 5 });
  const level = createLibraryLevel(context);
  level.start();

  assert.deepEqual(records.created.map(({ id }) => id), [0, 1, 2, 3, 4]);
  assert.equal(records.members[0].levelManaged, true);
  assert.equal(records.members[1].levelManaged, true);
  assert.equal(records.members[0].separationGroup, records.members[1].separationGroup);
});

test("面对情侣任意一人时返回双目标命中", () => {
  const { context, records } = createFakeContext({ npcCount: 2 });
  const level = createLibraryLevel(context);
  level.start();

  const hit = level.handleAction({
    type: "findHitTarget",
    playerPos: new THREE.Vector3(0, 0, 1),
    facing: new THREE.Vector2(0, -1),
  });

  assert.equal(hit.correct, true);
  assert.deepEqual(hit.npcs, records.members);
});

test("亲吻阶段结束后情侣开始分散", () => {
  const { context, records } = createFakeContext({ npcCount: 2 });
  const level = createLibraryLevel(context);
  level.start();

  level.update(3);
  level.update(0.1);

  assert.equal(records.members[0].markIntensity, 0.96);
  assert.equal(records.members[0].walking, true);
  assert.equal(records.members[1].walking, true);
});
