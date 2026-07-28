import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createActorSystem } from "../../src/systems/createActorSystem.js";

test("角色系统独立创建、登记并更新漫游角色", () => {
  const scene = new THREE.Scene();
  const player = {
    group: { position: new THREE.Vector3() },
  };
  const actors = createActorSystem({
    getScene: () => scene,
    getPlayer: () => player,
    getLevel: () => ({ legacy: true }),
    createNpc: (id) => ({
      id,
      alive: true,
      group: new THREE.Group(),
      velocity: new THREE.Vector2(),
    }),
    collidesWithObstacle: () => false,
    clampActorPosition() {},
    resolveObstacleCollisions: () => false,
    dispatch() {},
    getTotalTime: () => 0,
    randomRange: (min) => min,
  });

  const npc = actors.addWanderNpc(1);
  actors.updateNpcs(0.016);

  assert.equal(npc.alive, true);
  assert.ok(Number.isFinite(npc.group.position.x));
  assert.deepEqual(actors.getNpcs(), [npc]);
  assert.equal(scene.children.includes(npc.group), true);
});

test("干扰角色移动使用统一角色碰撞半径", () => {
  const scene = new THREE.Scene();
  const createActor = (id) => {
    const group = new THREE.Group();
    group.userData = {
      visual: new THREE.Group(),
      leftLeg: new THREE.Group(),
      rightLeg: new THREE.Group(),
      leftArm: new THREE.Group(),
      rightArm: new THREE.Group(),
      baseArmRotations: { leftZ: 0, rightZ: 0 },
    };
    return {
      id,
      alive: true,
      group,
      velocity: new THREE.Vector2(),
    };
  };
  const player = createActor("player");
  const radii = [];
  const actors = createActorSystem({
    getScene: () => scene,
    getPlayer: () => player,
    getLevel: () => ({ legacy: false }),
    createNpc: (id) => createActor(id),
    collidesWithObstacle: () => false,
    clampActorPosition() {},
    resolveObstacleCollisions(position, radius) {
      radii.push(radius);
      return false;
    },
    dispatch: () => false,
    startLevel() {},
    getTotalTime: () => 0,
    randomRange: (min) => min,
  });

  const npc = actors.addWanderNpc(1);
  actors.spawnNpcs({ legacy: false, decoyCount: 1 });
  npc.deoyState = "confuse";
  actors.updateNpcs(0.016);

  assert.deepEqual(radii, [0.38]);
});
