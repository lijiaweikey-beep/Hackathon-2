import { createBloodmoonClawCue } from "../../entities/bloodmoonCues.js";
import {
  BLOODMOON_DECOY_CUES,
  BLOODMOON_LIGHTNING_INTERVAL,
  BLOODMOON_PHASE2_HP_MAX,
  BLOODMOON_SAFE_ZONE_COUNT,
} from "./constants.js";

function createResources(world) {
  const {
    randomRange,
    baseLight,
    npcCount,
  } = world;
  return {
    lightningTimer: randomRange(
      BLOODMOON_LIGHTNING_INTERVAL[0],
      BLOODMOON_LIGHTNING_INTERVAL[1],
    ),
    lightningFlash: 0,
    clueTimer: 0,
    revealCount: 0,
    targetCue: createBloodmoonClawCue(0),
    decoyCues: [],
    mode: "phase1",
    huntTimer: 0,
    safeZones: [],
    safeZoneVisuals: [],
    safeZoneRadius: 2.35,
    cutsceneTimer: 0,
    huntBriefingShown: false,
    bossHp: BLOODMOON_PHASE2_HP_MAX,
    summonWave: 0,
    nextNpcId: npcCount,
    baseLight,
    lightningLight: null,
    lightningBolts: [],
    moonMaterial: null,
  };
}

export function createWorld(world) {
  const {
    THREE,
    scene,
    addWall,
    createLightningBolt,
    registerObstacle,
    textures,
  } = world;
  const resources = createResources(world);

  const wallMaterial = new THREE.MeshStandardMaterial({
    map: textures.getWallTexture("bloodmoon"),
    color: 0x5f111b,
    roughness: 0.76,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(0, 11.8, Math.PI, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const lightningLight = new THREE.PointLight(0xdbeafe, 0, 28);
  lightningLight.position.set(-3, 9.4, -2);
  scene.add(lightningLight);
  resources.lightningLight = lightningLight;

  resources.lightningBolts = [
    createLightningBolt(-5.4, -11.72, 1.25, 4.9, 0.22),
    createLightningBolt(1.4, -11.73, 1.6, 5.5, -0.12),
    createLightningBolt(5.4, -11.74, 1.1, 4.2, 0.34),
  ];
  resources.lightningBolts.forEach((bolt) => {
    bolt.visible = false;
    scene.add(bolt);
  });

  for (let index = 0; index < BLOODMOON_DECOY_CUES; index += 1) {
    const cue = createBloodmoonClawCue(0);
    cue.userData.isDecoyCue = true;
    cue.userData.decoyNpc = null;
    cue.userData.decoyCompleteness = 0.45;
    resources.decoyCues.push(cue);
    scene.add(cue);
  }

  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xd41f2f,
    transparent: true,
    opacity: 0.88,
  });
  const moonDisk = new THREE.Mesh(new THREE.CircleGeometry(1.35, 48), moonMaterial);
  moonDisk.position.set(7.2, 5.25, -11.75);
  scene.add(moonDisk);
  resources.moonMaterial = moonMaterial;

  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 48),
    new THREE.MeshBasicMaterial({
      color: 0x7f1018,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    }),
  );
  moonHalo.position.set(7.2, 5.25, -11.77);
  scene.add(moonHalo);

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x111116,
    roughness: 0.34,
    metalness: 0.1,
  });
  const road = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.045, 24), roadMaterial);
  road.position.set(0, 0.025, 0);
  road.receiveShadow = true;
  scene.add(road);

  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc9c9,
    transparent: true,
    opacity: 0.18,
  });
  for (let z = -8.8; z <= 8.8; z += 3.2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 1.45), lineMaterial);
    line.position.set(0, 0.066, z);
    scene.add(line);
  }

  const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x171018, roughness: 0.86 });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f0b14,
    emissive: 0x7f1018,
    emissiveIntensity: 0.42,
    roughness: 0.42,
  });
  [
    [-8.5, -6.8, 2.3, 3.7, 3.2],
    [-8.8, -1.2, 2.0, 3.1, 2.8],
    [-8.1, 4.7, 2.7, 4.0, 3.6],
    [8.4, -5.8, 2.6, 3.4, 3.4],
    [8.8, 0.0, 2.1, 3.9, 3.0],
    [8.0, 6.0, 2.8, 3.2, 3.8],
  ].forEach(([x, z, width, depth, height], buildingIndex) => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      buildingMaterial,
    );
    block.position.set(x, height / 2, z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    registerObstacle(x, z, width / 2, depth / 2);

    for (let index = 0; index < 3; index += 1) {
      const window = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.42, 0.035),
        windowMaterial.clone(),
      );
      window.position.set(
        x + (x < 0 ? width / 2 + 0.02 : -width / 2 - 0.02),
        0.85 + index * 0.72,
        z - depth * 0.24 + (buildingIndex % 2) * 0.42,
      );
      window.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(window);
    }
  });

  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: 0x5e1018,
    emissive: 0x33040a,
    emissiveIntensity: 0.24,
    roughness: 0.16,
    metalness: 0.28,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });
  [
    [-3.9, -6.4, 1.2, 0.44, 0.24],
    [3.6, -2.6, 1.4, 0.52, -0.38],
    [-3.4, 2.8, 1.0, 0.38, 0.7],
    [3.9, 6.3, 1.45, 0.5, -0.2],
  ].forEach(([x, z, scaleX, scaleZ, rotationZ]) => {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), puddleMaterial.clone());
    puddle.rotation.x = -Math.PI / 2;
    puddle.rotation.z = rotationZ;
    puddle.scale.set(scaleX, scaleZ, 1);
    puddle.position.set(x, 0.071, z);
    scene.add(puddle);
  });

  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0x23212a, roughness: 0.7 });
  const lampGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd3d3,
    emissive: 0xff2a3d,
    emissiveIntensity: 1.1,
    roughness: 0.35,
  });
  [
    [-5.1, -8.0],
    [5.1, -4.1],
    [-5.1, 1.2],
    [5.1, 5.9],
  ].forEach(([x, z]) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 2.1, 8),
      lampMaterial,
    );
    pole.position.set(x, 1.05, z);
    pole.castShadow = true;
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.34), lampGlowMaterial.clone());
    head.position.set(x, 2.18, z);
    scene.add(head);
    const glow = new THREE.PointLight(0xff3347, 0.65, 5);
    glow.position.set(x, 2.2, z);
    scene.add(glow);
    registerObstacle(x, z, 0.18, 0.18);
  });

  scene.add(resources.targetCue);

  for (let index = 0; index < BLOODMOON_SAFE_ZONE_COUNT; index += 1) {
    const safeZoneMesh = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 48),
      new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    safeZoneMesh.rotation.x = -Math.PI / 2;
    safeZoneMesh.position.y = 0.105;
    safeZoneMesh.renderOrder = 14;
    safeZoneMesh.visible = false;
    scene.add(safeZoneMesh);

    const safeZoneRing = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.45, 48),
      new THREE.MeshBasicMaterial({
        color: 0xbbf7d0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    safeZoneRing.rotation.x = -Math.PI / 2;
    safeZoneRing.position.y = 0.112;
    safeZoneRing.renderOrder = 15;
    safeZoneRing.visible = false;
    scene.add(safeZoneRing);
    resources.safeZoneVisuals.push({ mesh: safeZoneMesh, ring: safeZoneRing });
  }
  return resources;
}
