import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createDebtSmasherLevel } from "../../src/levels/debt-smasher/createLevel.js";

function createActor(id, x, z) {
  return {
    id,
    alive: true,
    debtType: "car-loan",
    isDebtTarget: true,
    group: {
      position: new THREE.Vector3(x, 0, z),
      scale: { set() {} },
      rotation: { z: 0 },
      userData: {},
    },
    velocity: new THREE.Vector2(),
    walking: false,
  };
}

function createContext(overrides = {}) {
  const records = {
    coinBursts: [],
    finished: [],
    hudRefreshes: 0,
    hits: 0,
  };
  const player = {
    group: {
      position: new THREE.Vector3(0, 0, 0),
      rotation: { y: Math.PI / 2 },
    },
  };
  const npc = createActor(1, 1, 0);
  const npcs = overrides.npcs ?? [npc];
  const context = {
    sceneData: {
      playBounds: { minX: -9.2, maxX: 9.2, minZ: -7.4, maxZ: 7.4 },
      machines: [
        {
          x: 3,
          z: 0,
          radius: 1.7,
          debtKind: "car-loan",
          timer: 10,
          phase: "idle",
          pad: { material: { color: { set() {} }, emissive: { set() {} } } },
          press: { position: { y: 4.6 } },
        },
      ],
      createCoinBurst(args) {
        records.coinBursts.push(args);
      },
      updateEnvironment() {},
    },
    actors: {
      npcCount: 2,
      npcSpeed: 3,
      createNpc(id) {
        return createActor(id, 0, 0);
      },
      addNpc() {},
      addWanderNpc() {},
      getNpcs: () => npcs,
      getPlayer: () => player,
    },
    movement: {
      randomOpenPosition: () => new THREE.Vector3(0, 0, 0),
      faceNpcToward() {},
    },
    combat: {
      isFacingTarget(direction, toTarget) {
        return direction.dot(toTarget.normalize()) >= 0.35;
      },
      triggerShake() {
        records.hits += 1;
      },
      triggerHitstop() {},
      finishLevel(won, failMessage) {
        records.finished.push({ won, failMessage });
      },
    },
    ui: {
      refreshHud() {
        records.hudRefreshes += 1;
      },
    },
    audio: { playSound() {} },
    random: { range: (min) => min },
  };
  return { context, records, npc, npcs, player };
}

test("经典爆金币按玩家当前朝向推送账单怪", () => {
  const { context, npc } = createContext();
  const level = createDebtSmasherLevel(context);
  level.start();

  const hit = level.handleAction({
    type: "findHitTarget",
    playerPos: context.actors.getPlayer().group.position,
    facing: new THREE.Vector2(1, 0),
  });
  assert.equal(hit.npc, npc);
  assert.deepEqual(hit.npcs, [npc]);
  assert.equal(hit.correct, true);
  assert.equal(level.handleAction({ type: "hitTarget", hit }).handled, true);
  assert.equal(npc.group.position.x, 3.4);
  assert.equal(npc.pushedByPlayer, true);
});

test("经典爆金币机关压碎账单怪后计入金币", () => {
  const { context, records, npc } = createContext();
  const level = createDebtSmasherLevel(context);
  level.start();
  npc.group.position.set(3, 0, 0);
  npc.pushedByPlayer = true;

  level.update(10);
  level.update(0.8);

  assert.equal(level.handleAction({ type: "getResultStats" }).value, "1 / 100");
  assert.equal(npc.alive, false);
  assert.equal(records.coinBursts.length, 1);
  assert.equal(records.coinBursts[0].debtType, "car-loan");
  assert.equal(records.coinBursts[0].coins, 1);
});

test("经典爆金币未被推入的账单怪不会自动被陷阱砸中", () => {
  const { context, npc } = createContext();
  const level = createDebtSmasherLevel(context);
  level.start();
  npc.group.position.set(3, 0, 0);

  level.update(10);
  level.update(0.8);

  assert.equal(level.handleAction({ type: "getResultStats" }).value, "0 / 100");
  assert.equal(npc.alive, true);
});

test("经典爆金币路人进入陷阱后停止移动等待机关", () => {
  const { context, npc } = createContext();
  const level = createDebtSmasherLevel(context);
  level.start();
  npc.group.position.set(1, 0, 0);

  level.handleAction({ type: "hitTarget", hit: { npc } });
  level.handleAction({ type: "afterNpcUpdate" });

  assert.equal(npc.pushedByPlayer, true);
  assert.equal(npc.levelManaged, true);
  assert.equal(npc.walking, false);
  assert.deepEqual({ x: npc.velocity.x, y: npc.velocity.y }, { x: 0, y: 0 });
  npc.group.position.set(3.8, 0, 0.4);
  level.handleAction({ type: "afterNpcUpdate" });
  assert.equal(npc.group.position.x, 3.4);
  assert.ok(Math.abs(npc.group.position.z) < 0.000001);
});

test("经典爆金币路人被推后定住两秒且期间可以再次被推", () => {
  const { context, npc } = createContext();
  const level = createDebtSmasherLevel(context);
  level.start();

  level.handleAction({ type: "hitTarget", hit: { npcs: [npc] } });

  assert.equal(npc.pushedHoldRemaining, 2);
  assert.equal(npc.levelManaged, true);
  assert.equal(npc.group.position.x, 3.4);
  level.update(1.2);
  assert.ok(npc.pushedHoldRemaining > 0);
  assert.equal(npc.levelManaged, true);
  level.handleAction({ type: "hitTarget", hit: { npcs: [npc] } });
  assert.equal(npc.group.position.x, 5.8);
  assert.equal(npc.pushedHoldRemaining, 2);
  level.update(2.1);
  assert.equal(npc.levelManaged, false);
});

test("经典爆金币一次最多推三个近距离路人", () => {
  const targets = [
    createActor(1, 1, -0.2),
    createActor(2, 1.2, 0),
    createActor(3, 1.4, 0.2),
    createActor(4, 1.6, 0.4),
  ];
  const { context } = createContext({ npcs: targets });
  const level = createDebtSmasherLevel(context);
  level.start();

  const hit = level.handleAction({
    type: "findHitTarget",
    playerPos: context.actors.getPlayer().group.position,
    facing: new THREE.Vector2(1, 0),
  });
  level.handleAction({ type: "hitTarget", hit });

  assert.equal(hit.npcs.length, 3);
  assert.deepEqual(targets.map((npc) => Boolean(npc.pushedByPlayer)), [true, true, true, false]);
});

test("经典爆金币把玩家和路人限制在流水线边界内", () => {
  const { context, npc, player } = createContext();
  const level = createDebtSmasherLevel(context);
  level.start();
  player.group.position.set(12, 0, -9);
  npc.group.position.set(-12, 0, 9);
  npc.velocity.set(-1, 1);

  level.handleAction({ type: "afterNpcUpdate" });

  assert.equal(player.group.position.x, 9.2);
  assert.equal(player.group.position.z, -7.4);
  assert.equal(npc.group.position.x, -9.2);
  assert.equal(npc.group.position.z, 7.4);
  assert.deepEqual({ x: npc.velocity.x, y: npc.velocity.y }, { x: 1, y: -1 });
});
