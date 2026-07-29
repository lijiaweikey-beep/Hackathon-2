import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createNpc } from "../../src/levels/debt-smasher/actors.js";
import { createWorld } from "../../src/levels/debt-smasher/world.js";

test("债务工厂使用经典世界构建接口创建房贷车贷机关", () => {
  const scene = new THREE.Scene();
  const obstacles = [];
  const resources = createWorld({
    THREE,
    scene,
    addWall() {},
    registerObstacle: (...args) => obstacles.push(args),
    randomRange: (min) => min,
    textures: {
      getWallTexture: () => null,
    },
  });

  assert.equal(resources.machines.length, 4);
  assert.deepEqual(
    [...new Set(resources.machines.map((machine) => machine.debtKind))].sort(),
    ["car-loan", "mortgage"],
  );
  assert.equal(typeof resources.updateEnvironment, "function");
  assert.equal(typeof resources.createCoinBurst, "function");
  assert.equal(resources.conveyors.length, 4);
  assert.equal(resources.lights.length, 4);
  assert.ok(obstacles.length >= 4);
  assert.ok(
    scene.children.some((child) => child.userData.gameplayRole === "factory-floor"),
  );
  assert.ok(scene.children.some((child) => child.userData.gameplayRole === "factory-column"));
  assert.equal(scene.children.some((child) => child.userData.gameplayRole === "factory-light-panel"), false);
  assert.ok(
    scene.children.some((child) => child.userData.gameplayRole === "factory-beam"),
  );
  assert.ok(
    scene.children.some((child) => child.userData.gameplayRole === "conveyor-cargo"),
  );
});

test("账单怪常态不举债务牌牌", () => {
  const npc = createNpc(1, { debtType: "mortgage" }, (min) => min);
  const hasBillCard = [];
  npc.group.traverse((child) => {
    const params = child.geometry?.parameters;
    if (params?.width === 0.7 && params?.height === 0.5 && params?.depth === 0.05) {
      hasBillCard.push(child);
    }
  });

  assert.equal(hasBillCard.length, 0);
  assert.equal(npc.debtType, "mortgage");
});

test("金币爆出后只显示对应数量金币并飞向回收点", () => {
  const scene = new THREE.Scene();
  const resources = createWorld({
    THREE,
    scene,
    addWall() {},
    registerObstacle() {},
    randomRange: (min) => min,
    textures: {
      getWallTexture: () => null,
    },
  });

  const burst = resources.createCoinBurst({
    position: new THREE.Vector3(1, 0, 2),
    debtType: "car-loan",
    coins: 3,
  });
  const firstCoin = burst.coins[0];
  const start = firstCoin.position.clone();

  resources.updateEnvironment(0.5);

  assert.equal(burst.coins.length, 3);
  assert.equal(
    scene.children.some((child) => child.userData.gameplayRole === "debt-reveal-label"),
    false,
  );
  assert.ok(firstCoin.position.distanceTo(start) > 0.1);
  assert.ok(firstCoin.userData.collectProgress > 0);
});

test("债务工厂流水线货物会持续流动", () => {
  const scene = new THREE.Scene();
  const resources = createWorld({
    THREE,
    scene,
    addWall() {},
    registerObstacle() {},
    randomRange: (min) => min,
    textures: {
      getWallTexture: () => null,
    },
  });
  const cargo = resources.conveyors[0].cargos[0];
  const start = cargo.position.clone();

  resources.updateEnvironment(0.5);

  assert.ok(cargo.position.distanceTo(start) > 0.1);
  assert.equal(cargo.userData.gameplayRole, "conveyor-cargo");
});

test("债务工厂流水线避开中心玩法区", () => {
  const scene = new THREE.Scene();
  const resources = createWorld({
    THREE,
    scene,
    addWall() {},
    registerObstacle() {},
    randomRange: (min) => min,
    textures: {
      getWallTexture: () => null,
    },
  });
  const cargos = resources.conveyors.flatMap((conveyor) => conveyor.cargos);

  assert.equal(resources.conveyors.length, 4);
  assert.ok(
    cargos.every((cargo) => Math.abs(cargo.position.x) >= 9 || Math.abs(cargo.position.z) >= 8.2),
  );
  assert.equal(
    cargos.some((cargo) => [0xf8fafc, 0xfacc15].includes(cargo.material.color.getHex())),
    false,
  );
  assert.ok(
    scene.children.some((child) => child.userData.gameplayRole === "factory-pipe"),
  );
  assert.ok(
    scene.children.some((child) => child.userData.gameplayRole === "hazard-stripe"),
  );
  assert.equal(
    scene.children.some((child) => child.userData.gameplayRole === "center-white-banner"),
    false,
  );
  assert.equal(
    scene.children.some((child) =>
      child.userData.gameplayRole === "factory-beam" && child.position.z > 8),
    false,
  );
  assert.equal(
    scene.children.some((child) =>
      child.userData.gameplayRole === "factory-column"
      && Math.abs(child.position.x) < 8
      && child.position.z > 7),
    false,
  );
});
