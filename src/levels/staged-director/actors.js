import * as THREE from "three";
import {
  createNpc as createNpcEntity,
  createPlayer as createPlayerEntity,
} from "../../entities/actors.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { addFacetedBox, makeLowPolyMat } from "../../entities/lowPolyMesh.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";

const DIRECTOR_PALETTE = {
  jacket: 0x334155,
  jacketDark: 0x1e293b,
  shorts: 0x475569,
  shortsDark: 0x334155,
  cap: 0x0f172a,
  capAccent: 0xf97316,
  sock: 0xe2e8f0,
};

const BLIND_PALETTE = {
  jacket: 0x38bdf8,
  jacketDark: 0x0284c7,
  shorts: 0x57534e,
  shortsDark: 0x44403c,
  cap: 0xf8fafc,
  capAccent: 0xfacc15,
  sock: 0xbae6fd,
};

function addPhone(actor) {
  const phone = addFacetedBox(
    actor.group.userData.visual,
    0.16,
    0.26,
    0.04,
    makeLowPolyMat(0x111827),
    0.45,
    1.06,
    0.24,
    -0.3,
    0.15,
    -0.15,
  );
  phone.userData.role = "director-phone";
  actor.group.userData.colors.push(0x111827);
  return phone;
}

function addCueBadge(actor) {
  const badge = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    }),
  );
  badge.position.set(0, 2.12, 0.08);
  badge.visible = false;
  actor.group.userData.visual.add(badge);
  actor.group.userData.colors.push(0xfacc15);
  return badge;
}

function addCane(actor) {
  const cane = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6),
    makeLowPolyMat(0xf8fafc),
  );
  cane.position.set(-0.42, 0.72, 0.32);
  cane.rotation.set(0.72, 0.16, -0.42);
  cane.castShadow = true;
  actor.group.userData.visual.add(cane);
  actor.group.userData.colors.push(0xf8fafc);
}

function addCamera(actor) {
  const camera = new THREE.Group();
  addFacetedBox(camera, 0.34, 0.22, 0.22, makeLowPolyMat(0x1e293b), 0, 0, 0);
  addFacetedBox(camera, 0.14, 0.14, 0.08, makeLowPolyMat(0x0f172a), 0, 0, 0.15);
  camera.position.set(0.42, 1.15, 0.26);
  camera.rotation.set(-0.2, -0.22, -0.28);
  actor.group.userData.visual.add(camera);
  actor.group.userData.cameraProp = camera;
  actor.group.userData.colors.push(0x1e293b, 0x0f172a);
}

function addHandlebar(actor) {
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6),
    makeLowPolyMat(0x334155),
  );
  bar.position.set(0, 0.98, 0.42);
  bar.rotation.z = Math.PI / 2;
  bar.castShadow = true;
  actor.group.userData.visual.add(bar);
  actor.group.userData.colors.push(0x334155);
}

function decorateByRole(actor, role, flags) {
  actor.group.userData.role = role;
  if (role === "director") {
    const badge = addCueBadge(actor);
    addPhone(actor);
    actor.group.userData.visual.setDirecting = (active) => {
      actor.group.userData.directingActive = Boolean(active);
      badge.visible = Boolean(active);
      actor.group.userData.rightArm.rotation.z = active ? -1.45 : -0.35;
    };
  } else {
    actor.group.userData.visual.setDirecting = () => {};
  }

  if (role === "blind") addCane(actor);
  if (role === "camera") addCamera(actor);
  if (role === "rider") addHandlebar(actor);

  actor.group.userData.visual.setCameraRaised = (active) => {
    actor.group.userData.cameraRaised = Boolean(active);
    if (actor.group.userData.cameraProp) {
      actor.group.userData.cameraProp.position.y = active ? 1.38 : 1.15;
      actor.group.userData.rightArm.rotation.z = active ? -1.08 : -0.35;
    }
  };
  actor.group.userData.visual.setDirecting(Boolean(flags.directorActive));
  actor.group.userData.visual.setCameraRaised(false);
  return actor;
}

function paletteFor(id, role) {
  if (role === "director") return DIRECTOR_PALETTE;
  if (role === "blind") return BLIND_PALETTE;
  return LOW_POLY_NPC_PALETTES[id % LOW_POLY_NPC_PALETTES.length];
}

export function createPlayer() {
  return createPlayerEntity();
}

export function createNpc(id, flags = {}, randomRange) {
  const role = flags.role ?? "crowd";
  return createNpcEntity(id, {
    createBody: () => decorateByRole(
      createLowPolyPerson(paletteFor(id, role)),
      role,
      flags,
    ),
    traits: {
      role,
      levelManaged: role !== "crowd",
      directorSuspect: role === "director",
      directorTarget: Boolean(flags.directorTarget),
      isProtectedActor: Boolean(flags.protectedActor),
      isLevelTarget: Boolean(flags.levelTarget),
    },
  }, randomRange);
}
