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

  function buildGamingRoom() {
  const computers = [];
  const wallTex = getCachedTexture(textureCache.wall, "gaming", () => makeWallTexture("gaming"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x2d374f,
    roughness: 0.72,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x2f2b26, roughness: 0.7 });
  const monitorMat = new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.46 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x8ee7ff,
    emissive: 0x1d8cff,
    emissiveIntensity: 2.2,
    roughness: 0.25,
  });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x283348, roughness: 0.82 });
  const spots = [
    [-7.2, -6.7],
    [-3.6, -7.0],
    [0, -6.8],
    [3.7, -7.0],
    [7.3, -6.7],
    [-7.0, 7.0],
    [-3.4, 7.2],
    [0.4, 7.0],
    [3.8, 7.2],
    [7.1, 7.0],
  ];

  spots.forEach(([x, z], index) => {
    const flip = z > 0 ? Math.PI : 0;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.42, 0.88), deskMat);
    desk.position.set(x, 0.32, z);
    desk.rotation.y = flip;
    desk.castShadow = true;
    desk.receiveShadow = true;
    ctx.getScene().add(desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.5, 0.12), monitorMat);
    monitor.position.set(x, 0.92, z + (z > 0 ? -0.25 : 0.25));
    monitor.rotation.y = flip;
    monitor.castShadow = true;
    ctx.getScene().add(monitor);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), screenMat.clone());
    screen.position.set(x, 0.93, z + (z > 0 ? -0.32 : 0.32));
    screen.rotation.y = z > 0 ? 0 : Math.PI;
    ctx.getScene().add(screen);

    const glow = new THREE.PointLight(0x33aaff, 0.65, 4.4);
    glow.position.set(x, 1.2, z + (z > 0 ? -0.6 : 0.6));
    ctx.getScene().add(glow);

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.64), chairMat);
    chair.position.set(x + ((index % 2) * 0.28 - 0.14), 0.24, z + (z > 0 ? 0.95 : -0.95));
    chair.castShadow = true;
    chair.receiveShadow = true;
    ctx.getScene().add(chair);

    computers.push(new THREE.Vector3(x, 0, z + (z > 0 ? 1.2 : -1.2)));
  });

  setupGamingFlashlight();

  const bedMat = new THREE.MeshStandardMaterial({ color: 0x243448, roughness: 0.86 });
  const quiltMat = new THREE.MeshStandardMaterial({ color: 0x445a78, roughness: 0.92 });
  [-10.2, 10.2].forEach((x) => {
    [-5.2, 0.6, 6.3].forEach((z) => {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.38, 2.45), bedMat);
      bed.position.set(x, 0.22, z);
      bed.castShadow = true;
      bed.receiveShadow = true;
      ctx.getScene().add(bed);

      const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.18, 1.55), quiltMat);
      quilt.position.set(x, 0.52, z + 0.18);
      quilt.castShadow = true;
      ctx.getScene().add(quilt);
    });
  });
  return { computers };
}

