export function createWorld(world) {
  const {
    THREE,
    scene,
    baseLight,
    addWall,
    registerObstacle,
  } = world;
  let elapsed = 0;
  let blackoutTimer = 0;
  let darkness = 0;
  const normalSearchlightCount = 3;
  const lightPositions = [
    new THREE.Vector3(-6, 0, -2),
    new THREE.Vector3(0, 0, 3),
    new THREE.Vector3(6, 0, -1),
    new THREE.Vector3(-4, 0, 6),
    new THREE.Vector3(5, 0, -6),
  ];
  const normalBaseIntensity = baseLight?.intensity ?? 0.72;
  const fillLight = new THREE.AmbientLight(0x6f8eaa, 0.58);
  scene.add(fillLight);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x9f1d2d,
    roughness: 0.82,
  });
  addWall(0, -11.8, 0, wallMaterial);
  addWall(-12.2, 0, Math.PI / 2, wallMaterial);
  addWall(12.2, 0, -Math.PI / 2, wallMaterial);

  const stallMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b3d24,
    roughness: 0.76,
  });
  const awningMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9485f,
    roughness: 0.72,
  });
  [-8.5, -4.2, 0, 4.2, 8.5].forEach((x, index) => {
    const z = index % 2 === 0 ? -8.3 : 7.4;
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.72, 1.25),
      stallMaterial,
    );
    stall.position.set(x, 0.38, z);
    stall.castShadow = true;
    scene.add(stall);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.14, 1.55),
      awningMaterial,
    );
    awning.position.set(x, 1.7, z);
    scene.add(awning);
    registerObstacle(x, z, 1.25, 0.64);
  });

  const polePositions = [
    new THREE.Vector3(-10.4, 0, -4),
    new THREE.Vector3(0, 0, -10.5),
    new THREE.Vector3(10.4, 0, 4),
    new THREE.Vector3(-10.4, 0, 5),
    new THREE.Vector3(10.4, 0, -5),
  ];
  const lightPools = [];
  const poles = lightPositions.map((position, index) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 5.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f3745, roughness: 0.62 }),
    );
    pole.position.copy(polePositions[index]);
    pole.position.y = 2.8;
    scene.add(pole);
    const spot = new THREE.SpotLight(0xffd36b, 5.6, 22, Math.PI / 5, 0.58, 1);
    spot.position.copy(pole.position);
    spot.position.y = 6.2;
    spot.target.position.copy(position);
    scene.add(spot, spot.target);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd36b,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.copy(position);
    pool.position.y = 0.035;
    pool.userData.gameplayRole = "searchlight-pool";
    scene.add(pool);
    lightPools.push(pool);
    return { spot, baseX: position.x, baseZ: position.z };
  });

  const switches = [new THREE.Vector3()].map((position) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.5,
      roughness: 0.48,
    });
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.1, 20),
      material,
    );
    mesh.position.copy(position);
    mesh.position.y = 0.05;
    mesh.userData.gameplayRole = "blackout-switch";
    scene.add(mesh);
    return {
      mesh,
      position,
      material,
      ready: false,
      occupied: false,
    };
  });

  function updateSwitchAppearance(entry) {
    entry.material.color.setHex(entry.ready ? 0x22c55e : 0x374151);
    entry.material.emissive.setHex(entry.ready ? 0x22c55e : 0x111827);
    entry.material.emissiveIntensity = entry.ready ? 1.5 : 0.2;
  }

  function placeSwitch(position) {
    const entry = switches[0];
    entry.position.copy(position);
    entry.mesh.position.set(position.x, 0.05, position.z);
    entry.ready = true;
    entry.occupied = false;
    updateSwitchAppearance(entry);
  }

  function updateSwitch(playerPosition) {
    const entry = switches[0];
    const occupied = Boolean(playerPosition)
      && Math.hypot(
        playerPosition.x - entry.position.x,
        playerPosition.z - entry.position.z,
      ) <= 0.95;
    if (occupied && !entry.occupied && entry.ready && blackoutTimer <= 0) {
      blackoutTimer = 5;
      entry.ready = false;
      updateSwitchAppearance(entry);
    }
    entry.occupied = occupied;
  }

  function updateLighting(deltaSeconds) {
    const blackoutActive = blackoutTimer > 0;
    const targetDarkness = blackoutActive ? 1 : 0;
    darkness += (targetDarkness - darkness) * Math.min(1, deltaSeconds * 5);
    if (baseLight) {
      baseLight.intensity = THREE.MathUtils.lerp(
        normalBaseIntensity,
        0.08,
        darkness,
      );
    }
    fillLight.intensity = THREE.MathUtils.lerp(0.58, 0.025, darkness);
    poles.forEach(({ spot }, index) => {
      const active = index < normalSearchlightCount || blackoutActive;
      spot.intensity = active ? THREE.MathUtils.lerp(5.6, 8.2, darkness) : 0;
      lightPools[index].visible = active;
      lightPools[index].material.opacity = THREE.MathUtils.lerp(0.22, 0.52, darkness);
    });
  }

  function updateEnvironment(deltaSeconds, playerPosition) {
    elapsed += deltaSeconds;
    const wasBlackout = blackoutTimer > 0;
    blackoutTimer = Math.max(0, blackoutTimer - deltaSeconds);
    updateSwitch(playerPosition);
    lightPositions.forEach((position, index) => {
      position.x = poles[index].baseX + Math.sin(elapsed * 0.72 + index * 2.2) * 4;
      position.z = poles[index].baseZ + Math.cos(elapsed * 0.46 + index) * 2.4;
      poles[index].spot.target.position.copy(position);
      lightPools[index].position.x = position.x;
      lightPools[index].position.z = position.z;
    });
    updateLighting(deltaSeconds);
    return wasBlackout && blackoutTimer <= 0
      ? { refreshSwitch: true }
      : undefined;
  }

  function getLegGlow(position, isGoose) {
    if (isGoose) return 0;
    const activeLights = blackoutTimer > 0
      ? lightPositions
      : lightPositions.slice(0, normalSearchlightCount);
    return activeLights.reduce((highest, light) => {
      const distance = Math.hypot(position.x - light.x, position.z - light.z);
      return Math.max(highest, Math.max(0, 1 - distance / 3.2));
    }, 0);
  }

  function getLightingState() {
    return {
      blackout: blackoutTimer > 0,
      remaining: blackoutTimer,
      switches: switches.map(({ ready }) => ({ ready })),
    };
  }

  updateLighting(0);

  return {
    lightPositions,
    lightPools,
    spotlights: poles.map(({ spot }) => spot),
    switches,
    placeSwitch,
    updateEnvironment,
    getLegGlow,
    getLightingState,
  };
}
