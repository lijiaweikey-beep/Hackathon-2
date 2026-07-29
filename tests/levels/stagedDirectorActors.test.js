import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  createNpc,
  createPlayer,
} from "../../src/levels/staged-director/actors.js";
import { createPreviewModel } from "../../src/levels/staged-director/preview.js";

const randomRange = (min, max) => (min + max) / 2;

test("导演嫌疑人、真导演和受保护盲人角色有明确标记", () => {
  const player = createPlayer();
  const director = createNpc(1, {
    role: "director",
    directorTarget: true,
    levelTarget: true,
  }, randomRange);
  const blind = createNpc(2, {
    role: "blind",
    protectedActor: true,
  }, randomRange);

  assert.equal(player.speed > 0, true);
  assert.equal(director.role, "director");
  assert.equal(director.directorSuspect, true);
  assert.equal(director.directorTarget, true);
  assert.equal(director.isLevelTarget, true);
  assert.equal(blind.role, "blind");
  assert.equal(blind.isProtectedActor, true);
  assert.equal(blind.isLevelTarget, false);
});

test("导演和摄影师的阶段动作能被行为循环切换", () => {
  const director = createNpc(1, {
    role: "director",
    directorTarget: true,
    levelTarget: true,
  }, randomRange);
  const camera = createNpc(2, { role: "camera" }, randomRange);

  director.group.userData.visual.setDirecting(true);
  camera.group.userData.visual.setCameraRaised(true);

  assert.equal(director.group.userData.directingActive, true);
  assert.equal(camera.group.userData.cameraRaised, true);

  director.group.userData.visual.setDirecting(false);
  camera.group.userData.visual.setCameraRaised(false);

  assert.equal(director.group.userData.directingActive, false);
  assert.equal(camera.group.userData.cameraRaised, false);
});

test("关卡预览模型使用同一套低多边形导演角色", () => {
  const model = createPreviewModel({ THREE, randomRange });

  assert.equal(model.userData.previewRole, "staged-director");
  assert.ok(model.children.length > 0);
});
