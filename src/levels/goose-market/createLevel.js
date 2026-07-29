export function createGooseMarketLevel(context) {
  let vendors = [];

  function start() {
    vendors = [];
    for (let id = 0; id < context.actors.npcCount; id += 1) {
      const isGoose = id === 0;
      const npc = context.actors.createNpc(id, {
        gooseVendor: isGoose,
        levelTarget: isGoose,
      });
      npc.group.position.copy(context.movement.randomOpenPosition());
      context.actors.addNpc(npc);
      vendors.push(npc);
    }
  }

  function update(deltaSeconds) {
    context.sceneData.updateEnvironment(
      deltaSeconds,
      context.actors.getPlayer?.()?.group.position,
    );
    vendors.forEach((vendor) => {
      if (!vendor.alive) return;
      const glow = context.sceneData.getLegGlow(
        vendor.group.position,
        vendor.isGoose,
      );
      vendor.setLegGlow?.(glow);
    });
  }

  return {
    start,
    update,
    handleAction() {},
    dispose() {
      vendors = [];
    },
  };
}
