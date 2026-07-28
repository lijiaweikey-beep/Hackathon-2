import test from "node:test";
import assert from "node:assert/strict";
import {
  getBossHitTransition,
  isInsideSafeZone,
} from "../../src/levels/bloodmoon/rules.js";

test("安全区使用水平距离判断", () => {
  assert.equal(
    isInsideSafeZone({ x: 2, z: 1 }, [{ x: 0, z: 1 }], 2.35),
    true,
  );
  assert.equal(
    isInsideSafeZone({ x: 2.36, z: 1 }, [{ x: 0, z: 1 }], 2.35),
    false,
  );
});

test("首阶段命中转入二阶段猎杀", () => {
  assert.deepEqual(getBossHitTransition("phase1", 3), {
    nextMode: "huntIntro",
    nextBossHp: 3,
    defeated: false,
  });
});

test("二阶段最后一格命中结束关卡", () => {
  assert.deepEqual(getBossHitTransition("phase2", 1), {
    nextMode: "phase2",
    nextBossHp: 0,
    defeated: true,
  });
});
