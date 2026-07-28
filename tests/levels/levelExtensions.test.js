import assert from "node:assert/strict";
import test from "node:test";

import bloodmoon from "../../src/levels/bloodmoon/definition.js";
import debtSmasher from "../../src/levels/debt-smasher/definition.js";
import gaming from "../../src/levels/gaming/definition.js";
import gooseMarket from "../../src/levels/goose-market/definition.js";
import library from "../../src/levels/library/definition.js";
import office from "../../src/levels/office/definition.js";
import supermarket from "../../src/levels/supermarket/definition.js";
import temple from "../../src/levels/temple/definition.js";
import { createLevelRegistry } from "../../src/levels/createLevelRegistry.js";

for (const definition of [gaming, library, temple, bloodmoon]) {
  test(`${definition.id} 自己声明场景、人物和预览扩展`, () => {
    assert.equal(typeof definition.extensions?.createWorld, "function");
    assert.equal(typeof definition.extensions?.createPlayer, "function");
    assert.equal(typeof definition.extensions?.createNpc, "function");
    assert.equal(typeof definition.extensions?.createPreviewModel, "function");
    assert.equal(typeof definition.extensions?.renderPreview, "function");
  });
}

test("现有关卡按年龄主线和番外正确归类", () => {
  assert.deepEqual(
    [gaming.track, gaming.age, library.track, library.age],
    ["mainline", 19, "mainline", 21],
  );
  assert.deepEqual(
    [temple.track, temple.age, bloodmoon.track, bloodmoon.age],
    ["extra", undefined, "extra", undefined],
  );
});

test("注册中心组成六段年龄主线并保留两个番外", () => {
  const definitions = [
    gaming,
    library,
    gooseMarket,
    supermarket,
    office,
    debtSmasher,
    temple,
    bloodmoon,
  ];
  const registry = createLevelRegistry(
    definitions.map((definition) => [definition.id, definition]),
  );

  assert.deepEqual(
    registry.mainline.map(({ id, age }) => [id, age]),
    [
      ["gaming", 19],
      ["library", 21],
      ["goose-market", 23],
      ["supermarket", 25],
      ["office", 27],
      ["debt-smasher", 30],
    ],
  );
  assert.deepEqual(registry.extra.map(({ id }) => id), ["temple", "bloodmoon"]);
});
