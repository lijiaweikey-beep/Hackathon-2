import assert from "node:assert/strict";
import test from "node:test";

import bloodmoon from "../../src/levels/bloodmoon/definition.js";
import gaming from "../../src/levels/gaming/definition.js";
import library from "../../src/levels/library/definition.js";
import temple from "../../src/levels/temple/definition.js";

for (const definition of [gaming, library, temple, bloodmoon]) {
  test(`${definition.id} 自己声明场景、人物和预览扩展`, () => {
    assert.equal(typeof definition.extensions?.createWorld, "function");
    assert.equal(typeof definition.extensions?.createPlayer, "function");
    assert.equal(typeof definition.extensions?.createNpc, "function");
    assert.equal(typeof definition.extensions?.createPreviewModel, "function");
    assert.equal(typeof definition.extensions?.renderPreview, "function");
  });
}
