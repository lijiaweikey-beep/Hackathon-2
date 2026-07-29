import {
  BED_LAYOUT,
  FLASHLIGHT_COLOR,
  FLASHLIGHT_DECAY,
  FLASHLIGHT_DISTANCE,
  FLASHLIGHT_HEIGHT,
  FLASHLIGHT_INTENSITY,
  FLASHLIGHT_PENUMBRA,
  FLASHLIGHT_RADIUS,
  FLASHLIGHT_SPEED,
  FLASHLIGHT_SPOT_ANGLE,
  TUTORIAL_COMPUTER_INDEX,
} from "./constants.js";

export function createWorld(world) {
  const {
    THREE,
    scene,
    addWall,
    collidesWithObstacle,
    registerObstacle,
    randomRange,
  } = world;
  const computers = [];
  const bedSpots = BED_LAYOUT.map((bed) => ({ ...bed }));
  const wallTex = world.textures.getWallTexture("gaming");
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
  // 仅保留两侧靠墙电脑位，中间过道清空，降低新手认知负荷
  const spots = [
    [-7.2, -6.7],
    [-3.6, -7.0],
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
    scene.add(desk);
    registerObstacle(x, z, 1.05, 0.5);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.5, 0.12), monitorMat);
    monitor.position.set(x, 0.92, z + (z > 0 ? -0.25 : 0.25));
    monitor.rotation.y = flip;
    monitor.castShadow = true;
    scene.add(monitor);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), screenMat.clone());
    screen.position.set(x, 0.93, z + (z > 0 ? -0.32 : 0.32));
    screen.rotation.y = z > 0 ? 0 : Math.PI;
    // 教学目标电脑更亮
    if (index === TUTORIAL_COMPUTER_INDEX) {
      screen.material.emissiveIntensity = 3.4;
      screen.material.color.setHex(0xb8f0ff);
    } else {
      screen.material.emissiveIntensity = 0.35;
      screen.material.color.setHex(0x1a3048);
    }
    scene.add(screen);

    const glow = new THREE.PointLight(
      0x33aaff,
      index === TUTORIAL_COMPUTER_INDEX ? 1.15 : 0.18,
      index === TUTORIAL_COMPUTER_INDEX ? 5.2 : 2.4,
    );
    glow.position.set(x, 1.2, z + (z > 0 ? -0.6 : 0.6));
    scene.add(glow);

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.64), chairMat);
    chair.position.set(x + ((index % 2) * 0.28 - 0.14), 0.24, z + (z > 0 ? 0.95 : -0.95));
    chair.castShadow = true;
    chair.receiveShadow = true;
    scene.add(chair);

    computers.push(new THREE.Vector3(x, 0, z + (z > 0 ? 1.2 : -1.2)));
  });

  const flashlight = createFlashlight();
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x243448, roughness: 0.86 });
  const quiltMat = new THREE.MeshStandardMaterial({ color: 0x445a78, roughness: 0.92 });
  bedSpots.forEach(({ x, z }) => {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.38, 2.45), bedMat);
    bed.position.set(x, 0.22, z);
    bed.castShadow = true;
    bed.receiveShadow = true;
    scene.add(bed);
    registerObstacle(x, z, 0.75, 1.25);

    const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.18, 1.55), quiltMat);
    quilt.position.set(x, 0.52, z + 0.18);
    quilt.castShadow = true;
    scene.add(quilt);
  });

  const waypointGroup = new THREE.Group();
  waypointGroup.visible = false;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 1.05, 48),
    new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff00,
      emissiveIntensity: 2.4,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.renderOrder = 20;
  waypointGroup.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 40),
    new THREE.MeshBasicMaterial({
      color: 0x22ff99,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.06;
  disc.renderOrder = 19;
  waypointGroup.add(disc);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.48, 5),
    new THREE.MeshStandardMaterial({
      color: 0x86efac,
      emissive: 0x22c55e,
      emissiveIntensity: 1.8,
    }),
  );
  arrow.position.y = 1.35;
  arrow.rotation.x = Math.PI;
  waypointGroup.add(arrow);
  scene.add(waypointGroup);

  const fanMesh = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 32, 0, Math.PI / 6),
    new THREE.MeshBasicMaterial({
      color: 0xff3355,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  fanMesh.rotation.x = -Math.PI / 2;
  fanMesh.position.y = 0.09;
  fanMesh.visible = false;
  fanMesh.renderOrder = 21;
  scene.add(fanMesh);

  function randomFlashlightPoint() {
    let position;
    let tries = 0;
    do {
      position = new THREE.Vector3(randomRange(-8.6, 8.6), 0, randomRange(-4.2, 7.6));
      tries += 1;
    } while (tries < 30 && collidesWithObstacle(position, FLASHLIGHT_RADIUS * 0.6));
    return position;
  }

  function createFlashlight() {
    const start = randomFlashlightPoint();
    const spot = new THREE.SpotLight(
      FLASHLIGHT_COLOR,
      FLASHLIGHT_INTENSITY * 0.55,
      FLASHLIGHT_DISTANCE,
      FLASHLIGHT_SPOT_ANGLE,
      FLASHLIGHT_PENUMBRA,
      FLASHLIGHT_DECAY,
    );
    spot.position.set(start.x, FLASHLIGHT_HEIGHT, start.z);
    spot.target.position.set(start.x, 0, start.z);
    spot.castShadow = false;
    scene.add(spot);
    scene.add(spot.target);
    return {
      spot,
      position: new THREE.Vector3(start.x, 0, start.z),
      target: new THREE.Vector3(start.x, 0, start.z),
      state: "patrol",
      pauseTimer: 0,
    };
  }

  function updateEnvironment(deltaSeconds) {
    if (flashlight.state === "pause") {
      flashlight.pauseTimer -= deltaSeconds;
      if (flashlight.pauseTimer <= 0) {
        flashlight.state = "patrol";
        flashlight.target.copy(randomFlashlightPoint());
      }
    } else {
      const dx = flashlight.target.x - flashlight.position.x;
      const dz = flashlight.target.z - flashlight.position.z;
      const distance = Math.hypot(dx, dz);
      const step = FLASHLIGHT_SPEED * deltaSeconds;
      if (distance <= step || distance < 0.05) {
        flashlight.position.copy(flashlight.target);
        flashlight.state = "pause";
        flashlight.pauseTimer = randomRange(2.5, 5);
      } else {
        flashlight.position.x += (dx / distance) * step;
        flashlight.position.z += (dz / distance) * step;
      }
    }
    flashlight.spot.intensity = FLASHLIGHT_INTENSITY * 0.55;
    flashlight.spot.position.set(flashlight.position.x, FLASHLIGHT_HEIGHT, flashlight.position.z);
    flashlight.spot.target.position.set(flashlight.position.x, 0, flashlight.position.z);

    if (waypointGroup.visible) {
      ring.rotation.z += deltaSeconds * 0.7;
      arrow.position.y = 1.35 + Math.sin(performance.now() * 0.004) * 0.16;
    }
  }

  return {
    computers,
    bedSpots,
    waypointGroup,
    fanMesh,
    updateEnvironment,
  };
}
