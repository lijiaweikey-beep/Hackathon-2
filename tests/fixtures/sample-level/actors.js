import { createSampleAnimations } from "./animations.js";

export function createPlayer() {
  return { animations: createSampleAnimations() };
}

export function createNpc(id = 0, flags = {}) {
  return {
    id,
    flags: { ...flags },
    animations: createSampleAnimations(),
  };
}
