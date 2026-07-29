import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import { createWorld } from "../../src/levels/staged-director/world.js";

test("谁喊的开拍场景包含盲道、摄影机、电动车和固定舞台点", () => {
  const scene = new THREE.Scene();
  const obstacles = [];
  const world = createWorld({
    THREE,
    scene,
    registerObstacle: (...args) => obstacles.push(args),
    addWall: () => {},
    baseLight: { intensity: 1 },
  });

  assert.ok(scene.children.some((child) => child.userData.role === "blind-lane"));
  assert.ok(scene.children.some((child) => child.userData.role === "tripod-camera"));
  assert.ok(scene.children.some((child) => child.userData.role === "parked-scooter"));
  assert.ok(world.stagePoints.directorSpots.length >= 3);
  assert.ok(world.stagePoints.crowdSpots.length >= 7);
  assert.ok(obstacles.length <= 4);
});

test("表演阶段会打开摄影机录制提示，准备阶段关闭", () => {
  const scene = new THREE.Scene();
  const world = createWorld({
    THREE,
    scene,
    registerObstacle: () => {},
    addWall: () => {},
    baseLight: { intensity: 1 },
  });

  world.setPerformancePhase("cue");
  assert.equal(world.getPerformancePhase(), "cue");
  assert.ok(scene.children.some((child) => child.userData.recordingActive));

  world.setPerformancePhase("prepare");
  assert.equal(world.getPerformancePhase(), "prepare");
  assert.equal(scene.children.some((child) => child.userData.recordingActive), false);
});
