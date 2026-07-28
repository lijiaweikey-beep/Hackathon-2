import assert from "node:assert/strict";
import test from "node:test";
import { createResourceScope } from "../../src/core/resourceScope.js";
import { createExperienceHost } from "../../src/runtime/createExperienceHost.js";

test("独立体验宿主冻结能力并隔离存储键", () => {
  const values = new Map();
  const storageBackend = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const surface = { root: {}, setContent() {}, setStyles() {}, clear() {} };
  const host = createExperienceHost({
    definition: { id: "standalone" },
    scope: createResourceScope(),
    time: { getPhase: () => "playing", getTotal: () => 1 },
    rendering: { render() {} },
    surface,
    input: { listen() {}, emit() {} },
    audio: { playSound() {} },
    flow: { finish() {} },
    storageBackend,
    randomRange: (min) => min,
  });

  host.storage.set("score", 12);

  assert.equal(Object.isFrozen(host), true);
  assert.equal(Object.isFrozen(host.rendering), true);
  assert.equal(host.storage.get("score", 0), 12);
  assert.equal(values.has("level:standalone:score"), true);
});
