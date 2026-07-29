import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createOfficeLevel } from "../../src/levels/office/createLevel.js";

function createPosition(x = 0, z = 0) {
  return {
    x,
    y: 0,
    z,
    set(nextX, nextY, nextZ) {
      this.x = nextX;
      this.y = nextY;
      this.z = nextZ;
      return this;
    },
  };
}

function createFakeContext() {
  const records = {
    added: [],
    removed: [],
    finishes: [],
    hitstop: [],
    hudRefreshes: 0,
    npcs: [],
    shakes: [],
    sounds: [],
  };
  const player = { group: { position: createPosition(0, 0) } };
  const scene = {
    add: (mesh) => records.added.push(mesh),
    remove: (mesh) => records.removed.push(mesh),
  };
  const context = {
    sceneData: { scene, THREE },
    actors: {
      npcCount: 3,
      getPlayer: () => player,
      createNpc(id, flags = {}) {
        const npc = {
          id,
          ...flags,
          alive: true,
          group: { position: createPosition(), userData: { tieMark: { material: {}, scale: { set() {} } } } },
          markIntensity: 0,
        };
        return npc;
      },
      addNpc: (npc) => records.npcs.push(npc),
      addWanderNpc(id) {
        records.npcs.push({ id, alive: true, group: { position: createPosition(4 + id, 0) } });
      },
      dissolve(npc) {
        npc.alive = false;
      },
    },
    movement: {
      randomOpenPosition: () => createPosition(3, 3),
      moveNpcToward: () => false,
    },
    combat: {
      finishLevel: (...args) => records.finishes.push(args),
      triggerHitstop: (...args) => records.hitstop.push(args),
      triggerShake: (...args) => records.shakes.push(args),
    },
    ui: {
      setRedTie(npc, intensity) {
        npc.tieIntensity = intensity;
      },
      flashHud() {},
      refreshHud: () => {
        records.hudRefreshes += 1;
      },
    },
    audio: {
      playSound: (name) => records.sounds.push(name),
    },
    random: {
      range: () => 0,
    },
  };
  return { context, records, player };
}

test("黑锅红圈预警结束后才进入坠落阶段", () => {
  const { context, records } = createFakeContext();
  const level = createOfficeLevel(context);

  level.start();
  level.update(1.19);
  assert.equal(records.added.length, 0);
  level.update(0.02);
  assert.equal(records.added.length, 1);
  level.update(1.17);
  assert.equal(records.added.length, 1);
  level.update(0.02);
  assert.equal(records.added.length, 2);
  assert.equal(records.removed.length, 1);
});

test("黑锅命中扣生命并启用无敌时间，老板不受影响", () => {
  const { context, records } = createFakeContext();
  const level = createOfficeLevel(context);

  level.start();
  level.update(1.2);
  level.update(1.2);
  const stats = level.handleAction({ type: "getResultStats" });

  assert.equal(stats.attemptsLeft, 2);
  assert.equal(records.hudRefreshes, 1);
  assert.equal(records.finishes.length, 0);
});

test("玩家一拳命中老板立即通关", () => {
  const { context, records } = createFakeContext();
  const level = createOfficeLevel(context);

  level.start();
  const boss = records.npcs.find((npc) => npc.isBoss);
  assert.deepEqual(level.handleAction({ type: "hitTarget", hit: { npc: records.npcs[1] } }), { handled: false });
  assert.deepEqual(level.handleAction({ type: "hitTarget", hit: { npc: boss } }), { handled: true });
  assert.deepEqual(records.finishes, [[true, null, 760]]);
});
