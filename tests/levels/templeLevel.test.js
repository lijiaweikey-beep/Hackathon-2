import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTempleLevel } from "../../src/levels/temple/createLevel.js";

function createFakeContext({ npcCount, moveReached = false }) {
  const context = {
    definition: { moonDecoyCount: 3 },
    npcCount,
    npcSpeed: 3,
    sceneData: {
      moonPoint: new THREE.Vector3(0, 0, 0.15),
      shadowCue: {},
    },
    created: [],
    actors: [],
    target: null,
    cueIntensities: [],
    moveReached,
    createNpc(id, flags) {
      const npc = {
        id,
        alive: true,
        walking: false,
        marked: false,
        markIntensity: 0,
        isSuShiTarget: Boolean(flags.suShiTarget),
        group: { position: new THREE.Vector3() },
      };
      context.created.push({ id, flags, npc });
      return npc;
    },
    addNpc(npc) {
      context.actors.push(npc);
      if (npc.isSuShiTarget) context.target = npc;
    },
    addWanderNpc(id) {
      const npc = context.createNpc(id, {});
      npc.group.position.set(7 + id, 0, 7);
      context.addNpc(npc);
    },
    randomRange(min) {
      return min;
    },
    randomOpenPosition() {
      return new THREE.Vector3(8, 0, 8);
    },
    collidesWithObstacle() {
      return false;
    },
    moveNpcToward() {
      return context.moveReached;
    },
    faceNpcToward() {},
    getActors() {
      return context.actors;
    },
    getTotalTime() {
      return 2;
    },
    setTempleLocalShadow() {},
    positionShadowCue() {},
    setShadowCueIntensity(_cue, intensity) {
      context.cueIntensities.push(intensity);
    },
  };
  return context;
}

test("承天寺插件生成真苏轼和剩余影分身", () => {
  const context = createFakeContext({ npcCount: 4 });
  const level = createTempleLevel(context);
  level.start();

  assert.deepEqual(context.created.map(({ id }) => id), [0, 1, 2, 3]);
  assert.equal(context.target.levelManaged, true);
  assert.equal(context.target.isSuShiTarget, true);
  assert.equal(context.target.script.state, "wander");
});

test("真苏轼完成外围路线后转向月光中庭", () => {
  const context = createFakeContext({ npcCount: 2, moveReached: true });
  const level = createTempleLevel(context);
  level.start();
  context.target.script.timer = 0;
  context.target.script.wanderRouteLeft = 0;
  context.target.script.nextMoonDelay = 0;

  level.update(0.1);

  assert.equal(context.target.script.state, "seekMoon");
});

test("真苏轼在月光中庭显露竹柏影", () => {
  const context = createFakeContext({ npcCount: 2 });
  const level = createTempleLevel(context);
  level.start();
  context.target.group.position.copy(context.sceneData.moonPoint);
  context.target.script.state = "moonPause";
  context.target.script.timer = 0.5;

  level.update(0.1);

  assert.equal(context.target.marked, true);
  assert.ok(context.cueIntensities.at(-1) > 0);
});

test("前三个替身被配置为月光干扰者", () => {
  const context = createFakeContext({ npcCount: 2 });
  const level = createTempleLevel(context);
  const npc = context.createNpc(8, {});

  level.handleAction({ type: "configureDecoy", npc, index: 1 });

  assert.equal(npc.isMoonDisturber, true);
  assert.equal(npc.moonDisturbTimer, 12);
});

test("月光干扰者倒计时结束后走向中庭", () => {
  const context = createFakeContext({ npcCount: 2 });
  const level = createTempleLevel(context);
  const npc = context.createNpc(8, {});
  npc.deoyState = "wander";
  npc.decoyTimer = 1;
  level.handleAction({ type: "configureDecoy", npc, index: 0 });
  npc.moonDisturbTimer = 0;

  const handled = level.handleAction({
    type: "updateDecoy",
    npc,
    deltaSeconds: 0.1,
  });

  assert.equal(handled, true);
  assert.equal(npc.deoyState, "moonApproach");
  assert.ok(npc.moonDisturbWaypoint);
});
