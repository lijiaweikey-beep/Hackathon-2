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
  assert.equal(sequence.snapshot().state, "interaction");
  assert.equal(sequence.snapshot().interacting, true);
  assert.equal(sequence.snapshot().eventId, 1);
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

test("开局成对标识只显示三秒且不会再次出现", () => {
  const { sequence } = createSequence(() => false);

  assert.equal(sequence.snapshot().introMarkerVisible, true);
  sequence.update(2.9);
  assert.equal(sequence.snapshot().introMarkerVisible, true);
  sequence.update(0.2);
  assert.equal(sequence.snapshot().introMarkerVisible, false);
});

test("互动超时会报告错失机会并让情侣结伴前往下一处", () => {
  const { faced, sequence } = createSequence();

  sequence.update(0.1);
  assert.equal(sequence.update(4), null);
  assert.equal(sequence.snapshot().state, "interaction");
  const result = sequence.update(2);

  assert.ok(faced.length >= 2);
  assert.deepEqual(result, { missedEventId: 1 });
  assert.equal(sequence.snapshot().state, "approach");
});

test("成功拍照后目标立即结束互动并步行离开", () => {
  const { sequence } = createSequence();

  sequence.update(0.1);

  assert.equal(sequence.resolveCapture(), true);
  assert.equal(sequence.snapshot().state, "approach");
  assert.equal(sequence.resolveCapture(), false);
});

test("情侣前往下一处时目标点始终保持成对间距", () => {
  const movements = [];
  const { sequence } = createSequence((actor, waypoint) => {
    movements.push([actor, waypoint.clone()]);
    return true;
  });

  sequence.update(0.1);
  sequence.resolveCapture();
  sequence.update(0.1);

  const pair = movements.slice(-2).map(([, waypoint]) => waypoint);
  assert.ok(pair[0].distanceTo(pair[1]) >= 0.8);
  assert.ok(pair[0].distanceTo(pair[1]) <= 1.5);
});

test("碰撞造成目标偏移后仍会约束情侣实体间距", () => {
  const { members, sequence } = createSequence(() => false);
  members[0].group.position.set(-2, 0, 0);
  members[1].group.position.set(2, 0, 0);

  sequence.stabilizePair();

  const distance = members[0].group.position.distanceTo(
    members[1].group.position,
  );
  assert.ok(distance >= 0.8);
  assert.ok(distance <= 1.5);
});
