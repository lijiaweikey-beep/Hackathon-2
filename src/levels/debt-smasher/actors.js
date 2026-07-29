import * as THREE from "three";
import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";

const DEBT_COLORS = {
  mortgage: 0x8ee7ff,
  "car-loan": 0xfbbf24,
  interest: 0xf43f5e,
  collection: 0xa78bfa,
};

function createBillBody(id, debtType) {
  const actor = createLowPolyPerson(LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length]);
  const billMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.86 });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: DEBT_COLORS[debtType] ?? 0xf43f5e,
    emissive: DEBT_COLORS[debtType] ?? 0xf43f5e,
    emissiveIntensity: 0.35,
    roughness: 0.56,
  });
  const bill = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.05), billMat);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.065), stripeMat);
  bill.position.set(0, 1.08, 0.34);
  stripe.position.set(0, 1.15, 0.38);
  actor.group.userData.visual.add(bill, stripe);
  actor.group.userData.debtType = debtType;
  actor.group.userData.colors.push(0xfffbeb, DEBT_COLORS[debtType] ?? 0xf43f5e);
  return actor;
}

export function createPlayer() {
  return createPlayerEntity();
}

export function createNpc(id, flags = {}, randomRange) {
  const debtTypes = ["mortgage", "car-loan", "interest", "collection"];
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
