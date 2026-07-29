import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import { createStagedDirectorLevel } from "../../src/levels/staged-director/createLevel.js";

function makeNpc(id, flags = {}) {
  const visual = {
    setDirecting(active) {
      group.userData.directingActive = active;
    },
    setCameraRaised(active) {
      group.userData.cameraRaised = active;
    },
  };
  const group = {
    position: new THREE.Vector3(),
    rotation: { y: 0 },
    userData: { visual },
    visible: true,
  };
  return Object.assign({
    id,
    alive: true,
    walking: false,
    velocity: new THREE.Vector2(),
    group,
  }, flags);
}

function createFixture() {
  const npcs = [];
  const faceCalls = [];
  const finished = [];
  const dissolved = [];
  const hudFlashes = [];
  const player = makeNpc(-1, { isPlayer: true });
  const sceneData = {
    stagePoints: {
      player: new THREE.Vector3(0, 0, 5.5),
      blindStart: new THREE.Vector3(-3.2, 0, 0),
      riderStart: new THREE.Vector3(3.2, 0, 0),
      collision: new THREE.Vector3(0, 0, 0),
      camera: new THREE.Vector3(0, 0, 3),
      directorSpots: [
        new THREE.Vector3(-2.6, 0, 3.1),
        new THREE.Vector3(0, 0, 3.5),
        new THREE.Vector3(2.6, 0, 3.1),
      ],
      crowdSpots: [
        new THREE.Vector3(-6, 0, 4),
        new THREE.Vector3(-4, 0, -4),
        new THREE.Vector3(-2, 0, 4),
        new THREE.Vector3(0, 0, -4),
        new THREE.Vector3(2, 0, 4),
        new THREE.Vector3(4, 0, -4),
        new THREE.Vector3(6, 0, 4),
      ],
    },
    setPerformancePhase: () => {},
  };
  const context = {
    definition: { attempts: 3 },
    sceneData,
    state: { attemptsLeft: 3 },
    actors: {
      npcSpeed: 2.3,
      createNpc: (id, flags) => makeNpc(id, flags),
      addNpc: (npc) => {
        npcs.push(npc);
        return npc;
      },
      addWanderNpc: (npc) => {
        npcs.push(npc);
        return npc;
      },
      getNpcs: () => npcs,
      getAll: () => [player, ...npcs],
      getPlayer: () => player,
      dissolve: (npc) => {
        dissolved.push(npc.id);
        npc.alive = false;
      },
      compactDead: () => {},
    },
    movement: {
      faceNpcToward: (npc, target) => faceCalls.push({
        npcId: npc.id,
        targetId: target?.id,
        targetX: target?.x,
        targetZ: target?.z,
      }),
      moveNpcToward: (npc, target) => {
        npc.group.position.copy(target);
        return true;
      },
      isActorFacingTarget: () => true,
      randomOpenPosition: () => new THREE.Vector3(0, 0, 0),
    },
    combat: {
      isFacingTarget: () => true,
      triggerHitstop: () => {},
      triggerShake: () => {},
      finishLevel: (...args) => finished.push(args),
    },
    ui: {
      flashHud: (message) => hudFlashes.push(message),
      refreshHud: () => {},
    },
    audio: { playSound: () => {} },
    random: { range: (min, max) => (min + max) / 2 },
  };

  return { context, npcs, faceCalls, finished, dissolved, hudFlashes };
}

test("开局创建固定演员阵容：1 名真导演、2 名假导演、1 名受保护盲人", () => {
  const fixture = createFixture();
  const level = createStagedDirectorLevel(fixture.context);

  level.start();

  assert.equal(fixture.npcs.length, 13);
  assert.equal(fixture.npcs.filter((npc) => npc.directorTarget).length, 1);
  assert.equal(fixture.npcs.filter((npc) => npc.directorSuspect).length, 3);
  assert.equal(fixture.npcs.filter((npc) => npc.isProtectedActor).length, 1);
});

test("回看阶段三名演员同时面向真正导演", () => {
  const fixture = createFixture();
  const level = createStagedDirectorLevel(fixture.context);

  level.start();
  level.update(6.1);

  const realDirector = fixture.npcs.find((npc) => npc.directorTarget);
  const performerIds = fixture.npcs
    .filter((npc) => ["blind", "rider", "camera"].includes(npc.role))
    .map((npc) => npc.id)
    .sort((a, b) => a - b);
  const facedIds = fixture.faceCalls
    .filter(({ targetX, targetZ }) => (
      targetX === realDirector.group.position.x
      && targetZ === realDirector.group.position.z
    ))
    .map(({ npcId }) => npcId)
    .sort((a, b) => a - b);

  assert.deepEqual(facedIds, performerIds);
  assert.equal(fixture.faceCalls.some(({ targetId }) => targetId != null), false);
});

test("盲人角色不进入命中候选，也不会扣次数", () => {
  const fixture = createFixture();
  const level = createStagedDirectorLevel(fixture.context);

  level.start();
  const blind = fixture.npcs.find((npc) => npc.isProtectedActor);
  const director = fixture.npcs.find((npc) => npc.directorTarget);
  blind.group.position.set(0.3, 0, 0);
  director.group.position.set(5, 0, 5);
  const hit = level.handleAction({
    type: "findHitTarget",
    playerPos: new THREE.Vector3(0, 0, 0),
    facing: new THREE.Vector2(1, 0),
  });
  const result = level.handleAction({ type: "hitTarget", hit: { npc: blind, protected: true } });

  assert.equal(hit, null);
  assert.equal(result.handled, true);
  assert.equal(fixture.dissolved.length, 0);
  assert.equal(level.handleAction({ type: "getResultStats" }).attemptsLeft, 3);
  assert.equal(fixture.finished.length, 0);
});

test("误伤只扣次数并重置线索，不移除演员或假导演", () => {
  const fixture = createFixture();
  const level = createStagedDirectorLevel(fixture.context);

  level.start();
  const fakeDirector = fixture.npcs.find((npc) => npc.directorSuspect && !npc.directorTarget);
  const result = level.handleAction({
    type: "hitTarget",
    hit: { npc: fakeDirector, correct: false },
  });

  assert.equal(result.handled, true);
  assert.equal(fakeDirector.alive, true);
  assert.equal(fixture.dissolved.length, 0);
  assert.equal(level.handleAction({ type: "getResultStats" }).attemptsLeft, 2);
});

test("命中真正导演立即通关", () => {
  const fixture = createFixture();
  const level = createStagedDirectorLevel(fixture.context);

  level.start();
  const director = fixture.npcs.find((npc) => npc.directorTarget);
  const result = level.handleAction({ type: "hitTarget", hit: { npc: director, correct: true } });

  assert.equal(result.handled, true);
  assert.deepEqual(fixture.finished[0], [true, null, 760]);
});
