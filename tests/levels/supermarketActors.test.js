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
  assert.equal(scene.children.includes(cast.player), true);
  assert.notEqual(
    cast.couple[0].userData.colors[0],
    cast.couple[1].userData.colors[0],
  );
});
