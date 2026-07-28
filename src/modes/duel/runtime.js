import { duelDefinition } from "./definition.js";

export { duelDefinition };

export function createDuelMovementResponse(input) {
  return {
    velocity: { x: input.x, y: input.y },
    rotation: Math.atan2(input.x, -input.y),
  };
}
