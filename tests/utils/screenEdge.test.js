import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  isInScreenEdgeBand,
  projectWorldToNdc,
  steerAwayFromScreenEdge,
} from "../../src/utils/screenEdge.js";

function createTestCamera() {
  const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  camera.position.set(0, 19.5, 17.2);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

test("屏幕边缘带判定覆盖四边 2%", () => {
  assert.equal(isInScreenEdgeBand(-0.97, 0), true);
  assert.equal(isInScreenEdgeBand(0.97, 0), true);
  assert.equal(isInScreenEdgeBand(0, 0.97), true);
  assert.equal(isInScreenEdgeBand(0, -0.97), true);
  assert.equal(isInScreenEdgeBand(0, 0), false);
  assert.equal(isInScreenEdgeBand(0.5, -0.5), false);
});

test("NPC 进入屏幕边缘时立刻转向屏幕中心离开", () => {
  const camera = createTestCamera();
  const direction = new THREE.Vector2(1, 0);

  // 找一个落在右边缘带附近的地面点
  let edgePosition = null;
  for (let x = 0; x <= 12; x += 0.25) {
    const candidate = new THREE.Vector3(x, 0, 0);
    const ndc = projectWorldToNdc(candidate, camera);
    if (ndc.x >= 0.96) {
      edgePosition = candidate;
      break;
    }
  }
  assert.ok(edgePosition, "应能找到右侧屏幕边缘世界点");

  const steered = steerAwayFromScreenEdge(edgePosition, camera, direction);
  assert.equal(steered, true);
  assert.ok(direction.x < 0, "应从右边缘向左（朝中心）离开");
  assert.ok(Math.abs(direction.length() - 1) < 1e-6);
});
