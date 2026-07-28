import * as THREE from "three";
import {
  BLOODMOON_DECOY_CUES,
  BLOODMOON_LIGHTNING_INTERVAL,
  BLOODMOON_PHASE2_HP_MAX,
  BLOODMOON_SAFE_ZONE_COUNT,
} from "../config/constants.js";
import {
  getCachedTexture,
  makeFloorTexture,
  makeWallTexture,
  textureCache,
} from "./textures.js";

export function createWorldBuilder(ctx) {
  function addWall(x, z, rotationY, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 6.8), material);
  wall.position.set(x, 3.4, z);
  wall.rotation.y = rotationY;
  wall.receiveShadow = true;
  ctx.getScene().add(wall);
}

  function buildBloodmoonStreet(baseLight, createClawCue) {
  const resources = {
    lightningTimer: ctx.randomRange(BLOODMOON_LIGHTNING_INTERVAL[0], BLOODMOON_LIGHTNING_INTERVAL[1]),
    lightningFlash: 0,
    clueTimer: 0,
    revealCount: 0,
    targetCue: createClawCue(0),
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
    nextNpcId: ctx.getMatchNpcCount(),
    baseLight,
    lightningLight: null,
    lightningBolts: [],
    moonMaterial: null,
  };

  const wallTex = getCachedTexture(textureCache.wall, "bloodmoon", () => makeWallTexture("bloodmoon"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x5f111b,
    roughness: 0.76,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(0, 11.8, Math.PI, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const lightningLight = new THREE.PointLight(0xdbeafe, 0, 28);
  lightningLight.position.set(-3, 9.4, -2);
  ctx.getScene().add(lightningLight);
  resources.lightningLight = lightningLight;

  resources.lightningBolts = [
    ctx.createLightningBolt(-5.4, -11.72, 1.25, 4.9, 0.22),
    ctx.createLightningBolt(1.4, -11.73, 1.6, 5.5, -0.12),
    ctx.createLightningBolt(5.4, -11.74, 1.1, 4.2, 0.34),
  ];
  resources.lightningBolts.forEach((bolt) => {
    bolt.visible = false;
    ctx.getScene().add(bolt);
  });

  for (let i = 0; i < BLOODMOON_DECOY_CUES; i += 1) {
    const cue = createClawCue(0);
    cue.userData.isDecoyCue = true;
    cue.userData.decoyNpc = null;
    cue.userData.decoyCompleteness = 0.45;
    resources.decoyCues.push(cue);
    ctx.getScene().add(cue);
  }

  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xd41f2f, transparent: true, opacity: 0.88 });
  const moonDisk = new THREE.Mesh(new THREE.CircleGeometry(1.35, 48), moonMaterial);
  moonDisk.position.set(7.2, 5.25, -11.75);
  ctx.getScene().add(moonDisk);
  resources.moonMaterial = moonMaterial;

  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 48),
    new THREE.MeshBasicMaterial({ color: 0x7f1018, transparent: true, opacity: 0.26, depthWrite: false }),
  );
  moonHalo.position.set(7.2, 5.25, -11.77);
  ctx.getScene().add(moonHalo);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.34, metalness: 0.1 });
  const road = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.045, 24), roadMat);
  road.position.set(0, 0.025, 0);
  road.receiveShadow = true;
  ctx.getScene().add(road);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffc9c9, transparent: true, opacity: 0.18 });
  for (let z = -8.8; z <= 8.8; z += 3.2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 1.45), lineMat);
    line.position.set(0, 0.066, z);
    ctx.getScene().add(line);
  }

  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x171018, roughness: 0.86 });
  const windowMat = new THREE.MeshStandardMaterial({
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
  ].forEach(([x, z, w, d, h], index) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
    block.position.set(x, h / 2, z);
    block.castShadow = true;
    block.receiveShadow = true;
    ctx.getScene().add(block);
    ctx.registerObstacle(x, z, w / 2, d / 2);

    for (let i = 0; i < 3; i += 1) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.035), windowMat.clone());
      window.position.set(x + (x < 0 ? w / 2 + 0.02 : -w / 2 - 0.02), 0.85 + i * 0.72, z - d * 0.24 + (index % 2) * 0.42);
      window.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      ctx.getScene().add(window);
    }
  });

  const puddleMat = new THREE.MeshStandardMaterial({
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
  ].forEach(([x, z, sx, sz, rz]) => {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), puddleMat.clone());
    puddle.rotation.x = -Math.PI / 2;
    puddle.rotation.z = rz;
    puddle.scale.set(sx, sz, 1);
    puddle.position.set(x, 0.071, z);
    ctx.getScene().add(puddle);
  });

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x23212a, roughness: 0.7 });
  const lampGlowMat = new THREE.MeshStandardMaterial({
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
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.1, 8), lampMat);
    pole.position.set(x, 1.05, z);
    pole.castShadow = true;
    ctx.getScene().add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.34), lampGlowMat.clone());
    head.position.set(x, 2.18, z);
    ctx.getScene().add(head);
    const glow = new THREE.PointLight(0xff3347, 0.65, 5);
    glow.position.set(x, 2.2, z);
    ctx.getScene().add(glow);
    ctx.registerObstacle(x, z, 0.18, 0.18);
  });

  ctx.getScene().add(resources.targetCue);

  for (let i = 0; i < BLOODMOON_SAFE_ZONE_COUNT; i += 1) {
    const safeZoneMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const safeZoneMesh = new THREE.Mesh(new THREE.CircleGeometry(2.35, 48), safeZoneMat);
    safeZoneMesh.rotation.x = -Math.PI / 2;
    safeZoneMesh.position.y = 0.105;
    safeZoneMesh.renderOrder = 14;
    safeZoneMesh.visible = false;
    ctx.getScene().add(safeZoneMesh);

    const safeZoneRing = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.45, 48),
      new THREE.MeshBasicMaterial({ color: 0xbbf7d0, transparent: true, opacity: 0, depthWrite: false }),
    );
    safeZoneRing.rotation.x = -Math.PI / 2;
    safeZoneRing.position.y = 0.112;
    safeZoneRing.renderOrder = 15;
    safeZoneRing.visible = false;
    ctx.getScene().add(safeZoneRing);
    resources.safeZoneVisuals.push({ mesh: safeZoneMesh, ring: safeZoneRing });
  }
  return resources;
}

  function buildWorld(level) {
  const profile = level.worldProfile ?? {};
  const isNight = level.lighting === "night";
  const background = profile.background ?? (isNight ? 0x0c1320 : 0xb9d6e7);
  const fog = profile.fog ?? {
    color: isNight ? 0x0c1320 : 0xc8e3f0,
    near: 16,
    far: 35,
  };
  const hemisphere = profile.hemisphere ?? {
    sky: isNight ? 0x3a4d6b : 0xffffff,
    ground: isNight ? 0x0a0e16 : 0xa98f6b,
    intensity: isNight ? 1.2 : 1.42,
  };
  const directional = profile.directional ?? {
    color: isNight ? 0x9fc4ff : 0xfff7d6,
    intensity: isNight ? 1.3 : 1.65,
  };
  const floorProfile = profile.floor ?? {};
  ctx.getScene().background = new THREE.Color(background);
  ctx.getScene().fog = new THREE.Fog(fog.color, fog.near, fog.far);

  const hemi = new THREE.HemisphereLight(
    hemisphere.sky,
    hemisphere.ground,
    hemisphere.intensity,
  );
  ctx.getScene().add(hemi);

  const ambientProfile = profile.ambient
    ?? (isNight ? { color: 0x4466aa, intensity: 0.35 } : null);
  if (ambientProfile) {
    const ambient = new THREE.AmbientLight(ambientProfile.color, ambientProfile.intensity);
    ctx.getScene().add(ambient);
  }

  const sun = new THREE.DirectionalLight(
    directional.color,
    directional.intensity,
  );
  sun.position.set(-5, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  ctx.getScene().add(sun);

  const mapId = floorProfile.texture ?? level.id;
  const floorTex = getCachedTexture(textureCache.floor, mapId, () => makeFloorTexture(mapId));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: floorProfile.roughness ?? 0.78,
      metalness: 0.02,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  ctx.getScene().add(floor);

  ctx.getLevelState().sceneData = level.extensions?.createWorld?.({
    THREE,
    scene: ctx.getScene(),
    state: ctx.getLevelState(),
    registerObstacle: ctx.registerObstacle,
    randomRange: ctx.randomRange,
    addWall,
    collidesWithObstacle: ctx.collidesWithObstacle,
    textures: {
      getWallTexture: (id) => getCachedTexture(
        textureCache.wall,
        id,
        () => makeWallTexture(id),
      ),
    },
    buildBloodmoonStreet,
    baseLight: sun,
  }) ?? null;
}

  return {
    buildWorld,
  };
}
