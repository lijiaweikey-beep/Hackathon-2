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

function createContext() {
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
  const context = {
    sceneData: {
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
      getNpcs: () => [npc],
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
  return { context, records, npc, player };
}

test("经典爆金币按玩家当前朝向推送账单怪", () => {
  const { context, npc } = createContext();
  const level = createDebtSmasherLevel(context);
  level.start();

  assert.deepEqual(level.handleAction({
    type: "findHitTarget",
    playerPos: context.actors.getPlayer().group.position,
    facing: new THREE.Vector2(1, 0),
  }), {
    npc,
    correct: true,
  });
  assert.equal(level.handleAction({ type: "hitTarget", hit: { npc } }).handled, true);
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
