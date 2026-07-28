import { createBloodmoonClawCue } from "../../entities/bloodmoonCues.js";

export function createWorld(world) {
  return world.buildBloodmoonStreet(world.baseLight, createBloodmoonClawCue);
}
