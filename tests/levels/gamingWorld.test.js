import assert from "node:assert/strict";
import test from "node:test";
import { createWorld } from "../../src/levels/gaming/world.js";

test("宿舍场景把电脑位置作为关卡私有资源返回", () => {
  const resources = { computers: [{ x: 1, z: 2 }] };
  const world = {
    buildGamingRoom() {
      return resources;
    },
  };

  assert.equal(createWorld(world), resources);
});
