import assert from "node:assert/strict";
import test from "node:test";
import { createResourceScope } from "../../src/core/resourceScope.js";
import {
  createExperienceHost,
  createStandaloneExperienceHost,
} from "../../src/runtime/createExperienceHost.js";

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

test("独立体验宿主向共享布局关卡提供共享控制和界面能力", () => {
  const controls = { readDirection() {}, applyReverseLock() {} };
  const sharedUi = { updateHud() {} };
  const host = createExperienceHost({
    definition: { id: "shared" },
    scope: createResourceScope(),
    controls,
    ui: sharedUi,
    storageBackend: { getItem: () => null, setItem() {} },
    randomRange: (min) => min,
  });

  assert.equal(host.controls.readDirection, controls.readDirection);
  assert.equal(host.ui.updateHud, sharedUi.updateHud);
  assert.equal(Object.isFrozen(host.controls), true);
  assert.equal(Object.isFrozen(host.ui), true);
});

test("独立宿主装配界面样式和自动清理输入", () => {
  const calls = [];
  const surface = {
    setStyles: (styles) => calls.push(["styles", styles]),
  };
  const input = { listen() {}, emit() {} };
  const host = createStandaloneExperienceHost({
    definition: { id: "standalone", styleText: "button{}" },
    scope: createResourceScope(),
    createSurface: () => surface,
    createInput: () => input,
    rendering: {},
    time: {},
    audio: {},
    flow: {},
    storageBackend: { getItem: () => null, setItem() {} },
    randomRange: (min) => min,
  });

  assert.equal(host.surface.root, undefined);
  assert.deepEqual(calls, [["styles", "button{}"]]);
});
