import * as THREE from "three";
import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";

function createVendorBody(id, isGoose) {
  const actor = createLowPolyPerson(
    LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length],
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0xc97826,
    emissive: 0x65a30d,
    emissiveIntensity: 0,
    roughness: 0.68,
  });
  const leg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.12, 0.34, 3, 7),
    material,
  );
  leg.position.set(0.46, 0.88, 0.25);
  leg.rotation.z = -0.58;
  leg.castShadow = true;
  actor.group.userData.visual.add(leg);
  actor.group.userData.foodLeg = leg;
  actor.group.userData.colors.push(0xc97826);
  actor.setLegGlow = (intensity) => {
    material.emissiveIntensity = isGoose ? 0 : intensity * 2.6;
  };
  return actor;
}

export function createPlayer() {
  return createPlayerEntity();
}

export function createNpc(id, flags, randomRange) {
  const isGoose = Boolean(flags.gooseVendor);
  return createNpcEntity(id, {
    createBody: () => createVendorBody(id, isGoose),
    traits: {
      isGoose,
      isDuckVendor: !isGoose,
      isLevelTarget: Boolean(flags.levelTarget),
    },
  }, randomRange);
}
