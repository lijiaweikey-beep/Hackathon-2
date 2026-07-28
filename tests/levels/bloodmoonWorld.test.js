import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  BLOODMOON_DECOY_CUES,
  BLOODMOON_SAFE_ZONE_COUNT,
} from "../../src/levels/bloodmoon/constants.js";
import { createWorld } from "../../src/levels/bloodmoon/world.js";

test("血月场景独立创建雷电、爪印与安全区资源", () => {
  const scene = new THREE.Scene();
  const world = {
    THREE,
    scene,
    addWall() {},
    registerObstacle() {},
    randomRange: (min) => min,
    createLightningBolt: () => new THREE.Group(),
    npcCount: 12,
    baseLight: new THREE.DirectionalLight(),
    textures: {
      getWallTexture: () => null,
    },
  };

  const resources = createWorld(world);

  assert.equal(resources.decoyCues.length, BLOODMOON_DECOY_CUES);
  assert.equal(resources.safeZoneVisuals.length, BLOODMOON_SAFE_ZONE_COUNT);
  assert.equal(resources.lightningBolts.length, 3);
  assert.equal(resources.nextNpcId, 12);
});
