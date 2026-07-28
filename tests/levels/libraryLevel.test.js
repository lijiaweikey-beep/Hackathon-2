import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { HIT_FACING_DOT } from "../../src/config/constants.js";
import { createLibraryLevel } from "../../src/levels/library/createLevel.js";

function createFakeContext({ npcCount }) {
  const context = {
    npcCount,
    npcSpeed: 3,
    created: [],
    members: [],
    createNpc(id, flags) {
      const npc = {
        id,
        alive: true,
        walking: false,
        markIntensity: 0,
        group: { position: new THREE.Vector3() },
      };
      context.created.push({ id, flags, npc });
      return npc;
    },
    addNpc(npc) {
      context.members.push(npc);
    },
    addWanderNpc(id) {
      context.createNpc(id, {});
    },
    faceNpcToward() {},
    setLipstick(npc, intensity) {
      npc.markIntensity = intensity;
    },
    randomRange(min) {
      return min;
    },
    moveNpcToward() {
      return false;
    },
    collidesWithObstacle() {
      return false;
    },
    isFacingTarget(facing, toTarget) {
      if (toTarget.lengthSq() < 0.08) return true;
      return facing.dot(toTarget.normalize()) >= HIT_FACING_DOT;
    },
  };
  return context;
}

test("图书馆插件生成情侣和剩余路人", () => {
  const context = createFakeContext({ npcCount: 5 });
  const level = createLibraryLevel(context);
  level.start();

  assert.deepEqual(context.created.map(({ id }) => id), [0, 1, 2, 3, 4]);
  assert.equal(context.members[0].levelManaged, true);
  assert.equal(context.members[1].levelManaged, true);
  assert.equal(context.members[0].separationGroup, context.members[1].separationGroup);
});

test("面对情侣任意一人时返回双目标命中", () => {
  const context = createFakeContext({ npcCount: 2 });
  const level = createLibraryLevel(context);
  level.start();

  const hit = level.handleAction({
    type: "findHitTarget",
    playerPos: new THREE.Vector3(0, 0, 1),
    facing: new THREE.Vector2(0, -1),
  });

  assert.equal(hit.correct, true);
  assert.deepEqual(hit.npcs, context.members);
});

test("亲吻阶段结束后情侣开始分散", () => {
  const context = createFakeContext({ npcCount: 2 });
  const level = createLibraryLevel(context);
  level.start();

  level.update(3);
  level.update(0.1);

  assert.equal(context.members[0].markIntensity, 0.96);
  assert.equal(context.members[0].walking, true);
  assert.equal(context.members[1].walking, true);
});
