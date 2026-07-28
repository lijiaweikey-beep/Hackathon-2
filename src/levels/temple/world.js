import { createSuShiShadowCue } from "../../entities/templeShadows.js";

function addBambooCluster(world, x, z) {
  const {
    THREE,
    scene,
    randomRange,
    registerObstacle,
  } = world;
  const bambooMaterial = new THREE.MeshStandardMaterial({ color: 0x2f6b3f, roughness: 0.66 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x3f8b54, roughness: 0.74 });
  for (let index = 0; index < 5; index += 1) {
    const offsetX = (index - 2) * 0.16;
    const offsetZ = Math.sin(index * 1.4) * 0.2;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 2.8 + index * 0.12, 6),
      bambooMaterial,
    );
    stem.position.set(x + offsetX, 1.4 + index * 0.04, z + offsetZ);
    stem.rotation.z = randomRange(-0.08, 0.08);
    stem.castShadow = true;
    scene.add(stem);

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.055, 0.16), leafMaterial);
    leaf.position.set(x + offsetX * 1.4, 2.75 + index * 0.05, z + offsetZ);
    leaf.rotation.y = randomRange(-0.9, 0.9);
    leaf.rotation.z = randomRange(-0.2, 0.2);
    leaf.castShadow = true;
    scene.add(leaf);
  }
  registerObstacle(x, z, 0.45, 0.48);
}

function addCypress(world, x, z, scale) {
  const { THREE, scene, registerObstacle } = world;
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x513b2c, roughness: 0.78 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x1f4d40, roughness: 0.7 });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.17 * scale, 2.0 * scale, 8),
    trunkMaterial,
  );
  trunk.position.set(x, 1.0 * scale, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.78 * scale, 2.15 * scale, 12),
    leafMaterial,
  );
  crown.position.set(x, 2.35 * scale, z);
  crown.castShadow = true;
  scene.add(crown);
  registerObstacle(x, z, 0.55 * scale, 0.55 * scale);
}

export function createWorld(world) {
  const {
    THREE,
    scene,
    addWall,
    randomRange,
    registerObstacle,
    textures,
  } = world;
  const resources = {
    moonPoint: new THREE.Vector3(0, 0, 0.15),
  };

  const wallMaterial = new THREE.MeshStandardMaterial({
    map: textures.getWallTexture("temple"),
    color: 0x92a3b4,
    roughness: 0.68,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(0, 11.8, Math.PI, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const moonLight = new THREE.PointLight(0xdbeafe, 1.15, 12.5);
  moonLight.position.set(0, 5.2, 0.1);
  scene.add(moonLight);

  const moonDisk = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 36),
    new THREE.MeshBasicMaterial({ color: 0xf6f0c7, transparent: true, opacity: 0.92 }),
  );
  moonDisk.position.set(7.1, 5.0, -11.76);
  scene.add(moonDisk);

  const moonPool = new THREE.Mesh(
    new THREE.CircleGeometry(4.55, 64),
    new THREE.MeshStandardMaterial({
      color: 0xdcefff,
      emissive: 0x8bbcff,
      emissiveIntensity: 0.25,
      roughness: 0.28,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  moonPool.rotation.x = -Math.PI / 2;
  moonPool.position.set(0, 0.026, 0.15);
  scene.add(moonPool);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.45, 4.62, 64),
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.033, 0.15);
  scene.add(ring);

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x12352f,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  for (let index = 0; index < 11; index += 1) {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(randomRange(0.18, 0.34), randomRange(5.8, 8.4)),
      shadowMaterial.clone(),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.rotation.z = -0.62 + index * 0.075;
    shadow.position.set(-4.8 + index * 0.92, 0.041, -0.7 + Math.sin(index * 0.8) * 1.5);
    scene.add(shadow);
  }

  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x6f8190, roughness: 0.84 });
  [-8.8, -4.4, 4.4, 8.8].forEach((x) => {
    [-8.6, 8.7].forEach((z) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.92), stoneMaterial);
      slab.position.set(x, 0.06, z);
      slab.receiveShadow = true;
      scene.add(slab);
    });
  });

  const lanternMaterial = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
  const lanternLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff4c0,
    emissive: 0xffd580,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  [
    [-6.2, -6.2],
    [6.2, -6.2],
    [-6.2, 6.3],
    [6.2, 6.3],
  ].forEach(([x, z]) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.42), lanternMaterial);
    base.position.set(x, 0.14, z);
    base.castShadow = true;
    scene.add(base);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.38, 0.34),
      lanternLightMaterial,
    );
    lamp.position.set(x, 0.46, z);
    lamp.castShadow = true;
    scene.add(lamp);
    registerObstacle(x, z, 0.24, 0.24);
  });

  addBambooCluster(world, -10.0, -4.8);
  addBambooCluster(world, -10.4, 4.9);
  addBambooCluster(world, 10.1, -4.6);
  addBambooCluster(world, 10.4, 5.2);
  addCypress(world, -8.7, 0.4, 1.05);
  addCypress(world, 8.6, 0.2, 1.0);

  resources.shadowCue = createSuShiShadowCue(0);
  scene.add(resources.shadowCue);
  return resources;
}
