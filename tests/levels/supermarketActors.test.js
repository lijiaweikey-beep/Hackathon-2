import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createSupermarketCast,
  createSupermarketPerson,
  SUPERMARKET_PLAYER_PALETTE,
} from "../../src/levels/supermarket/actors.js";

test("超市人物使用共享低多边形身体结构", () => {
  const person = createSupermarketPerson(SUPERMARKET_PLAYER_PALETTE, 2, 3);

  assert.equal(person.position.x, 2);
  assert.equal(person.position.z, 3);
  assert.ok(person.userData.visual instanceof THREE.Group);
  assert.ok(person.userData.leftArm instanceof THREE.Group);
  assert.ok(person.userData.rightLeg instanceof THREE.Group);
});

test("超市人物阵容包含主角、目标情侣和十四名顾客", () => {
  const scene = new THREE.Scene();
  const cast = createSupermarketCast(scene);

  assert.equal(cast.couple.length, 2);
  assert.equal(cast.customers.length, 14);
  assert.equal(scene.children.includes(cast.player.group), true);
  assert.notEqual(
    cast.couple[0].group.userData.colors[0],
    cast.couple[1].group.userData.colors[0],
  );
});

test("超市阵容使用共享标准角色状态以支持移动和步行动画", () => {
  const cast = createSupermarketCast(new THREE.Scene(), (min) => min);

  assert.equal(cast.player.speed, 3);
  assert.equal(cast.player.group.userData.role, "player");
  assert.ok(cast.player.group instanceof THREE.Group);
  cast.couple.forEach((actor) => {
    assert.equal(actor.group.userData.role, "target");
  });
  cast.customers.forEach((actor) => {
    assert.equal(actor.group.userData.role, "customer");
  });
  [...cast.couple, ...cast.customers].forEach((actor) => {
    assert.ok(actor.group instanceof THREE.Group);
    assert.ok(actor.velocity instanceof THREE.Vector2);
    assert.equal(typeof actor.walking, "boolean");
    assert.equal(typeof actor.walkCycle, "number");
  });
});

test("两名目标拥有只供开局显示的同组成对标识", () => {
  const cast = createSupermarketCast(new THREE.Scene(), (min) => min);

  cast.couple.forEach(({ group }) => {
    assert.ok(group.userData.pairMarker instanceof THREE.Mesh);
    assert.equal(group.userData.pairMarker.visible, true);
  });
});
