import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createActorAnimator } from "../../src/systems/createActorAnimator.js";
import { createActorNavigation } from "../../src/systems/createActorNavigation.js";
import { createActorSeparationSystem } from "../../src/systems/createActorSeparationSystem.js";

function createActor(x = 0, z = 0) {
  return {
    alive: true,
    group: {
      position: new THREE.Vector3(x, 0, z),
      rotation: { y: 0 },
      userData: {
        visual: { position: new THREE.Vector3() },
        leftArm: { rotation: {} },
        rightArm: { rotation: {} },
        leftLeg: { rotation: {} },
        rightLeg: { rotation: {} },
        baseArmRotations: { leftZ: 0, rightZ: 0 },
      },
    },
  };
}

test("角色动画器独立处理胜利动作", () => {
  const player = createActor();
  const animator = createActorAnimator({
    getPlayer: () => player,
    getTotalTime: () => 1,
  });

  animator.animateCheer(0.5);

  assert.equal(player.group.userData.leftArm.rotation.z, 2.45);
  assert.equal(player.group.rotation.y, 0.9);
});

test("角色分离系统推开重叠的角色", () => {
  const player = createActor(-1, 0);
  const first = createActor(0, 0);
  const second = createActor(0.2, 0);
  const separation = createActorSeparationSystem({
    getPlayer: () => player,
    getNpcs: () => [first, second],
    clampActorPosition: () => {},
  });

  separation.separate();

  assert.ok(first.group.position.distanceTo(second.group.position) > 0.2);
});

test("角色分离系统阻止玩家穿过静止角色", () => {
  const player = createActor(0.35, 0);
  const npc = createActor(0, 0);
  const separation = createActorSeparationSystem({
    getPlayer: () => player,
    getNpcs: () => [npc],
    clampActorPosition: () => {},
  });

  separation.separate();

  assert.ok(player.group.position.distanceTo(npc.group.position) >= 0.7);
});

test("角色导航独立判断朝向和距离", () => {
  const actor = createActor(0, 0);
  const target = createActor(0, 1);
  const navigation = createActorNavigation({
    randomRange: (min) => min,
    resolveObstacleCollisions: () => false,
  });

  assert.equal(navigation.isFacingTarget(actor, target, 2), true);
  assert.equal(navigation.isFacingTarget(actor, target, 0.5), false);
});
