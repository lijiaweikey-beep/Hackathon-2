import * as THREE from "three";

export function createLightningBolt(x, z, width, height, tilt, randomRange) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = tilt;
  group.userData.segments = [];

  const material = new THREE.MeshBasicMaterial({
    color: 0xeef6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });

  let px = 0;
  let py = height;
  const points = [[px, py]];
  for (let i = 1; i <= 7; i += 1) {
    px += randomRange(-width, width) * 0.42;
    py = height - (height / 7) * i;
    points.push([px, py]);
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dx, dy);
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.08, length), material.clone());
    seg.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    seg.rotation.z = -angle;
    seg.renderOrder = 20;
    group.add(seg);
    group.userData.segments.push(seg);

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, length), glowMaterial.clone());
    glow.position.copy(seg.position);
    glow.rotation.copy(seg.rotation);
    glow.renderOrder = 19;
    group.add(glow);
    group.userData.segments.push(glow);
  }

  return group;
}
