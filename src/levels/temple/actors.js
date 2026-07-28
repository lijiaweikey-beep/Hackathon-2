import { TEMPLE_DECOY_SHADOW_STYLES } from "../../config/constants.js";
import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";
import { createTemplePerson } from "../../entities/templePerson.js";

export function createPlayer() {
  return createPlayerEntity({
    createBody: () => createTemplePerson("window", -1),
  });
}

export function createNpc(id, flags, randomRange) {
  const shadowStyle = flags.suShiTarget
    ? "bamboo"
    : TEMPLE_DECOY_SHADOW_STYLES[id % TEMPLE_DECOY_SHADOW_STYLES.length];
  return createNpcEntity(id, {
    createBody: () => createTemplePerson(shadowStyle, id),
    traits: {
      isSuShiTarget: Boolean(flags.suShiTarget),
      isLevelTarget: Boolean(flags.levelTarget),
    },
  }, randomRange);
}
