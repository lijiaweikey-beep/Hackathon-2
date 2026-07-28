export function createLevelContext(capabilities) {
  if (!capabilities || typeof capabilities !== "object") {
    throw new TypeError("关卡上下文必须是能力对象");
  }
  const freezeGroup = (group) => Object.freeze({ ...(group ?? {}) });
  return Object.freeze({
    definition: capabilities.definition,
    scope: capabilities.scope,
    sceneData: capabilities.sceneData ?? {},
    time: freezeGroup(capabilities.time),
    actors: freezeGroup(capabilities.actors),
    movement: freezeGroup(capabilities.movement),
    combat: freezeGroup(capabilities.combat),
    world: freezeGroup(capabilities.world),
    ui: freezeGroup(capabilities.ui),
    audio: freezeGroup(capabilities.audio),
    random: freezeGroup(capabilities.random),
  });
}
