import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import {
  LOW_POLY_NPC_PALETTES,
  LOW_POLY_WOLF_PALETTE,
} from "../../entities/palettes.js";
import { decorateAsWerewolf, decorateAsWolfGuard } from "../../entities/werewolf.js";
import { createBloodmoonAnimations } from "./animations.js";

export function createPlayer() {
  const player = createPlayerEntity({
    createBody: () => createLowPolyPerson(LOW_POLY_WOLF_PALETTE),
    decorate: decorateAsWerewolf,
  });
  player.animations = createBloodmoonAnimations();
  return player;
}

export function createNpc(id, flags, randomRange) {
  return createNpcEntity(id, {
    createBody: flags.wolfGuard
      ? () => createLowPolyPerson(LOW_POLY_WOLF_PALETTE)
      : () => createLowPolyPerson(LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length]),
    decorate: flags.wolfGuard ? decorateAsWolfGuard : undefined,
    traits: {
      isWolfGuard: Boolean(flags.wolfGuard),
      isLevelTarget: Boolean(flags.levelTarget),
    },
  }, randomRange);
}
