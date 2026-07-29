import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createSupermarketWorld } from "../../src/levels/supermarket/world.js";

function createHost() {
  return {
    rendering: {
      THREE,
      createScene: () => new THREE.Scene(),
      createCamera: (options) => {
        const camera = new THREE.OrthographicCamera(
          options.left,
          options.right,
          options.top,
          options.bottom,
          0.1,
          100,
        );
        camera.position.set(...options.position);
        return camera;
      },
    },
  };
}

test("超市场景提供完整货架、商品、人物和收银区", () => {
  const world = createSupermarketWorld(createHost());

  assert.equal(world.shelves.length, 6);
  assert.ok(world.products.length >= 72);
  assert.equal(world.customers.length, 14);
  assert.equal(world.couple.length, 2);
  assert.ok(world.checkout instanceof THREE.Group);
  assert.ok(world.exit instanceof THREE.Mesh);
});

test("出口开放时灯光和通道同时切换为绿色", () => {
  const world = createSupermarketWorld(createHost());

  world.setExitOpen(true);

  assert.equal(world.exit.material.color.getHex(), 0x22c55e);
  assert.equal(world.exit.userData.statusLight.color.getHex(), 0x22c55e);
});
