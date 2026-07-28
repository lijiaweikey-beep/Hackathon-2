export function createBloodmoonAnimations() {
  return {
    attack(actor, { progress, totalTime }) {
      const data = actor.group.userData;
      data.rightArm.rotation.x = -2.15 * progress * 1.3;
      data.rightArm.rotation.z = data.baseArmRotations.rightZ - 1.05 * progress * 1.3;
      data.leftArm.rotation.z = data.baseArmRotations.leftZ + 0.42 * progress;

      const facingX = Math.sin(actor.group.rotation.y);
      const facingZ = Math.cos(actor.group.rotation.y);
      data.visual.position.x = facingX * 0.18 * progress;
      data.visual.position.z = facingZ * 0.18 * progress;
      if (progress <= 0) {
        data.visual.position.x = 0;
        data.visual.position.z = 0;
      }

      if (data.wolfCape) {
        data.wolfCape.material.opacity = 0.24
          + Math.abs(Math.sin(totalTime * 8)) * 0.16
          + progress * 0.22;
        data.wolfCape.rotation.z = Math.sin(totalTime * 5.2) * 0.08;
      }
      return true;
    },
  };
}
