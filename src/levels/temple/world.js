import { createSuShiShadowCue } from "../../entities/templeShadows.js";

export function createWorld(world) {
  return world.buildTempleCourtyard(createSuShiShadowCue);
}
