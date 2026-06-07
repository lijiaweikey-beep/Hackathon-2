import * as THREE from "three";
import { SU_SHI_SHADOW_PATTERN } from "../config/constants.js";
import { getFacingVector } from "../utils/math.js";

export function createSuShiShadowCue(intensity = 0) {
  const group = new THREE.Group();
  group.visible = intensity > 0;
  group.userData.shadowMeshes = [];

  SU_SHI_SHADOW_PATTERN.forEach(({ x, z, length, width, rz, opacity, accent }) => {
    const material = new THREE.MeshBasicMaterial({
      color: accent ? 0x5eead4 : 0x12352f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rz;
    mesh.position.set(x, accent ? 0.006 : 0, z);
    mesh.renderOrder = accent ? 7 : 4;
    mesh.userData.baseOpacity = opacity;
    group.add(mesh);
    group.userData.shadowMeshes.push(mesh);
  });

  const poolMaterial = new THREE.MeshBasicMaterial({
    color: 0x0f2f2a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.64, 24), poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -0.002;
  pool.scale.set(1.35, 0.58, 1);
  pool.renderOrder = 3;
  pool.userData.baseOpacity = 0.15;
  group.add(pool);
  group.userData.shadowMeshes.push(pool);

  setShadowCueIntensity(group, intensity);
  return group;
}

export function setShadowCueIntensity(group, intensity, pulse = 1) {
  const level = THREE.MathUtils.clamp(intensity, 0, 1);
  group.visible = level > 0.02;
  group.scale.setScalar(0.9 + level * 0.22);
  group.userData.shadowMeshes?.forEach((mesh) => {
    mesh.material.opacity = mesh.userData.baseOpacity * level * pulse;
  });
}

export function renderSuShiShadowMarkHtml() {
  const scale = 22;
  return `<span class="shadow-mark" aria-hidden="true">${SU_SHI_SHADOW_PATTERN.map((line) => {
    const left = 34 + line.x * scale - (line.width * scale) / 2;
    const top = 26 + line.z * scale - (line.length * scale) / 2;
    const width = Math.max(3, line.width * scale);
    const height = line.length * scale;
    const className = line.accent ? "shadow-line accent" : "shadow-line";
    return `<i class="${className}" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${width.toFixed(1)}px;height:${height.toFixed(1)}px;transform:rotate(${line.rz.toFixed(3)}rad);opacity:${line.opacity.toFixed(2)}"></i>`;
  }).join("")}</span>`;
}

export function positionShadowCue(group, npc) {
  if (!group || !npc) return;
  const facing = getFacingVector(npc.group.rotation.y);
  group.position.set(
    npc.group.position.x - facing.x * 0.18,
    0.062,
    npc.group.position.z - facing.y * 0.18,
  );
  group.rotation.y = npc.group.rotation.y * 0.08;
}

export function makeShadowMaterial(opacity = 0) {
  return new THREE.MeshBasicMaterial({
    color: 0x12352f,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
  });
}

export function addShadowMesh(group, geometry, x, z, rz, baseOpacity, scaleX = 1, scaleZ = 1) {
  const mesh = new THREE.Mesh(geometry, makeShadowMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rz;
  mesh.position.set(x, 0.026, z);
  mesh.scale.set(scaleX, scaleZ, 1);
  mesh.renderOrder = 3;
  mesh.userData.baseOpacity = baseOpacity;
  group.add(mesh);
  group.userData.shadowMeshes.push(mesh);
}

export function createTempleLocalShadow(style = "bamboo", seed = 0) {
  const group = new THREE.Group();
  group.visible = false;
  group.userData.shadowMeshes = [];

  const sway = Math.sin(seed * 1.73) * 0.12;

  if (style === "bamboo") {
    SU_SHI_SHADOW_PATTERN.forEach(({ x, z, length, width, rz, opacity }) => {
      addShadowMesh(group, new THREE.PlaneGeometry(width, length), x, z, rz, opacity);
    });
  } else if (style === "fan") {
    addShadowMesh(group, new THREE.CircleGeometry(0.74, 24, 0.1, Math.PI * 0.86), -0.1, -0.12, -0.72 + sway, 0.3, 1.35, 0.72);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.38), -0.18, 0.02, -0.96, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.05, 1.18), 0.04, 0.03, -0.55, 0.16);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.92), 0.25, 0.04, -0.18, 0.14);
  } else if (style === "moon") {
    addShadowMesh(group, new THREE.RingGeometry(0.48, 0.68, 28, 2, -0.35, Math.PI * 1.35), 0, 0.02, 0.34 + sway, 0.32, 1.25, 0.72);
    addShadowMesh(group, new THREE.RingGeometry(0.3, 0.38, 20, 2, 0.2, Math.PI * 1.05), 0.26, -0.08, -0.45, 0.18, 1.2, 0.7);
  } else if (style === "window") {
    addShadowMesh(group, new THREE.RingGeometry(0.56, 0.64, 4), 0, 0.02, Math.PI / 4 + sway, 0.26, 1.25, 0.82);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.28), 0, 0.02, 0.05 + sway, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.28), 0, 0.02, Math.PI / 2 + sway, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.98), -0.24, 0.0, 0.05 + sway, 0.14);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.98), 0.24, 0.0, 0.05 + sway, 0.14);
  } else if (style === "stone") {
    addShadowMesh(group, new THREE.CircleGeometry(0.62, 18), -0.06, 0.02, 0.1 + sway, 0.24, 1.45, 0.72);
    addShadowMesh(group, new THREE.CircleGeometry(0.32, 12), 0.42, -0.12, -0.2, 0.18, 1.25, 0.7);
    addShadowMesh(group, new THREE.PlaneGeometry(0.045, 0.82), -0.22, 0.08, 0.86, 0.13);
    addShadowMesh(group, new THREE.PlaneGeometry(0.04, 0.72), 0.16, -0.04, -0.62, 0.12);
  } else if (style === "leaf") {
    addShadowMesh(group, new THREE.CircleGeometry(0.56, 28), -0.08, 0.02, -0.28 + sway, 0.26, 0.82, 1.48);
    addShadowMesh(group, new THREE.PlaneGeometry(0.055, 1.28), -0.08, 0.02, -0.28 + sway, 0.18);
    addShadowMesh(group, new THREE.PlaneGeometry(0.04, 0.62), 0.08, 0.2, 0.58, 0.12);
    addShadowMesh(group, new THREE.PlaneGeometry(0.04, 0.58), -0.26, -0.08, -1.04, 0.12);
  } else {
    addShadowMesh(group, new THREE.PlaneGeometry(0.08, 1.55), -0.34, 0.02, -0.12 + sway, 0.24);
    addShadowMesh(group, new THREE.PlaneGeometry(0.06, 1.28), -0.08, 0.1, 0.08 + sway, 0.2);
    addShadowMesh(group, new THREE.PlaneGeometry(0.05, 1.06), 0.18, -0.02, 0.28 + sway, 0.17);
    addShadowMesh(group, new THREE.CircleGeometry(0.22, 12), 0.44, 0.18, 0.2, 0.12, 1.45, 0.52);
  }

  return group;
}

export function setTempleLocalShadow(actor, influence, strength = 1, pulse = 1) {
  const data = actor?.group?.userData;
  if (!data?.groundShadow) return;
  const level = THREE.MathUtils.clamp(influence, 0, 1);
  const visible = level > 0.02;

  data.groundShadow.visible = visible;
  data.groundShadow.material.opacity = data.groundShadow.userData.baseOpacity * level * strength;

  if (data.localBambooShadow) {
    data.localBambooShadow.visible = visible;
    data.localBambooShadow.scale.setScalar(0.9 + level * 0.12);
  }

  data.localBambooShadow?.userData.shadowMeshes?.forEach((mesh) => {
    mesh.material.opacity = mesh.userData.baseOpacity * level * strength * pulse;
  });
}
