import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";

const actorProfile = Object.freeze({});

export function createPlayer() {
  return createPlayerEntity(actorProfile);
}

export function createNpc(id, flags, randomRange) {
  return createNpcEntity(id, {
    traits: {
      isGamingTarget: Boolean(flags.gamingTarget),
      isLevelTarget: Boolean(flags.levelTarget),
    },
  }, randomRange);
}
