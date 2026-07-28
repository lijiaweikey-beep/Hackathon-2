import assert from "node:assert/strict";
import test from "node:test";
import { createPhotoEvidenceRules } from "../../src/levels/supermarket/rules.js";

test("超市取证只有在互动无遮挡且距离足够时成功", () => {
  const rules = createPhotoEvidenceRules({
    requiredPhotos: 4,
    opportunities: 6,
    captureDistance: 7,
  });

  rules.setScene({ interacting: true, obstructed: true, distance: 3 });
  assert.equal(rules.capture().ok, false);
  rules.setScene({ interacting: true, obstructed: false, distance: 8 });
  assert.equal(rules.capture().ok, false);
  rules.setScene({ interacting: true, obstructed: false, distance: 6 });
  assert.equal(rules.capture().ok, true);
  assert.equal(rules.snapshot().photos, 1);
});

test("拍满四张只开启出口，抵达收银区后才通关", () => {
  const rules = createPhotoEvidenceRules({
    requiredPhotos: 4,
    opportunities: 5,
  });

  for (let count = 0; count < 4; count += 1) {
    rules.setScene({ interacting: true, obstructed: false, distance: 3 });
    assert.equal(rules.capture().ok, true);
  }

  assert.equal(rules.snapshot().exitOpen, true);
  assert.equal(rules.snapshot().won, false);
  assert.equal(rules.reachExit(), true);
  assert.equal(rules.snapshot().won, true);
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
