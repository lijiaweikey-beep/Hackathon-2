import * as THREE from "three";
import { makeLowPolyMat, addFacetedBox } from "./lowPolyMesh.js";

export function decorateAsWerewolf(actor) {
  const data = actor.group.userData;
  const visual = data.visual;
  const furMat = makeLowPolyMat(0x1b0b0f, 0.78);
  const earInnerMat = makeLowPolyMat(0xef4444, 0.58);
  const clawMat = makeLowPolyMat(0xf8fafc, 0.42);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff3b4f, transparent: true, opacity: 0.32, depthWrite: false });

  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), furMat);
  leftEar.position.set(-0.2, 2.02, -0.02);
  leftEar.rotation.set(0.12, 0.26, -0.24);
  leftEar.castShadow = true;
  const rightEar = leftEar.clone();
  rightEar.material = furMat;
  rightEar.position.x = 0.2;
  rightEar.rotation.z = 0.24;
  visual.add(leftEar, rightEar);

  const wolfParts = [leftEar, rightEar];
  wolfParts.push(addFacetedBox(visual, 0.09, 0.16, 0.035, earInnerMat, -0.2, 1.99, 0.04, 0.1, 0.16, -0.2));
  wolfParts.push(addFacetedBox(visual, 0.09, 0.16, 0.035, earInnerMat, 0.2, 1.99, 0.04, 0.1, -0.16, 0.2));
  wolfParts.push(addFacetedBox(visual, 0.36, 0.12, 0.24, furMat, 0, 1.7, -0.14, 0.08, 0, 0));

  [-0.055, 0, 0.055].forEach((x, i) => {
    wolfParts.push(addFacetedBox(data.leftArm, 0.025, 0.18, 0.045, clawMat, x, -0.52, 0.09, -0.32, 0, -0.12 + i * 0.12));
    wolfParts.push(addFacetedBox(data.rightArm, 0.025, 0.18, 0.045, clawMat, x, -0.52, 0.09, -0.32, 0, -0.12 + i * 0.12));
  });

  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.35, 4, 1, true), glowMat);
  cape.position.set(0, 0.88, -0.52);
  cape.rotation.set(Math.PI * 0.5, Math.PI / 4, 0);
  cape.scale.set(0.72, 1.0, 0.28);
  visual.add(cape);
  wolfParts.push(cape);

  data.wolfCape = cape;
  data.wolfParts = wolfParts;
  data.colors = [0x4b1418, 0x20202a, 0xf0b88c, 0x1b0b0f, 0xef4444, 0xf8fafc];
  actor.isWerewolf = true;
  return actor;
}

export function decorateAsWolfGuard(actor) {
  const data = actor.group.userData;
  const visual = data.visual;
  const armorMat = makeLowPolyMat(0x171717, 0.68);
  const furMat = makeLowPolyMat(0x2a0c12, 0.78);
  const redMat = makeLowPolyMat(0xdc2626, 0.5);
  const bladeMat = makeLowPolyMat(0xdbeafe, 0.34);
  const hiltMat = makeLowPolyMat(0x78350f, 0.64);

  const guardParts = [];
  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 4), furMat);
  leftEar.position.set(-0.22, 2.05, -0.02);
  leftEar.rotation.set(0.14, 0.26, -0.3);
  const rightEar = leftEar.clone();
  rightEar.material = furMat;
  rightEar.position.x = 0.22;
  rightEar.rotation.z = 0.3;
  visual.add(leftEar, rightEar);
  guardParts.push(leftEar, rightEar);

  guardParts.push(addFacetedBox(visual, 0.62, 0.18, 0.26, armorMat, 0, 1.22, 0.02));
  guardParts.push(addFacetedBox(visual, 0.28, 0.14, 0.1, redMat, 0, 1.28, 0.22));
  guardParts.push(addFacetedBox(visual, 0.44, 0.18, 0.26, furMat, 0, 1.72, -0.14, 0.08, 0, 0));

  const sword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 0.06), bladeMat);
  blade.position.y = 0.46;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), bladeMat);
  tip.position.y = 0.98;
  tip.rotation.z = Math.PI / 4;
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), hiltMat);
  hilt.position.y = 0.02;
  sword.add(blade, tip, hilt);
  sword.position.set(0.52, 0.86, 0.18);
  sword.rotation.set(-0.18, 0.18, -0.62);
  visual.add(sword);
  guardParts.push(sword);

  data.wolfParts = guardParts;
  data.wolfCape = null;
  data.colors = [0x171717, 0x2a0c12, 0xdc2626, 0xdbeafe, 0x78350f];
  actor.isWerewolf = false;
  return actor;
}
