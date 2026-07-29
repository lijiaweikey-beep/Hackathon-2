import assert from "node:assert/strict";
import test from "node:test";
import { GAME_PHASES } from "../../src/core/gamePhase.js";
import definition from "../../src/levels/goose-market/definition.js";
import { createGooseMarketLevel } from "../../src/levels/goose-market/createLevel.js";
import { renderPreview } from "../../src/levels/goose-market/preview.js";
import { createCombatSystem } from "../../src/systems/createCombatSystem.js";

function position(x = 0, z = 0) {
  return {
    x,
    y: 0,
    z,
    copy(other) {
      this.x = other.x;
      this.z = other.z;
      return this;
    },
  };
}

function createFakeContext({ duckCount = 3, npcCount = 14 } = {}) {
  const records = {
    compactCount: 0,
    created: [],
    dissolved: [],
    finishes: [],
    hitstop: [],
    playerPosition: null,
    randomPositions: [],
    refreshHudCount: 0,
    refreshSwitch: false,
    shakes: [],
    sounds: [],
    switchPositions: [],
  };
  const playerPosition = position(4, -3);
  const player = {
    group: {
      position: playerPosition,
      rotation: { y: 0 },
    },
  };
  let positionIndex = 0;
  const context = {
    sceneData: {
      updateEnvironment(_deltaSeconds, currentPlayerPosition) {
        records.playerPosition = currentPlayerPosition;
        if (!records.refreshSwitch) return undefined;
        records.refreshSwitch = false;
        return { refreshSwitch: true };
      },
      placeSwitch(nextPosition) {
        records.switchPositions.push({ x: nextPosition.x, z: nextPosition.z });
      },
      getLegGlow(actorPosition, isGoose) {
        return isGoose ? 0 : (actorPosition.x === 1 ? 0.8 : 0);
      },
    },
    actors: {
      npcCount,
      getPlayer: () => player,
      createNpc(id, flags) {
        const isGoose = Boolean(flags.gooseVendor);
        const npc = {
          id,
          isGoose,
          isDuckVendor: !isGoose,
          isLevelTarget: Boolean(flags.levelTarget),
          alive: true,
          group: { position: position(id, 0) },
          setLegGlow(value) {
            this.legGlow = value;
          },
        };
        records.created.push({ flags, npc });
        return npc;
      },
      addNpc() {},
      getNpcs: () => records.created.map(({ npc }) => npc),
      dissolve(npc) {
        npc.alive = false;
        records.dissolved.push(npc);
      },
      compactDead() {
        records.compactCount += 1;
      },
    },
    movement: {
      randomOpenPosition() {
        positionIndex += 1;
        const nextPosition = position(positionIndex, -positionIndex);
        records.randomPositions.push(nextPosition);
        return nextPosition;
      },
    },
    combat: {
      finishLevel: (...args) => records.finishes.push(args),
      triggerHitstop: (...args) => records.hitstop.push(args),
      triggerShake: (...args) => records.shakes.push(args),
    },
    ui: {
      refreshHud: () => {
        records.refreshHudCount += 1;
      },
    },
    audio: {
      playSound: (name) => records.sounds.push(name),
    },
    random: {
      range: () => duckCount + 0.4,
    },
  };
  return { context, records };
}

test("鹅腿夜市属于二十三岁主线并声明自己的战斗动作", () => {
  assert.equal(definition.track, "mainline");
  assert.equal(definition.age, 23);
  assert.equal(typeof definition.createLevel, "function");
  assert.deepEqual(definition.actions, [
    "beforeAttack",
    "getHudState",
    "getResultStats",
    "hitTarget",
  ]);
});

test("易难度每局随机创建三至五个鸭腿目标和十个鹅腿干扰", () => {
  for (const duckCount of [3, 5]) {
    const { context, records } = createFakeContext({ duckCount });
    const level = createGooseMarketLevel(context);

    level.start();

    const ducks = records.created.filter(({ npc }) => npc.isDuckVendor);
    const geese = records.created.filter(({ npc }) => npc.isGoose);
    assert.equal(ducks.length, duckCount);
    assert.equal(geese.length, 10);
    assert.ok(ducks.every(({ npc }) => npc.isLevelTarget));
    assert.ok(geese.every(({ npc }) => npc.isLevelTarget === false));
    assert.equal(records.randomPositions.length, duckCount + 11);
  }
});

