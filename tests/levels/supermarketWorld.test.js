import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createSupermarketWorld } from "../../src/levels/supermarket/world.js";

function createHost(width = 1200, height = 750) {
  return {
    rendering: {
      THREE,
      canvas: { clientWidth: width, clientHeight: height },
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

  assert.deepEqual(world.shelves, [
    [-6.2, -2.5, 2.4, 0.65],
    [0, -2.5, 2.4, 0.65],
    [6.2, -2.5, 2.4, 0.65],
    [-6.2, 2.2, 2.4, 0.65],
    [0, 2.2, 2.4, 0.65],
    [6.2, 2.2, 2.4, 0.65],
  ]);
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

test("超市相机随手机横屏比例更新且不拉伸场景", () => {
  const world = createSupermarketWorld(createHost(844, 390));
  const initialRatio = (world.camera.right - world.camera.left)
    / (world.camera.top - world.camera.bottom);

  assert.ok(Math.abs(initialRatio - 844 / 390) < 0.0001);

  world.resizeCamera(720, 480);
  const resizedRatio = (world.camera.right - world.camera.left)
    / (world.camera.top - world.camera.bottom);
  assert.ok(Math.abs(resizedRatio - 1.5) < 0.0001);
});
