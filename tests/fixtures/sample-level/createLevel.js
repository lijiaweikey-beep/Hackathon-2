export function createSampleLevel(context) {
  let target;

  return {
    start() {
      target = context.createNpc(0, { levelTarget: true });
      context.addNpc(target);
    },
    update() {},
    handleAction(action) {
      if (action.type !== "findHitTarget") return undefined;
      return context.isFacingTarget(target) ? target : null;
    },
    destroy() {
      target = null;
    },
  };
}
