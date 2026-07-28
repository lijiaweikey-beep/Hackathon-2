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
