import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTempleLevel } from "../../src/levels/temple/createLevel.js";

function createFakeContext({ npcCount, moveReached = false }) {
  const records = {
    created: [],
    actors: [],
    target: null,
    cueIntensities: [],
  };
  const context = {
    definition: { moonDecoyCount: 3 },
    sceneData: {
      moonPoint: new THREE.Vector3(0, 0, 0.15),
      shadowCue: {},
    },
    actors: {
      npcCount,
      npcSpeed: 3,
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
        records.created.push({ id, flags, npc });
        return npc;
      },
      addNpc(npc) {
        records.actors.push(npc);
        if (npc.isSuShiTarget) records.target = npc;
      },
      addWanderNpc(id) {
        const npc = context.actors.createNpc(id, {});
        npc.group.position.set(7 + id, 0, 7);
        context.actors.addNpc(npc);
      },
      getAll() {
        return records.actors;
      },
    },
    movement: {
      randomOpenPosition() {
        return new THREE.Vector3(8, 0, 8);
      },
      collidesWithObstacle() {
        return false;
      },
      moveNpcToward() {
        return moveReached;
      },
      faceNpcToward() {},
    },
    time: {
      getTotal() {
        return 2;
      },
    },
    random: {
      range(min) {
        return min;
      },
    },
    world: {
      effects: {
        setTempleLocalShadow() {},
        positionShadowCue() {},
        setShadowCueIntensity(_cue, intensity) {
          records.cueIntensities.push(intensity);
        },
      },
    },
  };
  return { context, records };
}

test("承天寺插件生成真苏轼和剩余影分身", () => {
  const { context, records } = createFakeContext({ npcCount: 4 });
  const level = createTempleLevel(context);
  level.start();

  assert.deepEqual(records.created.map(({ id }) => id), [0, 1, 2, 3]);
  assert.equal(records.target.levelManaged, true);
  assert.equal(records.target.isSuShiTarget, true);
  assert.equal(records.target.script.state, "wander");
});

test("真苏轼完成外围路线后转向月光中庭", () => {
  const { context, records } = createFakeContext({ npcCount: 2, moveReached: true });
  const level = createTempleLevel(context);
  level.start();
  records.target.script.timer = 0;
  records.target.script.wanderRouteLeft = 0;
  records.target.script.nextMoonDelay = 0;

  level.update(0.1);

  assert.equal(records.target.script.state, "seekMoon");
});

test("真苏轼在月光中庭显露竹柏影", () => {
  const { context, records } = createFakeContext({ npcCount: 2 });
  const level = createTempleLevel(context);
  level.start();
  records.target.group.position.copy(context.sceneData.moonPoint);
  records.target.script.state = "moonPause";
  records.target.script.timer = 0.5;

  level.update(0.1);

  assert.equal(records.target.marked, true);
  assert.ok(records.cueIntensities.at(-1) > 0);
});

test("前三个替身被配置为月光干扰者", () => {
  const { context } = createFakeContext({ npcCount: 2 });
  const level = createTempleLevel(context);
  const npc = context.actors.createNpc(8, {});

  level.handleAction({ type: "configureDecoy", npc, index: 1 });

  assert.equal(npc.isMoonDisturber, true);
  assert.equal(npc.moonDisturbTimer, 12);
});

test("月光干扰者倒计时结束后走向中庭", () => {
  const { context } = createFakeContext({ npcCount: 2 });
  const level = createTempleLevel(context);
  const npc = context.actors.createNpc(8, {});
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
