import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createFxSystem } from "../../src/systems/FxSystem.js";

test("粒子系统暴露是否仍有活动粒子", () => {
  const scene = new THREE.Scene();
  const actor = {
    group: {
      position: new THREE.Vector3(0, 0, 0),
      userData: { colors: [0xff0000] },
    },
  };
  const fx = createFxSystem({
    ui: {},
    getPlayer: () => null,
    getScene: () => scene,
    randomRange: (min) => min,
  });

  assert.equal(fx.hasActiveParticles(), false);

  fx.createPixelBurst(actor);

  assert.equal(fx.hasActiveParticles(), true);

  fx.updateParticles(2);

  assert.equal(fx.hasActiveParticles(), false);
});
