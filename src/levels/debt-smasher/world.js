function addBox(THREE, scene, size, color, position, gameplayRole) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (gameplayRole) mesh.userData.gameplayRole = gameplayRole;
  scene.add(mesh);
  return mesh;
}

function createPressShape(THREE, debtKind) {
  const group = new THREE.Group();
  if (debtKind === "car-loan") {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6f86a8, roughness: 0.62 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x8ee7ff, emissive: 0x1d8cff, emissiveIntensity: 0.8, roughness: 0.28 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.58 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.48, 1.12), bodyMat);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.46, 0.92), bodyMat);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.26, 0.06), windowMat);
    const wheelA = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10), wheelMat);
    const wheelB = wheelA.clone();
    cab.position.y = 0.42;
    windshield.position.set(0.12, 0.48, 0.5);
    wheelA.rotation.z = Math.PI / 2;
    wheelB.rotation.z = Math.PI / 2;
    wheelA.position.set(-0.72, -0.34, 0.48);
    wheelB.position.set(0.72, -0.34, 0.48);
    group.add(body, cab, windshield, wheelA, wheelB);
  } else {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x506684, roughness: 0.7 });
    const litMat = new THREE.MeshStandardMaterial({ color: 0x8ee7ff, emissive: 0x1d8cff, emissiveIntensity: 0.65, roughness: 0.3 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1b2435, roughness: 0.78 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 1.55), wallMat);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.22, 0.56, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.9;
    [-0.42, 0.42].forEach((x) => {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.06), litMat);
      window.position.set(x, 0.3, 0.8);
      group.add(window);
    });
    group.add(tower, roof);
  }
  group.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

function createConveyorLine(THREE, scene, config, laneIndex) {
  const { x, z, orientation } = config;
  const isHorizontal = orientation === "horizontal";
  const direction = laneIndex % 2 === 0 ? 1 : -1;
  const belt = addBox(
    THREE,
    scene,
    isHorizontal ? [20.6, 0.12, 1.28] : [1.28, 0.12, 17.2],
    0x6d829c,
    [x, 0.08, z],
    "conveyor-belt",
  );
  const railMat = new THREE.MeshStandardMaterial({ color: 0xe0e7ef, roughness: 0.5 });
  const cargoMat = [
    new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.62 }),
    new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.56 }),
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.62 }),
    new THREE.MeshStandardMaterial({ color: 0xfca5a5, roughness: 0.58 }),
  ][laneIndex];
  const rails = [-0.76, 0.76].map((offset) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(...(isHorizontal ? [20.7, 0.22, 0.08] : [0.08, 0.22, 17.3])),
      railMat,
    );
    rail.position.set(x + (isHorizontal ? 0 : offset), 0.24, z + (isHorizontal ? offset : 0));
    rail.castShadow = true;
    rail.receiveShadow = true;
    rail.userData.gameplayRole = "conveyor-rail";
    scene.add(rail);
    return rail;
  });
  const rollerStops = isHorizontal
    ? [-9.4, -6.3, -3.2, -0.1, 3, 6.1, 9.2]
    : [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  const rollers = rollerStops.map((offset) => {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, isHorizontal ? 1.18 : 1.18, 12),
      railMat,
    );
    roller.rotation.z = isHorizontal ? 0 : Math.PI / 2;
    roller.position.set(x + (isHorizontal ? offset : 0), 0.23, z + (isHorizontal ? 0 : offset));
    roller.castShadow = true;
    roller.receiveShadow = true;
    roller.userData.gameplayRole = "conveyor-roller";
    scene.add(roller);
    return roller;
  });
  const cargoStops = isHorizontal ? [-8.8, -3.1, 2.9, 8.4] : [-7, -2.4, 2.2, 6.8];
  const cargos = cargoStops.map((offset, index) => {
    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(index % 2 ? 0.62 : 0.82, 0.42, index % 2 ? 0.5 : 0.68),
      cargoMat.clone(),
    );
    cargo.position.set(
      x + (isHorizontal ? offset : index % 2 ? -0.22 : 0.22),
      0.48,
      z + (isHorizontal ? index % 2 ? -0.18 : 0.18 : offset),
    );
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    cargo.userData = {
      gameplayRole: "conveyor-cargo",
      orientation,
      direction,
      speed: 1.08 + laneIndex * 0.18,
    };
    scene.add(cargo);
    return cargo;
  });
  return { belt, rails, rollers, cargos, direction };
}

