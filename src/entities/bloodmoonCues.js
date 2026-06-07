import * as THREE from "three";
import { getFacingVector } from "../utils/math.js";

export function createBloodmoonClawCue(intensity = 0) {
  const group = new THREE.Group();
  group.visible = intensity > 0;
  group.userData.shadowMeshes = [];

  const material = new THREE.MeshBasicMaterial({
    color: 0x040204,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const bloodGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff3145,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });

  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.82, 32), bloodGlowMat.clone());
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(0, 0.008, 0.06);
  halo.scale.set(1.12, 0.78, 1);
  halo.renderOrder = 9;
  halo.userData.baseOpacity = 0.34;
  halo.userData.part = "halo";
  group.add(halo);
  group.userData.shadowMeshes.push(halo);

  const palm = new THREE.Mesh(new THREE.CircleGeometry(0.52, 24), material.clone());
  palm.rotation.x = -Math.PI / 2;
  palm.scale.set(1.0, 0.74, 1);
  palm.position.set(0, 0.01, 0.08);
  palm.renderOrder = 10;
  palm.userData.baseOpacity = 0.68;
  palm.userData.part = "palm";
  group.add(palm);
  group.userData.shadowMeshes.push(palm);

  [-0.3, -0.1, 0.1, 0.3].forEach((x, i) => {
    const toe = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.58 + i * 0.03, 3), material.clone());
    toe.rotation.x = -Math.PI / 2;
    toe.rotation.z = (x * -0.8);
    toe.position.set(x, 0.012, -0.46 - Math.abs(x) * 0.1);
    toe.scale.set(0.72, 1, 0.8);
    toe.renderOrder = 11;
    toe.userData.baseOpacity = 0.78;
    toe.userData.part = "toe";
    toe.userData.partIndex = i;
    group.add(toe);
    group.userData.shadowMeshes.push(toe);
  });

  const slashMat = new THREE.MeshBasicMaterial({
    color: 0xffedf0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  [-0.26, 0, 0.26].forEach((x, i) => {
    const slash = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.04), slashMat.clone());
    slash.rotation.x = -Math.PI / 2;
    slash.rotation.z = -0.36 + i * 0.36;
    slash.position.set(x, 0.018, -0.02);
    slash.renderOrder = 12;
    slash.userData.baseOpacity = 0.56;
    slash.userData.part = "slash";
    slash.userData.partIndex = i;
    group.add(slash);
    group.userData.shadowMeshes.push(slash);
  });

  setBloodmoonClawIntensity(group, intensity);
  return group;
}

export function setBloodmoonClawIntensity(group, intensity, pulse = 1, completeness = 1, elapsedTime = 0) {
  const level = THREE.MathUtils.clamp(intensity, 0, 1);
  const complete = THREE.MathUtils.clamp(completeness, 0, 1);
  group.visible = level > 0.02;
  const jitter = group.userData.isDecoyCue ? Math.sin(elapsedTime * 18 + (group.userData.seed ?? 0)) * 0.07 : 0;
  group.scale.setScalar(1.18 + level * (0.3 + complete * 0.28) + jitter);
  group.userData.shadowMeshes?.forEach((mesh) => {
    let partFactor = 1;
    if (mesh.userData.part === "palm") partFactor = complete >= 0.34 ? 1 : 0.18;
    if (mesh.userData.part === "toe") partFactor = complete >= (0.42 + mesh.userData.partIndex * 0.12) ? 1 : 0;
    if (mesh.userData.part === "slash") partFactor = complete >= (0.74 + mesh.userData.partIndex * 0.08) ? 1 : 0;
    if (group.userData.isDecoyCue && mesh.userData.part === "toe" && mesh.userData.partIndex === group.userData.missingToe) partFactor = 0;
    mesh.material.opacity = mesh.userData.baseOpacity * level * pulse * partFactor;
  });
}

export function positionBloodmoonCue(group, npc) {
  if (!group || !npc) return;
  const facing = getFacingVector(npc.group.rotation.y);
  group.position.set(npc.group.position.x - facing.x * 0.26, 0.092, npc.group.position.z - facing.y * 0.26);
  group.rotation.y = npc.group.rotation.y * 0.08;
}
