import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createPhotoEvidenceRules,
  evaluatePhotoScene,
} from "../../src/levels/supermarket/rules.js";

function createActor(x, z, rotation = 0) {
  return {
    group: {
      position: new THREE.Vector3(x, 0, z),
      rotation: { y: rotation },
    },
  };
}

test("超市取证只有在互动无遮挡且距离足够时成功", () => {
  const rules = createPhotoEvidenceRules({
    requiredPhotos: 4,
    opportunities: 6,
    captureDistance: 7,
  });

  rules.setScene({
    eventId: 1,
    interacting: true,
    obstructed: true,
    distance: 3,
    framedTargets: 2,
  });
  assert.equal(rules.capture().ok, false);
  rules.setScene({
    eventId: 1,
    interacting: true,
    obstructed: false,
    distance: 8,
    framedTargets: 2,
  });
  assert.equal(rules.capture().ok, false);
  rules.setScene({
    eventId: 1,
    interacting: true,
    obstructed: false,
    distance: 6,
    framedTargets: 2,
  });
  assert.equal(rules.capture().ok, true);
  assert.equal(rules.snapshot().photos, 1);
});

test("两名目标没有同时进入取景框时拍照失败并说明原因", () => {
  const rules = createPhotoEvidenceRules();

  rules.setScene({
    eventId: 1,
    interacting: true,
    obstructed: false,
    distance: 4,
    framedTargets: 1,
  });

  assert.deepEqual(rules.capture(), {
    ok: false,
    photos: 0,
    reason: "让两名目标都进入取景框",
  });
});

test("同一次互动只能生成一张有效证据", () => {
  const rules = createPhotoEvidenceRules();
  const scene = {
    eventId: 7,
    interacting: true,
    obstructed: false,
    distance: 4,
    framedTargets: 2,
  };

  rules.setScene(scene);
  assert.equal(rules.capture().ok, true);
  rules.setScene(scene);

  assert.deepEqual(rules.capture(), {
    ok: false,
    photos: 1,
    reason: "这次互动已经拍过",
  });
});

test("拍满四张立即通关且不再等待出口", () => {
  const rules = createPhotoEvidenceRules({
    requiredPhotos: 4,
    opportunities: 5,
  });

  for (let count = 0; count < 4; count += 1) {
    rules.setScene({
      eventId: count + 1,
      interacting: true,
      obstructed: false,
      distance: 3,
      framedTargets: 2,
    });
    assert.equal(rules.capture().ok, true);
  }

  assert.equal(rules.snapshot().won, true);
  assert.equal("exitOpen" in rules.snapshot(), false);
  assert.equal("reachExit" in rules, false);
});

test("剩余机会不足以集齐照片时取证失败", () => {
  const rules = createPhotoEvidenceRules({
    requiredPhotos: 4,
    opportunities: 5,
  });

  rules.missOpportunity();
  rules.missOpportunity();

  assert.equal(rules.snapshot().failed, true);
});

test("取景计算要求两名目标同时位于玩家面对方向且无遮挡", () => {
  const player = createActor(0, 2, Math.PI);
  const couple = [createActor(-0.3, 0), createActor(0.3, 0)];

  assert.deepEqual(
    evaluatePhotoScene({
      player,
      couple,
      isLineBlocked: () => false,
    }),
    {
      framedTargets: 2,
      obstructed: false,
      distance: Math.hypot(0.3, 2),
    },
  );

  player.group.rotation.y = 0;
  assert.equal(
    evaluatePhotoScene({
      player,
      couple,
      isLineBlocked: () => false,
    }).framedTargets,
    0,
  );
});
