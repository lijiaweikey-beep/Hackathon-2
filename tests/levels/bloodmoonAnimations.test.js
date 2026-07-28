import assert from "node:assert/strict";
import test from "node:test";
import { createBloodmoonAnimations } from "../../src/levels/bloodmoon/animations.js";

function createActor() {
  return {
    group: {
      rotation: { y: Math.PI / 2 },
      userData: {
        rightArm: { rotation: { x: 0, z: 0 } },
        leftArm: { rotation: { z: 0 } },
        baseArmRotations: { rightZ: 0, leftZ: 0 },
        visual: { position: { x: 0, z: 0 } },
        wolfCape: {
          material: { opacity: 0 },
          rotation: { z: 0 },
        },
      },
    },
  };
}

test("血月攻击动画完全由血月角色提供", () => {
  const actor = createActor();
  const animations = createBloodmoonAnimations();

  const handled = animations.attack(actor, {
    progress: 1,
    totalTime: 1,
  });

  assert.equal(handled, true);
  assert.equal(actor.group.userData.rightArm.rotation.x, -2.795);
  assert.ok(actor.group.userData.wolfCape.material.opacity > 0.24);
  assert.notEqual(actor.group.userData.visual.position.x, 0);
});
