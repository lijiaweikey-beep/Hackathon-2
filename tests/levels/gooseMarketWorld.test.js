import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWorld } from "../../src/levels/goose-market/world.js";

function createResources() {
  const scene = new THREE.Scene();
  const obstacles = [];
  const baseLight = new THREE.DirectionalLight(0xffd37a, 0.72);
  scene.add(baseLight);
  const resources = createWorld({
    THREE,
    scene,
    baseLight,
    addWall() {},
    registerObstacle: (...args) => obstacles.push(args),
  });
  return { baseLight, obstacles, resources, scene };
}

test("鹅腿夜市创建移动路灯且只有鸭腿会显绿色", () => {
  const { obstacles, resources, scene } = createResources();
  const underLight = resources.lightPositions[0].clone();

  assert.equal(resources.getLegGlow(underLight, true), 0);
  assert.ok(resources.getLegGlow(underLight, false) > 0.9);
  const before = resources.lightPositions[0].x;
  resources.updateEnvironment(1);
  assert.notEqual(resources.lightPositions[0].x, before);
  assert.ok(scene.children.length > 10);
  assert.ok(obstacles.length > 0);
});

test("鹅腿夜市保留低多边形红棚摊位并增加串灯", () => {
  const { scene } = createResources();
  const awnings = scene.children.filter(
    (child) => child.userData.gameplayRole === "market-awning",
  );
  const stringLights = scene.children.filter(
    (child) => child.userData.gameplayRole === "string-light",
  );
  const bottomStringLights = stringLights.filter(
    (child) => child.userData.row === "bottom",
  );
  const bottomBulbs = bottomStringLights.filter((child) => child.isMesh);
  const topAwnings = awnings.filter((awning) => awning.position.z < 0);

  assert.equal(awnings.length, 5);
  assert.ok(stringLights.length >= 2);
  assert.ok(bottomStringLights.length >= 2);
  assert.ok(bottomBulbs.every((bulb) => bulb.position.y <= 2.35));
  assert.ok(bottomBulbs.every((bulb) => bulb.position.z >= 6.35));
  assert.ok(topAwnings.every((awning) => awning.position.z >= -4.8));
  assert.ok(awnings.every((awning) => awning.material.color.getHex() === 0xd9485f));
});

test("玩家不踩开关时夜市不会自动熄灯", () => {
  const { resources } = createResources();

  resources.updateEnvironment(30, new THREE.Vector3(0, 0, 10));

  assert.equal(resources.getLightingState().blackout, false);
});

test("第三关只创建一个可随机放置的绿色开关", () => {
  const { resources } = createResources();
  const position = new THREE.Vector3(-3, 0, 2);

  resources.placeSwitch(position);

  assert.equal(resources.switches.length, 1);
  assert.deepEqual(resources.switches[0].position.toArray(), [-3, 0, 2]);
});

test("玩家踩绿色开关后固定熄灯五秒且移动探照灯继续照明", () => {
  const { baseLight, resources } = createResources();
  const normalSpotIntensity = resources.spotlights[0].intensity;
  const normalPoolOpacity = resources.lightPools[0].material.opacity;
  const switchPosition = new THREE.Vector3(-3, 0, 2);

  resources.placeSwitch(switchPosition);
  resources.updateEnvironment(0.1, switchPosition);
  resources.updateEnvironment(0.5, switchPosition);

  assert.equal(resources.getLightingState().blackout, true);
  assert.ok(resources.getLightingState().remaining > 4.3);
  assert.ok(baseLight.intensity < 0.2);
  assert.ok(resources.spotlights[0].intensity > normalSpotIntensity);
  assert.ok(resources.lightPools[0].material.opacity > normalPoolOpacity);
});

test("暗场期间额外启用两盏探照灯，结束后恢复常态数量", () => {
  const { resources } = createResources();
  const switchPosition = new THREE.Vector3(0, 0, 0);

  assert.equal(resources.spotlights.length, 5);
  assert.equal(resources.lightPools.filter((pool) => pool.visible).length, 3);

  resources.placeSwitch(switchPosition);
  resources.updateEnvironment(0.1, switchPosition);
  assert.equal(resources.lightPools.filter((pool) => pool.visible).length, 5);

  resources.updateEnvironment(5, switchPosition);
  assert.equal(resources.lightPools.filter((pool) => pool.visible).length, 3);
  assert.equal(resources.spotlights[3].intensity, 0);
});

test("五秒暗场结束后恢复主灯并请求随机刷新开关", () => {
  const { baseLight, resources } = createResources();
  const switchPosition = new THREE.Vector3(-3, 0, 2);

  resources.placeSwitch(switchPosition);
  resources.updateEnvironment(0.1, switchPosition);
  const event = resources.updateEnvironment(5, new THREE.Vector3(0, 0, 10));
  resources.updateEnvironment(0.5, new THREE.Vector3(0, 0, 10));

  assert.deepEqual(event, { refreshSwitch: true });
  assert.equal(resources.getLightingState().blackout, false);
  assert.ok(baseLight.intensity > 0.6);
  assert.equal(resources.getLightingState().switches[0].ready, false);
});