function addFactoryMarkers(THREE, scene) {
  [-11, 11].forEach((x) => {
    addBox(THREE, scene, [0.18, 0.18, 16.5], 0x64748b, [x, 0.82, 0], "factory-pipe");
  });
  [-8.2, -2.7, 2.7, 8.2].forEach((x, index) => {
    addBox(THREE, scene, [1.45, 0.035, 0.18], index % 2 ? 0x111827 : 0xfacc15, [x, 0.08, -10.2], "hazard-stripe");
    addBox(THREE, scene, [1.45, 0.035, 0.18], index % 2 ? 0xfacc15 : 0x111827, [x, 0.08, 9.8], "hazard-stripe");
  });
}

function addFactoryLight(THREE, scene, x, z) {
  const light = new THREE.PointLight(0xffffff, 0.95, 9);
  light.position.set(x, 3.7, z);
  scene.add(light);
  return { light };
}

function createMachine(THREE, scene, x, z, index, debtKind, registerObstacle) {
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.68, 1.68, 0.08, 28),
    new THREE.MeshStandardMaterial({ color: 0x6b7f98, emissive: 0x000000, roughness: 0.58 }),
  );
  pad.position.set(x, 0.055, z);
  scene.add(pad);

  const press = createPressShape(THREE, debtKind);
  press.position.set(x, 4.45, z);
  scene.add(press);

  const postX = x < 0 ? x - 2.1 : x + 2.1;
  addBox(THREE, scene, [0.32, 5.3, 0.32], 0x394a61, [postX, 2.65, z], "machine-post");
  addBox(THREE, scene, [2.25, 0.28, 0.28], 0x394a61, [(postX + x) / 2, 5.25, z], "machine-arm");
  registerObstacle?.(postX, z, 0.28, 0.28);
  return { x, z, radius: 1.68, debtKind, pad, press, phase: "idle", timer: 1.25 + index * 0.7 };
}