test("鸭鹅关按难度增加鸭腿目标和鹅腿干扰", () => {
  const cases = [
    { npcCount: 17, duckCount: 6, gooseCount: 12 },
    { npcCount: 20, duckCount: 7, gooseCount: 15 },
  ];

  for (const item of cases) {
    const { context, records } = createFakeContext(item);
    const level = createGooseMarketLevel(context);

    level.start();

    const ducks = records.created.filter(({ npc }) => npc.isDuckVendor);
    const geese = records.created.filter(({ npc }) => npc.isGoose);
    assert.equal(ducks.length, item.duckCount);
    assert.equal(geese.length, item.gooseCount);
    assert.equal(records.randomPositions.length, item.duckCount + item.gooseCount + 1);
  }
});

test("第三关目标预览展示鸭腿阿姨", () => {
  const actors = [];

  renderPreview({ scene: { add: (actor) => actors.push(actor) } });

  assert.equal(actors.length, 1);
  assert.ok(actors[0].userData.foodLeg.material.emissiveIntensity > 0);
});

test("鸭腿在探照灯下发绿且关卡随机刷新开关", () => {
  const { context, records } = createFakeContext();
  const level = createGooseMarketLevel(context);

  level.start();
  const duck = records.created.find(({ npc }) => npc.isDuckVendor).npc;
  duck.group.position.x = 1;
  level.update(0.1);

  assert.equal(duck.legGlow, 0.8);
  assert.equal(records.playerPosition.x, 4);
  assert.equal(records.switchPositions.length, 1);

  records.refreshSwitch = true;
  level.update(0.1);
  assert.equal(records.switchPositions.length, 2);
});

test("必须打爆本局全部鸭腿阿姨才通关", () => {
  const { context, records } = createFakeContext({ duckCount: 3 });
  const level = createGooseMarketLevel(context);
  level.start();
  const ducks = records.created
    .filter(({ npc }) => npc.isDuckVendor)
    .map(({ npc }) => npc);

  ducks.forEach((duck, index) => {
    const result = level.handleAction({
      type: "hitTarget",
      hit: { npc: duck, correct: true },
    });

    assert.deepEqual(result, { handled: true });
    assert.equal(records.finishes.length, index === ducks.length - 1 ? 1 : 0);
    assert.equal(
      level.handleAction({ type: "getHudState" }).resourceText,
      String(ducks.length - index - 1),
    );
  });

  assert.deepEqual(records.finishes[0], [true, null, 760]);
  assert.equal(records.dissolved.length, 3);
});

test("误打鹅腿给出提示且只让下一拳延后半秒", () => {
  const { context, records } = createFakeContext();
  const level = createGooseMarketLevel(context);
  level.start();
  const goose = records.created.find(({ npc }) => npc.isGoose).npc;

  const result = level.handleAction({
    type: "hitTarget",
    hit: { npc: goose, correct: false },
  });

  assert.deepEqual(result, { handled: true, cooldown: 2.5 });
  assert.equal(goose.alive, true);
  assert.equal(records.dissolved.length, 0);
  assert.equal(
    level.handleAction({ type: "getHudState" }).clue,
    "打我鹅腿阿姨干嘛",
  );
  assert.deepEqual(level.handleAction({ type: "beforeAttack" }), {
    blocked: false,
    cooldown: 2,
    resetCombo: false,
  });
});

test("误打鹅腿后共享冷却界面与实际等待时间都为二点五秒", () => {
  const { context, records } = createFakeContext();
  const level = createGooseMarketLevel(context);
  level.start();
  const goose = records.created.find(({ npc }) => npc.isGoose).npc;
  const player = context.actors.getPlayer();
  goose.group.position.copy(player.group.position);
  const combat = createCombatSystem({
    session: {
      phase: GAME_PHASES.PLAYING,
      levelState: { level: definition, attempts: 3 },
    },
    getPlayer: () => player,
    getNpcs: () => context.actors.getNpcs(),
    dispatch: (action) => level.handleAction(action),
    consumeActionInterval: () => true,
    playSound() {},
    playPunch() {},
    playHit() {},
    playMiss() {},
    triggerHitstop() {},
    triggerShake() {},
    settleRound() {},
    refreshHud() {},
    dissolveActor() {},
  });

  combat.triggerAttack();

  assert.equal(combat.cooldown, 2.5);
  assert.equal(combat.cooldownMax, 2.5);
  assert.equal(goose.alive, true);
});
