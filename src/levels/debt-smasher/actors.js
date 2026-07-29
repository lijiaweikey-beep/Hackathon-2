import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";

function createBillBody(id, debtType) {
  const actor = createLowPolyPerson(LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length]);
  actor.group.userData.debtType = debtType;
  return actor;
}

export function createPlayer() {
  return createPlayerEntity();
}

export function createNpc(id, flags = {}, randomRange) {
  const debtTypes = ["mortgage", "car-loan"];
  const debtType = flags.debtType ?? debtTypes[id % debtTypes.length];
  return createNpcEntity(id, {
    createBody: () => createBillBody(id, debtType),
    traits: {
      debtType,
      isDebtTarget: true,
      isLevelTarget: true,
    },
  }, randomRange);
}
