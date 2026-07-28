import { createSampleAnimations } from "./animations.js";

export function createPlayer() {
  return { animations: createSampleAnimations() };
}

export function createNpc() {
  return null;
}
