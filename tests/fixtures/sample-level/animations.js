export function createSampleAnimations() {
  return {
    update(actor, { totalTime }) {
      actor.group.userData.visual.rotation.y = Math.sin(totalTime) * 0.04;
    },
  };
}
