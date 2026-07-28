import {
  FLASHLIGHT_COLOR,
  FLASHLIGHT_DECAY,
  FLASHLIGHT_DISTANCE,
  FLASHLIGHT_HEIGHT,
  FLASHLIGHT_INTENSITY,
  FLASHLIGHT_PENUMBRA,
  FLASHLIGHT_RADIUS,
  FLASHLIGHT_SPEED,
  FLASHLIGHT_SPOT_ANGLE,
} from "./constants.js";

export function createWorld(world) {
  const {
    THREE,
    scene,
    addWall,
    collidesWithObstacle,
    randomRange,
  } = world;
  const computers = [];
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
    scene.add(desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.5, 0.12), monitorMat);
    monitor.position.set(x, 0.92, z + (z > 0 ? -0.25 : 0.25));
    monitor.rotation.y = flip;
    monitor.castShadow = true;
    scene.add(monitor);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), screenMat.clone());
    screen.position.set(x, 0.93, z + (z > 0 ? -0.32 : 0.32));
    screen.rotation.y = z > 0 ? 0 : Math.PI;
    scene.add(screen);

    const glow = new THREE.PointLight(0x33aaff, 0.65, 4.4);
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
  [-10.2, 10.2].forEach((x) => {
    [-5.2, 0.6, 6.3].forEach((z) => {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.38, 2.45), bedMat);
      bed.position.set(x, 0.22, z);
      bed.castShadow = true;
      bed.receiveShadow = true;
      scene.add(bed);

      const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.18, 1.55), quiltMat);
      quilt.position.set(x, 0.52, z + 0.18);
      quilt.castShadow = true;
      scene.add(quilt);
    });
  });

  function randomFlashlightPoint() {
    let position;
    let tries = 0;
    do {
      position = new THREE.Vector3(randomRange(-8.6, 8.6), 0, randomRange(-7.6, 7.6));
      tries += 1;
    } while (tries < 30 && collidesWithObstacle(position, FLASHLIGHT_RADIUS * 0.6));
    return position;
  }

  function createFlashlight() {
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
    flashlight.spot.intensity = FLASHLIGHT_INTENSITY;
    flashlight.spot.position.set(flashlight.position.x, FLASHLIGHT_HEIGHT, flashlight.position.z);
    flashlight.spot.target.position.set(flashlight.position.x, 0, flashlight.position.z);
  }

  return { computers, updateEnvironment };
}
