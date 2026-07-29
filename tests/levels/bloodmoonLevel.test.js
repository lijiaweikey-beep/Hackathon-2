import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BLOODMOON_HUNT_INTRO_SECONDS,
  BLOODMOON_WOLF_COOLDOWN,
} from "../../src/levels/bloodmoon/constants.js";
import { createBloodmoonLevel } from "../../src/levels/bloodmoon/createLevel.js";

function createActor(id, flags = {}) {
  return {
    id,
    alive: true,
    walking: false,
    group: {
      visible: true,
      position: new THREE.Vector3(id, 0, id),
      rotation: { y: 0 },
      userData: { wolfParts: [{ visible: true }] },
    },
    velocity: new THREE.Vector2(),
    isWolfGuard: Boolean(flags.wolfGuard),
    isLevelTarget: Boolean(flags.levelTarget),
  };
}

function createFakeContext({ npcCount = 4 } = {}) {
  const created = [];
  const overlays = [];
  const player = createActor(-1);
  const records = {
    created,
    overlays,
    introSounds: 0,
    player,
  };
  const sceneData = {
    lightningTimer: 100,
    lightningFlash: 0,
    clueTimer: 0,
    revealCount: 0,
    targetCue: {},
    decoyCues: [],
    safeZoneVisuals: [],
    safeZoneRadius: 2.35,
    baseLight: null,
    lightningLight: null,
    lightningBolts: [],
    moonMaterial: null,
  };
  const context = {
    definition: { hudMission: "找到引路人" },
    sceneData,
    actors: {
      npcCount,
      npcSpeed: 3,
      createNpc(id, flags) {
        const actor = createActor(id, flags);
        created.push(actor);
        return actor;
      },
      addNpc() {},
      addWanderNpc(id) {
        return context.actors.createNpc(id, {});
      },
      getNpcs: () => created,
      getPlayer: () => player,
      dissolve(actor) {
        actor.alive = false;
        actor.group.visible = false;
      },
      compactDead() {},
      randomizePosition() {},
      setPartsVisible() {},
    },
    time: {
      getStatus: () => "playing",
      getTotal: () => 0,
    },
    movement: {
      randomOpenPosition: () => new THREE.Vector3(8, 0, 8),
      moveNpcToward: () => false,
      faceNpcToward() {},
      isActorFacingTarget: () => false,
    },
    combat: {
      triggerShake() {},
      triggerHitstop() {},
      finishLevel() {},
    },
    ui: {
      showOverlay(kind, html) {
        overlays.push({ kind, html });
      },
      hideOverlay() {},
      flashHud() {},
      refreshHud() {},
      resetPlayerInput() {},
    },
    audio: {
      playSound() {},
      playIntro() {
        records.introSounds += 1;
      },
    },
    random: {
      range: (min) => min,
    },
    world: {
      effects: {
        setBloodmoonClawIntensity() {},
        positionBloodmoonCue() {},
      },
    },
  };
  return { context, records };
}

test("血月插件生成引路人与剩余角色", () => {
  const { context, records } = createFakeContext({ npcCount: 4 });
  const level = createBloodmoonLevel(context);

  level.start();

  assert.deepEqual(records.created.map(({ id }) => id), [0, 1, 2, 3]);
  assert.equal(records.created[0].isLevelTarget, true);
  assert.equal(records.created[0].levelManaged, true);
});

test("进入正式体验时由血月关卡播放开场音效", () => {
  const { context, records } = createFakeContext();
  const level = createBloodmoonLevel(context);

  assert.deepEqual(level.handleAction({ type: "beginPlay" }), { handled: true });
  assert.equal(records.introSounds, 1);
});

test("第一次命中首领进入猎杀演出", () => {
  const { context, records } = createFakeContext();
  const level = createBloodmoonLevel(context);
  level.start();

  const result = level.handleAction({
    type: "hitTarget",
    hit: { correct: true, npc: records.created[0] },
  });

  assert.deepEqual(result, { handled: true });
  assert.equal(
    level.handleAction({ type: "getHudState" }).mission,
    "血月引路人正在发动猎杀时刻...",
  );
  assert.equal(records.created[0].preserveWhenDead, true);
  assert.equal(records.overlays.at(-1).kind, "huntIntro");
});

test("猎杀演出结束后暂停世界并展示说明卡", () => {
  const { context, records } = createFakeContext();
  const level = createBloodmoonLevel(context);
  level.start();
  level.handleAction({
    type: "hitTarget",
    hit: { correct: true, npc: records.created[0] },
  });

  const frame = level.update(BLOODMOON_HUNT_INTRO_SECONDS);

  assert.deepEqual(frame, { pauseWorld: true });
  assert.equal(records.overlays.at(-1).kind, "huntCard");
});

test("血月攻击使用狼爪冷却并在猎杀演出期间禁用", () => {
  const { context, records } = createFakeContext();
  const level = createBloodmoonLevel(context);
  level.start();

  assert.deepEqual(level.handleAction({ type: "beforeAttack" }), {
    blocked: false,
    cooldown: BLOODMOON_WOLF_COOLDOWN,
    animationSeconds: 0.26,
    sound: "wolfPunch",
    resetCombo: false,
  });

  level.handleAction({
    type: "hitTarget",
    hit: { correct: true, npc: records.created[0] },
  });
  assert.equal(level.handleAction({ type: "beforeAttack" }).blocked, true);
});
