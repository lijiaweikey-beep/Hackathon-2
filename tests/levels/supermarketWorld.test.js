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

test("超市场景提供完整货架、商品、人物和收银区且没有出口装置", () => {
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
  assert.equal("exit" in world, false);
  assert.equal("setExitOpen" in world, false);
});

test("货架和收银台使用同一碰撞解析且角色不会留在障碍内部", () => {
  const world = createSupermarketWorld(createHost());
  const position = new THREE.Vector3(-6.2, 0, -2.5);

  assert.equal(world.collidesWithObstacle(position), true);
  assert.equal(
    world.collidesWithObstacle(new THREE.Vector3(-7.4, 0, 6.25)),
    true,
  );
  assert.equal(
    world.collidesWithObstacle(new THREE.Vector3(-11.75, 0, 0)),
    true,
  );

  world.resolveObstacleCollisions(position);
  assert.equal(world.collidesWithObstacle(position), false);

  position.set(20, 0, 20);
  world.clampActorPosition(position);
  assert.ok(Math.abs(position.x - 11.32) < 0.0001);
  assert.equal(position.z, 7.25);
});

test("遮挡查询覆盖货架", () => {
  const world = createSupermarketWorld(createHost());

  assert.equal(
    world.isLineBlocked(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ),
    true,
  );
});

test("场景不再创建顶部白色灯条、悬浮灯牌和红色出口条", () => {
  const world = createSupermarketWorld(createHost());

  const colors = world.scene.children
    .filter((child) => child.material?.color)
    .map((child) => child.material.color.getHex());
  assert.equal(colors.includes(0xfff4cf), false);
  assert.equal(colors.includes(0xdc2626), false);
  assert.equal(colors.includes(0x173544), false);
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