export function createWorld(world) {
  const { THREE, scene, addWall, registerObstacle } = world;
  const coinBursts = [];
  const wallTex = world.textures.getWallTexture("gaming");
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x92a9c2,
    roughness: 0.62,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const factoryFloor = addBox(THREE, scene, [25.6, 0.03, 22.6], 0xb9c9d8, [0, 0.018, -0.2], "factory-floor");
  factoryFloor.receiveShadow = true;
  const lights = [
    [-7.8, -8.2],
    [7.8, -8.2],
    [-7.8, 8.1],
    [7.8, 8.1],
  ].map(([x, z]) => addFactoryLight(THREE, scene, x, z));

  [-10.6, -3.6, 3.6, 10.6].forEach((x) => {
    addBox(THREE, scene, [0.34, 4.4, 0.34], 0x6f8298, [x, 2.2, -8.8], "factory-column");
  });
  [-10.6, 10.6].forEach((x) => {
    addBox(THREE, scene, [0.34, 4.4, 0.34], 0x6f8298, [x, 2.2, 8.4], "factory-column");
  });
  [-7.1, 0, 7.1].forEach((x) => {
    addBox(THREE, scene, [5.8, 0.22, 0.28], 0x8ca4bd, [x, 4.65, -8.8], "factory-beam");
  });
  const collector = addBox(THREE, scene, [2.4, 0.22, 0.72], 0xd69e10, [0, 0.2, -8.4], "coin-collector");
  const collectorGlow = new THREE.PointLight(0xfacc15, 1.35, 7);
  collectorGlow.position.set(0, 1.2, -8.4);
  scene.add(collectorGlow);
  addFactoryMarkers(THREE, scene);

  const conveyors = [
    { x: 0, z: -9.15, orientation: "horizontal" },
    { x: 0, z: 8.95, orientation: "horizontal" },
    { x: -10.65, z: 0, orientation: "vertical" },
    { x: 10.65, z: 0, orientation: "vertical" },
  ].map((config, index) => createConveyorLine(THREE, scene, config, index));
  const playBounds = { minX: -9.2, maxX: 9.2, minZ: -7.4, maxZ: 7.4 };

  const machines = [
    [-7.5, -3.8, "car-loan"],
    [7.5, -3.8, "mortgage"],
    [-7.5, 3.8, "mortgage"],
    [7.5, 3.8, "car-loan"],
  ].map(([x, z, debtKind], index) =>
    createMachine(THREE, scene, x, z, index, debtKind, registerObstacle));

  function createCoinBurst({ position, debtType, coins }) {
    const coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x8a5a00,
      emissiveIntensity: 0.55,
      metalness: 0.55,
      roughness: 0.42,
    });
    const burst = {
      coins: Array.from({ length: coins }, (_, index) => {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 12), coinMaterial.clone());
        const angle = (index / Math.max(1, coins)) * Math.PI * 2;
        coin.rotation.x = Math.PI / 2;
        coin.position.set(
          position.x + Math.cos(angle) * 0.32,
          0.65 + index * 0.04,
          position.z + Math.sin(angle) * 0.32,
        );
        coin.userData = {
          gameplayRole: "coin",
          collectProgress: 0,
          start: coin.position.clone(),
          delay: index * 0.05,
        };
        scene.add(coin);
        return coin;
      }),
    };
    coinBursts.push(burst);
    return burst;
  }

  function updateCoinBursts(deltaSeconds) {
    const target = collector.position;
    for (let burstIndex = coinBursts.length - 1; burstIndex >= 0; burstIndex -= 1) {
      const burst = coinBursts[burstIndex];
      burst.coins.forEach((coin) => {
        coin.userData.delay = Math.max(0, coin.userData.delay - deltaSeconds);
        if (coin.userData.delay > 0) return;
        coin.userData.collectProgress = Math.min(1, coin.userData.collectProgress + deltaSeconds * 1.35);
        const progress = coin.userData.collectProgress;
        coin.position.lerpVectors(coin.userData.start, target, progress);
        coin.position.y += Math.sin(progress * Math.PI) * 1.8 + 0.15;
        coin.rotation.z += deltaSeconds * 8;
        coin.visible = progress < 1;
      });
      if (burst.coins.every((coin) => coin.userData.collectProgress >= 1)) {
        burst.coins.forEach((coin) => scene.remove(coin));
        coinBursts.splice(burstIndex, 1);
      }
    }
  }

  function updateConveyors(deltaSeconds) {
    conveyors.forEach((conveyor) => {
      conveyor.rollers.forEach((roller) => {
        roller.rotation.x += deltaSeconds * 5.5 * conveyor.direction;
      });
      conveyor.cargos.forEach((cargo) => {
        if (cargo.userData.orientation === "horizontal") {
          cargo.position.x += cargo.userData.speed * cargo.userData.direction * deltaSeconds;
          if (cargo.position.x > 9.8) cargo.position.x = -9.8;
          if (cargo.position.x < -9.8) cargo.position.x = 9.8;
        } else {
          cargo.position.z += cargo.userData.speed * cargo.userData.direction * deltaSeconds;
          if (cargo.position.z > 7.6) cargo.position.z = -7.6;
          if (cargo.position.z < -7.6) cargo.position.z = 7.6;
        }
      });
    });
  }

  function updateEnvironment(deltaSeconds) {
    machines.forEach((machine) => {
      if (machine.phase === "warning") {
        machine.pad.material.color.set(0xef4444);
        machine.pad.material.emissive.set(0x5b0b0b);
      } else {
        machine.pad.material.color.set(0x6b7f98);
        machine.pad.material.emissive.set(0x000000);
      }
      if (machine.phase === "smash") machine.press.position.y = 0.62;
      else machine.press.position.y += (4.45 - machine.press.position.y) * Math.min(1, deltaSeconds * 9);
    });
    updateConveyors(deltaSeconds);
    updateCoinBursts(deltaSeconds);
  }

  return { machines, conveyors, lights, playBounds, createCoinBurst, updateEnvironment };
}
