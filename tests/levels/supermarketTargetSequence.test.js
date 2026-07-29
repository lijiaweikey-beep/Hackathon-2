import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createSupermarketTargetSequence } from "../../src/levels/supermarket/targetSequence.js";

function createActor(x, z) {
  return {
    walking: false,
    group: {
      position: new THREE.Vector3(x, 0, z),
    },
  };
}

function createSequence(moveToward = () => true) {
  const members = [createActor(-2, -4), createActor(2, -4)];
  const faced = [];
  const sequence = createSupermarketTargetSequence({
    members,
    interactionPoints: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-6, 0, 0),
      new THREE.Vector3(6, 0, 0),
    ],
    moveToward,
    faceToward(actor, position) {
      faced.push([actor, position]);
    },
    randomRange: (min) => min,
  });
  return { members, faced, sequence };
}

test("目标必须步行到互动点后才开放一次新拍摄事件", () => {
  const movements = [];
  const { sequence } = createSequence((actor, waypoint) => {
    movements.push([actor, waypoint.clone()]);
    return true;
  });

  assert.equal(sequence.snapshot().state, "approach");
  sequence.update(0.1);

  assert.equal(movements.length, 2);
  assert.deepEqual(sequence.snapshot(), {
    state: "interaction",
    interacting: true,
    eventId: 1,
  });
});

test("目标移动完全交给导航函数且状态机不会直接瞬移", () => {
  const { members, sequence } = createSequence(() => false);
  const before = members.map(({ group }) => group.position.clone());

  sequence.update(1);

  assert.deepEqual(
    members.map(({ group }) => group.position),
    before,
  );
  assert.equal(sequence.snapshot().state, "approach");
});

test("互动超时会报告错失机会并进入分散阶段", () => {
  const { faced, sequence } = createSequence();

  sequence.update(0.1);
  assert.equal(sequence.update(4), null);
  assert.equal(sequence.snapshot().state, "interaction");
  const result = sequence.update(2);

  assert.ok(faced.length >= 2);
  assert.deepEqual(result, { missedEventId: 1 });
  assert.equal(sequence.snapshot().state, "scatter");
});

test("成功拍照后目标立即结束互动并步行离开", () => {
  const { sequence } = createSequence();

  sequence.update(0.1);

  assert.equal(sequence.resolveCapture(), true);
  assert.equal(sequence.snapshot().state, "scatter");
  assert.equal(sequence.resolveCapture(), false);
});
