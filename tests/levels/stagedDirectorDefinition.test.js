import assert from "node:assert/strict";
import test from "node:test";

import bloodmoon from "../../src/levels/bloodmoon/definition.js";
import stagedDirector from "../../src/levels/staged-director/definition.js";
import temple from "../../src/levels/temple/definition.js";
import { createLevelRegistry } from "../../src/levels/createLevelRegistry.js";

test("staged-director 注册为无年龄番外关卡", () => {
  assert.equal(stagedDirector.id, "staged-director");
  assert.equal(stagedDirector.track, "extra");
  assert.equal(stagedDirector.age, undefined);
  assert.equal(stagedDirector.timeLimit, 60);
  assert.equal(stagedDirector.attempts, 3);
  assert.equal(stagedDirector.decoyCount, 0);
  assert.equal(stagedDirector.targetDesc, "幕后导演");
});

test("staged-director 复用经典关卡扩展和共享动作", () => {
  assert.equal(stagedDirector.legacy, false);
  assert.equal(typeof stagedDirector.createLevel, "function");
  assert.equal(typeof stagedDirector.extensions.createWorld, "function");
  assert.equal(typeof stagedDirector.extensions.createPlayer, "function");
  assert.equal(typeof stagedDirector.extensions.createNpc, "function");
  assert.equal(typeof stagedDirector.extensions.createPreviewModel, "function");
  assert.equal(typeof stagedDirector.extensions.renderPreview, "function");
  assert.deepEqual(stagedDirector.actions, [
    "beforeAttack",
    "findHitTarget",
    "hitTarget",
    "actorDissolved",
    "getHudState",
    "getResultStats",
  ]);
});

test("staged-director 排在现有番外之后且不影响主线", () => {
  const registry = createLevelRegistry(
    [temple, bloodmoon, stagedDirector].map((definition) => [
      definition.id,
      definition,
    ]),
  );

  assert.deepEqual(registry.mainline, []);
  assert.deepEqual(registry.extra.map(({ id }) => id), [
    "temple",
    "bloodmoon",
    "staged-director",
  ]);
});