const FLASHLIGHT_COLOR = 0xfff0c8;
const FLASHLIGHT_RADIUS = 22;
const FLASHLIGHT_HEIGHT = 2.8;
const FLASHLIGHT_SPEED = 1.45;
const FLASHLIGHT_INTENSITY = 36;
const FLASHLIGHT_DISTANCE = Math.hypot(FLASHLIGHT_RADIUS, FLASHLIGHT_HEIGHT) + 1.2;
const FLASHLIGHT_PENUMBRA = 0;
const FLASHLIGHT_DECAY = 0;
const FLASHLIGHT_SPOT_ANGLE = Math.atan(FLASHLIGHT_RADIUS / FLASHLIGHT_HEIGHT);

  function setupGamingFlashlight() {
  const start = randomFlashlightPoint();
  const spot = new THREE.SpotLight(
    FLASHLIGHT_COLOR,
    FLASHLIGHT_INTENSITY,
    FLASHLIGHT_DISTANCE,
    FLASHLIGHT_SPOT_ANGLE,
    FLASHLIGHT_PENUMBRA,
    FLASHLIGHT_DECAY,
  );
  spot.position.set(start.x, FLASHLIGHT_HEIGHT, start.z);
  spot.target.position.set(start.x, 0, start.z);
  spot.castShadow = false;
  ctx.getScene().add(spot);
  ctx.getScene().add(spot.target);
  ctx.getLevelState().flashlight = {
    spot,
    position: new THREE.Vector3(start.x, 0, start.z),
    target: new THREE.Vector3(start.x, 0, start.z),
    state: "patrol",
    pauseTimer: 0,
  };
}

  function randomFlashlightPoint() {
  let pos;
  let tries = 0;
  do {
    pos = new THREE.Vector3(ctx.randomRange(-8.6, 8.6), 0, ctx.randomRange(-7.6, 7.6));
    tries += 1;
  } while (tries < 30 && ctx.collidesWithObstacle(pos, FLASHLIGHT_RADIUS * 0.6));
  return pos;
}

  function updateFlashlight(dt) {
  const fl = ctx.getLevelState().flashlight;
  if (!fl) return;
  if (fl.state === "pause") {
    fl.pauseTimer -= dt;
    if (fl.pauseTimer <= 0) {
      fl.state = "patrol";
      fl.target.copy(randomFlashlightPoint());
    }
  } else {
    const dx = fl.target.x - fl.position.x;
    const dz = fl.target.z - fl.position.z;
    const dist = Math.hypot(dx, dz);
    const step = FLASHLIGHT_SPEED * dt;
    if (dist <= step || dist < 0.05) {
      fl.position.copy(fl.target);
      fl.state = "pause";
      fl.pauseTimer = ctx.randomRange(2.5, 5.0);
    } else {
      fl.position.x += (dx / dist) * step;
      fl.position.z += (dz / dist) * step;
    }
  }
  fl.spot.intensity = FLASHLIGHT_INTENSITY;
  fl.spot.position.set(fl.position.x, FLASHLIGHT_HEIGHT, fl.position.z);
  fl.spot.target.position.set(fl.position.x, 0, fl.position.z);
}

  function buildLibrary() {
  const wallTex = getCachedTexture(textureCache.wall, "library", () => makeWallTexture("library"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0xf0dfbf,
    roughness: 0.62,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x785a3a, roughness: 0.7 });
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x926c44, roughness: 0.68 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x3f6f7d, roughness: 0.78 });
  const bookColors = [0xb91c1c, 0x1d4ed8, 0x047857, 0xf59e0b, 0x7c3aed];

  [-9.5, -6.2, -2.9, 2.9, 6.2, 9.5].forEach((x) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.45, 0.65), shelfMat);
    shelf.position.set(x, 0.74, -9.2);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    ctx.getScene().add(shelf);
    for (let i = 0; i < 8; i += 1) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.44 + Math.random() * 0.22, 0.08),
        new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length], roughness: 0.82 }),
      );
      book.position.set(x - 0.84 + i * 0.24, 1.02, -8.82);
      ctx.getScene().add(book);
    }
  });

  [-10.2, 10.2].forEach((x) => {
    [-5.8, -2.5, 0.8, 4.1, 7.4].forEach((z) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.35, 2.2), shelfMat);
      shelf.position.set(x, 0.68, z);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      ctx.getScene().add(shelf);
      ctx.registerObstacle(x, z, 0.37, 1.1);
    });
  });

  [-9.5, -6.2, -2.9, 2.9, 6.2, 9.5].forEach((x) => {
    ctx.registerObstacle(x, -9.2, 1.1, 0.33);
  });

  // 两侧与后侧墙体碰撞（内缘与可视墙对齐）
  ctx.registerObstacle(-10.9, 0, 0.35, 10.6);
  ctx.registerObstacle(10.9, 0, 0.35, 10.6);
  ctx.registerObstacle(0, -10.9, 10.6, 0.35);

  const libraryTables = [
    [-3.4, -1.4],
    [3.4, -1.4],
    [-3.4, 2.4],
    [3.4, 2.4],
  ];
  libraryTables.forEach(([x, z]) => {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 1.35), tableMat);
    table.position.set(x, 0.38, z);
    table.castShadow = true;
    table.receiveShadow = true;
    ctx.getScene().add(table);
    ctx.registerObstacle(x, z, 1.35, 0.675);

    const lamp = new THREE.PointLight(0xffe0a8, 0.48, 5.2);
    lamp.position.set(x, 1.6, z);
    ctx.getScene().add(lamp);

    [-1, 1].forEach((side) => {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.58), chairMat);
      chair.position.set(x + side * 1.15, 0.26, z);
      chair.castShadow = true;
      chair.receiveShadow = true;
      ctx.getScene().add(chair);
    });
  });
}

  function buildTempleCourtyard(createShadowCue) {
  const resources = {
    moonPoint: new THREE.Vector3(0, 0, 0.15),
  };

  const wallTex = getCachedTexture(textureCache.wall, "temple", () => makeWallTexture("temple"));
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x92a3b4,
    roughness: 0.68,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(0, 11.8, Math.PI, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const moonLight = new THREE.PointLight(0xdbeafe, 1.15, 12.5);
  moonLight.position.set(0, 5.2, 0.1);
  ctx.getScene().add(moonLight);

  const moonDisk = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 36),
    new THREE.MeshBasicMaterial({ color: 0xf6f0c7, transparent: true, opacity: 0.92 }),
  );
  moonDisk.position.set(7.1, 5.0, -11.76);
  ctx.getScene().add(moonDisk);

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
  ctx.getScene().add(moonPool);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.45, 4.62, 64),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.033, 0.15);
  ctx.getScene().add(ring);

  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x12352f,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  for (let i = 0; i < 11; i += 1) {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(ctx.randomRange(0.18, 0.34), ctx.randomRange(5.8, 8.4)), shadowMat.clone());
    shadow.rotation.x = -Math.PI / 2;
    shadow.rotation.z = -0.62 + i * 0.075;
    shadow.position.set(-4.8 + i * 0.92, 0.041, -0.7 + Math.sin(i * 0.8) * 1.5);
    ctx.getScene().add(shadow);
  }

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f8190, roughness: 0.84 });
  [-8.8, -4.4, 4.4, 8.8].forEach((x) => {
    [-8.6, 8.7].forEach((z) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.92), stoneMat);
      slab.position.set(x, 0.06, z);
      slab.receiveShadow = true;
      ctx.getScene().add(slab);
    });
  });

  const lanternMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
  const lanternLightMat = new THREE.MeshStandardMaterial({
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
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.42), lanternMat);
    base.position.set(x, 0.14, z);
    base.castShadow = true;
    ctx.getScene().add(base);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.34), lanternLightMat);
    lamp.position.set(x, 0.46, z);
    lamp.castShadow = true;
    ctx.getScene().add(lamp);
    ctx.registerObstacle(x, z, 0.24, 0.24);
  });

  addBambooCluster(-10.0, -4.8);
  addBambooCluster(-10.4, 4.9);
  addBambooCluster(10.1, -4.6);
  addBambooCluster(10.4, 5.2);
  addCypress(-8.7, 0.4, 1.05);
  addCypress(8.6, 0.2, 1.0);

  resources.shadowCue = createShadowCue(0);
  ctx.getScene().add(resources.shadowCue);
  return resources;
}

  function addBambooCluster(x, z) {
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3f, roughness: 0.66 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8b54, roughness: 0.74 });
  for (let i = 0; i < 5; i += 1) {
    const offsetX = (i - 2) * 0.16;
    const offsetZ = Math.sin(i * 1.4) * 0.2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.8 + i * 0.12, 6), bambooMat);
    stem.position.set(x + offsetX, 1.4 + i * 0.04, z + offsetZ);
    stem.rotation.z = ctx.randomRange(-0.08, 0.08);
    stem.castShadow = true;
    ctx.getScene().add(stem);

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.055, 0.16), leafMat);
    leaf.position.set(x + offsetX * 1.4, 2.75 + i * 0.05, z + offsetZ);
    leaf.rotation.y = ctx.randomRange(-0.9, 0.9);
    leaf.rotation.z = ctx.randomRange(-0.2, 0.2);
    leaf.castShadow = true;
    ctx.getScene().add(leaf);
  }
  ctx.registerObstacle(x, z, 0.45, 0.48);
}

  function addCypress(x, z, scale) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x513b2c, roughness: 0.78 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f4d40, roughness: 0.7 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.17 * scale, 2.0 * scale, 8), trunkMat);
  trunk.position.set(x, 1.0 * scale, z);
  trunk.castShadow = true;
  ctx.getScene().add(trunk);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.78 * scale, 2.15 * scale, 12), leafMat);
  crown.position.set(x, 2.35 * scale, z);
  crown.castShadow = true;
  ctx.getScene().add(crown);
  ctx.registerObstacle(x, z, 0.55 * scale, 0.55 * scale);
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
    buildGamingRoom,
    buildLibrary,
    buildTempleCourtyard,
    buildBloodmoonStreet,
    baseLight: sun,
  }) ?? null;
}

  return {
    buildWorld,
    updateFlashlight,
  };
}
